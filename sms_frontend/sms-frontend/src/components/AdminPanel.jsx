import {
  Activity,
  AlertCircle,
  Crown,
  Edit,
  Search,
  Settings,
  Shield,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:8000";

// Helper function to get auth token
const getAuthToken = () => {
  return (
    sessionStorage.getItem("access_token") ||
    localStorage.getItem("access_token")
  );
};

// Fetch wrapper with authentication
const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token found");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    full_name: null,
    role: "user"
  });
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    email: "",
    role: "user"
  });
  const [profileFormData, setProfileFormData] = useState({
    full_name: "",
    email: "",
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [formLoading, setFormLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    users: 0,
    active: 0
  });

  // Get current logged-in user
  useEffect(() => {
    const userStr = sessionStorage.getItem("user");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchWithAuth(`${API_BASE}/admin/users`);
      const data = await response.json();
      setUsers(data.users || []);

      const admins = data.users?.filter((u) => u.role === "admin").length || 0;
      const active = data.users?.filter((u) => u.is_active).length || 0;
      setStats({
        total: data.total || 0,
        admins,
        users: (data.total || 0) - admins,
        active
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
      const response = await fetchWithAuth(
        `${API_BASE}/admin/users/${userId}/role`,
        {
          method: "PUT",
          body: JSON.stringify({ role: newRole })
        }
      );

      if (response.ok) {
        toast.success(`User role updated to ${newRole}`);
        fetchUsers();
        if (selectedUser?.id === userId) {
          setSelectedUser({ ...selectedUser, role: newRole });
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to update role");
      }
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  // Toggle user status
  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      const response = await fetchWithAuth(
        `${API_BASE}/admin/users/${userId}/toggle-status`,
        {
          method: "PUT"
        }
      );

      if (response.ok) {
        toast.success(
          `User ${currentStatus ? "disabled" : "enabled"} successfully`
        );
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
      const response = await fetchWithAuth(
        `${API_BASE}/admin/users/${userId}`,
        {
          method: "DELETE"
        }
      );

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

  // Add new user
  const addUser = async (e) => {
    e.preventDefault();

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

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
      toast.error(
        "Username can only contain letters, numbers, and underscores"
      );
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
        fetchUsers();
      } else {
        if (data.detail) {
          toast.error(data.detail);
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

  // Edit user (admin editing another user) - UPDATED to use correct endpoint
  const editUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const response = await fetchWithAuth(
        `${API_BASE}/admin/users/${selectedUser.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            full_name: editFormData.full_name || null,
            email: editFormData.email,
            role: editFormData.role
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success("User updated successfully");
        setShowEditModal(false);
        setSelectedUser(null);

        // Refresh the users list to show updated data
        await fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to update user");
      }
    } catch (error) {
      console.error("Edit user error:", error);
      toast.error("Failed to update user");
    } finally {
      setFormLoading(false);
    }
  };

  // Update own profile - UPDATED to use correct endpoint
  const updateProfile = async (e) => {
    e.preventDefault();

    if (
      profileFormData.new_password &&
      profileFormData.new_password !== profileFormData.confirm_password
    ) {
      toast.error("New passwords do not match");
      return;
    }

    if (
      profileFormData.new_password &&
      profileFormData.new_password.length < 6
    ) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setFormLoading(true);

    try {
      const updateData = {
        full_name: profileFormData.full_name || null,
        email: profileFormData.email
      };

      if (profileFormData.current_password && profileFormData.new_password) {
        updateData.current_password = profileFormData.current_password;
        updateData.new_password = profileFormData.new_password;
      }

      const response = await fetchWithAuth(`${API_BASE}/auth/profile`, {
        method: "PUT",
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Profile updated successfully");
        setShowProfileModal(false);
        setProfileFormData({
          full_name: "",
          email: "",
          current_password: "",
          new_password: "",
          confirm_password: ""
        });

        // Update session user data
        if (data.user) {
          sessionStorage.setItem("user", JSON.stringify(data.user));
          setCurrentUser(data.user);
        }

        // Refresh the users list
        await fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to update profile");
      }
    } catch (error) {
      console.error("Profile update error:", error);
      toast.error("Failed to update profile");
    } finally {
      setFormLoading(false);
    }
  };

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      full_name: user.full_name || "",
      email: user.email,
      role: user.role
    });
    setShowEditModal(true);
  };

  // Open profile modal
  const openProfileModal = () => {
    setProfileFormData({
      full_name: currentUser?.full_name || "",
      email: currentUser?.email || "",
      current_password: "",
      new_password: "",
      confirm_password: ""
    });
    setShowProfileModal(true);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name &&
        user.full_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage system users and their roles
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={openProfileModal}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-xl transition-all"
          >
            <Settings size={16} />
            My Profile
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl transition-all"
          >
            <UserPlus size={18} />
            Add User
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <Users className="text-blue-400" size={20} />
            <span className="text-2xl font-bold text-white">{stats.total}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Total Users</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <Crown className="text-purple-400" size={20} />
            <span className="text-2xl font-bold text-white">
              {stats.admins}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Administrators</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <User className="text-emerald-400" size={20} />
            <span className="text-2xl font-bold text-white">{stats.users}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Regular Users</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <Activity className="text-cyan-400" size={20} />
            <span className="text-2xl font-bold text-white">
              {stats.active}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Active Users</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500"
          size={18}
        />
        <input
          type="text"
          placeholder="Search users by name, email, or username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
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
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase">
                  User
                </th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase">
                  Role
                </th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase">
                  Status
                </th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase">
                  Member Since
                </th>
                <th className="text-left py-4 px-6 text-xs font-medium text-gray-400 uppercase">
                  Last Login
                </th>
                <th className="text-right py-4 px-6 text-xs font-medium text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-2 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
                      <span className="text-gray-500 text-sm">
                        Loading users...
                      </span>
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
                        <button
                          onClick={() => setSearchTerm("")}
                          className="text-blue-400 text-sm"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-800/30 transition-colors group"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                            user.role === "admin"
                              ? "bg-purple-500/20"
                              : "bg-blue-500/20"
                          }`}
                        >
                          {user.role === "admin" ? (
                            <Shield size={18} className="text-purple-400" />
                          ) : (
                            <User size={18} className="text-blue-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-white">
                            {user.full_name || user.username}
                          </p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          updateUserRole(user.id, e.target.value)
                        }
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                          user.role === "admin"
                            ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                            : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                        }`}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.is_active
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.is_active
                              ? "bg-emerald-400 animate-pulse"
                              : "bg-red-400"
                          }`}
                        />
                        {user.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-400">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-400">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                          title="Edit User"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() =>
                            toggleUserStatus(user.id, user.is_active)
                          }
                          className={`p-2 rounded-lg transition-colors ${
                            user.is_active
                              ? "hover:bg-red-500/10 text-red-400"
                              : "hover:bg-emerald-500/10 text-emerald-400"
                          } opacity-0 group-hover:opacity-100`}
                          title={
                            user.is_active ? "Disable User" : "Enable User"
                          }
                        >
                          {user.is_active ? (
                            <UserX size={16} />
                          ) : (
                            <UserCheck size={16} />
                          )}
                        </button>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => setShowDeleteConfirm(user)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <UserPlus size={18} className="text-blue-400" />
                <h2 className="text-xl font-bold text-white">Add New User</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password * (min 6)
                </label>
                <input
                  type="password"
                  required
                  minLength="6"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      full_name: e.target.value || null
                    })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
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
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition"
                >
                  {formLoading ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <Edit size={18} className="text-blue-400" />
                <h2 className="text-xl font-bold text-white">Edit User</h2>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={editUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={selectedUser.username}
                  disabled
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editFormData.full_name}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      full_name: e.target.value
                    })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, role: e.target.value })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition"
                >
                  {formLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* My Profile Modal */}
      {showProfileModal && currentUser && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <Settings size={18} className="text-blue-400" />
                <h2 className="text-xl font-bold text-white">My Profile</h2>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={updateProfile} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={currentUser.username}
                  disabled
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={profileFormData.email}
                  onChange={(e) =>
                    setProfileFormData({
                      ...profileFormData,
                      email: e.target.value
                    })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileFormData.full_name}
                  onChange={(e) =>
                    setProfileFormData({
                      ...profileFormData,
                      full_name: e.target.value
                    })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter full name"
                />
              </div>
              <div className="border-t border-gray-800 pt-4 mt-2">
                <p className="text-sm font-medium text-gray-300 mb-4">
                  Change Password (Optional)
                </p>
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="Current Password"
                    value={profileFormData.current_password}
                    onChange={(e) =>
                      setProfileFormData({
                        ...profileFormData,
                        current_password: e.target.value
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="New Password"
                    value={profileFormData.new_password}
                    onChange={(e) =>
                      setProfileFormData({
                        ...profileFormData,
                        new_password: e.target.value
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={profileFormData.confirm_password}
                    onChange={(e) =>
                      setProfileFormData({
                        ...profileFormData,
                        confirm_password: e.target.value
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition"
                >
                  {formLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="bg-gray-900 border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="mx-auto w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center mb-4">
                <AlertCircle className="text-red-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete User</h3>
              <p className="text-gray-400 text-sm mb-6">
                Are you sure you want to delete{" "}
                <span className="text-white font-medium">
                  {showDeleteConfirm.full_name || showDeleteConfirm.username}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteUser(showDeleteConfirm.id)}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium transition"
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
