/**
 * Comment Model Unit Tests
 * 
 * **Validates: Requirements 1.6, 13.1, 13.2, 13.3**
 * 
 * These tests verify the Comment model's basic functionality including:
 * - Model creation and validation
 * - Field constraints and defaults
 * - Schema validation rules
 * - Index creation
 */

import mongoose from 'mongoose';
import { Comment, IComment } from '../src/models/Comment';
import { User, IUser } from '../src/models/User';
import { Event } from '../src/models/Event';
import { ClubProfile } from '../src/models/ClubProfile';

describe('Comment Model Unit Tests', () => {
  let testUser: IUser;
  let testEvent: any;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      username: 'testuser_comment_unit',
      email: 'commentunit@test.com',
      password: 'TestPass123!',
      role: 'student'
    });

    // Create test event
    const clubProfile = await ClubProfile.create({
      user: testUser._id,
      name: 'Test Club Unit',
      description: 'Test club for comment unit tests',
      email: 'clubunit@test.com'
    });

    testEvent = await Event.create({
      title: 'Test Event Unit',
      description: 'Test event for comment unit tests',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      location: 'Test Location',
      category: 'Other',
      organizer: clubProfile._id,
      maxAttendees: 100
    });
  });

  afterAll(async () => {
    await Comment.deleteMany({});
    await Event.deleteMany({});
    await ClubProfile.deleteMany({});
    await User.deleteMany({});
  });

  afterEach(async () => {
    await Comment.deleteMany({});
  });

  describe('Model Creation', () => {
    it('should create a valid root comment', async () => {
      const comment = await Comment.create({
        content: 'This is a test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      expect(comment).toBeDefined();
      expect(comment._id).toBeDefined();
      expect(comment.content).toBe('This is a test comment');
      expect(comment.author.toString()).toBe(testUser._id.toString());
      expect(comment.eventId.toString()).toBe(testEvent._id.toString());
      expect(comment.parentId).toBeNull();
      expect(comment.path).toBe('');
      expect(comment.depth).toBe(0);
      expect(comment.upvotes).toEqual([]);
      expect(comment.downvotes).toEqual([]);
      expect(comment.voteCount).toBe(0);
      expect(comment.isDeleted).toBe(false);
      expect(comment.isEdited).toBe(false);
    });

    it('should create a valid nested comment', async () => {
      const rootComment = await Comment.create({
        content: 'Root comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const nestedComment = await Comment.create({
        content: 'Nested comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: rootComment._id,
        path: rootComment._id.toString() + '.',
        depth: 1
      });

      expect(nestedComment).toBeDefined();
      expect(nestedComment.parentId?.toString()).toBe(rootComment._id.toString());
      expect(nestedComment.path).toBe(rootComment._id.toString() + '.');
      expect(nestedComment.depth).toBe(1);
    });
  });

  describe('Field Validation', () => {
    it('should require content field', async () => {
      await expect(
        Comment.create({
          author: testUser._id,
          eventId: testEvent._id,
          parentId: null,
          path: '',
          depth: 0
        })
      ).rejects.toThrow();
    });

    it('should require author field', async () => {
      await expect(
        Comment.create({
          content: 'Test comment',
          eventId: testEvent._id,
          parentId: null,
          path: '',
          depth: 0
        })
      ).rejects.toThrow();
    });

    it('should require eventId field', async () => {
      await expect(
        Comment.create({
          content: 'Test comment',
          author: testUser._id,
          parentId: null,
          path: '',
          depth: 0
        })
      ).rejects.toThrow();
    });

    it('should reject empty content', async () => {
      await expect(
        Comment.create({
          content: '',
          author: testUser._id,
          eventId: testEvent._id,
          parentId: null,
          path: '',
          depth: 0
        })
      ).rejects.toThrow();
    });

    it('should reject content exceeding 2000 characters', async () => {
      const longContent = 'a'.repeat(2001);
      
      await expect(
        Comment.create({
          content: longContent,
          author: testUser._id,
          eventId: testEvent._id,
          parentId: null,
          path: '',
          depth: 0
        })
      ).rejects.toThrow();
    });

    it('should accept content at exactly 2000 characters', async () => {
      const maxContent = 'a'.repeat(2000);
      
      const comment = await Comment.create({
        content: maxContent,
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      expect(comment.content).toBe(maxContent);
      expect(comment.content.length).toBe(2000);
    });
  });

  describe('Default Values', () => {
    it('should set default values for optional fields', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      expect(comment.upvotes).toEqual([]);
      expect(comment.downvotes).toEqual([]);
      expect(comment.voteCount).toBe(0);
      expect(comment.isDeleted).toBe(false);
      expect(comment.deletedBy).toBeNull();
      expect(comment.deletedAt).toBeNull();
      expect(comment.moderationReason).toBeNull();
      expect(comment.isEdited).toBe(false);
      expect(comment.editedAt).toBeNull();
      expect(comment.createdAt).toBeDefined();
      expect(comment.updatedAt).toBeDefined();
    });
  });

  describe('Voting Arrays', () => {
    it('should allow adding user IDs to upvotes array', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const voter = await User.create({
        username: 'voter1',
        email: 'voter1@test.com',
        password: 'TestPass123!',
        role: 'student'
      });

      comment.upvotes.push(voter._id);
      comment.voteCount = comment.upvotes.length - comment.downvotes.length;
      await comment.save();

      const updated = await Comment.findById(comment._id);
      expect(updated?.upvotes).toHaveLength(1);
      expect(updated?.upvotes[0]?.toString()).toBe(voter._id.toString());
      expect(updated?.voteCount).toBe(1);
    });

    it('should allow adding user IDs to downvotes array', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const voter = await User.create({
        username: 'voter2',
        email: 'voter2@test.com',
        password: 'TestPass123!',
        role: 'student'
      });

      comment.downvotes.push(voter._id);
      comment.voteCount = comment.upvotes.length - comment.downvotes.length;
      await comment.save();

      const updated = await Comment.findById(comment._id);
      expect(updated?.downvotes).toHaveLength(1);
      expect(updated?.downvotes[0]?.toString()).toBe(voter._id.toString());
      expect(updated?.voteCount).toBe(-1);
    });
  });

  describe('Soft Delete', () => {
    it('should support soft delete with isDeleted flag', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      comment.isDeleted = true;
      comment.deletedBy = testUser._id;
      comment.deletedAt = new Date();
      await comment.save();

      const updated = await Comment.findById(comment._id);
      expect(updated?.isDeleted).toBe(true);
      expect(updated?.deletedBy?.toString()).toBe(testUser._id.toString());
      expect(updated?.deletedAt).toBeDefined();
    });

    it('should support moderation reason for deleted comments', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      comment.isDeleted = true;
      comment.deletedBy = testUser._id;
      comment.deletedAt = new Date();
      comment.moderationReason = 'Inappropriate content';
      await comment.save();

      const updated = await Comment.findById(comment._id);
      expect(updated?.moderationReason).toBe('Inappropriate content');
    });
  });

  describe('Edit Tracking', () => {
    it('should track comment edits', async () => {
      const comment = await Comment.create({
        content: 'Original content',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      comment.content = 'Edited content';
      comment.isEdited = true;
      comment.editedAt = new Date();
      await comment.save();

      const updated = await Comment.findById(comment._id);
      expect(updated?.content).toBe('Edited content');
      expect(updated?.isEdited).toBe(true);
      expect(updated?.editedAt).toBeDefined();
    });
  });

  describe('Indexes', () => {
    it('should have indexes defined on the model', () => {
      const indexes = Comment.schema.indexes();
      
      // Check that indexes exist
      expect(indexes.length).toBeGreaterThan(0);
      
      // Verify specific indexes
      const indexFields = indexes.map((idx: any) => Object.keys(idx[0]));
      
      // Should have eventId and path index
      const hasEventIdPathIndex = indexFields.some((fields: string[]) => 
        fields.includes('eventId') && fields.includes('path')
      );
      expect(hasEventIdPathIndex).toBe(true);
    });
  });

  describe('Timestamps', () => {
    it('should automatically set createdAt and updatedAt', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      expect(comment.createdAt).toBeDefined();
      expect(comment.updatedAt).toBeDefined();
      expect(comment.createdAt).toBeInstanceOf(Date);
      expect(comment.updatedAt).toBeInstanceOf(Date);
    });

    it('should update updatedAt on save', async () => {
      const comment = await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const originalUpdatedAt = comment.updatedAt;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      comment.content = 'Updated content';
      await comment.save();

      expect(comment.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
