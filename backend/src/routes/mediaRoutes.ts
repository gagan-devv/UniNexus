import express from 'express';
import { 
  uploadProfilePicture, 
  uploadClubLogo, 
  uploadEventPoster, 
  getPresignedUrl 
} from '../controllers/mediaController';
import { protect } from '../middlewares/authMiddleware';
import { uploadSingle, requireFile } from '../middlewares/uploadMiddleware';

const router = express.Router();

// Upload profile picture
router.post(
  '/users/profile-picture',
  protect,
  uploadSingle('image'),
  requireFile,
  uploadProfilePicture
);

// Upload club logo
router.post(
  '/clubs/:id/logo',
  protect,
  uploadSingle('image'),
  requireFile,
  uploadClubLogo
);

// Upload event poster (for existing events)
router.post(
  '/events/:id/poster',
  protect,
  uploadSingle('image'),
  requireFile,
  uploadEventPoster
);

// Upload event poster (for new events - before event creation)
router.post(
  '/events/poster',
  protect,
  uploadSingle('image'),
  requireFile,
  uploadEventPoster
);

// Get presigned URL
router.get(
  '/presigned-url',
  protect,
  getPresignedUrl
);

export default router;
