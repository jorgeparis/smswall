import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Header from "./components/Header";
import Login from "./components/Login";
import MessageList from "./components/MessageList";
import Stats from "./components/Stats";

const API_BASE = "http://localhost:8000";

// Helper functions using sessionStorage instead of localStorage
const getAuthToken = () => {
  return sessionStorage.getItem("access_token");
};

const setAuthToken = (token) => {
  if (token) {
    sessionStorage.setItem("access_token", token);
  } else {
    sessionStorage.removeItem("access_token");
  }
};

const getUser = () => {
  const userStr = sessionStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};

const setUser = (user) => {
  if (user) {
    sessionStorage.setItem("user", JSON.stringify(user));
  } else {
    sessionStorage.removeItem("user");
  }
};

const clearAuth = () => {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("user");
};

// Fetch wrapper with authentication
const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();

  if (!token) {
    throw new Error("No authentication token found");
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });

  // If unauthorized, clear token and redirect to login
  if (response.status === 401) {
    clearAuth();
    // Don't redirect immediately, let the caller handle it
    throw new Error("Session expired. Please login again.");
  }

  return response;
};

function App() {
  const [messages, setMessages] = useState([]);
  const [newMessages, setNewMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  // Normalize message data
  const normalizeMessages = (data) => {
    if (!data) return [];

    if (Array.isArray(data)) {
      return data.map((msg) => ({
        id: msg.id || msg.file_id,
        file_id: msg.file_id,
        number: msg.number || "Unknown",
        date: msg.date,
        time: msg.time,
        message: msg.message,
        is_read: msg.is_read || false,
        created_at: msg.created_at,
        read_at: msg.read_at
      }));
    }

    if (data.messages && Array.isArray(data.messages)) {
      return data.messages.map((msg) => ({
        id: msg.id || msg.file_id,
        file_id: msg.file_id,
        number: msg.number || "Unknown",
        date: msg.date,
        time: msg.time,
        message: msg.message,
        is_read: msg.is_read || false,
        created_at: msg.created_at,
        read_at: msg.read_at
      }));
    }

    return [];
  };

  // Check authentication status on mount (runs every time the page loads)
  useEffect(() => {
    const token = getAuthToken();
    const storedUser = getUser();

    if (token && storedUser) {
      setIsLoggedIn(true);
      setUser(storedUser);
      // Load messages after confirming auth
      loadInitialData();
    } else {
      // No session, ensure logged out state
      setIsLoggedIn(false);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAll(), fetchNew()]);
    } catch (error) {
      console.error("Error loading initial data:", error);
      if (error.message === "Session expired. Please login again.") {
        clearAuth();
        setIsLoggedIn(false);
        setUser(null);
        window.location.href = "/login";
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch all messages
  const fetchAll = useCallback(async () => {
    if (!isLoggedIn) return [];

    try {
      const res = await fetchWithAuth(`${API_BASE}/messages?limit=500`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      const normalized = normalizeMessages(data);
      setMessages(normalized);
      setError(null);
      return normalized;
    } catch (err) {
      if (
        err.message !== "No authentication token found" &&
        err.message !== "Session expired. Please login again."
      ) {
        setError("Failed to load messages");
        toast.error("Connection error - Could not fetch messages");
      } else if (err.message === "Session expired. Please login again.") {
        clearAuth();
        setIsLoggedIn(false);
        setUser(null);
        toast.error("Session expired. Please login again.");
      }
      return [];
    }
  }, [isLoggedIn]);

  // Fetch new messages
  const fetchNew = useCallback(async () => {
    if (!isLoggedIn) return [];

    try {
      const res = await fetchWithAuth(`${API_BASE}/messages/new?limit=100`);
      if (!res.ok) throw new Error("Failed to fetch new messages");
      const data = await res.json();
      const normalized = normalizeMessages(data);
      setNewMessages(normalized);
      return normalized;
    } catch (err) {
      console.error("Error fetching new messages:", err);
      if (err.message === "Session expired. Please login again.") {
        clearAuth();
        setIsLoggedIn(false);
        setUser(null);
      }
      return [];
    }
  }, [isLoggedIn]);

  // Mark message as read
  const markAsRead = useCallback(
    async (fileId) => {
      if (!isLoggedIn) return;

      try {
        const res = await fetchWithAuth(`${API_BASE}/messages/${fileId}/read`, {
          method: "POST"
        });

        if (!res.ok) throw new Error("Failed to mark as read");

        setMessages((prev) =>
          prev.map((msg) =>
            msg.file_id === fileId ? { ...msg, is_read: true } : msg
          )
        );
        setNewMessages((prev) => prev.filter((msg) => msg.file_id !== fileId));

        toast.success("Message marked as read");
      } catch (err) {
        toast.error("Failed to mark message as read");
        console.error(err);
      }
    },
    [isLoggedIn]
  );

  // Delete single message
  const deleteMessage = useCallback(
    async (messageId) => {
      if (!isLoggedIn) return false;

      try {
        const res = await fetchWithAuth(`${API_BASE}/messages/${messageId}`, {
          method: "DELETE"
        });

        if (!res.ok) throw new Error("Failed to delete message");

        setMessages((prev) =>
          prev.filter(
            (msg) => msg.id !== messageId && msg.file_id !== messageId
          )
        );
        setNewMessages((prev) =>
          prev.filter(
            (msg) => msg.id !== messageId && msg.file_id !== messageId
          )
        );

        toast.success("Message deleted successfully");
        return true;
      } catch (err) {
        toast.error("Failed to delete message");
        console.error(err);
        return false;
      }
    },
    [isLoggedIn]
  );

  // Reply to message
  const replyToMessage = useCallback((message) => {
    toast.success(`Reply to ${message.number} - Feature coming soon`);
    console.log("Reply to message:", message);
  }, []);

  // Delete old messages (fixed)
  const deleteOld = useCallback(
    async (days = 30) => {
      if (!isLoggedIn) return false;

      try {
        const res = await fetchWithAuth(
          `${API_BASE}/messages/old?days=${days}`,
          {
            method: "DELETE"
          }
        );

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.detail || "Delete failed");
        }

        const result = await res.json();

        toast.success(
          `Successfully deleted ${result.deleted_count || 0} old messages`
        );

        // Refresh the message lists
        await fetchAll();
        await fetchNew();

        return true;
      } catch (err) {
        console.error("Delete old messages error:", err);

        if (err.message === "Session expired. Please login again.") {
          clearAuth();
          setIsLoggedIn(false);
          setUser(null);
          toast.error("Session expired. Please login again.");
        } else {
          toast.error(err.message || "Failed to delete old messages");
        }
        return false;
      }
    },
    [fetchAll, fetchNew, isLoggedIn]
  );

  // Login function
  const handleLogin = async (username, password) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Login failed");
      }

      const data = await response.json();

      // Store token and user info in sessionStorage (clears on tab close)
      setAuthToken(data.access_token);
      setUser(data.user);

      setIsLoggedIn(true);
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.username}!`);

      // Load messages after login
      await loadInitialData();

      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  // Logout function
  const handleLogout = () => {
    clearAuth();
    setIsLoggedIn(false);
    setUser(null);
    setMessages([]);
    setNewMessages([]);
    setError(null);
    toast.success("Logged out successfully");
  };

  // Auto refresh
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      if (isLoggedIn) {
        fetchAll().catch(console.error);
        fetchNew().catch(console.error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchAll, fetchNew, isLoggedIn]);

  // If not logged in, show login screen
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const displayedMessages = activeTab === "all" ? messages : newMessages;
  const totalMessages = messages.length;
  const unreadCount = newMessages.length;
  const readRate =
    totalMessages > 0
      ? ((totalMessages - unreadCount) / totalMessages) * 100
      : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header
        newCount={newMessages.length}
        onRefresh={() => {
          fetchAll();
          fetchNew();
          toast.success("Refreshing messages...");
        }}
        user={user}
        onLogout={handleLogout}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Stats
          totalMessages={totalMessages}
          unreadCount={unreadCount}
          onDeleteOld={deleteOld}
          readRate={readRate}
          weeklyTrend={5}
          userRole={user?.role}
        />

        {/* Modern Tabs */}
        <div className="flex border-b border-gray-800 mb-8 gap-2">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-8 py-4 font-medium text-lg transition-all relative ${
              activeTab === "all"
                ? "text-white border-b-2 border-cyan-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            All Messages
            <span className="ml-2 text-sm text-gray-500">
              ({messages.length})
            </span>
          </button>

          <button
            onClick={() => setActiveTab("new")}
            className={`px-8 py-4 font-medium text-lg transition-all relative flex items-center gap-3 ${
              activeTab === "new"
                ? "text-white border-b-2 border-cyan-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            Live Inbox
            {newMessages.length > 0 && (
              <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                {newMessages.length} NEW
              </span>
            )}
          </button>
        </div>

        {/* Message List */}
        <MessageList
          messages={displayedMessages}
          loading={loading}
          refresh={() => {
            fetchAll();
            fetchNew();
          }}
          onReply={replyToMessage}
          onDelete={deleteMessage}
          onMarkAsRead={markAsRead}
        />

        {error && (
          <div className="text-center py-10 text-red-400 bg-red-500/10 rounded-xl mt-4">
            ⚠️ {error}
            <button
              onClick={() => {
                fetchAll();
                fetchNew();
              }}
              className="ml-4 px-3 py-1 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#1f2937",
            color: "#e5e7eb",
            border: "1px solid #374151",
            borderRadius: "12px"
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff"
            }
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff"
            }
          }
        }}
      />
    </div>
  );
}

export default App;
