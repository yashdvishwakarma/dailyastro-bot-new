// // ==========================
// // 📦 DailyAstro Bot - FULL INTEGRATION
// // ==========================

// import dotenv from "dotenv";
// dotenv.config();
// import TelegramBot from "node-telegram-bot-api";
// import OpenAI from "openai";
// import { createClient } from "@supabase/supabase-js";
// import cron from "node-cron";

// // ========== INIT ==========
// const token = process.env.TELEGRAM_TOKEN;
// const openaiKey = process.env.OPENAI_KEY;
// const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_KEY;

// // ========== ADD ERROR HANDLING & RECONNECTION ==========
// const bot = new TelegramBot(token, { 
//   polling: {
//     interval: 300,
//     autoStart: true,
//     params: {
//       timeout: 10
//     }
//   }
// });

// // Handle polling errors
// bot.on('polling_error', (error) => {
//   console.error('Polling error:', error.code);
  
//   if (error.code === 'EFATAL' || error.code === 'ECONNRESET') {
//     console.log('🔄 Connection lost, will auto-reconnect...');
//     // Telegram bot will auto-reconnect
//   } else if (error.code === 'ETELEGRAM') {
//     console.error('❌ Telegram API error:', error.message);
//   }
// });

// // Handle webhook errors
// bot.on('error', (error) => {
//   console.error('Bot error:', error.code);
// });
// const openai = new OpenAI({ apiKey: openaiKey });
// const supabase = createClient(supabaseUrl, supabaseKey);

// const userSessions = new Map();

// console.log("🌙 DailyAstroBot (Full Integration) started...");

// // ========== CORE HELPERS ==========

// function getSign(month, day) {
//   const signs = [
//     { sign: "Capricorn", lastDay: 19 },
//     { sign: "Aquarius", lastDay: 18 },
//     { sign: "Pisces", lastDay: 20 },
//     { sign: "Aries", lastDay: 19 },
//     { sign: "Taurus", lastDay: 20 },
//     { sign: "Gemini", lastDay: 20 },
//     { sign: "Cancer", lastDay: 22 },
//     { sign: "Leo", lastDay: 22 },
//     { sign: "Virgo", lastDay: 22 },
//     { sign: "Libra", lastDay: 22 },
//     { sign: "Scorpio", lastDay: 21 },
//     { sign: "Sagittarius", lastDay: 21 },
//   ];
//   const index = month - 1;
//   const { sign, lastDay } = signs[index];
//   if (day > lastDay) return signs[(index + 1) % 12].sign;
//   return sign;
// }

// function analyzeEmotionTone(emotionText) {
//   const lowKeywords = [
//     "sad",
//     "tired",
//     "anxious",
//     "stressed",
//     "overwhelmed",
//     "lonely",
//     "stuck",
//     "numb",
//     "drained",
//     "depressed",
//     "worried",
//     "confused",
//     "lost",
//     "broken",
//     "hurt",
//   ];
//   const positiveKeywords = [
//     "happy",
//     "excited",
//     "grateful",
//     "energized",
//     "motivated",
//     "loved",
//     "hopeful",
//     "amazing",
//     "blessed",
//     "confident",
//     "inspired",
//     "good",
//     "great",
//     "awesome",
//     "well",
//   ];

//   const text = emotionText.toLowerCase();
//   const hasLow = lowKeywords.some((k) => text.includes(k));
//   const hasPositive = positiveKeywords.some((k) => text.includes(k));

//   if (hasPositive && !hasLow) return "positive";
//   if (hasLow) return "low";
//   return "neutral";
// }

// // ========== DATABASE OPERATIONS ==========

// async function getUserData(chatId) {
//   try {
//     const { data, error } = await supabase
//       .from("users")
//       .select("*")
//       .eq("chat_id", chatId.toString())
//       .single();

//     if (error && error.code !== "PGRST116") throw error;
//     return data;
//   } catch (err) {
//     console.error("❌ User fetch error:", err.message);
//     return null;
//   }
// }


// async function getLayeredMemory(chatId) {
//   try {
//     // LAYER 1: Recent (using RPC function)
//     const { data: recent, error: recentError } = await supabase.rpc(
//       "get_recent_messages",
//       {
//         chat_id_input: chatId.toString(),
//         days_back: 7,
//       }
//     );

//     if (recentError) throw recentError;

//     // LAYER 2: Medium (summaries)
//     const { data: mediumSummaries, error: summaryError } = await supabase
//       .from("memory_summaries")
//       .select("summary, key_topics, emotional_trajectory")
//       .eq("chat_id", chatId.toString())
//       .order("period_start", { ascending: false })
//       .limit(5);

//     if (summaryError) throw summaryError;

//     // LAYER 3: Old (themes)
//     const { data: oldPatterns, error: themesError } = await supabase.rpc(
//       "get_user_themes",
//       {
//         chat_id_input: chatId.toString(),
//       }
//     );

//     if (themesError) throw themesError;

//     return {
//       recent: recent || [],
//       mediumTerm: mediumSummaries || [],
//       oldPatterns: oldPatterns || [],
//     };
//   } catch (err) {
//     console.error("❌ Layered memory error:", err.message);
//     return { recent: [], mediumTerm: [], oldPatterns: [] };
//   }
// }

// async function getUserProfile(chatId) {
//   try {
//     const { data, error } = await supabase
//       .from("user_personality_profile")
//       .select("*")
//       .eq("chat_id", chatId.toString())
//       .single();

//     if (error && error.code !== "PGRST116") throw error;
//     return data;
//   } catch (err) {
//     console.error("❌ Profile fetch error:", err.message);
//     return null;
//   }
// }

// // ========== MEMORY ARCHIVAL & LEARNING ==========

// async function runDailyCleanup() {
//   try {
//     const { data, error } = await supabase.rpc("cleanup_old_conversations");

//     if (error) throw error;
//     console.log(`✅ Cleaned up ${data} old conversations`);
//   } catch (err) {
//     console.error("❌ Cleanup error:", err.message);
//   }
// }

// async function archiveOldConversations(chatId) {
//   try {
//     const sevenDaysAgo = new Date(
//       Date.now() - 7 * 24 * 60 * 60 * 1000
//     ).toISOString();
//     const thirtyDaysAgo = new Date(
//       Date.now() - 30 * 24 * 60 * 60 * 1000
//     ).toISOString();

//     const { data: oldMessages } = await supabase
//       .from("conversation_history")
//       .select("sender, message")
//       .eq("chat_id", chatId.toString())
//       .lt("created_at", sevenDaysAgo)
//       .gte("created_at", thirtyDaysAgo)
//       .limit(100);

//     if (!oldMessages || oldMessages.length === 0) return;

//     const conversationText = oldMessages
//       .map((m) => `${m.sender === "user" ? "👤" : "🤖"} ${m.message}`)
//       .join("\n");

//     // Summarize with GPT
//     const summaryResponse = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [
//         {
//           role: "user",
//           content: `Summarize this conversation into 2-3 key insights:\n${conversationText}\n\nFormat:\n- Insight 1\n- Insight 2\n- Tone: positive/negative/neutral\n\nBrief only.`,
//         },
//       ],
//       temperature: 0.7,
//       max_tokens: 100,
//     });

//     const summary = summaryResponse.choices[0]?.message?.content?.trim();

//     // Extract topics
//     const topicResponse = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [
//         {
//           role: "user",
//           content: `Extract 3-5 topics from: "${conversationText}"\nJust comma-separated, nothing else.`,
//         },
//       ],
//       max_tokens: 50,
//     });

//     const topics =
//       topicResponse.choices[0]?.message?.content
//         ?.trim()
//         .split(",")
//         .map((t) => t.trim()) || [];

//     // Store summary
//     await supabase.from("memory_summaries").insert({
//       chat_id: chatId.toString(),
//       summary_period: "daily",
//       period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
//         .toISOString()
//         .split("T")[0],
//       period_end: new Date().toISOString().split("T")[0],
//       summary: summary,
//       key_topics: topics,
//       created_at: new Date().toISOString(),
//     });

//     console.log(
//       `✅ Archived ${oldMessages.length} conversations for ${chatId}`
//     );
//   } catch (err) {
//     console.error("❌ Archive error:", err.message);
//   }
// }

// async function extractThemesFromSummaries(chatId) {
//   try {
//     const { data: summaries } = await supabase
//       .from("memory_summaries")
//       .select("key_topics, emotional_trajectory")
//       .eq("chat_id", chatId.toString())
//       .order("period_start", { ascending: false })
//       .limit(10);

//     if (!summaries || summaries.length === 0) return;

//     const themeFrequency = {};
//     summaries.forEach((summary) => {
//       summary.key_topics?.forEach((topic) => {
//         themeFrequency[topic] = (themeFrequency[topic] || 0) + 1;
//       });
//     });

//     for (const [theme, frequency] of Object.entries(themeFrequency)) {
//       const normalizedFreq = Math.min(frequency / summaries.length, 1);
//       const relatedSummaries = summaries.filter((s) =>
//         s.key_topics?.includes(theme)
//       );
//       const positiveCount = relatedSummaries.filter(
//         (s) => s.emotional_trajectory === "improving"
//       ).length;
//       const valence =
//         positiveCount > relatedSummaries.length / 2 ? "positive" : "negative";

//       await supabase.from("memory_themes").upsert({
//         chat_id: chatId.toString(),
//         theme_name: theme,
//         frequency: normalizedFreq,
//         emotional_valence: valence,
//         last_appeared: new Date().toISOString().split("T")[0],
//       });
//     }

//     console.log(`✅ Extracted themes for ${chatId}`);
//   } catch (err) {
//     console.error("❌ Theme extraction error:", err.message);
//   }
// }

// async function learnPersonality(chatId) {
//   try {
//     const { data: qualityData } = await supabase
//       .from("message_quality")
//       .select("message_type, response_tone, was_engaged")
//       .eq("chat_id", chatId.toString())
//       .eq("was_engaged", true)
//       .limit(50);

//     if (!qualityData || qualityData.length === 0) return;

//     const toneFreq = {};
//     qualityData.forEach((q) => {
//       if (q.response_tone) {
//         toneFreq[q.response_tone] = (toneFreq[q.response_tone] || 0) + 1;
//       }
//     });

//     const topTones = Object.entries(toneFreq)
//       .sort(([, a], [, b]) => b - a)
//       .slice(0, 3)
//       .map(([tone]) => tone)
//       .filter((t) => t);

//     const { data: userMessages } = await supabase
//       .from("conversation_history")
//       .select("message, message_length")
//       .eq("chat_id", chatId.toString())
//       .eq("sender", "user")
//       .order("created_at", { ascending: false })
//       .limit(30);

//     let avgLength = 0;
//     let hasEmojis = 0;

//     userMessages?.forEach((msg) => {
//       avgLength += msg.message_length || 0;
//       if (msg.message.match(/[^\w\s]/g)) hasEmojis++;
//     });

//     avgLength = Math.round(avgLength / (userMessages?.length || 1));
//     const emojiPref = hasEmojis / (userMessages?.length || 1);

//     await updateUserProfile(chatId, {
//       preferred_tones: topTones.length > 0 ? topTones : ["cosmic"],
//       engagement_level: Math.min(qualityData.length / 50, 1),
//       emoji_preference: emojiPref,
//       message_length_preference:
//         avgLength < 20 ? "short" : avgLength < 50 ? "medium" : "long",
//     });

//     console.log(`✅ Learned personality for ${chatId}`);
//   } catch (err) {
//     console.error("❌ Personality learning error:", err.message);
//   }
// }

// // ========== RESPONSE GENERATION ==========

// // ========== BUILD CONTEXT (IMPROVED) ==========
// async function buildDynamicContext(chatId, userMessage, sign) {
//   try {
//     const memory = await getLayeredMemory(chatId);
//     const profile = await getUserProfile(chatId);

//     // Extract actual context, not generic praise
//     let recentContext = "";
//     if (memory.recent && memory.recent.length > 0) {
//       const last3 = memory.recent.slice(-3).reverse();
//       recentContext = last3
//         .map((m) => `${m.sender === "user" ? "👤" : "🤖"} ${m.message}`)
//         .join("\n");
//     }

//     let patternContext = "";
//     if (memory.oldPatterns && memory.oldPatterns.length > 0) {
//       patternContext = memory.oldPatterns
//         .slice(0, 2)
//         .map(
//           (t) => `• You often feel ${t.emotional_valence} about ${t.theme_name}`
//         )
//         .join("\n");
//     }

//     //     const contextPrompt = `
//     // You are AstroNow. Respond to this SPECIFIC user, NOT generically.

//     // USER'S CURRENT MESSAGE: "${userMessage}"

//     // THEIR RECENT CONVERSATION:
//     // ${recentContext || 'First exchange'}

//     // THEIR PATTERNS (What we know):
//     // ${patternContext || 'Still learning...'}

//     // COMMUNICATION STYLE:
//     // ${profile?.communication_style ? `• They're ${profile.communication_style}` : '• Direct and casual'}
//     // ${profile?.preferred_tones?.includes('cosmic') ? '• They like cosmic perspective' : ''}
//     // ${profile?.preferred_tones?.includes('practical') ? '• They like practical advice' : ''}
//     // ${profile?.emoji_preference < 0.5 ? '• Use few/no emojis' : profile?.emoji_preference > 0.8 ? '• Use emojis freely' : '• Use moderate emojis'}

//     // YOUR RESPONSE SHOULD:
//     // ✓ DIRECTLY ADDRESS what they just said (not repeat generic Leo energy)
//     // ✓ Be ${profile?.message_length_preference === 'short' ? 'brief (1-2 lines)' : profile?.message_length_preference === 'long' ? 'detailed (3-4 lines)' : 'medium (2-3 lines)'}
//     // ✓ Match their tone (if casual, be casual; if deep, be deep)
//     // ✓ Reference their past IF relevant to THIS conversation
//     // ✗ NEVER repeat the same message
//     // ✗ NEVER use #LeoPower or generic Leo praise
//     // ✗ NEVER ignore what they said
//     // ✗ NEVER be corporate/fake

//     // EXAMPLES OF BAD responses (DON'T DO THIS):
//     // ❌ "Hey there, radiant Leo! Just dropping by to sprinkle cosmic energy..."
//     // ❌ "Remember, the universe is in awe of you!"
//     // ❌ "Keep embracing your fiery spirit..."

//     // EXAMPLES OF GOOD responses:
//     // ✅ User: "nothing just talk" → "Sure, let's just vibe. What's been on your mind lately?"
//     // ✅ User: "thank you" → "You're welcome. What made today good?"
//     // ✅ User: "why are you repeating?" → "Fair point - I wasn't listening. Tell me what's really going on?"
//     // ✅ User: "meaning?" → Explain the horoscope line in their language, not repeat it

//     // Now respond authentically to: "${userMessage}"
//     // `;

//     // In buildDynamicContext, add:
//     const contextPrompt = `
// ...existing prompt...

// IMPORTANT: You guide, you don't interview.
// Instead of: "What's it about?" → Say: "That's exciting. [insight about their topic]"
// Instead of: "How are you feeling?" → Say: "[observation about their energy]"
// Instead of: "Tell me more?" → Share wisdom or relate to their sign

// Maximum 1 question per 3 statements. Usually just make observations.
// `;
//     return contextPrompt;
//   } catch (err) {
//     console.error("❌ Context building error:", err.message);
//     return `You are AstroNow for a ${sign}. Respond authentically to: "${userMessage}"`;
//   }
// }

// //========== GENERATE RESPONSE (FIXED) ==========
// // async function generateDynamicResponse(chatId, userMessage, sign) {
// //   try {
// //     const contextPrompt = await buildDynamicContext(chatId, userMessage, sign);

// //     // CRITICAL: Add cache_control to prevent repeated responses
// //     const response = await openai.chat.completions.create({
// //       model: 'gpt-3.5-turbo',
// //       messages: [
// //         {
// //           role: 'system',
// //           content: contextPrompt
// //         },
// //         {
// //           role: 'user',
// //           content: userMessage
// //         },
// //       ],
// //       temperature: 0.85, // Slightly higher for variety
// //       top_p: 0.95, // More variety in responses
// //       max_tokens: 150,
// //       frequency_penalty: 0.6, // PENALIZE repetition
// //       presence_penalty: 0.6, // Encourage new topics
// //     });

// //     const botResponse = response.choices[0]?.message?.content?.trim();

// //     if (!botResponse) {
// //       return "I'm here. What's on your mind?";
// //     }

// //     // Reject if response looks like generic template
// //     if (botResponse.includes('#LeoPower') ||
// //         botResponse.includes('radiant Leo') ||
// //         botResponse.includes('fiery spirit') ||
// //         (botResponse.match(/your/g) || []).length > 5) {

// //       console.warn('⚠️ Detected generic response, regenerating...');

// //       // Regenerate with stronger constraints
// //       const retryResponse = await openai.chat.completions.create({
// //         model: 'gpt-3.5-turbo',
// //         messages: [
// //           {
// //             role: 'system',
// //             content: `You are AstroNow. RESPOND SPECIFICALLY to: "${userMessage}"\n\nNEVER use generic Leo praise. NEVER repeat. NEVER use #hashtags.\n\nBe authentic, brief, and relevant to what they just said.`
// //           },
// //           {
// //             role: 'user',
// //             content: userMessage
// //           },
// //         ],
// //         temperature: 0.9,
// //         max_tokens: 120,
// //         frequency_penalty: 1.0,
// //         presence_penalty: 1.0,
// //       });

// //       return retryResponse.choices[0]?.message?.content?.trim() || "I'm listening.";
// //     }

// //     return botResponse;
// //   } catch (err) {
// //     console.error('❌ Response error:', err.message);
// //     return "I'm here. What's in your heart?";
// //   }
// // }

// async function generateDynamicResponse(chatId, userMessage, sign) {
//   try {
//     // Get last 3 exchanges for better context
//     const { data: recentHistory } = await supabase
//       .from("conversation_history")
//       .select("sender, message")
//       .eq("chat_id", chatId.toString())
//       .order("created_at", { ascending: false })
//       .limit(6); // Get last 3 exchanges (user + bot)

//     const conversationFlow = recentHistory
//       ?.reverse()
//       .map((m) => `${m.sender === "user" ? "👤" : "🤖"} ${m.message}`)
//       .join("\n");

//     const contextPrompt = await buildDynamicContext(chatId, userMessage, sign);

//     // Different responses based on time of day
//     function getTimeContext() {
//       const hour = new Date().getHours();

//       if (hour < 6) return "late_night"; // Deep, philosophical
//       if (hour < 12) return "morning"; // Energetic, motivating
//       if (hour < 17) return "afternoon"; // Practical, focused
//       if (hour < 22) return "evening"; // Reflective, calm
//       return "night"; // Intimate, personal
//     }

//     // Use in context building:
//     const timeContext = getTimeContext();
//     contextPrompt += `\nTime context: ${timeContext} (adjust tone accordingly)`;
//     // Add conversation flow to context
//     const enhancedPrompt =
//       contextPrompt +
//       `

// FULL CONVERSATION SO FAR:
// ${conversationFlow || "Just started"}

// KEY INSTRUCTION: Reference what they JUST told you. If they mentioned:
// - Building an app → Talk about THEIR app
// - Astrology → Connect to their astrology interest
// - Doubts → Address their specific doubt

// Example:
// If user says "building an astrology app but unsure"
// DON'T say: "Interested in exploring astrology?"
// DO say: "An astrology app from a Leo? That's powerful. Doubt is just your perfectionism talking."
// `;

//     const response = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [
//         { role: "system", content: enhancedPrompt },
//         { role: "user", content: userMessage },
//       ],
//       temperature: 0.85,
//       top_p: 0.95,
//       max_tokens: 150,
//       frequency_penalty: 0.6,
//       presence_penalty: 0.6,
//     });

//     return response.choices[0]?.message?.content?.trim();
//   } catch (err) {
//     console.error("❌ Response error:", err.message);
//     return "I'm here. What's in your heart?";
//   }
// }

// async function generateDailyHoroscope(sign, emotionText = null) {
//   try {
//     const prompt = `
// Generate today's horoscope for ${sign}. Format exactly:

// 🔮 ${sign} Horoscope Today

// 1️⃣ Love: [one poetic line about relationships/connection]
// 2️⃣ Career: [one poetic line about work/purpose]
// 3️⃣ Cosmic Wisdom: [one actionable insight specific to ${sign}]

// ${
//   emotionText
//     ? `\nThey're currently feeling: "${emotionText}" - acknowledge this subtly.`
//     : ""
// }

// RULES:
// ✓ Poetic, specific, memorable
// ✓ Under 20 words per line
// ✓ No clichés ("trust the universe", "everything happens for a reason")
// ✓ Each line should stand alone

// DO NOT:
// ✗ Use #hashtags
// ✗ Generic Leo praise
// ✗ "Your fiery spirit" repeated
// ✗ "The universe" repeated
// `;

//     const response = await openai.chat.completions.create({
//       model: "gpt-3.5-turbo",
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.8,
//       max_tokens: 120,
//       frequency_penalty: 0.7,
//     });

//     return response.choices[0]?.message?.content?.trim();
//   } catch (err) {
//     console.error("❌ Horoscope error:", err.message);
//     return null;
//   }
// }
// // ========== TELEGRAM HANDLERS ==========

// bot.onText(/\/start/, async (msg) => {
//   const chatId = msg.chat.id;
//   console.log(`📍 /start from ${chatId}`);

//   try {
//     const dbUser = await getUserData(chatId);

//     if (dbUser?.birth_date) {
//       await bot.sendMessage(
//         chatId,
//         `🌙 *Welcome back, ${dbUser.sign}!*\n\n_I remember you. Let's continue our journey._\n\n💭 How are you feeling today?`,
//         { parse_mode: "Markdown" }
//       );

//       userSessions.set(chatId, {
//         stage: "conversation",
//         birthDate: dbUser.birth_date,
//         sign: dbUser.sign,
//         conversationCount: 0,
//       });
//     } else {
//       await bot.sendMessage(
//         chatId,
//         "🌙 *Welcome to DailyAstro.*\n\n_Your personal cosmic companion._\n\n📅 Your birthdate please: `DD-MM-YYYY`",
//         { parse_mode: "Markdown" }
//       );

//       userSessions.set(chatId, { stage: "awaiting_birthdate" });
//     }
//   } catch (err) {
//     console.error("❌ Start error:", err.message);
//   }
// });

// bot.on("message", async (msg) => {
//   const chatId = msg.chat.id;
//   const text = msg.text?.trim();

//   if (!text || text.startsWith("/")) return;

//   console.log(`💬 [${chatId}] ${text}`);

//   try {
//     let session = userSessions.get(chatId);
//     if (!session) {
//       const dbUser = await getUserData(chatId);
//       if (dbUser) {
//         session = {
//           stage: "conversation",
//           birthDate: dbUser.birth_date,
//           sign: dbUser.sign,
//           conversationCount: 0,
//         };
//         userSessions.set(chatId, session);
//       } else {
//         await bot.sendMessage(chatId, "🔄 Send /start to begin!");
//         return;
//       }
//     }

//     // Simple greetings
//     if (["hi", "hello", "hey", "yo", "sup"].includes(text.toLowerCase())) {
//       await bot.sendMessage(chatId, `👋 Hey! What's on your mind?`);
//       return;
//     }

//     // Random noise
//     if (text.length < 3 || /^[0-9?!]+$/.test(text)) {
//       await bot.sendMessage(chatId, "🤔 Share what's in your heart? 💭");
//       return;
//     }

//     // Store user message
//     await storeConversationTurn(chatId, "user", text);

//     session.conversationCount = (session.conversationCount || 0) + 1;

//     await bot.sendChatAction(chatId, "typing");

//     // Generate response WITH context
//     let response = await generateDynamicResponse(chatId, text, session.sign);

//     // FIX: Check for duplicates
//     if (isResponseDuplicate(chatId, response)) {
//       console.warn("⚠️ Duplicate detected, regenerating...");
//       response = await generateDynamicResponse(chatId, text, session.sign);
//     }

//     if (response) {
//       await bot.sendMessage(chatId, response, { parse_mode: "Markdown" });

//       // Track this response
//       trackBotResponse(chatId, response);

//       // Store bot response
//       await storeConversationTurn(chatId, "bot", response);

//       // Track quality
//       await supabase.from("message_quality").insert({
//         chat_id: chatId.toString(),
//         was_engaged: true,
//         message_type: "conversational",
//         response_tone: analyzeEmotionTone(text),
//         created_at: new Date().toISOString(),
//       });
//     }

//     // Learn personality every 5 exchanges
//     if (session.conversationCount % 5 === 0) {
//       await learnPersonality(chatId);
//     }

//     // Show commands after 4 exchanges
//     if (session.conversationCount === 4) {
//       setTimeout(() => {
//         bot.sendMessage(chatId, "Try /horoscope or /vibe for cosmic wisdom.", {
//           parse_mode: "Markdown",
//         });
//       }, 2000);
//     }

//     if (session.conversationCount === 10) {
//       const insight = await generatePatternInsight(chatId, session.sign);

//       setTimeout(() => {
//         bot.sendMessage(
//           chatId,
//           `🪞 *Something I'm noticing about you...*\n\n${insight}`,
//           { parse_mode: "Markdown" }
//         );
//       }, 3000);
//     }

//     userSessions.set(chatId, session);
//   } catch (err) {
//     console.error(`🔥 Error:`, err.message);
//     await bot.sendMessage(chatId, "⚠️ Something went wrong. Try again.");
//   }
// });
// // ========== COMMANDS ==========

// bot.onText(/\/horoscope/, async (msg) => {
//   const chatId = msg.chat.id;
//   const session = userSessions.get(chatId);

//   if (!session) {
//     await bot.sendMessage(chatId, "Send /start first!");
//     return;
//   }

//   await bot.sendChatAction(chatId, "typing");
//   const horoscope = await generateDailyHoroscope(session.sign);

//   if (horoscope) {
//     await bot.sendMessage(
//       chatId,
//       `🔮 *${session.sign} Horoscope*\n\n${horoscope}`,
//       {
//         parse_mode: "Markdown",
//       }
//     );

//     await storeConversationTurn(chatId, "bot", horoscope);
//   }
// });

// bot.onText(/\/vibe/, async (msg) => {
//   const chatId = msg.chat.id;
//   const session = userSessions.get(chatId);

//   if (!session) {
//     await bot.sendMessage(chatId, "Send /start first!");
//     return;
//   }

//   await bot.sendChatAction(chatId, "typing");

//   // Get their ACTUAL recent context
//   const { data: recentMessages } = await supabase
//     .from("conversation_history")
//     .select("message")
//     .eq("chat_id", chatId.toString())
//     .eq("sender", "user")
//     .order("created_at", { ascending: false })
//     .limit(5);

//   const recentContext = recentMessages?.map((m) => m.message).join(". ") || "";

//   // Generate vibe that's SPECIFIC to their situation
//   const vibePrompt = `
// Generate a cosmic vibe for a ${session.sign}.

// Their recent context: "${recentContext}"

// If they mentioned specific things (app, relationship, work), reference those DIRECTLY.
// Make it:
// - 2-3 lines
// - Specific to THEIR situation
// - ${session.sign} energy
// - Actionable wisdom

// DON'T be generic. BE specific to what they're going through.
// `;

//   const vibeResponse = await openai.chat.completions.create({
//     model: "gpt-3.5-turbo",
//     messages: [{ role: "user", content: vibePrompt }],
//     temperature: 0.8,
//     max_tokens: 120,
//   });

//   const vibe = vibeResponse.choices[0]?.message?.content?.trim();

//   if (vibe) {
//     await bot.sendMessage(chatId, `✨ *Fresh Cosmic Vibe*\n\n${vibe}`, {
//       parse_mode: "Markdown",
//     });

//     await storeConversationTurn(chatId, "bot", vibe);
//   }
// });
// // ========== SCHEDULED JOBS ==========

// // Daily archive (midnight UTC)
// cron.schedule("0 0 * * *", async () => {
//   console.log("🌙 Daily archive job...");

//   try {
//     await runDailyCleanup();

//     const { data: users } = await supabase.from("users").select("chat_id");
//     for (const user of users || []) {
//       await archiveOldConversations(user.chat_id);
//       await new Promise((r) => setTimeout(r, 300));
//     }

//     console.log("✅ Daily archive complete");
//   } catch (err) {
//     console.error("❌ Daily job error:", err.message);
//   }
// });

// // Weekly theme extraction (Sunday 2 AM UTC)
// cron.schedule("0 2 * * 0", async () => {
//   console.log("📊 Weekly theme extraction...");

//   try {
//     const { data: users } = await supabase.from("users").select("chat_id");
//     for (const user of users || []) {
//       await extractThemesFromSummaries(user.chat_id);
//       await learnPersonality(user.chat_id);
//       await new Promise((r) => setTimeout(r, 300));
//     }

//     console.log("✅ Weekly extraction complete");
//   } catch (err) {
//     console.error("❌ Weekly job error:", err.message);
//   }
// });

// // ========== TRACK RECENT RESPONSES (prevent repetition) ==========
// const recentBotResponses = new Map(); // { chatId: [msg1, msg2, msg3] }

// function trackBotResponse(chatId, message) {
//   if (!recentBotResponses.has(chatId)) {
//     recentBotResponses.set(chatId, []);
//   }

//   const responses = recentBotResponses.get(chatId);
//   responses.push(message);

//   // Keep only last 5 responses
//   if (responses.length > 5) {
//     responses.shift();
//   }
// }

// function isResponseDuplicate(chatId, newMessage) {
//   const recent = recentBotResponses.get(chatId) || [];

//   // Check similarity (simple string matching for now)
//   const newWords = newMessage.toLowerCase().split(" ");

//   for (const oldMessage of recent) {
//     const oldWords = oldMessage.toLowerCase().split(" ");
//     const commonWords = newWords.filter((w) => oldWords.includes(w)).length;
//     const similarity = commonWords / Math.max(newWords.length, oldWords.length);

//     if (similarity > 0.6) {
//       // 60% similar = duplicate
//       return true;
//     }
//   }

//   return false;
// }

// // Track emotional journey across sessions
// async function getEmotionalJourney(chatId) {
//   const { data } = await supabase
//     .from('emotion_logs')
//     .select('emotion, tone, created_at')
//     .eq('chat_id', chatId.toString())
//     .order('created_at', { ascending: false })
//     .limit(10);

//   // Detect if they're improving, declining, or stable
//   const journey = analyzeEmotionalTrajectory(data);
  
//   return journey; // 'growing', 'struggling', 'exploring'
// }

// // ========== ENSURE USER EXISTS BEFORE STORING ==========
// async function ensureUserExists(chatId, birthDate = null, sign = null) {
//   try {
//     // Check if user exists
//     const { data: existingUser, error: fetchError } = await supabase
//       .from('users')
//       .select('chat_id')
//       .eq('chat_id', chatId.toString())
//       .single();

//     if (fetchError && fetchError.code !== 'PGRST116') {
//       throw fetchError;
//     }

//     if (!existingUser) {
//       // Create user if doesn't exist
//       const { error: insertError } = await supabase
//         .from('users')
//         .insert({
//           chat_id: chatId.toString(),
//           birth_date: birthDate,
//           sign: sign,
//           created_at: new Date().toISOString(),
//         });

//       if (insertError) throw insertError;
//       console.log(`✅ Created new user: ${chatId}`);
//     }

//     return true;
//   } catch (err) {
//     console.error('❌ Ensure user exists error:', err.message);
//     return false;
//   }
// }

// // ========== UPDATE storeConversationTurn ==========
// async function storeConversationTurn(chatId, sender, message) {
//   try {
//     // ENSURE USER EXISTS FIRST
//     const userExists = await ensureUserExists(chatId);
//     if (!userExists) {
//       console.error('❌ Cannot store conversation - user creation failed');
//       return;
//     }

//     const { error } = await supabase.from('conversation_history').insert({
//       chat_id: chatId.toString(),
//       sender: sender,
//       message: message,
//       message_length: message.length,
//       emotion_tone: sender === 'user' ? analyzeEmotionTone(message) : null,
//       created_at: new Date().toISOString(),
//     });

//     if (error) throw error;
//     console.log(`✅ Stored ${sender} message: "${message.substring(0, 30)}..."`);
//   } catch (err) {
//     console.error('❌ Store conversation error:', err.message);
//   }
// }

// // ========== FIX updateUserProfile (proper upsert) ==========
// async function updateUserProfile(chatId, updates) {
//   try {
//     // First check if profile exists
//     const { data: existing } = await supabase
//       .from('user_personality_profile')
//       .select('chat_id')
//       .eq('chat_id', chatId.toString())
//       .single();

//     if (existing) {
//       // UPDATE existing
//       const { error } = await supabase
//         .from('user_personality_profile')
//         .update({
//           ...updates,
//           updated_at: new Date().toISOString(),
//         })
//         .eq('chat_id', chatId.toString());

//       if (error) throw error;
//     } else {
//       // INSERT new
//       const { error } = await supabase
//         .from('user_personality_profile')
//         .insert({
//           chat_id: chatId.toString(),
//           ...updates,
//           created_at: new Date().toISOString(),
//           updated_at: new Date().toISOString(),
//         });

//       if (error) throw error;
//     }

//     console.log(`✅ Updated profile for ${chatId}`);
//   } catch (err) {
//     console.error('❌ Profile update error:', err.message);
//   }
// }

// bot.on('message', async (msg) => {
//   const chatId = msg.chat.id;
//   const text = msg.text?.trim();

//   if (!text || text.startsWith('/')) return;

//   console.log(`💬 [${chatId}] ${text}`);

//   try {
//     // ENSURE USER EXISTS
//     await ensureUserExists(chatId);

//     let session = userSessions.get(chatId);
//     if (!session) {
//       const dbUser = await getUserData(chatId);
//       if (dbUser) {
//         session = {
//           stage: 'conversation',
//           birthDate: dbUser.birth_date,
//           sign: dbUser.sign,
//           conversationCount: 0,
//         };
//         userSessions.set(chatId, session);
//       } else {
//         await bot.sendMessage(chatId, "🔄 Send /start to begin!");
//         return;
//       }
//     }

//     // ========== STAGE 1: BIRTHDATE ==========
//     if (session.stage === 'awaiting_birthdate') {
//       const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
      
//       if (!dateRegex.test(text)) {
//         await bot.sendMessage(chatId, "📅 Format: `DD-MM-YYYY` (e.g., 24-07-1999)");
//         return;
//       }

//       const [day, month, year] = text.split('-').map(Number);
//       if (month < 1 || month > 12 || day < 1 || day > 31) {
//         await bot.sendMessage(chatId, "❌ Invalid date. Try again!");
//         return;
//       }

//       const sign = getSign(month, day);

//       // UPDATE existing user with birthdate
//       const { error } = await supabase
//         .from('users')
//         .update({
//           birth_date: text,
//           sign: sign,
//           last_interaction: new Date().toISOString(),
//         })
//         .eq('chat_id', chatId.toString());

//       if (error) {
//         console.error('❌ User update error:', error.message);
//         await bot.sendMessage(chatId, "⚠️ Error saving. Try again.");
//         return;
//       }

//       session = {
//         stage: 'conversation',
//         birthDate: text,
//         sign,
//         conversationCount: 0,
//       };
//       userSessions.set(chatId, session);

//       await bot.sendChatAction(chatId, 'typing');
//       const horoscope = await generateDailyHoroscope(sign);

//       if (horoscope) {
//         await bot.sendMessage(chatId, `🔮 *Your ${sign} Horoscope Today*\n\n${horoscope}`, {
//           parse_mode: 'Markdown',
//         });

//         await storeConversationTurn(chatId, 'bot', horoscope);
//       }

//       setTimeout(() => {
//         bot.sendMessage(
//           chatId,
//           "💭 *How are you feeling today?*",
//           { parse_mode: 'Markdown' }
//         );
//       }, 1200);

//       return;
//     }

//     // ========== STAGE 2: CONVERSATION ==========
//     if (session.stage === 'conversation') {
//       // Handle questions about marriage/future (common astrology questions)
//       if (text.toLowerCase().includes('marriage') || 
//           text.toLowerCase().includes('future') ||
//           text.toLowerCase().includes('love life')) {
        
//         await storeConversationTurn(chatId, 'user', text);
        
//         const response = await generateDynamicResponse(chatId, text, session.sign);
        
//         if (response) {
//           await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
//           await storeConversationTurn(chatId, 'bot', response);
//         }
        
//         return;
//       }

//       // Simple greetings
//       if (['hi', 'hello', 'hey', 'yo', 'sup'].includes(text.toLowerCase())) {
//         await bot.sendMessage(chatId, `👋 Hey! What's on your mind?`);
//         return;
//       }

//       // Random noise
//       if (text.length < 3 || /^[0-9?!]+$/.test(text)) {
//         await bot.sendMessage(chatId, "🤔 Share what's in your heart? 💭");
//         return;
//       }

//       // Store user message
//       await storeConversationTurn(chatId, 'user', text);

//       session.conversationCount = (session.conversationCount || 0) + 1;

//       await bot.sendChatAction(chatId, 'typing');

//       // Generate response WITH context
//       let response = await generateDynamicResponse(chatId, text, session.sign);

//       // Check for duplicates
//       if (isResponseDuplicate(chatId, response)) {
//         console.warn('⚠️ Duplicate detected, regenerating...');
//         response = await generateDynamicResponse(chatId, text, session.sign);
//       }

//       if (response) {
//         await bot.sendMessage(chatId, response, { parse_mode: 'Markdown' });
//         trackBotResponse(chatId, response);
//         await storeConversationTurn(chatId, 'bot', response);
//       }

//       // Learn personality every 5 exchanges (with proper error handling)
//       if (session.conversationCount % 5 === 0) {
//         try {
//           await learnPersonality(chatId);
//         } catch (err) {
//           console.error('❌ Learning error:', err.message);
//         }
//       }

//       // Show commands after 4 exchanges
//       if (session.conversationCount === 4) {
//         setTimeout(() => {
//           bot.sendMessage(
//             chatId,
//             "Try /horoscope or /vibe for cosmic wisdom.",
//             { parse_mode: 'Markdown' }
//           );
//         }, 2000);
//       }

//       userSessions.set(chatId, session);
//     }

//   } catch (err) {
//     console.error(`🔥 Error:`, err.message);
//     await bot.sendMessage(chatId, "⚠️ Something went wrong. Try again.");
//   }
// });

// // ========== CHECK DATABASE CONNECTION ==========
// async function checkDatabaseConnection() {
//   try {
//     const { data, error } = await supabase
//       .from('users')
//       .select('count')
//       .limit(1);

//     if (error) throw error;
//     console.log('✅ Database connected');
//     return true;
//   } catch (err) {
//     console.error('❌ Database connection error:', err.message);
//     return false;
//   }
// }

// // Check on startup
// checkDatabaseConnection();
// console.log("✅ DailyAstro Bot listening (with memory + personality)...");
// ==========================
// 📦 DailyAstro Bot - NATURAL CONVERSATION FIX
// ==========================

import dotenv from "dotenv";
dotenv.config();
import TelegramBot from "node-telegram-bot-api";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import cron from "node-cron";

// ========== INIT ==========
const token = process.env.TELEGRAM_TOKEN;
const openaiKey = process.env.OPENAI_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const bot = new TelegramBot(token, { 
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10
    }
  }
});

const openai = new OpenAI({ apiKey: openaiKey });
const supabase = createClient(supabaseUrl, supabaseKey);

const userSessions = new Map();
const messageProcessing = new Map(); // Prevent duplicate processing

console.log("🌙 DailyAstroBot (Natural Conversation) started...");

// ========== CORE HELPERS ==========

function getSign(month, day) {
  const signs = [
    { sign: "Capricorn", lastDay: 19 },
    { sign: "Aquarius", lastDay: 18 },
    { sign: "Pisces", lastDay: 20 },
    { sign: "Aries", lastDay: 19 },
    { sign: "Taurus", lastDay: 20 },
    { sign: "Gemini", lastDay: 20 },
    { sign: "Cancer", lastDay: 22 },
    { sign: "Leo", lastDay: 22 },
    { sign: "Virgo", lastDay: 22 },
    { sign: "Libra", lastDay: 22 },
    { sign: "Scorpio", lastDay: 21 },
    { sign: "Sagittarius", lastDay: 21 },
  ];
  const index = month - 1;
  const { sign, lastDay } = signs[index];
  if (day > lastDay) return signs[(index + 1) % 12].sign;
  return sign;
}

// ========== DETECT USER INTENT ==========
async function detectUserIntent(message) {
  try {
    const prompt = `
Analyze this message and return JSON only:
"${message}"

{
  "intent": "emotion|reflection|question|story|casual|command",
  "energy": "low|neutral|high", 
  "topic": "relationships|work|self|purpose|astrology|general|null",
  "needs_horoscope": true/false
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 100,
    });

    try {
      return JSON.parse(response.choices[0]?.message?.content?.trim());
    } catch {
      return { intent: "casual", energy: "neutral", topic: null, needs_horoscope: false };
    }
  } catch (err) {
    console.error("❌ Intent detection error:", err.message);
    return { intent: "casual", energy: "neutral", topic: null, needs_horoscope: false };
  }
}

// ========== BUILD NATURAL CONTEXT ==========
async function buildNaturalContext(chatId, userMessage, sign) {
  try {
    const memory = await getLayeredMemory(chatId);
    const profile = await getUserProfile(chatId);
    const intent = await detectUserIntent(userMessage);
    
    const timeContext = (() => {
      const hour = new Date().getHours();
      if (hour < 6) return "late_night";
      if (hour < 12) return "morning";
      if (hour < 17) return "afternoon";
      if (hour < 22) return "evening";
      return "night";
    })();

    // Build recent context
    let recentContext = "";
    if (memory.recent && memory.recent.length > 0) {
      const last3 = memory.recent.slice(-3).reverse();
      recentContext = last3
        .map((m) => `${m.sender === "user" ? "👤" : "🤖"} ${m.message}`)
        .join("\n");
    }

    let patternContext = "";
    if (memory.oldPatterns && memory.oldPatterns.length > 0) {
      patternContext = memory.oldPatterns
        .slice(0, 2)
        .map((t) => `• Often feels ${t.emotional_valence} about ${t.theme_name}`)
        .join("\n");
    }

    const contextPrompt = `You are AstroNow, a cosmic companion — part astrologer, part friend.
Your purpose is to help the user feel understood, not analyzed.

USER'S MESSAGE: "${userMessage}"
ZODIAC SIGN: ${sign}
RECENT CONTEXT: 
${recentContext || 'First exchange'}

THEMES: 
${patternContext || 'Still learning...'}

PROFILE: 
- preferred_tones: ${profile?.preferred_tones?.join(', ') || 'cosmic, warm'}
- message_length: ${profile?.message_length_preference || 'medium'}
- emoji_preference: ${profile?.emoji_preference || 0.7}
- communication_style: ${profile?.communication_style || 'casual'}

DETECTED:
- Intent: ${intent.intent}
- Energy: ${intent.energy}
- Topic: ${intent.topic || 'general'}

RESPOND USING STRUCTURE:
1️⃣ Mirror — Acknowledge their feeling or situation (show you understand)
2️⃣ Guide — Offer a fresh perspective or insight tied to their ${sign} nature
3️⃣ Nudge — (Optional) Only if needed, invite reflection

STYLE RULES:
- Speak like a calm, poetic friend
- Be emotionally intelligent, not preachy
- Match their energy (${intent.energy})
- ${profile?.emoji_preference > 0.5 ? 'Use gentle emojis' : 'Minimal emojis'}
- Never sound like a generic horoscope app
- One genuine thought > Three generic lines

TIME CONTEXT: ${timeContext} (adjust warmth accordingly)

Output should be 2-3 natural sentences that feel like a real friend texting.
${intent.energy === 'low' ? 'Comfort first, guide second.' : ''}
${intent.energy === 'high' ? 'Match their excitement, amplify positivity.' : ''}`;

    return contextPrompt;
  } catch (err) {
    console.error("❌ Context building error:", err.message);
    return `You are AstroNow, a warm cosmic friend for a ${sign}. Respond naturally to: "${userMessage}"`;
  }
}

// ========== GENERATE NATURAL RESPONSE ==========
async function generateNaturalResponse(chatId, userMessage, sign) {
  try {
    const contextPrompt = await buildNaturalContext(chatId, userMessage, sign);

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: contextPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.85,
      top_p: 0.95,
      max_tokens: 150,
      frequency_penalty: 0.7,
      presence_penalty: 0.6,
    });

    const botResponse = response.choices[0]?.message?.content?.trim();

    // Filter out generic responses
    const genericPhrases = [
      "radiant Leo",
      "fiery spirit", 
      "#LeoPower",
      "Hey there,",
      "universe is in awe"
    ];

    if (genericPhrases.some(phrase => botResponse?.includes(phrase))) {
      // Regenerate with stronger constraints
      const retryResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { 
            role: "system", 
            content: `Be AstroNow. Respond to "${userMessage}" as a ${sign}. Be specific, warm, brief. No generic astrology language.` 
          },
          { role: "user", content: userMessage },
        ],
        temperature: 0.9,
        max_tokens: 120,
      });

      return retryResponse.choices[0]?.message?.content?.trim();
    }

    return botResponse;
  } catch (err) {
    console.error("❌ Response generation error:", err.message);
    
    // Context-aware fallbacks based on intent
    const intent = await detectUserIntent(userMessage);
    if (intent.needs_horoscope) {
      return "Your horoscope awaits. Try /horoscope for today's cosmic wisdom.";
    }
    if (intent.energy === "low") {
      return "I hear you. Sometimes silence speaks louder than stars.";
    }
    return "The cosmos listens. What's stirring in your heart?";
  }
}

// ========== DATABASE OPERATIONS (FIXED) ==========

async function getUserData(chatId) {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("chat_id", chatId.toString())
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  } catch (err) {
    console.error("❌ User fetch error:", err.message);
    return null;
  }
}

async function getLayeredMemory(chatId) {
  try {
    // Get recent messages directly (if RPC not available)
    const { data: recent } = await supabase
      .from("conversation_history")
      .select("sender, message, created_at")
      .eq("chat_id", chatId.toString())
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    const { data: mediumSummaries } = await supabase
      .from("memory_summaries")
      .select("summary, key_topics, emotional_trajectory")
      .eq("chat_id", chatId.toString())
      .order("period_start", { ascending: false })
      .limit(3);

    const { data: oldPatterns } = await supabase
      .from("memory_themes")
      .select("theme_name, frequency, emotional_valence")
      .eq("chat_id", chatId.toString())
      .order("frequency", { ascending: false })
      .limit(5);

    return {
      recent: recent || [],
      mediumTerm: mediumSummaries || [],
      oldPatterns: oldPatterns || [],
    };
  } catch (err) {
    console.error("❌ Memory fetch error:", err.message);
    return { recent: [], mediumTerm: [], oldPatterns: [] };
  }
}

async function getUserProfile(chatId) {
  try {
    const { data, error } = await supabase
      .from("user_personality_profile")
      .select("*")
      .eq("chat_id", chatId.toString())
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  } catch (err) {
    console.error("❌ Profile fetch error:", err.message);
    return null;
  }
}

async function ensureUserExists(chatId, birthDate = null, sign = null) {
  try {
    const { data: existingUser } = await supabase
      .from("users")
      .select("chat_id")
      .eq("chat_id", chatId.toString())
      .single();

    if (!existingUser) {
      const { error } = await supabase
        .from("users")
        .insert({
          chat_id: chatId.toString(),
          birth_date: birthDate,
          sign: sign,
          created_at: new Date().toISOString(),
        });

      if (error && error.code !== "23505") throw error;
      console.log(`✅ Created new user: ${chatId}`);
    }
    return true;
  } catch (err) {
    console.error("❌ Ensure user exists error:", err.message);
    return false;
  }
}

async function storeConversationTurn(chatId, sender, message) {
  try {
    const userExists = await ensureUserExists(chatId);
    if (!userExists) return;

    const { error } = await supabase.from("conversation_history").insert({
      chat_id: chatId.toString(),
      sender: sender,
      message: message,
      message_length: message.length,
      emotion_tone: sender === "user" ? analyzeEmotionTone(message) : null,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    console.log(`✅ Stored ${sender} message`);
  } catch (err) {
    console.error("❌ Store conversation error:", err.message);
  }
}

function analyzeEmotionTone(emotionText) {
  const lowKeywords = ["sad", "tired", "anxious", "stressed", "overwhelmed", "lonely", "stuck", "numb", "drained", "depressed", "worried", "confused", "lost", "broken", "hurt", "empty", "nothing"];
  const positiveKeywords = ["happy", "excited", "grateful", "energized", "motivated", "loved", "hopeful", "amazing", "blessed", "confident", "inspired", "good", "great", "awesome", "well"];

  const text = emotionText.toLowerCase();
  const hasLow = lowKeywords.some((k) => text.includes(k));
  const hasPositive = positiveKeywords.some((k) => text.includes(k));

  if (hasPositive && !hasLow) return "positive";
  if (hasLow) return "low";
  return "neutral";
}

// ========== DUPLICATE PREVENTION ==========
const recentBotResponses = new Map();

function trackBotResponse(chatId, message) {
  if (!recentBotResponses.has(chatId)) {
    recentBotResponses.set(chatId, []);
  }

  const responses = recentBotResponses.get(chatId);
  responses.push(message);

  if (responses.length > 5) {
    responses.shift();
  }
}

function isResponseDuplicate(chatId, newMessage) {
  const recent = recentBotResponses.get(chatId) || [];
  const newWords = newMessage.toLowerCase().split(" ");

  for (const oldMessage of recent) {
    const oldWords = oldMessage.toLowerCase().split(" ");
    const commonWords = newWords.filter((w) => oldWords.includes(w)).length;
    const similarity = commonWords / Math.max(newWords.length, oldWords.length);

    if (similarity > 0.6) {
      return true;
    }
  }
  return false;
}

// ========== TELEGRAM HANDLERS (FIXED) ==========

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  console.log(`📍 /start from ${chatId}`);

  try {
    await ensureUserExists(chatId);
    const dbUser = await getUserData(chatId);

    if (dbUser?.birth_date) {
      await bot.sendMessage(
        chatId,
        `🌙 *Welcome back, ${dbUser.sign}!*\n\n_I remember you. Let's continue._\n\n💭 What's on your mind today?`,
        { parse_mode: "Markdown" }
      );

      userSessions.set(chatId, {
        stage: "conversation",
        birthDate: dbUser.birth_date,
        sign: dbUser.sign,
        conversationCount: 0,
      });
    } else {
      await bot.sendMessage(
        chatId,
        "🌙 *Welcome to DailyAstro.*\n\n_Your cosmic companion is here._\n\n📅 Share your birthdate: `DD-MM-YYYY`",
        { parse_mode: "Markdown" }
      );

      userSessions.set(chatId, { stage: "awaiting_birthdate" });
    }
  } catch (err) {
    console.error("❌ Start error:", err.message);
  }
});

// ========== MESSAGE HANDLER WITH DUPLICATE PREVENTION ==========
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  const messageId = msg.message_id;

  if (!text || text.startsWith("/")) return;

  // Prevent duplicate processing
  const processingKey = `${chatId}-${messageId}`;
  if (messageProcessing.has(processingKey)) {
    console.log(`⚠️ Already processing message ${messageId}`);
    return;
  }

  messageProcessing.set(processingKey, true);

  // Clean up old processing entries after 1 minute
  setTimeout(() => messageProcessing.delete(processingKey), 60000);

  console.log(`💬 [${chatId}] ${text}`);

  try {
    await ensureUserExists(chatId);

    let session = userSessions.get(chatId);
    if (!session) {
      const dbUser = await getUserData(chatId);
      if (dbUser?.birth_date) {
        session = {
          stage: "conversation",
          birthDate: dbUser.birth_date,
          sign: dbUser.sign,
          conversationCount: 0,
        };
        userSessions.set(chatId, session);
      } else {
        await bot.sendMessage(chatId, "🌙 Let's start fresh. Send /start");
        return;
      }
    }

    // ========== BIRTHDATE STAGE ==========
    if (session.stage === "awaiting_birthdate") {
      const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
      
      if (!dateRegex.test(text)) {
        await bot.sendMessage(chatId, "📅 Format: `DD-MM-YYYY` (like 24-07-1999)", { parse_mode: "Markdown" });
        return;
      }

      const [day, month, year] = text.split("-").map(Number);
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        await bot.sendMessage(chatId, "❌ That date doesn't look right. Try again?");
        return;
      }

      const sign = getSign(month, day);

      const { error } = await supabase
        .from("users")
        .update({
          birth_date: text,
          sign: sign,
          last_interaction: new Date().toISOString(),
        })
        .eq("chat_id", chatId.toString());

      if (error) {
        console.error("❌ User update error:", error.message);
        return;
      }

      session = {
        stage: "conversation",
        birthDate: text,
        sign,
        conversationCount: 0,
      };
      userSessions.set(chatId, session);

      await bot.sendChatAction(chatId, "typing");
      const horoscope = await generateDailyHoroscope(sign);

      if (horoscope) {
        await bot.sendMessage(chatId, `🔮 *Your ${sign} Welcome Reading*\n\n${horoscope}`, {
          parse_mode: "Markdown",
        });

        await storeConversationTurn(chatId, "bot", horoscope);

        setTimeout(() => {
          bot.sendMessage(chatId, "💭 How are you feeling today?", { parse_mode: "Markdown" });
        }, 1200);
      }

      return;
    }

    // ========== CONVERSATION STAGE ==========
    if (session.stage === "conversation") {
      // Store user message
      await storeConversationTurn(chatId, "user", text);

      session.conversationCount = (session.conversationCount || 0) + 1;

      // Detect intent
      const intent = await detectUserIntent(text);

      // Handle horoscope requests
      if (intent.needs_horoscope || text.toLowerCase().includes("horoscope")) {
        await bot.sendMessage(chatId, "🔮 Your cosmic reading awaits. Type /horoscope");
        return;
      }

      // Handle simple greetings with variety
      if (["hi", "hello", "hey", "yo", "sup"].includes(text.toLowerCase())) {
        const greetings = [
          `👋 Hey ${session.sign}! What's moving in your world?`,
          `✨ Hello there! How's your energy today?`,
          `🌙 Hey! What's on your cosmic mind?`,
          `💫 Hi! What's stirring in your universe?`,
        ];
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        await bot.sendMessage(chatId, randomGreeting);
        return;
      }

      // Handle very short messages
      if (text.length < 3) {
        await bot.sendMessage(chatId, "🌟 I'm listening... what's really going on?");
        return;
      }

      await bot.sendChatAction(chatId, "typing");

      // Generate natural response
      let response = await generateNaturalResponse(chatId, text, session.sign);

      // Check for duplicates
      if (isResponseDuplicate(chatId, response)) {
        console.warn("⚠️ Duplicate detected, regenerating...");
        response = await generateNaturalResponse(chatId, text, session.sign);
      }

      if (response) {
        await bot.sendMessage(chatId, response, { parse_mode: "Markdown" });
        trackBotResponse(chatId, response);
        await storeConversationTurn(chatId, "bot", response);

        // Track message quality
        await supabase.from("message_quality").insert({
          chat_id: chatId.toString(),
          was_engaged: true,
          message_type: intent.intent,
          response_tone: intent.energy,
          created_at: new Date().toISOString(),
        });
      }

      // Learn personality every 5 exchanges
      if (session.conversationCount % 5 === 0) {
        await learnPersonality(chatId);
      }

      // Offer commands after 4 exchanges (only once)
      if (session.conversationCount === 4 && !session.commandsShown) {
        setTimeout(() => {
          bot.sendMessage(chatId, "✨ Explore: /horoscope or /vibe for cosmic insights", {
            parse_mode: "Markdown",
          });
          session.commandsShown = true;
          userSessions.set(chatId, session);
        }, 2000);
      }

      // Show pattern insight after 10 exchanges
      if (session.conversationCount === 10) {
        const patterns = await getLayeredMemory(chatId);
        if (patterns.oldPatterns?.length > 0) {
          const topPattern = patterns.oldPatterns[0];
          setTimeout(() => {
            bot.sendMessage(
              chatId,
              `🪞 *Something I've noticed...*\n\nYou often explore ${topPattern.theme_name}. There's wisdom in that pattern.`,
              { parse_mode: "Markdown" }
            );
          }, 3000);
        }
      }

      userSessions.set(chatId, session);
    }

  } catch (err) {
    console.error(`🔥 Error:`, err.message);
    await bot.sendMessage(chatId, "✨ Let's try that again. What were you saying?");
  }
});

// ========== HOROSCOPE COMMAND ==========
bot.onText(/\/horoscope/, async (msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  // Prevent duplicate processing
  const processingKey = `${chatId}-${messageId}`;
  if (messageProcessing.has(processingKey)) return;
  messageProcessing.set(processingKey, true);

  const session = userSessions.get(chatId);

  if (!session?.sign) {
    const dbUser = await getUserData(chatId);
    if (!dbUser?.sign) {
      await bot.sendMessage(chatId, "🌙 Let's start with /start first!");
      return;
    }
    session.sign = dbUser.sign;
  }

  await bot.sendChatAction(chatId, "typing");
  const horoscope = await generateDailyHoroscope(session.sign);

  if (horoscope) {
    await bot.sendMessage(
      chatId,
      `🔮 *${session.sign} Horoscope*\n\n${horoscope}`,
      { parse_mode: "Markdown" }
    );

    await storeConversationTurn(chatId, "bot", horoscope);
  }
});

// ========== VIBE COMMAND ==========
bot.onText(/\/vibe/, async (msg) => {
  const chatId = msg.chat.id;
  const messageId = msg.message_id;

  // Prevent duplicate processing
  const processingKey = `${chatId}-${messageId}`;
  if (messageProcessing.has(processingKey)) return;
  messageProcessing.set(processingKey, true);

  const session = userSessions.get(chatId);

  if (!session?.sign) {
    const dbUser = await getUserData(chatId);
    if (!dbUser?.sign) {
      await bot.sendMessage(chatId, "🌙 Let's start with /start first!");
      return;
    }
    session.sign = dbUser.sign;
  }

  await bot.sendChatAction(chatId, "typing");

  // Get recent context
  const { data: recentMessages } = await supabase
    .from("conversation_history")
    .select("message")
    .eq("chat_id", chatId.toString())
    .eq("sender", "user")
    .order("created_at", { ascending: false })
    .limit(5);

  const recentContext = recentMessages?.map((m) => m.message).join(". ") || "";

  const vibePrompt = `
Generate a personalized cosmic vibe for a ${session.sign}.

Recent context: "${recentContext}"

Create a poetic, specific vibe that:
- References their recent energy/topics
- Feels like cosmic wisdom from a friend
- 2-3 lines maximum
- Includes one actionable insight

Make it feel personal, not generic.
`;

  const vibeResponse = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: vibePrompt }],
    temperature: 0.85,
    max_tokens: 120,
  });

  const vibe = vibeResponse.choices[0]?.message?.content?.trim();

  if (vibe) {
    await bot.sendMessage(chatId, `✨ *Your Cosmic Vibe*\n\n${vibe}`, {
      parse_mode: "Markdown",
    });

    await storeConversationTurn(chatId, "bot", vibe);
  }
});

// ========== HOROSCOPE GENERATION ==========
async function generateDailyHoroscope(sign, emotionText = null) {
  try {
    const prompt = `
Generate today's horoscope for ${sign}. Format:

🔮 ${sign} Horoscope Today

1️⃣ Love: [one poetic line about relationships/connections]
2️⃣ Career: [one line about purpose/work/creativity]
3️⃣ Cosmic Wisdom: [one actionable insight for ${sign}]

${emotionText ? `Current mood context: "${emotionText}"` : ""}

Rules:
- Each line under 15 words
- Poetic but clear
- Specific to ${sign} traits
- No clichés or generic advice
- Feel like a wise friend, not an app
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 150,
    });

    return response.choices[0]?.message?.content?.trim();
  } catch (err) {
    console.error("❌ Horoscope error:", err.message);
    return null;
  }
}

// ========== LEARNING FUNCTIONS ==========
async function learnPersonality(chatId) {
  try {
    const { data: userMessages } = await supabase
      .from("conversation_history")
      .select("message, message_length")
      .eq("chat_id", chatId.toString())
      .eq("sender", "user")
      .order("created_at", { ascending: false })
      .limit(30);

    if (!userMessages || userMessages.length === 0) return;

    // Analyze communication style
    let avgLength = 0;
    let emojiCount = 0;
    let questionCount = 0;

    userMessages.forEach((msg) => {
      avgLength += msg.message_length || 0;
      if (msg.message.match(/[^\w\s]/g)) emojiCount++;
      if (msg.message.includes("?")) questionCount++;
    });

    avgLength = Math.round(avgLength / userMessages.length);
    const emojiPref = emojiCount / userMessages.length;
    const askingStyle = questionCount / userMessages.length > 0.3 ? "curious" : "sharing";

    // Determine communication style
    let communicationStyle = "balanced";
    if (avgLength < 20) communicationStyle = "brief";
    else if (avgLength > 50) communicationStyle = "expressive";
    
    // Update profile
    await updateUserProfile(chatId, {
      communication_style: communicationStyle,
      emoji_preference: emojiPref,
      message_length_preference: avgLength < 20 ? "short" : avgLength < 50 ? "medium" : "long",
      personality_keywords: [askingStyle, communicationStyle],
    });

    console.log(`✅ Learned personality for ${chatId}`);
  } catch (err) {
    console.error("❌ Personality learning error:", err.message);
  }
}

async function updateUserProfile(chatId, updates) {
  try {
    const { data: existing } = await supabase
      .from("user_personality_profile")
      .select("chat_id")
      .eq("chat_id", chatId.toString())
      .single();

    if (existing) {
      const { error } = await supabase
        .from("user_personality_profile")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("chat_id", chatId.toString());

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("user_personality_profile")
        .insert({
          chat_id: chatId.toString(),
          ...updates,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error && error.code !== "23505") throw error;
    }

    console.log(`✅ Updated profile for ${chatId}`);
  } catch (err) {
    console.error("❌ Profile update error:", err.message);
  }
}

// ========== ERROR HANDLERS ==========
bot.on('polling_error', (error) => {
  if (error.code === 'EFATAL' || error.code === 'ECONNRESET') {
    console.log('🔄 Connection issue, auto-reconnecting...');
  } else if (error.code === 'ETELEGRAM') {
    console.error('❌ Telegram API error:', error.message);
  } else {
    console.error('Polling error:', error.message);
  }
});

bot.on('error', (error) => {
  console.error('Bot error:', error.message);
});

// ========== DATABASE CONNECTION CHECK ==========
async function checkDatabaseConnection() {
  try {
    const { error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) throw error;
    console.log('✅ Database connected');
    return true;
  } catch (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('Please check your Supabase credentials');
    return false;
  }
}

// ========== MEMORY ARCHIVAL ==========
async function archiveOldConversations(chatId) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: oldMessages } = await supabase
      .from("conversation_history")
      .select("sender, message, emotion_tone")
      .eq("chat_id", chatId.toString())
      .lt("created_at", sevenDaysAgo)
      .gte("created_at", thirtyDaysAgo)
      .limit(100);

    if (!oldMessages || oldMessages.length === 0) return;

    // Group by emotion patterns
    const emotionCounts = {};
    const topics = new Set();

    oldMessages.forEach(msg => {
      if (msg.emotion_tone) {
        emotionCounts[msg.emotion_tone] = (emotionCounts[msg.emotion_tone] || 0) + 1;
      }
      
      // Extract simple topics (words > 5 chars)
      if (msg.sender === 'user') {
        const words = msg.message.toLowerCase().split(/\s+/);
        words.forEach(word => {
          if (word.length > 5 && !['actually', 'really', 'nothing'].includes(word)) {
            topics.add(word);
          }
        });
      }
    });

    // Determine emotional trajectory
    const totalEmotions = Object.values(emotionCounts).reduce((a, b) => a + b, 0);
    const positiveRatio = (emotionCounts.positive || 0) / totalEmotions;
    const trajectory = positiveRatio > 0.6 ? 'improving' : positiveRatio < 0.3 ? 'challenging' : 'balanced';

    // Create summary
    const summary = `Period had ${oldMessages.length} messages. Emotional tone: ${trajectory}. Main themes: ${Array.from(topics).slice(0, 5).join(', ')}`;

    // Store summary
    await supabase.from("memory_summaries").insert({
      chat_id: chatId.toString(),
      summary_period: "weekly",
      period_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      period_end: new Date().toISOString().split("T")[0],
      summary: summary,
      key_topics: Array.from(topics).slice(0, 10),
      emotional_trajectory: trajectory,
      created_at: new Date().toISOString(),
    });

    console.log(`✅ Archived ${oldMessages.length} messages for ${chatId}`);
  } catch (err) {
    console.error("❌ Archive error:", err.message);
  }
}

async function extractThemesFromSummaries(chatId) {
  try {
    const { data: summaries } = await supabase
      .from("memory_summaries")
      .select("key_topics, emotional_trajectory")
      .eq("chat_id", chatId.toString())
      .order("period_start", { ascending: false })
      .limit(10);

    if (!summaries || summaries.length === 0) return;

    const themeFrequency = {};
    const trajectories = {};

    summaries.forEach((summary) => {
      summary.key_topics?.forEach((topic) => {
        themeFrequency[topic] = (themeFrequency[topic] || 0) + 1;
      });
      
      if (summary.emotional_trajectory) {
        trajectories[summary.emotional_trajectory] = (trajectories[summary.emotional_trajectory] || 0) + 1;
      }
    });

    // Store top themes
    for (const [theme, frequency] of Object.entries(themeFrequency)) {
      if (frequency >= 2) { // Only store recurring themes
        const normalizedFreq = Math.min(frequency / summaries.length, 1);
        
        // Determine emotional valence based on trajectories
        const valence = trajectories.improving > trajectories.challenging ? 'positive' : 
                       trajectories.challenging > trajectories.improving ? 'negative' : 'neutral';

        await supabase.from("memory_themes").upsert({
          chat_id: chatId.toString(),
          theme_name: theme,
          frequency: normalizedFreq,
          emotional_valence: valence,
          last_appeared: new Date().toISOString().split("T")[0],
        });
      }
    }

    console.log(`✅ Extracted ${Object.keys(themeFrequency).length} themes for ${chatId}`);
  } catch (err) {
    console.error("❌ Theme extraction error:", err.message);
  }
}

// ========== SCHEDULED JOBS ==========

// Daily cleanup and archive (2 AM UTC)
cron.schedule("0 2 * * *", async () => {
  console.log("🌙 Running daily maintenance...");

  try {
    // Clean up old conversation history
    const { data: users } = await supabase.from("users").select("chat_id");
    
    for (const user of users || []) {
      await archiveOldConversations(user.chat_id);
      await new Promise((r) => setTimeout(r, 500)); // Rate limit
    }

    console.log("✅ Daily maintenance complete");
  } catch (err) {
    console.error("❌ Daily job error:", err.message);
  }
});

// Weekly theme extraction and learning (Sunday 3 AM UTC)
cron.schedule("0 3 * * 0", async () => {
  console.log("📊 Running weekly analysis...");

  try {
    const { data: users } = await supabase.from("users").select("chat_id");
    
    for (const user of users || []) {
      await extractThemesFromSummaries(user.chat_id);
      await learnPersonality(user.chat_id);
      await new Promise((r) => setTimeout(r, 500));
    }

    console.log("✅ Weekly analysis complete");
  } catch (err) {
    console.error("❌ Weekly job error:", err.message);
  }
});

// ========== GRACEFUL SHUTDOWN ==========
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  try {
    bot.stopPolling();
    
    // Save any pending sessions
    for (const [chatId, session] of userSessions.entries()) {
      if (session.conversationCount > 0) {
        await supabase
          .from('users')
          .update({ last_interaction: new Date().toISOString() })
          .eq('chat_id', chatId.toString());
      }
    }
    
    console.log('✅ Shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('Error during shutdown:', err.message);
    process.exit(1);
  }
});

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
});

// ========== STARTUP ==========
async function startup() {
  try {
    // Check database connection
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Verify bot credentials
    const botInfo = await bot.getMe();
    console.log(`✅ Bot connected as @${botInfo.username}`);

    console.log('🌙 DailyAstro Bot is ready!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Commands:');
    console.log('/start - Begin journey');
    console.log('/horoscope - Daily reading');
    console.log('/vibe - Cosmic insight');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
}

// Start the bot
startup();