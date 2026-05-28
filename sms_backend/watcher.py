import time
import shutil
import os
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

from parser import parse_sms_file
from storage import add_message

INBOX = r"C:\sms\inbox"
PROCESSED = r"C:\sms\processed"
ERROR = r"C:\sms\error"


class SMSHandler(FileSystemEventHandler):

    def on_created(self, event):
        if event.is_directory:
            return

        if not event.src_path.endswith(".sms"):
            return

        print(f"New SMS file detected: {event.src_path}")

        # Wait a bit to ensure file is fully written
        time.sleep(0.5)

        self.process_file(event.src_path)

    def process_file(self, path):
        try:
            msg = parse_sms_file(path)
            add_message(msg)

            # move to processed folder
            filename = os.path.basename(path)
            shutil.move(path, os.path.join(PROCESSED, filename))

            print(f"Processed: {filename}")

        except Exception as e:
            print(f"Failed to process {path}: {e}")

            try:
                filename = os.path.basename(path)
                shutil.move(path, os.path.join(ERROR, filename))
            except:
                pass


def start_watcher():
    os.makedirs(INBOX, exist_ok=True)
    os.makedirs(PROCESSED, exist_ok=True)
    os.makedirs(ERROR, exist_ok=True)

    event_handler = SMSHandler()
    observer = Observer()
    observer.schedule(event_handler, INBOX, recursive=False)

    observer.start()
    print("SMS Watcher started (event-driven)")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()

    observer.join()
