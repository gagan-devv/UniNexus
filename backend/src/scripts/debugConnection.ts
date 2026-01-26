import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';
import { URL } from 'url';

// Load environment variables
dotenv.config();

async function debugConnection(): Promise<void> {
    logger.info('🔍 Debugging MongoDB Atlas connection...');
    
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        logger.error('❌ MongoDB URI not found in .env file');
        return;
    }
    
    // Parse and display connection details (safely)
    try {
        const url = new URL(MONGO_URI);
        logger.info('📋 Connection Details:');
        logger.info(`   Protocol: ${url.protocol}`);
        logger.info(`   Host: ${url.hostname}`);
        logger.info(`   Database: ${url.pathname.substring(1).split('?')[0]}`);
        logger.info(`   Username: ${url.username}`);
        logger.info(`   Password: ${'*'.repeat(url.password.length)}`);
        
        // Check if it's Atlas format
        if (url.hostname.includes('mongodb.net')) {
            logger.info('✅ Detected MongoDB Atlas connection string');
        } else {
            logger.warn('⚠️  This doesn\'t look like a MongoDB Atlas connection string');
        }
        
    } catch (error) {
        logger.error('❌ Invalid MongoDB URI format:', error instanceof Error ? error.message : String(error));
        return;
    }
    
    logger.info('🔗 Testing basic connectivity...');
    
    // Test with minimal options first
    try {
        mongoose.set('strictQuery', false);
        
        const connection = await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 5000, // Short timeout for quick test
            connectTimeoutMS: 5000,
        });
        
        logger.info('✅ Basic connection successful!');
        logger.info(`🏠 Connected to: ${connection.connection.host || 'MongoDB Atlas'}`);
        logger.info(`📊 Database: ${connection.connection.name || connection.connection.db?.databaseName}`);
        
        // Test a simple operation
        const adminDb = connection.connection.db?.admin();
        if (adminDb) {
            const result = await adminDb.ping();
            logger.info('✅ Database ping successful:', result);
        }
        
        await mongoose.connection.close();
        logger.info('✅ Connection test completed successfully!');
        
    } catch (error) {
        logger.error('❌ Connection failed:', error instanceof Error ? error.message : String(error));
        
        if (error instanceof Error) {
            const errorMsg = error.message.toLowerCase();
            
            if (errorMsg.includes('authentication failed')) {
                logger.error('🔐 Authentication Issue:');
                logger.error('   1. Check username/password in connection string');
                logger.error('   2. Go to Database Access in MongoDB Atlas');
                logger.error('   3. Verify user exists and has correct permissions');
                logger.error('   4. Try resetting the password');
            } else if (errorMsg.includes('ip') || errorMsg.includes('whitelist') || errorMsg.includes('not authorized')) {
                logger.error('🌐 IP Whitelist Issue:');
                logger.error('   1. Go to Network Access in MongoDB Atlas');
                logger.error('   2. Add IP: 14.139.240.252/32');
                logger.error('   3. Or temporarily add 0.0.0.0/0 for testing');
                logger.error('   4. Wait 1-2 minutes for changes to propagate');
            } else if (errorMsg.includes('timeout') || errorMsg.includes('server selection')) {
                logger.error('⏱️  Connection Timeout:');
                logger.error('   1. Check your internet connection');
                logger.error('   2. Try connecting from a different network');
                logger.error('   3. Verify the cluster is running in MongoDB Atlas');
                logger.error('   4. Check if there are any firewall restrictions');
            } else if (errorMsg.includes('dns') || errorMsg.includes('hostname')) {
                logger.error('🌍 DNS/Hostname Issue:');
                logger.error('   1. Check the connection string format');
                logger.error('   2. Verify the cluster hostname in MongoDB Atlas');
                logger.error('   3. Try using a different DNS server');
            }
        }
    }
    
    process.exit(0);
}

debugConnection();