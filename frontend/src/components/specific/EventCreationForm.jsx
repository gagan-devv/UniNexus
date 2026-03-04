import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImageUpload from '../common/ImageUpload';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import CustomSelect from '../common/CustomSelect';
import { eventAPI } from '../../services/api';

const EVENT_CATEGORIES = [
  { value: 'Tech', label: 'Tech' },
  { value: 'Cultural', label: 'Cultural' },
  { value: 'Sports', label: 'Sports' },
  { value: 'Workshop', label: 'Workshop' },
  { value: 'Seminar', label: 'Seminar' },
  { value: 'Other', label: 'Other' }
];

const EventCreationForm = ({ clubId, onSuccess, onCancel, initialData = null, isEdit = false }) => {
  const navigate = useNavigate();
  
  // Form state
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    startTime: initialData?.startTime ? new Date(initialData.startTime).toISOString().slice(0, 16) : '',
    endTime: initialData?.endTime ? new Date(initialData.endTime).toISOString().slice(0, 16) : '',
    location: initialData?.location || '',
    category: initialData?.category || '',
    tags: initialData?.tags ? initialData.tags.join(', ') : '',
    maxAttendees: initialData?.maxAttendees || '',
    posterUrl: initialData?.posterUrl || ''
  });

  // Validation and UI state
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showPosterUpload, setShowPosterUpload] = useState(false);

  // Validation functions
  const validateTitle = (value) => {
    if (!value || value.trim().length < 3) {
      return 'Title must be at least 3 characters';
    }
    if (value.length > 200) {
      return 'Title must not exceed 200 characters';
    }
    return null;
  };

  const validateDescription = (value) => {
    if (!value || value.trim().length < 10) {
      return 'Description must be at least 10 characters';
    }
    if (value.length > 2000) {
      return 'Description must not exceed 2000 characters';
    }
    return null;
  };

  const validateStartTime = (value) => {
    if (!value) {
      return 'Start time is required';
    }
    const startDate = new Date(value);
    const now = new Date();
    if (startDate <= now) {
      return 'Start time must be in the future';
    }
    return null;
  };

  const validateEndTime = (value, startTime) => {
    if (!value) {
      return 'End time is required';
    }
    if (!startTime) {
      return null; // Wait for start time to be set
    }
    const endDate = new Date(value);
    const startDate = new Date(startTime);
    if (endDate <= startDate) {
      return 'End time must be after start time';
    }
    return null;
  };

  const validateMaxAttendees = (value) => {
    if (!value) {
      return null; // Optional field
    }
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) {
      return 'Max attendees must be a positive number';
    }
    if (num > 10000) {
      return 'Max attendees must not exceed 10000';
    }
    return null;
  };

  const validateLocation = (value) => {
    if (!value || value.trim().length === 0) {
      return 'Location is required';
    }
    return null;
  };

  const validateCategory = (value) => {
    if (!value) {
      return 'Category is required';
    }
    return null;
  };

  // Real-time validation handler
  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Validate field in real-time
    let fieldError = null;
    switch (field) {
      case 'title':
        fieldError = validateTitle(value);
        break;
      case 'description':
        fieldError = validateDescription(value);
        break;
      case 'startTime':
        fieldError = validateStartTime(value);
        // Also revalidate endTime if it exists
        if (formData.endTime) {
          const endError = validateEndTime(formData.endTime, value);
          setErrors(prev => ({ ...prev, endTime: endError }));
        }
        break;
      case 'endTime':
        fieldError = validateEndTime(value, formData.startTime);
        break;
      case 'maxAttendees':
        fieldError = validateMaxAttendees(value);
        break;
      case 'location':
        fieldError = validateLocation(value);
        break;
      case 'category':
        fieldError = validateCategory(value);
        break;
      default:
        break;
    }
    
    setErrors(prev => ({ ...prev, [field]: fieldError }));
  };

  // Validate all fields
  const validateForm = () => {
    const newErrors = {
      title: validateTitle(formData.title),
      description: validateDescription(formData.description),
      startTime: validateStartTime(formData.startTime),
      endTime: validateEndTime(formData.endTime, formData.startTime),
      location: validateLocation(formData.location),
      category: validateCategory(formData.category),
      maxAttendees: validateMaxAttendees(formData.maxAttendees)
    };

    setErrors(newErrors);
    
    // Return true if no errors
    return !Object.values(newErrors).some(error => error !== null);
  };

  // Check if form is valid for submit button
  const isFormValid = () => {
    return (
      formData.title.trim().length >= 3 &&
      formData.description.trim().length >= 10 &&
      formData.startTime &&
      formData.endTime &&
      formData.location.trim().length > 0 &&
      formData.category &&
      !Object.values(errors).some(error => error !== null)
    );
  };

  // Handle poster upload success
  const handlePosterUploadSuccess = (imageUrl) => {
    setFormData(prev => ({ ...prev, posterUrl: imageUrl }));
    setShowPosterUpload(false);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Prepare base event data
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        location: formData.location.trim(),
        category: formData.category,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : []
      };

      // Add optional fields
      if (formData.maxAttendees) {
        eventData.maxAttendees = parseInt(formData.maxAttendees, 10);
      }
      if (formData.posterUrl) {
        eventData.posterUrl = formData.posterUrl;
      }

      // Create or update event
      let response;
      if (isEdit && initialData?._id) {
        // For update, don't include organizer field
        console.log('Updating event with data:', eventData);
        response = await eventAPI.update(initialData._id, eventData);
      } else {
        // For create, include organizer field
        eventData.organizer = clubId;
        console.log('Creating event with data:', eventData);
        response = await eventAPI.create(eventData);
      }
      
      const eventResult = response.data.data;

      // Call success callback
      if (onSuccess) {
        onSuccess(eventResult);
      }

      // Navigate to event details page (only for create)
      if (!isEdit) {
        navigate(`/events/${eventResult._id}`);
      }
    } catch (err) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} event:`, err);
      setError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} event. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    // Clear form state
    setFormData({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      location: '',
      category: '',
      tags: '',
      maxAttendees: '',
      posterUrl: ''
    });
    setErrors({});
    setError(null);
    
    // Call cancel callback
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Error Message */}
      {error && (
        <ErrorMessage message={error} />
      )}

      {/* Basic Information Section */}
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Event Title <span className="text-red-500">*</span>
          </label>
          <input
            id="event-title"
            type="text"
            value={formData.title}
            onChange={(e) => handleFieldChange('title', e.target.value)}
            className={`w-full px-3.5 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
              errors.title ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="e.g., Tech Workshop: Introduction to AI"
          />
          {errors.title && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <span>⚠</span> {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="event-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="event-description"
            value={formData.description}
            onChange={(e) => handleFieldChange('description', e.target.value)}
            rows={3}
            className={`w-full px-3.5 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors resize-none ${
              errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="An interactive jam session to introduce our new members to you."
          />
          {errors.description && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <span>⚠</span> {errors.description}
            </p>
          )}
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {formData.description.length}/2000 characters
          </p>
        </div>
      </div>

      {/* Date, Time & Location Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2 pb-1">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date & Location</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="event-start-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Start Time <span className="text-red-500">*</span>
            </label>
            <input
              id="event-start-time"
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => handleFieldChange('startTime', e.target.value)}
              className={`w-full px-3.5 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
                errors.startTime ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.startTime && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <span>⚠</span> {errors.startTime}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="event-end-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              End Time <span className="text-red-500">*</span>
            </label>
            <input
              id="event-end-time"
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => handleFieldChange('endTime', e.target.value)}
              className={`w-full px-3.5 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
                errors.endTime ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            />
            {errors.endTime && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <span>⚠</span> {errors.endTime}
              </p>
            )}
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="event-location" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            id="event-location"
            type="text"
            value={formData.location}
            onChange={(e) => handleFieldChange('location', e.target.value)}
            className={`w-full px-3.5 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
              errors.location ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
            placeholder="e.g., Main Auditorium, Building A"
          />
          {errors.location && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <span>⚠</span> {errors.location}
            </p>
          )}
        </div>
      </div>

      {/* Additional Details Section */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2 pb-1">
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Additional Details</span>
          <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
        </div>

        {/* Category and Max Attendees */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="event-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <CustomSelect
              id="event-category"
              value={formData.category}
              onChange={(e) => handleFieldChange('category', e.target.value)}
              options={EVENT_CATEGORIES}
              placeholder="Select category"
              required
            />
            {errors.category && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <span>⚠</span> {errors.category}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="event-max-attendees" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Max Attendees
            </label>
            <input
              id="event-max-attendees"
              type="number"
              min="1"
              max="10000"
              value={formData.maxAttendees}
              onChange={(e) => handleFieldChange('maxAttendees', e.target.value)}
              className={`w-full px-3.5 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
                errors.maxAttendees ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Unlimited"
            />
            {errors.maxAttendees && (
              <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                <span>⚠</span> {errors.maxAttendees}
              </p>
            )}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label htmlFor="event-tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Tags
          </label>
          <input
            id="event-tags"
            type="text"
            value={formData.tags}
            onChange={(e) => handleFieldChange('tags', e.target.value)}
            className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
            placeholder="e.g., networking, beginner-friendly, free-food"
          />
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Separate tags with commas</p>
        </div>

        {/* Event Poster */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Event Poster
          </label>
          {!formData.posterUrl ? (
            !showPosterUpload ? (
              <button
                type="button"
                onClick={() => setShowPosterUpload(true)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
              >
                + Add Poster Image
              </button>
            ) : (
              <div className="space-y-2">
                <ImageUpload
                  uploadEndpoint="/media/events/poster"
                  onUploadSuccess={handlePosterUploadSuccess}
                  allowedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
                  maxSize={5 * 1024 * 1024}
                />
                <button
                  type="button"
                  onClick={() => setShowPosterUpload(false)}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            )
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <img
                  src={formData.posterUrl}
                  alt="Event poster"
                  className="w-full h-40 object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, posterUrl: '' }));
                  setShowPosterUpload(false);
                }}
                className="text-sm text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
              >
                Remove Poster
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={!isFormValid() || submitting}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {submitting ? (
            <>
              <LoadingSpinner size="sm" />
              {isEdit ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            isEdit ? 'Update Event' : 'Create Event'
          )}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={submitting}
          className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EventCreationForm;
