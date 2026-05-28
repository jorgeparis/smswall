from fastapi import FastAPI, Query
import threading

from watcher import start_watcher
from storage import get_all, get_new, mark_as_read, delete_old_messages
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost:5173",
    "https://localhost",
    "https://localhost.tiangolo.com",
    "http://localhost.tiangolo.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    thread = threading.Thread(target=start_watcher, daemon=True)
    thread.start()


@app.get("/messages")
def all_messages():
    return get_all()


@app.get("/messages/new")
def new_messages():
    return get_new()


@app.post("/messages/{file_id}/read")
def read_message(file_id: str):
    mark_as_read(file_id)
    return {"status": "read"}


# ==================== NEW ENDPOINT ====================
@app.delete("/messages/old")
def delete_old_messages_endpoint(days: int = Query(30, gt=0, le=365, description="Delete messages older than X days")):
    deleted_count = delete_old_messages(days)
    return {
        "status": "success",
        "message": f"Successfully deleted {deleted_count} old messages (older than {days} days)",
        "deleted_count": deleted_count
    }
