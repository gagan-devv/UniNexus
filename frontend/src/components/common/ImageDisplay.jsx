import { useState } from 'react';

const ImageDisplay = ({
  imageUrl,
  altText = 'Image',
  size = 'md',
  className = '',
  lazy = true, // Enable lazy loading by default
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
    xl: 'w-64 h-64',
    full: 'w-full h-auto',
  };

  const placeholderSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23e5e7eb'/%3E%3Cpath d='M200 150c-27.6 0-50 22.4-50 50s22.4 50 50 50 50-22.4 50-50-22.4-50-50-50zm0 80c-16.5 0-30-13.5-30-30s13.5-30 30-30 30 13.5 30 30-13.5 30-30 30z' fill='%239ca3af'/%3E%3Cpath d='M280 280H120l40-60 30 40 40-60z' fill='%239ca3af'/%3E%3C/svg%3E`;

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const displayUrl = !imageUrl || imageError ? placeholderSvg : imageUrl;

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {imageLoading && imageUrl && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-600"></div>
        </div>
      )}
      <img
        src={displayUrl}
        alt={altText}
        loading={lazy ? 'lazy' : 'eager'}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className={`${sizeClasses[size]} object-cover rounded ${
          imageLoading ? 'opacity-0' : 'opacity-100'
        } transition-opacity duration-300`}
      />
    </div>
  );
};

export default ImageDisplay;
