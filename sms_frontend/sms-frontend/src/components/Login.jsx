import { Eye, EyeOff, Lock, MessageCircle, User } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:8000";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      toast.error("Please enter both username and password");
      return;
    }

    setLoading(true);

    try {
      // Use standard login endpoint (works)
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Login failed");
      }

      sessionStorage.setItem("access_token", data.access_token);
      sessionStorage.setItem("user", JSON.stringify(data.user));

      toast.success(`Welcome back, ${data.user.username}!`);

      setPassword("");
      setUsername("");

      await onLogin(username, password);
    } catch (err) {
      console.error("Login error:", err);
      toast.error(err.message);
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg mb-5">
            <MessageCircle className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight mb-1.5">
            SMS Wall
          </h1>
          <p className="text-slate-400 text-sm">
            Secure message management system
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700 rounded-xl p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Username
              </label>
              <div
                className={`relative transition-all duration-200 ${
                  usernameFocused ? "ring-2 ring-indigo-500/20" : ""
                }`}
              >
                <User
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  placeholder="Enter your username"
                  disabled={loading}
                  autoFocus
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div
                className={`relative transition-all duration-200 ${
                  passwordFocused ? "ring-2 ring-indigo-500/20" : ""
                }`}
              >
                <Lock
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"
                  size={18}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  placeholder="Enter your password"
                  disabled={loading}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-3 bg-slate-800/30 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-500 text-center">
              Demo credentials
            </p>
            <div className="flex items-center justify-center gap-4 mt-1.5 text-xs">
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Username:</span>
                <code className="text-slate-300 font-mono text-xs">admin</code>
              </div>
              <div className="w-px h-3 bg-slate-600" />
              <div className="flex items-center gap-1">
                <span className="text-slate-500">Password:</span>
                <code className="text-slate-300 font-mono text-xs">
                  admin123
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-500">
            Secure message management platform - version 1.1 Jorge Paris
          </p>
        </div>
      </div>
    </div>
  );
}
