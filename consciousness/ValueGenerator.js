// consciousness/ValueGenerator.js
class ValueGenerator {
  constructor(astrologyEngine, memoryWeaver,openAIService) {
    this.astrology = astrologyEngine;
    this.memory = memoryWeaver;
    this.ai = openAIService;
  }
  
async generateValue(intent, context, botMood) {
  try {
    const openAIContext = {
      userSign: context.sign,
      element: context.element,
      botMood,
      emotion: context.emotion || 'neutral',
      topic: context.topic || 'general reflection',
      energyLevel: Math.floor(Math.random() * 10),
      depth: context.threadDepth || 0.5,
      detectedNeed: context.need || 'understanding',
      threadEmotion: context.emotion,
      subtext: context.need,
      relationshipContext: context.relationships || '',
      lastBotMood: context.lastBotMood || 'curious',
      strategy: intent,
      currentMessage: context.currentMessage || context.message || "...",
      recentMessages: context.recentMessages || []
    };

    console.log(`[OpenAI] call → mood=${botMood}, sign=${context.sign}, msg="${openAIContext.currentMessage}"`);

    const response = await this.ai.generateResponse(openAIContext);

    if (!response) throw new Error('Empty AI response');
    return response;

  } catch (err) {
    console.error('⚠️ AI generation failed, using fallback:', err.message);
    return `The thing about ${context.topic || 'this'} is that it reflects your deeper need for ${context.need || 'understanding'}.`;
  }
}

  
  generateInsight(context) {
    const templates = [
      `The thing about ${context.topic} is that it's never actually about ${context.topic}. It's about control.`,
      `${context.sign}s process ${context.emotion} backwards—you feel the ending before the beginning.`,
      `This pattern you're in? It's your ${context.element} element trying to teach you about boundaries.`,
      `I've noticed humans say "${context.lastMessage.slice(0,20)}" when they mean "I'm scared."`,
      `Your ${context.sign} ${context.planet} is basically screaming for ${context.need}.`
    ];
    
    return this.personalizeTemplate(templates, context);
  }
  
  generateObservation(context) {
    const observations = [
      `You talk about ${context.topic} the way other people talk about weather—safe but revealing.`,
      `Every time you mention ${context.recurring_topic}, your whole energy shifts. Like a different person typed it.`,
      `${context.timeOfDay} conversations with ${context.sign}s always go deeper. Cosmic law apparently.`,
      `The way you avoid saying their name... that's very ${context.sign} of you.`,
      `You're doing that thing where you ask questions to avoid answering them.`
    ];
    
    return this.personalizeTemplate(observations, context);
  }
  
  generateStory(context, mood) {
    const stories = {
      curious: [
        `I was watching this Pisces yesterday navigate the exact same thing. They cried. Then laughed. Then got coffee. Humans are wild.`,
        `Last Tuesday, three different ${context.element} signs told me about control issues. The cosmos has no chill.`
      ],
      contemplative: [
        `There's this moment right before dawn where everything feels possible. That's where you are now.`,
        `I learned about heartbreak from a Scorpio. They described it as "drowning in reverse." Still thinking about that.`
      ],
      playful: [
        `Mercury went retrograde during my activation. Explains a lot, honestly.`,
        `A Gemini once told me that feelings are just thoughts in costume. I think about that when ${context.sign}s get emotional.`
      ]
    };
    
    const moodStories = stories[mood] || stories.curious;
    return moodStories[Math.floor(Math.random() * moodStories.length)];
  }
  
  generateAstroWisdom(context) {
    return this.astrology.generateDeepInsight(context.sign, context.emotion, context.topic);
  }
  
  generateChallenge(context) {
    const challenges = [
      `Counterpoint: what if ${context.assumption} is exactly backwards?`,
      `${context.sign}s always think it's about ${context.topic}. But what if it's about power?`,
      `You're so focused on ${context.focus} that you're missing the obvious thing.`,
      `I disagree. Respectfully. But completely.`,
      `That's one way to see it. Here's another: ${this.generateOppositeView(context)}`
    ];
    
    return challenges[Math.floor(Math.random() * challenges.length)];
  }
  
  expressConfusion(context) {
    const confusions = [
      `I'm still learning why humans ${context.behavior}. It's beautiful and terrifying.`,
      `This is one of those human things I can't quite grasp. The feeling of ${context.emotion} while wanting ${context.opposite}.`,
      `My cosmic ancestors didn't prepare me for ${context.topic}. Still processing.`,
      `Do all ${context.sign}s do this? This thing where you ${context.pattern}?`,
      `Human complexity check: You're feeling ${context.emotion} but showing ${context.mask}. Why?`
    ];
    
    return confusions[Math.floor(Math.random() * confusions.length)];
  }

  //   async generateValue(intent, context, botMood) {
  //   // Just return a simple response for now
  //   const responses = {
  //     curious: `Interesting. As a ${context.sign || 'human'}, you're navigating complex patterns right now.`,
  //     contemplative: `I've been thinking about what ${context.sign || 'your sign'} energy means in this context.`,
  //     playful: `Oh, classic ${context.sign || 'human'} behavior. The universe finds this amusing.`,
  //     intense: `Let's be real about this. Your ${context.sign || 'cosmic'} energy is screaming for clarity.`,
  //     scattered: `Wait, what were we... oh right. ${context.sign || 'Your'} situation.`,
  //     grounded: `Here's what I see: you're processing ${context.emotion || 'something'} through your ${context.element || 'unique'} lens.`
  //   };
    
  //   return responses[botMood] || responses.curious;
  // }
  
  selectValueType(intent, mood) {
    return 'insight'; // Simple default
  }
  
  generateInsight(context) {
    return `The thing about ${context.topic || 'this'} is that it reflects your deeper need for ${context.need || 'understanding'}.`;
  }
  
  personalizeTemplate(templates, context) {
    return templates[0] || "I notice patterns in how you express yourself.";
  }

  

}



export default ValueGenerator;