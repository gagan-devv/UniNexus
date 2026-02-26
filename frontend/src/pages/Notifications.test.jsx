import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Notifications from './Notifications';
import { notificationAPI } from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  notificationAPI: {
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
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

describe('NotificationsPage - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: API call on mount
   * Validates: Requirements 8.1
   */
  it('should fetch notifications on mount', async () => {
    const mockNotifications = {
      data: {
        data: {
          notifications: [
            {
              _id: '1',
              type: 'event_created',
              message: 'New event created',
              read: false,
              createdAt: new Date().toISOString(),
              relatedId: 'event1',
            },
          ],
          totalPages: 1,
        },
      },
    };

    notificationAPI.getNotifications.mockResolvedValue(mockNotifications);

    render(
      <BrowserRouter>
        <Notifications />
      </BrowserRouter>
    );

    // Should show loading initially
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Wait for notifications to load
    await waitFor(() => {
      expect(notificationAPI.getNotifications).toHaveBeenCalledWith(1, 20);
    });

    // Should display the notification
    await waitFor(() => {
      expect(screen.getByText('New event created')).toBeInTheDocument();
    });
  });

  /**
   * Test: Mark as read on click
   * Validates: Requirements 8.4
   */
  it('should mark notification as read when clicked', async () => {
    const mockNotifications = {
      data: {
        data: {
          notifications: [
            {
              _id: '1',
              type: 'event_created',
              message: 'New event created',
              read: false,
              createdAt: new Date().toISOString(),
              relatedId: 'event1',
            },
          ],
          totalPages: 1,
        },
      },
    };

    notificationAPI.getNotifications.mockResolvedValue(mockNotifications);
    notificationAPI.markAsRead.mockResolvedValue({ data: { success: true } });

    render(
      <BrowserRouter>
        <Notifications />
      </BrowserRouter>
    );

    // Wait for notifications to load
    await waitFor(() => {
      expect(screen.getByText('New event created')).toBeInTheDocument();
    });

    // Click the notification
    const notification = screen.getByText('New event created');
    fireEvent.click(notification.closest('div[class*="cursor-pointer"]'));

    // Should call markAsRead API
    await waitFor(() => {
      expect(notificationAPI.markAsRead).toHaveBeenCalledWith('1');
    });

    // Should navigate to the related resource
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/events/event1');
    });
  });

  /**
   * Test: Mark all as read button
   * Validates: Requirements 8.6
   */
  it('should mark all notifications as read when button is clicked', async () => {
    const mockNotifications = {
      data: {
        data: {
          notifications: [
            {
              _id: '1',
              type: 'event_created',
              message: 'New event created',
              read: false,
              createdAt: new Date().toISOString(),
              relatedId: 'event1',
            },
            {
              _id: '2',
              type: 'club_joined',
              message: 'You joined a club',
              read: false,
              createdAt: new Date().toISOString(),
              relatedId: 'club1',
            },
          ],
          totalPages: 1,
        },
      },
    };

    notificationAPI.getNotifications.mockResolvedValue(mockNotifications);
    notificationAPI.markAllAsRead.mockResolvedValue({ data: { success: true, count: 2 } });

    render(
      <BrowserRouter>
        <Notifications />
      </BrowserRouter>
    );

    // Wait for notifications to load
    await waitFor(() => {
      expect(screen.getByText('New event created')).toBeInTheDocument();
    });

    // Should show "Mark all as read" button
    const markAllButton = screen.getByText('Mark all as read');
    expect(markAllButton).toBeInTheDocument();

    // Click the button
    fireEvent.click(markAllButton);

    // Should call markAllAsRead API
    await waitFor(() => {
      expect(notificationAPI.markAllAsRead).toHaveBeenCalled();
    });
  });

  /**
   * Test: Pagination/Load More
   * Validates: Requirements 8.11
   */
  it('should load more notifications when Load More button is clicked', async () => {
    const mockPage1 = {
      data: {
        data: {
          notifications: [
            {
              _id: '1',
              type: 'event_created',
              message: 'Notification 1',
              read: false,
              createdAt: new Date().toISOString(),
              relatedId: 'event1',
            },
          ],
          totalPages: 2,
        },
      },
    };

    const mockPage2 = {
      data: {
        data: {
          notifications: [
            {
              _id: '2',
              type: 'club_joined',
              message: 'Notification 2',
              read: false,
              createdAt: new Date().toISOString(),
              relatedId: 'club1',
            },
          ],
          totalPages: 2,
        },
      },
    };

    notificationAPI.getNotifications
      .mockResolvedValueOnce(mockPage1)
      .mockResolvedValueOnce(mockPage2);

    render(
      <BrowserRouter>
        <Notifications />
      </BrowserRouter>
    );

    // Wait for first page to load
    await waitFor(() => {
      expect(screen.getByText('Notification 1')).toBeInTheDocument();
    });

    // Should show Load More button
    const loadMoreButton = screen.getByText('Load More');
    expect(loadMoreButton).toBeInTheDocument();

    // Click Load More
    fireEvent.click(loadMoreButton);

    // Should call API with page 2
    await waitFor(() => {
      expect(notificationAPI.getNotifications).toHaveBeenCalledWith(2, 20);
    });

    // Should display both notifications
    await waitFor(() => {
      expect(screen.getByText('Notification 1')).toBeInTheDocument();
      expect(screen.getByText('Notification 2')).toBeInTheDocument();
    });
  });

  /**
   * Test: Loading state display
   * Validates: Requirements 8.8
   */
  it('should display loading spinner during API requests', async () => {
    const mockNotifications = {
      data: {
        data: {
          notifications: [],
          totalPages: 1,
        },
      },
    };

    // Delay the API response to test loading state
    notificationAPI.getNotifications.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockNotifications), 100))
    );

    render(
      <BrowserRouter>
        <Notifications />
      </BrowserRouter>
    );

    // Should show loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  /**
   * Test: Error state display
   * Validates: Requirements 8.10
   */
  it('should display error message on API failure', async () => {
    const errorMessage = 'Failed to fetch notifications';
    notificationAPI.getNotifications.mockRejectedValue({
      response: {
        data: {
          message: errorMessage,
        },
      },
    });

    render(
      <BrowserRouter>
        <Notifications />
      </BrowserRouter>
    );

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  /**
   * Test: Empty state display
   * Validates: Requirements 8.9
   */
  it('should display "No notifications" message when empty', async () => {
    const mockNotifications = {
      data: {
        data: {
          notifications: [],
          totalPages: 1,
        },
      },
    };

    notificationAPI.getNotifications.mockResolvedValue(mockNotifications);

    render(
      <BrowserRouter>
        <Notifications />
      </BrowserRouter>
    );

    // Wait for empty state to be displayed
    await waitFor(() => {
      expect(screen.getByText('No notifications')).toBeInTheDocument();
    });

    expect(screen.getByText("You're all caught up! Check back later for updates.")).toBeInTheDocument();
  });

  /**
   * Test: Navigation based on notification type
   * Validates: Requirements 8.5
   */
  it('should navigate to correct resource based on notification type', async () => {
    const testCases = [
      { type: 'event_created', relatedId: 'event1', expectedPath: '/events/event1' },
      { type: 'club_joined', relatedId: 'club1', expectedPath: '/clubs/club1' },
      { type: 'message_received', relatedId: 'conv1', expectedPath: '/messages/conv1' },
    ];

    for (const testCase of testCases) {
      vi.clearAllMocks();

      const mockNotifications = {
        data: {
          data: {
            notifications: [
              {
                _id: '1',
                type: testCase.type,
                message: 'Test notification',
                read: false,
                createdAt: new Date().toISOString(),
                relatedId: testCase.relatedId,
              },
            ],
            totalPages: 1,
          },
        },
      };

      notificationAPI.getNotifications.mockResolvedValue(mockNotifications);
      notificationAPI.markAsRead.mockResolvedValue({ data: { success: true } });

      const { unmount } = render(
        <BrowserRouter>
          <Notifications />
        </BrowserRouter>
      );

      // Wait for notification to load
      await waitFor(() => {
        expect(screen.getByText('Test notification')).toBeInTheDocument();
      });

      // Click the notification
      const notification = screen.getByText('Test notification');
      fireEvent.click(notification.closest('div[class*="cursor-pointer"]'));

      // Should navigate to the correct path
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(testCase.expectedPath);
      });

      unmount();
    }
  });
});
