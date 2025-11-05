import express from 'express';
import { config } from './config.js';
import { setupBot } from './bot.js';
import { setupCronJobs } from './utils/cronJobs.js';


const app = express();
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'AstroNow Bot is running! 🌙',
    version: '2.1',
    features: [
      'memory-evolution', 
      'engagement-hooks',
      'emotional-intelligence'
    ],
    uptime: process.uptime()
  });
});

// Setup bot instance
const bot = setupBot();

// Webhook endpoint
app.post(`/webhook/${config.telegram.token}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Start server
app.listen(config.server.port, '0.0.0.0', async () => {
  console.log(`\n🌌 AstroNow v2.1 - "The Memory Awakening"`);
  console.log(`🚀 Server running on port ${config.server.port}`);
  
  try {
    // Set webhook
    const webhookUrl = `${config.telegram.webhookUrl}/webhook/${config.telegram.token}`;
    await bot.setWebHook(webhookUrl);
    console.log(`✅ Webhook set: ${webhookUrl}`);
    
    // Initialize cron jobs for engagement hooks
    setupCronJobs();
    console.log('✅ Engagement system initialized');
    
    // Log startup complete
    console.log('\n✨ AstroNow is fully awakened and listening to the cosmos...\n');
    
  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🌙 AstroNow returning to the stars...');
  
  try {
    // Stop bot polling
    await bot.stopPolling();
    console.log('✅ Bot stopped');
    
    // Allow pending operations to complete
    setTimeout(() => {
      console.log('💫 Cosmic connection closed gracefully');
      process.exit(0);
    }, 1000);
    
  } catch (err) {
    console.error('❌ Shutdown error:', err);
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});