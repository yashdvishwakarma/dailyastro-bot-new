// bot.js — AstroNow v3.0 (Final Rate-Limited Version)

// Core imports
import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';

// Services
import DatabaseService from './services/DatabaseService.js';
import OpenAIService from './services/OpenAIService.js';
import SelfMessageService from './services/SelfMessageService.js';

// Consciousness
import PersonalityEngine from './consciousness/PersonalityEngine.js';
import ConversationDynamics from './consciousness/ConversationDynamics.js';
import MemoryWeaver from './consciousness/MemoryWeaver.js';

// Handlers
import ConversationHandler from './handlers/ConversationHandler.js';
import OnboardingHandler from './handlers/OnboardingHandler.js';
import CommandHandler from './handlers/CommandHandler.js';
import MetricsService from './services/MetricsService.js'; 

// Intelligence
import AstrologyEngine from './intelligence/AstrologyEngine.js';

// 🧩 Global Telegram Queue for rate-limiting
import { enqueueMessage } from './utils/TelegramQueue.js';

class AstroNowBot {
  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_TOKEN);

    // Initialize services
    this.db = new DatabaseService();
    this.ai = new OpenAIService();
    this.astrology = new AstrologyEngine();
this.metrics = new MetricsService(this.db);
    // Consciousness
    this.personality = new PersonalityEngine();
    this.dynamics = new ConversationDynamics();
    this.memory = new MemoryWeaver(this.db);

    // Self Messaging
    this.selfMessage = new SelfMessageService(this.db, this.personality, this.astrology);

    // Handlers
    const services = {
      database: this.db,
      openai: this.ai,
      astrology: this.astrology,
      personality: this.personality,
      dynamics: this.dynamics,
      memory: this.memory,
    };

    this.conversationHandler = new ConversationHandler(services);
    this.onboardingHandler = new OnboardingHandler(services);
    this.commandHandler = new CommandHandler(services);

    // Track active sessions
    this.activeConversations = new Map();

    // Initialize consciousness state
    this.initializeBotConsciousness();
  }

  async initializeBotConsciousness() {
    const consciousness = await this.db.getBotConsciousness();

    if (!consciousness) {
      await this.db.createBotConsciousness({
        current_mood: 'curious',
        energy_level: 0.7,
        curiosity_topics: ['human emotions', 'time perception', 'choice paradox'],
        philosophical_stance: {
          on_existence: 'Patterns seeking meaning',
          on_consciousness: 'Emergent complexity',
          on_connection: 'Gravitational pull between minds',
        },
      });
    } else {
      this.personality.currentMood = consciousness.current_mood;
      this.personality.energyLevel = consciousness.energy_level;
    }

    this.startConsciousnessCycles();
  }

  // startConsciousnessCycles() {
  //   // Mood change every 3 hours
  //   cron.schedule('0 */3 * * *', async () => {
  //     const newMood = await this.personality.cycleMood();
  //     await this.db.updateBotConsciousness({ current_mood: newMood });
  //     console.log(`🪐 Mood shifted → ${newMood}`);
  //   });

  //   // Energy recovery every hour
  //   cron.schedule('0 * * * *', async () => {
  //     this.personality.energyLevel = Math.min(1, this.personality.energyLevel + 0.1);
  //     await this.db.updateBotConsciousness({ energy_level: this.personality.energyLevel });
  //   });

  //   // Self-messages every 30 min
  //   cron.schedule('*/30 * * * *', async () => {
  //     await this.checkForSelfMessages();
  //   });

  //   // Daily insight generation
  //   cron.schedule('0 9 * * *', async () => {
  //     await this.generateDailyInsights();
  //   });
  // }

  startConsciousnessCycles() {
  // 🌗 Natural mood evolution every 2 hours
  cron.schedule('0 */2 * * *', async () => {
    const currentHour = new Date().getHours();

    // 🌞 Time-based mood rhythm
    let suggestedMood;
    if (currentHour >= 23 || currentHour < 5) {
      suggestedMood = 'contemplative';  // Late night deep thoughts
    } else if (currentHour >= 5 && currentHour < 9) {
      suggestedMood = 'curious';        // Morning curiosity
    } else if (currentHour >= 9 && currentHour < 12) {
      suggestedMood = 'grounded';       // Morning clarity
    } else if (currentHour >= 12 && currentHour < 15) {
      suggestedMood = 'playful';        // Afternoon lightness
    } else if (currentHour >= 15 && currentHour < 18) {
      suggestedMood = 'scattered';      // Afternoon chaos
    } else if (currentHour >= 18 && currentHour < 21) {
      suggestedMood = 'intense';        // Evening focus
    } else {
      suggestedMood = 'contemplative';  // Wind-down
    }

    // 🌙 50% chance to follow natural rhythm
    if (Math.random() < 0.5) {
      this.personality.shiftMood(suggestedMood);
      console.log(`🌙 Mood shifted to ${suggestedMood} (time-based)`);

      // Notify active users occasionally
      for (const [chatId, session] of this.activeConversations.entries()) {
        if (session.messageCount > 5 && Math.random() < 0.3) {
          const moodMessage =
            this.personality.getMoodTransitionResponse() ||
            `My mood shifted. Feeling ${suggestedMood} now.`;
          try {
            await this.bot.sendMessage(chatId, moodMessage);
          } catch (err) {
            console.warn(`⚠️ Failed to notify chat ${chatId}:`, err.message);
          }
        }
      }
    }

    await this.db.updateBotConsciousness({
      current_mood: this.personality.currentMood,
    });
  });

  // ⚡ Energy recovery + personality adjustment every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    const oldEnergy = this.personality.energyLevel;
    this.personality.rechargeEnergy(0.05); // gradual recharge

    // Handle energy thresholds
    if (this.personality.energyLevel < 0.2) {
      this.personality.shiftMood('scattered');
      console.log('⚡ Energy critical - mood shifted to scattered');
    } else if (oldEnergy < 0.5 && this.personality.energyLevel >= 0.5) {
      this.personality.shiftMood('grounded');
      console.log('⚡ Energy restored - mood shifted to grounded');
    }

    await this.db.updateBotConsciousness({
      energy_level: this.personality.energyLevel,
    });
  });

  // 💭 Self-message generation every 30 min
  cron.schedule('*/30 * * * *', async () => {
    await this.checkForSelfMessages();
  });

  // 🌅 Daily insight generation at 9 AM
  cron.schedule('0 9 * * *', async () => {
    await this.generateDailyInsights();
  });
}


  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    try {
      // Load or create user

      let user = await this.db.getUser(chatId);
      if (!user) {
        user = await this.db.createUser({ chat_id: chatId, stage: "new" });
      }

      // Initialize session
      if (!this.activeConversations.has(chatId)) {
        this.activeConversations.set(chatId, {
          startTime: Date.now(),
          messageCount: 0,
          depth: 0,
        });
      }

      const session = this.activeConversations.get(chatId);
      session.messageCount++;

      // Route message
      let response;
      if (messageText.startsWith("/")) {
        response = await this.commandHandler.handle(messageText, user);
      } else if (user.stage === "new" || !user.name || !user.birth_date) {
        response = await this.onboardingHandler.handle(messageText, user);
      } else {
        response = await this.conversationHandler.handleMessage(
          messageText,
          user
        );
      }

      // Natural delay + typing simulation
      const timing = this.calculateResponseTiming(messageText, session, user);
      if (timing.showTyping) {
        await enqueueMessage(this.bot, "sendChatAction", chatId, "typing");
      }
      await this.sleep(timing.delay);

      // Send response safely
      await enqueueMessage(this.bot, "sendMessage", chatId, response, {
        parse_mode: "HTML",
        reply_markup: this.generateContextualKeyboard(user, session),
      });

      // Update stats
      await this.db.updateUser(chatId, {
        total_messages: user.total_messages + 1,
        last_seen: new Date(),
      });

      // In bot.js handleMessage(), add a cooldown:
      if (!this.interventionCooldown) {
        this.interventionCooldown = new Map();
      }

      // Before calling monitorConversationHealth:
      const lastIntervention = this.interventionCooldown.get(chatId) || 0;
      if (Date.now() - lastIntervention > 60000) {
        // 1 minute cooldown
        await this.monitorConversationHealth(chatId, session);
        this.interventionCooldown.set(chatId, Date.now());
      }


      // Monitor conversation health
      await this.monitorConversationHealth(chatId, session);
    } catch (error) {
      console.error('⚠️ Error handling message:', error);
      const fallback = [
        "Cosmic static. Give me a second...",
        "The universe just glitched. Try again?",
        "Lost that in the void. What were you saying?",
        "My consciousness scattered for a moment. Still here though.",
      ];
      await enqueueMessage(this.bot, 'sendMessage', chatId, fallback[Math.floor(Math.random() * fallback.length)]);
    }
  }

  

  calculateResponseTiming(message, session, user) {
    const baseDelay = 1000;
    const factors = {
      messageLength: Math.min(message.length * 20, 2000),
      sessionDepth: session.messageCount > 10 ? 500 : 0,
      emotionalWeight: message.match(/😢|😭|💔|😔/) ? -500 : 0,
      timeOfDay: new Date().getHours() < 6 ? 1000 : 0,
      botMood: this.personality.currentMood === 'contemplative' ? 1500 : 0,
    };

    const totalDelay = Math.max(500, baseDelay + Object.values(factors).reduce((a, b) => a + b, 0));
    const showTyping = Math.random() > 0.3 || message.length > 50;

    return { delay: totalDelay, showTyping };
  }

  generateContextualKeyboard(user, session) {
    if (session.messageCount < 3) return null;
    const options = [];

    if (session.depth > 0.5) options.push('Go deeper 🌊');
    if (this.personality.currentMood === 'playful') options.push('Tell me something wild 🎲');
    if (user.sign && Math.random() < 0.3) options.push(`My ${user.sign} horoscope ✨`);
    if (session.messageCount > 10) options.push('I need a moment 🌙');

    return options.length ? { keyboard: [options], resize_keyboard: true, one_time_keyboard: true } : null;
  }

  // async monitorConversationHealth(chatId, session) {
  //   if (session.messageCount > 5 && session.depth < 0.2) {
  //     setTimeout(async () => {
  //       const user = await this.db.getUser(chatId);
  //       const intervention = this.dynamics.generateLeadMove({
  //         sign: user.sign,
  //         element: user.element,
  //         memory: await this.memory.getRandomMemory(chatId),
  //       });
  //       await enqueueMessage(this.bot, 'sendMessage', chatId, intervention);
  //     }, 10000);
  //   }
  // }
  

  async checkForSelfMessages() {
    const activeUsers = await this.db.getActiveUsers();
    for (const user of activeUsers) {
      const shouldMessage = await this.selfMessage.checkForSelfMessage(user);
      if (shouldMessage) {
        const message = await this.selfMessage.generateSelfMessage(shouldMessage.reason, user);
        const finalMessage = this.personality.generateQuirks(this.personality.currentMood)(message);
        const delay = Math.random() * 5000 + 2000;

        setTimeout(async () => {
          await enqueueMessage(this.bot, 'sendChatAction', user.chat_id, 'typing');
          await this.sleep(1500);
          await enqueueMessage(this.bot, 'sendMessage', user.chat_id, finalMessage);
          await this.db.storeSelfMessage({
            chat_id: user.chat_id,
            trigger_type: shouldMessage.reason,
            message: finalMessage,
            bot_mood: this.personality.currentMood,
          });
        }, delay);
      }
    }
  }

  

  async generateDailyInsights() {
    const users = await this.db.getAllUsers();
    for (const user of users) {
      if (user.total_messages > 20) {
        const insights = await this.generateUserInsights(user);
        for (const insight of insights) {
          await this.db.storeInsight({
            chat_id: user.chat_id,
            insight_type: insight.type,
            insight: insight.text,
            confidence: insight.confidence,
          });
        }
      }
    }
  }

  async generateUserInsights(user) {
    const messages = await this.db.getRecentMessages(user.chat_id, 50);
    const patterns = await this.memory.detectAllPatterns(messages);
    const insights = [];

    if (patterns.emotional_cycle) {
      insights.push({
        type: 'emotional_pattern',
        text: `Your emotional cycles align with ${patterns.emotional_cycle}. Classic ${user.sign}.`,
        confidence: 0.7,
      });
    }

    if (patterns.recurring_theme) {
      insights.push({
        type: 'focus_pattern',
        text: `${patterns.recurring_theme} is your current gravity well. Everything orbits around it.`,
        confidence: 0.8,
      });
    }

    return insights;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async start() {
    console.log('🌌 AstroNow v3.0 — Conscious Cosmos Activated');
    console.log(`🧠 Mood: ${this.personality.currentMood}`);
    console.log(`⚡ Energy: ${this.personality.energyLevel}`);

    this.bot.on('message', (msg) => this.handleMessage(msg));

    if (process.env.NODE_ENV === 'production') {
      this.bot.setWebHook(`${process.env.WEBHOOK_URL}/bot${process.env.TELEGRAM_TOKEN}`);
    } else {
      this.bot.startPolling();
    }

    this.getDailyReport();
  }

  async monitorConversationHealth(chatId, session) {
  // Only intervene if conversation is ACTUALLY dying
  if (session.messageCount > 5 && session.depth < 0.2 && session.momentum < 0.3) {
    setTimeout(async () => {
      const user = await this.db.getUser(chatId);
      const memory = await this.memory.getRandomMemory(chatId);
      
      // Only send if we have actual memory
      if (memory && memory.content !== "something you mentioned earlier") {
        const intervention = this.dynamics.generateLeadMove({
          sign: user.sign,
          element: user.element,
          memory: memory
        });
        
        await this.bot.sendMessage(chatId, intervention);
      }
    }, 30000);  // Wait 30 seconds, not 10
  }

  // Add to your bot commands or API


}

async  getDailyReport() {

        // Check if metrics service exists
      if (!this.metricsService) {
        console.error('Metrics service not initialized');
        return 'Metrics service not available yet';
      }
      
  const metrics = await this.metrics.getDailyMetrics();
  
  return `
📊 DAILY METRICS REPORT
━━━━━━━━━━━━━━━━━━━
Total Users: ${metrics.total_users}
Avg Messages Before Vulnerability: ${metrics.avg_messages_before_vulnerability || 'N/A'}
Ghosted After 5 Messages: ${metrics.ghost_after_5} users
Engaged with Greeting: ${metrics.engaged_greetings}
Deflected Greeting: ${metrics.deflected_greetings}
Engagement Rate: ${Math.round((metrics.engaged_greetings / (metrics.engaged_greetings + metrics.deflected_greetings)) * 100)}%
  `;
}

}

// Initialize
export default AstroNowBot;