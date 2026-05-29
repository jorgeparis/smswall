# migrate_db.py
from database import engine
from sqlalchemy import text, inspect
from models_db import Base

def migrate_database():
    """Migrate existing database to add new columns"""
    
    # Check if tables exist
    inspector = inspect(engine)
    
    if "sms_messages" in inspector.get_table_names():
        print("Table 'sms_messages' exists, checking columns...")
        
        # Get existing columns
        existing_columns = [col['name'] for col in inspector.get_columns('sms_messages')]
        
        with engine.connect() as conn:
            # Add missing columns
            if 'created_at' not in existing_columns:
                conn.execute(text("ALTER TABLE sms_messages ADD COLUMN created_at TIMESTAMP"))
                print("✓ Added 'created_at' column")
            
            if 'read_at' not in existing_columns:
                conn.execute(text("ALTER TABLE sms_messages ADD COLUMN read_at TIMESTAMP"))
                print("✓ Added 'read_at' column")
            
            if 'date_parsed' not in existing_columns:
                conn.execute(text("ALTER TABLE sms_messages ADD COLUMN date_parsed TIMESTAMP"))
                print("✓ Added 'date_parsed' column")
            
            if 'message_length' not in existing_columns:
                conn.execute(text("ALTER TABLE sms_messages ADD COLUMN message_length INTEGER DEFAULT 0"))
                print("✓ Added 'message_length' column")
            
            conn.commit()
            print("\nMigration completed successfully!")
    else:
        print("Table 'sms_messages' doesn't exist. Creating new tables...")
        Base.metadata.create_all(bind=engine)
        print("✓ All tables created successfully!")

if __name__ == "__main__":
    migrate_database()