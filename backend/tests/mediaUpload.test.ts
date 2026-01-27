import request from 'supertest';
import express, { Application } from 'express';
import { User } from '../src/models/User';
import { ClubProfile } from '../src/models/ClubProfile';
import { Event } from '../src/models/Event';
import { AuthService } from '../src/services/authService';
import { MediaService } from '../src/services/mediaService';
import { getCacheService } from '../src/services/cacheService';
import mediaRoutes from '../src/routes/mediaRoutes';
import path from 'path';
import fs from 'fs';

// Mock S3 client
const mockS3Client = {
  send: jest.fn()
};

// Mock MediaService
jest.mock('../src/services/mediaService', () => {
  const originalModule = jest.requireActual('../src/services/mediaService');
  return {
    ...originalModule,
    getMediaService: jest.fn(() => ({
      validateImageFile: (file: any) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
          return {
            isValid: false,
            error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
          };
        }
        if (file.size > 5 * 1024 * 1024) {
          return {
            isValid: false,
            error: 'File size exceeds maximum limit of 5MB'
          };
        }
        return { isValid: true };
      },
      uploadProfilePicture: (userId: string, file: any) => 
        Promise.resolve({ s3Key: `profiles/${userId}/test-image.jpg` }),
      uploadClubLogo: (clubId: string, file: any) => 
        Promise.resolve({ s3Key: `clubs/${clubId}/test-logo.jpg` }),
      uploadEventPoster: (eventId: string, file: any) => 
        Promise.resolve({ s3Key: `events/${eventId}/test-poster.jpg` }),
      getPresignedUrl: (s3Key: string, expiresIn: number) => 
        Promise.resolve(`https://s3.amazonaws.com/test-bucket/${s3Key}?expires=${expiresIn}`)
    }))
  };
});

describe('Media Upload Integration Tests', () => {
  let app: Application;
  let authToken: string;
  let userId: string;
  let clubId: string;
  let eventId: string;
  let testImagePath: string;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/media', mediaRoutes);

    // Create test image file
    testImagePath = path.join(__dirname, 'test-image.jpg');
    // Create a minimal valid JPEG file (1x1 pixel)
    const jpegBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9
    ]);
    fs.writeFileSync(testImagePath, jpegBuffer);
  });

  afterAll(async () => {
    // Clean up test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  beforeEach(async () => {
    // Clear all test data
    await User.deleteMany({});
    await ClubProfile.deleteMany({});
    await Event.deleteMany({});

    // Create test user
    const user = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User'
    });
    userId = user._id.toString();

    // Generate auth token
    authToken = AuthService.generateAccessToken(userId);

    // Create test club
    const club = await ClubProfile.create({
      user: user._id,
      name: 'Test Club',
      description: 'Test Description for the club',
      email: 'club@example.com'
    });
    clubId = club._id.toString();

    // Create test event
    const event = await Event.create({
      title: 'Test Event',
      description: 'Test Description for the event',
      startTime: new Date(Date.now() + 86400000),
      endTime: new Date(Date.now() + 90000000),
      location: 'Test Location',
      organizer: club._id,
      isPublic: true
    });
    eventId = event._id.toString();
  });

  describe('POST /api/media/users/profile-picture', () => {
    it('should successfully upload profile picture', async () => {
      const response = await request(app)
        .post('/api/media/users/profile-picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Profile picture uploaded successfully');
      expect(response.body.data).toHaveProperty('s3Key');
      expect(response.body.data).toHaveProperty('imageUrl');

      // Verify user document was updated
      const user = await User.findById(userId);
      expect(user?.profilePicture).toBeDefined();
      expect(user?.profilePicture?.s3Key).toContain('profiles/');
    });

    it('should reject upload without authentication', async () => {
      const response = await request(app)
        .post('/api/media/users/profile-picture')
        .attach('image', testImagePath);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/media/users/profile-picture')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No file uploaded');
    });

    it('should reject invalid file type', async () => {
      // Create a text file
      const txtPath = path.join(__dirname, 'test.txt');
      fs.writeFileSync(txtPath, 'test content');

      const response = await request(app)
        .post('/api/media/users/profile-picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', txtPath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid file type');

      // Clean up
      fs.unlinkSync(txtPath);
    });

    it('should reject file exceeding size limit', async () => {
      // Create a large file (6MB)
      const largePath = path.join(__dirname, 'large-image.jpg');
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
      fs.writeFileSync(largePath, largeBuffer);

      const response = await request(app)
        .post('/api/media/users/profile-picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', largePath);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('File size exceeds maximum limit');

      // Clean up
      fs.unlinkSync(largePath);
    });
  });

  describe('POST /api/media/clubs/:id/logo', () => {
    it('should successfully upload club logo', async () => {
      const response = await request(app)
        .post(`/api/media/clubs/${clubId}/logo`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Club logo uploaded successfully');
      expect(response.body.data).toHaveProperty('s3Key');
      expect(response.body.data).toHaveProperty('imageUrl');

      // Verify club document was updated
      const club = await ClubProfile.findById(clubId);
      expect(club?.logo).toBeDefined();
      expect(club?.logo?.s3Key).toContain('clubs/');
    });

    it('should reject upload without authentication', async () => {
      const response = await request(app)
        .post(`/api/media/clubs/${clubId}/logo`)
        .attach('image', testImagePath);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject upload for non-existent club', async () => {
      const fakeClubId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .post(`/api/media/clubs/${fakeClubId}/logo`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Club not found');
    });

    it('should reject upload by non-owner', async () => {
      // Create another user
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'TestPass123!',
        firstName: 'Other',
        lastName: 'User'
      });
      const otherToken = AuthService.generateAccessToken(otherUser._id.toString());

      const response = await request(app)
        .post(`/api/media/clubs/${clubId}/logo`)
        .set('Authorization', `Bearer ${otherToken}`)
        .attach('image', testImagePath);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post(`/api/media/clubs/${clubId}/logo`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No file uploaded');
    });
  });

  describe('POST /api/media/events/:id/poster', () => {
    it('should successfully upload event poster', async () => {
      const response = await request(app)
        .post(`/api/media/events/${eventId}/poster`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Event poster uploaded successfully');
      expect(response.body.data).toHaveProperty('s3Key');
      expect(response.body.data).toHaveProperty('imageUrl');

      // Verify event document was updated
      const event = await Event.findById(eventId);
      expect(event?.poster).toBeDefined();
      expect(event?.poster?.s3Key).toContain('events/');
    });

    it('should reject upload without authentication', async () => {
      const response = await request(app)
        .post(`/api/media/events/${eventId}/poster`)
        .attach('image', testImagePath);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject upload for non-existent event', async () => {
      const fakeEventId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .post(`/api/media/events/${fakeEventId}/poster`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Event not found');
    });

    it('should reject upload by non-organizer', async () => {
      // Create another user and club
      const otherUser = await User.create({
        username: 'otheruser',
        email: 'other@example.com',
        password: 'TestPass123!',
        firstName: 'Other',
        lastName: 'User'
      });
      const otherToken = AuthService.generateAccessToken(otherUser._id.toString());

      const response = await request(app)
        .post(`/api/media/events/${eventId}/poster`)
        .set('Authorization', `Bearer ${otherToken}`)
        .attach('image', testImagePath);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not a club owner');
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post(`/api/media/events/${eventId}/poster`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No file uploaded');
    });
  });

  describe('GET /api/media/presigned-url', () => {
    it('should generate presigned URL for valid S3 key', async () => {
      const s3Key = 'profiles/test-user/test-image.jpg';
      const response = await request(app)
        .get(`/api/media/presigned-url?key=${encodeURIComponent(s3Key)}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data).toHaveProperty('expiresIn');
      expect(response.body.data.expiresIn).toBe(3600);
      expect(response.body.data.url).toContain(s3Key);
    });

    it('should reject request without authentication', async () => {
      const s3Key = 'profiles/test-user/test-image.jpg';
      const response = await request(app)
        .get(`/api/media/presigned-url?key=${encodeURIComponent(s3Key)}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate user profile cache after profile picture upload', async () => {
      const cacheService = getCacheService();
      
      // Skip test if Redis is not available
      const isRedisAvailable = await cacheService.ping();
      if (!isRedisAvailable) {
        console.log('⚠️ Skipping cache test - Redis not available');
        return;
      }
      
      // Cache user profile
      const user = await User.findById(userId);
      await cacheService.setUserProfile(userId, user, 600);
      
      // Verify cache exists
      const cachedBefore = await cacheService.getUserProfile(userId);
      expect(cachedBefore).not.toBeNull();

      // Upload profile picture
      await request(app)
        .post('/api/media/users/profile-picture')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath);

      // Verify cache is invalidated
      const cachedAfter = await cacheService.getUserProfile(userId);
      expect(cachedAfter).toBeNull();
    });

    it('should invalidate club cache after logo upload', async () => {
      const cacheService = getCacheService();
      
      // Skip test if Redis is not available
      const isRedisAvailable = await cacheService.ping();
      if (!isRedisAvailable) {
        console.log('⚠️ Skipping cache test - Redis not available');
        return;
      }
      
      // Cache club data
      const filters = { verified: 'all', category: 'all', limit: 20, offset: 0 };
      await cacheService.setClubs(filters, { clubs: [], pagination: {} }, 300);
      
      // Verify cache exists
      const cachedBefore = await cacheService.getClubs(filters);
      expect(cachedBefore).not.toBeNull();

      // Upload club logo
      await request(app)
        .post(`/api/media/clubs/${clubId}/logo`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath);

      // Verify cache is invalidated
      const cachedAfter = await cacheService.getClubs(filters);
      expect(cachedAfter).toBeNull();
    });

    it('should invalidate event cache after poster upload', async () => {
      const cacheService = getCacheService();
      
      // Skip test if Redis is not available
      const isRedisAvailable = await cacheService.ping();
      if (!isRedisAvailable) {
        console.log('⚠️ Skipping cache test - Redis not available');
        return;
      }
      
      // Cache event data
      const filters = { category: 'all', limit: 20, offset: 0, upcoming: 'true' };
      await cacheService.setEvents(filters, { events: [], pagination: {} }, 300);
      
      // Verify cache exists
      const cachedBefore = await cacheService.getEvents(filters);
      expect(cachedBefore).not.toBeNull();

      // Upload event poster
      await request(app)
        .post(`/api/media/events/${eventId}/poster`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath);

      // Verify cache is invalidated
      const cachedAfter = await cacheService.getEvents(filters);
      expect(cachedAfter).toBeNull();
    });
  });
});
