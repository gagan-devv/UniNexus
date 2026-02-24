import { Request, Response } from 'express';
import { User, validatePassword } from '../models/User';
import { logger } from '../utils/logger';

/**
 * Get settings for the authenticated user
 * GET /api/settings
 */
export const getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Get user with settings
        const user = await User.findById(req.user._id).select('settings').lean();

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        // Return settings with defaults if not set
        const settings = user.settings || {
            notifications: {
                events: true,
                clubs: true,
                messages: true
            },
            privacy: {
                showProfile: true,
                showEvents: true
            }
        };

        logger.info(`Retrieved settings for user ${req.user._id}`);

        res.status(200).json({
            success: true,
            data: settings
        });

    } catch (error) {
        logger.error('Error fetching settings:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Failed to fetch settings'
        });
    }
};

/**
 * Update settings for the authenticated user
 * PUT /api/settings
 * Body: { notifications?, privacy? }
 */
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { notifications, privacy } = req.body;
        const errors: string[] = [];

        // Validate notification preferences are boolean
        if (notifications) {
            if (notifications.events !== undefined && typeof notifications.events !== 'boolean') {
                errors.push('Notification preference for events must be a boolean');
            }
            if (notifications.clubs !== undefined && typeof notifications.clubs !== 'boolean') {
                errors.push('Notification preference for clubs must be a boolean');
            }
            if (notifications.messages !== undefined && typeof notifications.messages !== 'boolean') {
                errors.push('Notification preference for messages must be a boolean');
            }
        }

        // Validate privacy preferences are boolean
        if (privacy) {
            if (privacy.showProfile !== undefined && typeof privacy.showProfile !== 'boolean') {
                errors.push('Privacy preference for showProfile must be a boolean');
            }
            if (privacy.showEvents !== undefined && typeof privacy.showEvents !== 'boolean') {
                errors.push('Privacy preference for showEvents must be a boolean');
            }
        }

        if (errors.length > 0) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors
            });
            return;
        }

        // Build update object
        const updateObj: any = {};
        
        if (notifications) {
            if (notifications.events !== undefined) {
                updateObj['settings.notifications.events'] = notifications.events;
            }
            if (notifications.clubs !== undefined) {
                updateObj['settings.notifications.clubs'] = notifications.clubs;
            }
            if (notifications.messages !== undefined) {
                updateObj['settings.notifications.messages'] = notifications.messages;
            }
        }

        if (privacy) {
            if (privacy.showProfile !== undefined) {
                updateObj['settings.privacy.showProfile'] = privacy.showProfile;
            }
            if (privacy.showEvents !== undefined) {
                updateObj['settings.privacy.showEvents'] = privacy.showEvents;
            }
        }

        // Update user settings
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateObj },
            { new: true, runValidators: true }
        ).select('settings');

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        logger.info(`Updated settings for user ${req.user._id}`);

        res.status(200).json({
            success: true,
            data: user.settings
        });

    } catch (error) {
        logger.error('Error updating settings:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Failed to update settings'
        });
    }
};

/**
 * Change password for the authenticated user
 * PUT /api/settings/password
 * Body: { currentPassword, newPassword }
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { currentPassword, newPassword } = req.body;

        // Validate required fields
        if (!currentPassword || !newPassword) {
            res.status(400).json({
                success: false,
                message: 'Current password and new password are required'
            });
            return;
        }

        // Get user with password
        const user = await User.findById(req.user._id);

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        // Verify current password
        const isPasswordCorrect = await user.comparePassword(currentPassword);

        if (!isPasswordCorrect) {
            res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
            return;
        }

        // Validate new password strength
        const validation = validatePassword(newPassword);

        if (!validation.isValid) {
            res.status(400).json({
                success: false,
                message: 'Password validation failed',
                errors: validation.errors
            });
            return;
        }

        // Update password (will be hashed by pre-save hook)
        user.password = newPassword;
        await user.save();

        logger.info(`Password changed for user ${req.user._id}`);

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        logger.error('Error changing password:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
};
