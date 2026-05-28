from pydantic import BaseModel

class SMSMessage(BaseModel):
    id: str
    number: str
    date: str
    time: str
    message: str

    is_new: bool = True
    is_read: bool = False