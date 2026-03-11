import { Response, Request, NextFunction } from 'express';
import { IUser } from '../models/User';

interface AuthenticatedRequest extends Request {
    user?: IUser;
}

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store for rate limiting
// Key: userId, Value: { count, resetTime }
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [userId, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(userId);
        }
    }
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware for voting
 * Limits users to 100 votes per minute
 */
export const voteRateLimit = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
        return;
    }

    const userId = req.user._id.toString();
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxVotes = 100;

    // Get or create rate limit entry
    let entry = rateLimitStore.get(userId);

    if (!entry || now > entry.resetTime) {
        // Create new entry or reset expired entry
        entry = {
            count: 0,
            resetTime: now + windowMs
        };
        rateLimitStore.set(userId, entry);
    }

    // Check if limit exceeded
    if (entry.count >= maxVotes) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
        res.status(429).json({
            success: false,
            message: 'Rate limit exceeded. Maximum 100 votes per minute.',
            retryAfter
        });
        return;
    }

    // Increment count
    entry.count++;
    rateLimitStore.set(userId, entry);

    // Continue to next middleware
    next();
};
