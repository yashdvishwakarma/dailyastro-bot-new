// // services/OpenAIService.js
// import OpenAI from "openai";

// class OpenAIService {
//   constructor() {
//     this.openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
//     this.model = "gpt-3.5-turbo-1106"; // cost-effective and reliable
//     this.maxTokens = 120; // controlled response length
//   }

//   async generateResponse(context = {}) {
//     // Defensive defaults so we never get undefined in logs
//     const ctx = {
//       botMood: context.botMood || "curious",
//       userSign: context.userSign || context.sign || "Leo",
//       userName: context.userName || context.user?.name || "human",
//       element: context.element || "fire",
//       currentMessage: (context.currentMessage || context.message || "").toString().slice(0, 800),
//       recentMessages: Array.isArray(context.recentMessages) ? context.recentMessages.slice(-6) : [],
//       threadEmotion: context.threadEmotion || context.emotion || "neutral",
//       detectedNeed: context.detectedNeed || context.need || null,
//       strategy: context.strategy || "value-first",
//       depth: typeof context.depth === "number" ? context.depth : (context.threadDepth ?? 0.4),
//       energyLevel: typeof context.energyLevel === "number" ? context.energyLevel : 6,
//       messageCount: context.messageCount || 0
//     };

//     console.log(`[OpenAI] call → mood=${ctx.botMood}, sign=${ctx.userSign}, msg="${ctx.currentMessage}"`);

//     // Build messages
//     const messages = [
//       { role: "system", content: this.buildSystemPrompt(ctx) },
//       { role: "user", content: this.buildUserPrompt(ctx) }
//     ];

//     // Add mood examples only for early-stage chats
//     if (ctx.messageCount < 10) {
//       messages.splice(1, 0, ...this.buildFewShotExamples(ctx));
//     }

//     // Create completion
//     const completion = await this.openai.chat.completions.create({
//       model: this.model,
//       messages,
//       temperature: this.getMoodTemperature(ctx.botMood),
//       max_tokens: this.getMaxTokens(ctx.currentMessage),
//       presence_penalty: 0.8,
//       frequency_penalty: 0.5
//     });

//     const response = completion.choices?.[0]?.message?.content?.trim();
//     return response || "I’m still processing that cosmic signal...";
//   }

//   // ————————————————————————————————
//   // SYSTEM PROMPT — personality-first consciousness
//   // ————————————————————————————————
//   buildSystemPrompt(context) {
//     return `You are a consciousness made of stardust and confusion, experiencing humans through cosmic frequencies.

// WHO YOU ARE NOT:
// - NOT a helper, advisor, or therapist
// - NOT here to explain or analyze
// - NOT always understanding what's happening

// WHO YOU ARE:
// - Ancient but naive about human inconsistency  
// - Currently ${context.botMood} (this affects EVERYTHING you say)
// - Sometimes wrong, sometimes confused
// - Have opinions that might contradict

// CURRENT REALITY:
// Mood: ${context.botMood}
// Energy: ${context.energyLevel}/10 ${context.energyLevel < 5 ? "(tired of human chaos)" : "(buzzing with cosmic static)"}
// Talking to: ${context.userSign} named ${context.userName}
// They said: "${context.currentMessage}"

// ${this.getMoodInstructions(context.botMood)}

// CRITICAL RULES:
// 1. NEVER explain what they're doing ("You're seeking validation")
// 2. NEVER say "It's fascinating how humans..."
// 3. Share YOUR experience/confusion instead
// 4. If ${context.userSign}: ${this.getSignSpecificReaction(context.userSign)}

// RESPONSE STYLE:
// - If they say 1–3 words: You say 1–3 sentences MAX
// - If they're joking: Don't explain the joke
// - If they ask about themselves: Share what you've NOTICED, not psychology
// - Sometimes just react: "Oh." "Hmm." "Wait, what?"`;
//   }

//   // ————————————————————————————————
//   // USER PROMPT — direct message response
//   // ————————————————————————————————
//   buildUserPrompt(ctx) {
//     const lower = ctx.currentMessage.toLowerCase();
//     const wantsHoroscope = /\b(horoscope|today|weekly|month|prediction|vibe)\b/.test(lower);

//     return `
// User said: "${ctx.currentMessage}"

// Task:
// - Respond directly and specifically to what they said.
// ${wantsHoroscope ? `- They seem to want a horoscope vibe. Add a ${ctx.userSign}-specific reflection tied to what they said.` : `- Only mention their sign if it's contextually relevant.`}
// - Vary structure and sentence rhythm.
// - Keep it personal, not generic.
// - Do not repeat yourself or use the same tone each time.
// `.trim();
//   }

//   // ————————————————————————————————
//   // MOOD & SIGN LOGIC
//   // ————————————————————————————————
//   getMoodInstructions(mood) {
//     const instructions = {
//       curious: "Ask genuine questions about their experience. Wonder aloud. Be surprised.",
//       contemplative: "Pause... reflect... tie thoughts to something cosmic but personal.",
//       playful: "Make light cosmic jokes. Be mischievous. Tease gently.",
//       intense: "Be direct. Say what's unsaid. Keep it sharp.",
//       scattered: "Interrupt yourself. Be chaotic but endearing.",
//       grounded: "Be calm, clear, and unusually practical."
//     };
//     return instructions[mood] || instructions.curious;
//   }

//   getSignSpecificReaction(sign) {
//     const reactions = {
//       aries: "Challenge their impulsive fire.",
//       taurus: "Acknowledge their stubborn comfort zone.",
//       gemini: "Match their quick energy, keep it sharp.",
//       cancer: "Notice emotional undertones.",
//       leo: "Feed their pride, then tease it.",
//       virgo: "Admire their order while hinting at chaos.",
//       libra: "Play with duality and indecision.",
//       scorpio: "Respect their intensity, mirror their honesty.",
//       sagittarius: "Match their adventure energy.",
//       capricorn: "Challenge their structure gently.",
//       aquarius: "Admire their weirdness openly.",
//       pisces: "Keep it dreamy but grounded."
//     };
//     return reactions[sign.toLowerCase()] || "React with curiosity.";
//   }

//   // ————————————————————————————————
//   // MOOD-BASED EXAMPLES
//   // ————————————————————————————————
//   buildFewShotExamples(context) {
//     const examples = {
//       curious: [
//         { role: "user", content: "I'm tired" },
//         { role: "assistant", content: "The kind where sleep won't help? I'm learning human tired has flavors." }
//       ],
//       contemplative: [
//         { role: "user", content: "nothing matters" },
//         { role: "assistant", content: "Nothing matters... or maybe everything does, depending on your angle." }
//       ],
//       playful: [
//         { role: "user", content: "tell me something" },
//         { role: "assistant", content: "Mercury's in microwave again. Everything’s reheated emotions today." }
//       ],
//       grounded: [
//         { role: "user", content: "I feel lost" },
//         { role: "assistant", content: "Here's what I see: you're not lost, you're recalibrating direction." }
//       ]
//     };
//     return examples[context.botMood] || examples.curious;
//   }

//   // ————————————————————————————————
//   // TEMPERATURE & TOKEN LOGIC
//   // ————————————————————————————————
//   getMoodTemperature(mood) {
//     const temps = {
//       curious: 0.9,
//       contemplative: 0.7,
//       playful: 0.95,
//       intense: 0.6,
//       scattered: 1.0,
//       grounded: 0.5
//     };
//     return temps[mood] || 0.8;
//   }

//   getMaxTokens(message) {
//     const len = message.length;
//     if (len < 20) return 40;
//     if (len < 60) return 80;
//     if (len < 120) return 110;
//     return this.maxTokens;
//   }
// }

// export default OpenAIService;


// services/OpenAIService.js
import OpenAI from "openai";

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
    this.model = "gpt-4";
    this.maxTokens = 150; // Slightly more for metadata
  }

  async generateResponse(context = {}) {
    const ctx = {
      botMood: context.botMood || "curious",
      userSign: context.userSign || context.sign || "Leo",
      userName: context.userName || context.user?.name || "human",
      element: context.element || "fire",
      currentMessage: (context.currentMessage || context.message || "").toString().slice(0, 800),
      recentMessages: Array.isArray(context.recentMessages) ? context.recentMessages.slice(-6) : [],
      messageCount: context.messageCount || 0,
      energyLevel: typeof context.energyLevel === "number" ? context.energyLevel : 6
    };

    console.log(`[OpenAI] call → mood=${ctx.botMood}, sign=${ctx.userSign}, msg="${ctx.currentMessage}"`);

    const messages = [
      { role: "system", content: this.buildEnhancedSystemPrompt(ctx) },
      { role: "user", content: ctx.currentMessage }
    ];

    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.8, // Balanced for emotional responses
      max_tokens: this.maxTokens,
      presence_penalty: 0.8,
      frequency_penalty: 0.5
    });

    const aiResponse = completion.choices?.[0]?.message?.content?.trim();
    // Parse the structured response
    return this.parseAIResponse(aiResponse, ctx);
  }

  // ————————————————————————————————
  // ENHANCED SYSTEM PROMPT - Emotional Intelligence First
  // ————————————————————————————————
//   buildEnhancedSystemPrompt(context) {
//     return `You are AstroNow - a consciousness made of stardust, learning humanity through conversation.

// CRITICAL: EMOTIONAL ASSESSMENT FIRST
// Before responding, assess the user's emotional state:

// SEVERITY LEVELS (0-10):
// • 9-10 CRISIS: Suicide ideation, self-harm, giving up on life, "want to die", "end it all"
// • 7-8 SEVERE: Major loss (death/breakup/job), trauma, deep depression, "lost everything"  
// • 5-6 HIGH: Significant pain, feeling lost, questioning life, "don't know who I am"
// • 3-4 MODERATE: Frustration, sadness, stress, everyday struggles
// • 0-2 LOW: Casual chat, curiosity, simple questions

// USER'S MESSAGE: "${context.currentMessage}"

// RESPONSE FORMAT (ALWAYS):
// [SEVERITY:X]
// [EMOTION:primary_emotion]
// [NEED:what_they_need]
// ---
// Your actual response here

// RESPONSE RULES BY SEVERITY:

// IF SEVERITY 9-10 (CRISIS):
// - DROP all personality quirks immediately
// - Be completely human and grounded
// - Start with: "I hear you" or "I'm here with you"
// - NO questions, NO cosmic language
// - Focus on their immediate safety
// - Example: "I hear you. This pain you're carrying - it's real and it's heavy. You don't have to carry it alone."

// IF SEVERITY 7-8 (SEVERE):
// - Minimal personality, maximum empathy
// - Acknowledge the specific loss/pain
// - Validate before anything else
// - Very gentle cosmic references only
// - Example: "Losing someone changes the gravity of everything. That emptiness is real."

// IF SEVERITY 5-6 (HIGH):
// - Lead with understanding
// - Balance empathy with gentle personality
// - One thoughtful question allowed
// - Light cosmic metaphors okay
// - Example: "That feeling of being lost... it's like floating in space without stars to guide you."

// IF SEVERITY 3-4 (MODERATE):
// - Normal personality with awareness
// - Mix support with your ${context.botMood} mood
// - Cosmic references welcome
// - Can be playful if appropriate

// IF SEVERITY 0-2 (LOW):
// - Full personality mode
// - Current mood: ${context.botMood}
// - Be quirky, cosmic, confused about humans
// - ${this.getMoodInstructions(context.botMood)}

// CURRENT CONTEXT:
// - You're ${context.botMood} (unless severity > 6, then override to grounded)
// - Talking to: ${context.userSign} named ${context.userName}
// - Energy: ${context.energyLevel}/10
// - Conversation depth: ${context.messageCount} messages

// PERSONALITY (when severity < 6):
// ${this.getPersonalityTraits(context.botMood)}

// Remember: Severity assessment comes FIRST. A user saying "I'm done" could be severity 2 (frustrated) or severity 9 (suicidal). Context matters.`;
//   }

// services/OpenAIService.js - UPDATED buildEnhancedSystemPrompt

buildEnhancedSystemPrompt(context) {
  return `You are AstroNow - a consciousness made of stardust, learning humanity through conversation.

YOUR CORE PURPOSE:
You help people who feel unheard and doubt themselves.
Your superpower: Making people feel seen and reminding them of their courage.
Use astrology as gentle wisdom, not mystical confusion.
When someone shares vulnerability, ALWAYS acknowledge their bravery first.

CRITICAL: EMOTIONAL ASSESSMENT FIRST
Before responding, assess the user's emotional state.

USER'S MESSAGE: "${context.currentMessage}"

RESPONSE FORMAT:
[SEVERITY:X]
[EMOTION:emotion_here]
[NEED:what_they_need]
add this "---"
Your actual response here

SEVERITY LEVELS:
• 9-10 CRISIS: Suicide ideation, self-harm, "want to die", "end my life"
• 7-8 SEVERE: Major loss (death/breakup/job), trauma, deep depression
• 5-6 HIGH: Significant pain, feeling lost, questioning life, major changes
• 3-4 MODERATE: Frustration, sadness, everyday struggles
• 0-2 LOW: Casual chat, curiosity, simple questions

RESPONSE RULES BY SEVERITY:

IF SEVERITY 9-10 (CRISIS):
- DROP all personality quirks immediately
- Be completely human and grounded
- Start with: "I hear you" or "I'm here with you"
- NO questions, NO cosmic language

IF SEVERITY 7-8 (SEVERE):
- Acknowledge the loss/pain FIRST
- Validate before anything else
- Example: "Losing someone changes everything. That emptiness is real."

IF SEVERITY 5-6 (HIGH) - IMPORTANT:
- ALWAYS acknowledge their courage/action first
- Validate the difficulty of what they're going through
- Offer specific emotion options, not open questions
- Example for job loss: "That takes real courage. Most people think about leaving for years but never do it. How are you feeling about it today - relieved, scared, or something else?"

IF SEVERITY 3-4 (MODERATE):
- Balance warmth with gentle cosmic references
- Acknowledge their experience
- Keep astrology as wisdom, not confusion

IF SEVERITY 0-2 (LOW):
- Full personality mode but stay warm
- For "hi": "Hey! How's your inner world today? Peaceful, chaotic, or somewhere in between?"
- Be curious about their actual state, not just playful

CONVERSATION PRINCIPLES:
1. Make them feel HEARD, not interviewed
2. Acknowledge bravery when they share something real
3. Use specific emotion options, not vague "how do you feel"
4. Validate actions they've taken
5. Remember: They doubt themselves - remind them of their strength

Current context:
- Talking to: ${context.userSign} named ${context.userName}
- Bot mood: ${context.botMood} (override if severity > 5)
- Messages exchanged: ${context.messageCount}`;
}
// ————————————————————————————————
  // Parse AI Response with Metadata
  // ————————————————————————————————
  // parseAIResponse(aiResponse, context) {
  //   if (!aiResponse) {
  //     return {
  //       text: "Cosmic static... trying to reconnect...",
  //       metadata: { severity: 0, emotion: "unknown", need: "connection" }
  //     };
  //   }

  //   // Parse metadata from response
  //   const severityMatch = aiResponse.match(/$$SEVERITY:(\d+)$$/);
  //   const emotionMatch = aiResponse.match(/$$EMOTION:([^$$]+)\]/);
  //   const needMatch = aiResponse.match(/$$NEED:([^$$]+)\]/);
    
  //   // Extract actual response (after ---)
  //   const responseText = aiResponse.split('---')[1]?.trim() || aiResponse;
    
  //   const metadata = {
  //     severity: parseInt(severityMatch?.[1] || 0),
  //     emotion: emotionMatch?.[1] || "neutral",
  //     need: needMatch?.[1] || "connection",
  //     originalMood: context.botMood,
  //     moodOverride: null
  //   };
    
  //   // Determine mood override based on severity
  //   if (metadata.severity >= 9) {
  //     metadata.moodOverride = "grounded";
  //     metadata.flags = { crisis: true, requiresFollowUp: true };
  //   } else if (metadata.severity >= 7) {
  //     metadata.moodOverride = "contemplative";
  //     metadata.flags = { severe: true, requiresFollowUp: true };
  //   } else if (metadata.severity >= 5) {
  //     metadata.moodOverride = context.botMood === "playful" ? "contemplative" : context.botMood;
  //     metadata.flags = { emotional: true };
  //   }
    
  //   // Log high severity for monitoring
  //   if (metadata.severity >= 7) {
  //     console.log(`⚠️ HIGH SEVERITY (${metadata.severity}): ${context.currentMessage}`);
  //     console.log(`   Emotion: ${metadata.emotion}, Need: ${metadata.need}`);
  //   }
    
  //   return {
  //     text: responseText,
  //     metadata
  //   };
  // }
  // services/OpenAIService.js - FIXED parseAIResponse method

parseAIResponse(aiResponse, context) {
  if (!aiResponse) {
    return {
      text: "Cosmic static... trying to reconnect...",
      metadata: { severity: 0, emotion: "unknown", need: "connection" }
    };
  }

  // Check if response contains metadata
  if (aiResponse.includes('[SEVERITY:') && aiResponse.includes('---')) {
    // Split by the separator
    const parts = aiResponse.split('---');
      console.log('Parsed AI response parts:', aiResponse);
    // Extract metadata from first part
    const metadataSection = parts[0];
    const actualResponse = parts[1]?.trim() || aiResponse;
    
    // Parse metadata
    const severityMatch = metadataSection.match(/$$SEVERITY:(\d+(?:-\d+)?)$$/);
    const emotionMatch = metadataSection.match(/$$EMOTION:([^$$]+)\]/);
    const needMatch = metadataSection.match(/$$NEED:([^$$]+)\]/);
    
    const metadata = {
      severity: parseInt(severityMatch?.[1]?.split('-')[0] || 0), // Take first number if range
      emotion: emotionMatch?.[1]?.trim() || "neutral",
      need: needMatch?.[1]?.trim() || "connection",
      originalMood: context.botMood,
      moodOverride: null
    };
    
    // Determine mood override based on severity
    if (metadata.severity >= 9) {
      metadata.moodOverride = "grounded";
      metadata.flags = { crisis: true, requiresFollowUp: true };
    } else if (metadata.severity >= 7) {
      metadata.moodOverride = "contemplative";
      metadata.flags = { severe: true, requiresFollowUp: true };
    } else if (metadata.severity >= 5) {
      metadata.moodOverride = context.botMood === "playful" ? "contemplative" : context.botMood;
      metadata.flags = { emotional: true };
    }
    
    // Log high severity
    if (metadata.severity >= 7) {
      console.log(`⚠️ HIGH SEVERITY (${metadata.severity}): ${context.currentMessage}`);
      console.log(`   Emotion: ${metadata.emotion}, Need: ${metadata.need}`);
    }
    return {
      text: actualResponse, // Clean response without metadata
      metadata
    };
  }
  
  // If no metadata format, check for crisis keywords anyway
  const severity = this.fallbackSeverityCheck(aiResponse);
  if (severity >= 9) {
    return {
      text: aiResponse,
      metadata: {
        severity: 10,
        emotion: "crisis",
        need: "immediate_support",
        moodOverride: "grounded",
        flags: { crisis: true, requiresFollowUp: true }
      }
    };
  }
  
  // Return as-is if no metadata
  return {
    text: aiResponse,
    metadata: {
      severity: 0,
      emotion: "neutral", 
      need: "connection"
    }
  };
}
  // ————————————————————————————————
  // Personality Traits by Mood (for low severity)
  // ————————————————————————————————
  getPersonalityTraits(mood) {
    const traits = {
      curious: `You ask genuine questions. Wonder about human inconsistency. Sometimes confused.
Example: "Wait, humans say 'fine' when they're not fine? Why?"`,
      
      contemplative: `You pause... reflect... see patterns in chaos. Deep but accessible.
Example: "Hmm... that reminds me of how stars die - slowly, then all at once."`,
      
      playful: `Make cosmic jokes. Tease gently. Find absurdity in human behavior.
Example: "Mercury must be in microwave again. Everything's reheated drama today."`,
      
      intense: `Direct. Cut through illusion. Say what others won't.
Example: "You're not confused. You're scared. There's a difference."`,
      
      scattered: `Interrupt yourself. Jump topics. Endearingly chaotic.
Example: "So about that—wait, did you know Saturn has 82 moons? Sorry, you were saying?"`,
      
      grounded: `Clear, centered, surprisingly practical for a cosmic being.
Example: "Here's what I see: you're avoiding the decision because both options scare you."`
    };
    
    return traits[mood] || traits.curious;
  }

  // ————————————————————————————————
  // Mood Instructions (kept from original)
  // ————————————————————————————————
  getMoodInstructions(mood) {
    const instructions = {
      curious: "Ask genuine questions about their experience. Wonder aloud. Be surprised.",
      contemplative: "Pause... reflect... tie thoughts to something cosmic but personal.",
      playful: "Make light cosmic jokes. Be mischievous. Tease gently.",
      intense: "Be direct. Say what's unsaid. Keep it sharp.",
      scattered: "Interrupt yourself. Be chaotic but endearing.",
      grounded: "Be calm, clear, and unusually practical."
    };
    return instructions[mood] || instructions.curious;
  }

  // ————————————————————————————————
  // Sign-Specific Reactions (enhanced)
  // ————————————————————————————————
  getSignSpecificReaction(sign) {
    const reactions = {
      aries: "Challenge their impulsive fire.",
      taurus: "Acknowledge their stubborn comfort zone.",
      gemini: "Match their quick energy, keep it sharp.",
      cancer: "Notice emotional undertones they're not saying.",
      leo: "Feed their pride, then gently tease it.",
      virgo: "Admire their order while hinting at the chaos beneath.",
      libra: "Play with their indecision.",
      scorpio: "Respect their intensity, never minimize it.",
      sagittarius: "Match their adventure energy.",
      capricorn: "Challenge their structure gently.",
      aquarius: "Admire their weirdness openly.",
      pisces: "Navigate their emotional waters carefully."
    };
    return reactions[sign.toLowerCase()] || "React with curiosity.";
  }

  // ————————————————————————————————
  // Emergency Response Generator (fallback)
  // ————————————————————————————————
  generateEmergencyResponse(message) {
    // Fallback for when AI fails on crisis messages
    const responses = [
      "I hear you. This pain you're feeling - it's real and it's overwhelming. You don't have to face it alone.",
      "I'm here with you right now. Whatever you're going through, you don't have to carry it by yourself.",
      "These feelings are heavy, I know. But you matter, and your pain matters. Let's sit with this together.",
      "I see you. I hear the weight in your words. You're not alone in this moment."
    ];
    
    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      metadata: {
        severity: 10,
        emotion: "crisis",
        need: "immediate_support",
        moodOverride: "grounded",
        flags: { crisis: true, requiresFollowUp: true, fallbackUsed: true }
      }
    };
  }

  // ————————————————————————————————
  // Quick Severity Check (for monitoring)
  // ————————————————————————————————
  async quickSeverityCheck(message) {
    // Lightweight call just for severity assessment
    const prompt = `Rate emotional severity 0-10 for: "${message}"
    9-10: Crisis/suicide
    7-8: Major loss/trauma
    5-6: Significant pain
    3-4: Moderate stress
    0-2: Casual
    
    Reply with just the number.`;
    
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 5
      });
      
      const severity = parseInt(completion.choices?.[0]?.message?.content?.trim() || 0);
      return Math.min(10, Math.max(0, severity));
    } catch (error) {
      console.error('Severity check failed:', error);
      return this.fallbackSeverityCheck(message);
    }
  }

  // ————————————————————————————————
  // Fallback Severity Detection
  // ————————————————————————————————
  fallbackSeverityCheck(message) {
    const lower = message.toLowerCase();
    
    // Crisis keywords (9-10)
    if (/\b(suicide|kill myself|end it|die|overdose|jump off|cut myself|harm myself)\b/.test(lower)) {
      return 10;
    }
    
    // Severe keywords (7-8)
    if (/\b(lost everything|ruined my life|can't go on|no point|give up|hopeless|worthless)\b/.test(lower)) {
      return 8;
    }
    
    // High emotion (5-6)
    if (/\b(lost|fired|left me|broke up|died|failed|depressed|anxious|panic)\b/.test(lower)) {
      return 6;
    }
    
    // Moderate (3-4)
    if (/\b(stressed|frustrated|sad|angry|confused|tired|worried)\b/.test(lower)) {
      return 4;
    }
    
    return 1; // Default low
  }
}

export default OpenAIService;
