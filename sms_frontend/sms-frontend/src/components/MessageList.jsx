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
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function MessageList({ messages, loading, refresh }) {
  const containerRef = useRef(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedMessage, setSelectedMessage] = useState(null);

  const toggleGroup = (dateKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  const parseDate = (dateStr, timeStr) => {
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
  };

  const groupedMessages = messages.reduce((groups, msg) => {
    const messageDate = parseDate(msg.date, msg.time);
    if (!messageDate) return groups;

    const dateKey = format(messageDate, "yyyy-MM-dd");
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  const sortedGroups = Object.keys(groupedMessages)
    .sort((a, b) => new Date(b) - new Date(a))
    .map((dateKey) => ({
      dateKey,
      dateLabel: getDateLabel(dateKey),
      messages: [...groupedMessages[dateKey]].sort((a, b) => {
        const da = parseDate(a.date, a.time);
        const db = parseDate(b.date, b.time);
        return db - da;
      })
    }));

  function getDateLabel(dateStr) {
    const date = new Date(dateStr);
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

    if (dateStr === today) return "Today";
    if (dateStr === yesterday) return "Yesterday";
    return format(date, "dd MMMM yyyy");
  }

  useEffect(() => {
    if (containerRef.current && sortedGroups.length > 0) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [sortedGroups.length]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") setSelectedMessage(null);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading messages...
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="space-y-10 max-h-[calc(100vh-180px)] overflow-y-auto pr-3 custom-scrollbar"
      >
        {sortedGroups.length === 0 ? (
          <div className="text-center py-24">
            <div className="mx-auto w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
              <Phone className="text-gray-500" size={32} />
            </div>
            <p className="text-gray-400 text-lg">No messages yet</p>
            <p className="text-gray-500 text-sm mt-1">
              New SMS will appear here
            </p>
          </div>
        ) : (
          sortedGroups.map((group) => {
            const isExpanded = expandedGroups[group.dateKey] ?? false;
            const displayLimit = 4;
            const visibleMessages = isExpanded
              ? group.messages
              : group.messages.slice(0, displayLimit);
            const hasMore = group.messages.length > displayLimit;

            return (
              <div key={group.dateKey} className="space-y-5">
                <div className="flex justify-center sticky top-2 z-10 pt-1">
                  <div className="bg-gray-900/80 backdrop-blur-md border border-gray-700 px-6 py-1.5 rounded-3xl text-sm text-gray-400 shadow-xl">
                    {group.dateLabel} • {group.messages.length} messages
                  </div>
                </div>

                <div className="space-y-4">
                  {visibleMessages.map((msg) => {
                    const dateTime = parseDate(msg.date, msg.time);
                    return (
                      <div
                        key={msg.id}
                        onClick={() => setSelectedMessage(msg)}
                        className="group bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-3xl p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 cursor-pointer"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-inner">
                              <Phone className="text-white" size={24} />
                            </div>
                            <div>
                              <p className="font-semibold text-white text-[17px]">
                                {msg.number || "Unknown Sender"}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                <Clock size={13} />
                                {dateTime
                                  ? format(dateTime, "HH:mm")
                                  : msg.time}
                              </p>
                            </div>
                          </div>

                          {!msg.is_read && (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-medium px-3 py-1 rounded-full border border-emerald-500/20">
                              NEW
                            </span>
                          )}
                        </div>

                        <div className="mt-6 pl-15">
                          <p className="text-gray-200 leading-relaxed text-justify hyphens-auto text-[15.2px] line-clamp-3">
                            {msg.message}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={() => toggleGroup(group.dateKey)}
                      className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 text-gray-300 px-8 py-3 rounded-2xl text-sm font-medium transition-all active:scale-95"
                    >
                      {isExpanded ? (
                        <>
                          <Minus size={18} />
                          Show Less
                        </>
                      ) : (
                        <>
                          <Plus size={18} />
                          Show More ({group.messages.length - displayLimit})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Larger & More Beautiful Modern Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 px-8 py-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-lg">
                  <Phone className="text-white" size={28} />
                </div>
                <div>
                  <p className="font-semibold text-white text-xl">
                    {selectedMessage.number || "Unknown Sender"}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-0.5">
                    <Clock size={16} />
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
                className="text-gray-400 hover:text-white p-3 hover:bg-gray-800 rounded-2xl transition-all"
              >
                <X size={26} />
              </button>
            </div>

            {/* Message Content - Enhanced Modern Look */}
            <div className="p-10">
              <div className="bg-gradient-to-br from-gray-950 to-gray-900 border border-gray-700 rounded-3xl p-8 shadow-inner">
                <p className="text-gray-100 leading-relaxed text-[16.5px] text-justify hyphens-auto whitespace-pre-wrap tracking-[-0.005em]">
                  {selectedMessage.message}
                </p>
              </div>
            </div>

            {/* Enhanced Action Bar */}
            <div className="border-t border-gray-800 px-8 py-6 flex gap-3">
              <button
                onClick={() => copyToClipboard(selectedMessage.message)}
                className="flex-1 flex items-center justify-center gap-3 bg-gray-800 hover:bg-gray-700 text-gray-300 py-4 rounded-2xl transition-all active:scale-[0.985]"
              >
                <Copy size={20} />
                Copy Message
              </button>

              <button
                onClick={() => console.log("Not yet avaulable pussy")}
                className="flex-1 flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl transition-all active:scale-[0.985]"
              >
                <Reply size={20} />
                Reply
              </button>

              <button
                onClick={() => {
                  refresh();
                  setSelectedMessage(null);
                }}
                className="flex items-center justify-center gap-3 bg-gray-800 hover:bg-emerald-900/30 text-emerald-400 px-7 py-4 rounded-2xl transition-all active:scale-[0.985]"
              >
                <CheckCircle size={20} />
              </button>

              <button
                onClick={() => {
                  if (confirm("Delete this message?")) setSelectedMessage(null);
                }}
                className="flex items-center justify-center gap-3 bg-gray-800 hover:bg-red-900/30 text-red-400 px-7 py-4 rounded-2xl transition-all active:scale-[0.985]"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
