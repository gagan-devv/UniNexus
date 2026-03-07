import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Upload, 
  Edit, 
  Check, 
  Loader2,
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  Globe,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { clubAPI } from '../services/api';
import ImageUpload from '../components/common/ImageUpload';
import ImageDisplay from '../components/common/ImageDisplay';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import CustomSelect from '../components/common/CustomSelect';
import EventCreationForm from '../components/specific/EventCreationForm';
import MemberManagement from '../components/specific/MemberManagement';

const CATEGORY_OPTIONS = [
  { value: 'Academic', label: 'Academic' },
  { value: 'Arts & Culture', label: 'Arts & Culture' },
  { value: 'Business & Entrepreneurship', label: 'Business & Entrepreneurship' },
  { value: 'Community Service', label: 'Community Service' },
  { value: 'Environmental', label: 'Environmental' },
  { value: 'Health & Wellness', label: 'Health & Wellness' },
  { value: 'Hobby & Interest', label: 'Hobby & Interest' },
  { value: 'Political', label: 'Political' },
  { value: 'Professional', label: 'Professional' },
  { value: 'Religious & Spiritual', label: 'Religious & Spiritual' },
  { value: 'Sports & Recreation', label: 'Sports & Recreation' },
  { value: 'Technology', label: 'Technology' },
  { value: 'Other', label: 'Other' }
];

const MyClub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clubData, setClubData] = useState(null);
  const [clubEvents, setClubEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEventCreationModal, setShowEventCreationModal] = useState(false);
  const [actualMemberCount, setActualMemberCount] = useState(0);

  // Form state for editing
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    email: '',
    category: '',
    foundedYear: '',
    socialLinks: {
      instagram: '',
      linkedin: '',
      twitter: '',
      facebook: '',
      website: ''
    }
  });

  // Fetch club data on mount
  useEffect(() => {
    fetchClubData();
  }, []);

  const fetchClubData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get the user's club profile using the /me endpoint
      const response = await clubAPI.getById('me');
      const data = response?.data?.data;
      
      // Check if data is null (no club profile found)
      if (!data) {
        setClubData(null);
        setLoading(false);
        return;
      }
      
      setClubData(data);
      
      // Initialize edit form with current data
      setEditForm({
        name: data.name || '',
        description: data.description || '',
        email: data.email || '',
        category: data.category || '',
        foundedYear: data.foundedYear || '',
        socialLinks: {
          instagram: data.socialLinks?.instagram || '',
          linkedin: data.socialLinks?.linkedin || '',
          twitter: data.socialLinks?.twitter || '',
          facebook: data.socialLinks?.facebook || '',
          website: data.socialLinks?.website || ''
        }
      });

      // Fetch club events
      if (data._id) {
        fetchClubEvents(data._id);
      }
    } catch (err) {
      console.error('Error fetching club data:', err);
      setError(err.response?.data?.message || 'Failed to fetch club data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClubEvents = async (clubId) => {
    setLoadingEvents(true);
    try {
      const response = await clubAPI.getEvents(clubId);
      // The API returns { success: true, data: { events: [...] } }
      const eventsData = response?.data?.data;
      setClubEvents(eventsData?.events || []);
    } catch (err) {
      console.error('Error fetching club events:', err);
      // Don't set error state for events, just log it
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleLogoUploadSuccess = (imageUrl) => {
    setClubData(prev => ({ ...prev, logoUrl: imageUrl }));
    setShowUploadModal(false);
    setSuccessMessage('Logo uploaded successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Reset form to current data if canceling
      setEditForm({
        name: clubData.name || '',
        description: clubData.description || '',
        category: clubData.category || '',
        foundedYear: clubData.foundedYear || '',
        socialLinks: {
          instagram: clubData.socialLinks?.instagram || '',
          linkedin: clubData.socialLinks?.linkedin || '',
          twitter: clubData.socialLinks?.twitter || '',
          facebook: clubData.socialLinks?.facebook || '',
          website: clubData.socialLinks?.website || ''
        }
      });
    }
    setIsEditing(!isEditing);
  };

  const handleFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialLinkChange = (platform, value) => {
    setEditForm(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);

    try {
      await clubAPI.update(editForm);
      setClubData(prev => ({ ...prev, ...editForm }));
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError(err.response?.data?.message || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchClubData();
  };

  const handleEventCreationSuccess = (event) => {
    setShowEventCreationModal(false);
    setSuccessMessage('Event created successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
    // Refresh club data to update event count
    fetchClubData();
    // Navigate to event details page
    navigate(`/events/${event._id}`);
  };

  const handleEventCreationCancel = () => {
    setShowEventCreationModal(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error && !clubData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ErrorMessage 
          message={error} 
          onRetry={handleRetry}
        />
      </div>
    );
  }

  if (!clubData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            No Club Profile Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have a club profile yet. Please create one to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          My Club
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your club profile and view statistics
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

      {/* Club Profile Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <ImageDisplay
              imageUrl={clubData.logoUrl}
              altText={clubData.name}
              size="xl"
              className="rounded-lg"
            />
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload Logo
            </button>
          </div>

          {/* Club Info Section */}
          <div className="flex-1">
            {!isEditing ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {clubData.name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {clubData.category} • Founded {clubData.foundedYear}
                    </p>
                  </div>
                  <button
                    onClick={handleEditToggle}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </button>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {clubData.description}
                </p>

                {/* Social Links */}
                {clubData.socialLinks && (
                  <div className="flex gap-3 mt-4">
                    {clubData.socialLinks.instagram && (
                      <a
                        href={clubData.socialLinks.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Instagram"
                        className="text-gray-600 hover:text-pink-600 transition-colors"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}
                    {clubData.socialLinks.linkedin && (
                      <a
                        href={clubData.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="LinkedIn"
                        className="text-gray-600 hover:text-blue-600 transition-colors"
                      >
                        <Linkedin className="h-5 w-5" />
                      </a>
                    )}
                    {clubData.socialLinks.twitter && (
                      <a
                        href={clubData.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Twitter"
                        className="text-gray-600 hover:text-blue-400 transition-colors"
                      >
                        <Twitter className="h-5 w-5" />
                      </a>
                    )}
                    {clubData.socialLinks.facebook && (
                      <a
                        href={clubData.socialLinks.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Facebook"
                        className="text-gray-600 hover:text-blue-700 transition-colors"
                      >
                        <Facebook className="h-5 w-5" />
                      </a>
                    )}
                    {clubData.socialLinks.website && (
                      <a
                        href={clubData.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Website"
                        className="text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        <Globe className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {/* Edit Form */}
                <div>
                  <label htmlFor="club-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Club Name
                  </label>
                  <input
                    id="club-name"
                    type="text"
                    value={editForm.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label htmlFor="club-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    id="club-description"
                    value={editForm.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="club-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <input
                      id="club-category"
                      type="text"
                      value={editForm.category}
                      onChange={(e) => handleFormChange('category', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="club-founded-year" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Founded Year
                    </label>
                    <input
                      id="club-founded-year"
                      type="number"
                      value={editForm.foundedYear}
                      onChange={(e) => handleFormChange('foundedYear', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Social Links */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Social Links
                  </label>
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder="Instagram URL"
                      value={editForm.socialLinks.instagram}
                      onChange={(e) => handleSocialLinkChange('instagram', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="url"
                      placeholder="LinkedIn URL"
                      value={editForm.socialLinks.linkedin}
                      onChange={(e) => handleSocialLinkChange('linkedin', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="url"
                      placeholder="Twitter URL"
                      value={editForm.socialLinks.twitter}
                      onChange={(e) => handleSocialLinkChange('twitter', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="url"
                      placeholder="Facebook URL"
                      value={editForm.socialLinks.facebook}
                      onChange={(e) => handleSocialLinkChange('facebook', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="url"
                      placeholder="Website URL"
                      value={editForm.socialLinks.website}
                      onChange={(e) => handleSocialLinkChange('website', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleEditToggle}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Members
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {actualMemberCount}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Events
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {clubData.stats?.eventCount || 0}
          </p>
          <button
            onClick={() => setShowEventCreationModal(true)}
            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Engagement
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {clubData.stats?.engagementScore?.toFixed(1) || '0.0'}
          </p>
        </div>
      </div>

      {/* Club Events Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Club Events
          </h2>
          <button 
            onClick={() => setShowEventCreationModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Event
          </button>
        </div>

        {loadingEvents ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : clubEvents && clubEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clubEvents.map((event) => (
              <div
                key={event._id}
                onClick={() => navigate(`/events/${event._id}`)}
                className="bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                {event.posterUrl ? (
                  <img
                    src={event.posterUrl}
                    alt={event.title}
                    className="w-full h-32 object-cover"
                  />
                ) : (
                  <div className="w-full h-32 bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                    <Calendar className="h-12 w-12 text-white opacity-50" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                    {event.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                    {event.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(event.startTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  {event.category && (
                    <div className="mt-2">
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        {event.category}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No events yet
            </p>
            <button
              onClick={() => setShowEventCreationModal(true)}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Your First Event
            </button>
          </div>
        )}
      </div>

      {/* Members Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <MemberManagement 
          clubId={clubData._id} 
          isAdmin={true}
          onMemberCountChange={setActualMemberCount}
        />
      </div>

      {/* Upload Logo Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Upload Club Logo
            </h3>
            <ImageUpload
              uploadEndpoint={`/media/clubs/${clubData._id}/logo`}
              onUploadSuccess={handleLogoUploadSuccess}
              allowedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']}
              maxSize={5 * 1024 * 1024}
            />
            <button
              onClick={() => setShowUploadModal(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Event Creation Modal */}
      {showEventCreationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 rounded-t-xl">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Create New Event
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Fill in the details below to create an event for your club
              </p>
            </div>
            <div className="px-6 py-5">
              <EventCreationForm
                clubId={clubData._id}
                onSuccess={handleEventCreationSuccess}
                onCancel={handleEventCreationCancel}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyClub;
