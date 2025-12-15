// services/ConversationMemoryManager.js
import getDatabase from './DatabaseService.js';
import OpenAIService from './OpenAIService.js';
import getStateTracker from './ConversationStateTracker.js';

class ConversationMemoryManager {
  constructor() {
    this.openAIService = new OpenAIService();
    this.summarizationQueue = new Map();
    this.SUMMARY_THRESHOLD = 10;
    this.summaryCache = new Map();
    this.cacheTimeout = 30 * 60 * 1000;
  }

  async checkAndTriggerSummarization(chatId) {
    try {
      if (this.summarizationQueue.has(chatId)) {
        console.log(`⏳ Summarization already in progress for chat ${chatId}`);
        return;
      }
      const db = await getDatabase();
      const unsummarizedCount = await db.getUnsummarizedMessageCount(chatId);
      console.log(`📊 Chat ${chatId} has ${unsummarizedCount} unsummarized messages`);
      if (unsummarizedCount >= this.SUMMARY_THRESHOLD) {
        this.triggerAsyncSummarization(chatId);
      }
    } catch (error) {
      console.error('Check summarization error:', error);
    }
  }

  async triggerAsyncSummarization(chatId) {
    this.summarizationQueue.set(chatId, true);
    this.performSummarization(chatId)
      .then(() => console.log(`✅ Summarization completed for chat ${chatId}`))
      .catch((err) => console.error(`❌ Summarization failed for chat ${chatId}:`, err))
      .finally(() => this.summarizationQueue.delete(chatId));
  }

  async performSummarization(chatId) {
    const db = await getDatabase();
    const messages = await db.getUnsummarizedMessages(chatId, this.SUMMARY_THRESHOLD);
    if (messages.length < this.SUMMARY_THRESHOLD) {
      console.log(`Not enough messages to summarize (${messages.length})`);
      return;
    }
    console.log(`🤖 Generating summary for ${messages.length} messages...`);
    const summaryText = await this.openAIService.generateSummary(messages);
    if (!summaryText) throw new Error('Failed to generate summary');
    const embedding = await this.openAIService.createEmbedding(summaryText);
    const messageIds = messages.map(m => m.id);
    await db.storeSummaryWithEmbedding(chatId, summaryText, messageIds, embedding);
    console.log(`📝 Summary stored: "${summaryText.substring(0, 100)}..."`);
    await db.logConversationMetric(chatId, 'summary_created', {
      message_count: messages.length,
      summary_length: summaryText.length,
      timestamp: new Date().toISOString()
    });
  }

  async getEnhancedContext(chatId, currentMessage) {
    try {
      const db = await getDatabase();
      const stateTracker = getStateTracker();
      const recentMessages = await db.getFullRecentMessages(chatId, 5);
      const summaries = await db.getRecentSummaries(chatId, 2);
      const conversationState = stateTracker.getState(chatId) || { current_topic: 'general_chat' };

      let semanticMatches = [];
      let echoBackstory = [];

      if (currentMessage) {
        const queryEmbedding = await this.openAIService.createEmbedding(currentMessage);
        if (queryEmbedding) {
          semanticMatches = await db.semanticSearch(chatId, queryEmbedding, 2);
          console.log('🔍 Searching Echo backstory for:', currentMessage.substring(0, 50));
          echoBackstory = await this.searchEchoBackstory(queryEmbedding, 2);
          console.log('✨ Echo backstory results:', echoBackstory?.length || 0, 'chunks');
          if (echoBackstory?.length > 0) {
            const preview = echoBackstory[0].content || echoBackstory[0].summary_text || '';
            console.log('📖 First backstory chunk preview:', preview.substring(0, 100));
          }
        }
      }

      return {
        recentMessages: recentMessages.reverse().map(msg => ({
          sender: msg.sender,
          message: msg.message,
          emotion: msg.emotion_tone
        })),
        summaries: summaries || [],
        semanticMatches: semanticMatches || [],
        echoBackstory: echoBackstory || [],
        conversationState,
        hasContext: recentMessages.length > 0 || summaries.length > 0
      };
    } catch (error) {
      console.error('Error getting enhanced context:', error);
      return {
        recentMessages: [],
        summaries: [],
        semanticMatches: [],
        echoBackstory: [],
        conversationState: { current_topic: 'general_chat' },
        hasContext: false
      };
    }
  }

  async searchKnowledgeBase(queryEmbedding, kbId, limit = 2) {
    try {
      const db = await getDatabase();
      if (!db.supabase) {
        console.warn('Supabase not available for knowledge base search');
        return [];
      }

      const { data, error } = await db.supabase.rpc('match_embeddings', {
        query_embedding: queryEmbedding,
        match_threshold: 0.1,
        match_count: limit,
        match_chat_id: kbId
      });

      if (error) {
        console.error('❌ RPC Error:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Error in searchKnowledgeBase:', err);
      return [];
    }
  }

  formatContextForDisplay(context) {
    let formatted = '=== CONVERSATION CONTEXT ===\n\n';
    if (context.summaries?.length > 0) {
      formatted += '📚 CONVERSATION HISTORY:\n';
      context.summaries.forEach((s, i) => {
        formatted += `Summary ${i + 1}: ${s.summary_text}\n\n`;
      });
    }
    if (context.recentMessages?.length > 0) {
      formatted += '💬 RECENT MESSAGES:\n';
      context.recentMessages.forEach(m => {
        formatted += `${m.sender}: ${m.message.substring(0, 100)}...\n`;
      });
    }
    if (context.semanticMatches?.length > 0) {
      formatted += '\n🔍 RELEVANT PAST CONTEXT:\n';
      context.semanticMatches.forEach(m => {
        formatted += `- ${m.content}\n`;
      });
    }
    if (context.echoBackstory?.length > 0) {
      formatted += '\n✨ ECHO\'S MEMORIES:\n';
      context.echoBackstory.forEach(mem => {
        const txt = mem.content || mem.summary_text || '';
        formatted += `- ${txt}\n`;
      });
    }
    return formatted;
  }
}

let memoryManagerInstance = null;
export default function getMemoryManager() {
  if (!memoryManagerInstance) memoryManagerInstance = new ConversationMemoryManager();
  return memoryManagerInstance;
}
export { ConversationMemoryManager };