import { Request,Response } from 'express';
import { ClubProfile} from '../models/ClubProfile';
import { IUser } from '../models/User';
import { logger } from '../utils/logger';
interface AuthenticatedRequest extends Request {
    user?: IUser;
}
// Register a new club
const registerClub = async (req: AuthenticatedRequest, res : Response): Promise<void>=> {
    try{
        if(!req.user){
            res.status(400).json({'Message':'no Authorized user'});
            return;
        }
        const existingClub = await(ClubProfile.findOne({user : req.user._id}));
        if(existingClub){
           res.status(500).json({'Message' : 'User already have a registered Club'}); 
           return;
        }
        const {name , description,email,logoUrl,socialLinks} = req.body;
        const newClub = await ClubProfile.create({
            user: req.user._id,
            name,
            description,
            email,
            logoUrl,
            socialLinks,
        });
        res.status(201).json({'Message' : 'Club registered successfully', 'Club': newClub});
    }catch(error){
        logger.error('Error registering club:', error instanceof Error ? error : String(error));
        res.status(500).json({'Message' : 'Server error'});
    }
};
// get all clubs to display on the clubs page
const getAllClubs = async (req  : AuthenticatedRequest , res : Response) : Promise<void> =>{
    try{
        const clubs = await ClubProfile.find().populate('user', 'username email');
        res.json(clubs);
    }catch(error){
        logger.error('Error getting all clubs:', error instanceof Error ? error : String(error));
        res.status(500).json({'Message' : 'Server error'});
    }
};
// get specific club by id
const getClubById = async (req : AuthenticatedRequest , res : Response) : Promise<void> =>{
    try{
        const club = await ClubProfile.findById(req.params.id).populate('user', 'username email');
        if(!club){
            res.status(404).json({'Message': 'Club not found'});
            return;
        }else{
            res.json(club);
        }     
    }catch(error){
        logger.error('Error getting club by ID:', error instanceof Error ? error : String(error));
        res.status(500).json({'Message' : 'Server error'});
    }
};
// update existing club
const updateClub = async (req:AuthenticatedRequest , res : Response): Promise<void> =>{
    try{
        const {name,description,logoUrl,socialLinks}= req.body;
        if(!req.user){
            res.status(400).json({'Message':'no Authorized user'});
            return;
        }
        const club  = await ClubProfile.findOne({user : req.user._id});
        if(!club){
            res.status(404).json({'Message': 'Club not found'});
            return;
        }
        else{
            club.name = name || club.name;
            club.description = description || club.description;
            club.logoUrl = logoUrl || club.logoUrl;
            club.socialLinks = socialLinks || club.socialLinks;
            const updateClub = await club.save();// Save the updated club profile to the database
            res.json(updateClub);
        }
    }catch(error){
        logger.error('Error updating club:', error instanceof Error ? error : String(error));
        res.status(500).json({'Message' : 'Server error'});
    }
};
const deleteClub = async ( req : AuthenticatedRequest , res : Response): Promise<void> =>{
    try{
        if(!req.user){
            res.status(401).json({'Message':'Unauthorized user'});
            return;
        }
        const club = await ClubProfile.findOneAndDelete({user : req.user._id});
        if(!club){
            res.status(404).json({'Message': 'Club not found'});
            return;
        }else{
            res.json({'Message' : 'Club deleted successfully'});
        }
    }catch(error){
        logger.error('Error deleting club:', error instanceof Error ? error : String(error));
        res.status(500).json({'Message' : 'Server error'});
    }
};

export {registerClub,getAllClubs,getClubById,updateClub,deleteClub};
