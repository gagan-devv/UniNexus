import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../utils/logger';
import crypto from 'crypto';

// File validation constants
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

interface UploadResult {
  s3Key: string;
  url?: string;
}

export class MediaService {
  private s3Client: S3Client | null;
  private bucketName: string | undefined;

  constructor(s3Client: S3Client | null, bucketName: string | undefined) {
    this.s3Client = s3Client;
    this.bucketName = bucketName;
  }

  /**
   * Validate image file type and size
   */
  validateImageFile(file: Express.Multer.File): FileValidationResult {
    // Check file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return {
        isValid: false,
        error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      };
    }

    return { isValid: true };
  }

  /**
   * Generate unique S3 key with timestamp
   */
  generateUniqueKey(prefix: string, userId: string, filename: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = filename.split('.').pop() || 'jpg';
    return `${prefix}/${userId}/${timestamp}-${randomString}.${extension}`;
  }

  /**
   * Upload file to S3
   */
  private async uploadToS3(key: string, buffer: Buffer, contentType: string): Promise<void> {
    if (!this.s3Client || !this.bucketName) {
      throw new Error('S3 client or bucket name not configured');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await this.s3Client.send(command);
    logger.info(`✅ File uploaded to S3: ${key}`);
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(userId: string, file: Express.Multer.File): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Generate unique key
      const s3Key = this.generateUniqueKey('profiles', userId, file.originalname);

      // Upload to S3
      await this.uploadToS3(s3Key, file.buffer, file.mimetype);

      return { s3Key };
    } catch (error) {
      logger.error('Profile picture upload error:', error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to upload profile picture: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload club logo
   */
  async uploadClubLogo(clubId: string, file: Express.Multer.File): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Generate unique key
      const s3Key = this.generateUniqueKey('clubs', clubId, file.originalname);

      // Upload to S3
      await this.uploadToS3(s3Key, file.buffer, file.mimetype);

      return { s3Key };
    } catch (error) {
      logger.error('Club logo upload error:', error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to upload club logo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload event poster
   */
  async uploadEventPoster(eventId: string, file: Express.Multer.File): Promise<UploadResult> {
    try {
      // Validate file
      const validation = this.validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Generate unique key
      const s3Key = this.generateUniqueKey('events', eventId, file.originalname);

      // Upload to S3
      await this.uploadToS3(s3Key, file.buffer, file.mimetype);

      return { s3Key };
    } catch (error) {
      logger.error('Event poster upload error:', error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to upload event poster: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate presigned URL for accessing S3 object
   */
  async getPresignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    try {
      if (!this.s3Client || !this.bucketName) {
        throw new Error('S3 client or bucket name not configured');
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      return url;
    } catch (error) {
      logger.error('Presigned URL generation error:', error instanceof Error ? error.message : String(error));
      throw new Error(`Failed to generate presigned URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Singleton instance
let mediaServiceInstance: MediaService | null = null;

export const getMediaService = (s3Client?: S3Client | null, bucketName?: string): MediaService => {
  if (!mediaServiceInstance) {
    mediaServiceInstance = new MediaService(s3Client || null, bucketName);
  }
  return mediaServiceInstance;
};
