# 📱 SMS Wall

A polling-based SMS display system that reads incoming messages from a GSM/SIM device and serves them via a FastAPI backend to a React frontend.

---

## Features

- Read SMS messages from GSM/SIM device (serial/USB)
- Polling-based updates (no WebSockets)
- SQLite storage
- Background SMS watcher thread
- Delete old messages via API
- LAN accessible

---

## Architecture

```
[ GSM Device ]
       │
       ▼
[ SMS Watcher Thread ]
       │
       ▼
[ FastAPI Backend ]
   ├── REST API
   └── SQLite Database
       │
       ▼
[ React Frontend (Polling) ]
```

---

## Backend Implementation

### Core Features

- Background watcher starts on app startup
- REST-based API (no WebSockets)
- CORS enabled for frontend integration

### Startup Thread

```python
@app.on_event("startup")
def startup():
    thread = threading.Thread(target=start_watcher, daemon=True)
    thread.start()
```

---

## API Endpoints

| Method | Endpoint                 | Description                       |
| ------ | ------------------------ | --------------------------------- |
| GET    | /messages                | Get all messages                  |
| GET    | /messages/new            | Get unread messages               |
| POST   | /messages/{file_id}/read | Mark a message as read            |
| DELETE | /messages/old?days=30    | Delete messages older than X days |

### Example: Delete old messages

```bash
curl -X DELETE "http://localhost:8000/messages/old?days=30"
```

---

## Frontend Polling Example

```javascript
setInterval(async () => {
  const res = await fetch("http://localhost:8000/messages/new");
  const data = await res.json();
}, 3000);
```

---

## Database

- SQLite (`sms.db`)
- Automatically managed

---

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
npm start
```

---

## Deployment Notes

- Bind backend to `0.0.0.0` for LAN access
- Ensure firewall allows port 8000
- Use IIS/Nginx for frontend hosting

---

## Notes

- Polling interval should be tuned (default: 3s)
- DELETE endpoint supports 1–365 days
- Each message is identified by `file_id`

---

## License

MIT
