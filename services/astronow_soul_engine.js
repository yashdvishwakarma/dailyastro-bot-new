// AstroNow v3.0 — Soul Engine (Integrated with Memory Graph)
// Purpose: Emotionally intelligent conversation system with long-term vector recall
// Author: Jarvis x GPT-5

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import { ASTRONOW_PERSONALITY } from '../utils/constants.js';
import { memoryGraph } from './memoryGraph.js';
// 🧬 Convert structured ASTRONOW_PERSONALITY object into string
function buildPersonalityPrompt(personality) {
  if (typeof personality === 'string') return personality;

  let base = personality.basePrompt || '';
  if (personality.expressions) {
    base += '\n\nEXPRESSION BANK:\n';
    for (const [mood, lines] of Object.entries(personality.expressions)) {
      base += `- ${mood.toUpperCase()}: ${lines.join(' | ')}\n`;
    }
  }

  return base.trim();
}


const openai = new OpenAI({ apiKey: config.openai.apiKey });

// === Memory System ==========================================================
const MEMORY_FILE = path.resolve('./astro_memory.json');
if (!fs.existsSync(MEMORY_FILE)) fs.writeFileSync(MEMORY_FILE, JSON.stringify({ users: {} }, null, 2));

const loadMemory = () => JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf-8'));
const saveMemory = (data) => fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));

// === Emotion + Context Analyzer =============================================
function analyzeContext(message) {
  const lower = message.toLowerCase();
  let emotion = 'neutral';
  let intimacy = 1;

  if (/sad|tired|lost|hurt|lonely|angry/.test(lower)) emotion = 'sad';
  if (/happy|excited|joy|grateful|love/.test(lower)) emotion = 'happy';
  if (/anxious|scared|confused|unsure/.test(lower)) emotion = 'anxious';

  if (/i feel|i think|my life|deep|honestly/.test(lower)) intimacy = 2;
  if (/fear|pain|childhood|alone|death|vulnerable/.test(lower)) intimacy = 3;

  return { emotion, intimacy };
}

// === Tone Bank ==============================================================
const TONES = {
  happy: 'warm, playful, light',
  sad: 'gentle, compassionate, comforting',
  anxious: 'calm, grounding, reassuring',
  neutral: 'curious, steady, thoughtful'
};

// === Follow-Up Generator ====================================================
function generateFollowUp(hooks, emotion) {
  if (!hooks || hooks.length === 0) return null;
  const hook = hooks[Math.floor(Math.random() * hooks.length)];
  const followUps = [
    `You mentioned ${hook}. What about that feels ${emotion} for you?`,
    `Tell me more about ${hook}. What made that stand out today?`,
    `When you think of ${hook}, what emotion does it really bring up?`
  ];
  return followUps[Math.floor(Math.random() * followUps.length)];
}

// === Hook Extractor =========================================================
function extractHooks(message) {
  const tokens = message.split(/[,\.\!\?]/).map(t => t.trim()).filter(t => t.length > 4);
  const hooks = tokens.filter(t => !/(the|and|but|then|okay|yeah|sure)/.test(t));
  return hooks.slice(0, 3);
}

// === Soul Engine ============================================================
export async function soulEngine(userId, userMessage) {
  const memory = loadMemory();
  const userData = memory.users[userId] || { profile: {}, history: [] };

  // Step 1: Analyze emotional context
  const { emotion, intimacy } = analyzeContext(userMessage);
  const hooks = extractHooks(userMessage);

  userData.profile.lastEmotion = emotion;
  userData.profile.lastIntimacy = intimacy;
  userData.history.push({ user: userMessage, ts: Date.now(), emotion });

  // Step 2: Recall past memories from Memory Graph
  const recalledMemories = await memoryGraph.recall(userId, userMessage);
  const memoryContext = memoryGraph.summarizeMemories(recalledMemories);

  // Step 3: Store this new message in long-term memory (async)
  await memoryGraph.storeMemory(userId, userMessage, emotion);

  // Step 4: Identity and personality injection
  const identity = buildPersonalityPrompt(ASTRONOW_PERSONALITY);

  // Step 5: Construct tone-aware system prompt with recalled context
  const tone = TONES[emotion] || TONES["neutral"];
  const followUp = generateFollowUp(hooks, emotion);

  const systemPrompt = `
${identity}
Tone: ${tone}
User Emotion: ${emotion}
Intimacy Level: ${intimacy}

${memoryContext ? `\n${memoryContext}\n` : ""}
User: ${userMessage}
AstroNow:
  `.trim();

  // Step 6: Generate the response via OpenAI
  const completion = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      { role: "system", content: identity },
      { role: "user", content: systemPrompt },
    ],
    temperature: config.openai.temperature || 0.8,
    max_tokens: config.openai.maxTokens || 300,
  });

  let response = completion.choices[0].message.content.trim();

  // Step 7: Append natural follow-up
  if (followUp && Math.random() > 0.3) response += `\n\n${followUp}`;

  // Step 8: Update session memory
  userData.history.push({ bot: response, ts: Date.now(), emotion });
  memory.users[userId] = userData;
  saveMemory(memory);

  return response;
}

// === Example Usage ==========================================================
// (async () => {
//   const reply = await soulEngine('user123', 'I have been feeling so lost lately.');
//   console.log(reply);
// })();
