import OpenAI from 'openai';
import fs from 'fs';
import { config } from '../config.js';
import { ASTRONOW_PERSONALITY } from '../utils/constants.js';
import path from 'path';

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
  const tokens = message.split(/[,\\.\\!\\?]/).map(t => t.trim()).filter(t => t.length > 4);
  const hooks = tokens.filter(t => !/(the|and|but|then|okay|yeah|sure)/.test(t));
  return hooks.slice(0, 3);
}

// === OpenAIService Class ====================================================
export class OpenAIService {
  constructor() {
    this.openai = openai;
  }

  

  // 🌙 Soul Engine Integration
async generateResponse(prompt, userMessage) {
  try {
    // 🧬 Build AstroNow's personality prompt (convert object to string)
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

    const identity = buildPersonalityPrompt(ASTRONOW_PERSONALITY);

    // 🪶 Build the complete system + user prompt
    const systemPrompt = `
${identity}

User: ${userMessage}
AstroNow:
    `.trim();

    // 🔮 Call OpenAI API
    const response = await this.openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: systemPrompt }
      ],
      temperature: config.openai.temperature,
      max_tokens: config.openai.maxTokens
    });

    return response.choices[0]?.message?.content?.trim() || 
      "The stars are listening...";
  } catch (error) {
    console.error('OpenAI error:', error);
    return "The cosmic winds are silent right now...";
  }
}


  // 🌈 Emotion Detection (kept intact)
  async detectEmotion(message) {
    const prompt = `
Analyze the emotional content of this message and respond with a JSON object.
Message: "${message}"

Return a json object with:
{
  "primary_emotion": one of "joy|sadness|anger|anxiety|love|neutral",
  "intensity": a number between 0.1 and 1.0,
  "needs": one of "validation|comfort|celebration|reassurance|connection|engagement"
}`;
    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 100,
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0]?.message?.content || '{}');
    } catch (error) {
      console.error('Emotion detection error:', error);
      return null;
    }
  }
}

export const openAIService = new OpenAIService();
