// tests/conversation-quality-test.js

class ConversationQualityTester {
  constructor() {
    this.metrics = {
      questionRatio: 0,
      valuePerMessage: 0,
      emotionalResonance: 0,
      conversationDepth: 0,
      naturalness: 0
    };
  }
  
  async testConversation(messages) {
    // Test for robotic patterns
    const roboticScore = this.detectRoboticPatterns(messages);
    
    // Test for value delivery
    const valueScore = this.measureValueDelivery(messages);
    
    // Test for emotional intelligence
    const emotionalScore = this.measureEmotionalIntelligence(messages);
    
    // Test for conversation flow
    const flowScore = this.measureConversationFlow(messages);
    
    return {
      overall: (roboticScore + valueScore + emotionalScore + flowScore) / 4,
      breakdown: {
        robotic: roboticScore,
        value: valueScore,
        emotional: emotionalScore,
        flow: flowScore
      },
      recommendations: this.generateRecommendations({
        roboticScore, valueScore, emotionalScore, flowScore
      })
    };
  }
  
  detectRoboticPatterns(messages) {
    const roboticPhrases = [
      /how can i help/i,
      /i understand/i,
      /thank you for sharing/i,
      /that must be/i,
      /tell me more/i
    ];
    
    let roboticCount = 0;
    messages.forEach(msg => {
      if (msg.sender === 'bot') {
        roboticPhrases.forEach(pattern => {
          if (pattern.test(msg.message)) roboticCount++;
        });
      }
    });
    
    return Math.max(0, 1 - (roboticCount / messages.filter(m => m.sender === 'bot').length));
  }


  measureValueDelivery(messages) {
    const botMessages = messages.filter(m => m.sender === 'bot');
    let valueScore = 0;
    
    botMessages.forEach(msg => {
      const text = msg.message;
      
      // Check for insights
      if (text.includes('thing about') || text.includes('noticed') || 
          text.includes('pattern')) valueScore += 0.3;
      
      // Check for stories
      if (text.includes('reminds me') || text.includes('once') || 
          text.includes('yesterday')) valueScore += 0.2;
      
      // Check for observations
      if (text.includes('you') && !text.includes('?')) valueScore += 0.2;
      
      // Check for astrological wisdom
      if (text.includes('sign') || text.includes('cosmic') || 
          text.includes('universe')) valueScore += 0.1;
      
      // Penalize pure questions
      if (text.endsWith('?') && text.split('.').length === 1) valueScore -= 0.3;
    });
    
    return Math.min(1, valueScore / botMessages.length);
  }
  
  measureEmotionalIntelligence(messages) {
    let resonanceScore = 0;
    const conversations = this.groupIntoConversations(messages);
    
    conversations.forEach(conv => {
      // Check emotional acknowledgment
      if (this.detectsEmotionalShift(conv)) resonanceScore += 0.3;
      
      // Check vulnerability balance
      if (this.hasBalancedVulnerability(conv)) resonanceScore += 0.3;
      
      // Check emotional depth progression
      if (this.showsEmotionalProgression(conv)) resonanceScore += 0.4;
    });
    
    return Math.min(1, resonanceScore / conversations.length);
  }
  
  measureConversationFlow(messages) {
    let flowScore = 1.0;
    
    // Check for question loops
    const questionRatio = this.calculateQuestionRatio(messages);
    if (questionRatio > 0.3) flowScore -= 0.3;
    
    // Check for variety in response length
    const lengthVariety = this.calculateLengthVariety(messages);
    flowScore += lengthVariety * 0.3;
    
    // Check for topic evolution
    const topicEvolution = this.measureTopicEvolution(messages);
    flowScore += topicEvolution * 0.4;
    
    return Math.min(1, Math.max(0, flowScore));
  }
  
  generateRecommendations(scores) {
    const recommendations = [];
    
    if (scores.roboticScore < 0.7) {
      recommendations.push("Too many robotic patterns. Add more personality quirks.");
    }
    
    if (scores.valueScore < 0.6) {
      recommendations.push("Not enough value per message. Add more insights/stories.");
    }
    
    if (scores.emotionalScore < 0.5) {
      recommendations.push("Low emotional intelligence. Improve subtext reading.");
    }
    
    if (scores.flowScore < 0.6) {
      recommendations.push("Poor conversation flow. Reduce questions, vary responses.");
    }
    
    return recommendations;
  }
}

module.exports = ConversationQualityTester;