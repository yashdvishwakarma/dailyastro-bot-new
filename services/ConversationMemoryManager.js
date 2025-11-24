// services/ConversationMemoryManager.js
import getDatabase from './DatabaseService.js';
import OpenAIService from './OpenAIService.js';
import getStateTracker from './ConversationStateTracker.js';

class ConversationMemoryManager {
  constructor() {
    this.openAIService = new OpenAIService();
    this.summarizationQueue = new Map(); // Track ongoing summarizations
    this.SUMMARY_THRESHOLD = 10;
    this.summaryCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000;
  }

  /**
   * Check and trigger summarization if needed
   * Called after each message is stored
   */
  async checkAndTriggerSummarization(chatId) {
    try {
      // Prevent duplicate summarization
      if (this.summarizationQueue.has(chatId)) {
        console.log(`⏳ Summarization already in progress for chat ${chatId}`);
        return;
      }

      const db = await getDatabase();
      const unsummarizedCount = await db.getUnsummarizedMessageCount(chatId);

      console.log(`📊 Chat ${chatId} has ${unsummarizedCount} unsummarized messages`);

      if (unsummarizedCount >= this.SUMMARY_THRESHOLD) {
        // Trigger async summarization
        this.triggerAsyncSummarization(chatId);
      }
    } catch (error) {
      console.error('Check summarization error:', error);
    }
  }

  /**
   * Async summarization process
   */
  async triggerAsyncSummarization(chatId) {
    // Mark as in progress
    this.summarizationQueue.set(chatId, true);

    // Run in background (don't await)
    this.performSummarization(chatId)
      .then(() => {
        console.log(`✅ Summarization completed for chat ${chatId}`);
      })
      .catch((error) => {
        console.error(`❌ Summarization failed for chat ${chatId}:`, error);
      })
      .finally(() => {
        // Remove from queue
        this.summarizationQueue.delete(chatId);
      });
  }

  /**
   * Perform the actual summarization
   */
  async performSummarization(chatId) {
    const db = await getDatabase();

    // 1. Get unsummarized messages
    const messages = await db.getUnsummarizedMessages(chatId, this.SUMMARY_THRESHOLD);

    if (messages.length < this.SUMMARY_THRESHOLD) {
      console.log(`Not enough messages to summarize (${messages.length})`);
      return;
    }

    console.log(`🤖 Generating summary for ${messages.length} messages...`);

    // 2. Generate summary using AI
    const summaryText = await this.openAIService.generateSummary(messages);

    if (!summaryText) {
      throw new Error('Failed to generate summary');
    }

    // 3. Create embedding for semantic search
    const embedding = await this.openAIService.createEmbedding(summaryText);

    // 4. Store summary and embedding
    const messageIds = messages.map(m => m.id);
    await db.storeSummaryWithEmbedding(chatId, summaryText, messageIds, embedding);

    console.log(`📝 Summary stored: "${summaryText.substring(0, 100)}..."`);

    // 5. Optional: Log metrics
    await db.logConversationMetric(chatId, 'summary_created', {
      message_count: messages.length,
      summary_length: summaryText.length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get enhanced context for a conversation
   * OPTIMIZED: 3 messages + state tracking instead of 5 truncated messages
   */
  async getEnhancedContext(chatId, currentMessage) {
    const db = await getDatabase();
    const stateTracker = getStateTracker();

    try {
      // Check cache first
      const cached = this.summaryCache.get(chatId);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`📦 Using cached context for ${chatId}`);
        return cached.data;
      }

      // Create embedding for current message for semantic search
      const queryEmbedding = await this.openAIService.createEmbedding(currentMessage);

      // Fetch all context data in parallel + conversation state
      const [recentMessages, summaries, semanticMatches, conversationState] = await Promise.all([
        db.getFullRecentMessages(chatId, 3), // REDUCED: 3 messages instead of 5
        db.getRecentSummaries(chatId, 2),
        queryEmbedding ? db.semanticSearch(chatId, queryEmbedding, 2) : [],
        stateTracker.getState(chatId) // NEW: Get conversation state
      ]);

      // OPTIMIZE: Keep full messages but in chronological order (oldest → newest)
      const optimizedMessages = recentMessages
        .reverse() // FIX: Reverse to chronological order
        .map(msg => ({
          sender: msg.sender,
          message: msg.message // NO TRUNCATION: Keep full message
        }));

      // Keep summaries full (they're already concise)
      const optimizedSummaries = summaries.map(sum =>
        typeof sum === 'string' ? sum : sum.summary_text
      );

      // Semantic matches - keep relevant parts
      const optimizedSemanticMatches = semanticMatches.map(match =>
        typeof match === 'string' ? match : match.content
      );

      // Create optimized context with state
      const context = {
        recentMessages: optimizedMessages,
        summaries: optimizedSummaries,
        semanticMatches: optimizedSemanticMatches,
        conversationState, // NEW: Include conversation state
        hasContext: summaries.length > 0 || semanticMatches.length > 0
      };

      // Cache the result
      this.summaryCache.set(chatId, {
        data: context,
        timestamp: Date.now()
      });

      // Clean old cache entries if cache gets too big
      if (this.summaryCache.size > 100) {
        const oldest = [...this.summaryCache.entries()]
          .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
        this.summaryCache.delete(oldest[0]);
      }

      return context;

    } catch (error) {
      console.error('Get enhanced context error:', error);
      // Fallback to just recent messages
      const fallbackMessages = await db.getFullRecentMessages(chatId, 3);
      return {
        recentMessages: fallbackMessages.reverse().map(msg => ({
          sender: msg.sender,
          message: msg.message // Keep full message even in fallback
        })),
        summaries: [],
        semanticMatches: [],
        conversationState: { current_topic: 'general_chat' },
        hasContext: false
      };
    }
  }

  /**
   * Format context for display or debugging
   */
  formatContextForDisplay(context) {
    let formatted = '=== CONVERSATION CONTEXT ===\n\n';

    if (context.summaries?.length > 0) {
      formatted += '📚 CONVERSATION HISTORY:\n';
      context.summaries.forEach((summary, idx) => {
        formatted += `Summary ${idx + 1}: ${summary.summary_text}\n\n`;
      });
    }

    if (context.recentMessages?.length > 0) {
      formatted += '💬 RECENT MESSAGES:\n';
      context.recentMessages.forEach(msg => {
        formatted += `${msg.sender}: ${msg.message.substring(0, 100)}...\n`;
      });
    }

    if (context.semanticMatches?.length > 0) {
      formatted += '\n🔍 RELEVANT PAST CONTEXT:\n';
      context.semanticMatches.forEach(match => {
        formatted += `- ${match.content}\n`;
      });
    }

    return formatted;
  }
}

// Export singleton instance
let memoryManagerInstance = null;

export default function getMemoryManager() {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new ConversationMemoryManager();
  }
  return memoryManagerInstance;
}

export { ConversationMemoryManager };