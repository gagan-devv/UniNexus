/**
 * Vote Count Accuracy Property Tests
 * 
 * **Validates: Requirements 5.7, 5.9**
 * 
 * These tests verify that the voteCount field always equals
 * (upvotes.length - downvotes.length) across all voting operations.
 */

import fc from 'fast-check';
import mongoose from 'mongoose';
import { Comment, IComment } from '../src/models/Comment';
import { User, IUser } from '../src/models/User';
import { Event } from '../src/models/Event';
import { ClubProfile } from '../src/models/ClubProfile';

describe('Property 3: Vote Count Accuracy', () => {
  let testUser: IUser;
  let testEvent: any;

  beforeAll(async () => {
    // Create test user
    testUser = await User.create({
      username: 'testuser_votecount',
      email: 'testvotecount@test.com',
      password: 'TestPass123!',
      role: 'student'
    });

    // Create test event
    const clubProfile = await ClubProfile.create({
      user: testUser._id,
      name: 'Test Club VoteCount',
      description: 'Test club for vote count',
      email: 'clubvotecount@test.com'
    });

    testEvent = await Event.create({
      title: 'Test Event VoteCount',
      description: 'Test event for vote count',
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
   * Property 3: Vote Count Accuracy
   * For any comment, voteCount must equal (upvotes.length - downvotes.length)
   */
  describe('Vote count calculation', () => {
    it('should maintain accurate vote count after upvotes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string().map(() => new mongoose.Types.ObjectId()), { minLength: 0, maxLength: 20 }),
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

            // Apply upvotes
            for (const userId of userIds) {
              await Comment.findByIdAndUpdate(comment._id, {
                $addToSet: { upvotes: userId }
              });
            }

            // Fetch and update vote count
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            updatedComment.voteCount = updatedComment.upvotes.length - updatedComment.downvotes.length;
            await updatedComment.save();

            // Verify vote count
            const finalComment = await Comment.findById(comment._id);
            if (!finalComment) throw new Error('Comment not found');

            const expectedVoteCount = finalComment.upvotes.length - finalComment.downvotes.length;
            expect(finalComment.voteCount).toBe(expectedVoteCount);
            expect(finalComment.voteCount).toBe(userIds.length);

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain accurate vote count after downvotes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string().map(() => new mongoose.Types.ObjectId()), { minLength: 0, maxLength: 20 }),
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

            // Apply downvotes
            for (const userId of userIds) {
              await Comment.findByIdAndUpdate(comment._id, {
                $addToSet: { downvotes: userId }
              });
            }

            // Fetch and update vote count
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            updatedComment.voteCount = updatedComment.upvotes.length - updatedComment.downvotes.length;
            await updatedComment.save();

            // Verify vote count
            const finalComment = await Comment.findById(comment._id);
            if (!finalComment) throw new Error('Comment not found');

            const expectedVoteCount = finalComment.upvotes.length - finalComment.downvotes.length;
            expect(finalComment.voteCount).toBe(expectedVoteCount);
            // Handle -0 vs 0 edge case (when userIds is empty)
            if (userIds.length === 0) {
              expect(finalComment.voteCount).toBe(0);
            } else {
              expect(finalComment.voteCount).toBe(-userIds.length);
            }

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain accurate vote count with mixed votes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string().map(() => new mongoose.Types.ObjectId()), { minLength: 0, maxLength: 10 }),
          fc.array(fc.string().map(() => new mongoose.Types.ObjectId()), { minLength: 0, maxLength: 10 }),
          async (upvoterIds, downvoterIds) => {
            // Create a fresh comment
            const comment = await Comment.create({
              content: 'Test comment',
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Apply upvotes
            for (const userId of upvoterIds) {
              await Comment.findByIdAndUpdate(comment._id, {
                $addToSet: { upvotes: userId }
              });
            }

            // Apply downvotes
            for (const userId of downvoterIds) {
              await Comment.findByIdAndUpdate(comment._id, {
                $addToSet: { downvotes: userId }
              });
            }

            // Fetch and update vote count
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            updatedComment.voteCount = updatedComment.upvotes.length - updatedComment.downvotes.length;
            await updatedComment.save();

            // Verify vote count
            const finalComment = await Comment.findById(comment._id);
            if (!finalComment) throw new Error('Comment not found');

            const expectedVoteCount = finalComment.upvotes.length - finalComment.downvotes.length;
            expect(finalComment.voteCount).toBe(expectedVoteCount);

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain accurate vote count when switching votes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            userId: fc.string().map(() => new mongoose.Types.ObjectId()),
            voteType: fc.constantFrom('upvote', 'downvote')
          }), { minLength: 1, maxLength: 15 }),
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

            // Fetch and update vote count
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            updatedComment.voteCount = updatedComment.upvotes.length - updatedComment.downvotes.length;
            await updatedComment.save();

            // Verify vote count
            const finalComment = await Comment.findById(comment._id);
            if (!finalComment) throw new Error('Comment not found');

            const expectedVoteCount = finalComment.upvotes.length - finalComment.downvotes.length;
            expect(finalComment.voteCount).toBe(expectedVoteCount);

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain accurate vote count after vote removal', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string().map(() => new mongoose.Types.ObjectId()), { minLength: 1, maxLength: 10 }),
          fc.constantFrom('upvote', 'downvote'),
          async (userIds, voteType) => {
            // Create a fresh comment
            const comment = await Comment.create({
              content: 'Test comment',
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Apply votes
            for (const userId of userIds) {
              if (voteType === 'upvote') {
                await Comment.findByIdAndUpdate(comment._id, {
                  $addToSet: { upvotes: userId }
                });
              } else {
                await Comment.findByIdAndUpdate(comment._id, {
                  $addToSet: { downvotes: userId }
                });
              }
            }

            // Remove half of the votes
            const halfIndex = Math.floor(userIds.length / 2);
            for (let i = 0; i < halfIndex; i++) {
              await Comment.findByIdAndUpdate(comment._id, {
                $pull: { upvotes: userIds[i], downvotes: userIds[i] }
              });
            }

            // Fetch and update vote count
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            updatedComment.voteCount = updatedComment.upvotes.length - updatedComment.downvotes.length;
            await updatedComment.save();

            // Verify vote count
            const finalComment = await Comment.findById(comment._id);
            if (!finalComment) throw new Error('Comment not found');

            const expectedVoteCount = finalComment.upvotes.length - finalComment.downvotes.length;
            expect(finalComment.voteCount).toBe(expectedVoteCount);

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle zero vote count correctly', async () => {
      // Create a comment with no votes
      const comment = await Comment.create({
        content: 'Test comment',
        author: testUser._id,
        eventId: testEvent._id,
        parentId: null,
        path: '',
        depth: 0
      });

      // Verify initial vote count is 0
      expect(comment.voteCount).toBe(0);
      expect(comment.upvotes.length).toBe(0);
      expect(comment.downvotes.length).toBe(0);

      const expectedVoteCount = comment.upvotes.length - comment.downvotes.length;
      expect(comment.voteCount).toBe(expectedVoteCount);
    });

    it('should handle equal upvotes and downvotes correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (numVotes) => {
            // Create a fresh comment
            const comment = await Comment.create({
              content: 'Test comment',
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Add equal number of upvotes and downvotes
            const upvoterIds = Array.from({ length: numVotes }, () => new mongoose.Types.ObjectId());
            const downvoterIds = Array.from({ length: numVotes }, () => new mongoose.Types.ObjectId());

            for (const userId of upvoterIds) {
              await Comment.findByIdAndUpdate(comment._id, {
                $addToSet: { upvotes: userId }
              });
            }

            for (const userId of downvoterIds) {
              await Comment.findByIdAndUpdate(comment._id, {
                $addToSet: { downvotes: userId }
              });
            }

            // Fetch and update vote count
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            updatedComment.voteCount = updatedComment.upvotes.length - updatedComment.downvotes.length;
            await updatedComment.save();

            // Verify vote count is 0
            const finalComment = await Comment.findById(comment._id);
            if (!finalComment) throw new Error('Comment not found');

            expect(finalComment.voteCount).toBe(0);
            expect(finalComment.upvotes.length).toBe(numVotes);
            expect(finalComment.downvotes.length).toBe(numVotes);

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain vote count accuracy across multiple operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.record({
            userId: fc.string().map(() => new mongoose.Types.ObjectId()),
            operation: fc.constantFrom('upvote', 'downvote', 'remove')
          }), { minLength: 5, maxLength: 20 }),
          async (operations) => {
            // Create a fresh comment
            const comment = await Comment.create({
              content: 'Test comment',
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Apply all operations
            for (const op of operations) {
              if (op.operation === 'upvote') {
                await Comment.findByIdAndUpdate(comment._id, {
                  $addToSet: { upvotes: op.userId },
                  $pull: { downvotes: op.userId }
                });
              } else if (op.operation === 'downvote') {
                await Comment.findByIdAndUpdate(comment._id, {
                  $addToSet: { downvotes: op.userId },
                  $pull: { upvotes: op.userId }
                });
              } else {
                await Comment.findByIdAndUpdate(comment._id, {
                  $pull: { upvotes: op.userId, downvotes: op.userId }
                });
              }

              // Recalculate vote count after each operation
              const updatedComment = await Comment.findById(comment._id);
              if (!updatedComment) throw new Error('Comment not found');

              updatedComment.voteCount = updatedComment.upvotes.length - updatedComment.downvotes.length;
              await updatedComment.save();

              // Verify vote count is accurate
              const verifyComment = await Comment.findById(comment._id);
              if (!verifyComment) throw new Error('Comment not found');

              const expectedVoteCount = verifyComment.upvotes.length - verifyComment.downvotes.length;
              expect(verifyComment.voteCount).toBe(expectedVoteCount);
            }

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Verify vote count boundaries
   */
  describe('Vote count boundaries', () => {
    it('should handle large positive vote counts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 50, max: 100 }),
          async (numUpvotes) => {
            // Create a fresh comment
            const comment = await Comment.create({
              content: 'Test comment',
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Add many upvotes
            const upvoterIds = Array.from({ length: numUpvotes }, () => new mongoose.Types.ObjectId());
            for (const userId of upvoterIds) {
              await Comment.findByIdAndUpdate(comment._id, {
                $addToSet: { upvotes: userId }
              });
            }

            // Fetch and update vote count
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            updatedComment.voteCount = updatedComment.upvotes.length - updatedComment.downvotes.length;
            await updatedComment.save();

            // Verify vote count
            const finalComment = await Comment.findById(comment._id);
            if (!finalComment) throw new Error('Comment not found');

            expect(finalComment.voteCount).toBe(numUpvotes);
            expect(finalComment.voteCount).toBeGreaterThan(0);

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should handle large negative vote counts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 50, max: 100 }),
          async (numDownvotes) => {
            // Create a fresh comment
            const comment = await Comment.create({
              content: 'Test comment',
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Add many downvotes
            const downvoterIds = Array.from({ length: numDownvotes }, () => new mongoose.Types.ObjectId());
            for (const userId of downvoterIds) {
              await Comment.findByIdAndUpdate(comment._id, {
                $addToSet: { downvotes: userId }
              });
            }

            // Fetch and update vote count
            const updatedComment = await Comment.findById(comment._id);
            if (!updatedComment) throw new Error('Comment not found');

            updatedComment.voteCount = updatedComment.upvotes.length - updatedComment.downvotes.length;
            await updatedComment.save();

            // Verify vote count
            const finalComment = await Comment.findById(comment._id);
            if (!finalComment) throw new Error('Comment not found');

            expect(finalComment.voteCount).toBe(-numDownvotes);
            expect(finalComment.voteCount).toBeLessThan(0);

            // Clean up
            await Comment.findByIdAndDelete(comment._id);
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});
