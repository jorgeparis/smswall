from database import engine, Base
from models_db import SMSDB

Base.metadata.create_all(bind=engine)

print("Database created")