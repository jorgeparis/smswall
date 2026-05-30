import { useState } from "react";
import {
  X,
  Send,
  MessageSquare,
  Users,
  BookOpen,
  Check,
  AlertCircle,
  Phone,
  User
} from "lucide-react";
import toast from "react-hot-toast";

export default function SendSMS({ onClose, onSend, onShowTemplates, contacts }) {
  const [toNumber, setToNumber] = useState("");
  const [message, setMessage] = useState("");
  const [senderId, setSenderId] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showContactPicker, setShowContactPicker] = useState(false);

  const characterCount = message.length;
  const maxLength = 1600;
  const messageCount = Math.ceil(characterCount / 160);
  const remainingChars = maxLength - characterCount;

  const handleSend = async () => {
    if (!toNumber.trim()) {
      toast.error("Please enter a recipient number");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setSending(true);
    const success = await onSend(toNumber.trim(), message.trim(), senderId.trim() || null);
    setSending(false);

    if (success) {
      setToNumber("");
      setMessage("");
      setSenderId("");
      onClose();
    }
  };

  const formatPhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)}`;
  };

  const quickReplies = [
    "Thank you for your message. We'll get back to you shortly.",
    "Your request has been received. Our team will assist you.",
    "Thank you for contacting us. How can we help you today?",
    "This is an automated response. Your message has been received.",
  ];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-2xl w-full max-w-lg overflow-hidden animate-slideUp" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <MessageSquare size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Compose SMS</h2>
              <p className="text-xs text-gray-400">Send a new text message</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Recipient Number *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="tel"
                value={toNumber}
                onChange={(e) => setToNumber(formatPhoneNumber(e.target.value))}
                placeholder="+1234567890"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Enter the recipient's phone number</p>
          </div>

          {/* Message */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Message *</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onShowTemplates}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <BookOpen size={12} />
                  Templates
                </button>
                <span className={`text-[10px] ${remainingChars < 20 ? 'text-red-400' : 'text-gray-500'}`}>
                  {remainingChars} chars left • {messageCount} SMS
                </span>
              </div>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
              placeholder="Type your message here..."
              rows="5"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            {characterCount > 0 && (
              <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500">
                <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${(characterCount / maxLength) * 100}%` }}
                  />
                </div>
                <span>{characterCount}/{maxLength}</span>
              </div>
            )}
          </div>

          {/* Quick Replies */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quick Replies
            </label>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={() => setMessage(reply)}
                  className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition"
                >
                  {reply.substring(0, 30)}...
                </button>
              ))}
            </div>
          </div>

          {/* Sender ID (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sender ID (Optional)
            </label>
            <input
              type="text"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value.slice(0, 11))}
              placeholder="SMSWall"
              maxLength="11"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-gray-500 mt-1">Max 11 characters. Leave empty for default</p>
          </div>

          {/* Message Preview */}
          {message && (
            <div className="bg-gray-800/30 rounded-xl p-3 border border-gray-700">
              <p className="text-[10px] text-gray-500 mb-1">Preview:</p>
              <p className="text-sm text-gray-300">{message}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-800 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !toNumber.trim() || !message.trim()}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} />
                Send Message
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
}