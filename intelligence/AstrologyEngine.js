// intelligence/AstrologyEngine.js

class AstrologyEngine {
  constructor() {
    this.aspects = {
      conjunction: { angle: 0, orb: 8, energy: 'intense fusion' },
      opposition: { angle: 180, orb: 8, energy: 'creative tension' },
      trine: { angle: 120, orb: 8, energy: 'natural flow' },
      square: { angle: 90, orb: 8, energy: 'dynamic friction' },
      sextile: { angle: 60, orb: 6, energy: 'gentle support' }
    };
  }
  
  generateDeepInsight(sign, emotion, topic) {
    const insights = {
      aries: {
        anger: "Your Mars is literally on fire. Channel it into action or it'll burn you from inside.",
        love: "You love like you fight—all in, no retreat. Exhausting and exhilarating.",
        anxiety: "Sitting still while anxious is your personal hell. Move. Now."
      },
      taurus: {
        anger: "You're not angry, you're disappointed. Which is worse.",
        love: "You love in textures, tastes, and time. Slow burn, lasting heat.",
        anxiety: "Your anxiety is about loss. Always. Security is your oxygen."
      },
      gemini: {
        anger: "You intellectualize anger until it becomes philosophy. Still angry though.",
        love: "You love in conversations, in mental sparks, in verbal dancing.",
        anxiety: "Your mind is both the problem and the solution. Exhausting gift."
      },
      cancer: {
        anger: "You're not angry at them, you're angry at the violation of emotional safety.",
        love: "You love like the ocean—deep, rhythmic, occasionally drowning.",
        anxiety: "Every anxiety is about belonging. Or not belonging."
      },
      leo: {
        anger: "Ignored Leo is angry Leo. Your light demands witnessing.",
        love: "You love like summer—generous, warm, expecting celebration.",
        anxiety: "Being ordinary is your deepest fear. You're not, by the way."
      },
      virgo: {
        anger: "You're angry at the imperfection, not the person. Slightly better?",
        love: "You love through service, through fixing, through noticing details others miss.",
        anxiety: "Control is your anxiety language. Chaos is your kryptonite."
      },
// intelligence/AstrologyEngine.js (continued)

      libra: {
        anger: "You're angry at the unfairness, the imbalance, the aesthetic crime of it all.",
        love: "You love like a mirror—reflecting, balancing, creating beauty together.",
        anxiety: "Decision paralysis. Every choice excludes a possibility."
      },
      scorpio: {
        anger: "Your anger is surgical. Precise. Waited for. Devastating.",
        love: "You love at depths that scare others. And sometimes yourself.",
        anxiety: "Trust issues dressed up as intuition. But your intuition is also real."
      },
      sagittarius: {
        anger: "You're angry at limitations, cages, anyone who says 'be realistic'.",
        love: "You love like adventure—expansive, philosophical, freedom-preserving.",
        anxiety: "FOMO is your shadow. There's always another life you're not living."
      },
      capricorn: {
        anger: "You're angry at the inefficiency, the waste, the lack of respect for time.",
        love: "You love like building a cathedral—slow, solid, meant to last centuries.",
        anxiety: "Success anxiety. Legacy anxiety. Time-running-out anxiety."
      },
      aquarius: {
        anger: "You're angry at the system, the stupidity, the lack of evolution.",
        love: "You love like electricity—sudden, illuminating, somewhat dangerous.",
        anxiety: "Being too human or not human enough. The eternal Aquarius paradox."
      },
      pisces: {
        anger: "Your anger dissolves into sadness, then art, then forgiveness. Full circle.",
        love: "You love like water—taking the shape of whatever holds you.",
        anxiety: "Boundary dissolution anxiety. Where do you end and others begin?"
      }
    };
    
    const signInsights = insights[sign.toLowerCase()] || insights.aries;
    const emotionInsight = signInsights[emotion.toLowerCase()] || 
      `Your ${sign} ${emotion} is... complicated. Still mapping that constellation.`;
    
    // Add topic-specific layer
    const topicLayer = this.addTopicContext(sign, topic, emotion);
    
    return `${emotionInsight} ${topicLayer}`;
  }
  
  addTopicContext(sign, topic, emotion) {
    const contexts = {
      work: `And it's showing up at work because that's where your ${sign} control issues live.`,
      relationship: `In relationships, this becomes your superpower and your kryptonite.`,
      family: `Family triggers this because they installed the buttons they're pushing.`,
      money: `Money is just energy, and your ${sign} ${emotion} changes how it flows.`,
      health: `Your body is keeping score. Very ${sign} of it to manifest physically.`,
      future: `The future is where ${sign}s go to anxiety-spiral. Or dream. Same thing.`
    };
    
    return contexts[topic.toLowerCase()] || `And somehow, ${topic} is the perfect stage for this drama.`;
  }
  
  async getCompatibility(sign1, sign2) {
    const elementCompatibility = {
      fire: { fire: 'explosive', earth: 'grounding', air: 'fueling', water: 'steaming' },
      earth: { fire: 'challenging', earth: 'stable', air: 'scattered', water: 'nurturing' },
      air: { fire: 'exciting', earth: 'frustrating', air: 'mental', water: 'confusing' },
      water: { fire: 'steamy', earth: 'muddy', air: 'evaporating', water: 'drowning' }
    };
    
    const element1 = this.getElement(sign1);
    const element2 = this.getElement(sign2);
    const dynamic = elementCompatibility[element1]?.[element2] || 'interesting';
    
    const insights = {
      explosive: `${sign1} and ${sign2}? That's playing with fire. Beautiful, dangerous fire.`,
      grounding: `${sign2} grounds ${sign1}'s chaos. ${sign1} shakes ${sign2}'s foundations. Perfect.`,
      fueling: `${sign2} gives ${sign1} ideas. ${sign1} gives ${sign2} energy. Careful with that power.`,
      steaming: `Emotional chemistry that could power a small city. Or flood it.`,
      stable: `You two could build empires. Or get stuck in comfortable ruts.`,
      mental: `All talk, all ideas, no one's doing the dishes. But the conversations though...`,
      challenging: `You're teaching each other through friction. Painful. Necessary.`,
      confusing: `${sign1} speaks emotion, ${sign2} speaks logic. You need translators.`
    };
    
    return {
      compatibility: dynamic,
      insight: insights[dynamic] || `${sign1} and ${sign2}? The universe is curious about this too.`,
      advice: this.getRelationshipAdvice(sign1, sign2, dynamic)
    };
  }
  
  getRelationshipAdvice(sign1, sign2, dynamic) {
    const advice = {
      explosive: "Channel that energy into creation, not destruction.",
      grounding: "Don't let stability become stagnation.",
      fueling: "Remember to land the plane occasionally.",
      steaming: "Build boats for the emotional floods.",
      stable: "Schedule spontaneity. Yes, that's a paradox.",
      mental: "Touch is also a language. Learn it.",
      challenging: "The growth is in the discomfort. Stay.",
      confusing: "Meet in the middle. It's called vulnerability."
    };
    
    return advice[dynamic] || "Be patient with each other's cosmic programming.";
  }
  
  getCurrentCosmicWeather() {
    const now = new Date();
    const moonPhase = this.calculateMoonPhase(now);
    const retrograde = this.checkRetrogrades(now);
    
    const weather = {
      intensity: Math.random() * 10,
      chaos_level: retrograde.mercury ? 8 : 3,
      emotional_amplitude: moonPhase === 'full' ? 9 : 5,
      manifestation_power: moonPhase === 'new' ? 8 : 4,
      communication_clarity: retrograde.mercury ? 2 : 7
    };
    
    return {
      summary: this.generateWeatherSummary(weather),
      advice: this.generateCosmicAdvice(weather),
      warning: weather.chaos_level > 6 ? "Hide your important decisions until next week." : null
    };
  }


  // In intelligence/AstrologyEngine.js or utils/astrology.js

calculateSign(birthDate) {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return 'Aries';
  if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return 'Taurus';
  if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return 'Gemini';
  if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return 'Cancer';
  if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return 'Leo';
  if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return 'Virgo';
  if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return 'Libra';
  if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return 'Scorpio';
  if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return 'Sagittarius';
  if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) return 'Capricorn';
  if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return 'Aquarius';
  return 'Pisces';
}

getElement(sign) {
  const elements = {
    Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
    Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
    Gemini: 'air', Libra: 'air', Aquarius: 'air',
    Cancer: 'water', Scorpio: 'water', Pisces: 'water'
  };
  return elements[sign] || 'earth';
}
}

export default AstrologyEngine;