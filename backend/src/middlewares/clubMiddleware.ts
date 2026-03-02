import { Request , Response , NextFunction } from 'express';
import { ClubProfile } from '../models/ClubProfile';
import { ClubMember } from '../models/ClubMember';
import { IUser } from '../models/User';

interface AuthenticatedRequest extends Request {
    user?: IUser;
}

const isClubOwner = async ( req : AuthenticatedRequest , res : Response , next : NextFunction): Promise<void> =>{
    try{
        if(!req.user){
            res.status(401).json({'Message':'no Authorized user found '});
            return ;
        }
        const club = await ClubProfile.findOne({user : req.user._id}); 
        if(!club){
            res.status(403).json({'Message' : 'Access denied. User is not a club owner'});
            return;
        }
        next();
    }catch{
        res.status(500).json({'Message' : 'Server error'}); 
    }
};

/**
 * Middleware to check if user is a club admin (either owner or has admin role)
 */
const isClubAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const clubId = req.params.id;
        if (!clubId || Array.isArray(clubId)) {
            res.status(400).json({
                success: false,
                message: 'Valid Club ID is required'
            });
            return;
        }

        // Check if user is the club owner
        const club = await ClubProfile.findById(clubId);
        if (!club) {
            res.status(404).json({
                success: false,
                message: 'Club not found'
            });
            return;
        }

        // Check if user is the owner
        if (club.user.toString() === req.user._id.toString()) {
            next();
            return;
        }

        // Check if user is a member with admin role
        const membership = await ClubMember.findOne({
            clubId: clubId,
            userId: req.user._id,
            role: 'admin'
        });

        if (!membership) {
            res.status(403).json({
                success: false,
                message: 'Access denied. User is not a club admin'
            });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

export { isClubOwner, isClubAdmin };