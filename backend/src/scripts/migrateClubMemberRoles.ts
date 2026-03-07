import mongoose from 'mongoose';
import { ClubMember } from '../models/ClubMember';
import { ClubProfile } from '../models/ClubProfile';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migration script to add role field to existing ClubMember records
 * - Sets club owner's role to 'admin'
 * - Sets all other members' role to 'member'
 */
async function migrateClubMemberRoles() {
    try {
        // Connect to MongoDB
        const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/uninexus';
        await mongoose.connect(mongoUri);
        logger.info('Connected to MongoDB for migration');

        // Get all club profiles to identify owners
        const clubs = await ClubProfile.find({}).select('_id user');
        logger.info(`Found ${clubs.length} clubs`);

        let adminCount = 0;
        let memberCount = 0;

        // For each club, set the owner as admin
        for (const club of clubs) {
            // Set club owner as admin
            const ownerResult = await ClubMember.updateMany(
                { clubId: club._id, userId: club.user },
                { $set: { role: 'admin' } }
            );
            adminCount += ownerResult.modifiedCount;

            // Set all other members as 'member'
            const memberResult = await ClubMember.updateMany(
                { clubId: club._id, userId: { $ne: club.user } },
                { $set: { role: 'member' } }
            );
            memberCount += memberResult.modifiedCount;
        }

        // Handle any orphaned club members (clubs that no longer exist)
        const orphanedResult = await ClubMember.updateMany(
            { role: { $exists: false } },
            { $set: { role: 'member' } }
        );
        memberCount += orphanedResult.modifiedCount;

        logger.info(`Migration completed successfully:`);
        logger.info(`- ${adminCount} members set as admin`);
        logger.info(`- ${memberCount} members set as member`);

        await mongoose.connection.close();
        logger.info('Database connection closed');
        process.exit(0);
    } catch (error) {
        logger.error('Migration failed:', error instanceof Error ? error.message : String(error));
        await mongoose.connection.close();
        process.exit(1);
    }
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateClubMemberRoles();
}

export { migrateClubMemberRoles };
