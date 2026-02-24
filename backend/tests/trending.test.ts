import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import { Event } from '../src/models/Event';
import { ClubProfile } from '../src/models/ClubProfile';
import { User } from '../src/models/User';
import trendingRoutes from '../src/routes/trendingRoutes';
import { getCacheService } from '../src/services/cacheService';

const app: Application = express();
app.use(express.json());
app.use('/api/trending', trendingRoutes);

describe('Trending API Integration Tests', () => {
    let testUser: any;
    let testClub: any;

    beforeAll(async () => {
        // Create a test user for club association
        testUser = await User.create({
            username: 'trendinguser',
            email: 'trending@example.com',
            password: 'Test@1234',
            role: 'student'
        });

        // Create a verified test club
        testClub = await ClubProfile.create({
            user: testUser._id,
            name: 'Trending Test Club',
            description: 'A club for testing trending functionality',
            email: 'trendingclub@example.com',
            isVerified: true,
            verificationStatus: 'approved',
            stats: {
                memberCount: 50,
                eventCount: 10,
                engagementScore: 0
            }
        });
    });

    beforeEach(async () => {
        // Clear cache before each test
        const cacheService = getCacheService();
        await cacheService.del('trending:all');
    });

    afterEach(async () => {
        // Clean up test events
        await Event.deleteMany({ organizer: testClub._id });
    });

    afterAll(async () => {
        await ClubProfile.deleteMany({});
        await User.deleteMany({});
    });

    describe('GET /api/trending', () => {
        it('should return trending events and clubs', async () => {
            // Create a public future event
            const event = await Event.create({
                title: 'Trending Event',
                description: 'A trending event for testing',
                location: 'Test Location',
                category: 'Tech',
                organizer: testClub._id,
                startTime: new Date(Date.now() + 86400000), // Tomorrow
                endTime: new Date(Date.now() + 90000000),
                isPublic: true,
                stats: {
                    attendeeCount: 100,
                    viewCount: 500,
                    engagementScore: 0
                }
            });

            const response = await request(app)
                .get('/api/trending');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('events');
            expect(response.body.data).toHaveProperty('clubs');
            expect(Array.isArray(response.body.data.events)).toBe(true);
            expect(Array.isArray(response.body.data.clubs)).toBe(true);
        });

        it('should only return public future events', async () => {
            // Create a private event (future)
            await Event.create({
                title: 'Private Event',
                description: 'A private event',
                location: 'Test Location',
                category: 'Tech',
                organizer: testClub._id,
                startTime: new Date(Date.now() + 86400000),
                endTime: new Date(Date.now() + 90000000),
                isPublic: false
            });

            // Create a public future event
            await Event.create({
                title: 'Public Future Event',
                description: 'A public future event',
                location: 'Test Location',
                category: 'Tech',
                organizer: testClub._id,
                startTime: new Date(Date.now() + 86400000),
                endTime: new Date(Date.now() + 90000000),
                isPublic: true
            });

            const response = await request(app)
                .get('/api/trending');

            expect(response.status).toBe(200);
            const { events } = response.body.data;

            // Should not include private events
            const hasPrivateEvent = events.some((e: any) => e.title === 'Private Event');
            expect(hasPrivateEvent).toBe(false);

            // Should include public future events
            const hasPublicEvent = events.some((e: any) => e.title === 'Public Future Event');
            expect(hasPublicEvent).toBe(true);
        });

        it('should only return verified clubs', async () => {
            // Create an unverified club
            const unverifiedClub = await ClubProfile.create({
                user: testUser._id,
                name: 'Unverified Club',
                description: 'An unverified club',
                email: 'unverified@example.com',
                isVerified: false,
                verificationStatus: 'pending'
            });

            const response = await request(app)
                .get('/api/trending');

            expect(response.status).toBe(200);
            const { clubs } = response.body.data;

            // Should not include unverified clubs
            const hasUnverifiedClub = clubs.some((c: any) => c.name === 'Unverified Club');
            expect(hasUnverifiedClub).toBe(false);

            // Clean up
            await ClubProfile.findByIdAndDelete(unverifiedClub._id);
        });

        it('should limit results to 20 events and 20 clubs', async () => {
            // Create 25 events
            const eventPromises = Array.from({ length: 25 }, (_, i) =>
                Event.create({
                    title: `Event ${i}`,
                    description: `Description ${i}`,
                    location: 'Test Location',
                    category: 'Tech',
                    organizer: testClub._id,
                    startTime: new Date(Date.now() + 86400000 + i * 3600000),
                    endTime: new Date(Date.now() + 90000000 + i * 3600000),
                    isPublic: true,
                    stats: {
                        attendeeCount: 10 + i,
                        viewCount: 50 + i,
                        engagementScore: 0
                    }
                })
            );

            await Promise.all(eventPromises);

            const response = await request(app)
                .get('/api/trending');

            expect(response.status).toBe(200);
            const { events, clubs } = response.body.data;

            expect(events.length).toBeLessThanOrEqual(20);
            expect(clubs.length).toBeLessThanOrEqual(20);
        });

        it('should use cache on subsequent requests', async () => {
            // First request
            const response1 = await request(app)
                .get('/api/trending');

            expect(response1.status).toBe(200);

            // Second request should hit cache
            const response2 = await request(app)
                .get('/api/trending');

            expect(response2.status).toBe(200);
            expect(response2.body.data).toEqual(response1.body.data);
        });

        it('should populate organizer field for events', async () => {
            // Clear cache to ensure fresh data
            const cacheService = getCacheService();
            await cacheService.del('trending:all');

            const event = await Event.create({
                title: 'Event with Organizer',
                description: 'Testing organizer population',
                location: 'Test Location',
                category: 'Tech',
                organizer: testClub._id,
                startTime: new Date(Date.now() + 86400000),
                endTime: new Date(Date.now() + 90000000),
                isPublic: true
            });

            const response = await request(app)
                .get('/api/trending');

            expect(response.status).toBe(200);
            const { events } = response.body.data;

            // Should have at least one event
            expect(events.length).toBeGreaterThan(0);

            // All events should have organizer populated
            events.forEach((e: any) => {
                expect(e.organizer).toBeDefined();
                // Organizer should be an object with name and email
                if (typeof e.organizer === 'object' && e.organizer !== null) {
                    expect(e.organizer).toHaveProperty('name');
                    expect(e.organizer).toHaveProperty('email');
                }
            });
        });

        it('should populate user field for clubs', async () => {
            const response = await request(app)
                .get('/api/trending');

            expect(response.status).toBe(200);
            const { clubs } = response.body.data;

            if (clubs.length > 0) {
                const club = clubs[0];
                expect(club.user).toBeDefined();
                expect(club.user).toHaveProperty('username');
                expect(club.user).toHaveProperty('email');
            }
        });

        it('should calculate engagement scores correctly', async () => {
            const event = await Event.create({
                title: 'High Engagement Event',
                description: 'Event with high engagement',
                location: 'Test Location',
                category: 'Tech',
                organizer: testClub._id,
                startTime: new Date(Date.now() + 86400000),
                endTime: new Date(Date.now() + 90000000),
                isPublic: true,
                stats: {
                    attendeeCount: 100,
                    viewCount: 200,
                    engagementScore: 0
                }
            });

            const response = await request(app)
                .get('/api/trending');

            expect(response.status).toBe(200);
            const { events } = response.body.data;

            const testEvent = events.find((e: any) => e.title === 'High Engagement Event');
            if (testEvent) {
                expect(testEvent.engagementScore).toBeGreaterThan(0);
                // Formula: (attendeeCount * 2) + (viewCount * 0.5) + recencyBonus
                // Should be at least (100 * 2) + (200 * 0.5) = 300
                expect(testEvent.engagementScore).toBeGreaterThanOrEqual(300);
            }
        });
    });
});
