import { useState } from "react";
import {
  X,
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Copy,
  Check,
  Search,
  FolderOpen,
  Star,
  Clock
} from "lucide-react";
import toast from "react-hot-toast";

export default function MessageTemplates({ onClose, onSelectTemplate }) {
  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: "Welcome Message",
      content: "Welcome to our service! We're excited to have you on board. How can we assist you today?",
      category: "Welcome",
      usageCount: 45,
      isFavorite: true,
    },
    {
      id: 2,
      name: "Support Response",
      content: "Thank you for contacting our support team. Your ticket #{ticket} has been created. We'll get back to you within 24 hours.",
      category: "Support",
      usageCount: 128,
      isFavorite: true,
    },
    {
      id: 3,
      name: "Order Confirmation",
      content: "Your order #{order} has been confirmed. You'll receive shipping updates via SMS.",
      category: "Orders",
      usageCount: 89,
      isFavorite: false,
    },
    {
      id: 4,
      name: "Appointment Reminder",
      content: "This is a reminder for your appointment on {date} at {time}. Please reply CONFIRM to confirm.",
      category: "Reminders",
      usageCount: 234,
      isFavorite: true,
    },
    {
      id: 5,
      name: "Payment Received",
      content: "We've received your payment of ${amount}. Thank you for your business!",
      category: "Payments",
      usageCount: 67,
      isFavorite: false,
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({ name: "", content: "", category: "General" });

  const categories = ["all", "Welcome", "Support", "Orders", "Reminders", "Payments", "General"];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const favorites = templates.filter(t => t.isFavorite);
  const recent = [...templates].sort((a, b) => b.usageCount - a.usageCount).slice(0, 3);

  const handleSelect = (template) => {
    onSelectTemplate(template.content);
    toast.success(`Template "${template.name}" selected`);
    onClose();
  };

  const handleDelete = (id, name) => {
    if (confirm(`Delete "${name}"?`)) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success("Template deleted");
    }
  };

  const handleAdd = () => {
    if (!formData.name || !formData.content) {
      toast.error("Please fill in all fields");
      return;
    }
    const newTemplate = {
      id: Date.now(),
      ...formData,
      usageCount: 0,
      isFavorite: false,
    };
    setTemplates(prev => [...prev, newTemplate]);
    setShowAddModal(false);
    setFormData({ name: "", content: "", category: "General" });
    toast.success("Template added");
  };

  const handleEdit = () => {
    if (!formData.name || !formData.content) return;
    setTemplates(prev => prev.map(t => 
      t.id === editingTemplate.id ? { ...t, ...formData } : t
    ));
    setEditingTemplate(null);
    setFormData({ name: "", content: "", category: "General" });
    toast.success("Template updated");
  };

  const toggleFavorite = (id) => {
    setTemplates(prev => prev.map(t =>
      t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
    ));
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={onClose}>
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-slideUp" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <BookOpen size={20} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Message Templates</h2>
              <p className="text-xs text-gray-400">Save and reuse message templates</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition">
            <X size={18} />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-3 p-4 bg-gray-900/30 border-b border-gray-800">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{templates.length}</p>
            <p className="text-[10px] text-gray-500">Total Templates</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{favorites.length}</p>
            <p className="text-[10px] text-gray-500">Favorites</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{categories.length - 1}</p>
            <p className="text-[10px] text-gray-500">Categories</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{recent.reduce((sum, t) => sum + t.usageCount, 0)}+</p>
            <p className="text-[10px] text-gray-500">Total Uses</p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={14} />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-white text-sm font-medium transition flex items-center gap-2"
            >
              <Plus size={14} />
              New
            </button>
          </div>
        </div>

        {/* Templates List */}
        <div className="overflow-y-auto max-h-[calc(85vh-220px)] p-4 space-y-3">
          {/* Favorites Section */}
          {favorites.length > 0 && searchTerm === "" && selectedCategory === "all" && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                Favorites
              </h3>
              {favorites.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelect}
                  onEdit={() => {
                    setEditingTemplate(template);
                    setFormData(template);
                  }}
                  onDelete={handleDelete}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}

          {/* Recent Section */}
          {recent.length > 0 && searchTerm === "" && selectedCategory === "all" && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Clock size={14} className="text-blue-400" />
                Most Used
              </h3>
              {recent.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelect}
                  onEdit={() => {
                    setEditingTemplate(template);
                    setFormData(template);
                  }}
                  onDelete={handleDelete}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}

          {/* All Templates */}
          {(searchTerm || selectedCategory !== "all") && filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={handleSelect}
              onEdit={() => {
                setEditingTemplate(template);
                setFormData(template);
              }}
              onDelete={handleDelete}
              onToggleFavorite={toggleFavorite}
            />
          ))}

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto text-gray-600 mb-3" size={40} />
              <p className="text-gray-400">No templates found</p>
              <button onClick={() => setShowAddModal(true)} className="mt-3 text-blue-400 text-sm">Create your first template</button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingTemplate) && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[60] flex items-center justify-center p-4" onClick={() => {
          setShowAddModal(false);
          setEditingTemplate(null);
          setFormData({ name: "", content: "", category: "General" });
        }}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
              <h3 className="text-lg font-bold text-white">{editingTemplate ? "Edit Template" : "New Template"}</h3>
              <button onClick={() => {
                setShowAddModal(false);
                setEditingTemplate(null);
              }} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Template Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white"
                  placeholder="e.g., Welcome Message"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white"
                >
                  {categories.filter(c => c !== "all").map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Content</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows="4"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white resize-none"
                  placeholder="Type your message template here..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => {
                  setShowAddModal(false);
                  setEditingTemplate(null);
                }} className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition">
                  Cancel
                </button>
                <button onClick={editingTemplate ? handleEdit : handleAdd} className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition">
                  {editingTemplate ? "Update" : "Create"}
                </button>
              </div>
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
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>
    </div>
  );
}

// Template Card Component
const TemplateCard = ({ template, onSelect, onEdit, onDelete, onToggleFavorite }) => (
  <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-4 hover:border-blue-500/30 transition-all group">
    <div className="flex items-start justify-between">
      <div className="flex-1 cursor-pointer" onClick={() => onSelect(template)}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs px-2 py-0.5 bg-gray-700 rounded-full text-gray-400">{template.category}</span>
          <span className="text-[10px] text-gray-500">Used {template.usageCount} times</span>
        </div>
        <h4 className="font-semibold text-white mb-1">{template.name}</h4>
        <p className="text-sm text-gray-400 line-clamp-2">{template.content}</p>
      </div>
      <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition">
        <button onClick={() => onToggleFavorite(template.id)} className="p-1.5 rounded-lg hover:bg-gray-700 transition" title={template.isFavorite ? "Remove favorite" : "Add to favorites"}>
          <Star size={14} className={template.isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-500"} />
        </button>
        <button onClick={() => onEdit(template)} className="p-1.5 rounded-lg hover:bg-gray-700 transition">
          <Edit size={14} className="text-gray-400" />
        </button>
        <button onClick={() => onDelete(template.id, template.name)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition">
          <Trash2 size={14} className="text-red-400" />
        </button>
      </div>
    </div>
  </div>
);