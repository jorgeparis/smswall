from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

# Create the Base class
Base = declarative_base()

class SMSDB(Base):
    __tablename__ = "sms_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String, unique=True, index=True)
    number = Column(String, index=True)
    date = Column(String)
    time = Column(String)
    message = Column(Text)
    is_read = Column(Boolean, default=False)
    
    # New fields for enhanced functionality
    created_at = Column(DateTime, default=datetime.now)
    read_at = Column(DateTime, nullable=True)
    date_parsed = Column(DateTime, nullable=True, index=True)  # For better date queries
    message_length = Column(Integer, default=0)
    
    def __repr__(self):
        return f"<SMSDB(id={self.id}, number={self.number}, date={self.date}, time={self.time}, is_read={self.is_read})>"
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'file_id': self.file_id,
            'number': self.number,
            'date': self.date,
            'time': self.time,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read_at': self.read_at.isoformat() if self.read_at else None,
            'date_parsed': self.date_parsed.isoformat() if self.date_parsed else None,
            'message_length': self.message_length
        }

# ==================== User Model for Authentication ====================

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), default='user')  # 'admin' or 'user'
    full_name = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    last_login = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, role={self.role}, is_active={self.is_active})>"
    
    def to_dict(self):
        """Convert model to dictionary (exclude sensitive data)"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'full_name': self.full_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

# ==================== Optional: Send Logs Model for SMS Sending History ====================

class SendLog(Base):
    __tablename__ = "send_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String(100), unique=True, index=True)
    to_number = Column(String(20), nullable=False, index=True)
    message = Column(Text, nullable=False)
    sender_id = Column(String(20), nullable=True)
    status = Column(String(50), default='pending')  # pending, sent, failed, delivered
    error = Column(Text, nullable=True)
    sent_by_user_id = Column(Integer, nullable=False, index=True)  # Foreign key to User.id
    sent_at = Column(DateTime, default=datetime.now)
    delivered_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<SendLog(id={self.id}, to_number={self.to_number}, status={self.status})>"
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            'id': self.id,
            'message_id': self.message_id,
            'to_number': self.to_number,
            'message': self.message,
            'sender_id': self.sender_id,
            'status': self.status,
            'error': self.error,
            'sent_by_user_id': self.sent_by_user_id,
            'sent_at': self.sent_at.isoformat() if self.sent_at else None,
            'delivered_at': self.delivered_at.isoformat() if self.delivered_at else None
        }