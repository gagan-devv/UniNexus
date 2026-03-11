import { useState } from 'react';
import VoteButtons from './VoteButtons';

const CommentItem = ({ 
  comment, 
  currentUser, 
  onReply, 
  onEdit, 
  onDelete, 
  onVote, 
  depth = 0,
  collapsed = false,
  onToggleCollapse,
  children 
}) => {
  // State management
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [replyText, setReplyText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Check if current user is the author
  const isAuthor = currentUser && comment.author?._id === currentUser._id;
  
  // Check if current user can moderate (event organizer or super admin)
  // For now, we'll just check if they're the author or have moderator privileges
  const canModerate = currentUser && (isAuthor || currentUser.isSuperAdmin);

  // Calculate indentation based on depth (max 6 levels of visual indentation)
  const indentLevel = Math.min(depth, 6);
  const indentClass = indentLevel > 0 ? `ml-${indentLevel * 4}` : '';

  // Determine user vote status
  const userVote = currentUser 
    ? (comment.upvotes?.includes(currentUser._id) ? 'upvote' 
       : comment.downvotes?.includes(currentUser._id) ? 'downvote' 
       : null)
    : null;

  // Handle edit submission
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedText = editText.trim();
    
    // Clear previous errors
    setError(null);
    
    if (!trimmedText) {
      setError('Comment cannot be empty');
      return;
    }

    if (editText.length > 2000) {
      setError('Comment cannot exceed 2000 characters');
      return;
    }

    try {
      setSubmitting(true);
      await onEdit(comment._id, trimmedText);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle reply submission
  const handleReplySubmit = async (e) => {
    e.preventDefault();
    
    const trimmedText = replyText.trim();
    
    // Clear previous errors
    setError(null);
    
    if (!trimmedText) {
      setError('Reply cannot be empty');
      return;
    }

    if (replyText.length > 2000) {
      setError('Reply cannot exceed 2000 characters');
      return;
    }

    try {
      setSubmitting(true);
      await onReply(comment._id, trimmedText);
      setReplyText('');
      setIsReplying(false);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await onDelete(comment._id);
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete comment');
      setShowDeleteConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Format timestamp
  const formatTimestamp = (date) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffMs = now - commentDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return commentDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: commentDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Count replies (children)
  const replyCount = children ? (Array.isArray(children) ? children.length : 1) : 0;

  return (
    <div className={`comment-item ${depth > 0 ? 'border-l-2 border-gray-200 dark:border-gray-700 pl-4' : ''}`}>
      <div className="flex gap-3 py-3">
        {/* Vote buttons */}
        <VoteButtons
          commentId={comment._id}
          voteCount={comment.voteCount || 0}
          userVote={userVote}
          onVote={onVote}
          disabled={!currentUser || isAuthor}
        />

        {/* Comment content */}
        <div className="flex-1 min-w-0">
          {/* Author and metadata */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Avatar */}
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {comment.author?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              
              {/* Username */}
              <span className="font-medium text-sm text-gray-900 dark:text-white">
                {comment.author?.username || '[deleted]'}
              </span>
            </div>

            {/* Timestamp */}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(comment.createdAt)}
            </span>

            {/* Edited indicator */}
            {comment.isEdited && (
              <span className="text-xs text-gray-500 dark:text-gray-400 italic">
                (edited)
              </span>
            )}

            {/* Collapse/expand button for comments with replies */}
            {replyCount > 0 && (
              <button
                onClick={onToggleCollapse}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {collapsed ? `[+] ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}` : '[-]'}
              </button>
            )}
          </div>

          {/* Comment content or edit form */}
          {isEditing ? (
            <form onSubmit={handleEditSubmit} className="space-y-2 mt-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                disabled={submitting}
                autoFocus
              />
              {error && (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                  {error}
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {editText.length}/2000 characters
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditText(comment.content);
                      setError(null);
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
              {comment.isDeleted ? (
                <span className="italic text-gray-500 dark:text-gray-400">
                  {comment.moderationReason || '[deleted]'}
                </span>
              ) : (
                comment.content
              )}
            </div>
          )}

          {/* Error message */}
          {error && !isEditing && !isReplying && (
            <div className="mt-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Action buttons */}
          {!comment.isDeleted && !isEditing && (
            <div className="flex items-center gap-3 mt-2">
              {/* Reply button */}
              {currentUser && (
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  aria-label="Reply to comment"
                >
                  Reply
                </button>
              )}

              {/* Edit button (only for author) */}
              {isAuthor && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  Edit
                </button>
              )}

              {/* Delete button (for author or moderators) */}
              {canModerate && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  Delete
                </button>
              )}
            </div>
          )}

          {/* Reply form */}
          {isReplying && (
            <form onSubmit={handleReplySubmit} className="mt-3 space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none"
                disabled={submitting}
                autoFocus
              />
              {error && (
                <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                  {error}
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {replyText.length}/2000 characters
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplying(false);
                      setReplyText('');
                      setError(null);
                    }}
                    className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Submit reply"
                  >
                    {submitting ? 'Posting...' : 'Reply'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Delete confirmation dialog */}
          {showDeleteConfirm && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                Are you sure you want to delete this comment? This action cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={submitting}
                  className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {!collapsed && children && (
        <div className="comment-children">
          {children}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
