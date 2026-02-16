import * as fc from 'fast-check';
import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import { Event } from '../src/models/Event';
import { ClubProfile } from '../src/models/ClubProfile';
import { User } from '../src/models/User';
import discoverRoutes from '../src/routes/discoverRoutes';
import { getCacheService } from '../src/services/cacheService';

const app: Application = express();
app.use(express.json());
app.use('/api/discover', discoverRoutes);

describe('Discover API Property Tests', () => {
    let testUser: any;
    let testClub: any;

    beforeAll(async () => {
        // Create a test user for club association
        testUser = await User.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'Test@1234',
            role: 'student'
        });
    });

    beforeEach(async () => {
        // Clear cache before each test
        const cacheService = getCacheService();
        await cacheService.delPattern('discover:*');
    });

    afterEach(async () => {
        // Clean up test data
        await Event.deleteMany({});
        await ClubProfile.deleteMany({});
    });

    afterAll(async () => {
        await User.deleteMany({});
    });

    /**
     * Property 12: Search query execution
     * **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
     */
    describe('Property 12: Search query execution', () => {
        it('should return results matching the search query in events or clubs', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9\s]+$/.test(s)),
                    async (searchTerm) => {
                        // Create test club
                        const club = await ClubProfile.create({
                            user: testUser._id,
                            name: `${searchTerm} Club`,
                            description: `A club about ${searchTerm}`,
                            email: `${searchTerm.toLowerCase().replace(/\s/g, '')}@club.com`
                        });

                        // Create test event
                        const event = await Event.create({
                            title: `${searchTerm} Event`,
                            description: `An event about ${searchTerm}`,
                            location: 'Test Location',
                            category: 'Tech',
                            organizer: club._id,
                            startTime: new Date(Date.now() + 86400000),
                            endTime: new Date(Date.now() + 90000000),
                            isPublic: true
                        });

                        // Search for the term
                        const response = await request(app)
                            .get('/api/discover')
                            .query({ query: searchTerm, type: 'all' });

                        expect(response.status).toBe(200);
                        expect(response.body.success).toBe(true);

                        const { events, clubs } = response.body.data;

                        // At least one result should match
                        const hasMatchingEvent = events.some((e: any) => 
                            e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            e.description.toLowerCase().includes(searchTerm.toLowerCase())
                        );

                        const hasMatchingClub = clubs.some((c: any) => 
                            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            c.description.toLowerCase().includes(searchTerm.toLowerCase())
                        );

                        expect(hasMatchingEvent || hasMatchingClub).toBe(true);

                        // Clean up
                        await Event.findByIdAndDelete(event._id);
                        await ClubProfile.findByIdAndDelete(club._id);
                    }
                ),
                { numRuns: 10 }
            );
        });

        it('should return empty results when no matches found', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.string({ minLength: 20, maxLength: 30 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
                    async (uniqueSearchTerm) => {
                        // Search for a term that doesn't exist
                        const response = await request(app)
                            .get('/api/discover')
                            .query({ query: uniqueSearchTerm, type: 'all' });

                        expect(response.status).toBe(200);
                        expect(response.body.success).toBe(true);

                        const { events, clubs } = response.body.data;
                        expect(events).toHaveLength(0);
                        expect(clubs).toHaveLength(0);
                    }
                ),
                { numRuns: 5 }
            );
        });
    });

    /**
     * Property 13: Category filter application
     * **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
     */
    describe('Property 13: Category filter application', () => {
        it('should only return events matching the specified category', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('Tech', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other'),
                    async (category) => {
                        // Create test club
                        const club = await ClubProfile.create({
                            user: testUser._id,
                            name: 'Test Club',
                            description: 'Test Description',
                            email: 'testclub@example.com'
                        });

                        // Create events with different categories
                        const matchingEvent = await Event.create({
                            title: 'Matching Event',
                            description: 'This event matches the category',
                            location: 'Test Location',
                            category: category,
                            organizer: club._id,
                            startTime: new Date(Date.now() + 86400000),
                            endTime: new Date(Date.now() + 90000000),
                            isPublic: true
                        });

                        const otherCategories = ['Tech', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Other']
                            .filter(c => c !== category);
                        
                        const nonMatchingCategory = otherCategories[0] as 'Tech' | 'Cultural' | 'Sports' | 'Workshop' | 'Seminar' | 'Other';
                        
                        const nonMatchingEvent = await Event.create({
                            title: 'Non-Matching Event',
                            description: 'This event does not match',
                            location: 'Test Location',
                            category: nonMatchingCategory,
                            organizer: club._id,
                            startTime: new Date(Date.now() + 86400000),
                            endTime: new Date(Date.now() + 90000000),
                            isPublic: true
                        });

                        // Search with category filter
                        const response = await request(app)
                            .get('/api/discover')
                            .query({ type: 'events', category });

                        expect(response.status).toBe(200);
                        expect(response.body.success).toBe(true);

                        const { events } = response.body.data;

                        // All returned events should match the category
                        events.forEach((event: any) => {
                            expect(event.category).toBe(category);
                        });

                        // Should include the matching event
                        const foundMatching = events.some((e: any) => e._id.toString() === matchingEvent._id.toString());
                        expect(foundMatching).toBe(true);

                        // Should not include the non-matching event
                        const foundNonMatching = events.some((e: any) => e._id.toString() === nonMatchingEvent._id.toString());
                        expect(foundNonMatching).toBe(false);

                        // Clean up
                        await Event.deleteMany({ _id: { $in: [matchingEvent._id, nonMatchingEvent._id] } });
                        await ClubProfile.findByIdAndDelete(club._id);
                    }
                ),
                { numRuns: 6 }
            );
        });

        it('should only return clubs matching the specified category', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('Academic', 'Technology', 'Sports & Recreation'),
                    async (category) => {
                        // Create clubs with different categories
                        const matchingClub = await ClubProfile.create({
                            user: testUser._id,
                            name: 'Matching Club',
                            description: 'This club matches the category',
                            email: 'matching@example.com',
                            category: category
                        });

                        const otherCategories = ['Academic', 'Technology', 'Sports & Recreation']
                            .filter(c => c !== category);

                        const nonMatchingCategory = otherCategories[0] as string;

                        const nonMatchingClub = await ClubProfile.create({
                            user: new mongoose.Types.ObjectId(),
                            name: 'Non-Matching Club',
                            description: 'This club does not match',
                            email: 'nonmatching@example.com',
                            category: nonMatchingCategory
                        });

                        // Search with category filter
                        const response = await request(app)
                            .get('/api/discover')
                            .query({ type: 'clubs', category });

                        expect(response.status).toBe(200);
                        expect(response.body.success).toBe(true);

                        const { clubs } = response.body.data;

                        // All returned clubs should match the category
                        clubs.forEach((club: any) => {
                            expect(club.category).toBe(category);
                        });

                        // Should include the matching club
                        const foundMatching = clubs.some((c: any) => c._id.toString() === matchingClub._id.toString());
                        expect(foundMatching).toBe(true);

                        // Should not include the non-matching club
                        const foundNonMatching = clubs.some((c: any) => c._id.toString() === nonMatchingClub._id.toString());
                        expect(foundNonMatching).toBe(false);

                        // Clean up
                        await ClubProfile.deleteMany({ _id: { $in: [matchingClub._id, nonMatchingClub._id] } });
                    }
                ),
                { numRuns: 3 }
            );
        });
    });

    /**
     * Property 14: Date range filter application
     * **Validates: Requirements 3.2, 3.3, 3.4, 3.5**
     */
    describe('Property 14: Date range filter application', () => {
        it('should only return events within the specified date range', async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom('today', 'week', 'month', 'upcoming'),
                    async (dateRange) => {
                        // Create test club
                        const club = await ClubProfile.create({
                            user: testUser._id,
                            name: 'Test Club',
                            description: 'Test Description',
                            email: 'testclub@example.com'
                        });

                        const now = new Date();
                        let rangeStart: Date;
                        let rangeEnd: Date;

                        // Calculate expected range
                        switch (dateRange) {
                            case 'today':
                                rangeStart = now;
                                rangeEnd = new Date(now);
                                rangeEnd.setHours(23, 59, 59, 999);
                                break;
                            case 'week':
                                rangeStart = now;
                                rangeEnd = new Date(now);
                                rangeEnd.setDate(now.getDate() + 7);
                                break;
                            case 'month':
                                rangeStart = now;
                                rangeEnd = new Date(now);
                                rangeEnd.setMonth(now.getMonth() + 1);
                                break;
                            case 'upcoming':
                            default:
                                rangeStart = now;
                                rangeEnd = new Date('2099-12-31');
                                break;
                        }

                        // Create event within range
                        const withinRangeDate = new Date(rangeStart.getTime() + (rangeEnd.getTime() - rangeStart.getTime()) / 2);
                        const withinRangeEvent = await Event.create({
                            title: 'Within Range Event',
                            description: 'This event is within the date range',
                            location: 'Test Location',
                            category: 'Tech',
                            organizer: club._id,
                            startTime: withinRangeDate,
                            endTime: new Date(withinRangeDate.getTime() + 3600000),
                            isPublic: true
                        });

                        // Create event outside range (far future)
                        const outsideRangeEvent = await Event.create({
                            title: 'Outside Range Event',
                            description: 'This event is outside the date range',
                            location: 'Test Location',
                            category: 'Tech',
                            organizer: club._id,
                            startTime: new Date('2099-12-31'),
                            endTime: new Date('2099-12-31T23:59:59'),
                            isPublic: true
                        });

                        // Search with date range filter
                        const response = await request(app)
                            .get('/api/discover')
                            .query({ type: 'events', dateRange });

                        expect(response.status).toBe(200);
                        expect(response.body.success).toBe(true);

                        const { events } = response.body.data;

                        // All returned events should be within the range
                        events.forEach((event: any) => {
                            const eventStart = new Date(event.startTime);
                            expect(eventStart.getTime()).toBeGreaterThanOrEqual(rangeStart.getTime());
                            expect(eventStart.getTime()).toBeLessThanOrEqual(rangeEnd.getTime());
                        });

                        // Should include the within-range event
                        const foundWithinRange = events.some((e: any) => e._id.toString() === withinRangeEvent._id.toString());
                        expect(foundWithinRange).toBe(true);

                        // Should not include the outside-range event (unless dateRange is 'upcoming')
                        if (dateRange !== 'upcoming') {
                            const foundOutsideRange = events.some((e: any) => e._id.toString() === outsideRangeEvent._id.toString());
                            expect(foundOutsideRange).toBe(false);
                        }

                        // Clean up
                        await Event.deleteMany({ _id: { $in: [withinRangeEvent._id, outsideRangeEvent._id] } });
                        await ClubProfile.findByIdAndDelete(club._id);
                    }
                ),
                { numRuns: 4 }
            );
        });

        it('should handle date range boundaries correctly', async () => {
            // Create test club
            const club = await ClubProfile.create({
                user: testUser._id,
                name: 'Test Club',
                description: 'Test Description',
                email: 'testclub@example.com'
            });

            const now = new Date();
            
            // Create event exactly at the start of today
            const todayStart = new Date(now);
            todayStart.setHours(0, 0, 0, 0);
            
            const boundaryEvent = await Event.create({
                title: 'Boundary Event',
                description: 'Event at boundary',
                location: 'Test Location',
                category: 'Tech',
                organizer: club._id,
                startTime: new Date(now.getTime() + 1000), // Just after now
                endTime: new Date(now.getTime() + 3600000),
                isPublic: true
            });

            // Search with 'today' filter
            const response = await request(app)
                .get('/api/discover')
                .query({ type: 'events', dateRange: 'today' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const { events } = response.body.data;
            
            // Should include the boundary event
            const foundBoundary = events.some((e: any) => e._id.toString() === boundaryEvent._id.toString());
            expect(foundBoundary).toBe(true);

            // Clean up
            await Event.findByIdAndDelete(boundaryEvent._id);
            await ClubProfile.findByIdAndDelete(club._id);
        });
    });

    describe('Caching behavior', () => {
        it('should cache discover results with 300s TTL', async () => {
            // Create test club
            const club = await ClubProfile.create({
                user: testUser._id,
                name: 'Cache Test Club',
                description: 'Testing cache',
                email: 'cache@example.com'
            });

            // First request - cache miss
            const response1 = await request(app)
                .get('/api/discover')
                .query({ type: 'clubs', query: 'Cache' });

            expect(response1.status).toBe(200);
            expect(response1.body.data.clubs).toHaveLength(1);

            // Second request - should hit cache
            const response2 = await request(app)
                .get('/api/discover')
                .query({ type: 'clubs', query: 'Cache' });

            expect(response2.status).toBe(200);
            expect(response2.body.data.clubs).toHaveLength(1);

            // Clean up
            await ClubProfile.findByIdAndDelete(club._id);
        });
    });
});
