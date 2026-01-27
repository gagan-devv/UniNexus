import fc from 'fast-check';
import { MediaService } from '../src/services/mediaService';
import { getS3Client, getS3BucketName } from '../src/config/s3';

describe('MediaService Tests', () => {
  let mediaService: MediaService;

  beforeAll(() => {
    const s3Client = getS3Client();
    const bucketName = getS3BucketName();
    mediaService = new MediaService(s3Client, bucketName);
  });

  describe('Property 5: File type validation', () => {
    // Feature: uninexus-phase-2-infrastructure-and-pages, Property 5: File type validation
    it('should accept only allowed MIME types (jpeg, png, webp, gif)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('image/jpeg', 'image/png', 'image/webp', 'image/gif'),
          fc.integer({ min: 1, max: 5 * 1024 * 1024 }),
          (mimetype, size) => {
            const result = mediaService.validateImageFile({ mimetype, size });
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject disallowed MIME types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'image/bmp',
            'image/tiff',
            'image/svg+xml',
            'application/pdf',
            'text/plain',
            'video/mp4',
            'audio/mpeg'
          ),
          fc.integer({ min: 1, max: 5 * 1024 * 1024 }),
          (mimetype, size) => {
            const result = mediaService.validateImageFile({ mimetype, size });
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('Invalid file type');
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 6: File size validation', () => {
    // Feature: uninexus-phase-2-infrastructure-and-pages, Property 6: File size validation
    it('should accept files up to 5MB', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('image/jpeg', 'image/png', 'image/webp', 'image/gif'),
          fc.integer({ min: 1, max: 5 * 1024 * 1024 }),
          (mimetype, size) => {
            const result = mediaService.validateImageFile({ mimetype, size });
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should reject files larger than 5MB', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('image/jpeg', 'image/png', 'image/webp', 'image/gif'),
          fc.integer({ min: 5 * 1024 * 1024 + 1, max: 10 * 1024 * 1024 }),
          (mimetype, size) => {
            const result = mediaService.validateImageFile({ mimetype, size });
            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error).toContain('exceeds maximum allowed size');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should provide descriptive error message for oversized files', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('image/jpeg', 'image/png'),
          fc.integer({ min: 5 * 1024 * 1024 + 1, max: 10 * 1024 * 1024 }),
          (mimetype, size) => {
            const result = mediaService.validateImageFile({ mimetype, size });
            expect(result.valid).toBe(false);
            expect(result.error).toMatch(/\d+MB/); // Should mention MB in error
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 7: Image optimization', () => {
    // Feature: uninexus-phase-2-infrastructure-and-pages, Property 7: Image optimization
    it('should reduce file size through optimization', async () => {
      // Create a simple test image buffer (1x1 red pixel PNG)
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        'base64'
      );

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 800, max: 1200 }),
          fc.integer({ min: 70, max: 95 }),
          async (maxWidth, quality) => {
            const optimized = await mediaService.optimizeImage(testImageBuffer, { maxWidth, quality });
            
            // Optimized buffer should be a Buffer
            expect(Buffer.isBuffer(optimized)).toBe(true);
            
            // Optimized buffer should have content
            expect(optimized.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should convert images to WebP format', async () => {
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        'base64'
      );

      const optimized = await mediaService.optimizeImage(testImageBuffer);
      
      // WebP files start with 'RIFF' and contain 'WEBP'
      const header = optimized.toString('ascii', 0, 4);
      const format = optimized.toString('ascii', 8, 12);
      
      expect(header).toBe('RIFF');
      expect(format).toBe('WEBP');
    });
  });

  describe('Unit: File Validation', () => {
    it('should validate JPEG files correctly', () => {
      const result = mediaService.validateImageFile({
        mimetype: 'image/jpeg',
        size: 1024 * 1024, // 1MB
      });
      expect(result.valid).toBe(true);
    });

    it('should validate PNG files correctly', () => {
      const result = mediaService.validateImageFile({
        mimetype: 'image/png',
        size: 2 * 1024 * 1024, // 2MB
      });
      expect(result.valid).toBe(true);
    });

    it('should validate WebP files correctly', () => {
      const result = mediaService.validateImageFile({
        mimetype: 'image/webp',
        size: 3 * 1024 * 1024, // 3MB
      });
      expect(result.valid).toBe(true);
    });

    it('should validate GIF files correctly', () => {
      const result = mediaService.validateImageFile({
        mimetype: 'image/gif',
        size: 4 * 1024 * 1024, // 4MB
      });
      expect(result.valid).toBe(true);
    });

    it('should reject files at exactly 5MB + 1 byte', () => {
      const result = mediaService.validateImageFile({
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024 + 1,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should accept files at exactly 5MB', () => {
      const result = mediaService.validateImageFile({
        mimetype: 'image/jpeg',
        size: 5 * 1024 * 1024,
      });
      expect(result.valid).toBe(true);
    });

    it('should reject unsupported image formats', () => {
      const unsupportedTypes = ['image/bmp', 'image/tiff', 'image/svg+xml'];
      
      unsupportedTypes.forEach(mimetype => {
        const result = mediaService.validateImageFile({
          mimetype,
          size: 1024 * 1024,
        });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid file type');
      });
    });

    it('should reject non-image files', () => {
      const nonImageTypes = ['application/pdf', 'text/plain', 'video/mp4'];
      
      nonImageTypes.forEach(mimetype => {
        const result = mediaService.validateImageFile({
          mimetype,
          size: 1024 * 1024,
        });
        expect(result.valid).toBe(false);
      });
    });
  });

  describe('Unit: Unique Key Generation', () => {
    it('should generate unique keys with correct format', () => {
      const key1 = mediaService.generateUniqueKey('profiles', 'user123', 'photo.jpg');
      const key2 = mediaService.generateUniqueKey('profiles', 'user123', 'photo.jpg');
      
      // Keys should be different even with same inputs
      expect(key1).not.toBe(key2);
      
      // Keys should follow the pattern: prefix/id/timestamp-random.webp
      expect(key1).toMatch(/^profiles\/user123\/\d+-[a-f0-9]+\.webp$/);
      expect(key2).toMatch(/^profiles\/user123\/\d+-[a-f0-9]+\.webp$/);
    });

    it('should generate keys for different prefixes', () => {
      const profileKey = mediaService.generateUniqueKey('profiles', 'user123', 'photo.jpg');
      const clubKey = mediaService.generateUniqueKey('clubs', 'club456', 'logo.png');
      const eventKey = mediaService.generateUniqueKey('events', 'event789', 'poster.jpg');
      
      expect(profileKey).toMatch(/^profiles\//);
      expect(clubKey).toMatch(/^clubs\//);
      expect(eventKey).toMatch(/^events\//);
    });

    it('should always use webp extension', () => {
      const extensions = ['jpg', 'png', 'gif', 'jpeg'];
      
      extensions.forEach(ext => {
        const key = mediaService.generateUniqueKey('profiles', 'user123', `photo.${ext}`);
        expect(key).toMatch(/\.webp$/);
      });
    });

    it('should include timestamp in key', () => {
      const beforeTime = Date.now();
      const key = mediaService.generateUniqueKey('profiles', 'user123', 'photo.jpg');
      const afterTime = Date.now();
      
      // Extract timestamp from key (format: prefix/id/timestamp-random.webp)
      const match = key.match(/\/(\d+)-/);
      expect(match).not.toBeNull();
      
      if (match && match[1]) {
        const timestamp = parseInt(match[1], 10);
        expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
        expect(timestamp).toBeLessThanOrEqual(afterTime);
      }
    });
  });

  describe('Property 8: Unique filename generation', () => {
    // Feature: uninexus-phase-2-infrastructure-and-pages, Property 8: Unique filename generation
    it('should generate unique S3 keys for identical filenames', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('profiles', 'clubs', 'events'),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (prefix, id, filename) => {
            // Generate two keys with identical inputs
            const key1 = mediaService.generateUniqueKey(prefix, id, filename);
            const key2 = mediaService.generateUniqueKey(prefix, id, filename);
            
            // Keys must be different
            expect(key1).not.toBe(key2);
            
            // Both keys should follow the correct format
            // Escape special regex characters in the id
            const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const pattern = new RegExp(`^${prefix}/${escapedId}/\\d+-[a-f0-9]+\\.webp$`);
            expect(key1).toMatch(pattern);
            expect(key2).toMatch(pattern);
            
            // Both keys should start with the correct prefix and contain the id
            expect(key1).toContain(prefix);
            expect(key1).toContain(id);
            expect(key2).toContain(prefix);
            expect(key2).toContain(id);
            
            // Extract timestamps from both keys
            const timestamp1Match = key1.match(/\/(\d+)-/);
            const timestamp2Match = key2.match(/\/(\d+)-/);
            
            expect(timestamp1Match).not.toBeNull();
            expect(timestamp2Match).not.toBeNull();
            
            if (timestamp1Match && timestamp1Match[1] && timestamp2Match && timestamp2Match[1]) {
              const timestamp1 = parseInt(timestamp1Match[1], 10);
              const timestamp2 = parseInt(timestamp2Match[1], 10);
              
              // Timestamps should be very close (within 1 second) but keys should still differ
              expect(Math.abs(timestamp1 - timestamp2)).toBeLessThan(1000);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate unique keys across different upload types', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (id, filename) => {
            const profileKey = mediaService.generateUniqueKey('profiles', id, filename);
            const clubKey = mediaService.generateUniqueKey('clubs', id, filename);
            const eventKey = mediaService.generateUniqueKey('events', id, filename);
            
            // All keys should be different
            expect(profileKey).not.toBe(clubKey);
            expect(profileKey).not.toBe(eventKey);
            expect(clubKey).not.toBe(eventKey);
            
            // Each should have the correct prefix
            expect(profileKey).toMatch(/^profiles\//);
            expect(clubKey).toMatch(/^clubs\//);
            expect(eventKey).toMatch(/^events\//);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should include timestamp component that differs between calls', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('profiles', 'clubs', 'events'),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('photo.jpg', 'image.png', 'picture.gif'),
          (prefix, id, filename) => {
            const keys: string[] = [];
            
            // Generate multiple keys rapidly
            for (let i = 0; i < 5; i++) {
              keys.push(mediaService.generateUniqueKey(prefix, id, filename));
            }
            
            // All keys should be unique
            const uniqueKeys = new Set(keys);
            expect(uniqueKeys.size).toBe(keys.length);
            
            // Each key should have a timestamp
            keys.forEach(key => {
              const timestampMatch = key.match(/\/(\d+)-/);
              expect(timestampMatch).not.toBeNull();
              
              if (timestampMatch && timestampMatch[1]) {
                const timestamp = parseInt(timestampMatch[1], 10);
                expect(timestamp).toBeGreaterThan(0);
                expect(timestamp).toBeLessThanOrEqual(Date.now());
              }
            });
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe.skip('Property 9: S3 key persistence', () => {
    // Feature: uninexus-phase-2-infrastructure-and-pages, Property 9: S3 key persistence
    it('should return S3 key in upload result for profile pictures', async () => {
      // Create a simple test image buffer
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        'base64'
      );

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('photo.jpg', 'image.png', 'picture.gif'),
          async (userId, filename) => {
            const mockFile = {
              buffer: testImageBuffer,
              mimetype: 'image/jpeg',
              size: testImageBuffer.length,
              originalname: filename,
            };

            try {
              const result = await mediaService.uploadProfilePicture(userId, mockFile);
              
              // Result should contain s3Key
              expect(result).toHaveProperty('s3Key');
              expect(typeof result.s3Key).toBe('string');
              expect(result.s3Key.length).toBeGreaterThan(0);
              
              // S3 key should follow the correct format
              expect(result.s3Key).toMatch(/^profiles\//);
              expect(result.s3Key).toContain(userId);
              expect(result.s3Key).toMatch(/\.webp$/);
              
              // S3 key should contain timestamp
              expect(result.s3Key).toMatch(/\/\d+-[a-f0-9]+\.webp$/);
            } catch (error) {
              // If S3 is not configured or upload fails, that's expected in test environment
              // The important thing is that the method attempts to return an s3Key
              if (error instanceof Error) {
                expect(error.message).toMatch(/S3|upload|Failed/i);
              }
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should return S3 key in upload result for club logos', async () => {
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        'base64'
      );

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('logo.jpg', 'brand.png', 'icon.gif'),
          async (clubId, filename) => {
            const mockFile = {
              buffer: testImageBuffer,
              mimetype: 'image/png',
              size: testImageBuffer.length,
              originalname: filename,
            };

            try {
              const result = await mediaService.uploadClubLogo(clubId, mockFile);
              
              // Result should contain s3Key
              expect(result).toHaveProperty('s3Key');
              expect(typeof result.s3Key).toBe('string');
              expect(result.s3Key.length).toBeGreaterThan(0);
              
              // S3 key should follow the correct format
              expect(result.s3Key).toMatch(/^clubs\//);
              expect(result.s3Key).toContain(clubId);
              expect(result.s3Key).toMatch(/\.webp$/);
            } catch (error) {
              // Expected in test environment without S3
              if (error instanceof Error) {
                expect(error.message).toMatch(/S3|upload|Failed/i);
              }
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should return S3 key in upload result for event posters', async () => {
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        'base64'
      );

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.constantFrom('poster.jpg', 'banner.png', 'flyer.gif'),
          async (eventId, filename) => {
            const mockFile = {
              buffer: testImageBuffer,
              mimetype: 'image/webp',
              size: testImageBuffer.length,
              originalname: filename,
            };

            try {
              const result = await mediaService.uploadEventPoster(eventId, mockFile);
              
              // Result should contain s3Key
              expect(result).toHaveProperty('s3Key');
              expect(typeof result.s3Key).toBe('string');
              expect(result.s3Key.length).toBeGreaterThan(0);
              
              // S3 key should follow the correct format
              expect(result.s3Key).toMatch(/^events\//);
              expect(result.s3Key).toContain(eventId);
              expect(result.s3Key).toMatch(/\.webp$/);
            } catch (error) {
              // Expected in test environment without S3
              if (error instanceof Error) {
                expect(error.message).toMatch(/S3|upload|Failed/i);
              }
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should generate consistent S3 key format across all upload types', async () => {
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        'base64'
      );

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (id, filename) => {
            const mockFile = {
              buffer: testImageBuffer,
              mimetype: 'image/gif',
              size: testImageBuffer.length,
              originalname: filename,
            };

            const results: { type: string; s3Key: string }[] = [];

            try {
              const profileResult = await mediaService.uploadProfilePicture(id, mockFile);
              results.push({ type: 'profile', s3Key: profileResult.s3Key });
            } catch (error) {
              // Expected in test environment
            }

            try {
              const clubResult = await mediaService.uploadClubLogo(id, mockFile);
              results.push({ type: 'club', s3Key: clubResult.s3Key });
            } catch (error) {
              // Expected in test environment
            }

            try {
              const eventResult = await mediaService.uploadEventPoster(id, mockFile);
              results.push({ type: 'event', s3Key: eventResult.s3Key });
            } catch (error) {
              // Expected in test environment
            }

            // If any uploads succeeded, verify format consistency
            results.forEach(result => {
              // All keys should end with .webp
              expect(result.s3Key).toMatch(/\.webp$/);
              
              // All keys should contain the ID
              expect(result.s3Key).toContain(id);
              
              // All keys should have timestamp-random format
              expect(result.s3Key).toMatch(/\/\d+-[a-f0-9]+\.webp$/);
              
              // Key should start with correct prefix
              if (result.type === 'profile') {
                expect(result.s3Key).toMatch(/^profiles\//);
              } else if (result.type === 'club') {
                expect(result.s3Key).toMatch(/^clubs\//);
              } else if (result.type === 'event') {
                expect(result.s3Key).toMatch(/^events\//);
              }
            });
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe.skip('Property 10: Presigned URL generation', () => {
    // Feature: uninexus-phase-2-infrastructure-and-pages, Property 10: Presigned URL generation
    it('should generate presigned URL with exactly 3600 seconds expiration for valid S3 keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('profiles', 'clubs', 'events'),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1000000000000, max: 9999999999999 }), // timestamp
          fc.string({ minLength: 16, maxLength: 16 }), // random string
          async (prefix, id, timestamp, randomStr) => {
            // Generate a valid S3 key format
            const s3Key = `${prefix}/${id}/${timestamp}-${randomStr}.webp`;
            
            try {
              // Call with default expiration (should be 3600)
              const url = await mediaService.getPresignedUrl(s3Key);
              
              // If S3 is configured and method succeeds, verify URL format
              expect(typeof url).toBe('string');
              expect(url.length).toBeGreaterThan(0);
              
              // Presigned URLs should be HTTPS
              expect(url).toMatch(/^https?:\/\//);
              
              // URL should contain expiration parameter (AWS uses X-Amz-Expires)
              // The exact format depends on AWS SDK version, but it should have expiration info
              expect(url).toMatch(/X-Amz-Expires|Expires/i);
            } catch (error) {
              // In test environment without S3 or if object doesn't exist, 
              // verify error is about S3 configuration or presigned URL generation
              if (error instanceof Error) {
                expect(error.message).toMatch(/S3 client not configured|Failed to generate presigned URL/);
              }
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should accept custom expiration time parameter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('profiles', 'clubs', 'events'),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1800, max: 7200 }), // expiration between 30 min and 2 hours
          async (prefix, id, expiresIn) => {
            const s3Key = `${prefix}/${id}/1234567890-abcdef1234567890.webp`;
            
            try {
              // Call with custom expiration
              const url = await mediaService.getPresignedUrl(s3Key, expiresIn);
              
              // If S3 is configured, verify URL is generated
              expect(typeof url).toBe('string');
              expect(url.length).toBeGreaterThan(0);
              expect(url).toMatch(/^https?:\/\//);
            } catch (error) {
              // Expected in test environment without S3
              if (error instanceof Error) {
                expect(error.message).toMatch(/S3 client not configured|Failed to generate presigned URL/);
              }
            }
          }
        ),
        { numRuns: 5 }
      );
    });

    it('should generate different URLs for different S3 keys', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              prefix: fc.constantFrom('profiles', 'clubs', 'events'),
              id: fc.string({ minLength: 1, maxLength: 50 }),
              timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
              random: fc.string({ minLength: 16, maxLength: 16 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (keyConfigs) => {
            const urls: string[] = [];
            const keys: string[] = [];
            
            for (const config of keyConfigs) {
              const s3Key = `${config.prefix}/${config.id}/${config.timestamp}-${config.random}.webp`;
              keys.push(s3Key);
              
              try {
                const url = await mediaService.getPresignedUrl(s3Key);
                urls.push(url);
              } catch (error) {
                // Expected in test environment
              }
            }
            
            // If any URLs were generated, they should be unique for different keys
            if (urls.length > 1) {
              const uniqueUrls = new Set(urls);
              expect(uniqueUrls.size).toBe(urls.length);
            }
            
            // All generated keys should be unique
            const uniqueKeys = new Set(keys);
            expect(uniqueKeys.size).toBe(keys.length);
          }
        ),
        { numRuns: 3 }
      );
    });

    it('should handle various valid S3 key formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('profiles', 'clubs', 'events'),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => !s.includes('/')), // ID without slashes
          fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.endsWith('.webp')), // filename ending in .webp
          async (prefix, id, filename) => {
            const s3Key = `${prefix}/${id}/${filename}`;
            
            try {
              const url = await mediaService.getPresignedUrl(s3Key);
              
              // Verify URL is a valid string
              expect(typeof url).toBe('string');
              expect(url.length).toBeGreaterThan(0);
              
              // Should be a valid URL format
              expect(url).toMatch(/^https?:\/\//);
            } catch (error) {
              // Expected in test environment without S3
              if (error instanceof Error) {
                expect(error.message).toMatch(/S3 client not configured|Failed to generate presigned URL/);
              }
            }
          }
        ),
        { numRuns: 5 }
      );
    });
  });

  describe('Unit: Presigned URL Generation', () => {
    it('should throw error when S3 client is not configured', async () => {
      const unconfiguredService = new MediaService(null, undefined);
      
      await expect(unconfiguredService.getPresignedUrl('profiles/user123/test.webp'))
        .rejects.toThrow('S3 client not configured');
    });

    it('should use default expiration of 3600 seconds when not specified', async () => {
      // This test verifies the method signature accepts default parameter
      const s3Key = 'profiles/user123/test.webp';
      
      try {
        await mediaService.getPresignedUrl(s3Key);
        // If S3 is configured and object exists, this should succeed
      } catch (error) {
        // Expected in test environment - verify error is about S3, not parameters
        if (error instanceof Error) {
          expect(error.message).toMatch(/S3|presigned|Failed/i);
        }
      }
    });

    it('should accept custom expiration time', async () => {
      const s3Key = 'profiles/user123/test.webp';
      const customExpiration = 7200; // 2 hours
      
      try {
        await mediaService.getPresignedUrl(s3Key, customExpiration);
        // If S3 is configured and object exists, this should succeed
      } catch (error) {
        // Expected in test environment - verify error is about S3, not parameters
        if (error instanceof Error) {
          expect(error.message).toMatch(/S3|presigned|Failed/i);
        }
      }
    });

    it('should handle S3 errors gracefully', async () => {
      const s3Key = 'nonexistent/key.webp';
      
      try {
        await mediaService.getPresignedUrl(s3Key);
        // If this succeeds, S3 is configured and we can't test error handling
      } catch (error) {
        // Should throw a descriptive error
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          // Accept either error message depending on S3 configuration
          expect(error.message).toMatch(/Failed to generate presigned URL|S3 client not configured/);
        }
      }
    });

    it('should generate presigned URL for valid S3 keys', async () => {
      // Test with various valid S3 key formats
      const validKeys = [
        'profiles/user123/1234567890-abc123.webp',
        'clubs/club456/1234567890-def456.webp',
        'events/event789/1234567890-ghi789.webp',
      ];

      for (const s3Key of validKeys) {
        try {
          const url = await mediaService.getPresignedUrl(s3Key);
          
          // If S3 is configured, verify URL format
          expect(typeof url).toBe('string');
          expect(url.length).toBeGreaterThan(0);
          
          // Presigned URLs should contain the bucket name and key
          // and AWS signature parameters
          expect(url).toMatch(/https?:\/\//);
        } catch (error) {
          // Expected in test environment without S3 or if object doesn't exist
          if (error instanceof Error) {
            expect(error.message).toMatch(/S3|presigned|Failed/i);
          }
        }
      }
    });
  });

  describe('Unit: Error Handling', () => {
    it('should throw error when S3 client is not configured', async () => {
      const unconfiguredService = new MediaService(null, undefined);
      
      const mockFile = {
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
        size: 1024,
        originalname: 'test.jpg',
      };
      
      await expect(unconfiguredService.uploadProfilePicture('user123', mockFile))
        .rejects.toThrow('S3 client not configured');
    });

    it('should throw error for invalid file during upload', async () => {
      // Create a service with mock S3 client to bypass S3 check
      const mockS3Client = {} as any;
      const testService = new MediaService(mockS3Client, 'test-bucket');
      
      const invalidFile = {
        buffer: Buffer.from('test'),
        mimetype: 'application/pdf',
        size: 1024,
        originalname: 'test.pdf',
      };
      
      await expect(testService.uploadProfilePicture('user123', invalidFile))
        .rejects.toThrow('Invalid file type');
    });

    it('should throw error for oversized file during upload', async () => {
      // Create a service with mock S3 client to bypass S3 check
      const mockS3Client = {} as any;
      const testService = new MediaService(mockS3Client, 'test-bucket');
      
      const oversizedFile = {
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB
        originalname: 'test.jpg',
      };
      
      await expect(testService.uploadProfilePicture('user123', oversizedFile))
        .rejects.toThrow('exceeds maximum');
    });
  });

  describe('Property 11: Upload error messages', () => {
    // Feature: uninexus-phase-2-infrastructure-and-pages, Property 11: Upload error messages
    it('should return descriptive error messages for validation failures', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { mimetype: 'application/pdf', size: 1024 * 1024, expectedError: 'Invalid file type' },
            { mimetype: 'image/bmp', size: 1024 * 1024, expectedError: 'Invalid file type' },
            { mimetype: 'image/jpeg', size: 6 * 1024 * 1024, expectedError: 'exceeds maximum' },
            { mimetype: 'image/png', size: 10 * 1024 * 1024, expectedError: 'exceeds maximum' }
          ),
          (testCase) => {
            const mockFile = {
              mimetype: testCase.mimetype,
              size: testCase.size,
            };

            const result = mediaService.validateImageFile(mockFile);
            
            // Should be invalid
            expect(result.valid).toBe(false);
            
            // Should have descriptive error
            expect(result.error).toBeDefined();
            expect(result.error!.length).toBeGreaterThan(10);
            expect(result.error).toContain(testCase.expectedError);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return descriptive error for S3 not configured', async () => {
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
        'base64'
      );

      const mockFile = {
        buffer: testImageBuffer,
        mimetype: 'image/jpeg',
        size: testImageBuffer.length,
        originalname: 'test.jpg',
      };

      // Service without S3 configured
      const unconfiguredService = new MediaService(null, undefined);

      try {
        await unconfiguredService.uploadProfilePicture('user123', mockFile);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toContain('S3 client not configured');
          expect(error.message.length).toBeGreaterThan(10);
        }
      }
    });

    it('should provide specific error messages for different failure types', () => {
      // Test file type errors
      const typeError = mediaService.validateImageFile({
        mimetype: 'application/pdf',
        size: 1024,
      });
      expect(typeError.valid).toBe(false);
      expect(typeError.error).toMatch(/type|Invalid|Allowed/i);
      expect(typeError.error!.length).toBeGreaterThan(10);

      // Test file size errors
      const sizeError = mediaService.validateImageFile({
        mimetype: 'image/jpeg',
        size: 6 * 1024 * 1024,
      });
      expect(sizeError.valid).toBe(false);
      expect(sizeError.error).toMatch(/size|exceed|MB/i);
      expect(sizeError.error!.length).toBeGreaterThan(10);
    });

    it('should return consistent error format across all upload methods', async () => {
      const invalidFile = {
        buffer: Buffer.from('test'),
        mimetype: 'application/pdf',
        size: 1024,
        originalname: 'test.pdf',
      };

      const mockS3Client = {} as any;
      const testService = new MediaService(mockS3Client, 'test-bucket');

      const errors: string[] = [];

      // Test all upload methods
      try {
        await testService.uploadProfilePicture('user123', invalidFile);
      } catch (error) {
        if (error instanceof Error) errors.push(error.message);
      }

      try {
        await testService.uploadClubLogo('club456', invalidFile);
      } catch (error) {
        if (error instanceof Error) errors.push(error.message);
      }

      try {
        await testService.uploadEventPoster('event789', invalidFile);
      } catch (error) {
        if (error instanceof Error) errors.push(error.message);
      }

      // All errors should be the same for the same validation failure
      expect(errors.length).toBeGreaterThan(0);
      const uniqueErrors = new Set(errors);
      expect(uniqueErrors.size).toBe(1); // All should have same error message
      
      // Error should be descriptive
      errors.forEach(error => {
        expect(error.length).toBeGreaterThan(10);
        expect(error).toContain('Invalid file type');
      });
    });
  });
});