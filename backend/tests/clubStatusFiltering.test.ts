import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import { ClubProfile, IClubProfile } from '../src/models/ClubProfile';
import { User, IUser } from '../src/models/User';
import { Event } from '../src/models/Event';
import clubRoutes from '../src/routes/ClubRoutes';
import eventRoutes from '../src/routes/eventRoutes';
import { AuthService } from '../src/services/authService';
import { protect } from '../src/middlewares/authMiddleware';

describe('Club Status Filtering Unit Tests', () => {
    let app: express.Application;
    let testUser: IUser;
    let testAdmin: IUser;
    let pendingClub: IClubProfile;
    let approvedClub: IClubProfile;
    let rejectedClub: IClubProfile;
    let userToken: string;
    let adminToken: string;

    beforeAll(async () => {
        app = express();
        app.use(express.json());
        app.use('/api/clubs', clubRoutes);
        app.use('/api/events', eventRoutes);
    });

    beforeEach(async () => {
        // Create test users with shorter unique identifiers
        const id = Math.floor(Math.random() * 10000);
        
        testUser = await User.create({
            username: `testuser${id}`,
            email: `test${id}@example.com`,
            password: 'Password123!'
        });

        testAdmin = await User.create({
            username: `admin${id}`,
            email: `admin${id}@example.com`,
            password: 'Password123!',
            isSuperAdmin: true
        });

        // Create a separate user for the rejected club
        const rejectedUser = await User.create({
            username: `rejected${id}`,
            email: `rejected${id}@example.com`,
            password: 'Password123!'
        });

        // Generate tokens
        userToken = AuthService.generateAccessToken(testUser._id.toString());
        adminToken = AuthService.generateAccessToken(testAdmin._id.toString());

        // Create clubs with different statuses
        pendingClub = await ClubProfile.create({
            user: testUser._id,
            name: 'Pending Test Club',
            description: 'A test club that is pending approval',
            email: 'pending@test.com',
            status: 'pending'
        });

        approvedClub = await ClubProfile.create({
            user: testAdmin._id,
            name: 'Approved Test Club',
            description: 'A test club that is approved',
            email: 'approved@test.com',
            status: 'approved',
            approvedBy: testAdmin._id,
            approvedAt: new Date()
        });

        rejectedClub = await ClubProfile.create({
            user: rejectedUser._id,
            name: 'Rejected Test Club',
            description: 'A test club that is rejected',
            email: 'rejected@test.com',
            status: 'rejected',
            rejectedBy: testAdmin._id,
            rejectedAt: new Date(),
            rejectionReason: 'Test rejection'
        });
    });

    afterAll(async () => {
        await Event.deleteMany({});
        await ClubProfile.deleteMany({});
        await User.deleteMany({});
    });

    describe('Club Creation Sets Pending Status', () => {
        it('should set status to pending when creating a new club', async () => {
            const id = Math.floor(Math.random() * 10000);
            const newUser = await User.create({
                username: `newuser${id}`,
                email: `newuser${id}@example.com`,
                password: 'Password123!'
            });

            const newUserToken = AuthService.generateAccessToken(newUser._id.toString());

            const clubData = {
                name: 'New Test Club',
                description: 'A new test club for status testing',
                email: 'newclub@test.com'
            };

            const response = await request(app)
                .post('/api/clubs')
                .set('Authorization', `Bearer ${newUserToken}`)
                .send(clubData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('pending');

            // Verify in database
            const createdClub = await ClubProfile.findById(response.body.data._id);
            expect(createdClub?.status).toBe('pending');
        });
    });

    describe('Club Listing Filters Pending Clubs', () => {
        it('should only return approved clubs in public listings', async () => {
            const response = await request(app)
                .get('/api/clubs');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const clubs = response.body.data.clubs;
            
            // Should only contain approved clubs
            expect(clubs.every((club: any) => club.status === 'approved')).toBe(true);
            
            // Should not contain pending or rejected clubs
            const clubNames = clubs.map((club: any) => club.name);
            expect(clubNames).not.toContain('Pending Test Club');
            expect(clubNames).not.toContain('Rejected Test Club');
            expect(clubNames).toContain('Approved Test Club');
        });

        it('should filter by verified status and still exclude pending clubs', async () => {
            const response = await request(app)
                .get('/api/clubs?verified=true');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const clubs = response.body.data.clubs;
            
            // Should only contain approved clubs (even with verified filter)
            expect(clubs.every((club: any) => club.status === 'approved')).toBe(true);
        });

        it('should filter by category and still exclude pending clubs', async () => {
            // Update approved club to have a category
            await ClubProfile.findByIdAndUpdate(approvedClub._id, { category: 'Academic' });
            await ClubProfile.findByIdAndUpdate(pendingClub._id, { category: 'Academic' });

            const response = await request(app)
                .get('/api/clubs?category=Academic');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const clubs = response.body.data.clubs;
            
            // Should only contain approved clubs with the specified category
            expect(clubs.every((club: any) => 
                club.status === 'approved' && club.category === 'Academic'
            )).toBe(true);
            
            // Should not contain pending club even if it has the same category
            const clubNames = clubs.map((club: any) => club.name);
            expect(clubNames).not.toContain('Pending Test Club');
        });
    });

    describe('Event Creation Prevents Pending Clubs', () => {
        it('should prevent pending clubs from creating events', async () => {
            const eventData = {
                title: 'Test Event',
                description: 'A test event',
                startTime: new Date(Date.now() + 86400000), // Tomorrow
                endTime: new Date(Date.now() + 90000000), // Day after tomorrow
                location: 'Test Location',
                category: 'Other',
                maxAttendees: 100,
                isPublic: true
            };

            const response = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${userToken}`)
                .send(eventData);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Only approved clubs can create events');
        });

        it('should allow approved clubs to create events', async () => {
            const eventData = {
                title: 'Approved Club Event',
                description: 'An event from an approved club',
                startTime: new Date(Date.now() + 86400000), // Tomorrow
                endTime: new Date(Date.now() + 90000000), // Day after tomorrow
                location: 'Test Location',
                category: 'Other',
                maxAttendees: 100,
                isPublic: true
            };

            const response = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(eventData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.title).toBe('Approved Club Event');

            // Verify event was created
            const createdEvent = await Event.findById(response.body.data._id);
            expect(createdEvent).toBeTruthy();
            expect(createdEvent?.organizer.toString()).toBe(approvedClub._id.toString());
        });

        it('should prevent rejected clubs from creating events', async () => {
            // Create a user for the rejected club
            const id = Math.floor(Math.random() * 10000);
            const rejectedUser = await User.create({
                username: `rejected2${id}`,
                email: `rejected2${id}@example.com`,
                password: 'Password123!'
            });

            // Create a rejected club for this user
            await ClubProfile.create({
                user: rejectedUser._id,
                name: 'Another Rejected Club',
                description: 'Another rejected club',
                email: 'rejected2@test.com',
                status: 'rejected',
                rejectedBy: testAdmin._id,
                rejectedAt: new Date(),
                rejectionReason: 'Test rejection'
            });

            const rejectedUserToken = AuthService.generateAccessToken(rejectedUser._id.toString());

            const eventData = {
                title: 'Rejected Club Event',
                description: 'An event from a rejected club',
                startTime: new Date(Date.now() + 86400000),
                endTime: new Date(Date.now() + 90000000),
                location: 'Test Location',
                category: 'Other',
                maxAttendees: 100,
                isPublic: true
            };

            const response = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${rejectedUserToken}`)
                .send(eventData);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Only approved clubs can create events');
        });
    });

    describe('Club Status Validation', () => {
        it('should maintain status integrity during club operations', async () => {
            // Verify pending club remains pending
            const pendingClubFromDB = await ClubProfile.findById(pendingClub._id);
            expect(pendingClubFromDB?.status).toBe('pending');
            expect(pendingClubFromDB?.approvedBy).toBeNull();
            expect(pendingClubFromDB?.approvedAt).toBeNull();

            // Verify approved club maintains approved status
            const approvedClubFromDB = await ClubProfile.findById(approvedClub._id);
            expect(approvedClubFromDB?.status).toBe('approved');
            expect(approvedClubFromDB?.approvedBy).toEqual(testAdmin._id);
            expect(approvedClubFromDB?.approvedAt).toBeTruthy();

            // Verify rejected club maintains rejected status
            const rejectedClubFromDB = await ClubProfile.findById(rejectedClub._id);
            expect(rejectedClubFromDB?.status).toBe('rejected');
            expect(rejectedClubFromDB?.rejectedBy).toEqual(testAdmin._id);
            expect(rejectedClubFromDB?.rejectedAt).toBeTruthy();
            expect(rejectedClubFromDB?.rejectionReason).toBe('Test rejection');
        });
    });

    describe('Edge Cases', () => {
        it('should handle club without status field gracefully', async () => {
            // Create a new user for this test since testUser already has a club
            const id = Math.floor(Math.random() * 10000);
            const newUser = await User.create({
                username: `nostatus${id}`,
                email: `nostatus${id}@example.com`,
                password: 'Password123!'
            });

            // Create a club without explicit status (should default to pending)
            const clubWithoutStatus = await ClubProfile.create({
                user: newUser._id,
                name: 'Club Without Status',
                description: 'A club created without explicit status',
                email: 'nostatus@test.com'
                // No status field - should default to 'pending'
            });

            expect(clubWithoutStatus.status).toBe('pending');

            // Should not appear in public listings
            const response = await request(app).get('/api/clubs');
            const clubNames = response.body.data.clubs.map((club: any) => club.name);
            expect(clubNames).not.toContain('Club Without Status');
        });

        it('should handle user with no club trying to create event', async () => {
            const id = Math.floor(Math.random() * 10000);
            const userWithoutClub = await User.create({
                username: `noclub${id}`,
                email: `noclub${id}@example.com`,
                password: 'Password123!'
            });

            const noClubToken = AuthService.generateAccessToken(userWithoutClub._id.toString());

            const eventData = {
                title: 'No Club Event',
                description: 'Event from user without club',
                startTime: new Date(Date.now() + 86400000),
                endTime: new Date(Date.now() + 90000000),
                location: 'Test Location',
                category: 'Other',
                maxAttendees: 100,
                isPublic: true
            };

            const response = await request(app)
                .post('/api/events')
                .set('Authorization', `Bearer ${noClubToken}`)
                .send(eventData);

            expect(response.status).toBe(403);
            expect(response.body).toBeDefined();
            expect(response.body.Message).toContain('Access denied. User is not a club owner');
        });
    });
});