import express from 'express';
import { protect, requireSuperAdmin } from '../middlewares/authMiddleware';
import { getPendingClubs, approveClub, rejectClub } from '../controllers/adminController';

const router = express.Router();

// All admin routes require authentication and super admin privileges
router.use(protect, requireSuperAdmin);

// Get pending clubs
router.get('/clubs/pending', getPendingClubs);

// Approve club
router.post('/clubs/:id/approve', approveClub);

// Reject club
router.post('/clubs/:id/reject', rejectClub);

export default router;
