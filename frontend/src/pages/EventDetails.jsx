import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventAPI, rsvpAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ImageDisplay from '../components/common/ImageDisplay';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [hasRsvp, setHasRsvp] = useState(false);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [attendees, setAttendees] = useState([]);

  useEffect(() => {
    fetchEventDetails();
  }, [id]);

  const fetchEventDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      setNotFound(false);

      const response = await eventAPI.getById(id);
      const eventData = response.data.data;
      
      setEvent(eventData);
      setAttendeeCount(eventData.stats?.attendeeCount || 0);

      // Fetch RSVPs to display attendee list (available to everyone)
      try {
        const rsvpResponse = await rsvpAPI.getEventRSVPs(id);
        const rsvps = rsvpResponse.data.data;
        
        // Update attendee count with actual RSVP count
        setAttendeeCount(rsvps.length);
        
        setAttendees(rsvps.map(rsvp => ({
          id: rsvp.userId,
          name: rsvp.userName || 'Anonymous',
          avatar: rsvp.userAvatar || null
        })));
        
        // Check if authenticated user has RSVP'd
        if (isAuthenticated && user) {
          const userRsvp = rsvps.find(rsvp => rsvp.userId === user._id);
          setHasRsvp(!!userRsvp);
        }
      } catch (err) {
        console.error('Error fetching RSVPs:', err);
      }
    } catch (err) {
      console.error('Error fetching event details:', err);
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(err.response?.data?.message || 'Failed to load event details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRsvp = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setRsvpLoading(true);
      await rsvpAPI.create(id, 'going');
      setHasRsvp(true);
      setAttendeeCount(prev => prev + 1);
      
      // Add current user to attendees list
      setAttendees(prev => [...prev, {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        avatar: user.avatarUrl || null
      }]);
    } catch (err) {
      console.error('Error creating RSVP:', err);
      setError(err.response?.data?.message || 'Failed to RSVP');
    } finally {
      setRsvpLoading(false);
    }
  };

  const handleCancelRsvp = async () => {
    try {
      setRsvpLoading(true);
      await rsvpAPI.delete(id);
      setHasRsvp(false);
      setAttendeeCount(prev => Math.max(0, prev - 1));
      
      // Remove current user from attendees list
      setAttendees(prev => prev.filter(attendee => attendee.id !== user._id));
    } catch (err) {
      console.error('Error canceling RSVP:', err);
      setError(err.response?.data?.message || 'Failed to cancel RSVP');
    } finally {
      setRsvpLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Event not found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The event you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/events')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <ErrorMessage message={error} onRetry={fetchEventDetails} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        
        {/* Event Poster */}
        <div className="mb-6">
          <ImageDisplay
            imageUrl={event.posterUrl}
            altText={event.title}
            size="full"
            className="rounded-lg shadow-lg"
          />
        </div>

        {/* Event Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {event.title}
              </h1>
              <span className="inline-block px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                {event.category}
              </span>
            </div>
            
            {/* RSVP Button */}
            <div className="ml-4">
              {!isAuthenticated ? (
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Login to RSVP
                </button>
              ) : hasRsvp ? (
                <button
                  onClick={handleCancelRsvp}
                  disabled={rsvpLoading}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rsvpLoading ? 'Processing...' : 'Cancel RSVP'}
                </button>
              ) : (
                <button
                  onClick={handleRsvp}
                  disabled={rsvpLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rsvpLoading ? 'Processing...' : 'RSVP'}
                </button>
              )}
            </div>
          </div>

          {/* Event Description */}
          <p className="text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-wrap">
            {event.description}
          </p>

          {/* Event Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Start Time
              </h3>
              <p className="text-gray-900 dark:text-white">
                {formatDate(event.startTime)}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                End Time
              </h3>
              <p className="text-gray-900 dark:text-white">
                {formatDate(event.endTime)}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Location
              </h3>
              <p className="text-gray-900 dark:text-white">
                {event.location}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Attendees
              </h3>
              <p className="text-gray-900 dark:text-white">
                {attendeeCount}
                {event.maxAttendees && ` / ${event.maxAttendees}`}
              </p>
            </div>
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Organizing Club */}
          {event.organizer && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                Organized by
              </h3>
              <Link
                to={`/clubs/${event.organizer._id}`}
                className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 p-3 rounded-lg transition-colors"
              >
                <ImageDisplay
                  imageUrl={event.organizer.logoUrl}
                  altText={event.organizer.name}
                  size="sm"
                  className="flex-shrink-0"
                />
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {event.organizer.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {event.organizer.email}
                  </p>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Attendees List */}
        {attendees.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Attendees ({attendees.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {attendees.map((attendee) => (
                <div
                  key={attendee.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <ImageDisplay
                    imageUrl={attendee.avatar}
                    altText={attendee.name}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {attendee.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventDetails;
