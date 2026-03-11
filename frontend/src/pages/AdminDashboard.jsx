import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, CheckCircle, XCircle, Clock, Search } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { adminAPI } from '../services/api';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingClubs, setPendingClubs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [actionInProgress, setActionInProgress] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedClub, setSelectedClub] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    // Redirect non-admin users to home page
    if (!user?.isSuperAdmin) {
      navigate('/');
      return;
    }
    fetchPendingClubs();
    fetchStats();
  }, [user, navigate, page, searchQuery]);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getClubStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPendingClubs = async () => {
    setLoading(true);
    try {
      const response = await adminAPI.getPendingClubs({ page, limit: 10, search: searchQuery });
      const data = response.data.data;
      setPendingClubs(data.clubs);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching pending clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (clubId) => {
    setActionInProgress(clubId);
    try {
      await adminAPI.approveClub(clubId);
      fetchPendingClubs();
      fetchStats(); // Refresh stats after approval
    } catch (error) {
      console.error('Error approving club:', error);
      alert('Failed to approve club');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectClick = (club) => {
    setSelectedClub(club);
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setActionInProgress(selectedClub._id);
    try {
      await adminAPI.rejectClub(selectedClub._id, rejectionReason);
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedClub(null);
      fetchPendingClubs();
      fetchStats(); // Refresh stats after rejection
    } catch (error) {
      console.error('Error rejecting club:', error);
      alert('Failed to reject club');
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading && pendingClubs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage club registrations and platform administration
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-card-dark rounded-lg shadow-md p-6 border border-slate-200 dark:border-input-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Pending Clubs
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.pending}
                </p>
              </div>
              <Clock className="h-12 w-12 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-card-dark rounded-lg shadow-md p-6 border border-slate-200 dark:border-input-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Approved Clubs
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.approved}
                </p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-card-dark rounded-lg shadow-md p-6 border border-slate-200 dark:border-input-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Rejected Clubs
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.rejected}
                </p>
              </div>
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Pending Clubs Section */}
        <div className="bg-white dark:bg-card-dark rounded-lg shadow-md border border-slate-200 dark:border-input-border">
          <div className="p-6 border-b border-slate-200 dark:border-input-border">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Pending Club Registrations
            </h2>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="md" />
              </div>
            ) : pendingClubs.length > 0 ? (
              <div className="space-y-4">
                {pendingClubs.map((club) => (
                  <div
                    key={club._id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {club.logoUrl ? (
                            <img
                              src={club.logoUrl}
                              alt={club.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                              <Users className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {club.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {club.category} • Founded {club.foundedYear}
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mb-2">
                          {club.description}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Contact: {club.email}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">
                          Registered: {new Date(club.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApprove(club._id)}
                          disabled={actionInProgress === club._id}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRejectClick(club)}
                          disabled={actionInProgress === club._id}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  No pending club registrations
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Club registration approvals will appear here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Reject Club Registration
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Please provide a reason for rejecting "{selectedClub?.name}":
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRejectConfirm}
                  disabled={actionInProgress}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Confirm Reject
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                    setSelectedClub(null);
                  }}
                  disabled={actionInProgress}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
