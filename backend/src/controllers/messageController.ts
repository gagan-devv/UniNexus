import { Request, Response } from 'express';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

/**
 * Get all conversations for the authenticated user
 * GET /api/messages/conversations
 */
export const getConversations = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Find conversations where user is a participant
        const conversations = await Conversation.find({
            participants: req.user._id
        })
            .populate('participants', 'username avatarUrl')
            .sort({ lastMessageAt: -1 })
            .lean();

        // Get last message for each conversation
        const conversationsWithMessages = await Promise.all(
            conversations.map(async (conversation) => {
                const lastMessage = await Message.findOne({
                    conversationId: conversation._id
                })
                    .sort({ timestamp: -1 })
                    .populate('senderId', 'username avatarUrl')
                    .lean();

                return {
                    ...conversation,
                    lastMessage
                };
            })
        );

        logger.info(`Retrieved ${conversationsWithMessages.length} conversations for user ${req.user._id}`);

        res.status(200).json({
            success: true,
            data: conversationsWithMessages
        });

    } catch (error) {
        logger.error('Error fetching conversations:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversations'
        });
    }
};

/**
 * Get messages for a specific conversation
 * GET /api/messages/conversations/:id
 */
export const getConversationMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { id } = req.params;

        // Validate id format
        if (!id || Array.isArray(id) || !mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid conversation ID'
            });
            return;
        }

        // Verify conversation exists
        const conversation = await Conversation.findById(id);

        if (!conversation) {
            res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
            return;
        }

        // Verify user is a participant
        const isParticipant = conversation.participants.some(
            (participantId) => participantId.toString() === req.user!._id.toString()
        );

        if (!isParticipant) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        // Get messages sorted by timestamp ascending
        const messages = await Message.find({ conversationId: id })
            .sort({ timestamp: 1 })
            .populate('senderId', 'username avatarUrl')
            .lean();

        logger.info(`Retrieved ${messages.length} messages for conversation ${id}`);

        res.status(200).json({
            success: true,
            data: messages
        });

    } catch (error) {
        logger.error('Error fetching conversation messages:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages'
        });
    }
};

/**
 * Send a message in a conversation
 * POST /api/messages
 * Body: { conversationId, content }
 */
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { conversationId, content } = req.body;

        // Validate input
        if (!conversationId || !content) {
            res.status(400).json({
                success: false,
                message: 'Conversation ID and content are required'
            });
            return;
        }

        // Verify conversation exists
        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            res.status(404).json({
                success: false,
                message: 'Conversation not found'
            });
            return;
        }

        // Verify user is a participant
        const isParticipant = conversation.participants.some(
            (participantId) => participantId.toString() === req.user!._id.toString()
        );

        if (!isParticipant) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        // Create message
        const message = await Message.create({
            conversationId,
            senderId: req.user._id,
            content,
            timestamp: new Date()
        });

        // Update conversation lastMessageAt
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Populate sender details
        await message.populate('senderId', 'username avatarUrl');

        logger.info(`Message sent by user ${req.user._id} in conversation ${conversationId}`);

        res.status(201).json({
            success: true,
            data: message
        });

    } catch (error) {
        logger.error('Error sending message:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Failed to send message'
        });
    }
};

/**
 * Create a new conversation
 * POST /api/messages/conversations
 * Body: { participantIds }
 */
export const createConversation = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { participantIds } = req.body;

        // Validate input
        if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Participant IDs are required'
            });
            return;
        }

        // Include authenticated user in participants
        const allParticipants = [
            req.user._id.toString(),
            ...participantIds.map((id: string) => id.toString())
        ];

        // Remove duplicates
        const uniqueParticipants = Array.from(new Set(allParticipants));

        // Validate minimum participants
        if (uniqueParticipants.length < 2) {
            res.status(400).json({
                success: false,
                message: 'Conversation must have at least 2 participants'
            });
            return;
        }

        // Check for existing conversation with same participants
        const existingConversation = await Conversation.findOne({
            participants: {
                $all: uniqueParticipants,
                $size: uniqueParticipants.length
            }
        });

        if (existingConversation) {
            res.status(200).json({
                success: true,
                data: existingConversation,
                message: 'Conversation already exists'
            });
            return;
        }

        // Create new conversation
        const conversation = await Conversation.create({
            participants: uniqueParticipants.map(id => new mongoose.Types.ObjectId(id)),
            lastMessageAt: new Date()
        });

        // Populate participants
        await conversation.populate('participants', 'username avatarUrl');

        logger.info(`Conversation created by user ${req.user._id} with participants ${uniqueParticipants.join(', ')}`);

        res.status(201).json({
            success: true,
            data: conversation
        });

    } catch (error) {
        logger.error('Error creating conversation:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Failed to create conversation'
        });
    }
};
