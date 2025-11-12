// services/DatabaseService.js
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

/**
 * DatabaseService — Unified Supabase-powered data layer
 * ------------------------------------------------------
 * ✅ Keeps Supabase as backend (works locally & in production)
 * ✅ Structured like pg.Pool with initialize() + query()
 * ✅ Provides helper methods for users, messages, and bot state
 * ✅ Safe singleton pattern — never reinitializes connection
 */
class DatabaseService {
  constructor() {
    this.supabase = null;
    this.initialized = false;
    this.initPromise = this.initialize();
  }

  /** Initialize Supabase client safely */
  async initialize() {
    if (this.initialized) return this;

    try {
      this.supabase = createClient(config.supabase.url, config.supabase.key);
      this.initialized = true;
      return this;
    } catch (err) {
      console.error("❌ DatabaseService initialization failed:", err.message);
      throw err;
    }
  }

  /** Optional query wrapper — similar to pg.query() */
  async query(table, operation, params = {}) {
    if (!this.initialized) await this.initPromise;

    try {
      switch (operation) {
        case "select":
          return await this.supabase
            .from(table)
            .select(params.columns || "*")
            .match(params.match || {});
        case "insert":
          return await this.supabase.from(table).insert(params.values);
        case "update":
          return await this.supabase
            .from(table)
            .update(params.values)
            .match(params.match || {});
        case "delete":
          return await this.supabase
            .from(table)
            .delete()
            .match(params.match || {});
        default:
          throw new Error(`Unsupported query operation: ${operation}`);
      }
    } catch (error) {
      console.error(`❌ Query failed [${table}/${operation}]:`, error.message);
      return { data: null, error };
    }
  }

  // ────────────────────────────────────────────────────────────────
  // 🧍 USER MANAGEMENT
  // ────────────────────────────────────────────────────────────────

  async getUser(chatId) {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("chat_id", chatId.toString())
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Get user error:", error);
    }

    return data;
  }

  async createUser(userData) {
    const { error } = await this.supabase.from("users").insert(userData);
    if (error) console.error("Create user error:", error);
  }

  async updateUser(chatId, updates) {
    const { error } = await this.supabase
      .from("users")
      .update({
        ...updates,
        last_interaction: new Date().toISOString(),
      })
      .eq("chat_id", chatId.toString());
    if (error) console.error("Update user error:", error);
  }

  async getActiveUsers() {
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .gt("last_interaction", cutoff);
    if (error) console.error("Active user query error:", error);
    return data || [];
  }

  // ────────────────────────────────────────────────────────────────
  // 💬 MESSAGES & THREADS
  // ────────────────────────────────────────────────────────────────

  async storeMessage(chatId, sender, message, emotion = null) {
    const { error } = await this.supabase.from("conversation_history").insert({
      chat_id: chatId.toString(),
      sender,
      message,
      emotion_tone: emotion,
      created_at: new Date().toISOString(),
    });

    if (error) console.error("Store message error:", error);
  }

  async getRecentMessages(chatId, limit = 20) {
    const { data, error } = await this.supabase
      .from("conversation_history")
      .select("message")
      .eq("chat_id", chatId.toString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) console.error("Get recent messages error:", error);
    return data || [];
  }

  async storeSummary(chatId, summary, originalMessages) {
    const { error } = await this.supabase
      .from("conversation_summaries")
      .insert({
        chat_id: chatId,
        summary_text: summary,
        message_count: originalMessages.length,
        message_ids: originalMessages.map((m) => m.id),
        created_at: new Date().toISOString(),
      });

    if (error) console.error("Store summary error:", error);
  }

  async getMessageCount(chatId) {
    const { count, error } = await this.supabase
      .from("conversation_history")
      .select("*", { count: "exact", head: true })
      .eq("chat_id", chatId.toString());
    if (error) console.error("Message count error:", error);
    return count || 0;
  }

  async getCurrentThread(chatId) {
    const { data, error } = await this.supabase
      .from("conversation_threads")
      .select("*")
      .eq("chat_id", chatId.toString())
      .eq("thread_status", "active")
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Get thread error:", error);
    }
    return data;
  }

  // ────────────────────────────────────────────────────────────────
  // 🧠 BOT CONSCIOUSNESS
  // ────────────────────────────────────────────────────────────────

  // async getBotConsciousness() {
  //   const { data, error } = await this.supabase
  //     .from('bot_consciousness')
  //     .select('top 1 *')
  //     .single();
  //   if (error) console.error('Get consciousness error:', error);
  //   return data;
  // }

  async getBotConsciousness() {
    const { data, error } = await this.supabase
      .from("bot_consciousness")
      .select("*")
      .order("last_updated", { ascending: false })
      .limit(1)
      .single(); // returns the first record directly

    if (error) console.error("Get consciousness error:", error);
    return data;
  }

  async createBotConsciousness(consciousness) {
    const { error } = await this.supabase
      .from("bot_consciousness")
      .insert(consciousness);
    if (error) console.error("Create consciousness error:", error);
  }

  async updateBotConsciousness(updates) {
    const { error } = await this.supabase
      .from("bot_consciousness")
      .update(updates)
      .eq("id", 1);
    if (error) console.error("Update consciousness error:", error);
  }

  async logConversationMetric(userId, metricType, metricValue) {
    try {
      const payload = {
        user_id: userId,
        metric_type: metricType,
        metric_value:
          typeof metricValue === "object"
            ? JSON.stringify(metricValue) // serialize objects safely
            : metricValue,
      };

      const { error } = await this.supabase
        .from("conversation_metrics")
        .insert([payload]);
      1;
      console.log(`📊 Logged metric → ${metricType} for user ${userId}`);

      if (error) {
        console.error(`❌ Failed to insert metric (${metricType}):`, error);
      }
    } catch (err) {
      console.error("Unexpected error logging metric:", err);
    }
  }

  // handlers/CommandHandler.js - Complete Supabase reset

  async handleReset(user) {
    try {
      console.log(
        `🔄 COMPLETE RESET for user ${user.id} - Deleting everything!`
      );

      const supabase = this.supabase;

      // 1. Delete all messages
      const { error: msgError } = await supabase
        .from("messages")
        .delete()
        .eq("chat_id", user.chat_id);

      if (!msgError) console.log("✅ Messages deleted");

      // 2. Delete all emotional states
      const { error: emotionError } = await supabase
        .from("user_emotional_states")
        .delete()
        .eq("user_id", user.id);

      if (!emotionError) console.log("✅ Emotional states deleted");

      // 3. Delete all conversation metrics
      const { error: metricsError } = await supabase
        .from("conversation_metrics")
        .delete()
        .eq("user_id", user.id);

      if (!metricsError) console.log("✅ Metrics deleted");

      // 4. Delete vulnerability metrics
      const { error: vulnError } = await supabase
        .from("vulnerability_metrics")
        .delete()
        .eq("user_id", user.id);

      if (!vulnError) console.log("✅ Vulnerability metrics deleted");

      // 5. Delete conversation threads
      const { error: threadError } = await supabase
        .from("conversation_threads")
        .delete()
        .eq("chat_id", user.chat_id);

      if (!threadError) console.log("✅ Threads deleted");

      // 6. Delete conversation memories
      const { error: memoryError } = await supabase
        .from("conversation_memories")
        .delete()
        .eq("user_id", user.id);

      if (!memoryError) console.log("✅ Memories deleted");

      // 7. DELETE THE USER COMPLETELY
      const { error: userError } = await supabase
        .from("users")
        .delete()
        .eq("id", user.id);

      if (!userError) {
        console.log("✅ USER COMPLETELY DELETED");
      } else {
        console.error("User delete error:", userError);
      }

      // 8. Reset personality engine to defaults
      if (this.personality) {
        this.personality.currentMood = "curious";
        this.personality.energyLevel = 0.7;
        this.personality.moodHistory = [];
        this.personality.lastMoodShift = Date.now();
      }

      // Clear any cached data
      if (this.cache && this.cache[user.chat_id]) {
        delete this.cache[user.chat_id];
      }

      return {
        text:
          `✨ *COMPLETE RESET!*\n\n` +
          `All your data has been completely deleted.\n` +
          `You no longer exist in my memory.\n\n` +
          `Type /start to create a fresh account.`,
        parse_mode: "Markdown",
      };
    } catch (error) {
      console.error("Reset failed:", error);
      return {
        text: "❌ Reset failed: " + error.message,
        parse_mode: "Markdown",
      };
    }
  }


  // Add these methods to your DatabaseService class

// ============= SUMMARIZATION METHODS =============

async getUnsummarizedMessages(chatId, limit = 10) {
  const { data, error } = await this.supabase
    .from("conversation_history")
    .select("*")
    .eq("chat_id", chatId.toString())
    .eq("summarized", false)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Get unsummarized messages error:", error);
    return [];
  }
  return data || [];
}

async getUnsummarizedMessageCount(chatId) {
  const { count, error } = await this.supabase
    .from("conversation_history")
    .select("*", { count: "exact", head: true })
    .eq("chat_id", chatId.toString())
    .eq("summarized", false);

  if (error) {
    console.error("Get unsummarized count error:", error);
    return 0;
  }
  return count || 0;
}

async markMessagesAsSummarized(messageIds) {
  const { error } = await this.supabase
    .from("conversation_history")
    .update({ summarized: true })
    .in("id", messageIds);

  if (error) {
    console.error("Mark messages as summarized error:", error);
    return false;
  }
  return true;
}

async storeSummaryWithEmbedding(chatId, summaryText, messageIds, embedding) {
  // Start a transaction-like operation
  try {
    // 1. Store the summary
    const { data: summaryData, error: summaryError } = await this.supabase
      .from("conversation_summaries")
      .insert({
        chat_id: chatId.toString(),
        summary_text: summaryText,
        message_count: messageIds.length,
        message_ids: messageIds,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (summaryError) throw summaryError;

    // 2. Store the embedding
    if (embedding && summaryData) {
      const { error: embeddingError } = await this.supabase
        .from("conversation_embeddings")
        .insert({
          chat_id: chatId.toString(),
          content_type: "summary",
          summary_id: summaryData.id,
          embedding: embedding,
          created_at: new Date().toISOString(),
        });

      if (embeddingError) throw embeddingError;
    }

    // 3. Mark messages as summarized
    await this.markMessagesAsSummarized(messageIds);

    console.log(`✅ Stored summary for chat ${chatId} with ${messageIds.length} messages`);
    return summaryData;
  } catch (error) {
    console.error("Store summary with embedding error:", error);
    return null;
  }
}

async getRecentSummaries(chatId, limit = 2) {
  const { data, error } = await this.supabase
    .from("conversation_summaries")
    .select("*")
    .eq("chat_id", chatId.toString())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Get recent summaries error:", error);
    return [];
  }
  return data || [];
}

async semanticSearch(chatId, queryEmbedding, limit = 2) {
  try {
    // Using Supabase's vector similarity search
    const { data, error } = await this.supabase.rpc("match_embeddings", {
      query_embedding: queryEmbedding,
      match_chat_id: chatId.toString(),
      match_count: limit,
      match_threshold: 0.7, // Similarity threshold
    });

    if (error) {
      console.error("Semantic search error:", error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error("Semantic search failed:", error);
    return [];
  }
}

// Enhanced getRecentMessages to include all fields
async getFullRecentMessages(chatId, limit = 20) {
  const { data, error } = await this.supabase
    .from("conversation_history")
    .select("*")
    .eq("chat_id", chatId.toString())
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Get full recent messages error:", error);
    return [];
  }
  return data || [];
}

}

// ────────────────────────────────────────────────────────────────
// 🧩 Singleton export — ensures one live instance across app
// ────────────────────────────────────────────────────────────────
let dbInstance = null;

/** Use this everywhere instead of `new DatabaseService()` */
export default async function getDatabase() {
  if (!dbInstance) {
    dbInstance = new DatabaseService();
    await dbInstance.initialize();
  }
  return dbInstance;
}

/** Also export the class itself (for DI or testing) */
export { DatabaseService };
