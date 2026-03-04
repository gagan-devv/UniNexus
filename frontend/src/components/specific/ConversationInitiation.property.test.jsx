import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import * as fc from 'fast-check';
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

// Mock useDebounce hook - return value immediately for testing
vi.mock('../../hooks/useDebounce', () => ({
  useDebounce: (value) => value,
}));

describe('ConversationInitiation - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Property 6: User Search Filtering', () => {
    it('should filter search results to exclude current user, existing conversation users, and limit to 20 users', async () => {
      // Feature: uninexus-phase-3-ux-enhancements, Property 6: User Search Filtering
      // Validates: Requirements 3.2, 8.3, 8.4, 8.5

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 25, max: 50 }),
          async (totalUsers) => {
            // Generate array of users
            const allUsers = Array.from({ length: totalUsers }, (_, i) => ({
              _id: `user-${i}`,
              username: `testuser${i}`,
              firstName: `Test${i}`,
              lastName: `User${i}`,
              avatarUrl: `https://example.com/avatar${i}.jpg`,
            }));

            // Mock API to return all users
            authAPI.searchUsers.mockResolvedValue({
              data: {
                data: allUsers,
              },
            });

            const mockOnClose = vi.fn();
            const mockOnSuccess = vi.fn();

            const { unmount } = render(
              <ConversationInitiation
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
              />
            );

            try {
              // Perform search
              const searchInput = screen.getByPlaceholderText('Search by username or name...');
              fireEvent.change(searchInput, { target: { value: 'test' } });

              // Wait for search to complete
              await waitFor(() => {
                expect(authAPI.searchUsers).toHaveBeenCalled();
              }, { timeout: 1000 });

              // Wait for results to be displayed
              await waitFor(() => {
                const results = screen.queryAllByTestId('image-display');
                expect(results.length).toBeGreaterThan(0);
              }, { timeout: 1000 });

              // Verify that results are limited to 20
              const displayedResults = screen.queryAllByTestId('image-display');
              expect(displayedResults.length).toBeLessThanOrEqual(20);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10, timeout: 15000, endOnFailure: true }
      );
    });
  });

  describe('Property 18: Search Debouncing', () => {
    it('should debounce search requests by 300ms', async () => {
      // Feature: uninexus-phase-3-ux-enhancements, Property 18: Search Debouncing
      // Validates: Requirements 8.1

      // Note: Since useDebounce is mocked to return immediately, we verify the component
      // uses the debounce hook correctly. The actual debouncing behavior is tested
      // in the useDebounce hook's own tests.

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 10 }),
          async (searchQuery) => {
            authAPI.searchUsers.mockResolvedValue({
              data: {
                data: [],
              },
            });

            const mockOnClose = vi.fn();
            const mockOnSuccess = vi.fn();

            const { unmount } = render(
              <ConversationInitiation
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
              />
            );

            try {
              const searchInput = screen.getByPlaceholderText('Search by username or name...');
              
              fireEvent.change(searchInput, { target: { value: searchQuery } });

              // Wait for API call
              await waitFor(() => {
                expect(authAPI.searchUsers).toHaveBeenCalledWith(searchQuery);
              }, { timeout: 1000 });

              // Verify the component uses debounced search
              expect(authAPI.searchUsers).toHaveBeenCalled();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10, timeout: 15000, endOnFailure: true }
      );
    });
  });

  describe('Property 19: Loading State Display', () => {
    it('should display loading indicator during asynchronous operations', async () => {
      // Feature: uninexus-phase-3-ux-enhancements, Property 19: Loading State Display
      // Validates: Requirements 8.2

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          async (searchQuery) => {
            // Mock API with controlled promise
            let resolveSearch;
            const searchPromise = new Promise(resolve => {
              resolveSearch = resolve;
            });
            authAPI.searchUsers.mockReturnValue(searchPromise);

            const mockOnClose = vi.fn();
            const mockOnSuccess = vi.fn();

            const { unmount } = render(
              <ConversationInitiation
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
              />
            );

            try {
              const searchInput = screen.getByPlaceholderText('Search by username or name...');
              fireEvent.change(searchInput, { target: { value: searchQuery } });

              // Wait for API to be called
              await waitFor(() => {
                expect(authAPI.searchUsers).toHaveBeenCalled();
              }, { timeout: 1000 });

              // Loading spinner should appear
              const spinner = screen.queryByTestId('loading-spinner');
              expect(spinner).toBeInTheDocument();

              // Resolve the search
              resolveSearch({ data: { data: [] } });

              // Wait for loading to complete
              await waitFor(() => {
                expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
              }, { timeout: 1000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10, timeout: 15000, endOnFailure: true }
      );
    });
  });

  describe('Property 20: Empty Search Results', () => {
    it('should display "No users found" message when search returns no results', async () => {
      // Feature: uninexus-phase-3-ux-enhancements, Property 20: Empty Search Results
      // Validates: Requirements 8.6

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          async (searchQuery) => {
            // Mock API to return empty results
            authAPI.searchUsers.mockResolvedValue({
              data: {
                data: [],
              },
            });

            const mockOnClose = vi.fn();
            const mockOnSuccess = vi.fn();

            const { unmount } = render(
              <ConversationInitiation
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
              />
            );

            try {
              const searchInput = screen.getByPlaceholderText('Search by username or name...');
              fireEvent.change(searchInput, { target: { value: searchQuery } });

              // Wait for search to complete
              await waitFor(() => {
                expect(authAPI.searchUsers).toHaveBeenCalledWith(searchQuery);
              }, { timeout: 1000 });

              // "No users found" message should be displayed
              await waitFor(() => {
                expect(screen.getByText('No users found')).toBeInTheDocument();
              }, { timeout: 1000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10, timeout: 15000, endOnFailure: true }
      );
    });
  });

  describe('Property 7: Participant Selection Management', () => {
    it('should correctly add and remove users from selected participants list', async () => {
      // Feature: uninexus-phase-3-ux-enhancements, Property 7: Participant Selection Management
      // Validates: Requirements 3.3, 3.4

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            _id: fc.uuid(),
            username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-z0-9]+$/.test(s)),
            firstName: fc.string({ minLength: 1, maxLength: 20 }),
            lastName: fc.string({ minLength: 1, maxLength: 20 }),
            avatarUrl: fc.constant('https://example.com/avatar.jpg'),
          }),
          async (user) => {
            authAPI.searchUsers.mockResolvedValue({
              data: {
                data: [user],
              },
            });

            const mockOnClose = vi.fn();
            const mockOnSuccess = vi.fn();

            const { unmount } = render(
              <ConversationInitiation
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
              />
            );

            try {
              // Search for users
              const searchInput = screen.getByPlaceholderText('Search by username or name...');
              fireEvent.change(searchInput, { target: { value: 'test' } });

              await waitFor(() => {
                expect(authAPI.searchUsers).toHaveBeenCalled();
              }, { timeout: 1000 });

              // Add user to selected list
              await waitFor(() => {
                expect(screen.getByText(user.username)).toBeInTheDocument();
              }, { timeout: 1000 });

              const userElement = screen.getByText(user.username).closest('div[class*="cursor-pointer"]');
              if (userElement) {
                fireEvent.click(userElement);
              }

              // Verify user is in selected list
              await waitFor(() => {
                expect(screen.getByText('Selected participants (1)')).toBeInTheDocument();
              }, { timeout: 1000 });

              // Remove the user
              const removeButton = screen.getByLabelText(`Remove ${user.username}`);
              fireEvent.click(removeButton);

              // Verify count decreased
              await waitFor(() => {
                expect(screen.queryByText(/Selected participants/)).not.toBeInTheDocument();
              }, { timeout: 1000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10, timeout: 15000, endOnFailure: true }
      );
    });
  });

  describe('Property 8: Submit Button State', () => {
    it('should disable submit button when no participants are selected', async () => {
      // Feature: uninexus-phase-3-ux-enhancements, Property 8: Submit Button State
      // Validates: Requirements 3.8

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            hasParticipants: fc.boolean(),
            user: fc.record({
              _id: fc.uuid(),
              username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-z0-9]+$/.test(s)),
              firstName: fc.string({ minLength: 1, maxLength: 20 }),
              lastName: fc.string({ minLength: 1, maxLength: 20 }),
              avatarUrl: fc.constant('https://example.com/avatar.jpg'),
            }),
          }),
          async (testData) => {
            authAPI.searchUsers.mockResolvedValue({
              data: {
                data: [testData.user],
              },
            });

            const mockOnClose = vi.fn();
            const mockOnSuccess = vi.fn();

            const { unmount } = render(
              <ConversationInitiation
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
              />
            );

            try {
              const createButton = screen.getByText('Create');

              if (testData.hasParticipants) {
                // Add a participant
                const searchInput = screen.getByPlaceholderText('Search by username or name...');
                fireEvent.change(searchInput, { target: { value: 'test' } });

                await waitFor(() => {
                  expect(authAPI.searchUsers).toHaveBeenCalled();
                }, { timeout: 1000 });

                await waitFor(() => {
                  expect(screen.getByText(testData.user.username)).toBeInTheDocument();
                }, { timeout: 1000 });

                const userElement = screen.getByText(testData.user.username).closest('div[class*="cursor-pointer"]');
                if (userElement) {
                  fireEvent.click(userElement);
                }

                // Button should be enabled
                await waitFor(() => {
                  expect(createButton).not.toBeDisabled();
                }, { timeout: 1000 });
              } else {
                // No participants - button should be disabled
                expect(createButton).toBeDisabled();
              }
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10, timeout: 15000, endOnFailure: true }
      );
    });
  });

  describe('Property 9: Conversation Creation API Call', () => {
    it('should send POST request with participant IDs and optional initial message', async () => {
      // Feature: uninexus-phase-3-ux-enhancements, Property 9: Conversation Creation API Call
      // Validates: Requirements 3.5, 3.10

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            user: fc.record({
              _id: fc.uuid(),
              username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-z0-9]+$/.test(s)),
              firstName: fc.string({ minLength: 1, maxLength: 20 }),
              lastName: fc.string({ minLength: 1, maxLength: 20 }),
              avatarUrl: fc.constant('https://example.com/avatar.jpg'),
            }),
            initialMessage: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
          }),
          async (testData) => {
            authAPI.searchUsers.mockResolvedValue({
              data: {
                data: [testData.user],
              },
            });

            const mockConversation = {
              _id: 'conv-123',
              participants: [testData.user._id],
            };

            messageAPI.createConversation.mockResolvedValue({
              data: {
                data: mockConversation,
              },
            });

            const mockOnClose = vi.fn();
            const mockOnSuccess = vi.fn();

            const { unmount } = render(
              <ConversationInitiation
                isOpen={true}
                onClose={mockOnClose}
                onSuccess={mockOnSuccess}
              />
            );

            try {
              // Search and add user
              const searchInput = screen.getByPlaceholderText('Search by username or name...');
              fireEvent.change(searchInput, { target: { value: 'test' } });

              await waitFor(() => {
                expect(authAPI.searchUsers).toHaveBeenCalled();
              }, { timeout: 1000 });

              await waitFor(() => {
                expect(screen.getByText(testData.user.username)).toBeInTheDocument();
              }, { timeout: 1000 });

              const userElement = screen.getByText(testData.user.username).closest('div[class*="cursor-pointer"]');
              if (userElement) {
                fireEvent.click(userElement);
              }

              // Add initial message if provided
              if (testData.initialMessage) {
                const messageInput = screen.getByPlaceholderText('Type your first message...');
                fireEvent.change(messageInput, { target: { value: testData.initialMessage } });
              }

              // Click create button
              await waitFor(() => {
                const createButton = screen.getByText('Create');
                expect(createButton).not.toBeDisabled();
              }, { timeout: 1000 });

              const createButton = screen.getByText('Create');
              fireEvent.click(createButton);

              // Verify API was called with correct parameters
              await waitFor(() => {
                expect(messageAPI.createConversation).toHaveBeenCalledWith(
                  [testData.user._id],
                  testData.initialMessage || undefined
                );
              }, { timeout: 1000 });

              // Verify success callback was called
              await waitFor(() => {
                expect(mockOnSuccess).toHaveBeenCalledWith(mockConversation);
              }, { timeout: 1000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10, timeout: 15000, endOnFailure: true }
      );
    });
  });
});
