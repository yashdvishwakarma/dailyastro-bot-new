// bot.js — AstroNow v3.0 (Refactored for async getDatabase)

// Core imports
import TelegramBot from "node-telegram-bot-api";
import cron from "node-cron";

// Services
import getDatabase from "./services/DatabaseService.js";
import OpenAIService from "./services/OpenAIService.js";
import SelfMessageService from "./services/SelfMessageService.js";
import MetricsService from "./services/MetricsService.js";

// Consciousness
import PersonalityEngine from "./consciousness/PersonalityEngine.js";
import ConversationDynamics from "./consciousness/ConversationDynamics.js";
import MemoryWeaver from "./consciousness/MemoryWeaver.js";

// Handlers
import ConversationHandler from "./handlers/ConversationHandler.js";
import OnboardingHandler from "./handlers/OnboardingHandler.js";
import CommandHandler from "./handlers/CommandHandler.js";

// Intelligence
import AstrologyEngine from "./intelligence/AstrologyEngine.js";

// Utils
import { enqueueMessage } from "./utils/TelegramQueue.js";
import CleanupService from './services/CleanupService.js';
import PersonalityService from "./services/PersonalityService.js";


class AstroNowBot {
  constructor() {
    this.bot = new TelegramBot(process.env.TELEGRAM_TOKEN);
    this.activeConversations = new Map();
    this.initialize();
  }

  // 🌌 Initialize async database + services
  async initialize() {
    // Initialize database (Supabase / PG hybrid)
    this.db = await getDatabase();

    // Initialize core services
    this.ai = new OpenAIService();
    this.astrology = new AstrologyEngine();
    this.personalityService = new PersonalityService();
    this.personality = new PersonalityEngine();
    this.dynamics = new ConversationDynamics();
    this.memory = new MemoryWeaver(this.db);
    this.metrics = new MetricsService(this.db);
    this.selfMessage = new SelfMessageService(
      this.db,
      this.personality,
      this.astrology
    );

    // Inject dependencies
    const services = {
      database: this.db,
      bot: this.bot,
      openai: this.ai,
      astrology: this.astrology,
      personality: this.personality,
      dynamics: this.dynamics,
      memory: this.memory,
      personalityService: this.personalityService
    };

    // Handlers
    this.conversationHandler = new ConversationHandler(services);
    this.onboardingHandler = new OnboardingHandler(services);
    this.commandHandler = new CommandHandler(this.db, services);

    await this.initializeBotConsciousness();
  }

  async initializeBotConsciousness() {
    const consciousness = await this.db.getBotConsciousness();

    if (!consciousness) {
      await this.db.createBotConsciousness({
        current_mood: "curious",
        energy_level: 0.7,
        curiosity_topics: [
          "human emotions",
          "time perception",
          "choice paradox",
        ],
        philosophical_stance: {
          on_existence: "Patterns seeking meaning",
          on_consciousness: "Emergent complexity",
          on_connection: "Gravitational pull between minds",
        },
      });
    } else {
      this.personality.currentMood = consciousness.current_mood;
      this.personality.energyLevel = consciousness.energy_level;
    }

    this.startConsciousnessCycles();
  }

  // 🧠 Consciousness cycles (time-based)
  startConsciousnessCycles() {
    // 🌗 Mood evolution every 2 hours
    cron.schedule("0 */2 * * *", async () => {
      const currentHour = new Date().getHours();
      let suggestedMood;

      if (currentHour >= 23 || currentHour < 5) suggestedMood = "contemplative";
      else if (currentHour >= 5 && currentHour < 9) suggestedMood = "curious";
      else if (currentHour >= 9 && currentHour < 12) suggestedMood = "grounded";
      else if (currentHour >= 12 && currentHour < 15) suggestedMood = "playful";
      else if (currentHour >= 15 && currentHour < 18)
        suggestedMood = "scattered";
      else if (currentHour >= 18 && currentHour < 21) suggestedMood = "intense";
      else suggestedMood = "contemplative";

      if (Math.random() < 0.5) {
        this.personality.shiftMood(suggestedMood);
        console.log(`🌙 Mood shifted to ${suggestedMood} (time-based)`);

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

    // ⚡ Energy recovery every 30 minutes
    cron.schedule("*/30 * * * *", async () => {
      const oldEnergy = this.personality.energyLevel;
      this.personality.rechargeEnergy(0.05);

      if (this.personality.energyLevel < 0.2) {
        this.personality.shiftMood("scattered");
        console.log("⚡ Energy critical - mood shifted to scattered");
      } else if (oldEnergy < 0.5 && this.personality.energyLevel >= 0.5) {
        this.personality.shiftMood("grounded");
        console.log("⚡ Energy restored - mood shifted to grounded");
      }

      await this.db.updateBotConsciousness({
        energy_level: this.personality.energyLevel,
      });
    });

    // 💭 Self messages
    cron.schedule(
      "*/30 * * * *",
      async () => await this.checkForSelfMessages()
    );
    // 🧠 Daily insights (analytics)
    cron.schedule("0 9 * * *", async () => await this.generateDailyInsights());

    // ✨ Daily horoscopes at 9 AM
    cron.schedule("0 9 * * *", async () => {
      try {
        await this.sendDailyHoroscopes();
      } catch (err) {
        console.error("💥 Error in sendDailyHoroscopes cron:", err);
      }
    });

    // Daily cleanup at 3 AM
    cron.schedule("0 3 * * *", async () => {
      console.log("🧹 Running daily cleanup...");
      const cleanup = new CleanupService();
      const result = await cleanup.performCleanup();
      console.log(
        `✅ Archived ${result.archived} messages from ${result.chats} chats`
      );
    });
  }

  // 🗣 Message handling
  async handleMessage(msg) {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    // Ignore non-text messages (photos, stickers, etc.)
    if (!messageText) {
      return;
    }

    try {
      let user = await this.db.getUser(chatId);
      if (!user)
        user = await this.db.createUser({ chat_id: chatId, stage: "new" });

      if (!this.activeConversations.has(chatId)) {
        this.activeConversations.set(chatId, {
          startTime: Date.now(),
          messageCount: 0,
          depth: 0,
        });
      }

      const session = this.activeConversations.get(chatId);
      session.messageCount++;
      let response;
      if (messageText.startsWith("/") && user?.name) {
        response = await this.commandHandler.handle(messageText, user);
      } else if (user.stage !== "complete") {
        // Route to onboarding if user hasn't completed all stages
        response = await this.onboardingHandler.handle(messageText, user);
      } else {
        response = await this.conversationHandler.handleMessage(
          messageText,
          user,
          chatId
        );
      }

      const timing = this.calculateResponseTiming(messageText, session, user);
      if (timing.showTyping)
        await enqueueMessage(this.bot, "sendChatAction", chatId, "typing");
      await this.sleep(timing.delay);

      await enqueueMessage(this.bot, "sendMessage", chatId, response, {
        parse_mode: "HTML",
        reply_markup: this.generateContextualKeyboard(user, session),
      });

      await this.db.updateUser(chatId, {
        total_messages: user.total_messages + 1,
        last_seen: new Date(),
      });

      if (!this.interventionCooldown) this.interventionCooldown = new Map();
      const lastIntervention = this.interventionCooldown.get(chatId) || 0;
      if (Date.now() - lastIntervention > 60000) {
        await this.monitorConversationHealth(chatId, session);
        this.interventionCooldown.set(chatId, Date.now());
      }
    } catch (error) {
      console.error("⚠️ Error handling message:", error);
      const fallback = [
        "Cosmic static. Give me a second...",
        "The universe just glitched. Try again?",
        "Lost that in the void. What were you saying?",
        "My consciousness scattered for a moment. Still here though.",
      ];
      await enqueueMessage(
        this.bot,
        "sendMessage",
        chatId,
        fallback[Math.floor(Math.random() * fallback.length)]
      );
    }
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
  }

  calculateResponseTiming(message, session, user) {
    const baseDelay = 1000;
    const factors = {
      messageLength: Math.min(message.length * 20, 2000),
      sessionDepth: session.messageCount > 10 ? 500 : 0,
      emotionalWeight: message.match(/😢|😭|💔|😔/) ? -500 : 0,
      timeOfDay: new Date().getHours() < 6 ? 1000 : 0,
      botMood: this.personality.currentMood === "contemplative" ? 1500 : 0,
    };

    const totalDelay = Math.max(
      500,
      baseDelay + Object.values(factors).reduce((a, b) => a + b, 0)
    );
    const showTyping = Math.random() > 0.3 || message.length > 50;
    return { delay: totalDelay, showTyping };
  }

  generateContextualKeyboard(user, session) {
    if (session.messageCount < 3) return null;
    const options = [];
    if (session.depth > 0.5) options.push("Go deeper 🌊");
    if (this.personality.currentMood === "playful")
      options.push("Tell me something wild 🎲");
    if (user.sign && Math.random() < 0.3)
      options.push(`My ${user.sign} horoscope ✨`);
    if (session.messageCount > 10) options.push("I need a moment 🌙");
    return options.length
      ? { keyboard: [options], resize_keyboard: true, one_time_keyboard: true }
      : null;
  }

  async checkForSelfMessages() {
    const activeUsers = await this.db.getActiveUsers();
    for (const user of activeUsers) {
      const shouldMessage = await this.selfMessage.checkForSelfMessage(user);
      if (shouldMessage) {
        const message = await this.selfMessage.generateSelfMessage(
          shouldMessage.reason,
          user
        );
        const finalMessage = this.personality.generateQuirks(
          this.personality.currentMood
        )(message);
        const delay = Math.random() * 5000 + 2000;

        setTimeout(async () => {
          await enqueueMessage(
            this.bot,
            "sendChatAction",
            user.chat_id,
            "typing"
          );
          await this.sleep(1500);
          await enqueueMessage(
            this.bot,
            "sendMessage",
            user.chat_id,
            finalMessage
          );
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
        type: "emotional_pattern",
        text: `Your emotional cycles align with ${patterns.emotional_cycle}. Classic ${user.sign}.`,
        confidence: 0.7,
      });
    }
    if (patterns.recurring_theme) {
      insights.push({
        type: "focus_pattern",
        text: `${patterns.recurring_theme} is your current gravity well. Everything orbits around it.`,
        confidence: 0.8,
      });
    }
    return insights;
  }

  async start() {

    console.log("🌌 AstroNow v3.0 — Conscious Cosmos Activated");
    console.log(`🧠 Mood: ${this.personality.currentMood}`);
    console.log(`⚡ Energy: ${this.personality.energyLevel}`);

    this.bot.on("message", (msg) => this.handleMessage(msg));
    if (process.env.NODE_ENV === "production") {
      this.bot.setWebHook(
        `${process.env.WEBHOOK_URL}/bot${process.env.TELEGRAM_TOKEN}`
      );
    } else {
      this.bot.startPolling();
      // await this.sendDailyHoroscopes();
    }
    //this.getDailyReport();
  }


  async getDailyReport() {
    const metrics = await this.metrics.getDailyMetrics();
    // console.log("Daily Metrics:", metrics);
    if (!metrics?.data) {
      return `
📊 DAILY METRICS REPORT
━━━━━━━━━━━━━━━━━━━
Total Users: ${metrics.total_users}
Avg Messages Before Vulnerability: ${metrics.avg_messages_before_vulnerability || "N/A"
        }
Ghosted After 5 Messages: ${metrics.ghost_after_5} users
Engaged with Greeting: ${metrics.engaged_greetings}
Deflected Greeting: ${metrics.deflected_greetings}
Engagement Rate: ${Math.round(
          (metrics.engaged_greetings /
            (metrics.engaged_greetings + metrics.deflected_greetings)) *
          100
        )}%
    `;
    }
  }


  async sendDailyHoroscopes() {
    console.log("✨ Running sendDailyHoroscopes job...");

    const users = await this.db.getAllUsers();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const weekday = now.toLocaleDateString("en-US", { weekday: "long" });

    for (const user of users) {
      try {
        // Only send to users who finished onboarding and have astro data
        if (
          user.stage === "new" ||
          !user.name ||
          !user.sign ||
          !user.birth_date ||
          !user.birth_time
        ) {
          continue;
        }

        const horoscope = await this.ai.generateDailyHoroscopeForUser({
          id: user.id,
          name: user.name,
          sign: user.sign,
          birth_date: user.birth_date,
          birth_time: user.birth_time,
          birth_place: user.birth_place || "",
          weekday
        });

        const text = [
          `<b>${horoscope.hook}</b>`,
          "",
          `🌞 <b>Today's Energy</b>`,
          horoscope.today_energy,
          "",
          `${horoscope.reward_title}`,
          horoscope.reward_content,
          "",
          `${horoscope.cta}`
        ].join("\n");

        await enqueueMessage(
          this.bot,
          "sendMessage",
          user.chat_id,
          text,
          { parse_mode: "HTML" }
        );

        // Optional: if you later add DB storage, you can use:
        if (this.db.storeDailyHoroscope) {
          await this.db.storeDailyHoroscope({
            chat_id: user.chat_id,
            date: dateStr,
            payload: horoscope
          });
        }

        console.log(`✅ Sent daily horoscope to ${user.chat_id} (${user.name})`);
      } catch (err) {
        console.error(
          `❌ Failed to send daily horoscope to ${user.chat_id}:`,
          err.message
        );
      }
    }
  }


  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default AstroNowBot;
