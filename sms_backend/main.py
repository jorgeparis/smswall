from fastapi import FastAPI, Query, HTTPException, Body, Path
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import threading
import logging
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SMS Wall API", version="2.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Helper Functions ====================

def convert_to_serializable(msg):
    """Convert database message to serializable dict"""
    return {
        'id': msg.id,
        'file_id': msg.file_id,
        'number': msg.number,
        'date': msg.date,
        'time': msg.time,
        'message': msg.message,
        'is_read': msg.is_read,
        'created_at': msg.created_at.isoformat() if msg.created_at else None,
        'read_at': msg.read_at.isoformat() if hasattr(msg, 'read_at') and msg.read_at else None,
        'message_length': len(msg.message) if msg.message else 0
    }

# ==================== Health & Status Endpoints ====================

@app.get("/")
def root():
    """API root endpoint"""
    return {
        "status": "ok",
        "name": "SMS Wall API",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    try:
        from database import SessionLocal
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# ==================== Message Endpoints ====================

@app.get("/messages")
def get_all_messages(
    limit: Optional[int] = Query(None, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    sender: Optional[str] = Query(None)
):
    """Get all messages with optional filters"""
    try:
        from database import SessionLocal
        from models_db import SMSDB
        from sqlalchemy import desc
        
        db = SessionLocal()
        
        # Build query
        query = db.query(SMSDB)
        
        if unread_only:
            query = query.filter(SMSDB.is_read == False)
        
        if sender:
            query = query.filter(SMSDB.number == sender)
        
        # Order by created_at descending (newest first)
        query = query.order_by(desc(SMSDB.created_at))
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        if limit:
            query = query.limit(limit).offset(offset)
        
        messages = query.all()
        db.close()
        
        return {
            "total": total,
            "count": len(messages),
            "messages": [convert_to_serializable(msg) for msg in messages],
            "page": (offset // limit) + 1 if limit else 1,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"Error in get_all_messages: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to retrieve messages: {str(e)}")

@app.get("/messages/new")
def get_new_messages(limit: Optional[int] = Query(50, ge=1, le=500)):
    """Get unread messages"""
    try:
        from database import SessionLocal
        from models_db import SMSDB
        from sqlalchemy import desc
        
        db = SessionLocal()
        messages = db.query(SMSDB).filter(
            SMSDB.is_read == False
        ).order_by(desc(SMSDB.created_at)).limit(limit).all()
        
        total_unread = db.query(SMSDB).filter(SMSDB.is_read == False).count()
        db.close()
        
        return {
            "total_unread": total_unread,
            "count": len(messages),
            "messages": [convert_to_serializable(msg) for msg in messages]
        }
        
    except Exception as e:
        logger.error(f"Error in get_new_messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/messages/{file_id}/read")
def mark_message_as_read(file_id: str):
    """Mark a single message as read by file_id"""
    try:
        from database import SessionLocal
        from models_db import SMSDB
        
        db = SessionLocal()
        result = db.query(SMSDB).filter(SMSDB.file_id == file_id).update(
            {"is_read": True, "read_at": datetime.now()}
        )
        db.commit()
        db.close()
        
        if result > 0:
            return {
                "status": "success",
                "message": f"Message {file_id} marked as read",
                "file_id": file_id
            }
        else:
            raise HTTPException(status_code=404, detail=f"Message with file_id '{file_id}' not found")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking message as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== DELETE OLD MESSAGES - FIXED 422 ERROR ====================

@app.delete("/messages/old")
def delete_old_messages_endpoint(
    days: int = Query(..., description="Delete messages older than X days", ge=1, le=365)
):
    """
    Delete messages older than specified days.
    Example: DELETE /messages/old?days=30
    """
    try:
        from database import SessionLocal
        from models_db import SMSDB
        
        logger.info(f"DELETE request received - Deleting messages older than {days} days")
        
        db = SessionLocal()
        cutoff_date = datetime.now() - timedelta(days=days)
        
        # Try different date formats for comparison
        cutoff_date_str = cutoff_date.strftime("%d/%m/%y")
        
        # Delete messages by created_at date
        deleted_by_created = db.query(SMSDB).filter(
            SMSDB.created_at < cutoff_date
        ).delete(synchronize_session=False)
        
        # Delete messages by date field
        deleted_by_date = db.query(SMSDB).filter(
            SMSDB.date < cutoff_date_str
        ).delete(synchronize_session=False)
        
        # Commit the deletions
        db.commit()
        
        # Get total deleted count
        total_deleted = deleted_by_created + deleted_by_date
        
        # Get remaining count
        remaining_count = db.query(SMSDB).count()
        db.close()
        
        logger.info(f"Successfully deleted {total_deleted} messages (created: {deleted_by_created}, date_field: {deleted_by_date})")
        
        return {
            "status": "success",
            "deleted_count": total_deleted,
            "deleted_by_created_at": deleted_by_created,
            "deleted_by_date_field": deleted_by_date,
            "remaining_messages": remaining_count,
            "days": days,
            "cutoff_date": cutoff_date.isoformat(),
            "message": f"Successfully deleted {total_deleted} messages older than {days} days"
        }
        
    except Exception as e:
        logger.error(f"Error deleting old messages: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to delete messages: {str(e)}"
        )

# Alternative endpoint using POST (won't have 422 issues)
@app.post("/messages/old")
def delete_old_messages_post(
    days: int = Body(..., embed=True, description="Delete messages older than X days")
):
    """
    Delete messages older than specified days using POST method.
    Body: {"days": 30}
    Example: POST /messages/old with body {"days": 30}
    """
    try:
        from database import SessionLocal
        from models_db import SMSDB
        
        logger.info(f"POST request received - Deleting messages older than {days} days")
        
        if days < 1 or days > 365:
            raise HTTPException(status_code=400, detail="Days must be between 1 and 365")
        
        db = SessionLocal()
        cutoff_date = datetime.now() - timedelta(days=days)
        cutoff_date_str = cutoff_date.strftime("%d/%m/%y")
        
        # Delete messages
        deleted_by_created = db.query(SMSDB).filter(
            SMSDB.created_at < cutoff_date
        ).delete(synchronize_session=False)
        
        deleted_by_date = db.query(SMSDB).filter(
            SMSDB.date < cutoff_date_str
        ).delete(synchronize_session=False)
        
        db.commit()
        total_deleted = deleted_by_created + deleted_by_date
        remaining_count = db.query(SMSDB).count()
        db.close()
        
        return {
            "status": "success",
            "deleted_count": total_deleted,
            "remaining_messages": remaining_count,
            "days": days,
            "message": f"Successfully deleted {total_deleted} messages older than {days} days"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in POST delete: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Preview endpoint
@app.get("/messages/old/preview")
def preview_old_messages(
    days: int = Query(30, description="Preview messages older than X days", ge=1, le=365)
):
    """Preview messages that would be deleted without actually deleting them"""
    try:
        from database import SessionLocal
        from models_db import SMSDB
        
        db = SessionLocal()
        cutoff_date = datetime.now() - timedelta(days=days)
        cutoff_date_str = cutoff_date.strftime("%d/%m/%y")
        
        # Get messages that would be deleted
        old_by_created = db.query(SMSDB).filter(
            SMSDB.created_at < cutoff_date
        ).all()
        
        old_by_date = db.query(SMSDB).filter(
            SMSDB.date < cutoff_date_str
        ).all()
        
        # Combine unique messages
        messages_to_delete = {}
        for msg in old_by_created:
            messages_to_delete[msg.id] = msg
        for msg in old_by_date:
            messages_to_delete[msg.id] = msg
        
        # Prepare preview (limit to 20)
        preview = []
        for msg in list(messages_to_delete.values())[:20]:
            preview.append({
                'id': msg.id,
                'file_id': msg.file_id,
                'number': msg.number,
                'date': msg.date,
                'time': msg.time,
                'message_preview': msg.message[:100] if msg.message else "",
                'is_read': msg.is_read,
                'created_at': msg.created_at.isoformat() if msg.created_at else None
            })
        
        db.close()
        
        return {
            "status": "success",
            "would_delete_count": len(messages_to_delete),
            "days": days,
            "cutoff_date": cutoff_date.isoformat(),
            "deleted_by_created_at": len(old_by_created),
            "deleted_by_date_field": len(old_by_date),
            "preview": preview,
            "note": f"Showing first 20 of {len(messages_to_delete)} messages that would be deleted"
        }
        
    except Exception as e:
        logger.error(f"Error previewing old messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Statistics Endpoint ====================

@app.get("/stats")
def get_statistics():
    """Get message statistics"""
    try:
        from database import SessionLocal
        from models_db import SMSDB
        from sqlalchemy import func
        
        db = SessionLocal()
        
        total = db.query(func.count(SMSDB.id)).scalar() or 0
        unread = db.query(func.count(SMSDB.id)).filter(SMSDB.is_read == False).scalar() or 0
        read = total - unread
        
        unique_senders = db.query(func.count(func.distinct(SMSDB.number))).scalar() or 0
        
        seven_days_ago = datetime.now() - timedelta(days=7)
        last_7_days = db.query(func.count(SMSDB.id)).filter(
            SMSDB.created_at >= seven_days_ago
        ).scalar() or 0
        
        read_rate = (read / total * 100) if total > 0 else 0
        
        db.close()
        
        return {
            "total_messages": total,
            "unread_messages": unread,
            "read_messages": read,
            "read_rate": round(read_rate, 2),
            "unique_senders": unique_senders,
            "messages_last_7_days": last_7_days,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in get_statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Startup Event ====================

def start_watcher_safe():
    """Safe watcher starter"""
    try:
        from watcher import start_watcher
        logger.info("Starting SMS Watcher...")
        start_watcher()
    except Exception as e:
        logger.error(f"Watcher error: {e}")

@app.on_event("startup")
def startup_event():
    """Start the SMS watcher on startup"""
    try:
        thread = threading.Thread(target=start_watcher_safe, daemon=True)
        thread.start()
        logger.info("SMS Watcher thread started successfully")
    except Exception as e:
        logger.error(f"Failed to start watcher: {e}")

# ==================== Main Entry Point ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )