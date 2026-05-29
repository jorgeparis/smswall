# log_viewer.py
import os
from pathlib import Path
from datetime import datetime

LOG_DIR = Path(r"C:\sms\logs")


def view_logs(days=1):
    """View recent logs"""
    log_files = sorted(LOG_DIR.glob("watcher_*.log"), reverse=True)

    if not log_files:
        print("No log files found")
        return

    for log_file in log_files[:days]:
        print(f"\n{'='*60}")
        print(f"📄 Reading: {log_file.name}")
        print(f"{'='*60}\n")

        with open(log_file, 'r', encoding='utf-8') as f:
            # Read last 50 lines
            lines = f.readlines()
            for line in lines[-50:]:
                print(line.strip())

        print(f"\n{'='*60}\n")


def tail_log():
    """Tail the latest log file"""
    log_files = sorted(LOG_DIR.glob("watcher_*.log"), reverse=True)

    if not log_files:
        print("No log files found")
        return

    latest_log = log_files[0]
    print(f"Tailing: {latest_log.name}")
    print("Press Ctrl+C to stop\n")

    import time
    pos = 0

    try:
        while True:
            with open(latest_log, 'r', encoding='utf-8') as f:
                f.seek(pos)
                new_lines = f.readlines()
                pos = f.tell()

                for line in new_lines:
                    print(line.strip())

            time.sleep(1)
    except KeyboardInterrupt:
        print("\n Stopped tailing")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        if sys.argv[1] == 'tail':
            tail_log()
        else:
            days = int(sys.argv[1])
            view_logs(days)
    else:
        view_logs(1)
