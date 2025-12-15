// handlers/ConversationHandler.js
import getDatabase from '../services/DatabaseService.js';
import PersonalityEngine from '../consciousness/PersonalityEngine.js';
import ConversationDynamics from '../consciousness/ConversationDynamics.js';
import IntentAnalyzer from '../intelligence/IntentAnalyzer.js';
import ValueGenerator from '../consciousness/ValueGenerator.js';
import MemoryWeaver from '../consciousness/MemoryWeaver.js';
import SubtextReader from '../intelligence/SubtextReader.js';
import OpenAIService from '../services/OpenAIService.js';
import MetricsService from '../services/MetricsService.js';
import getMemoryManager from '../services/ConversationMemoryManager.js';
import PersonalityService from "../services/PersonalityService.js";
import getStateTracker from '../services/ConversationStateTracker.js';

class ConversationHandler {
  constructor(services = {}) {
    // Database initialization (supports getDatabase or injected service)
    this.dbPromise = services.database || getDatabase();
    this.bot = services.bot || null;

    // Consciousness modules
    this.personality = new PersonalityEngine();
    this.dynamics = new ConversationDynamics();
    this.intent = new IntentAnalyzer();
    this.memory = new MemoryWeaver(this.dbPromise);
    this.subtext = new SubtextReader();
    this.metrics = new MetricsService(this.dbPromise);
    this.ai = new OpenAIService();
    this.value = new ValueGenerator(services.astrology, this.memory, this.ai);
    this.memoryManager = getMemoryManager();
    this.personalityInject = new PersonalityService();
    this.stateTracker = getStateTracker(); // NEW: State tracker

    this.db = null;
  }

  async getDb() {
    if (!this.db) this.db = await this.dbPromise;
    return this.db;
  }

  // ───────────────────────────────────────────────
  // 🧠 MAIN MESSAGE HANDLER
  // ───────────────────────────────────────────────
  async handleMessage(message, user, chatId) {
    try {

      const db = await this.getDb();
      const messageCount = user.total_messages || 0;

      // console.log("user", user);
      // Metric checks
      if (messageCount === 5) await this.metrics.trackGhosting(user.id, messageCount);
      if (messageCount === 1) await this.metrics.trackResponseToGreeting(user.id, message);

      // Handle greetings early
      // const greetingResponse = await this.handleGreeting(message, user);
      // if (greetingResponse) {
      //   // console.log(`[Greeting] ${message} also the user data`,user);
      //   await this.storeAndLearn(message, greetingResponse.text, null, user);
      //   return greetingResponse.text;
      // }

      // 1️⃣ Analyze message
      const analysis = await this.analyzeMessage(message, user);

      // 2️⃣ Determine mood
      const botMood = await this.personality.determineMood(analysis.context);

      // 2.5️⃣ UPDATE CONVERSATION STATE (Critical Fix)
      // We must update the state with the CURRENT message before generating the response
      // otherwise the AI sees stale data (e.g. thinking we're still talking about the uncle)
      const currentState = await this.stateTracker.getState(chatId);
      await this.stateTracker.updateState(chatId, message, currentState);

      // 3️⃣ Build OpenAI context with ENHANCED MEMORY
      const enhancedMemory = await this.memoryManager.getEnhancedContext(chatId, message);
      const style = user.preferred_conversation_style || "bestie";
      const profile = this.personalityInject.getProfile(style);
      const personalitySystemPrompt = this.personalityInject.getSystemPrompt(style, user);

      // const aiContext = {
      //   message,
      //   currentMessage: message,
      //   userSign: user.sign,
      //   userName: user.name,
      //   element: user.element,
      //   botMood,
      //   messageCount,
      //   energyLevel: this.personality.energyLevel,
      //   recentMessages: enhancedMemory.recentMessages || await db.getRecentMessages(chatId, 5),
      //   summaries: enhancedMemory.summaries,  // NEW: Historical summaries
      //   semanticMatches: enhancedMemory.semanticMatches,  // NEW: Relevant past context
      //   threadDepth: analysis.context.threadDepth || 0,
      //   detectedNeed: analysis.intent.need,
      //   threadEmotion: analysis.subtext.emotion
      // };
      // console.log(`[AI] Mood=${botMood} | Sign=${user.sign}`);

      // 4️⃣ Check for horoscope request
      const horoscopeKeywords = ['horoscope', 'daily reading', 'what do the stars say', 'cosmic forecast', 'astrology today', 'reading', 'menu'];
      const isHoroscopeRequest = horoscopeKeywords.some(keyword => message.toLowerCase().includes(keyword));

      if (isHoroscopeRequest && user.sign) {
        console.log(`[Horoscope Request] Generating contextual horoscope for ${user.name}`);
        const horoscopeResponse = await this.ai.generateContextualHoroscope(
          user,
          enhancedMemory.recentMessages || [],
          enhancedMemory.summaries || []
        );
        await this.storeAndLearn(message, horoscopeResponse, analysis, user);
        return horoscopeResponse;
      }

      // 5️⃣ Generate response

      const aiContext = {
        message: message,
        currentMessage: message,
        userSign: user.sign,
        userName: user.name,
        userBirthDate: user.birth_date,
        astrologyChart: user.astrology_chart, // NEW: Pass full chart for rich context
        botMood,
        messageCount,
        energyLevel: this.personality.energyLevel,
        // Already optimized from memory manager
        recentMessages: enhancedMemory.recentMessages,
        summaries: enhancedMemory.summaries,
        echoBackstory: enhancedMemory.echoBackstory, // NEW: Echo's personal memories
        conversationState: enhancedMemory.conversationState, // NEW: Include state
        personalitySystemPrompt,
        preferredConversationStyle: style
        // Don't send these unless absolutely needed:
        // - semanticMatches (already incorporated in summaries)
        // - IDs, timestamps, metadata (not needed for generation)
        // - threadDepth, detectedNeed (let AI figure it out)
      };
      const aiResponse = await this.ai.generateResponse(aiContext);
      console.log(`[AI Response]`, aiResponse);
      // 5️⃣ Process AI response
      let finalResponse;
      let severity = 0;

      if (typeof aiResponse === 'object' && aiResponse.metadata) {
        finalResponse = aiResponse.text;
        severity = aiResponse.metadata.severity;

        if (aiResponse.metadata.moodOverride) {
          this.personality.shiftMood(aiResponse.metadata.moodOverride);
          // console.log(`🔄 Mood override: ${botMood} → ${aiResponse.metadata.moodOverride}`);
        }

        await this.storeEmotionalState(user.id, {
          severity: aiResponse.metadata.severity,
          emotion: aiResponse.metadata.emotion,
          need: aiResponse.metadata.need,
          timestamp: new Date()
        });

        if (aiResponse.metadata.flags?.crisis) {
          await this.handleCrisisAlert(user, message, aiResponse.metadata);
        }
      } else {
        finalResponse = aiResponse;
      }

      // 6️⃣ Humanization
      // if (severity < 7) {
      //   finalResponse = await this.humanize(finalResponse, botMood);
      // }

      // 7️⃣ Learn + store
      // console.log(`[Greeting yeahh] ${message} also the user data`,user);
      await this.storeAndLearn(message, finalResponse, analysis, user);

      return finalResponse;
    } catch (error) {
      console.error('Conversation handling error:', error);

      const severity = this.ai.fallbackSeverityCheck?.(message) || 0;
      if (severity >= 9) {
        const emergency = this.ai.generateEmergencyResponse(message);
        return emergency.text;
      }

      return this.generateFallback(user);
    }
  }

  // ───────────────────────────────────────────────
  // 🔍 ANALYSIS
  // ───────────────────────────────────────────────
  async analyzeMessage(message, user) {
    const db = await this.getDb();
    const thread = await db.getCurrentThread(user.chat_id);
    const recentMessages = await db.getRecentMessages(user.chat_id, 20);
    const memories = await this.memory.getRelevantMemories(message, user);

    const intent = this.intent.analyzeIntent(message, {
      recentEmotions: thread?.emotional_arc || [],
      sign: user.sign
    });

    const subtext = this.subtext.read(message, recentMessages);
    const flow = this.dynamics.analyzeFlow(recentMessages);
    const relationships = await this.extractRelationships(message, user);

    return {
      intent,
      subtext,
      flow,
      relationships,
      context: {
        user,
        thread,
        memories,
        messageCount: user.total_messages || 0,
        userEnergy: flow.energy,
        threadDepth: thread?.depth_score || 0,
        currentMessage: message,
        recentMessages
      }
    };
  }

  // ───────────────────────────────────────────────
  // ❤️ EMOTIONAL STATE STORAGE
  // ───────────────────────────────────────────────
  async storeEmotionalState(userId, state) {
    try {
      const db = await this.getDb();
      await db.query('user_emotional_states', 'insert', {
        values: {
          user_id: userId,
          severity: state.severity,
          emotion: state.emotion,
          need: state.need,
          timestamp: state.timestamp,
          created_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to store emotional state:', error.message);
    }
  }

  // ───────────────────────────────────────────────
  // ⚠️ CRISIS HANDLER
  // ───────────────────────────────────────────────
  async handleCrisisAlert(user, message, metadata) {
    console.log(`
      🚨 CRISIS ALERT 🚨
      User: ${user.name} (${user.id})
      Message: "${message}"
      Severity: ${metadata.severity}
      Emotion: ${metadata.emotion}
      Need: ${metadata.need}
    `);
  }

  // ───────────────────────────────────────────────
  // 🧍 GREETING HANDLER
  // ───────────────────────────────────────────────
  async handleGreeting(message, user) {
    const greetings = ['hi', 'hello', 'hey', 'sup', 'yo'];
    const lower = message.toLowerCase().trim();
    if (!greetings.includes(lower)) return null;

    await this.metrics.trackResponseToGreeting(user.id, message);

    return {
      text: "Hey! How's your inner world today? Peaceful, chaotic, or somewhere in between?",
      metadata: {
        severity: 0,
        emotion: "neutral",
        need: "connection",
        isGreeting: true
      }
    };
  }

  // ───────────────────────────────────────────────
  // 🧍 STORAGE & MEMORY
  // ───────────────────────────────────────────────
  async storeAndLearn(userMessage, botResponse, analysis, user) {
    try {
      const db = await this.getDb();

      // Store messages as before
      await db.storeMessage(user.chat_id, 'user', userMessage);
      await db.storeMessage(user.chat_id, 'bot', botResponse);

      // Process memory if analysis exists
      if (analysis) {
        await this.memory.process(userMessage, botResponse, analysis);
      }

      // NEW: Update conversation state after storing message
      const previousState = await this.stateTracker.getState(user.chat_id);
      await this.stateTracker.updateState(user.chat_id, userMessage, previousState);

      // Trigger async summarization check
      this.memoryManager.checkAndTriggerSummarization(user.chat_id);

    } catch (error) {
      console.error('Error in storeAndLearn:', error);
    }
  }
  // ───────────────────────────────────────────────
  // 🎭 HUMANIZATION
  // ───────────────────────────────────────────────
  async humanize(response, mood) {
    let humanized = this.personality.generateQuirks(mood)(response);
    humanized = this.removeRoboticPatterns(humanized);
    if (Math.random() < 0.2) humanized = this.addThinkingPauses(humanized);
    return humanized;
  }

  removeRoboticPatterns(text) {
    const roboticPhrases = {
      "I understand": ["Yeah", "I see", "Got it"],
      "That sounds": ["That's", "Seems", "Feels"],
      "I'm sorry to hear": ["That's rough", "Damn", "Heavy"]
    };
    let t = text;
    for (const [r, a] of Object.entries(roboticPhrases)) {
      if (t.includes(r)) t = t.replace(r, a[Math.floor(Math.random() * a.length)]);
    }
    return t;
  }

  addThinkingPauses(text) {
    const pauses = [
      t => "Hmm... " + t,
      t => t.replace(/\. /, "... "),
      t => "Actually—" + t
    ];
    return pauses[Math.floor(Math.random() * pauses.length)](text);
  }

  // ───────────────────────────────────────────────
  // PLACEHOLDERS
  // ───────────────────────────────────────────────
  extractRelationships() {
    return [];
  }

  generateFallback() {
    return "Cosmic static... let me recalibrate...";
  }
}

export default ConversationHandler;
