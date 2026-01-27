import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import crypto from 'crypto';
import { logger } from '../utils/logger';

// File validation constants
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

// Image optimization constants
const MAX_WIDTH = 1200;
const COMPRESSION_QUALITY = 85;

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadResult {
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
   * @param file - File object with mimetype and size
   * @returns Validation result with error message if invalid
   */
  validateImageFile(file: { mimetype: string; size: number }): FileValidationResult {
    // Check file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
      };
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Optimize image: resize, compress, convert to WebP
   * @param buffer - Image buffer
   * @param options - Optimization options
   * @returns Optimized image buffer
   */
  async optimizeImage(
    buffer: Buffer,
    options: { maxWidth?: number; quality?: number } = {}
  ): Promise<Buffer> {
    const maxWidth = options.maxWidth || MAX_WIDTH;
    const quality = options.quality || COMPRESSION_QUALITY;

    try {
      const optimized = await sharp(buffer)
        .resize(maxWidth, null, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer();

      logger.debug(`Image optimized: ${buffer.length} bytes -> ${optimized.length} bytes`);
      return optimized;
    } catch (error) {
      logger.error('Image optimization failed:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to optimize image');
    }
  }

  /**
   * Generate unique S3 key with timestamp
   * @param prefix - Folder prefix (profiles, clubs, events)
   * @param id - User/Club/Event ID
   * @param filename - Original filename
   * @returns Unique S3 key
   */
  generateUniqueKey(prefix: string, id: string, filename: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = 'webp'; // Always use webp after optimization
    return `${prefix}/${id}/${timestamp}-${randomString}.${extension}`;
  }

  /**
   * Upload file to S3
   * @param s3Key - S3 object key
   * @param buffer - File buffer
   * @param contentType - MIME type
   */
  private async uploadToS3(s3Key: string, buffer: Buffer, contentType: string): Promise<void> {
    if (!this.s3Client || !this.bucketName) {
      throw new Error('S3 client not configured');
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);
      logger.info(`File uploaded to S3: ${s3Key}`);
    } catch (error) {
      logger.error('S3 upload failed:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Upload profile picture
   * @param userId - User ID
   * @param file - File object with buffer, mimetype, size, originalname
   * @returns Upload result with S3 key
   */
  async uploadProfilePicture(
    userId: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string }
  ): Promise<UploadResult> {
    // Check S3 configuration first
    if (!this.s3Client || !this.bucketName) {
      throw new Error('S3 client not configured');
    }

    // Validate file
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Optimize image
    const optimizedBuffer = await this.optimizeImage(file.buffer);

    // Generate unique key
    const s3Key = this.generateUniqueKey('profiles', userId, file.originalname);

    // Upload to S3
    await this.uploadToS3(s3Key, optimizedBuffer, 'image/webp');

    return { s3Key };
  }

  /**
   * Upload club logo
   * @param clubId - Club ID
   * @param file - File object
   * @returns Upload result with S3 key
   */
  async uploadClubLogo(
    clubId: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string }
  ): Promise<UploadResult> {
    // Check S3 configuration first
    if (!this.s3Client || !this.bucketName) {
      throw new Error('S3 client not configured');
    }

    // Validate file
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Optimize image
    const optimizedBuffer = await this.optimizeImage(file.buffer);

    // Generate unique key
    const s3Key = this.generateUniqueKey('clubs', clubId, file.originalname);

    // Upload to S3
    await this.uploadToS3(s3Key, optimizedBuffer, 'image/webp');

    return { s3Key };
  }

  /**
   * Upload event poster
   * @param eventId - Event ID
   * @param file - File object
   * @returns Upload result with S3 key
   */
  async uploadEventPoster(
    eventId: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname: string }
  ): Promise<UploadResult> {
    // Check S3 configuration first
    if (!this.s3Client || !this.bucketName) {
      throw new Error('S3 client not configured');
    }

    // Validate file
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Optimize image
    const optimizedBuffer = await this.optimizeImage(file.buffer);

    // Generate unique key
    const s3Key = this.generateUniqueKey('events', eventId, file.originalname);

    // Upload to S3
    await this.uploadToS3(s3Key, optimizedBuffer, 'image/webp');

    return { s3Key };
  }

  /**
   * Generate presigned URL for S3 object
   * @param s3Key - S3 object key
   * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
   * @returns Presigned URL
   */
  async getPresignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.s3Client || !this.bucketName) {
      throw new Error('S3 client not configured');
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });
      logger.debug(`Presigned URL generated for ${s3Key}, expires in ${expiresIn}s`);
      return url;
    } catch (error) {
      logger.error('Failed to generate presigned URL:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to generate presigned URL');
    }
  }

  /**
   * Delete image from S3
   * @param s3Key - S3 object key
   */
  async deleteImage(s3Key: string): Promise<void> {
    if (!this.s3Client || !this.bucketName) {
      throw new Error('S3 client not configured');
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      logger.info(`File deleted from S3: ${s3Key}`);
    } catch (error) {
      logger.error('S3 delete failed:', error instanceof Error ? error.message : String(error));
      throw new Error('Failed to delete file from S3');
    }
  }
}
