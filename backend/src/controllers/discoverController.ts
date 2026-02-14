import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { ClubProfile } from '../models/ClubProfile';
import { getCacheService } from '../services/cacheService';
import { logger } from '../utils/logger';

interface DiscoverQuery {
    query?: string;
    type?: 'events' | 'clubs' | 'all';
    category?: string;
    dateRange?: string;
}

const discover = async (req: Request, res: Response): Promise<void> => {
    try {
        const { query, type = 'all', category, dateRange } = req.query as DiscoverQuery;

        // Prepare cache filters
        const cacheFilters = {
            query: query || '',
            type,
            category: category || 'all',
            dateRange: dateRange || 'all'
        };

        // Check cache first
        const cacheService = getCacheService();
        const cacheKey = cacheService.generateKey('discover', 'search', cacheService.hashFilters(cacheFilters));
        const cachedData = await cacheService.get(cacheKey);

        if (cachedData) {
            logger.debug('Returning cached discover data');
            res.json({
                success: true,
                data: cachedData
            });
            return;
        }

        // Initialize result containers
        let events: any[] = [];
        let clubs: any[] = [];

        // Search events if type is 'events' or 'all'
        if (type === 'events' || type === 'all') {
            const eventQuery: Record<string, any> = { isPublic: true };

            // Apply text search if query provided
            if (query) {
                eventQuery.$or = [
                    { title: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    { tags: { $in: [new RegExp(query, 'i')] } }
                ];
            }

            // Apply category filter
            if (category) {
                eventQuery.category = category;
            }

            // Apply date range filter
            if (dateRange) {
                const now = new Date();
                switch (dateRange) {
                    case 'today':
                        const endOfDay = new Date(now);
                        endOfDay.setHours(23, 59, 59, 999);
                        eventQuery.startTime = { $gte: now, $lte: endOfDay };
                        break;
                    case 'week':
                        const endOfWeek = new Date(now);
                        endOfWeek.setDate(now.getDate() + 7);
                        eventQuery.startTime = { $gte: now, $lte: endOfWeek };
                        break;
                    case 'month':
                        const endOfMonth = new Date(now);
                        endOfMonth.setMonth(now.getMonth() + 1);
                        eventQuery.startTime = { $gte: now, $lte: endOfMonth };
                        break;
                    case 'upcoming':
                    default:
                        eventQuery.startTime = { $gte: now };
                        break;
                }
            } else {
                // Default to upcoming events
                eventQuery.startTime = { $gte: new Date() };
            }

            events = await Event.find(eventQuery)
                .populate('organizer', 'name email logoUrl')
                .sort({ startTime: 1 })
                .limit(50);
        }

        // Search clubs if type is 'clubs' or 'all'
        if (type === 'clubs' || type === 'all') {
            const clubQuery: Record<string, any> = {};

            // Apply text search if query provided
            if (query) {
                clubQuery.$or = [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } }
                ];
            }

            // Apply category filter
            if (category) {
                clubQuery.category = category;
            }

            clubs = await ClubProfile.find(clubQuery)
                .populate('user', 'username email')
                .sort({ isVerified: -1, createdAt: -1 })
                .limit(50);
        }

        const responseData = {
            events,
            clubs
        };

        // Store in cache with 300s TTL
        await cacheService.set(cacheKey, responseData, 300);

        res.json({
            success: true,
            data: responseData
        });
    } catch (error) {
        logger.error('Discover error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export { discover };
