import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommentItem from './CommentItem';

// Mock VoteButtons component
vi.mock('./VoteButtons', () => ({
  default: ({ commentId, voteCount, userVote, onVote, disabled }) => (
    <div data-testid="vote-buttons">
      <button 
        onClick={() => onVote(commentId, 'upvote')} 
        disabled={disabled}
        aria-label="Upvote"
      >
        Upvote
      </button>
      <span data-testid="vote-count">{voteCount}</span>
      <button 
        onClick={() => onVote(commentId, 'downvote')} 
        disabled={disabled}
        aria-label="Downvote"
      >
        Downvote
      </button>
    </div>
  ),
}));

describe('CommentItem', () => {
  const mockOnReply = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnVote = vi.fn();
  const mockOnToggleCollapse = vi.fn();

  const mockComment = {
    _id: 'comment123',
    content: 'This is a test comment',
    author: {
      _id: 'user123',
      username: 'testuser',
    },
    createdAt: new Date('2024-01-01T12:00:00Z'),
    voteCount: 5,
    upvotes: ['user456'],
    downvotes: [],
    isDeleted: false,
    isEdited: false,
  };

  const mockCurrentUser = {
    _id: 'user123',
    username: 'testuser',
  };

  const defaultProps = {
    comment: mockComment,
    currentUser: mockCurrentUser,
    onReply: mockOnReply,
    onEdit: mockOnEdit,
    onDelete: mockOnDelete,
    onVote: mockOnVote,
    depth: 0,
    collapsed: false,
    onToggleCollapse: mockOnToggleCollapse,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render comment content', () => {
      render(<CommentItem {...defaultProps} />);
      
      expect(screen.getByText('This is a test comment')).toBeInTheDocument();
    });

    it('should render author username', () => {
      render(<CommentItem {...defaultProps} />);
      
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should render author avatar with first letter', () => {
      render(<CommentItem {...defaultProps} />);
      
      expect(screen.getByText('T')).toBeInTheDocument();
    });

    it('should render VoteButtons component', () => {
      render(<CommentItem {...defaultProps} />);
      
      expect(screen.getByTestId('vote-buttons')).toBeInTheDocument();
    });

    it('should render timestamp', () => {
      render(<CommentItem {...defaultProps} />);
      
      // Should show some time format
      expect(screen.getByText(/ago|just now|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)).toBeInTheDocument();
    });
  });

  describe('Comment Metadata Display', () => {
    it('should display edited indicator when comment is edited', () => {
      const editedComment = { ...mockComment, isEdited: true };
      render(<CommentItem {...defaultProps} comment={editedComment} />);
      
      expect(screen.getByText('(edited)')).toBeInTheDocument();
    });

    it('should not display edited indicator when comment is not edited', () => {
      render(<CommentItem {...defaultProps} />);
      
      expect(screen.queryByText('(edited)')).not.toBeInTheDocument();
    });

    it('should display [deleted] for deleted comments', () => {
      const deletedComment = { ...mockComment, isDeleted: true, content: '[deleted]' };
      render(<CommentItem {...defaultProps} comment={deletedComment} />);
      
      expect(screen.getByText('[deleted]')).toBeInTheDocument();
    });

    it('should display moderation reason for moderated comments', () => {
      const moderatedComment = { 
        ...mockComment, 
        isDeleted: true, 
        moderationReason: '[removed by moderator]' 
      };
      render(<CommentItem {...defaultProps} comment={moderatedComment} />);
      
      expect(screen.getByText('[removed by moderator]')).toBeInTheDocument();
    });
  });

  describe('Reply Functionality', () => {
    it('should show reply button for authenticated users', () => {
      render(<CommentItem {...defaultProps} />);
      
      expect(screen.getByText('Reply')).toBeInTheDocument();
    });

    it('should not show reply button for unauthenticated users', () => {
      render(<CommentItem {...defaultProps} currentUser={null} />);
      
      expect(screen.queryByText('Reply')).not.toBeInTheDocument();
    });

    it('should show reply form when reply button is clicked', () => {
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Reply'));
      
      expect(screen.getByPlaceholderText('Write a reply...')).toBeInTheDocument();
    });

    it('should hide reply form when cancel is clicked', () => {
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Reply'));
      const cancelButtons = screen.getAllByText('Cancel');
      fireEvent.click(cancelButtons[0]);
      
      expect(screen.queryByPlaceholderText('Write a reply...')).not.toBeInTheDocument();
    });

    it('should call onReply when reply is submitted', async () => {
      mockOnReply.mockResolvedValue({});
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Reply'));
      
      const textarea = screen.getByPlaceholderText('Write a reply...');
      fireEvent.change(textarea, { target: { value: 'Test reply' } });
      
      const replyButton = screen.getByRole('button', { name: /submit reply/i });
      fireEvent.click(replyButton);
      
      await waitFor(() => {
        expect(mockOnReply).toHaveBeenCalledWith('comment123', 'Test reply');
      });
    });

    it('should clear reply form after successful submission', async () => {
      mockOnReply.mockResolvedValue({});
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Reply'));
      
      const textarea = screen.getByPlaceholderText('Write a reply...');
      fireEvent.change(textarea, { target: { value: 'Test reply' } });
      
      const replyButton = screen.getByRole('button', { name: /submit reply/i });
      fireEvent.click(replyButton);
      
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('Write a reply...')).not.toBeInTheDocument();
      });
    });

    it('should show error when reply is empty', async () => {
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Reply to comment'));
      
      const replyButton = screen.getByRole('button', { name: /submit reply/i });
      fireEvent.click(replyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Reply cannot be empty')).toBeInTheDocument();
      });
    });

    it('should show error when reply exceeds 2000 characters', async () => {
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Reply to comment'));
      
      const textarea = screen.getByPlaceholderText('Write a reply...');
      fireEvent.change(textarea, { target: { value: 'a'.repeat(2001) } });
      
      const replyButton = screen.getByRole('button', { name: /submit reply/i });
      fireEvent.click(replyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Reply cannot exceed 2000 characters')).toBeInTheDocument();
      });
    });

    it('should display character count for reply', () => {
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Reply'));
      
      const textarea = screen.getByPlaceholderText('Write a reply...');
      fireEvent.change(textarea, { target: { value: 'Test' } });
      
      expect(screen.getByText('4/2000 characters')).toBeInTheDocument();
    });
  });

  describe('Edit Functionality', () => {
    it('should show edit button for comment author', () => {
      render(<CommentItem {...defaultProps} />);
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });

    it('should not show edit button for non-authors', () => {
      const otherUser = { _id: 'user456', username: 'otheruser' };
      render(<CommentItem {...defaultProps} currentUser={otherUser} />);
      
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('should show edit form when edit button is clicked', () => {
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      expect(screen.getByDisplayValue('This is a test comment')).toBeInTheDocument();
    });

    it('should hide edit form when cancel is clicked', () => {
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Edit'));
      const cancelButtons = screen.getAllByText('Cancel');
      fireEvent.click(cancelButtons[0]);
      
      expect(screen.queryByDisplayValue('This is a test comment')).not.toBeInTheDocument();
    });

    it('should call onEdit when edit is submitted', async () => {
      mockOnEdit.mockResolvedValue({});
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      const textarea = screen.getByDisplayValue('This is a test comment');
      fireEvent.change(textarea, { target: { value: 'Updated comment' } });
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnEdit).toHaveBeenCalledWith('comment123', 'Updated comment');
      });
    });

    it('should close edit form after successful submission', async () => {
      mockOnEdit.mockResolvedValue({});
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      const textarea = screen.getByDisplayValue('This is a test comment');
      fireEvent.change(textarea, { target: { value: 'Updated comment' } });
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Updated comment')).not.toBeInTheDocument();
      });
    });

    it('should show error when edit content is empty', async () => {
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      const textarea = screen.getByDisplayValue('This is a test comment');
      fireEvent.change(textarea, { target: { value: '   ' } });
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Comment cannot be empty')).toBeInTheDocument();
      });
    });

    it('should show error when edit exceeds 2000 characters', async () => {
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      const textarea = screen.getByDisplayValue('This is a test comment');
      fireEvent.change(textarea, { target: { value: 'a'.repeat(2001) } });
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Comment cannot exceed 2000 characters')).toBeInTheDocument();
      });
    });

    it('should restore original content when edit is cancelled', () => {
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      const textarea = screen.getByDisplayValue('This is a test comment');
      fireEvent.change(textarea, { target: { value: 'Changed text' } });
      
      const cancelButtons = screen.getAllByText('Cancel');
      fireEvent.click(cancelButtons[0]);
      
      // Click edit again to verify original content is restored
      fireEvent.click(screen.getByText('Edit'));
      expect(screen.getByDisplayValue('This is a test comment')).toBeInTheDocument();
    });
  });

  describe('Delete Functionality', () => {
    it('should show delete button for comment author', () => {
      render(<CommentItem {...defaultProps} />);
      
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should show delete button for super admin', () => {
      const adminUser = { _id: 'admin123', username: 'admin', isSuperAdmin: true };
      const otherComment = { ...mockComment, author: { _id: 'user456', username: 'other' } };
      render(<CommentItem {...defaultProps} currentUser={adminUser} comment={otherComment} />);
      
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should not show delete button for non-authors and non-admins', () => {
      const otherUser = { _id: 'user456', username: 'otheruser' };
      render(<CommentItem {...defaultProps} currentUser={otherUser} />);
      
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });

    it('should show confirmation dialog when delete is clicked', () => {
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Delete'));
      
      expect(screen.getByText(/Are you sure you want to delete this comment/)).toBeInTheDocument();
    });

    it('should hide confirmation dialog when cancel is clicked', () => {
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Delete'));
      const cancelButtons = screen.getAllByText('Cancel');
      fireEvent.click(cancelButtons[0]);
      
      expect(screen.queryByText(/Are you sure you want to delete this comment/)).not.toBeInTheDocument();
    });

    it('should call onDelete when deletion is confirmed', async () => {
      mockOnDelete.mockResolvedValue({});
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Delete'));
      
      const deleteButton = screen.getAllByText('Delete')[1]; // Second one is in the confirmation dialog
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith('comment123');
      });
    });

    it('should not show action buttons for deleted comments', () => {
      const deletedComment = { ...mockComment, isDeleted: true };
      render(<CommentItem {...defaultProps} comment={deletedComment} />);
      
      expect(screen.queryByText('Reply')).not.toBeInTheDocument();
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });
  });

  describe('Collapse/Expand Functionality', () => {
    it('should show collapse button when comment has children', () => {
      const children = <div>Child comment</div>;
      render(<CommentItem {...defaultProps}>{children}</CommentItem>);
      
      expect(screen.getByText('[-]')).toBeInTheDocument();
    });

    it('should show reply count when collapsed', () => {
      const children = [<div key="1">Child 1</div>, <div key="2">Child 2</div>];
      render(<CommentItem {...defaultProps} collapsed={true}>{children}</CommentItem>);
      
      expect(screen.getByText('[+] 2 replies')).toBeInTheDocument();
    });

    it('should show singular reply text for one reply', () => {
      const children = <div>Child comment</div>;
      render(<CommentItem {...defaultProps} collapsed={true}>{children}</CommentItem>);
      
      expect(screen.getByText('[+] 1 reply')).toBeInTheDocument();
    });

    it('should call onToggleCollapse when collapse button is clicked', () => {
      const children = <div>Child comment</div>;
      render(<CommentItem {...defaultProps}>{children}</CommentItem>);
      
      fireEvent.click(screen.getByText('[-]'));
      
      expect(mockOnToggleCollapse).toHaveBeenCalled();
    });

    it('should hide children when collapsed', () => {
      const children = <div>Child comment</div>;
      render(<CommentItem {...defaultProps} collapsed={true}>{children}</CommentItem>);
      
      expect(screen.queryByText('Child comment')).not.toBeInTheDocument();
    });

    it('should show children when not collapsed', () => {
      const children = <div>Child comment</div>;
      render(<CommentItem {...defaultProps} collapsed={false}>{children}</CommentItem>);
      
      expect(screen.getByText('Child comment')).toBeInTheDocument();
    });

    it('should not show collapse button when comment has no children', () => {
      render(<CommentItem {...defaultProps} />);
      
      expect(screen.queryByText('[-]')).not.toBeInTheDocument();
      expect(screen.queryByText(/replies/)).not.toBeInTheDocument();
    });
  });

  describe('VoteButtons Integration', () => {
    it('should pass correct props to VoteButtons', () => {
      render(<CommentItem {...defaultProps} />);
      
      expect(screen.getByTestId('vote-buttons')).toBeInTheDocument();
      expect(screen.getByTestId('vote-count')).toHaveTextContent('5');
    });

    it('should disable voting for comment author', () => {
      render(<CommentItem {...defaultProps} />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      expect(upvoteButton).toBeDisabled();
    });

    it('should disable voting for unauthenticated users', () => {
      render(<CommentItem {...defaultProps} currentUser={null} />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      expect(upvoteButton).toBeDisabled();
    });

    it('should enable voting for authenticated non-authors', () => {
      const otherUser = { _id: 'user456', username: 'otheruser' };
      render(<CommentItem {...defaultProps} currentUser={otherUser} />);
      
      const upvoteButton = screen.getByLabelText('Upvote');
      expect(upvoteButton).not.toBeDisabled();
    });

    it('should determine user vote from upvotes array', () => {
      const userWithUpvote = { _id: 'user456', username: 'voter' };
      const commentWithUpvote = { 
        ...mockComment, 
        upvotes: ['user456'],
        downvotes: []
      };
      render(<CommentItem {...defaultProps} currentUser={userWithUpvote} comment={commentWithUpvote} />);
      
      // VoteButtons should receive userVote='upvote'
      expect(screen.getByTestId('vote-buttons')).toBeInTheDocument();
    });

    it('should determine user vote from downvotes array', () => {
      const userWithDownvote = { _id: 'user456', username: 'voter' };
      const commentWithDownvote = { 
        ...mockComment, 
        upvotes: [],
        downvotes: ['user456']
      };
      render(<CommentItem {...defaultProps} currentUser={userWithDownvote} comment={commentWithDownvote} />);
      
      // VoteButtons should receive userVote='downvote'
      expect(screen.getByTestId('vote-buttons')).toBeInTheDocument();
    });
  });

  describe('Timestamp Formatting', () => {
    it('should show "just now" for very recent comments', () => {
      const recentComment = { ...mockComment, createdAt: new Date() };
      render(<CommentItem {...defaultProps} comment={recentComment} />);
      
      expect(screen.getByText('just now')).toBeInTheDocument();
    });

    it('should show minutes for comments less than an hour old', () => {
      const minutesAgo = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
      const recentComment = { ...mockComment, createdAt: minutesAgo };
      render(<CommentItem {...defaultProps} comment={recentComment} />);
      
      expect(screen.getByText(/\d+m ago/)).toBeInTheDocument();
    });

    it('should show hours for comments less than a day old', () => {
      const hoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago
      const recentComment = { ...mockComment, createdAt: hoursAgo };
      render(<CommentItem {...defaultProps} comment={recentComment} />);
      
      expect(screen.getByText(/\d+h ago/)).toBeInTheDocument();
    });

    it('should show days for comments less than a week old', () => {
      const daysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
      const recentComment = { ...mockComment, createdAt: daysAgo };
      render(<CommentItem {...defaultProps} comment={recentComment} />);
      
      expect(screen.getByText(/\d+d ago/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when reply fails', async () => {
      mockOnReply.mockRejectedValue({
        response: { data: { message: 'Failed to post reply' } },
      });
      
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByLabelText('Reply to comment'));
      
      const textarea = screen.getByPlaceholderText('Write a reply...');
      fireEvent.change(textarea, { target: { value: 'Test reply' } });
      
      const replyButton = screen.getByRole('button', { name: /submit reply/i });
      fireEvent.click(replyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to post reply')).toBeInTheDocument();
      });
    });

    it('should display error message when edit fails', async () => {
      mockOnEdit.mockRejectedValue({
        response: { data: { message: 'Failed to update comment' } },
      });
      
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Edit'));
      
      const textarea = screen.getByDisplayValue('This is a test comment');
      fireEvent.change(textarea, { target: { value: 'Updated' } });
      
      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to update comment')).toBeInTheDocument();
      });
    });

    it('should display error message when delete fails', async () => {
      mockOnDelete.mockRejectedValue({
        response: { data: { message: 'Failed to delete comment' } },
      });
      
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Delete'));
      
      const deleteButton = screen.getAllByText('Delete')[1];
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to delete comment')).toBeInTheDocument();
      });
    });
  });

  describe('Visual Indentation', () => {
    it('should not add indentation for root comments (depth 0)', () => {
      const { container } = render(<CommentItem {...defaultProps} depth={0} />);
      
      const commentItem = container.querySelector('.comment-item');
      expect(commentItem).not.toHaveClass('border-l-2');
    });

    it('should add indentation for nested comments (depth > 0)', () => {
      const { container } = render(<CommentItem {...defaultProps} depth={1} />);
      
      const commentItem = container.querySelector('.comment-item');
      expect(commentItem).toHaveClass('border-l-2');
    });
  });

  describe('Accessibility', () => {
    it('should have proper button labels', () => {
      render(<CommentItem {...defaultProps} />);
      
      expect(screen.getByText('Reply')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should have accessible form inputs', () => {
      render(<CommentItem {...defaultProps} />);
      
      fireEvent.click(screen.getByText('Reply'));
      
      const textarea = screen.getByPlaceholderText('Write a reply...');
      expect(textarea).toBeInTheDocument();
    });
  });
});
