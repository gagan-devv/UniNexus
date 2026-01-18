import express from 'express';
import { registerUser, loginUser } from '../controllers/authController';
import { logger } from '../utils/logger';

logger.info('Auth routes loaded');

const router = express.Router();

router.route('/register').post((req, res) => {
    registerUser(req, res);
});

router.route('/login').post(loginUser);

export default router;