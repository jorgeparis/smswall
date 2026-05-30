# process_excel.py
import pandas as pd
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models_db import Contact

EXCEL_PATH = r"C:\sms\contacts.xlsx"

def process_excel_to_contacts():
    """Process Excel file and save contacts to database"""
    
    print("=" * 60)
    print("📊 CONTACT IMPORT TOOL")
    print("=" * 60)
    
    # Check if file exists
    if not os.path.exists(EXCEL_PATH):
        print(f"\n❌ Excel file not found at: {EXCEL_PATH}")
        return False
    
    print(f"\n📁 Reading Excel file: {EXCEL_PATH}")
    
    try:
        # Read Excel file - skip first row (the date row) and use row 2 as header
        # Row 0 = "Last Update:", "2025.12.02", etc.
        # Row 1 = actual headers (country, president, etc.)
        df = pd.read_excel(EXCEL_PATH, header=1)
        
        print(f"✅ Successfully read {len(df)} rows of data")
        
        # Clean column names (remove whitespace)
        df.columns = df.columns.str.strip()
        
        print("\n📋 Cleaned column names:")
        for col in df.columns:
            print(f"   - '{col}'")
        
        # Create database session
        db = SessionLocal()
        
        # Clear existing contacts
        existing_count = db.query(Contact).count()
        if existing_count > 0:
            choice = input(f"\nFound {existing_count} existing contacts. Clear before import? (y/n): ").lower()
            if choice == 'y':
                db.query(Contact).delete()
                db.commit()
                print("✅ Cleared existing contacts")
        
        def clean_value(val):
            if pd.isna(val):
                return None
            if isinstance(val, str):
                val = val.strip()
                return val if val else None
            return val
        
        contacts_created = 0
        errors = []
        
        # Track current role being processed
        # The data is structured in columns: 
        # country, president, mail 1, mail 2, tel, director, mail 1, mail 2, tel, etc.
        
        for index, row in df.iterrows():
            try:
                # Get the values based on column positions
                columns = df.columns.tolist()
                
                # Helper to get value by column name
                def get_value(col_name):
                    if col_name in columns:
                        return clean_value(row[col_name])
                    return None
                
                # Define column mapping based on your structure
                # Column 0: country
                # Column 1: president name
                # Column 2: president mail 1
                # Column 3: president mail 2
                # Column 4: president tel
                # Column 5: director name
                # Column 6: director mail 1
                # Column 7: director mail 2
                # Column 8: director tel
                # Column 9: coordinator name
                # Column 10: coordinator mail 1
                # Column 11: coordinator mail 2
                # Column 12: coordinator tel
                # Column 13: RF technician name
                # Column 14: RF technician mail 1
                # Column 15: RF technician mail 2
                # Column 16: AF/IT technician name
                # Column 17: AF/IT mail 1
                # Column 18: AF/IT mail 2
                # Column 19: editorial assistant name
                # Column 20: editorial assistant mail 1
                # Column 21: editorial assistant mail 2
                # Column 22: editorial assistant tel
                # Column 23: other contacts (optional)
                
                # Map based on column index
                col_map = {
                    'country': columns[0] if len(columns) > 0 else None,
                    'president_name': columns[1] if len(columns) > 1 else None,
                    'president_email1': columns[2] if len(columns) > 2 else None,
                    'president_email2': columns[3] if len(columns) > 3 else None,
                    'president_tel': columns[4] if len(columns) > 4 else None,
                    'director_name': columns[5] if len(columns) > 5 else None,
                    'director_email1': columns[6] if len(columns) > 6 else None,
                    'director_email2': columns[7] if len(columns) > 7 else None,
                    'director_tel': columns[8] if len(columns) > 8 else None,
                    'coordinator_name': columns[9] if len(columns) > 9 else None,
                    'coordinator_email1': columns[10] if len(columns) > 10 else None,
                    'coordinator_email2': columns[11] if len(columns) > 11 else None,
                    'coordinator_tel': columns[12] if len(columns) > 12 else None,
                    'rf_technician_name': columns[13] if len(columns) > 13 else None,
                    'rf_technician_email1': columns[14] if len(columns) > 14 else None,
                    'rf_technician_email2': columns[15] if len(columns) > 15 else None,
                    'af_it_name': columns[16] if len(columns) > 16 else None,
                    'af_it_email1': columns[17] if len(columns) > 17 else None,
                    'af_it_email2': columns[18] if len(columns) > 18 else None,
                    'editorial_assistant_name': columns[19] if len(columns) > 19 else None,
                    'editorial_assistant_email1': columns[20] if len(columns) > 20 else None,
                    'editorial_assistant_email2': columns[21] if len(columns) > 21 else None,
                    'editorial_assistant_tel': columns[22] if len(columns) > 22 else None,
                }
                
                contact = Contact(
                    country=get_value(col_map['country']),
                    
                    president_name=get_value(col_map['president_name']),
                    president_email1=get_value(col_map['president_email1']),
                    president_email2=get_value(col_map['president_email2']),
                    president_tel=get_value(col_map['president_tel']),
                    
                    director_name=get_value(col_map['director_name']),
                    director_email1=get_value(col_map['director_email1']),
                    director_email2=get_value(col_map['director_email2']),
                    director_tel=get_value(col_map['director_tel']),
                    
                    coordinator_name=get_value(col_map['coordinator_name']),
                    coordinator_email1=get_value(col_map['coordinator_email1']),
                    coordinator_email2=get_value(col_map['coordinator_email2']),
                    coordinator_tel=get_value(col_map['coordinator_tel']),
                    
                    rf_technician_name=get_value(col_map['rf_technician_name']),
                    rf_technician_email1=get_value(col_map['rf_technician_email1']),
                    rf_technician_email2=get_value(col_map['rf_technician_email2']),
                    
                    af_it_name=get_value(col_map['af_it_name']),
                    af_it_email1=get_value(col_map['af_it_email1']),
                    af_it_email2=get_value(col_map['af_it_email2']),
                    
                    editorial_assistant_name=get_value(col_map['editorial_assistant_name']),
                    editorial_assistant_email1=get_value(col_map['editorial_assistant_email1']),
                    editorial_assistant_email2=get_value(col_map['editorial_assistant_email2']),
                    editorial_assistant_tel=get_value(col_map['editorial_assistant_tel']),
                    
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                
                # Only add if there's at least some data
                if contact.country or contact.president_name or contact.director_name:
                    db.add(contact)
                    contacts_created += 1
                    
                    if (index + 1) % 10 == 0:
                        print(f"   Processed {index + 1}/{len(df)} contacts...")
                else:
                    print(f"   ⚠️ Row {index + 1}: No data, skipping")
                    
            except Exception as e:
                error_msg = f"Row {index + 1}: {str(e)}"
                errors.append(error_msg)
                print(f"   ⚠️ {error_msg}")
        
        # Commit all changes
        db.commit()
        db.close()
        
        print("\n" + "=" * 60)
        print("📊 IMPORT SUMMARY")
        print("=" * 60)
        print(f"✅ Successfully imported: {contacts_created} contacts")
        print(f"❌ Errors: {len(errors)}")
        
        if errors and len(errors) <= 5:
            print("\n⚠️ Errors:")
            for error in errors:
                print(f"   - {error}")
        
        return contacts_created > 0
        
    except Exception as e:
        print(f"\n❌ Error processing Excel file: {e}")
        import traceback
        traceback.print_exc()
        return False

def verify_import():
    """Verify the imported contacts"""
    print("\n" + "=" * 60)
    print("🔍 VERIFYING IMPORT")
    print("=" * 60)
    
    db = SessionLocal()
    
    total = db.query(Contact).count()
    print(f"\n📊 Total contacts in database: {total}")
    
    if total > 0:
        print("\n📋 Sample contacts (first 5):")
        contacts = db.query(Contact).limit(5).all()
        for i, contact in enumerate(contacts, 1):
            print(f"\n   {i}. 🌍 {contact.country or 'No country'}")
            if contact.president_name:
                print(f"      President: {contact.president_name}")
            if contact.director_name:
                print(f"      Director: {contact.director_name}")
            if contact.coordinator_name:
                print(f"      Coordinator: {contact.coordinator_name}")
    else:
        print("\n⚠️ No contacts found in database!")
    
    db.close()
    return total

if __name__ == "__main__":
    print("\n🔧 Contact Import Tool for SMS Wall")
    print("-" * 40)
    
    # Process the Excel file
    success = process_excel_to_contacts()
    
    if success:
        verify_import()
        print("\n" + "=" * 60)
        print("✅ IMPORT COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        print("\nYou can now view the contacts in the Contacts section of the app.")
    else:
        print("\n❌ Import failed. Please check the file and try again.")