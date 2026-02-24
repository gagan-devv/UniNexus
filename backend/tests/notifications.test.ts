import * as fc from 'fast-check';
import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import { Notification, INotification } from '../src/models/Notification';
import { User, IUser } from '../src/models/User';
import notificationRoutes from '../src/routes/notificationRoutes';
import { AuthService } from '../src/services/authService';

const app: Application = express();
app.use(express.json());
app.use('/api/notifications', notificationRoutes);

// Notification data generator
const notificationDataGenerator = () => fc.record({
  type: fc.constantFrom('event', 'club', 'message', 'system'),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  content: fc.string({ minLength: 1, maxLength: 1000 }),
  relatedType: fc.option(fc.constantFrom('event', 'club', 'message', 'user')),
  read: fc.boolean()
});

// Helper to create a test user
async function createTestUser(): Promise<IUser> {
  const userData = {
    username: `testuser_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    email: `test_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
    password: 'Test123!@#',
    role: 'student' as const
  };
  
  const user = await User.create(userData);
  return user;
}

// Helper to generate auth token
function generateAuthToken(userId: mongoose.Types.ObjectId): string {
  return AuthService.generateAccessToken(userId.toString());
}

// Helper to create notifications for a user
async function createNotificationsForUser(
  userId: mongoose.Types.ObjectId,
  count: number,
  overrides: Partial<INotification> = {}
): Promise<INotification[]> {
  const notifications: INotification[] = [];
  
  for (let i = 0; i < count; i++) {
    const notification = await Notification.create({
      userId,
      type: 'system',
      title: `Notification ${i}`,
      content: `Content ${i}`,
      read: false,
      createdAt: new Date(Date.now() - i * 1000), // Stagger creation times
      ...overrides
    });
    notifications.push(notification);
  }
  
  return notifications;
}

describe('Notification API Property Tests', () => {
  beforeAll(async () => {
    // Connection is handled by global setup
  });

  afterAll(async () => {
    // Cleanup is handled by global teardown
  });

  beforeEach(async () => {
    // Clean up before each test
    await Notification.deleteMany({});
    await User.deleteMany({});
  });

  /**
   * Property 20: Notification chronological ordering
   * **Validates: Requirements 5.2**
   * 
   * Property: Notifications are always returned in reverse chronological order (newest first)
   */
  describe('Property 20: Notification chronological ordering', () => {
    it('should return notifications in reverse chronological order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 20 }),
          async (notificationCount) => {
            // Create test user
            const user = await createTestUser();
            const token = generateAuthToken(user._id);

            // Create notifications with different timestamps
            const notifications = await createNotificationsForUser(user._id, notificationCount);

            // Fetch notifications
            const response = await request(app)
              .get('/api/notifications')
              .set('Authorization', `Bearer ${token}`)
              .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.notifications).toHaveLength(notificationCount);

            // Verify chronological ordering (newest first)
            const returnedNotifications = response.body.data.notifications;
            for (let i = 0; i < returnedNotifications.length - 1; i++) {
              const current = new Date(returnedNotifications[i].createdAt);
              const next = new Date(returnedNotifications[i + 1].createdAt);
              expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
            }

            // Cleanup
            await User.findByIdAndDelete(user._id);
            await Notification.deleteMany({ userId: user._id });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should maintain chronological order across pagination', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 30 }),
          fc.integer({ min: 3, max: 10 }),
          async (totalCount, pageSize) => {
            // Create test user
            const user = await createTestUser();
            const token = generateAuthToken(user._id);

            // Create notifications
            await createNotificationsForUser(user._id, totalCount);

            // Fetch first page
            const page1Response = await request(app)
              .get('/api/notifications')
              .query({ page: 1, limit: pageSize })
              .set('Authorization', `Bearer ${token}`)
              .expect(200);

            // Fetch second page
            const page2Response = await request(app)
              .get('/api/notifications')
              .query({ page: 2, limit: pageSize })
              .set('Authorization', `Bearer ${token}`)
              .expect(200);

            const page1Notifications = page1Response.body.data.notifications;
            const page2Notifications = page2Response.body.data.notifications;

            // Verify ordering within each page
            for (let i = 0; i < page1Notifications.length - 1; i++) {
              const current = new Date(page1Notifications[i].createdAt);
              const next = new Date(page1Notifications[i + 1].createdAt);
              expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
            }

            // Verify ordering across pages (last item of page 1 should be newer than first item of page 2)
            if (page1Notifications.length > 0 && page2Notifications.length > 0) {
              const lastOfPage1 = new Date(page1Notifications[page1Notifications.length - 1].createdAt);
              const firstOfPage2 = new Date(page2Notifications[0].createdAt);
              expect(lastOfPage1.getTime()).toBeGreaterThanOrEqual(firstOfPage2.getTime());
            }

            // Cleanup
            await User.findByIdAndDelete(user._id);
            await Notification.deleteMany({ userId: user._id });
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  /**
   * Property 22: Notification read state update
   * **Validates: Requirements 5.4**
   * 
   * Property: Marking a notification as read updates its state and only affects that specific notification
   */
  describe('Property 22: Notification read state update', () => {
    it('should update only the specified notification read state', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 10 }),
          fc.integer({ min: 0, max: 9 }),
          async (notificationCount, targetIndex) => {
            fc.pre(targetIndex < notificationCount);

            // Create test user
            const user = await createTestUser();
            const token = generateAuthToken(user._id);

            // Create unread notifications
            const notifications = await createNotificationsForUser(user._id, notificationCount, { read: false });

            // Mark one notification as read
            const targetNotification = notifications[targetIndex];
            if (!targetNotification) {
              throw new Error('Target notification not found');
            }

            const response = await request(app)
              .put(`/api/notifications/${targetNotification._id}/read`)
              .set('Authorization', `Bearer ${token}`)
              .expect(200);

            expect(response.body.success).toBe(true);

            // Verify the target notification is marked as read
            const updatedNotification = await Notification.findById(targetNotification._id);
            expect(updatedNotification?.read).toBe(true);

            // Verify other notifications remain unread
            const otherNotifications = await Notification.find({
              userId: user._id,
              _id: { $ne: targetNotification._id }
            });

            expect(otherNotifications.every(n => n.read === false)).toBe(true);

            // Cleanup
            await User.findByIdAndDelete(user._id);
            await Notification.deleteMany({ userId: user._id });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should not allow marking another user\'s notification as read', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Create two test users
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            const token1 = generateAuthToken(user1._id);

            // Create notification for user2
            const notifications = await createNotificationsForUser(user2._id, 1, { read: false });
            const notification = notifications[0];
            if (!notification) {
              throw new Error('Notification not found');
            }

            // Try to mark user2's notification as read using user1's token
            const response = await request(app)
              .put(`/api/notifications/${notification._id}/read`)
              .set('Authorization', `Bearer ${token1}`)
              .expect(403);

            expect(response.body.success).toBe(false);

            // Verify notification remains unread
            const unchangedNotification = await Notification.findById(notification._id);
            expect(unchangedNotification?.read).toBe(false);

            // Cleanup
            await User.findByIdAndDelete(user1._id);
            await User.findByIdAndDelete(user2._id);
            await Notification.deleteMany({ userId: { $in: [user1._id, user2._id] } });
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should be idempotent - marking an already read notification as read should succeed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null),
          async () => {
            // Create test user
            const user = await createTestUser();
            const token = generateAuthToken(user._id);

            // Create a read notification
            const notifications = await createNotificationsForUser(user._id, 1, { read: true });
            const notification = notifications[0];
            if (!notification) {
              throw new Error('Notification not found');
            }

            // Mark it as read again
            const response = await request(app)
              .put(`/api/notifications/${notification._id}/read`)
              .set('Authorization', `Bearer ${token}`)
              .expect(200);

            expect(response.body.success).toBe(true);

            // Verify it's still read
            const updatedNotification = await Notification.findById(notification._id);
            expect(updatedNotification?.read).toBe(true);

            // Cleanup
            await User.findByIdAndDelete(user._id);
            await Notification.deleteMany({ userId: user._id });
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  /**
   * Property 23: Bulk mark as read
   * **Validates: Requirements 5.5**
   * 
   * Property: Marking all notifications as read updates all unread notifications for the user
   */
  describe('Property 23: Bulk mark as read', () => {
    it('should mark all unread notifications as read', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }),
          fc.integer({ min: 0, max: 19 }),
          async (totalCount, unreadCount) => {
            fc.pre(unreadCount <= totalCount);

            // Create test user
            const user = await createTestUser();
            const token = generateAuthToken(user._id);

            // Create mix of read and unread notifications
            const readCount = totalCount - unreadCount;
            await createNotificationsForUser(user._id, unreadCount, { read: false });
            await createNotificationsForUser(user._id, readCount, { read: true });

            // Mark all as read
            const response = await request(app)
              .put('/api/notifications/read-all')
              .set('Authorization', `Bearer ${token}`)
              .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.count).toBe(unreadCount);

            // Verify all notifications are now read
            const allNotifications = await Notification.find({ userId: user._id });
            expect(allNotifications.every(n => n.read === true)).toBe(true);
            expect(allNotifications.length).toBe(totalCount);

            // Cleanup
            await User.findByIdAndDelete(user._id);
            await Notification.deleteMany({ userId: user._id });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should only affect the authenticated user\'s notifications', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 1, max: 10 }),
          async (user1Count, user2Count) => {
            // Create two test users
            const user1 = await createTestUser();
            const user2 = await createTestUser();
            const token1 = generateAuthToken(user1._id);

            // Create unread notifications for both users
            await createNotificationsForUser(user1._id, user1Count, { read: false });
            await createNotificationsForUser(user2._id, user2Count, { read: false });

            // Mark all as read for user1
            const response = await request(app)
              .put('/api/notifications/read-all')
              .set('Authorization', `Bearer ${token1}`)
              .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.count).toBe(user1Count);

            // Verify user1's notifications are read
            const user1Notifications = await Notification.find({ userId: user1._id });
            expect(user1Notifications.every(n => n.read === true)).toBe(true);

            // Verify user2's notifications remain unread
            const user2Notifications = await Notification.find({ userId: user2._id });
            expect(user2Notifications.every(n => n.read === false)).toBe(true);

            // Cleanup
            await User.findByIdAndDelete(user1._id);
            await User.findByIdAndDelete(user2._id);
            await Notification.deleteMany({ userId: { $in: [user1._id, user2._id] } });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should be idempotent - calling read-all multiple times should work', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (notificationCount) => {
            // Create test user
            const user = await createTestUser();
            const token = generateAuthToken(user._id);

            // Create unread notifications
            await createNotificationsForUser(user._id, notificationCount, { read: false });

            // Mark all as read first time
            const response1 = await request(app)
              .put('/api/notifications/read-all')
              .set('Authorization', `Bearer ${token}`)
              .expect(200);

            expect(response1.body.success).toBe(true);
            expect(response1.body.data.count).toBe(notificationCount);

            // Mark all as read second time (should update 0 notifications)
            const response2 = await request(app)
              .put('/api/notifications/read-all')
              .set('Authorization', `Bearer ${token}`)
              .expect(200);

            expect(response2.body.success).toBe(true);
            expect(response2.body.data.count).toBe(0);

            // Verify all notifications are still read
            const allNotifications = await Notification.find({ userId: user._id });
            expect(allNotifications.every(n => n.read === true)).toBe(true);

            // Cleanup
            await User.findByIdAndDelete(user._id);
            await Notification.deleteMany({ userId: user._id });
          }
        ),
        { numRuns: 5 }
      );
    });
  });
});