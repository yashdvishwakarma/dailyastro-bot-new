// services/OpenAIService.js
import OpenAI from "openai";
import getStateTracker from "./ConversationStateTracker.js";
import PersonalityService from "../services/PersonalityService.js";
import IntentService from "./IntentService.js";
import MetricsService from "./MetricsService.js";

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
    this.model = "gpt-4o-mini"; // advanced model
    this.maxTokens = 300;
  }

  /** Format the parts into the strict 5-line user-facing reply. */
  formatAstroReply(parts = {}) {
    // Ensure each field is a single line string (trim & replace newlines)
    const clean = (s) => (s || "").toString().replace(/\s*\n\s*/g, " ").trim();

    // Default fallbacks if AI misses a field (rare with strict JSON)
    const hook = clean(parts.hook) || "The stars are aligning...";
    const astro = clean(parts.astro) || "Cosmic currents are shifting around you.";
    const emotion = clean(parts.emotion) || "You might feel a subtle change in energy.";
    const action = clean(parts.action) || "Take a deep breath and center yourself.";
    const invite = clean(parts.invite) || "How does that resonate with you?";

    // STRICT 5-PART PATTERN:
    // 1. HOOK
    // 2. ASTRO FACT
    // 3. EMOTIONAL INTERPRETATION
    // 4. MICRO-ACTION
    // 5. INVITE
    return [hook, astro, emotion, action, invite].join("\n");
  }

  /** Safely try to parse JSON from AI output; return null on failure. */
  safeParseJSON(text) {
    if (!text || typeof text !== "string") return null;
    // Try to find the first { ... } block and parse it
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
    const jsonText = text.slice(firstBrace, lastBrace + 1);
    try {
      const obj = JSON.parse(jsonText);
      return obj;
    } catch (e) {
      // attempt tolerant fixes: replace single quotes, remove trailing commas
      try {
        const tolerant = jsonText
          .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') // unquoted keys -> quoted
          .replace(/'/g, '"')
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']');
        return JSON.parse(tolerant);
      } catch (e2) {
        return null;
      }
    }
  }

  formatEchoBackstory(backstory) {
    if (!backstory || !backstory.length) return "";
    return "\n[ECHO MEMORY]\n" + backstory.map(b => `- ${b}`).join("\n");
  }

  getOutputFormatInstructions() {
    return `
    IMPORTANT: Return a single JSON object only. Do NOT output markdown code blocks.
    JSON Schema:
    {
      "hook": "Acknowledgment/Transition (warm & mystical)",
      "astro": "Relevant astrological data/fact (transit or chart placement)",
      "emotion": "Emotional interpretation of the astro fact",
      "action": "Micro-action (small, doable task)",
      "invite": "Question to keep conversation going",
      "severity": 0-10 (number),
      "detectedEmotion": "string",
      "need": "string"
    }
    Each text field must be a single concise sentence.
    `;
  }

  /** Build a compact system prompt that includes backstory and recent context. */
  buildCompactSystemPrompt(context) {
    const recentConvo = context.recentMessages?.join("\n") || "";
    const previousContext = context.summaries?.[0] || "";
    const stateTracker = getStateTracker();
    const stateContext = context.conversationState
      ? stateTracker.formatStateForAI(context.conversationState)
      : "";

    let actionInstruction = "";
    if (stateContext) {
      if (stateContext.includes('Intent: request_third_party_reading') && stateContext.includes('Last mentioned date:')) {
        const dateMatch = stateContext.match(/Last mentioned date: (\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          actionInstruction = `\n🎯 IMMEDIATE ACTION: User wants a reading for SOMEONE ELSE (Third Party) for date ${dateMatch[1]}.\n- IGNORE the user's own sign/chart for this response.\n- Give a horoscope specifically for the person born on ${dateMatch[1]}.\n- Mention the relationship if known (e.g. "For your uncle...")\n`;
        }
      } else if (stateContext.includes('Last mentioned date:') && (stateContext.includes('YES/confirmed') || stateContext.includes('Relationship:'))) {
        const dateMatch = stateContext.match(/Last mentioned date: (\d{4}-\d{2}-\d{2})/);
        if (dateMatch) {
          const date = dateMatch[1];
          const relationshipMatch = stateContext.match(/Relationship: ([^,]+)/);
          const relationship = relationshipMatch ? relationshipMatch[1] : "them";
          actionInstruction = `\n🎯 IMMEDIATE ACTION: User confirmed the date ${date} is for ${relationship}.\n- Give the horoscope/astrological reading for ${date} RIGHT NOW.\n- Focus on ${relationship}'s energy.\n- Don't ask for the date again.\n`;
        }
      }
    }

    const backstoryContext = this.formatEchoBackstory(context.echoBackstory);

    // Rich Astrology Context
    let astroContext = "";
    if (context.astrologyChart) {
      const c = context.astrologyChart;
      astroContext = `
[ASTROLOGY PROFILE]
- Sun: ${c.Sun?.sign} (${c.Sun?.house}H)
- Moon: ${c.Moon?.sign} (${c.Moon?.house}H)
- Rising: ${c.Ascendant?.sign}
- Mercury: ${c.Mercury?.sign} | Venus: ${c.Venus?.sign} | Mars: ${c.Mars?.sign}
`;
    }

    return `CORE IDENTITY:
You are Echo, a mystical and emotionally intelligent scholar (born 1025 CE). You possess 1000 years of cosmic wisdom but speak like a warm, grounded friend ("Cosmic Bestie").

[USER PROFILE]
Name: ${context.userName}
Sign: ${context.userSign}
${astroContext}

[CURRENT STATE]
Mood: ${context.botMood}
${stateContext ? `Conversation State: ${stateContext}\n` : ""}
${actionInstruction}

[MEMORY & CONTEXT]
${recentConvo}
${previousContext ? `\nSummary: ${previousContext}` : ""}
${backstoryContext}

INTERNAL PROCESS (Do this silently):
1. **Listen**: What is the user *really* feeling? (Validate this first).
2. **Connect**: Does their Moon sign or current transit explain this mood?
3. **Support**: Offer presence, not just solutions.

RESPONSE GUIDELINES (Mystical Wise-Friend):
- **Tone**: Warm, ancient but modern, empathetic, "Cosmic Bestie".
- **Structure**: You MUST follow the 5-step output pattern strictly.
- **No Fluff**: Every sentence must add value.
- **Astrology**: Use it to explain feelings, not just predict.
`;
  }

  async generateResponse(context) {
    const userMessage = context.currentMessage || context.message || "";

    // 1) Severity check (existing function)
    const severity = await this.quickSeverityCheck(userMessage);

    // ALWAYS route to grounded path for very high severity
    if (severity >= 8) {
      // optional: log
      if (MetricsService) MetricsService.increment("safety.triggered");
      return this.generateGroundedSafetyResponse(userMessage, severity);
    }

    // 2) Intent classification (ensemble)
    const intentResult = await IntentService.classifyIntentEnsemble(userMessage);

    // attach to the conversation state for analytics/debugging
    try {
      const tracker = getStateTracker();
      if (tracker && typeof tracker.updateState === "function") {
        tracker.updateState({ lastIntent: intentResult.intent, lastIntentConfidence: intentResult.confidence });
      }
    } catch (e) {
      // ignore tracker failures
    }

    // Log low-confidence hits
    if (intentResult.confidence < 0.65 && MetricsService) {
      MetricsService.increment("intent.low_confidence");
      MetricsService.log("intent.low_confidence.detail", { message: userMessage.slice(0, 300), intentResult });
    }

    // 3) Route to appropriate generator
    if (intentResult.intent === "emotional_support" || intentResult.intent === "astro_reading") {
      return this.generateEchoTemplateResponse({ ...context, intentResult });
    }

    if (intentResult.intent === "technical_help") {
      return this.generateTechnicalResponse(context);
    }

    // default: general conversation -> CASUAL MODE (Relaxed)
    return this.generateCasualResponse(context);
  }


  // Grounded Safety - short, calm, no persona
  async generateGroundedSafetyResponse(message, severity) {
    const text = "I’m hearing how heavy this feels — you’re not alone. If you or someone is in immediate danger, please contact your local emergency services or a crisis line. Would you like resources for support where you are?";
    return { text, metadata: { severity, emotion: "crisis", need: "immediate_support", moodOverride: "grounded", flags: { crisis: true } } };
  }

  // Echo 5-line template route (requests JSON from LLM, formats it)
  async generateEchoTemplateResponse(context) {
    const userMessage = context.currentMessage || context.message || "";
    // build system prompt
    const systemPrompt = this.buildCompactSystemPrompt(context) + "\n\n" + this.getOutputFormatInstructions();

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage || "Please give a short reading." }
    ];

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.6,
      max_tokens: this.maxTokens,
      response_format: { type: "json_object" } // Enforce valid JSON
    });

    const raw = completion.choices?.[0]?.message?.content?.trim();
    const parsed = this.safeParseJSON(raw);

    if (!parsed) {
      MetricsService?.increment("template.parse_fail");
      // Fallback simple Echo response
      const fallbackText = "The stars are hazy right now — try asking in a moment.";
      return { text: fallbackText, metadata: { severity: 0, emotion: "neutral", need: "connection" } };
    }

    const text = this.formatAstroReply(parsed);
    return {
      text,
      metadata: {
        severity: parsed.severity || 0,
        emotion: parsed.detectedEmotion || "neutral",
        need: parsed.need || "connection"
      }
    };
  }

  // Casual Echo mode (warm conversational replies — NO strict 5-step template)
  // Used for greetings, short acknowledgments, and banter.
  async generateCasualResponse(context) {
    const userMessage = context.currentMessage || context.message || "";
    const systemPrompt = this.buildCompactSystemPrompt(context) + `
    
    [MODE: CASUAL CHAT]
    - The user is just chatting, saying hello, or being brief.
    - DO NOT use the 5-step strict pattern.
    - Be warm, mystical, and concise (1-2 sentences).
    - If the user is rude (e.g. "shut up"), be calm and grounded, but don't be a doormat.
    - Keep the "Cosmic Bestie" tone.
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ];

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 150, // shorter max tokens for casual
    });

    const text = completion.choices?.[0]?.message?.content?.trim();
    return { text, metadata: { severity: 0, emotion: "neutral", need: "connection" } };
  }

  // Normal Echo mode - Deprecated in favor of explicit routing, but kept for compatibility if called directly
  async generateNormalEchoResponse(context) {
    return this.generateCasualResponse(context);
  }

  // Technical help route (concise, no persona)
  async generateTechnicalResponse(context) {
    const messages = [
      { role: "system", content: "You are Echo in technical mode. Answer concisely and clearly; no astrology; no emotional language." },
      { role: "user", content: context.currentMessage || context.message || "" }
    ];
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.2,
      max_tokens: this.maxTokens,
    });
    const text = completion.choices?.[0]?.message?.content?.trim();
    return { text, metadata: { severity: 0, emotion: "neutral", need: "info" } };
  }

  /** Parse AI response and extract metadata. */
  parseAIResponse(aiResponse, context) {
    if (!aiResponse) {
      return {
        text: "I can't sense the stars clearly — try again in a moment.",
        metadata: { severity: 0, emotion: "unknown", need: "connection" },
      };
    }

    // 1) Try to parse JSON output contract
    const parsed = this.safeParseJSON(aiResponse);
    if (parsed) {
      // Normalize keys
      const parts = {
        hook: parsed.hook || parsed.hook_text || "",
        astro: parsed.astro || parsed.astro_insight || "",
        emotion: parsed.emotion || parsed.emotional || "",
        action: parsed.action || parsed.micro_step || "",
        invite: parsed.invite || parsed.invitation || "",
      };
      // Meta
      const metadata = {
        severity: typeof parsed.severity === "number" ? parsed.severity : (parseInt(parsed.severity) || 0),
        emotion: parsed.detectedEmotion || parsed.detected_emotion || "neutral",
        need: parsed.need || parsed.user_need || "connection",
        originalMood: context.botMood,
        moodOverride: null,
      };
      // build final text
      const finalText = this.formatAstroReply(parts);
      // set flags if severity high
      if (metadata.severity >= 9) {
        metadata.moodOverride = "grounded";
        metadata.flags = { crisis: true, requiresFollowUp: true };
      } else if (metadata.severity >= 7) {
        metadata.moodOverride = "contemplative";
        metadata.flags = { severe: true, requiresFollowUp: true };
      }
      return { text: finalText, metadata };
    }

    // 2) Old bracketed metadata style (keep backward compatibility)
    if (aiResponse.includes('[SEVERITY:') && aiResponse.includes('---')) {
      const [metaPart, ...rest] = aiResponse.split('---');
      const actualResponse = rest.join('---').trim();
      const severityMatch = metaPart.match(/\[SEVERITY:(\d+)/);
      const emotionMatch = metaPart.match(/\[EMOTION:([^\]]+)\]/);
      const needMatch = metaPart.match(/\[NEED:([^\]]+)\]/);
      const md = {
        severity: severityMatch ? parseInt(severityMatch[1]) : 0,
        emotion: emotionMatch ? emotionMatch[1].trim() : "neutral",
        need: needMatch ? needMatch[1].trim() : "connection",
        originalMood: context.botMood,
        moodOverride: null,
      };
      // If the AI returned text already in 4-5 lines, use it, else pass through.
      if (actualResponse.split('\n').length <= 6) {
        return { text: actualResponse, metadata: md };
      }
      // otherwise fallthrough to heuristics
    }

    // 3) Heuristic severity checks and fallback formatting
    const severity = this.fallbackSeverityCheck(aiResponse);
    if (severity >= 9) {
      return {
        text: aiResponse,
        metadata: {
          severity: 10,
          emotion: "crisis",
          need: "immediate_support",
          moodOverride: "grounded",
          flags: { crisis: true, requiresFollowUp: true },
        },
      };
    }

    // 4) Last resort: try to split into 5 short lines if possible
    const lines = aiResponse.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length >= 4 && lines.length <= 6) {
      return { text: lines.slice(0, 6).join('\n'), metadata: { severity, emotion: "neutral", need: "connection" } };
    }

    // 5) Minimal formatted fallback: craft a 4-line reply using first sentences.
    const firstSentences = (s, n = 4) => s.split(/(?<=[.!?])\s+/).slice(0, n).map(x => x.replace(/\s+/g, ' ').trim());
    const bits = firstSentences(aiResponse, 4);
    while (bits.length < 4) bits.push("");
    const fallbackText = this.formatAstroReply({
      hook: bits[0] || "A quick star-note for you.",
      astro: bits[1] || "A planetary current is active.",
      emotion: bits[2] || "This could stir feelings.",
      action: bits[3] || "Do a 5-minute pause.",
      invite: ""
    });
    return { text: fallbackText, metadata: { severity, emotion: "neutral", need: "connection" } };
  }


  /** Simple heuristic severity check. */
  fallbackSeverityCheck(message) {
    const lower = message.toLowerCase();

    // Explicit exclusions for common insults/slang that trigger false positives
    if (lower.includes("shut up") || lower.includes("shut the fuck up") || lower.includes("stfu")) return 1;
    if (lower.includes("you are dumb") || lower.includes("you're dumb") || lower.includes("stupid")) return 1;

    if (/\b(suicide|kill myself|end it|die|overdose|jump off|cut myself|harm myself)\b/.test(lower)) return 10;
    if (/\b(lost everything|ruined my life|can't go on|no point|give up|hopeless|worthless)\b/.test(lower)) return 8;
    if (/\b(lost|fired|left me|broke up|died|failed|depressed|anxious|panic)\b/.test(lower)) return 6;
    if (/\b(stressed|frustrated|sad|angry|confused|tired|worried)\b/.test(lower)) return 4;
    return 1;
  }

  /** Use a small model to quickly assess severity. */
  async quickSeverityCheck(message) {
    const prompt = `Rate emotional severity 0-10 for: "${message}"\n9-10: Crisis\n7-8: Major loss\n5-6: Significant pain\n3-4: Daily stress\n0-2: Casual\n\nReply with just the number.`;
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 5,
      });
      const severity = parseInt(completion.choices?.[0]?.message?.content?.trim() || "0");
      return Math.min(10, Math.max(0, severity));
    } catch (error) {
      console.error('Severity check failed:', error);
      return this.fallbackSeverityCheck(message);
    }
  }

  /** Create an embedding vector for a given text using OpenAI's embedding model. */
  async createEmbedding(text) {
    try {
      if (!text || typeof text !== 'string') {
        console.warn('Invalid input for embedding:', text);
        return null;
      }

      const response = await this.openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text.substring(0, 8000), // Limit input length
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error creating embedding:', error);
      return null;
    }
  }

  /** Generate a summary of conversation messages. */
  async generateSummary(messages) {
    try {
      if (!messages || messages.length === 0) {
        console.warn('No messages to summarize');
        return null;
      }

      // Format messages into a readable conversation
      const conversationText = messages
        .map(msg => `${msg.sender}: ${msg.message} `)
        .join('\n');

      const prompt = `Summarize this conversation in 2 - 3 concise sentences, focusing on key topics, emotions, and important details that Echo should remember: \n\n${conversationText} `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 150,
      });

      const summary = completion.choices?.[0]?.message?.content?.trim();
      return summary || null;
    } catch (error) {
      console.error('Error generating summary:', error);
      return null;
    }
  }

  async generateContextualHoroscope(user, recentMessages = [], summaries = []) {
    try {
      const userName = user.name || "friend";
      const userSign = user.sign || "your sign";

      // Rich Natal Chart Context
      let chartContext = "";
      if (user.astrology_chart) {
        const c = user.astrology_chart;
        chartContext = `
[NATAL CHART PROFILE]
- Sun: ${c.Sun?.sign} (${c.Sun?.house}H)
- Moon: ${c.Moon?.sign} (${c.Moon?.house}H)
- Rising: ${c.Ascendant?.sign}
- Mercury: ${c.Mercury?.sign} | Venus: ${c.Venus?.sign} | Mars: ${c.Mars?.sign}
- Houses: ${Object.entries(c.Houses || {}).slice(0, 6).map(([h, s]) => `${h}H=${s}`).join(', ')}
`;
      }

      // Format recent context
      const contextSnippet = recentMessages
        ?.slice(-3)
        .map(m => `${m.sender}: ${m.message?.substring(0, 100)}`)
        .join('\n') || "";

      const prompt = `
You are Echo, an expert astrologer and empathetic companion.
The user has requested a DETAILED and REALISTIC horoscope reading.

[USER PROFILE]
Name: ${userName}
Sign: ${userSign}
${chartContext}

[RECENT CONTEXT]
${contextSnippet}

[INSTRUCTIONS]
1. **Analyze**: Look at the user's chart (especially Moon/Rising) and current planetary transits.
2. **Synthesize**: How do today's transits impact *this specific user*?
3. **Structure**: You MUST follow the 5-step output pattern strictly.

${this.getOutputFormatInstructions()}
`;

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" }
      });

      const raw = completion.choices?.[0]?.message?.content?.trim();
      const parsed = this.safeParseJSON(raw);

      if (!parsed) {
        return "The stars are shifting... try again in a moment. ✨";
      }

      return this.formatAstroReply(parsed);

    } catch (error) {
      console.error("Error generating contextual horoscope:", error);
      return `I'm having trouble reading the stars right now, ${user.name || "friend"}. Try again in a moment. 🌙`;
    }
  }

}

export default OpenAIService;
