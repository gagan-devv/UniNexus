import express from 'express';
import { createOrUpdateRSVP, getUserRSVPs, getEventRSVPs, deleteRSVP } from '../controllers/rsvpController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/events/:eventId', protect, createOrUpdateRSVP);
router.get('/my-rsvps', protect, getUserRSVPs);
router.get('/events/:eventId', getEventRSVPs);
router.delete('/events/:eventId', protect, deleteRSVP);

export default router;