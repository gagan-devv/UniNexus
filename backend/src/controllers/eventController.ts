import { Response, Request } from 'express';
import { Event } from '../models/Event';
import { RSVP } from '../models/RSVP';
import { IUser } from '../models/User';
import { ClubProfile } from '../models/ClubProfile';
import { logger } from '../utils/logger';
import { validateCreateEventInput, validateUpdateEventInput } from '../validation/eventValidation';
import { getCacheService } from '../services/cacheService';

interface AuthenticatedRequest extends Request {
    user?: IUser;
}

const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const validation = validateCreateEventInput(req.body);
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
            res.status(403).json({
                success: false,
                message: 'You must have a registered club to create events'
            });
            return;
        }

        const eventData = validation.data!;
        const newEvent = await Event.create({
            ...eventData,
            organizer: club._id
        });

        const populatedEvent = await Event.findById(newEvent._id).populate('organizer', 'name email');

        // Invalidate event cache
        const cacheService = getCacheService();
        await cacheService.invalidateEvents();

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: populatedEvent
        });
    } catch (error) {
        logger.error('Event creation error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getAllEvents = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category, limit = 20, offset = 0, upcoming = 'true' } = req.query;
        
        const query: Record<string, unknown> = {};
        
        if (category && typeof category === 'string') {
            query.category = category;
        }
        
        if (upcoming === 'true') {
            query.startTime = { $gte: new Date() };
        }
        
        query.isPublic = true;

        // Prepare cache filters
        const cacheFilters = {
            category: category || 'all',
            limit: Number(limit),
            offset: Number(offset),
            upcoming: upcoming
        };

        // Check cache first
        const cacheService = getCacheService();
        const cachedData = await cacheService.getEvents(cacheFilters);
        
        if (cachedData) {
            logger.debug('Returning cached events data');
            res.json({
                success: true,
                data: cachedData
            });
            return;
        }

        // Cache miss - query database
        const events = await Event.find(query)
            .populate('organizer', 'name email logoUrl')
            .sort({ startTime: 1 })
            .limit(Number(limit))
            .skip(Number(offset));

        const total = await Event.countDocuments(query);

        const responseData = {
            events,
            pagination: {
                total,
                limit: Number(limit),
                offset: Number(offset),
                hasMore: Number(offset) + Number(limit) < total
            }
        };

        // Store in cache with 300s TTL
        await cacheService.setEvents(cacheFilters, responseData, 300);

        res.json({
            success: true,
            data: responseData
        });
    } catch (error) {
        logger.error('Get all events error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const getEventById = async (req: Request, res: Response): Promise<void> => {
    try {
        const eventId = req.params.id;
        
        if (!eventId || Array.isArray(eventId)) {
            res.status(400).json({
                success: false,
                message: 'Valid Event ID is required'
            });
            return;
        }
        
        // Check cache first
        const cacheService = getCacheService();
        const cacheKey = cacheService.generateKey('events', 'detail', eventId);
        const cachedData = await cacheService.get(cacheKey);
        
        if (cachedData) {
            logger.debug(`Returning cached event detail for ${eventId}`);
            res.json({
                success: true,
                data: cachedData
            });
            return;
        }

        // Cache miss - query database
        const event = await Event.findById(eventId)
            .populate('organizer', 'name email logoUrl isVerified');
        
        if (!event) {
            res.status(404).json({
                success: false,
                message: 'Event not found'
            });
            return;
        }

        if (!event.isPublic) {
            res.status(403).json({
                success: false,
                message: 'This event is private'
            });
            return;
        }

        const rsvpCounts = await RSVP.aggregate([
            { $match: { event: event._id } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const counts = {
            going: 0,
            interested: 0,
            not_going: 0,
            waitlist: 0
        };

        rsvpCounts.forEach(item => {
            counts[item._id as keyof typeof counts] = item.count;
        });

        const responseData = {
            ...event.toObject(),
            rsvpCounts: counts
        };

        // Store in cache with 600s TTL
        await cacheService.set(cacheKey, responseData, 600);

        res.json({
            success: true,
            data: responseData
        });
    } catch (error) {
        logger.error('Get event by ID error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const updateEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const validation = validateUpdateEventInput(req.body);
        if (!validation.isValid) {
            res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: validation.errors
            });
            return;
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            req.params.id,
            validation.data,
            { new: true, runValidators: true }
        ).populate('organizer', 'name email');

        if (!updatedEvent) {
            res.status(404).json({
                success: false,
                message: 'Event not found'
            });
            return;
        }

        // Invalidate event cache
        const cacheService = getCacheService();
        await cacheService.invalidateEvents();

        res.json({
            success: true,
            message: 'Event updated successfully',
            data: updatedEvent
        });
    } catch (error) {
        logger.error('Update event error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const deleteEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const event = await Event.findById(req.params.id);
        if (!event) {
            res.status(404).json({
                success: false,
                message: 'Event not found'
            });
            return;
        }

        await RSVP.deleteMany({ event: event._id });
        await Event.findByIdAndDelete(req.params.id);

        // Invalidate event cache
        const cacheService = getCacheService();
        await cacheService.invalidateEvents();

        res.json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        logger.error('Delete event error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export {
    createEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    deleteEvent
};