import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { ClubProfile } from '../models/ClubProfile';
import { Event } from '../models/Event';
import { getMediaService } from '../services/mediaService';
import { getCacheService } from '../services/cacheService';
import { getS3Client, getS3BucketName } from '../config/s3';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

/**
 * Upload profile picture for authenticated user
 * POST /api/users/profile-picture
 */
export const uploadProfilePicture = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
      return;
    }

    // Initialize media service
    const s3Client = getS3Client();
    const bucketName = getS3BucketName();
    const mediaService = getMediaService(s3Client, bucketName);

    // Upload to S3
    const result = await mediaService.uploadProfilePicture(req.user._id.toString(), req.file);

    // Generate presigned URL for immediate use
    const presignedUrl = await mediaService.getPresignedUrl(result.s3Key, 3600);

    // Update user document
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        profilePicture: {
          s3Key: result.s3Key,
          uploadedAt: new Date()
        },
        avatarUrl: presignedUrl
      },
      { new: true }
    ).select('-password -refreshToken');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Invalidate user profile cache
    const cacheService = getCacheService();
    await cacheService.invalidateUserProfile(req.user._id.toString());

    logger.info(`Profile picture uploaded for user ${req.user._id}`);

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        s3Key: result.s3Key,
        imageUrl: presignedUrl,
        url: presignedUrl
      }
    });
  } catch (error) {
    logger.error('Profile picture upload error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to upload profile picture'
    });
  }
};

/**
 * Upload club logo
 * POST /api/clubs/:id/logo
 */
export const uploadClubLogo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
      return;
    }

    const clubId = req.params.id;

    if (!clubId || Array.isArray(clubId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid club ID'
      });
      return;
    }

    // Find club and verify ownership
    const club = await ClubProfile.findById(clubId);
    if (!club) {
      res.status(404).json({
        success: false,
        message: 'Club not found'
      });
      return;
    }

    // Check if user is the club owner
    if (club.user.toString() !== req.user._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to upload logo for this club'
      });
      return;
    }

    // Initialize media service
    const s3Client = getS3Client();
    const bucketName = getS3BucketName();
    const mediaService = getMediaService(s3Client, bucketName);

    // Upload to S3
    const result = await mediaService.uploadClubLogo(clubId, req.file);

    // Generate presigned URL for immediate use
    const presignedUrl = await mediaService.getPresignedUrl(result.s3Key, 3600);

    // Update club document
    club.logo = {
      s3Key: result.s3Key,
      uploadedAt: new Date()
    };
    club.logoUrl = presignedUrl; // Store presigned URL for immediate access
    await club.save();

    // Invalidate club cache
    const cacheService = getCacheService();
    await cacheService.invalidateClubs();

    logger.info(`Club logo uploaded for club ${clubId}`);

    res.status(200).json({
      success: true,
      message: 'Club logo uploaded successfully',
      data: {
        s3Key: result.s3Key,
        imageUrl: presignedUrl,
        url: presignedUrl
      }
    });
  } catch (error) {
    logger.error('Club logo upload error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to upload club logo'
    });
  }
};

/**
 * Upload event poster
 * POST /api/events/:id/poster
 */
export const uploadEventPoster = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
      return;
    }

    const eventId = req.params.id;

    if (!eventId || Array.isArray(eventId)) {
      res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
      return;
    }

    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      res.status(404).json({
        success: false,
        message: 'Event not found'
      });
      return;
    }

    // Find user's club
    const club = await ClubProfile.findOne({ user: req.user._id });
    if (!club) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You are not a club owner'
      });
      return;
    }

    // Check if user's club is the event organizer
    if (event.organizer.toString() !== club._id.toString()) {
      res.status(403).json({
        success: false,
        message: 'Access denied. You are not the organizer of this event'
      });
      return;
    }

    // Initialize media service
    const s3Client = getS3Client();
    const bucketName = getS3BucketName();
    const mediaService = getMediaService(s3Client, bucketName);

    // Upload to S3
    const result = await mediaService.uploadEventPoster(eventId, req.file);

    // Generate presigned URL for immediate use
    const presignedUrl = await mediaService.getPresignedUrl(result.s3Key, 3600);

    // Update event document
    event.poster = {
      s3Key: result.s3Key,
      uploadedAt: new Date()
    };
    event.posterUrl = presignedUrl;
    await event.save();

    // Invalidate event cache
    const cacheService = getCacheService();
    await cacheService.invalidateEvents();

    logger.info(`Event poster uploaded for event ${eventId}`);

    res.status(200).json({
      success: true,
      message: 'Event poster uploaded successfully',
      data: {
        s3Key: result.s3Key,
        imageUrl: presignedUrl,
        url: presignedUrl
      }
    });
  } catch (error) {
    logger.error('Event poster upload error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to upload event poster'
    });
  }
};

/**
 * Get presigned URL for S3 object
 * GET /api/media/presigned-url?key=<s3Key>
 */
export const getPresignedUrl = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Extract s3Key from query parameter
    const s3Key = req.query.key as string;

    if (!s3Key || Array.isArray(s3Key)) {
      res.status(400).json({
        success: false,
        message: 'S3 key is required as query parameter'
      });
      return;
    }

    // Initialize media service
    const s3Client = getS3Client();
    const bucketName = getS3BucketName();
    const mediaService = getMediaService(s3Client, bucketName);

    // Generate presigned URL
    const url = await mediaService.getPresignedUrl(s3Key, 3600);

    res.status(200).json({
      success: true,
      data: {
        url,
        expiresIn: 3600
      }
    });
  } catch (error) {
    logger.error('Presigned URL generation error:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to generate presigned URL'
    });
  }
};
