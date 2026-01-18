import mongoose from 'mongoose';
import { logger } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
    try {
        const MONGO_URI = process.env.MONGO_URI;
        if (!MONGO_URI) {
            logger.error('MongoDB URI not found in .env file');
            throw new Error('MongoDB URI not found');
        }

        logger.info('Attempting to connect to MongoDB Atlas...');
        
        // Enhanced mongoose options for MongoDB Atlas
        mongoose.set('strictQuery', false);
        
        const conn = await mongoose.connect(MONGO_URI, {
            // Connection timeout settings
            serverSelectionTimeoutMS: 10000, // 10 seconds
            socketTimeoutMS: 45000, // 45 seconds
            connectTimeoutMS: 10000, // 10 seconds
            
            // Connection pool settings
            maxPoolSize: 10, // Maximum number of connections
            minPoolSize: 5,  // Minimum number of connections
            maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
            
            // Other settings
            family: 4, // Use IPv4, skip trying IPv6
        });
        
        logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
        logger.info(`📊 Database: ${conn.connection.name}`);
        logger.info(`🔗 Connection State: ${conn.connection.readyState}`);
        
        // Connection event listeners
        mongoose.connection.on('connected', () => {
            logger.info('MongoDB connection established');
        });
        
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err instanceof Error ? err : String(err));
        });
        
        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB connection disconnected');
        });
        
        // Graceful shutdown
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed through app termination');
            process.exit(0);
        });
        
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`❌ MongoDB Connection Error: ${errorMessage}`);
        
        // In development, we can continue without DB for testing
        if (process.env.NODE_ENV === 'development') {
            logger.warn('🔄 Continuing in development mode without MongoDB...');
        } else {
            // In production, exit if we can't connect to DB
            logger.error('� Exiting due to MongoDB connection failure in production');
            process.exit(1);
        }
    }
};
