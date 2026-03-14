import express from 'express';
import { 
    createComment, 
    getCommentsByEvent,
    getCommentChildren,
    getCommentCount,
    updateComment, 
    deleteComment,
    voteOnComment
} from '../controllers/commentController';
import { protect } from '../middlewares/authMiddleware';
import { voteRateLimit } from '../middlewares/rateLimitMiddleware';

const router = express.Router();

// Create comment (requires authentication)
router.post('/', protect, createComment);

// Get comments for an event (public)
router.get('/event/:eventId', getCommentsByEvent);

// Get comment count for an event (public, cached)
router.get('/event/:eventId/count', getCommentCount);

// Get children of a specific comment (for lazy loading)
router.get('/:id/children', getCommentChildren);

// Update comment (requires authentication, author only)
router.put('/:id', protect, updateComment);

// Delete comment (requires authentication, author or moderator)
router.delete('/:id', protect, deleteComment);

// Vote on comment (requires authentication and rate limiting)
router.post('/:id/vote', protect, voteRateLimit, voteOnComment);

export default router;
