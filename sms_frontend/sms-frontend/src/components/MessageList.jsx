import { format, isValid, parse } from "date-fns";
import {
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  Filter,
  MailOpen,
  MessageSquare,
  Phone,
  Reply,
  Search,
  Share2,
  Sparkles,
  Square,
  Star,
  Trash,
  Trash2,
  User,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function MessageList({
  messages = [],
  loading = false,
  refresh = () => {},
  onReply = () => {},
  onDelete = () => {},
  onMarkAsRead = () => {}
}) {
  const containerRef = useRef(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [starredMessages, setStarredMessages] = useState(new Set());
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(10);

  // Load starred messages
  useEffect(() => {
    const stored = localStorage.getItem("starredMessages");
    if (stored) {
      try {
        setStarredMessages(new Set(JSON.parse(stored)));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "starredMessages",
      JSON.stringify([...starredMessages])
    );
  }, [starredMessages]);

  const toggleStar = (messageId, e) => {
    if (e) e.stopPropagation();
    setStarredMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) newSet.delete(messageId);
      else newSet.add(messageId);
      return newSet;
    });
  };

  const toggleGroup = (dateKey) => {
    setExpandedGroups((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }));
  };

  const parseDate = useCallback((dateStr, timeStr) => {
    try {
      const [day, month, year] = dateStr.split("/").map(Number);
      const fullYear = year < 100 ? 2000 + year : year;
      const date = parse(
        `${fullYear}-${month}-${day} ${timeStr}`,
        "yyyy-MM-dd HH:mm:ss",
        new Date()
      );
      return isValid(date) ? date : null;
    } catch {
      return null;
    }
  }, []);

  // Handle message click - automatically mark as read
  const handleMessageClick = async (msg) => {
    // If message is unread, mark it as read
    if (!msg.is_read && onMarkAsRead) {
      await onMarkAsRead(msg.file_id);
      // Update local state immediately for better UX
      msg.is_read = true;
    }
    // Open modal
    setSelectedMessage(msg);
  };

  const toggleSelectMessage = (messageId) => {
    setSelectedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) newSet.delete(messageId);
      else newSet.add(messageId);
      return newSet;
    });
  };

  const selectAllMessages = () => {
    setSelectedMessages(new Set(filteredMessages.map((msg) => msg.id)));
  };

  const clearSelection = () => {
    setSelectedMessages(new Set());
  };

  const markSelectedAsRead = async () => {
    if (selectedMessages.size === 0) return;
    const toRead = filteredMessages.filter(
      (m) => selectedMessages.has(m.id) && !m.is_read
    );
    for (const msg of toRead) {
      await onMarkAsRead?.(msg.file_id);
    }
    alert(`Marked ${toRead.length} messages as read`);
    setSelectedMessages(new Set());
    refresh();
  };

  const deleteSelected = () => {
    if (selectedMessages.size === 0) return;
    if (confirm(`Delete ${selectedMessages.size} messages?`)) {
      selectedMessages.forEach((id) => onDelete?.(id));
      alert(`Deleted ${selectedMessages.size} messages`);
      setSelectedMessages(new Set());
      refresh();
    }
  };

  // Filter messages
  const filteredMessages = useMemo(() => {
    let filtered = [...messages];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (msg) =>
          (msg.message || "").toLowerCase().includes(term) ||
          (msg.number || "").toLowerCase().includes(term)
      );
    }
    if (filterType === "unread")
      filtered = filtered.filter((msg) => !msg.is_read);
    if (filterType === "starred")
      filtered = filtered.filter((msg) => starredMessages.has(msg.id));
    return filtered;
  }, [messages, searchTerm, filterType, starredMessages]);

  // Group messages
  const groupedMessages = useMemo(() => {
    const groups = {};
    for (const msg of filteredMessages) {
      const messageDate = parseDate(msg.date, msg.time);
      if (!messageDate) continue;
      const dateKey = format(messageDate, "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(msg);
    }
    return Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a))
      .map((dateKey) => ({
        dateKey,
        dateLabel: getDateLabel(dateKey),
        messages: groups[dateKey].sort((a, b) => {
          const da = parseDate(a.date, a.time);
          const db = parseDate(b.date, b.time);
          return db - da;
        })
      }));
  }, [filteredMessages, parseDate]);

  function getDateLabel(dateStr) {
    const date = new Date(dateStr);
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");
    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    return format(date, "dd MMM yyyy");
  }

  const loadMore = () => setVisibleCount((prev) => prev + 5);
  const clearSearch = () => {
    setSearchTerm("");
    setFilterType("all");
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch (err) {}
  };

  const exportMessage = (message) => {
    const content = `From: ${message.number}\nDate: ${message.date} ${message.time}\n\n${message.message}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `message_${message.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareMessage = async (message) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Message from " + message.number,
          text: message.message
        });
      } catch (err) {}
    } else {
      copyToClipboard(message.message);
    }
  };

  const selectedCount = selectedMessages.size;
  const visibleGroups = groupedMessages.slice(0, visibleCount);
  const hasMore = visibleCount < groupedMessages.length;

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
          <Sparkles
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-500"
            size={24}
          />
        </div>
        <p className="text-gray-400 mt-6 font-medium">
          Loading your messages...
        </p>
      </div>
    );
  }

  if (groupedMessages.length === 0) {
    return (
      <div className="text-center py-32 animate-fadeIn">
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
          <MessageSquare className="text-gray-600" size={40} />
        </div>
        <p className="text-gray-400 text-xl font-medium">No messages found</p>
        <p className="text-gray-500 text-sm mt-2">
          {searchTerm || filterType !== "all"
            ? "Try adjusting your filters"
            : "New SMS will appear here"}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Search and Filter Bar */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-gray-950 to-gray-900/95 backdrop-blur-xl pb-4 pt-2 px-1">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"
              size={18}
            />
            <input
              type="text"
              placeholder="Search messages or senders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-2xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-gray-800/50 border border-gray-700 rounded-2xl px-4 py-3 text-white appearance-none cursor-pointer focus:outline-none focus:border-blue-500 pr-10"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="starred">Starred</option>
            </select>
            <Filter
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none"
              size={16}
            />
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div className="sticky top-[100px] z-20 bg-blue-500/10 backdrop-blur-md border border-blue-500/30 rounded-xl p-3 mb-4 animate-slideDown">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <CheckSquare size={18} className="text-blue-400" />
              <span className="text-sm text-white font-medium">
                {selectedCount} selected
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAllMessages}
                className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition"
              >
                Clear
              </button>
              <button
                onClick={markSelectedAsRead}
                className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded-lg transition flex items-center gap-1"
              >
                <MailOpen size={12} /> Mark Read
              </button>
              <button
                onClick={deleteSelected}
                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg transition flex items-center gap-1"
              >
                <Trash size={12} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message List */}
      <div className="space-y-8 max-h-[calc(100vh-220px)] overflow-y-auto pr-3 custom-scrollbar">
        {visibleGroups.map((group) => {
          const isExpanded = expandedGroups[group.dateKey] ?? false;
          const displayLimit = 4;
          const visibleMessages = isExpanded
            ? group.messages
            : group.messages.slice(0, displayLimit);
          const hasMore = group.messages.length > displayLimit;

          return (
            <div key={group.dateKey} className="space-y-4 animate-slideUp">
              {/* Date Header */}
              <div className="flex justify-center sticky top-2 z-10 pt-1">
                <div className="bg-gray-900/90 backdrop-blur-md border border-gray-700/50 px-6 py-2 rounded-full text-sm text-gray-400 shadow-xl">
                  {group.dateLabel} • {group.messages.length} message
                  {group.messages.length !== 1 && "s"}
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3">
                {visibleMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`group relative bg-gradient-to-br from-gray-900 to-gray-900/95 border rounded-2xl p-5 transition-all duration-300 cursor-pointer overflow-hidden ${
                      selectedMessages.has(msg.id)
                        ? "border-blue-500 bg-blue-500/5"
                        : "border-gray-800 hover:border-gray-600"
                    } ${!msg.is_read ? "ring-1 ring-blue-500/30" : ""}`}
                    onClick={() => handleMessageClick(msg)}
                  >
                    {/* Selection Checkbox */}
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelectMessage(msg.id);
                        }}
                        className="p-1 rounded hover:bg-gray-700 transition"
                      >
                        {selectedMessages.has(msg.id) ? (
                          <CheckSquare size={18} className="text-blue-400" />
                        ) : (
                          <Square size={18} className="text-gray-500" />
                        )}
                      </button>
                    </div>

                    {/* Star button */}
                    <button
                      onClick={(e) => toggleStar(msg.id, e)}
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    >
                      <Star
                        size={18}
                        className={`transition-colors ${
                          starredMessages.has(msg.id)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-600 hover:text-yellow-400"
                        }`}
                      />
                    </button>

                    <div className="flex items-start gap-4 pl-8 pr-8">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <User className="text-white" size={22} />
                        </div>
                        {!msg.is_read && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-gray-900 animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-white text-lg">
                            {msg.number || "Unknown Sender"}
                          </p>
                          <p className="text-xs text-gray-500 flex items-center gap-1.5">
                            <Clock size={12} />
                            {parseDate(msg.date, msg.time)
                              ? format(parseDate(msg.date, msg.time), "HH:mm")
                              : msg.time}
                          </p>
                        </div>
                        <p className="text-gray-300 leading-relaxed text-justify text-[15px] line-clamp-2 mt-2">
                          {msg.message}
                        </p>
                        {!msg.is_read && (
                          <span className="inline-block mt-2 bg-emerald-500/10 text-emerald-400 text-[10px] font-medium px-2 py-1 rounded-full border border-emerald-500/20">
                            NEW
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick actions on hover */}
                    <div className="absolute bottom-3 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(msg.message);
                        }}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all"
                        title="Copy"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onReply) onReply(msg);
                        }}
                        className="p-2 bg-gray-800 hover:bg-blue-600 rounded-xl transition-all"
                        title="Reply"
                      >
                        <Reply size={14} />
                      </button>
                      {!msg.is_read && onMarkAsRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onMarkAsRead(msg.file_id);
                          }}
                          className="p-2 bg-gray-800 hover:bg-green-600 rounded-xl transition-all"
                          title="Mark as read"
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Show More/Less */}
              {hasMore && (
                <div className="flex justify-center pt-1">
                  <button
                    onClick={() => toggleGroup(group.dateKey)}
                    className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm border border-gray-700 hover:border-gray-600 text-gray-300 px-6 py-2 rounded-xl text-sm font-medium transition-all"
                  >
                    {isExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                    {isExpanded
                      ? "Show Less"
                      : `Show ${group.messages.length - displayLimit} More`}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Load More Groups */}
        {hasMore && (
          <div className="flex justify-center py-4">
            <button
              onClick={loadMore}
              className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 transition-all"
            >
              Load More Dates
            </button>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedMessage(null)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Phone className="text-white" size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white text-lg">
                      {selectedMessage.number || "Unknown"}
                    </p>
                    <button
                      onClick={(e) => toggleStar(selectedMessage.id, e)}
                      className="hover:scale-110 transition"
                    >
                      <Star
                        size={16}
                        className={
                          starredMessages.has(selectedMessage.id)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-500"
                        }
                      />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {parseDate(selectedMessage.date, selectedMessage.time)
                      ? format(
                          parseDate(selectedMessage.date, selectedMessage.time),
                          "dd MMM yyyy • HH:mm"
                        )
                      : selectedMessage.time}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-gray-400 hover:text-white p-1 hover:bg-gray-800 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-5">
                <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.message}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-800 px-6 py-4 flex gap-2">
              <button
                onClick={() => copyToClipboard(selectedMessage.message)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition flex items-center justify-center gap-1"
              >
                <Copy size={14} /> Copy
              </button>
              <button
                onClick={() => shareMessage(selectedMessage)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition flex items-center justify-center gap-1"
              >
                <Share2 size={14} /> Share
              </button>
              <button
                onClick={() => exportMessage(selectedMessage)}
                className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition flex items-center justify-center gap-1"
              >
                <Download size={14} /> Export
              </button>
              <button
                onClick={() => {
                  onReply(selectedMessage);
                  setSelectedMessage(null);
                }}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white transition flex items-center justify-center gap-1"
              >
                <Reply size={14} /> Reply
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this message?")) {
                    onDelete(selectedMessage.id);
                    setSelectedMessage(null);
                  }
                }}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 rounded-lg transition"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
          animation-fill-mode: both;
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(75, 85, 99, 0.8);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(107, 114, 128, 0.8);
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}
