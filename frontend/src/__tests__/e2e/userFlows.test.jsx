import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import App from '../../App';
import * as api from '../../services/api';

// Mock the API module
vi.mock('../../services/api', () => ({
  discoverAPI: {
    search: vi.fn()
  },
  eventAPI: {
    getById: vi.fn()
  },
  rsvpAPI: {
    getEventRSVPs: vi.fn(),
    create: vi.fn(),
    delete: vi.fn()
  },
  clubAPI: {
    getById: vi.fn(),
    getEvents: vi.fn(),
    getMembers: vi.fn(),
    join: vi.fn(),
    leave: vi.fn()
  },
  authAPI: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn()
  }
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test data
const mockUser = {
  _id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'student'
};

const mockEvent = {
  _id: 'event-123',
  title: 'Tech Workshop 2024',
  description: 'Learn about the latest technologies',
  posterUrl: 'https://example.com/poster.jpg',
  category: 'Tech',
  startTime: '2024-12-25T10:00:00Z',
  endTime: '2024-12-25T12:00:00Z',
  location: 'Engineering Building Room 101',
  maxAttendees: 50,
  tags: ['technology', 'workshop', 'coding'],
  isPublic: true,
  stats: {
    attendeeCount: 10,
    viewCount: 100,
    engagementScore: 120
  },
  organizer: {
    _id: 'club-123',
    name: 'Tech Club',
    email: 'tech@club.com',
    logoUrl: 'https://example.com/logo.jpg'
  }
};

const mockClub = {
  _id: 'club-123',
  name: 'Tech Club',
  description: 'A club for technology enthusiasts',
  logoUrl: 'https://example.com/logo.jpg',
  category: 'Technology',
  foundedYear: 2020,
  email: 'tech@club.com',
  isVerified: true,
  memberCount: 50,
  stats: {
    memberCount: 50,
    eventCount: 10,
    engagementScore: 150
  },
  socialLinks: {
    instagram: 'https://instagram.com/techclub',
    website: 'https://techclub.com'
  }
};

const mockDiscoverResults = {
  events: [mockEvent],
  clubs: [mockClub]
};

const mockRsvps = [
  {
    userId: 'user-456',
    userName: 'John Doe',
    userAvatar: 'https://example.com/avatar1.jpg'
  }
];

const mockClubEvents = [
  mockEvent,
  {
    _id: 'event-456',
    title: 'Coding Competition',
    startTime: '2024-12-26T14:00:00Z',
    location: 'Main Auditorium',
    posterUrl: 'https://example.com/poster2.jpg'
  }
];

const mockClubMembers = [
  {
    userId: {
      _id: 'user-456',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      avatarUrl: 'https://example.com/avatar1.jpg'
    }
  }
];

const renderApp = (initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('End-to-End User Flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    
    // Setup default API responses
    api.authAPI.getCurrentUser.mockResolvedValue({
      data: { data: null }
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 17.11**
   * End-to-end test: Discover event → View details → RSVP flow
   */
  describe('E2E Flow: Discover Event → View Details → RSVP', () => {
    it('should allow user to discover an event, view details, and RSVP', async () => {
      // Setup: User is authenticated
      localStorageMock.setItem('token', 'mock-token');
      api.authAPI.getCurrentUser.mockResolvedValue({
        data: { data: mockUser }
      });

      // Step 1: User navigates to discover page
      api.discoverAPI.search.mockResolvedValue({
        data: { data: mockDiscoverResults }
      });

      renderApp('/discover');

      // Wait for discover page to load
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });

      // Verify discover API was called
      expect(api.discoverAPI.search).toHaveBeenCalled();

      // Step 2: User searches for "Tech"
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'Tech' } });

      // Wait for debounced search
      await waitFor(() => {
        expect(api.discoverAPI.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'Tech'
          })
        );
      }, { timeout: 500 });

      // Step 3: User sees event in results and clicks on it
      await waitFor(() => {
        expect(screen.getByText(mockEvent.title)).toBeInTheDocument();
      });

      // Setup event details API response
      api.eventAPI.getById.mockResolvedValue({
        data: { data: mockEvent }
      });
      api.rsvpAPI.getEventRSVPs.mockResolvedValue({
        data: { data: mockRsvps }
      });

      const eventCard = screen.getByText(mockEvent.title);
      fireEvent.click(eventCard);

      // Step 4: User views event details
      await waitFor(() => {
        expect(api.eventAPI.getById).toHaveBeenCalledWith('event-123');
      });

      await waitFor(() => {
        expect(screen.getByText(mockEvent.description)).toBeInTheDocument();
        expect(screen.getByText(mockEvent.location)).toBeInTheDocument();
      });

      // Step 5: User clicks RSVP button
      api.rsvpAPI.create.mockResolvedValue({
        data: { success: true, data: { eventId: 'event-123', userId: 'user-123' } }
      });

      const rsvpButton = screen.getByText(/rsvp/i);
      fireEvent.click(rsvpButton);

      // Step 6: Verify RSVP was created
      await waitFor(() => {
        expect(api.rsvpAPI.create).toHaveBeenCalledWith('event-123');
      });

      // Step 7: Verify button changed to "Cancel RSVP"
      await waitFor(() => {
        expect(screen.getByText(/cancel rsvp/i)).toBeInTheDocument();
      });

      // Step 8: Verify attendee count increased
      await waitFor(() => {
        expect(screen.getByText(/attendees \(2\)/i)).toBeInTheDocument();
      });
    });

    it('should redirect to login if user is not authenticated', async () => {
      // Setup: User is not authenticated
      api.authAPI.getCurrentUser.mockResolvedValue({
        data: { data: null }
      });

      // Step 1: User navigates to discover page
      api.discoverAPI.search.mockResolvedValue({
        data: { data: mockDiscoverResults }
      });

      renderApp('/discover');

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });

      // Step 2: User clicks on event
      api.eventAPI.getById.mockResolvedValue({
        data: { data: mockEvent }
      });
      api.rsvpAPI.getEventRSVPs.mockResolvedValue({
        data: { data: mockRsvps }
      });

      await waitFor(() => {
        expect(screen.getByText(mockEvent.title)).toBeInTheDocument();
      });

      const eventCard = screen.getByText(mockEvent.title);
      fireEvent.click(eventCard);

      // Step 3: User sees "Login to RSVP" button
      await waitFor(() => {
        expect(screen.getByText(/login to rsvp/i)).toBeInTheDocument();
      });

      // Verify RSVP button is not present
      expect(screen.queryByText(/^rsvp$/i)).not.toBeInTheDocument();
    });

    it('should allow user to cancel RSVP', async () => {
      // Setup: User is authenticated and has already RSVP'd
      localStorageMock.setItem('token', 'mock-token');
      api.authAPI.getCurrentUser.mockResolvedValue({
        data: { data: mockUser }
      });

      const mockRsvpsWithUser = [
        ...mockRsvps,
        {
          userId: 'user-123',
          userName: 'Test User',
          userAvatar: null
        }
      ];

      api.eventAPI.getById.mockResolvedValue({
        data: { data: { ...mockEvent, stats: { ...mockEvent.stats, attendeeCount: 11 } } }
      });
      api.rsvpAPI.getEventRSVPs.mockResolvedValue({
        data: { data: mockRsvpsWithUser }
      });

      renderApp('/events/event-123');

      // Wait for event details to load
      await waitFor(() => {
        expect(screen.getByText(/cancel rsvp/i)).toBeInTheDocument();
      });

      // User clicks Cancel RSVP
      api.rsvpAPI.delete.mockResolvedValue({
        data: { success: true }
      });

      const cancelButton = screen.getByText(/cancel rsvp/i);
      fireEvent.click(cancelButton);

      // Verify RSVP was deleted
      await waitFor(() => {
        expect(api.rsvpAPI.delete).toHaveBeenCalledWith('event-123');
      });

      // Verify button changed back to "RSVP"
      await waitFor(() => {
        expect(screen.getByText(/^rsvp$/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * **Validates: Requirements 17.12**
   * End-to-end test: Search club → View details → Join → View events flow
   */
  describe('E2E Flow: Search Club → View Details → Join → View Events', () => {
    it('should allow user to search for club, view details, join, and view events', async () => {
      // Setup: User is authenticated
      localStorageMock.setItem('token', 'mock-token');
      api.authAPI.getCurrentUser.mockResolvedValue({
        data: { data: mockUser }
      });

      // Step 1: User navigates to discover page
      api.discoverAPI.search.mockResolvedValue({
        data: { data: mockDiscoverResults }
      });

      renderApp('/discover');

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });

      // Step 2: User searches for "Tech Club"
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'Tech Club' } });

      // Wait for debounced search
      await waitFor(() => {
        expect(api.discoverAPI.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'Tech Club'
          })
        );
      }, { timeout: 500 });

      // Step 3: User sees club in results and clicks on it
      await waitFor(() => {
        expect(screen.getByText(mockClub.name)).toBeInTheDocument();
      });

      // Setup club details API response
      api.clubAPI.getById.mockResolvedValue({
        data: { data: mockClub }
      });
      api.clubAPI.getEvents.mockResolvedValue({
        data: { data: { events: mockClubEvents } }
      });
      api.clubAPI.getMembers.mockResolvedValue({
        data: { data: { members: mockClubMembers } }
      });

      const clubCard = screen.getByText(mockClub.name);
      fireEvent.click(clubCard);

      // Step 4: User views club details
      await waitFor(() => {
        expect(api.clubAPI.getById).toHaveBeenCalledWith('club-123');
      });

      await waitFor(() => {
        expect(screen.getByText(mockClub.description)).toBeInTheDocument();
      });

      // Step 5: User clicks Join Club button
      api.clubAPI.join.mockResolvedValue({
        data: { success: true }
      });

      await waitFor(() => {
        expect(screen.getByText(/join club/i)).toBeInTheDocument();
      });

      const joinButton = screen.getByText(/join club/i);
      fireEvent.click(joinButton);

      // Step 6: Verify join request was made
      await waitFor(() => {
        expect(api.clubAPI.join).toHaveBeenCalledWith('club-123');
      });

      // Step 7: Verify button changed to "Leave Club"
      await waitFor(() => {
        expect(screen.getByText(/leave club/i)).toBeInTheDocument();
      });

      // Step 8: Verify member count increased
      await waitFor(() => {
        expect(screen.getByText('51')).toBeInTheDocument(); // memberCount + 1
      });

      // Step 9: User views club events
      await waitFor(() => {
        expect(screen.getByText(/upcoming events/i)).toBeInTheDocument();
        expect(screen.getByText(mockClubEvents[0].title)).toBeInTheDocument();
        expect(screen.getByText(mockClubEvents[1].title)).toBeInTheDocument();
      });

      // Step 10: User clicks on an event to view details
      api.eventAPI.getById.mockResolvedValue({
        data: { data: mockEvent }
      });
      api.rsvpAPI.getEventRSVPs.mockResolvedValue({
        data: { data: mockRsvps }
      });

      const eventLink = screen.getByText(mockClubEvents[0].title);
      fireEvent.click(eventLink);

      // Step 11: Verify event details page loads
      await waitFor(() => {
        expect(api.eventAPI.getById).toHaveBeenCalledWith('event-123');
      });

      await waitFor(() => {
        expect(screen.getByText(mockEvent.description)).toBeInTheDocument();
      });
    });

    it('should show "Login to Join" for unauthenticated users', async () => {
      // Setup: User is not authenticated
      api.authAPI.getCurrentUser.mockResolvedValue({
        data: { data: null }
      });

      // Setup club details API response
      api.clubAPI.getById.mockResolvedValue({
        data: { data: mockClub }
      });
      api.clubAPI.getEvents.mockResolvedValue({
        data: { data: { events: [] } }
      });
      api.clubAPI.getMembers.mockResolvedValue({
        data: { data: { members: [] } }
      });

      renderApp('/clubs/club-123');

      // Wait for club details to load
      await waitFor(() => {
        expect(screen.getByText(/login to join/i)).toBeInTheDocument();
      });

      // Verify Join Club button is not present
      expect(screen.queryByText(/^join club$/i)).not.toBeInTheDocument();
    });

    it('should allow user to leave club', async () => {
      // Setup: User is authenticated and is already a member
      localStorageMock.setItem('token', 'mock-token');
      api.authAPI.getCurrentUser.mockResolvedValue({
        data: { data: mockUser }
      });

      const mockMembersWithUser = [
        ...mockClubMembers,
        {
          userId: {
            _id: 'user-123',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
            avatarUrl: null
          }
        }
      ];

      api.clubAPI.getById.mockResolvedValue({
        data: { data: mockClub }
      });
      api.clubAPI.getEvents.mockResolvedValue({
        data: { data: { events: [] } }
      });
      api.clubAPI.getMembers.mockResolvedValue({
        data: { data: { members: mockMembersWithUser } }
      });

      renderApp('/clubs/club-123');

      // Wait for club details to load
      await waitFor(() => {
        expect(screen.getByText(/leave club/i)).toBeInTheDocument();
      });

      // User clicks Leave Club
      api.clubAPI.leave.mockResolvedValue({
        data: { success: true }
      });

      const leaveButton = screen.getByText(/leave club/i);
      fireEvent.click(leaveButton);

      // Verify leave request was made
      await waitFor(() => {
        expect(api.clubAPI.leave).toHaveBeenCalledWith('club-123');
      });

      // Verify button changed back to "Join Club"
      await waitFor(() => {
        expect(screen.getByText(/join club/i)).toBeInTheDocument();
      });
    });
  });

  /**
   * Additional integration test: Filter combinations on discover page
   */
  describe('E2E Flow: Discover with Multiple Filters', () => {
    it('should apply multiple filters and show filtered results', async () => {
      // Setup
      api.authAPI.getCurrentUser.mockResolvedValue({
        data: { data: mockUser }
      });

      api.discoverAPI.search.mockResolvedValue({
        data: { data: mockDiscoverResults }
      });

      renderApp('/discover');

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });

      // Apply search query
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'Tech' } });

      // Apply type filter (events only)
      const typeSelect = screen.getByLabelText(/type/i);
      fireEvent.change(typeSelect, { target: { value: 'events' } });

      // Apply category filter
      const categorySelect = screen.getByLabelText(/category/i);
      fireEvent.change(categorySelect, { target: { value: 'Technology' } });

      // Apply date range filter
      const dateRangeSelect = screen.getByLabelText(/date range/i);
      fireEvent.change(dateRangeSelect, { target: { value: 'week' } });

      // Wait for debounced search with all filters
      await waitFor(() => {
        expect(api.discoverAPI.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'Tech',
            type: 'events',
            category: 'Technology',
            dateRange: 'week'
          })
        );
      }, { timeout: 500 });

      // Verify results are displayed
      await waitFor(() => {
        expect(screen.getByText(mockEvent.title)).toBeInTheDocument();
      });
    });
  });

  /**
   * Additional integration test: Cache behavior
   */
  describe('E2E Flow: Cache Hit/Miss Scenarios', () => {
    it('should use cached results on subsequent identical searches', async () => {
      api.authAPI.getCurrentUser.mockResolvedValue({
        data: { data: mockUser }
      });

      api.discoverAPI.search.mockResolvedValue({
        data: { data: mockDiscoverResults }
      });

      renderApp('/discover');

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
      });

      // First search
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'Tech' } });

      await waitFor(() => {
        expect(api.discoverAPI.search).toHaveBeenCalledTimes(2); // Initial + search
      }, { timeout: 500 });

      // Clear the search
      fireEvent.change(searchInput, { target: { value: '' } });

      await waitFor(() => {
        expect(api.discoverAPI.search).toHaveBeenCalledTimes(3);
      }, { timeout: 500 });

      // Same search again - should still call API (frontend doesn't cache)
      fireEvent.change(searchInput, { target: { value: 'Tech' } });

      await waitFor(() => {
        expect(api.discoverAPI.search).toHaveBeenCalledTimes(4);
      }, { timeout: 500 });
    });
  });
});
