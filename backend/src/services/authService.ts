import jwt from 'jsonwebtoken';
import { IUser } from '../models/User';
import { logger } from '../utils/logger';

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export interface TokenConfig {
    accessTokenExpiry?: string;
    refreshTokenExpiry?: string;
}

export class AuthService {
    private static readonly DEFAULT_ACCESS_TOKEN_EXPIRY = '15m';
    private static readonly DEFAULT_REFRESH_TOKEN_EXPIRY = '7d';

    /**
     * Generate access and refresh token pair
     */
    static generateTokenPair(userId: string, config?: TokenConfig): TokenPair {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET is not configured');
        }

        const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;

        const accessTokenExpiry = config?.accessTokenExpiry || 
            process.env.JWT_ACCESS_EXPIRY || 
            this.DEFAULT_ACCESS_TOKEN_EXPIRY;

        const refreshTokenExpiry = config?.refreshTokenExpiry || 
            process.env.JWT_REFRESH_EXPIRY || 
            this.DEFAULT_REFRESH_TOKEN_EXPIRY;

        const accessToken = jwt.sign(
            { id: userId, type: 'access' },
            jwtSecret,
            { expiresIn: accessTokenExpiry } as jwt.SignOptions
        );

        const refreshToken = jwt.sign(
            { id: userId, type: 'refresh' },
            jwtRefreshSecret,
            { expiresIn: refreshTokenExpiry } as jwt.SignOptions
        );

        return { accessToken, refreshToken };
    }

    /**
     * Generate only access token (for backward compatibility)
     */
    static generateAccessToken(userId: string, expiry?: string): string {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET is not configured');
        }

        const tokenExpiry = expiry || 
            process.env.JWT_ACCESS_EXPIRY || 
            this.DEFAULT_ACCESS_TOKEN_EXPIRY;

        return jwt.sign(
            { id: userId, type: 'access' },
            jwtSecret,
            { expiresIn: tokenExpiry } as jwt.SignOptions
        );
    }

    /**
     * Verify access token
     */
    static verifyAccessToken(token: string): { id: string; type: string } | null {
        try {
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
                throw new Error('JWT_SECRET is not configured');
            }

            const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload & { id: string; type: string };
            
            if (!decoded || !decoded.id || decoded.type !== 'access') {
                return null;
            }

            return { id: decoded.id, type: decoded.type };
        } catch (error) {
            logger.debug('Access token verification failed:', error instanceof Error ? error.message : String(error));
            return null;
        }
    }

    /**
     * Verify refresh token
     */
    static verifyRefreshToken(token: string): { id: string; type: string } | null {
        try {
            const jwtSecret = process.env.JWT_SECRET;
            const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;
            
            if (!jwtRefreshSecret) {
                throw new Error('JWT_REFRESH_SECRET is not configured');
            }

            const decoded = jwt.verify(token, jwtRefreshSecret) as jwt.JwtPayload & { id: string; type: string };
            
            if (!decoded || !decoded.id || decoded.type !== 'refresh') {
                return null;
            }

            return { id: decoded.id, type: decoded.type };
        } catch (error) {
            logger.debug('Refresh token verification failed:', error instanceof Error ? error.message : String(error));
            return null;
        }
    }

    /**
     * Create standardized success response
     */
    static createAuthResponse(user: IUser, tokens: TokenPair) {
        return {
            success: true,
            message: 'Authentication successful',
            data: {
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    year: user.year,
                    major: user.major,
                    bio: user.bio,
                    avatarUrl: user.avatarUrl,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                },
                tokens: {
                    accessToken: tokens.accessToken,
                    refreshToken: tokens.refreshToken,
                    tokenType: 'Bearer'
                }
            }
        };
    }

    /**
     * Create standardized error response
     */
    static createErrorResponse(message: string, statusCode: number = 400, errors?: string[]) {
        return {
            success: false,
            message,
            statusCode,
            errors: errors || []
        };
    }
}