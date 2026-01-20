import express from 'express';
import { getUserProfile, updateUserProfile, deleteUserProfile, getAllUsers } from '../controllers/userController';
import { protect, requireAdmin } from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/', protect, requireAdmin, getAllUsers);
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.delete('/profile', protect, deleteUserProfile);

export default router;