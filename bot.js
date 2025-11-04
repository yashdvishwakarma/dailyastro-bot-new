import TelegramBot from 'node-telegram-bot-api';
import { config } from './config.js';
import { MessageHandler } from './handlers/MessageHandler.js';
import { CommandHandler } from './handlers/CommandHandler.js';

export function setupBot() {
  const bot = new TelegramBot(config.telegram.token);
  
  const messageHandler = new MessageHandler();
  const commandHandler = new CommandHandler();

  // Handle commands
  bot.on('message', async (msg) => {
    try {
      // Check if it's a command first
      if (msg.text?.startsWith('/')) {
        const handled = await commandHandler.handle(bot, msg);
        if (handled) return;
      }
      
      // Handle regular messages
      await messageHandler.handle(bot, msg);
      
    } catch (error) {
      console.error('Bot error:', error);
    }
  });

  // Handle errors gracefully
  bot.on('polling_error', (error) => {
    console.error('Polling error:', error.message);
  });

  console.log('🌙 AstroNow bot initialized');
  
  return bot;
}