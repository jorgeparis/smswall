#!/usr/bin/env python3
"""
Database setup script for SMS Wall API
Run this to initialize the database before starting the app
"""

import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db, test_connection
from models_db import Base
from database import engine

def setup_database():
    """Complete database setup"""
    print("=" * 50)
    print("SMS Wall API - Database Setup")
    print("=" * 50)
    
    # Test connection
    print("\n1. Testing database connection...")
    if not test_connection():
        print("❌ Cannot proceed with database setup.")
        return False
    
    # Create tables
    print("\n2. Creating database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created successfully!")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False
    
    # Initialize with default data
    print("\n3. Initializing with default data...")
    init_db()
    
    print("\n" + "=" * 50)
    print("✅ Database setup completed successfully!")
    print("\nDefault admin credentials:")
    print("  Username: admin")
    print("  Password: admin123")
    print("\n⚠️  Please change the default password in production!")
    print("=" * 50)
    
    return True

if __name__ == "__main__":
    setup_database()