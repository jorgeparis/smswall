# diagnose_excel.py
import pandas as pd
import os

EXCEL_PATH = r"C:\sms\contacts.xlsx"

# Check if file exists
if not os.path.exists(EXCEL_PATH):
    print(f"❌ File not found: {EXCEL_PATH}")
    # Try to find any excel file
    excel_files = []
    for file in os.listdir(r"C:\sms"):
        if file.endswith(('.xlsx', '.xls')):
            excel_files.append(file)
    
    if excel_files:
        print(f"\n📁 Found Excel files in C:\\sms:")
        for f in excel_files:
            print(f"   - {f}")
        EXCEL_PATH = r"C:\sms\\" + excel_files[0]
        print(f"\nUsing: {EXCEL_PATH}")
    else:
        print("\n❌ No Excel files found in C:\\sms\\")
        exit()

# Read the Excel file
print(f"\n📖 Reading: {EXCEL_PATH}")
df = pd.read_excel(EXCEL_PATH)

print(f"\n📊 Total rows: {len(df)}")
print(f"\n📋 Column names in your Excel file:")
print("-" * 40)
for i, col in enumerate(df.columns, 1):
    print(f"{i:3}. '{col}'")

print("\n" + "-" * 40)
print("\n📝 First row of data (sample):")
print("-" * 40)
first_row = df.iloc[0]
for col in df.columns:
    value = first_row[col]
    if pd.notna(value):
        print(f"{col}: {value}")