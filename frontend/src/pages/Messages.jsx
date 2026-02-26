import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Send, Plus, X, Loader2, User } from 'lucide-react';
import { messageAPI, authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ImageDisplay from '../components/common/ImageDisplay';

const Messages = () => {
  const { user } = useAuth();
  
  // State management
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);
  const [newConversationUsers, setNewConversationUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [creatingConversation, setCreatingConversation] = useState(false);
  
  const messagesEndRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await messageAPI.getConversations();
      const data = response?.data?.data || [];
      setConversations(data);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(err.response?.data?.message || 'Failed to fetch conversations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(async (conversationId) => {
    setMessagesLoading(true);
    setError(null);
    
    try {
      const response = await messageAPI.getConversationMessages(conversationId);
      const data = response?.data?.data || [];
      setMessages(data);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err.response?.data?.message || 'Failed to fetch messages. Please try again.');
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Set up polling for new messages
  useEffect(() => {
    if (selectedConversation) {
      // Poll every 5 seconds
      pollingIntervalRef.current = setInterval(() => {
        fetchMessages(selectedConversation._id);
      }, 5000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [selectedConversation, fetchMessages]);

  // Handle conversation selection
  const handleConversationClick = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation._id);
  };

  // Handle send message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !selectedConversation) return;
    
    setSendingMessage(true);
    
    try {
      const response = await messageAPI.sendMessage(selectedConversation._id, messageInput.trim());
      const newMessage = response?.data?.data;
      
      // Add new message to the list
      setMessages(prev => [...prev, newMessage]);
      setMessageInput('');
      
      // Update conversation list to reflect new last message
      setConversations(prev =>
        prev.map(conv =>
          conv._id === selectedConversation._id
            ? { ...conv, lastMessage: newMessage, lastMessageAt: newMessage.timestamp }
            : conv
        ).sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt))
      );
      
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle create conversation
  const handleCreateConversation = async () => {
    if (selectedUsers.length === 0) return;
    
    setCreatingConversation(true);
    
    try {
      const participantIds = selectedUsers.map(u => u._id);
      const response = await messageAPI.createConversation(participantIds, '');
      const newConversation = response?.data?.data;
      
      // Add new conversation to the list
      setConversations(prev => [newConversation, ...prev]);
      
      // Select the new conversation
      setSelectedConversation(newConversation);
      setMessages([]);
      
      // Close dialog and reset
      setShowNewConversationDialog(false);
      setSelectedUsers([]);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError(err.response?.data?.message || 'Failed to create conversation. Please try again.');
    } finally {
      setCreatingConversation(false);
    }
  };

  // Search users for new conversation
  const handleUserSearch = async (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    try {
      // Using discover API to search for users (clubs)
      const response = await authAPI.getProfile();
      // In a real implementation, you'd have a user search endpoint
      // For now, we'll just show a placeholder
      setSearchResults([]);
    } catch (err) {
      console.error('Error searching users:', err);
    }
  };

  // Format timestamp
  const formatTimestamp = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Format message time
  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get participant name (excluding current user)
  const getConversationName = (conversation) => {
    const otherParticipants = conversation.participants?.filter(p => p._id !== user?._id) || [];
    if (otherParticipants.length === 0) return 'You';
    if (otherParticipants.length === 1) return otherParticipants[0].username || 'Unknown User';
    return otherParticipants.map(p => p.username).join(', ');
  };

  // Get participant avatar
  const getConversationAvatar = (conversation) => {
    const otherParticipants = conversation.participants?.filter(p => p._id !== user?._id) || [];
    if (otherParticipants.length === 0) return user?.avatarUrl;
    return otherParticipants[0]?.avatarUrl;
  };

  // Retry on error
  const handleRetry = () => {
    setError(null);
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
    } else {
      fetchConversations();
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversations Sidebar */}
      <div className="w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              Messages
            </h2>
            <button
              onClick={() => setShowNewConversationDialog(true)}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="New Conversation"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          )}

          {error && !selectedConversation && (
            <div className="p-4">
              <ErrorMessage message={error} onRetry={handleRetry} />
            </div>
          )}

          {!loading && !error && conversations.length === 0 && (
            <div className="text-center py-12 px-4">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No conversations
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Start a new conversation to get started
              </p>
            </div>
          )}

          {!loading && conversations.length > 0 && (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {conversations.map((conversation) => (
                <div
                  key={conversation._id}
                  onClick={() => handleConversationClick(conversation)}
                  className={`
                    p-4 cursor-pointer transition-colors
                    ${selectedConversation?._id === conversation._id
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <ImageDisplay
                      imageUrl={getConversationAvatar(conversation)}
                      altText={getConversationName(conversation)}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {getConversationName(conversation)}
                        </h3>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                          {formatTimestamp(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {conversation.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col">
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                Select a conversation
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Choose a conversation from the list to view messages
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <ImageDisplay
                  imageUrl={getConversationAvatar(selectedConversation)}
                  altText={getConversationName(selectedConversation)}
                  size="sm"
                />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {getConversationName(selectedConversation)}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedConversation.participants?.length || 0} participants
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4">
                <ErrorMessage message={error} onRetry={handleRetry} />
              </div>
            )}

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
              {messagesLoading && (
                <div className="flex justify-center py-12">
                  <LoadingSpinner size="md" />
                </div>
              )}

              {!messagesLoading && messages.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              )}

              {!messagesLoading && messages.map((message) => {
                const isOwnMessage = message.senderId?._id === user?._id || message.senderId === user?._id;
                
                return (
                  <div
                    key={message._id}
                    className={`flex items-start gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                  >
                    <ImageDisplay
                      imageUrl={message.senderId?.avatarUrl}
                      altText={message.senderId?.username || 'User'}
                      size="sm"
                      className="flex-shrink-0"
                    />
                    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%]`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {isOwnMessage ? 'You' : message.senderId?.username || 'Unknown User'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatMessageTime(message.timestamp)}
                        </span>
                      </div>
                      <div
                        className={`
                          px-4 py-2 rounded-lg
                          ${isOwnMessage
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                          }
                        `}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Type a message..."
                  rows={1}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
                <button
                  type="submit"
                  disabled={!messageInput.trim() || sendingMessage}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sendingMessage ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* New Conversation Dialog */}
      {showNewConversationDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                New Conversation
              </h3>
              <button
                onClick={() => {
                  setShowNewConversationDialog(false);
                  setSelectedUsers([]);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search users
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleUserSearch(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {selectedUsers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Selected users
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <div
                        key={user._id}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full"
                      >
                        <span className="text-sm">{user.username}</span>
                        <button
                          onClick={() => setSelectedUsers(prev => prev.filter(u => u._id !== user._id))}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                User search functionality will be implemented with a dedicated user search endpoint
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowNewConversationDialog(false);
                    setSelectedUsers([]);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateConversation}
                  disabled={selectedUsers.length === 0 || creatingConversation}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creatingConversation ? (
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
        </div>
      )}
    </div>
  );
};

export default Messages;
