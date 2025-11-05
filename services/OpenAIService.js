import OpenAI from 'openai';
import { config } from '../config.js';
import { ASTRONOW_PERSONALITY } from '../utils/constants.js';

export class OpenAIService {
  constructor() {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  async generateResponse(prompt, userMessage) {
    try {
      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userMessage }
        ],
        temperature: config.openai.temperature,
        max_tokens: config.openai.maxTokens,
      });

      return response.choices[0]?.message?.content?.trim() || 
        "The stars are listening...";
    } catch (error) {
      console.error('OpenAI error:', error);
      throw error;
    }
  }

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