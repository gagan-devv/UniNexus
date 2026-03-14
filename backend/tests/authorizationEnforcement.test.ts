/**
 * Authorization Enforcement Property Tests
 * 
 * **Validates: Requirements 3.9, 4.2**
 * 
 * Property 5: Authorization Enforcement
 * For any comment edit/delete request, the system must verify the user is either 
 * the author or a moderator (event organizer or super admin).
 */

import fc from 'fast-check';
import mongoose from 'mongoose';
import { Comment, IComment } from '../src/models/Comment';
import { User, IUser } from '../src/models/User';
import { Event } from '../src/models/Event';
import { ClubProfile } from '../src/models/ClubProfile';
import request from 'supertest';
import express from 'express';
import { updateComment, deleteComment } from '../src/controllers/commentController';
import jwt from 'jsonwebtoken';
import { AuthService } from '../src/services/authService';

// Create a minimal Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Auth middleware - FIXED: Now fetches full user object from database
  app.use(async (req: any, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = AuthService.verifyAccessToken(token);
        if (decoded) {
          // Fetch full user object from database
          const user = await User.findById(decoded.id).select('-password -refreshToken');
          if (user) {
            req.user = user;
          }
        }
      } catch (error) {
        // Invalid token - continue without user
      }
    }
    next();
  });
  
  app.put('/api/comments/:id', updateComment);
  app.delete('/api/comments/:id', deleteComment);
  
  return app;
};

describe('Property 5: Authorization Enforcement', () => {
  let app: express.Application;
  let testAuthor: IUser;
  let testOtherUser: IUser;
  let testEventOrganizer: IUser;
  let testSuperAdmin: IUser;
  let testEvent: any;
  let testClubProfile: any;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Create test users before each test (since global afterEach clears all data)
    const timestamp = Date.now().toString().slice(-6); // Use last 6 digits
    testAuthor = await User.create({
      username: `author_${timestamp}`,
      email: `author_${timestamp}@test.com`,
      password: 'TestPass123!',
      role: 'student'
    });

    testOtherUser = await User.create({
      username: `other_${timestamp}`,
      email: `other_${timestamp}@test.com`,
      password: 'TestPass123!',
      role: 'student'
    });

    testEventOrganizer = await User.create({
      username: `organizer_${timestamp}`,
      email: `organizer_${timestamp}@test.com`,
      password: 'TestPass123!',
      role: 'student'
    });

    testSuperAdmin = await User.create({
      username: `admin_${timestamp}`,
      email: `admin_${timestamp}@test.com`,
      password: 'TestPass123!',
      role: 'admin',
      isSuperAdmin: true
    } as any);

    // Create club profile for event organizer
    testClubProfile = await ClubProfile.create({
      user: testEventOrganizer._id,
      name: `Test Club Auth ${timestamp}`,
      description: 'Test club for authorization tests',
      email: `clubauth_${Date.now()}@test.com`
    });

    // Create test event
    testEvent = await Event.create({
      title: 'Test Event Auth ' + Date.now(),
      description: 'Test event for authorization tests',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      location: 'Test Location',
      category: 'Other',
      organizer: testClubProfile._id,
      maxAttendees: 100
    });
  });

  afterAll(async () => {
    // Final cleanup handled by global teardown
  });

  /**
   * Helper to generate JWT token for a user
   */
  const generateToken = (user: IUser): string => {
    return AuthService.generateAccessToken(user._id.toString());
  };

  /**
   * Property: Author can always edit their own comments
   */
  describe('Author authorization', () => {
    it('should allow author to edit their own comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          async (originalContent, newContent) => {
            // Create comment by author
            const comment = await Comment.create({
              content: originalContent.trim(),
              author: testAuthor._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Author attempts to edit
            const token = generateToken(testAuthor);
            const response = await request(app)
              .put(`/api/comments/${comment._id}`)
              .set('Authorization', `Bearer ${token}`)
              .send({ content: newContent.trim() });

            // Should succeed
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            // Verify comment was updated
            const updated = await Comment.findById(comment._id);
            expect(updated?.isEdited).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should allow author to delete their own comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          async (content) => {
            // Create comment by author
            const comment = await Comment.create({
              content: content.trim(),
              author: testAuthor._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Author attempts to delete
            const token = generateToken(testAuthor);
            const response = await request(app)
              .delete(`/api/comments/${comment._id}`)
              .set('Authorization', `Bearer ${token}`);

            // Should succeed
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            // Verify comment was soft deleted
            const deleted = await Comment.findById(comment._id);
            expect(deleted?.isDeleted).toBe(true);
            expect(deleted?.deletedBy?.toString()).toBe(testAuthor._id.toString());
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property: Non-author cannot edit comments
   */
  describe('Non-author edit prevention', () => {
    it('should prevent non-author from editing comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          async (originalContent, newContent) => {
            // Create comment by author
            const comment = await Comment.create({
              content: originalContent.trim(),
              author: testAuthor._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Other user attempts to edit
            const token = generateToken(testOtherUser);
            const response = await request(app)
              .put(`/api/comments/${comment._id}`)
              .set('Authorization', `Bearer ${token}`)
              .send({ content: newContent.trim() });

            // Should fail with 403 Forbidden
            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            
            // Verify comment was NOT updated
            const unchanged = await Comment.findById(comment._id);
            expect(unchanged?.content).toBe(originalContent.trim());
            expect(unchanged?.isEdited).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property: Event organizer can delete any comment on their event
   */
  describe('Event organizer moderation', () => {
    it('should allow event organizer to delete comments on their event', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          async (content) => {
            // Create comment by another user on organizer's event
            const comment = await Comment.create({
              content: content.trim(),
              author: testOtherUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Event organizer attempts to delete
            const token = generateToken(testEventOrganizer);
            const response = await request(app)
              .delete(`/api/comments/${comment._id}`)
              .set('Authorization', `Bearer ${token}`);

            // Should succeed
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            // Verify comment was soft deleted with moderation flag
            const deleted = await Comment.findById(comment._id);
            expect(deleted?.isDeleted).toBe(true);
            expect(deleted?.deletedBy?.toString()).toBe(testEventOrganizer._id.toString());
            expect(deleted?.moderationReason).toBe('Removed by moderator');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should prevent event organizer from editing comments (only delete)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          async (originalContent, newContent) => {
            // Create comment by another user
            const comment = await Comment.create({
              content: originalContent.trim(),
              author: testOtherUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Event organizer attempts to edit
            const token = generateToken(testEventOrganizer);
            const response = await request(app)
              .put(`/api/comments/${comment._id}`)
              .set('Authorization', `Bearer ${token}`)
              .send({ content: newContent.trim() });

            // Should fail with 403 Forbidden
            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            
            // Verify comment was NOT updated
            const unchanged = await Comment.findById(comment._id);
            expect(unchanged?.content).toBe(originalContent.trim());
            expect(unchanged?.isEdited).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property: Super admin can delete any comment
   */
  describe('Super admin moderation', () => {
    it('should allow super admin to delete any comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          async (content) => {
            // Create comment by another user
            const comment = await Comment.create({
              content: content.trim(),
              author: testOtherUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Super admin attempts to delete
            const token = generateToken(testSuperAdmin);
            const response = await request(app)
              .delete(`/api/comments/${comment._id}`)
              .set('Authorization', `Bearer ${token}`);

            // Should succeed
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            // Verify comment was soft deleted with moderation flag
            const deleted = await Comment.findById(comment._id);
            expect(deleted?.isDeleted).toBe(true);
            expect(deleted?.deletedBy?.toString()).toBe(testSuperAdmin._id.toString());
            expect(deleted?.moderationReason).toBe('Removed by moderator');
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property: Unauthenticated users cannot edit or delete
   */
  describe('Authentication requirement', () => {
    it('should prevent unauthenticated edit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          async (originalContent, newContent) => {
            // Create comment
            const comment = await Comment.create({
              content: originalContent.trim(),
              author: testAuthor._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Attempt to edit without token
            const response = await request(app)
              .put(`/api/comments/${comment._id}`)
              .send({ content: newContent.trim() });

            // Should fail with 401 Unauthorized
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should prevent unauthenticated delete', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
          async (content) => {
            // Create comment
            const comment = await Comment.create({
              content: content.trim(),
              author: testAuthor._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Attempt to delete without token
            const response = await request(app)
              .delete(`/api/comments/${comment._id}`);

            // Should fail with 401 Unauthorized
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
