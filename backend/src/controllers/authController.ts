import { Request, Response } from 'express';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { AuthService } from '../services/authService';
import { validateCreateUserInput } from '../validation/userValidation';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
    try {
        logger.debug('Registration attempt for:', req.body.email);

        // Validate input using our validation schema
        const validation = validateCreateUserInput(req.body);
        if (!validation.isValid) {
            logger.warn('Registration validation failed:', validation.errors);
            const errorResponse = AuthService.createErrorResponse(
                'Validation failed',
                400,
                validation.errors
            );
            res.status(400).json(errorResponse);
            return;
        }

        const userData = validation.data!;

        // Check if user already exists
        logger.debug('Checking if user exists...');
        const existingUser = await User.findOne({
            $or: [
                { email: userData.email },
                { username: userData.username }
            ]
        });

        if (existingUser) {
            logger.warn('User already exists:', userData.email);
            const errorResponse = AuthService.createErrorResponse(
                existingUser.email === userData.email 
                    ? 'User with this email already exists'
                    : 'Username is already taken',
                409
            );
            res.status(409).json(errorResponse);
            return;
        }

        // Create user (password hashing is handled by pre-save middleware)
        logger.debug('Creating user...');
        
        // Filter out undefined values for Mongoose
        const cleanUserData: Record<string, unknown> = {
            username: userData.username,
            email: userData.email,
            password: userData.password,
            role: userData.role
        };
        
        // Only add optional fields if they have actual values
        if (userData.firstName) cleanUserData.firstName = userData.firstName;
        if (userData.lastName) cleanUserData.lastName = userData.lastName;
        if (userData.year) cleanUserData.year = userData.year;
        if (userData.major) cleanUserData.major = userData.major;
        if (userData.bio) cleanUserData.bio = userData.bio;
        if (userData.avatarUrl) cleanUserData.avatarUrl = userData.avatarUrl;
        
        const user = await User.create(cleanUserData);

        // Generate token pair
        const tokens = AuthService.generateTokenPair(user._id.toString());

        // Save refresh token to user
        user.refreshToken = tokens.refreshToken;
        await user.save();

        logger.info('User registered successfully:', user.email);
        
        // Create success response
        const response = AuthService.createAuthResponse(user, tokens);
        res.status(201).json(response);

    } catch (error) {
        logger.error('Registration error:', error instanceof Error ? error.message : String(error));
        const errorResponse = AuthService.createErrorResponse(
            'Internal server error during registration',
            500
        );
        res.status(500).json(errorResponse);
    }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Basic input validation
        if (!email || !password) {
            logger.warn('Login attempt with missing credentials');
            const errorResponse = AuthService.createErrorResponse(
                'Email and password are required',
                400,
                ['Email is required', 'Password is required']
            );
            res.status(400).json(errorResponse);
            return;
        }

        // Find user and include password for comparison
        logger.debug('Login attempt for:', email);
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            logger.warn('Login failed - user not found:', email);
            const errorResponse = AuthService.createErrorResponse(
                'Invalid email or password',
                401
            );
            res.status(401).json(errorResponse);
            return;
        }

        // Compare password using the model method
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            logger.warn('Login failed - invalid password for:', email);
            const errorResponse = AuthService.createErrorResponse(
                'Invalid email or password',
                401
            );
            res.status(401).json(errorResponse);
            return;
        }

        // Generate token pair
        const tokens = AuthService.generateTokenPair(user._id.toString());

        // Save refresh token to user
        user.refreshToken = tokens.refreshToken;
        await user.save();

        logger.info('User logged in successfully:', email);

        // Create success response
        const response = AuthService.createAuthResponse(user, tokens);
        res.status(200).json(response);

    } catch (error) {
        logger.error('Login error:', error instanceof Error ? error.message : String(error));
        const errorResponse = AuthService.createErrorResponse(
            'Internal server error during login',
            500
        );
        res.status(500).json(errorResponse);
    }
};

export const refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            logger.warn('Refresh token request without token');
            const errorResponse = AuthService.createErrorResponse(
                'Refresh token is required',
                400
            );
            res.status(400).json(errorResponse);
            return;
        }

        // Verify refresh token
        const decoded = AuthService.verifyRefreshToken(refreshToken);
        if (!decoded) {
            logger.warn('Invalid refresh token provided');
            const errorResponse = AuthService.createErrorResponse(
                'Invalid or expired refresh token',
                401
            );
            res.status(401).json(errorResponse);
            return;
        }

        // Find user and verify stored refresh token
        const user = await User.findById(decoded.id);
        if (!user || user.refreshToken !== refreshToken) {
            logger.warn('Refresh token mismatch for user:', decoded.id);
            const errorResponse = AuthService.createErrorResponse(
                'Invalid refresh token',
                401
            );
            res.status(401).json(errorResponse);
            return;
        }

        // Generate new token pair
        const tokens = AuthService.generateTokenPair(user._id.toString());

        // Update stored refresh token
        user.refreshToken = tokens.refreshToken;
        await user.save();

        logger.info('Tokens refreshed successfully for user:', user.email);

        // Create success response
        const response = AuthService.createAuthResponse(user, tokens);
        res.status(200).json(response);

    } catch (error) {
        logger.error('Token refresh error:', error instanceof Error ? error.message : String(error));
        const errorResponse = AuthService.createErrorResponse(
            'Internal server error during token refresh',
            500
        );
        res.status(500).json(errorResponse);
    }
};

export const logoutUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?._id;

        if (userId) {
            // Clear refresh token from database
            await User.findByIdAndUpdate(userId, { refreshToken: null });
            logger.info('User logged out successfully:', userId);
        }

        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });

    } catch (error) {
        logger.error('Logout error:', error instanceof Error ? error.message : String(error));
        const errorResponse = AuthService.createErrorResponse(
            'Internal server error during logout',
            500
        );
        res.status(500).json(errorResponse);
    }
};