import { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import Header from "./components/Header";
import MessageList from "./components/MessageList";
import Stats from "./components/Stats";

const API_BASE = "http://localhost:8000";

function App() {
  const [messages, setMessages] = useState([]);
  const [newMessages, setNewMessages] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Normalize message data to ensure consistent structure
  const normalizeMessages = (data) => {
    if (!data) return [];
    
    // If data is already an array
    if (Array.isArray(data)) {
      return data.map(msg => ({
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
    
    // If data has messages property
    if (data.messages && Array.isArray(data.messages)) {
      return data.messages.map(msg => ({
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

  // Fetch all messages
  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      const normalized = normalizeMessages(data);
      setMessages(normalized);
      setError(null);
      return normalized;
    } catch (err) {
      setError("Failed to load messages");
      toast.error("Connection error - Could not fetch messages");
      return [];
    }
  }, []);

  // Fetch new messages
  const fetchNew = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/messages/new`);
      if (!res.ok) throw new Error("Failed to fetch new messages");
      const data = await res.json();
      const normalized = normalizeMessages(data);
      setNewMessages(normalized);
      return normalized;
    } catch (err) {
      console.error("Error fetching new messages:", err);
      return [];
    }
  }, []);

  // Mark message as read
  const markAsRead = useCallback(async (fileId) => {
    try {
      const res = await fetch(`${API_BASE}/messages/${fileId}/read`, {
        method: "POST",
      });
      
      if (!res.ok) throw new Error("Failed to mark as read");
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.file_id === fileId ? { ...msg, is_read: true } : msg
      ));
      setNewMessages(prev => prev.filter(msg => msg.file_id !== fileId));
      
      toast.success("Message marked as read");
    } catch (err) {
      toast.error("Failed to mark message as read");
      console.error(err);
    }
  }, []);

  // Delete single message
  const deleteMessage = useCallback(async (messageId) => {
    try {
      const res = await fetch(`${API_BASE}/messages/${messageId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) throw new Error("Failed to delete message");
      
      // Update local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId && msg.file_id !== messageId));
      setNewMessages(prev => prev.filter(msg => msg.id !== messageId && msg.file_id !== messageId));
      
      toast.success("Message deleted successfully");
      return true;
    } catch (err) {
      toast.error("Failed to delete message");
      console.error(err);
      return false;
    }
  }, []);

  // Reply to message
  const replyToMessage = useCallback((message) => {
    // You can implement this based on your needs
    // For example, open a modal or compose window
    toast.success(`Reply to ${message.number} - Feature coming soon`);
    console.log("Reply to message:", message);
  }, []);

  // Delete old messages (used by Stats component)
  const deleteOld = useCallback(async (days = 30) => {
    try {
      const res = await fetch(`${API_BASE}/messages/old?days=${days}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      const result = await res.json();
      
      toast.success(`Successfully deleted ${result.deleted_count || 0} old messages`);
      await fetchAll();
      await fetchNew();
    } catch (err) {
      toast.error("Failed to delete old messages");
      console.error(err);
    }
  }, [fetchAll, fetchNew]);

  // Initial load + Auto refresh
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAll(), fetchNew()]);
      setLoading(false);
    };

    loadData();

    const interval = setInterval(() => {
      fetchAll();
      fetchNew();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchAll, fetchNew]);

  const displayedMessages = activeTab === "all" ? messages : newMessages;

  // Calculate stats for display
  const totalMessages = messages.length;
  const unreadCount = newMessages.length;
  const readRate = totalMessages > 0 ? ((totalMessages - unreadCount) / totalMessages * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header 
        newCount={newMessages.length} 
        onRefresh={() => {
          fetchAll();
          fetchNew();
          toast.success("Refreshing messages...");
        }} 
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        <Stats
          totalMessages={totalMessages}
          unreadCount={unreadCount}
          onDeleteOld={deleteOld}
          readRate={readRate}
          weeklyTrend={5} // You can calculate this based on your data
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

        {/* Message List - Now with all required props */}
        <MessageList
          messages={displayedMessages}
          loading={loading}
          refresh={() => {
            fetchAll();
            fetchNew();
          }}
          onReply={replyToMessage}
          onDelete={deleteMessage}
          onMarkAsRead={markAsRead} // Optional: if you want to mark as read from the list
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

        {/* Debug info - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-gray-800 text-xs text-gray-400 p-2 rounded-lg">
            Messages: {messages.length} | Unread: {newMessages.length}
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
            borderRadius: "12px",
          },
          success: {
            iconTheme: {
              primary: "#10b981",
              secondary: "#fff",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />
    </div>
  );
}

export default App;