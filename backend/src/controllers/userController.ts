import { Request, Response } from 'express';
import { User, IUser } from '../models/User';
import { logger } from '../utils/logger';
import { getCacheService } from '../services/cacheService';

interface AuthenticatedRequest extends Request {
    user?: IUser;
}

export const getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id?.toString();
        
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Check cache first
        const cacheService = getCacheService();
        const cachedProfile = await cacheService.getUserProfile(userId);
        
        if (cachedProfile) {
            logger.debug(`Returning cached user profile for ${userId}`);
            res.json({
                success: true,
                data: cachedProfile
            });
            return;
        }

        // Cache miss - query database
        const user = await User.findById(userId).select('-password -refreshToken');
        
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        // Store in cache with 600s TTL
        await cacheService.setUserProfile(userId, user, 600);

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        logger.error('Get user profile error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const updateUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const allowedUpdates = ['firstName', 'lastName', 'year', 'major', 'bio', 'avatarUrl'];
        const updates: Record<string, unknown> = {};
        
        Object.keys(req.body).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = req.body[key];
            }
        });

        if (Object.keys(updates).length === 0) {
            res.status(400).json({
                success: false,
                message: 'No valid fields to update'
            });
            return;
        }

        const userId = req.user?._id?.toString();
        
        const user = await User.findByIdAndUpdate(
            req.user?._id, 
            updates, 
            { new: true, runValidators: true }
        ).select('-password -refreshToken');
        
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        // Invalidate user profile cache
        if (userId) {
            const cacheService = getCacheService();
            await cacheService.invalidateUserProfile(userId);
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    } catch (error) {
        logger.error('Update user profile error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const deleteUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const user = await User.findByIdAndDelete(req.user?._id);
        
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        logger.error('Delete user profile error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'Access denied. Admin role required'
            });
            return;
        }

        const { limit = 20, offset = 0, role } = req.query;
        
        const query: Record<string, unknown> = {};
        if (role && typeof role === 'string') {
            query.role = role;
        }

        const users = await User.find(query)
            .select('-password -refreshToken')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(offset));

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            data: {
                users,
                pagination: {
                    total,
                    limit: Number(limit),
                    offset: Number(offset),
                    hasMore: Number(offset) + Number(limit) < total
                }
            }
        });
    } catch (error) {
        logger.error('Get all users error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};