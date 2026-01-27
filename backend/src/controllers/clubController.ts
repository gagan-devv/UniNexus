import { Request, Response } from 'express';
import { ClubProfile } from '../models/ClubProfile';
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
            email: clubData.email
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

        const query: Record<string, unknown> = {};

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

export { registerClub, getAllClubs, getClubById, updateClub, deleteClub };