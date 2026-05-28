import { AlertTriangle, CheckCircle, Clock, Trash2, X, TrendingUp, Calendar, Filter, Shield, Bell, Zap, Database } from "lucide-react";
import { useState, useEffect } from "react";

export default function Stats({
  totalMessages = 0,
  unreadCount = 0,
  onDeleteOld,
  readRate = 0,
  weeklyTrend = 0,
  storageUsed = 0
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDays, setDeleteDays] = useState(30);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const [showConfirmAnimation, setShowConfirmAnimation] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);

  const presets = [
    { label: "1 Week", days: 7 },
    { label: "1 Month", days: 30 },
    { label: "3 Months", days: 90 },
    { label: "6 Months", days: 180 },
    { label: "1 Year", days: 365 }
  ];

  const handleDeleteOld = async () => {
    setIsDeleting(true);
    setShowConfirmAnimation(true);
    
    try {
      const response = await fetch(
        `http://localhost:8000/messages/old?days=${deleteDays}`,
        {
          method: "DELETE"
        }
      );

      const result = await response.json();

      if (response.ok) {
        setDeletedCount(result.deleted_count || 0);
        setShowSuccess(true);
        setShowDeleteModal(false);

        setTimeout(() => setShowSuccess(false), 5000);

        onDeleteOld?.(); // Refresh parent
      } else {
        throw new Error(result.message || "Failed to delete messages");
      }
    } catch (error) {
      console.error(error);
      alert("Backend connection error. Could not delete old messages.");
    } finally {
      setIsDeleting(false);
      setShowConfirmAnimation(false);
    }
  };

  const formatStorage = (bytes) => {
    if (!bytes) return "0 KB";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getReadRateColor = () => {
    if (readRate >= 80) return "text-emerald-400";
    if (readRate >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getTrendIcon = () => {
    if (weeklyTrend > 0) return <TrendingUp className="text-emerald-400" size={14} />;
    if (weeklyTrend < 0) return <TrendingUp className="text-red-400 transform rotate-180" size={14} />;
    return null;
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && showDeleteModal) {
        setShowDeleteModal(false);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showDeleteModal]);

  return (
    <>
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Database className="text-white" size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Message Analytics</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Live</span>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Total Messages */}
          <div className="group relative overflow-hidden bg-gray-950 rounded-2xl p-6 border border-gray-800 hover:border-gray-600 transition-all duration-300 hover:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-purple-600/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Clock className="text-white" size={24} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total Messages</div>
                  <div className="text-4xl font-bold text-white mt-1 tabular-nums">
                    {totalMessages.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((totalMessages / 10000) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Unread Messages */}
          <div className="group relative overflow-hidden bg-gray-950 rounded-2xl p-6 border border-gray-800 hover:border-gray-600 transition-all duration-300 hover:shadow-xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-500/5 to-red-600/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <AlertTriangle className="text-white" size={24} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Unread Messages</div>
                  <div className="text-4xl font-bold text-white mt-1 tabular-nums">
                    {unreadCount.toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-red-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((unreadCount / 1000) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Read Rate */}
          <div className="bg-gray-950/50 rounded-xl p-4 border border-gray-800 hover:bg-gray-950 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Read Rate</span>
              <Shield size={14} className="text-gray-600" />
            </div>
            <div className={`text-2xl font-bold ${getReadRateColor()}`}>
              {readRate || 0}%
            </div>
            <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${readRate || 0}%` }}
              />
            </div>
          </div>

          {/* Weekly Trend */}
          <div className="bg-gray-950/50 rounded-xl p-4 border border-gray-800 hover:bg-gray-950 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">Weekly Trend</span>
              {getTrendIcon()}
            </div>
            <div className="text-2xl font-bold text-white">
              {weeklyTrend > 0 ? "+" : ""}{weeklyTrend || 0}
            </div>
            <div className="text-xs text-gray-600 mt-1">vs last week</div>
          </div>
        </div>

        {/* Advanced Actions */}
        <div className="space-y-3">
          {/* Delete Button */}
          <button
            onClick={() => setShowDeleteModal(true)}
            className="group relative w-full flex items-center justify-center gap-3 bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 border border-red-500/30 hover:border-red-500/50 text-red-400 py-4 rounded-2xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/5 transition-colors" />
            <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
            <span className="font-medium">Clean Up Old Messages</span>
            <Zap size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Quick Stats Info */}
          {storageUsed > 0 && (
            <div className="flex items-center justify-between text-xs text-gray-600 px-2 py-2">
              <span>Storage used</span>
              <span className="font-mono">{formatStorage(storageUsed)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[60] flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-3xl w-full max-w-md overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated Header */}
            <div className="relative p-8 text-center">
              <div className={`absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent transition-opacity duration-500 ${showConfirmAnimation ? 'opacity-100' : 'opacity-0'}`} />
              
              <div className={`mx-auto w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-2xl flex items-center justify-center border-2 border-red-500/30 mb-6 transition-all duration-300 ${showConfirmAnimation ? 'scale-110' : 'scale-100'}`}>
                {showConfirmAnimation ? (
                  <div className="animate-spin rounded-full w-8 h-8 border-2 border-red-400 border-t-transparent" />
                ) : (
                  <AlertTriangle className="text-red-400" size={40} />
                )}
              </div>

              <h3 className="text-2xl font-bold text-white mb-3">
                Delete Old Messages
              </h3>
              <p className="text-gray-400 leading-relaxed">
                This action cannot be undone. Messages older than the selected period will be permanently removed from your system.
              </p>
            </div>

            {/* Time Selection */}
            <div className="px-8 pb-6">
              <label className="block text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
                <Calendar size={16} />
                Delete messages older than
              </label>
              
              {/* Preset Buttons */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {presets.map((preset) => (
                  <button
                    key={preset.days}
                    onClick={() => {
                      setDeleteDays(preset.days);
                      setSelectedPreset(preset.days);
                    }}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                      deleteDays === preset.days
                        ? "bg-red-500/20 border-red-500/50 text-red-400"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                    } border`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Slider */}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="730"
                    step="1"
                    value={deleteDays}
                    onChange={(e) => {
                      setDeleteDays(Number(e.target.value));
                      setSelectedPreset(null);
                    }}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                  <div className="bg-gray-800 px-5 py-3 rounded-2xl font-mono text-lg font-semibold text-white min-w-[85px] text-center border border-gray-700">
                    {deleteDays}d
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-600 px-1">
                  <span>1 day</span>
                  <span>1 year</span>
                  <span>2 years</span>
                </div>
              </div>

              {/* Warning */}
              <div className="mt-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                <div className="flex items-start gap-3">
                  <Bell size={16} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-400/80">
                    This will permanently delete approximately{" "}
                    <span className="font-bold text-amber-300">
                      {Math.floor(totalMessages * (deleteDays / 365))}
                    </span>{" "}
                    messages
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-gray-800 p-5 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition-all active:scale-95"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOld}
                disabled={isDeleting}
                className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:from-red-800 disabled:to-red-800 text-white font-medium flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-red-500/20"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={18} />
                    Confirm Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-8 right-8 z-[70] animate-slideUp">
          <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-start gap-4 p-5 pr-12 relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 to-emerald-600" />
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="text-emerald-400" size={28} />
              </div>
              <div>
                <p className="font-bold text-emerald-100">Cleanup Complete</p>
                <p className="text-emerald-300/80 text-sm mt-1">
                  Successfully deleted {deletedCount.toLocaleString()} old messages
                </p>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                className="absolute top-3 right-3 text-emerald-400/60 hover:text-emerald-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
        }
      `}</style>
    </>
  );
}