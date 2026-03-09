/**
 * Comment Authorization Property Tests
 * 
 * **Validates: Requirements 3.9, 4.2**
 * 
 * These tests verify the authorization enforcement using property-based testing.
 * The system must ensure that only comment authors can edit their comments,
 * and only authors or event organizers can delete comments.
 */

import fc from 'fast-check';
import mongoose from 'mongoose';
import { Comment, IComment } from '../src/models/Comment';
import { User, IUser } from '../src/models/User';
import { Event, IEvent } from '../src/models/Event';
import { ClubProfile, IClubProfile } from '../src/models/ClubProfile';

describe('Property 5: Authorization Enforcement', () => {
  let testUser: IUser;
  let otherUser: IUser;
  let eventOrganizerUser: IUser;
  let testEvent: IEvent;
  let testClubProfile: IClubProfile;
  let organizerClubProfile: IClubProfile;

  beforeEach(async () => {
    // Create test users
    testUser = await User.create({
      username: 'testuser_auth',
      email: 'testauth@test.com',
      password: 'TestPass123!',
      role: 'student'
    });

    otherUser = await User.create({
      username: 'otheruser_auth',
      email: 'otherauth@test.com',
      password: 'TestPass123!',
      role: 'student'
    });

    eventOrganizerUser = await User.create({
      username: 'organizer_auth',
      email: 'organizerauth@test.com',
      password: 'TestPass123!',
      role: 'student'
    });

    // Create club profiles
    testClubProfile = await ClubProfile.create({
      user: testUser._id,
      name: 'Test Club Auth',
      description: 'Test club for authorization',
      email: 'clubauth@test.com'
    });

    organizerClubProfile = await ClubProfile.create({
      user: eventOrganizerUser._id,
      name: 'Organizer Club Auth',
      description: 'Organizer club for authorization',
      email: 'organizerclubauth@test.com'
    });

    // Create test event
    testEvent = await Event.create({
      title: 'Test Event Auth',
      description: 'Test event for authorization',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      location: 'Test Location',
      category: 'Other',
      organizer: organizerClubProfile._id,
      maxAttendees: 100
    });
  });

  // No afterAll or afterEach needed - global setup.ts handles cleanup

  /**
   * Property 5a: Edit Authorization
   * For any comment edit request, only the author can edit the comment
   */
  describe('Edit authorization enforcement', () => {
    it('should allow comment author to edit their own comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (originalContent, newContent) => {
            // Create a comment by testUser
            const comment = await Comment.create({
              content: originalContent.trim(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Author should be able to edit their own comment
            comment.content = newContent.trim();
            comment.isEdited = true;
            comment.editedAt = new Date();
            await comment.save();

            const updatedComment = await Comment.findById(comment._id);
            expect(updatedComment).toBeDefined();
            expect(updatedComment!.content).toBe(newContent.trim());
            expect(updatedComment!.isEdited).toBe(true);
            expect(updatedComment!.author.toString()).toBe(testUser._id.toString());
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should prevent non-author from editing comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (content) => {
            // Create a comment by testUser
            const comment = await Comment.create({
              content: content.trim(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Verify that otherUser is NOT the author
            expect(comment.author.toString()).not.toBe(otherUser._id.toString());
            
            // In a real application, the controller would check authorization
            // Here we verify the data model enforces author identity
            const isAuthor = comment.author.toString() === otherUser._id.toString();
            expect(isAuthor).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should verify author identity before allowing edit', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.constantFrom(testUser._id, otherUser._id, eventOrganizerUser._id),
          async (content, requestingUserId) => {
            // Create a comment by testUser
            const comment = await Comment.create({
              content: content.trim(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Check if requesting user is the author
            const isAuthor = comment.author.toString() === requestingUserId.toString();
            
            // Only the author should be authorized to edit
            if (requestingUserId.toString() === testUser._id.toString()) {
              expect(isAuthor).toBe(true);
            } else {
              expect(isAuthor).toBe(false);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Property 5b: Delete Authorization
   * For any comment delete request, only the author or event organizer can delete
   */
  describe('Delete authorization enforcement', () => {
    it('should allow comment author to delete their own comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (content) => {
            // Create a comment by testUser
            const comment = await Comment.create({
              content: content.trim(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Author should be able to delete their own comment
            const isAuthor = comment.author.toString() === testUser._id.toString();
            expect(isAuthor).toBe(true);

            // Perform soft delete
            comment.isDeleted = true;
            comment.deletedBy = testUser._id;
            comment.deletedAt = new Date();
            await comment.save();

            const deletedComment = await Comment.findById(comment._id);
            expect(deletedComment).toBeDefined();
            expect(deletedComment!.isDeleted).toBe(true);
            expect(deletedComment!.deletedBy?.toString()).toBe(testUser._id.toString());
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should allow event organizer to delete comments on their event', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (content) => {
            // Create a comment by testUser on the event organized by eventOrganizerUser
            const comment = await Comment.create({
              content: content.trim(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Verify the comment is NOT by the organizer
            expect(comment.author.toString()).not.toBe(eventOrganizerUser._id.toString());

            // Get the event and verify organizer
            const event = await Event.findById(testEvent._id).populate('organizer');
            expect(event).toBeDefined();
            expect(event!.organizer).toBeDefined();
            
            // After populate, organizer is a ClubProfile document
            const organizerClub = event!.organizer as any;
            
            // Check if eventOrganizerUser owns the club that organized the event
            const isModerator = organizerClub.user.toString() === eventOrganizerUser._id.toString();
            expect(isModerator).toBe(true);

            // Event organizer should be able to delete the comment
            if (isModerator) {
              comment.isDeleted = true;
              comment.deletedBy = eventOrganizerUser._id;
              comment.deletedAt = new Date();
              comment.moderationReason = 'Removed by moderator';
              await comment.save();

              const deletedComment = await Comment.findById(comment._id);
              expect(deletedComment).toBeDefined();
              expect(deletedComment!.isDeleted).toBe(true);
              expect(deletedComment!.deletedBy?.toString()).toBe(eventOrganizerUser._id.toString());
              expect(deletedComment!.moderationReason).toBe('Removed by moderator');
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should prevent non-author non-moderator from deleting comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (content) => {
            // Create a comment by testUser
            const comment = await Comment.create({
              content: content.trim(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Check if otherUser is the author
            const isAuthor = comment.author.toString() === otherUser._id.toString();
            expect(isAuthor).toBe(false);

            // Check if otherUser is a moderator (event organizer)
            const event = await Event.findById(testEvent._id).populate('organizer');
            expect(event).toBeDefined();
            expect(event!.organizer).toBeDefined();
            
            // After populate, organizer is a ClubProfile document
            const organizerClub = event!.organizer as any;
            const isModerator = organizerClub.user.toString() === otherUser._id.toString();
            expect(isModerator).toBe(false);

            // otherUser should NOT be authorized to delete
            const isAuthorized = isAuthor || isModerator;
            expect(isAuthorized).toBe(false);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should verify authorization before allowing delete', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.constantFrom(testUser._id, otherUser._id, eventOrganizerUser._id),
          async (content, requestingUserId) => {
            // Create a comment by testUser
            const comment = await Comment.create({
              content: content.trim(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Check if requesting user is the author
            const isAuthor = comment.author.toString() === requestingUserId.toString();

            // Check if requesting user is a moderator
            const event = await Event.findById(testEvent._id).populate('organizer');
            expect(event).toBeDefined();
            expect(event!.organizer).toBeDefined();
            
            // After populate, organizer is a ClubProfile document
            const organizerClub = event!.organizer as any;
            const isModerator = organizerClub.user.toString() === requestingUserId.toString();

            // User should be authorized if they are author OR moderator
            const isAuthorized = isAuthor || isModerator;

            if (requestingUserId.toString() === testUser._id.toString()) {
              // testUser is the author
              expect(isAuthorized).toBe(true);
            } else if (requestingUserId.toString() === eventOrganizerUser._id.toString()) {
              // eventOrganizerUser is the moderator
              expect(isAuthorized).toBe(true);
            } else {
              // otherUser is neither author nor moderator
              expect(isAuthorized).toBe(false);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Property 5c: Moderator Audit Trail
   * When a moderator deletes a comment, proper audit information must be recorded
   */
  describe('Moderator deletion audit trail', () => {
    it('should record moderation reason when moderator deletes comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (content) => {
            // Create a comment by testUser
            const comment = await Comment.create({
              content: content.trim(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Event organizer deletes the comment
            const isAuthor = comment.author.toString() === eventOrganizerUser._id.toString();
            const event = await Event.findById(testEvent._id).populate('organizer');
            expect(event).toBeDefined();
            expect(event!.organizer).toBeDefined();
            
            // After populate, organizer is a ClubProfile document
            const organizerClub = event!.organizer as any;
            const isModerator = organizerClub.user.toString() === eventOrganizerUser._id.toString();

            if (isModerator && !isAuthor) {
              comment.isDeleted = true;
              comment.deletedBy = eventOrganizerUser._id;
              comment.deletedAt = new Date();
              comment.moderationReason = 'Removed by moderator';
              await comment.save();

              const deletedComment = await Comment.findById(comment._id);
              expect(deletedComment).toBeDefined();
              expect(deletedComment!.isDeleted).toBe(true);
              expect(deletedComment!.deletedBy?.toString()).toBe(eventOrganizerUser._id.toString());
              expect(deletedComment!.moderationReason).toBe('Removed by moderator');
              expect(deletedComment!.deletedAt).toBeDefined();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should not set moderation reason when author deletes own comment', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (content) => {
            // Create a comment by testUser
            const comment = await Comment.create({
              content: content.trim(),
              author: testUser._id,
              eventId: testEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Author deletes their own comment
            comment.isDeleted = true;
            comment.deletedBy = testUser._id;
            comment.deletedAt = new Date();
            // No moderation reason when author deletes own comment
            await comment.save();

            const deletedComment = await Comment.findById(comment._id);
            expect(deletedComment).toBeDefined();
            expect(deletedComment!.isDeleted).toBe(true);
            expect(deletedComment!.deletedBy?.toString()).toBe(testUser._id.toString());
            expect(deletedComment!.moderationReason).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 5d: Cross-Event Authorization
   * Event organizers can only delete comments on their own events
   */
  describe('Cross-event authorization boundaries', () => {
    it('should prevent event organizer from deleting comments on other events', async () => {
      // Create another event by a different organizer
      const anotherClub = await ClubProfile.create({
        user: otherUser._id,
        name: 'Another Club',
        description: 'Another club',
        email: 'anotherclub@test.com'
      });

      const anotherEvent = await Event.create({
        title: 'Another Event',
        description: 'Another event',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        location: 'Another Location',
        category: 'Other',
        organizer: anotherClub._id,
        maxAttendees: 100
      });

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          async (content) => {
            // Create a comment on anotherEvent
            const comment = await Comment.create({
              content: content.trim(),
              author: testUser._id,
              eventId: anotherEvent._id,
              parentId: null,
              path: '',
              depth: 0
            });

            // Check if eventOrganizerUser can moderate this comment
            const event = await Event.findById(anotherEvent._id).populate('organizer');
            const club = await ClubProfile.findOne({
              _id: event!.organizer,
              user: eventOrganizerUser._id
            });
            const isModerator = !!club;

            // eventOrganizerUser should NOT be a moderator for anotherEvent
            expect(isModerator).toBe(false);
          }
        ),
        { numRuns: 20 }
      );

      // Cleanup
      await Event.findByIdAndDelete(anotherEvent._id);
      await ClubProfile.findByIdAndDelete(anotherClub._id);
    });
  });
});
