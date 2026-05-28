import { AlertTriangle, Bell, RefreshCw, Zap, Wifi, WifiOff, Activity, Clock, ChevronDown, Settings, Power, Signal } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import SmsWallIcon from "./SmallIcone";

export default function Header({ newCount = 0, onRefresh, connectionQuality = "good", uptime = 0 }) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [lastChecked, setLastChecked] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Blink effect for new messages
  useEffect(() => {
    if (newCount > 0) {
      setIsBlinking(true);
      const timer = setTimeout(() => setIsBlinking(false), 2800);
      return () => clearTimeout(timer);
    }
  }, [newCount]);

  // Real Backend Connection Test with response time
  const checkBackendConnection = useCallback(async () => {
    const startTime = performance.now();
    try {
      const response = await fetch("http://localhost:8000/messages", {
        method: "GET",
        signal: AbortSignal.timeout(3000)
      });

      const endTime = performance.now();
      const latency = Math.round(endTime - startTime);

      if (response.ok) {
        setBackendStatus("connected");
        setResponseTime(latency);
        setLastChecked(new Date());
      } else {
        setBackendStatus("disconnected");
        setResponseTime(null);
      }
    } catch (error) {
      setBackendStatus("disconnected");
      setResponseTime(null);
    }
  }, []);

  useEffect(() => {
    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 8000);
    return () => clearInterval(interval);
  }, [checkBackendConnection]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([onRefresh?.(), checkBackendConnection()]);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getConnectionQualityColor = () => {
    switch (connectionQuality) {
      case "excellent": return "text-emerald-400";
      case "good": return "text-cyan-400";
      case "fair": return "text-yellow-400";
      case "poor": return "text-red-400";
      default: return "text-gray-400";
    }
  };

  const getLatencyColor = () => {
    if (!responseTime) return "text-gray-500";
    if (responseTime < 100) return "text-emerald-400";
    if (responseTime < 300) return "text-cyan-400";
    if (responseTime < 500) return "text-yellow-400";
    return "text-red-400";
  };

  const formatUptime = (seconds) => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <header className="bg-gradient-to-b from-gray-950 to-gray-900 border-b border-gray-800 py-4 sticky top-0 z-50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
        {/* Left Side - Logo & Brand */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative w-12 h-12 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl transform transition-transform group-hover:scale-105">
                <SmsWallIcon className="text-white" size={32} />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-bold tracking-[-0.04em] bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
                  SMS WALL
                </h1>
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500 rounded-full blur-sm animate-pulse" />
                  <div className="relative px-2.5 py-1 text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/30 rounded-full backdrop-blur-sm">
                    LIVE
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-mono -mt-0.5 hidden sm:block">
                BROADCAST CENTER • REAL-TIME MONITORING
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Status Indicators */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* New Messages Alert */}
          {newCount > 0 && (
            <div
              className={`relative flex items-center gap-3 bg-gradient-to-r from-red-500/15 to-red-600/10 border border-red-500/30 px-5 py-2.5 rounded-2xl transition-all duration-300 cursor-pointer hover:scale-105 ${
                isBlinking ? "animate-pulse" : ""
              }`}
              onClick={() => document.getElementById('messages')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <div className="absolute inset-0 bg-red-500/0 rounded-2xl transition-all" />
              <Bell className="text-red-400" size={18} />
              <span className="font-bold text-red-400 text-sm">
                {newCount} NEW MESSAGE{newCount > 1 ? "S" : ""}
              </span>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </div>
          )}

          {/* Backend Status with Details */}
          <div className="relative">
            <div
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all cursor-pointer hover:scale-105 ${
                backendStatus === "connected"
                  ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
                  : backendStatus === "disconnected"
                  ? "bg-red-500/10 border-red-500/30 hover:bg-red-500/15"
                  : "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/15"
              }`}
              onClick={() => setShowDetails(!showDetails)}
            >
              {backendStatus === "connected" && (
                <>
                  <div className="relative">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                    <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping opacity-75" />
                  </div>
                  <span className="text-emerald-400 font-medium text-sm">
                    Connected
                  </span>
                  {responseTime && (
                    <span className={`text-xs font-mono ${getLatencyColor()}`}>
                      {responseTime}ms
                    </span>
                  )}
                </>
              )}

              {backendStatus === "disconnected" && (
                <>
                  <WifiOff className="text-red-400" size={16} />
                  <span className="text-red-400 font-medium text-sm">
                    Disconnected
                  </span>
                </>
              )}

              {backendStatus === "checking" && (
                <>
                  <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-yellow-400 font-medium text-sm">
                    Checking...
                  </span>
                </>
              )}
              <ChevronDown size={14} className="text-gray-500" />
            </div>

            {/* Dropdown Details */}
            {showDetails && (
              <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slideDown">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Last Checked</span>
                    <span className="text-gray-300 font-mono">
                      {lastChecked ? lastChecked.toLocaleTimeString() : "Never"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Response Time</span>
                    <span className={`font-mono ${getLatencyColor()}`}>
                      {responseTime ? `${responseTime}ms` : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">API Endpoint</span>
                    <span className="text-gray-400 font-mono text-[10px]">localhost:8000</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Connection Quality Indicator */}
          <div className={`hidden md:flex items-center gap-2 bg-gray-900/50 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-gray-700`}>
            <Signal size={16} className={getConnectionQualityColor()} />
            <span className={`text-xs font-medium ${getConnectionQualityColor()}`}>
              {connectionQuality?.toUpperCase() || "GOOD"} SIGNAL
            </span>
          </div>

          {/* Uptime Indicator */}
          {uptime > 0 && (
            <div className="hidden lg:flex items-center gap-2 bg-gray-900/50 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-gray-700">
              <Activity size={16} className="text-cyan-400" />
              <span className="text-cyan-400 text-xs font-mono">
                UPTIME {formatUptime(uptime)}
              </span>
            </div>
          )}

          {/* Refresh Button with Animation */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="relative flex items-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 px-5 py-2.5 rounded-2xl text-gray-400 hover:text-white transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw 
              size={18} 
              className={`transition-transform ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} 
            />
            <span className="font-mono text-xs font-medium hidden sm:inline">
              {isRefreshing ? 'SYNCING...' : 'REFRESH'}
            </span>
          </button>

          {/* Transmission Status with Animation */}
          <div className="hidden xl:flex items-center gap-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-5 py-2.5 rounded-2xl border border-cyan-500/30 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/10 to-cyan-500/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Zap className="text-cyan-400 animate-pulse" size={16} />
            <span className="text-cyan-400 text-xs font-bold tracking-wider">
              TRANSMISSION ACTIVE
            </span>
            <div className="flex gap-0.5 ml-2">
              <div className="w-1 h-3 bg-cyan-400 animate-pulse" style={{ animationDelay: '0s' }} />
              <div className="w-1 h-3 bg-cyan-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-1 h-3 bg-cyan-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>

          {/* Settings Button (Optional) */}
          <button className="hidden lg:flex items-center justify-center w-10 h-10 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-2xl text-gray-400 hover:text-white transition-all active:scale-95">
            <Settings size={18} />
          </button>
        </div>
      </div>

      <style jsx>{`
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
        
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </header>
  );
}