import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Settings from './Settings';
import { settingsAPI } from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  settingsAPI: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    changePassword: vi.fn(),
  },
}));

// Test wrapper
const TestWrapper = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>;
};

describe('SettingsPage - Unit Tests', () => {
  const mockSettings = {
    data: {
      data: {
        notifications: {
          events: true,
          clubs: true,
          messages: true,
        },
        privacy: {
          showProfile: true,
          showEvents: true,
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test: Settings API call on mount
   * Validates: Requirements 10.1
   */
  it('should fetch settings on mount', async () => {
    settingsAPI.getSettings.mockResolvedValue(mockSettings);

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    // Wait for API call
    await waitFor(() => {
      expect(settingsAPI.getSettings).toHaveBeenCalled();
    });

    // Should display settings sections
    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
      expect(screen.getByText('Privacy Preferences')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument();
    });
  });

  /**
   * Test: Toggle switches update state
   * Validates: Requirements 10.5
   */
  it('should update notification preferences when toggled', async () => {
    settingsAPI.getSettings.mockResolvedValue(mockSettings);

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByText('Event Notifications')).toBeInTheDocument();
    });

    // Find and click the events notification toggle
    const eventToggle = screen.getByText('Event Notifications').closest('div').parentElement.querySelector('button');
    fireEvent.click(eventToggle);

    // Save Changes button should be enabled
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).not.toBeDisabled();
  });

  /**
   * Test: Privacy toggle switches update state
   * Validates: Requirements 10.5
   */
  it('should update privacy preferences when toggled', async () => {
    settingsAPI.getSettings.mockResolvedValue(mockSettings);

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByText('Show Profile')).toBeInTheDocument();
    });

    // Find and click the show profile toggle
    const profileToggle = screen.getByText('Show Profile').closest('div').parentElement.querySelector('button');
    fireEvent.click(profileToggle);

    // Save Changes button should be enabled
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).not.toBeDisabled();
  });

  /**
   * Test: Save changes button enabled when dirty
   * Validates: Requirements 10.6
   */
  it('should enable save button only when settings are modified', async () => {
    settingsAPI.getSettings.mockResolvedValue(mockSettings);

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    // Initially, save button should be disabled
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();

    // Toggle a setting
    const eventToggle = screen.getByText('Event Notifications').closest('div').parentElement.querySelector('button');
    fireEvent.click(eventToggle);

    // Now save button should be enabled
    expect(saveButton).not.toBeDisabled();
  });

  /**
   * Test: Save changes handler
   * Validates: Requirements 10.9
   */
  it('should call updateSettings API when save button is clicked', async () => {
    settingsAPI.getSettings.mockResolvedValue(mockSettings);
    settingsAPI.updateSettings.mockResolvedValue({ data: { success: true } });

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    // Toggle a setting
    const eventToggle = screen.getByText('Event Notifications').closest('div').parentElement.querySelector('button');
    fireEvent.click(eventToggle);

    // Click save button
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should call updateSettings API
    await waitFor(() => {
      expect(settingsAPI.updateSettings).toHaveBeenCalledWith({
        notifications: {
          events: false, // toggled from true
          clubs: true,
          messages: true,
        },
        privacy: {
          showProfile: true,
          showEvents: true,
        },
      });
    });

    // Should display success message
    await waitFor(() => {
      expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument();
    });
  });

  /**
   * Test: Password validation
   * Validates: Requirements 10.11
   */
  it('should validate that new password matches confirm password', async () => {
    settingsAPI.getSettings.mockResolvedValue(mockSettings);

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter current password')).toBeInTheDocument();
    });

    // Fill in password fields with mismatched passwords
    const currentPasswordInput = screen.getByPlaceholderText('Enter current password');
    const newPasswordInput = screen.getByPlaceholderText('Enter new password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');

    fireEvent.change(currentPasswordInput, { target: { value: 'oldPassword123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentPassword123' } });

    // Click change password button
    const changePasswordButton = screen.getByRole('button', { name: 'Change Password' });
    fireEvent.click(changePasswordButton);

    // Should display validation error
    await waitFor(() => {
      expect(screen.getByText('New password and confirm password do not match')).toBeInTheDocument();
    });

    // Should not call changePassword API
    expect(settingsAPI.changePassword).not.toHaveBeenCalled();
  });

  /**
   * Test: Change password handler
   * Validates: Requirements 10.14
   */
  it('should call changePassword API when passwords match', async () => {
    settingsAPI.getSettings.mockResolvedValue(mockSettings);
    settingsAPI.changePassword.mockResolvedValue({ data: { success: true } });

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument();
    });

    // Fill in password fields with matching passwords
    const currentPasswordInput = screen.getByPlaceholderText('Enter current password');
    const newPasswordInput = screen.getByPlaceholderText('Enter new password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');

    fireEvent.change(currentPasswordInput, { target: { value: 'oldPassword123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });

    // Click change password button
    const changePasswordButton = screen.getByRole('button', { name: 'Change Password' });
    fireEvent.click(changePasswordButton);

    // Should call changePassword API
    await waitFor(() => {
      expect(settingsAPI.changePassword).toHaveBeenCalledWith('oldPassword123', 'newPassword123');
    });

    // Should display success message
    await waitFor(() => {
      expect(screen.getByText('Password changed successfully!')).toBeInTheDocument();
    });

    // Password fields should be cleared
    expect(currentPasswordInput.value).toBe('');
    expect(newPasswordInput.value).toBe('');
    expect(confirmPasswordInput.value).toBe('');
  });

  /**
   * Test: Loading state display
   * Validates: Requirements 10.14
   */
  it('should display loading spinner during initial settings fetch', async () => {
    settingsAPI.getSettings.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockSettings), 100))
    );

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    // Should show loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  /**
   * Test: Error state display
   * Validates: Requirements 10.15
   */
  it('should display error message on API failure', async () => {
    const errorMessage = 'Failed to fetch settings';
    settingsAPI.getSettings.mockRejectedValue({
      response: {
        data: {
          message: errorMessage,
        },
      },
    });

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  /**
   * Test: Password change error display
   * Validates: Requirements 10.15
   */
  it('should display error message when password change fails', async () => {
    const errorMessage = 'Current password is incorrect';
    settingsAPI.getSettings.mockResolvedValue(mockSettings);
    settingsAPI.changePassword.mockRejectedValue({
      response: {
        data: {
          message: errorMessage,
        },
      },
    });

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument();
    });

    // Fill in password fields
    const currentPasswordInput = screen.getByPlaceholderText('Enter current password');
    const newPasswordInput = screen.getByPlaceholderText('Enter new password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm new password');

    fireEvent.change(currentPasswordInput, { target: { value: 'wrongPassword' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newPassword123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newPassword123' } });

    // Click change password button
    const changePasswordButton = screen.getByRole('button', { name: 'Change Password' });
    fireEvent.click(changePasswordButton);

    // Should display error message
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  /**
   * Test: Empty password validation
   * Validates: Requirements 10.11
   */
  it('should validate that all password fields are filled', async () => {
    settingsAPI.getSettings.mockResolvedValue(mockSettings);

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument();
    });

    // Fill in only some password fields
    const currentPasswordInput = screen.getByPlaceholderText('Enter current password');
    fireEvent.change(currentPasswordInput, { target: { value: 'oldPassword123' } });

    // Button should be disabled when not all fields are filled
    const changePasswordButton = screen.getByRole('button', { name: 'Change Password' });
    expect(changePasswordButton).toBeDisabled();

    // Should not call changePassword API
    expect(settingsAPI.changePassword).not.toHaveBeenCalled();
  });

  /**
   * Test: Save button disabled state
   * Validates: Requirements 10.6
   */
  it('should disable save button when no changes are made', async () => {
    settingsAPI.getSettings.mockResolvedValue(mockSettings);

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
    });

    // Save button should be disabled initially
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).toBeDisabled();
  });

  /**
   * Test: Multiple toggle switches
   * Validates: Requirements 10.5
   */
  it('should handle multiple toggle switches independently', async () => {
    settingsAPI.getSettings.mockResolvedValue(mockSettings);

    render(
      <TestWrapper>
        <Settings />
      </TestWrapper>
    );

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByText('Event Notifications')).toBeInTheDocument();
    });

    // Toggle multiple settings
    const eventToggle = screen.getByText('Event Notifications').closest('div').parentElement.querySelector('button');
    const clubToggle = screen.getByText('Club Notifications').closest('div').parentElement.querySelector('button');
    const profileToggle = screen.getByText('Show Profile').closest('div').parentElement.querySelector('button');

    fireEvent.click(eventToggle);
    fireEvent.click(clubToggle);
    fireEvent.click(profileToggle);

    // Save Changes button should be enabled
    const saveButton = screen.getByText('Save Changes');
    expect(saveButton).not.toBeDisabled();
  });
});
