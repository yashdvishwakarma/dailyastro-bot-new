// consciousness/MemoryWeaver.js

class MemoryWeaver {
  constructor(db) {
    this.db = db;
    this.shortTermMemory = new Map();  // Current session
    this.workingMemory = [];           // Last 10 exchanges
    this.emotionalMemory = [];         // Emotional peaks
  }
  
  async getRelevantMemories(message, user) {
    // Get different types of memories
    const callbacks = await this.getCallbackMemories(user.chat_id);
    const emotional = await this.getEmotionalMemories(user.chat_id);
    const patterns = await this.getPatternMemories(user.chat_id);
    
    // Score relevance
    const scored = [...callbacks, ...emotional, ...patterns].map(memory => ({
      ...memory,
      relevance: this.scoreRelevance(memory, message)
    }));
    
    // Return top 3 most relevant
    return scored
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 3);
  }
  
  scoreRelevance(memory, currentMessage) {
    let score = 0;
    
    // Topic similarity
    if (this.topicSimilarity(memory.content, currentMessage) > 0.5) score += 0.3;
    
    // Emotional similarity
    if (memory.emotional_weight > 0.7) score += 0.2;
    
    // Time decay (older memories less relevant unless very important)
    const hoursSince = (Date.now() - memory.created_at) / 3600000;
    if (hoursSince < 24) score += 0.2;
    else if (memory.emotional_weight > 0.8) score += 0.1;
    
    // Unused memories get priority
    if (memory.recall_count === 0) score += 0.3;
    
    return score;
  }
  
  async process(userMessage, botResponse, analysis) {
    // Store if emotionally significant
    if (analysis.subtext.emotional_intensity > 0.6) {
      await this.storeEmotionalMemory(userMessage, analysis);
    }
    
    // Store if contains important information
    if (this.containsImportantInfo(userMessage)) {
      await this.storeFactualMemory(userMessage, analysis);
    }
    
    // Detect patterns
    const pattern = await this.detectPattern(analysis.context.user.chat_id);
    if (pattern) {
      await this.storePatternMemory(pattern, analysis);
    }
    
    // Update working memory
    this.updateWorkingMemory(userMessage, botResponse);
  }
  
  containsImportantInfo(message) {
    const important_markers = [
      /my (name|birthday|sign) is/i,
      /i work (at|as|in)/i,
      /i live in/i,
      /my (boyfriend|girlfriend|partner|spouse)/i,
      /i (love|hate|fear|want|need)/i,
      /always|never|every time/i,
      /years? ago/i,
      /when i was/i
    ];
    
    return important_markers.some(marker => marker.test(message));
  }
  
  async detectPattern(chatId) {
    const recentMessages = await this.db.getRecentMessages(chatId, 20);
    
    const patterns = {
      avoiding_topic: this.detectAvoidance(recentMessages),
      recurring_theme: this.detectRecurringTheme(recentMessages),
      emotional_cycle: this.detectEmotionalCycle(recentMessages),
      time_pattern: this.detectTimePattern(recentMessages),
      trigger_response: this.detectTriggers(recentMessages)
    };
    
    for (const [type, detected] of Object.entries(patterns)) {
      if (detected) {
        return { type, details: detected };
      }
    }
    
    return null;
  }
  
  detectRecurringTheme(messages) {
    const themes = {};
    const keywords = [
      'work', 'boss', 'relationship', 'partner', 'family', 'friend',
      'money', 'health', 'future', 'past', 'decision', 'change'
    ];
    
    messages.forEach(msg => {
      keywords.forEach(keyword => {
        if (msg.message.toLowerCase().includes(keyword)) {
          themes[keyword] = (themes[keyword] || 0) + 1;
        }
      });
    });
    
    const recurring = Object.entries(themes)
      .filter(([_, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1]);
    
    if (recurring.length > 0) {
      return {
        theme: recurring[0][0],
        frequency: recurring[0][1],
        observation: `You've mentioned ${recurring[0][0]} ${recurring[0][1]} times. It's weighing on you.`
      };
    }
    
    return null;
  }
  
  generateCallback(memory) {
    const templates = [
      `This connects to what you said about "${memory.content}"`,
      `Earlier you mentioned "${memory.content}". Still true?`,
      `"${memory.content}" — you said that. Sitting with it now.`,
      `Remember when you said "${memory.content}"? That was important.`,
      `Going back to "${memory.content}" for a second...`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  }
  async getCallbackMemories(chatId) {
  const memories = await this.db.getRecentMessages(chatId, 20);
  return memories
    .filter(m => m.emotional_weight > 0.5 || m.memory_type === 'important')
    .map(m => ({
      content: m.message.substring(0, 50),
      emotional_weight: m.emotional_weight || 0.5,
      created_at: new Date(m.created_at),
      recall_count: 0
    }))
    .slice(0, 3);
}

async getEmotionalMemories(chatId) {
  return [];  // Simplified for now
}

async getPatternMemories(chatId) {
  return [];  // Simplified for now
}

topicSimilarity(memory, message) {
  const memoryLower = memory.toLowerCase();
  const messageLower = message.toLowerCase();
  const commonWords = memoryLower.split(' ').filter(word => 
    messageLower.includes(word) && word.length > 3
  );
  return commonWords.length / memory.split(' ').length;
}
// Add to MemoryWeaver.js:

detectAvoidance(messages) {
  return null; // Simplified
}

detectRecurringTheme(messages) {
  return null; // Simplified  
}

detectEmotionalCycle(messages) {
  return null; // Simplified
}

detectTimePattern(messages) {
  return null; // Simplified
}

detectTriggers(messages) {
  return null; // Simplified
}

updateWorkingMemory(userMessage, botResponse) {
  this.workingMemory.push({ user: userMessage, bot: botResponse });
  if (this.workingMemory.length > 10) this.workingMemory.shift();
}

storeEmotionalMemory(message, analysis) {
  // Empty for now
}

storeFactualMemory(message, analysis) {
  // Empty for now
}

storePatternMemory(pattern, analysis) {
  // Empty for now
}

calculateEmotionalWeight(message) {
  return 0.5; // Default
}

// Add to MemoryWeaver class:

// async getRandomMemory(chatId) {
//   const memories = await this.db.getRecentMessages(chatId, 20);
  
//   if (!memories || memories.length === 0) {
//     return {
//       content: "something you mentioned earlier",
//       emotional_weight: 0.5
//     };
//   }
  
//   // Filter for meaningful memories (longer messages)
//   const meaningful = memories.filter(m => 
//     m.message && 
//     m.message.length > 30 && 
//     m.sender === 'user'
//   );
  
//   if (meaningful.length > 0) {
//     const random = meaningful[Math.floor(Math.random() * meaningful.length)];
//     return {
//       content: random.message.substring(0, 50),
//       emotional_weight: random.emotional_weight || 0.5
//     };
//   }
  
//   // Fallback to any memory
//   const random = memories[Math.floor(Math.random() * memories.length)];
//   return {
//     content: random?.message?.substring(0, 50) || "what we discussed",
//     emotional_weight: 0.5
//   };
// }

async getRandomMemory(chatId) {
  const memories = await this.db.getRecentMessages(chatId, 20);
  
  if (!memories || memories.length === 0) {
    return null;  // Return null instead of placeholder
  }
  
  const meaningful = memories.filter(m => 
    m.message && 
    m.message.length > 30 && 
    m.sender === 'user'
  );
  
  if (meaningful.length > 0) {
    const random = meaningful[Math.floor(Math.random() * meaningful.length)];
    return {
      content: random.message.substring(0, 50),
      emotional_weight: random.emotional_weight || 0.5
    };
  }
  
  return null;  // Return null if no good memory
}

}

export default MemoryWeaver;