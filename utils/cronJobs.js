import cron from 'node-cron';
import { engagementService } from '../services/EngagementService.js';

export function setupCronJobs() {
    console.log('⏰ Setting up cron jobs...');

    // Check for inactive users every hour
    cron.schedule('0 * * * *', async () => {
        console.log('🕐 Running hourly inactive user check...');
        try {
            await engagementService.checkInactiveUsers();
        } catch (error) {
            console.error('Cron job error:', error);
        }
    });

    console.log('✅ Cron jobs initialized');
}