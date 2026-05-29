import {
  AlertTriangle,
  Bell,
  ChevronDown,
  LogOut,
  RefreshCw,
  Shield,
  Signal,
  User,
  WifiOff,
  Zap
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import SmsWallIcon from "./SmallIcone";

export default function Header({
  newCount = 0,
  onRefresh,
  connectionQuality = "good",
  uptime = 0,
  user = null,
  onLogout
}) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [lastChecked, setLastChecked] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Blink effect for new messages
  useEffect(() => {
    if (newCount > 0) {
      setIsBlinking(true);
      const timer = setTimeout(() => setIsBlinking(false), 2800);
      return () => clearTimeout(timer);
    }
  }, [newCount]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && !event.target.closest(".user-menu-container")) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showUserMenu]);

  // Helper function to get token
  const getAuthToken = () => {
    return (
      sessionStorage.getItem("access_token") ||
      localStorage.getItem("access_token")
    );
  };

  // Comprehensive backend connection test
  const checkBackendConnection = useCallback(async () => {
    const startTime = performance.now();
    setErrorMessage(null);

    // Try multiple endpoints
    const endpoints = [
      "http://localhost:8000/health",
      "http://127.0.0.1:8000/health",
      "http://localhost:8000/"
    ];

    let lastError = null;

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          mode: "cors",
          signal: AbortSignal.timeout(3000)
        });

        const endTime = performance.now();
        const latency = Math.round(endTime - startTime);

        if (response.ok) {
          const data = await response.json();
          console.log(`Backend connected via ${endpoint}:`, data);

          setBackendStatus("connected");
          setResponseTime(latency);
          setLastChecked(new Date());
          setErrorMessage(null);
          return;
        } else {
          lastError = `HTTP ${response.status}`;
        }
      } catch (error) {
        lastError = error.message;
        console.log(`Failed to connect to ${endpoint}:`, error.message);
      }
    }

    // If we get here, all endpoints failed
    console.error("All connection attempts failed:", lastError);
    setBackendStatus("disconnected");
    setResponseTime(null);
    setLastChecked(new Date());
    setErrorMessage(lastError);
  }, []);

  // Check if backend is reachable at all (without auth)
  const checkBackendReachable = useCallback(async () => {
    try {
      // Try a simple fetch to see if backend is running
      const response = await fetch("http://localhost:8000/health", {
        method: "GET",
        mode: "no-cors", // Try no-cors mode first
        signal: AbortSignal.timeout(2000)
      });

      console.log("Backend reachability check:", response);
      return true;
    } catch (error) {
      console.error("Backend not reachable:", error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (user) {
      // Initial checks
      checkBackendConnection();

      // Set up intervals
      const connectionInterval = setInterval(checkBackendConnection, 15000);

      return () => {
        clearInterval(connectionInterval);
      };
    } else {
      setBackendStatus("checking");
    }
  }, [checkBackendConnection, user]);

  // Manual retry function
  const retryConnection = async () => {
    setBackendStatus("checking");
    await checkBackendConnection();
    if (backendStatus === "disconnected") {
      // Try to check if backend is reachable at all
      const reachable = await checkBackendReachable();
      if (!reachable) {
        setErrorMessage(
          "Backend server is not running. Please start the backend with: python main.py"
        );
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([onRefresh?.(), checkBackendConnection()]);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleLogout = () => {
    setShowUserMenu(false);
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    onLogout?.();
  };

  const getConnectionQualityColor = () => {
    switch (connectionQuality) {
      case "excellent":
        return "text-emerald-400";
      case "good":
        return "text-cyan-400";
      case "fair":
        return "text-yellow-400";
      case "poor":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  const getLatencyColor = () => {
    if (!responseTime) return "text-gray-500";
    if (responseTime < 100) return "text-emerald-400";
    if (responseTime < 300) return "text-cyan-400";
    if (responseTime < 500) return "text-yellow-400";
    return "text-red-400";
  };

  const getStatusIcon = () => {
    switch (backendStatus) {
      case "connected":
        return (
          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
        );
      case "disconnected":
        return <WifiOff className="text-red-400" size={16} />;
      case "unauthorized":
        return <AlertTriangle className="text-orange-400" size={16} />;
      default:
        return (
          <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse" />
        );
    }
  };

  const getStatusText = () => {
    switch (backendStatus) {
      case "connected":
        return "Connected";
      case "disconnected":
        return "Disconnected";
      case "unauthorized":
        return "Session Expired";
      default:
        return "Checking...";
    }
  };

  const getStatusColorClass = () => {
    switch (backendStatus) {
      case "connected":
        return "text-emerald-400";
      case "disconnected":
        return "text-red-400";
      case "unauthorized":
        return "text-orange-400";
      default:
        return "text-yellow-400";
    }
  };

  const getBorderColorClass = () => {
    switch (backendStatus) {
      case "connected":
        return "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15";
      case "disconnected":
        return "border-red-500/30 bg-red-500/10 hover:bg-red-500/15";
      case "unauthorized":
        return "border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/15";
      default:
        return "border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/15";
    }
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
          {/* User Info & Menu */}
          {user && (
            <div className="relative user-menu-container">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 bg-gray-900/50 backdrop-blur-sm border border-gray-700 hover:border-gray-600 px-4 py-2.5 rounded-2xl transition-all hover:scale-105"
              >
                <div className="flex items-center gap-2">
                  {user.role === "admin" ? (
                    <Shield size={16} className="text-purple-400" />
                  ) : (
                    <User size={16} className="text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-300">
                    {user.username}
                  </span>
                  {user.role === "admin" && (
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                      Admin
                    </span>
                  )}
                </div>
                <ChevronDown size={14} className="text-gray-500" />
              </button>

              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slideDown">
                  <div className="p-3 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                        {user.role === "admin" ? (
                          <Shield size={20} className="text-white" />
                        ) : (
                          <User size={20} className="text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {user.full_name || user.username}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <div className="px-3 py-2 text-xs text-gray-500">
                      <div className="flex justify-between mb-1">
                        <span>Role</span>
                        <span className="text-gray-300 capitalize">
                          {user.role}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Member since</span>
                        <span className="text-gray-300">
                          {user.created_at
                            ? new Date(user.created_at).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-800 p-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <LogOut size={18} />
                      <span className="text-sm">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* New Messages Alert */}
          {newCount > 0 && (
            <div
              className={`relative flex items-center gap-3 bg-gradient-to-r from-red-500/15 to-red-600/10 border border-red-500/30 px-5 py-2.5 rounded-2xl transition-all duration-300 cursor-pointer hover:scale-105 ${
                isBlinking ? "animate-pulse" : ""
              }`}
              onClick={() =>
                document
                  .getElementById("messages")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
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
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all cursor-pointer hover:scale-105 ${getBorderColorClass()}`}
              onClick={() => setShowDetails(!showDetails)}
            >
              {getStatusIcon()}
              <span className={`font-medium text-sm ${getStatusColorClass()}`}>
                {getStatusText()}
              </span>
              {responseTime && backendStatus === "connected" && (
                <span className={`text-xs font-mono ${getLatencyColor()}`}>
                  {responseTime}ms
                </span>
              )}
              <ChevronDown size={14} className="text-gray-500" />
            </div>

            {/* Dropdown Details */}
            {showDetails && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-slideDown">
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">Status</span>
                    <span className={getStatusColorClass()}>
                      {getStatusText()}
                    </span>
                  </div>
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
                    <span className="text-gray-400 font-mono text-[10px]">
                      localhost:8000
                    </span>
                  </div>

                  {errorMessage && (
                    <div className="mt-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                      <p className="text-red-400 text-xs text-center">
                        Error: {errorMessage}
                      </p>
                    </div>
                  )}

                  {backendStatus === "disconnected" && (
                    <div className="mt-2">
                      <button
                        onClick={retryConnection}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition"
                      >
                        <RefreshCw size={12} />
                        Retry Connection
                      </button>
                      <p className="text-gray-500 text-xs text-center mt-2">
                        Make sure backend is running: <br />
                        <code className="text-cyan-400">python main.py</code>
                      </p>
                    </div>
                  )}

                  {backendStatus === "unauthorized" && (
                    <div className="mt-2 p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                      <p className="text-orange-400 text-xs text-center">
                        Session expired. Please login again.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Connection Quality Indicator */}
          <div className="hidden md:flex items-center gap-2 bg-gray-900/50 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-gray-700">
            <Signal size={16} className={getConnectionQualityColor()} />
            <span
              className={`text-xs font-medium ${getConnectionQualityColor()}`}
            >
              {connectionQuality?.toUpperCase() || "GOOD"} SIGNAL
            </span>
          </div>

          {/* Refresh Button with Animation */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="relative flex items-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 px-5 py-2.5 rounded-2xl text-gray-400 hover:text-white transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw
              size={18}
              className={`transition-transform ${
                isRefreshing ? "animate-spin" : "group-hover:rotate-180"
              }`}
            />
            <span className="font-mono text-xs font-medium hidden sm:inline">
              {isRefreshing ? "SYNCING..." : "REFRESH"}
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
              <div
                className="w-1 h-3 bg-cyan-400 animate-pulse"
                style={{ animationDelay: "0s" }}
              />
              <div
                className="w-1 h-3 bg-cyan-400 animate-pulse"
                style={{ animationDelay: "0.2s" }}
              />
              <div
                className="w-1 h-3 bg-cyan-400 animate-pulse"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
          </div>
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
