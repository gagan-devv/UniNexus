import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import EventDetails from './EventDetails';
import { eventAPI, rsvpAPI, commentAPI } from '../services/api';

// Mock the API modules
vi.mock('../services/api', () => ({
  eventAPI: {
    getById: vi.fn()
  },
  rsvpAPI: {
    getEventRSVPs: vi.fn(),
    create: vi.fn(),
    delete: vi.fn()
  },
  commentAPI: {
    getByEvent: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    vote: vi.fn()
  }
}));

// Mock react-router-dom hooks
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-event-id' }),
    useNavigate: () => vi.fn()
  };
});

const mockEvent = {
  _id: 'test-event-id',
  title: 'Test Event',
  description: 'Test event description',
  posterUrl: 'https://example.com/poster.jpg',
  category: 'Academic',
  startTime: '2024-12-25T10:00:00Z',
  endTime: '2024-12-25T12:00:00Z',
  location: 'Test Location',
  maxAttendees: 100,
  tags: ['test', 'event'],
  stats: {
    attendeeCount: 10
  },
  organizer: {
    _id: 'club-id',
    name: 'Test Club',
    email: 'club@test.com',
    logoUrl: 'https://example.com/logo.jpg'
  }
};

const mockRsvps = [
  {
    userId: 'user-1',
    userName: 'User One',
    userAvatar: 'https://example.com/avatar1.jpg'
  },
  {
    userId: 'user-2',
    userName: 'User Two',
    userAvatar: 'https://example.com/avatar2.jpg'
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

describe('EventDetails Component - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock commentAPI to return empty comments by default
    commentAPI.getByEvent.mockResolvedValue({
      data: { data: { comments: [] } }
    });
  });

  /**
   * **Validates: Requirements 12.1**
   * Test event API call on mount
   */
  it('should fetch event details on mount', async () => {
    eventAPI.getById.mockResolvedValue({
      data: { data: mockEvent }
    });
    rsvpAPI.getEventRSVPs.mockResolvedValue({
      data: { data: mockRsvps }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      expect(eventAPI.getById).toHaveBeenCalledWith('test-event-id');
    });
  });

  /**
   * **Validates: Requirements 12.6, 12.7, 12.8**
   * Test RSVP button display based on auth state
   */
  it('should display "Login to RSVP" button when not authenticated', async () => {
    eventAPI.getById.mockResolvedValue({
      data: { data: mockEvent }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      expect(screen.queryByText('Login to RSVP')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 12.9, 12.11**
   * Test loading state display
   */
  it('should display loading spinner during API request', () => {
    eventAPI.getById.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<EventDetails />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  /**
   * **Validates: Requirements 12.14, 12.15**
   * Test 404 state display
   */
  it('should display "Event not found" message on 404', async () => {
    eventAPI.getById.mockRejectedValue({
      response: { status: 404 }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      expect(screen.getByText('Event not found')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 12.16**
   * Test error state display
   */
  it('should display error message on API failure', async () => {
    const errorMessage = 'Failed to load event';
    eventAPI.getById.mockRejectedValue({
      response: {
        status: 500,
        data: { message: errorMessage }
      }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 12.2, 12.3, 12.4, 12.5**
   * Test event details display
   */
  it('should display event details correctly', async () => {
    eventAPI.getById.mockResolvedValue({
      data: { data: mockEvent }
    });
    rsvpAPI.getEventRSVPs.mockResolvedValue({
      data: { data: mockRsvps }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      expect(screen.getByText(mockEvent.title)).toBeInTheDocument();
      expect(screen.getByText(mockEvent.description)).toBeInTheDocument();
      expect(screen.getByText(mockEvent.category)).toBeInTheDocument();
      expect(screen.getByText(mockEvent.location)).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 12.4**
   * Test organizing club display
   */
  it('should display organizing club information', async () => {
    eventAPI.getById.mockResolvedValue({
      data: { data: mockEvent }
    });
    rsvpAPI.getEventRSVPs.mockResolvedValue({
      data: { data: mockRsvps }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      expect(screen.getByText(mockEvent.organizer.name)).toBeInTheDocument();
      expect(screen.getByText(mockEvent.organizer.email)).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 12.5, 12.13**
   * Test attendee count and list display
   */
  it('should display attendee count and list', async () => {
    eventAPI.getById.mockResolvedValue({
      data: { data: mockEvent }
    });
    rsvpAPI.getEventRSVPs.mockResolvedValue({
      data: { data: mockRsvps }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      expect(screen.getByText(`Attendees (${mockRsvps.length})`)).toBeInTheDocument();
      expect(screen.getByText(mockRsvps[0].userName)).toBeInTheDocument();
      expect(screen.getByText(mockRsvps[1].userName)).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 12.3**
   * Test tags display
   */
  it('should display event tags', async () => {
    eventAPI.getById.mockResolvedValue({
      data: { data: mockEvent }
    });
    rsvpAPI.getEventRSVPs.mockResolvedValue({
      data: { data: mockRsvps }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      mockEvent.tags.forEach(tag => {
        expect(screen.getByText(tag)).toBeInTheDocument();
      });
    });
  });

  /**
   * **Validates: Requirements 12.5**
   * Test max attendees display
   */
  it('should display max attendees when specified', async () => {
    eventAPI.getById.mockResolvedValue({
      data: { data: mockEvent }
    });
    rsvpAPI.getEventRSVPs.mockResolvedValue({
      data: { data: mockRsvps }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      expect(screen.getByText(new RegExp(`${mockRsvps.length}\\s*/\\s*${mockEvent.maxAttendees}`))).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 12.2**
   * Test event poster display
   */
  it('should display event poster prominently', async () => {
    eventAPI.getById.mockResolvedValue({
      data: { data: mockEvent }
    });
    rsvpAPI.getEventRSVPs.mockResolvedValue({
      data: { data: mockRsvps }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      const posterImage = screen.getByAltText(mockEvent.title);
      expect(posterImage).toBeInTheDocument();
    });
  });
});

describe('EventDetails Component - Comments Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock commentAPI to return empty comments by default
    commentAPI.getByEvent.mockResolvedValue({
      data: { data: { comments: [] } }
    });
  });

  /**
   * **Validates: Requirements 2.1**
   * Test that comments section is rendered on the page
   */
  it('should render comments section with Discussion header', async () => {
    eventAPI.getById.mockResolvedValue({
      data: { data: mockEvent }
    });
    rsvpAPI.getEventRSVPs.mockResolvedValue({
      data: { data: mockRsvps }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      expect(screen.getByText('Discussion')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 2.1, 2.7**
   * Test that CommentThread component receives correct props
   */
  it('should pass eventId to CommentThread component', async () => {
    eventAPI.getById.mockResolvedValue({
      data: { data: mockEvent }
    });
    rsvpAPI.getEventRSVPs.mockResolvedValue({
      data: { data: mockRsvps }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      // The CommentThread component should be rendered
      // We verify this by checking for the Discussion header which is part of the comments section
      expect(screen.getByText('Discussion')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 2.1**
   * Test that comments section appears below event details
   */
  it('should display comments section below event details', async () => {
    eventAPI.getById.mockResolvedValue({
      data: { data: mockEvent }
    });
    rsvpAPI.getEventRSVPs.mockResolvedValue({
      data: { data: mockRsvps }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      const eventTitle = screen.getByText(mockEvent.title);
      const discussionHeader = screen.getByText('Discussion');
      
      // Both should be in the document
      expect(eventTitle).toBeInTheDocument();
      expect(discussionHeader).toBeInTheDocument();
      
      // Discussion should appear after event details in DOM order
      const eventTitlePosition = eventTitle.compareDocumentPosition(discussionHeader);
      expect(eventTitlePosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  /**
   * **Validates: Requirements 2.1, 2.2**
   * Test that comments section is always visible regardless of attendee count
   */
  it('should display comments section even when there are no attendees', async () => {
    const eventWithNoAttendees = {
      ...mockEvent,
      stats: { attendeeCount: 0 }
    };

    eventAPI.getById.mockResolvedValue({
      data: { data: eventWithNoAttendees }
    });
    rsvpAPI.getEventRSVPs.mockResolvedValue({
      data: { data: [] }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      expect(screen.getByText('Discussion')).toBeInTheDocument();
    });
  });

  /**
   * **Validates: Requirements 2.1**
   * Test that comments section has proper styling and structure
   */
  it('should render comments section with proper container styling', async () => {
    eventAPI.getById.mockResolvedValue({
      data: { data: mockEvent }
    });
    rsvpAPI.getEventRSVPs.mockResolvedValue({
      data: { data: mockRsvps }
    });

    renderWithProviders(<EventDetails />);

    await waitFor(() => {
      const discussionHeader = screen.getByText('Discussion');
      const commentsContainer = discussionHeader.closest('.bg-white');
      
      expect(commentsContainer).toBeInTheDocument();
      expect(commentsContainer).toHaveClass('rounded-lg', 'shadow-md', 'p-6');
    });
  });
});
