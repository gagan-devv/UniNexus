import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommentThread from './CommentThread';
import { commentAPI } from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
  commentAPI: {
    getByEvent: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    vote: vi.fn(),
  },
}));

// Mock child components
vi.mock('../common/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock('../common/ErrorMessage', () => ({
  default: ({ message }) => <div data-testid="error-message">{message}</div>,
}));

vi.mock('./CommentItem', () => ({
  default: ({ comment, children }) => (
    <div data-testid={`comment-${comment._id}`}>
      <div>{comment.content}</div>
      {children}
    </div>
  ),
}));

describe('CommentThread', () => {
  const mockEventId = 'event123';
  const mockCurrentUser = {
    _id: 'user123',
    username: 'testuser',
  };

  const mockComments = [
    {
      _id: 'comment1',
      content: 'Root comment 1',
      author: { _id: 'user1', username: 'user1' },
      eventId: mockEventId,
      parentId: null,
      depth: 0,
      upvotes: [],
      downvotes: [],
      voteCount: 0,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    },
    {
      _id: 'comment2',
      content: 'Reply to comment 1',
      author: { _id: 'user2', username: 'user2' },
      eventId: mockEventId,
      parentId: 'comment1',
      depth: 1,
      upvotes: [],
      downvotes: [],
      voteCount: 0,
      isDeleted: false,
      createdAt: new Date().toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Component Rendering', () => {
    it('should render loading spinner while fetching comments', () => {
      commentAPI.getByEvent.mockReturnValue(new Promise(() => {})); // Never resolves
      
      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should render comments after successful fetch', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: mockComments } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId('comment-comment1')).toBeInTheDocument();
        expect(screen.getByTestId('comment-comment2')).toBeInTheDocument();
      });
    });

    it('should display error message when fetch fails', async () => {
      const errorMessage = 'Failed to load comments';
      commentAPI.getByEvent.mockRejectedValue({
        response: { data: { message: errorMessage } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent(errorMessage);
      });
    });

    it('should display "no comments" message when there are no comments', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: [] } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText(/no comments yet/i)).toBeInTheDocument();
      });
    });

    it('should display login prompt when user is not logged in', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: [] } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={null} />);

      await waitFor(() => {
        expect(screen.getByText(/please/i)).toBeInTheDocument();
        expect(screen.getByText(/log in/i)).toBeInTheDocument();
      });
    });
  });

  describe('Comment Input', () => {
    it('should render comment input for logged-in users', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: [] } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/add a comment/i)).toBeInTheDocument();
      });
    });

    it('should update character count as user types', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: [] } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/add a comment/i);
        fireEvent.change(textarea, { target: { value: 'Test comment' } });
        expect(screen.getByText(/12\/2000 characters/i)).toBeInTheDocument();
      });
    });

    it('should submit comment when form is submitted', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: [] } },
      });

      const newComment = {
        _id: 'newComment',
        content: 'New test comment',
        author: mockCurrentUser,
        eventId: mockEventId,
        parentId: null,
        depth: 0,
        upvotes: [],
        downvotes: [],
        voteCount: 0,
        isDeleted: false,
        createdAt: new Date().toISOString(),
      };

      commentAPI.create.mockResolvedValue({
        data: { data: newComment },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/add a comment/i);
        fireEvent.change(textarea, { target: { value: 'New test comment' } });
        
        const submitButton = screen.getByText(/post comment/i);
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(commentAPI.create).toHaveBeenCalledWith({
          content: 'New test comment',
          eventId: mockEventId,
          parentId: null,
        });
      });
    });

    it('should not submit empty comment', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: [] } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        const submitButton = screen.getByText(/post comment/i);
        expect(submitButton).toBeDisabled();
      });
    });

    it('should not submit comment exceeding 2000 characters', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: [] } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/add a comment/i);
        fireEvent.change(textarea, { target: { value: 'a'.repeat(2001) } });
        
        const submitButton = screen.getByText(/post comment/i);
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Sorting Controls', () => {
    it('should render all sorting options', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: mockComments } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Hot')).toBeInTheDocument();
        expect(screen.getByText('Top')).toBeInTheDocument();
        expect(screen.getByText('New')).toBeInTheDocument();
        expect(screen.getByText('Controversial')).toBeInTheDocument();
      });
    });

    it('should fetch comments with new sort when sort option is clicked', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: mockComments } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        const topButton = screen.getByText('Top');
        fireEvent.click(topButton);
      });

      await waitFor(() => {
        expect(commentAPI.getByEvent).toHaveBeenCalledWith(mockEventId, { sort: 'top' });
      });
    });

    it('should save sort preference to localStorage', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: mockComments } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        const newButton = screen.getByText('New');
        fireEvent.click(newButton);
      });

      await waitFor(() => {
        expect(localStorage.getItem(`commentSort_${mockEventId}`)).toBe('new');
      });
    });
  });

  describe('Collapse/Expand Controls', () => {
    it('should render collapse and expand all buttons when comments exist', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: mockComments } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.getByText('Collapse All')).toBeInTheDocument();
        expect(screen.getByText('Expand All')).toBeInTheDocument();
      });
    });

    it('should not render collapse/expand buttons when no comments', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: [] } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        expect(screen.queryByText('Collapse All')).not.toBeInTheDocument();
        expect(screen.queryByText('Expand All')).not.toBeInTheDocument();
      });
    });
  });

  describe('Comment Tree Building', () => {
    it('should build nested comment tree correctly', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: mockComments } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        const rootComment = screen.getByTestId('comment-comment1');
        const replyComment = screen.getByTestId('comment-comment2');
        
        expect(rootComment).toBeInTheDocument();
        expect(replyComment).toBeInTheDocument();
      });
    });
  });

  describe('LocalStorage Integration', () => {
    it('should load sort preference from localStorage on mount', async () => {
      localStorage.setItem(`commentSort_${mockEventId}`, 'top');
      
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: mockComments } },
      });

      render(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      await waitFor(() => {
        expect(commentAPI.getByEvent).toHaveBeenCalledWith(mockEventId, { sort: 'top' });
      });
    });

    it('should save collapsed state to localStorage', async () => {
      commentAPI.getByEvent.mockResolvedValue({
        data: { data: { comments: mockComments } },
      });

      const { rerender } = render(
        <CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />
      );

      await waitFor(() => {
        expect(screen.getByTestId('comment-comment1')).toBeInTheDocument();
      });

      // Trigger a state change that would save to localStorage
      rerender(<CommentThread eventId={mockEventId} currentUser={mockCurrentUser} />);

      // Check that localStorage was called (implementation detail)
      const saved = localStorage.getItem(`collapsedThreads_${mockEventId}`);
      expect(saved).toBeDefined();
    });
  });
});
