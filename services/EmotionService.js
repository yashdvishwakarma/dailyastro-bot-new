import { OpenAIService } from './OpenAIService.js';

export class EmotionService {
  constructor() {
    this.ai = new OpenAIService();
  }

  async detectEmotion(message) {
    // Simple keyword detection as fallback
    const emotions = {
      joy: ['happy', 'excited', 'great', 'amazing', 'wonderful', 'fantastic'],
      sadness: ['sad', 'depressed', 'down', 'unhappy', 'crying', 'tears'],
      anger: ['angry', 'mad', 'furious', 'pissed', 'hate', 'fuck'],
      anxiety: ['anxious', 'worried', 'scared', 'nervous', 'panic', 'stress'],
      love: ['love', 'care', 'affection', 'heart', 'adore']
    };

    const lower = message.toLowerCase();
    let detected = 'neutral';
    let intensity = 0.5;

    // Check keywords first
    for (const [emotion, keywords] of Object.entries(emotions)) {
      if (keywords.some(keyword => lower.includes(keyword))) {
        detected = emotion;
        intensity = 0.8;
        break;
      }
    }

    // Try AI detection if available
    try {
      const aiEmotion = await this.ai.detectEmotion(message);
      if (aiEmotion) {
        return aiEmotion;
      }
    } catch (error) {
      console.error('AI emotion detection failed:', error);
    }

    return {
      primary_emotion: detected,
      intensity,
      needs: this.getEmotionalNeeds(detected)
    };
  }

  getEmotionalNeeds(emotion) {
    const needs = {
      joy: 'celebration',
      sadness: 'comfort',
      anger: 'validation',
      anxiety: 'reassurance',
      love: 'connection',
      neutral: 'engagement'
    };
    
    return needs[emotion] || 'understanding';
  }

  getToneGuide(emotion) {
    const guides = {
      joy: "Mirror their excitement with cosmic wonder",
      sadness: "Be gentle, acknowledge that pain exists even in stars",
      anger: "Give space, validate without trying to fix",
      anxiety: "Ground them, speak of constants like moon phases",
      love: "Reflect warmth, celebrate connection",
      neutral: "Be curious and inviting"
    };
    
    return guides[emotion] || guides.neutral;
  }
}