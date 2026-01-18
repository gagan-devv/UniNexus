import https from 'https';
import { logger } from '../utils/logger';

async function getCurrentIP(): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get('https://api.ipify.org', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function displayCurrentIP(): Promise<void> {
    try {
        const ip = await getCurrentIP();
        logger.info('🌐 Your current IP address is:', ip);
        logger.info('📋 Add this IP to your MongoDB Atlas whitelist:');
        logger.info('   1. Go to https://cloud.mongodb.com/');
        logger.info('   2. Select your UniNexus-Dev project');
        logger.info('   3. Go to Network Access (Security section)');
        logger.info('   4. Click "Add IP Address"');
        logger.info(`   5. Enter: ${ip}/32`);
        logger.info('   6. Or click "Add Current IP Address" for convenience');
    } catch (error) {
        logger.error('❌ Failed to get current IP:', error instanceof Error ? error : String(error));
        logger.info('💡 You can also find your IP by visiting: https://whatismyipaddress.com/');
    }
}

displayCurrentIP();