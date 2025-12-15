// services/ConversationStateTracker.js
import getDatabase from "./DatabaseService.js";

/**
 * ConversationStateTracker
 * Lightweight conversation state management for token optimization
 * Stores conversation context without full message history
 */
class ConversationStateTracker {
  constructor() {
    this.dbPromise = getDatabase();
    this.db = null;
  }

  async getDb() {
    if (!this.db) this.db = await this.dbPromise;
    return this.db;
  }

  /**
   * Detect acknowledgment type from user message
   * @param {string} message - User's message
   * @returns {object} Acknowledgment info
   */
  detectAcknowledgment(message) {
    const lower = (typeof message === 'string' ? message : '').toLowerCase().trim();

    // Negation patterns
    const negations = [
      "no",
      "nope",
      "not that",
      "not that date",
      "no thanks",
      "no need",
      "wrong",
    ];
    if (negations.some((neg) => lower === neg || lower.startsWith(neg))) {
      return { type: "negation", value: "user_rejected", confidence: 0.9 };
    }

    // Affirmation patterns
    const affirmations = [
      "yes",
      "yeah",
      "yup",
      "sure",
      "okay",
      "ok",
      "alright",
      "correct",
      "right",
    ];
    if (affirmations.some((aff) => lower === aff || lower.startsWith(aff))) {
      return { type: "affirmation", value: "user_confirmed", confidence: 0.9 };
    }

    // Relationship confirmation (contextual affirmation)
    // If user replies with "my father", "uncle", "friend" etc., it's an implicit YES to "is this someone special?"
    const relationships = [
      "father",
      "dad",
      "mother",
      "mom",
      "uncle",
      "aunt",
      "brother",
      "sister",
      "friend",
      "partner",
      "husband",
      "wife",
      "son",
      "daughter",
    ];
    if (relationships.some((rel) => lower.includes(rel))) {
      return {
        type: "affirmation",
        value: "user_confirmed_relationship",
        confidence: 0.85,
        relationship: lower,
      };
    }

    // Continuation patterns
    const continuations = [
      "tell me more",
      "go on",
      "continue",
      "what else",
      "and then",
    ];
    if (continuations.some((cont) => lower.includes(cont))) {
      return {
        type: "continuation",
        value: "user_wants_more",
        confidence: 0.85,
      };
    }

    // Clarification patterns
    const clarifications = ["i mean", "actually", "i meant", "to clarify"];
    if (clarifications.some((clar) => lower.includes(clar))) {
      return {
        type: "clarification",
        value: "user_clarifying",
        confidence: 0.8,
      };
    }

    return { type: "none", value: null, confidence: 0 };
  }

  /**
   * Detect specific user intent
   * @param {string} message
   * @returns {string|null} Detected intent
   */
  detectIntent(message) {
    const lower = message.toLowerCase();

    // Third party reading intent
    if (
      (lower.includes("his") ||
        lower.includes("her") ||
        lower.includes("their") ||
        lower.includes("for my")) &&
      (lower.includes("horoscope") ||
        lower.includes("chart") ||
        lower.includes("reading") ||
        lower.includes("about"))
    ) {
      return "request_third_party_reading";
    }

    return null;
  }

  /**
   * Detect dates in message and normalize format
   * @param {string} message - User's message
   * @returns {array} Array of detected dates with normalized format
   */
  detectDates(message) {
    const dates = [];

    // Pattern: DD/MM/YYYY or MM/DD/YYYY
    const datePattern = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
    let match;

    while ((match = datePattern.exec(message)) !== null) {
      const [full, part1, part2, year] = match;

      // Heuristic: if first part > 12, it's DD/MM, otherwise ambiguous
      let normalized;
      let format;
      let isAmbiguous = false;

      if (parseInt(part1) > 12) {
        // Must be DD/MM
        normalized = `${year}-${part2.padStart(2, "0")}-${part1.padStart(
          2,
          "0"
        )}`;
        format = "DD/MM/YYYY";
      } else if (parseInt(part2) > 12) {
        // Must be MM/DD
        normalized = `${year}-${part1.padStart(2, "0")}-${part2.padStart(
          2,
          "0"
        )}`;
        format = "MM/DD/YYYY";
      } else {
        // Ambiguous - default to MM/DD (US format) but flag it
        normalized = `${year}-${part1.padStart(2, "0")}-${part2.padStart(
          2,
          "0"
        )}`;
        format = "MM/DD/YYYY";
        isAmbiguous = true;
      }

      dates.push({
        original: full,
        normalized,
        format,
        isAmbiguous,
        day: format === "DD/MM/YYYY" ? part1 : part2,
        month: format === "DD/MM/YYYY" ? part2 : part1,
        year,
      });
    }

    return dates;
  }

  /**
   * Detect topic from message
   * @param {string} message - User's message
   * @param {object} previousState - Previous conversation state
   * @returns {string} Detected topic
   */
  detectTopic(message, previousState = {}) {
    const lower = message.toLowerCase();

    // Horoscope-related
    if (
      lower.includes("horoscope") ||
      lower.includes("stars") ||
      lower.includes("cosmic") ||
      lower.includes("astrology")
    ) {
      return "horoscope_request";
    }

    // Date-related
    if (
      this.detectDates(message).length > 0 ||
      lower.includes("born on") ||
      lower.includes("birthday") ||
      lower.includes("birth date")
    ) {
      return "discussing_dates";
    }

    // General chat
    if (
      lower.includes("how are") ||
      lower.includes("what's up") ||
      lower.includes("hello") ||
      lower.includes("hi")
    ) {
      return "general_chat";
    }

    // Continue previous topic if acknowledgment
    const ack = this.detectAcknowledgment(message);
    if (ack.type !== "none" && previousState.current_topic) {
      return previousState.current_topic;
    }

    return "general_chat";
  }

  /**
   * Extract entities (dates, names, etc.) from message
   * @param {string} message - User's message
   * @returns {object} Extracted entities
   */
  extractEntities(message) {
    const entities = {};

    // Extract dates
    const dates = this.detectDates(message);
    if (dates.length > 0) {
      entities.dates = dates;
      entities.last_mentioned_date = dates[dates.length - 1].normalized;
    }

    // Extract potential names (capitalized words that aren't at sentence start)
    const namePattern = /(?<!^|\. )[A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g;
    const names = message.match(namePattern);
    if (names && names.length > 0) {
      entities.potential_names = names;
    }

    return entities;
  }

  /**
   * Update conversation state
   * @param {string} chatId - Chat ID
   * @param {string} userMessage - User's message
   * @param {object} previousState - Previous state
   * @returns {object} Updated state
   */
  async updateState(chatId, userMessage, previousState = {}) {
    // Ensure userMessage is always a string
    userMessage = (typeof userMessage === 'string') ? userMessage : (userMessage == null ? '' : String(userMessage));

    const acknowledgment = this.detectAcknowledgment(userMessage);
    const topic = this.detectTopic(userMessage, previousState);
    const entities = this.extractEntities(userMessage);
    const lastIntent = previousState?.lastIntent ?? null;
    const lastIntentConfidence = previousState?.lastIntentConfidence ?? 0;

    const newState = {
      current_topic: topic,
      last_acknowledgment: acknowledgment.value,
      acknowledgment_type: acknowledgment.type,
      // store intent info for analytics / routing
      lastIntent,
      lastIntentConfidence,
      ...entities,
      updated_at: new Date().toISOString(),
    };

    // Merge with previous state (keep historical context)
    const mergedState = {
      ...previousState,
      ...newState,
    };

    // Store in database
    await this.saveState(chatId, mergedState);

    return mergedState;
  }

  /**
   * Save state to conversation_threads table
   * @param {string} chatId - Chat ID
   * @param {object} state - Conversation state
   */
  async saveState(chatId, state) {
    try {
      const db = await this.getDb();

      // Check if thread exists
      const existingThread = await db.getCurrentThread(chatId);

      if (existingThread) {
        // Update existing thread
        await db.supabase
          .from("conversation_threads")
          .update({
            current_topic: state.current_topic,
            last_entities: JSON.stringify({
              dates: state.dates,
              last_mentioned_date: state.last_mentioned_date,
              potential_names: state.potential_names,
              lastIntent: state.lastIntent || null,
              lastIntentConfidence: state.lastIntentConfidence || 0,
            }),
            last_acknowledgment: state.last_acknowledgment,
            acknowledgment_type: state.acknowledgment_type,
            updated_at: state.updated_at,
          })
          .eq("chat_id", chatId.toString())
          .eq("thread_status", "active");
      } else {
        // Create new thread
        await db.supabase.from("conversation_threads").insert({
          chat_id: chatId.toString(),
          thread_status: "active",
          current_topic: state.current_topic,
          last_entities: JSON.stringify({
            dates: state.dates,
            last_mentioned_date: state.last_mentioned_date,
            potential_names: state.potential_names,
            lastIntent: state.lastIntent || null,
            lastIntentConfidence: state.lastIntentConfidence || 0,
          }),
          last_acknowledgment: state.last_acknowledgment,
          acknowledgment_type: state.acknowledgment_type,
          created_at: state.updated_at,
          updated_at: state.updated_at,
        });
      }
    } catch (error) {
      console.error("Error saving conversation state:", error);
    }
  }

  /**
   * Get current conversation state
   * @param {string} chatId - Chat ID
   * @returns {object} Current state
   */
  async getState(chatId) {
    try {
      const db = await this.getDb();
      const thread = await db.getCurrentThread(chatId);

      if (!thread) {
        return {
          current_topic: 'general_chat',
          last_acknowledgment: null,
          acknowledgment_type: 'none',
          lastIntent: null,
          lastIntentConfidence: 0
        };
      }

      // Parse entities JSON
      let entities = {};
      if (thread.last_entities) {
        try {
          entities =
            typeof thread.last_entities === "string"
              ? JSON.parse(thread.last_entities)
              : thread.last_entities;
        } catch (e) {
          console.error("Error parsing entities:", e);
        }
      }


      return {
        current_topic: thread.current_topic || "general_chat",
        last_acknowledgment: thread.last_acknowledgment,
        acknowledgment_type: thread.acknowledgment_type || "none",
        ...entities,
        updated_at: thread.updated_at,
      };
    } catch (error) {
      console.error("Error getting conversation state:", error);
      return {
        current_topic: "general_chat",
        last_acknowledgment: null,
        acknowledgment_type: "none",
      };
    }
  }

  /**
   * Format state for AI context (lightweight string)
   * @param {object} state - Conversation state
   * @returns {string} Formatted state string
   */
  formatStateForAI(state) {
    const parts = [];

    if (state.current_topic && state.current_topic !== "general_chat") {
      parts.push(`Topic: ${state.current_topic.replace(/_/g, " ")}`);
    }

    if (state.last_mentioned_date) {
      parts.push(`Last mentioned date: ${state.last_mentioned_date}`);
    }

    if (state.lastIntent) {
      parts.push(
        `Last intent: ${state.lastIntent} (confidence: ${Number(
          state.lastIntentConfidence || 0
        ).toFixed(2)})`
      );
    }

    if (state.last_acknowledgment) {
      const ackMap = {
        user_rejected: "User said NO/rejected previous suggestion",
        user_confirmed: "User said YES/confirmed",
        user_wants_more: "User wants to hear more about current topic",
        user_clarifying: "User is clarifying their previous message",
      };
      parts.push(
        ackMap[state.last_acknowledgment] || state.last_acknowledgment
      );
    }

    if (state.dates && state.dates.length > 0) {
      const lastDate = state.dates[state.dates.length - 1];
      if (lastDate.isAmbiguous) {
        parts.push(
          `Date format ambiguous: ${lastDate.original} (need clarification)`
        );
      }
    }

    return parts.length > 0 ? parts.join(" | ") : "";
  }
}

// Export singleton
let stateTrackerInstance = null;

export default function getStateTracker() {
  if (!stateTrackerInstance) {
    stateTrackerInstance = new ConversationStateTracker();
  }
  return stateTrackerInstance;
}

export { ConversationStateTracker };
