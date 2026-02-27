import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MyClub from './MyClub';
import { AuthProvider } from '../context/AuthContext';
import { clubAPI } from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  clubAPI: {
    getById: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock the ImageUpload component
vi.mock('../components/common/ImageUpload', () => ({
  default: ({ onUploadSuccess, uploadEndpoint }) => (
    <div data-testid="image-upload">
      <button
        onClick={() => onUploadSuccess('https://example.com/new-logo.jpg')}
        data-testid="mock-upload-button"
      >
        Mock Upload
      </button>
      <span data-testid="upload-endpoint">{uploadEndpoint}</span>
    </div>
  ),
}));

// Mock the ImageDisplay component
vi.mock('../components/common/ImageDisplay', () => ({
  default: ({ imageUrl, altText }) => (
    <img src={imageUrl} alt={altText} data-testid="image-display" />
  ),
}));

// Mock the LoadingSpinner component
vi.mock('../components/common/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner">Loading...</div>,
}));

// Mock the ErrorMessage component
vi.mock('../components/common/ErrorMessage', () => ({
  default: ({ message, onRetry }) => (
    <div data-testid="error-message">
      <span>{message}</span>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
}));

const mockClubData = {
  _id: 'club123',
  name: 'Tech Club',
  description: 'A club for tech enthusiasts',
  category: 'Technology',
  foundedYear: 2020,
  logoUrl: 'https://example.com/logo.jpg',
  socialLinks: {
    instagram: 'https://instagram.com/techclub',
    linkedin: 'https://linkedin.com/company/techclub',
    twitter: 'https://twitter.com/techclub',
    facebook: 'https://facebook.com/techclub',
    website: 'https://techclub.com',
  },
  stats: {
    memberCount: 150,
    eventCount: 25,
    engagementScore: 87.5,
  },
  members: [
    {
      _id: 'user1',
      username: 'john_doe',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'https://example.com/avatar1.jpg',
    },
    {
      _id: 'user2',
      username: 'jane_smith',
      firstName: 'Jane',
      lastName: 'Smith',
      avatarUrl: 'https://example.com/avatar2.jpg',
    },
  ],
};

const mockUser = {
  _id: 'user123',
  username: 'testuser',
  clubId: 'club123',
};

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

// Mock useAuth hook
vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: () => ({
      user: mockUser,
      isAuthenticated: true,
    }),
  };
});

describe('MyClub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Club data display', () => {
    it('should display loading spinner while fetching data', () => {
      clubAPI.getById.mockImplementation(() => new Promise(() => {}));
      
      renderWithProviders(<MyClub />);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should display club profile information', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      expect(screen.getByText('A club for tech enthusiasts')).toBeInTheDocument();
      expect(screen.getByText(/Technology/)).toBeInTheDocument();
      expect(screen.getByText(/Founded 2020/)).toBeInTheDocument();
    });

    it('should display club statistics', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument();
      });

      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('87.5')).toBeInTheDocument();
    });

    it('should display social media links', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        const instagramLink = screen.getByRole('link', { name: 'Instagram' });
        expect(instagramLink).toHaveAttribute('href', 'https://instagram.com/techclub');
      });
    });

    it('should display member list', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('@john_doe')).toBeInTheDocument();
      expect(screen.getByText('@jane_smith')).toBeInTheDocument();
    });

    it('should display "No members yet" when members array is empty', async () => {
      const clubDataWithoutMembers = { ...mockClubData, members: [] };
      clubAPI.getById.mockResolvedValue({
        data: { data: clubDataWithoutMembers },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('No members yet')).toBeInTheDocument();
      });
    });
  });

  describe('Logo upload', () => {
    it('should open upload modal when "Upload Logo" button is clicked', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /Upload Logo/i });
      fireEvent.click(uploadButton);

      expect(screen.getByText('Upload Club Logo')).toBeInTheDocument();
      expect(screen.getByTestId('image-upload')).toBeInTheDocument();
    });

    it('should use correct upload endpoint', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /Upload Logo/i });
      fireEvent.click(uploadButton);

      const endpoint = screen.getByTestId('upload-endpoint');
      expect(endpoint).toHaveTextContent('/media/clubs/club123/logo');
    });

    it('should update logo URL on successful upload', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /Upload Logo/i });
      fireEvent.click(uploadButton);

      const mockUploadButton = screen.getByTestId('mock-upload-button');
      fireEvent.click(mockUploadButton);

      await waitFor(() => {
        expect(screen.getByText('Logo uploaded successfully!')).toBeInTheDocument();
      });
    });

    it('should close modal after successful upload', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      const uploadButton = screen.getByRole('button', { name: /Upload Logo/i });
      fireEvent.click(uploadButton);

      const mockUploadButton = screen.getByTestId('mock-upload-button');
      fireEvent.click(mockUploadButton);

      await waitFor(() => {
        expect(screen.queryByText('Upload Club Logo')).not.toBeInTheDocument();
      });
    });
  });

  describe('Profile edit', () => {
    it('should show edit form when "Edit Profile" button is clicked', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /Edit Profile/i });
      fireEvent.click(editButton);

      expect(screen.getByLabelText('Club Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
      expect(screen.getByLabelText('Founded Year')).toBeInTheDocument();
    });

    it('should populate form with current club data', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /Edit Profile/i });
      fireEvent.click(editButton);

      const nameInput = screen.getByLabelText('Club Name');
      expect(nameInput).toHaveValue('Tech Club');

      const descriptionInput = screen.getByLabelText('Description');
      expect(descriptionInput).toHaveValue('A club for tech enthusiasts');

      const categoryInput = screen.getByLabelText('Category');
      expect(categoryInput).toHaveValue('Technology');

      const yearInput = screen.getByLabelText('Founded Year');
      expect(yearInput).toHaveValue(2020);
    });

    it('should update form values when inputs change', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /Edit Profile/i });
      fireEvent.click(editButton);

      const nameInput = screen.getByLabelText('Club Name');
      fireEvent.change(nameInput, { target: { value: 'Updated Tech Club' } });

      expect(nameInput).toHaveValue('Updated Tech Club');
    });

    it('should save profile changes when "Save Changes" button is clicked', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });
      clubAPI.update.mockResolvedValue({
        data: { success: true },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /Edit Profile/i });
      fireEvent.click(editButton);

      const nameInput = screen.getByLabelText('Club Name');
      fireEvent.change(nameInput, { target: { value: 'Updated Tech Club' } });

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(clubAPI.update).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Updated Tech Club',
          })
        );
      });
    });

    it('should display success message after saving', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });
      clubAPI.update.mockResolvedValue({
        data: { success: true },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /Edit Profile/i });
      fireEvent.click(editButton);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
      });
    });

    it('should exit edit mode after saving', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });
      clubAPI.update.mockResolvedValue({
        data: { success: true },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /Edit Profile/i });
      fireEvent.click(editButton);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByLabelText('Club Name')).not.toBeInTheDocument();
      });
    });

    it('should cancel edit mode when "Cancel" button is clicked', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /Edit Profile/i });
      fireEvent.click(editButton);

      const nameInput = screen.getByLabelText('Club Name');
      fireEvent.change(nameInput, { target: { value: 'Updated Tech Club' } });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(screen.queryByLabelText('Club Name')).not.toBeInTheDocument();
    });

    it('should reset form values when canceling', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /Edit Profile/i });
      fireEvent.click(editButton);

      const nameInput = screen.getByLabelText('Club Name');
      fireEvent.change(nameInput, { target: { value: 'Updated Tech Club' } });

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      // Re-enter edit mode
      fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));

      const resetNameInput = screen.getByLabelText('Club Name');
      expect(resetNameInput).toHaveValue('Tech Club');
    });
  });

  describe('Loading state display', () => {
    it('should show loading spinner during initial data fetch', () => {
      clubAPI.getById.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<MyClub />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should hide loading spinner after data is loaded', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });
    });

    it('should show saving state when saving profile', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });
      clubAPI.update.mockImplementation(() => new Promise(() => {}));

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /Edit Profile/i });
      fireEvent.click(editButton);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });
  });

  describe('Error state display', () => {
    it('should display error message when API call fails', async () => {
      clubAPI.getById.mockRejectedValue({
        response: {
          data: {
            message: 'Failed to fetch club data',
          },
        },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      expect(screen.getByText('Failed to fetch club data')).toBeInTheDocument();
    });

    it('should display generic error message when no specific message is provided', async () => {
      clubAPI.getById.mockRejectedValue(new Error('Network error'));

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch club data. Please try again.')).toBeInTheDocument();
      });
    });

    it('should retry fetching data when retry button is clicked', async () => {
      clubAPI.getById.mockRejectedValueOnce({
        response: {
          data: {
            message: 'Failed to fetch club data',
          },
        },
      }).mockResolvedValueOnce({
        data: { data: mockClubData },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /Retry/i });
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });
    });

    it('should display error message when profile save fails', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: mockClubData },
      });
      clubAPI.update.mockRejectedValue({
        response: {
          data: {
            message: 'Failed to update profile',
          },
        },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('Tech Club')).toBeInTheDocument();
      });

      const editButton = screen.getByRole('button', { name: /Edit Profile/i });
      fireEvent.click(editButton);

      const saveButton = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update profile')).toBeInTheDocument();
      });
    });

    it('should display "No Club Profile Found" when club data is null', async () => {
      clubAPI.getById.mockResolvedValue({
        data: { data: null },
      });

      renderWithProviders(<MyClub />);

      await waitFor(() => {
        expect(screen.getByText('No Club Profile Found')).toBeInTheDocument();
      });

      expect(screen.getByText("You don't have a club profile yet. Please create one to access this page.")).toBeInTheDocument();
    });
  });
});
