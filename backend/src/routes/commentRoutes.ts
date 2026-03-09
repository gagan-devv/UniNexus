import express from 'express';
import { 
    createComment, 
    getCommentsByEvent, 
    updateComment, 
    deleteComment 
} from '../controllers/commentController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Create comment (requires authentication)
router.post('/', protect, createComment);

// Get comments for an event (public)
router.get('/event/:eventId', getCommentsByEvent);

// Update comment (requires authentication, author only)
router.put('/:id', protect, updateComment);

// Delete comment (requires authentication, author or moderator)
router.delete('/:id', protect, deleteComment);

export default router;
