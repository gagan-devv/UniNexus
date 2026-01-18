import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function globalSetup() {
  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.BCRYPT_SALT_ROUNDS = '10';
  
  // Disable console.log during tests (optional)
  if (process.env.SILENT_TESTS === 'true') {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
  
  console.log('🧪 Global test setup completed');
}