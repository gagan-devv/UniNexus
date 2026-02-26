import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Lock, Bell, Shield, Check, Loader2 } from 'lucide-react';
import { settingsAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const Settings = () => {
  // State management
  const [settings, setSettings] = useState({
    notifications: {
      events: true,
      clubs: true,
      messages: true,
    },
    privacy: {
      showProfile: true,
      showEvents: true,
    },
  });
  const [originalSettings, setOriginalSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Password change state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [changingPassword, setChangingPassword] = useState(false);

  // Check if settings have been modified
  const isDirty = originalSettings && JSON.stringify(settings) !== JSON.stringify(originalSettings);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await settingsAPI.getSettings();
      const data = response?.data?.data || {
        notifications: { events: true, clubs: true, messages: true },
        privacy: { showProfile: true, showEvents: true },
      };
      setSettings(data);
      setOriginalSettings(data);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(err.response?.data?.message || 'Failed to fetch settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle notification preference toggle
  const handleNotificationToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key],
      },
    }));
  };

  // Handle privacy preference toggle
  const handlePrivacyToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      privacy: {
        ...prev.privacy,
        [key]: !prev.privacy[key],
      },
    }));
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await settingsAPI.updateSettings(settings);
      setOriginalSettings(settings);
      setSuccessMessage('Settings saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError(err.response?.data?.message || 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle password form change
  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setPasswordError(null);
  };

  // Handle change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match');
      return;
    }

    // Validate password is not empty
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setPasswordError('Please fill in all password fields');
      return;
    }

    setChangingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      await settingsAPI.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordSuccess('Password changed successfully!');
      
      // Clear form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError(err.response?.data?.message || 'Failed to change password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Retry on error
  const handleRetry = () => {
    setError(null);
    fetchSettings();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-blue-600" />
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your account preferences and security
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={handleRetry} />
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <Check className="h-5 w-5 text-green-600" />
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Notification Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Notification Preferences
          </h2>
        </div>

        <div className="space-y-4">
          {/* Events Notifications */}
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Event Notifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive notifications about new events and RSVPs
              </p>
            </div>
            <button
              onClick={() => handleNotificationToggle('events')}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${settings.notifications.events ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${settings.notifications.events ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Clubs Notifications */}
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Club Notifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive notifications about club updates and announcements
              </p>
            </div>
            <button
              onClick={() => handleNotificationToggle('clubs')}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${settings.notifications.clubs ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${settings.notifications.clubs ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Messages Notifications */}
          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Message Notifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive notifications about new messages
              </p>
            </div>
            <button
              onClick={() => handleNotificationToggle('messages')}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${settings.notifications.messages ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${settings.notifications.messages ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Preferences */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Privacy Preferences
          </h2>
        </div>

        <div className="space-y-4">
          {/* Show Profile */}
          <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Show Profile
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Allow other users to view your profile
              </p>
            </div>
            <button
              onClick={() => handlePrivacyToggle('showProfile')}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${settings.privacy.showProfile ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${settings.privacy.showProfile ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>

          {/* Show Events */}
          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Show Events
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Allow others to see events you're attending
              </p>
            </div>
            <button
              onClick={() => handlePrivacyToggle('showEvents')}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${settings.privacy.showEvents ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}
              `}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${settings.privacy.showEvents ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Save Changes Button */}
      <div className="mb-6">
        <button
          onClick={handleSaveChanges}
          disabled={!isDirty || saving}
          className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

      {/* Change Password Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Change Password
          </h2>
        </div>

        {/* Password Error Message */}
        {passwordError && (
          <div className="mb-4">
            <ErrorMessage message={passwordError} />
          </div>
        )}

        {/* Password Success Message */}
        {passwordSuccess && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-700">{passwordSuccess}</p>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter current password"
            />
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter new password"
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Confirm new password"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {changingPassword ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Changing Password...
              </span>
            ) : (
              'Change Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
