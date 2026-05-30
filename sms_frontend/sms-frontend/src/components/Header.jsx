import {
  AlertTriangle,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  RefreshCw,
  Shield,
  Sun,
  User,
  UserCog,
  Users,
  WifiOff,
  X
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import SmsWallIcon from "./SmallIcone";

export default function Header({
  newCount = 0,
  onRefresh,
  connectionQuality = "good",
  uptime = 0,
  user = null,
  onLogout,
  onNavigateToAdmin,
  onNavigateToMessages,
  onNavigateToContacts,
  activeView = "messages",
  isAdmin = false
}) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [lastChecked, setLastChecked] = useState(null);
  const [responseTime, setResponseTime] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const userMenuRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const detailsRef = useRef(null);

  // Theme management
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Blink effect for new messages
  useEffect(() => {
    if (newCount > 0) {
      setIsBlinking(true);
      const timer = setTimeout(() => setIsBlinking(false), 2800);
      return () => clearTimeout(timer);
    }
  }, [newCount]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        !event.target.closest(".mobile-menu-button")
      ) {
        setShowMobileMenu(false);
      }
      if (detailsRef.current && !detailsRef.current.contains(event.target)) {
        setShowDetails(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (showMobileMenu) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showMobileMenu]);

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
      }
    }

    setBackendStatus("disconnected");
    setResponseTime(null);
    setLastChecked(new Date());
    setErrorMessage(lastError);
  }, []);

  useEffect(() => {
    if (user) {
      checkBackendConnection();
      const connectionInterval = setInterval(checkBackendConnection, 30000);
      return () => clearInterval(connectionInterval);
    } else {
      setBackendStatus("checking");
    }
  }, [checkBackendConnection, user]);

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

  const getStatusIcon = () => {
    switch (backendStatus) {
      case "connected":
        return (
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
        );
      case "disconnected":
        return <WifiOff className="text-red-400" size={14} />;
      case "unauthorized":
        return <AlertTriangle className="text-amber-400" size={14} />;
      default:
        return (
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
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
        return "text-amber-400";
      default:
        return "text-yellow-400";
    }
  };

  const navItems = [
    { id: "messages", label: "Messages", icon: MessageSquare, color: "blue" },
    { id: "contacts", label: "Contacts", icon: Users, color: "emerald" },
    { id: "admin", label: "Admin", icon: UserCog, color: "purple" }
  ];

  const getNavColor = (color) => {
    const colors = {
      blue: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      emerald: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      purple: "bg-purple-500/20 text-purple-400 border-purple-500/30"
    };
    return colors[color] || colors.blue;
  };

  return (
    <>
      <header className="bg-gray-950/95 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 md:py-5">
            {/* Logo Section */}
            <div className="flex items-center gap-2.5">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative w-10 h-10 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg transform transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
                  <SmsWallIcon className="text-white" size={22} />
                </div>
              </div>
              
              <div className="leading-tight">
                <div className="flex items-baseline gap-1">
                  <span className="text-base sm:text-lg font-black tracking-tighter text-white">SMS</span>
                  <span className="text-base sm:text-lg font-black tracking-tighter bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">WALL</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[9px] font-mono text-emerald-400/80 uppercase tracking-wider">Real-time</span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {isAdmin &&
                navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        if (item.id === "messages") onNavigateToMessages?.();
                        else if (item.id === "contacts")
                          onNavigateToContacts?.();
                        else if (item.id === "admin") onNavigateToAdmin?.();
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? `${getNavColor(item.color)} shadow-sm`
                          : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                      {item.id === "messages" && newCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                          {newCount}
                        </span>
                      )}
                    </button>
                  );
                })}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* New Messages Badge (Mobile) */}
              {newCount > 0 && activeView === "messages" && (
                <button
                  onClick={() =>
                    document
                      .getElementById("messages")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="md:hidden relative p-2 rounded-xl bg-red-500/10 border border-red-500/30"
                >
                  <Bell size={16} className="text-red-400" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                    {newCount > 9 ? "9+" : newCount}
                  </span>
                </button>
              )}

              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="hidden sm:flex p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* Status Indicator (Compact) */}
              <div className="relative" ref={detailsRef}>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all"
                >
                  {getStatusIcon()}
                  <span
                    className={`text-xs font-medium hidden sm:inline ${getStatusColorClass()}`}
                  >
                    {getStatusText()}
                  </span>
                  {responseTime && backendStatus === "connected" && (
                    <span className="text-[10px] text-gray-500 hidden lg:inline">
                      {responseTime}ms
                    </span>
                  )}
                  <ChevronDown size={12} className="text-gray-600" />
                </button>

                {/* Status Dropdown */}
                {showDetails && (
                  <div className="absolute top-full right-0 mt-2 w-72 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-slideDown">
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Status</span>
                        <span className={getStatusColorClass()}>
                          {getStatusText()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Latency</span>
                        <span className="font-mono text-gray-300">
                          {responseTime ? `${responseTime}ms` : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Last Check</span>
                        <span className="text-gray-400 text-[10px]">
                          {lastChecked?.toLocaleTimeString() || "Never"}
                        </span>
                      </div>
                      {backendStatus === "disconnected" && (
                        <button
                          onClick={() => checkBackendConnection()}
                          className="w-full mt-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition"
                        >
                          Retry Connection
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              {user && (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                      {user.role === "admin" ? (
                        <Shield size={14} className="text-white" />
                      ) : (
                        <User size={14} className="text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-300 hidden sm:inline">
                      {user.username}
                    </span>
                    <ChevronDown size={12} className="text-gray-500" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute top-full right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-slideDown">
                      <div className="p-3 border-b border-gray-800">
                        <p className="text-sm font-medium text-white">
                          {user.full_name || user.username}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {user.email}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.is_active ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          <span className="text-[10px] text-gray-500 capitalize">
                            {user.role}
                          </span>
                        </div>
                      </div>
                      <div className="p-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        >
                          <LogOut size={14} />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-all disabled:opacity-50"
                aria-label="Refresh"
              >
                <RefreshCw
                  size={16}
                  className={isRefreshing ? "animate-spin" : ""}
                />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors mobile-menu-button"
                aria-label="Menu"
              >
                {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && isAdmin && (
        <div className="fixed inset-0 z-40 md:hidden" ref={mobileMenuRef}>
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowMobileMenu(false)}
          />
          <div className="absolute top-[73px] left-0 right-0 bg-gray-900 border-b border-gray-800 shadow-2xl animate-slideDown">
            <div className="p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === "messages") onNavigateToMessages?.();
                      else if (item.id === "contacts") onNavigateToContacts?.();
                      else if (item.id === "admin") onNavigateToAdmin?.();
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? `${getNavColor(item.color)}`
                        : "text-gray-400 hover:text-white hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.id === "messages" && newCount > 0 && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                        {newCount}
                      </span>
                    )}
                  </button>
                );
              })}

              <div className="h-px bg-gray-800 my-2" />

              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/50 transition"
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
}