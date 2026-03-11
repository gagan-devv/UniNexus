/**
 * Vote Uniqueness Property Tests
 * 
 * **Validates: Requirements 5.4, 5.5, 5.6**
 * 
 * These tests verify that a user ID cannot appear in both upvotes and downvotes
 * arrays simultaneously. The voting system must maintain vote uniqueness through
 * atomic MongoDB operations.
 */

import fc from 'fast-check';
import mongoose from 'mongoose';
import { Comment, IComment } from '../src/models/Comment';
import { User, IUser } from '../src/models/User';
import { Event } from '../src/models/Event';
import { ClubProfile } from '../src/models/ClubProfile';

describe('Property 2: Vote Uniqueness', () => {
  let testUser: IUser;
  let testEvent: any;
  let testComment: IComment;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      username: 'testuser_vote',
      email: 'testvote@test.com',
      password: 'TestPass123!',
      role: 'student'
    });

    // Create test event
    const clubProfile = await ClubProfile.create({
      user: testUser._id,
      name: 'Test Club Vote',
      description: 'Test club for voting',
      email: 'clubvote@test.com'
    });

    testEvent = await Event.create({
      title: 'Test Event Vote',
      description: 'Test event for voting',
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

  beforeEach(async () => {
    // Create a fresh comment for each test
    testComment = await Comment.create({
      content: 'Test comment for voting',
      author: testUser._id,
      eventId: testEvent._id,
      parentId: null,
      path: '',
      depth: 0
    });
  });

  afterEach(async () => {
    await Comment.deleteMany({});
  });

  /**
   * Property 2: Vote Uniqueness
   * For any comment, a user ID cannot appear in both upvotes and downvotes arrays simultaneously
   */
  describe('Vote uniqueness enforcement', () => {
    it('should ensure user appears in only upvotes or downvotes, never both', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            userId: fc.string().map(() => new mongoose.Types.ObjectId()),
            voteType: fc.constantFrom('upvote', 'downvote')
          }), { minLength: 1, maxLength: 20 }),
          async (votes) => {
            // Create a fresh comment
            const comment = await Comment.create({
              content: 'Test comment',
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Apply all votes
            for (const vote of votes) {
              if (vote.voteType === 'upvote') {
                await Comment.findByIdAndUpdate(comment._id, {
                  $addToSet: { upvotes: vote.userId },
                  $pull: { downvotes: vote.userId }
                });
              } else {
                await Comment.findByIdAndUpdate(comment._id, {
                  $addToSet: { downvotes: vote.userId },
                  $pull: { upvotes: vote.userId }
                });
              }
            }

            // Fetch updated comment
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            // Verify no user appears in both arrays
            const upvoteIds = updatedComment.upvotes.map(id => id.toString());
            const downvoteIds = updatedComment.downvotes.map(id => id.toString());

            const intersection = upvoteIds.filter(id => downvoteIds.includes(id));
            expect(intersection.length).toBe(0);

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain uniqueness when switching from upvote to downvote', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string().map(() => new mongoose.Types.ObjectId()), { minLength: 1, maxLength: 10 }),
          async (userIds) => {
            // Create a fresh comment
            const comment = await Comment.create({
              content: 'Test comment',
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // First, all users upvote
            for (const userId of userIds) {
              await Comment.findByIdAndUpdate(comment._id, {
                $addToSet: { upvotes: userId },
                $pull: { downvotes: userId }
              });
            }

            // Then, all users switch to downvote
            for (const userId of userIds) {
              await Comment.findByIdAndUpdate(comment._id, {
                $addToSet: { downvotes: userId },
                $pull: { upvotes: userId }
              });
            }

            // Fetch updated comment
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            // All users should be in downvotes, none in upvotes
            expect(updatedComment.upvotes.length).toBe(0);
            expect(updatedComment.downvotes.length).toBe(userIds.length);

            // Verify no duplicates in downvotes
            const downvoteIds = updatedComment.downvotes.map(id => id.toString());
            const uniqueDownvotes = [...new Set(downvoteIds)];
            expect(downvoteIds.length).toBe(uniqueDownvotes.length);

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain uniqueness when switching from downvote to upvote', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string().map(() => new mongoose.Types.ObjectId()), { minLength: 1, maxLength: 10 }),
          async (userIds) => {
            // Create a fresh comment
            const comment = await Comment.create({
              content: 'Test comment',
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // First, all users downvote
            for (const userId of userIds) {
              await Comment.findByIdAndUpdate(comment._id, {
                $addToSet: { downvotes: userId },
                $pull: { upvotes: userId }
              });
            }

            // Then, all users switch to upvote
            for (const userId of userIds) {
              await Comment.findByIdAndUpdate(comment._id, {
                $addToSet: { upvotes: userId },
                $pull: { downvotes: userId }
              });
            }

            // Fetch updated comment
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            // All users should be in upvotes, none in downvotes
            expect(updatedComment.upvotes.length).toBe(userIds.length);
            expect(updatedComment.downvotes.length).toBe(0);

            // Verify no duplicates in upvotes
            const upvoteIds = updatedComment.upvotes.map(id => id.toString());
            const uniqueUpvotes = [...new Set(upvoteIds)];
            expect(upvoteIds.length).toBe(uniqueUpvotes.length);

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle concurrent vote operations without duplicates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            userId: fc.string().map(() => new mongoose.Types.ObjectId()),
            voteType: fc.constantFrom('upvote', 'downvote')
          }), { minLength: 5, maxLength: 15 }),
          async (votes) => {
            // Create a fresh comment
            const comment = await Comment.create({
              content: 'Test comment',
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Apply votes concurrently
            await Promise.all(votes.map(vote => {
              if (vote.voteType === 'upvote') {
                return Comment.findByIdAndUpdate(comment._id, {
                  $addToSet: { upvotes: vote.userId },
                  $pull: { downvotes: vote.userId }
                });
              } else {
                return Comment.findByIdAndUpdate(comment._id, {
                  $addToSet: { downvotes: vote.userId },
                  $pull: { upvotes: vote.userId }
                });
              }
            }));

            // Fetch updated comment
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            // Verify no user appears in both arrays
            const upvoteIds = updatedComment.upvotes.map(id => id.toString());
            const downvoteIds = updatedComment.downvotes.map(id => id.toString());

            const intersection = upvoteIds.filter(id => downvoteIds.includes(id));
            expect(intersection.length).toBe(0);

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle vote removal correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string().map(() => new mongoose.Types.ObjectId()), { minLength: 1, maxLength: 10 }),
          fc.constantFrom('upvote', 'downvote'),
          async (userIds, initialVoteType) => {
            // Create a fresh comment
            const comment = await Comment.create({
              content: 'Test comment',
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // All users vote
            for (const userId of userIds) {
              if (initialVoteType === 'upvote') {
                await Comment.findByIdAndUpdate(comment._id, {
                  $addToSet: { upvotes: userId }
                });
              } else {
                await Comment.findByIdAndUpdate(comment._id, {
                  $addToSet: { downvotes: userId }
                });
              }
            }

            // Remove all votes
            for (const userId of userIds) {
              await Comment.findByIdAndUpdate(comment._id, {
                $pull: { upvotes: userId, downvotes: userId }
              });
            }

            // Fetch updated comment
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            // Both arrays should be empty
            expect(updatedComment.upvotes.length).toBe(0);
            expect(updatedComment.downvotes.length).toBe(0);

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Verify that $addToSet prevents duplicate votes
   */
  describe('Duplicate vote prevention', () => {
    it('should not add duplicate upvotes for the same user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string().map(() => new mongoose.Types.ObjectId()),
          fc.integer({ min: 2, max: 10 }),
          async (userId, attempts) => {
            // Create a fresh comment
            const comment = await Comment.create({
              content: 'Test comment',
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Try to upvote multiple times
            for (let i = 0; i < attempts; i++) {
              await Comment.findByIdAndUpdate(comment._id, {
                $addToSet: { upvotes: userId }
              });
            }

            // Fetch updated comment
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            // Should only have one upvote
            expect(updatedComment.upvotes.length).toBe(1);
            expect(updatedComment.upvotes[0]?.toString()).toBe(userId.toString());

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should not add duplicate downvotes for the same user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string().map(() => new mongoose.Types.ObjectId()),
          fc.integer({ min: 2, max: 10 }),
          async (userId, attempts) => {
            // Create a fresh comment
            const comment = await Comment.create({
              content: 'Test comment',
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Try to downvote multiple times
            for (let i = 0; i < attempts; i++) {
              await Comment.findByIdAndUpdate(comment._id, {
                $addToSet: { downvotes: userId }
              });
            }

            // Fetch updated comment
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            // Should only have one downvote
            expect(updatedComment.downvotes.length).toBe(1);
            expect(updatedComment.downvotes[0]?.toString()).toBe(userId.toString());

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
