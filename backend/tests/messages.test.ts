import * as fc from 'fast-check';
import request from 'supertest';
import express, { Application } from 'express';
import mongoose from 'mongoose';
import { Conversation, IConversation } from '../src/models/Conversation';
import { Message, IMessage } from '../src/models/Message';
import { User, IUser } from '../src/models/User';
import messageRoutes from '../src/routes/messageRoutes';
import { AuthService } from '../src/services/authService';

const app: Application = express();
app.use(express.json());
app.use('/api/messages', messageRoutes);

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

// Helper to create a conversation
async function createTestConversation(
  participants: mongoose.Types.ObjectId[]
): Promise<IConversation> {
  const conversation = await Conversation.create({
    participants,
    lastMessageAt: new Date()
  });
  return conversation;
}

// Helper to create messages
async function createTestMessages(
  conversationId: mongoose.Types.ObjectId,
  senderId: mongoose.Types.ObjectId,
  count: number
): Promise<IMessage[]> {
  const messages: IMessage[] = [];
  
  for (let i = 0; i < count; i++) {
    const message = await Message.create({
      conversationId,
      senderId,
      content: `Test message ${i}`,
      timestamp: new Date(Date.now() + i * 1000) // Stagger timestamps
    });
    messages.push(message);
  }
  
  return messages;
}

describe('Message API Tests', () => {
  beforeEach(async () => {
    // Clean up before each test
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await User.deleteMany({});
  });

  describe('GET /api/messages/conversations - List conversations', () => {
    it('should return conversations for authenticated user', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const token = generateAuthToken(user1._id);

      // Create conversation
      const conversation = await createTestConversation([user1._id, user2._id]);
      await createTestMessages(conversation._id, user1._id, 1);

      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].participants).toHaveLength(2);
      expect(response.body.data[0].lastMessage).toBeDefined();

      // Cleanup
      await User.deleteMany({ _id: { $in: [user1._id, user2._id] } });
      await Conversation.findByIdAndDelete(conversation._id);
    });

    it('should sort conversations by lastMessageAt desc', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();
      const token = generateAuthToken(user1._id);

      // Create conversations with different lastMessageAt
      const conv1 = await Conversation.create({
        participants: [user1._id, user2._id],
        lastMessageAt: new Date(Date.now() - 2000)
      });

      const conv2 = await Conversation.create({
        participants: [user1._id, user3._id],
        lastMessageAt: new Date(Date.now() - 1000)
      });

      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      
      // Verify sorting (newest first)
      const timestamps = response.body.data.map((c: any) => new Date(c.lastMessageAt).getTime());
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }

      // Cleanup
      await User.deleteMany({ _id: { $in: [user1._id, user2._id, user3._id] } });
      await Conversation.deleteMany({ _id: { $in: [conv1._id, conv2._id] } });
    });
  });

  describe('GET /api/messages/conversations/:id - Get conversation messages', () => {
    it('should return messages for a conversation', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const token = generateAuthToken(user1._id);

      const conversation = await createTestConversation([user1._id, user2._id]);
      await createTestMessages(conversation._id, user1._id, 3);

      const response = await request(app)
        .get(`/api/messages/conversations/${conversation._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);

      // Cleanup
      await User.deleteMany({ _id: { $in: [user1._id, user2._id] } });
      await Conversation.findByIdAndDelete(conversation._id);
    });

    it('should return 403 if user is not a participant', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();
      const token = generateAuthToken(user3._id);

      const conversation = await createTestConversation([user1._id, user2._id]);

      const response = await request(app)
        .get(`/api/messages/conversations/${conversation._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.success).toBe(false);

      // Cleanup
      await User.deleteMany({ _id: { $in: [user1._id, user2._id, user3._id] } });
      await Conversation.findByIdAndDelete(conversation._id);
    });

    it('should sort messages by timestamp asc', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const token = generateAuthToken(user1._id);

      const conversation = await createTestConversation([user1._id, user2._id]);
      await createTestMessages(conversation._id, user1._id, 5);

      const response = await request(app)
        .get(`/api/messages/conversations/${conversation._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify sorting (oldest first)
      const timestamps = response.body.data.map((m: any) => new Date(m.timestamp).getTime());
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i + 1]);
      }

      // Cleanup
      await User.deleteMany({ _id: { $in: [user1._id, user2._id] } });
      await Conversation.findByIdAndDelete(conversation._id);
    });
  });

  describe('POST /api/messages - Send message', () => {
    it('should create a message and update conversation lastMessageAt', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const token = generateAuthToken(user1._id);

      const conversation = await createTestConversation([user1._id, user2._id]);
      const oldLastMessageAt = conversation.lastMessageAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          conversationId: conversation._id,
          content: 'Test message'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Test message');
      expect(response.body.data.senderId._id).toBe(user1._id.toString());

      // Verify conversation lastMessageAt was updated
      const updatedConversation = await Conversation.findById(conversation._id);
      expect(updatedConversation!.lastMessageAt.getTime()).toBeGreaterThan(oldLastMessageAt.getTime());

      // Cleanup
      await User.deleteMany({ _id: { $in: [user1._id, user2._id] } });
      await Conversation.findByIdAndDelete(conversation._id);
    });

    it('should return 403 if user is not a participant', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const user3 = await createTestUser();
      const token = generateAuthToken(user3._id);

      const conversation = await createTestConversation([user1._id, user2._id]);

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          conversationId: conversation._id,
          content: 'Test message'
        })
        .expect(403);

      expect(response.body.success).toBe(false);

      // Cleanup
      await User.deleteMany({ _id: { $in: [user1._id, user2._id, user3._id] } });
      await Conversation.findByIdAndDelete(conversation._id);
    });
  });

  describe('POST /api/messages/conversations - Create conversation', () => {
    it('should create a new conversation', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const token = generateAuthToken(user1._id);

      const response = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          participantIds: [user2._id.toString()]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.participants).toHaveLength(2);

      // Cleanup
      await User.deleteMany({ _id: { $in: [user1._id, user2._id] } });
      await Conversation.findByIdAndDelete(response.body.data._id);
    });

    it('should prevent duplicate conversations', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const token = generateAuthToken(user1._id);

      // Create first conversation
      const conv1 = await createTestConversation([user1._id, user2._id]);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          participantIds: [user2._id.toString()]
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(conv1._id.toString());

      // Cleanup
      await User.deleteMany({ _id: { $in: [user1._id, user2._id] } });
      await Conversation.findByIdAndDelete(conv1._id);
    });

    it('should include authenticated user as participant', async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const token = generateAuthToken(user1._id);

      const response = await request(app)
        .post('/api/messages/conversations')
        .set('Authorization', `Bearer ${token}`)
        .send({
          participantIds: [user2._id.toString()]
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      const participantIds = response.body.data.participants.map((p: any) => p._id);
      expect(participantIds).toContain(user1._id.toString());
      expect(participantIds).toContain(user2._id.toString());

      // Cleanup
      await User.deleteMany({ _id: { $in: [user1._id, user2._id] } });
      await Conversation.findByIdAndDelete(response.body.data._id);
    });
  });
});
