import { Request, Response } from 'express';
import { ClubProfile } from '../models/ClubProfile';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../utils/logger';

/**
 * Get club statistics
 * GET /api/admin/clubs/stats
 */
export const getClubStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const [pending, approved, rejected] = await Promise.all([
            ClubProfile.countDocuments({ status: 'pending' }),
            ClubProfile.countDocuments({ status: 'approved' }),
            ClubProfile.countDocuments({ status: 'rejected' })
        ]);

        res.status(200).json({
            success: true,
            data: {
                pending,
                approved,
                rejected
            }
        });
    } catch (error) {
        logger.error('Error fetching club stats:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Failed to fetch club statistics',
            errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }]
        });
    }
};

/**
 * Get all pending clubs
 * GET /api/admin/clubs/pending
 */
export const getPendingClubs = async (req: Request, res: Response): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const search = req.query.search as string;
        
        const skip = (page - 1) * limit;
        
        // Build query
        const query: Record<string, unknown> = { status: 'pending' };
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Fetch pending clubs with pagination
        const [clubs, total] = await Promise.all([
            ClubProfile.find(query)
                .populate('user', 'username email firstName lastName')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ClubProfile.countDocuments(query)
        ]);
        
        const totalPages = Math.ceil(total / limit);
        
        res.status(200).json({
            success: true,
            data: {
                clubs,
                total,
                page,
                totalPages
            }
        });
        
    } catch (error) {
        logger.error('Error fetching pending clubs:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Failed to fetch pending clubs',
            errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }]
        });
    }
};

/**
 * Approve a club
 * POST /api/admin/clubs/:id/approve
 */
export const approveClub = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const adminId = req.user!._id;
        
        // Find the club
        const club = await ClubProfile.findById(id);
        
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }
        
        // Check if club is pending
        if (club.status !== 'pending') {
            res.status(409).json({
                success: false,
                message: `Club is already ${club.status}`
            });
            return;
        }
        
        // Update club status
        club.status = 'approved';
        club.approvedBy = adminId;
        club.approvedAt = new Date();
        await club.save();
        
        // Create audit log
        await AuditLog.create({
            action: 'club_approved',
            actorId: adminId,
            clubId: club._id,
            details: {
                clubName: club.name,
                clubOwner: club.user
            },
            timestamp: new Date()
        });
        
        logger.info(`Club ${club._id} approved by admin ${adminId}`);
        
        res.status(200).json({
            success: true,
            message: 'Club approved successfully',
            data: club
        });
        
    } catch (error) {
        logger.error('Error approving club:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Failed to approve club',
            errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }]
        });
    }
};

/**
 * Reject a club
 * POST /api/admin/clubs/:id/reject
 */
export const rejectClub = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.user!._id;
        
        // Validate reason
        if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
            res.status(400).json({
                success: false,
                message: 'Rejection reason is required',
                errors: [{ field: 'reason', message: 'Rejection reason cannot be empty' }]
            });
            return;
        }
        
        if (reason.length > 500) {
            res.status(400).json({
                success: false,
                message: 'Rejection reason is too long',
                errors: [{ field: 'reason', message: 'Rejection reason cannot exceed 500 characters' }]
            });
            return;
        }
        
        // Find the club
        const club = await ClubProfile.findById(id);
        
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }
        
        // Check if club is pending
        if (club.status !== 'pending') {
            res.status(409).json({
                success: false,
                message: `Club is already ${club.status}`
            });
            return;
        }
        
        // Update club status
        club.status = 'rejected';
        club.rejectedBy = adminId;
        club.rejectedAt = new Date();
        club.rejectionReason = reason.trim();
        await club.save();
        
        // Create audit log
        await AuditLog.create({
            action: 'club_rejected',
            actorId: adminId,
            clubId: club._id,
            details: {
                clubName: club.name,
                clubOwner: club.user,
                reason: reason.trim()
            },
            timestamp: new Date()
        });
        
        logger.info(`Club ${club._id} rejected by admin ${adminId}`);
        
        res.status(200).json({
            success: true,
            message: 'Club rejected successfully',
            data: club
        });
        
    } catch (error) {
        logger.error('Error rejecting club:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Failed to reject club',
            errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }]
        });
    }
};
