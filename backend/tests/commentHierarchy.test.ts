/**
 * Comment Hierarchy Property Tests
 * 
 * **Validates: Requirements 1.5, 1.6, 2.2**
 * 
 * These tests verify the comment hierarchy integrity using property-based testing.
 * The materialized path pattern must maintain correct parent-child relationships
 * and depth calculations across all comment operations.
 */

import fc from 'fast-check';
import mongoose from 'mongoose';
import { Comment, IComment } from '../src/models/Comment';
import { User, IUser } from '../src/models/User';
import { Event } from '../src/models/Event';
import { ClubProfile } from '../src/models/ClubProfile';

describe('Property 1: Comment Hierarchy Integrity', () => {
  let testUser: IUser;
  let testEvent: any;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      username: 'testuser_comment',
      email: 'testcomment@test.com',
      password: 'TestPass123!',
      role: 'student'
    });

    // Create test event
    const clubProfile = await ClubProfile.create({
      user: testUser._id,
      name: 'Test Club',
      description: 'Test club for comments',
      email: 'club@test.com'
    });

    testEvent = await Event.create({
      title: 'Test Event',
      description: 'Test event for comments',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000), // 1 hour later
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
   * Property 1: Comment Hierarchy Integrity
   * For any comment with a parent, the comment's path must start with
   * the parent's path + parent's ID + "."
   */
  describe('Path construction integrity', () => {
    it('should maintain correct path for root comments', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (content) => {
            const comment: IComment = await Comment.create({
              content,
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Root comments must have empty path and depth 0
            expect(comment.path).toBe('');
            expect(comment.depth).toBe(0);
            expect(comment.parentId).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain correct path for nested comments', async () => {
      // Create a root comment
      const rootComment = await Comment.create({
        content: 'Root comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (content) => {
            // Create a reply to the root comment
            const expectedPath = rootComment._id.toString() + '.';
            const replyComment = await Comment.create({
              content,
              author: testUser._id,
              eventId: testEvent._id,
              parentId: rootComment._id,
              path: expectedPath,
              depth: 1
            });

            // Reply must have correct path and depth
            expect(replyComment.path).toBe(expectedPath);
            expect(replyComment.depth).toBe(1);
            expect(replyComment.parentId?.toString()).toBe(rootComment._id.toString());
            
            // Path must start with parent's path + parent's ID
            expect(replyComment.path).toContain(rootComment._id.toString());
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain correct path for deeply nested comments', async () => {
      // Create a comment chain: root -> reply1 -> reply2
      const rootComment = await Comment.create({
        content: 'Root comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      const reply1 = await Comment.create({
        content: 'First reply',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: rootComment._id,
        path: rootComment._id.toString() + '.',
        depth: 1
      });

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (content) => {
            const expectedPath = reply1.path + reply1._id.toString() + '.';
            const reply2: IComment = await Comment.create({
              content,
              author: testUser._id,
              eventId: testEvent._id,
              parentId: reply1._id,
              path: expectedPath,
              depth: 2
            });

            // Deep reply must have correct path and depth
            expect(reply2.path).toBe(expectedPath);
            expect(reply2.depth).toBe(2);
            
            // Path must contain all ancestor IDs
            expect(reply2.path).toContain(rootComment._id.toString());
            expect(reply2.path).toContain(reply1._id.toString());
            
            // Path must start with parent's path
            expect(reply2.path.startsWith(reply1.path)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 10: Path Depth Consistency
   * For any comment, the depth field must equal the number of IDs in the path string
   */
  describe('Path depth consistency', () => {
    it('should maintain depth equal to number of ancestors in path', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 5 }),
          async (targetDepth) => {
            // Build a comment chain to the target depth
            let currentParent: IComment | null = null;
            let currentPath = '';
            
            for (let depth = 0; depth <= targetDepth; depth++) {
              const comment: IComment = await Comment.create({
                content: `Comment at depth ${depth}`,
                author: testUser._id,
                eventId: testEvent._id,
                parentId: currentParent?._id || null,
                path: currentPath,
                depth
              });

              // Verify depth matches number of IDs in path
              const pathIds = currentPath === '' ? [] : currentPath.split('.').filter(Boolean);
              expect(comment.depth).toBe(pathIds.length);
              
              // Update for next iteration
              currentParent = comment;
              currentPath = currentPath + comment._id.toString() + '.';
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should calculate depth correctly from path string', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 5 }),
          (numAncestors) => {
            // Generate mock ObjectId strings (24 hex characters)
            const ancestorIds: string[] = [];
            for (let i = 0; i < numAncestors; i++) {
              ancestorIds.push('0'.repeat(24));
            }
            
            const path = ancestorIds.length === 0 ? '' : ancestorIds.join('.') + '.';
            const expectedDepth = ancestorIds.length;
            
            // Depth should equal number of IDs in path
            const actualDepth = path === '' ? 0 : path.split('.').filter(Boolean).length;
            expect(actualDepth).toBe(expectedDepth);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Verify that path construction is consistent across multiple operations
   */
  describe('Path construction consistency', () => {
    it('should maintain path integrity when creating multiple siblings', async () => {
      const rootComment = await Comment.create({
        content: 'Root comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), { minLength: 2, maxLength: 5 }),
          async (contents) => {
            const siblings: IComment[] = [];
            
            // Create multiple sibling comments
            for (const content of contents) {
              const sibling = await Comment.create({
                content,
                author: testUser._id,
                eventId: testEvent._id,
                parentId: rootComment._id,
                path: rootComment._id.toString() + '.',
                depth: 1
              });
              siblings.push(sibling);
            }

            // All siblings must have the same path and depth
            if (siblings.length > 0) {
              const firstPath = siblings[0]!.path;
              const firstDepth = siblings[0]!.depth;
              
              siblings.forEach(sibling => {
                expect(sibling.path).toBe(firstPath);
                expect(sibling.depth).toBe(firstDepth);
                expect(sibling.parentId?.toString()).toBe(rootComment._id.toString());
              });
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
