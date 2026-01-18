import { Response,Request } from 'express';
import {Event} from '../models/Event';
import { IUser } from '../models/User';
import { ClubProfile } from '../models/ClubProfile';

interface AuthenticatedRequest extends Request{
    user?: IUser;
}
const createEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try{
        if(!req.user)
        {
            res.status(401).json({'Message':'User not authenticated'});
            return;
        }
        const club = await ClubProfile.findOne({user : req.user._id});
        if(!club){
            res.status(404).json({'Message':'You must have a registered club to create events'});
            return;
        }
        const {title,description,emeddings,posterUrl,location,category,startTime,endTime,createdAt,updatedAt} = req.body;
        const newEvent = await Event.create({
            organizer: club._id,
            title,
            description,
            emeddings,
            posterUrl,
            location,
            category,
            startTime,
            endTime,
            createdAt,
            updatedAt
        });
        res.status(201).json(newEvent);
    }catch{
        res.status(500).json({'Message':'server Error'});
    }
};
const getAllEvents = async (req: Request, res: Response): Promise<void> => {
    try{
        const events = await Event.find().populate('organizer','clubName');
        res.json(events);
    }catch{
        res.status(500).json({'Message':'server Error'});
    }
};
const getEventById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try{
        const event = await Event.findById(req.params.id).populate('organizer','clubName');
        if(!event){
            res.status(404).json({'Message':'Event notfound'});
            return;
        }else{
            res.json(event);
        }
    }catch{
        res.status(500).json({'Message':'server Error'});
    }
};
const updateEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try{
        const updatedEvent = await Event.findByIdAndUpdate(req.params.id,req.body,{new:true});
        res.json(updatedEvent);
    }catch{
        res.status(500).json({'Message':'server Error'});
    }
};
const deleteEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try{
        await Event.findByIdAndDelete(req.params.id);
        res.json({'Message':'Event Deleted Successfully'});
    }catch{
        res.status(500).json({'Message':'server Error'});
    }
};
export {
    createEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    deleteEvent
};