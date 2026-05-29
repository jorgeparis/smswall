from database import SessionLocal
from models_db import SMSDB
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from contextlib import contextmanager
from sqlalchemy import func, or_, and_, desc
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
import logging
from functools import wraps
import time
import hashlib

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== Helper Functions ====================

def normalize_phone_number(number: str) -> str:
    """Normalize phone number format"""
    if not number:
        return "Unknown"
    # Remove spaces and special characters, keep only digits
    normalized = ''.join(filter(str.isdigit, number))
    if not normalized:
        return number
    return normalized

def parse_date_string(date_str: str, time_str: str = "") -> Optional[datetime]:
    """Parse date string to datetime object for better querying"""
    try:
        # Try to parse DD/MM/YY format
        if '/' in date_str:
            parts = date_str.split('/')
            if len(parts) == 3:
                day, month, year = parts
                year = int(year)
                if year < 100:
                    year += 2000
                
                if time_str:
                    time_parts = time_str.split(':')
                    hour = int(time_parts[0]) if len(time_parts) > 0 else 0
                    minute = int(time_parts[1]) if len(time_parts) > 1 else 0
                    second = int(time_parts[2]) if len(time_parts) > 2 else 0
                    return datetime(year, int(month), int(day), hour, minute, second)
                else:
                    return datetime(year, int(month), int(day))
        return None
    except Exception as e:
        logger.debug(f"Failed to parse date {date_str}: {e}")
        return None

# ==================== Retry Decorator ====================

def retry_on_failure(max_retries=3, delay=0.5):
    """Decorator to retry database operations on failure"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        time.sleep(delay * (attempt + 1))
                        logger.warning(f"Retry {attempt + 1}/{max_retries} for {func.__name__}: {e}")
                    else:
                        logger.error(f"Failed after {max_retries} attempts for {func.__name__}: {e}")
            raise last_exception
        return wrapper
    return decorator

# ==================== Context Manager ====================

@contextmanager
def get_db():
    """Context manager for database sessions with automatic cleanup"""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        db.close()

# ==================== SMS Storage Class ====================

class SMSStorage:
    """Enhanced SMS storage manager with connection pooling and batch operations"""
    
    def __init__(self):
        self._batch_buffer = []
        self._batch_size = 100
    
    @retry_on_failure(max_retries=3)
    def add_message(self, msg) -> bool:
        """
        Add a single message to database with deduplication.
        Returns True if added, False if duplicate.
        """
        try:
            with get_db() as db:
                # Check for duplicate by file_id
                existing = db.query(SMSDB).filter(SMSDB.file_id == msg.id).first()
                if existing:
                    logger.info(f"Duplicate message skipped (file_id): {msg.id}")
                    return False
                
                # Also check for duplicate by content and number
                recent_duplicate = db.query(SMSDB).filter(
                    SMSDB.number == msg.number,
                    SMSDB.message == msg.message,
                    SMSDB.date == msg.date,
                    SMSDB.time == msg.time
                ).first()
                
                if recent_duplicate:
                    logger.info(f"Duplicate content skipped: {msg.id}")
                    return False
                
                # Parse date for better storage
                parsed_date = parse_date_string(msg.date, msg.time)
                
                db_msg = SMSDB(
                    file_id=msg.id,
                    number=normalize_phone_number(msg.number),
                    date=msg.date,
                    time=msg.time,
                    message=msg.message,
                    is_read=False,
                    created_at=datetime.now(),
                    date_parsed=parsed_date,
                    message_length=len(msg.message) if msg.message else 0
                )
                
                db.add(db_msg)
                logger.info(f"Message added: {msg.id} from {msg.number}")
                return True
                
        except IntegrityError as e:
            logger.warning(f"Integrity error for message {msg.id}: {e}")
            return False
        except Exception as e:
            logger.error(f"Failed to add message {msg.id}: {e}")
            raise
    
    @retry_on_failure(max_retries=3)
    def add_messages_batch(self, messages: List) -> Dict[str, int]:
        """Add multiple messages in batch"""
        stats = {'added': 0, 'duplicates': 0, 'failed': 0}
        
        try:
            with get_db() as db:
                for msg in messages:
                    try:
                        existing = db.query(SMSDB).filter(SMSDB.file_id == msg.id).first()
                        if existing:
                            stats['duplicates'] += 1
                            continue
                        
                        parsed_date = parse_date_string(msg.date, msg.time)
                        
                        db_msg = SMSDB(
                            file_id=msg.id,
                            number=normalize_phone_number(msg.number),
                            date=msg.date,
                            time=msg.time,
                            message=msg.message,
                            is_read=False,
                            created_at=datetime.now(),
                            date_parsed=parsed_date,
                            message_length=len(msg.message) if msg.message else 0
                        )
                        db.add(db_msg)
                        stats['added'] += 1
                        
                    except Exception as e:
                        stats['failed'] += 1
                        logger.error(f"Failed to add message {msg.id}: {e}")
                
                db.commit()
                logger.info(f"Batch added: {stats['added']} messages, {stats['duplicates']} duplicates, {stats['failed']} failed")
                
        except Exception as e:
            logger.error(f"Batch operation failed: {e}")
            stats['failed'] = len(messages)
            
        return stats
    
    @retry_on_failure(max_retries=2)
    def get_all(self, limit: Optional[int] = None, offset: int = 0) -> List[SMSDB]:
        """Get all messages with pagination"""
        try:
            with get_db() as db:
                query = db.query(SMSDB).order_by(desc(SMSDB.created_at))
                
                if limit:
                    query = query.limit(limit).offset(offset)
                
                return query.all()
        except Exception as e:
            logger.error(f"Failed to get messages: {e}")
            return []
    
    @retry_on_failure(max_retries=2)
    def get_new(self, limit: Optional[int] = None) -> List[SMSDB]:
        """Get unread messages"""
        try:
            with get_db() as db:
                query = db.query(SMSDB).filter(SMSDB.is_read == False)
                if limit:
                    query = query.limit(limit)
                return query.order_by(desc(SMSDB.created_at)).all()
        except Exception as e:
            logger.error(f"Failed to get new messages: {e}")
            return []
    
    @retry_on_failure(max_retries=3)
    def mark_as_read(self, file_id: str) -> bool:
        """Mark a single message as read"""
        try:
            with get_db() as db:
                result = db.query(SMSDB).filter(SMSDB.file_id == file_id).update(
                    {"is_read": True, "read_at": datetime.now()}
                )
                return result > 0
        except Exception as e:
            logger.error(f"Failed to mark message {file_id} as read: {e}")
            return False
    
    @retry_on_failure(max_retries=3)
    def mark_multiple_as_read(self, file_ids: List[str]) -> int:
        """Mark multiple messages as read in batch"""
        if not file_ids:
            return 0
        
        try:
            with get_db() as db:
                result = db.query(SMSDB).filter(SMSDB.file_id.in_(file_ids)).update(
                    {"is_read": True, "read_at": datetime.now()},
                    synchronize_session=False
                )
                logger.info(f"Marked {result} messages as read")
                return result
        except Exception as e:
            logger.error(f"Failed to mark messages as read: {e}")
            return 0
    
    @retry_on_failure(max_retries=3)
    def delete_old_messages(self, days: int = 30) -> int:
        """Delete messages older than specified days"""
        if days < 1:
            days = 30
        
        try:
            with get_db() as db:
                cutoff_date = datetime.now() - timedelta(days=days)
                
                # Use created_at for comparison (more reliable)
                result = db.query(SMSDB).filter(
                    SMSDB.created_at < cutoff_date
                ).delete()
                
                logger.info(f"Deleted {result} messages older than {days} days")
                return result
        except Exception as e:
            logger.error(f"Failed to delete old messages: {e}")
            return 0
    
    @retry_on_failure(max_retries=2)
    def search_messages(self, query: str, limit: int = 100) -> List[SMSDB]:
        """Search messages by number or content"""
        try:
            with get_db() as db:
                search_term = f"%{query}%"
                results = db.query(SMSDB).filter(
                    or_(
                        SMSDB.number.like(search_term),
                        SMSDB.message.like(search_term)
                    )
                ).limit(limit).order_by(desc(SMSDB.created_at)).all()
                
                return results
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []
    
    @retry_on_failure(max_retries=2)
    def get_messages_by_sender(self, number: str, limit: Optional[int] = None) -> List[SMSDB]:
        """Get all messages from a specific sender"""
        try:
            with get_db() as db:
                normalized_number = normalize_phone_number(number)
                query = db.query(SMSDB).filter(SMSDB.number == normalized_number)
                
                if limit:
                    query = query.limit(limit)
                
                return query.order_by(desc(SMSDB.created_at)).all()
        except Exception as e:
            logger.error(f"Failed to get messages from {number}: {e}")
            return []
    
    @retry_on_failure(max_retries=2)
    def get_stats(self) -> Dict[str, Any]:
        """Get storage statistics"""
        try:
            with get_db() as db:
                total = db.query(func.count(SMSDB.id)).scalar() or 0
                unread = db.query(func.count(SMSDB.id)).filter(SMSDB.is_read == False).scalar() or 0
                
                # Get unique senders
                unique_senders = db.query(func.count(func.distinct(SMSDB.number))).scalar() or 0
                
                # Get oldest and newest
                oldest = db.query(SMSDB.created_at).order_by(SMSDB.created_at.asc()).first()
                newest = db.query(SMSDB.created_at).order_by(SMSDB.created_at.desc()).first()
                
                oldest_message = oldest[0].strftime("%d/%m/%y %H:%M") if oldest and oldest[0] else None
                newest_message = newest[0].strftime("%d/%m/%y %H:%M") if newest and newest[0] else None
                
                # Get total message length
                total_chars = db.query(func.sum(SMSDB.message_length)).scalar() or 0
                
                # Get messages from last 7 days
                seven_days_ago = datetime.now() - timedelta(days=7)
                messages_last_7_days = db.query(func.count(SMSDB.id)).filter(
                    SMSDB.created_at >= seven_days_ago
                ).scalar() or 0
                
                # Calculate read rate
                read_rate = ((total - unread) / total * 100) if total > 0 else 0
                
                return {
                    'total_messages': total,
                    'unread_messages': unread,
                    'unique_senders': unique_senders,
                    'oldest_message': oldest_message,
                    'newest_message': newest_message,
                    'total_characters': total_chars,
                    'average_length': round(total_chars / total, 2) if total > 0 else 0,
                    'read_rate': round(read_rate, 2),
                    'messages_last_7_days': messages_last_7_days
                }
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {
                'total_messages': 0,
                'unread_messages': 0,
                'unique_senders': 0,
                'oldest_message': None,
                'newest_message': None,
                'total_characters': 0,
                'average_length': 0,
                'read_rate': 0,
                'messages_last_7_days': 0
            }
    
    @retry_on_failure(max_retries=2)
    def delete_message(self, file_id: str) -> bool:
        """Delete a single message"""
        try:
            with get_db() as db:
                result = db.query(SMSDB).filter(SMSDB.file_id == file_id).delete()
                return result > 0
        except Exception as e:
            logger.error(f"Failed to delete message {file_id}: {e}")
            return False
    
    @retry_on_failure(max_retries=2)
    def delete_messages_by_sender(self, number: str) -> int:
        """Delete all messages from a specific sender"""
        try:
            with get_db() as db:
                normalized_number = normalize_phone_number(number)
                result = db.query(SMSDB).filter(SMSDB.number == normalized_number).delete()
                logger.info(f"Deleted {result} messages from {number}")
                return result
        except Exception as e:
            logger.error(f"Failed to delete messages from {number}: {e}")
            return 0
    
    @retry_on_failure(max_retries=2)
    def cleanup_database(self, days_to_keep: int = 365) -> int:
        """Clean up old data and optimize database"""
        try:
            with get_db() as db:
                # Delete old messages
                deleted = self.delete_old_messages(days_to_keep)
                
                # Try to vacuum if using SQLite
                try:
                    db.execute("VACUUM")
                    logger.info("Database vacuum completed")
                except:
                    pass
                
                logger.info(f"Database cleanup completed. Deleted {deleted} old messages.")
                return deleted
        except Exception as e:
            logger.error(f"Database cleanup failed: {e}")
            return 0

# ==================== Singleton Instance ====================

_storage = SMSStorage()

# ==================== Backward Compatible Functions ====================

def add_message(msg) -> bool:
    """Backward compatible function"""
    return _storage.add_message(msg)

def get_all(limit: Optional[int] = None, offset: int = 0) -> List[SMSDB]:
    """Backward compatible function"""
    return _storage.get_all(limit, offset)

def get_new(limit: Optional[int] = None) -> List[SMSDB]:
    """Backward compatible function"""
    return _storage.get_new(limit)

def mark_as_read(file_id: str) -> bool:
    """Backward compatible function"""
    return _storage.mark_as_read(file_id)

def delete_old_messages(days: int = 30) -> int:
    """Backward compatible function"""
    return _storage.delete_old_messages(days)

def get_stats() -> Dict[str, Any]:
    """Backward compatible function"""
    return _storage.get_stats()

def search_messages(query: str, limit: int = 100) -> List[SMSDB]:
    """Backward compatible function"""
    return _storage.search_messages(query, limit)

def get_messages_by_sender(number: str, limit: Optional[int] = None) -> List[SMSDB]:
    """Backward compatible function"""
    return _storage.get_messages_by_sender(number, limit)

def delete_message(file_id: str) -> bool:
    """Backward compatible function"""
    return _storage.delete_message(file_id)

def delete_messages_by_sender(number: str) -> int:
    """Backward compatible function"""
    return _storage.delete_messages_by_sender(number)

def mark_multiple_as_read(file_ids: List[str]) -> int:
    """Backward compatible function"""
    return _storage.mark_multiple_as_read(file_ids)

def cleanup_database(days_to_keep: int = 365) -> int:
    """Backward compatible function"""
    return _storage.cleanup_database(days_to_keep)

# ==================== Additional Helper Functions ====================

def get_message_count() -> int:
    """Get total message count"""
    return len(get_all())

def get_unread_count() -> int:
    """Get unread message count"""
    return len(get_new())

def get_senders() -> List[str]:
    """Get list of unique senders"""
    db = SessionLocal()
    try:
        senders = db.query(SMSDB.number).distinct().all()
        return [s[0] for s in senders if s[0]]
    finally:
        db.close()

def search_by_date_range(start_date: str, end_date: str) -> List[SMSDB]:
    """Search messages within a date range"""
    db = SessionLocal()
    try:
        results = db.query(SMSDB).filter(
            and_(
                SMSDB.date >= start_date,
                SMSDB.date <= end_date
            )
        ).order_by(desc(SMSDB.created_at)).all()
        return results
    finally:
        db.close()

# Export all public functions
__all__ = [
    'add_message',
    'get_all',
    'get_new',
    'mark_as_read',
    'delete_old_messages',
    'get_stats',
    'search_messages',
    'get_messages_by_sender',
    'delete_message',
    'delete_messages_by_sender',
    'mark_multiple_as_read',
    'cleanup_database',
    'get_message_count',
    'get_unread_count',
    'get_senders',
    'search_by_date_range',
    'SMSStorage'
]