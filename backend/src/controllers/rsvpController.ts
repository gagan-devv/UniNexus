import { Request, Response } from 'express';
import { RSVP, IRSVP } from '../models/RSVP';
import { Event } from '../models/Event';
import { IUser } from '../models/User';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
    user?: IUser;
}

export const createOrUpdateRSVP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { eventId } = req.params;
        const { status } = req.body;

        if (!status || !['going', 'interested', 'not_going', 'waitlist'].includes(status)) {
            res.status(400).json({
                success: false,
                message: 'Valid status is required (going, interested, not_going, waitlist)'
            });
            return;
        }

        const event = await Event.findById(eventId);
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
                message: 'Cannot RSVP to private events'
            });
            return;
        }

        const existingRSVP = await RSVP.findOne({
            user: req.user._id,
            event: eventId as string
        });

        let rsvp: IRSVP;

        if (existingRSVP) {
            existingRSVP.status = status;
            rsvp = await existingRSVP.save();
        } else {
            rsvp = await RSVP.create({
                user: req.user._id,
                event: eventId as string,
                status
            });
        }

        const populatedRSVP = await RSVP.findById(rsvp._id)
            .populate('user', 'username email')
            .populate('event', 'title startTime location');

        res.status(existingRSVP ? 200 : 201).json({
            success: true,
            message: existingRSVP ? 'RSVP updated successfully' : 'RSVP created successfully',
            data: populatedRSVP
        });
    } catch (error) {
        logger.error('Create/Update RSVP error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getUserRSVPs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { status, upcoming = 'true', limit = 20, offset = 0 } = req.query;

        const query: Record<string, unknown> = { user: req.user._id };

        if (status && typeof status === 'string') {
            query.status = status;
        }

        let rsvps = await RSVP.find(query)
            .populate('event', 'title description location startTime endTime category organizer')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(offset));

        if (upcoming === 'true') {
            rsvps = rsvps.filter(rsvp => {
                const event = rsvp.event as unknown as Record<string, unknown>;
                return event && new Date(event.startTime as string) > new Date();
            });
        }

        const total = await RSVP.countDocuments(query);

        res.json({
            success: true,
            data: {
                rsvps,
                pagination: {
                    total,
                    limit: Number(limit),
                    offset: Number(offset),
                    hasMore: Number(offset) + Number(limit) < total
                }
            }
        });
    } catch (error) {
        logger.error('Get user RSVPs error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const getEventRSVPs = async (req: Request, res: Response): Promise<void> => {
    try {
        const { eventId } = req.params;
        const { status, limit = 50, offset = 0 } = req.query;

        const event = await Event.findById(eventId);
        if (!event) {
            res.status(404).json({
                success: false,
                message: 'Event not found'
            });
            return;
        }

        const query: Record<string, unknown> = { event: eventId };

        if (status && typeof status === 'string') {
            query.status = status;
        }

        const rsvps = await RSVP.find(query)
            .populate('user', 'username email firstName lastName')
            .sort({ createdAt: -1 })
            .limit(Number(limit))
            .skip(Number(offset));

        const counts = await RSVP.aggregate([
            { $match: { event: event._id } },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const rsvpCounts = {
            going: 0,
            interested: 0,
            not_going: 0,
            waitlist: 0
        };

        counts.forEach(item => {
            rsvpCounts[item._id as keyof typeof rsvpCounts] = item.count;
        });

        const total = await RSVP.countDocuments(query);

        res.json({
            success: true,
            data: {
                rsvps,
                counts: rsvpCounts,
                pagination: {
                    total,
                    limit: Number(limit),
                    offset: Number(offset),
                    hasMore: Number(offset) + Number(limit) < total
                }
            }
        });
    } catch (error) {
        logger.error('Get event RSVPs error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

export const deleteRSVP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const { eventId } = req.params;

        const rsvp = await RSVP.findOneAndDelete({
            user: req.user._id,
            event: eventId as string
        });

        if (!rsvp) {
            res.status(404).json({
                success: false,
                message: 'RSVP not found'
            });
            return;
        }

        res.json({
            success: true,
            message: 'RSVP deleted successfully'
        });
    } catch (error) {
        logger.error('Delete RSVP error:', error instanceof Error ? error.message : String(error));
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};