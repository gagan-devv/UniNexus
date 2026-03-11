import * as fc from 'fast-check';
import mongoose from 'mongoose';
import request from 'supertest';
import express, { Application } from 'express';
import { User } from '../src/models/User';
import { ClubProfile } from '../src/models/ClubProfile';
import { AuditLog } from '../src/models/AuditLog';
import adminRoutes from '../src/routes/adminRoutes';
import { AuthService } from '../src/services/authService';

/**
 * Property-Based Test: Audit Log Completeness
 * 
 * **Validates: Requirements 9.10, 11.1, 11.2, 11.3**
 * 
 * Property: Every admin action (approve, reject, moderate) must create an audit log entry
 * 
 * For any admin action:
 * - An audit log entry must be created
 * - The log must contain: action, actorId, clubId, timestamp
 * - For rejections: details must include reason
 * - The log must be persisted in the database
 */

describe('Property Test: Audit Log Completeness', () => {
    let app: Application;
    
    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/uninexus-test');
        }
        
        app = express();
        app.use(express.json());
        app.use('/api/admin', adminRoutes);
    });
    
    afterAll(async () => {
        await mongoose.connection.close();
    });
    
    beforeEach(async () => {
        await ClubProfile.deleteMany({});
        await User.deleteMany({});
        await AuditLog.deleteMany({});
    });
    
    // Generator for club data
    const clubDataArbitrary = fc.record({
        name: fc.string({ minLength: 2, maxLength: 50 }).map(s => {
            const trimmed = s.replace(/^\s+|\s+$/g, '');
            return trimmed.length >= 2 ? trimmed : 'TestClub';
        }),
        description: fc.string({ minLength: 10, maxLength: 200 }).map(s => {
            const trimmed = s.replace(/^\s+|\s+$/g, '');
            return trimmed.length >= 10 ? trimmed : 'Test description for club that meets minimum length requirements';
        }),
        email: fc.string({ minLength: 5, maxLength: 30 }).map(s => `test${Math.random().toString(36).substring(2)}@example.com`)
    });
    
    // Generator for rejection reason
    const rejectionReasonArbitrary = fc.string({ minLength: 1, maxLength: 500 }).map(s => {
        const trimmed = s.replace(/^\s+|\s+$/g, '');
        return trimmed.length >= 1 ? trimmed : 'Test rejection reason';
    });
    
    it('should create audit log when approving a club', async () => {
        await fc.assert(
            fc.asyncProperty(clubDataArbitrary, async (clubData) => {
                // Create user
                const user = await User.create({
                    username: `user_${Math.random().toString(36).substring(2, 8)}`,
                    email: `test_${Date.now()}_${Math.random()}@example.com`,
                    password: 'Test123!@#',
                    role: 'student'
                });
                
                // Create admin
                const admin = await User.create({
                    username: `admin_${Math.random().toString(36).substring(2, 8)}`,
                    email: `admin_${Date.now()}_${Math.random()}@example.com`,
                    password: 'Admin123!@#',
                    role: 'admin',
                    isSuperAdmin: true
                });
                
                // Create pending club
                const club = await ClubProfile.create({
                    user: user._id,
                    name: clubData.name,
                    description: clubData.description,
                    email: clubData.email,
                    status: 'pending'
                });
                
                // Count audit logs before action
                const logCountBefore = await AuditLog.countDocuments();
                
                // Generate token
                const token = AuthService.generateAccessToken(admin._id.toString());
                
                // Approve the club
                const response = await request(app)
                    .post(`/api/admin/clubs/${club._id}/approve`)
                    .set('Authorization', `Bearer ${token}`);
                
                expect(response.status).toBe(200);
                
                // Count audit logs after action
                const logCountAfter = await AuditLog.countDocuments();
                
                // Verify audit log was created
                expect(logCountAfter).toBe(logCountBefore + 1);
                
                // Verify audit log content
                const auditLog = await AuditLog.findOne({
                    action: 'club_approved',
                    clubId: club._id
                });
                
                expect(auditLog).not.toBeNull();
                expect(auditLog!.actorId.toString()).toBe(admin._id.toString());
                expect(auditLog!.clubId.toString()).toBe(club._id.toString());
                expect(auditLog!.timestamp).toBeInstanceOf(Date);
                expect(auditLog!.details).toBeDefined();
            }),
            { numRuns: 5 }
        );
    }, 60000);
    
    it('should create audit log when rejecting a club', async () => {
        await fc.assert(
            fc.asyncProperty(
                clubDataArbitrary,
                rejectionReasonArbitrary,
                async (clubData, reason) => {
                    // Create user
                    const user = await User.create({
                        username: `user_${Math.random().toString(36).substring(2, 8)}`,
                        email: `test_${Date.now()}_${Math.random()}@example.com`,
                        password: 'Test123!@#',
                        role: 'student'
                    });
                    
                    // Create admin
                    const admin = await User.create({
                        username: `admin_${Math.random().toString(36).substring(2, 8)}`,
                        email: `admin_${Date.now()}_${Math.random()}@example.com`,
                        password: 'Admin123!@#',
                        role: 'admin',
                        isSuperAdmin: true
                    });
                    
                    // Create pending club
                    const club = await ClubProfile.create({
                        user: user._id,
                        name: clubData.name,
                        description: clubData.description,
                        email: clubData.email,
                        status: 'pending'
                    });
                    
                    // Count audit logs before action
                    const logCountBefore = await AuditLog.countDocuments();
                    
                    // Generate token
                    const token = AuthService.generateAccessToken(admin._id.toString());
                    
                    // Reject the club
                    const response = await request(app)
                        .post(`/api/admin/clubs/${club._id}/reject`)
                        .set('Authorization', `Bearer ${token}`)
                        .send({ reason });
                    
                    expect(response.status).toBe(200);
                    
                    // Count audit logs after action
                    const logCountAfter = await AuditLog.countDocuments();
                    
                    // Verify audit log was created
                    expect(logCountAfter).toBe(logCountBefore + 1);
                    
                    // Verify audit log content
                    const auditLog = await AuditLog.findOne({
                        action: 'club_rejected',
                        clubId: club._id
                    });
                    
                    expect(auditLog).not.toBeNull();
                    expect(auditLog!.actorId.toString()).toBe(admin._id.toString());
                    expect(auditLog!.clubId.toString()).toBe(club._id.toString());
                    expect(auditLog!.timestamp).toBeInstanceOf(Date);
                    expect(auditLog!.details).toBeDefined();
                    expect((auditLog!.details as Record<string, unknown>).reason).toBe(reason);
                }
            ),
            { numRuns: 5 }
        );
    }, 60000);
    
    it('should ensure audit log contains all required fields', async () => {
        await fc.assert(
            fc.asyncProperty(clubDataArbitrary, async (clubData) => {
                // Create user
                const user = await User.create({
                    username: `user_${Math.random().toString(36).substring(2, 8)}`,
                    email: `test_${Date.now()}_${Math.random()}@example.com`,
                    password: 'Test123!@#',
                    role: 'student'
                });
                
                // Create admin
                const admin = await User.create({
                    username: `admin_${Math.random().toString(36).substring(2, 8)}`,
                    email: `admin_${Date.now()}_${Math.random()}@example.com`,
                    password: 'Admin123!@#',
                    role: 'admin',
                    isSuperAdmin: true
                });
                
                // Create pending club
                const club = await ClubProfile.create({
                    user: user._id,
                    name: clubData.name,
                    description: clubData.description,
                    email: clubData.email,
                    status: 'pending'
                });
                
                // Generate token
                const token = AuthService.generateAccessToken(admin._id.toString());
                
                // Approve the club
                await request(app)
                    .post(`/api/admin/clubs/${club._id}/approve`)
                    .set('Authorization', `Bearer ${token}`);
                
                // Retrieve audit log
                const auditLog = await AuditLog.findOne({
                    action: 'club_approved',
                    clubId: club._id
                });
                
                // Verify all required fields are present
                expect(auditLog).not.toBeNull();
                expect(auditLog!.action).toBe('club_approved');
                expect(auditLog!.actorId).toBeDefined();
                expect(auditLog!.clubId).toBeDefined();
                expect(auditLog!.timestamp).toBeDefined();
                expect(auditLog!.timestamp).toBeInstanceOf(Date);
                
                // Verify actorId matches admin
                expect(auditLog!.actorId.toString()).toBe(admin._id.toString());
                
                // Verify clubId matches club
                expect(auditLog!.clubId.toString()).toBe(club._id.toString());
            }),
            { numRuns: 5 }
        );
    }, 60000);
});