import express from 'express';
import { registerClub, getAllClubs, getMyClub, getClubById, updateClub, deleteClub, joinClub, leaveClub, getClubMembers, getClubEvents } from '../controllers/clubController';
import { protect } from '../middlewares/authMiddleware';
import { isClubOwner } from '../middlewares/clubMiddleware';

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

export default router;