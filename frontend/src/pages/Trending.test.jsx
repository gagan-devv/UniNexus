import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Trending from './Trending';
import { trendingAPI } from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  trendingAPI: {
    getTrending: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockTrendingData = {
  data: {
    data: {
      events: [
        {
          _id: 'event1',
          title: 'Tech Workshop',
          description: 'Learn about new technologies',
          posterUrl: 'https://example.com/poster1.jpg',
          category: 'Technology',
          startTime: '2024-02-15T10:00:00Z',
          location: 'Room 101',
          stats: {
            attendeeCount: 50,
          },
        },
        {
          _id: 'event2',
          title: 'Music Concert',
          description: 'Live music performance',
          posterUrl: 'https://example.com/poster2.jpg',
          category: 'Cultural',
          startTime: '2024-02-20T18:00:00Z',
          location: 'Auditorium',
          stats: {
            attendeeCount: 120,
          },
        },
      ],
      clubs: [
        {
          _id: 'club1',
          name: 'Coding Club',
          description: 'Learn programming together',
          logoUrl: 'https://example.com/logo1.jpg',
          category: 'Technology',
          memberCount: 75,
        },
        {
          _id: 'club2',
          name: 'Art Society',
          description: 'Express your creativity',
          logoUrl: 'https://example.com/logo2.jpg',
          category: 'Cultural',
          memberCount: 45,
        },
      ],
    },
  },
};

describe('Trending Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch trending data on mount', async () => {
    trendingAPI.getTrending.mockResolvedValue(mockTrendingData);

    render(
      <BrowserRouter>
        <Trending />
      </BrowserRouter>
    );

    // Verify API was called
    expect(trendingAPI.getTrending).toHaveBeenCalledTimes(1);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Tech Workshop')).toBeInTheDocument();
    });

    // Verify events are displayed
    expect(screen.getByText('Tech Workshop')).toBeInTheDocument();
    expect(screen.getByText('Music Concert')).toBeInTheDocument();

    // Verify clubs are displayed
    expect(screen.getByText('Coding Club')).toBeInTheDocument();
    expect(screen.getByText('Art Society')).toBeInTheDocument();
  });

  it('should navigate to event details when event is clicked', async () => {
    trendingAPI.getTrending.mockResolvedValue(mockTrendingData);

    render(
      <BrowserRouter>
        <Trending />
      </BrowserRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Tech Workshop')).toBeInTheDocument();
    });

    // Click on event
    const eventCard = screen.getByText('Tech Workshop').closest('div[class*="cursor-pointer"]');
    await userEvent.click(eventCard);

    // Verify navigation
    expect(mockNavigate).toHaveBeenCalledWith('/events/event1');
  });

  it('should navigate to club details when club is clicked', async () => {
    trendingAPI.getTrending.mockResolvedValue(mockTrendingData);

    render(
      <BrowserRouter>
        <Trending />
      </BrowserRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Coding Club')).toBeInTheDocument();
    });

    // Click on club
    const clubCard = screen.getByText('Coding Club').closest('div[class*="cursor-pointer"]');
    await userEvent.click(clubCard);

    // Verify navigation
    expect(mockNavigate).toHaveBeenCalledWith('/clubs/club1');
  });

  it('should display loading spinner during API request', () => {
    // Mock a delayed response
    trendingAPI.getTrending.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockTrendingData), 100))
    );

    render(
      <BrowserRouter>
        <Trending />
      </BrowserRouter>
    );

    // Verify loading spinner is displayed
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should display error message on API failure', async () => {
    const errorMessage = 'Failed to fetch trending data';
    trendingAPI.getTrending.mockRejectedValue({
      response: {
        data: {
          message: errorMessage,
        },
      },
    });

    render(
      <BrowserRouter>
        <Trending />
      </BrowserRouter>
    );

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Verify error message is displayed
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should retry fetching data when retry button is clicked', async () => {
    // First call fails
    trendingAPI.getTrending.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Network error',
        },
      },
    });

    render(
      <BrowserRouter>
        <Trending />
      </BrowserRouter>
    );

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    // Mock successful response for retry
    trendingAPI.getTrending.mockResolvedValue(mockTrendingData);

    // Click retry button
    const retryButton = screen.getByText('Retry');
    await userEvent.click(retryButton);

    // Verify API was called again
    expect(trendingAPI.getTrending).toHaveBeenCalledTimes(2);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Tech Workshop')).toBeInTheDocument();
    });
  });

  it('should display empty state when no trending events', async () => {
    trendingAPI.getTrending.mockResolvedValue({
      data: {
        data: {
          events: [],
          clubs: [],
        },
      },
    });

    render(
      <BrowserRouter>
        <Trending />
      </BrowserRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('No trending events at the moment')).toBeInTheDocument();
    });

    // Verify empty state messages
    expect(screen.getByText('No trending events at the moment')).toBeInTheDocument();
    expect(screen.getByText('No trending clubs at the moment')).toBeInTheDocument();
  });

  it('should display engagement metrics for events', async () => {
    trendingAPI.getTrending.mockResolvedValue(mockTrendingData);

    render(
      <BrowserRouter>
        <Trending />
      </BrowserRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Tech Workshop')).toBeInTheDocument();
    });

    // Verify attendee count is displayed
    expect(screen.getByText('50 attendees')).toBeInTheDocument();
    expect(screen.getByText('120 attendees')).toBeInTheDocument();
  });

  it('should display engagement metrics for clubs', async () => {
    trendingAPI.getTrending.mockResolvedValue(mockTrendingData);

    render(
      <BrowserRouter>
        <Trending />
      </BrowserRouter>
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Coding Club')).toBeInTheDocument();
    });

    // Verify member count is displayed
    expect(screen.getByText('75 members')).toBeInTheDocument();
    expect(screen.getByText('45 members')).toBeInTheDocument();
  });
});
