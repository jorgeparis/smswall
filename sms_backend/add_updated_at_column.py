# add_updated_at_column.py
from database import engine, SessionLocal
from sqlalchemy import text, inspect

def add_updated_at_column():
    """Add updated_at column to users table if it doesn't exist"""
    
    # Check if column exists
    inspector = inspect(engine)
    columns = [col['name'] for col in inspector.get_columns('users')]
    
    if 'updated_at' not in columns:
        print("Adding updated_at column to users table...")
        
        # Add the column using raw SQL
        with engine.connect() as conn:
            # SQLite doesn't support adding columns with DEFAULT datetime.now
            # So we add it as nullable first
            conn.execute(text("ALTER TABLE users ADD COLUMN updated_at DATETIME"))
            conn.commit()
            print("✅ updated_at column added successfully!")
    else:
        print("updated_at column already exists")

if __name__ == "__main__":
    add_updated_at_column()
    print("Database schema updated!")