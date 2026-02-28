import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ClubDetails from './ClubDetails';
import { clubAPI } from '../services/api';

// Mock the API modules
vi.mock('../services/api', () => ({
  clubAPI: {
    getById: vi.fn(),
    getEvents: vi.fn(),
    getMembers: vi.fn(),
    join: vi.fn(),
    leave: vi.fn()
  }
}));

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-club-id' }),
    useNavigate: () => vi.fn()
  };
});

// Mock AuthContext
vi.mock('../context/AuthContext', async () => {
  const actual = await vi.importActual('../context/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      isAuthenticated: false,
      user: null
    }))
  };
});

const mockClub = {
  _id: 'test-club-id',
  name: 'Test Club',
  description: 'Test club description',
  logoUrl: 'https://example.com/logo.jpg',
  category: 'Technology',
  foundedYear: 2020,
  email: 'club@test.com',
  isVerified: true,
  memberCount: 50,
  stats: {
    memberCount: 50,
    eventCount: 10,
    engagementScore: 150
  },
  socialLinks: {
    instagram: 'https://instagram.com/testclub',
    linkedin: 'https://linkedin.com/company/testclub',
    twitter: 'https://twitter.com/testclub',
    facebook: 'https://facebook.com/testclub',
    medium: 'https://medium.com/@testclub',
    reddit: 'https://reddit.com/r/testclub',
    website: 'https://testclub.com'
  }
};

const mockEvents = [
  {
    _id: 'event-1',
    title: 'Test Event 1',
    startTime: '2024-12-25T10:00:00Z',
    location: 'Test Location 1',
    posterUrl: 'https://example.com/poster1.jpg'
  },
  {
    _id: 'event-2',
    title: 'Test Event 2',
    startTime: '2024-12-26T14:00:00Z',
    location: 'Test Location 2',
    posterUrl: 'https://example.com/poster2.jpg'
  }
];

const mockMembers = [
  {
    userId: {
      _id: 'user-1',
      username: 'user1',
      firstName: 'User',
      lastName: 'One',
      avatarUrl: 'https://example.com/avatar1.jpg'
    }
  },
  {
    userId: {
      _id: 'user-2',
      username: 'user2',
      firstName: 'User',
      lastName: 'Two',
      avatarUrl: 'https://example.com/avatar2.jpg'
    }
  }
];

const renderWithProviders = (component) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('ClubDetails Component - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 13.1**
   * Test club API call on mount
   */
  it('should fetch club details on mount', async () => {
    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: [] } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: [] } }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(clubAPI.getById).toHaveBeenCalledWith('test-club-id');
    });
  });

  /**
   * **Validates: Requirements 13.6**
   * Test join button display based on auth state - not authenticated
   */
  it('should display "Login to Join" button when not authenticated', async () => {
    const { useAuth } = await import('../context/AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: false,
      user: null
    });

    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: [] } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: [] } }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(screen.getByText('Login to Join')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.7**
   * Test join button display when authenticated and not a member
   */
  it('should display "Join Club" button when authenticated and not a member', async () => {
    const { useAuth } = await import('../context/AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { _id: 'user-3', firstName: 'Test', lastName: 'User' }
    });

    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: [] } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: mockMembers } }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(screen.getByText('Join Club')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.8**
   * Test leave button display when authenticated and is a member
   */
  it('should display "Leave Club" button when authenticated and is a member', async () => {
    const { useAuth } = await import('../context/AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { _id: 'user-1', firstName: 'User', lastName: 'One' }
    });

    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: [] } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: mockMembers } }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(screen.getByText('Leave Club')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.9, 13.10**
   * Test join club handler
   */
  it('should handle join club action correctly', async () => {
    const { useAuth } = await import('../context/AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { _id: 'user-3', firstName: 'Test', lastName: 'User', avatarUrl: null }
    });

    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: [] } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: mockMembers } }
    });
    clubAPI.join.mockResolvedValue({
      data: { success: true }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(screen.getByText('Join Club')).toBeInTheDocument();
    });

    const joinButton = screen.getByText('Join Club');
    fireEvent.click(joinButton);

    await waitFor(() => {
      expect(clubAPI.join).toHaveBeenCalledWith('test-club-id');
      expect(screen.getByText('Leave Club')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.11, 13.12**
   * Test leave club handler
   */
  it('should handle leave club action correctly', async () => {
    const { useAuth } = await import('../context/AuthContext');
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { _id: 'user-1', firstName: 'User', lastName: 'One' }
    });

    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: [] } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: mockMembers } }
    });
    clubAPI.leave.mockResolvedValue({
      data: { success: true }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(screen.getByText('Leave Club')).toBeInTheDocument();
    });

    const leaveButton = screen.getByText('Leave Club');
    fireEvent.click(leaveButton);

    await waitFor(() => {
      expect(clubAPI.leave).toHaveBeenCalledWith('test-club-id');
      expect(screen.getByText('Join Club')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.13, 13.14, 13.15**
   * Test event list display and navigation
   */
  it('should display upcoming events list', async () => {
    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: mockEvents } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: [] } }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(screen.getByText(`Upcoming Events (${mockEvents.length})`)).toBeInTheDocument();
      expect(screen.getByText(mockEvents[0].title)).toBeInTheDocument();
      expect(screen.getByText(mockEvents[1].title)).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.15**
   * Test event navigation
   */
  it('should have links to event details pages', async () => {
    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: mockEvents } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: [] } }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      const eventLinks = screen.getAllByRole('link');
      const eventLink = eventLinks.find(link => link.getAttribute('href') === `/events/${mockEvents[0]._id}`);
      expect(eventLink).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.17**
   * Test loading state display
   */
  it('should display loading spinner during API request', () => {
    clubAPI.getById.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<ClubDetails />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  /**
   * **Validates: Requirements 13.18**
   * Test 404 state display
   */
  it('should display "Club not found" message on 404', async () => {
    clubAPI.getById.mockRejectedValue({
      response: { status: 404 }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(screen.getByText('Club not found')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.19**
   * Test error state display
   */
  it('should display error message on API failure', async () => {
    const errorMessage = 'Failed to load club';
    clubAPI.getById.mockRejectedValue({
      response: {
        status: 500,
        data: { message: errorMessage }
      }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.2, 13.3**
   * Test club details display
   */
  it('should display club details correctly', async () => {
    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: [] } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: [] } }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(screen.getByText(mockClub.name)).toBeInTheDocument();
      expect(screen.getByText(mockClub.description)).toBeInTheDocument();
      expect(screen.getByText(mockClub.category)).toBeInTheDocument();
      expect(screen.getByText(mockClub.foundedYear.toString())).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.4**
   * Test social media links display
   */
  it('should display social media links', async () => {
    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: [] } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: [] } }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(screen.getByText('Instagram')).toBeInTheDocument();
      expect(screen.getByText('LinkedIn')).toBeInTheDocument();
      expect(screen.getByText('Twitter')).toBeInTheDocument();
      expect(screen.getByText('Facebook')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Reddit')).toBeInTheDocument();
      expect(screen.getByText('Website')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.5**
   * Test club statistics display
   */
  it('should display club statistics', async () => {
    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: [] } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: [] } }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(screen.getByText(mockClub.stats.memberCount.toString())).toBeInTheDocument();
      expect(screen.getByText(mockClub.stats.eventCount.toString())).toBeInTheDocument();
      expect(screen.getByText(Math.round(mockClub.stats.engagementScore).toString())).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.2**
   * Test club logo display
   */
  it('should display club logo prominently', async () => {
    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: [] } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: [] } }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      const logoImage = screen.getByAltText(mockClub.name);
      expect(logoImage).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.3**
   * Test verified badge display
   */
  it('should display verified badge for verified clubs', async () => {
    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: [] } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: [] } }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.13, 13.14**
   * Test event details in list
   */
  it('should display event details in upcoming events list', async () => {
    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: mockEvents } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: [] } }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(screen.getByText(mockEvents[0].title)).toBeInTheDocument();
      expect(screen.getByText(mockEvents[0].location)).toBeInTheDocument();
      expect(screen.getByText(mockEvents[1].title)).toBeInTheDocument();
      expect(screen.getByText(mockEvents[1].location)).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 13.3**
   * Test members list display
   */
  it('should display members list', async () => {
    clubAPI.getById.mockResolvedValue({
      data: { data: mockClub }
    });
    clubAPI.getEvents.mockResolvedValue({
      data: { data: { events: [] } }
    });
    clubAPI.getMembers.mockResolvedValue({
      data: { data: { members: mockMembers } }
    });

    renderWithProviders(<ClubDetails />);

    await waitFor(() => {
      expect(screen.getByText(`Members (${mockMembers.length})`)).toBeInTheDocument();
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('User Two')).toBeInTheDocument();
    });
  });
});
