import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { eventAPI, clubAPI } from '../services/api';
import { Calendar, Users, MapPin, Clock, ArrowRight, Star, TrendingUp } from 'lucide-react';

const Home = () => {
  const { isAuthenticated, user } = useAuth();
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [featuredClubs, setFeaturedClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalClubs: 0,
    activeUsers: 0
  });

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [eventsResponse, clubsResponse] = await Promise.all([
          eventAPI.getAll({ limit: 6, upcoming: true }),
          clubAPI.getAll({ limit: 6, verified: true })
        ]);

        // Handle events response
        const eventsData = eventsResponse?.data?.data;
        setUpcomingEvents(eventsData?.events || []);
        
        // Handle clubs response
        const clubsData = clubsResponse?.data?.data;
        setFeaturedClubs(clubsData?.clubs || []);
        
        setStats({
          totalEvents: eventsData?.pagination?.total || 0,
          totalClubs: clubsData?.pagination?.total || 0,
          activeUsers: 1250 // Mock data for now
        });
      } catch (error) {
        console.error('Error fetching home data:', error);
        // Set empty data on error
        setUpcomingEvents([]);
        setFeaturedClubs([]);
        setStats({
          totalEvents: 0,
          totalClubs: 0,
          activeUsers: 1250
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHomeData();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl text-white">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Welcome to UniNexus
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Discover campus events, connect with clubs, and build your university community
          </p>
          
          {isAuthenticated ? (
            <div className="space-y-4">
              <p className="text-lg">
                Welcome back, {user?.firstName || user?.username}! 👋
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/events"
                  className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Browse Events
                </Link>
                <Link
                  to="/clubs"
                  className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                >
                  Explore Clubs
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                Get Started
              </Link>
              <Link
                to="/login"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.totalEvents}+</h3>
          <p className="text-gray-600">Active Events</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.totalClubs}+</h3>
          <p className="text-gray-600">Student Clubs</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border text-center">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">{stats.activeUsers}+</h3>
          <p className="text-gray-600">Active Students</p>
        </div>
      </section>

      {/* Upcoming Events */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Upcoming Events</h2>
          <Link
            to="/events"
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            View all events
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
        
        {upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingEvents.map((event) => (
              <div key={event._id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                {event.posterUrl && (
                  <img
                    src={event.posterUrl}
                    alt={event.title}
                    className="w-full h-48 object-cover rounded-t-xl"
                  />
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                      {event.category}
                    </span>
                    <div className="flex items-center text-gray-500 text-sm">
                      <Clock className="h-4 w-4 mr-1" />
                      {formatDate(event.startTime)}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {event.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {event.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-gray-500 text-sm">
                      <MapPin className="h-4 w-4 mr-1" />
                      {event.location}
                    </div>
                    <Link
                      to={`/events/${event._id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      Learn more
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming events</h3>
            <p className="text-gray-600">Check back later for new events!</p>
          </div>
        )}
      </section>

      {/* Featured Clubs */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Featured Clubs</h2>
          <Link
            to="/clubs"
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            View all clubs
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>
        
        {featuredClubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredClubs.map((club) => (
              <div key={club._id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow p-6">
                <div className="flex items-center mb-4">
                  {club.logoUrl ? (
                    <img
                      src={club.logoUrl}
                      alt={club.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-gray-400" />
                    </div>
                  )}
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{club.name}</h3>
                    {club.isVerified && (
                      <div className="flex items-center text-blue-600 text-sm">
                        <Star className="h-4 w-4 mr-1" />
                        Verified
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {club.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                    {club.category || 'General'}
                  </span>
                  <Link
                    to={`/clubs/${club._id}`}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    View club
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clubs available</h3>
            <p className="text-gray-600">Clubs will appear here once they're registered!</p>
          </div>
        )}
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="bg-gray-900 text-white rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of students discovering amazing campus events and communities
          </p>
          <Link
            to="/register"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors inline-flex items-center"
          >
            Create your account
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </section>
      )}
    </div>
  );
};

export default Home;