import dotenv from 'dotenv';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';
import dns from 'dns';
import { promisify } from 'util';
import { URL } from 'url';

dotenv.config();

const dnsLookup = promisify(dns.lookup);

async function checkAtlasStatus(): Promise<void> {
    logger.info('🔍 Comprehensive MongoDB Atlas Status Check...');
    
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        logger.error('❌ MongoDB URI not found');
        return;
    }
    
    try {
        const url = new URL(MONGO_URI);
        const hostname = url.hostname;
        
        logger.info('📋 Cluster Information:');
        logger.info(`   Hostname: ${hostname}`);
        logger.info(`   Database: ${url.pathname.substring(1).split('?')[0]}`);
        logger.info(`   Username: ${url.username}`);
        
        // 1. DNS Resolution Test
        logger.info('🌐 Testing DNS resolution...');
        try {
            const dnsResult = await dnsLookup(hostname);
            logger.info(`✅ DNS resolved to: ${dnsResult.address}`);
        } catch (dnsError) {
            logger.error('❌ DNS resolution failed:', dnsError instanceof Error ? dnsError.message : String(dnsError));
            logger.error('💡 This might indicate network issues or cluster problems');
        }
        
        // 2. Test different connection approaches
        logger.info('🔗 Testing connection with different strategies...');
        
        // Strategy 1: Minimal connection
        logger.info('📝 Strategy 1: Minimal connection options...');
        try {
            await mongoose.connect(MONGO_URI, {
                serverSelectionTimeoutMS: 8000,
                connectTimeoutMS: 8000,
            });
            logger.info('✅ Minimal connection successful!');
            await mongoose.connection.close();
        } catch (error) {
            logger.error('❌ Minimal connection failed:', error instanceof Error ? error.message : String(error));
        }
        
        // Strategy 2: With retry logic
        logger.info('📝 Strategy 2: Connection with retry...');
        try {
            await mongoose.connect(MONGO_URI, {
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000,
                socketTimeoutMS: 0,
                maxPoolSize: 1,
                retryWrites: true,
            });
            logger.info('✅ Retry connection successful!');
            await mongoose.connection.close();
        } catch (error) {
            logger.error('❌ Retry connection failed:', error instanceof Error ? error.message : String(error));
        }
        
        // Strategy 3: Force IPv4
        logger.info('📝 Strategy 3: Force IPv4 connection...');
        try {
            await mongoose.connect(MONGO_URI, {
                serverSelectionTimeoutMS: 10000,
                connectTimeoutMS: 10000,
                family: 4,
                directConnection: false,
            });
            logger.info('✅ IPv4 connection successful!');
            await mongoose.connection.close();
        } catch (error) {
            logger.error('❌ IPv4 connection failed:', error instanceof Error ? error.message : String(error));
        }
        
        // 3. Check if it's a credentials issue
        logger.info('🔐 Testing with modified connection string...');
        try {
            // Test with a deliberately wrong password to see if we get a different error
            const testUri = MONGO_URI.replace(url.password, 'wrongpassword');
            await mongoose.connect(testUri, {
                serverSelectionTimeoutMS: 5000,
                connectTimeoutMS: 5000,
            });
            logger.warn('⚠️  Connection with wrong password succeeded - this is unexpected');
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            if (errorMsg.includes('authentication')) {
                logger.info('✅ Credentials are being validated (good sign)');
                logger.info('   The cluster is reachable, but there might be a user/password issue');
            } else if (errorMsg.includes('IP') || errorMsg.includes('whitelist')) {
                logger.error('❌ Still getting IP whitelist error with wrong credentials');
                logger.error('   This suggests the IP whitelist might not be properly configured');
            } else {
                logger.info('ℹ️  Different error with wrong credentials:', errorMsg);
            }
        }
        
    } catch (error) {
        logger.error('❌ Status check failed:', error instanceof Error ? error.message : String(error));
    }
    
    // 4. Recommendations
    logger.info('💡 Troubleshooting Recommendations:');
    logger.info('   1. Check MongoDB Atlas Dashboard:');
    logger.info('      - Ensure cluster is not paused');
    logger.info('      - Check cluster health status');
    logger.info('      - Verify the cluster region');
    logger.info('   2. Network Access Settings:');
    logger.info('      - Confirm 0.0.0.0/0 is in the IP Access List');
    logger.info('      - Check if there are any pending changes');
    logger.info('      - Try removing and re-adding the IP entry');
    logger.info('   3. Database Access Settings:');
    logger.info('      - Verify user "gagandevvv" exists');
    logger.info('      - Check user permissions (readWrite on uninexus database)');
    logger.info('      - Try resetting the user password');
    logger.info('   4. Alternative Solutions:');
    logger.info('      - Try connecting from a different network (mobile hotspot)');
    logger.info('      - Create a new database user with a simple password');
    logger.info('      - Check if your ISP blocks MongoDB ports (27017)');
    
    process.exit(0);
}

checkAtlasStatus();