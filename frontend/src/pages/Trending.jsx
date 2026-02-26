import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Calendar, MapPin, Users, Building2 } from 'lucide-react';
import { trendingAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ImageDisplay from '../components/common/ImageDisplay';

const Trending = () => {
  const navigate = useNavigate();
  
  // State management
  const [trendingData, setTrendingData] = useState({
    events: [],
    clubs: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch trending data on mount
  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await trendingAPI.getTrending();
        setTrendingData({
          events: response?.data?.data?.events || [],
          clubs: response?.data?.data?.clubs || []
        });
      } catch (err) {
        console.error('Error fetching trending data:', err);
        setError(err.response?.data?.message || 'Failed to fetch trending data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

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
    // Trigger re-fetch by updating state
    setTrendingData({ events: [], clubs: [] });
    // Re-run the effect
    const fetchTrending = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await trendingAPI.getTrending();
        setTrendingData({
          events: response?.data?.data?.events || [],
          clubs: response?.data?.data?.clubs || []
        });
      } catch (err) {
        console.error('Error fetching trending data:', err);
        setError(err.response?.data?.message || 'Failed to fetch trending data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <TrendingUp className="h-10 w-10 text-blue-600" />
          Trending
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Discover what's popular on campus right now
        </p>
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
          {/* Trending Events Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              Trending Events
              {trendingData.events.length > 0 && (
                <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                  ({trendingData.events.length})
                </span>
              )}
            </h2>
            
            {trendingData.events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingData.events.map((event) => (
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
                        <div className="flex items-center text-orange-600 dark:text-orange-400">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          <span className="text-xs font-semibold">Trending</span>
                        </div>
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
                        <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                          <Users className="h-4 w-4 mr-2" />
                          {event.stats?.attendeeCount || 0} attendees
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No trending events at the moment</p>
              </div>
            )}
          </div>

          {/* Trending Clubs Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-6 w-6 text-purple-600" />
              Trending Clubs
              {trendingData.clubs.length > 0 && (
                <span className="text-lg font-normal text-gray-500 dark:text-gray-400">
                  ({trendingData.clubs.length})
                </span>
              )}
            </h2>
            
            {trendingData.clubs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingData.clubs.map((club) => (
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
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 text-xs font-semibold rounded-full">
                              {club.category}
                            </span>
                            <div className="flex items-center text-orange-600 dark:text-orange-400">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              <span className="text-xs font-semibold">Trending</span>
                            </div>
                          </div>
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
                <p className="text-gray-600 dark:text-gray-400">No trending clubs at the moment</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Trending;
