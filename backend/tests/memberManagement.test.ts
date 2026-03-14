import * as fc from 'fast-check';
import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import { User, IUser } from '../src/models/User';
import { ClubProfile, IClubProfile } from '../src/models/ClubProfile';
import { ClubMember, IClubMember } from '../src/models/ClubMember';
import { AuditLog } from '../src/models/AuditLog';
import clubRoutes from '../src/routes/ClubRoutes';
import { AuthService } from '../src/services/authService';

const app: Application = express();
app.use(express.json());
app.use('/api/clubs', clubRoutes);

// Helper to create a test user
async function createTestUser(role: 'student' | 'admin' = 'student'): Promise<IUser> {
  const suffix = Math.random().toString(36).substring(2, 8);
  const userData = {
    username: `u${suffix}`,
    email: `test${suffix}@example.com`,
    password: 'Test123!@#',
    role
  };
  
  const user = await User.create(userData);
  return user;
}

// Helper to generate auth token
function generateAuthToken(userId: mongoose.Types.ObjectId): string {
  return AuthService.generateAccessToken(userId.toString());
}

// Helper to create a test club
async function createTestClub(ownerId: mongoose.Types.ObjectId): Promise<IClubProfile> {
  const suffix = Math.random().toString(36).substring(2, 8);
  const clubData = {
    user: ownerId,
    name: `Test Club ${suffix}`,
    description: 'A test club for testing purposes',
    email: `club${suffix}@test.com`,
    category: 'Technology' as const
  };
  
  const club = await ClubProfile.create(clubData);
  return club;
}

// Helper to add a member with admin role
async function addAdminMember(clubId: mongoose.Types.ObjectId, userId: mongoose.Types.ObjectId): Promise<IClubMember> {
  const member = await ClubMember.create({
    clubId,
    userId,
    role: 'admin'
  });
  return member;
}

describe('Member Management API Tests', () => {

  describe('Property 10: Member Addition', () => {
    /**
     * **Validates: Requirements 4.1, 4.8**
     * 
     * Property: For any valid user ID provided by a club admin, the member management API 
     * should add that user as a club member with role "member" and return the updated member list.
     */
    it('Property 10: should add any valid user as a member with role "member"', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 2 }), // Number of users to add
          async (numUsers) => {
            // Setup: Create club owner and club
            const owner = await createTestUser();
            const club = await createTestClub(owner._id);
            const token = generateAuthToken(owner._id);

            // Create users to add
            const usersToAdd: IUser[] = [];
            for (let i = 0; i < numUsers; i++) {
              const user = await createTestUser();
              usersToAdd.push(user);
            }

            // Add each user to the club
            for (const user of usersToAdd) {
              const response = await request(app)
                .post(`/api/clubs/${club._id}/members`)
                .set('Authorization', `Bearer ${token}`)
                .send({ userId: user._id.toString() })
                .expect(201);

              // Verify response structure
              expect(response.body.success).toBe(true);
              expect(response.body.message).toBe('Member added successfully');
              expect(response.body.data.members).toBeDefined();
              expect(Array.isArray(response.body.data.members)).toBe(true);

              // Verify the user was added with role 'member'
              const addedMember = await ClubMember.findOne({
                clubId: club._id,
                userId: user._id
              });
              expect(addedMember).toBeDefined();
              expect(addedMember?.role).toBe('member');

              // Verify audit log was created
              const auditLog = await AuditLog.findOne({
                action: 'member_added',
                clubId: club._id,
                targetUserId: user._id
              });
              expect(auditLog).toBeDefined();
            }

            // Verify all members are in the club
            const allMembers = await ClubMember.find({ clubId: club._id });
            expect(allMembers.length).toBe(numUsers);
          }
        ),
        { numRuns: 5, timeout: 60000 }
      );
    }, 90000);

    it('should prevent adding duplicate members', async () => {
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);
      const userToAdd = await createTestUser();

      // Add user first time - should succeed
      await request(app)
        .post(`/api/clubs/${club._id}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: userToAdd._id.toString() })
        .expect(201);

      // Try to add same user again - should fail
      const response = await request(app)
        .post(`/api/clubs/${club._id}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: userToAdd._id.toString() })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User is already a member of this club');
    });

    it('should return 404 for non-existent user', async () => {
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);
      const fakeUserId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/clubs/${club._id}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: fakeUserId.toString() })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 404 for non-existent club', async () => {
      const owner = await createTestUser();
      const token = generateAuthToken(owner._id);
      const userToAdd = await createTestUser();
      const fakeClubId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/clubs/${fakeClubId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: userToAdd._id.toString() })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Club not found');
    });
  });

  describe('Property 11: Member Removal', () => {
    /**
     * **Validates: Requirements 4.2, 4.9**
     * 
     * Property: For any valid member removal request by a club admin, the member management API 
     * should remove the specified member from the club and return the updated member list.
     */
    it('Property 11: should remove any valid member from the club', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 3 }), // Number of members (at least 2 to allow removal)
          async (numMembers) => {
            // Setup: Create club owner and club
            const owner = await createTestUser();
            const club = await createTestClub(owner._id);
            const token = generateAuthToken(owner._id);

            // Add owner as admin
            await addAdminMember(club._id, owner._id);

            // Create and add members
            const members: IUser[] = [];
            for (let i = 0; i < numMembers; i++) {
              const user = await createTestUser();
              members.push(user);
              await ClubMember.create({
                clubId: club._id,
                userId: user._id,
                role: 'member'
              });
            }

            // Remove each member
            for (const member of members) {
              const response = await request(app)
                .delete(`/api/clubs/${club._id}/members/${member._id}`)
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

              // Verify response structure
              expect(response.body.success).toBe(true);
              expect(response.body.message).toBe('Member removed successfully');
              expect(response.body.data.members).toBeDefined();
              expect(Array.isArray(response.body.data.members)).toBe(true);

              // Verify the member was removed
              const removedMember = await ClubMember.findOne({
                clubId: club._id,
                userId: member._id
              });
              expect(removedMember).toBeNull();

              // Verify audit log was created
              const auditLog = await AuditLog.findOne({
                action: 'member_removed',
                clubId: club._id,
                targetUserId: member._id
              });
              expect(auditLog).toBeDefined();
            }

            // Verify all members are removed (only admin remains)
            const remainingMembers = await ClubMember.find({ clubId: club._id });
            expect(remainingMembers.length).toBe(1); // Only owner/admin remains
            expect(remainingMembers[0]?.userId.toString()).toBe(owner._id.toString());
          }
        ),
        { numRuns: 5, timeout: 60000 }
      );
    }, 90000);

    it('should prevent removing last admin', async () => {
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);

      // Add owner as admin
      await addAdminMember(club._id, owner._id);

      // Try to remove the only admin
      const response = await request(app)
        .delete(`/api/clubs/${club._id}/members/${owner._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot remove the last admin from the club');

      // Verify admin is still in the club
      const adminMember = await ClubMember.findOne({
        clubId: club._id,
        userId: owner._id
      });
      expect(adminMember).toBeDefined();
    });
  });

  describe('Property 12: Member Role Update', () => {
    /**
     * **Validates: Requirements 4.3, 4.10**
     * 
     * Property: For any valid role change request by a club admin, the member management API 
     * should update the member's role and return the updated member information.
     */
    it('Property 12: should update member role for any valid role change', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 3 }), // Number of members to test
          fc.constantFrom('admin', 'member'), // Target role
          async (numMembers, targetRole) => {
            // Setup: Create club owner and club
            const owner = await createTestUser();
            const club = await createTestClub(owner._id);
            const token = generateAuthToken(owner._id);

            // Add owner as admin
            await addAdminMember(club._id, owner._id);

            // Create and add members with opposite role
            const initialRole = targetRole === 'admin' ? 'member' : 'admin';
            const members: IUser[] = [];
            for (let i = 0; i < numMembers; i++) {
              const user = await createTestUser();
              members.push(user);
              await ClubMember.create({
                clubId: club._id,
                userId: user._id,
                role: initialRole
              });
            }

            // Update each member's role
            for (const member of members) {
              const response = await request(app)
                .put(`/api/clubs/${club._id}/members/${member._id}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({ role: targetRole })
                .expect(200);

              // Verify response structure
              expect(response.body.success).toBe(true);
              expect(response.body.message).toBe('Member role updated successfully');
              expect(response.body.data).toBeDefined();

              // Verify the role was updated
              const updatedMember = await ClubMember.findOne({
                clubId: club._id,
                userId: member._id
              });
              expect(updatedMember).toBeDefined();
              expect(updatedMember?.role).toBe(targetRole);

              // Verify audit log was created
              const auditLog = await AuditLog.findOne({
                action: 'role_changed',
                clubId: club._id,
                targetUserId: member._id
              });
              expect(auditLog).toBeDefined();
              expect(auditLog?.details?.previousRole).toBe(initialRole);
              expect(auditLog?.details?.newRole).toBe(targetRole);
            }
          }
        ),
        { numRuns: 5, timeout: 60000 }
      );
    }, 90000);

    it('should prevent changing role of last admin to member', async () => {
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);

      // Add owner as admin
      await addAdminMember(club._id, owner._id);

      // Try to change the only admin to member
      const response = await request(app)
        .put(`/api/clubs/${club._id}/members/${owner._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'member' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Cannot change role of the last admin');

      // Verify admin role is unchanged
      const adminMember = await ClubMember.findOne({
        clubId: club._id,
        userId: owner._id
      });
      expect(adminMember?.role).toBe('admin');
    });
  });

  describe('Property 13: Authorization Enforcement', () => {
    /**
     * **Validates: Requirements 4.4, 9.1, 9.2, 9.3, 9.4**
     * 
     * Property: For any member management API request from a non-admin user, the API should 
     * return a 403 Forbidden error, and for any unauthenticated request, the API should return 
     * a 401 Unauthorized error.
     */
    it('Property 13: should enforce authorization for all member management operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('add', 'remove', 'updateRole'), // Operation type
          async (operation) => {
            // Setup: Create club owner, club, and non-admin user
            const owner = await createTestUser();
            const club = await createTestClub(owner._id);
            const nonAdmin = await createTestUser();
            const nonAdminToken = generateAuthToken(nonAdmin._id);
            const targetUser = await createTestUser();

            // Add owner as admin
            await addAdminMember(club._id, owner._id);

            // Add target user as member for remove/updateRole operations
            if (operation === 'remove' || operation === 'updateRole') {
              await ClubMember.create({
                clubId: club._id,
                userId: targetUser._id,
                role: 'member'
              });
            }

            // Test non-admin access (should return 403)
            let response;
            if (operation === 'add') {
              response = await request(app)
                .post(`/api/clubs/${club._id}/members`)
                .set('Authorization', `Bearer ${nonAdminToken}`)
                .send({ userId: targetUser._id.toString() });
            } else if (operation === 'remove') {
              response = await request(app)
                .delete(`/api/clubs/${club._id}/members/${targetUser._id}`)
                .set('Authorization', `Bearer ${nonAdminToken}`);
            } else {
              response = await request(app)
                .put(`/api/clubs/${club._id}/members/${targetUser._id}/role`)
                .set('Authorization', `Bearer ${nonAdminToken}`)
                .send({ role: 'admin' });
            }

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);

            // Test unauthenticated access (should return 401)
            if (operation === 'add') {
              response = await request(app)
                .post(`/api/clubs/${club._id}/members`)
                .send({ userId: targetUser._id.toString() });
            } else if (operation === 'remove') {
              response = await request(app)
                .delete(`/api/clubs/${club._id}/members/${targetUser._id}`);
            } else {
              response = await request(app)
                .put(`/api/clubs/${club._id}/members/${targetUser._id}/role`)
                .send({ role: 'admin' });
            }

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
          }
        ),
        { numRuns: 5, timeout: 60000 }
      );
    }, 90000);
  });

  describe('Property 14: Resource Validation', () => {
    /**
     * **Validates: Requirements 4.5, 4.6**
     * 
     * Property: For any API request with a non-existent user ID or club ID, the API should 
     * return a 404 Not Found error.
     */
    it('Property 14: should return 404 for non-existent resources', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('user', 'club', 'both'), // Which resource is non-existent
          fc.constantFrom('add', 'remove', 'updateRole'), // Operation type
          async (nonExistentResource, operation) => {
            // Setup: Create club owner and club
            const owner = await createTestUser();
            const club = await createTestClub(owner._id);
            const token = generateAuthToken(owner._id);

            // Add owner as admin
            await addAdminMember(club._id, owner._id);

            // Create fake IDs
            const fakeUserId = new mongoose.Types.ObjectId();
            const fakeClubId = new mongoose.Types.ObjectId();

            // Determine which IDs to use
            const clubIdToUse = nonExistentResource === 'club' || nonExistentResource === 'both' 
              ? fakeClubId.toString() 
              : club._id.toString();
            const userIdToUse = nonExistentResource === 'user' || nonExistentResource === 'both' 
              ? fakeUserId.toString() 
              : owner._id.toString();

            // Test the operation
            let response;
            if (operation === 'add') {
              response = await request(app)
                .post(`/api/clubs/${clubIdToUse}/members`)
                .set('Authorization', `Bearer ${token}`)
                .send({ userId: userIdToUse });
            } else if (operation === 'remove') {
              response = await request(app)
                .delete(`/api/clubs/${clubIdToUse}/members/${userIdToUse}`)
                .set('Authorization', `Bearer ${token}`);
            } else {
              response = await request(app)
                .put(`/api/clubs/${clubIdToUse}/members/${userIdToUse}/role`)
                .set('Authorization', `Bearer ${token}`)
                .send({ role: 'admin' });
            }

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            // Different operations may return different 404 messages
            if ((operation === 'remove' || operation === 'updateRole') && nonExistentResource === 'user') {
              // Remove and updateRole operations check membership first
              expect(response.body.message).toMatch(/not a member|not found/i);
            } else {
              expect(response.body.message).toMatch(/not found/i);
            }
          }
        ),
        { numRuns: 5, timeout: 60000 }
      );
    }, 90000);
  });

  describe('Unit Tests: Member Management Endpoints', () => {
    it('Unit: should successfully add a member', async () => {
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);
      const userToAdd = await createTestUser();

      const response = await request(app)
        .post(`/api/clubs/${club._id}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: userToAdd._id.toString() })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Member added successfully');
    });

    it('Unit: should successfully remove a member', async () => {
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);
      const member = await createTestUser();

      // Add owner as admin
      await addAdminMember(club._id, owner._id);

      // Add member
      await ClubMember.create({
        clubId: club._id,
        userId: member._id,
        role: 'member'
      });

      const response = await request(app)
        .delete(`/api/clubs/${club._id}/members/${member._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Member removed successfully');
    });

    it('Unit: should successfully update member role', async () => {
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);
      const member = await createTestUser();

      // Add owner as admin
      await addAdminMember(club._id, owner._id);

      // Add member
      await ClubMember.create({
        clubId: club._id,
        userId: member._id,
        role: 'member'
      });

      const response = await request(app)
        .put(`/api/clubs/${club._id}/members/${member._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Member role updated successfully');
    });

    it('Unit: should handle non-existent user', async () => {
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);
      const fakeUserId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/clubs/${club._id}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: fakeUserId.toString() })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('Unit: should handle non-existent club', async () => {
      const owner = await createTestUser();
      const token = generateAuthToken(owner._id);
      const userToAdd = await createTestUser();
      const fakeClubId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post(`/api/clubs/${fakeClubId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: userToAdd._id.toString() })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Club not found');
    });

    it('Unit: should handle unauthenticated request', async () => {
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const userToAdd = await createTestUser();

      const response = await request(app)
        .post(`/api/clubs/${club._id}/members`)
        .send({ userId: userToAdd._id.toString() })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
