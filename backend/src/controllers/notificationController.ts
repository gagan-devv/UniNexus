import { Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { logger } from '../utils/logger';

/**
 * Get notifications for the authenticated user
 * GET /api/notifications
 * Query params: page (default: 1), limit (default: 20)
 */
export const getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        // Get notifications for current user, sorted by createdAt desc
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get total count
        const total = await Notification.countDocuments({ userId: req.user._id });

        // Get unread count
        const unreadCount = await Notification.countDocuments({
            userId: req.user._id,
            read: false
        });

        logger.info(`Retrieved ${notifications.length} notifications for user ${req.user._id}`);

        res.status(200).json({
            success: true,
            data: {
                notifications,
                total,
                unreadCount,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        logger.error('Error fetching notifications:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Failed to fetch notifications'
        });
    }
};

/**
 * Mark a notification as read
 * PUT /api/notifications/:id/read
 */
export const markNotificationAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { id } = req.params;

        // Find notification and verify ownership
        const notification = await Notification.findById(id);

        if (!notification) {
            res.status(404).json({
                success: false,
                message: 'Notification not found'
            });
            return;
        }

        // Verify ownership
        if (notification.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({
                success: false,
                message: 'Access denied'
            });
            return;
        }

        // Update read status
        notification.read = true;
        await notification.save();

        logger.info(`Notification ${id} marked as read by user ${req.user._id}`);

        res.status(200).json({
            success: true,
            data: notification
        });

    } catch (error) {
        logger.error('Error marking notification as read:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Failed to mark notification as read'
        });
    }
};

/**
 * Mark all notifications as read for the authenticated user
 * PUT /api/notifications/read-all
 */
export const markAllNotificationsAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Update all unread notifications for the user
        const result = await Notification.updateMany(
            { userId: req.user._id, read: false },
            { $set: { read: true } }
        );

        logger.info(`Marked ${result.modifiedCount} notifications as read for user ${req.user._id}`);

        res.status(200).json({
            success: true,
            data: {
                count: result.modifiedCount
            }
        });

    } catch (error) {
        logger.error('Error marking all notifications as read:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Failed to mark all notifications as read'
        });
    }
};
