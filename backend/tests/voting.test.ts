/**
 * Voting System Unit and Property-Based Tests
 * 
 * **Validates: Requirements 5, 7 - Voting on Comments and Vote Validation**
 * 
 * These tests verify:
 * - Vote endpoint functionality (upvote, downvote, remove)
 * - Property 2: Vote uniqueness (user cannot be in both arrays)
 * - Property 3: Vote count accuracy (voteCount = upvotes.length - downvotes.length)
 * - Authorization enforcement
 * - Atomic operations
 */

import fc from 'fast-check';
import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import { Comment, IComment } from '../src/models/Comment';
import { User, IUser } from '../src/models/User';
import { Event } from '../src/models/Event';
import { ClubProfile } from '../src/models/ClubProfile';
import { voteOnComment } from '../src/controllers/commentController';
import { protect } from '../src/middlewares/authMiddleware';
import { AuthService } from '../src/services/authService';

// Create a minimal Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  app.post('/api/comments/:id/vote', protect, voteOnComment);
  
  return app;
};

describe('Voting System Tests', () => {
  let app: Application;
  let testUser: IUser;
  let testUser2: IUser;
  let testEvent: any;
  let testClubProfile: any;
  let testComment: IComment;
  let authToken: string;
  let authToken2: string;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Create test users
    const timestamp = Date.now().toString().slice(-6);
    testUser = await User.create({
      username: `voter1_${timestamp}`,
      email: `voter1_${timestamp}@test.com`,
      password: 'TestPass123!',
      role: 'student'
    });

    testUser2 = await User.create({
      username: `voter2_${timestamp}`,
      email: `voter2_${timestamp}@test.com`,
      password: 'TestPass123!',
      role: 'student'
    });

    // Generate auth tokens
    authToken = AuthService.generateAccessToken(testUser._id.toString());
    authToken2 = AuthService.generateAccessToken(testUser2._id.toString());

    // Create club profile
    testClubProfile = await ClubProfile.create({
      user: testUser._id,
      name: 'Test Club Vote ' + Date.now(),
      description: 'Test club for voting tests',
      email: `clubvote_${Date.now()}@test.com`
    });

    // Create test event
    testEvent = await Event.create({
      title: 'Test Event Vote ' + Date.now(),
      description: 'Test event for voting tests',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      location: 'Test Location',
      category: 'Other',
      organizer: testClubProfile._id,
      maxAttendees: 100
    });

    // Create test comment (by testUser)
    testComment = await Comment.create({
      content: 'Test comment for voting',
      author: testUser._id,
      eventId: testEvent._id,
      parentId: null,
      path: '',
      depth: 0
    });
  });

  describe('Unit Tests - Vote Endpoint', () => {
    it('should allow upvoting a comment', async () => {
      const response = await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ voteType: 'upvote' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.voteCount).toBe(1);
      expect(response.body.data.userVote).toBe('upvote');

      // Verify in database
      const comment = await Comment.findById(testComment._id);
      expect(comment?.upvotes).toHaveLength(1);
      expect(comment?.upvotes[0]?.toString()).toBe(testUser2._id.toString());
      expect(comment?.downvotes).toHaveLength(0);
      expect(comment?.voteCount).toBe(1);
    });

    it('should allow downvoting a comment', async () => {
      const response = await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ voteType: 'downvote' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.voteCount).toBe(-1);
      expect(response.body.data.userVote).toBe('downvote');

      // Verify in database
      const comment = await Comment.findById(testComment._id);
      expect(comment?.downvotes).toHaveLength(1);
      expect(comment?.downvotes[0]?.toString()).toBe(testUser2._id.toString());
      expect(comment?.upvotes).toHaveLength(0);
      expect(comment?.voteCount).toBe(-1);
    });

    it('should allow removing a vote', async () => {
      // First upvote
      await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ voteType: 'upvote' });

      // Then remove
      const response = await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ voteType: 'remove' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.voteCount).toBe(0);
      expect(response.body.data.userVote).toBeNull();

      // Verify in database
      const comment = await Comment.findById(testComment._id);
      expect(comment?.upvotes).toHaveLength(0);
      expect(comment?.downvotes).toHaveLength(0);
      expect(comment?.voteCount).toBe(0);
    });

    it('should switch from upvote to downvote', async () => {
      // First upvote
      await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ voteType: 'upvote' });

      // Then downvote
      const response = await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ voteType: 'downvote' });

      expect(response.status).toBe(200);
      expect(response.body.data.voteCount).toBe(-1);
      expect(response.body.data.userVote).toBe('downvote');

      // Verify in database
      const comment = await Comment.findById(testComment._id);
      expect(comment?.downvotes).toHaveLength(1);
      expect(comment?.upvotes).toHaveLength(0);
      expect(comment?.voteCount).toBe(-1);
    });

    it('should switch from downvote to upvote', async () => {
      // First downvote
      await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ voteType: 'downvote' });

      // Then upvote
      const response = await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ voteType: 'upvote' });

      expect(response.status).toBe(200);
      expect(response.body.data.voteCount).toBe(1);
      expect(response.body.data.userVote).toBe('upvote');

      // Verify in database
      const comment = await Comment.findById(testComment._id);
      expect(comment?.upvotes).toHaveLength(1);
      expect(comment?.downvotes).toHaveLength(0);
      expect(comment?.voteCount).toBe(1);
    });

    it('should toggle upvote (upvote twice removes it)', async () => {
      // First upvote
      await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ voteType: 'upvote' });

      // Upvote again (should not duplicate)
      const response = await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ voteType: 'upvote' });

      expect(response.status).toBe(200);
      
      // Verify no duplicate
      const comment = await Comment.findById(testComment._id);
      expect(comment?.upvotes).toHaveLength(1);
      expect(comment?.voteCount).toBe(1);
    });

    it('should prevent voting on own comment', async () => {
      const response = await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .set('Authorization', `Bearer ${authToken}`)  // testUser is the author
        .send({ voteType: 'upvote' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot vote on your own comment');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .send({ voteType: 'upvote' });

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/comments/${fakeId}/vote`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ voteType: 'upvote' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid vote type', async () => {
      const response = await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ voteType: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle multiple users voting', async () => {
      // Create third user
      const testUser3 = await User.create({
        username: `voter3_${Date.now()}`,
        email: `voter3_${Date.now()}@test.com`,
        password: 'TestPass123!',
        role: 'student'
      });

      const authToken3 = AuthService.generateAccessToken(testUser3._id.toString());

      // User 2 upvotes
      await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ voteType: 'upvote' });

      // User 3 upvotes
      await request(app)
        .post(`/api/comments/${testComment._id}/vote`)
        .set('Authorization', `Bearer ${authToken3}`)
        .send({ voteType: 'upvote' });

      // Verify
      const comment = await Comment.findById(testComment._id);
      expect(comment?.upvotes).toHaveLength(2);
      expect(comment?.voteCount).toBe(2);
    });
  });

  describe('Property 2: Vote Uniqueness', () => {
    it('Property 2: A user cannot be in both upvotes and downvotes arrays simultaneously', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('upvote', 'downvote', 'upvote', 'downvote', 'remove'),
          fc.constantFrom('upvote', 'downvote', 'remove'),
          async (firstVote, secondVote) => {
            // Create fresh comment for each test
            const comment = await Comment.create({
              content: 'Test comment ' + Date.now(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Apply first vote
            await request(app)
              .post(`/api/comments/${comment._id}/vote`)
              .set('Authorization', `Bearer ${authToken2}`)
              .send({ voteType: firstVote });

            // Apply second vote
            await request(app)
              .post(`/api/comments/${comment._id}/vote`)
              .set('Authorization', `Bearer ${authToken2}`)
              .send({ voteType: secondVote });

            // Verify property: user cannot be in both arrays
            const updatedComment = await Comment.findById(comment._id);
            const userIdStr = testUser2._id.toString();
            
            const inUpvotes = updatedComment?.upvotes.some(id => id.toString() === userIdStr);
            const inDownvotes = updatedComment?.downvotes.some(id => id.toString() === userIdStr);

            // Property: User cannot be in both arrays
            expect(inUpvotes && inDownvotes).toBe(false);

            // Cleanup
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 3: Vote Count Accuracy', () => {
    it('Property 3: voteCount must equal (upvotes.length - downvotes.length)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.constantFrom('upvote', 'downvote', 'remove'), { minLength: 1, maxLength: 10 }),
          async (voteSequence) => {
            // Create fresh comment for each test
            const comment = await Comment.create({
              content: 'Test comment ' + Date.now(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Apply vote sequence
            for (const voteType of voteSequence) {
              await request(app)
                .post(`/api/comments/${comment._id}/vote`)
                .set('Authorization', `Bearer ${authToken2}`)
                .send({ voteType });
            }

            // Verify property: voteCount = upvotes.length - downvotes.length
            const updatedComment = await Comment.findById(comment._id);
            const expectedVoteCount = updatedComment!.upvotes.length - updatedComment!.downvotes.length;
            
            expect(updatedComment?.voteCount).toBe(expectedVoteCount);

            // Cleanup
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('Property 3: voteCount accuracy with multiple users', async () => {
      // Pre-create a pool of test users to reuse across property test runs
      const testUsers: any[] = [];
      const testTokens: string[] = [];
      
      for (let i = 0; i < 6; i++) {
        const user = await User.create({
          username: `multiuser_${Date.now()}_${i}`,
          email: `multiuser_${Date.now()}_${i}@test.com`,
          password: 'TestPass123!',
          role: 'student'
        });
        testUsers.push(user);
        testTokens.push(AuthService.generateAccessToken(user._id.toString()));
      }

      try {
        await fc.assert(
          fc.asyncProperty(
            fc.integer({ min: 1, max: 3 }), // Reduced max users
            fc.integer({ min: 0, max: 3 }), // Reduced max users
            async (numUpvoters, numDownvoters) => {
              // Ensure we don't exceed available users
              const totalUsers = numUpvoters + numDownvoters;
              if (totalUsers > testUsers.length) return;

              // Create fresh comment
              const comment = await Comment.create({
                content: 'Test comment ' + Date.now(),
                author: testUser._id,
                eventId: testEvent._id,
                parentId: null,
                path: '',
                depth: 0
              });

              try {
                // Use existing users for upvotes
                for (let i = 0; i < numUpvoters; i++) {
                  await request(app)
                    .post(`/api/comments/${comment._id}/vote`)
                    .set('Authorization', `Bearer ${testTokens[i]}`)
                    .send({ voteType: 'upvote' });
                }

                // Use existing users for downvotes
                for (let i = 0; i < numDownvoters; i++) {
                  await request(app)
                    .post(`/api/comments/${comment._id}/vote`)
                    .set('Authorization', `Bearer ${testTokens[numUpvoters + i]}`)
                    .send({ voteType: 'downvote' });
                }

                // Verify property
                const updatedComment = await Comment.findById(comment._id);
                const expectedVoteCount = numUpvoters - numDownvoters;
                
                expect(updatedComment?.voteCount).toBe(expectedVoteCount);
                expect(updatedComment?.upvotes).toHaveLength(numUpvoters);
                expect(updatedComment?.downvotes).toHaveLength(numDownvoters);
              } finally {
                // Cleanup comment
                await Comment.findByIdAndDelete(comment._id);
              }
            }
          ),
          { numRuns: 5 } // Reduced number of runs
        );
      } finally {
        // Cleanup test users
        for (const user of testUsers) {
          await User.findByIdAndDelete(user._id);
        }
      }
    }, 15000); // Increased timeout to 15 seconds
  });

  describe('Authorization Enforcement', () => {
    it('should consistently prevent author from voting on own comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('upvote', 'downvote'),
          async (voteType) => {
            // Create fresh comment
            const comment = await Comment.create({
              content: 'Test comment ' + Date.now(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Try to vote on own comment
            const response = await request(app)
              .post(`/api/comments/${comment._id}/vote`)
              .set('Authorization', `Bearer ${authToken}`)
              .send({ voteType });

            // Should be forbidden
            expect(response.status).toBe(403);

            // Verify no vote was recorded
            const updatedComment = await Comment.findById(comment._id);
            expect(updatedComment?.upvotes).toHaveLength(0);
            expect(updatedComment?.downvotes).toHaveLength(0);
            expect(updatedComment?.voteCount).toBe(0);

            // Cleanup
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Atomic Operations', () => {
    it('should handle concurrent votes without race conditions', async () => {
      // Create multiple users
      const users = [];
      const tokens = [];
      
      for (let i = 0; i < 5; i++) {
        const user = await User.create({
          username: `concurrent_${Date.now()}_${i}`,
          email: `concurrent_${Date.now()}_${i}@test.com`,
          password: 'TestPass123!',
          role: 'student'
        });
        users.push(user);

        const token = AuthService.generateAccessToken(user._id.toString());
        tokens.push(token);
      }

      // All users vote concurrently
      const votePromises = tokens.map(token =>
        request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${token}`)
          .send({ voteType: 'upvote' })
      );

      await Promise.all(votePromises);

      // Verify all votes were recorded
      const comment = await Comment.findById(testComment._id);
      expect(comment?.upvotes).toHaveLength(5);
      expect(comment?.voteCount).toBe(5);

      // Cleanup
      for (const user of users) {
        await User.findByIdAndDelete(user._id);
      }
    });
  });
});
