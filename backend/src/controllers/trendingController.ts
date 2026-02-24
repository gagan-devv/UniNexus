import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { ClubProfile } from '../models/ClubProfile';
import { getCacheService } from '../services/cacheService';
import { logger } from '../utils/logger';

/**
 * Calculate engagement score for an event
 * Formula: (attendeeCount * 2) + (viewCount * 0.5) + recencyBonus
 */
const calculateEventEngagementScore = (event: any): number => {
    const attendeeCount = event.stats?.attendeeCount || 0;
    const viewCount = event.stats?.viewCount || 0;
    
    // Calculate recency bonus (events starting sooner get higher bonus)
    const now = new Date();
    const startTime = new Date(event.startTime);
    const daysUntilEvent = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    // Recency bonus: max 50 points for events within 7 days, decreasing linearly
    let recencyBonus = 0;
    if (daysUntilEvent <= 7 && daysUntilEvent >= 0) {
        recencyBonus = 50 * (1 - daysUntilEvent / 7);
    } else if (daysUntilEvent > 7 && daysUntilEvent <= 30) {
        recencyBonus = 10 * (1 - (daysUntilEvent - 7) / 23);
    }
    
    return (attendeeCount * 2) + (viewCount * 0.5) + recencyBonus;
};

/**
 * Calculate engagement score for a club
 * Formula: (memberCount * 3) + (eventCount * 1.5) + activityBonus
 */
const calculateClubEngagementScore = (club: any): number => {
    const memberCount = club.stats?.memberCount || 0;
    const eventCount = club.stats?.eventCount || 0;
    
    // Activity bonus based on recent updates (clubs updated recently get higher bonus)
    const now = new Date();
    const updatedAt = new Date(club.updatedAt);
    const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Activity bonus: max 30 points for clubs updated within 7 days, decreasing linearly
    let activityBonus = 0;
    if (daysSinceUpdate <= 7) {
        activityBonus = 30 * (1 - daysSinceUpdate / 7);
    } else if (daysSinceUpdate > 7 && daysSinceUpdate <= 30) {
        activityBonus = 10 * (1 - (daysSinceUpdate - 7) / 23);
    }
    
    return (memberCount * 3) + (eventCount * 1.5) + activityBonus;
};

const getTrending = async (req: Request, res: Response): Promise<void> => {
    try {
        // Check cache first
        const cacheService = getCacheService();
        const cacheKey = 'trending:all';
        const cachedData = await cacheService.get(cacheKey);

        if (cachedData) {
            logger.debug('Returning cached trending data');
            res.json({
                success: true,
                data: cachedData
            });
            return;
        }

        // Query trending events
        const now = new Date();
        const events = await Event.find({
            isPublic: true,
            startTime: { $gte: now }
        })
            .populate('organizer', 'name email logoUrl')
            .lean();

        // Calculate engagement scores and sort
        const eventsWithScores = events.map(event => ({
            ...event,
            engagementScore: calculateEventEngagementScore(event)
        }));

        const trendingEvents = eventsWithScores
            .sort((a, b) => b.engagementScore - a.engagementScore)
            .slice(0, 20);

        // Query trending clubs
        const clubs = await ClubProfile.find({
            isVerified: true
        })
            .populate('user', 'username email')
            .lean();

        // Calculate engagement scores and sort
        const clubsWithScores = clubs.map(club => ({
            ...club,
            engagementScore: calculateClubEngagementScore(club)
        }));

        const trendingClubs = clubsWithScores
            .sort((a, b) => b.engagementScore - a.engagementScore)
            .slice(0, 20);

        const responseData = {
            events: trendingEvents,
            clubs: trendingClubs
        };

        // Store in cache with 600s TTL
        await cacheService.set(cacheKey, responseData, 600);

        res.json({
            success: true,
            data: responseData
        });
    } catch (error) {
        logger.error('Trending error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export { getTrending };
