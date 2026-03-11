import * as fc from 'fast-check';
import request from 'supertest';
import express, { Application } from 'express';
import { User, IUser } from '../src/models/User';
import { ClubProfile } from '../src/models/ClubProfile';
import adminRoutes from '../src/routes/adminRoutes';
import { AuthService } from '../src/services/authService';

/**
 * Property-Based Test: Admin Role Verification
 * 
 * **Validates: Requirements 9.3, 9.4**
 * 
 * Property: All admin endpoint requests must verify isSuperAdmin = true
 * 
 * For any admin endpoint request:
 * - If user is not authenticated → 401 Unauthorized
 * - If user.isSuperAdmin = false → 403 Forbidden
 * - If user.isSuperAdmin = true → Request proceeds (200/404/etc, not 401/403)
 */

describe('Property Test: Admin Role Verification', () => {
    let app: Application;
    
    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.use('/api/admin', adminRoutes);
    });
    
    // Generator for user with isSuperAdmin flag
    const userArbitrary = fc.record({
        _id: fc.string({ minLength: 24, maxLength: 24 }),
        username: fc.string({ minLength: 3, maxLength: 20 }),
        email: fc.emailAddress(),
        isSuperAdmin: fc.boolean(),
        role: fc.constantFrom('student', 'admin')
    });
    
    // Generator for admin endpoints
    const adminEndpointArbitrary = fc.constantFrom(
        { method: 'GET', path: '/api/admin/clubs/pending' },
        { method: 'POST', path: '/api/admin/clubs/507f1f77bcf86cd799439011/approve' },
        { method: 'POST', path: '/api/admin/clubs/507f1f77bcf86cd799439011/reject' }
    );
    
    it('should reject requests without authentication token', async () => {
        await fc.assert(
            fc.asyncProperty(adminEndpointArbitrary, async (endpoint) => {
                const response = endpoint.method === 'GET'
                    ? await request(app).get(endpoint.path)
                    : await request(app).post(endpoint.path).send({});
                
                // Must return 401 Unauthorized
                expect(response.status).toBe(401);
                expect(response.body.success).toBe(false);
            }),
            { numRuns: 20 }
        );
    });
    
    it('should reject requests from non-super-admin users', async () => {
        await fc.assert(
            fc.asyncProperty(
                userArbitrary.filter(u => !u.isSuperAdmin),
                adminEndpointArbitrary,
                async (user, endpoint) => {
                    // Mock User.findById to return non-super-admin user
                    jest.spyOn(User, 'findById').mockImplementation((() => ({
                        select: jest.fn().mockResolvedValue(user)
                    })) as never);
                    
                    // Create valid token
                    const token = AuthService.generateAccessToken(user._id as string);
                    
                    const response = endpoint.method === 'GET'
                        ? await request(app).get(endpoint.path).set('Authorization', `Bearer ${token}`)
                        : await request(app).post(endpoint.path).set('Authorization', `Bearer ${token}`).send({ reason: 'test' });
                    
                    // Must return 403 Forbidden (not 401)
                    expect(response.status).toBe(403);
                    expect(response.body.success).toBe(false);
                    expect(response.body.message).toContain('Super admin');
                    
                    jest.restoreAllMocks();
                }
            ),
            { numRuns: 20 }
        );
    });
    
    it('should allow requests from super admin users', async () => {
        await fc.assert(
            fc.asyncProperty(
                userArbitrary.filter(u => u.isSuperAdmin),
                async (user) => {
                    // Mock User.findById to return super admin user
                    jest.spyOn(User, 'findById').mockImplementation((() => ({
                        select: jest.fn().mockResolvedValue(user)
                    })) as never);
                    
                    // Mock ClubProfile.find for GET endpoint
                    jest.spyOn(ClubProfile, 'find').mockImplementation((() => ({
                        populate: jest.fn().mockReturnThis(),
                        sort: jest.fn().mockReturnThis(),
                        skip: jest.fn().mockReturnThis(),
                        limit: jest.fn().mockReturnThis(),
                        lean: jest.fn().mockResolvedValue([])
                    })) as never);
                    
                    jest.spyOn(ClubProfile, 'countDocuments').mockResolvedValue(0);
                    
                    // Create valid token
                    const token = AuthService.generateAccessToken(user._id as string);
                    
                    // Test GET endpoint
                    const response = await request(app)
                        .get('/api/admin/clubs/pending')
                        .set('Authorization', `Bearer ${token}`);
                    
                    // Must NOT return 401 or 403 (authentication/authorization passed)
                    expect(response.status).not.toBe(401);
                    expect(response.status).not.toBe(403);
                    
                    // Should return 200 for successful request
                    expect(response.status).toBe(200);
                    
                    jest.restoreAllMocks();
                }
            ),
            { numRuns: 20 }
        );
    });
});
