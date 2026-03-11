import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import { User } from '../src/models/User';
import { ClubProfile } from '../src/models/ClubProfile';
import { AuditLog } from '../src/models/AuditLog';
import adminRoutes from '../src/routes/adminRoutes';
import { AuthService } from '../src/services/authService';

/**
 * Unit Tests: Admin Endpoints
 * 
 * Tests for:
 * - GET /api/admin/clubs/pending
 * - POST /api/admin/clubs/:id/approve
 * - POST /api/admin/clubs/:id/reject
 */

describe('Admin Endpoints Unit Tests', () => {
    let app: Application;
    let adminToken: string;
    let regularUserToken: string;
    let adminUser: typeof User.prototype;
    let regularUser: typeof User.prototype;
    
    beforeAll(async () => {
        app = express();
        app.use(express.json());
        app.use('/api/admin', adminRoutes);
    });
    
    beforeEach(async () => {
        await ClubProfile.deleteMany({});
        await User.deleteMany({});
        await AuditLog.deleteMany({});
        
        // Create admin user
        adminUser = await User.create({
            username: 'adminuser',
            email: 'admin@test.com',
            password: 'Admin123!@#',
            role: 'admin',
            isSuperAdmin: true
        });
        
        // Create regular user
        regularUser = await User.create({
            username: 'regularuser',
            email: 'user@test.com',
            password: 'User123!@#',
            role: 'student',
            isSuperAdmin: false
        });
        
        // Generate tokens
        adminToken = AuthService.generateAccessToken(adminUser._id.toString());
        regularUserToken = AuthService.generateAccessToken(regularUser._id.toString());
    });
    
    describe('GET /api/admin/clubs/pending', () => {
        it('should return 401 without authentication', async () => {
            const response = await request(app).get('/api/admin/clubs/pending');
            
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
        
        it('should return 403 for non-super-admin users', async () => {
            const response = await request(app)
                .get('/api/admin/clubs/pending')
                .set('Authorization', `Bearer ${regularUserToken}`);
            
            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
        
        it('should return pending clubs for super admin', async () => {
            // Create users for clubs
            const user1 = await User.create({
                username: 'clubowner1',
                email: 'owner1@test.com',
                password: 'Owner123!@#',
                role: 'student'
            });
            
            const user2 = await User.create({
                username: 'clubowner2',
                email: 'owner2@test.com',
                password: 'Owner123!@#',
                role: 'student'
            });
            
            const user3 = await User.create({
                username: 'clubowner3',
                email: 'owner3@test.com',
                password: 'Owner123!@#',
                role: 'student'
            });
            
            // Create pending clubs
            await ClubProfile.create({
                user: user1._id,
                name: 'Test Club 1',
                description: 'Test description 1',
                email: 'club1@test.com',
                status: 'pending'
            });
            
            await ClubProfile.create({
                user: user2._id,
                name: 'Test Club 2',
                description: 'Test description 2',
                email: 'club2@test.com',
                status: 'pending'
            });
            
            // Create approved club (should not be returned)
            await ClubProfile.create({
                user: user3._id,
                name: 'Approved Club',
                description: 'Approved description',
                email: 'approved@test.com',
                status: 'approved'
            });
            
            const response = await request(app)
                .get('/api/admin/clubs/pending')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.clubs).toHaveLength(2);
            expect(response.body.data.total).toBe(2);
        });
        
        it('should support pagination', async () => {
            // Create 15 pending clubs with different users
            for (let i = 0; i < 15; i++) {
                const user = await User.create({
                    username: `clubowner${i}`,
                    email: `owner${i}@test.com`,
                    password: 'Owner123!@#',
                    role: 'student'
                });
                
                await ClubProfile.create({
                    user: user._id,
                    name: `Test Club ${i}`,
                    description: `Test description ${i}`,
                    email: `club${i}@test.com`,
                    status: 'pending'
                });
            }
            
            const response = await request(app)
                .get('/api/admin/clubs/pending?page=1&limit=10')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.data.clubs).toHaveLength(10);
            expect(response.body.data.total).toBe(15);
            expect(response.body.data.totalPages).toBe(2);
        });
        
        it('should support search', async () => {
            const user1 = await User.create({
                username: 'csclubowner',
                email: 'csowner@test.com',
                password: 'Owner123!@#',
                role: 'student'
            });
            
            const user2 = await User.create({
                username: 'artclubowner',
                email: 'artowner@test.com',
                password: 'Owner123!@#',
                role: 'student'
            });
            
            await ClubProfile.create({
                user: user1._id,
                name: 'Computer Science Club',
                description: 'A club for CS students',
                email: 'cs@test.com',
                status: 'pending'
            });
            
            await ClubProfile.create({
                user: user2._id,
                name: 'Art Club',
                description: 'A club for artists',
                email: 'art@test.com',
                status: 'pending'
            });
            
            const response = await request(app)
                .get('/api/admin/clubs/pending?search=Computer')
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.data.clubs).toHaveLength(1);
            expect(response.body.data.clubs[0].name).toBe('Computer Science Club');
        });
    });
    
    describe('POST /api/admin/clubs/:id/approve', () => {
        it('should return 401 without authentication', async () => {
            const response = await request(app).post('/api/admin/clubs/123/approve');
            
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
        
        it('should return 403 for non-super-admin users', async () => {
            const response = await request(app)
                .post('/api/admin/clubs/123/approve')
                .set('Authorization', `Bearer ${regularUserToken}`);
            
            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
        
        it('should approve a pending club', async () => {
            const club = await ClubProfile.create({
                user: regularUser._id,
                name: 'Test Club',
                description: 'Test description',
                email: 'club@test.com',
                status: 'pending'
            });
            
            const response = await request(app)
                .post(`/api/admin/clubs/${club._id}/approve`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('approved');
            expect(response.body.data.approvedBy).toBe(adminUser._id.toString());
            expect(response.body.data.approvedAt).toBeDefined();
            
            // Verify audit log was created
            const auditLog = await AuditLog.findOne({
                action: 'club_approved',
                clubId: club._id
            });
            expect(auditLog).not.toBeNull();
        });
        
        it('should return 404 for non-existent club', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            
            const response = await request(app)
                .post(`/api/admin/clubs/${fakeId}/approve`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
        
        it('should return 409 for already approved club', async () => {
            const club = await ClubProfile.create({
                user: regularUser._id,
                name: 'Test Club',
                description: 'Test description',
                email: 'club@test.com',
                status: 'approved',
                approvedBy: adminUser._id,
                approvedAt: new Date()
            });
            
            const response = await request(app)
                .post(`/api/admin/clubs/${club._id}/approve`)
                .set('Authorization', `Bearer ${adminToken}`);
            
            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
        });
    });
    
    describe('POST /api/admin/clubs/:id/reject', () => {
        it('should return 401 without authentication', async () => {
            const response = await request(app)
                .post('/api/admin/clubs/123/reject')
                .send({ reason: 'Test reason' });
            
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
        
        it('should return 403 for non-super-admin users', async () => {
            const response = await request(app)
                .post('/api/admin/clubs/123/reject')
                .set('Authorization', `Bearer ${regularUserToken}`)
                .send({ reason: 'Test reason' });
            
            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
        
        it('should reject a pending club with reason', async () => {
            const club = await ClubProfile.create({
                user: regularUser._id,
                name: 'Test Club',
                description: 'Test description',
                email: 'club@test.com',
                status: 'pending'
            });
            
            const reason = 'Does not meet requirements';
            
            const response = await request(app)
                .post(`/api/admin/clubs/${club._id}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason });
            
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('rejected');
            expect(response.body.data.rejectedBy).toBe(adminUser._id.toString());
            expect(response.body.data.rejectedAt).toBeDefined();
            expect(response.body.data.rejectionReason).toBe(reason);
            
            // Verify audit log was created
            const auditLog = await AuditLog.findOne({
                action: 'club_rejected',
                clubId: club._id
            });
            expect(auditLog).not.toBeNull();
        });
        
        it('should return 400 without rejection reason', async () => {
            const club = await ClubProfile.create({
                user: regularUser._id,
                name: 'Test Club',
                description: 'Test description',
                email: 'club@test.com',
                status: 'pending'
            });
            
            const response = await request(app)
                .post(`/api/admin/clubs/${club._id}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});
            
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        
        it('should return 400 with empty rejection reason', async () => {
            const club = await ClubProfile.create({
                user: regularUser._id,
                name: 'Test Club',
                description: 'Test description',
                email: 'club@test.com',
                status: 'pending'
            });
            
            const response = await request(app)
                .post(`/api/admin/clubs/${club._id}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: '   ' });
            
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        
        it('should return 400 with reason exceeding 500 characters', async () => {
            const club = await ClubProfile.create({
                user: regularUser._id,
                name: 'Test Club',
                description: 'Test description',
                email: 'club@test.com',
                status: 'pending'
            });
            
            const longReason = 'a'.repeat(501);
            
            const response = await request(app)
                .post(`/api/admin/clubs/${club._id}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: longReason });
            
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        
        it('should return 404 for non-existent club', async () => {
            const fakeId = new mongoose.Types.ObjectId();
            
            const response = await request(app)
                .post(`/api/admin/clubs/${fakeId}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'Test reason' });
            
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
        
        it('should return 409 for already rejected club', async () => {
            const club = await ClubProfile.create({
                user: regularUser._id,
                name: 'Test Club',
                description: 'Test description',
                email: 'club@test.com',
                status: 'rejected',
                rejectedBy: adminUser._id,
                rejectedAt: new Date(),
                rejectionReason: 'Previous reason'
            });
            
            const response = await request(app)
                .post(`/api/admin/clubs/${club._id}/reject`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ reason: 'New reason' });
            
            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
        });
    });
});
