import express from 'express';
import { registerClub, getAllClubs, getClubById, updateClub, deleteClub } from '../controllers/clubController';
import { protect } from '../middlewares/authMiddleware';
import { isClubOwner } from '../middlewares/clubMiddleware';

const router = express.Router();

router.post('/', protect, registerClub);
router.get('/', getAllClubs);
router.get('/:id', getClubById);
router.put('/', protect, isClubOwner, updateClub);
router.delete('/', protect, isClubOwner, deleteClub);

export default router;