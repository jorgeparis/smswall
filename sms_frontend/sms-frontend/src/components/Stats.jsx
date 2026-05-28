import { AlertTriangle, CheckCircle, Clock, Trash2, X } from "lucide-react";
import { useState } from "react";

export default function Stats({
  totalMessages = 0,
  unreadCount = 0,
  onDeleteOld
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDays, setDeleteDays] = useState(30);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);

  const handleDeleteOld = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(
        `http://localhost:8000/messages/old?days=${deleteDays}`,
        {
          method: "DELETE"
        }
      );

      const result = await response.json();

      if (response.ok) {
        setDeletedCount(result.deleted_count || 0);
        setShowSuccess(true);
        setShowDeleteModal(false);

        setTimeout(() => setShowSuccess(false), 5000);

        onDeleteOld?.(); // Refresh parent
      } else {
        alert("Failed to delete messages");
      }
    } catch (error) {
      console.error(error);
      alert("Backend connection error. Could not delete old messages.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Statistics</h2>
          <div className="text-xs font-mono text-gray-500">REAL-TIME</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Total Messages */}
          <div className="bg-gray-950 rounded-2xl p-6 border border-gray-800 hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-2xl flex items-center justify-center">
                <Clock className="text-blue-400" size={24} />
              </div>
              <div>
                <div className="text-sm text-gray-400">TOTAL MESSAGES</div>
                <div className="text-5xl font-bold text-white mt-1 tabular-nums">
                  {totalMessages}
                </div>
              </div>
            </div>
          </div>

          {/* Unread Messages */}
          <div className="bg-gray-950 rounded-2xl p-6 border border-gray-800 hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center">
                <AlertTriangle className="text-amber-400" size={24} />
              </div>
              <div>
                <div className="text-sm text-gray-400">UNREAD</div>
                <div className="text-5xl font-bold text-white mt-1 tabular-nums">
                  {unreadCount}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delete Old Messages */}
        <button
          onClick={() => setShowDeleteModal(true)}
          className="mt-6 w-full flex items-center justify-center gap-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 text-red-400 py-4 rounded-2xl transition-all active:scale-[0.97]"
        >
          <Trash2 size={20} />
          <span className="font-medium">Delete Old Messages</span>
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[60] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-md overflow-hidden">
            <div className="p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 mb-6">
                <AlertTriangle className="text-red-400" size={36} />
              </div>

              <h3 className="text-2xl font-semibold text-white mb-2">
                Delete Old Messages
              </h3>
              <p className="text-gray-400">
                This action cannot be undone. Messages will be permanently
                removed.
              </p>

              <div className="mt-8">
                <label className="block text-sm text-gray-400 mb-3">
                  Delete messages older than
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="7"
                    max="365"
                    step="1"
                    value={deleteDays}
                    onChange={(e) => setDeleteDays(Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                  <div className="bg-gray-800 px-5 py-3 rounded-2xl font-mono text-lg font-semibold min-w-[85px]">
                    {deleteDays}d
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 p-5 flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-4 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOld}
                disabled={isDeleting}
                className="flex-1 py-4 rounded-2xl bg-red-600 hover:bg-red-500 disabled:bg-red-800 text-white font-medium flex items-center justify-center gap-2 transition-all"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed bottom-8 right-8 bg-emerald-900 border border-emerald-500/30 text-emerald-100 px-6 py-4 rounded-3xl shadow-2xl flex items-start gap-4 z-[70]">
          <CheckCircle className="text-emerald-400 mt-0.5" size={26} />
          <div className="pr-8">
            <p className="font-semibold">Operation Successful</p>
            <p className="text-emerald-300 text-sm">
              {deletedCount} messages were deleted.
            </p>
          </div>
          <button
            onClick={() => setShowSuccess(false)}
            className="text-emerald-400 hover:text-white ml-4"
          >
            <X size={22} />
          </button>
        </div>
      )}
    </>
  );
}
