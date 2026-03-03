import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as fc from 'fast-check';
import EventCreationForm from './EventCreationForm';
import { eventAPI } from '../../services/api';

vi.mock('../../services/api', () => ({
  eventAPI: {
    create: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

// Mock ImageUpload component
vi.mock('../common/ImageUpload', () => ({
  default: ({ onUploadSuccess }) => {
    const handleMockUpload = () => {
      onUploadSuccess('https://example.com/poster.jpg');
    };
    return (
      <div data-testid="image-upload-mock">
        <button onClick={handleMockUpload} data-testid="mock-upload-button">
          Mock Upload
        </button>
      </div>
    );
  },
}));

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('EventCreationForm - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Property 4: Form Validation Enforcement', () => {
    it('should display validation errors and prevent submission for any invalid form data', () => {
      // **Validates: Requirements 2.8, 2.9, 7.1, 7.2, 7.3, 7.4, 7.6, 7.7**
      
      fc.assert(
        fc.property(
          fc.record({
            // Generate invalid data for various fields
            title: fc.oneof(
              fc.constant(''), // Empty
              fc.string({ minLength: 1, maxLength: 2 }), // Too short
              fc.string({ minLength: 201, maxLength: 250 }) // Too long
            ),
            description: fc.oneof(
              fc.constant(''), // Empty
              fc.string({ minLength: 1, maxLength: 9 }), // Too short
              fc.string({ minLength: 2001, maxLength: 2100 }) // Too long
            ),
            location: fc.constant(''), // Empty
            category: fc.constant(''), // Empty
            maxAttendees: fc.oneof(
              fc.integer({ max: 0 }), // Non-positive
              fc.integer({ min: 10001, max: 20000 }) // Too large
            ).map(String),
          }),
          (invalidData) => {
            const mockOnSuccess = vi.fn();
            const mockOnCancel = vi.fn();

            const { unmount } = renderWithRouter(
              <EventCreationForm
                clubId="test-club-id"
                onSuccess={mockOnSuccess}
                onCancel={mockOnCancel}
              />
            );

            try {
              // Fill form with invalid data
              const titleInput = screen.getByLabelText(/Event Title/i);
              fireEvent.change(titleInput, { target: { value: invalidData.title } });
              fireEvent.blur(titleInput);

              const descInput = screen.getByLabelText(/Description/i);
              fireEvent.change(descInput, { target: { value: invalidData.description } });
              fireEvent.blur(descInput);

              const locationInput = screen.getByLabelText(/Location/i);
              fireEvent.change(locationInput, { target: { value: invalidData.location } });
              fireEvent.blur(locationInput);

              if (invalidData.maxAttendees !== '') {
                const maxAttendeesInput = screen.getByLabelText(/Max Attendees/i);
                fireEvent.change(maxAttendeesInput, { target: { value: invalidData.maxAttendees } });
                fireEvent.blur(maxAttendeesInput);
              }

              // Try to submit the form
              const submitButton = screen.getByRole('button', { name: /Create Event/i });
              
              // Submit button should be disabled for invalid data
              expect(submitButton).toBeDisabled();

              // Verify that API was not called
              expect(eventAPI.create).not.toHaveBeenCalled();
              expect(mockOnSuccess).not.toHaveBeenCalled();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should show real-time validation errors as user types', () => {
      // **Validates: Requirements 7.6, 7.7**
      
      fc.assert(
        fc.property(
          fc.record({
            invalidTitle: fc.string({ minLength: 1, maxLength: 2 }),
            invalidDescription: fc.string({ minLength: 1, maxLength: 9 }),
          }),
          (testData) => {
            const mockOnSuccess = vi.fn();
            const mockOnCancel = vi.fn();

            const { unmount } = renderWithRouter(
              <EventCreationForm
                clubId="test-club-id"
                onSuccess={mockOnSuccess}
                onCancel={mockOnCancel}
              />
            );

            try {
              // Type invalid title
              const titleInput = screen.getByLabelText(/Event Title/i);
              fireEvent.change(titleInput, { target: { value: testData.invalidTitle } });
              fireEvent.blur(titleInput);
              
              // Validation error should appear
              expect(screen.getByText(/Title must be at least 3 characters/i)).toBeInTheDocument();

              // Type invalid description
              const descInput = screen.getByLabelText(/Description/i);
              fireEvent.change(descInput, { target: { value: testData.invalidDescription } });
              fireEvent.blur(descInput);
              
              // Validation error should appear
              expect(screen.getByText(/Description must be at least 10 characters/i)).toBeInTheDocument();

              // Submit button should be disabled
              const submitButton = screen.getByRole('button', { name: /Create Event/i });
              expect(submitButton).toBeDisabled();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should validate date ranges correctly', () => {
      // **Validates: Requirements 2.9, 7.3**
      
      fc.assert(
        fc.property(
          fc.record({
            // Generate a past date for start time (within last 365 days to avoid year 0000 issues)
            daysAgo: fc.integer({ min: 1, max: 365 }),
          }),
          (testData) => {
            const mockOnSuccess = vi.fn();
            const mockOnCancel = vi.fn();

            const { unmount } = renderWithRouter(
              <EventCreationForm
                clubId="test-club-id"
                onSuccess={mockOnSuccess}
                onCancel={mockOnCancel}
              />
            );

            try {
              // Create a past date
              const pastDate = new Date(Date.now() - testData.daysAgo * 86400000);
              const pastDateString = pastDate.toISOString().slice(0, 16);

              // Set start time to past date
              const startInput = screen.getByLabelText(/Start Time/i);
              fireEvent.change(startInput, { target: { value: pastDateString } });
              fireEvent.blur(startInput);

              // Should show error for past date
              expect(screen.getByText(/Start time must be in the future/i)).toBeInTheDocument();

              // Submit button should be disabled
              const submitButton = screen.getByRole('button', { name: /Create Event/i });
              expect(submitButton).toBeDisabled();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should validate end time is after start time', () => {
      // **Validates: Requirements 2.9, 7.3**
      
      const mockOnSuccess = vi.fn();
      const mockOnCancel = vi.fn();

      const { unmount } = renderWithRouter(
        <EventCreationForm
          clubId="test-club-id"
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
        />
      );

      try {
        // Set start time to future
        const futureDate = new Date(Date.now() + 86400000 * 2); // 2 days from now
        const startTime = futureDate.toISOString().slice(0, 16);
        
        // Set end time to before start time
        const pastDate = new Date(Date.now() + 86400000); // 1 day from now (before start)
        const endTime = pastDate.toISOString().slice(0, 16);

        const startInput = screen.getByLabelText(/Start Time/i);
        fireEvent.change(startInput, { target: { value: startTime } });
        fireEvent.blur(startInput);

        const endInput = screen.getByLabelText(/End Time/i);
        fireEvent.change(endInput, { target: { value: endTime } });
        fireEvent.blur(endInput);

        // Should show error for end time before start time
        expect(screen.getByText(/End time must be after start time/i)).toBeInTheDocument();

        // Submit button should be disabled
        const submitButton = screen.getByRole('button', { name: /Create Event/i });
        expect(submitButton).toBeDisabled();
      } finally {
        unmount();
      }
    });

    it('should validate max attendees range', () => {
      // **Validates: Requirements 7.4**
      
      fc.assert(
        fc.property(
          fc.oneof(
            fc.integer({ max: 0 }), // Non-positive
            fc.integer({ min: 10001, max: 50000 }) // Too large
          ),
          (invalidMaxAttendees) => {
            const mockOnSuccess = vi.fn();
            const mockOnCancel = vi.fn();

            const { unmount } = renderWithRouter(
              <EventCreationForm
                clubId="test-club-id"
                onSuccess={mockOnSuccess}
                onCancel={mockOnCancel}
              />
            );

            try {
              const maxAttendeesInput = screen.getByLabelText(/Max Attendees/i);
              fireEvent.change(maxAttendeesInput, { target: { value: String(invalidMaxAttendees) } });
              fireEvent.blur(maxAttendeesInput);

              // Should show validation error
              if (invalidMaxAttendees < 1) {
                expect(screen.getByText(/Max attendees must be a positive number/i)).toBeInTheDocument();
              } else if (invalidMaxAttendees > 10000) {
                expect(screen.getByText(/Max attendees must not exceed 10000/i)).toBeInTheDocument();
              }

              // Submit button should be disabled
              const submitButton = screen.getByRole('button', { name: /Create Event/i });
              expect(submitButton).toBeDisabled();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 5: Event Creation API Call', () => {
    it('should send POST request with all form fields correctly formatted for any valid event data', () => {
      // **Validates: Requirements 2.4**
      
      fc.assert(
        fc.asyncProperty(
          fc.record({
            // Generate valid strings with actual content (alphanumeric + spaces)
            title: fc.stringMatching(/^[a-zA-Z0-9 ]{3,50}$/).filter(s => s.trim().length >= 3),
            description: fc.stringMatching(/^[a-zA-Z0-9 ]{10,100}$/).filter(s => s.trim().length >= 10),
            location: fc.stringMatching(/^[a-zA-Z0-9 ]{3,50}$/).filter(s => s.trim().length >= 3),
            category: fc.constantFrom('Tech', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other'),
            maxAttendees: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: null }),
            tags: fc.array(fc.stringMatching(/^[a-zA-Z0-9]{3,10}$/), { maxLength: 3 }),
          }),
          async (validData) => {
            // Reset mock for each iteration
            eventAPI.create.mockReset();
            
            const mockOnSuccess = vi.fn();
            const mockOnCancel = vi.fn();

            // Mock successful API response
            const mockEvent = {
              _id: 'test-event-id',
              ...validData,
              organizer: 'test-club-id',
            };
            eventAPI.create.mockResolvedValue({
              data: { data: mockEvent },
            });

            const { unmount } = renderWithRouter(
              <EventCreationForm
                clubId="test-club-id"
                onSuccess={mockOnSuccess}
                onCancel={mockOnCancel}
              />
            );

            try {
              // Fill form with valid data
              const titleInput = screen.getByLabelText(/Event Title/i);
              fireEvent.change(titleInput, { target: { value: validData.title } });

              const descInput = screen.getByLabelText(/Description/i);
              fireEvent.change(descInput, { target: { value: validData.description } });

              // Set future dates
              const startDate = new Date(Date.now() + 86400000 * 2); // 2 days from now
              const endDate = new Date(Date.now() + 86400000 * 3); // 3 days from now
              const startTime = startDate.toISOString().slice(0, 16);
              const endTime = endDate.toISOString().slice(0, 16);

              const startInput = screen.getByLabelText(/Start Time/i);
              fireEvent.change(startInput, { target: { value: startTime } });

              const endInput = screen.getByLabelText(/End Time/i);
              fireEvent.change(endInput, { target: { value: endTime } });

              const locationInput = screen.getByLabelText(/Location/i);
              fireEvent.change(locationInput, { target: { value: validData.location } });

              // Select category using the hidden select element
              const categorySelect = screen.getByLabelText(/Category/i);
              fireEvent.change(categorySelect, { target: { value: validData.category } });

              if (validData.maxAttendees !== null) {
                const maxAttendeesInput = screen.getByLabelText(/Max Attendees/i);
                fireEvent.change(maxAttendeesInput, { target: { value: String(validData.maxAttendees) } });
              }

              if (validData.tags.length > 0) {
                const tagsInput = screen.getByLabelText(/Tags/i);
                fireEvent.change(tagsInput, { target: { value: validData.tags.join(', ') } });
              }

              // Submit form
              const submitButton = screen.getByRole('button', { name: /Create Event/i });
              fireEvent.click(submitButton);

              // Wait for API call
              await vi.waitFor(() => {
                expect(eventAPI.create).toHaveBeenCalled();
              });

              // Verify API was called with correct data structure
              const apiCallArgs = eventAPI.create.mock.calls[0][0];
              expect(apiCallArgs).toHaveProperty('title', validData.title.trim());
              expect(apiCallArgs).toHaveProperty('description', validData.description.trim());
              expect(apiCallArgs).toHaveProperty('location', validData.location.trim());
              expect(apiCallArgs).toHaveProperty('category', validData.category);
              expect(apiCallArgs).toHaveProperty('organizer', 'test-club-id');
              expect(apiCallArgs).toHaveProperty('startTime');
              expect(apiCallArgs).toHaveProperty('endTime');
              expect(apiCallArgs).toHaveProperty('tags');
              expect(Array.isArray(apiCallArgs.tags)).toBe(true);

              if (validData.maxAttendees !== null) {
                expect(apiCallArgs).toHaveProperty('maxAttendees', validData.maxAttendees);
              }

              // Verify success callback was called
              await vi.waitFor(() => {
                expect(mockOnSuccess).toHaveBeenCalledWith(mockEvent);
              });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 10 } // Reduced runs for async tests
      );
    });
  });
});
