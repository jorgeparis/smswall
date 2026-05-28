import { AlertTriangle, Bell, RefreshCw, Signal, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export default function Header({ newCount = 0, onRefresh }) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [backendStatus, setBackendStatus] = useState("checking");
  const [lastChecked, setLastChecked] = useState(null);

  // Blink effect for new messages
  useEffect(() => {
    if (newCount > 0) {
      setIsBlinking(true);
      const timer = setTimeout(() => setIsBlinking(false), 2800);
      return () => clearTimeout(timer);
    }
  }, [newCount]);

  // Real Backend Connection Test
  const checkBackendConnection = async () => {
    try {
      const response = await fetch("http://localhost:8000/messages", {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        setBackendStatus("connected");
        setLastChecked(new Date());
      } else {
        setBackendStatus("disconnected");
      }
    } catch (error) {
      setBackendStatus("disconnected");
    }
  };

  useEffect(() => {
    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-gray-950 border-b border-gray-800 py-6 sticky top-0 z-50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        
        {/* Left Side - Logo */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-cyan-500/30">
              <Signal className="text-white" size={28} strokeWidth={2.5} />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-3xl font-bold tracking-[-0.04em] text-white">
                  SMS WALL
                </h1>
                <div className="px-2.5 py-1 text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/30 rounded-full">
                  LIVE
                </div>
              </div>
              <p className="text-xs text-gray-500 font-mono -mt-0.5">
                BROADCAST CENTER • JORGE PARIS
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Status Indicators */}
        <div className="flex items-center gap-4">
          
          {/* New Messages - Prominent */}
          {newCount > 0 && (
            <div
              className={`flex items-center gap-3 bg-red-500/10 border border-red-500/30 px-6 py-3 rounded-3xl transition-all duration-300 ${
                isBlinking ? "animate-pulse scale-105" : ""
              }`}
            >
              <Bell className="text-red-400" size={20} />
              <span className="font-semibold text-red-400 text-sm">
                {newCount} NEW MESSAGE{newCount > 1 ? "S" : ""}
              </span>
            </div>
          )}

          {/* Backend Status */}
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-3xl border transition-all ${
              backendStatus === "connected"
                ? "bg-emerald-500/10 border-emerald-500/30"
                : backendStatus === "disconnected"
                ? "bg-red-500/10 border-red-500/30"
                : "bg-yellow-500/10 border-yellow-500/30"
            }`}
          >
            {backendStatus === "connected" && (
              <>
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-emerald-400 font-medium text-sm">Connected</span>
              </>
            )}

            {backendStatus === "disconnected" && (
              <>
                <AlertTriangle className="text-red-400" size={18} />
                <span className="text-red-400 font-medium text-sm">Disconnected</span>
              </>
            )}

            {backendStatus === "checking" && (
              <>
                <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse"></div>
                <span className="text-yellow-400 font-medium text-sm">Checking...</span>
              </>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => {
              onRefresh?.();
              checkBackendConnection();
            }}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-gray-600 px-5 py-3 rounded-3xl text-gray-400 hover:text-white transition-all active:scale-95"
          >
            <RefreshCw size={18} className="animate-spin" />
            <span className="font-mono text-xs">Refresh</span>
          </button>

          {/* Transmission Status */}
          <div className="hidden lg:flex items-center gap-2 bg-gray-900 px-5 py-3 rounded-3xl border border-gray-700">
            <Zap className="text-cyan-400" size={18} />
            <span className="text-cyan-400 text-sm font-medium">TRANSMISSION ACTIVE</span>
          </div>
        </div>
      </div>
    </header>
  );
}