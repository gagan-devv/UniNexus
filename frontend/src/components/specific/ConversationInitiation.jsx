import { useState, useEffect } from 'react';
import { X, Search, Loader2, User } from 'lucide-react';
import { authAPI, messageAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useDebounce } from '../../hooks/useDebounce';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import ImageDisplay from '../common/ImageDisplay';

/**
 * ConversationInitiation component
 * Provides UI for users to search for and select other users to start conversations
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Controls dialog visibility
 * @param {Function} props.onClose - Callback when dialog closes
 * @param {Function} props.onSuccess - Callback after conversation created
 */
const ConversationInitiation = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [initialMessage, setInitialMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // Debounce search query by 300ms
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Perform user search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedSearchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      setError(null);

      try {
        const response = await authAPI.searchUsers(debouncedSearchQuery);
        const users = response?.data?.data || [];
        
        // Filter out users who are already selected
        const filteredUsers = users.filter(
          u => !selectedUsers.find(selected => selected._id === u._id)
        );
        
        // Limit to 20 users maximum
        setSearchResults(filteredUsers.slice(0, 20));
      } catch (err) {
        console.error('Error searching users:', err);
        setError(err.response?.data?.message || 'Failed to search users. Please try again.');
      } finally {
        setSearching(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, selectedUsers]);

  // Handle adding a user to selected list
  const handleAddUser = (user) => {
    setSelectedUsers(prev => [...prev, user]);
    // Remove from search results
    setSearchResults(prev => prev.filter(u => u._id !== user._id));
  };

  // Handle removing a user from selected list
  const handleRemoveUser = (userId) => {
    setSelectedUsers(prev => prev.filter(u => u._id !== userId));
  };

  // Handle conversation creation
  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;

    setCreating(true);
    setError(null);

    try {
      const participantIds = selectedUsers.map(u => u._id);
      const response = await messageAPI.createConversation(
        participantIds,
        initialMessage.trim() || undefined
      );
      const newConversation = response?.data?.data;

      // Call success callback with conversation data
      onSuccess(newConversation);

      // Reset state
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUsers([]);
      setInitialMessage('');
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError(err.response?.data?.message || 'Failed to create conversation. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    setInitialMessage('');
    setError(null);
    onClose();
  };

  // Don't render if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            New Conversation
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Error Message */}
          {error && (
            <ErrorMessage message={error} onRetry={() => setError(null)} />
          )}

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
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
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
                        onClick={() => handleAddUser(searchUser)}
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

          {/* Selected Participants */}
          {selectedUsers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selected participants ({selectedUsers.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((selectedUser) => (
                  <div
                    key={selectedUser._id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
                  >
                    <span className="text-sm font-medium">{selectedUser.username}</span>
                    <button
                      onClick={() => handleRemoveUser(selectedUser._id)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 transition-colors"
                      aria-label={`Remove ${selectedUser.username}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Initial Message (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Initial message (optional)
            </label>
            <textarea
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Type your first message..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            disabled={creating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateConversation}
            disabled={selectedUsers.length === 0 || creating}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </span>
            ) : (
              'Create'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConversationInitiation;
