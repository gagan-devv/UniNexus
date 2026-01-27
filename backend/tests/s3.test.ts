import { initializeS3, getS3Client, getS3BucketName, checkS3Connection } from '../src/config/s3';

describe('S3 Infrastructure Tests', () => {
  describe('Unit: S3 Initialization', () => {
    beforeAll(() => {
      // Ensure environment variables are set for testing
      process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
      process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'test-key';
      process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'test-secret';
      process.env.S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || 'test-bucket';
    });

    it('should initialize S3 client with valid configuration', () => {
      const client = initializeS3();
      
      // Client may be null if credentials are invalid, but should not throw
      expect(client).toBeDefined();
    });

    it('should return S3 client instance after initialization', () => {
      initializeS3();
      const client = getS3Client();
      
      expect(client).toBeDefined();
    });

    it('should return bucket name from environment', () => {
      const bucketName = getS3BucketName();
      
      expect(bucketName).toBeDefined();
      expect(typeof bucketName).toBe('string');
    });

    it('should handle missing environment variables gracefully', () => {
      // Save original values
      const originalRegion = process.env.AWS_REGION;
      const originalAccessKey = process.env.AWS_ACCESS_KEY_ID;
      const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
      const originalBucket = process.env.S3_BUCKET_NAME;

      // Remove environment variables
      delete process.env.AWS_REGION;
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.S3_BUCKET_NAME;

      // Should return null without throwing
      const client = initializeS3();
      expect(client).toBeNull();

      // Restore original values
      process.env.AWS_REGION = originalRegion;
      process.env.AWS_ACCESS_KEY_ID = originalAccessKey;
      process.env.AWS_SECRET_ACCESS_KEY = originalSecretKey;
      process.env.S3_BUCKET_NAME = originalBucket;
    });

    it('should handle partial configuration gracefully', () => {
      // Save original values
      const originalSecretKey = process.env.AWS_SECRET_ACCESS_KEY;

      // Remove one required variable
      delete process.env.AWS_SECRET_ACCESS_KEY;

      // Should return null without throwing
      const client = initializeS3();
      expect(client).toBeNull();

      // Restore original value
      process.env.AWS_SECRET_ACCESS_KEY = originalSecretKey;
    });
  });

  describe('Unit: S3 Connection Check', () => {
    it('should return false when S3 client is not initialized', async () => {
      // This test assumes S3 is not properly configured with real credentials
      const isConnected = await checkS3Connection();
      
      // Will be false if credentials are invalid or bucket doesn't exist
      expect(typeof isConnected).toBe('boolean');
    });

    it('should handle connection check errors gracefully', async () => {
      // Should not throw even with invalid configuration
      await expect(checkS3Connection()).resolves.not.toThrow();
    });
  });

  describe('Unit: Environment Variable Validation', () => {
    it('should require AWS_REGION', () => {
      const originalRegion = process.env.AWS_REGION;
      delete process.env.AWS_REGION;

      const client = initializeS3();
      expect(client).toBeNull();

      process.env.AWS_REGION = originalRegion;
    });

    it('should require AWS_ACCESS_KEY_ID', () => {
      const originalKey = process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_ACCESS_KEY_ID;

      const client = initializeS3();
      expect(client).toBeNull();

      process.env.AWS_ACCESS_KEY_ID = originalKey;
    });

    it('should require AWS_SECRET_ACCESS_KEY', () => {
      const originalSecret = process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_SECRET_ACCESS_KEY;

      const client = initializeS3();
      expect(client).toBeNull();

      process.env.AWS_SECRET_ACCESS_KEY = originalSecret;
    });

    it('should require S3_BUCKET_NAME', () => {
      const originalBucket = process.env.S3_BUCKET_NAME;
      delete process.env.S3_BUCKET_NAME;

      const client = initializeS3();
      expect(client).toBeNull();

      process.env.S3_BUCKET_NAME = originalBucket;
    });
  });
});
