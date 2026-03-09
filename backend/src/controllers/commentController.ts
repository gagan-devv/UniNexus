import { Response, Request } from 'express';
import { Comment, IComment } from '../models/Comment';
import { Event } from '../models/Event';
import { User, IUser } from '../models/User';
import { ClubProfile } from '../models/ClubProfile';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

interface AuthenticatedRequest extends Request {
    user?: IUser;
}

/**
 * Helper function to build materialized path for a comment
 */
const buildPath = (parentComment: IComment | null): string => {
    if (!parentComment) return "";
    return parentComment.path + parentComment._id + ".";
};

/**
 * Helper function to calculate depth from path
 */
const calculateDepth = (path: string): number => {
    if (path === "") return 0;
    return path.split(".").filter(Boolean).length;
};

/**
 * Helper function to sanitize comment content (prevent XSS)
 */
const sanitizeContent = (content: string): string => {
    return content
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
};

/**
 * Create a new comment (root or nested)
 * POST /api/comments
 */
export const createComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { content, eventId, parentId } = req.body;

        // Validate required fields
        if (!content || !eventId) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: [
                    { field: 'content', message: 'Comment content is required' },
                    { field: 'eventId', message: 'Event ID is required' }
                ]
            });
            return;
        }

        // Validate content length
        const trimmedContent = content.trim();
        if (trimmedContent.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: [
                    { field: 'content', message: 'Comment content cannot be empty' }
                ]
            });
            return;
        }

        if (trimmedContent.length > 2000) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: [
                    { field: 'content', message: 'Comment content cannot exceed 2000 characters' }
                ]
            });
            return;
        }

        // Validate event exists
        const event = await Event.findById(eventId);
        if (!event) {
            res.status(404).json({
                success: false,
                message: 'Event not found'
            });
            return;
        }

        // Sanitize content to prevent XSS
        const sanitizedContent = sanitizeContent(trimmedContent);

        let path = "";
        let depth = 0;
        let parentComment: IComment | null = null;

        // If this is a nested comment, validate parent
        if (parentId) {
            parentComment = await Comment.findById(parentId);
            if (!parentComment) {
                res.status(404).json({
                    success: false,
                    message: 'Parent comment not found'
                });
                return;
            }

            // Validate parent belongs to same event
            if (parentComment.eventId.toString() !== eventId) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: [
                        { field: 'parentId', message: 'Parent comment must belong to the same event' }
                    ]
                });
                return;
            }

            path = buildPath(parentComment);
            depth = calculateDepth(path);
        }

        // Create comment
        const newComment = await Comment.create({
            content: sanitizedContent,
            author: req.user._id,
            eventId,
            parentId: parentId || null,
            path,
            depth
        });

        // Populate author details
        const populatedComment = await Comment.findById(newComment._id)
            .populate('author', 'username email avatarUrl');

        res.status(201).json({
            success: true,
            message: 'Comment created successfully',
            data: populatedComment
        });

    } catch (error) {
        logger.error('Create comment error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Get all comments for an event with sorting
 * GET /api/comments/event/:eventId
 */
export const getCommentsByEvent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId } = req.params;
        const { sort = 'hot', limit = 500, cursor } = req.query;

        // Validate event exists
        const event = await Event.findById(eventId);
        if (!event) {
            res.status(404).json({
                success: false,
                message: 'Event not found'
            });
            return;
        }

        // Build query
        const query: any = { eventId };
        if (cursor) {
            query._id = { $gt: cursor };
        }

        // Fetch comments
        let comments = await Comment.find(query)
            .populate('author', 'username email avatarUrl')
            .limit(Number(limit))
            .lean();

        // Apply sorting
        switch (sort) {
            case 'top':
                comments.sort((a, b) => b.voteCount - a.voteCount);
                break;
            case 'new':
                comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                break;
            case 'controversial':
                comments.sort((a, b) => {
                    const scoreA = calculateControversyScore(a);
                    const scoreB = calculateControversyScore(b);
                    return scoreB - scoreA;
                });
                break;
            case 'hot':
            default:
                comments.sort((a, b) => {
                    const scoreA = calculateHotScore(a);
                    const scoreB = calculateHotScore(b);
                    return scoreB - scoreA;
                });
                break;
        }

        // Sort by path to maintain hierarchy within each level
        comments.sort((a, b) => {
            if (a.path === b.path) {
                // Same level, use the sort order
                return 0;
            }
            return a.path.localeCompare(b.path);
        });

        const hasMore = comments.length === Number(limit);
        const nextCursor = hasMore && comments.length > 0 ? comments[comments.length - 1]?._id : null;

        res.json({
            success: true,
            data: {
                comments,
                nextCursor,
                hasMore
            }
        });

    } catch (error) {
        logger.error('Get comments by event error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Calculate hot score (Reddit-style)
 */
const calculateHotScore = (comment: any): number => {
    const ageInHours = (Date.now() - new Date(comment.createdAt).getTime()) / (1000 * 60 * 60);
    const score = comment.voteCount;
    return score / Math.pow(ageInHours + 2, 1.5);
};

/**
 * Calculate controversy score
 */
const calculateControversyScore = (comment: any): number => {
    const upvotes = comment.upvotes.length;
    const downvotes = comment.downvotes.length;
    
    if (upvotes === 0 || downvotes === 0) return 0;
    
    const magnitude = upvotes + downvotes;
    const balance = Math.min(upvotes, downvotes) / Math.max(upvotes, downvotes);
    
    return magnitude * balance;
};

/**
 * Update a comment (author only)
 * PUT /api/comments/:id
 */
export const updateComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { id } = req.params;
        const { content } = req.body;

        // Validate content
        if (!content) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: [
                    { field: 'content', message: 'Comment content is required' }
                ]
            });
            return;
        }

        const trimmedContent = content.trim();
        if (trimmedContent.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: [
                    { field: 'content', message: 'Comment content cannot be empty' }
                ]
            });
            return;
        }

        if (trimmedContent.length > 2000) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: [
                    { field: 'content', message: 'Comment content cannot exceed 2000 characters' }
                ]
            });
            return;
        }

        // Find comment
        const comment = await Comment.findById(id);
        if (!comment) {
            res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
            return;
        }

        // Check authorization - only author can edit
        if (comment.author.toString() !== req.user._id.toString()) {
            res.status(403).json({
                success: false,
                message: 'Access denied. You can only edit your own comments'
            });
            return;
        }

        // Sanitize content
        const sanitizedContent = sanitizeContent(trimmedContent);

        // Update comment
        comment.content = sanitizedContent;
        comment.isEdited = true;
        comment.editedAt = new Date();
        await comment.save();

        // Populate author details
        const populatedComment = await Comment.findById(comment._id)
            .populate('author', 'username email avatarUrl');

        res.json({
            success: true,
            message: 'Comment updated successfully',
            data: populatedComment
        });

    } catch (error) {
        logger.error('Update comment error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Delete a comment (author or moderator)
 * DELETE /api/comments/:id
 */
export const deleteComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { id } = req.params;

        // Find comment
        const comment = await Comment.findById(id);
        if (!comment) {
            res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
            return;
        }

        // Check if user is the author
        const isAuthor = comment.author.toString() === req.user._id.toString();

        // Check if user is a moderator (event organizer or super admin)
        let isModerator = false;
        if (!isAuthor) {
            // Check if user is super admin first (most efficient)
            const fullUser = await User.findById(req.user._id);
            if (fullUser && (fullUser as any).isSuperAdmin === true) {
                isModerator = true;
            }

            // If not super admin, check if user is the event organizer
            if (!isModerator) {
                const event = await Event.findById(comment.eventId);
                if (event) {
                    // Check if user owns the club that organized the event
                    const club = await ClubProfile.findOne({ 
                        _id: event.organizer,
                        user: req.user._id
                    });
                    
                    if (club) {
                        isModerator = true;
                    }
                }
            }
        }

        // Check authorization
        if (!isAuthor && !isModerator) {
            res.status(403).json({
                success: false,
                message: 'Access denied. You can only delete your own comments or comments on your events'
            });
            return;
        }

        // Soft delete
        comment.isDeleted = true;
        comment.deletedBy = req.user._id;
        comment.deletedAt = new Date();

        if (isModerator && !isAuthor) {
            comment.moderationReason = 'Removed by moderator';
        }

        await comment.save();

        // TODO: Create audit log for moderation actions
        // The current AuditLog model is designed for club member management
        // Need to extend it to support comment moderation

        res.json({
            success: true,
            message: 'Comment deleted successfully'
        });

    } catch (error) {
        logger.error('Delete comment error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Vote on a comment (upvote, downvote, or remove vote)
 * POST /api/comments/:id/vote
 */
export const voteOnComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { id } = req.params;
        const { voteType } = req.body;

        // Validate voteType
        if (!voteType || !['upvote', 'downvote', 'remove'].includes(voteType)) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: [
                    { field: 'voteType', message: 'Vote type must be "upvote", "downvote", or "remove"' }
                ]
            });
            return;
        }

        // Find comment
        const comment = await Comment.findById(id);
        if (!comment) {
            res.status(404).json({
                success: false,
                message: 'Comment not found'
            });
            return;
        }

        // Prevent voting on own comment
        if (comment.author.toString() === req.user._id.toString()) {
            res.status(403).json({
                success: false,
                message: 'You cannot vote on your own comment'
            });
            return;
        }

        const userId = req.user._id;

        // Handle vote based on type
        if (voteType === 'upvote') {
            // Use atomic operations to prevent race conditions
            await Comment.findByIdAndUpdate(id, {
                $addToSet: { upvotes: userId },  // Add to upvotes (no duplicates)
                $pull: { downvotes: userId }      // Remove from downvotes
            });
        } else if (voteType === 'downvote') {
            // Use atomic operations to prevent race conditions
            await Comment.findByIdAndUpdate(id, {
                $addToSet: { downvotes: userId }, // Add to downvotes (no duplicates)
                $pull: { upvotes: userId }        // Remove from upvotes
            });
        } else if (voteType === 'remove') {
            // Remove vote entirely
            await Comment.findByIdAndUpdate(id, {
                $pull: { 
                    upvotes: userId,
                    downvotes: userId
                }
            });
        }

        // Fetch updated comment and recalculate vote count
        const updatedComment = await Comment.findById(id);
        if (updatedComment) {
            updatedComment.voteCount = updatedComment.upvotes.length - updatedComment.downvotes.length;
            await updatedComment.save();

            // Determine user's current vote
            let userVote: 'upvote' | 'downvote' | null = null;
            if (updatedComment.upvotes.some(id => id.toString() === userId.toString())) {
                userVote = 'upvote';
            } else if (updatedComment.downvotes.some(id => id.toString() === userId.toString())) {
                userVote = 'downvote';
            }

            res.json({
                success: true,
                message: 'Vote recorded successfully',
                data: {
                    voteCount: updatedComment.voteCount,
                    userVote
                }
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Comment not found after update'
            });
        }

    } catch (error) {
        logger.error('Vote on comment error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
