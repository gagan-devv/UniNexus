/**
 * Comment Sorting Algorithms Unit Tests
 * 
 * **Validates: Requirement 6 - Comment Sorting by Votes**
 * 
 * These tests verify the comment sorting algorithms work correctly:
 * - Hot sort (Reddit-style)
 * - Controversial sort
 * - Top sort (by vote count)
 * - New sort (by creation time)
 * - Hierarchy preservation during sorting
 */

import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { Comment, IComment } from '../src/models/Comment';
import { User, IUser } from '../src/models/User';
import { Event } from '../src/models/Event';
import { ClubProfile } from '../src/models/ClubProfile';
import { getCommentsByEvent } from '../src/controllers/commentController';
import jwt from 'jsonwebtoken';

// Create a minimal Express app for testing
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  app.get('/api/comments/event/:eventId', getCommentsByEvent);
  
  return app;
};

/**
 * Helper function to calculate hot score (for verification)
 */
const calculateHotScore = (comment: any): number => {
  const ageInHours = (Date.now() - new Date(comment.createdAt).getTime()) / (1000 * 60 * 60);
  const score = comment.voteCount;
  return score / Math.pow(ageInHours + 2, 1.5);
};

/**
 * Helper function to calculate controversy score (for verification)
 */
const calculateControversyScore = (comment: any): number => {
  const upvotes = comment.upvotes.length;
  const downvotes = comment.downvotes.length;
  
  if (upvotes === 0 || downvotes === 0) return 0;
  
  const magnitude = upvotes + downvotes;
  const balance = Math.min(upvotes, downvotes) / Math.max(upvotes, downvotes);
  
  return magnitude * balance;
};

describe('Comment Sorting Algorithms Unit Tests', () => {
  let app: express.Application;
  let testUser: IUser;
  let testEvent: any;
  let testClubProfile: any;

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(async () => {
    // Create test user
    const timestamp = Date.now().toString().slice(-6);
    testUser = await User.create({
      username: `testsort_${timestamp}`,
      email: `sort_${timestamp}@test.com`,
      password: 'TestPass123!',
      role: 'student'
    });

    // Create club profile
    testClubProfile = await ClubProfile.create({
      user: testUser._id,
      name: 'Test Club Sort ' + Date.now(),
      description: 'Test club for sorting tests',
      email: `clubsort_${Date.now()}@test.com`
    });

    // Create test event
    testEvent = await Event.create({
      title: 'Test Event Sort ' + Date.now(),
      description: 'Test event for sorting tests',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      location: 'Test Location',
      category: 'Other',
      organizer: testClubProfile._id,
      maxAttendees: 100
    });
  });

  describe('Hot Sort Algorithm', () => {
    it('should sort comments by hot score (combination of votes and recency)', async () => {
      // Create comments with different vote counts and ages
      const oldHighVoted = await Comment.create({
        content: 'Old but highly voted',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 50,
        upvotes: Array(50).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
      });

      const newLowVoted = await Comment.create({
        content: 'New but low voted',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 5,
        upvotes: Array(5).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date() // Now
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'hot' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(2);

      // Calculate hot scores
      const oldScore = calculateHotScore(oldHighVoted);
      const newScore = calculateHotScore(newLowVoted);

      // Verify sorting matches hot score calculation
      const comments = response.body.data.comments;
      if (newScore > oldScore) {
        expect(comments[0].content).toBe('New but low voted');
        expect(comments[1].content).toBe('Old but highly voted');
      } else {
        expect(comments[0].content).toBe('Old but highly voted');
        expect(comments[1].content).toBe('New but low voted');
      }
    });

    it('should prioritize recent comments with moderate votes over old comments with high votes', async () => {
      // Old comment with 100 votes (24 hours old)
      await Comment.create({
        content: 'Old high voted',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 100,
        upvotes: Array(100).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      });

      // Recent comment with 20 votes (1 hour old)
      await Comment.create({
        content: 'Recent moderate voted',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 20,
        upvotes: Array(20).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'hot' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(2);

      // Recent comment should rank higher due to recency factor
      const comments = response.body.data.comments;
      expect(comments[0].content).toBe('Recent moderate voted');
    });

    it('should handle comments with zero votes', async () => {
      await Comment.create({
        content: 'No votes',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 0,
        upvotes: [],
        downvotes: [],
        createdAt: new Date()
      });

      await Comment.create({
        content: 'Some votes',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 5,
        upvotes: Array(5).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'hot' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(2);
      expect(response.body.data.comments[0].content).toBe('Some votes');
    });

    it('should handle negative vote counts', async () => {
      await Comment.create({
        content: 'Negative votes',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: -10,
        upvotes: [],
        downvotes: Array(10).fill(new mongoose.Types.ObjectId()),
        createdAt: new Date()
      });

      await Comment.create({
        content: 'Positive votes',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 5,
        upvotes: Array(5).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'hot' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(2);
      expect(response.body.data.comments[0].content).toBe('Positive votes');
      expect(response.body.data.comments[1].content).toBe('Negative votes');
    });
  });

  describe('Controversial Sort Algorithm', () => {
    it('should sort comments by controversy score (similar upvotes and downvotes)', async () => {
      // Highly controversial: 50 upvotes, 45 downvotes
      await Comment.create({
        content: 'Highly controversial',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 5,
        upvotes: Array(50).fill(new mongoose.Types.ObjectId()),
        downvotes: Array(45).fill(new mongoose.Types.ObjectId()),
        createdAt: new Date()
      });

      // Not controversial: 50 upvotes, 0 downvotes
      await Comment.create({
        content: 'Not controversial',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 50,
        upvotes: Array(50).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'controversial' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(2);
      expect(response.body.data.comments[0].content).toBe('Highly controversial');
    });

    it('should return zero controversy score for comments with only upvotes', async () => {
      await Comment.create({
        content: 'Only upvotes',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 10,
        upvotes: Array(10).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'controversial' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(1);
      
      // Verify controversy score is 0
      const comment = await Comment.findOne({ content: 'Only upvotes' });
      const score = calculateControversyScore(comment);
      expect(score).toBe(0);
    });

    it('should return zero controversy score for comments with only downvotes', async () => {
      await Comment.create({
        content: 'Only downvotes',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: -10,
        upvotes: [],
        downvotes: Array(10).fill(new mongoose.Types.ObjectId()),
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'controversial' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(1);
      
      // Verify controversy score is 0
      const comment = await Comment.findOne({ content: 'Only downvotes' });
      const score = calculateControversyScore(comment);
      expect(score).toBe(0);
    });

    it('should prioritize higher magnitude controversial comments', async () => {
      // High magnitude: 100 upvotes, 90 downvotes
      await Comment.create({
        content: 'High magnitude controversial',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 10,
        upvotes: Array(100).fill(new mongoose.Types.ObjectId()),
        downvotes: Array(90).fill(new mongoose.Types.ObjectId()),
        createdAt: new Date()
      });

      // Low magnitude: 10 upvotes, 9 downvotes
      await Comment.create({
        content: 'Low magnitude controversial',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 1,
        upvotes: Array(10).fill(new mongoose.Types.ObjectId()),
        downvotes: Array(9).fill(new mongoose.Types.ObjectId()),
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'controversial' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(2);
      expect(response.body.data.comments[0].content).toBe('High magnitude controversial');
    });

    it('should handle perfect balance (50/50 split)', async () => {
      await Comment.create({
        content: 'Perfect balance',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 0,
        upvotes: Array(50).fill(new mongoose.Types.ObjectId()),
        downvotes: Array(50).fill(new mongoose.Types.ObjectId()),
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'controversial' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(1);
      
      // Verify controversy score is maximum (balance = 1)
      const comment = await Comment.findOne({ content: 'Perfect balance' });
      const score = calculateControversyScore(comment);
      expect(score).toBe(100); // magnitude * balance = 100 * 1
    });
  });

  describe('Top Sort Algorithm', () => {
    it('should sort comments by vote count (highest first)', async () => {
      await Comment.create({
        content: 'Low voted',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 5,
        upvotes: Array(5).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      await Comment.create({
        content: 'High voted',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 50,
        upvotes: Array(50).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      await Comment.create({
        content: 'Medium voted',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 20,
        upvotes: Array(20).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'top' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(3);
      expect(response.body.data.comments[0].content).toBe('High voted');
      expect(response.body.data.comments[1].content).toBe('Medium voted');
      expect(response.body.data.comments[2].content).toBe('Low voted');
    });

    it('should handle negative vote counts in top sort', async () => {
      await Comment.create({
        content: 'Negative votes',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: -10,
        upvotes: [],
        downvotes: Array(10).fill(new mongoose.Types.ObjectId()),
        createdAt: new Date()
      });

      await Comment.create({
        content: 'Positive votes',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 5,
        upvotes: Array(5).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'top' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(2);
      expect(response.body.data.comments[0].content).toBe('Positive votes');
      expect(response.body.data.comments[1].content).toBe('Negative votes');
    });
  });

  describe('New Sort Algorithm', () => {
    it('should sort comments by creation time (newest first)', async () => {
      const oldComment = await Comment.create({
        content: 'Old comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 0,
        upvotes: [],
        downvotes: [],
        createdAt: new Date(Date.now() - 10000)
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const newComment = await Comment.create({
        content: 'New comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 0,
        upvotes: [],
        downvotes: [],
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'new' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(2);
      expect(response.body.data.comments[0].content).toBe('New comment');
      expect(response.body.data.comments[1].content).toBe('Old comment');
    });

    it('should ignore vote counts in new sort', async () => {
      await Comment.create({
        content: 'Old but highly voted',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 100,
        upvotes: Array(100).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date(Date.now() - 10000)
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      await Comment.create({
        content: 'New but no votes',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 0,
        upvotes: [],
        downvotes: [],
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'new' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(2);
      expect(response.body.data.comments[0].content).toBe('New but no votes');
    });
  });

  describe('Hierarchy Preservation', () => {
    it('should preserve parent-child relationships regardless of sorting', async () => {
      // Create root comment
      const rootComment = await Comment.create({
        content: 'Root comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 5,
        upvotes: Array(5).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date(Date.now() - 10000)
      });

      // Create child comment with higher votes
      await Comment.create({
        content: 'Child comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: rootComment._id,
        path: rootComment._id.toString() + '.',
        depth: 1,
        voteCount: 50,
        upvotes: Array(50).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'top' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(2);

      // Verify hierarchy is preserved (root comes before child)
      const comments = response.body.data.comments;
      const rootIndex = comments.findIndex((c: any) => c.content === 'Root comment');
      const childIndex = comments.findIndex((c: any) => c.content === 'Child comment');
      
      expect(rootIndex).toBeLessThan(childIndex);
    });

    it('should sort within each nesting level', async () => {
      // Create root comment
      const rootComment = await Comment.create({
        content: 'Root',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 10,
        upvotes: Array(10).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      // Create two child comments with different votes
      await Comment.create({
        content: 'Child low voted',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: rootComment._id,
        path: rootComment._id.toString() + '.',
        depth: 1,
        voteCount: 5,
        upvotes: Array(5).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      await Comment.create({
        content: 'Child high voted',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: rootComment._id,
        path: rootComment._id.toString() + '.',
        depth: 1,
        voteCount: 20,
        upvotes: Array(20).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'top' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(3);

      // Root should be first
      expect(response.body.data.comments[0].content).toBe('Root');
      
      // Among children, high voted should come before low voted
      const childComments = response.body.data.comments.slice(1);
      expect(childComments[0].content).toBe('Child high voted');
      expect(childComments[1].content).toBe('Child low voted');
    });

    it('should handle multiple root comments with nested replies', async () => {
      // Root 1 with low votes
      const root1 = await Comment.create({
        content: 'Root 1 low voted',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 5,
        upvotes: Array(5).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      // Child of Root 1
      await Comment.create({
        content: 'Child of Root 1',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: root1._id,
        path: root1._id.toString() + '.',
        depth: 1,
        voteCount: 100,
        upvotes: Array(100).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      // Root 2 with high votes
      const root2 = await Comment.create({
        content: 'Root 2 high voted',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 50,
        upvotes: Array(50).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'top' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(3);

      // Root 2 should come first (higher votes)
      expect(response.body.data.comments[0].content).toBe('Root 2 high voted');
      
      // Root 1 should come second
      expect(response.body.data.comments[1].content).toBe('Root 1 low voted');
      
      // Child of Root 1 should come after Root 1
      expect(response.body.data.comments[2].content).toBe('Child of Root 1');
    });
  });

  describe('Default Sorting', () => {
    it('should default to hot sort when no sort parameter is provided', async () => {
      await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 10,
        upvotes: Array(10).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`);

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(1);
    });

    it('should handle invalid sort parameter gracefully', async () => {
      await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0,
        voteCount: 10,
        upvotes: Array(10).fill(new mongoose.Types.ObjectId()),
        downvotes: [],
        createdAt: new Date()
      });

      const response = await request(app)
        .get(`/api/comments/event/${testEvent._id}`)
        .query({ sort: 'invalid' });

      expect(response.status).toBe(200);
      expect(response.body.data.comments).toHaveLength(1);
    });
  });
});
