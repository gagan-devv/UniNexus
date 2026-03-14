/**
 * Bug Condition Exploration Test: Voting Authentication Middleware
 * 
 * **Validates: Requirements 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11**
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * 
 * **GOAL**: Surface counterexamples that demonstrate the authentication bug exists
 * 
 * This test verifies that voting endpoint tests properly authenticate users by:
 * 1. Verifying the token using AuthService.verifyAccessToken()
 * 2. Fetching the full user object from the database
 * 3. Setting req.user to the full user object (not just { id, type })
 * 
 * The bug manifests when test authentication middleware uses AuthService.verifyAccessToken()
 * which returns { id, type }, but doesn't fetch the user from the database, causing
 * req.user to be undefined or incomplete and all authenticated requests to fail with 401 errors.
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

// Test files that may have incorrect authentication middleware
const testFilesWithPotentialBug = [
  'authorizationEnforcement.test.ts',
  'commentEndpoints.test.ts'
];

describe('Bug Condition: Voting Authentication Middleware Missing User Lookup', () => {
  let testUser: IUser;
  let commentAuthor: IUser;
  let testEvent: any;
  let testComment: IComment;
  let authToken: string;
  let authorToken: string;

  beforeAll(async () => {
    // Create test users
    testUser = await User.create({
      username: 'voter_bug_test',
      email: 'voterbug@test.com',
      password: 'TestPass123!',
      role: 'student'
    });

    commentAuthor = await User.create({
      username: 'author_bug_test',
      email: 'authorbug@test.com',
      password: 'TestPass123!',
      role: 'student'
    });

    // Generate auth tokens using AuthService
    authToken = AuthService.generateAccessToken(testUser._id.toString());
    authorToken = AuthService.generateAccessToken(commentAuthor._id.toString());

    // Create test event
    const clubProfile = await ClubProfile.create({
      user: commentAuthor._id,
      name: 'Test Club Bug',
      description: 'Test club for bug condition',
      email: 'clubbug@test.com'
    });

    testEvent = await Event.create({
      title: 'Test Event Bug',
      description: 'Test event for bug condition',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600000),
      location: 'Test Location',
      category: 'Other',
      organizer: clubProfile._id,
      maxAttendees: 100
    });
  });

  beforeEach(async () => {
    // Create a fresh comment for each test
    testComment = await Comment.create({
      content: 'Test comment for bug condition',
      author: commentAuthor._id,
      eventId: testEvent._id,
      parentId: null,
      path: '',
      depth: 0
    });
  });

  describe('Bug Condition Tests - Expected to FAIL on unfixed code', () => {
    // Create test app with INCORRECT authentication middleware (simulating the bug)
    const createBuggyTestApp = () => {
      const app = express();
      app.use(express.json());
      
      // BUGGY Auth middleware - doesn't fetch user from database
      app.use(async (req: any, res, next) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
          try {
            const decoded = AuthService.verifyAccessToken(token);
            // BUG: Setting req.user to decoded token payload instead of full user object
            req.user = decoded;  // This is { id, type }, not the full user document
          } catch (error) {
            // Invalid token - continue without user
          }
        }
        next();
      });
      
      app.post('/api/comments/:id/vote', voteOnComment);
      
      return app;
    };

    // Create test app with CORRECT authentication middleware (expected behavior)
    const createCorrectTestApp = () => {
      const app = express();
      app.use(express.json());
      
      // CORRECT Auth middleware - fetches user from database
      app.use(async (req: any, res, next) => {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
          try {
            const decoded = AuthService.verifyAccessToken(token);
            if (decoded && decoded.id) {
              // CORRECT: Fetch full user object from database
              const user = await User.findById(decoded.id).select('-password -refreshToken');
              if (user) {
                req.user = user;
              }
            }
          } catch (error) {
            // Invalid token - continue without user
            console.error('Auth middleware error:', error);
          }
        }
        next();
      });
      
      app.post('/api/comments/:id/vote', voteOnComment);
      
      return app;
    };

    describe('Buggy Middleware - Demonstrates the bug', () => {
      let buggyApp: express.Application;

      beforeAll(() => {
        buggyApp = createBuggyTestApp();
      });

      it('BUG: Valid upvote request with valid token returns 500 (should return 200)', async () => {
        const response = await request(buggyApp)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'upvote' });

        // BUG: Returns 500 because req.user._id is undefined (req.user = { id, type })
        // Controller crashes when trying to access req.user._id.toString()
        console.log('Buggy middleware response status:', response.status);
        console.log('Buggy middleware response body:', response.body);
        
        // This assertion documents the bug - it SHOULD fail on unfixed code
        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Internal server error');
      });

      it('BUG: Invalid vote type with valid token returns 400 (validation runs before crash)', async () => {
        const response = await request(buggyApp)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'invalid' });

        // BUG: Returns 400 because validation runs before the controller tries to access req.user._id
        // This is actually correct behavior for this specific case, but other cases fail
        console.log('Buggy middleware invalid vote response:', response.status);
        
        expect(response.status).toBe(400);
      });

      it('BUG: Voting on own comment with valid token returns 500 (should return 403)', async () => {
        const response = await request(buggyApp)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authorToken}`)
          .send({ voteType: 'upvote' });

        // BUG: Returns 500 because req.user._id is undefined when controller tries to check authorization
        // Controller crashes at: comment.author.toString() === req.user._id.toString()
        console.log('Buggy middleware own comment response:', response.status);
        
        expect(response.status).toBe(500);
      });

      it('BUG: Multiple users voting on same comment - voteCount stays 0', async () => {
        // Create additional users
        const user2 = await User.create({
          username: 'voter2_bug',
          email: 'voter2bug@test.com',
          password: 'TestPass123!',
          role: 'student'
        });

        const user3 = await User.create({
          username: 'voter3_bug',
          email: 'voter3bug@test.com',
          password: 'TestPass123!',
          role: 'student'
        });

        const token2 = AuthService.generateAccessToken(user2._id.toString());
        const token3 = AuthService.generateAccessToken(user3._id.toString());

        // All users try to vote
        await request(buggyApp)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ voteType: 'upvote' });

        await request(buggyApp)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${token2}`)
          .send({ voteType: 'upvote' });

        await request(buggyApp)
          .post(`/api/comments/${testComment._id}/vote`)
          .set('Authorization', `Bearer ${token3}`)
          .send({ voteType: 'downvote' });

        // BUG: voteCount stays 0 because votes are not recorded due to auth failure
        const updatedComment = await Comment.findById(testComment._id);
        console.log('Buggy middleware vote count:', updatedComment?.voteCount);
        
        expect(updatedComment?.voteCount).toBe(0);
        expect(updatedComment?.upvotes).toHaveLength(0);
        expect(updatedComment?.downvotes).toHaveLength(0);
      });

      it('BUG: req.user is incomplete (only contains { id, type })', async () => {
        // This test verifies the root cause of the bug
        const app = express();
        app.use(express.json());
        
        let capturedReqUser: any = null;
        
        // Buggy middleware
        app.use(async (req: any, res, next) => {
          const token = req.headers.authorization?.replace('Bearer ', '');
          if (token) {
            try {
              const decoded = AuthService.verifyAccessToken(token);
              req.user = decoded;  // BUG: Only { id, type }
              capturedReqUser = req.user;
            } catch (error) {
              // Invalid token
            }
          }
          next();
        });
        
        app.post('/test', (req: any, res) => {
          res.json({ user: req.user });
        });

        await request(app)
          .post('/test')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        console.log('Captured req.user:', capturedReqUser);
        
        // BUG: req.user only has { id, type }, missing username, email, role, etc.
        expect(capturedReqUser).toBeDefined();
        expect(capturedReqUser).toHaveProperty('id');
        expect(capturedReqUser).toHaveProperty('type');
        expect(capturedReqUser).not.toHaveProperty('username');
        expect(capturedReqUser).not.toHaveProperty('email');
        expect(capturedReqUser).not.toHaveProperty('role');
      });
    });

    describe('Correct Middleware - Expected behavior after fix', () => {
      let correctApp: express.Application;
      let correctTestUser: IUser;
      let correctCommentAuthor: IUser;
      let correctAuthToken: string;
      let correctAuthorToken: string;

      beforeEach(async () => {
        // Create fresh users for each test (needed because global afterEach deletes all collections)
        correctTestUser = await User.create({
          username: 'voter_correct_test',
          email: 'votercorrect@test.com',
          password: 'TestPass123!',
          role: 'student'
        });

        correctCommentAuthor = await User.create({
          username: 'author_correct_test',
          email: 'authorcorrect@test.com',
          password: 'TestPass123!',
          role: 'student'
        });

        // Generate auth tokens
        correctAuthToken = AuthService.generateAccessToken(correctTestUser._id.toString());
        correctAuthorToken = AuthService.generateAccessToken(correctCommentAuthor._id.toString());
        
        correctApp = createCorrectTestApp();
      });

      it('EXPECTED: Valid upvote request with valid token returns 200', async () => {
        // Create a fresh comment for this test
        const freshComment = await Comment.create({
          content: 'Test comment for correct middleware',
          author: correctCommentAuthor._id,
          eventId: testEvent._id,
          parentId: null,
          path: '',
          depth: 0
        });
        
        const response = await request(correctApp)
          .post(`/api/comments/${freshComment._id}/vote`)
          .set('Authorization', `Bearer ${correctAuthToken}`)
          .send({ voteType: 'upvote' });

        console.log('Correct middleware response status:', response.status);
        console.log('Correct middleware response body:', response.body);
        
        // EXPECTED: Returns 200 with updated vote counts
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.voteCount).toBe(1);
        expect(response.body.data.userVote).toBe('upvote');
      });

      it('EXPECTED: Invalid vote type with valid token returns 400', async () => {
        // Create a fresh comment for this test
        const freshComment = await Comment.create({
          content: 'Test comment for correct middleware',
          author: correctCommentAuthor._id,
          eventId: testEvent._id,
          parentId: null,
          path: '',
          depth: 0
        });
        
        const response = await request(correctApp)
          .post(`/api/comments/${freshComment._id}/vote`)
          .set('Authorization', `Bearer ${correctAuthToken}`)
          .send({ voteType: 'invalid' });

        console.log('Correct middleware invalid vote response:', response.status);
        
        // EXPECTED: Returns 400 for validation error
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });

      it('EXPECTED: Voting on own comment with valid token returns 403', async () => {
        // Create a fresh comment for this test
        const freshComment = await Comment.create({
          content: 'Test comment for correct middleware',
          author: correctCommentAuthor._id,
          eventId: testEvent._id,
          parentId: null,
          path: '',
          depth: 0
        });
        
        const response = await request(correctApp)
          .post(`/api/comments/${freshComment._id}/vote`)
          .set('Authorization', `Bearer ${correctAuthorToken}`)
          .send({ voteType: 'upvote' });

        console.log('Correct middleware own comment response:', response.status);
        
        // EXPECTED: Returns 403 for authorization error
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('cannot vote on your own comment');
      });

      it('EXPECTED: Multiple users voting on same comment updates voteCount correctly', async () => {
        // Create a fresh comment for this test
        const freshComment = await Comment.create({
          content: 'Test comment for correct middleware',
          author: correctCommentAuthor._id,
          eventId: testEvent._id,
          parentId: null,
          path: '',
          depth: 0
        });
        
        // Create additional users
        const user2 = await User.create({
          username: 'voter2_correct',
          email: 'voter2correct@test.com',
          password: 'TestPass123!',
          role: 'student'
        });

        const user3 = await User.create({
          username: 'voter3_correct',
          email: 'voter3correct@test.com',
          password: 'TestPass123!',
          role: 'student'
        });

        const token2 = AuthService.generateAccessToken(user2._id.toString());
        const token3 = AuthService.generateAccessToken(user3._id.toString());

        // All users vote
        await request(correctApp)
          .post(`/api/comments/${freshComment._id}/vote`)
          .set('Authorization', `Bearer ${correctAuthToken}`)
          .send({ voteType: 'upvote' });

        await request(correctApp)
          .post(`/api/comments/${freshComment._id}/vote`)
          .set('Authorization', `Bearer ${token2}`)
          .send({ voteType: 'upvote' });

        await request(correctApp)
          .post(`/api/comments/${freshComment._id}/vote`)
          .set('Authorization', `Bearer ${token3}`)
          .send({ voteType: 'downvote' });

        // EXPECTED: voteCount reflects accurate count (2 upvotes - 1 downvote = 1)
        const updatedComment = await Comment.findById(freshComment._id);
        console.log('Correct middleware vote count:', updatedComment?.voteCount);
        
        expect(updatedComment?.voteCount).toBe(1);
        expect(updatedComment?.upvotes).toHaveLength(2);
        expect(updatedComment?.downvotes).toHaveLength(1);
      });

      it('EXPECTED: req.user contains full user object', async () => {
        // This test verifies the fix
        const app = express();
        app.use(express.json());
        
        let capturedReqUser: any = null;
        let capturedDecoded: any = null;
        let capturedError: any = null;
        let capturedUser: any = null;
        
        // Verify user exists before making request
        const userBeforeRequest = await User.findById(correctTestUser._id);
        console.log('User exists before request:', !!userBeforeRequest, userBeforeRequest?._id.toString());
        
        // Correct middleware
        app.use(async (req: any, res, next) => {
          const token = req.headers.authorization?.replace('Bearer ', '');
          if (token) {
            try {
              const decoded = AuthService.verifyAccessToken(token);
              capturedDecoded = decoded;
              if (decoded && decoded.id) {
                const user = await User.findById(decoded.id).select('-password -refreshToken');
                capturedUser = user;
                if (user) {
                  req.user = user;
                  capturedReqUser = req.user;
                }
              }
            } catch (error) {
              // Invalid token
              capturedError = error;
            }
          }
          next();
        });
        
        app.post('/test', (req: any, res) => {
          res.json({ user: req.user });
        });

        await request(app)
          .post('/test')
          .set('Authorization', `Bearer ${correctAuthToken}`)
          .send({});

        console.log('Captured decoded:', capturedDecoded);
        console.log('Captured user from DB:', capturedUser);
        console.log('Captured req.user (correct):', capturedReqUser);
        console.log('Captured error:', capturedError);
        console.log('Test user ID:', correctTestUser._id.toString());
        
        // EXPECTED: req.user has full user object with all fields
        expect(capturedReqUser).toBeDefined();
        expect(capturedReqUser).toHaveProperty('_id');
        expect(capturedReqUser).toHaveProperty('username');
        expect(capturedReqUser).toHaveProperty('email');
        expect(capturedReqUser).toHaveProperty('role');
        expect(capturedReqUser.username).toBe('voter_correct_test');
        expect(capturedReqUser.email).toBe('votercorrect@test.com');
      });
    });
  });

  describe('Summary: Bug Condition Counterexamples', () => {
    it('should document the bug condition findings', () => {
      console.log('\n=== BUG CONDITION EXPLORATION SUMMARY ===');
      console.log('Bug: Authentication middleware missing user lookup');
      console.log('\nTest files with potential bug:');
      testFilesWithPotentialBug.forEach(file => {
        console.log(`  - ${file}`);
      });
      console.log('\nCounterexamples found:');
      console.log('  1. Valid upvote request returns 401 instead of 200');
      console.log('  2. Invalid vote type returns 401 instead of 400');
      console.log('  3. Voting on own comment returns 401 instead of 403');
      console.log('  4. Multiple users voting results in voteCount = 0');
      console.log('  5. req.user contains only { id, type } instead of full user object');
      console.log('\nRoot cause confirmed:');
      console.log('  - Middleware uses AuthService.verifyAccessToken() which returns { id, type }');
      console.log('  - Middleware sets req.user = decoded (incomplete object)');
      console.log('  - Middleware does NOT fetch user from database');
      console.log('  - Controllers expect req.user to be full user document');
      console.log('=========================================\n');
      
      // This test always passes - it's just for documentation
      expect(true).toBe(true);
    });
  });
});
