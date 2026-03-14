import request from 'supertest';
import express, { Application } from 'express';
import { User } from '../../src/models/User';
import { Event, IEvent } from '../../src/models/Event';
import { Comment } from '../../src/models/Comment';
import { ClubProfile } from '../../src/models/ClubProfile';
import jwt from 'jsonwebtoken';
import commentRoutes from '../../src/routes/commentRoutes';
import authRoutes from '../../src/routes/authRoutes';

// Create test app with auth middleware
const createTestApp = (): Application => {
    const app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    app.use('/api/comments', commentRoutes);
    return app;
};

describe('Comment Performance Tests', () => {
    let app: Application;
    let authToken: string;
    let userId: string;
    let eventId: string;
    let clubId: string;

    beforeAll(async () => {
        app = createTestApp();

        // Create test user with valid password
        const user = await User.create({
            username: 'perftest',
            email: 'perftest@test.com',
            password: 'Password123!'
        });
        userId = user._id.toString();

        // Generate auth token
        authToken = jwt.sign(
            { userId: user._id },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        // Create test club
        const club = await ClubProfile.create({
            name: 'Performance Test Club',
            description: 'Test club for performance testing',
            email: 'perfclub@test.com',
            user: user._id,
            status: 'approved'
        });
        clubId = club._id.toString();

        // Create test event
        const event = await Event.create({
            title: 'Performance Test Event',
            description: 'Test event for performance testing',
            startTime: new Date(Date.now() + 86400000),
            endTime: new Date(Date.now() + 90000000),
            location: 'Test Venue',
            organizer: club._id,
            category: 'Tech'
        }) as IEvent;
        eventId = event._id.toString();
    });

    afterAll(async () => {
        // Cleanup
        await Comment.deleteMany({});
        await Event.deleteMany({});
        await ClubProfile.deleteMany({});
        await User.deleteMany({});
    });

    afterEach(async () => {
        // Clean up comments after each test
        await Comment.deleteMany({});
    });

    describe('Performance: Comment Creation', () => {
        test('should create a comment in <200ms', async () => {
            const startTime = Date.now();

            const response = await request(app)
                .post('/api/comments')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    content: 'This is a performance test comment',
                    eventId
                });

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(duration).toBeLessThan(200);

            console.log(`Comment creation took ${duration}ms`);
        });

        test('should create 10 comments in <2000ms total', async () => {
            const startTime = Date.now();

            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(
                    request(app)
                        .post('/api/comments')
                        .set('Authorization', `Bearer ${authToken}`)
                        .send({
                            content: `Performance test comment ${i}`,
                            eventId
                        })
                );
            }

            await Promise.all(promises);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(2000);

            console.log(`Creating 10 comments took ${duration}ms (avg: ${duration / 10}ms per comment)`);
        });
    });

    describe('Performance: Comment Fetching', () => {
        beforeEach(async () => {
            // Create 100 test comments
            const comments = [];
            for (let i = 0; i < 100; i++) {
                comments.push({
                    content: `Test comment ${i}`,
                    author: userId,
                    eventId,
                    parentId: null,
                    path: '',
                    depth: 0,
                    voteCount: Math.floor(Math.random() * 20) - 5
                });
            }
            await Comment.insertMany(comments);
        });

        test('should fetch 100 comments in <500ms', async () => {
            const startTime = Date.now();

            const response = await request(app)
                .get(`/api/comments/event/${eventId}`)
                .query({ limit: 100 });

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.comments.length).toBeLessThanOrEqual(100);
            expect(duration).toBeLessThan(500);

            console.log(`Fetching 100 comments took ${duration}ms`);
        });

        test('should fetch comments with hot sorting in <500ms', async () => {
            const startTime = Date.now();

            const response = await request(app)
                .get(`/api/comments/event/${eventId}`)
                .query({ sort: 'hot', limit: 100 });

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(duration).toBeLessThan(500);

            console.log(`Fetching 100 comments with hot sorting took ${duration}ms`);
        });

        test('should fetch comments with top sorting in <500ms', async () => {
            const startTime = Date.now();

            const response = await request(app)
                .get(`/api/comments/event/${eventId}`)
                .query({ sort: 'top', limit: 100 });

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(duration).toBeLessThan(500);

            console.log(`Fetching 100 comments with top sorting took ${duration}ms`);
        });

        test('should fetch comment count in <100ms (cached)', async () => {
            // First request to populate cache
            await request(app).get(`/api/comments/event/${eventId}/count`);

            // Second request should hit cache
            const startTime = Date.now();

            const response = await request(app)
                .get(`/api/comments/event/${eventId}/count`);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.count).toBe(100);
            expect(duration).toBeLessThan(100);

            console.log(`Fetching cached comment count took ${duration}ms`);
        });
    });

    describe('Performance: Voting', () => {
        let commentId: string;

        beforeEach(async () => {
            const comment = await Comment.create({
                content: 'Test comment for voting',
                author: userId,
                eventId,
                parentId: null,
                path: '',
                depth: 0
            });
            commentId = comment._id.toString();
        });

        test('should vote on a comment in <100ms', async () => {
            const startTime = Date.now();

            const response = await request(app)
                .post(`/api/comments/${commentId}/vote`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ voteType: 'upvote' });

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(duration).toBeLessThan(100);

            console.log(`Voting on comment took ${duration}ms`);
        });

        test('should handle 10 concurrent votes in <1000ms', async () => {
            // Create 10 different users and comments
            const users: any[] = [];
            const comments: any[] = [];

            for (let i = 0; i < 10; i++) {
                const user = await User.create({
                    username: `voteuser${i}`,
                    email: `voteuser${i}@test.com`,
                    password: 'Password123!'
                });
                users.push(user);

                const comment = await Comment.create({
                    content: `Vote test comment ${i}`,
                    author: userId,
                    eventId,
                    parentId: null,
                    path: '',
                    depth: 0
                });
                comments.push(comment);
            }

            const startTime = Date.now();

            const promises = users.map((user, index) => {
                const token = jwt.sign(
                    { userId: user._id },
                    process.env.JWT_SECRET || 'test-secret',
                    { expiresIn: '1h' }
                );

                return request(app)
                    .post(`/api/comments/${comments[index]._id}/vote`)
                    .set('Authorization', `Bearer ${token}`)
                    .send({ voteType: 'upvote' });
            });

            await Promise.all(promises);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(duration).toBeLessThan(1000);

            console.log(`10 concurrent votes took ${duration}ms (avg: ${duration / 10}ms per vote)`);

            // Cleanup
            await User.deleteMany({ username: /^voteuser/ });
        });
    });

    describe('Performance: Lazy Loading Deep Threads', () => {
        let rootCommentId: string;

        beforeEach(async () => {
            // Create a deep thread: root -> 5 levels deep
            let parentId: any = null;
            let path = '';

            for (let depth = 0; depth < 6; depth++) {
                const comment: any = await Comment.create({
                    content: `Comment at depth ${depth}`,
                    author: userId,
                    eventId,
                    parentId,
                    path,
                    depth
                });

                if (depth === 0) {
                    rootCommentId = comment._id.toString();
                }

                // Update for next iteration
                parentId = comment._id;
                path = path + comment._id + '.';
            }
        });

        test('should fetch comments with maxDepth filter in <300ms', async () => {
            const startTime = Date.now();

            const response = await request(app)
                .get(`/api/comments/event/${eventId}`)
                .query({ maxDepth: 3 });

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            
            // Should only return comments with depth <= 3
            const comments = response.body.data.comments;
            comments.forEach((comment: any) => {
                expect(comment.depth).toBeLessThanOrEqual(3);
            });

            expect(duration).toBeLessThan(300);

            console.log(`Fetching comments with maxDepth=3 took ${duration}ms`);
        });

        test('should fetch comment children in <200ms', async () => {
            const startTime = Date.now();

            const response = await request(app)
                .get(`/api/comments/${rootCommentId}/children`);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.children.length).toBeGreaterThan(0);
            expect(duration).toBeLessThan(200);

            console.log(`Fetching comment children took ${duration}ms`);
        });
    });

    describe('Performance: Cursor-based Pagination', () => {
        beforeEach(async () => {
            // Create 200 test comments
            const comments = [];
            for (let i = 0; i < 200; i++) {
                comments.push({
                    content: `Pagination test comment ${i}`,
                    author: userId,
                    eventId,
                    parentId: null,
                    path: '',
                    depth: 0
                });
            }
            await Comment.insertMany(comments);
        });

        test('should paginate through 200 comments efficiently', async () => {
            let cursor = null;
            let totalFetched = 0;
            const startTime = Date.now();

            // Fetch in batches of 50
            for (let i = 0; i < 4; i++) {
                const query: any = { limit: 50 };
                if (cursor) {
                    query.cursor = cursor;
                }

                const response = await request(app)
                    .get(`/api/comments/event/${eventId}`)
                    .query(query);

                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);

                totalFetched += response.body.data.comments.length;
                cursor = response.body.data.nextCursor;

                if (!response.body.data.hasMore) break;
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(totalFetched).toBe(200);
            expect(duration).toBeLessThan(2000); // All 4 requests in <2s

            console.log(`Paginating through 200 comments (4 requests) took ${duration}ms`);
        });
    });
});
