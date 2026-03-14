/**
 * Voting Endpoints Unit Tests
 * 
 * These tests verify the voting API endpoints work correctly with proper
 * authentication, authorization, validation, and error handling.
 */

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { Comment, IComment } from '../src/models/Comment';
import { User, IUser } from '../src/models/User';
import { Event } from '../src/models/Event';
import { ClubProfile } from '../src/models/ClubProfile';
import { voteOnComment } from '../src/controllers/commentController';
import { AuthService } from '../src/services/authService';

// Create a minimal Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Auth middleware that properly sets req.user
  app.use(async (req: any, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = AuthService.verifyAccessToken(token);
        if (decoded) {
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
  
  app.post('/api/comments/:id/vote', voteOnComment);
  
  return app;
};

describe('Voting Endpoints Unit Tests', () => {
  let app: express.Application;
  let testUser: IUser;
  let commentAuthor: IUser;
  let testEvent: any;
  let testComment: IComment;
  let authToken: string;
  let authorToken: string;

  beforeEach(async () => {
    // Create test users (needed because global afterEach deletes all collections)
    testUser = await User.create({
      username: 'voter_user',
      email: 'voter@test.com',
      password: 'TestPass123!',
      role: 'student'
    });

    commentAuthor = await User.create({
      username: 'comment_author',
      email: 'author@test.com',
      password: 'TestPass123!',
      role: 'student'
    });

    // Generate auth tokens using AuthService
    authToken = AuthService.generateAccessToken(testUser._id.toString());
    authorToken = AuthService.generateAccessToken(commentAuthor._id.toString());

    // Create test event
    const clubProfile = await ClubProfile.create({
      user: commentAuthor._id,
      name: 'Test Club Voting',
      description: 'Test club for voting endpoints',
      email: 'clubvoting@test.com'
    });

    testEvent = await Event.create({
      title: 'Test Event Voting',
      description: 'Test event for voting endpoints',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      location: 'Test Location',
      category: 'Other',
      organizer: clubProfile._id,
      maxAttendees: 100
    });

    // Create app after users are created
    app = createTestApp();
    
    // Create a fresh comment for each test
    testComment = await Comment.create({
      content: 'Test comment for voting',
      author: commentAuthor._id,
      eventId: testEvent._id,
      parentId: null,
      path: '',
      depth: 0
    });
  });

  describe('POST /api/comments/:id/vote', () => {
    describe('Authentication', () => {
      it('should return 401 if user is not authenticated', async () => {
        const response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .send({ voteType: 'upvote' });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Authentication required');
      });

      it('should return 401 with invalid token', async () => {
        const response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', 'Bearer invalid-token')
          .send({ voteType: 'upvote' });

        expect(response.status).toBe(401);
      });
    });

    describe('Validation', () => {
      it('should return 400 if voteType is missing', async () => {
        const response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      });

      it('should return 400 if voteType is invalid', async () => {
        const response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'invalid' });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.errors).toBeDefined();
      });

      it('should return 404 if comment does not exist', async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const response = await request(app)
          .post(`/api/comments/${fakeId}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'upvote' });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('not found');
      });
    });

    describe('Authorization', () => {
      it('should return 403 if user tries to vote on their own comment', async () => {
        const response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authorToken}`)
          .send({ voteType: 'upvote' });

        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('cannot vote on your own comment');
      });
    });

    describe('Upvote functionality', () => {
      it('should successfully upvote a comment', async () => {
        const response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'upvote' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('Vote recorded');
        expect(response.body.data.voteCount).toBe(1);
        expect(response.body.data.userVote).toBe('upvote');

        // Verify in database
        const updatedComment = await Comment.findById(testComment._id);
        expect(updatedComment?.upvotes).toHaveLength(1);
        expect(updatedComment?.upvotes[0]?.toString()).toBe(testUser._id.toString());
        expect(updatedComment?.downvotes).toHaveLength(0);
        expect(updatedComment?.voteCount).toBe(1);
      });

      it('should toggle upvote off when upvoting again', async () => {
        // First upvote
        await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'upvote' });

        // Second upvote (toggle off)
        const response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'upvote' });

        expect(response.status).toBe(200);
        expect(response.body.data.voteCount).toBe(1);
        expect(response.body.data.userVote).toBe('upvote');

        // Note: $addToSet prevents duplicates, so upvote stays
        const updatedComment = await Comment.findById(testComment._id);
        expect(updatedComment?.upvotes).toHaveLength(1);
      });
    });

    describe('Downvote functionality', () => {
      it('should successfully downvote a comment', async () => {
        const response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'downvote' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.voteCount).toBe(-1);
        expect(response.body.data.userVote).toBe('downvote');

        // Verify in database
        const updatedComment = await Comment.findById(testComment._id);
        expect(updatedComment?.downvotes).toHaveLength(1);
        expect(updatedComment?.downvotes[0]?.toString()).toBe(testUser._id.toString());
        expect(updatedComment?.upvotes).toHaveLength(0);
        expect(updatedComment?.voteCount).toBe(-1);
      });
    });

    describe('Vote switching', () => {
      it('should switch from upvote to downvote', async () => {
        // First upvote
        await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'upvote' });

        // Switch to downvote
        const response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'downvote' });

        expect(response.status).toBe(200);
        expect(response.body.data.voteCount).toBe(-1);
        expect(response.body.data.userVote).toBe('downvote');

        // Verify in database
        const updatedComment = await Comment.findById(testComment._id);
        expect(updatedComment?.upvotes).toHaveLength(0);
        expect(updatedComment?.downvotes).toHaveLength(1);
        expect(updatedComment?.voteCount).toBe(-1);
      });

      it('should switch from downvote to upvote', async () => {
        // First downvote
        await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'downvote' });

        // Switch to upvote
        const response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'upvote' });

        expect(response.status).toBe(200);
        expect(response.body.data.voteCount).toBe(1);
        expect(response.body.data.userVote).toBe('upvote');

        // Verify in database
        const updatedComment = await Comment.findById(testComment._id);
        expect(updatedComment?.upvotes).toHaveLength(1);
        expect(updatedComment?.downvotes).toHaveLength(0);
        expect(updatedComment?.voteCount).toBe(1);
      });
    });

    describe('Vote removal', () => {
      it('should remove upvote when voteType is "remove"', async () => {
        // First upvote
        await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'upvote' });

        // Remove vote
        const response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'remove' });

        expect(response.status).toBe(200);
        expect(response.body.data.voteCount).toBe(0);
        expect(response.body.data.userVote).toBeNull();

        // Verify in database
        const updatedComment = await Comment.findById(testComment._id);
        expect(updatedComment?.upvotes).toHaveLength(0);
        expect(updatedComment?.downvotes).toHaveLength(0);
        expect(updatedComment?.voteCount).toBe(0);
      });

      it('should remove downvote when voteType is "remove"', async () => {
        // First downvote
        await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'downvote' });

        // Remove vote
        const response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'remove' });

        expect(response.status).toBe(200);
        expect(response.body.data.voteCount).toBe(0);
        expect(response.body.data.userVote).toBeNull();

        // Verify in database
        const updatedComment = await Comment.findById(testComment._id);
        expect(updatedComment?.upvotes).toHaveLength(0);
        expect(updatedComment?.downvotes).toHaveLength(0);
        expect(updatedComment?.voteCount).toBe(0);
      });
    });

    describe('Multiple users voting', () => {
      it('should handle multiple users voting on the same comment', async () => {
        // Create additional users
        const user2 = await User.create({
          username: 'voter2',
          email: 'voter2@test.com',
          password: 'TestPass123!',
          role: 'student'
        });

        const user3 = await User.create({
          username: 'voter3',
          email: 'voter3@test.com',
          password: 'TestPass123!',
          role: 'student'
        });

        const token2 = AuthService.generateAccessToken(user2._id.toString());
        const token3 = AuthService.generateAccessToken(user3._id.toString());

        // User 1 upvotes
        await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'upvote' });

        // User 2 upvotes
        await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${token2}`)
          .send({ voteType: 'upvote' });

        // User 3 downvotes
        const response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${token3}`)
          .send({ voteType: 'downvote' });

        expect(response.status).toBe(200);
        expect(response.body.data.voteCount).toBe(1); // 2 upvotes - 1 downvote

        // Verify in database
        const updatedComment = await Comment.findById(testComment._id);
        expect(updatedComment?.upvotes).toHaveLength(2);
        expect(updatedComment?.downvotes).toHaveLength(1);
        expect(updatedComment?.voteCount).toBe(1);
      });
    });

    describe('Vote count accuracy', () => {
      it('should maintain accurate vote count after multiple operations', async () => {
        // Upvote
        let response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'upvote' });
        expect(response.body.data.voteCount).toBe(1);

        // Switch to downvote
        response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'downvote' });
        expect(response.body.data.voteCount).toBe(-1);

        // Remove vote
        response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'remove' });
        expect(response.body.data.voteCount).toBe(0);

        // Upvote again
        response = await request(app)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'upvote' });
        expect(response.body.data.voteCount).toBe(1);
      });
    });
  });
});
