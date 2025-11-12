import { StateManager } from '../state/StateManager.js';
import { DatabaseService } from '../services/DatabaseService.js';
import { EmotionService } from '../services/EmotionService.js';
import { OpenAIService } from '../services/OpenAIService.js';
import { ASTRONOW_PERSONALITY } from '../utils/constants.js';
import { engagementService } from '../services/EngagementService.js';

// 🧩 Import global Telegram queue limiter
import { enqueueMessage } from '../utils/TelegramQueue.js';

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
      await enqueueMessage(
        bot,
        'sendMessage',
        chatId,
        "The stars flickered for a moment... What were you saying? ✨"
      );
    }
  }

  async handleConversation(bot, chatId, text, user) {
    // Show typing indicator safely
    await enqueueMessage(bot, 'sendChatAction', chatId, 'typing');

    // Detect emotion
    const emotion = await this.emotionService.detectEmotion(text);
    // Store user message
    await this.db.storeMessage(chatId, 'user', text, emotion.primary_emotion);

    // Get context
    const recentMessages = await this.db.getRecentMessages(chatId, 10);
    
    // Build prompt
    const prompt = this.buildPrompt(user, text, emotion, recentMessages);
    // if (!ctx.currentMessage) console.warn("⚠️ Warning: currentMessage is empty. Check ConversationHandler context build.");

    // Generate response
const response = await this.ai.generateResponse({
  botMood,
  userSign: user.sign,
  element: user.element,
  currentMessage: message, // ✅ <-- THIS IS CRITICAL
  recentMessages: await this.db.getRecentMessages(user.chat_id, 10),
  threadEmotion: analysis.subtext.emotion,
  detectedNeed: analysis.intent.need,
  strategy: analysis.intent.primary,
  depth: analysis.context.threadDepth,
  energyLevel: 7
});

    
    // Send response (rate-limited)
    await enqueueMessage(bot, 'sendMessage handleConversation message handler', chatId, response, { parse_mode: 'Markdown' });
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

  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text;

    try {
      // Update user's last message time for engagement tracking
      await engagementService.updateLastMessageTime(chatId);
      
      // Check if this is a response to a hook
      const hookResponse = await engagementService.checkIfHookResponse(chatId);
      
      // Get user state
      let user = await this.stateManager.getUser(chatId);
      if (!user) {
        // Create new user and start onboarding
        user = await this.stateManager.createUser(chatId);
        return await this.onboardingHandler.startOnboarding(msg);
      }

      // Check if user is in onboarding
      if (user.stage && user.stage.startsWith('awaiting_')) {
        return await this.onboardingHandler.handleOnboardingStep(msg, user);
      }

      // Detect emotion from message
      const emotion = await this.emotionService.detectEmotion(text);
      // Store user message
      await this.databaseService.storeMessage(chatId, text, 'user', emotion);

      // Build context for response
      const context = await this.buildContext(user, emotion, text);
      
      // Add hook response context if applicable
      if (hookResponse) {
        context.isHookResponse = true;
        context.hookMessage = hookResponse.hook_message;
        context.silenceDuration = hookResponse.context_used?.silence_hours || 'unknown';
      }

      // Generate AI response with enhanced context
      const aiResponse = await this.generateResponse(context, text);

      // Send response safely
      await enqueueMessage(bot, 'sendMessage', chatId, aiResponse);
      // Store AI response
      await this.databaseService.storeMessage(chatId, aiResponse, 'assistant');

      // Update user state
      await this.stateManager.updateUser(chatId, {
        messageCount: user.messageCount + 1,
        lastEmotion: emotion.primary_emotion
      });

    } catch (error) {
      console.error('Error handling message:', error);
      await enqueueMessage(
        bot,
        'sendMessage',
        chatId,
        "*a gentle cosmic static fills the space*\n\nMy connection wavered for a moment... What were you sharing? ✨"
      );
    }
  }

  // Enhanced context builder
  async buildContext(user, emotion, text) {
    const recentMessages = await this.databaseService.getRecentMessages(user.chat_id, 20);
    
    return {
      user: {
        name: user.name,
        sign: user.sign,
        messageCount: user.messageCount
      },
      emotion: emotion,
      recentMessages: recentMessages,
      timestamp: new Date()
    };
  }

  // Enhanced response generation
  async generateResponse(context, userMessage) {

    const { user, emotion, isHookResponse } = context;
    
    let personalityPrompt = ASTRONOW_PERSONALITY.basePrompt;
    
    // Add hook response awareness
    if (isHookResponse) {
      personalityPrompt += `\n\nIMPORTANT: The user is responding to your check-in hook: "${context.hookMessage}"
They were silent for ${context.silenceDuration} hours before you reached out.
Acknowledge their return warmly but subtly, and engage with what they're sharing now.`;
    }
    
    // Add emotional context
    personalityPrompt += `\n\nCurrent emotional state: ${emotion.primary_emotion} (intensity: ${emotion.intensity})
Emotional need detected: ${emotion.needs}`;
    
    // Add user context
    personalityPrompt += `\n\nUser: ${user.name} (${user.sign})
Messages exchanged: ${user.messageCount}`;
    
    // Add tone guide
    const toneGuide = this.emotionService.getToneGuide(emotion);
    personalityPrompt += `\n\nTone guidance: ${toneGuide}`;
    
    return await this.openAIService.generateResponse(personalityPrompt, userMessage);
  }
}
