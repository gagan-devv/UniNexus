import { useState, useEffect } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import CommentItem from './CommentItem';
import { commentAPI } from '../../services/api';

const CommentThread = ({ eventId, currentUser }) => {
  // State management
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState(() => {
    // Load sort preference from localStorage
    return localStorage.getItem(`commentSort_${eventId}`) || 'hot';
  });
  const [newCommentText, setNewCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [collapsedThreads, setCollapsedThreads] = useState(() => {
    // Load collapsed state from localStorage
    const saved = localStorage.getItem(`collapsedThreads_${eventId}`);
    return saved ? JSON.parse(saved) : {};
  });

  // Fetch comments on mount and when sort changes
  useEffect(() => {
    fetchComments();
  }, [eventId, sortBy]);

  // Save sort preference to localStorage
  useEffect(() => {
    localStorage.setItem(`commentSort_${eventId}`, sortBy);
  }, [sortBy, eventId]);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(`collapsedThreads_${eventId}`, JSON.stringify(collapsedThreads));
  }, [collapsedThreads, eventId]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await commentAPI.getByEvent(eventId, { sort: sortBy });
      setComments(response.data.data.comments || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError(err.response?.data?.message || 'Failed to load comments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('You must be logged in to comment');
      return;
    }

    const trimmedText = newCommentText.trim();
    if (!trimmedText) {
      setError('Comment cannot be empty');
      return;
    }

    if (trimmedText.length > 2000) {
      setError('Comment cannot exceed 2000 characters');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const response = await commentAPI.create({
        content: trimmedText,
        eventId,
        parentId: null
      });

      // Add new comment to the list
      setComments(prev => [response.data.data, ...prev]);
      setNewCommentText('');
    } catch (err) {
      console.error('Error creating comment:', err);
      setError(err.response?.data?.message || 'Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
  };

  const handleCollapseAll = () => {
    const allCollapsed = {};
    comments.forEach(comment => {
      if (comment.depth === 0) {
        allCollapsed[comment._id] = true;
      }
    });
    setCollapsedThreads(allCollapsed);
  };

  const handleExpandAll = () => {
    setCollapsedThreads({});
  };

  const toggleCollapse = (commentId) => {
    setCollapsedThreads(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const handleReply = async (parentId, content) => {
    try {
      const response = await commentAPI.create({
        content,
        eventId,
        parentId
      });

      // Refresh comments to get updated tree
      await fetchComments();
    } catch (err) {
      console.error('Error creating reply:', err);
      throw err;
    }
  };

  const handleEdit = async (commentId, content) => {
    try {
      await commentAPI.update(commentId, { content });
      
      // Update comment in local state
      setComments(prev => prev.map(c => 
        c._id === commentId 
          ? { ...c, content, isEdited: true, editedAt: new Date() }
          : c
      ));
    } catch (err) {
      console.error('Error updating comment:', err);
      throw err;
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await commentAPI.delete(commentId);
      
      // Update comment in local state to show as deleted
      setComments(prev => prev.map(c => 
        c._id === commentId 
          ? { ...c, isDeleted: true, content: '[deleted]' }
          : c
      ));
    } catch (err) {
      console.error('Error deleting comment:', err);
      throw err;
    }
  };

  const handleVote = async (commentId, voteType) => {
    try {
      const response = await commentAPI.vote(commentId, voteType);
      const { voteCount, userVote } = response.data.data;
      
      // Update comment in local state
      setComments(prev => prev.map(c => {
        if (c._id === commentId) {
          const updated = { ...c, voteCount };
          
          // Update upvotes/downvotes arrays based on userVote
          if (userVote === 'upvote') {
            updated.upvotes = [...(c.upvotes || [])];
            if (!updated.upvotes.includes(currentUser._id)) {
              updated.upvotes.push(currentUser._id);
            }
            updated.downvotes = (c.downvotes || []).filter(id => id !== currentUser._id);
          } else if (userVote === 'downvote') {
            updated.downvotes = [...(c.downvotes || [])];
            if (!updated.downvotes.includes(currentUser._id)) {
              updated.downvotes.push(currentUser._id);
            }
            updated.upvotes = (c.upvotes || []).filter(id => id !== currentUser._id);
          } else {
            // Remove vote
            updated.upvotes = (c.upvotes || []).filter(id => id !== currentUser._id);
            updated.downvotes = (c.downvotes || []).filter(id => id !== currentUser._id);
          }
          
          return updated;
        }
        return c;
      }));
    } catch (err) {
      console.error('Error voting on comment:', err);
      throw err;
    }
  };

  // Build nested comment tree
  const buildCommentTree = (comments) => {
    const commentMap = {};
    const rootComments = [];

    // Create a map of all comments
    comments.forEach(comment => {
      commentMap[comment._id] = { ...comment, children: [] };
    });

    // Build the tree structure
    comments.forEach(comment => {
      if (comment.parentId && commentMap[comment.parentId]) {
        commentMap[comment.parentId].children.push(commentMap[comment._id]);
      } else if (!comment.parentId) {
        rootComments.push(commentMap[comment._id]);
      }
    });

    return rootComments;
  };

  // Render comment tree recursively
  const renderCommentTree = (comment, depth = 0) => {
    const isCollapsed = collapsedThreads[comment._id];
    
    return (
      <CommentItem
        key={comment._id}
        comment={comment}
        currentUser={currentUser}
        onReply={handleReply}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onVote={handleVote}
        depth={depth}
        collapsed={isCollapsed}
        onToggleCollapse={() => toggleCollapse(comment._id)}
      >
        {!isCollapsed && comment.children && comment.children.length > 0 && 
          comment.children.map(child => renderCommentTree(child, depth + 1))
        }
      </CommentItem>
    );
  };

  const commentTree = buildCommentTree(comments);

  return (
    <div className="space-y-4">
      {/* Header with sorting and collapse controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Comments ({comments.length})
        </h3>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Collapse/Expand buttons */}
          {comments.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleCollapseAll}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Collapse All
              </button>
              <button
                onClick={handleExpandAll}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Expand All
              </button>
            </div>
          )}
          
          {/* Sort controls */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-md p-1">
            {['hot', 'top', 'new', 'controversial'].map((sort) => (
              <button
                key={sort}
                onClick={() => handleSortChange(sort)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  sortBy === sort
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {sort.charAt(0).toUpperCase() + sort.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comment input for root comments */}
      {currentUser ? (
        <form onSubmit={handleSubmitComment} className="space-y-2">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {currentUser.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
            <div className="flex-1">
              <textarea
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors resize-none"
                disabled={submitting}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {newCommentText.length}/2000 characters
                </span>
                <button
                  type="submit"
                  disabled={!newCommentText.trim() || submitting || newCommentText.length > 2000}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Please <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">log in</a> to comment
          </p>
        </div>
      )}

      {/* Error message */}
      {error && <ErrorMessage message={error} />}

      {/* Comments list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-0">
          {commentTree.map(comment => renderCommentTree(comment, 0))}
        </div>
      )}
    </div>
  );
};

export default CommentThread;
