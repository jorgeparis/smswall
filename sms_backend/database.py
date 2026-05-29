# database.py
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from typing import Generator
import hashlib

# Database URL - using SQLite for simplicity
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sms_messages.db")

# For SQLite, we need to enable foreign keys
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    engine = create_engine(DATABASE_URL)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()

# Simple password hashing function (SHA-256)
def hash_password(password: str) -> str:
    """Simple password hashing using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return hash_password(plain_password) == hashed_password

# Dependency to get DB session
def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helper function to initialize database
def init_db():
    """Initialize database by creating all tables."""
    from models_db import SMSDB, User, SendLog
    
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")
    
    # Create default admin user if it doesn't exist
    try:
        db = SessionLocal()
        
        admin_exists = db.query(User).filter(User.role == "admin").first()
        
        if not admin_exists:
            default_admin = User(
                username="admin",
                email="admin@example.com",
                password_hash=hash_password("admin123"),  # Use simple hash
                role="admin",
                full_name="System Administrator",
                is_active=True
            )
            db.add(default_admin)
            db.commit()
            print("✅ Default admin user created (username: admin, password: admin123)")
        else:
            print("✅ Admin user already exists")
        
        db.close()
    except Exception as e:
        print(f"⚠️ Warning: Could not create default admin user: {e}")

# Test database connection
def test_connection():
    """Test if database connection is working."""
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        print("✅ Database connection successful!")
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

if __name__ == "__main__":
    print("Initializing database...")
    test_connection()
    init_db()
    print("Database setup complete!")