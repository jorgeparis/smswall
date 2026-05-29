# cleanup_logs.py
from pathlib import Path
from datetime import datetime, timedelta

LOG_DIR = Path(r"C:\sms\logs")


def cleanup_old_logs(days_to_keep=30):
    """Delete logs older than specified days"""
    cutoff_date = datetime.now() - timedelta(days=days_to_keep)

    log_files = LOG_DIR.glob("*.log")
    deleted_count = 0

    for log_file in log_files:
        # Get file modification time
        mtime = datetime.fromtimestamp(log_file.stat().st_mtime)

        if mtime < cutoff_date:
            log_file.unlink()
            deleted_count += 1
            print(f"Deleted: {log_file.name}")

    print(f"\n✅ Deleted {deleted_count} old log files")
    print(f"Kept logs from last {days_to_keep} days")


if __name__ == "__main__":
    cleanup_old_logs(30)
