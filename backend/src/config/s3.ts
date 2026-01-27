import { S3Client } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger';

let s3Client: S3Client | null = null;

export const initializeS3 = (): S3Client | null => {
  try {
    const awsRegion = process.env.AWS_REGION;
    const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const bucketName = process.env.S3_BUCKET_NAME;

    // Validate required environment variables
    if (!awsRegion || !awsAccessKeyId || !awsSecretAccessKey || !bucketName) {
      logger.warn('⚠️ AWS S3 configuration incomplete. Media upload features will be unavailable.');
      logger.warn('Missing variables:', {
        region: !awsRegion,
        accessKeyId: !awsAccessKeyId,
        secretAccessKey: !awsSecretAccessKey,
        bucketName: !bucketName,
      });
      return null;
    }

    logger.info('🔄 Initializing AWS S3 client...');
    logger.info(`AWS Region: ${awsRegion}`);

    s3Client = new S3Client({
      region: awsRegion,
      credentials: {
        accessKeyId: awsAccessKeyId,
        secretAccessKey: awsSecretAccessKey,
      },
    });

    logger.info('✅ AWS S3 client initialized successfully');
    return s3Client;
  } catch (error) {
    logger.error('❌ Failed to initialize AWS S3 client:', error instanceof Error ? error.message : String(error));
    logger.warn('⚠️ Application will continue without media upload functionality');
    s3Client = null;
    return null;
  }
};

export const getS3Client = (): S3Client | null => {
  return s3Client;
};

export const getS3BucketName = (): string | undefined => {
  return process.env.S3_BUCKET_NAME;
};
