# SMS Wall System - Complete Documentation

📱 **Overview**  
SMS Wall is a full-stack SMS management system that provides real-time SMS monitoring, user authentication, role-based access control, and message management capabilities. The system consists of a FastAPI backend and a React frontend with JWT authentication.

## 🚀 Features

### 🔐 Authentication & Security
- **JWT-based Authentication** - Secure token-based authentication
- **Session Management** - Tokens stored in `sessionStorage` (clears on tab close)
- **Role-Based Access Control (RBAC)** - Admin and User roles with different permissions
- **Password Hashing** - SHA-256 encryption for passwords
- **Session Expiry Handling** - Automatic redirect to login on token expiration
- **CORS Protection** - Configured cross-origin resource sharing

### 👥 User Management
- User Registration
- User Login
- User Profile
- Password Change
- Admin User Management (view, edit, delete)
- Role Management (promote/demote)
- Account Status (enable/disable)

### 📨 Message Management
- Real-time SMS Reception via file watcher
- Message Listing with pagination
- Unread Messages tab
- Mark as Read
- Delete single messages
- Bulk Delete (Admin only)
- Message Preview before deletion
- Filtering and Search

### 📊 Statistics & Analytics
- Total Messages Count
- Unread Messages Counter
- Read Rate Percentage
- Weekly Trends
- Unique Senders
- Storage Usage
- Live Updates (every 5 seconds)

### 🎨 User Interface
- Modern Dark Theme with gradients
- Fully Responsive
- Real-time Indicators
- Animated Transitions
- Toast Notifications
- Tabbed Interface
- Admin Badges

## 🔌 Backend API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login and get JWT | Public |
| POST | `/auth/refresh` | Refresh token | Authenticated |
| POST | `/auth/change-password` | Change password | Authenticated |
| GET | `/auth/me` | Get current user | Authenticated |

### Messages
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/messages` | Get all messages (paginated) | Authenticated |
| GET | `/messages/new` | Get unread messages | Authenticated |
| POST | `/messages/{file_id}/read` | Mark as read | Authenticated |
| DELETE | `/messages/{message_id}` | Delete message | Authenticated |
| DELETE | `/messages/old` | Bulk delete old | Admin |
| GET | `/messages/old/preview` | Preview bulk delete | Admin |

### SMS Sending
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/messages/send` | Send SMS | Authenticated |
| POST | `/messages/send/batch` | Batch send | Authenticated |
| GET | `/messages/sent` | Sent history | Authenticated |

### Admin
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/admin/users` | List users | Admin |
| PUT | `/admin/users/{id}/role` | Update role | Admin |
| PUT | `/admin/users/{id}/toggle-status` | Toggle active | Admin |
| DELETE | `/admin/users/{id}` | Delete user | Admin |

### System
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/health` | Health check | Public |
| GET | `/stats` | Statistics | Authenticated |
| GET | `/docs` | Swagger UI | Public |

## 📡 Real-time Features
- SMS File Watcher (event-driven)
- Auto-refresh every 5 seconds
- Live Connection Status
- New Message Alerts (visual + sound)
- Pulsing Unread Badges

## 🛡️ Security Features
- JWT Token Authentication
- SHA-256 Password Hashing
- Role-based Authorization
- Input Validation (Pydantic)
- SQL Injection Protection
- Session Management

## 📦 Database Schema

### Users Table
```sql
- id (PK)
- username (Unique)
- email (Unique)
- password_hash
- role ('admin'/'user')
- full_name
- is_active
- created_at
- last_login
```

### SMS Messages Table
```sql
- id (PK)
- file_id (Unique)
- number (Sender)
- date, time
- message (Text)
- is_read
- created_at, read_at
- date_parsed
- message_length
```

### Send Logs Table
```sql
- id (PK)
- message_id
- to_number
- message
- status
- sent_by_user_id (FK)
- sent_at, delivered_at
```

## 🛠️ Technology Stack

**Backend**: FastAPI, SQLAlchemy, SQLite, JWT, Uvicorn, Watchdog  
**Frontend**: React, Tailwind CSS, Lucide React, React Hot Toast

## 🚦 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm/yarn

### Backend Setup
```bash
cd sms_backend
python -m venv venv
# Windows: venv\Scripts\activate
# Linux/Mac: source venv/bin/activate

pip install -r requirements.txt

# .env file
SECRET_KEY=your-super-secret-key-change-this
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=sqlite:///./sms_messages.db

python -c "from database import init_db; init_db()"
python main.py
```

### Frontend Setup
```bash
cd sms_frontend
npm install
npm start
```

**Default Credentials**  
**Username**: `admin`  
**Password**: `admin123`

**⚠️ Change password immediately after first login.**

## 📱 Usage Guide
- Login → View messages in "All Messages" or "Live Inbox"
- Click messages to mark as read
- Admin users have access to bulk cleanup and user management

## 🔧 Configuration
Key environment variables:
```env
SECRET_KEY=...
ACCESS_TOKEN_EXPIRE_MINUTES=1440
DATABASE_URL=sqlite:///./sms_messages.db
REACT_APP_API_URL=http://localhost:8000
```

## 🐛 Troubleshooting
See full documentation for common issues.

## 📈 Performance
- Auto-refresh: 5 seconds
- Pagination: 500 messages/page
- Token expiry: 24 hours

## 🔮 Future Enhancements
- Twilio SMS integration
- WebSocket real-time
- PostgreSQL support
- Docker containerization
- Advanced analytics dashboard

---

**Version**: 2.1.0  
**Last Updated**: May 2026  
**Status**: Production Ready ✅

**License**: Proprietary and Confidential

For API documentation, run the backend and visit `http://localhost:8000/docs`
