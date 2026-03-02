import express from 'express';
import { registerClub, getAllClubs, getMyClub, getClubById, updateClub, deleteClub, joinClub, leaveClub, getClubMembers, getClubEvents, addClubMember, removeClubMember, updateMemberRole } from '../controllers/clubController';
import { protect } from '../middlewares/authMiddleware';
import { isClubOwner, isClubAdmin } from '../middlewares/clubMiddleware';

const router = express.Router();

router.post('/', protect, registerClub);
router.get('/', getAllClubs);
router.get('/me', protect, getMyClub); // Must come before /:id to avoid treating 'me' as an ID
router.get('/:id', getClubById);
router.put('/', protect, isClubOwner, updateClub);
router.delete('/', protect, isClubOwner, deleteClub);

// Club membership endpoints
router.post('/:id/join', protect, joinClub);
router.delete('/:id/leave', protect, leaveClub);
router.get('/:id/members', getClubMembers);
router.get('/:id/events', getClubEvents);

// Member management endpoints (admin only)
router.post('/:id/members', protect, isClubAdmin, addClubMember);
router.delete('/:id/members/:userId', protect, isClubAdmin, removeClubMember);
router.put('/:id/members/:userId/role', protect, isClubAdmin, updateMemberRole);

export default router;