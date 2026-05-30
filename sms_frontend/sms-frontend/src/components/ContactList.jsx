import {
  Briefcase,
  Building2,
  ChevronRight,
  Download,
  Filter,
  Grid,
  List,
  Mail,
  MailOpen,
  MapPin,
  Phone,
  PieChart,
  Search,
  Shield,
  UserCheck,
  Users,
  X
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const API_BASE = "http://localhost:8000";

const getAuthToken = () => sessionStorage.getItem("access_token");

const fetchWithAuth = async (url, options = {}) => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers
  };

  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    sessionStorage.removeItem("access_token");
    window.location.href = "/login";
  }
  return response;
};

export default function ContactList() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [expandedContact, setExpandedContact] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [statsView, setStatsView] = useState("contacts");

  // Fetch contacts
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const url = `${API_BASE}/contacts?limit=500`;
      const response = await fetchWithAuth(url);
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Get unique countries for filter
  const countries = useMemo(() => {
    const unique = [...new Set(contacts.map((c) => c.country).filter(Boolean))];
    return unique.sort();
  }, [contacts]);

  // Filter contacts
  const filteredContacts = useMemo(() => {
    let filtered = contacts;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (contact) =>
          contact.country?.toLowerCase().includes(term) ||
          contact.president?.name?.toLowerCase().includes(term) ||
          contact.director?.name?.toLowerCase().includes(term) ||
          contact.coordinator?.name?.toLowerCase().includes(term) ||
          contact.rf_technician?.name?.toLowerCase().includes(term) ||
          contact.af_it?.name?.toLowerCase().includes(term) ||
          contact.editorial_assistant?.name?.toLowerCase().includes(term)
      );
    }

    if (selectedCountry !== "all") {
      filtered = filtered.filter(
        (contact) => contact.country === selectedCountry
      );
    }

    return filtered;
  }, [contacts, searchTerm, selectedCountry]);

  // Copy to clipboard
  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmail(type);
      setTimeout(() => setCopiedEmail(null), 2000);
      toast.success("Copied to clipboard");
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  // Export contacts to CSV
  const exportToCSV = () => {
    const headers = ["Country", "Role", "Name", "Email", "Phone"];
    const rows = [];

    filteredContacts.forEach((contact) => {
      const roles = [
        { role: "President", data: contact.president },
        { role: "Director", data: contact.director },
        { role: "Coordinator", data: contact.coordinator },
        { role: "RF Technician", data: contact.rf_technician },
        { role: "AF/IT", data: contact.af_it },
        { role: "Editorial Assistant", data: contact.editorial_assistant }
      ];

      roles.forEach(({ role, data }) => {
        if (data?.name) {
          rows.push([
            contact.country,
            role,
            data.name,
            data.email1 || data.email2 || "",
            data.tel || ""
          ]);
        }
      });
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contacts_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export complete");
  };

  // Get country statistics
  const getCountryStats = (contact) => {
    const roles = [
      { name: "President", data: contact.president },
      { name: "Director", data: contact.director },
      { name: "Coordinator", data: contact.coordinator },
      { name: "RF Technician", data: contact.rf_technician },
      { name: "AF/IT", data: contact.af_it },
      { name: "Editorial Assistant", data: contact.editorial_assistant }
    ];

    const filledRoles = roles.filter((role) => role.data?.name);
    const emailsCount = roles.filter(
      (role) => role.data?.email1 || role.data?.email2
    ).length;
    const phonesCount = roles.filter((role) => role.data?.tel).length;

    return {
      totalStaff: filledRoles.length,
      emailsCount,
      phonesCount,
      completionRate: Math.round((filledRoles.length / roles.length) * 100)
    };
  };

  // Role card component
  const RoleCard = ({ title, data, icon: Icon, onViewDetails }) => {
    if (!data?.name) return null;

    return (
      <div
        className="group bg-gray-800/40 rounded-xl p-4 border border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg cursor-pointer"
        onClick={() => onViewDetails?.(title, data)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <Icon size={14} className="text-blue-400" />
            </div>
            <h4 className="text-sm font-semibold text-white">{title}</h4>
          </div>
          <ChevronRight
            size={14}
            className="text-gray-600 group-hover:text-blue-400 transition"
          />
        </div>
        <p className="text-white font-medium text-sm mb-2 line-clamp-1">
          {data.name}
        </p>
        <div className="space-y-1">
          {data.email1 && (
            <div className="flex items-center gap-2">
              <Mail size={10} className="text-gray-600 flex-shrink-0" />
              <span className="text-[11px] text-gray-400 truncate">
                {data.email1}
              </span>
            </div>
          )}
          {data.tel && (
            <div className="flex items-center gap-2">
              <Phone size={10} className="text-gray-600 flex-shrink-0" />
              <span className="text-[11px] text-gray-400">{data.tel}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Handle country click
  const handleCountryClick = (contact) => {
    setSelectedContact(contact);
    setShowCountryModal(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Users size={20} className="text-blue-500" />
          </div>
        </div>
        <p className="text-gray-400 mt-4 text-sm">Loading contacts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Contact Directory</h2>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
            <Users size={14} />
            {filteredContacts.length} contacts • {countries.length} countries
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>
          <div className="flex gap-1 bg-gray-800/50 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === "grid"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
              title="Grid View"
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === "list"
                  ? "bg-blue-500/20 text-blue-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
              title="List View"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            size={16}
          />
          <input
            type="text"
            placeholder="Search by name, country, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-900/50 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X
                size={14}
                className="text-gray-500 hover:text-white transition"
              />
            </button>
          )}
        </div>

        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="bg-gray-900/50 border border-gray-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="all">All Countries</option>
          {countries.map((country) => (
            <option key={country} value={country}>
              {country}
            </option>
          ))}
        </select>

        {(searchTerm || selectedCountry !== "all") && (
          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedCountry("all");
            }}
            className="px-4 py-2.5 bg-gray-800/50 rounded-xl text-sm text-gray-400 hover:text-white transition"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Active Filters */}
      {(searchTerm || selectedCountry !== "all") && (
        <div className="flex gap-2 flex-wrap">
          {searchTerm && (
            <span className="bg-blue-500/20 text-blue-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
              <Filter size={10} />
              Search: {searchTerm}
              <button
                onClick={() => setSearchTerm("")}
                className="hover:text-white transition"
              >
                <X size={12} />
              </button>
            </span>
          )}
          {selectedCountry !== "all" && (
            <span className="bg-purple-500/20 text-purple-400 text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
              <MapPin size={10} />
              Country: {selectedCountry}
              <button
                onClick={() => setSelectedCountry("all")}
                className="hover:text-white transition"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Contacts Grid/List View */}
      {filteredContacts.length === 0 ? (
        <div className="text-center py-16 bg-gray-900/30 rounded-2xl border border-gray-800">
          <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="text-gray-600" size={32} />
          </div>
          <p className="text-gray-400 font-medium">No contacts found</p>
          <p className="text-gray-500 text-sm mt-1">
            Try adjusting your search or filters
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredContacts.map((contact) => {
            const stats = getCountryStats(contact);
            return (
              <div
                key={contact.id}
                onClick={() => handleCountryClick(contact)}
                className="group bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl overflow-hidden hover:border-blue-500/30 hover:shadow-xl transition-all duration-300 cursor-pointer"
              >
                {/* Country Header */}
                <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-5 py-4 border-b border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                        <MapPin size={18} className="text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-lg">
                          {contact.country}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex items-center gap-1">
                            <Users size={10} className="text-gray-500" />
                            <span className="text-[10px] text-gray-500">
                              {stats.totalStaff} staff
                            </span>
                          </div>
                          <div className="w-1 h-1 rounded-full bg-gray-600" />
                          <div className="flex items-center gap-1">
                            <Mail size={10} className="text-gray-500" />
                            <span className="text-[10px] text-gray-500">
                              {stats.emailsCount} emails
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-blue-500/20 transition">
                      <ChevronRight
                        size={16}
                        className="text-gray-500 group-hover:text-blue-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="px-5 py-3 bg-gray-900/30 border-b border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">
                      Profile Completion
                    </span>
                    <span className="text-[10px] font-medium text-emerald-400">
                      {stats.completionRate}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all"
                      style={{ width: `${stats.completionRate}%` }}
                    />
                  </div>
                </div>

                {/* Key Roles Preview */}
                <div className="p-4 space-y-2">
                  {contact.president?.name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Shield size={12} className="text-amber-400" />
                      <span className="text-gray-300 text-xs">President:</span>
                      <span className="text-gray-400 text-xs truncate">
                        {contact.president.name}
                      </span>
                    </div>
                  )}
                  {contact.director?.name && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase size={12} className="text-blue-400" />
                      <span className="text-gray-300 text-xs">Director:</span>
                      <span className="text-gray-400 text-xs truncate">
                        {contact.director.name}
                      </span>
                    </div>
                  )}
                  {contact.coordinator?.name && (
                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck size={12} className="text-green-400" />
                      <span className="text-gray-300 text-xs">
                        Coordinator:
                      </span>
                      <span className="text-gray-400 text-xs truncate">
                        {contact.coordinator.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* View Details Button */}
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-center gap-1 text-[11px] text-blue-400 group-hover:text-blue-300 transition">
                    Click to view full details
                    <ChevronRight size={10} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // List View
        <div className="space-y-2">
          {filteredContacts.map((contact) => {
            const stats = getCountryStats(contact);
            return (
              <div
                key={contact.id}
                onClick={() => handleCountryClick(contact)}
                className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:bg-gray-900/80 hover:border-blue-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <MapPin size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {contact.country}
                      </h3>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[10px] text-gray-500">
                          {stats.totalStaff} staff members
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {stats.emailsCount} emails
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {stats.phonesCount} phones
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex items-center gap-1">
                      <div className="w-16 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
                          style={{ width: `${stats.completionRate}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {stats.completionRate}%
                      </span>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-gray-500 group-hover:text-blue-400 transition"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Country Details Modal */}
      {showCountryModal && selectedContact && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowCountryModal(false)}
        >
          <div
            className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-5 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                  <Building2 size={24} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedContact.country}
                  </h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Complete directory information
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCountryModal(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-80px)] p-6">
              {/* Stats Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {(() => {
                  const stats = getCountryStats(selectedContact);
                  return (
                    <>
                      <div className="bg-gray-800/30 rounded-xl p-4 text-center">
                        <Users
                          size={20}
                          className="text-blue-400 mx-auto mb-2"
                        />
                        <p className="text-2xl font-bold text-white">
                          {stats.totalStaff}
                        </p>
                        <p className="text-[10px] text-gray-500">Total Staff</p>
                      </div>
                      <div className="bg-gray-800/30 rounded-xl p-4 text-center">
                        <Mail
                          size={20}
                          className="text-emerald-400 mx-auto mb-2"
                        />
                        <p className="text-2xl font-bold text-white">
                          {stats.emailsCount}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Email Addresses
                        </p>
                      </div>
                      <div className="bg-gray-800/30 rounded-xl p-4 text-center">
                        <Phone
                          size={20}
                          className="text-amber-400 mx-auto mb-2"
                        />
                        <p className="text-2xl font-bold text-white">
                          {stats.phonesCount}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Phone Numbers
                        </p>
                      </div>
                      <div className="bg-gray-800/30 rounded-xl p-4 text-center">
                        <PieChart
                          size={20}
                          className="text-purple-400 mx-auto mb-2"
                        />
                        <p className="text-2xl font-bold text-white">
                          {stats.completionRate}%
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Completion Rate
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Roles Grid */}
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users size={18} className="text-blue-400" />
                Staff Directory
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RoleCard
                  title="President"
                  data={selectedContact.president}
                  icon={Shield}
                  onViewDetails={(title, data) => {
                    toast.success(`${title}: ${data.name}`);
                  }}
                />
                <RoleCard
                  title="Director"
                  data={selectedContact.director}
                  icon={Briefcase}
                  onViewDetails={(title, data) => {
                    toast.success(`${title}: ${data.name}`);
                  }}
                />
                <RoleCard
                  title="Coordinator"
                  data={selectedContact.coordinator}
                  icon={UserCheck}
                  onViewDetails={(title, data) => {
                    toast.success(`${title}: ${data.name}`);
                  }}
                />
                <RoleCard
                  title="RF Technician"
                  data={selectedContact.rf_technician}
                  icon={Settings}
                  onViewDetails={(title, data) => {
                    toast.success(`${title}: ${data.name}`);
                  }}
                />
                <RoleCard
                  title="AF/IT"
                  data={selectedContact.af_it}
                  icon={Monitor}
                  onViewDetails={(title, data) => {
                    toast.success(`${title}: ${data.name}`);
                  }}
                />
                <RoleCard
                  title="Editorial Assistant"
                  data={selectedContact.editorial_assistant}
                  icon={MailOpen}
                  onViewDetails={(title, data) => {
                    toast.success(`${title}: ${data.name}`);
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-800 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowCountryModal(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  exportToCSV();
                  toast.success(`Exporting ${selectedContact.country} data`);
                }}
                className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-xl transition flex items-center gap-2"
              >
                <Download size={16} />
                Export Country Data
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

// Add missing imports
import { Monitor, Settings } from "lucide-react";
