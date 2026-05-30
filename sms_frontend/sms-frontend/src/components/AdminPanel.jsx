import { useState, useEffect, useCallback } from "react";
import {
  Users,
  UserPlus,
  Shield,
  UserX,
  UserCheck,
  Mail,
  Lock,
  User,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
  RefreshCw,
  Crown,
  UserCog,
  Activity,
  Calendar,
  Eye
} from "lucide-react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:8000";

// Helper function to get auth token
const getAuthToken = () => {
  return sessionStorage.getItem("access_token") || localStorage.getItem("access_token");
};

// Fetch wrapper with authentication
const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    sessionStorage.removeItem("access_token");
    sessionStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  return response;
};

export default function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    full_name: null,
    role: "user",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    users: 0,
    active: 0,
  });

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`${API_BASE}/admin/users`);
      const data = await response.json();
      setUsers(data.users || []);
      
      // Calculate stats
      const admins = data.users?.filter(u => u.role === "admin").length || 0;
      const active = data.users?.filter(u => u.is_active).length || 0;
      setStats({
        total: data.total || 0,
        admins,
        users: (data.total || 0) - admins,
        active,
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Update user role
  const updateUserRole = async (userId, newRole) => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/admin/users/${userId}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole }),
      });
      
      if (response.ok) {
        toast.success(`User role updated to ${newRole}`);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to update role");
      }
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  // Toggle user status (enable/disable)
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/admin/users/${userId}/toggle-status`, {
        method: "PUT",
      });
      
      if (response.ok) {
        toast.success(`User ${currentStatus ? "disabled" : "enabled"} successfully`);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to toggle status");
      }
    } catch (error) {
      toast.error("Failed to toggle status");
    }
  };

  // Delete user
  const deleteUser = async (userId) => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/admin/users/${userId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        toast.success("User deleted successfully");
        setShowDeleteConfirm(null);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to delete user");
      }
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  // Add new user - FIXED VERSION
  const addUser = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.username.trim()) {
      toast.error("Username is required");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!formData.password) {
      toast.error("Password is required");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    
    // Email format validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    // Username format validation (alphanumeric + underscore)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
      toast.error("Username can only contain letters, numbers, and underscores");
      return;
    }
    
    setFormLoading(true);
    
    try {
      const response = await fetchWithAuth(`${API_BASE}/auth/register`, {
        method: "POST",
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim(),
          password: formData.password,
          full_name: formData.full_name?.trim() || null
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`User "${formData.username}" created successfully`);
        setShowAddModal(false);
        setFormData({
          username: "",
          email: "",
          password: "",
          full_name: null,
          role: "user"
        });
        fetchUsers(); // Refresh user list
      } else {
        // Handle specific error messages
        if (data.detail) {
          toast.error(data.detail);
        } else if (data.errors) {
          const errors = data.errors.map(e => e.msg).join(", ");
          toast.error(`Validation error: ${errors}`);
        } else {
          toast.error("Failed to create user");
        }
      }
    } catch (error) {
      console.error("Add user error:", error);
      toast.error("Connection error. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-sm text-gray-400 mt-1">Manage system users and their roles</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl transition-all active:scale-95"
        >
          <UserPlus size={18} />
          Add User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <Users className="text-blue-400" size={20} />
            <span className="text-2xl font-bold text-white">{stats.total}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Total Users</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <Crown className="text-purple-400" size={20} />
            <span className="text-2xl font-bold text-white">{stats.admins}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Administrators</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <User className="text-emerald-400" size={20} />
            <span className="text-2xl font-bold text-white">{stats.users}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Regular Users</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <Activity className="text-cyan-400" size={20} />
            <span className="text-2xl font-bold text-white">{stats.active}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Active Users</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
        <input
          type="text"
          placeholder="Search users by name, email, or username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-gray-900/30 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50 border-b border-gray-700">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase">User</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase">Role</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase">Member Since</th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase">Last Login</th>
                <th className="text-right py-4 px-6 text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
                      <span className="text-gray-500 text-sm">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="text-gray-600" size={40} />
                      <span className="text-gray-500">No users found</span>
                      {searchTerm && (
                        <button onClick={() => setSearchTerm("")} className="text-blue-400 text-sm">Clear search</button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${user.role === "admin" ? "bg-purple-500/20" : "bg-blue-500/20"}`}>
                          {user.role === "admin" ? <Shield size={18} className="text-purple-400" /> : <User size={18} className="text-blue-400" />}
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.full_name || user.username}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          user.role === "admin"
                            ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        }`}
                      >
                        <option value="user" className="bg-gray-900">User</option>
                        <option value="admin" className="bg-gray-900">Admin</option>
                      </select>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.is_active
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                        {user.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-400">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-400">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_active
                              ? "hover:bg-red-500/10 text-red-400"
                              : "hover:bg-emerald-500/10 text-emerald-400"
                          }`}
                          title={user.is_active ? "Disable User" : "Enable User"}
                        >
                          {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(user)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal - FIXED VERSION */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <UserPlus className="text-white" size={18} />
                </div>
                <h2 className="text-xl font-bold text-white">Add New User</h2>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    placeholder="Enter username"
                  />
                </div>
                <p className="text-gray-500 text-xs mt-1">Letters, numbers, and underscores only</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password * (min 6 characters)</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="password"
                    required
                    minLength="6"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    placeholder="Enter password (min 6 chars)"
                  />
                </div>
                {formData.password && formData.password.length < 6 && (
                  <p className="text-red-400 text-xs mt-1">Password must be at least 6 characters</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Full Name (Optional)</label>
                <input
                  type="text"
                  value={formData.full_name || ""}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value || null })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium transition disabled:opacity-50"
                >
                  {formLoading ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(null)}>
          <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4">
                <AlertCircle className="text-red-400" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete User</h3>
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to delete <span className="text-white font-medium">{showDeleteConfirm.full_name || showDeleteConfirm.username}</span>?
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteUser(showDeleteConfirm.id)}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}