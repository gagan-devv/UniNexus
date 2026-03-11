import { Request, Response } from 'express';
import { ClubProfile } from '../models/ClubProfile';
import { Notification } from '../models/Notification';
import { IUser } from '../models/User';
import { logger } from '../utils/logger';
import { getCacheService } from '../services/cacheService';

interface AuthenticatedRequest extends Request {
    user?: IUser;
}

export const getPendingClubs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        
        const query: Record<string, unknown> = { status: 'pending' };
        
        if (search && typeof search === 'string') {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        const clubs = await ClubProfile.find(query)
            .populate('user', 'username email firstName lastName')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit));

        const total = await ClubProfile.countDocuments(query);

        res.json({
            success: true,
            data: {
                clubs,
                total,
                page: Number(page),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    } catch (error) {
        logger.error('Get pending clubs error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getClubStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        const pending = await ClubProfile.countDocuments({ status: 'pending' });
        const approved = await ClubProfile.countDocuments({ status: 'approved' });
        const rejected = await ClubProfile.countDocuments({ status: 'rejected' });

        res.json({
            success: true,
            data: {
                pending,
                approved,
                rejected
            }
        });
    } catch (error) {
        logger.error('Get club stats error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const approveClub = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const clubId = req.params.id;
        
        if (!clubId || Array.isArray(clubId)) {
            res.status(400).json({
                success: false,
                message: 'Valid club ID is required'
            });
            return;
        }
        
        const club = await ClubProfile.findById(clubId);

        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }

        if (club.status !== 'pending') {
            res.status(400).json({
                success: false,
                message: `Club is already ${club.status}`
            });
            return;
        }

        // Update club status
        club.status = 'approved';
        club.approvedBy = req.user._id;
        club.approvedAt = new Date();
        await club.save();

        // Create notification for club owner
        await Notification.create({
            userId: club.user,
            type: 'club',
            title: 'Club Approved',
            content: `Your club "${club.name}" has been approved and is now live!`,
            relatedId: clubId,
            relatedType: 'club'
        });

        // Invalidate club cache
        const cacheService = getCacheService();
        await cacheService.invalidateClubs();

        res.json({
            success: true,
            message: 'Club approved successfully',
            data: club
        });
    } catch (error) {
        logger.error('Approve club error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const rejectClub = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const clubId = req.params.id;
        const { reason } = req.body;

        if (!clubId || Array.isArray(clubId)) {
            res.status(400).json({
                success: false,
                message: 'Valid club ID is required'
            });
            return;
        }

        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
            return;
        }

        const club = await ClubProfile.findById(clubId);

        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }

        if (club.status !== 'pending') {
            res.status(400).json({
                success: false,
                message: `Club is already ${club.status}`
            });
            return;
        }

        // Update club status
        club.status = 'rejected';
        club.rejectedBy = req.user._id;
        club.rejectedAt = new Date();
        club.rejectionReason = reason.trim();
        await club.save();

        // Create notification for club owner
        await Notification.create({
            userId: club.user,
            type: 'club',
            title: 'Club Registration Rejected',
            content: `Your club "${club.name}" registration was rejected. Reason: ${reason.trim()}`,
            relatedId: clubId,
            relatedType: 'club'
        });

        // Invalidate club cache
        const cacheService = getCacheService();
        await cacheService.invalidateClubs();

        res.json({
            success: true,
            message: 'Club rejected successfully',
            data: club
        });
    } catch (error) {
        logger.error('Reject club error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
