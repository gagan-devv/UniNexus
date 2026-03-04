import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
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

describe('MemberManagement - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Property 15: Member Management UI Synchronization', () => {
    it('should immediately update member list after successful add operation', async () => {
      // Feature: uninexus-phase-3-ux-enhancements, Property 15: Member Management UI Synchronization
      // Validates: Requirements 5.4, 5.5

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            clubId: fc.uuid(),
            initialMembers: fc.array(
              fc.record({
                _id: fc.uuid(),
                userId: fc.record({
                  _id: fc.uuid(),
                  username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-z0-9]+$/.test(s)),
                  firstName: fc.string({ minLength: 1, maxLength: 20 }),
                  lastName: fc.string({ minLength: 1, maxLength: 20 }),
                  avatarUrl: fc.constant('https://example.com/avatar.jpg'),
                }),
                role: fc.constantFrom('admin', 'member'),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            newUser: fc.record({
              _id: fc.uuid(),
              username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-z0-9]+$/.test(s)),
              firstName: fc.string({ minLength: 1, maxLength: 20 }),
              lastName: fc.string({ minLength: 1, maxLength: 20 }),
              avatarUrl: fc.constant('https://example.com/avatar.jpg'),
            }),
          }),
          async (testData) => {
            const initialMemberCount = testData.initialMembers.length;

            // Mock initial members fetch
            api.get.mockResolvedValueOnce({
              data: {
                data: {
                  members: testData.initialMembers,
                },
              },
            });

            // Mock user search
            authAPI.searchUsers.mockResolvedValue({
              data: {
                data: [testData.newUser],
              },
            });

            // Mock add member - return updated list with new member
            const newMember = {
              _id: `member-${testData.newUser._id}`,
              userId: testData.newUser,
              role: 'member',
            };
            const updatedMembers = [...testData.initialMembers, newMember];

            api.post.mockResolvedValue({
              data: {
                data: {
                  members: updatedMembers,
                },
              },
            });

            const { unmount } = render(
              <MemberManagement clubId={testData.clubId} isAdmin={true} />
            );

            try {
              // Wait for initial load
              await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith(`/clubs/${testData.clubId}/members`);
              }, { timeout: 2000 });

              // Verify initial member count
              await waitFor(() => {
                expect(screen.getByText(`Club Members (${initialMemberCount})`)).toBeInTheDocument();
              }, { timeout: 2000 });

              // Click Add Member button
              const addButton = screen.getByText('Add Member');
              fireEvent.click(addButton);

              // Search for user
              await waitFor(() => {
                expect(screen.getByPlaceholderText('Search by username or name...')).toBeInTheDocument();
              }, { timeout: 2000 });

              const searchInput = screen.getByPlaceholderText('Search by username or name...');
              fireEvent.change(searchInput, { target: { value: testData.newUser.username } });

              // Wait for search results
              await waitFor(() => {
                expect(authAPI.searchUsers).toHaveBeenCalled();
              }, { timeout: 2000 });

              // Click on user to add
              await waitFor(() => {
                expect(screen.getByText(testData.newUser.username)).toBeInTheDocument();
              }, { timeout: 2000 });

              const userElement = screen.getByText(testData.newUser.username).closest('div[class*="cursor-pointer"]');
              if (userElement) {
                fireEvent.click(userElement);
              }

              // Wait for API call
              await waitFor(() => {
                expect(api.post).toHaveBeenCalledWith(
                  `/clubs/${testData.clubId}/members`,
                  { userId: testData.newUser._id }
                );
              }, { timeout: 2000 });

              // Verify member list updated immediately
              await waitFor(() => {
                expect(screen.getByText(`Club Members (${initialMemberCount + 1})`)).toBeInTheDocument();
              }, { timeout: 2000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5, timeout: 20000, endOnFailure: true }
      );
    });

    it('should immediately update member list after successful remove operation', async () => {
      // Feature: uninexus-phase-3-ux-enhancements, Property 15: Member Management UI Synchronization
      // Validates: Requirements 5.7, 5.8

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            clubId: fc.uuid(),
            members: fc.array(
              fc.record({
                _id: fc.uuid(),
                userId: fc.record({
                  _id: fc.uuid(),
                  username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-z0-9]+$/.test(s)),
                  firstName: fc.string({ minLength: 1, maxLength: 20 }),
                  lastName: fc.string({ minLength: 1, maxLength: 20 }),
                  avatarUrl: fc.constant('https://example.com/avatar.jpg'),
                }),
                role: fc.constantFrom('admin', 'member'),
              }),
              { minLength: 2, maxLength: 5 }
            ),
          }),
          async (testData) => {
            const initialMemberCount = testData.members.length;
            const memberToRemove = testData.members[0];
            const remainingMembers = testData.members.slice(1);

            // Mock initial members fetch
            api.get.mockResolvedValueOnce({
              data: {
                data: {
                  members: testData.members,
                },
              },
            });

            // Mock remove member - return updated list without removed member
            api.delete.mockResolvedValue({
              data: {
                data: {
                  members: remainingMembers,
                },
              },
            });

            const { unmount } = render(
              <MemberManagement clubId={testData.clubId} isAdmin={true} />
            );

            try {
              // Wait for initial load
              await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith(`/clubs/${testData.clubId}/members`);
              }, { timeout: 2000 });

              // Verify initial member count
              await waitFor(() => {
                expect(screen.getByText(`Club Members (${initialMemberCount})`)).toBeInTheDocument();
              }, { timeout: 2000 });

              // Find and click remove button for first member
              const removeButtons = screen.getAllByTitle('Remove Member');
              fireEvent.click(removeButtons[0]);

              // Confirm removal in dialog
              await waitFor(() => {
                expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
              }, { timeout: 2000 });

              const confirmButton = screen.getByText('Remove');
              fireEvent.click(confirmButton);

              // Wait for API call
              await waitFor(() => {
                expect(api.delete).toHaveBeenCalledWith(
                  `/clubs/${testData.clubId}/members/${memberToRemove.userId._id}`
                );
              }, { timeout: 2000 });

              // Verify member list updated immediately
              await waitFor(() => {
                expect(screen.getByText(`Club Members (${initialMemberCount - 1})`)).toBeInTheDocument();
              }, { timeout: 2000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5, timeout: 20000, endOnFailure: true }
      );
    });

    it('should immediately update member list after successful role change operation', async () => {
      // Feature: uninexus-phase-3-ux-enhancements, Property 15: Member Management UI Synchronization
      // Validates: Requirements 5.10, 5.11

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            clubId: fc.uuid(),
            members: fc.array(
              fc.record({
                _id: fc.uuid(),
                userId: fc.record({
                  _id: fc.uuid(),
                  username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-z0-9]+$/.test(s)),
                  firstName: fc.string({ minLength: 1, maxLength: 20 }),
                  lastName: fc.string({ minLength: 1, maxLength: 20 }),
                  avatarUrl: fc.constant('https://example.com/avatar.jpg'),
                }),
                role: fc.constantFrom('admin', 'member'),
              }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          async (testData) => {
            const memberToChange = testData.members[0];
            const newRole = memberToChange.role === 'admin' ? 'member' : 'admin';
            const updatedMembers = testData.members.map((m, i) =>
              i === 0 ? { ...m, role: newRole } : m
            );

            // Mock initial members fetch
            api.get.mockResolvedValueOnce({
              data: {
                data: {
                  members: testData.members,
                },
              },
            });

            // Mock role change
            api.put.mockResolvedValue({
              data: {
                data: {
                  ...memberToChange,
                  role: newRole,
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

            const { unmount } = render(
              <MemberManagement clubId={testData.clubId} isAdmin={true} />
            );

            try {
              // Wait for initial load
              await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith(`/clubs/${testData.clubId}/members`);
              }, { timeout: 2000 });

              // Find and click change role button for first member
              await waitFor(() => {
                const changeRoleButtons = screen.getAllByTitle('Change Role');
                expect(changeRoleButtons.length).toBeGreaterThan(0);
              }, { timeout: 2000 });

              const changeRoleButtons = screen.getAllByTitle('Change Role');
              fireEvent.click(changeRoleButtons[0]);

              // Wait for role dialog
              await waitFor(() => {
                expect(screen.getByText('Change Member Role')).toBeInTheDocument();
              }, { timeout: 2000 });

              // Click on the new role button
              // Use getAllByText and filter to get the button, not the table header
              const roleButtons = newRole === 'admin' 
                ? screen.getAllByText('Admin')
                : screen.getAllByText('Member');
              
              // Find the one inside a button element
              let roleButton = null;
              for (const element of roleButtons) {
                const button = element.closest('button');
                if (button && !button.disabled) {
                  roleButton = button;
                  break;
                }
              }
              
              if (roleButton) {
                fireEvent.click(roleButton);
              }

              // Wait for API call
              await waitFor(() => {
                expect(api.put).toHaveBeenCalledWith(
                  `/clubs/${testData.clubId}/members/${memberToChange.userId._id}/role`,
                  { role: newRole }
                );
              }, { timeout: 2000 });

              // Verify member list was refetched (at least 2 calls: initial + refetch)
              await waitFor(() => {
                expect(api.get).toHaveBeenCalledWith(`/clubs/${testData.clubId}/members`);
                expect(api.get.mock.calls.length).toBeGreaterThanOrEqual(2);
              }, { timeout: 2000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 5, timeout: 20000, endOnFailure: true }
      );
    });
  });
});
