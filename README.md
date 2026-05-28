# 📱 SMS Wall

A real-time SMS display system that reads incoming messages from a GSM/SIM device and displays them on a web interface using a FastAPI backend and React frontend.

---

## 🚀 Features

- 📩 Read SMS messages from a GSM/SIM device (serial/USB)
- 🔄 Frontend polling for near real-time updates
- 🧠 Lightweight SQLite database
- 📊 Message statistics
- 🔔 Notifications for new messages
- 🧹 Automatic cleanup of old messages
- 🌐 Accessible over Local Area Network (LAN)

---

## 🏗️ Architecture

```
[ GSM Device ]
       │
       ▼
[ SMS Watcher (Python Thread) ]
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

## 📦 Tech Stack

### Backend
- Python
- FastAPI
- SQLite

### Frontend
- React (Hooks)
- Native CSS
- React Hot Toast

---

## 📁 Project Structure

```
sms-wall/
│
├── backend/
│   ├── main.py
│   ├── watcher.py
│   ├── storage.py
│   ├── sms.db
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── App.js
│   │   └── styles.css
│   └── package.json
│
└── README.md
```

---

## ⚙️ Backend Setup (FastAPI)

### 1. Install dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Run server
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. API Endpoints

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | /messages | Get all messages |
| GET | /messages/new | Get unread messages |
| POST | /messages/read | Mark all messages as read |
| DELETE | /messages/old | Delete old messages |

---

## 💻 Frontend Setup (React)

### 1. Install dependencies
```bash
cd frontend
npm install
```

### 2. Run development server
```bash
npm start
```

### 3. Configure API base URL

In App.js:
```javascript
const API_BASE = "http://<YOUR_SERVER_IP>:8000";
```

---

## 🔄 Polling (Real-Time Updates)

```javascript
setInterval(async () => {
  const res = await fetch(`${API_BASE}/messages/new`);
  const data = await res.json();

  // Update UI with new messages
}, 3000);
```

---

## 📡 SMS Watcher

- Monitors the GSM device using AT commands
- Reads incoming SMS messages
- Parses message data
- Stores messages in SQLite

---

## 🗄️ Database (SQLite)

- File: sms.db
- Automatically created on first run

### View database manually:
```bash
sqlite3 sms.db
.tables
SELECT * FROM messages;
```

---

## 🌐 Deployment (Windows Server / LAN)

### Backend
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend (build)
```bash
npm run build
```

Serve using IIS, Nginx, or a static server.

Access via:
http://<SERVER_IP>:3000

---

## 🔒 Production Improvements

- Use Gunicorn + Uvicorn workers
- Add reverse proxy (Nginx or IIS)
- Enable proper CORS configuration
- Add authentication
- Use PostgreSQL for scaling

---

## ⚠️ Troubleshooting

### Messages not showing
- Check API URL
- Confirm backend is running
- Inspect browser console

### No SMS detected
- Ensure SIM is inserted
- Verify serial port
- Test AT commands

---

## 📜 License

MIT License
