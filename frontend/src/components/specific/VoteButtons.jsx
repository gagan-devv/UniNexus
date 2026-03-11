import { useState } from 'react';

const VoteButtons = ({ 
  commentId, 
  voteCount = 0, 
  userVote = null, 
  onVote, 
  disabled = false 
}) => {
  const [error, setError] = useState(null);

  const handleVote = async (voteType) => {
    if (disabled) {
      setError('You must be logged in to vote');
      return;
    }

    try {
      setError(null);
      await onVote(commentId, voteType);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to vote');
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <button
        onClick={() => handleVote(userVote === 'upvote' ? 'remove' : 'upvote')}
        disabled={disabled}
        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          userVote === 'upvote' ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'
        }`}
        title={disabled ? 'Login to vote' : 'Upvote'}
        aria-label="Upvote"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 3l6 6H4l6-6z" />
        </svg>
      </button>
      
      <span 
        className={`text-sm font-semibold ${
          voteCount > 0 ? 'text-orange-500' : 
          voteCount < 0 ? 'text-blue-500' : 
          'text-gray-600 dark:text-gray-400'
        }`}
        aria-label={`Vote count: ${voteCount}`}
      >
        {voteCount}
      </span>
      
      <button
        onClick={() => handleVote(userVote === 'downvote' ? 'remove' : 'downvote')}
        disabled={disabled}
        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          userVote === 'downvote' ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
        }`}
        title={disabled ? 'Login to vote' : 'Downvote'}
        aria-label="Downvote"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 17l-6-6h12l-6 6z" />
        </svg>
      </button>
      
      {error && (
        <div className="absolute mt-16 px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
};

export default VoteButtons;
