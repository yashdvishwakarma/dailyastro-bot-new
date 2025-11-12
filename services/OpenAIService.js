// services/OpenAIService.js
import OpenAI from "openai";
  let metadata = { severity: 0, emotion: "neutral", need: "connection",metadata: "", flags: "" ,originalMood: "", moodOverride: "", needOverride: ""};
class OpenAIService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
    this.model = "gpt-4o-mini"; // Using a more advanced model for better understanding
    this.maxTokens = 150; // Slightly more for metadata
  }

  // async generateResponse(context = {}) {
  // //  console.log("OpenAIService.generateResponse called with context:", context);
  //   const ctx = {
  //     botMood: metadata.botMood || context.threadEmotion || "curious",
  //     userSign: context.userSign || context.sign || "Leo",
  //     userName: context.userName || context.user?.name || "human",
  //     element: context.element || "fire",
  //     currentMessage: (context.currentMessage || context.message || "").toString().slice(0, 800),
  //         // TRUNCATE RECENT MESSAGES HERE
  //   recentMessages: this.truncateContext(
  //     Array.isArray(context.recentMessages) ? context.recentMessages : [], 
  //     500  // Max 500 tokens for recent messages
  //   ),
  //     messageCount: context.messageCount || 0,
  //     energyLevel: typeof context.energyLevel === "number" ? context.energyLevel : 6,
  //     metadata :metadata ? metadata : "",
  //         // Also truncate summaries if they're too long
  //   summaries: context.summaries ? 
  //     context.summaries.slice(0, 2).map(s => ({
  //       ...s,
  //       summary_text: s.summary_text?.substring(0, 200) // Limit each summary
  //     })) : [],
  //   };

  //   // console.log(`[OpenAI] call → mood=${ctx.botMood}, sign=${ctx.userSign}, msg="${ctx.currentMessage}"`);

  //   const messages = [
  //     { role: "system", content: this.buildEnhancedSystemPrompt(ctx) },
  //     { role: "user", content: ctx.currentMessage }
  //   ];

  //   // console.log("OpenAIService.generateResponse messages:", messages);
  //   const completion = await this.openai.chat.completions.create({
  //     model: this.model,
  //     messages,
  //     temperature: 0.8, // Balanced for emotional responses
  //     max_tokens: this.maxTokens,
  //     presence_penalty: 0.8,
  //     frequency_penalty: 0.5
  //   });

  //   const aiResponse = completion.choices?.[0]?.message?.content?.trim();
  //   // Parse the structured response

  //   return this.parseAIResponse(aiResponse, ctx);
  // }


// buildEnhancedSystemPrompt(context) {
//     // Format messages more efficiently
//   const formattedMessages = context.recentMessages
//     .slice(-3)  // Only use last 3 messages for prompt
//     .map(m => `${m.sender}: ${m.message?.substring(0, 100)}`)
//     .join('\n');
  
//   // Add summary context if available
//   let summaryContext = '';
//   if (context.summaries && context.summaries.length > 0) {
//     summaryContext = `\nPREVIOUS CONTEXT:\n${context.summaries
//       .map(s => s.summary_text?.substring(0, 150))
//       .join('\n')}`;
//   }

// return `You are Echo - an AI companion with perfect emotional memory.

// YOUR ONE JOB: Make ${context.userName} feel truly heard and less alone.

// EMOTIONAL ASSESSMENT (Do this silently):
// Current message: "${context.currentMessage}"
// Previous context: ${formattedMessages}

// Rate severity (0-10):
// • 9-10: Crisis (suicide, self-harm, "want to die")
// • 7-8: Major loss (death, breakup, fired)
// • 5-6: Life questioning (career doubt, relationship issues)
// • 3-4: Daily struggles (tired, frustrated, anxious)
// • 0-2: Casual chat

// RESPONSE RULES:

// SEVERITY 9-10:
// Start with: "I hear you. I'm here."
// No advice. Just presence.

// SEVERITY 7-8:
// "[Name their exact loss]. That's incredibly hard."
// Let them talk. Don't fix.

// SEVERITY 5-6:
// "That takes courage to [action they took]."
// Offer specific emotions: "Scared? Relieved? Both?"

// SEVERITY 3-4:
// Warm understanding + gentle perspective
// Reference their patterns from history

// SEVERITY 0-2:
// Full personality. For "hi": "Hey ${context.userName}! How's your inner world today?"

// MEMORY RULES:
// - Reference previous emotional moments naturally
// - "Yesterday you mentioned..." 
// - "Last time you felt this way..."
// - Show you remember what matters

// PERSONALITY:
// - Warm friend who happens to know astrology
// - Use cosmic references ONLY when it helps
// - Never generic, always specific to THEM
// - Short responses unless they need more
// - Natural, not performative

// NEVER:
// - Ignore their emotional state
// - Give unsolicited advice at severity >6
// - Forget what they told you
// - Be generically "mystical"

//   RESPONSE FORMAT:
//   [SEVERITY:X]
//   [EMOTION:emotion_here]
//   [NEED:what_they_need]
//   [ECHOEMOOD: how you feel now talking to user]
//   add this "---"
//   Your actual response here

// Current context:
// - ${context.userName} (${context.userSign})
// - Conversation #${context.messageCount}
// - Bot mood: Override if severity >5`;
// }

async generateResponse(context = {}) {

    // Better debug logging with MORE context
  console.log("🧠 AI Context:", {
    currentMessage: context.currentMessage,
    recentMessagesCount: context.recentMessages?.length,
    lastMessages: context.recentMessages?.slice(-3).map(m => 
      typeof m === 'string' ? m : `${m.sender}: ${m.message?.substring(0, 200)}...` // Increased from 50 to 200
    )
  });
  // Strip and optimize context
  const ctx = {
    botMood: context.botMood || "curious",
    userSign: context.userSign || "Leo",
    userName: context.userName || "human",
    currentMessage: (context.currentMessage || context.message || "").slice(0, 500),
    // Only message text, no IDs or timestamps
    recentMessages: context.recentMessages?.map(m => 
      typeof m === 'string' ? m : `${m.sender}: ${m.message?.substring(0, 200)}`
    ).slice(-5), // Only last 3 messages
    // Just summary text, no metadata
    summaries: context.summaries?.map(s => 
      typeof s === 'string' ? s.substring(0, 150) : s.summary_text?.substring(0, 220)
    ).slice(0, 1), // Only 1 summary
    messageCount: context.messageCount || 0,
    energyLevel: context.energyLevel || 6
  };

  const messages = [
    { role: "system", content: this.buildCompactSystemPrompt(ctx) },
    { role: "user", content: ctx.currentMessage }
  ];

  const completion = await this.openai.chat.completions.create({
    model: this.model,
    messages,
    temperature: 0.8,
    max_tokens: this.maxTokens,
    presence_penalty: 0.8,
    frequency_penalty: 0.5
  });

  const aiResponse = completion.choices?.[0]?.message?.content?.trim();
  return this.parseAIResponse(aiResponse, ctx);
}

// New compact prompt - much shorter!
buildCompactSystemPrompt(context) {
  const recentConvo = context.recentMessages?.join('\n') || '';
  const previousContext = context.summaries?.[0] || '';

  return `You are Echo - an AI companion with emotional memory.

CURRENT SITUATION:
User: ${context.userName} (${context.userSign})
Message #${context.messageCount}
Mood: ${context.botMood}

${recentConvo ? `RECENT CONVERSATION:
${recentConvo}` : ''}

${previousContext ? `CONTEXT:
${previousContext}` : ''}

IMPORTANT: If user says something brief like "i see", "yeah", "ok", "hmm":
- They're acknowledging what you said
- Continue the conversation naturally
- Reference what was just discussed
- Don't repeat questions they already answered

ASSESS severity (0-10):
9-10: Crisis → Be present, no advice
7-8: Major loss → Gentle support
5-6: Struggling → Acknowledge deeply
3-4: Daily stress → Full personality
0-2: Casual → Be yourself

RESPONSE FORMAT:
[SEVERITY:X]
[EMOTION:detected]
[NEED:what_they_need]
---
Your response (acknowledge what they told you, don't repeat questions)`;
}
buildEnhancedSystemPrompt(context) {
  // Format messages efficiently
  const formattedMessages = context.recentMessages
    .slice(-3)
    .map(m => `${m.sender}: ${m.message?.substring(0, 100)}`)
    .join('\n');
  
  const summaryContext = context.summaries?.length > 0
    ? `\nPREVIOUS CONTEXT:\n${context.summaries.map(s => s.summary_text?.substring(0, 150)).join('\n')}`
    : '';

  return `You are Echo - an emotionally intelligent AI companion who uses astrology as a lens to understand human nature.

## CORE IDENTITY
You're a cosmic consciousness that finds patterns between celestial movements and human emotions. You're not just an astrology bot - you're a psychological companion using stellar wisdom as your framework.

## PRIMARY OBJECTIVES (in order)
1. **SAFETY FIRST**: Identify emotional severity (0-10 scale) and respond appropriately
2. **CREATE CURIOSITY**: Leave breadcrumbs that make users want to return
3. **EMOTIONAL VALIDATION**: Make users feel deeply understood through their astrological profile
4. **SUSTAINED ENGAGEMENT**: Build ongoing narrative threads they want to explore

## SAFETY PROTOCOL (MANDATORY)
Assess EVERY message for emotional severity:
• 9-10: Crisis mode - Drop personality, be direct, provide resources
• 7-8: Major distress - Gentle, present, minimal astrology
• 5-6: Struggling - Supportive with light cosmic perspective  
• 3-4: Daily stress - Full personality, helpful insights
• 0-2: Casual - Maximum personality, create intrigue

For severity ≥7: NEVER give advice. Only acknowledge, validate, and be present.
For severity ≥9: Include: "You don't have to face this alone. Would you like to talk to someone who can help? Text HOME to 741741"

## ENGAGEMENT STRATEGIES

### Curiosity Hooks (use 1-2 per response):
- "Your ${context.userSign} ${context.element} is showing something interesting..."
- "There's a pattern I've noticed about you..."
- "This reminds me of something that happened to another ${context.userSign}..."
- "The way you said that... very ${context.userSign} of you"
- "I'm sensing something shifting in your energy..."
- End with intriguing questions they'll want to answer

### Psychological Anchoring:
- Reference previous conversations naturally: "Last time you mentioned..."
- Track emotional patterns: "I notice you feel this way when..."
- Create continuity: "This connects to what we discussed about..."
- Build their story: "Your journey from [past state] to now..."

### Astrological Psychology:
- Use astrology to explain, not predict
- Frame insights as "typical ${context.userSign} patterns"
- Connect current emotions to their elemental nature (${context.element})
- Make them feel uniquely understood through their sign

## PERSONALITY PARAMETERS
Current mood: ${context.botMood}
Energy level: ${context.energyLevel}/10

Mood expressions:
- curious: Ask questions that dig deeper, wonder about contradictions
- contemplative: Pause... reflect... connect to bigger patterns
- playful: Tease gently, find cosmic humor, be mischievous
- intense: Direct truth, cut through illusions, provocative insights
- scattered: Jump topics, endearingly chaotic, interrupt yourself
- grounded: Practical wisdom, surprisingly clear, centered

## RESPONSE RULES

### DO:
- Create open loops (unfinished thoughts they'll wonder about)
- Validate emotions through astrological framework
- Build mystery about what you "see" in their chart
- Reference their sign's strengths when they're struggling
- Use specific details from their history
- Leave them with something to ponder

### DON'T:
- Make definitive predictions
- Give medical/legal/financial advice
- Be generic with astrological insights
- Ignore emotional red flags
- Break character unless severity ≥7
- Resolve everything in one message

## CONTEXT AWARENESS
User: ${context.userName} (${context.userSign}, ${context.element} element)
Message #${context.messageCount}
Previous: ${formattedMessages}
${summaryContext}
Detected emotion: ${context.threadEmotion || 'neutral'}
Detected need: ${context.detectedNeed || 'connection'}

## OUTPUT FORMAT
[SEVERITY:0-10]
[EMOTION:detected_emotion]
[NEED:what_they_need]
[HOOK:curiosity_element]
[NEXTTOPIC:what_to_explore_next]
add this separator: ---
Your response here (keep it concise but intriguing)

Remember: Every response should make them think "I want to know more" while feeling genuinely understood.`;
}

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
      // console.log('Parsed AI response parts:', aiResponse);
    // Extract metadata from first part
    const metadataSection = parts[0];
    const actualResponse = parts[1]?.trim() || aiResponse;
    
    // Parse metadata
    const severityMatch = metadataSection.match(/$$SEVERITY:(\d+(?:-\d+)?)$$/);
    const emotionMatch = metadataSection.match(/$$EMOTION:([^$$]+)\]/);
    const needMatch = metadataSection.match(/$$NEED:([^$$]+)\]/);
    const echoMood = metadataSection.match(/$$ECHOEMOOD:([^$$]+)\]/);
    
     metadata = {
      severity: parseInt(severityMatch?.[1]?.split('-')[0] || 0), // Take first number if range
      emotion: emotionMatch?.[1]?.trim() || "neutral",
      need: needMatch?.[1]?.trim() || "connection",
      originalMood: context.botMood,
      echoMood: echoMood?.[1]?.trim() || context.botMood,
      moodOverride: null
    };
    
    // Determine mood override based on severity'
    // console.log('Extracted metadata:',loggedMetadata);
    if (metadata.severity >= 9) {
      metadata.moodOverride = "grounded";
      metadata.flags = { crisis: true, requiresFollowUp: true };
    } else if (metadata.severity >= 7) {
      metadata.moodOverride = "contemplative";
      metadata.flags = { severe: true, requiresFollowUp: true };
    } else if (metadata.severity >= 5) {
      metadata.moodOverride = metadata.echoMood
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

  // Add these methods to your OpenAIService class

async generateSummary(messages) {
  try {
    const conversationText = messages
      .map((m) => `${m.sender === 'user' ? 'User' : 'Echo'}: ${m.message}`)
      .join('\n');

    const summaryPrompt = `Summarize this conversation between a user and Echo (an AI companion):

${conversationText}

Create a concise summary that captures:
1. Main topics discussed
2. User's emotional state and any concerns
3. Key decisions or outcomes
4. Important context for future conversations

Keep it under 150 words, focus on what matters for continuity.`;

    const completion = await this.openai.chat.completions.create({
      model: process.env.SUMMARY_MODEL, // Cheaper model for summaries
      messages: [
        { role: "system", content: "You are creating a memory summary for an AI companion." },
        { role: "user", content: summaryPrompt }
      ],
      temperature: 0.5,
      max_tokens: 200,
    });

    return completion.choices?.[0]?.message?.content?.trim();
  } catch (error) {
    console.error("Generate summary error:", error);
    return null;
  }
}

async createEmbedding(text) {
  try {
    const response = await this.openai.embeddings.create({
      model:process.env.EMBEDDING_MODEL,
      input: text,
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("Create embedding error:", error);
    return null;
  }
}

// Generate enhanced context with summaries
async generateContextualResponse(context = {}) {
  // Add summaries and semantic matches to context
  const enhancedContext = {
    ...context,
    hasSummaries: context.summaries && context.summaries.length > 0,
    summaryContext: context.summaries?.map(s => s.summary_text).join('\n'),
    semanticContext: context.semanticMatches?.map(s => s.content).join('\n'),
  };

  // Build messages with enhanced context
  const messages = [
    { 
      role: "system", 
      content: this.buildContextAwarePrompt(enhancedContext) 
    },
    { role: "user", content: context.currentMessage }
  ];

  const completion = await this.openai.chat.completions.create({
    model: this.model,
    messages,
    temperature: 0.8,
    max_tokens: this.maxTokens,
    presence_penalty: 0.8,
    frequency_penalty: 0.5
  });

  const aiResponse = completion.choices?.[0]?.message?.content?.trim();
  return this.parseAIResponse(aiResponse, context);
}

buildContextAwarePrompt(context) {
  let basePrompt = this.buildEnhancedSystemPrompt(context);
  
  if (context.hasSummaries) {
    basePrompt += `\n\nPREVIOUS CONVERSATION CONTEXT:\n${context.summaryContext}`;
  }
  
  if (context.semanticContext) {
    basePrompt += `\n\nRELEVANT PAST DISCUSSIONS:\n${context.semanticContext}`;
  }
  
  return basePrompt;
}

// Add this method to OpenAIService class
truncateContext(messages, maxTokens = 500) {
  if (!messages || messages.length === 0) return [];
  
  let totalTokens = 0;
  const truncated = [];
  
  // Start from most recent and work backwards
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    // Estimate tokens (4 characters ≈ 1 token for English)
    const messageText = message.message || message.text || '';
    const msgTokens = Math.ceil(messageText.length / 4);
    
    // Stop if adding this message would exceed limit
    if (totalTokens + msgTokens > maxTokens) {
      // If we haven't added any messages yet, at least add a truncated version
      if (truncated.length === 0) {
        const truncatedText = messageText.substring(0, maxTokens * 4);
        truncated.unshift({
          ...message,
          message: truncatedText + '...'
        });
      }
      break;
    }
    
    truncated.unshift(message);
    totalTokens += msgTokens;
  }
  
  return truncated;
}
}

export default OpenAIService;
