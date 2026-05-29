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

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
        
        # Skip temporary and processed files
        if self.should_skip_file(filepath):
            return

        # Wait a bit to ensure file is fully written
        time.sleep(0.5)
        
        # Process the file
        self.process_file(filepath)

    def should_skip_file(self, filepath):
        """Check if file should be skipped"""
        # Check extension
        if filepath.suffix.lower() != '.sms':
            return True
        
        # Skip files that look like they've been processed
        filename = filepath.name
        if '_processed_' in filename or '_error_' in filename:
            return True
        
        # Skip temporary files
        if filepath.name.startswith('~$') or filepath.name.startswith('.'):
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
            
            # Wait for file to be stable
            if not self.wait_for_file_stability(filepath):
                logger.warning(f"File not stable: {filepath.name}")
                self.processing_files.remove(str(filepath))
                return
            
            # Parse the SMS file
            logger.info(f"Processing SMS file: {filepath.name}")
            msg = parse_sms_file(str(filepath))
            
            if msg:
                # Add to database
                success = add_message(msg)
                
                if success:
                    # Move to processed folder
                    self.move_to_processed(filepath)
                    logger.info(f"✓ Successfully processed: {filepath.name}")
                else:
                    # Duplicate or error
                    logger.info(f"Duplicate or invalid message: {filepath.name}")
                    self.move_to_processed(filepath)
            else:
                logger.error(f"Failed to parse SMS file: {filepath.name}")
                self.move_to_error(filepath)
                
        except Exception as e:
            logger.error(f"Error processing {filepath.name}: {e}")
            
            # Retry logic
            if retry_count < self.max_retries:
                logger.info(f"Retrying {filepath.name} (attempt {retry_count + 1}/{self.max_retries})")
                time.sleep(self.retry_delay * (retry_count + 1))
                self.process_file(filepath, retry_count + 1)
            else:
                logger.error(f"Failed to process {filepath.name} after {self.max_retries} attempts")
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
                        return True
                else:
                    stable_count = 0
                    initial_size = current_size
                
                time.sleep(0.1)
            
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
            logger.debug(f"Moved to processed: {destination.name}")
            
        except Exception as e:
            logger.error(f"Failed to move {source_path} to processed: {e}")

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
            logger.debug(f"Moved to error: {destination.name}")
            
        except Exception as e:
            logger.error(f"Failed to move {source_path} to error: {e}")

def start_watcher():
    """Start the SMS watcher"""
    try:
        # Create directories if they don't exist
        INBOX.mkdir(parents=True, exist_ok=True)
        PROCESSED.mkdir(parents=True, exist_ok=True)
        ERROR.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"Watching directory: {INBOX.absolute()}")
        logger.info(f"Processed directory: {PROCESSED.absolute()}")
        logger.info(f"Error directory: {ERROR.absolute()}")
        
        # Process existing files in inbox
        process_existing_files()
        
        # Start the observer
        event_handler = SMSHandler()
        observer = Observer()
        observer.schedule(event_handler, str(INBOX), recursive=False)
        observer.start()
        
        logger.info("SMS Watcher started successfully (event-driven)")
        
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("Stopping SMS Watcher...")
            observer.stop()
        
        observer.join()
        
    except Exception as e:
        logger.error(f"Failed to start watcher: {e}")

def process_existing_files():
    """Process any existing files in the inbox folder on startup"""
    try:
        existing_files = list(INBOX.glob("*.sms"))
        
        if existing_files:
            logger.info(f"Found {len(existing_files)} existing files to process")
            
            handler = SMSHandler()
            for filepath in existing_files:
                if not handler.should_skip_file(filepath):
                    logger.info(f"Processing existing file: {filepath.name}")
                    handler.process_file(filepath)
        else:
            logger.info("No existing files found in inbox")
            
    except Exception as e:
        logger.error(f"Error processing existing files: {e}")

if __name__ == "__main__":
    start_watcher()