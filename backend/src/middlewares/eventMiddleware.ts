import { Request,Response,NextFunction } from "express";
import { IUser } from "../models/User";
import { Event } from "../models/Event";
import { ClubProfile } from "../models/ClubProfile";
interface AuthenticatedRequest extends Request{
    user?: IUser;
}
const isEventOrganiser = async (req : AuthenticatedRequest , res : Response , next : NextFunction): Promise<void> =>{
    try{
        const event = await Event.findById(req.params.id);
        if(!event){
            res.status(404).json({'Message':'Event not found'});
            return;
        }
        const club = await ClubProfile.findOne({user : req.user?._id});
        if(!club){
            res.status(403).json({'Message':'You are not authorized to perform this action'});
            return;
        }
        if(event.organizer.toString()!==club._id.toString()){
            res.status(403).json({'Message':'Access denied. You are not the organizer of this event'});
            return;
        }
        next();
    }catch(error){
        console.error(error);
        res.status(500).json({'Message':'Server Error'});
    }
}
export {isEventOrganiser};