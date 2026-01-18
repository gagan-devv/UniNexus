import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { logger } from '../utils/logger';

interface DecodedToken extends JwtPayload {
    id: string;
}

// Custom interface that extends Express Request to include user
interface AuthenticatedRequest extends Request {
    user?: IUser;
}

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    let token;

    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer'))
    {
        try 
        {
            token = req.headers.authorization.split(' ')[1];
            
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) 
            {
                res.status(500).json({ message: 'JWT secret not configured.' });
                return;
            }

            if(!token)
            {
                res.status(401).json({ message: 'Not authorized, no token.' });
                return;
            }
            
            // TypeScript-safe JWT verification with explicit type assertion
            const decoded = jwt.verify(token, jwtSecret!) as unknown as JwtPayload & { id: string };
            
            // Validate that the decoded token has the required structure
            if (!decoded || !decoded.id) {
                res.status(401).json({ message: 'Invalid token format.' });
                return;
            }

            const user = await User.findById(decoded.id).select('-password');

            if(!user)
            {
                res.status(401).json({ message: 'Not authorized, user not found.' });
                return;
            }

            req.user = user;
            next();
        } 
        catch (error) 
        {
            logger.error('Token verification error:', error instanceof Error ? error : String(error));
            res.status(401).json({ message: 'Not authorized, token failed.' });
            return;
        }
    }
    else
    {
        res.status(401).json({ message: 'Not authorized, no token.' });
    }
};