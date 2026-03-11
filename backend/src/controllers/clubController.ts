import { Request, Response } from 'express';
import { ClubProfile } from '../models/ClubProfile';
import { ClubMember } from '../models/ClubMember';
import { Event } from '../models/Event';
import { IUser } from '../models/User';
import { logger } from '../utils/logger';
import { validateCreateClubProfileInput, validateUpdateClubProfileInput } from '../validation/clubValidation';
import { getCacheService } from '../services/cacheService';

interface AuthenticatedRequest extends Request {
    user?: IUser;
}

const registerClub = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const validation = validateCreateClubProfileInput(req.body);
        if (!validation.isValid) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
            return;
        }

        const existingClub = await ClubProfile.findOne({ user: req.user._id });
        if (existingClub) {
            res.status(409).json({
                success: false,
                message: 'User already has a registered club'
            });
            return;
        }

        const clubData = validation.data!;

        // Filter out undefined values for Mongoose
        const cleanClubData: Record<string, unknown> = {
            user: req.user._id,
            name: clubData.name,
            description: clubData.description,
            email: clubData.email,
            status: 'pending'  // Explicitly set pending status for approval workflow
        };

        // Only add optional fields if they have actual values
        if (clubData.logoUrl) cleanClubData.logoUrl = clubData.logoUrl;
        if (clubData.socialLinks) cleanClubData.socialLinks = clubData.socialLinks;
        if (clubData.category) cleanClubData.category = clubData.category;
        if (clubData.foundedYear) cleanClubData.foundedYear = clubData.foundedYear;
        if (clubData.memberCount !== undefined) cleanClubData.memberCount = clubData.memberCount;
        if (clubData.contactPhone) cleanClubData.contactPhone = clubData.contactPhone;

        const newClub = await ClubProfile.create(cleanClubData);

        const populatedClub = await ClubProfile.findById(newClub._id).populate('user', 'username email');

        // Invalidate club cache
        const cacheService = getCacheService();
        await cacheService.invalidateClubs();

        res.status(201).json({
            success: true,
            message: 'Club registered successfully',
            data: populatedClub
        });
    } catch (error) {
        logger.error('Error registering club:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAllClubs = async (req: Request, res: Response): Promise<void> => {
    try {
        const { verified, category, limit = 20, offset = 0 } = req.query;

        const query: Record<string, unknown> = {
            status: 'approved'  // Only show approved clubs in public listings
        };

        if (verified === 'true') {
            query.isVerified = true;
        }

        if (category && typeof category === 'string') {
            query.category = category;
        }

        // Prepare cache filters
        const cacheFilters = {
            verified: verified || 'all',
            category: category || 'all',
            limit: Number(limit),
            offset: Number(offset)
        };

        // Check cache first
        const cacheService = getCacheService();
        const cachedData = await cacheService.getClubs(cacheFilters);
        
        if (cachedData) {
            logger.debug('Returning cached clubs data');
            res.json({
                success: true,
                data: cachedData
            });
            return;
        }

        // Cache miss - query database
        const clubs = await ClubProfile.find(query)
            .populate('user', 'username email')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(offset));

        const total = await ClubProfile.countDocuments(query);

        const responseData = {
            clubs,
            pagination: {
                total,
                limit: Number(limit),
                offset: Number(offset),
                hasMore: Number(offset) + Number(limit) < total
            }
        };

        // Store in cache with 300s TTL
        await cacheService.setClubs(cacheFilters, responseData, 300);

        res.json({
            success: true,
            data: responseData
        });
    } catch (error) {
        logger.error('Error getting all clubs:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getMyClub = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        // Check cache first
        const cacheService = getCacheService();
        const cacheKey = cacheService.generateKey('clubs', 'my', req.user._id.toString());
        const cachedData = await cacheService.get(cacheKey);
        
        if (cachedData) {
            logger.debug(`Returning cached my club data for user ${req.user._id}`);
            res.json({
                success: true,
                data: cachedData
            });
            return;
        }

        // Cache miss - query database
        const club = await ClubProfile.findOne({ user: req.user._id }).populate('user', 'username email');
        
        // Return null if no club found (user hasn't created a club yet)
        if (!club) {
            res.json({
                success: true,
                data: null
            });
            return;
        }

        // Store in cache with 600s TTL
        await cacheService.set(cacheKey, club, 600);

        res.json({
            success: true,
            data: club
        });
    } catch (error) {
        logger.error('Error getting my club:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getClubById = async (req: Request, res: Response): Promise<void> => {
    try {
        const clubId = req.params.id;
        
        if (!clubId || Array.isArray(clubId)) {
            res.status(400).json({
                success: false,
                message: 'Valid Club ID is required'
            });
            return;
        }
        
        // Check cache first
        const cacheService = getCacheService();
        const cacheKey = cacheService.generateKey('clubs', 'detail', clubId);
        const cachedData = await cacheService.get(cacheKey);
        
        if (cachedData) {
            logger.debug(`Returning cached club detail for ${clubId}`);
            res.json({
                success: true,
                data: cachedData
            });
            return;
        }

        // Cache miss - query database
        const club = await ClubProfile.findById(clubId).populate('user', 'username email');
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }

        // Store in cache with 600s TTL
        await cacheService.set(cacheKey, club, 600);

        res.json({
            success: true,
            data: club
        });
    } catch (error) {
        logger.error('Error getting club by ID:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const updateClub = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const validation = validateUpdateClubProfileInput(req.body);
        if (!validation.isValid) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
            return;
        }

        const club = await ClubProfile.findOne({ user: req.user._id });
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }

        const updatedClub = await ClubProfile.findByIdAndUpdate(
            club._id,
            validation.data,
            { new: true, runValidators: true }
        ).populate('user', 'username email');

        // Invalidate club cache
        const cacheService = getCacheService();
        await cacheService.invalidateClubs();

        res.json({
            success: true,
            message: 'Club updated successfully',
            data: updatedClub
        });
    } catch (error) {
        logger.error('Error updating club:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const deleteClub = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const club = await ClubProfile.findOneAndDelete({ user: req.user._id });
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }

        // Invalidate club cache
        const cacheService = getCacheService();
        await cacheService.invalidateClubs();

        res.json({
            success: true,
            message: 'Club deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting club:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const joinClub = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
                message: 'Valid Club ID is required'
            });
            return;
        }

        // Check if club exists
        const club = await ClubProfile.findById(clubId);
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }

        // Check if user is already a member
        const existingMembership = await ClubMember.findOne({
            userId: req.user._id,
            clubId: clubId
        });

        if (existingMembership) {
            res.status(409).json({
                success: false,
                message: 'User is already a member of this club'
            });
            return;
        }

        // Create membership
        const membership = await ClubMember.create({
            userId: req.user._id,
            clubId: clubId
        });

        // Update member count
        await ClubProfile.findByIdAndUpdate(clubId, {
            $inc: { memberCount: 1, 'stats.memberCount': 1 }
        });

        // Invalidate club cache
        const cacheService = getCacheService();
        await cacheService.invalidateClubs();

        res.status(201).json({
            success: true,
            message: 'Successfully joined club',
            data: membership
        });
    } catch (error) {
        logger.error('Error joining club:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const leaveClub = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
                message: 'Valid Club ID is required'
            });
            return;
        }

        // Check if club exists
        const club = await ClubProfile.findById(clubId);
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }

        // Find and delete membership
        const membership = await ClubMember.findOneAndDelete({
            userId: req.user._id,
            clubId: clubId
        });

        if (!membership) {
            res.status(404).json({
                success: false,
                message: 'User is not a member of this club'
            });
            return;
        }

        // Update member count (ensure it doesn't go below 0)
        await ClubProfile.findByIdAndUpdate(clubId, {
            $inc: { memberCount: -1, 'stats.memberCount': -1 }
        });

        // Ensure counts don't go negative
        await ClubProfile.findByIdAndUpdate(clubId, {
            $max: { memberCount: 0, 'stats.memberCount': 0 }
        });

        // Invalidate club cache
        const cacheService = getCacheService();
        await cacheService.invalidateClubs();

        res.json({
            success: true,
            message: 'Successfully left club'
        });
    } catch (error) {
        logger.error('Error leaving club:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getClubMembers = async (req: Request, res: Response): Promise<void> => {
    try {
        const clubId = req.params.id;
        
        if (!clubId || Array.isArray(clubId)) {
            res.status(400).json({
                success: false,
                message: 'Valid Club ID is required'
            });
            return;
        }

        // Check if club exists
        const club = await ClubProfile.findById(clubId);
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }

        // Get members
        const members = await ClubMember.find({ clubId })
            .populate('userId', 'username firstName lastName avatarUrl')
            .sort({ joinedAt: -1 });

        res.json({
            success: true,
            data: {
                members,
                count: members.length
            }
        });
    } catch (error) {
        logger.error('Error getting club members:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getClubEvents = async (req: Request, res: Response): Promise<void> => {
    try {
        const clubId = req.params.id;
        
        if (!clubId || Array.isArray(clubId)) {
            res.status(400).json({
                success: false,
                message: 'Valid Club ID is required'
            });
            return;
        }

        // Check if club exists
        const club = await ClubProfile.findById(clubId);
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }

        // Get upcoming events organized by this club
        const events = await Event.find({
            organizer: clubId,
            isPublic: true,
            startTime: { $gte: new Date() }
        })
            .sort({ startTime: 1 })
            .limit(10);

        res.json({
            success: true,
            data: {
                events,
                count: events.length
            }
        });
    } catch (error) {
        logger.error('Error getting club events:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Add a member to a club (admin only)
 */
const addClubMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const clubId = req.params.id;
        const { userId } = req.body;

        if (!clubId || Array.isArray(clubId)) {
            res.status(400).json({
                success: false,
                message: 'Valid Club ID is required'
            });
            return;
        }

        if (!userId) {
            res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
            return;
        }

        // Check if club exists
        const club = await ClubProfile.findById(clubId);
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }

        // Check if user exists
        const { User } = await import('../models/User');
        const targetUser = await User.findById(userId);
        if (!targetUser) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        // Check if user is already a member
        const existingMembership = await ClubMember.findOne({
            userId: userId,
            clubId: clubId
        });

        if (existingMembership) {
            res.status(409).json({
                success: false,
                message: 'User is already a member of this club'
            });
            return;
        }

        // Add user as member with role 'member'
        await ClubMember.create({
            userId: userId,
            clubId: clubId,
            role: 'member'
        });

        // Update member count
        await ClubProfile.findByIdAndUpdate(clubId, {
            $inc: { memberCount: 1, 'stats.memberCount': 1 }
        });

        // Create audit log entry
        const { AuditLog } = await import('../models/AuditLog');
        await AuditLog.create({
            action: 'member_added',
            actorId: req.user._id,
            targetUserId: userId,
            clubId: clubId,
            details: {
                role: 'member'
            }
        });

        // Get updated member list
        const members = await ClubMember.find({ clubId })
            .populate('userId', 'username firstName lastName avatarUrl')
            .sort({ joinedAt: -1 });

        // Invalidate club cache
        const cacheService = getCacheService();
        await cacheService.invalidateClubs();

        res.status(201).json({
            success: true,
            message: 'Member added successfully',
            data: {
                members
            }
        });
    } catch (error) {
        logger.error('Error adding club member:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Remove a member from a club (admin only)
 */
const removeClubMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const clubId = req.params.id;
        const targetUserId = req.params.userId;

        if (!clubId || Array.isArray(clubId)) {
            res.status(400).json({
                success: false,
                message: 'Valid Club ID is required'
            });
            return;
        }

        if (!targetUserId || Array.isArray(targetUserId)) {
            res.status(400).json({
                success: false,
                message: 'Valid User ID is required'
            });
            return;
        }

        // Check if club exists
        const club = await ClubProfile.findById(clubId);
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }

        // Check if member exists in club
        const membership = await ClubMember.findOne({
            userId: targetUserId,
            clubId: clubId
        });

        if (!membership) {
            res.status(404).json({
                success: false,
                message: 'User is not a member of this club'
            });
            return;
        }

        // Prevent removing last admin
        if (membership.role === 'admin') {
            const adminCount = await ClubMember.countDocuments({
                clubId: clubId,
                role: 'admin'
            });

            if (adminCount <= 1) {
                res.status(400).json({
                    success: false,
                    message: 'Cannot remove the last admin from the club'
                });
                return;
            }
        }

        // Remove member
        await ClubMember.findByIdAndDelete(membership._id);

        // Update member count
        await ClubProfile.findByIdAndUpdate(clubId, {
            $inc: { memberCount: -1, 'stats.memberCount': -1 }
        });

        // Ensure counts don't go negative
        await ClubProfile.findByIdAndUpdate(clubId, {
            $max: { memberCount: 0, 'stats.memberCount': 0 }
        });

        // Create audit log entry
        const { AuditLog } = await import('../models/AuditLog');
        await AuditLog.create({
            action: 'member_removed',
            actorId: req.user._id,
            targetUserId: targetUserId,
            clubId: clubId,
            details: {
                previousRole: membership.role
            }
        });

        // Get updated member list
        const members = await ClubMember.find({ clubId })
            .populate('userId', 'username firstName lastName avatarUrl')
            .sort({ joinedAt: -1 });

        // Invalidate club cache
        const cacheService = getCacheService();
        await cacheService.invalidateClubs();

        res.json({
            success: true,
            message: 'Member removed successfully',
            data: {
                members
            }
        });
    } catch (error) {
        logger.error('Error removing club member:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * Update a member's role (admin only)
 */
const updateMemberRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const clubId = req.params.id;
        const targetUserId = req.params.userId;
        const { role } = req.body;

        if (!clubId || Array.isArray(clubId)) {
            res.status(400).json({
                success: false,
                message: 'Valid Club ID is required'
            });
            return;
        }

        if (!targetUserId || Array.isArray(targetUserId)) {
            res.status(400).json({
                success: false,
                message: 'Valid User ID is required'
            });
            return;
        }

        if (!role || !['admin', 'member'].includes(role)) {
            res.status(400).json({
                success: false,
                message: 'Valid role is required (admin or member)'
            });
            return;
        }

        // Check if club exists
        const club = await ClubProfile.findById(clubId);
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }

        // Check if member exists in club
        const membership = await ClubMember.findOne({
            userId: targetUserId,
            clubId: clubId
        });

        if (!membership) {
            res.status(404).json({
                success: false,
                message: 'User is not a member of this club'
            });
            return;
        }

        // Prevent removing last admin (if changing admin to member)
        if (membership.role === 'admin' && role === 'member') {
            const adminCount = await ClubMember.countDocuments({
                clubId: clubId,
                role: 'admin'
            });

            if (adminCount <= 1) {
                res.status(400).json({
                    success: false,
                    message: 'Cannot change role of the last admin'
                });
                return;
            }
        }

        const previousRole = membership.role;

        // Update member role
        membership.role = role;
        await membership.save();

        // Create audit log entry
        const { AuditLog } = await import('../models/AuditLog');
        await AuditLog.create({
            action: 'role_changed',
            actorId: req.user._id,
            targetUserId: targetUserId,
            clubId: clubId,
            details: {
                previousRole,
                newRole: role
            }
        });

        // Get updated member information
        const updatedMember = await ClubMember.findById(membership._id)
            .populate('userId', 'username firstName lastName avatarUrl');

        // Invalidate club cache
        const cacheService = getCacheService();
        await cacheService.invalidateClubs();

        res.json({
            success: true,
            message: 'Member role updated successfully',
            data: updatedMember
        });
    } catch (error) {
        logger.error('Error updating member role:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export { 
    registerClub, 
    getAllClubs, 
    getMyClub, 
    getClubById, 
    updateClub, 
    deleteClub, 
    joinClub, 
    leaveClub, 
    getClubMembers, 
    getClubEvents,
    addClubMember,
    removeClubMember,
    updateMemberRole
};
