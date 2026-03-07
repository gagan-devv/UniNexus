import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import MemberManagement from './MemberManagement';
import { authAPI } from '../../services/api';
import api from '../../services/api';

// Mock the API services
vi.mock('../../services/api', () => {
  const mockApi = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  return {
    default: mockApi,
    authAPI: {
      searchUsers: vi.fn(),
    },
  };
});

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

vi.mock('../common/ConfirmDialog', () => ({
  default: ({ isOpen, title, message, onConfirm, onCancel, confirmText }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="confirm-dialog">
        <h3>{title}</h3>
        <p>{message}</p>
        <button onClick={onConfirm}>{confirmText}</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    );
  },
}));

vi.mock('../common/ImageDisplay', () => ({
  default: ({ imageUrl, altText, size }) => (
    <div data-testid="image-display" data-url={imageUrl} data-alt={altText} data-size={size}>
      Image
    </div>
  ),
}));

// Mock useDebounce hook - return value immediately for testing
vi.mock('../../hooks/useDebounce', () => ({
  useDebounce: (value) => value,
}));

describe('MemberManagement - Unit Tests', () => {
  const mockClubId = 'club-123';
  const mockMembers = [
    {
      _id: 'member-1',
      userId: {
        _id: 'user-1',
        username: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar1.jpg',
      },
      role: 'admin',
    },
    {
      _id: 'member-2',
      userId: {
        _id: 'user-2',
        username: 'janedoe',
        firstName: 'Jane',
        lastName: 'Doe',
        avatarUrl: 'https://example.com/avatar2.jpg',
      },
      role: 'member',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Requirement 5.1, 5.2: Display member list', () => {
    it('should display member list with names and roles', async () => {
      // Mock API response
      api.get.mockResolvedValue({
        data: {
          data: {
            members: mockMembers,
          },
        },
      });

      render(<MemberManagement clubId={mockClubId} isAdmin={true} />);

      // Wait for members to load
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith(`/clubs/${mockClubId}/members`);
      });

      // Check if members are displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('@johndoe')).toBeInTheDocument();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('@janedoe')).toBeInTheDocument();

      // Check if roles are displayed
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('member')).toBeInTheDocument();
    });
  });

  describe('Requirement 5.12: Show only to club admins', () => {
    it('should not render component if user is not admin', () => {
      const { container } = render(<MemberManagement clubId={mockClubId} isAdmin={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render component if user is admin', async () => {
      api.get.mockResolvedValue({
        data: {
          data: {
            members: mockMembers,
          },
        },
      });

      render(<MemberManagement clubId={mockClubId} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByText('Club Members (2)')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 5.3: Open add member dialog', () => {
    it('should open add member dialog when Add Member button is clicked', async () => {
      api.get.mockResolvedValue({
        data: {
          data: {
            members: mockMembers,
          },
        },
      });

      render(<MemberManagement clubId={mockClubId} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByText('Add Member')).toBeInTheDocument();
      });

      const addButton = screen.getByText('Add Member');
      fireEvent.click(addButton);

      // Check if dialog is opened
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by username or name...')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 5.6: Open remove confirmation dialog', () => {
    it('should open remove confirmation dialog when Remove Member button is clicked', async () => {
      api.get.mockResolvedValue({
        data: {
          data: {
            members: mockMembers,
          },
        },
      });

      render(<MemberManagement clubId={mockClubId} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getAllByTitle('Remove Member').length).toBeGreaterThan(0);
      });

      const removeButtons = screen.getAllByTitle('Remove Member');
      fireEvent.click(removeButtons[0]);

      // Check if confirmation dialog is opened
      await waitFor(() => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
        expect(screen.getByText('Remove Member')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 5.9: Open role change dialog', () => {
    it('should open role change dialog when Change Role button is clicked', async () => {
      api.get.mockResolvedValue({
        data: {
          data: {
            members: mockMembers,
          },
        },
      });

      render(<MemberManagement clubId={mockClubId} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getAllByTitle('Change Role').length).toBeGreaterThan(0);
      });

      const roleButtons = screen.getAllByTitle('Change Role');
      fireEvent.click(roleButtons[0]);

      // Check if role dialog is opened
      await waitFor(() => {
        expect(screen.getByText('Change Member Role')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 5.4, 5.5: Update list after add operation', () => {
    it('should update member list after successfully adding a member', async () => {
      const newUser = {
        _id: 'user-3',
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        avatarUrl: 'https://example.com/avatar3.jpg',
      };

      const newMember = {
        _id: 'member-3',
        userId: newUser,
        role: 'member',
      };

      // Mock initial members fetch
      api.get.mockResolvedValueOnce({
        data: {
          data: {
            members: mockMembers,
          },
        },
      });

      // Mock user search
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [newUser],
        },
      });

      // Mock add member
      api.post.mockResolvedValue({
        data: {
          data: {
            members: [...mockMembers, newMember],
          },
        },
      });

      render(<MemberManagement clubId={mockClubId} isAdmin={true} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Club Members (2)')).toBeInTheDocument();
      });

      // Click Add Member button
      const addButton = screen.getByText('Add Member');
      fireEvent.click(addButton);

      // Search for user
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by username or name...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'newuser' } });

      // Wait for search results
      await waitFor(() => {
        expect(authAPI.searchUsers).toHaveBeenCalled();
      });

      // Click on user to add
      await waitFor(() => {
        expect(screen.getByText('newuser')).toBeInTheDocument();
      });

      const userElement = screen.getByText('newuser').closest('div[class*="cursor-pointer"]');
      if (userElement) {
        fireEvent.click(userElement);
      }

      // Wait for API call
      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(`/clubs/${mockClubId}/members`, { userId: newUser._id });
      });

      // Verify member list updated
      await waitFor(() => {
        expect(screen.getByText('Club Members (3)')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 5.7, 5.8: Update list after remove operation', () => {
    it('should update member list after successfully removing a member', async () => {
      const remainingMembers = [mockMembers[1]];

      // Mock initial members fetch
      api.get.mockResolvedValueOnce({
        data: {
          data: {
            members: mockMembers,
          },
        },
      });

      // Mock remove member
      api.delete.mockResolvedValue({
        data: {
          data: {
            members: remainingMembers,
          },
        },
      });

      render(<MemberManagement clubId={mockClubId} isAdmin={true} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Club Members (2)')).toBeInTheDocument();
      });

      // Click Remove Member button
      const removeButtons = screen.getAllByTitle('Remove Member');
      fireEvent.click(removeButtons[0]);

      // Confirm removal
      await waitFor(() => {
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Remove');
      fireEvent.click(confirmButton);

      // Wait for API call
      await waitFor(() => {
        expect(api.delete).toHaveBeenCalledWith(`/clubs/${mockClubId}/members/${mockMembers[0].userId._id}`);
      });

      // Verify member list updated
      await waitFor(() => {
        expect(screen.getByText('Club Members (1)')).toBeInTheDocument();
      });
    });
  });

  describe('Requirement 5.10, 5.11: Update list after role change operation', () => {
    it('should update member list after successfully changing a role', async () => {
      const updatedMembers = [
        { ...mockMembers[0], role: 'member' },
        mockMembers[1],
      ];

      // Mock initial members fetch
      api.get.mockResolvedValueOnce({
        data: {
          data: {
            members: mockMembers,
          },
        },
      });

      // Mock role change
      api.put.mockResolvedValue({
        data: {
          data: {
            ...mockMembers[0],
            role: 'member',
          },
        },
      });

      // Mock refetch after role change
      api.get.mockResolvedValueOnce({
        data: {
          data: {
            members: updatedMembers,
          },
        },
      });

      render(<MemberManagement clubId={mockClubId} isAdmin={true} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Club Members (2)')).toBeInTheDocument();
      });

      // Click Change Role button
      const roleButtons = screen.getAllByTitle('Change Role');
      fireEvent.click(roleButtons[0]);

      // Wait for role dialog
      await waitFor(() => {
        expect(screen.getByText('Change Member Role')).toBeInTheDocument();
      });

      // Click on Member role button
      const memberRoleButtons = screen.getAllByText('Member');
      const roleButton = memberRoleButtons.find(el => el.closest('button'));
      if (roleButton) {
        fireEvent.click(roleButton.closest('button'));
      }

      // Wait for API call
      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          `/clubs/${mockClubId}/members/${mockMembers[0].userId._id}/role`,
          { role: 'member' }
        );
      });

      // Verify member list was refetched
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Requirement 5.13: Display errors appropriately', () => {
    it('should display error message when fetching members fails', async () => {
      api.get.mockRejectedValue({
        response: {
          data: {
            message: 'Failed to fetch members',
          },
        },
      });

      render(<MemberManagement clubId={mockClubId} isAdmin={true} />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch members')).toBeInTheDocument();
      });
    });

    it('should display error message when adding member fails', async () => {
      const newUser = {
        _id: 'user-3',
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        avatarUrl: 'https://example.com/avatar3.jpg',
      };

      // Mock initial members fetch
      api.get.mockResolvedValueOnce({
        data: {
          data: {
            members: mockMembers,
          },
        },
      });

      // Mock user search
      authAPI.searchUsers.mockResolvedValue({
        data: {
          data: [newUser],
        },
      });

      // Mock add member failure
      api.post.mockRejectedValue({
        response: {
          data: {
            message: 'User is already a member',
          },
        },
      });

      render(<MemberManagement clubId={mockClubId} isAdmin={true} />);

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Add Member')).toBeInTheDocument();
      });

      // Click Add Member button
      const addButton = screen.getByText('Add Member');
      fireEvent.click(addButton);

      // Search for user
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by username or name...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search by username or name...');
      fireEvent.change(searchInput, { target: { value: 'newuser' } });

      // Wait for search results
      await waitFor(() => {
        expect(screen.getByText('newuser')).toBeInTheDocument();
      });

      // Click on user to add
      const userElement = screen.getByText('newuser').closest('div[class*="cursor-pointer"]');
      if (userElement) {
        fireEvent.click(userElement);
      }

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('User is already a member')).toBeInTheDocument();
      });
    });
  });
});
