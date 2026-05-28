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

  // Fetch all messages
  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();
      setMessages(data || []);
      setError(null);
    } catch (err) {
      setError("Failed to load messages");
      toast.error("Connection error - Could not fetch messages");
    }
  }, []);

  // Fetch new messages
  const fetchNew = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/messages/new`);
      if (!res.ok) throw new Error("Failed to fetch new messages");
      const data = await res.json();
      setNewMessages(data || []);
    } catch (err) {
      // Silent fail for new messages
    }
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

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Header 
        newCount={newMessages.length} 
        onRefresh={fetchAll} 
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        
        <Stats
          totalMessages={messages.length}
          unreadCount={newMessages.length}
          onDeleteOld={deleteOld}        // ← Fixed: passing correct function
        />

        {/* Modern Tabs */}
        <div className="flex border-b border-gray-800 mb-8">
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
          refresh={fetchAll}
        />

        {error && (
          <div className="text-center py-10 text-red-400">⚠️ {error}</div>
        )}
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1f2937",
            color: "#e5e7eb",
            border: "1px solid #374151",
          },
        }}
      />
    </div>
  );
}

export default App;