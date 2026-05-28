from database import Base
from sqlalchemy import Column, Integer, String, Boolean


class SMSDB(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(String, unique=True, index=True)  # filename
    number = Column(String)
    date = Column(String)
    time = Column(String)
    message = Column(String)

    is_read = Column(Boolean, default=False)
