import express from 'express';
import { getSettings, updateSettings, changePassword } from '../controllers/settingsController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// All settings routes require authentication
router.get('/', protect, getSettings);
router.put('/', protect, updateSettings);
router.put('/password', protect, changePassword);

export default router;
