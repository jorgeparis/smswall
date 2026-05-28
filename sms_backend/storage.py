from database import SessionLocal
from models_db import SMSDB
from datetime import datetime, timedelta


def add_message(msg):
    db = SessionLocal()

    existing = db.query(SMSDB).filter(SMSDB.file_id == msg.id).first()
    if existing:
        db.close()
        return

    db_msg = SMSDB(
        file_id=msg.id,
        number=msg.number,
        date=msg.date,
        time=msg.time,
        message=msg.message,
        is_read=False
    )

    db.add(db_msg)
    db.commit()
    db.close()


def get_all():
    db = SessionLocal()
    data = db.query(SMSDB).all()
    db.close()
    return data


def get_new():
    db = SessionLocal()
    data = db.query(SMSDB).filter(SMSDB.is_read == False).all()
    db.close()
    return data


def mark_as_read(file_id: str):
    db = SessionLocal()
    msg = db.query(SMSDB).filter(SMSDB.file_id == file_id).first()
    if msg:
        msg.is_read = True
        db.commit()
    db.close()


# ====================== NEW FUNCTION ======================
def delete_old_messages(days: int = 30) -> int:
    """
    Delete messages older than the specified number of days.
    Returns the number of messages deleted.
    """
    if days < 1:
        days = 30

    db = SessionLocal()
    deleted_count = 0

    try:
        cutoff_date = datetime.now() - timedelta(days=days)
        cutoff_str = cutoff_date.strftime("%d/%m/%y")  # Match your DD/MM/YY format

        # Delete messages older than cutoff date
        result = db.query(SMSDB).filter(SMSDB.date < cutoff_str).delete()
        
        db.commit()
        deleted_count = result

    except Exception as e:
        db.rollback()
        print(f"Error deleting old messages: {e}")
    finally:
        db.close()

    return deleted_count