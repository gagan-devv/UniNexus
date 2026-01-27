import { connectRedis, disconnectRedis, getRedisClient } from '../src/config/redis';
import { CacheService } from '../src/services/cacheService';
import { Event } from '../src/models/Event';
import { ClubProfile } from '../src/models/ClubProfile';
import { User } from '../src/models/User';
import mongoose from 'mongoose';

describe('Cache Integration Tests', () => {
  let cacheService: CacheService;

  beforeAll(async () => {
    // Connect to Redis (MongoDB is already connected via setup.ts)
    await connectRedis();
    const redisClient = getRedisClient();
    cacheService = new CacheService(redisClient);
  });

  afterAll(async () => {
    // Disconnect from Redis
    await disconnectRedis();
  });

  beforeEach(async () => {
    // Clear all test data
    await Event.deleteMany({});
    await ClubProfile.deleteMany({});
    await User.deleteMany({});
    
    // Clear Redis cache
    const redisClient = getRedisClient();
    if (redisClient) {
      await redisClient.flushdb();
    }
  });

  describe('Event Caching Integration', () => {
    it('should cache event listings on first request and return cached data on second request', async () => {
      // Create test user and club
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User'
      });

      const club = await ClubProfile.create({
        user: user._id,
        name: 'Test Club',
        description: 'Test Description',
        email: 'club@example.com'
      });

      // Create test events
      const event1 = await Event.create({
        title: 'Test Event 1',
        description: 'Description 1',
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        endTime: new Date(Date.now() + 90000000), // Day after tomorrow
        location: 'Location 1',
        organizer: club._id,
        isPublic: true,
        category: 'Tech'
      });

      const event2 = await Event.create({
        title: 'Test Event 2',
        description: 'Description 2',
        startTime: new Date(Date.now() + 172800000), // 2 days from now
        endTime: new Date(Date.now() + 176400000), // 2 days + 1 hour from now
        location: 'Location 2',
        organizer: club._id,
        isPublic: true,
        category: 'Tech'
      });

      const filters = {
        category: 'Tech',
        limit: 20,
        offset: 0,
        upcoming: 'true'
      };

      // First request - should be cache miss
      const cachedData1 = await cacheService.getEvents(filters);
      expect(cachedData1).toBeNull();

      // Simulate controller behavior - fetch from DB and cache
      const events = await Event.find({ category: 'Tech', isPublic: true })
        .populate('organizer', 'name email logoUrl')
        .sort({ startTime: 1 });

      const responseData = {
        events,
        pagination: {
          total: events.length,
          limit: 20,
          offset: 0,
          hasMore: false
        }
      };

      await cacheService.setEvents(filters, responseData, 300);

      // Second request - should be cache hit
      const cachedData2 = await cacheService.getEvents(filters);
      expect(cachedData2).not.toBeNull();
      expect(cachedData2.events).toHaveLength(2);
      expect(cachedData2.events[0].title).toBe('Test Event 1');
    });

    it('should invalidate event cache when event is created', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User'
      });

      const club = await ClubProfile.create({
        user: user._id,
        name: 'Test Club',
        description: 'Test Description',
        email: 'club@example.com'
      });

      const filters = {
        category: 'all',
        limit: 20,
        offset: 0,
        upcoming: 'true'
      };

      // Cache some data
      await cacheService.setEvents(filters, { events: [], pagination: {} }, 300);
      
      // Verify cache exists
      const cachedBefore = await cacheService.getEvents(filters);
      expect(cachedBefore).not.toBeNull();

      // Create new event and invalidate cache
      await Event.create({
        title: 'New Event',
        description: 'Description',
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        endTime: new Date(Date.now() + 90000000), // Day after tomorrow
        location: 'Location',
        organizer: club._id,
        isPublic: true
      });

      await cacheService.invalidateEvents();

      // Verify cache is cleared
      const cachedAfter = await cacheService.getEvents(filters);
      expect(cachedAfter).toBeNull();
    });

    it('should cache event details by ID', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User'
      });

      const club = await ClubProfile.create({
        user: user._id,
        name: 'Test Club',
        description: 'Test Description',
        email: 'club@example.com'
      });

      const event = await Event.create({
        title: 'Test Event',
        description: 'Description',
        startTime: new Date(Date.now() + 86400000), // Tomorrow
        endTime: new Date(Date.now() + 90000000), // Day after tomorrow
        location: 'Location',
        organizer: club._id,
        isPublic: true
      });

      const eventId = event._id.toString();
      const cacheKey = cacheService.generateKey('events', 'detail', eventId);

      // First request - cache miss
      const cached1 = await cacheService.get(cacheKey);
      expect(cached1).toBeNull();

      // Cache the event
      const eventData = { ...event.toObject(), rsvpCounts: { going: 0, interested: 0, not_going: 0, waitlist: 0 } };
      await cacheService.set(cacheKey, eventData, 600);

      // Second request - cache hit
      const cached2 = await cacheService.get(cacheKey);
      expect(cached2).not.toBeNull();
      expect(cached2.title).toBe('Test Event');
    });
  });

  describe('Club Caching Integration', () => {
    it('should cache club listings on first request and return cached data on second request', async () => {
      const user1 = await User.create({
        username: 'user1',
        email: 'user1@example.com',
        password: 'TestPass123!',
        firstName: 'User',
        lastName: 'One'
      });

      const user2 = await User.create({
        username: 'user2',
        email: 'user2@example.com',
        password: 'TestPass123!',
        firstName: 'User',
        lastName: 'Two'
      });

      await ClubProfile.create({
        user: user1._id,
        name: 'Club 1',
        description: 'Description 1',
        email: 'club1@example.com',
        category: 'Technology'
      });

      await ClubProfile.create({
        user: user2._id,
        name: 'Club 2',
        description: 'Description 2',
        email: 'club2@example.com',
        category: 'Technology'
      });

      const filters = {
        verified: 'all',
        category: 'Technology',
        limit: 20,
        offset: 0
      };

      // First request - cache miss
      const cached1 = await cacheService.getClubs(filters);
      expect(cached1).toBeNull();

      // Fetch and cache
      const clubs = await ClubProfile.find({ category: 'Technology' })
        .populate('user', 'username email')
        .sort({ createdAt: -1 });

      const responseData = {
        clubs,
        pagination: {
          total: clubs.length,
          limit: 20,
          offset: 0,
          hasMore: false
        }
      };

      await cacheService.setClubs(filters, responseData, 300);

      // Second request - cache hit
      const cached2 = await cacheService.getClubs(filters);
      expect(cached2).not.toBeNull();
      expect(cached2.clubs).toHaveLength(2);
    });

    it('should invalidate club cache when club is updated', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User'
      });

      const club = await ClubProfile.create({
        user: user._id,
        name: 'Test Club',
        description: 'Description',
        email: 'club@example.com'
      });

      const filters = {
        verified: 'all',
        category: 'all',
        limit: 20,
        offset: 0
      };

      // Cache some data
      await cacheService.setClubs(filters, { clubs: [club], pagination: {} }, 300);
      
      // Verify cache exists
      const cachedBefore = await cacheService.getClubs(filters);
      expect(cachedBefore).not.toBeNull();

      // Update club and invalidate cache
      await ClubProfile.findByIdAndUpdate(club._id, { name: 'Updated Club' });
      await cacheService.invalidateClubs();

      // Verify cache is cleared
      const cachedAfter = await cacheService.getClubs(filters);
      expect(cachedAfter).toBeNull();
    });

    it('should cache club details by ID', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User'
      });

      const club = await ClubProfile.create({
        user: user._id,
        name: 'Test Club',
        description: 'Description',
        email: 'club@example.com'
      });

      const clubId = club._id.toString();
      const cacheKey = cacheService.generateKey('clubs', 'detail', clubId);

      // First request - cache miss
      const cached1 = await cacheService.get(cacheKey);
      expect(cached1).toBeNull();

      // Cache the club
      await cacheService.set(cacheKey, club, 600);

      // Second request - cache hit
      const cached2 = await cacheService.get(cacheKey);
      expect(cached2).not.toBeNull();
      expect(cached2.name).toBe('Test Club');
    });
  });

  describe('User Profile Caching Integration', () => {
    it('should cache user profile and return cached data on subsequent requests', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User',
        bio: 'Test bio'
      });

      const userId = user._id.toString();

      // First request - cache miss
      const cached1 = await cacheService.getUserProfile(userId);
      expect(cached1).toBeNull();

      // Cache the profile
      const profileData = await User.findById(userId).select('-password -refreshToken');
      await cacheService.setUserProfile(userId, profileData, 600);

      // Second request - cache hit
      const cached2 = await cacheService.getUserProfile(userId);
      expect(cached2).not.toBeNull();
      expect(cached2.username).toBe('testuser');
      expect(cached2.bio).toBe('Test bio');
    });

    it('should invalidate user profile cache when profile is updated', async () => {
      const user = await User.create({
        username: 'testuser',
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User'
      });

      const userId = user._id.toString();

      // Cache the profile
      await cacheService.setUserProfile(userId, user, 600);
      
      // Verify cache exists
      const cachedBefore = await cacheService.getUserProfile(userId);
      expect(cachedBefore).not.toBeNull();

      // Update profile and invalidate cache
      await User.findByIdAndUpdate(userId, { bio: 'Updated bio' });
      await cacheService.invalidateUserProfile(userId);

      // Verify cache is cleared
      const cachedAfter = await cacheService.getUserProfile(userId);
      expect(cachedAfter).toBeNull();
    });
  });

  describe('Cache Miss Handling', () => {
    it('should handle cache misses gracefully for events', async () => {
      const filters = {
        category: 'nonexistent',
        limit: 20,
        offset: 0,
        upcoming: 'true'
      };

      const cached = await cacheService.getEvents(filters);
      expect(cached).toBeNull();
    });

    it('should handle cache misses gracefully for clubs', async () => {
      const filters = {
        verified: 'all',
        category: 'nonexistent',
        limit: 20,
        offset: 0
      };

      const cached = await cacheService.getClubs(filters);
      expect(cached).toBeNull();
    });

    it('should handle cache misses gracefully for user profiles', async () => {
      const fakeUserId = new mongoose.Types.ObjectId().toString();
      const cached = await cacheService.getUserProfile(fakeUserId);
      expect(cached).toBeNull();
    });
  });
});
