import { useState, useEffect } from 'react';
import { X, Search, Loader2, User, UserMinus, UserCog, UserPlus } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import ConfirmDialog from '../common/ConfirmDialog';
import ImageDisplay from '../common/ImageDisplay';
import api from '../../services/api';

/**
 * MemberManagement component
 * Provides UI for club admins to manage club members
 * 
 * @param {Object} props
 * @param {string} props.clubId - Club ID
 * @param {boolean} props.isAdmin - Whether current user is admin
 * @param {Function} props.onMemberCountChange - Callback when member count changes
 */
const MemberManagement = ({ clubId, isAdmin, onMemberCountChange }) => {
  const { user } = useAuth();
  
  // State management
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Debounce search query by 300ms
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Only render if user is admin
  if (!isAdmin) {
    return null;
  }

  // Fetch members on mount
  useEffect(() => {
    fetchMembers();
  }, [clubId]);

  // Perform user search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setSearching(true);

      try {
        const response = await authAPI.searchUsers(debouncedSearchQuery);
        const users = response?.data?.data || [];
        
        // Filter out users who are already members
        const memberIds = members.map(m => m.userId._id);
        const filteredUsers = users.filter(
          u => !memberIds.includes(u._id)
        );
        
        // Limit to 20 users maximum
        setSearchResults(filteredUsers.slice(0, 20));
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setSearching(false);
      }
    };

    if (showAddDialog) {
      performSearch();
    }
  }, [debouncedSearchQuery, members, showAddDialog]);

  const fetchMembers = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/clubs/${clubId}/members`);
      const membersData = response?.data?.data;
      const membersList = membersData?.members || [];
      setMembers(membersList);
      
      // Notify parent component of member count change
      if (onMemberCountChange) {
        onMemberCountChange(membersList.length);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setError(err.response?.data?.message || 'Failed to fetch members. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (userId) => {
    setActionInProgress(true);
    setError(null);

    try {
      const response = await api.post(`/clubs/${clubId}/members`, { userId });
      const updatedMembers = response?.data?.data?.members || [];
      setMembers(updatedMembers);
      
      // Notify parent component of member count change
      if (onMemberCountChange) {
        onMemberCountChange(updatedMembers.length);
      }
      
      setShowAddDialog(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error adding member:', err);
      setError(err.response?.data?.message || 'Failed to add member. Please try again.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;

    setActionInProgress(true);
    setError(null);

    try {
      const response = await api.delete(`/clubs/${clubId}/members/${selectedMember.userId._id}`);
      const updatedMembers = response?.data?.data?.members || [];
      setMembers(updatedMembers);
      
      // Notify parent component of member count change
      if (onMemberCountChange) {
        onMemberCountChange(updatedMembers.length);
      }
      
      setShowRemoveDialog(false);
      setSelectedMember(null);
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err.response?.data?.message || 'Failed to remove member. Please try again.');
      setShowRemoveDialog(false);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleChangeRole = async (newRole) => {
    if (!selectedMember) return;

    setActionInProgress(true);
    setError(null);

    try {
      await api.put(`/clubs/${clubId}/members/${selectedMember.userId._id}/role`, { role: newRole });
      // Refresh members list
      await fetchMembers();
      setShowRoleDialog(false);
      setSelectedMember(null);
    } catch (err) {
      console.error('Error changing role:', err);
      setError(err.response?.data?.message || 'Failed to change role. Please try again.');
      setShowRoleDialog(false);
    } finally {
      setActionInProgress(false);
    }
  };

  const openRemoveDialog = (member) => {
    setSelectedMember(member);
    setShowRemoveDialog(true);
  };

  const openRoleDialog = (member) => {
    setSelectedMember(member);
    setShowRoleDialog(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error Message */}
      {error && (
        <ErrorMessage message={error} onRetry={() => setError(null)} />
      )}

      {/* Header with Add Member Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Club Members ({members.length})
        </h3>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Add Member
        </button>
      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No members yet</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {members.map((member) => (
                <tr key={member._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <ImageDisplay
                        imageUrl={member.userId.avatarUrl}
                        altText={member.userId.username}
                        size="sm"
                        className="rounded-full"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {member.userId.firstName} {member.userId.lastName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          @{member.userId.username}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      member.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openRoleDialog(member)}
                        disabled={actionInProgress}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                        title="Change Role"
                      >
                        <UserCog className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openRemoveDialog(member)}
                        disabled={actionInProgress}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                        title="Remove Member"
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Member Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Add Member
              </h3>
              <button
                onClick={() => {
                  setShowAddDialog(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                aria-label="Close dialog"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Search Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search users
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by username or name..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    autoFocus
                  />
                </div>
              </div>

              {/* Search Results */}
              {searchQuery.trim() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search results
                  </label>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto">
                    {searching && (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner size="sm" />
                      </div>
                    )}

                    {!searching && searchResults.length === 0 && (
                      <div className="text-center py-8 px-4">
                        <User className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          No users found
                        </p>
                      </div>
                    )}

                    {!searching && searchResults.length > 0 && (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {searchResults.map((searchUser) => (
                          <div
                            key={searchUser._id}
                            onClick={() => handleAddMember(searchUser._id)}
                            className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <ImageDisplay
                                imageUrl={searchUser.avatarUrl}
                                altText={searchUser.username}
                                size="sm"
                                className="flex-shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {searchUser.username}
                                </p>
                                {(searchUser.firstName || searchUser.lastName) && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                    {searchUser.firstName} {searchUser.lastName}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRemoveDialog}
        title="Remove Member"
        message={`Are you sure you want to remove ${selectedMember?.userId?.firstName} ${selectedMember?.userId?.lastName} from the club?`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={handleRemoveMember}
        onCancel={() => {
          setShowRemoveDialog(false);
          setSelectedMember(null);
        }}
        isDestructive={true}
      />

      {/* Change Role Dialog */}
      {showRoleDialog && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Change Member Role
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Change role for {selectedMember.userId.firstName} {selectedMember.userId.lastName}
            </p>
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleChangeRole('admin')}
                disabled={selectedMember.role === 'admin' || actionInProgress}
                className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                  selectedMember.role === 'admin'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-purple-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Admin</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Can manage members and events
                    </p>
                  </div>
                  {selectedMember.role === 'admin' && (
                    <span className="text-purple-600 dark:text-purple-400 text-sm font-medium">
                      Current
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => handleChangeRole('member')}
                disabled={selectedMember.role === 'member' || actionInProgress}
                className={`w-full px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                  selectedMember.role === 'member'
                    ? 'border-gray-500 bg-gray-50 dark:bg-gray-700'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-500'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Member</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Standard club member
                    </p>
                  </div>
                  {selectedMember.role === 'member' && (
                    <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                      Current
                    </span>
                  )}
                </div>
              </button>
            </div>
            <button
              onClick={() => {
                setShowRoleDialog(false);
                setSelectedMember(null);
              }}
              disabled={actionInProgress}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberManagement;
