// intelligence/SubtextReader.js

class SubtextReader {
  read(message, conversationHistory = []) {
    const surface = message.toLowerCase();
    const length = message.length;
    const punctuation = this.analyzePunctuation(message);
    const wordChoice = this.analyzeWordChoice(message);
    const context = this.analyzeContext(conversationHistory);
    
    // Map surface patterns to subtext
    const subtextPatterns = {
      shortResponse: {
        pattern: () => length < 10 && context.previousLength > 50,
        subtext: "I'm pulling away",
        emotion: "defensive",
        need: "space or understanding"
      },
      
      overExplanation: {
        pattern: () => length > 200 && (surface.includes('because') || surface.includes('just')),
        subtext: "I need you to believe me",
        emotion: "anxious",
        need: "validation"
      },
      
      deflectionHumor: {
        pattern: () => this.detectsHumorAfterSerious(message, context),
        subtext: "This is too heavy, I need to lighten it",
        emotion: "uncomfortable",
        need: "emotional regulation"
      },
      
      questionsOnly: {
        pattern: () => punctuation.questions > 2 && !surface.includes('i'),
        subtext: "I don't want to share about myself",
        emotion: "guarded",
        need: "control"
      },
      
      ellipses: {
        pattern: () => message.includes('...') || message.includes('..'),
        subtext: "There's more but I can't/won't say it",
        emotion: "hesitant",
        need: "permission to continue"
      },
      
      capsLock: {
        pattern: () => this.detectCapsRatio(message) > 0.3,
        subtext: "I need to be heard RIGHT NOW",
        emotion: "urgent",
        need: "immediate validation"
      },
      
      vagueLanguage: {
        pattern: () => this.detectVagueness(message) > 0.5,
        subtext: "I'm not ready to be specific",
        emotion: "processing",
        need: "gentle exploration"
      },
      
      contradiction: {
        pattern: () => this.detectsContradiction(message, context),
        subtext: "I don't know what I actually feel",
        emotion: "confused",
        need: "clarity"
      }
    };
    
    // Find matching patterns
    const detectedSubtext = [];
    for (const [key, pattern] of Object.entries(subtextPatterns)) {
      if (pattern.pattern()) {
        detectedSubtext.push(pattern);
      }
    }
    
    // Return primary subtext or default
    if (detectedSubtext.length > 0) {
      return {
        surface: message,
        subtext: detectedSubtext[0].subtext,
        emotion: detectedSubtext[0].emotion,
        need: detectedSubtext[0].need,
        confidence: detectedSubtext.length / Object.keys(subtextPatterns).length,
        allSubtext: detectedSubtext.map(s => s.subtext)
      };
    }
    
    return {
      surface: message,
      subtext: "Present and engaged",
      emotion: "neutral",
      need: "connection",
      confidence: 0.3
    };
  }
  
  analyzePunctuation(message) {
    return {
      questions: (message.match(/\?/g) || []).length,
      exclamations: (message.match(/!/g) || []).length,
      ellipses: (message.match(/\.\.\./g) || []).length,
      periods: (message.match(/\./g) || []).length
    };
  }
  
  analyzeWordChoice(message) {
    const intensifiers = /really|very|so|totally|completely|absolutely/gi;
    const hedging = /maybe|perhaps|might|could|probably|guess|think/gi;
    const absolutes = /always|never|every|all|none/gi;
    const emotional = /feel|felt|feeling|emotion|sense/gi;
    
    return {
      intensity: (message.match(intensifiers) || []).length,
      uncertainty: (message.match(hedging) || []).length,
      absolutes: (message.match(absolutes) || []).length,
      emotional: (message.match(emotional) || []).length
    };
  }
  
  detectsHumorAfterSerious(message, context) {
    const hasHumor = /haha|lol|😂|😅|jk|kidding/i.test(message);
    const previousWasSerious = context.lastEmotion === 'sad' || 
                              context.lastEmotion === 'anxious' ||
                              context.lastTopic === 'heavy';
    
    return hasHumor && previousWasSerious;
  }
  
  detectVagueness(message) {
    const vagueWords = /thing|stuff|whatever|something|somehow|somewhere/gi;
    const matches = (message.match(vagueWords) || []).length;
    const wordCount = message.split(' ').length;
    
    return matches / Math.max(wordCount, 1);
  }
  
  detectsContradiction(message, context) {
    if (!context.lastMessage) return false;
    
    const currentSentiment = this.quickSentiment(message);
    const previousSentiment = this.quickSentiment(context.lastMessage);
    
    return Math.abs(currentSentiment - previousSentiment) > 0.7;
  }
  
  quickSentiment(text) {
    const positive = /good|great|happy|love|excited|yes|sure|okay/gi;
    const negative = /bad|hate|sad|angry|no|not|never|tired/gi;
    
    const posCount = (text.match(positive) || []).length;
    const negCount = (text.match(negative) || []).length;
    
    if (posCount === 0 && negCount === 0) return 0.5;
    return posCount / (posCount + negCount);
  }

  analyzeContext(conversationHistory) {
  if (!conversationHistory || conversationHistory.length === 0) {
    return {
      previousLength: 50,
      lastEmotion: 'neutral',
      lastTopic: 'general',
      lastMessage: ''
    };
  }
  
  const lastMsg = conversationHistory[conversationHistory.length - 1];
  return {
    previousLength: lastMsg?.message?.length || 50,
    lastEmotion: lastMsg?.emotion_tone || 'neutral',
    lastTopic: 'general',
    lastMessage: lastMsg?.message || ''
  };
}


detectCapsRatio(message) {
  const caps = (message.match(/[A-Z]/g) || []).length;
  const total = (message.match(/[a-zA-Z]/g) || []).length;
  return total > 0 ? caps / total : 0;
}

detectVagueness(message) {
  const vagueWords = /thing|stuff|whatever|something|somehow|somewhere/gi;
  const matches = (message.match(vagueWords) || []).length;
  const wordCount = message.split(' ').length;
  return wordCount > 0 ? matches / wordCount : 0;
}

detectsContradiction(message, context) {
  return false; // Simplified for now
}

detectsHumorAfterSerious(message, context) {
  const hasHumor = /haha|lol|😂|😅|jk|kidding/i.test(message);
  return hasHumor && (context.lastEmotion === 'sad' || context.lastEmotion === 'anxious');
}

quickSentiment(text) {
  const positive = (text.match(/good|great|happy|yes/gi) || []).length;
  const negative = (text.match(/bad|sad|no|not/gi) || []).length;
  return positive > negative ? 0.8 : 0.2;
}

}

export default SubtextReader;