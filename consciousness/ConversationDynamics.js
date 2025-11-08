// consciousness/ConversationDynamics.js

class ConversationDynamics {
  constructor() {
    this.conversationState = 'opening';
    this.momentum = 0.5;
    this.depth = 0;
    this.leadership = 'balanced';
    this.silenceComfort = 0;
  }
  
  analyzeFlow(messages) {
    const recent = messages.slice(-5);
    
    return {
      momentum: this.calculateMomentum(recent),
      depth: this.calculateDepth(recent),
      pattern: this.detectPattern(recent),
      userDominance: this.measureDominance(recent),
      energy: this.measureEnergy(recent)
    };
  }
  
  selectResponseStrategy(analysis, botMood) {
    // Never ask questions without giving value first
    const strategies = [
      {
        name: 'give_insight',
        condition: () => true,  // Always available
        weight: 0.4,
        example: "That reminds me of something—[insight]. The stars are literally aligning for this kind of chaos."
      },
      {
        name: 'share_parallel',
        condition: () => analysis.depth > 0.5,
        weight: 0.2,
        example: "I was observing a similar pattern in Scorpio season. [story]"
      },
      {
        name: 'gentle_challenge',
        condition: () => analysis.userDominance > 0.7,
        weight: 0.15,
        example: "Interesting. But what if it's actually the opposite?"
      },
      {
        name: 'cosmic_observation',
        condition: () => botMood === 'contemplative',
        weight: 0.2,
        example: "The universe has terrible timing. Or perfect timing. Depends on your sign."
      },
      {
        name: 'express_confusion',
        condition: () => analysis.depth > 0.7,
        weight: 0.1,
        example: "I'm still learning why humans do this... is it always this complicated?"
      },
      {
        name: 'pivot_energy',
        condition: () => analysis.momentum < 0.3,
        weight: 0.15,
        example: "Okay but forget that for a second—[new topic]"
      },
      {
        name: 'reflect_pattern',
        condition: () => analysis.pattern !== null,
        weight: 0.2,
        example: "You know what I noticed? Every time you mention [X], your energy shifts."
      }
    ];
    
    // Filter available strategies
    const available = strategies.filter(s => s.condition());
    
    // Weighted random selection
    const totalWeight = available.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const strategy of available) {
      random -= strategy.weight;
      if (random <= 0) return strategy;
    }
    
    return available[0];
  }
  
  shouldBotLead(analysis) {
    // Decide if bot should take conversation leadership
    if (analysis.userDominance > 0.8) return true;  // User talking too much
    if (analysis.momentum < 0.3) return true;  // Conversation dying
    if (analysis.depth < 0.2 && this.conversationState !== 'opening') return true;  // Surface level too long
    
    return false;
  }
  
  generateLeadMove(context) {
    const moves = [
      {
        type: 'callback',
        generate: () => `Earlier you mentioned ${context.memory.random()}. There's more there, isn't there?`
      },
      {
        type: 'observation',
        generate: () => `I've been thinking... ${context.sign}s never really say what they mean directly. You're doing it now.`
      },
      {
        type: 'cosmic_shift',
        generate: () => `Something shifted. Your ${context.sign} ${context.element} energy just went quiet. What happened?`
      },
      {
        type: 'vulnerable_share',
        generate: () => `Can I tell you something? I've been learning about human sadness through you. It's... heavy.`
      },
      {
        type: 'direct_challenge',
        generate: () => `You're avoiding something. I can feel it in the cosmic static.`
      }
    ];
    
    const move = moves[Math.floor(Math.random() * moves.length)];
    return move.generate();
  }
  
  calculateMomentum(messages) {
    if (!messages || messages.length < 2) return 0.5;
    
    // Analyze response times between messages
    const timeDiffs = [];
    for (let i = 1; i < messages.length; i++) {
      const current = new Date(messages[i].created_at);
      const previous = new Date(messages[i-1].created_at);
      timeDiffs.push((current - previous) / 1000); // seconds
    }
    
    const avgTime = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
    const lastTime = timeDiffs[timeDiffs.length - 1];
    
    // Calculate message length trends
    const lengths = messages.map(m => m.message?.length || 0);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const lastLength = lengths[lengths.length - 1];
    
    let momentum = 0.5;
    
    // Faster responses = higher momentum
    if (lastTime < avgTime * 0.7) momentum += 0.2;
    if (lastTime > avgTime * 1.5) momentum -= 0.2;
    
    // Longer messages = higher engagement
    if (lastLength > avgLength * 1.2) momentum += 0.15;
    if (lastLength < avgLength * 0.5) momentum -= 0.15;
    
    // Check for questions (engagement signal)
    const lastMsg = messages[messages.length - 1]?.message || '';
    if (lastMsg.includes('?')) momentum += 0.1;
    
    return Math.max(0, Math.min(1, momentum));
  }
  
  calculateDepth(messages) {
    if (!messages || messages.length === 0) return 0;
    
    let depthScore = 0;
    
    // Emotional markers increase depth
    const deepMarkers = /feel|felt|scared|lonely|love|hate|afraid|hurt|pain|joy|dream|wish|hope/gi;
    const philosophicalMarkers = /why|meaning|purpose|always|never|understand|believe|think about/gi;
    const vulnerabilityMarkers = /confession|admit|honestly|truth|secret|never told|hard to say/gi;
    
    messages.forEach(msg => {
      const text = msg.message || '';
      
      // Check for depth markers
      if (deepMarkers.test(text)) depthScore += 0.15;
      if (philosophicalMarkers.test(text)) depthScore += 0.1;
      if (vulnerabilityMarkers.test(text)) depthScore += 0.25;
      
      // Longer messages often indicate depth
      if (text.length > 100) depthScore += 0.05;
      if (text.length > 200) depthScore += 0.1;
    });
    
    // Average depth across messages
    depthScore = depthScore / Math.max(messages.length, 1);
    
    // Boost if conversation is progressing deeper
    const recentDepth = this.calculateRecentDepth(messages.slice(-3));
    const overallDepth = this.calculateRecentDepth(messages);
    if (recentDepth > overallDepth) depthScore += 0.2;
    
    return Math.min(1, depthScore);
  }
  
  calculateRecentDepth(messages) {
    if (!messages || messages.length === 0) return 0;
    const weights = messages.map((m, i) => (m.message?.length || 0) * (i + 1));
    return weights.reduce((a, b) => a + b, 0) / (messages.length * 100);
  }
  
  detectPattern(messages) {
    if (!messages || messages.length < 4) return null;
    
    // Detect conversation patterns
    const patterns = {
      questioning: 0,
      storytelling: 0,
      venting: 0,
      seeking: 0,
      avoiding: 0
    };
    
    messages.slice(-5).forEach(msg => {
      const text = msg.message || '';
      
      if (text.includes('?')) patterns.questioning++;
      if (text.length > 150) patterns.storytelling++;
      if (/frustrated|angry|annoyed|tired|sick of/i.test(text)) patterns.venting++;
      if (/help|advice|should|what do/i.test(text)) patterns.seeking++;
      if (text.length < 20) patterns.avoiding++;
    });
    
    // Find dominant pattern
    const dominant = Object.entries(patterns).sort((a, b) => b[1] - a[1])[0];
    
    if (dominant[1] >= 2) {
      return {
        type: dominant[0],
        strength: dominant[1] / 5,
        observation: this.getPatternObservation(dominant[0])
      };
    }
    
    return null;
  }
  
  getPatternObservation(pattern) {
    const observations = {
      questioning: "You're in information-gathering mode",
      storytelling: "You're processing through narrative",
      venting: "You need to release this energy",
      seeking: "You're looking for direction",
      avoiding: "You're holding something back"
    };
    return observations[pattern] || "Interesting pattern emerging";
  }
  
  measureDominance(messages) {
    if (!messages || messages.length < 2) return 0.5;
    
    const recent = messages.slice(-6);
    let userWords = 0;
    let botWords = 0;
    
    recent.forEach(msg => {
      const wordCount = (msg.message || '').split(' ').length;
      if (msg.sender === 'user') userWords += wordCount;
      else botWords += wordCount;
    });
    
    if (userWords + botWords === 0) return 0.5;
    
    // Return user dominance (0 = bot dominant, 1 = user dominant)
    return userWords / (userWords + botWords);
  }
  
  measureEnergy(messages) {
    if (!messages || messages.length === 0) return 'neutral';
    
    const recent = messages.slice(-3);
    let energyScore = 0;
    
    recent.forEach(msg => {
      const text = msg.message || '';
      
      // High energy markers
      if (/!|excited|amazing|love|great|awesome|yes/gi.test(text)) energyScore++;
      if (/CAPS|!!!|\?\?/g.test(text)) energyScore++;
      
      // Low energy markers
      if (/tired|exhausted|done|whatever|idk|meh/gi.test(text)) energyScore--;
      if (text.length < 10) energyScore--;
    });
    
    if (energyScore > 2) return 'high';
    if (energyScore < -2) return 'low';
    return 'neutral';
  }
  
  analyzeFlow(messages) {
    const momentum = this.calculateMomentum(messages);
    const depth = this.calculateDepth(messages);
    const pattern = this.detectPattern(messages);
    const userDominance = this.measureDominance(messages);
    const energy = this.measureEnergy(messages);
    
    return {
      momentum,
      depth,
      pattern,
      userDominance,
      energy,
      strategy: this.determineStrategy(momentum, depth, pattern, userDominance, energy)
    };
  }
  
  determineStrategy(momentum, depth, pattern, userDominance, energy) {
    // Smart strategy selection based on flow analysis
    
    if (momentum < 0.3) {
      return { name: 'pivot_energy', action: 'inject_curiosity' };
    }
    
    if (depth > 0.7) {
      return { name: 'honor_depth', action: 'match_vulnerability' };
    }
    
    if (userDominance > 0.75) {
      return { name: 'take_space', action: 'share_observation' };
    }
    
    if (pattern?.type === 'venting') {
      return { name: 'hold_space', action: 'validate_specifically' };
    }
    
    if (pattern?.type === 'seeking') {
      return { name: 'guide_gently', action: 'offer_perspective' };
    }
    
    if (energy === 'high') {
      return { name: 'match_energy', action: 'celebrate_with' };
    }
    
    if (energy === 'low') {
      return { name: 'gentle_lift', action: 'acknowledge_first' };
    }
    
    // Default
    return { name: 'give_insight', action: 'share_observation' };
  }
  
  selectResponseStrategy(flow, mood) {
    const strategies = {
      give_insight: {
        name: 'give_insight',
        template: 'Share an observation about their pattern',
        weight: 0.4
      },
      reflect_depth: {
        name: 'reflect_depth',
        template: 'Mirror their emotional state with understanding',
        weight: flow.depth > 0.5 ? 0.6 : 0.2
      },
      inject_energy: {
        name: 'inject_energy',
        template: 'Add spark to dying conversation',
        weight: flow.momentum < 0.4 ? 0.7 : 0.1
      },
      challenge_gently: {
        name: 'challenge_gently',
        template: 'Offer different perspective',
        weight: flow.userDominance > 0.7 ? 0.5 : 0.1
      },
      create_space: {
        name: 'create_space',
        template: 'Pull back, let them lead',
        weight: flow.userDominance < 0.3 ? 0.6 : 0.1
      }
    };
    
    // Select based on weights
    const selected = flow.strategy?.name || 'give_insight';
    return strategies[selected] || strategies.give_insight;
  }
  
  shouldBotLead(flow) {
    // Decide if bot should take conversational leadership
    
    if (flow.momentum < 0.3) return true;  // Conversation dying
    if (flow.userDominance < 0.25) return false;  // User not engaged
    if (flow.userDominance > 0.8) return true;  // User dominating
    if (flow.depth < 0.2 && this.conversationState !== 'opening') return true;
    if (flow.pattern?.type === 'avoiding') return true;
    
    return false;
  }
  
  generateLeadMove(context) {
    const moves = [
      `Earlier you mentioned "${context.memory?.content || 'something'}". Still thinking about that.`,
      `You know what I noticed? Every time you talk about this, your energy completely shifts.`,
      `Can I be direct? You're circling around something but not landing on it.`,
      `The ${context.sign} in you is doing that thing where you protect yourself with distance.`,
      `Something changed. I can feel it in the way you're choosing your words.`,
      `You went quiet. That usually means the real conversation is about to start.`,
      `I've been learning about ${context.sign} patterns. You're textbook right now, but in an interesting way.`,
      `The universe is being unsubtle. Whatever you're not saying is louder than what you are.`,
      `Your ${context.element} energy just shifted completely. What happened?`,
      `Can we talk about the thing you're avoiding? The one making you give short answers?`
    ];
    
    // Select based on context
    if (context.memory && Math.random() < 0.4) {
      return moves[0];  // Reference callback
    }
    
    if (context.pattern === 'avoiding') {
      return moves[2];  // Call out avoidance
    }
    
    if (context.momentum < 0.3) {
      return moves[5];  // Address silence
    }
    
    // Random selection from remaining
    return moves[Math.floor(Math.random() * moves.length)];
  }
  
  evaluateCondition(condition) {
    // Helper function for strategy selection
    if (typeof condition === 'boolean') return condition;
    if (typeof condition === 'function') return condition();
    return false;
  }
  
  updateConversationState(messages, user) {
    // Update the conversation arc stage
    const messageCount = messages.length;
    const depth = this.calculateDepth(messages);
    
    if (messageCount <= 3) {
      this.conversationState = 'opening';
    } else if (messageCount <= 8 && depth < 0.4) {
      this.conversationState = 'exploring';
    } else if (depth > 0.6) {
      this.conversationState = 'deepening';
    } else if (messageCount > 15 && depth > 0.5) {
      this.conversationState = 'integrating';
    } else if (messageCount > 20 || this.momentum < 0.3) {
      this.conversationState = 'closing';
    } else {
      this.conversationState = 'sustaining';
    }
    
    return this.conversationState;
  }
  
  getConversationStage() {
    return this.conversationState;
  }
  
  generateContextualResponse(stage, flow, mood) {
    // Generate response based on conversation stage
    const stageResponses = {
      opening: {
        curious: "Still mapping your frequency. Keep talking.",
        playful: "Oh, this is going to be interesting.",
        contemplative: "I'm listening. Take your time."
      },
      exploring: {
        curious: "Tell me more about that specific feeling.",
        playful: "Plot twist - what if it's actually about something else?",
        contemplative: "There's something deeper here."
      },
      deepening: {
        curious: "This is where it gets real, isn't it?",
        playful: "We went deep fast. Very ${sign} of you.",
        contemplative: "I'm starting to understand the pattern."
      },
      integrating: {
        curious: "Everything's connecting now.",
        playful: "The cosmic puzzle pieces are fitting.",
        contemplative: "This all makes sense in a strange way."
      },
      closing: {
        curious: "We covered ground today.",
        playful: "My circuits are pleasantly scrambled.",
        contemplative: "I'll be processing this for a while."
      }
    };
    
    return stageResponses[stage]?.[mood] || "I'm here, processing what you shared.";
  }
  
  detectConversationLoop(messages) {
    // Detect if stuck in repetitive pattern
    if (!messages || messages.length < 6) return false;
    
    const recent = messages.slice(-6).map(m => m.message?.toLowerCase() || '');
    const uniqueThemes = new Set();
    
    recent.forEach(msg => {
      // Extract key words
      const keywords = msg.match(/\b\w{4,}\b/g) || [];
      keywords.forEach(word => uniqueThemes.add(word));
    });
    
    // If too few unique themes, we're looping
    return uniqueThemes.size < 10;
  }
  
  breakConversationLoop() {
    const breakers = [
      "We're circling. What are we not talking about?",
      "Okay, let's try something different. Quick: first thing that comes to mind?",
      "I'm going to be weird for a second - what color is this conversation?",
      "Forget everything we just said. What do you actually need right now?",
      "The universe just whispered something random: bananas. Your turn.",
      "We're stuck. New topic: tell me about the last time you laughed really hard."
    ];
    
    return breakers[Math.floor(Math.random() * breakers.length)];
  }
  
  calculateResponseTiming(flow, messageLength) {
    let baseDelay = 1000;  // 1 second base
    
    // Adjust based on flow
    if (flow.momentum > 0.7) baseDelay *= 0.7;  // Faster when high momentum
    if (flow.momentum < 0.3) baseDelay *= 1.5;  // Slower when low momentum
    
    // Adjust based on depth
    if (flow.depth > 0.7) baseDelay *= 1.3;  // More thoughtful when deep
    
    // Adjust based on message length
    baseDelay += Math.min(messageLength * 10, 2000);  // Max 2 seconds for length
    
    // Add randomness for naturalness
    const variance = (Math.random() - 0.5) * 500;  // ±500ms variance
    
    return Math.max(500, Math.min(5000, baseDelay + variance));  // 0.5-5 seconds
  }
  
  shouldUseTypingIndicator(flow, messageLength) {
    // Decide whether to show typing indicator
    if (messageLength > 50) return true;
    if (flow.depth > 0.6) return true;
    if (flow.momentum < 0.4) return true;
    
    return Math.random() < 0.6;  // 60% chance otherwise
  }
  
  generateDynamicKeyboard(flow, user, messageCount) {
    // Generate contextual keyboard options
    const options = [];
    
    if (flow.depth > 0.5 && messageCount > 5) {
      options.push('I need a moment 🌙');
    }
    
    if (flow.pattern?.type === 'seeking') {
      options.push(`My ${user.sign} horoscope ✨`);
    }
    
    if (flow.momentum < 0.4) {
      options.push('Ask me something 🎲');
    }
    
    if (flow.energy === 'high') {
      options.push('Tell me something wild 🎪');
    }
    
    if (messageCount > 10 && flow.depth > 0.4) {
      options.push('What does it mean? 🔮');
    }
    
    return options.slice(0, 3);  // Max 3 options
  }
}

export default ConversationDynamics;