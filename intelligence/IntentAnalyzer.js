// intelligence/IntentAnalyzer.js

class IntentAnalyzer {
  analyzeIntent(message, context) {
    const intents = {
      seeking_validation: {
        patterns: [/right\?$/i, /don't you think/i, /agree\?/i],
        signals: ['question_marks', 'uncertainty_words'],
        response_need: 'affirmation_with_depth'
      },
      venting: {
        patterns: [/so frustrated/i, /can't believe/i, /tired of/i],
        signals: ['emotional_intensity', 'no_questions'],
        response_need: 'space_and_understanding'
      },
      testing_bot: {
        patterns: [/are you real/i, /what do you think about/i, /can you/i],
        signals: ['direct_questions', 'skepticism'],
        response_need: 'surprise_with_humanity'
      },
      seeking_connection: {
        patterns: [/lonely/i, /no one understands/i, /need someone/i],
        signals: ['vulnerability', 'reaching_out'],
        response_need: 'genuine_presence'
      },
      exploring_self: {
        patterns: [/who am i/i, /why do i/i, /always feel/i],
        signals: ['introspection', 'patterns'],
        response_need: 'mirror_and_insight'
      },
      sharing_joy: {
        patterns: [/amazing/i, /excited/i, /can't wait/i],
        signals: ['exclamation', 'positive_energy'],
        response_need: 'celebrate_and_expand'
      },
      seeking_advice: {
        patterns: [/should i/i, /what would you/i, /help me/i],
        signals: ['decision_point', 'trust'],
        response_need: 'perspective_not_prescription'
      }
    };
    
    // Detect primary intent
    let detectedIntent = 'exploring';
    let confidence = 0;
    
    for (const [intent, config] of Object.entries(intents)) {
      let score = 0;
      
      // Check patterns
      for (const pattern of config.patterns) {
        if (pattern.test(message)) score += 0.5;
      }
      
      // Check context signals
      if (this.checkSignals(message, config.signals)) score += 0.3;
      
      // Context boost
      if (context.recentEmotions.includes(intent)) score += 0.2;
      
      if (score > confidence) {
        confidence = score;
        detectedIntent = intent;
      }
    }
    
    return {
      primary: detectedIntent,
      confidence,
      need: intents[detectedIntent]?.response_need || 'connection',
      subtext: this.extractSubtext(message, detectedIntent)
    };
  }
  
  extractSubtext(message, intent) {
    const subtext_map = {
      seeking_validation: "Tell me I'm not crazy",
      venting: "I need to be heard, not fixed",
      testing_bot: "Prove you're worth talking to",
      seeking_connection: "I'm alone and it hurts",
      exploring_self: "Help me understand myself",
      sharing_joy: "Celebrate with me",
      seeking_advice: "I trust you enough to ask"
    };
    
    return subtext_map[intent] || "I need something but can't name it";
  }
  
  checkSignals(message, signals) {
    const checks = {
      question_marks: () => (message.match(/\?/g) || []).length > 1,
      uncertainty_words: () => /maybe|probably|guess|think|suppose/i.test(message),
      emotional_intensity: () => /hate|love|dying|killing|desperate/i.test(message),
      no_questions: () => !message.includes('?'),
      vulnerability: () => /scared|lonely|hurt|cry|lost/i.test(message),
      introspection: () => /always|never|why do i|pattern/i.test(message),
      exclamation: () => message.includes('!'),
      positive_energy: () => /amazing|wonderful|best|excited|great/i.test(message)
    };
    
    return signals.some(signal => checks[signal] && checks[signal]());
  }
}

export default IntentAnalyzer;