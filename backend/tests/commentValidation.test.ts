/**
 * Comment Validation Property Tests
 * 
 * **Validates: Requirements 1.8, 13.1, 13.2**
 * 
 * These tests verify that comment validation rules are enforced correctly
 * using property-based testing. All comment content must be non-empty and
 * not exceed 2000 characters.
 */

import fc from 'fast-check';
import mongoose from 'mongoose';
import { Comment, IComment } from '../src/models/Comment';
import { User, IUser } from '../src/models/User';
import { Event } from '../src/models/Event';
import { ClubProfile } from '../src/models/ClubProfile';

describe('Property 9: Comment Validation', () => {
  let testUser: IUser;
  let testEvent: any;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      username: 'testuser_validation',
      email: 'testvalidation@test.com',
      password: 'TestPass123!',
      role: 'student'
    });

    // Create test event
    const clubProfile = await ClubProfile.create({
      user: testUser._id,
      name: 'Test Club Validation',
      description: 'Test club for validation',
      email: 'clubvalidation@test.com'
    });

    testEvent = await Event.create({
      title: 'Test Event Validation',
      description: 'Test event for validation',
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

  /**
   * Property 9: Comment Validation
   * For any comment creation request, the content must be non-empty and ≤2000 characters
   */
  describe('Content length validation', () => {
    it('should accept valid comment content (1-2000 characters)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
          async (content) => {
            const comment: IComment = await Comment.create({
              content: content.trim(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Comment should be created successfully
            expect(comment).toBeDefined();
            expect(comment.content).toBe(content.trim());
            expect(comment.content.length).toBeGreaterThan(0);
            expect(comment.content.length).toBeLessThanOrEqual(2000);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject empty comment content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('', ' ', '  ', '\t', '\n', '   \t\n  '),
          async (emptyContent) => {
            // Attempt to create comment with empty content
            await expect(
              Comment.create({
                content: emptyContent,
                author: testUser._id,
                eventId: testEvent._id,
                parentId: null,
                path: '',
                depth: 0
              })
            ).rejects.toThrow();
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should reject comment content exceeding 2000 characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2001, maxLength: 3000 }),
          async (longContent) => {
            // Attempt to create comment with content > 2000 chars
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
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should accept comment content at exactly 2000 characters', async () => {
      const exactContent = 'a'.repeat(2000);
      
      const comment: IComment = await Comment.create({
        content: exactContent,
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      expect(comment).toBeDefined();
      expect(comment.content.length).toBe(2000);
    });

    it('should trim whitespace from comment content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 0, maxLength: 10 }).filter(s => /^\s*$/.test(s)),
          async (content, whitespace) => {
            const paddedContent = whitespace + content + whitespace;
            
            const comment: IComment = await Comment.create({
              content: paddedContent,
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Content should be trimmed
            expect(comment.content).toBe(paddedContent.trim());
            expect(comment.content).not.toMatch(/^\s/);
            expect(comment.content).not.toMatch(/\s$/);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Verify that validation works consistently across different content types
   */
  describe('Content type validation', () => {
    it('should accept various valid content types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            fc.lorem({ maxCount: 50 }),
            fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            fc.constant('Valid comment with special chars: !@#$%^&*()'),
            fc.constant('Comment with numbers: 123456789'),
            fc.constant('Comment with emoji: 😀 🎉 👍')
          ),
          async (content) => {
            const comment: IComment = await Comment.create({
              content: content.trim(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            expect(comment).toBeDefined();
            expect(comment.content.length).toBeGreaterThan(0);
            expect(comment.content.length).toBeLessThanOrEqual(2000);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle unicode characters correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 500 })
            .filter(s => s.trim().length > 0),
          async (unicodeContent) => {
            const comment: IComment = await Comment.create({
              content: unicodeContent.trim(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            expect(comment).toBeDefined();
            expect(comment.content).toBe(unicodeContent.trim());
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Verify boundary conditions
   */
  describe('Boundary condition validation', () => {
    it('should accept content at minimum length (1 character)', async () => {
      const comment: IComment = await Comment.create({
        content: 'a',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      expect(comment).toBeDefined();
      expect(comment.content).toBe('a');
      expect(comment.content.length).toBe(1);
    });

    it('should reject content at 2001 characters', async () => {
      const tooLongContent = 'a'.repeat(2001);
      
      await expect(
        Comment.create({
          content: tooLongContent,
          author: testUser._id,
          eventId: testEvent._id,
          parentId: null,
          path: '',
          depth: 0
        })
      ).rejects.toThrow();
    });

    it('should handle content near the 2000 character boundary', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1995, max: 2000 }),
          async (length) => {
            const content = 'a'.repeat(length);
            
            const comment: IComment = await Comment.create({
              content,
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            expect(comment).toBeDefined();
            expect(comment.content.length).toBe(length);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
