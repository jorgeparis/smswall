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