import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clubAPI } from '../services/api';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import ImageDisplay from '../components/common/ImageDisplay';

const ClubDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [club, setClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    fetchClubDetails();
  }, [id]);

  const fetchClubDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      setNotFound(false);

      const response = await clubAPI.getById(id);
      const clubData = response.data.data;
      
      setClub(clubData);
      setMemberCount(clubData.stats?.memberCount || clubData.memberCount || 0);

      // Fetch club events
      try {
        const eventsResponse = await clubAPI.getEvents(id);
        const eventsData = eventsResponse.data.data;
        setEvents(eventsData.events || []);
      } catch (err) {
        console.error('Error fetching club events:', err);
      }

      // Fetch club members
      try {
        const membersResponse = await clubAPI.getMembers(id);
        const membersData = membersResponse.data.data;
        const membersList = membersData.members || [];
        
        setMembers(membersList.map(member => {
          const userData = member.userId;
          return {
            id: userData._id,
            name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.username || 'Anonymous',
            avatar: userData.avatarUrl || null
          };
        }));

        // Check if authenticated user is a member
        if (isAuthenticated && user) {
          const userMembership = membersList.find(member => 
            member.userId._id === user._id
          );
          setIsMember(!!userMembership);
        }
      } catch (err) {
        console.error('Error fetching club members:', err);
      }
    } catch (err) {
      console.error('Error fetching club details:', err);
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(err.response?.data?.message || 'Failed to load club details');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClub = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Optimistic update
    const previousIsMember = isMember;
    const previousMemberCount = memberCount;
    const previousMembers = [...members];
    
    setIsMember(true);
    setMemberCount(prev => prev + 1);
    setMembers(prev => [...prev, {
      id: user._id,
      name: `${user.firstName} ${user.lastName}`,
      avatar: user.avatarUrl || null
    }]);

    try {
      setMembershipLoading(true);
      await clubAPI.join(id);
    } catch (err) {
      // Rollback on error
      setIsMember(previousIsMember);
      setMemberCount(previousMemberCount);
      setMembers(previousMembers);
      console.error('Error joining club:', err);
      setError(err.response?.data?.message || 'Failed to join club');
    } finally {
      setMembershipLoading(false);
    }
  };

  const handleLeaveClub = async () => {
    // Optimistic update
    const previousIsMember = isMember;
    const previousMemberCount = memberCount;
    const previousMembers = [...members];
    
    setIsMember(false);
    setMemberCount(prev => Math.max(0, prev - 1));
    setMembers(prev => prev.filter(member => member.id !== user._id));

    try {
      setMembershipLoading(true);
      await clubAPI.leave(id);
    } catch (err) {
      // Rollback on error
      setIsMember(previousIsMember);
      setMemberCount(previousMemberCount);
      setMembers(previousMembers);
      console.error('Error leaving club:', err);
      setError(err.response?.data?.message || 'Failed to leave club');
    } finally {
      setMembershipLoading(false);
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
            Club not found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-8">
            The club you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/clubs')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Clubs
          </button>
        </div>
      </div>
    );
  }

  if (error && !club) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <ErrorMessage message={error} onRetry={fetchClubDetails} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}
        
        {/* Club Logo */}
        <div className="mb-6 flex justify-center">
          <ImageDisplay
            imageUrl={club.logoUrl}
            altText={club.name}
            size="lg"
            className="rounded-lg shadow-lg"
          />
        </div>

        {/* Club Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {club.name}
              </h1>
              {club.category && (
                <span className="inline-block px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                  {club.category}
                </span>
              )}
              {club.isVerified && (
                <span className="inline-block ml-2 px-3 py-1 text-sm font-medium text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300 rounded-full">
                  Verified
                </span>
              )}
            </div>
            
            {/* Join/Leave Button */}
            <div className="ml-4">
              {!isAuthenticated ? (
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Login to Join
                </button>
              ) : isMember ? (
                <button
                  onClick={handleLeaveClub}
                  disabled={membershipLoading}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {membershipLoading ? 'Processing...' : 'Leave Club'}
                </button>
              ) : (
                <button
                  onClick={handleJoinClub}
                  disabled={membershipLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {membershipLoading ? 'Processing...' : 'Join Club'}
                </button>
              )}
            </div>
          </div>

          {/* Club Description */}
          <p className="text-gray-700 dark:text-gray-300 mb-6 whitespace-pre-wrap">
            {club.description}
          </p>

          {/* Club Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {club.foundedYear && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Founded
                </h3>
                <p className="text-gray-900 dark:text-white">
                  {club.foundedYear}
                </p>
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Members
              </h3>
              <p className="text-gray-900 dark:text-white">
                {memberCount}
              </p>
            </div>
            
            {club.email && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                  Contact Email
                </h3>
                <p className="text-gray-900 dark:text-white">
                  {club.email}
                </p>
              </div>
            )}
            
            {club.stats && (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Events Organized
                  </h3>
                  <p className="text-gray-900 dark:text-white">
                    {club.stats.eventCount || 0}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    Engagement Score
                  </h3>
                  <p className="text-gray-900 dark:text-white">
                    {Math.round(club.stats.engagementScore || 0)}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Social Media Links */}
          {club.socialLinks && Object.keys(club.socialLinks).some(key => club.socialLinks[key]) && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                Social Media
              </h3>
              <div className="flex flex-wrap gap-3">
                {club.socialLinks.instagram && (
                  <a
                    href={club.socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Instagram
                  </a>
                )}
                {club.socialLinks.linkedin && (
                  <a
                    href={club.socialLinks.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    LinkedIn
                  </a>
                )}
                {club.socialLinks.twitter && (
                  <a
                    href={club.socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Twitter
                  </a>
                )}
                {club.socialLinks.facebook && (
                  <a
                    href={club.socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Facebook
                  </a>
                )}
                {club.socialLinks.medium && (
                  <a
                    href={club.socialLinks.medium}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Medium
                  </a>
                )}
                {club.socialLinks.reddit && (
                  <a
                    href={club.socialLinks.reddit}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Reddit
                  </a>
                )}
                {club.socialLinks.website && (
                  <a
                    href={club.socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Website
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        {events.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Upcoming Events ({events.length})
            </h2>
            <div className="space-y-4">
              {events.map((event) => (
                <Link
                  key={event._id}
                  to={`/events/${event._id}`}
                  className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  {event.posterUrl && (
                    <ImageDisplay
                      imageUrl={event.posterUrl}
                      altText={event.title}
                      size="sm"
                      className="flex-shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {formatDate(event.startTime)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {event.location}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Members List */}
        {members.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Members ({members.length})
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <ImageDisplay
                    imageUrl={member.avatar}
                    altText={member.name}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {member.name}
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

export default ClubDetails;
