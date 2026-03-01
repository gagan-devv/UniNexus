import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, Calendar, Users, MessageSquare, Loader2 } from 'lucide-react';
import { notificationAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const Notifications = () => {
  const navigate = useNavigate();
  
  // State management
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
  
  const limit = 20;

  // Fetch notifications
  const fetchNotifications = useCallback(async (pageNum) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await notificationAPI.getNotifications(pageNum, limit);
      const data = response?.data?.data;
      
      if (pageNum === 1) {
        setNotifications(data?.notifications || []);
      } else {
        setNotifications(prev => [...prev, ...(data?.notifications || [])]);
      }
      
      setTotalPages(data?.totalPages || 1);
      setHasMore(pageNum < (data?.totalPages || 1));
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Failed to fetch notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications(1);
  }, [fetchNotifications]);

  // Load more notifications
  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(nextPage);
    }
  };

  // Mark notification as read and navigate
  const handleNotificationClick = async (notification) => {
    // Optimistic update - mark as read immediately
    if (!notification.read) {
      const previousNotifications = [...notifications];
      
      setNotifications(prev =>
        prev.map(n =>
          n._id === notification._id ? { ...n, read: true } : n
        )
      );

      try {
        await notificationAPI.markAsRead(notification._id);
      } catch (err) {
        // Rollback on error
        setNotifications(previousNotifications);
        console.error('Error marking notification as read:', err);
      }
    }

    // Navigate to related resource
    navigateToRelatedResource(notification);
  };

  // Navigate based on notification type
  const navigateToRelatedResource = (notification) => {
    const { type, relatedId } = notification;
    
    switch (type) {
      case 'event_created':
      case 'event_updated':
      case 'event_reminder':
        navigate(`/events/${relatedId}`);
        break;
      case 'club_joined':
      case 'club_announcement':
        navigate(`/clubs/${relatedId}`);
        break;
      case 'message_received':
        navigate(`/messages/${relatedId}`);
        break;
      case 'rsvp_confirmed':
        navigate(`/events/${relatedId}`);
        break;
      default:
        // Stay on notifications page if type is unknown
        break;
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    setMarkingAllAsRead(true);
    
    // Optimistic update - mark all as read immediately
    const previousNotifications = [...notifications];
    
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
    
    try {
      await notificationAPI.markAllAsRead();
    } catch (err) {
      // Rollback on error
      setNotifications(previousNotifications);
      console.error('Error marking all as read:', err);
      setError(err.response?.data?.message || 'Failed to mark all as read. Please try again.');
    } finally {
      setMarkingAllAsRead(false);
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

  // Get icon for notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'event_created':
      case 'event_updated':
      case 'event_reminder':
      case 'rsvp_confirmed':
        return <Calendar className="h-5 w-5" />;
      case 'club_joined':
      case 'club_announcement':
        return <Users className="h-5 w-5" />;
      case 'message_received':
        return <MessageSquare className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  // Get color for notification type
  const getNotificationColor = (type) => {
    switch (type) {
      case 'event_created':
      case 'event_updated':
      case 'event_reminder':
      case 'rsvp_confirmed':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300';
      case 'club_joined':
      case 'club_announcement':
        return 'text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-300';
      case 'message_received':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  // Retry on error
  const handleRetry = () => {
    setError(null);
    setPage(1);
    fetchNotifications(1);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Bell className="h-10 w-10 text-blue-600" />
            Notifications
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        
        {/* Mark all as read button */}
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={markingAllAsRead}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {markingAllAsRead ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Marking...
              </>
            ) : (
              <>
                <CheckCheck className="h-4 w-4" />
                Mark all as read
              </>
            )}
          </button>
        )}
      </div>

      {/* Loading State (initial load) */}
      {loading && page === 1 && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <ErrorMessage message={error} onRetry={handleRetry} />
      )}

      {/* Notifications List */}
      {!loading && !error && notifications.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No notifications
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You're all caught up! Check back later for updates.
          </p>
        </div>
      )}

      {!loading && !error && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <div
              key={notification._id}
              onClick={() => handleNotificationClick(notification)}
              className={`
                p-4 rounded-xl border cursor-pointer transition-all
                ${notification.read
                  ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }
                hover:shadow-md
              `}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${getNotificationColor(notification.type)}`}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-semibold'}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatTimestamp(notification.createdAt)}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notification.read && (
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {!loading && !error && hasMore && notifications.length > 0 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </span>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      {/* Page indicator */}
      {!loading && !error && notifications.length > 0 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Page {page} of {totalPages}
        </div>
      )}
    </div>
  );
};

export default Notifications;
