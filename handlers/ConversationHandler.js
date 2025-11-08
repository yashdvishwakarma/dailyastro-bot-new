// handlers/ConversationHandler.js
import PersonalityEngine from '../consciousness/PersonalityEngine.js';
import ConversationDynamics from '../consciousness/ConversationDynamics.js';
import IntentAnalyzer from '../intelligence/IntentAnalyzer.js';
import ValueGenerator from '../consciousness/ValueGenerator.js';
import MemoryWeaver from '../consciousness/MemoryWeaver.js';
import SubtextReader from '../intelligence/SubtextReader.js';
import OpenAIService from '../services/OpenAIService.js';
import MetricsService from '../services/MetricsService.js';

class ConversationHandler {
  constructor(services) {
    this.db = services.database;
    this.bot = services.bot; // Need this for sending messages
    
    // Initialize consciousness modules
    this.personality = new PersonalityEngine();
    this.dynamics = new ConversationDynamics();
    this.intent = new IntentAnalyzer();
    this.memory = new MemoryWeaver(this.db);
    this.subtext = new SubtextReader();
    this.metrics = new MetricsService(this.db);
    // Initialize AI service (ONCE)
    this.ai = new OpenAIService();
    this.value = new ValueGenerator(services.astrology, this.memory, this.ai);
  }
  
  // SINGLE MAIN HANDLER METHOD
  async handleMessage(message, user, chatId) {
    try {

      const messageCount = user.total_messages || 0;

          if (messageCount === 5) {
        await this.metrics.trackGhosting(user.id, messageCount);
      }

            // Check if this is a response to our greeting
      if (messageCount === 1) { // Second message (after hi)
        await this.metrics.trackResponseToGreeting(user.id, message);
      }
      
// Check for standard greeting first
          const greetingResponse = await this.handleGreeting(message, user);
    if (greetingResponse) {
      await this.storeAndLearn(message, greetingResponse.text, null, user);
      return greetingResponse.text;
    }

      // 1. Analyze the message context
      const analysis = await this.analyzeMessage(message, user);
      
      // 2. Determine bot mood
      const botMood = await this.personality.determineMood(analysis.context);
      
      // 3. Build comprehensive context for AI
      const aiContext = {
        message,
        currentMessage: message,
        userSign: user.sign,
        userName: user.name,
        element: user.element,
        botMood,
        messageCount: user.total_messages || 0,
        energyLevel: this.personality.energyLevel,
        recentMessages: await this.db.getRecentMessages(user.chat_id, 5),
        threadDepth: analysis.context.threadDepth || 0,
        detectedNeed: analysis.intent.need,
        threadEmotion: analysis.subtext.emotion
      };
      
      console.log(`Received message from botMood=${botMood}`);
      
      // 4. Get AI response with emotional intelligence
      const aiResponse = await this.ai.generateResponse(aiContext);
      
      // 5. Process the response
      let finalResponse;
      let severity = 0;


            if (aiResponse.metadata?.severity >= 5) {
        await this.metrics.trackVulnerability(
          user.id,
          messageCount,
          message,
          aiResponse.metadata.severity,
          aiResponse.metadata.emotion
        );
      }
      
      if (typeof aiResponse === 'object' && aiResponse.metadata) {
        // Structured response with metadata
        finalResponse = aiResponse.text;
        severity = aiResponse.metadata.severity;
        
        // Handle mood override for high severity
        if (aiResponse.metadata.moodOverride) {
          this.personality.shiftMood(aiResponse.metadata.moodOverride);
          console.log(`🔄 Mood override: ${botMood} → ${aiResponse.metadata.moodOverride}`);
        }
        
        // Store emotional state
        await this.storeEmotionalState(user.id, {
          severity: aiResponse.metadata.severity,
          emotion: aiResponse.metadata.emotion,
          need: aiResponse.metadata.need,
          timestamp: new Date()
        });
        
        // Handle crisis situations
        if (aiResponse.metadata.flags?.crisis) {
          await this.handleCrisisAlert(user, message, aiResponse.metadata);
        }
        
      } else {
        // Simple text response (fallback)
        finalResponse = aiResponse;
      }
      
      // 6. Apply personality quirks ONLY if not high severity
      if (severity < 7) {
        finalResponse = await this.humanize(finalResponse, botMood);
      }
      
      // 7. Store conversation data
      await this.storeAndLearn(message, finalResponse, analysis, user);
      
      // 8. Return response (bot.js will send it)
      return finalResponse;
      
    } catch (error) {
      console.error('Conversation handling error:', error);
      
      // Emergency fallback for crisis
      const severity = this.ai.fallbackSeverityCheck(message);
      if (severity >= 9) {
        const emergency = this.ai.generateEmergencyResponse(message);
        return emergency.text;
      }
      
      return this.generateFallback(user);
    }
  }
  
  async analyzeMessage(message, user) {
    const thread = await this.db.getCurrentThread(user.chat_id);
    const recentMessages = await this.db.getRecentMessages(user.chat_id, 5);
    const memories = await this.memory.getRelevantMemories(message, user);

    const intent = this.intent.analyzeIntent(message, {
      recentEmotions: thread?.emotional_arc || [],
      sign: user.sign,
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
        recentMessages: recentMessages || [],
      },
    };
  }
  
  async storeEmotionalState(userId, state) {
    try {
      // Create table if doesn't exist
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS user_emotional_states (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          severity INTEGER,
          emotion VARCHAR(50),
          need VARCHAR(100),
          timestamp TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      await this.db.query(`
        INSERT INTO user_emotional_states 
        (user_id, severity, emotion, need, timestamp)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, state.severity, state.emotion, state.need, state.timestamp]);
      
    } catch (error) {
      console.error('Failed to store emotional state:', error);
    }
  }
  
  async handleCrisisAlert(user, message, metadata) {
    console.log(`
      🚨 CRISIS ALERT 🚨
      User: ${user.name} (${user.id})
      Message: "${message}"
      Severity: ${metadata.severity}
      Emotion: ${metadata.emotion}
      Need: ${metadata.need}
    `);
    
    // Future: Could send alerts to monitoring service
  }
  
  async humanize(response, mood) {
    let humanized = this.personality.generateQuirks(mood)(response);
    humanized = this.removeRoboticPatterns(humanized);
    
    // Add variations occasionally
    if (Math.random() < 0.2) {
      humanized = this.addThinkingPauses(humanized);
    }
    
    return humanized;
  }
  
  removeRoboticPatterns(text) {
    const roboticPhrases = {
      "I understand": ["Yeah", "I see", "Got it"],
      "That sounds": ["That's", "Seems", "Feels"],
      "I'm sorry to hear": ["That's rough", "Damn", "Heavy"]
    };
    
    let humanized = text;
    Object.entries(roboticPhrases).forEach(([robotic, alternatives]) => {
      if (humanized.includes(robotic)) {
        const alt = alternatives[Math.floor(Math.random() * alternatives.length)];
        humanized = humanized.replace(robotic, alt);
      }
    });
    
    return humanized;
  }
  
  addThinkingPauses(text) {
    const pauses = [
      text => "Hmm... " + text,
      text => text.replace(/\. /, "... "),
      text => "Actually—" + text
    ];
    
    const pause = pauses[Math.floor(Math.random() * pauses.length)];
    return pause(text);
  }
  
  async storeAndLearn(userMessage, botResponse, analysis, user) {
    await this.db.storeMessage({
      chat_id: user.chat_id,
      sender: 'user',
      message: userMessage,
      detected_intent: analysis.intent.primary,
      emotional_state: analysis.subtext
    });
    
    await this.db.storeMessage({
      chat_id: user.chat_id,
      sender: 'bot',
      message: botResponse,
      bot_mood: this.personality.currentMood
    });
    
    await this.memory.process(userMessage, botResponse, analysis);
  }

  // handlers/ConversationHandler.js - Add this method

async handleGreeting(message, user) {
  const greetings = ['hi', 'hello', 'hey', 'sup', 'yo'];
  const lowerMessage = message.toLowerCase().trim();
  
  if (greetings.includes(lowerMessage)) {
    // Track greeting metrics
    // await this.trackMetric(user.id, 'greeting_received', {
    //   timestamp: new Date(),
    //   message_count: user.total_messages || 0
    // });

    // When severity >= 5
await this.metrics.trackVulnerability(user.id, messageCount, message, severity, emotion);

// For greeting responses
await this.metrics.trackResponseToGreeting(user.id, message);
    
    // Return the specific greeting response
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
  
  return null;
}


  // Placeholder methods
  extractRelationships(message, user) {
    return [];
  }
  
  generateFallback(user) {
    return "Cosmic static... let me recalibrate...";
  }

  
}

export default ConversationHandler;