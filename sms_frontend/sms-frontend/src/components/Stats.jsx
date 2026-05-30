import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle,
  Clock,
  Database,
  Lock,
  Shield,
  Trash2,
  TrendingUp,
  X,
  Zap,
  Activity,
  HardDrive,
  Mail,
  MailOpen,
  Users,
  BarChart3,
  ChevronRight
} from "lucide-react";
import { useEffect, useState } from "react";

export default function Stats({
  totalMessages = 0,
  unreadCount = 0,
  onDeleteOld,
  readRate = 0,
  weeklyTrend = 0,
  storageUsed = 0,
  userRole = "user"
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDays, setDeleteDays] = useState(30);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const [showConfirmAnimation, setShowConfirmAnimation] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [showAdminRequiredModal, setShowAdminRequiredModal] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const presets = [
    { label: "7d", days: 7, icon: "📅" },
    { label: "30d", days: 30, icon: "📆" },
    { label: "90d", days: 90, icon: "📊" },
    { label: "180d", days: 180, icon: "📈" },
    { label: "365d", days: 365, icon: "📉" }
  ];

  const isAdmin = userRole === "admin";

  const getAuthToken = () => {
    return sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
  };

  const handleDeleteOld = async () => {
    if (!isAdmin) {
      setShowAdminRequiredModal(true);
      return;
    }

    setIsDeleting(true);
    setShowConfirmAnimation(true);

    try {
      const token = getAuthToken();
      if (!token) throw new Error("No authentication token found");

      const response = await fetch(
        `http://localhost:8000/messages/old?days=${deleteDays}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.status === 401) throw new Error("Session expired. Please login again.");

      const result = await response.json();

      if (response.ok) {
        setDeletedCount(result.deleted_count || 0);
        setShowSuccess(true);
        setShowDeleteModal(false);
        setTimeout(() => setShowSuccess(false), 5000);
        if (onDeleteOld) onDeleteOld(deleteDays);
      } else {
        throw new Error(result.message || "Failed to delete messages");
      }
    } catch (error) {
      console.error(error);
      if (error.message.includes("Session expired")) {
        alert("Session expired. Please login again.");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("user");
        window.location.href = "/login";
      } else {
        alert("Backend connection error. Could not delete old messages.");
      }
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
    const rate = readRate || 0;
    if (rate >= 80) return "text-emerald-400";
    if (rate >= 50) return "text-amber-400";
    return "text-red-400";
  };

  const getReadRateBg = () => {
    const rate = readRate || 0;
    if (rate >= 80) return "bg-emerald-500/20";
    if (rate >= 50) return "bg-amber-500/20";
    return "bg-red-500/20";
  };

  const getTrendIcon = () => {
    if (weeklyTrend > 0) return <TrendingUp className="text-emerald-400" size={14} />;
    if (weeklyTrend < 0) return <TrendingUp className="text-red-400 transform rotate-180" size={14} />;
    return null;
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && showDeleteModal) setShowDeleteModal(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showDeleteModal]);

  // Stat Card Component
  const StatCard = ({ title, value, icon: Icon, iconBg, valueColor, trend, subtitle }) => (
    <div className="group relative overflow-hidden bg-gradient-to-br from-gray-900/80 to-gray-950/80 rounded-2xl p-5 border border-gray-800 hover:border-gray-700 transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-current/5 to-transparent rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 opacity-0 group-hover:opacity-100" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center shadow-lg`}>
            <Icon className="text-white" size={20} />
          </div>
          {trend && <div className="flex items-center gap-1 bg-gray-800/50 px-2 py-1 rounded-full">{trend}</div>}
        </div>
        
        <div className="space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{title}</p>
          <p className={`text-3xl font-bold ${valueColor || 'text-white'} tabular-nums`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-[10px] text-gray-600">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  // Metric Card Component
  const MetricCard = ({ label, value, icon: Icon, progress, color }) => (
    <div className="bg-gray-900/30 rounded-xl p-4 border border-gray-800 hover:bg-gray-900/50 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon size={14} className={`text-${color}-400`} />
          <span className="text-xs text-gray-500">{label}</span>
        </div>
        <span className={`text-xs font-medium text-${color}-400`}>{value}</span>
      </div>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r from-${color}-500 to-${color}-400 rounded-full transition-all duration-500`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );

  // Format read rate to 1 decimal place
  const formattedReadRate = (readRate || 0).toFixed(1);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Analytics Overview</h2>
              <p className="text-xs text-gray-500">Real-time message statistics</p>
            </div>
            {isAdmin && (
              <div className="ml-2 px-2 py-1 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                <div className="flex items-center gap-1">
                  <Shield size={10} className="text-purple-400" />
                  <span className="text-[10px] font-semibold text-purple-300">Admin</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400/80">Live</span>
            </div>
            
            {storageUsed > 0 && (
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800/50 rounded-full text-[10px] text-gray-500 hover:text-gray-300 transition"
              >
                <HardDrive size={12} />
                <span>{formatStorage(storageUsed)}</span>
                <ChevronRight size={10} className={`transition-transform ${showDetails ? 'rotate-90' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Main Stats Grid - 2x2 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Messages"
            value={totalMessages}
            icon={Mail}
            iconBg="bg-blue-500/20"
          />
          <StatCard
            title="Unread"
            value={unreadCount}
            icon={MailOpen}
            iconBg="bg-amber-500/20"
            valueColor="text-amber-400"
          />
          <StatCard
            title="Read Rate"
            value={`${formattedReadRate}%`}
            icon={Activity}
            iconBg={getReadRateBg()}
            valueColor={getReadRateColor()}
            trend={getTrendIcon()}
          />
          <StatCard
            title="Weekly Trend"
            value={weeklyTrend > 0 ? `+${weeklyTrend}` : weeklyTrend || 0}
            icon={TrendingUp}
            iconBg="bg-cyan-500/20"
            valueColor={weeklyTrend >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
        </div>

        {/* Detailed Stats - Show/Hide */}
        {showDetails && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-slideDown">
            <MetricCard
              label="Read Rate Progress"
              value={`${formattedReadRate}%`}
              icon={CheckCircle}
              progress={readRate}
              color="emerald"
            />
            <MetricCard
              label="Unread Ratio"
              value={`${unreadCount > 0 ? ((unreadCount / totalMessages) * 100).toFixed(1) : 0}%`}
              icon={AlertTriangle}
              progress={unreadCount > 0 ? (unreadCount / totalMessages) * 100 : 0}
              color="amber"
            />
            <div className="bg-gray-900/30 rounded-xl p-4 border border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-purple-400" />
                <span className="text-xs text-gray-500">Message Distribution</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Read vs Unread</span>
                <span className="text-xs text-gray-500">
                  {formattedReadRate}% / {(100 - readRate).toFixed(1)}%
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500" style={{ width: `${readRate}%` }} />
                <div className="bg-amber-500/50" style={{ width: `${100 - readRate}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Admin Action Button */}
        {isAdmin && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="group relative w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500/10 to-red-600/10 hover:from-red-500/20 hover:to-red-600/20 border border-red-500/30 hover:border-red-500/50 text-red-400 py-3 rounded-xl transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/5 transition-colors" />
            <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
            <span className="text-sm font-medium">Clean Up Old Messages</span>
            <Zap size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {!isAdmin && (
          <button
            onClick={() => setShowAdminRequiredModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-gray-500/10 border border-gray-600/30 text-gray-500 py-3 rounded-xl cursor-not-allowed"
            disabled
          >
            <Lock size={16} className="opacity-50" />
            <span className="text-sm font-medium">Admin Access Required</span>
          </button>
        )}
      </div>

      {/* Admin Required Modal - Compact */}
      {showAdminRequiredModal && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[60] flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowAdminRequiredModal(false)}
        >
          <div
            className="bg-gray-900 border border-amber-500/30 rounded-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="mx-auto w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center border border-amber-500/30 mb-4">
                <Shield className="text-amber-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Admin Required</h3>
              <p className="text-gray-400 text-sm mb-5">
                This action is restricted to administrators only.
              </p>
              <button
                onClick={() => setShowAdminRequiredModal(false)}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-sm transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal - Compact */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[60] flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400" />
              <span className="text-xs text-red-400 font-medium">Warning: Permanent Action</span>
            </div>

            {/* Content */}
            <div className="p-5">
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                  <Trash2 className="text-red-400" size={24} />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-2">Delete Old Messages</h3>
              <p className="text-gray-400 text-xs text-center mb-5">
                This action cannot be undone. Messages older than selected period will be removed.
              </p>

              {/* Presets */}
              <div className="flex gap-1.5 mb-4">
                {presets.map((preset) => (
                  <button
                    key={preset.days}
                    onClick={() => {
                      setDeleteDays(preset.days);
                      setSelectedPreset(preset.days);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition ${
                      deleteDays === preset.days
                        ? "bg-red-500/20 border-red-500/50 text-red-400"
                        : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"
                    } border`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-3">
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
                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                  />
                  <div className="bg-gray-800 px-3 py-1.5 rounded-lg font-mono text-sm font-semibold text-white min-w-[60px] text-center">
                    {deleteDays}d
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-600 px-1">
                  <span>1d</span>
                  <span>1y</span>
                  <span>2y</span>
                </div>
              </div>

              {/* Warning */}
              <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg mb-4">
                <div className="flex items-start gap-2">
                  <Bell size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <span className="text-[10px] text-amber-400/80">
                    Will delete ~{Math.floor(totalMessages * (deleteDays / 365))} messages
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOld}
                  disabled={isDeleting}
                  className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white text-sm font-medium flex items-center justify-center gap-1.5 transition"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={12} />
                      Confirm
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-4 right-4 z-[70] animate-slideUp">
          <div className="bg-emerald-900/95 border border-emerald-500/30 rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center gap-3 p-3 pr-8 relative">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="text-emerald-400" size={16} />
              </div>
              <div>
                <p className="font-semibold text-emerald-100 text-sm">Cleanup Complete</p>
                <p className="text-emerald-300/80 text-xs">Deleted {deletedCount.toLocaleString()} messages</p>
              </div>
              <button onClick={() => setShowSuccess(false)} className="absolute top-2 right-2 text-emerald-400/60 hover:text-emerald-300">
                <X size={12} />
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
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        .animate-slideDown { animation: slideDown 0.2s ease-out; }
      `}</style>
    </>
  );
}