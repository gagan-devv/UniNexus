import express from 'express';
import { createEvent, getAllEvents, getEventById, updateEvent, deleteEvent } from '../controllers/eventController';
import { protect } from '../middlewares/authMiddleware';
import { isEventOrganiser } from '../middlewares/eventMiddleware';
import { isClubOwner } from '../middlewares/clubMiddleware';

const router = express.Router();

router.post('/', protect, isClubOwner, createEvent);
router.get('/', getAllEvents);
router.get('/:id', getEventById);
router.put('/:id', protect, isEventOrganiser, updateEvent);
router.delete('/:id', protect, isEventOrganiser, deleteEvent);

export default router;
