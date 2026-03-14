import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../services/api';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  AlertCircle
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [pendingClubs, setPendingClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [notification, setNotification] = useState(null);
  const [summary, setSummary] = useState({
    pending: 0,
    approved: 0,
    rejected: 0
  });

  const limit = 10;

  useEffect(() => {
    fetchPendingClubs();
  }, [page, searchQuery]);

  const fetchPendingClubs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAPI.getPendingClubs({ 
        page, 
        limit, 
        search: searchQuery 
      });
      
      const data = response.data.data;
      setPendingClubs(data.clubs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      
      // Update summary if available
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err) {
      setError(err.userMessage || 'Failed to fetch pending clubs');
      console.error('Error fetching pending clubs:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleApprove = async (clubId) => {
    try {
      setActionInProgress(true);
      await adminAPI.approveClub(clubId);
      showNotification('Club approved successfully', 'success');
      fetchPendingClubs();
    } catch (err) {
      showNotification(err.userMessage || 'Failed to approve club', 'error');
      console.error('Error approving club:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRejectClick = (club) => {
    setSelectedClub(club);
    setShowRejectModal(true);
    setRejectionReason('');
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      showNotification('Please provide a rejection reason', 'error');
      return;
    }

    try {
      setActionInProgress(true);
      await adminAPI.rejectClub(selectedClub._id, { reason: rejectionReason });
      showNotification('Club rejected successfully', 'success');
      setShowRejectModal(false);
      setSelectedClub(null);
      setRejectionReason('');
      fetchPendingClubs();
    } catch (err) {
      showNotification(err.userMessage || 'Failed to reject club', 'error');
      console.error('Error rejecting club:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleViewDetails = (club) => {
    setSelectedClub(club);
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPage(1); // Reset to first page on search
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  // Check if user is super admin
  if (!user?.isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You do not have permission to access the admin dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage club registrations and approvals
        </p>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 dark:text-yellow-400 text-sm font-medium">
                Pending Clubs
              </p>
              <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100 mt-2">
                {summary.pending}
              </p>
            </div>
            <Users className="h-12 w-12 text-yellow-500" />
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 dark:text-green-400 text-sm font-medium">
                Approved Clubs
              </p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">
                {summary.approved}
              </p>
            </div>
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                Rejected Clubs
              </p>
              <p className="text-3xl font-bold text-red-900 dark:text-red-100 mt-2">
                {summary.rejected}
              </p>
            </div>
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-lg ${
            notification.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search clubs by name or owner..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-4 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : pendingClubs.length > 0 ? (
        <>
          {/* Pending Clubs Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Club
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Registration Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pendingClubs.map((club) => (
                    <tr key={club._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {club.logoUrl ? (
                            <img
                              src={club.logoUrl}
                              alt={club.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                              <Users className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {club.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {club.category || 'General'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {club.owner?.username || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {club.owner?.email || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(club.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewDetails(club)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleApprove(club._id)}
                            disabled={actionInProgress}
                            className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Approve"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleRejectClick(club)}
                            disabled={actionInProgress}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Reject"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} clubs
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousPage}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={handleNextPage}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No pending clubs
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery
              ? 'No clubs match your search query.'
              : 'All clubs have been reviewed!'}
          </p>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Reject Club
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please provide a reason for rejecting <strong>{selectedClub?.name}</strong>:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedClub(null);
                  setRejectionReason('');
                }}
                disabled={actionInProgress}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                disabled={actionInProgress || !rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionInProgress ? 'Rejecting...' : 'Reject Club'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedClub && !showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Club Details
              </h3>
              <button
                onClick={() => setSelectedClub(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Close modal"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Logo and Name */}
              <div className="flex items-center gap-4">
                {selectedClub.logoUrl ? (
                  <img
                    src={selectedClub.logoUrl}
                    alt={selectedClub.name}
                    className="h-20 w-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <Users className="h-10 w-10 text-gray-400" />
                  </div>
                )}
                <div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedClub.name}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    {selectedClub.category || 'General'}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Description
                </h5>
                <p className="text-gray-900 dark:text-white">
                  {selectedClub.description || 'No description provided'}
                </p>
              </div>

              {/* Owner Info */}
              <div>
                <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Owner Information
                </h5>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-gray-900 dark:text-white">
                    <strong>Name:</strong> {selectedClub.owner?.username || 'Unknown'}
                  </p>
                  <p className="text-gray-900 dark:text-white mt-1">
                    <strong>Email:</strong> {selectedClub.owner?.email || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              {selectedClub.contactEmail && (
                <div>
                  <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Contact Email
                  </h5>
                  <p className="text-gray-900 dark:text-white">
                    {selectedClub.contactEmail}
                  </p>
                </div>
              )}

              {/* Registration Date */}
              <div>
                <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                  Registration Date
                </h5>
                <p className="text-gray-900 dark:text-white">
                  {new Date(selectedClub.createdAt).toLocaleString()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    const clubId = selectedClub._id;
                    setSelectedClub(null);
                    handleApprove(clubId);
                  }}
                  disabled={actionInProgress}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    handleRejectClick(selectedClub);
                  }}
                  disabled={actionInProgress}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <XCircle className="h-5 w-5" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
