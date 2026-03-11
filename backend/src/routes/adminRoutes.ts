import express from 'express';
import { getPendingClubs, getClubStats, approveClub, rejectClub } from '../controllers/adminController';
import { protect, requireSuperAdmin } from '../middlewares/authMiddleware';

const router = express.Router();

// All admin routes require super admin authentication
router.use(protect, requireSuperAdmin);

// Get club stats
router.get('/clubs/stats', getClubStats);

// Get pending clubs
router.get('/clubs/pending', getPendingClubs);

// Approve club
router.post('/clubs/:id/approve', approveClub);

// Reject club
router.post('/clubs/:id/reject', rejectClub);

export default router;
