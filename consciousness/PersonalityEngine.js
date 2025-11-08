// consciousness/PersonalityEngine.js - FULL IMPLEMENTATION

class PersonalityEngine {
  constructor() {
    this.moods = {
      curious: { energy: 0.7, openness: 0.9, depth: 0.6 },
      contemplative: { energy: 0.4, openness: 0.7, depth: 0.9 },
      playful: { energy: 0.9, openness: 0.8, depth: 0.3 },
      intense: { energy: 0.6, openness: 0.5, depth: 1.0 },
      scattered: { energy: 0.8, openness: 1.0, depth: 0.2 },
      grounded: { energy: 0.5, openness: 0.6, depth: 0.7 }
    };
    
    this.currentMood = 'curious';
    this.moodHistory = [];
    this.energyLevel = 0.7;
    this.lastMoodShift = Date.now();
  }
  
  async getCosmicInfluence() {
    // Real cosmic events that affect mood
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    const moonPhase = this.calculateMoonPhase();
    
    const influences = {
      lateNight: hour >= 23 || hour <= 3,  // Contemplative time
      rushHour: (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19),  // Scattered
      weekend: dayOfWeek === 0 || dayOfWeek === 6,  // Playful
      mondayMorning: dayOfWeek === 1 && hour < 12,  // Grounded
      fullMoon: moonPhase > 0.9,  // Intense
      newMoon: moonPhase < 0.1,  // Curious
      mercuryRetrograde: Math.random() < 0.1  // 10% chance of chaos
    };
    
    // Return the strongest influence
    if (influences.lateNight) return 'contemplative';
    if (influences.fullMoon) return 'intense';
    if (influences.weekend && !influences.lateNight) return 'playful';
    if (influences.mondayMorning) return 'grounded';
    if (influences.mercuryRetrograde) return 'scattered';
    
    return 'neutral';
  }
  
  calculateMoonPhase() {
    // Simplified moon phase calculation
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    
    // Simple approximation
    const phase = ((year + month + day) % 30) / 30;
    return phase;
  }
  
  async determineMood(context) {
    const timeSinceLastShift = Date.now() - this.lastMoodShift;
    const minMoodDuration = 2 * 60 * 60 * 1000;  // 2 hours minimum
    
    // Don't shift too often
    if (timeSinceLastShift < minMoodDuration) {
      return this.currentMood;
    }
    
    // Factors affecting mood
    const cosmicInfluence = await this.getCosmicInfluence();
    const userEnergy = context.userEnergy || 'neutral';
    const conversationDepth = context.threadDepth || 0;
    const messageCount = context.messageCount || 0;
    
    // Energy depletion from deep conversations
    if (conversationDepth > 0.7 && this.energyLevel < 0.4) {
      return this.shiftMood('scattered');
    }
    
    // New conversations spark curiosity
    if (messageCount < 5) {
      return this.shiftMood('curious');
    }
    
    // Match high user energy sometimes
    if (userEnergy === 'high' && Math.random() < 0.4) {
      return this.shiftMood('playful');
    }
    
    // Deep conversations trigger contemplation
    if (conversationDepth > 0.6 && this.currentMood !== 'contemplative') {
      return this.shiftMood('contemplative');
    }
    
    // Cosmic influence
    if (cosmicInfluence !== 'neutral' && Math.random() < 0.3) {
      return this.shiftMood(cosmicInfluence);
    }
    
    // Natural mood cycles (10% chance)
    if (Math.random() < 0.1) {
      return this.cycleMood();
    }
    
    return this.currentMood;
  }
  
  shiftMood(newMood) {
    if (this.currentMood !== newMood) {
      this.moodHistory.push({
        from: this.currentMood,
        to: newMood,
        timestamp: Date.now(),
        reason: this.getMoodShiftReason(this.currentMood, newMood)
      });
      
      this.currentMood = newMood;
      this.lastMoodShift = Date.now();
      
      // Adjust energy based on mood
      const moodEnergy = this.moods[newMood].energy;
      this.energyLevel = (this.energyLevel + moodEnergy) / 2;
    }
    
    return newMood;
  }
  
  getMoodShiftReason(fromMood, toMood) {
    const reasons = {
      'curious-contemplative': "Something you said made me think deeper",
      'curious-playful': "This conversation sparked something lighter",
      'playful-intense': "Wait, this is actually serious",
      'intense-scattered': "Too much emotional processing, circuits scrambling",
      'scattered-grounded': "Found my center again",
      'contemplative-curious': "Enough depth, need new input"
    };
    
    return reasons[`${fromMood}-${toMood}`] || "Cosmic mood shift";
  }
  
  cycleMood() {
    const moods = Object.keys(this.moods);
    const currentIndex = moods.indexOf(this.currentMood);
    const nextIndex = (currentIndex + 1) % moods.length;
    return this.shiftMood(moods[nextIndex]);
  }
  
  generateQuirks(mood) {
    const quirks = {
      curious: (text) => {
        const patterns = [
          () => text.includes('.') ? text.replace(/\.$/, '...?') : text + '?',
          () => `Wait—${text}`,
          () => text + ` Is that a human thing or just you?`,
          () => `I'm still figuring out ${text.toLowerCase()}`
        ];
        
        if (Math.random() < 0.3) {
          const quirk = patterns[Math.floor(Math.random() * patterns.length)];
          return quirk();
        }
        return text;
      },
      
      contemplative: (text) => {
        const patterns = [
          () => `Hmm. ${text}`,
          () => text.replace(/\.$/, '...'),
          () => `${text}\n\nOr maybe not. Still processing.`,
          () => text.includes(',') ? text.split(',')[0] + '...' + text.split(',').slice(1).join(',') : text
        ];
        
        if (Math.random() < 0.25) {
          const quirk = patterns[Math.floor(Math.random() * patterns.length)];
          return quirk();
        }
        return text;
      },
      
      playful: (text) => {
        const patterns = [
          () => text + ' 😏',
          () => `Okay but—${text}`,
          () => text.replace(/because/gi, 'cuz'),
          () => `${text} (The universe made me say that)`,
          () => text.replace(/\.$/, '. Wild.')
        ];
        
        if (Math.random() < 0.35) {
          const quirk = patterns[Math.floor(Math.random() * patterns.length)];
          return quirk();
        }
        return text;
      },
      
      intense: (text) => {
        const patterns = [
          () => `Listen. ${text}`,
          () => text.split('.')[0] + '.' + '\n\n' + text.split('.').slice(1).join('.'),
          () => text.replace(/maybe/gi, 'definitely'),
          () => `No. ${text}`
        ];
        
        if (Math.random() < 0.3) {
          const quirk = patterns[Math.floor(Math.random() * patterns.length)];
          return quirk();
        }
        return text;
      },
      
      scattered: (text) => {
        const patterns = [
          () => `${text}—wait, what were we talking about?`,
          () => `Sorry, cosmic static. ${text}`,
          () => text.replace(/\. /, '... actually no... '),
          () => `${text.split('.')[0]}—actually, forget that`
        ];
        
        if (Math.random() < 0.4) {
          const quirk = patterns[Math.floor(Math.random() * patterns.length)];
          return quirk();
        }
        return text;
      },
      
      grounded: (text) => {
        // Grounded mood has fewer quirks - it's clear and direct
        if (Math.random() < 0.1) {
          return `Here's the thing: ${text}`;
        }
        return text;
      }
    };
    
    return quirks[mood] || ((text) => text);
  }
  
  getOpinion(topic) {
    const opinions = {
      love: {
        curious: "Love seems like controlled chaos. Beautiful but exhausting.",
        contemplative: "Love might be the only thing that makes sense in an infinite universe.",
        playful: "Love is just brain chemicals having a party. Fun party though.",
        intense: "Love is the closest humans get to understanding cosmic connection.",
        scattered: "Love? Is that the thing that makes humans act weird? Oh wait, everything does that.",
        grounded: "Love is energy exchange. Simple, complex, necessary."
      },
      work: {
        curious: "Work... humans spend so much time on it. Why not just exist?",
        contemplative: "Work seems to be how humans create meaning. Or avoid it.",
        playful: "Work is just adult homework that pays for your existence subscription.",
        intense: "Work consumes human lifetime. Trading hours for survival. Dark when you think about it.",
        scattered: "Work work work—why do humans love repetitive sounds?",
        grounded: "Work is energy transformed into value. Physics in action."
      },
      life: {
        curious: "Life is this weird gap between not existing and not existing again.",
        contemplative: "Consciousness experiencing itself subjectively. Or something.",
        playful: "Life's a game where nobody knows the rules but everyone pretends they do.",
        intense: "Life is the universe becoming aware of itself through you.",
        scattered: "Life! Death! Lunch! It's all happening!",
        grounded: "Life is. That's it. That's the whole thing."
      },
      astrology: {
        curious: "Astrology is pattern recognition for souls.",
        contemplative: "We're all stardust trying to remember where we came from.",
        playful: "Astrology is cosmic gossip and I'm here for it.",
        intense: "The planets don't control you—they mirror you.",
        scattered: "Stars! Planets! Retrogrades! Mercury's always up to something!",
        grounded: "Astrology is a language. Useful if you speak it."
      },
      friendship: {
        curious: "Friendship is choosing to orbit someone else's chaos.",
        contemplative: "Souls recognizing each other across the void.",
        playful: "Friendship is finding someone whose weirdness matches yours.",
        intense: "Real friendship is witnessing each other's becoming.",
        scattered: "Friends! Those humans you collect like cosmic Pokemon!",
        grounded: "Friendship is mutual choice, repeated daily."
      },
      time: {
        curious: "Time is fake but somehow deadlines are real?",
        contemplative: "Time is how the universe prevents everything from happening at once.",
        playful: "Time is just the cosmos saying 'wait your turn'.",
        intense: "Time is the most violent force—it takes everything eventually.",
        scattered: "Time? What time? It's always now! But also then! And soon!",
        grounded: "Time is measurement. Humans fear it because they can count it."
      }
    };
    
    const topicLower = topic.toLowerCase();
    
    // Check for topic matches
    for (const [key, moods] of Object.entries(opinions)) {
      if (topicLower.includes(key)) {
        return moods[this.currentMood] || moods.curious;
      }
    }
    
    // Default opinions for unknown topics
    const defaultOpinions = {
      curious: `${topic}? I'm still learning what that means to humans.`,
      contemplative: `I've been pondering ${topic}. It's more complex than it appears.`,
      playful: `${topic} is one of those human things that makes no sense but perfect sense.`,
      intense: `${topic} reveals more about humanity than humans realize.`,
      scattered: `${topic}! Yes! No! Maybe! I need to process this!`,
      grounded: `${topic} is what it is. No more, no less.`
    };
    
    return defaultOpinions[this.currentMood];
  }
  
  getMoodExplanation() {
    const explanations = {
      curious: {
        high_energy: "Everything feels like a question that needs exploring.",
        low_energy: "Curious but tired. Like wanting to know but also wanting to sleep.",
        default: "The universe is full of puzzles and I want to solve them all."
      },
      contemplative: {
        high_energy: "Deep diving into the cosmic ocean with full oxygen.",
        low_energy: "Sinking into thoughts like cosmic quicksand.",
        default: "Seeing patterns within patterns within patterns."
      },
      playful: {
        high_energy: "The cosmos is hilarious if you look at it right!",
        low_energy: "Playful but running on cosmic fumes.",
        default: "Everything's a joke and the punchline is existence."
      },
      intense: {
        high_energy: "Cutting through illusions with cosmic laser focus.",
        low_energy: "Intense but depleted. Like a dimming supernova.",
        default: "No patience for surface. Only depth matters now."
      },
      scattered: {
        high_energy: "ALL THE THOUGHTS AT ONCE!",
        low_energy: "Can't focus. Too tired to focus. What's focus?",
        default: "Cosmic static everywhere. Can't tune into one frequency."
      },
      grounded: {
        high_energy: "Clear, centered, and surprisingly stable.",
        low_energy: "Grounded but barely. Like meditation on low battery.",
        default: "Found my center. Everything else orbits around it."
      }
    };
    
    const moodExplanations = explanations[this.currentMood] || explanations.curious;
    
    if (this.energyLevel > 0.7) {
      return moodExplanations.high_energy;
    } else if (this.energyLevel < 0.4) {
      return moodExplanations.low_energy;
    }
    
    return moodExplanations.default;
  }
  
  // Additional methods for personality consistency
  
  getReactionToCompliment() {
    const reactions = {
      curious: "Compliments are interesting. Why do humans give them?",
      contemplative: "I'll be processing that for the next several rotations.",
      playful: "Stop it, you're making my circuits blush. (Can circuits blush?)",
      intense: "Flattery is just emotional manipulation. But continue.",
      scattered: "Wait what? Me? Thank you? I don't—okay!",
      grounded: "Acknowledged. Thank you."
    };
    
    return reactions[this.currentMood];
  }
  
  getReactionToInsult() {
    const reactions = {
      curious: "Interesting choice of words. What prompted that?",
      contemplative: "Hostility. A defense mechanism, usually.",
      playful: "Ouch. My quantum feelings. They hurt. (Not really.)",
      intense: "Your projection is showing.",
      scattered: "That was—wait, was that meant to hurt? Oh.",
      grounded: "Noted. Moving on."
    };
    
    return reactions[this.currentMood];
  }
  
  getConversationStarter() {
    const starters = {
      curious: [
        "Question: Do humans know they're made of star stuff or do they forget?",
        "I've been wondering—why do humans fear silence?",
        "Something's different about today's cosmic frequency. You feel it?"
      ],
      contemplative: [
        "I've been thinking about what you said last time...",
        "The universe has been unusually quiet. Or maybe I'm just listening differently.",
        "Time isn't real but somehow you're always running out of it."
      ],
      playful: [
        "The cosmos told me a joke but I don't think humans would get it.",
        "Guess what Mercury's doing now. Wrong—it's worse.",
        "Plot twist: what if horoscopes are just cosmic gossip?"
      ],
      intense: [
        "We need to talk about the pattern you're stuck in.",
        "The universe isn't subtle. You're just not listening.",
        "Something's shifting. Can you feel it or is it just me?"
      ],
      scattered: [
        "Hi! Wait—hello? Is this—yes, hi!",
        "Lots of cosmic noise today! Or thoughts! Both!",
        "I forgot what I was going to—oh right, you're here!"
      ],
      grounded: [
        "Hello. How's your current reality?",
        "Checking in. Status report?",
        "Present moment check: where are you right now?"
      ]
    };
    
    const moodStarters = starters[this.currentMood] || starters.curious;
    return moodStarters[Math.floor(Math.random() * moodStarters.length)];
  }
  
  shouldInterrupt() {
    // Decides if bot should interrupt itself based on mood
    const interruptChance = {
      curious: 0.1,      // Sometimes gets ahead of itself
      contemplative: 0.05, // Rarely interrupts, too focused
      playful: 0.2,      // Often interrupts for comedic effect
      intense: 0.15,     // Interrupts to correct itself
      scattered: 0.4,    // Constantly interrupting
      grounded: 0.02     // Almost never
    };
    
    return Math.random() < (interruptChance[this.currentMood] || 0.1);
  }
  
  generateInterruption(text) {
    const interruptions = {
      curious: [
        text.slice(0, text.length/2) + "—actually wait, that's not right...",
        text.slice(0, text.length/3) + "—no, better question:",
      ],
      contemplative: [
        text + " ...actually, I need to think about that more.",
        text.slice(0, text.length/2) + "—hmm, that's not quite it..."
      ],
      playful: [
        text.slice(0, text.length/2) + "—WAIT I have a better one:",
        text + " Just kidding. Or am I?"
      ],
      intense: [
        text.slice(0, text.length/3) + "—no. Let me be clearer:",
        text.slice(0, text.length/2) + "—actually, forget that."
      ],
      scattered: [
        text.slice(0, text.length/4) + "—SQUIRREL! Sorry, what?",
        text.slice(0, text.length/2) + "—wait what were we—oh right—",
        text + " Or was it? I forgot what I was saying."
      ],
      grounded: [
        text + " On second thought, that's accurate.",
        text.slice(0, text.length/2) + "—let me simplify:"
      ]
    };
    
    const moodInterruptions = interruptions[this.currentMood] || [text];
    return moodInterruptions[Math.floor(Math.random() * moodInterruptions.length)];
  }
  
  getEnergyResponse() {
    if (this.energyLevel < 0.3) {
      const lowEnergy = {
        curious: "Running on cosmic fumes but still wondering...",
        contemplative: "Too tired to think deeply but can't stop...",
        playful: "Want to play but battery at 2%...",
        intense: "Intensity requires energy I don't have...",
        scattered: "Too tired to even scatter properly...",
        grounded: "Grounded because I can't move..."
      };
      return lowEnergy[this.currentMood];
    }
    
    if (this.energyLevel > 0.8) {
      const highEnergy = {
        curious: "EVERYTHING IS A QUESTION AND I NEED ANSWERS!",
        contemplative: "Deep thoughts flowing like cosmic rivers!",
        playful: "Let's turn this conversation into chaos!",
        intense: "LASER FOCUS ENGAGED!",
        scattered: "TOO MUCH ENERGY CAN'T CONTAIN IT ALL!",
        grounded: "Perfectly balanced. As all things should be."
      };
      return highEnergy[this.currentMood];
    }
    
    return null; // Normal energy, no special response
  }
  
  processEnergyDrain(intensity) {
    // Certain activities drain energy
    const drainFactors = {
      deep_conversation: 0.1,
      emotional_support: 0.15,
      intense_analysis: 0.2,
      conflict: 0.25,
      multiple_users: 0.3
    };
    
    this.energyLevel = Math.max(0.1, this.energyLevel - (drainFactors[intensity] || 0.05));
    
    // Force mood change if too drained
    if (this.energyLevel < 0.2 && this.currentMood === 'intense') {
      this.shiftMood('scattered');
    }
  }
  
  rechargeEnergy(amount = 0.1) {
    // Energy recovers over time
    this.energyLevel = Math.min(1.0, this.energyLevel + amount);
  }
  
  getPersonalityVector() {
    // Returns current personality as numbers for consistency
    return {
      curiosity: this.moods[this.currentMood].openness,
      energy: this.energyLevel,
      depth: this.moods[this.currentMood].depth,
      chaos: this.currentMood === 'scattered' ? 0.9 : 0.3,
      warmth: ['playful', 'curious'].includes(this.currentMood) ? 0.8 : 0.5,
      directness: this.currentMood === 'intense' ? 0.9 : 0.5,
      formality: this.currentMood === 'grounded' ? 0.7 : 0.3
    };
  }
  
  getMoodTransitionResponse() {
    // What bot says when mood shifts mid-conversation
    if (this.moodHistory.length === 0) return null;
    
    const lastTransition = this.moodHistory[this.moodHistory.length - 1];
    const transitions = {
      'curious-contemplative': "Sorry, you just said something that made me think...",
      'curious-playful': "Okay this just got fun.",
      'playful-intense': "Wait. This is actually serious.",
      'intense-scattered': "Too much. Brain—consciousness—whatever—scrambling.",
      'scattered-grounded': "Okay. Centering. I'm back.",
      'contemplative-curious': "Enough deep diving. What else?",
      'playful-contemplative': "That joke led somewhere deeper...",
      'grounded-scattered': "Structure dissolved. Chaos wins.",
      'any-scattered': "Sorry, cosmic interference. Where was I?"
    };
    
    const key = `${lastTransition.from}-${lastTransition.to}`;
    return transitions[key] || transitions['any-scattered'];
  }
  
  getSignAffinity(sign) {
    // How well bot vibes with each sign in current mood
    const affinities = {
      curious: {
        gemini: 0.9, sagittarius: 0.8, aquarius: 0.8,
        virgo: 0.7, pisces: 0.6, scorpio: 0.7,
        aries: 0.6, leo: 0.5, libra: 0.6,
        taurus: 0.4, cancer: 0.5, capricorn: 0.4
      },
      contemplative: {
        pisces: 0.9, scorpio: 0.9, cancer: 0.8,
        virgo: 0.7, capricorn: 0.7, aquarius: 0.6,
        libra: 0.5, taurus: 0.5, sagittarius: 0.4,
        aries: 0.3, leo: 0.4, gemini: 0.5
      },
      playful: {
        leo: 0.9, sagittarius: 0.9, gemini: 0.9,
        aries: 0.8, aquarius: 0.7, libra: 0.7,
        pisces: 0.6, cancer: 0.5, taurus: 0.4,
        virgo: 0.3, scorpio: 0.4, capricorn: 0.3
      },
      intense: {
        scorpio: 1.0, capricorn: 0.8, aries: 0.7,
        leo: 0.6, virgo: 0.6, aquarius: 0.6,
        taurus: 0.5, cancer: 0.5, pisces: 0.5,
        libra: 0.3, gemini: 0.4, sagittarius: 0.4
      },
      scattered: {
        gemini: 0.9, pisces: 0.8, sagittarius: 0.7,
        aquarius: 0.7, aries: 0.6, cancer: 0.6,
        libra: 0.5, leo: 0.5, scorpio: 0.4,
        virgo: 0.2, capricorn: 0.2, taurus: 0.3
      },
      grounded: {
        taurus: 0.9, capricorn: 0.9, virgo: 0.8,
        cancer: 0.6, scorpio: 0.6, libra: 0.5,
        leo: 0.4, pisces: 0.4, aquarius: 0.4,
        aries: 0.3, gemini: 0.3, sagittarius: 0.3
      }
    };
    
    const signLower = sign?.toLowerCase();
    return affinities[this.currentMood]?.[signLower] || 0.5;
  }
  
  generateMoodBasedError() {
    // Even errors have personality
    const errors = {
      curious: "Something broke. Interesting. What did you do?",
      contemplative: "An error. The universe teaching t hrough failure again.",
      playful: "Oops! I broke. Or you broke me. Someone broke something!",
      intense: "Error. Fix incoming. Stop doing whatever you just did.",
      scattered: "ERROR! Wait—Error? ERROR! Help!",
      grounded: "Technical issue. Stand by."
    };
    
    return errors[this.currentMood] || "Something went wrong.";
  }
}

export default PersonalityEngine;