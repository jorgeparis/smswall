import { Send, Shield } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import AdminPanel from "./components/AdminPanel";
import ContactList from "./components/ContactList";
import Header from "./components/Header";
import Login from "./components/Login";
import MessageList from "./components/MessageList";
import Stats from "./components/Stats";

const API_BASE = "http://localhost:8000";

// Helper functions
const getAuthToken = () => sessionStorage.getItem("access_token");
const setAuthToken = (token) =>
  token
    ? sessionStorage.setItem("access_token", token)
    : sessionStorage.removeItem("access_token");
const getUser = () => {
  const userStr = sessionStorage.getItem("user");
  return userStr ? JSON.parse(userStr) : null;
};
const setUser = (user) =>
  user
    ? sessionStorage.setItem("user", JSON.stringify(user))
    : sessionStorage.removeItem("user");
const clearAuth = () => {
  sessionStorage.removeItem("access_token");
  sessionStorage.removeItem("user");
};

// Fetch wrapper with authentication
const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    clearAuth();
    throw new Error("Session expired. Please login again.");
  }
  return response;
};

function App() {
  const [messages, setMessages] = useState([]);
  const [newMessages, setNewMessages] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [activeView, setActiveView] = useState("messages");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    totalMessages: 0,
    unreadMessages: 0,
    readRate: 0,
    uniqueSenders: 0,
    messagesLast7Days: 0
  });

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

  // Check authentication on mount
  useEffect(() => {
    const token = getAuthToken();
    const storedUser = getUser();

    if (token && storedUser) {
      setIsLoggedIn(true);
      setUser(storedUser);
      loadInitialData();
    } else {
      setIsLoggedIn(false);
      setUser(null);
      setLoading(false);
    }
  }, []);

  // Fetch ALL messages
  const fetchAllMessages = useCallback(async () => {
    if (!isLoggedIn) return [];
    console.log("Fetching ALL messages...");
    try {
      const res = await fetchWithAuth(`${API_BASE}/messages/all`);
      const data = await res.json();

      let messagesArray = [];
      let total = 0;

      if (data.messages && Array.isArray(data.messages)) {
        messagesArray = data.messages;
        total = data.total || messagesArray.length;
      } else if (Array.isArray(data)) {
        messagesArray = data;
        total = messagesArray.length;
      }

      const normalized = normalizeMessages(messagesArray);
      setMessages(normalized);
      setTotalCount(total);
      setError(null);
      return normalized;
    } catch (err) {
      console.error("Fetch all error:", err);
      try {
        const res = await fetchWithAuth(`${API_BASE}/messages?limit=10000`);
        const data = await res.json();
        let messagesArray = data.messages || [];
        const normalized = normalizeMessages(messagesArray);
        setMessages(normalized);
        setTotalCount(data.total || normalized.length);
        return normalized;
      } catch (fallbackErr) {
        if (!err.message.includes("Session expired")) {
          setError("Failed to load messages");
          toast.error("Connection error - Could not fetch messages");
        }
        return [];
      }
    }
  }, [isLoggedIn]);

  // Fetch new/unread messages
  const fetchNew = useCallback(async () => {
    if (!isLoggedIn) return [];
    try {
      const res = await fetchWithAuth(`${API_BASE}/messages/new?limit=1000`);
      const data = await res.json();
      let messagesArray = data.messages || [];
      const normalized = normalizeMessages(messagesArray);
      setNewMessages(normalized);
      return normalized;
    } catch (err) {
      console.error("Fetch new error:", err);
      return [];
    }
  }, [isLoggedIn]);

  // Fetch sent messages
  const fetchSentMessages = useCallback(async () => {
    if (!isLoggedIn || user?.role !== "admin") return [];
    try {
      const res = await fetchWithAuth(`${API_BASE}/messages/sent?limit=500`);
      const data = await res.json();
      setSentMessages(data.messages || []);
      return data.messages || [];
    } catch (err) {
      console.error("Error fetching sent messages:", err);
      return [];
    }
  }, [isLoggedIn, user?.role]);

  // Fetch statistics
  const fetchStats = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const res = await fetchWithAuth(`${API_BASE}/stats`);
      const data = await res.json();
      setStats({
        totalMessages: data.total_messages || 0,
        unreadMessages: data.unread_messages || 0,
        readRate: data.read_rate || 0,
        uniqueSenders: data.unique_senders || 0,
        messagesLast7Days: data.messages_last_7_days || 0
      });
      setTotalCount(data.total_messages || 0);
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  }, [isLoggedIn]);

  // Refresh all data (used after any change)
  const refreshAllData = useCallback(async () => {
    await Promise.all([fetchAllMessages(), fetchNew(), fetchStats()]);
  }, [fetchAllMessages, fetchNew, fetchStats]);

  // Mark message as read - FIXED: updates both lists immediately
  const markAsRead = useCallback(
    async (fileId) => {
      if (!isLoggedIn) return;
      try {
        const res = await fetchWithAuth(`${API_BASE}/messages/${fileId}/read`, {
          method: "POST"
        });
        if (!res.ok) throw new Error("Failed to mark as read");

        // Update all messages - mark as read
        setMessages((prev) =>
          prev.map((msg) =>
            msg.file_id === fileId ? { ...msg, is_read: true } : msg
          )
        );
        // Remove from new messages
        setNewMessages((prev) => prev.filter((msg) => msg.file_id !== fileId));

        toast.success("Message marked as read");
        fetchStats();
      } catch (err) {
        toast.error("Failed to mark message as read");
      }
    },
    [isLoggedIn, fetchStats]
  );

  // Delete single message - FIXED: removes from all lists
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
        fetchStats();
        return true;
      } catch (err) {
        toast.error("Failed to delete message");
        return false;
      }
    },
    [isLoggedIn, fetchStats]
  );

  // Reply to message
  const replyToMessage = useCallback((message) => {
    toast.success(`Reply to ${message.number} - Feature coming soon`);
    console.log("Reply to message:", message);
  }, []);

  // Delete old messages - refreshes all data
  const deleteOld = useCallback(
    async (days = 30) => {
      if (!isLoggedIn) return false;
      try {
        const res = await fetchWithAuth(
          `${API_BASE}/messages/old?days=${days}`,
          { method: "DELETE" }
        );
        if (!res.ok) throw new Error("Delete failed");
        const result = await res.json();
        toast.success(
          `Successfully deleted ${result.deleted_count || 0} old messages`
        );
        await refreshAllData();
        return true;
      } catch (err) {
        toast.error(err.message || "Failed to delete old messages");
        return false;
      }
    },
    [refreshAllData, isLoggedIn]
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
      setAuthToken(data.access_token);
      setUser(data.user);
      setIsLoggedIn(true);
      toast.success(`Welcome back, ${data.user.username}!`);
      await loadInitialData();
      return true;
    } catch (err) {
      toast.error(err.message);
      return false;
    }
  };

  // Load initial data
  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAllMessages(),
        fetchNew(),
        fetchStats(),
        fetchSentMessages()
      ]);
    } catch (error) {
      console.error("Error loading initial data:", error);
      if (error.message === "Session expired. Please login again.") {
        clearAuth();
        setIsLoggedIn(false);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = () => {
    clearAuth();
    setIsLoggedIn(false);
    setUser(null);
    setMessages([]);
    setNewMessages([]);
    setSentMessages([]);
    setError(null);
    setActiveView("messages");
    toast.success("Logged out successfully");
  };

  // Auto refresh - now refreshes all messages every 10 seconds
  useEffect(() => {
    if (!isLoggedIn || activeView !== "messages") return;
    const interval = setInterval(() => {
      if (isLoggedIn && activeView === "messages") {
        refreshAllData();
      }
    }, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, [refreshAllData, isLoggedIn, activeView]);

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  if (loading && messages.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  const displayedMessages =
    activeTab === "all"
      ? messages
      : activeTab === "new"
      ? newMessages
      : sentMessages;

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header
        newCount={newMessages.length}
        onRefresh={() => {
          refreshAllData();
          toast.success("Refreshing messages...");
        }}
        user={user}
        onLogout={handleLogout}
        onNavigateToAdmin={() => setActiveView("admin")}
        onNavigateToMessages={() => setActiveView("messages")}
        onNavigateToContacts={() => setActiveView("contacts")}
        activeView={activeView}
        isAdmin={isAdmin}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeView === "messages" ? (
          <>
            <Stats
              totalMessages={stats.totalMessages || totalCount}
              unreadCount={stats.unreadMessages || newMessages.length}
              onDeleteOld={deleteOld}
              readRate={stats.readRate}
              weeklyTrend={5}
              userRole={user?.role}
            />

            {/* Tabs */}
            <div className="flex border-b border-gray-800 mb-8 gap-2">
              <button
                onClick={() => {
                  setActiveTab("all");
                  // Refresh when switching to all tab
                  if (activeTab !== "all") fetchAllMessages();
                }}
                className={`px-6 py-3 font-medium transition-all relative ${
                  activeTab === "all"
                    ? "text-white border-b-2 border-cyan-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                All Messages
                <span className="ml-2 text-xs text-gray-500">
                  ({totalCount.toLocaleString()})
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveTab("new");
                  if (activeTab !== "new") fetchNew();
                }}
                className={`px-6 py-3 font-medium transition-all relative flex items-center gap-2 ${
                  activeTab === "new"
                    ? "text-white border-b-2 border-cyan-400"
                    : "text-gray-400 hover:text-gray-300"
                }`}
              >
                Unread
                {newMessages.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {newMessages.length}
                  </span>
                )}
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab("sent")}
                  className={`px-6 py-3 font-medium transition-all relative ${
                    activeTab === "sent"
                      ? "text-white border-b-2 border-cyan-400"
                      : "text-gray-400 hover:text-gray-300"
                  }`}
                >
                  Sent
                  <span className="ml-2 text-xs text-gray-500">
                    ({sentMessages.length})
                  </span>
                </button>
              )}
            </div>

            {/* Message List */}
            {activeTab === "sent" && isAdmin ? (
              <div className="space-y-3">
                {sentMessages.length === 0 ? (
                  <div className="text-center py-16 bg-gray-900/30 rounded-2xl border border-gray-800">
                    <Send className="mx-auto text-gray-600 mb-4" size={48} />
                    <p className="text-gray-400">No sent messages yet</p>
                  </div>
                ) : (
                  sentMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <Send size={14} className="text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium text-white">
                              To: {msg.to_number}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(msg.sent_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            msg.status === "sent"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {msg.status}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm ml-11">
                        {msg.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <MessageList
                messages={displayedMessages}
                loading={loading}
                refresh={() => refreshAllData()}
                onReply={replyToMessage}
                onDelete={deleteMessage}
                onMarkAsRead={markAsRead}
              />
            )}

            {displayedMessages.length === 0 &&
              !loading &&
              activeTab !== "sent" && (
                <div className="text-center py-16 bg-gray-900/30 rounded-2xl border border-gray-800">
                  <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Shield className="text-gray-600" size={32} />
                  </div>
                  <p className="text-gray-400">No messages found</p>
                  <p className="text-gray-500 text-sm mt-1">
                    New SMS will appear here
                  </p>
                </div>
              )}

            {error && (
              <div className="text-center py-10 text-red-400 bg-red-500/10 rounded-xl mt-4">
                ⚠️ {error}
                <button
                  onClick={() => refreshAllData()}
                  className="ml-4 px-3 py-1 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition"
                >
                  Retry
                </button>
              </div>
            )}
          </>
        ) : activeView === "contacts" ? (
          isAdmin ? (
            <ContactList />
          ) : (
            <AccessDenied onBack={() => setActiveView("messages")} />
          )
        ) : isAdmin ? (
          <AdminPanel />
        ) : (
          <AccessDenied onBack={() => setActiveView("messages")} />
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

// Access Denied Component
const AccessDenied = ({ onBack }) => (
  <div className="text-center py-20">
    <Shield className="mx-auto text-gray-600 mb-4" size={48} />
    <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
    <p className="text-gray-400">
      You don't have permission to access this section.
    </p>
    <button
      onClick={onBack}
      className="mt-4 px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 transition"
    >
      Back to Messages
    </button>
  </div>
);

export default App;
