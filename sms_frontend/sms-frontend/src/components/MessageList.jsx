import { format, isValid, parse } from "date-fns";
import {
  CheckCircle,
  Clock,
  Copy,
  Minus,
  Phone,
  Plus,
  Reply,
  Trash2,
  X,
  Download,
  Share2,
  Star,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MessageSquare,
  User,
  Search,
  Filter
} from "lucide-react";
import { useEffect, useRef, useState, useCallback, useMemo } from "react";

export default function MessageList({ messages, loading, refresh, onReply, onDelete }) {
  const containerRef = useRef(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, unread, starred
  const [starredMessages, setStarredMessages] = useState(new Set());
  const [isScrolled, setIsScrolled] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);

  // Load starred messages from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("starredMessages");
    if (stored) {
      setStarredMessages(new Set(JSON.parse(stored)));
    }
  }, []);

  // Save starred messages
  useEffect(() => {
    localStorage.setItem("starredMessages", JSON.stringify([...starredMessages]));
  }, [starredMessages]);

  const toggleStar = (messageId, e) => {
    if (e) e.stopPropagation();
    setStarredMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const toggleGroup = (dateKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
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

  // Filter and search messages
  const filteredMessages = useMemo(() => {
    let filtered = [...messages];
    
    if (searchTerm) {
      filtered = filtered.filter(msg => 
        msg.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterType === "unread") {
      filtered = filtered.filter(msg => !msg.is_read);
    } else if (filterType === "starred") {
      filtered = filtered.filter(msg => starredMessages.has(msg.id));
    }
    
    return filtered;
  }, [messages, searchTerm, filterType, starredMessages]);

  const groupedMessages = useMemo(() => {
    const groups = filteredMessages.reduce((groups, msg) => {
      const messageDate = parseDate(msg.date, msg.time);
      if (!messageDate) return groups;

      const dateKey = format(messageDate, "yyyy-MM-dd");
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(msg);
      return groups;
    }, {});

    return Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a))
      .map((dateKey) => ({
        dateKey,
        dateLabel: getDateLabel(dateKey),
        messages: [...groups[dateKey]].sort((a, b) => {
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
    return format(date, "dd MMMM yyyy");
  }

  // Handle scroll for sticky header effect
  useEffect(() => {
    const handleScroll = () => {
      if (containerRef.current) {
        setIsScrolled(containerRef.current.scrollTop > 50);
      }
    };
    
    const currentRef = containerRef.current;
    if (currentRef) {
      currentRef.addEventListener("scroll", handleScroll);
      return () => currentRef.removeEventListener("scroll", handleScroll);
    }
  }, []);

  useEffect(() => {
    if (containerRef.current && groupedMessages.length > 0) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [groupedMessages.length]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedMessage(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy:", err);
    }
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
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      copyToClipboard(message.message);
    }
  };

  const loadMore = () => {
    setVisibleCount(prev => prev + 10);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setFilterType("all");
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
          <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-500" size={24} />
        </div>
        <p className="text-gray-400 mt-6 font-medium">Loading your messages...</p>
      </div>
    );
  }

  return (
    <>
      {/* Search and Filter Bar */}
      <div className="sticky top-0 z-20 bg-gradient-to-b from-gray-950 to-gray-900/95 backdrop-blur-xl pb-4 pt-2 px-1">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
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
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
          </div>
        </div>
        
        {/* Active filters indicator */}
        {(searchTerm || filterType !== "all") && (
          <div className="flex gap-2 mt-3">
            {searchTerm && (
              <span className="bg-blue-500/20 text-blue-400 text-xs px-3 py-1 rounded-full flex items-center gap-2">
                Search: {searchTerm}
                <button onClick={() => setSearchTerm("")} className="hover:text-white">
                  <X size={12} />
                </button>
              </span>
            )}
            {filterType !== "all" && (
              <span className="bg-purple-500/20 text-purple-400 text-xs px-3 py-1 rounded-full flex items-center gap-2">
                {filterType === "unread" ? "Unread only" : "Starred only"}
                <button onClick={() => setFilterType("all")} className="hover:text-white">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className={`space-y-10 max-h-[calc(100vh-280px)] overflow-y-auto pr-3 custom-scrollbar transition-all duration-300 ${
          isScrolled ? 'scroll-smooth' : ''
        }`}
      >
        {groupedMessages.length === 0 ? (
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
            {(searchTerm || filterType !== "all") && (
              <button
                onClick={clearSearch}
                className="mt-4 text-blue-400 hover:text-blue-300 text-sm"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {groupedMessages.slice(0, visibleCount).map((group, groupIndex) => {
              const isExpanded = expandedGroups[group.dateKey] ?? false;
              const displayLimit = 4;
              const visibleMessages = isExpanded
                ? group.messages
                : group.messages.slice(0, displayLimit);
              const hasMore = group.messages.length > displayLimit;

              return (
                <div
                  key={group.dateKey}
                  className="space-y-5 animate-slideUp"
                  style={{ animationDelay: `${groupIndex * 0.05}s` }}
                >
                  <div className="flex justify-center sticky top-2 z-10 pt-1">
                    <div className="bg-gray-900/90 backdrop-blur-md border border-gray-700/50 px-6 py-2 rounded-full text-sm text-gray-400 shadow-xl">
                      {group.dateLabel} • {group.messages.length} message{group.messages.length !== 1 && 's'}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {visibleMessages.map((msg, msgIndex) => (
                      <div
                        key={msg.id}
                        onClick={() => setSelectedMessage(msg)}
                        className="group relative bg-gradient-to-br from-gray-900 to-gray-900/95 border border-gray-800 hover:border-gray-600 rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 cursor-pointer overflow-hidden"
                        style={{ animationDelay: `${msgIndex * 0.03}s` }}
                      >
                        {/* Star button */}
                        <button
                          onClick={(e) => toggleStar(msg.id, e)}
                          className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        >
                          <Star
                            size={20}
                            className={`transition-colors ${
                              starredMessages.has(msg.id)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-600 hover:text-yellow-400"
                            }`}
                          />
                        </button>

                        <div className="flex justify-between items-start pr-8">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                                <User className="text-white" size={22} />
                              </div>
                              {!msg.is_read && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-gray-900 animate-pulse" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-white text-lg">
                                {msg.number || "Unknown Sender"}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                                <Clock size={12} />
                                {parseDate(msg.date, msg.time)
                                  ? format(parseDate(msg.date, msg.time), "HH:mm")
                                  : msg.time}
                              </p>
                            </div>
                          </div>

                          {!msg.is_read && (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-medium px-3 py-1.5 rounded-full border border-emerald-500/20 backdrop-blur-sm">
                              NEW
                            </span>
                          )}
                        </div>

                        <div className="mt-5 pl-16">
                          <p className="text-gray-300 leading-relaxed text-justify hyphens-auto text-[15px] line-clamp-3">
                            {msg.message}
                          </p>
                        </div>

                        {/* Quick actions on hover */}
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(msg.message);
                            }}
                            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all"
                            title="Copy message"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onReply) onReply(msg);
                            }}
                            className="p-2 bg-gray-800 hover:bg-blue-600 rounded-xl transition-all"
                            title="Reply"
                          >
                            <Reply size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {hasMore && (
                    <div className="flex justify-center pt-2">
                      <button
                        onClick={() => toggleGroup(group.dateKey)}
                        className="flex items-center gap-2 bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm border border-gray-700 hover:border-gray-600 text-gray-300 px-8 py-3 rounded-2xl text-sm font-medium transition-all active:scale-95"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={18} />
                            Show Less
                          </>
                        ) : (
                          <>
                            <ChevronDown size={18} />
                            Show {group.messages.length - displayLimit} More
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {visibleCount < groupedMessages.length && (
              <div className="flex justify-center py-6">
                <button
                  onClick={loadMore}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-2xl text-gray-300 transition-all hover:scale-105"
                >
                  Load More Messages
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Enhanced Modal */}
      {selectedMessage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setSelectedMessage(null)}
        >
          <div 
            className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 px-8 py-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                    <Phone className="text-white" size={26} />
                  </div>
                  {!selectedMessage.is_read && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-white text-2xl">
                      {selectedMessage.number || "Unknown Sender"}
                    </p>
                    <button
                      onClick={(e) => toggleStar(selectedMessage.id, e)}
                      className="hover:scale-110 transition-transform"
                    >
                      <Star
                        size={22}
                        className={`transition-colors ${
                          starredMessages.has(selectedMessage.id)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-500 hover:text-yellow-400"
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <Clock size={14} />
                    {parseDate(selectedMessage.date, selectedMessage.time)
                      ? format(
                          parseDate(selectedMessage.date, selectedMessage.time),
                          "dd MMMM yyyy • HH:mm"
                        )
                      : selectedMessage.time}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMessage(null)}
                className="text-gray-400 hover:text-white p-2 hover:bg-gray-800 rounded-xl transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Message Content */}
            <div className="p-10">
              <div className="bg-gradient-to-br from-gray-950 to-black border border-gray-800 rounded-2xl p-8 shadow-inner">
                <p className="text-gray-100 leading-relaxed text-lg text-justify hyphens-auto whitespace-pre-wrap">
                  {selectedMessage.message}
                </p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="border-t border-gray-800 px-8 py-6 flex gap-3">
              <button
                onClick={() => copyToClipboard(selectedMessage.message)}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3.5 rounded-xl transition-all active:scale-95 font-medium"
              >
                <Copy size={18} />
                Copy
              </button>

              <button
                onClick={() => shareMessage(selectedMessage)}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3.5 rounded-xl transition-all active:scale-95 font-medium"
              >
                <Share2 size={18} />
                Share
              </button>

              <button
                onClick={() => exportMessage(selectedMessage)}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3.5 rounded-xl transition-all active:scale-95 font-medium"
              >
                <Download size={18} />
                Export
              </button>

              <button
                onClick={() => {
                  if (onReply) onReply(selectedMessage);
                  setSelectedMessage(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl transition-all active:scale-95 font-medium shadow-lg shadow-blue-600/20"
              >
                <Reply size={18} />
                Reply
              </button>

              <button
                onClick={() => {
                  if (onDelete && confirm("Delete this message?")) {
                    onDelete(selectedMessage.id);
                    setSelectedMessage(null);
                  }
                }}
                className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-5 py-3.5 rounded-xl transition-all active:scale-95"
              >
                <Trash2 size={18} />
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
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
          animation-fill-mode: both;
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
      `}</style>
    </>
  );
}