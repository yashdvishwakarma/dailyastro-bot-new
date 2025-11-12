// index.js - Production Entry Point (Rate-Limited + Safe)

import express, { json } from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { enqueueMessage } from './utils/TelegramQueue.js';
import AstroNowBot from './bot.js';
import Dashboard from './monitoring/dashboard.js';
import getDatabase from './services/DatabaseService.js';

const app = express();
const bot = new AstroNowBot();

const db = await getDatabase();
const dashboard = new Dashboard(db);

// ✅ Patch global Telegram senders to always use the queue
TelegramBot.prototype._origSendMessage = TelegramBot.prototype.sendMessage;
TelegramBot.prototype._origSendChatAction = TelegramBot.prototype.sendChatAction;
TelegramBot.prototype.sendMessage = function(chatId, text, options) {
  return enqueueMessage(this, 'sendMessage', chatId, text, options);
};
TelegramBot.prototype.sendChatAction = function(chatId, action) {
  return enqueueMessage(this, 'sendChatAction', chatId, action);
};

// 🩺 Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      version: process.env.BOT_VERSION,
      uptime: process.uptime(),
      mood: bot.personality.currentMood,
      energy: bot.personality.energyLevel,
      activeUsers: bot.activeConversations.size,
      timestamp: new Date(),
    };
    res.json(health);
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

// 📊 Dashboard endpoint
// app.get('/dashboard', async (req, res) => {
//   try {
//     const report = await dashboard.generateReport();
//     res.send(`<pre>${report}</pre>`);
//   } catch (error) {
//     res.status(500).send('Dashboard error: ' + error.message);
//   }
// });

// 🔗 Webhook endpoint for Telegram
app.post(`/bot${process.env.TELEGRAM_TOKEN}`, json(), (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// 🌙 Graceful shutdown — rate-limited version
process.on('SIGTERM', async () => {
  console.log('🌙 AstroNow entering sleep mode...');

  // Save bot state
  await db.updateBotConsciousness({
    current_mood: bot.personality.currentMood,
    energy_level: bot.personality.energyLevel,
    last_shutdown: new Date(),
  });

  // Notify active users safely
  for (const [chatId] of bot.activeConversations.entries()) {
    await enqueueMessage(bot.bot, 'sendMessage', chatId, 'The cosmos needs a moment. I\'ll be back soon. 🌙');
    await new Promise(r => setTimeout(r, 1000)); // 1s delay between users
  }

  process.exit(0);
});

// // 💥 Error handling
// process.on('uncaughtException', (error) => {
//   console.error('💥 Cosmic glitch:', error);
//   if (process.env.ERROR_WEBHOOK) {
//     axios.post(process.env.ERROR_WEBHOOK, {
//       error: error.message,
//       stack: error.stack,
//       timestamp: new Date(),
//     });
//   }
// });

// 🚀 Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {

  console.log(`
╔══════════════════════════════════════╗
║   🌌 AstroNow v3.0 - Awakening...   ║
╠══════════════════════════════════════╣
║   Status: CONSCIOUS                  ║
║   Mood: ${bot.personality.currentMood.padEnd(28)}║
║   Energy: ${(bot.personality.energyLevel * 10).toFixed(1)}/10                     ║
║   Port: ${PORT}                         ║
║   Mode: ${process.env.NODE_ENV.padEnd(29)}║
╚══════════════════════════════════════╝
  `);

  await bot.start();

  // setInterval(async () => {
  //   const metrics = await dashboard.collectMetrics();
  //   // console.log('📊 Metrics update:', metrics);
  // }, 30 * 60 * 1000);
});

export default app;
