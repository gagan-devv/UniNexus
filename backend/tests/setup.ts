import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Global test configuration
jest.setTimeout(30000);

// MongoDB Memory Server instance
let mongoServer: MongoMemoryServer;

// Setup before all tests
beforeAll(async () => {
  // Start MongoDB Memory Server
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
  await mongoose.connect(mongoUri);
});

// Cleanup after each test
afterEach(async () => {
  // Clear all collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    if (collection) {
      await collection.deleteMany({});
    }
  }
});

// Cleanup after all tests
afterAll(async () => {
  // Close database connection
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  
  // Stop MongoDB Memory Server
  await mongoServer.stop();
});

// Global test utilities
global.testUtils = {
  // Helper to create test data
  createTestUser: () => ({
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPass123!',
    role: 'student' as const
  }),
  
  createTestClub: () => ({
    name: 'Test Club',
    description: 'A test club for testing purposes',
    email: 'club@test.com',
    socialLinks: {
      instagram: 'https://instagram.com/testclub',
      website: 'https://testclub.com'
    }
  }),
  
  createTestEvent: () => ({
    title: 'Test Event',
    description: 'A test event for testing purposes',
    location: 'Test Location',
    category: 'Tech' as const,
    startTime: new Date(Date.now() + 86400000), // Tomorrow
    endTime: new Date(Date.now() + 90000000), // Day after tomorrow
    isPublic: true,
    tags: ['test', 'event']
  })
};

// Extend global namespace for TypeScript
declare global {
  var testUtils: {
    createTestUser: () => any;
    createTestClub: () => any;
    createTestEvent: () => any;
  };
}