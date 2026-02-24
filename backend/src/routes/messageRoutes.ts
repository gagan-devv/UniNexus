import express from 'express';
import {
    getConversations,
    getConversationMessages,
    sendMessage,
    createConversation
} from '../controllers/messageController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// All message routes require authentication
router.get('/conversations', protect, getConversations);
router.get('/conversations/:id', protect, getConversationMessages);
router.post('/', protect, sendMessage);
router.post('/conversations', protect, createConversation);

export default router;
