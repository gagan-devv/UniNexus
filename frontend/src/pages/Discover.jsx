import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Calendar, MapPin, Users, Building2 } from 'lucide-react';
import { discoverAPI } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ImageDisplay from '../components/common/ImageDisplay';

const Discover = () => {
  const navigate = useNavigate();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    type: 'all',
    category: '',
    dateRange: 'upcoming'
  });
  const [results, setResults] = useState({
    events: [],
    clubs: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debounce search query by 300ms
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Categories for filter dropdown
  const categories = ['Academic', 'Social', 'Workshop', 'Competition', 'Sports', 'Cultural', 'Technology'];
  const dateRanges = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'upcoming', label: 'Upcoming' }
  ];

  // Fetch discover results
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = {
          ...(debouncedSearchQuery && { query: debouncedSearchQuery }),
          type: filters.type,
          ...(filters.category && { category: filters.category }),
          dateRange: filters.dateRange
        };

        const response = await discoverAPI.getResults(params);
        setResults({
          events: response?.data?.data?.events || [],
          clubs: response?.data?.data?.clubs || []
        });
      } catch (err) {
        console.error('Error fetching discover results:', err);
        setError(err.response?.data?.message || 'Failed to fetch results. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [debouncedSearchQuery, filters]);

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Navigate to event details
  const handleEventClick = (eventId) => {
    navigate(`/events/${eventId}`);
  };

  // Navigate to club details
  const handleClubClick = (clubId) => {
    navigate(`/clubs/${clubId}`);
  };

  // Retry on error
  const handleRetry = () => {
    setError(null);
    setFilters({ ...filters });
  };

  const showEvents = filters.type === 'all' || filters.type === 'events';
  const showClubs = filters.type === 'all' || filters.type === 'clubs';

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Discover</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Find events and clubs that match your interests
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Search Input */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search events and clubs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Filter className="inline h-4 w-4 mr-1" />
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All</option>
              <option value="events">Events</option>
              <option value="clubs">Clubs</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date Range
            </label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {dateRanges.map((range) => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <ErrorMessage message={error} onRetry={handleRetry} />
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          {/* Events Section */}
          {showEvents && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Events {results.events.length > 0 && `(${results.events.length})`}
              </h2>
              
              {results.events.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.events.map((event) => (
                    <div
                      key={event._id}
                      onClick={() => handleEventClick(event._id)}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                    >
                      <ImageDisplay
                        imageUrl={event.posterUrl}
                        altText={event.title}
                        className="w-full h-48 object-cover"
                      />
                      
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold rounded-full">
                            {event.category}
                          </span>
                        </div>

                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                          {event.title}
                        </h3>

                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                          {event.description}
                        </p>

                        <div className="space-y-2">
                          <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                            <Calendar className="h-4 w-4 mr-2" />
                            {formatDate(event.startTime)} at {formatTime(event.startTime)}
                          </div>
                          <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                            <MapPin className="h-4 w-4 mr-2" />
                            {event.location}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No events found</p>
                </div>
              )}
            </div>
          )}

          {/* Clubs Section */}
          {showClubs && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Clubs {results.clubs.length > 0 && `(${results.clubs.length})`}
              </h2>
              
              {results.clubs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.clubs.map((club) => (
                    <div
                      key={club._id}
                      onClick={() => handleClubClick(club._id)}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                          <ImageDisplay
                            imageUrl={club.logoUrl}
                            altText={club.name}
                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">
                              {club.name}
                            </h3>
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-semibold rounded-full">
                              {club.category}
                            </span>
                          </div>
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                          {club.description}
                        </p>

                        <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                          <Users className="h-4 w-4 mr-2" />
                          {club.memberCount || 0} members
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No clubs found</p>
                </div>
              )}
            </div>
          )}

          {/* No Results Message */}
          {results.events.length === 0 && results.clubs.length === 0 && (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No results found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Discover;
