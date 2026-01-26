import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User';
import { logger } from '../utils/logger';
import { AuthService } from '../services/authService';

// Extend Express Request interface to include user
declare global {
    namespace Express {
        interface Request {
            user?: IUser;
        }
    }
}

/**
 * Middleware to protect routes - requires valid access token
 */
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let token: string | undefined;

        // Extract token from Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            logger.warn('Access attempt without token');
            const errorResponse = AuthService.createErrorResponse(
                'Access denied. No token provided',
                401
            );
            res.status(401).json(errorResponse);
            return;
        }

        // Verify access token
        const decoded = AuthService.verifyAccessToken(token);
        if (!decoded) {
            logger.warn('Access attempt with invalid token');
            const errorResponse = AuthService.createErrorResponse(
                'Access denied. Invalid token',
                401
            );
            res.status(401).json(errorResponse);
            return;
        }

        // Find user and attach to request
        const user = await User.findById(decoded.id).select('-password -refreshToken');
        if (!user) {
            logger.warn('Access attempt with token for non-existent user:', decoded.id);
            const errorResponse = AuthService.createErrorResponse(
                'Access denied. User not found',
                401
            );
            res.status(401).json(errorResponse);
            return;
        }

        req.user = user;
        next();

    } catch (error) {
        logger.error('Authentication middleware error:', error instanceof Error ? error.message : String(error));
        const errorResponse = AuthService.createErrorResponse(
            'Authentication failed',
            401
        );
        res.status(401).json(errorResponse);
    }
};

/**
 * Middleware to restrict access to specific roles
 */
export const restrictTo = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            logger.error('Role check attempted without authenticated user');
            const errorResponse = AuthService.createErrorResponse(
                'Authentication required',
                401
            );
            res.status(401).json(errorResponse);
            return;
        }

        if (!roles.includes(req.user.role)) {
            logger.warn(`Access denied for role ${req.user.role}. Required: ${roles.join(', ')}`);
            const errorResponse = AuthService.createErrorResponse(
                'Access denied. Insufficient permissions',
                403
            );
            res.status(403).json(errorResponse);
            return;
        }

        next();
    };
};

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = restrictTo('admin');

/**
 * Middleware to check if user is student or admin
 */
export const requireStudent = restrictTo('student', 'admin');

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for routes that work differently for authenticated vs anonymous users
 */
export const optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let token: string | undefined;

        // Extract token from Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            // No token provided, continue without user
            next();
            return;
        }

        // Verify access token
        const decoded = AuthService.verifyAccessToken(token);
        if (!decoded) {
            // Invalid token, continue without user
            next();
            return;
        }

        // Find user and attach to request
        const user = await User.findById(decoded.id).select('-password -refreshToken');
        if (user) {
            req.user = user;
        }

        next();

    } catch (error) {
        logger.debug('Optional auth error (continuing without user):', error instanceof Error ? error.message : String(error));
        // Continue without user on any error
        next();
    }
};