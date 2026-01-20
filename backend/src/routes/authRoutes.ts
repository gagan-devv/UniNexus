import express from 'express';
import { registerUser, loginUser, refreshToken, logoutUser } from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';
import { logger } from '../utils/logger';

logger.info('Auth routes loaded');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', protect, logoutUser);

export default router;