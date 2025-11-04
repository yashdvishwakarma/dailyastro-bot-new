import { StateManager } from '../state/StateManager.js';
import { DatabaseService } from '../services/DatabaseService.js';
import { EmotionService } from '../services/EmotionService.js';
import { OpenAIService } from '../services/OpenAIService.js';
import { ASTRONOW_PERSONALITY } from '../utils/constants.js';

export class MessageHandler {
  constructor() {
    this.stateManager = new StateManager();
    this.db = new DatabaseService();
    this.emotionService = new EmotionService();
    this.ai = new OpenAIService();
  }

  async handle(bot, msg) {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!text || text.startsWith('/')) return;

    console.log(`💬 [${chatId}] ${text}`);

    try {
      // Get user state (single source of truth)
      const user = await this.stateManager.getUser(chatId);

      // Route based on user stage
      if (user.stage.startsWith('awaiting_')) {
        const { OnboardingHandler } = await import('./OnboardingHandler.js');
        const onboarding = new OnboardingHandler();
        await onboarding.handle(bot, chatId, text, user);
        return;
      }

      // Handle conversation
      await this.handleConversation(bot, chatId, text, user);

    } catch (error) {
      console.error('Message handler error:', error);
      await bot.sendMessage(chatId, 
        "The stars flickered for a moment... What were you saying? ✨"
      );
    }
  }

  async handleConversation(bot, chatId, text, user) {
    // Show typing indicator
    await bot.sendChatAction(chatId, 'typing');

    // Detect emotion
    const emotion = await this.emotionService.detectEmotion(text);
    
    // Store user message
    await this.db.storeMessage(chatId, 'user', text, emotion.primary_emotion);

    // Get context
    const recentMessages = await this.db.getRecentMessages(chatId, 5);
    
    // Build prompt
    const prompt = this.buildPrompt(user, text, emotion, recentMessages);
    
    // Generate response
    const response = await this.ai.generateResponse(prompt, text);
    
    // Send response
    await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
    
    // Store bot response
    await this.db.storeMessage(chatId, 'bot', response);

    // Update message count
    await this.stateManager.updateUser(chatId, {
      messageCount: (user.messageCount || 0) + 1
    });
  }

  buildPrompt(user, message, emotion, history) {
    const toneGuide = this.emotionService.getToneGuide(emotion.primary_emotion);
    
    const recentContext = history
      .filter(m => m.sender === 'user')
      .slice(0, 3)
      .map(m => m.message)
      .join(' | ');

    return `${ASTRONOW_PERSONALITY.basePrompt}

CURRENT USER:
- Name: ${user.name || 'Unknown'}
- Sign: ${user.sign || 'Unknown'}
- Message: "${message}"
- Emotion: ${emotion.primary_emotion} (intensity: ${emotion.intensity})
- They need: ${emotion.needs}

RECENT CONTEXT: ${recentContext || 'First conversation'}

TONE GUIDE: ${toneGuide}

RESPONSE RULES:
- Address them by name if known (${user.name})
- Acknowledge their ${emotion.primary_emotion}
- Be specific to their ${user.sign} nature
- Keep it 2-3 sentences
- Sound like a friend texting, not an app
- No generic horoscope language
- End with engagement, not closure`;
  }
}