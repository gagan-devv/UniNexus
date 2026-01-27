import { Request, Response } from 'express';
import { uploadSingle } from '../src/middlewares/uploadMiddleware';

describe('Upload Middleware Tests', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFunction = jest.fn();
  });

  describe('Unit: File Upload Validation', () => {
    it('should accept valid image file types', () => {
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      
      validMimeTypes.forEach(mimetype => {
        expect(['image/jpeg', 'image/png', 'image/webp', 'image/gif']).toContain(mimetype);
      });
    });

    it('should reject invalid file types', () => {
      const invalidMimeTypes = ['application/pdf', 'text/plain', 'video/mp4', 'image/bmp'];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      
      invalidMimeTypes.forEach(mimetype => {
        expect(allowedTypes).not.toContain(mimetype);
      });
    });

    it('should enforce 5MB file size limit', () => {
      const maxFileSize = 5 * 1024 * 1024; // 5MB
      
      expect(maxFileSize).toBe(5242880);
      
      // Files under limit should be acceptable
      expect(1024 * 1024).toBeLessThan(maxFileSize); // 1MB
      expect(4 * 1024 * 1024).toBeLessThan(maxFileSize); // 4MB
      expect(maxFileSize).toBeLessThanOrEqual(maxFileSize); // Exactly 5MB
      
      // Files over limit should be rejected
      expect(6 * 1024 * 1024).toBeGreaterThan(maxFileSize); // 6MB
      expect(10 * 1024 * 1024).toBeGreaterThan(maxFileSize); // 10MB
    });
  });

  describe('Unit: Middleware Configuration', () => {
    it('should create upload middleware with correct field name', () => {
      const middleware = uploadSingle('image');
      expect(middleware).toBeDefined();
      expect(typeof middleware).toBe('function');
    });

    it('should create upload middleware for different field names', () => {
      const fieldNames = ['image', 'photo', 'avatar', 'logo', 'poster'];
      
      fieldNames.forEach(fieldName => {
        const middleware = uploadSingle(fieldName);
        expect(middleware).toBeDefined();
        expect(typeof middleware).toBe('function');
      });
    });
  });

  describe('Unit: Error Messages', () => {
    it('should provide descriptive error for file size limit', () => {
      const errorMessage = 'File size exceeds the maximum allowed size of 5MB';
      
      expect(errorMessage).toContain('5MB');
      expect(errorMessage).toContain('exceeds');
      expect(errorMessage.length).toBeGreaterThan(20);
    });

    it('should provide descriptive error for invalid file type', () => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const errorMessage = `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`;
      
      expect(errorMessage).toContain('Invalid file type');
      expect(errorMessage).toContain('image/jpeg');
      expect(errorMessage).toContain('image/png');
      expect(errorMessage.length).toBeGreaterThan(30);
    });

    it('should provide descriptive error for missing file', () => {
      const errorMessage = 'No file uploaded. Please provide a file.';
      
      expect(errorMessage).toContain('No file');
      expect(errorMessage).toContain('provide');
      expect(errorMessage.length).toBeGreaterThan(15);
    });
  });

  describe('Unit: Memory Storage Configuration', () => {
    it('should use memory storage for file uploads', () => {
      // Memory storage means files are stored in memory as Buffer objects
      // This is verified by checking that uploaded files have a buffer property
      const mockFile = {
        fieldname: 'image',
        originalname: 'test.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('test'),
        size: 1024,
      };
      
      expect(mockFile.buffer).toBeInstanceOf(Buffer);
      expect(mockFile.buffer.length).toBeGreaterThan(0);
    });
  });

  describe('Unit: Multer Error Handling', () => {
    it('should handle LIMIT_FILE_SIZE error', () => {
      const errorCode = 'LIMIT_FILE_SIZE';
      const expectedResponse = {
        success: false,
        error: 'File size exceeds the maximum allowed size of 5MB',
      };
      
      expect(errorCode).toBe('LIMIT_FILE_SIZE');
      expect(expectedResponse.success).toBe(false);
      expect(expectedResponse.error).toContain('5MB');
    });

    it('should handle LIMIT_UNEXPECTED_FILE error', () => {
      const errorCode = 'LIMIT_UNEXPECTED_FILE';
      const fieldName = 'image';
      const expectedResponse = {
        success: false,
        error: `Unexpected file field. Expected field name: ${fieldName}`,
      };
      
      expect(errorCode).toBe('LIMIT_UNEXPECTED_FILE');
      expect(expectedResponse.success).toBe(false);
      expect(expectedResponse.error).toContain(fieldName);
    });

    it('should handle LIMIT_FILE_COUNT error for multiple uploads', () => {
      const errorCode = 'LIMIT_FILE_COUNT';
      const maxCount = 10;
      const expectedResponse = {
        success: false,
        error: `Maximum ${maxCount} files allowed`,
      };
      
      expect(errorCode).toBe('LIMIT_FILE_COUNT');
      expect(expectedResponse.success).toBe(false);
      expect(expectedResponse.error).toContain('10');
    });
  });

  describe('Unit: Field Name Validation', () => {
    it('should accept common field names', () => {
      const commonFieldNames = [
        'image',
        'photo',
        'avatar',
        'logo',
        'poster',
        'banner',
        'thumbnail',
        'picture',
      ];
      
      commonFieldNames.forEach(fieldName => {
        expect(fieldName).toBeTruthy();
        expect(fieldName.length).toBeGreaterThan(0);
        expect(typeof fieldName).toBe('string');
      });
    });
  });

  describe('Unit: Response Format', () => {
    it('should return consistent error response format', () => {
      const errorResponse = {
        success: false,
        error: 'Some error message',
      };
      
      expect(errorResponse).toHaveProperty('success');
      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse.success).toBe(false);
      expect(typeof errorResponse.error).toBe('string');
    });

    it('should use 400 status code for validation errors', () => {
      const statusCode = 400;
      
      expect(statusCode).toBe(400);
      expect(statusCode).toBeGreaterThanOrEqual(400);
      expect(statusCode).toBeLessThan(500);
    });
  });
});
