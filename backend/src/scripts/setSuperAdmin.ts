import mongoose from 'mongoose';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script to set a user as super admin
 * Usage: npm run script:setSuperAdmin <email>
 */
async function setSuperAdmin() {
  try {
    const email = process.argv[2];
    
    if (!email) {
      console.error('Usage: npm run script:setSuperAdmin <email>');
      process.exit(1);
    }

    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error('MONGODB_URI not found in environment variables');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    // Update isSuperAdmin field
    user.isSuperAdmin = true;
    await user.save();

    console.log(`✅ Successfully set ${user.email} (${user.username}) as super admin`);
    console.log(`User details:`);
    console.log(`  - ID: ${user._id}`);
    console.log(`  - Username: ${user.username}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Role: ${user.role}`);
    console.log(`  - isSuperAdmin: ${user.isSuperAdmin}`);

    process.exit(0);
  } catch (error) {
    console.error('Error setting super admin:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

setSuperAdmin();
