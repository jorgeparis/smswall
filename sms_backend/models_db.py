from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from sqlalchemy.orm import relationship

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
    # For better date queries
    date_parsed = Column(DateTime, nullable=True, index=True)
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
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

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
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
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


# ==================== Contact Model ====================

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    country = Column(String(100), index=True)

    # President
    president_name = Column(String(200), nullable=True)
    president_email1 = Column(String(200), nullable=True)
    president_email2 = Column(String(200), nullable=True)
    president_tel = Column(String(50), nullable=True)

    # Director
    director_name = Column(String(200), nullable=True)
    director_email1 = Column(String(200), nullable=True)
    director_email2 = Column(String(200), nullable=True)
    director_tel = Column(String(50), nullable=True)

    # Coordinator
    coordinator_name = Column(String(200), nullable=True)
    coordinator_email1 = Column(String(200), nullable=True)
    coordinator_email2 = Column(String(200), nullable=True)
    coordinator_tel = Column(String(50), nullable=True)

    # RF Technician
    rf_technician_name = Column(String(200), nullable=True)
    rf_technician_email1 = Column(String(200), nullable=True)
    rf_technician_email2 = Column(String(200), nullable=True)

    # AF/IT
    af_it_name = Column(String(200), nullable=True)
    af_it_email1 = Column(String(200), nullable=True)
    af_it_email2 = Column(String(200), nullable=True)

    # Editorial Assistant
    editorial_assistant_name = Column(String(200), nullable=True)
    editorial_assistant_email1 = Column(String(200), nullable=True)
    editorial_assistant_email2 = Column(String(200), nullable=True)
    editorial_assistant_tel = Column(String(50), nullable=True)

    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    def to_dict(self):
        """Convert contact to dictionary"""
        return {
            'id': self.id,
            'country': self.country,
            'president': {
                'name': self.president_name,
                'email1': self.president_email1,
                'email2': self.president_email2,
                'tel': self.president_tel
            },
            'director': {
                'name': self.director_name,
                'email1': self.director_email1,
                'email2': self.director_email2,
                'tel': self.director_tel
            },
            'coordinator': {
                'name': self.coordinator_name,
                'email1': self.coordinator_email1,
                'email2': self.coordinator_email2,
                'tel': self.coordinator_tel
            },
            'rf_technician': {
                'name': self.rf_technician_name,
                'email1': self.rf_technician_email1,
                'email2': self.rf_technician_email2
            },
            'af_it': {
                'name': self.af_it_name,
                'email1': self.af_it_email1,
                'email2': self.af_it_email2
            },
            'editorial_assistant': {
                'name': self.editorial_assistant_name,
                'email1': self.editorial_assistant_email1,
                'email2': self.editorial_assistant_email2,
                'tel': self.editorial_assistant_tel
            }
        }