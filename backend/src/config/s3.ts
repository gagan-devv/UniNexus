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
    logger.info(`S3 configuration: Region=${awsRegion}, Bucket=${bucketName}`);

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
    logger.warn('⚠️ Application will continue without S3 media storage');
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

export const checkS3Connection = async (): Promise<boolean> => {
  if (!s3Client) {
    return false;
  }

  try {
    const { HeadBucketCommand } = await import('@aws-sdk/client-s3');
    const bucketName = getS3BucketName();
    
    if (!bucketName) {
      return false;
    }

    await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
    logger.info('✅ S3 bucket access verified');
    return true;
  } catch (error) {
    logger.error('❌ S3 connection check failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
};
