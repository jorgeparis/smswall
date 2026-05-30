from Crypto.Util.Padding import unpad
from Crypto.Cipher import AES
from models_db import Contact
from fastapi import FastAPI, Query, HTTPException, Body, Depends, status, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text, desc, func, or_
from sqlalchemy.orm import Session
import threading
import logging
import traceback
import jwt
import hashlib
import os
from dotenv import load_dotenv
import pandas as pd
import uuid
import base64
import json

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="SMS Wall API", version="2.1.0")
security = HTTPBearer()

# JWT Configuration
SECRET_KEY = os.getenv(
    "SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# ==================== CORS Configuration ====================
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://localhost:4173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5500",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
    expose_headers=["*"],
    max_age=3600,
)

# ==================== AES Decryption for CryptoJS ====================

# Use a fixed key derived from SECRET_KEY (must match frontend)
ENCRYPTION_KEY = hashlib.sha256(SECRET_KEY.encode()).digest()[
    :32]  # 32 bytes for AES-256


def aes_decrypt(encrypted_data: str) -> str:
    """Decrypt text encrypted by CryptoJS AES (IV + ciphertext combined)"""
    try:
        # Decode base64
        combined = base64.b64decode(encrypted_data)

        # Extract IV (first 16 bytes) and ciphertext
        iv = combined[:16]
        ciphertext = combined[16:]

        # Create cipher
        cipher = AES.new(ENCRYPTION_KEY, AES.MODE_CBC, iv)

        # Decrypt and unpad
        decrypted = unpad(cipher.decrypt(ciphertext), AES.block_size)

        return decrypted.decode('utf-8')
    except Exception as e:
        logger.error(f"AES decryption error: {e}")
        raise ValueError(f"Decryption failed: {str(e)}")

# ==================== Pydantic Models ====================


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(...,
                       pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None

    @field_validator('username')
    @classmethod
    def username_alphanumeric(cls, v):
        if not v.replace('_', '').isalnum():
            raise ValueError(
                'Username must be alphanumeric or contain underscores')
        return v


class UserLogin(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: Dict[str, Any]


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)


class SendMessageRequest(BaseModel):
    to_number: str = Field(..., min_length=10, max_length=15)
    message: str = Field(..., min_length=1, max_length=1600)
    sender_id: Optional[str] = Field(None, max_length=11)


class SendBatchRequest(BaseModel):
    messages: List[SendMessageRequest]


class DeleteOldMessagesRequest(BaseModel):
    days: int = Field(30, ge=1, le=365)

# ==================== Authentication Helpers ====================


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash using SHA-256"""
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password


def get_password_hash(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = decode_token(token)

    user_id = payload.get("sub")
    username = payload.get("username")
    role = payload.get("role")

    if not user_id or not username:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    try:
        from database import SessionLocal
        from models_db import User

        db = SessionLocal()
        user = db.query(User).filter(User.id == int(user_id)).first()
        db.close()

        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        if not user.is_active:
            raise HTTPException(
                status_code=403, detail="User account is disabled")

        return user
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


async def get_current_active_user(current_user=Depends(get_current_user)):
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


async def get_current_admin_user(current_user=Depends(get_current_active_user)):
    """Get current admin user (requires admin role)"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user

# ==================== Auth Endpoints ====================


@app.post("/auth/register", response_model=TokenResponse)
async def register_user(user_data: UserCreate):
    """Register a new user"""
    try:
        from database import SessionLocal
        from models_db import User

        db = SessionLocal()

        existing_user = db.query(User).filter(
            (User.username == user_data.username) | (
                User.email == user_data.email)
        ).first()

        if existing_user:
            db.close()
            raise HTTPException(
                status_code=400, detail="Username or email already exists")

        new_user = User(
            username=user_data.username,
            email=user_data.email,
            password_hash=get_password_hash(user_data.password),
            role="user",
            full_name=user_data.full_name,
            is_active=True,
            created_at=datetime.now()
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        access_token = create_access_token(
            data={"sub": str(new_user.id),
                  "username": new_user.username, "role": new_user.role}
        )

        db.close()

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": new_user.id,
                "username": new_user.username,
                "email": new_user.email,
                "role": new_user.role,
                "full_name": new_user.full_name
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    """Login user and return JWT token"""
    try:
        from database import SessionLocal
        from models_db import User

        db = SessionLocal()
        user = db.query(User).filter(
            User.username == user_data.username).first()

        if not user or not verify_password(user_data.password, user.password_hash):
            db.close()
            raise HTTPException(
                status_code=401, detail="Invalid username or password")

        if not user.is_active:
            db.close()
            raise HTTPException(status_code=403, detail="Account is disabled")

        user.last_login = datetime.now()
        db.commit()

        access_token = create_access_token(
            data={"sub": str(user.id), "username": user.username,
                  "role": user.role}
        )

        db.close()

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/refresh")
async def refresh_token(current_user=Depends(get_current_user)):
    """Refresh access token"""
    try:
        new_token = create_access_token(
            data={"sub": str(
                current_user.id), "username": current_user.username, "role": current_user.role}
        )

        return {
            "access_token": new_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user=Depends(get_current_user)
):
    """Change user's password"""
    try:
        from database import SessionLocal
        from models_db import User

        if not verify_password(password_data.old_password, current_user.password_hash):
            raise HTTPException(
                status_code=401, detail="Incorrect current password")

        db = SessionLocal()
        user = db.query(User).filter(User.id == current_user.id).first()
        user.password_hash = get_password_hash(password_data.new_password)
        db.commit()
        db.close()

        return {"status": "success", "message": "Password changed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    """Get current user information"""
    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "role": current_user.role,
        "full_name": current_user.full_name,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None
    }

# ==================== Admin User Management ====================


@app.get("/admin/users")
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin_user=Depends(get_current_admin_user)
):
    """List all users (admin only)"""
    try:
        from database import SessionLocal
        from models_db import User

        db = SessionLocal()
        users = db.query(User).offset(skip).limit(limit).all()
        total = db.query(User).count()
        db.close()

        return {
            "total": total,
            "users": [
                {
                    "id": u.id,
                    "username": u.username,
                    "email": u.email,
                    "role": u.role,
                    "full_name": u.full_name,
                    "is_active": u.is_active,
                    "created_at": u.created_at.isoformat() if u.created_at else None,
                    "last_login": u.last_login.isoformat() if u.last_login else None
                }
                for u in users
            ]
        }

    except Exception as e:
        logger.error(f"List users error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/admin/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role: str = Body(..., embed=True),
    admin_user=Depends(get_current_admin_user)
):
    """Update user role (admin only)"""
    try:
        from database import SessionLocal
        from models_db import User

        if role not in ["admin", "user"]:
            raise HTTPException(status_code=400, detail="Invalid role")

        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            db.close()
            raise HTTPException(status_code=404, detail="User not found")

        user.role = role
        db.commit()
        db.close()

        return {"status": "success", "message": f"User role updated to {role}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Update role error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/admin/users/{user_id}/toggle-status")
async def toggle_user_status(
    user_id: int,
    admin_user=Depends(get_current_admin_user)
):
    """Enable/disable user account (admin only)"""
    try:
        from database import SessionLocal
        from models_db import User

        if user_id == admin_user.id:
            raise HTTPException(
                status_code=400, detail="Cannot modify your own status")

        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            db.close()
            raise HTTPException(status_code=404, detail="User not found")

        user.is_active = not user.is_active
        db.commit()
        db.close()

        status_text = "enabled" if user.is_active else "disabled"
        return {"status": "success", "message": f"User account {status_text}"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Toggle user status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: int,
    admin_user=Depends(get_current_admin_user)
):
    """Delete user (admin only)"""
    try:
        from database import SessionLocal
        from models_db import User

        if user_id == admin_user.id:
            raise HTTPException(
                status_code=400, detail="Cannot delete yourself")

        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            db.close()
            raise HTTPException(status_code=404, detail="User not found")

        db.delete(user)
        db.commit()
        db.close()

        return {"status": "success", "message": f"User deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete user error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

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

# ==================== Message Endpoints (Protected) ====================


@app.get("/messages")
async def get_all_messages(
    limit: Optional[int] = Query(None, ge=1, le=10000),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    sender: Optional[str] = Query(None),
    current_user=Depends(get_current_active_user)
):
    """Get all messages with optional filters (authenticated)"""
    try:
        from database import SessionLocal
        from models_db import SMSDB

        db = SessionLocal()
        query = db.query(SMSDB)

        if unread_only:
            query = query.filter(SMSDB.is_read == False)

        if sender:
            query = query.filter(SMSDB.number == sender)

        total = query.count()
        query = query.order_by(desc(SMSDB.created_at))

        if limit:
            query = query.limit(limit).offset(offset)

        messages = query.all()
        db.close()

        return {
            "total": total,
            "count": len(messages),
            "messages": [convert_to_serializable(msg) for msg in messages],
            "offset": offset,
            "limit": limit
        }

    except Exception as e:
        logger.error(f"Error in get_all_messages: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve messages: {str(e)}")


@app.get("/messages/all")
async def get_all_messages_no_limit(
    current_user=Depends(get_current_active_user)
):
    """Get ALL messages without pagination limit"""
    try:
        from database import SessionLocal
        from models_db import SMSDB
        from sqlalchemy import desc

        db = SessionLocal()
        messages = db.query(SMSDB).order_by(desc(SMSDB.created_at)).all()
        total = len(messages)

        db.close()

        logger.info(
            f"User {current_user.username} fetched all {total} messages")

        return {
            "total": total,
            "count": len(messages),
            "messages": [convert_to_serializable(msg) for msg in messages]
        }

    except Exception as e:
        logger.error(f"Error in get_all_messages_no_limit: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/messages/new")
async def get_new_messages(
    limit: Optional[int] = Query(1000, ge=1, le=5000),
    current_user=Depends(get_current_active_user)
):
    """Get unread messages (authenticated)"""
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


@app.delete("/messages/{message_id}")
async def delete_single_message(
    message_id: int,
    current_user=Depends(get_current_active_user)
):
    """Delete a single message by ID"""
    try:
        from database import SessionLocal
        from models_db import SMSDB

        db = SessionLocal()
        message = db.query(SMSDB).filter(SMSDB.id == message_id).first()

        if not message:
            db.close()
            raise HTTPException(status_code=404, detail="Message not found")

        db.delete(message)
        db.commit()
        db.close()

        logger.info(
            f"User {current_user.username} deleted message {message_id}")

        return {
            "status": "success",
            "message": f"Message deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting message: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/messages/{file_id}/read")
async def mark_message_as_read(
    file_id: str,
    current_user=Depends(get_current_active_user)
):
    """Mark a single message as read by file_id (authenticated)"""
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
            return {"status": "success", "message": f"Message {file_id} marked as read", "file_id": file_id}
        else:
            raise HTTPException(
                status_code=404, detail=f"Message with file_id '{file_id}' not found")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking message as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== SMS Sending Endpoints ====================


@app.post("/messages/send")
async def send_sms(
    message_data: SendMessageRequest,
    current_user=Depends(get_current_active_user)
):
    """Send a single SMS message"""
    try:
        message_id = str(uuid.uuid4())

        from database import SessionLocal
        from models_db import SendLog

        db = SessionLocal()
        send_log = SendLog(
            message_id=message_id,
            to_number=message_data.to_number,
            message=message_data.message,
            sender_id=message_data.sender_id or "SMSWall",
            status="sent",
            sent_by_user_id=current_user.id,
            sent_at=datetime.now()
        )

        db.add(send_log)
        db.commit()
        db.close()

        return {
            "status": "success",
            "message_id": message_id,
            "to_number": message_data.to_number,
            "sent_by": current_user.username,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Send SMS error: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to send message: {str(e)}")


@app.post("/messages/send/batch")
async def send_batch_sms(
    batch_data: SendBatchRequest,
    current_user=Depends(get_current_active_user)
):
    """Send multiple SMS messages"""
    try:
        results = []
        failed = []

        for msg in batch_data.messages:
            try:
                message_id = str(uuid.uuid4())

                from database import SessionLocal
                from models_db import SendLog
                from datetime import datetime

                db = SessionLocal()
                send_log = SendLog(
                    message_id=message_id,
                    to_number=msg.to_number,
                    message=msg.message,
                    sender_id=msg.sender_id or "SMSWall",
                    status="sent",
                    sent_by_user_id=current_user.id,
                    sent_at=datetime.now()
                )
                db.add(send_log)
                db.commit()
                db.close()

                results.append({
                    "to_number": msg.to_number,
                    "status": "success",
                    "message_id": message_id
                })
            except Exception as e:
                failed.append({
                    "to_number": msg.to_number,
                    "status": "failed",
                    "error": str(e)
                })

        return {
            "status": "completed",
            "total": len(batch_data.messages),
            "successful": len(results),
            "failed": len(failed),
            "results": results,
            "failures": failed
        }

    except Exception as e:
        logger.error(f"Batch send error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/messages/sent")
async def get_sent_messages(
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    current_user=Depends(get_current_active_user)
):
    """Get message send history"""
    try:
        from database import SessionLocal
        from models_db import SendLog
        from sqlalchemy import desc

        db = SessionLocal()

        if current_user.role == "admin":
            query = db.query(SendLog)
        else:
            query = db.query(SendLog).filter(
                SendLog.sent_by_user_id == current_user.id)

        total = query.count()
        messages = query.order_by(desc(SendLog.sent_at)).limit(
            limit).offset(offset).all()
        db.close()

        return {
            "total": total,
            "count": len(messages),
            "messages": [
                {
                    "id": m.id,
                    "message_id": m.message_id,
                    "to_number": m.to_number,
                    "message": m.message[:200] + "..." if len(m.message) > 200 else m.message,
                    "status": m.status,
                    "error": m.error,
                    "sent_by": m.sent_by_user_id,
                    "sent_at": m.sent_at.isoformat(),
                    "delivered_at": m.delivered_at.isoformat() if m.delivered_at else None
                }
                for m in messages
            ]
        }

    except Exception as e:
        logger.error(f"Get sent messages error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Delete Endpoints (Admin Only) ====================


@app.delete("/messages/old")
async def delete_old_messages_endpoint(
    days: int = Query(...,
                      description="Delete messages older than X days", ge=1, le=365),
    admin_user=Depends(get_current_admin_user)
):
    """Delete messages older than specified days (admin only)"""
    try:
        from database import SessionLocal
        from models_db import SMSDB

        logger.info(
            f"Admin {admin_user.username} deleting messages older than {days} days")

        db = SessionLocal()
        cutoff_date = datetime.now() - timedelta(days=days)
        cutoff_date_str = cutoff_date.strftime("%d/%m/%y")

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
            "cutoff_date": cutoff_date.isoformat(),
            "deleted_by_admin": admin_user.username,
            "message": f"Successfully deleted {total_deleted} messages older than {days} days"
        }

    except Exception as e:
        logger.error(f"Error deleting old messages: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to delete messages: {str(e)}")


@app.get("/messages/old/preview")
async def preview_old_messages(
    days: int = Query(
        30, description="Preview messages older than X days", ge=1, le=365),
    admin_user=Depends(get_current_admin_user)
):
    """Preview messages that would be deleted (admin only)"""
    try:
        from database import SessionLocal
        from models_db import SMSDB

        db = SessionLocal()
        cutoff_date = datetime.now() - timedelta(days=days)
        cutoff_date_str = cutoff_date.strftime("%d/%m/%y")

        old_by_created = db.query(SMSDB).filter(
            SMSDB.created_at < cutoff_date
        ).all()

        old_by_date = db.query(SMSDB).filter(
            SMSDB.date < cutoff_date_str
        ).all()

        messages_to_delete = {}
        for msg in old_by_created:
            messages_to_delete[msg.id] = msg
        for msg in old_by_date:
            messages_to_delete[msg.id] = msg

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
            "preview": preview,
            "note": f"Showing first 20 of {len(messages_to_delete)} messages"
        }

    except Exception as e:
        logger.error(f"Error previewing old messages: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Statistics Endpoint ====================


@app.get("/stats")
async def get_statistics(current_user=Depends(get_current_active_user)):
    """Get message statistics with user context"""
    try:
        from database import SessionLocal
        from models_db import SMSDB, User
        from sqlalchemy import func

        db = SessionLocal()

        total = db.query(func.count(SMSDB.id)).scalar() or 0
        unread = db.query(func.count(SMSDB.id)).filter(
            SMSDB.is_read == False).scalar() or 0
        read = total - unread
        unique_senders = db.query(func.count(
            func.distinct(SMSDB.number))).scalar() or 0

        seven_days_ago = datetime.now() - timedelta(days=7)
        last_7_days = db.query(func.count(SMSDB.id)).filter(
            SMSDB.created_at >= seven_days_ago
        ).scalar() or 0

        read_rate = (read / total * 100) if total > 0 else 0

        stats = {
            "total_messages": total,
            "unread_messages": unread,
            "read_messages": read,
            "read_rate": round(read_rate, 2),
            "unique_senders": unique_senders,
            "messages_last_7_days": last_7_days,
            "user_role": current_user.role,
            "timestamp": datetime.now().isoformat()
        }

        if current_user.role == "admin":
            total_users = db.query(func.count(User.id)).scalar() or 0
            active_users = db.query(func.count(User.id)).filter(
                User.is_active == True).scalar() or 0
            stats["total_users"] = total_users
            stats["active_users"] = active_users

        db.close()
        return stats

    except Exception as e:
        logger.error(f"Error in get_statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Contact Management Endpoints ====================


@app.get("/contacts")
async def get_contacts(
    search: Optional[str] = Query(None),
    limit: int = Query(500, ge=1, le=2000),
    offset: int = Query(0, ge=0),
    current_user=Depends(get_current_active_user)
):
    """Get all contacts with search"""
    try:
        from database import SessionLocal

        db = SessionLocal()
        query = db.query(Contact)

        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Contact.country.ilike(search_term),
                    Contact.president_name.ilike(search_term),
                    Contact.director_name.ilike(search_term),
                    Contact.coordinator_name.ilike(search_term),
                    Contact.rf_technician_name.ilike(search_term),
                    Contact.af_it_name.ilike(search_term),
                    Contact.editorial_assistant_name.ilike(search_term)
                )
            )

        total = query.count()
        contacts = query.offset(offset).limit(limit).all()
        db.close()

        return {
            "total": total,
            "count": len(contacts),
            "contacts": [c.to_dict() for c in contacts]
        }

    except Exception as e:
        logger.error(f"Error getting contacts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/contacts/upload")
async def upload_contacts(
    file: UploadFile = File(...),
    current_user=Depends(get_current_admin_user)
):
    """Upload and process Excel contact list (admin only)"""
    try:
        df = pd.read_excel(file.file)

        from database import SessionLocal
        db = SessionLocal()

        # Clear existing contacts
        db.query(Contact).delete()

        contacts_created = 0

        for _, row in df.iterrows():
            contact = Contact(
                country=str(row.get('Country', '')) if pd.notna(
                    row.get('Country')) else None,

                president_name=str(row.get('President')) if pd.notna(
                    row.get('President')) else None,
                president_email1=str(row.get('mail 1')) if pd.notna(
                    row.get('mail 1')) else None,
                president_email2=str(row.get('mail 2')) if pd.notna(
                    row.get('mail 2')) else None,
                president_tel=str(row.get('tel')) if pd.notna(
                    row.get('tel')) else None,

                director_name=str(row.get('Director')) if pd.notna(
                    row.get('Director')) else None,
                director_email1=str(row.get('mail 1.1')) if pd.notna(
                    row.get('mail 1.1')) else None,
                director_email2=str(row.get('mail 2.1')) if pd.notna(
                    row.get('mail 2.1')) else None,
                director_tel=str(row.get('tel.1')) if pd.notna(
                    row.get('tel.1')) else None,

                coordinator_name=str(row.get('coordinator')) if pd.notna(
                    row.get('coordinator')) else None,
                coordinator_email1=str(row.get('mail 1.2')) if pd.notna(
                    row.get('mail 1.2')) else None,
                coordinator_email2=str(row.get('mail 2.2')) if pd.notna(
                    row.get('mail 2.2')) else None,
                coordinator_tel=str(row.get('tel.2')) if pd.notna(
                    row.get('tel.2')) else None,

                rf_technician_name=str(row.get('RF technician')) if pd.notna(
                    row.get('RF technician')) else None,
                rf_technician_email1=str(row.get('mail 1.3')) if pd.notna(
                    row.get('mail 1.3')) else None,
                rf_technician_email2=str(row.get('mail 2.3')) if pd.notna(
                    row.get('mail 2.3')) else None,

                af_it_name=str(row.get('AF/IT')
                               ) if pd.notna(row.get('AF/IT')) else None,
                af_it_email1=str(row.get('mail 1.4')) if pd.notna(
                    row.get('mail 1.4')) else None,
                af_it_email2=str(row.get('mail 2.4')) if pd.notna(
                    row.get('mail 2.4')) else None,

                editorial_assistant_name=str(row.get('editorial assistant')) if pd.notna(
                    row.get('editorial assistant')) else None,
                editorial_assistant_email1=str(row.get('mail 1.5')) if pd.notna(
                    row.get('mail 1.5')) else None,
                editorial_assistant_email2=str(row.get('mail 2.5')) if pd.notna(
                    row.get('mail 2.5')) else None,
                editorial_assistant_tel=str(row.get('tel.3')) if pd.notna(
                    row.get('tel.3')) else None,

                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.add(contact)
            contacts_created += 1

        db.commit()
        db.close()

        return {
            "status": "success",
            "message": f"Successfully imported {contacts_created} contacts",
            "count": contacts_created
        }

    except Exception as e:
        logger.error(f"Error uploading contacts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: int,
    current_user=Depends(get_current_admin_user)
):
    """Delete a contact (admin only)"""
    try:
        from database import SessionLocal
        db = SessionLocal()

        contact = db.query(Contact).filter(Contact.id == contact_id).first()
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")

        db.delete(contact)
        db.commit()
        db.close()

        return {"status": "success", "message": "Contact deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting contact: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== Public Endpoints (No Auth Required) ====================


@app.get("/")
def root():
    """API root endpoint (public)"""
    return {
        "status": "ok",
        "name": "SMS Wall API",
        "version": "2.1.0",
        "authentication": "JWT required for most endpoints",
        "endpoints": {
            "auth": ["/auth/login", "/auth/register", "/auth/me", "/auth/refresh", "/auth/change-password"],
            "messages": ["/messages", "/messages/all", "/messages/new", "/messages/send", "/messages/sent"],
            "admin": ["/admin/users"],
            "contacts": ["/contacts", "/contacts/upload", "/contacts/{id}"],
            "stats": ["/stats"],
            "public": ["/", "/health"]
        },
        "timestamp": datetime.now().isoformat()
    }


@app.get("/health")
def health_check():
    """Health check endpoint (public)"""
    try:
        from database import SessionLocal
        db = SessionLocal()
        db.execute(text("SELECT 1"))
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

# ==================== AES Encrypted Login Endpoint ====================


@app.post("/auth/login-encrypted")
async def login_encrypted(request: Request):
    """Receive AES encrypted credentials and decrypt"""
    try:
        # Parse JSON
        data = await request.json()

        # Validate required fields
        if 'encrypted_username' not in data or 'encrypted_password' not in data:
            raise HTTPException(
                status_code=400, detail="Missing encrypted fields")

        # Decrypt credentials using CryptoJS format
        try:
            decrypted_username = aes_decrypt(data['encrypted_username'])
            decrypted_password = aes_decrypt(data['encrypted_password'])

            logger.info(
                f"Successfully decrypted credentials for user: {decrypted_username}")

        except Exception as e:
            logger.error(f"Decryption error: {e}")
            raise HTTPException(
                status_code=400, detail=f"Decryption failed: {str(e)}")

        # Authenticate with decrypted credentials
        return await login(UserLogin(username=decrypted_username, password=decrypted_password))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in login_encrypted: {e}")
        raise HTTPException(status_code=400, detail=f"Error: {str(e)}")

# ==================== Database Setup ====================


def setup_database():
    """Initialize database tables and create default admin user"""
    try:
        from database import engine
        from models_db import Base, User, SMSDB, SendLog, Contact

        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")

        from database import SessionLocal
        db = SessionLocal()

        admin_exists = db.query(User).filter(User.role == "admin").first()
        if not admin_exists:
            default_admin = User(
                username="admin",
                email="admin@example.com",
                password_hash=get_password_hash("admin123"),
                role="admin",
                full_name="System Administrator",
                is_active=True,
                created_at=datetime.now()
            )
            db.add(default_admin)
            db.commit()
            logger.info(
                "Default admin user created (username: admin, password: admin123)")

        db.close()
    except Exception as e:
        logger.error(f"Database setup error: {e}")

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
    """Start the SMS watcher on startup and setup database"""
    try:
        setup_database()

        thread = threading.Thread(target=start_watcher_safe, daemon=True)
        thread.start()
        logger.info("SMS Watcher thread started successfully")
    except Exception as e:
        logger.error(f"Failed to start watcher: {e}")

# ==================== User Update Endpoints ====================


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


@app.put("/admin/users/{user_id}")
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user=Depends(get_current_admin_user)
):
    """Update user details (admin only)"""
    try:
        from database import SessionLocal
        from models_db import User

        db = SessionLocal()
        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            db.close()
            raise HTTPException(status_code=404, detail="User not found")

        if user_data.full_name is not None:
            user.full_name = user_data.full_name
        if user_data.email is not None:
            existing_email = db.query(User).filter(
                User.email == user_data.email,
                User.id != user_id
            ).first()
            if existing_email:
                db.close()
                raise HTTPException(
                    status_code=400, detail="Email already in use")
            user.email = user_data.email
        if user_data.role is not None:
            if user_data.role not in ["admin", "user"]:
                db.close()
                raise HTTPException(status_code=400, detail="Invalid role")
            user.role = user_data.role

        user.updated_at = datetime.now()
        db.commit()
        db.refresh(user)
        db.close()

        logger.info(
            f"Admin {current_user.username} updated user {user.username}")

        return {
            "status": "success",
            "message": "User updated successfully",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/auth/profile")
async def update_profile(
    profile_data: ProfileUpdate,
    current_user=Depends(get_current_active_user)
):
    """Update current user's own profile"""
    try:
        from database import SessionLocal
        from models_db import User

        db = SessionLocal()
        user = db.query(User).filter(User.id == current_user.id).first()

        if not user:
            db.close()
            raise HTTPException(status_code=404, detail="User not found")

        if profile_data.full_name is not None:
            user.full_name = profile_data.full_name
        if profile_data.email is not None:
            existing_email = db.query(User).filter(
                User.email == profile_data.email,
                User.id != current_user.id
            ).first()
            if existing_email:
                db.close()
                raise HTTPException(
                    status_code=400, detail="Email already in use")
            user.email = profile_data.email

        if profile_data.current_password and profile_data.new_password:
            if not verify_password(profile_data.current_password, user.password_hash):
                db.close()
                raise HTTPException(
                    status_code=401, detail="Current password is incorrect")
            if len(profile_data.new_password) < 6:
                db.close()
                raise HTTPException(
                    status_code=400, detail="New password must be at least 6 characters")
            user.password_hash = get_password_hash(profile_data.new_password)

        user.updated_at = datetime.now()
        db.commit()
        db.refresh(user)
        db.close()

        logger.info(f"User {current_user.username} updated their profile")

        return {
            "status": "success",
            "message": "Profile updated successfully",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


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
