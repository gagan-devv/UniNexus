import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2, ArrowLeft } from 'lucide-react';
import { clubAPI } from '../services/api';
import CustomSelect from '../components/common/CustomSelect';

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

const ClubCreation = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    category: '',
    foundedYear: new Date().getFullYear(),
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await clubAPI.create(formData);
      
      if (response.data.success) {
        // Navigate to My Club page
        navigate('/my-club');
      }
    } catch (err) {
      console.error('Error creating club:', err);
      setError(err.response?.data?.message || 'Failed to create club. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/my-club')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Create Club Profile
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Fill in the details below to register your club on UniNexus
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
        {/* Club Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Club Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="e.g., Computer Science Club"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            id="description"
            required
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Tell us about your club..."
            rows={5}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Contact Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="club@university.edu"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* Category and Founded Year */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <CustomSelect
              id="category"
              options={CATEGORY_OPTIONS}
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              placeholder="Select a category"
            />
          </div>

          <div>
            <label htmlFor="foundedYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Founded Year
            </label>
            <input
              id="foundedYear"
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={formData.foundedYear}
              onChange={(e) => handleChange('foundedYear', parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating Club...
              </>
            ) : (
              <>
                <Users className="h-5 w-5" />
                Create Club
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => navigate('/my-club')}
            disabled={loading}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          <strong>Note:</strong> After creating your club profile, it will be pending approval by a super admin. 
          You'll be notified once your club is approved and you can start creating events.
        </p>
      </div>
    </div>
  );
};

export default ClubCreation;
