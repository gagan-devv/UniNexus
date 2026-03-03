import { useState } from 'react';
import ImageUpload from '../common/ImageUpload';
import ImageDisplay from '../common/ImageDisplay';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const ProfilePictureUpload = ({ currentAvatarUrl, onUploadSuccess }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const handleUploadSuccess = (imageUrl) => {
    setSuccessMessage('Profile picture updated successfully!');
    setShowUploadModal(false);
    setUploading(false);
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMessage(null), 3000);
    
    // Call parent callback with new URL
    if (onUploadSuccess) {
      onUploadSuccess(imageUrl);
    }
  };

  const handleOpenModal = () => {
    setShowUploadModal(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {/* Current Avatar Display */}
      <div className="flex items-center gap-6">
        <ImageDisplay
          imageUrl={currentAvatarUrl}
          altText="Profile picture"
          size="lg"
          className="rounded-full"
        />
        <div>
          <button
            onClick={handleOpenModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Change Picture
          </button>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            JPG, PNG or WebP. Max size 5MB.
          </p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => setError(null)}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Upload Profile Picture
              </h3>
              <button
                onClick={handleCloseModal}
                disabled={uploading}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {uploading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-gray-600 dark:text-gray-400">Uploading your profile picture...</p>
              </div>
            ) : (
              <ImageUpload
                uploadEndpoint="/media/users/profile-picture"
                onUploadSuccess={handleUploadSuccess}
                allowedTypes={['image/jpeg', 'image/jpg', 'image/png', 'image/webp']}
                maxSize={5 * 1024 * 1024}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePictureUpload;
