import * as fc from 'fast-check';
import request from 'supertest';
import express, { Application } from 'express';
import { User } from '../src/models/User';
import { AuthService } from '../src/services/authService';
import mediaRoutes from '../src/routes/mediaRoutes';
import path from 'path';
import fs from 'fs';

// Mock S3 client
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
        Promise.resolve({ s3Key: `profiles/${userId}/${Date.now()}-${file.originalname}` }),
      getPresignedUrl: (s3Key: string, expiresIn: number) => 
        Promise.resolve(`https://s3.amazonaws.com/test-bucket/${s3Key}?expires=${expiresIn}`)
    }))
  };
});

// Custom email generator that matches User model validation
const validEmailArbitrary = fc.tuple(
  fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/),
  fc.stringMatching(/^[a-zA-Z0-9]{1,10}$/),
  fc.constantFrom('com', 'org', 'edu', 'net')
).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

describe('Profile Picture Display Consistency - Property-Based Tests', () => {
  let app: Application;
  let testImagePath: string;

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/media', mediaRoutes);

    // Create test image file
    testImagePath = path.join(__dirname, 'test-profile-image.jpg');
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
  });

  /**
   * Feature: uninexus-phase-3-ux-enhancements, Property 16: Profile Picture Persistence
   * **Validates: Requirements 6.1, 6.2**
   * 
   * For any successful profile picture upload, the backend should immediately update
   * the user profile record with the new S3 key and presigned URL, and return the
   * new image URL in the response.
   */
  describe('Property 16: Profile Picture Persistence', () => {
    it('should persist profile picture data for any valid user upload', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.stringMatching(/^[a-zA-Z0-9_]{3,20}$/),
            email: validEmailArbitrary,
            firstName: fc.stringMatching(/^[a-zA-Z]{1,50}$/),
            lastName: fc.stringMatching(/^[a-zA-Z]{1,50}$/)
          }),
          async (userData) => {
            // Create test user
            const user = await User.create({
              ...userData,
              password: 'TestPass123!'
            });
            const userId = user._id.toString();
            const authToken = AuthService.generateAccessToken(userId);

            // Upload profile picture
            const response = await request(app)
              .post('/api/media/users/profile-picture')
              .set('Authorization', `Bearer ${authToken}`)
              .attach('image', testImagePath);

            // Property 1: Upload should succeed
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Property 2: Response should contain new image URL
            expect(response.body.data).toHaveProperty('imageUrl');
            expect(response.body.data).toHaveProperty('url');
            expect(response.body.data.imageUrl).toBeTruthy();
            expect(response.body.data.url).toBeTruthy();
            expect(response.body.data.imageUrl).toBe(response.body.data.url);

            // Property 3: Response should contain S3 key
            expect(response.body.data).toHaveProperty('s3Key');
            expect(response.body.data.s3Key).toContain('profiles/');
            expect(response.body.data.s3Key).toContain(userId);

            // Property 4: User record should be immediately updated with S3 key
            const updatedUser = await User.findById(userId);
            expect(updatedUser).toBeTruthy();
            expect(updatedUser?.profilePicture).toBeDefined();
            expect(updatedUser?.profilePicture?.s3Key).toBe(response.body.data.s3Key);

            // Property 5: User record should have uploadedAt timestamp
            expect(updatedUser?.profilePicture?.uploadedAt).toBeDefined();
            expect(updatedUser?.profilePicture?.uploadedAt).toBeInstanceOf(Date);

            // Property 6: User record should be updated with presigned URL
            expect(updatedUser?.avatarUrl).toBeDefined();
            expect(updatedUser?.avatarUrl).toBe(response.body.data.imageUrl);

            // Property 7: Presigned URL should be a valid HTTPS URL
            expect(updatedUser?.avatarUrl).toMatch(/^https:\/\/.+/);

            // Clean up
            await User.findByIdAndDelete(userId);
          }
        ),
        { numRuns: 20 } // Run 20 times for comprehensive coverage
      );
    });

    it('should update existing profile picture when user uploads a new one', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.stringMatching(/^[a-zA-Z0-9_]{3,20}$/),
            email: validEmailArbitrary,
            firstName: fc.stringMatching(/^[a-zA-Z]{1,50}$/),
            lastName: fc.stringMatching(/^[a-zA-Z]{1,50}$/)
          }),
          fc.integer({ min: 2, max: 3 }), // Number of uploads
          async (userData, numUploads) => {
            // Create test user
            const user = await User.create({
              ...userData,
              password: 'TestPass123!'
            });
            const userId = user._id.toString();
            const authToken = AuthService.generateAccessToken(userId);

            let previousS3Key: string | undefined;
            let previousAvatarUrl: string | undefined;

            // Perform multiple uploads
            for (let i = 0; i < numUploads; i++) {
              // Small delay to ensure different timestamps
              await new Promise(resolve => setTimeout(resolve, 10));

              const response = await request(app)
                .post('/api/media/users/profile-picture')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('image', testImagePath);

              expect(response.status).toBe(200);
              expect(response.body.success).toBe(true);

              const updatedUser = await User.findById(userId);
              expect(updatedUser?.profilePicture?.s3Key).toBe(response.body.data.s3Key);
              expect(updatedUser?.avatarUrl).toBe(response.body.data.imageUrl);

              // Property: Each upload should produce a different S3 key and URL
              if (previousS3Key) {
                expect(response.body.data.s3Key).not.toBe(previousS3Key);
                expect(response.body.data.imageUrl).not.toBe(previousAvatarUrl);
              }

              previousS3Key = response.body.data.s3Key;
              previousAvatarUrl = response.body.data.imageUrl;
            }

            // Clean up
            await User.findByIdAndDelete(userId);
          }
        ),
        { numRuns: 10 } // Run 10 times
      );
    });
  });

  /**
   * Feature: uninexus-phase-3-ux-enhancements, Property 17: Profile Picture Display Consistency
   * **Validates: Requirements 6.3, 6.4**
   * 
   * For any page displaying user information, the page should fetch and display the
   * current profile picture, or display a default placeholder if the picture fails to load.
   */
  describe('Property 17: Profile Picture Display Consistency', () => {
    it('should display current profile picture URL for any user with uploaded picture', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.stringMatching(/^[a-zA-Z0-9_]{3,20}$/),
            email: validEmailArbitrary,
            firstName: fc.stringMatching(/^[a-zA-Z]{1,50}$/),
            lastName: fc.stringMatching(/^[a-zA-Z]{1,50}$/)
          }),
          async (userData) => {
            // Create test user
            const user = await User.create({
              ...userData,
              password: 'TestPass123!'
            });
            const userId = user._id.toString();
            const authToken = AuthService.generateAccessToken(userId);

            // Upload profile picture
            const uploadResponse = await request(app)
              .post('/api/media/users/profile-picture')
              .set('Authorization', `Bearer ${authToken}`)
              .attach('image', testImagePath);

            expect(uploadResponse.status).toBe(200);
            const uploadedImageUrl = uploadResponse.body.data.imageUrl;

            // Property 1: Fetching user profile should return the uploaded avatar URL
            const updatedUser = await User.findById(userId);
            expect(updatedUser?.avatarUrl).toBe(uploadedImageUrl);

            // Property 2: Avatar URL should be a valid HTTPS URL
            expect(updatedUser?.avatarUrl).toMatch(/^https:\/\/.+/);

            // Property 3: Avatar URL should be consistent across multiple fetches
            const refetchedUser = await User.findById(userId);
            expect(refetchedUser?.avatarUrl).toBe(uploadedImageUrl);
            expect(refetchedUser?.avatarUrl).toBe(updatedUser?.avatarUrl);

            // Clean up
            await User.findByIdAndDelete(userId);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle missing or null avatar URLs gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.stringMatching(/^[a-zA-Z0-9_]{3,20}$/),
            email: validEmailArbitrary,
            firstName: fc.stringMatching(/^[a-zA-Z]{1,50}$/),
            lastName: fc.stringMatching(/^[a-zA-Z]{1,50}$/)
          }),
          async (userData) => {
            // Create test user without profile picture
            const user = await User.create({
              ...userData,
              password: 'TestPass123!'
            });
            const userId = user._id.toString();

            // Property 1: User without avatar should have undefined or null avatarUrl
            const fetchedUser = await User.findById(userId);
            expect(fetchedUser?.avatarUrl).toBeUndefined();

            // Property 2: User without avatar should not have profilePicture data
            expect(fetchedUser?.profilePicture).toBeUndefined();

            // Clean up
            await User.findByIdAndDelete(userId);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain avatar URL consistency after multiple profile updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.stringMatching(/^[a-zA-Z0-9_]{3,20}$/),
            email: validEmailArbitrary,
            firstName: fc.stringMatching(/^[a-zA-Z]{1,50}$/),
            lastName: fc.stringMatching(/^[a-zA-Z]{1,50}$/)
          }),
          fc.integer({ min: 2, max: 4 }),
          async (userData, numUpdates) => {
            // Create test user
            const user = await User.create({
              ...userData,
              password: 'TestPass123!'
            });
            const userId = user._id.toString();
            const authToken = AuthService.generateAccessToken(userId);

            let latestAvatarUrl: string | undefined;

            // Perform multiple uploads
            for (let i = 0; i < numUpdates; i++) {
              await new Promise(resolve => setTimeout(resolve, 10));

              const uploadResponse = await request(app)
                .post('/api/media/users/profile-picture')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('image', testImagePath);

              expect(uploadResponse.status).toBe(200);
              latestAvatarUrl = uploadResponse.body.data.imageUrl;

              // Property: After each upload, user record should reflect the latest avatar
              const updatedUser = await User.findById(userId);
              expect(updatedUser?.avatarUrl).toBe(latestAvatarUrl);
            }

            // Property: Final fetch should still show the latest avatar URL
            const finalUser = await User.findById(userId);
            expect(finalUser?.avatarUrl).toBe(latestAvatarUrl);

            // Clean up
            await User.findByIdAndDelete(userId);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
