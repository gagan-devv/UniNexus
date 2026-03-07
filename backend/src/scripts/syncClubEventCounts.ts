import mongoose from 'mongoose';
import { ClubProfile } from '../models/ClubProfile';
import { Event } from '../models/Event';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const syncClubEventCounts = async () => {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('MONGO_URI not found in environment variables');
        }

        await mongoose.connect(mongoUri);
        logger.info('Connected to MongoDB');

        // Get all clubs
        const clubs = await ClubProfile.find({});
        logger.info(`Found ${clubs.length} clubs to sync`);

        for (const club of clubs) {
            // Count events for this club
            const eventCount = await Event.countDocuments({ organizer: club._id });
            
            // Update club stats
            await ClubProfile.findByIdAndUpdate(
                club._id,
                { 
                    $set: { 
                        'stats.eventCount': eventCount 
                    } 
                }
            );

            logger.info(`Updated ${club.name}: ${eventCount} events`);
        }

        logger.info('✅ Successfully synced all club event counts');
        process.exit(0);
    } catch (error) {
        logger.error('Error syncing club event counts:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
};

syncClubEventCounts();
