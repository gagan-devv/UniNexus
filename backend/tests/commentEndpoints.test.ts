/**
 * Comment Endpoints Unit Tests
 * 
 * **Validates: Requirements 1.1-1.10, 2.1-2.10, 3.1-3.10**
 * 
 * These tests verify the comment CRUD API endpoints work correctly:
 * - POST /api/comments (create comment)
 * - GET /api/comments/event/:eventId (get comments)
 * - PUT /api/comments/:id (update comment)
 * - DELETE /api/comments/:id (delete comment)
 */

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { Comment, IComment } from '../src/models/Comment';
import { User, IUser } from '../src/models/User';
import { Event } from '../src/models/Event';
import { ClubProfile } from '../src/models/ClubProfile';
import { createComment, getCommentsByEvent, updateComment, deleteComment } from '../src/controllers/commentController';
import jwt from 'jsonwebtoken';

// Create a minimal Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Auth middleware
  app.use((req: any, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        req.user = decoded;
      } catch (error) {
        // Invalid token
      }
    }
    next();
  });
  
  app.post('/api/comments', createComment);
  app.get('/api/comments/event/:eventId', getCommentsByEvent);
  app.put('/api/comments/:id', updateComment);
  app.delete('/api/comments/:id', deleteComment);
  
  return app;
};

describe('Comment Endpoints Unit Tests', () => {
  let app: express.Application;
  let testUser: IUser;
  let testUser2: IUser;
  let testEvent: any;
  let testClubProfile: any;
  let authToken: string;
  let authToken2: string;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Create test users before each test
    const timestamp = Date.now().toString().slice(-6); // Use last 6 digits
    testUser = await User.create({
      username: `testep_${timestamp}`,
      email: `endpoints_${timestamp}@test.com`,
      password: 'TestPass123!',
      role: 'student'
    });

    testUser2 = await User.create({
      username: `testep2_${timestamp}`,
      email: `endpoints2_${timestamp}@test.com`,
      password: 'TestPass123!',
      role: 'student'
    });

    // Generate auth tokens
    authToken = jwt.sign(
      { _id: testUser._id, username: testUser.username, email: testUser.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    authToken2 = jwt.sign(
      { _id: testUser2._id, username: testUser2.username, email: testUser2.email },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create club profile
    testClubProfile = await ClubProfile.create({
      user: testUser._id,
      name: 'Test Club Endpoints ' + Date.now(),
      description: 'Test club for endpoint tests',
      email: `clubendpoints_${Date.now()}@test.com`
    });

    // Create test event
    testEvent = await Event.create({
      title: 'Test Event Endpoints ' + Date.now(),
      description: 'Test event for endpoint tests',
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

  describe('POST /api/comments', () => {
    it('should create a root comment successfully', async () => {
      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a test comment',
          eventId: testEvent._id.toString()
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Comment created successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.content).toContain('test comment');
      expect(response.body.data.depth).toBe(0);
      expect(response.body.data.path).toBe('');
    });

    it('should create a nested comment successfully', async () => {
      // Create root comment first
      const rootComment = await Comment.create({
        content: 'Root comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a reply',
          eventId: testEvent._id.toString(),
          parentId: rootComment._id.toString()
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.depth).toBe(1);
      expect(response.body.data.path).toBe(rootComment._id.toString() + '.');
      expect(response.body.data.parentId).toBe(rootComment._id.toString());
    });

    it('should reject comment without authentication', async () => {
      const response = await request(app)
        .post('/api/comments')
        .send({
          content: 'This is a test comment',
          eventId: testEvent._id.toString()
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Authentication required');
    });

    it('should reject comment with empty content', async () => {
      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '   ',
          eventId: testEvent._id.toString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject comment exceeding 2000 characters', async () => {
      const longContent = 'a'.repeat(2001);
      
      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: longContent,
          eventId: testEvent._id.toString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject comment with non-existent event', async () => {
      const fakeEventId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test comment',
          eventId: fakeEventId.toString()
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Event not found');
    });

    it('should reject comment with non-existent parent', async () => {
      const fakeParentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Test reply',
          eventId: testEvent._id.toString(),
          parentId: fakeParentId.toString()
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Parent comment not found');
    });

    it('should reject comment with parent from different event', async () => {
      // Create another event
      const otherEvent = await Event.create({
        title: 'Other Event',
        description: 'Another event',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        location: 'Other Location',
        category: 'Other',
        organizer: testClubProfile._id,
        maxAttendees: 50
      });

      // Create comment on other event
      const otherComment = await Comment.create({
        content: 'Comment on other event',
        author: testUser._id,
        eventId: otherEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Reply to wrong event',
          eventId: testEvent._id.toString(),
          parentId: otherComment._id.toString()
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should sanitize HTML content to prevent XSS', async () => {
      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '<script>alert("XSS")</script>Test comment',
          eventId: testEvent._id.toString()
        });

      expect(response.status).toBe(201);
      expect(response.body.data.content).not.toContain('<script>');
      expect(response.body.data.content).toContain('&lt;script&gt;');
    });

    it('should trim whitespace from content', async () => {
      const response = await request(app)
        .post('/api/comments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '   Test comment with spaces   ',
          eventId: testEvent._id.toString()
        });

      expect(response.status).toBe(201);
      expect(response.body.data.content).not.toMatch(/^\s/);
      expect(response.body.data.content).not.toMatch(/\s$/);
    });
  });

  describe('GET /api/comments/event/:eventId', () => {
    it('should fetch all comments for an event', async () => {
      // Create multiple comments
      await Comment.create([
        {
          content: 'Comment 1',
          author: testUser._id,
          eventId: testEvent._id,
          parentId: null,
          path: '',
          depth: 0
        },
        {
          content: 'Comment 2',
          author: testUser2._id,
          eventId: testEvent._id,
          parentId: null,
          path: '',
          depth: 0
        }
      ]);

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.comments).toHaveLength(2);
    });

    it('should return empty array for event with no comments', async () => {
      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.comments).toHaveLength(0);
    });

    it('should return 404 for non-existent event', async () => {
      const fakeEventId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/comments/event/${fakeEventId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Event not found');
    });

    it('should support sorting by "new"', async () => {
      // Create comments with different timestamps
      const comment1 = await Comment.create({
        content: 'Old comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        createdAt: new Date(Date.now() - 10000)
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const comment2 = await Comment.create({
        content: 'New comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'new' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(2);
    });

    it('should support sorting by "top"', async () => {
      // Create comments with different vote counts
      await Comment.create([
        {
          content: 'Low voted',
          author: testUser._id,
          eventId: testEvent._id,
          parentId: null,
          path: '',
          depth: 0,
          voteCount: 1
        },
        {
          content: 'High voted',
          author: testUser._id,
          eventId: testEvent._id,
          parentId: null,
          path: '',
          depth: 0,
          voteCount: 10
        }
      ]);

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'top' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(2);
    });

    it('should respect limit parameter', async () => {
      // Create 5 comments
      for (let i = 0; i < 5; i++) {
        await Comment.create({
          content: `Comment ${i}`,
          author: testUser._id,
          eventId: testEvent._id,
          parentId: null,
          path: '',
          depth: 0
        });
      }

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ limit: 3 });

      expect(response.status).toBe(200);
      expect(response.body.data.comments.length).toBeLessThanOrEqual(3);
    });

    it('should populate author details', async () => {
      await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.comments[0].author).toBeDefined();
      expect(response.body.data.comments[0].author.username).toContain('testep_');
    });
  });

  describe('PUT /api/comments/:id', () => {
    it('should update comment successfully', async () => {
      const comment = await Comment.create({
        content: 'Original content',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const response = await request(app)
        .put(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Updated content' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.isEdited).toBe(true);
      expect(response.body.data.editedAt).toBeDefined();
    });

    it('should reject update without authentication', async () => {
      const comment = await Comment.create({
        content: 'Original content',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const response = await request(app)
        .put(`/api/comments/${comment._id}`)
        .send({ content: 'Updated content' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject update by non-author', async () => {
      const comment = await Comment.create({
        content: 'Original content',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const response = await request(app)
        .put(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .send({ content: 'Updated content' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should reject update with empty content', async () => {
      const comment = await Comment.create({
        content: 'Original content',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const response = await request(app)
        .put(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject update exceeding 2000 characters', async () => {
      const comment = await Comment.create({
        content: 'Original content',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const longContent = 'a'.repeat(2001);

      const response = await request(app)
        .put(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: longContent });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeCommentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .put(`/api/comments/${fakeCommentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Updated content' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should sanitize HTML in updated content', async () => {
      const comment = await Comment.create({
        content: 'Original content',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const response = await request(app)
        .put(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: '<script>alert("XSS")</script>Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data.content).not.toContain('<script>');
      expect(response.body.data.content).toContain('&lt;script&gt;');
    });
  });

  describe('DELETE /api/comments/:id', () => {
    it('should delete comment successfully (author)', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const response = await request(app)
        .delete(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify soft delete
      const deleted = await Comment.findById(comment._id);
      expect(deleted?.isDeleted).toBe(true);
      expect(deleted?.deletedBy?.toString()).toBe(testUser._id.toString());
    });

    it('should reject delete without authentication', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const response = await request(app)
        .delete(`/api/comments/${comment._id}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject delete by non-author non-moderator', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const response = await request(app)
        .delete(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${authToken2}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent comment', async () => {
      const fakeCommentId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .delete(`/api/comments/${fakeCommentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should preserve comment node for soft delete', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      await request(app)
        .delete(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Comment should still exist in database
      const deleted = await Comment.findById(comment._id);
      expect(deleted).toBeDefined();
      expect(deleted?.isDeleted).toBe(true);
    });

    it('should set deletedAt timestamp', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      await request(app)
        .delete(`/api/comments/${comment._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const deleted = await Comment.findById(comment._id);
      expect(deleted?.deletedAt).toBeDefined();
      expect(deleted?.deletedAt).toBeInstanceOf(Date);
    });
  });
});
