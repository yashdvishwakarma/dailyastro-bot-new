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
import BotEngine from '../services/BotEngine.js';

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

      // 1. Metric checks
      const messageCount = user.total_messages || 0;
      if (messageCount === 5) await this.metrics.trackGhosting(user.id, messageCount);

      // 2. Load Bot Configuration (Middleware Pivot)
      // Retrieve the specific personality/config for this user/session
      // 2. Load Bot Configuration (Middleware Pivot)
      // TEST MODE: Prefer 'SalesBot' to verify RAG, fallback to 'Echo'
      let { data: botConfig } = await db.supabase
        .from('bot_configs')
        .select('*')
        .eq('name', 'SalesBot')
        .single();

      console.log(`🤖 DEBUG: Loaded Config for 'SalesBot':`, botConfig ? "FOUND" : "NULL");

      if (!botConfig) {
        const { data: echoConfig } = await db.supabase
          .from('bot_configs')
          .select('*')
          .eq('name', 'Echo')
          .single();
        botConfig = echoConfig;
      }

      if (!botConfig) {
        throw new Error("Bot Configuration missing. Please run middleware_setup.sql");
      }

      // 3. Update Conversation State (Tracker)
      const currentState = await this.stateTracker.getState(chatId);
      await this.stateTracker.updateState(chatId, message, currentState);

      // 4. Retrieve Context (Memory + RAG)
      // Get standard chat history
      const recentMessages = await db.getFullRecentMessages(chatId, 5);

      // Get RAG Knowledge (if configured)
      let ragContent = "";
      if (botConfig.knowledge_base_id) {
        // Use the memory manager to search the specific KB
        const embedding = await this.ai.createEmbedding(message);
        if (embedding) {
          // Increased limit to 10 to ensure we capture widely separated context (like Intro vs Definition)
          const results = await this.memoryManager.searchKnowledgeBase(embedding, botConfig.knowledge_base_id, 10);
          if (results && results.length > 0) {
            ragContent = results.map(r => r.content || r.summary_text).join("\n---\n");

            // RAG VERIFICATION LOGGING
            console.log(`\n📚 RAG VERIFICATION: Found ${results.length} chunks from [${botConfig.knowledge_base_id}]`);
            results.forEach((r, i) => {
              const source = r.metadata?.source ? r.metadata.source.split(/[\\/]/).pop() : 'Unknown';
              console.log(`   [Chunk ${i + 1}] Source: ${source}`);
            });
          } else {
            console.log(`\n📚 RAG VERIFICATION: No relevant docs found for query in [${botConfig.knowledge_base_id}]`);
          }
        }
      }

      // 5. Instantiate Bot Engine (Per Request or Cached)
      // We create a fresh instance to ensure config is up to date
      const engine = new BotEngine(botConfig);

      // 6. Generate Response
      const context = {
        recentMessages: recentMessages.reverse().map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.message
        })),
        rag_content: ragContent
      };

      console.log(`🤖 Generating response via BotEngine [Model: ${botConfig.model}]...`);
      const response = await engine.generateResponse(message, context);

      // 7. Handle Output (Text or JSON)
      let finalText = "";
      let metadata = {};

      if (typeof response === 'string') {
        finalText = response;
      } else {
        // Structured/Empathic mode
        finalText = response.text || "I am here.";
        metadata = response; // Store full metadata
      }

      // 8. Store & Learn
      await this.storeAndLearn(message, finalText, null, user);

      // Optional: Store emotional state if present
      if (metadata.severity) {
        await this.storeEmotionalState(user.id, metadata);
      }

      return finalText;

    } catch (error) {
      console.error('ConversationHandler Error:', error);
      return "I am currently undergoing a system upgrade. Please try again in a moment.";
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
