import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import * as AuthContext from '../context/AuthContext';
import { adminAPI } from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  adminAPI: {
    getPendingClubs: vi.fn(),
    approveClub: vi.fn(),
    rejectClub: vi.fn(),
  },
}));

// Mock AuthContext
const mockAuthContext = {
  user: {
    _id: 'admin123',
    username: 'Admin User',
    email: 'admin@test.com',
    isSuperAdmin: true,
  },
  isAuthenticated: true,
  loading: false,
};

const mockNonAdminContext = {
  user: {
    _id: 'user123',
    username: 'Regular User',
    email: 'user@test.com',
    isSuperAdmin: false,
  },
  isAuthenticated: true,
  loading: false,
};

vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }) => children,
}));

const mockPendingClubs = [
  {
    _id: 'club1',
    name: 'Chess Club',
    description: 'A club for chess enthusiasts',
    category: 'Sports',
    logoUrl: 'https://example.com/logo1.jpg',
    owner: {
      _id: 'owner1',
      username: 'john_doe',
      email: 'john@test.com',
    },
    status: 'pending',
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    _id: 'club2',
    name: 'Drama Society',
    description: 'Theater and performing arts',
    category: 'Arts',
    logoUrl: null,
    owner: {
      _id: 'owner2',
      username: 'jane_smith',
      email: 'jane@test.com',
    },
    status: 'pending',
    createdAt: '2024-01-16T12:00:00Z',
  },
];

const renderWithProviders = (component, authContext = mockAuthContext) => {
  AuthContext.useAuth.mockReturnValue(authContext);

  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Access Control', () => {
    it('should deny access to non-admin users', () => {
      renderWithProviders(<AdminDashboard />, mockNonAdminContext);

      expect(screen.getByText('Access Denied')).toBeInTheDocument();
      expect(screen.getByText('You do not have permission to access the admin dashboard.')).toBeInTheDocument();
    });

    it('should allow access to super admin users', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: [],
            total: 0,
            totalPages: 1,
            summary: { pending: 0, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Dashboard Summary', () => {
    it('should display summary statistics', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 5, approved: 10, rejected: 2 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Pending Clubs')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('Approved Clubs')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('Rejected Clubs')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });
  });

  describe('Pending Clubs Table', () => {
    it('should display pending clubs in a table', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 2, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chess Club')).toBeInTheDocument();
        expect(screen.getByText('Drama Society')).toBeInTheDocument();
        expect(screen.getByText('john_doe')).toBeInTheDocument();
        expect(screen.getByText('jane_smith')).toBeInTheDocument();
      });
    });

    it('should display empty state when no pending clubs', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: [],
            total: 0,
            totalPages: 1,
            summary: { pending: 0, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No pending clubs')).toBeInTheDocument();
        expect(screen.getByText('All clubs have been reviewed!')).toBeInTheDocument();
      });
    });

    it('should display loading spinner while fetching', () => {
      adminAPI.getPendingClubs.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<AdminDashboard />);

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      // Check for loading spinner by looking for the spinner div
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should display error message on fetch failure', async () => {
      adminAPI.getPendingClubs.mockRejectedValue({
        userMessage: 'Failed to fetch pending clubs',
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch pending clubs')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter clubs by search query', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: [mockPendingClubs[0]],
            total: 1,
            totalPages: 1,
            summary: { pending: 1, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search clubs by name or owner...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search clubs by name or owner...');
      fireEvent.change(searchInput, { target: { value: 'Chess' } });

      await waitFor(() => {
        expect(adminAPI.getPendingClubs).toHaveBeenCalledWith(
          expect.objectContaining({ search: 'Chess' })
        );
      });
    });

    it('should reset to page 1 when searching', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 2, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search clubs by name or owner...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search clubs by name or owner...');
      fireEvent.change(searchInput, { target: { value: 'Drama' } });

      await waitFor(() => {
        expect(adminAPI.getPendingClubs).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1, search: 'Drama' })
        );
      });
    });
  });

  describe('Pagination Controls', () => {
    it('should display pagination information', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 25,
            totalPages: 3,
            summary: { pending: 25, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Showing 1 to 10 of 25 clubs')).toBeInTheDocument();
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      });
    });

    it('should navigate to next page', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 25,
            totalPages: 3,
            summary: { pending: 25, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });

      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(adminAPI.getPendingClubs).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });
    });

    it('should navigate to previous page', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 25,
            totalPages: 3,
            summary: { pending: 25, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });

      // Go to page 2 first
      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });

      // Then go back to page 1
      const previousButton = screen.getByText('Previous');
      fireEvent.click(previousButton);

      await waitFor(() => {
        expect(adminAPI.getPendingClubs).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1 })
        );
      });
    });

    it('should disable previous button on first page', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 25,
            totalPages: 3,
            summary: { pending: 25, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        const previousButton = screen.getByText('Previous');
        expect(previousButton).toBeDisabled();
      });
    });

    it('should disable next button on last page', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 2, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        const nextButton = screen.getByText('Next');
        expect(nextButton).toBeDisabled();
      });
    });
  });

  describe('Approve Club Action', () => {
    it('should approve a club successfully', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 2, approved: 0, rejected: 0 },
          },
        },
      });

      adminAPI.approveClub.mockResolvedValue({
        data: { success: true, message: 'Club approved successfully' },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chess Club')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByTitle('Approve');
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(adminAPI.approveClub).toHaveBeenCalledWith('club1');
        expect(screen.getByText('Club approved successfully')).toBeInTheDocument();
      });
    });

    it('should display error on approve failure', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 2, approved: 0, rejected: 0 },
          },
        },
      });

      adminAPI.approveClub.mockRejectedValue({
        userMessage: 'Failed to approve club',
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chess Club')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByTitle('Approve');
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Failed to approve club')).toBeInTheDocument();
      });
    });
  });

  describe('Reject Club Action', () => {
    it('should open reject modal when reject button clicked', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 2, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chess Club')).toBeInTheDocument();
      });

      const rejectButtons = screen.getAllByTitle('Reject');
      fireEvent.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Reject Club' })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter rejection reason...')).toBeInTheDocument();
      });
    });

    it('should reject club with reason', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 2, approved: 0, rejected: 0 },
          },
        },
      });

      adminAPI.rejectClub.mockResolvedValue({
        data: { success: true, message: 'Club rejected successfully' },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chess Club')).toBeInTheDocument();
      });

      const rejectButtons = screen.getAllByTitle('Reject');
      fireEvent.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Enter rejection reason...')).toBeInTheDocument();
      });

      const reasonInput = screen.getByPlaceholderText('Enter rejection reason...');
      fireEvent.change(reasonInput, { target: { value: 'Incomplete information' } });

      const confirmButton = screen.getByRole('button', { name: 'Reject Club' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(adminAPI.rejectClub).toHaveBeenCalledWith('club1', {
          reason: 'Incomplete information',
        });
        expect(screen.getByText('Club rejected successfully')).toBeInTheDocument();
      });
    });

    it('should not allow rejection without reason', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 2, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chess Club')).toBeInTheDocument();
      });

      const rejectButtons = screen.getAllByTitle('Reject');
      fireEvent.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Reject Club' })).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: 'Reject Club' });
      
      // Button should be disabled when there's no reason
      expect(confirmButton).toBeDisabled();
      expect(adminAPI.rejectClub).not.toHaveBeenCalled();
    });

    it('should close modal on cancel', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 2, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chess Club')).toBeInTheDocument();
      });

      const rejectButtons = screen.getAllByTitle('Reject');
      fireEvent.click(rejectButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Reject Club' })).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Reject Club' })).not.toBeInTheDocument();
      });
    });
  });

  describe('View Club Details Modal', () => {
    it('should open details modal when view button clicked', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 2, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chess Club')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByTitle('View Details');
      fireEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Club Details')).toBeInTheDocument();
        expect(screen.getByText('A club for chess enthusiasts')).toBeInTheDocument();
      });
    });

    it('should display all club information in modal', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 2, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chess Club')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByTitle('View Details');
      fireEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Club Details' })).toBeInTheDocument();
        expect(screen.getAllByText('Chess Club').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Sports').length).toBeGreaterThan(0);
        expect(screen.getByText('A club for chess enthusiasts')).toBeInTheDocument();
        expect(screen.getAllByText('john_doe').length).toBeGreaterThan(0);
        expect(screen.getAllByText('john@test.com').length).toBeGreaterThan(0);
      });
    });

    it('should close modal when close button clicked', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 2, approved: 0, rejected: 0 },
          },
        },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chess Club')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByTitle('View Details');
      fireEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Club Details' })).toBeInTheDocument();
      });

      // Click the X button to close modal
      const closeButton = screen.getByLabelText('Close modal');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('heading', { name: 'Club Details' })).not.toBeInTheDocument();
      });
    });

    it('should allow approve from details modal', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 2, approved: 0, rejected: 0 },
          },
        },
      });

      adminAPI.approveClub.mockResolvedValue({
        data: { success: true, message: 'Club approved successfully' },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chess Club')).toBeInTheDocument();
      });

      const viewButtons = screen.getAllByTitle('View Details');
      fireEvent.click(viewButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Club Details')).toBeInTheDocument();
      });

      const approveButton = screen.getAllByText('Approve')[0];
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(adminAPI.approveClub).toHaveBeenCalledWith('club1');
      });
    });
  });

  describe('Notifications', () => {
    it('should display success notification', async () => {
      adminAPI.getPendingClubs.mockResolvedValue({
        data: {
          data: {
            clubs: mockPendingClubs,
            total: 2,
            totalPages: 1,
            summary: { pending: 2, approved: 0, rejected: 0 },
          },
        },
      });

      adminAPI.approveClub.mockResolvedValue({
        data: { success: true, message: 'Club approved successfully' },
      });

      renderWithProviders(<AdminDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Chess Club')).toBeInTheDocument();
      });

      const approveButtons = screen.getAllByTitle('Approve');
      fireEvent.click(approveButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Club approved successfully')).toBeInTheDocument();
      });
    });
  });
});
