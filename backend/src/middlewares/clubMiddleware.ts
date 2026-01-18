import { Request , Response , NextFunction } from 'express';
import { ClubProfile } from '../models/ClubProfile';
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
export { isClubOwner };