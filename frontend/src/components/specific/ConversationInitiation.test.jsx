import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import ConversationInitiation from './ConversationInitiation';
import { authAPI, messageAPI } from '../../services/api';

// Mock the API services
vi.mock('../../services/api', () => ({
  authAPI: {
    searchUsers: vi.fn(),
  },
  messageAPI: {
    createConversation: vi.fn(),
  },
}));

// Mock the AuthContext
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      _id: 'current-user-id',
      username: 'currentuser',
    },
  }),
}));

// Mock child components
vi.mock('../common/LoadingSpinner', () => ({
  default: ({ size }) => <div data-testid="loading-spinner" data-size={size}>Loading...</div>,
}));

vi.mock('../common/ErrorMessage', () => ({
  default: ({ message, onRetry }) => (
    <div data-testid="error-message">
      {message}
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

vi.mock('../common/ImageDisplay', () => ({
  default: ({ imageUrl, altText, size }) => (
    <div data-testid="image-display" data-url={imageUrl} data-alt={altText} data-size={size}>
      Image
    </div>
  ),
}));

// Mock useDebounce hook
vi.mock('../../hooks/useDebounce', () => ({
  useDebounce: (value) => value, // Return value immediately for testing
}));

describe('ConversationInitiation Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Requirement 3.1: Opens dialog on button click', () => {
    it('renders dialog when isOpen is true', () => {
      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.getByText('New Conversation')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search by username or name...')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(
        <ConversationInitiation
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      expect(screen.queryByText('New Conversation')).not.toBeInTheDocument();
    });
  });

  describe('Requirement 3.2: Displays search interface', () => {
    it('displays search input field', () => {
      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('displays search results label when searching', () => {
      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(screen.getByText('Search results')).toBeInTheDocument();
    });

    it('calls search API when user types', async () => {
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [
            { _id: 'user1', username: 'testuser1', firstName: 'Test', lastName: 'User1', avatarUrl: 'https://example.com/avatar1.jpg' },
          ],
        },
      });

      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(authAPI.searchUsers).toHaveBeenCalledWith('test');
      });
    });

    it('displays loading spinner during search', async () => {
      authAPI.searchUsers.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('displays "No users found" when search returns empty', async () => {
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [],
        },
      });

      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      await waitFor(() => {
        expect(screen.getByText('No users found')).toBeInTheDocument();
      });
    });

    it('displays search results when users are found', async () => {
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [
            { _id: 'user1', username: 'testuser1', firstName: 'Test', lastName: 'User1', avatarUrl: 'https://example.com/avatar1.jpg' },
            { _id: 'user2', username: 'testuser2', firstName: 'Test', lastName: 'User2', avatarUrl: 'https://example.com/avatar2.jpg' },
          ],
        },
      });

      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('testuser1')).toBeInTheDocument();
        expect(screen.getByText('testuser2')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 3.3: Adds users to selected list', () => {
    it('adds user to selected list when clicked', async () => {
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [
            { _id: 'user1', username: 'testuser1', firstName: 'Test', lastName: 'User1', avatarUrl: 'https://example.com/avatar1.jpg' },
          ],
        },
      });

      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('testuser1')).toBeInTheDocument();
      });

      // Click on the user to add them
      const userElement = screen.getByText('testuser1').closest('div[class*="cursor-pointer"]');
      fireEvent.click(userElement);

      // User should appear in selected participants
      await waitFor(() => {
        expect(screen.getByText('Selected participants (1)')).toBeInTheDocument();
      });
    });

    it('displays selected participants as chips', async () => {
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [
            { _id: 'user1', username: 'testuser1', firstName: 'Test', lastName: 'User1', avatarUrl: 'https://example.com/avatar1.jpg' },
          ],
        },
      });

      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('testuser1')).toBeInTheDocument();
      });

      const userElement = screen.getByText('testuser1').closest('div[class*="cursor-pointer"]');
      fireEvent.click(userElement);

      await waitFor(() => {
        const chips = screen.getAllByText('testuser1');
        expect(chips.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Requirement 3.4: Removes users from selected list', () => {
    it('removes user from selected list when X button clicked', async () => {
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [
            { _id: 'user1', username: 'testuser1', firstName: 'Test', lastName: 'User1', avatarUrl: 'https://example.com/avatar1.jpg' },
          ],
        },
      });

      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('testuser1')).toBeInTheDocument();
      });

      // Add user
      const userElement = screen.getByText('testuser1').closest('div[class*="cursor-pointer"]');
      fireEvent.click(userElement);

      await waitFor(() => {
        expect(screen.getByText('Selected participants (1)')).toBeInTheDocument();
      });

      // Remove user
      const removeButton = screen.getByLabelText('Remove testuser1');
      fireEvent.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText('Selected participants (1)')).not.toBeInTheDocument();
      });
    });
  });

  describe('Requirement 3.8: Disables submit when no participants', () => {
    it('disables submit button when no participants selected', () => {
      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const createButton = screen.getByText('Create');
      expect(createButton).toBeDisabled();
    });

    it('enables submit button when participants are selected', async () => {
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [
            { _id: 'user1', username: 'testuser1', firstName: 'Test', lastName: 'User1', avatarUrl: 'https://example.com/avatar1.jpg' },
          ],
        },
      });

      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('testuser1')).toBeInTheDocument();
      });

      const userElement = screen.getByText('testuser1').closest('div[class*="cursor-pointer"]');
      fireEvent.click(userElement);

      await waitFor(() => {
        const createButton = screen.getByText('Create');
        expect(createButton).not.toBeDisabled();
      });
    });
  });

  describe('Requirement 3.5: Handles successful creation', () => {
    it('calls createConversation API with participant IDs', async () => {
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [
            { _id: 'user1', username: 'testuser1', firstName: 'Test', lastName: 'User1', avatarUrl: 'https://example.com/avatar1.jpg' },
          ],
        },
      });

      messageAPI.createConversation.mockResolvedValue({
        data: {
          data: {
            _id: 'conv1',
            participants: ['current-user-id', 'user1'],
          },
        },
      });

      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('testuser1')).toBeInTheDocument();
      });

      const userElement = screen.getByText('testuser1').closest('div[class*="cursor-pointer"]');
      fireEvent.click(userElement);

      await waitFor(() => {
        const createButton = screen.getByText('Create');
        expect(createButton).not.toBeDisabled();
      });

      const createButton = screen.getByText('Create');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(messageAPI.createConversation).toHaveBeenCalledWith(['user1'], undefined);
      });
    });

    it('includes initial message when provided', async () => {
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [
            { _id: 'user1', username: 'testuser1', firstName: 'Test', lastName: 'User1', avatarUrl: 'https://example.com/avatar1.jpg' },
          ],
        },
      });

      messageAPI.createConversation.mockResolvedValue({
        data: {
          data: {
            _id: 'conv1',
            participants: ['current-user-id', 'user1'],
          },
        },
      });

      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('testuser1')).toBeInTheDocument();
      });

      const userElement = screen.getByText('testuser1').closest('div[class*="cursor-pointer"]');
      fireEvent.click(userElement);

      // Enter initial message
      const messageInput = screen.getByPlaceholderText('Type your first message...');
      fireEvent.change(messageInput, { target: { value: 'Hello!' } });

      await waitFor(() => {
        const createButton = screen.getByText('Create');
        expect(createButton).not.toBeDisabled();
      });

      const createButton = screen.getByText('Create');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(messageAPI.createConversation).toHaveBeenCalledWith(['user1'], 'Hello!');
      });
    });

    it('calls onSuccess callback with conversation data', async () => {
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [
            { _id: 'user1', username: 'testuser1', firstName: 'Test', lastName: 'User1', avatarUrl: 'https://example.com/avatar1.jpg' },
          ],
        },
      });

      const mockConversation = {
        _id: 'conv1',
        participants: ['current-user-id', 'user1'],
      };

      messageAPI.createConversation.mockResolvedValue({
        data: {
          data: mockConversation,
        },
      });

      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('testuser1')).toBeInTheDocument();
      });

      const userElement = screen.getByText('testuser1').closest('div[class*="cursor-pointer"]');
      fireEvent.click(userElement);

      const createButton = screen.getByText('Create');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(mockConversation);
      });
    });

    it('resets state after successful creation', async () => {
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [
            { _id: 'user1', username: 'testuser1', firstName: 'Test', lastName: 'User1', avatarUrl: 'https://example.com/avatar1.jpg' },
          ],
        },
      });

      messageAPI.createConversation.mockResolvedValue({
        data: {
          data: {
            _id: 'conv1',
            participants: ['current-user-id', 'user1'],
          },
        },
      });

      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('testuser1')).toBeInTheDocument();
      });

      const userElement = screen.getByText('testuser1').closest('div[class*="cursor-pointer"]');
      fireEvent.click(userElement);

      const messageInput = screen.getByPlaceholderText('Type your first message...');
      fireEvent.change(messageInput, { target: { value: 'Hello!' } });

      const createButton = screen.getByText('Create');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // State should be reset
      expect(searchInput.value).toBe('');
      expect(messageInput.value).toBe('');
    });
  });

  describe('Requirement 3.7: Handles failed creation', () => {
    it('displays error message on creation failure', async () => {
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [
            { _id: 'user1', username: 'testuser1', firstName: 'Test', lastName: 'User1', avatarUrl: 'https://example.com/avatar1.jpg' },
          ],
        },
      });

      messageAPI.createConversation.mockRejectedValue({
        response: {
          data: {
            message: 'Failed to create conversation',
          },
        },
      });

      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('testuser1')).toBeInTheDocument();
      });

      const userElement = screen.getByText('testuser1').closest('div[class*="cursor-pointer"]');
      fireEvent.click(userElement);

      const createButton = screen.getByText('Create');
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Failed to create conversation')).toBeInTheDocument();
      });
    });
  });

  describe('Dialog close behavior', () => {
    it('calls onClose when close button clicked', () => {
      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const closeButton = screen.getByLabelText('Close dialog');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when cancel button clicked', () => {
      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('resets state when dialog closes', async () => {
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [
            { _id: 'user1', username: 'testuser1', firstName: 'Test', lastName: 'User1', avatarUrl: 'https://example.com/avatar1.jpg' },
          ],
        },
      });

      render(
        <ConversationInitiation
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      await waitFor(() => {
        expect(screen.getByText('testuser1')).toBeInTheDocument();
      });

      const closeButton = screen.getByLabelText('Close dialog');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
