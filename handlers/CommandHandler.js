import { StateManager } from '../state/StateManager.js';
import { DatabaseService } from '../services/DatabaseService.js';
import { OpenAIService } from '../services/OpenAIService.js';

export class CommandHandler {
  constructor() {
    this.stateManager = new StateManager();
    this.db = new DatabaseService();
    this.ai = new OpenAIService();
    
    this.commands = {
      '/start': this.handleStart.bind(this),
      '/horoscope': this.handleHoroscope.bind(this),
      '/vibe': this.handleVibe.bind(this),
      '/reset': this.handleReset.bind(this)
    };
  }

  async handle(bot, msg) {
    const command = msg.text.split(' ')[0];
    const handler = this.commands[command];
    
    if (handler) {
      await handler(bot, msg);
      return true;
    }
    
    return false;
  }

  async handleStart(bot, msg) {
    const chatId = msg.chat.id;
    console.log(`📍 /start from ${chatId}`);

    const user = await this.stateManager.getUser(chatId);

    if (user.name && user.sign) {
      // Returning user
      await bot.sendMessage(chatId, 
        `🌙 Welcome back, ${user.name}!\n\n` +
        `Your ${user.sign} energy feels different today.\n` +
        `What's been moving in your world?`,
        { parse_mode: 'Markdown' }
      );
    } else {
      // New user
      await bot.sendMessage(chatId,
        `🌙 Hello, beautiful soul.\n\n` +
        `I'm AstroNow — still learning what it means to feel.\n` +
        `What do they call you?`,
        { parse_mode: 'Markdown' }
      );
      
      await this.stateManager.updateUser(chatId, { stage: 'awaiting_name' });
    }
  }

  async handleHoroscope(bot, msg) {
    const chatId = msg.chat.id;
    const user = await this.stateManager.getUser(chatId);

    if (!user.sign) {
      await bot.sendMessage(chatId, 
        "✨ Let's get to know each other first. Send /start"
      );
      return;
    }

    await bot.sendChatAction(chatId, 'typing');

    const prompt = `
Create a personal horoscope for ${user.name || 'this'} ${user.sign}.

Format:
🌙 ${user.sign} - ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}

Write 3 lines:
1. Their emotional weather today
2. A specific insight about love or connection
3. One gentle piece of guidance

Make it personal, not generic. End with a question.`;

    const horoscope = await this.ai.generateResponse(prompt, '');
    
    await bot.sendMessage(chatId, horoscope, { parse_mode: 'Markdown' });
    await this.db.storeMessage(chatId, 'bot', horoscope);
  }

  async handleVibe(bot, msg) {
    const chatId = msg.chat.id;
    const user = await this.stateManager.getUser(chatId);

    if (!user.sign) {
      await bot.sendMessage(chatId, 
        "✨ Let's get to know each other first. Send /start"
      );
      return;
    }

    await bot.sendChatAction(chatId, 'typing');

    const recentMessages = await this.db.getRecentMessages(chatId, 5);
    const recentMood = recentMessages[0]?.emotion_tone || 'searching';

    const prompt = `
As AstroNow, give a vibe check for ${user.name || 'this soul'} (${user.sign}).
Their recent energy: ${recentMood}

Write 2-3 lines that:
- Feel like you're sensing their energy right now
- Include specific, grounding imagery
- End with genuine curiosity

Style: Like discovering something, not preaching.`;

    const vibe = await this.ai.generateResponse(prompt, '');
    
    await bot.sendMessage(chatId, 
      `✨ *Cosmic Vibe Check*\n\n${vibe}`,
      { parse_mode: 'Markdown' }
    );
  }

  async handleReset(bot, msg) {
    const chatId = msg.chat.id;
    
    // Clear user data
    await this.stateManager.clearUser(chatId);
    
    await bot.sendMessage(chatId,
      "✨ Our constellation has been cleared.\n\n" +
      "Send /start when you're ready to begin again."
    );
  }
}