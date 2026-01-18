import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

async function testDatabaseConnection(): Promise<void> {
    logger.info('🧪 Testing MongoDB Atlas connection...');
    
    try {
        const MONGO_URI = process.env.MONGO_URI;
        if (!MONGO_URI) {
            throw new Error('MongoDB URI not found in .env file');
        }

        logger.info('🔗 Connecting to MongoDB Atlas...');
        
        // Connect with proper options
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 15000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 15000,
            maxPoolSize: 10,
            minPoolSize: 5,
            maxIdleTimeMS: 30000,
            family: 4,
        });
        
        logger.info('✅ MongoDB Atlas connection established!');
        logger.info(`🏠 Host: ${mongoose.connection.host || 'MongoDB Atlas'}`);
        logger.info(`📊 Database: ${mongoose.connection.name || mongoose.connection.db?.databaseName || 'uninexus'}`);
        logger.info(`🔗 Connection State: ${mongoose.connection.readyState} (1=connected)`);
        
        // Test basic operations
        const testSchema = new mongoose.Schema({
            name: String,
            timestamp: { type: Date, default: Date.now }
        });
        
        const TestModel = mongoose.model('ConnectionTest', testSchema);
        
        // Create a test document
        logger.info('📝 Creating test document...');
        const testDoc = new TestModel({ name: 'Connection Test' });
        const savedDoc = await testDoc.save();
        logger.info('✅ Test document created successfully');
        logger.info(`📄 Document ID: ${savedDoc._id}`);
        
        // Read the test document
        logger.info('📖 Reading test document...');
        const retrieved = await TestModel.findOne({ name: 'Connection Test' });
        if (retrieved) {
            logger.info('✅ Test document retrieved successfully');
            logger.info(`📄 Retrieved ID: ${retrieved._id}`);
        }
        
        // Count documents
        const count = await TestModel.countDocuments();
        logger.info(`📊 Total test documents: ${count}`);
        
        // Clean up test document
        logger.info('🧹 Cleaning up test document...');
        const deleteResult = await TestModel.deleteOne({ name: 'Connection Test' });
        logger.info(`✅ Deleted ${deleteResult.deletedCount} document(s)`);
        
        logger.info('🎉 All database operations successful!');
        logger.info('🚀 Your MongoDB Atlas connection is working perfectly!');
        
    } catch (error) {
        logger.error('❌ Database connection test failed:', error instanceof Error ? error : String(error));
        
        if (error instanceof Error) {
            if (error.message.includes('IP') || error.message.includes('whitelist') || error.message.includes('not authorized')) {
                logger.error('💡 Solution: Check MongoDB Atlas IP whitelist');
                logger.error('   1. Go to https://cloud.mongodb.com/');
                logger.error('   2. Navigate to Network Access');
                logger.error('   3. Ensure your IP (14.139.240.252) is whitelisted');
            } else if (error.message.includes('authentication') || error.message.includes('credentials')) {
                logger.error('💡 Solution: Check MongoDB Atlas credentials');
                logger.error('   1. Verify username and password in connection string');
                logger.error('   2. Check Database Access in MongoDB Atlas');
            } else if (error.message.includes('timeout')) {
                logger.error('💡 Solution: Connection timeout - check network or try again');
            }
        }
    } finally {
        // Close connection
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            logger.info('🔌 Database connection closed');
        }
        process.exit(0);
    }
}

// Run the test
testDatabaseConnection();