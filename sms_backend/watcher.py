import time
import shutil
import os
import logging
from pathlib import Path
from datetime import datetime
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from parser import parse_sms_file
from storage import add_message

# Configuration
INBOX = Path(r"C:\sms\inbox")
PROCESSED = Path(r"C:\sms\processed")
ERROR = Path(r"C:\sms\error")
LOG_DIR = Path(r"C:\sms\logs")  # Add log directory

# Create log directory
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Setup logging - Write to both file and console
log_file = LOG_DIR / f"watcher_{datetime.now().strftime('%Y%m%d')}.log"

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),  # Write to file
        logging.StreamHandler()  # Also print to console
    ]
)
logger = logging.getLogger(__name__)

# Also log to a separate error file
error_log_file = LOG_DIR / f"errors_{datetime.now().strftime('%Y%m%d')}.log"
error_handler = logging.FileHandler(error_log_file, encoding='utf-8')
error_handler.setLevel(logging.ERROR)
error_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
logger.addHandler(error_handler)

class SMSHandler(FileSystemEventHandler):
    def __init__(self):
        super().__init__()
        self.processing_files = set()  # Track files being processed
        self.processed_hashes = set()  # Track processed file hashes
        self.max_retries = 3
        self.retry_delay = 1

    def on_created(self, event):
        if event.is_directory:
            return

        filepath = Path(event.src_path)
        
        # Log file detection
        logger.info(f"📁 File detected: {filepath.name}")
        
        # Skip temporary and processed files
        if self.should_skip_file(filepath):
            logger.debug(f"Skipping file: {filepath.name}")
            return

        # Wait a bit to ensure file is fully written
        time.sleep(0.5)
        
        # Process the file
        self.process_file(filepath)

    def should_skip_file(self, filepath):
        """Check if file should be skipped"""
        # Check extension
        if filepath.suffix.lower() != '.sms':
            logger.debug(f"Skipping non-SMS file: {filepath.name}")
            return True
        
        # Skip files that look like they've been processed
        filename = filepath.name
        if '_processed_' in filename or '_error_' in filename:
            logger.debug(f"Skipping already processed file: {filename}")
            return True
        
        # Skip temporary files
        if filepath.name.startswith('~$') or filepath.name.startswith('.'):
            logger.debug(f"Skipping temporary file: {filepath.name}")
            return True
        
        return False

    def process_file(self, filepath, retry_count=0):
        """Process SMS file with retry logic"""
        try:
            # Check if file exists
            if not filepath.exists():
                logger.warning(f"File no longer exists: {filepath}")
                return
            
            # Check if already being processed
            if str(filepath) in self.processing_files:
                logger.debug(f"File already being processed: {filepath.name}")
                return
            
            # Mark as processing
            self.processing_files.add(str(filepath))
            logger.info(f"🔄 Processing: {filepath.name} (Attempt {retry_count + 1})")
            
            # Wait for file to be stable
            if not self.wait_for_file_stability(filepath):
                logger.warning(f"File not stable: {filepath.name}")
                self.processing_files.remove(str(filepath))
                return
            
            # Parse the SMS file
            logger.info(f"📖 Parsing SMS file: {filepath.name}")
            msg = parse_sms_file(str(filepath))
            
            if msg:
                # Add to database
                logger.info(f"💾 Saving to database: {filepath.name}")
                success = add_message(msg)
                
                if success:
                    # Move to processed folder
                    self.move_to_processed(filepath)
                    logger.info(f"✅ Successfully processed: {filepath.name}")
                    logger.info(f"   From: {msg.get('number', 'Unknown')}")
                    logger.info(f"   Message: {msg.get('message', '')[:50]}...")
                else:
                    # Duplicate or error
                    logger.warning(f"⚠️ Duplicate or invalid message: {filepath.name}")
                    self.move_to_processed(filepath)
            else:
                logger.error(f"❌ Failed to parse SMS file: {filepath.name}")
                self.move_to_error(filepath)
                
        except Exception as e:
            logger.error(f"❌ Error processing {filepath.name}: {e}", exc_info=True)
            
            # Retry logic
            if retry_count < self.max_retries:
                logger.info(f"🔄 Retrying {filepath.name} (attempt {retry_count + 1}/{self.max_retries})")
                time.sleep(self.retry_delay * (retry_count + 1))
                self.process_file(filepath, retry_count + 1)
            else:
                logger.error(f"💀 Failed to process {filepath.name} after {self.max_retries} attempts")
                self.move_to_error(filepath)
        finally:
            # Remove from processing set
            if str(filepath) in self.processing_files:
                self.processing_files.remove(str(filepath))

    def wait_for_file_stability(self, filepath, timeout=2.0):
        """Wait for file to be completely written"""
        try:
            initial_size = -1
            stable_count = 0
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                if not filepath.exists():
                    return False
                
                current_size = filepath.stat().st_size
                
                if current_size == initial_size:
                    stable_count += 1
                    if stable_count >= 3:  # Stable for 0.3 seconds
                        logger.debug(f"File stable: {filepath.name} ({current_size} bytes)")
                        return True
                else:
                    stable_count = 0
                    initial_size = current_size
                    logger.debug(f"File size changed: {filepath.name} ({initial_size} -> {current_size})")
                
                time.sleep(0.1)
            
            logger.warning(f"File not stable after {timeout}s: {filepath.name}")
            return stable_count >= 2
        except Exception as e:
            logger.error(f"Error checking file stability: {e}")
            return False

    def move_to_processed(self, source_path):
        """Move file to processed folder with timestamp"""
        try:
            # Ensure directories exist
            PROCESSED.mkdir(parents=True, exist_ok=True)
            
            # Create unique filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            new_filename = f"{source_path.stem}_processed_{timestamp}{source_path.suffix}"
            destination = PROCESSED / new_filename
            
            # Move file
            shutil.move(str(source_path), str(destination))
            logger.info(f"📁 Moved to processed: {destination.name}")
            
            return destination
        except Exception as e:
            logger.error(f"Failed to move {source_path} to processed: {e}")
            return None

    def move_to_error(self, source_path):
        """Move file to error folder with timestamp"""
        try:
            # Ensure directories exist
            ERROR.mkdir(parents=True, exist_ok=True)
            
            # Create unique filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
            new_filename = f"{source_path.stem}_error_{timestamp}{source_path.suffix}"
            destination = ERROR / new_filename
            
            # Move file
            shutil.move(str(source_path), str(destination))
            logger.info(f"📁 Moved to error: {destination.name}")
            
            return destination
        except Exception as e:
            logger.error(f"Failed to move {source_path} to error: {e}")
            return None

def start_watcher():
    """Start the SMS watcher"""
    try:
        # Create directories if they don't exist
        INBOX.mkdir(parents=True, exist_ok=True)
        PROCESSED.mkdir(parents=True, exist_ok=True)
        ERROR.mkdir(parents=True, exist_ok=True)
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        
        # Log startup information
        logger.info("=" * 60)
        logger.info("🚀 SMS WATCHER STARTING")
        logger.info("=" * 60)
        logger.info(f"📁 Watching directory: {INBOX.absolute()}")
        logger.info(f"✅ Processed directory: {PROCESSED.absolute()}")
        logger.info(f"❌ Error directory: {ERROR.absolute()}")
        logger.info(f"📝 Log directory: {LOG_DIR.absolute()}")
        logger.info(f"📄 Log file: {log_file}")
        logger.info("=" * 60)
        
        # Process existing files in inbox
        process_existing_files()
        
        # Start the observer
        event_handler = SMSHandler()
        observer = Observer()
        observer.schedule(event_handler, str(INBOX), recursive=False)
        observer.start()
        
        logger.info("✅ SMS Watcher started successfully (event-driven)")
        logger.info("👂 Listening for new SMS files...")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("🛑 Stopping SMS Watcher...")
            observer.stop()
        
        observer.join()
        logger.info("👋 SMS Watcher stopped")
        
    except Exception as e:
        logger.error(f"💀 Failed to start watcher: {e}", exc_info=True)

def process_existing_files():
    """Process any existing files in the inbox folder on startup"""
    try:
        existing_files = list(INBOX.glob("*.sms"))
        
        if existing_files:
            logger.info(f"📦 Found {len(existing_files)} existing files to process")
            
            handler = SMSHandler()
            for i, filepath in enumerate(existing_files, 1):
                if not handler.should_skip_file(filepath):
                    logger.info(f"📄 [{i}/{len(existing_files)}] Processing existing file: {filepath.name}")
                    handler.process_file(filepath)
                else:
                    logger.debug(f"Skipping existing file: {filepath.name}")
        else:
            logger.info("📭 No existing files found in inbox")
            
    except Exception as e:
        logger.error(f"Error processing existing files: {e}", exc_info=True)

if __name__ == "__main__":
    start_watcher()