import { Request, Response } from 'express';
import { ClubProfile } from '../models/ClubProfile';
import { IUser } from '../models/User';
import { logger } from '../utils/logger';
import { validateCreateClubProfileInput, validateUpdateClubProfileInput } from '../validation/clubValidation';

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

        const clubs = await ClubProfile.find(query)
            .populate('user', 'username email')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(offset));

        const total = await ClubProfile.countDocuments(query);

        res.json({
            success: true,
            data: {
                clubs,
                pagination: {
                    total,
                    limit: Number(limit),
                    offset: Number(offset),
                    hasMore: Number(offset) + Number(limit) < total
                }
            }
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
        const club = await ClubProfile.findById(req.params.id).populate('user', 'username email');
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }

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