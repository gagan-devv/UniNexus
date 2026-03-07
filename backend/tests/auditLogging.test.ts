import * as fc from 'fast-check';
import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import { User, IUser } from '../src/models/User';
import { ClubProfile, IClubProfile } from '../src/models/ClubProfile';
import { ClubMember, IClubMember } from '../src/models/ClubMember';
import { AuditLog, IAuditLog } from '../src/models/AuditLog';
import clubRoutes from '../src/routes/ClubRoutes';
import { AuthService } from '../src/services/authService';

const app: Application = express();
app.use(express.json());
app.use('/api/clubs', clubRoutes);

// Helper to create a test user
async function createTestUser(role: 'student' | 'admin' = 'student'): Promise<IUser> {
  const userData = {
    username: `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    email: `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
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
  const clubData = {
    user: ownerId,
    name: `Test Club ${Date.now()}`,
    description: 'A test club for testing purposes',
    email: `club_${Date.now()}@test.com`,
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

describe('Audit Logging Property Tests', () => {
  beforeEach(async () => {
    // Clean up before each test
    await User.deleteMany({});
    await ClubProfile.deleteMany({});
    await ClubMember.deleteMany({});
    await AuditLog.deleteMany({});
  });

  describe('Property 21: Audit Logging', () => {
    /**
     * **Validates: Requirements 9.5**
     * 
     * Property: For any member management action (add, remove, role change), the system should 
     * create an audit log entry containing the action type, actor, target user, and timestamp.
     */
    it('Property 21: should create audit log for all member management actions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('add', 'remove', 'role_change'), // Action type
          fc.integer({ min: 1, max: 3 }), // Number of operations to perform
          async (actionType, numOperations) => {
            // Setup: Create club owner and club
            const owner = await createTestUser();
            const club = await createTestClub(owner._id);
            const token = generateAuthToken(owner._id);

            // Add owner as admin
            await addAdminMember(club._id, owner._id);

            // Track all target users for cleanup
            const targetUsers: IUser[] = [];

            // Perform operations and verify audit logs
            for (let i = 0; i < numOperations; i++) {
              const targetUser = await createTestUser();
              targetUsers.push(targetUser);

              if (actionType === 'add') {
                // Add member
                await request(app)
                  .post(`/api/clubs/${club._id}/members`)
                  .set('Authorization', `Bearer ${token}`)
                  .send({ userId: targetUser._id.toString() })
                  .expect(201);

                // Verify audit log was created
                const auditLog = await AuditLog.findOne({
                  action: 'member_added',
                  actorId: owner._id,
                  targetUserId: targetUser._id,
                  clubId: club._id
                });

                expect(auditLog).toBeDefined();
                expect(auditLog?.action).toBe('member_added');
                expect(auditLog?.actorId.toString()).toBe(owner._id.toString());
                expect(auditLog?.targetUserId?.toString()).toBe(targetUser._id.toString());
                expect(auditLog?.clubId.toString()).toBe(club._id.toString());
                expect(auditLog?.timestamp).toBeDefined();
                expect(auditLog?.timestamp).toBeInstanceOf(Date);
                expect(auditLog?.details?.role).toBe('member');

              } else if (actionType === 'remove') {
                // First add the member
                await ClubMember.create({
                  clubId: club._id,
                  userId: targetUser._id,
                  role: 'member'
                });

                // Then remove the member
                await request(app)
                  .delete(`/api/clubs/${club._id}/members/${targetUser._id}`)
                  .set('Authorization', `Bearer ${token}`)
                  .expect(200);

                // Verify audit log was created
                const auditLog = await AuditLog.findOne({
                  action: 'member_removed',
                  actorId: owner._id,
                  targetUserId: targetUser._id,
                  clubId: club._id
                });

                expect(auditLog).toBeDefined();
                expect(auditLog?.action).toBe('member_removed');
                expect(auditLog?.actorId.toString()).toBe(owner._id.toString());
                expect(auditLog?.targetUserId?.toString()).toBe(targetUser._id.toString());
                expect(auditLog?.clubId.toString()).toBe(club._id.toString());
                expect(auditLog?.timestamp).toBeDefined();
                expect(auditLog?.timestamp).toBeInstanceOf(Date);
                expect(auditLog?.details?.previousRole).toBe('member');

              } else if (actionType === 'role_change') {
                // First add the member
                await ClubMember.create({
                  clubId: club._id,
                  userId: targetUser._id,
                  role: 'member'
                });

                // Then change the role
                await request(app)
                  .put(`/api/clubs/${club._id}/members/${targetUser._id}/role`)
                  .set('Authorization', `Bearer ${token}`)
                  .send({ role: 'admin' })
                  .expect(200);

                // Verify audit log was created
                const auditLog = await AuditLog.findOne({
                  action: 'role_changed',
                  actorId: owner._id,
                  targetUserId: targetUser._id,
                  clubId: club._id
                });

                expect(auditLog).toBeDefined();
                expect(auditLog?.action).toBe('role_changed');
                expect(auditLog?.actorId.toString()).toBe(owner._id.toString());
                expect(auditLog?.targetUserId?.toString()).toBe(targetUser._id.toString());
                expect(auditLog?.clubId.toString()).toBe(club._id.toString());
                expect(auditLog?.timestamp).toBeDefined();
                expect(auditLog?.timestamp).toBeInstanceOf(Date);
                expect(auditLog?.details?.previousRole).toBe('member');
                expect(auditLog?.details?.newRole).toBe('admin');
              }
            }

            // Verify all audit logs were created
            const allAuditLogs = await AuditLog.find({ clubId: club._id });
            expect(allAuditLogs.length).toBe(numOperations);

            // Verify all audit logs have required fields
            for (const log of allAuditLogs) {
              expect(log.action).toBeDefined();
              expect(log.actorId).toBeDefined();
              expect(log.clubId).toBeDefined();
              expect(log.timestamp).toBeDefined();
              expect(log.timestamp).toBeInstanceOf(Date);
              
              // Verify timestamp is recent (within last minute)
              const now = new Date();
              const timeDiff = now.getTime() - log.timestamp.getTime();
              expect(timeDiff).toBeLessThan(60000); // Less than 1 minute
            }

            // Cleanup
            await User.deleteMany({ _id: { $in: [owner._id, ...targetUsers.map(u => u._id)] } });
            await ClubProfile.findByIdAndDelete(club._id);
            await ClubMember.deleteMany({ clubId: club._id });
            await AuditLog.deleteMany({ clubId: club._id });
          }
        ),
        { numRuns: 10, timeout: 60000 }
      );
    }, 120000);

    it('Property 21: should create audit logs with correct actor information', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 2 }), // Number of different admins
          async (numAdmins) => {
            // Setup: Create club and multiple admins
            const owner = await createTestUser();
            const club = await createTestClub(owner._id);
            
            // Add owner as admin
            await addAdminMember(club._id, owner._id);

            const admins: IUser[] = [owner];
            const tokens: string[] = [generateAuthToken(owner._id)];

            // Create additional admins
            for (let i = 1; i < numAdmins; i++) {
              const admin = await createTestUser();
              admins.push(admin);
              tokens.push(generateAuthToken(admin._id));
              
              // Add as admin
              await ClubMember.create({
                clubId: club._id,
                userId: admin._id,
                role: 'admin'
              });
            }

            // Each admin performs an action
            const targetUsers: IUser[] = [];
            for (let i = 0; i < numAdmins; i++) {
              const targetUser = await createTestUser();
              targetUsers.push(targetUser);

              // Admin adds a member
              await request(app)
                .post(`/api/clubs/${club._id}/members`)
                .set('Authorization', `Bearer ${tokens[i]}`)
                .send({ userId: targetUser._id.toString() })
                .expect(201);

              // Verify audit log has correct actor
              const auditLog = await AuditLog.findOne({
                action: 'member_added',
                targetUserId: targetUser._id,
                clubId: club._id
              });

              expect(auditLog).toBeDefined();
              const admin = admins[i];
              if (auditLog && admin) {
                expect(auditLog.actorId.toString()).toBe(admin._id.toString());
              }
            }

            // Cleanup
            await User.deleteMany({ _id: { $in: [...admins.map(a => a._id), ...targetUsers.map(u => u._id)] } });
            await ClubProfile.findByIdAndDelete(club._id);
            await ClubMember.deleteMany({ clubId: club._id });
            await AuditLog.deleteMany({ clubId: club._id });
          }
        ),
        { numRuns: 5, timeout: 60000 }
      );
    }, 90000);

    it('Property 21: should preserve audit log history even after member removal', async () => {
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);

      // Add owner as admin
      await addAdminMember(club._id, owner._id);

      const targetUser = await createTestUser();

      // Add member
      await request(app)
        .post(`/api/clubs/${club._id}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: targetUser._id.toString() })
        .expect(201);

      // Change role
      await request(app)
        .put(`/api/clubs/${club._id}/members/${targetUser._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' })
        .expect(200);

      // Remove member
      await request(app)
        .delete(`/api/clubs/${club._id}/members/${targetUser._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify all audit logs still exist
      const auditLogs = await AuditLog.find({
        clubId: club._id,
        targetUserId: targetUser._id
      }).sort({ timestamp: 1 });

      expect(auditLogs.length).toBe(3);
      expect(auditLogs[0]?.action).toBe('member_added');
      expect(auditLogs[1]?.action).toBe('role_changed');
      expect(auditLogs[2]?.action).toBe('member_removed');

      // Verify chronological order
      if (auditLogs[0] && auditLogs[1] && auditLogs[2]) {
        expect(auditLogs[0].timestamp.getTime()).toBeLessThanOrEqual(auditLogs[1].timestamp.getTime());
        expect(auditLogs[1].timestamp.getTime()).toBeLessThanOrEqual(auditLogs[2].timestamp.getTime());
      }

      // Cleanup
      await User.deleteMany({ _id: { $in: [owner._id, targetUser._id] } });
      await ClubProfile.findByIdAndDelete(club._id);
      await ClubMember.deleteMany({ clubId: club._id });
      await AuditLog.deleteMany({ clubId: club._id });
    });
  });

  describe('Unit Tests: Audit Logging', () => {
    /**
     * Test audit log created on member addition
     * Validates: Requirements 9.5
     */
    it('should create audit log when member is added', async () => {
      // Setup
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);
      await addAdminMember(club._id, owner._id);

      const targetUser = await createTestUser();

      // Act: Add member
      const response = await request(app)
        .post(`/api/clubs/${club._id}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: targetUser._id.toString() })
        .expect(201);

      // Assert: Verify audit log was created
      const auditLog = await AuditLog.findOne({
        action: 'member_added',
        actorId: owner._id,
        targetUserId: targetUser._id,
        clubId: club._id
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('member_added');
      expect(auditLog?.actorId.toString()).toBe(owner._id.toString());
      expect(auditLog?.targetUserId?.toString()).toBe(targetUser._id.toString());
      expect(auditLog?.clubId.toString()).toBe(club._id.toString());
      expect(auditLog?.timestamp).toBeDefined();
      expect(auditLog?.timestamp).toBeInstanceOf(Date);

      // Cleanup
      await User.deleteMany({ _id: { $in: [owner._id, targetUser._id] } });
      await ClubProfile.findByIdAndDelete(club._id);
      await ClubMember.deleteMany({ clubId: club._id });
      await AuditLog.deleteMany({ clubId: club._id });
    });

    /**
     * Test audit log created on member removal
     * Validates: Requirements 9.5
     */
    it('should create audit log when member is removed', async () => {
      // Setup
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);
      await addAdminMember(club._id, owner._id);

      const targetUser = await createTestUser();
      
      // Add member first
      await ClubMember.create({
        clubId: club._id,
        userId: targetUser._id,
        role: 'member'
      });

      // Act: Remove member
      const response = await request(app)
        .delete(`/api/clubs/${club._id}/members/${targetUser._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert: Verify audit log was created
      const auditLog = await AuditLog.findOne({
        action: 'member_removed',
        actorId: owner._id,
        targetUserId: targetUser._id,
        clubId: club._id
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('member_removed');
      expect(auditLog?.actorId.toString()).toBe(owner._id.toString());
      expect(auditLog?.targetUserId?.toString()).toBe(targetUser._id.toString());
      expect(auditLog?.clubId.toString()).toBe(club._id.toString());
      expect(auditLog?.timestamp).toBeDefined();
      expect(auditLog?.timestamp).toBeInstanceOf(Date);

      // Cleanup
      await User.deleteMany({ _id: { $in: [owner._id, targetUser._id] } });
      await ClubProfile.findByIdAndDelete(club._id);
      await ClubMember.deleteMany({ clubId: club._id });
      await AuditLog.deleteMany({ clubId: club._id });
    });

    /**
     * Test audit log created on role change
     * Validates: Requirements 9.5
     */
    it('should create audit log when member role is changed', async () => {
      // Setup
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);
      await addAdminMember(club._id, owner._id);

      const targetUser = await createTestUser();
      
      // Add member first
      await ClubMember.create({
        clubId: club._id,
        userId: targetUser._id,
        role: 'member'
      });

      // Act: Change role
      const response = await request(app)
        .put(`/api/clubs/${club._id}/members/${targetUser._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' })
        .expect(200);

      // Assert: Verify audit log was created
      const auditLog = await AuditLog.findOne({
        action: 'role_changed',
        actorId: owner._id,
        targetUserId: targetUser._id,
        clubId: club._id
      });

      expect(auditLog).toBeDefined();
      expect(auditLog?.action).toBe('role_changed');
      expect(auditLog?.actorId.toString()).toBe(owner._id.toString());
      expect(auditLog?.targetUserId?.toString()).toBe(targetUser._id.toString());
      expect(auditLog?.clubId.toString()).toBe(club._id.toString());
      expect(auditLog?.timestamp).toBeDefined();
      expect(auditLog?.timestamp).toBeInstanceOf(Date);

      // Cleanup
      await User.deleteMany({ _id: { $in: [owner._id, targetUser._id] } });
      await ClubProfile.findByIdAndDelete(club._id);
      await ClubMember.deleteMany({ clubId: club._id });
      await AuditLog.deleteMany({ clubId: club._id });
    });

    /**
     * Test audit log contains correct information
     * Validates: Requirements 9.5
     */
    it('should create audit log with correct information for member addition', async () => {
      // Setup
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);
      await addAdminMember(club._id, owner._id);

      const targetUser = await createTestUser();

      // Act: Add member
      await request(app)
        .post(`/api/clubs/${club._id}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: targetUser._id.toString() })
        .expect(201);

      // Assert: Verify audit log contains all correct information
      const auditLog = await AuditLog.findOne({
        action: 'member_added',
        clubId: club._id
      });

      expect(auditLog).toBeDefined();
      
      // Verify action type
      expect(auditLog?.action).toBe('member_added');
      
      // Verify actor (who performed the action)
      expect(auditLog?.actorId).toBeDefined();
      expect(auditLog?.actorId.toString()).toBe(owner._id.toString());
      
      // Verify target user (who was affected)
      expect(auditLog?.targetUserId).toBeDefined();
      expect(auditLog?.targetUserId?.toString()).toBe(targetUser._id.toString());
      
      // Verify club ID
      expect(auditLog?.clubId).toBeDefined();
      expect(auditLog?.clubId.toString()).toBe(club._id.toString());
      
      // Verify timestamp
      expect(auditLog?.timestamp).toBeDefined();
      expect(auditLog?.timestamp).toBeInstanceOf(Date);
      
      // Verify timestamp is recent (within last 5 seconds)
      const now = new Date();
      const timeDiff = now.getTime() - auditLog!.timestamp.getTime();
      expect(timeDiff).toBeLessThan(5000);
      
      // Verify details contain role information
      expect(auditLog?.details).toBeDefined();
      expect(auditLog?.details?.role).toBe('member');

      // Cleanup
      await User.deleteMany({ _id: { $in: [owner._id, targetUser._id] } });
      await ClubProfile.findByIdAndDelete(club._id);
      await ClubMember.deleteMany({ clubId: club._id });
      await AuditLog.deleteMany({ clubId: club._id });
    });

    it('should create audit log with correct information for member removal', async () => {
      // Setup
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);
      await addAdminMember(club._id, owner._id);

      const targetUser = await createTestUser();
      
      // Add member first
      await ClubMember.create({
        clubId: club._id,
        userId: targetUser._id,
        role: 'member'
      });

      // Act: Remove member
      await request(app)
        .delete(`/api/clubs/${club._id}/members/${targetUser._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Assert: Verify audit log contains all correct information
      const auditLog = await AuditLog.findOne({
        action: 'member_removed',
        clubId: club._id
      });

      expect(auditLog).toBeDefined();
      
      // Verify action type
      expect(auditLog?.action).toBe('member_removed');
      
      // Verify actor
      expect(auditLog?.actorId).toBeDefined();
      expect(auditLog?.actorId.toString()).toBe(owner._id.toString());
      
      // Verify target user
      expect(auditLog?.targetUserId).toBeDefined();
      expect(auditLog?.targetUserId?.toString()).toBe(targetUser._id.toString());
      
      // Verify club ID
      expect(auditLog?.clubId).toBeDefined();
      expect(auditLog?.clubId.toString()).toBe(club._id.toString());
      
      // Verify timestamp
      expect(auditLog?.timestamp).toBeDefined();
      expect(auditLog?.timestamp).toBeInstanceOf(Date);
      
      // Verify details contain previous role
      expect(auditLog?.details).toBeDefined();
      expect(auditLog?.details?.previousRole).toBe('member');

      // Cleanup
      await User.deleteMany({ _id: { $in: [owner._id, targetUser._id] } });
      await ClubProfile.findByIdAndDelete(club._id);
      await ClubMember.deleteMany({ clubId: club._id });
      await AuditLog.deleteMany({ clubId: club._id });
    });

    it('should create audit log with correct information for role change', async () => {
      // Setup
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);
      await addAdminMember(club._id, owner._id);

      const targetUser = await createTestUser();
      
      // Add member first
      await ClubMember.create({
        clubId: club._id,
        userId: targetUser._id,
        role: 'member'
      });

      // Act: Change role from member to admin
      await request(app)
        .put(`/api/clubs/${club._id}/members/${targetUser._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' })
        .expect(200);

      // Assert: Verify audit log contains all correct information
      const auditLog = await AuditLog.findOne({
        action: 'role_changed',
        clubId: club._id
      });

      expect(auditLog).toBeDefined();
      
      // Verify action type
      expect(auditLog?.action).toBe('role_changed');
      
      // Verify actor
      expect(auditLog?.actorId).toBeDefined();
      expect(auditLog?.actorId.toString()).toBe(owner._id.toString());
      
      // Verify target user
      expect(auditLog?.targetUserId).toBeDefined();
      expect(auditLog?.targetUserId?.toString()).toBe(targetUser._id.toString());
      
      // Verify club ID
      expect(auditLog?.clubId).toBeDefined();
      expect(auditLog?.clubId.toString()).toBe(club._id.toString());
      
      // Verify timestamp
      expect(auditLog?.timestamp).toBeDefined();
      expect(auditLog?.timestamp).toBeInstanceOf(Date);
      
      // Verify details contain both previous and new role
      expect(auditLog?.details).toBeDefined();
      expect(auditLog?.details?.previousRole).toBe('member');
      expect(auditLog?.details?.newRole).toBe('admin');

      // Cleanup
      await User.deleteMany({ _id: { $in: [owner._id, targetUser._id] } });
      await ClubProfile.findByIdAndDelete(club._id);
      await ClubMember.deleteMany({ clubId: club._id });
      await AuditLog.deleteMany({ clubId: club._id });
    });

    it('should create separate audit logs for multiple operations', async () => {
      // Setup
      const owner = await createTestUser();
      const club = await createTestClub(owner._id);
      const token = generateAuthToken(owner._id);
      await addAdminMember(club._id, owner._id);

      const user1 = await createTestUser();
      const user2 = await createTestUser();

      // Act: Perform multiple operations
      // Add first member
      await request(app)
        .post(`/api/clubs/${club._id}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: user1._id.toString() })
        .expect(201);

      // Add second member
      await request(app)
        .post(`/api/clubs/${club._id}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({ userId: user2._id.toString() })
        .expect(201);

      // Change first member's role
      await request(app)
        .put(`/api/clubs/${club._id}/members/${user1._id}/role`)
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'admin' })
        .expect(200);

      // Assert: Verify all audit logs were created
      const auditLogs = await AuditLog.find({ clubId: club._id }).sort({ timestamp: 1 });

      expect(auditLogs.length).toBe(3);
      
      // Verify first log (user1 added)
      expect(auditLogs[0]?.action).toBe('member_added');
      expect(auditLogs[0]?.targetUserId?.toString()).toBe(user1._id.toString());
      
      // Verify second log (user2 added)
      expect(auditLogs[1]?.action).toBe('member_added');
      expect(auditLogs[1]?.targetUserId?.toString()).toBe(user2._id.toString());
      
      // Verify third log (user1 role changed)
      expect(auditLogs[2]?.action).toBe('role_changed');
      expect(auditLogs[2]?.targetUserId?.toString()).toBe(user1._id.toString());

      // Verify all logs have the same actor and club
      auditLogs.forEach(log => {
        expect(log.actorId.toString()).toBe(owner._id.toString());
        expect(log.clubId.toString()).toBe(club._id.toString());
      });

      // Cleanup
      await User.deleteMany({ _id: { $in: [owner._id, user1._id, user2._id] } });
      await ClubProfile.findByIdAndDelete(club._id);
      await ClubMember.deleteMany({ clubId: club._id });
      await AuditLog.deleteMany({ clubId: club._id });
    });

    it('should record different actors for audit logs', async () => {
      // Setup: Create club with two admins
      const owner = await createTestUser();
      const admin2 = await createTestUser();
      const club = await createTestClub(owner._id);
      
      const ownerToken = generateAuthToken(owner._id);
      const admin2Token = generateAuthToken(admin2._id);
      
      await addAdminMember(club._id, owner._id);
      await ClubMember.create({
        clubId: club._id,
        userId: admin2._id,
        role: 'admin'
      });

      const user1 = await createTestUser();
      const user2 = await createTestUser();

      // Act: Different admins perform actions
      // Owner adds user1
      await request(app)
        .post(`/api/clubs/${club._id}/members`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ userId: user1._id.toString() })
        .expect(201);

      // Admin2 adds user2
      await request(app)
        .post(`/api/clubs/${club._id}/members`)
        .set('Authorization', `Bearer ${admin2Token}`)
        .send({ userId: user2._id.toString() })
        .expect(201);

      // Assert: Verify audit logs have correct actors
      const log1 = await AuditLog.findOne({
        action: 'member_added',
        targetUserId: user1._id,
        clubId: club._id
      });

      const log2 = await AuditLog.findOne({
        action: 'member_added',
        targetUserId: user2._id,
        clubId: club._id
      });

      expect(log1).toBeDefined();
      expect(log1?.actorId.toString()).toBe(owner._id.toString());

      expect(log2).toBeDefined();
      expect(log2?.actorId.toString()).toBe(admin2._id.toString());

      // Cleanup
      await User.deleteMany({ _id: { $in: [owner._id, admin2._id, user1._id, user2._id] } });
      await ClubProfile.findByIdAndDelete(club._id);
      await ClubMember.deleteMany({ clubId: club._id });
      await AuditLog.deleteMany({ clubId: club._id });
    });
  });
});
