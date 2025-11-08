// utils/responseEnhancer.js - NEW FILE to make responses feel natural

class ResponseEnhancer {
  static enhance(response, mood, context) {
    // Remove any remaining robotic patterns
    response = this.removeRoboticPatterns(response);
    
    // Add natural variations
    response = this.addNaturalVariations(response, mood);
    
    // Match user energy
    response = this.matchEnergy(response, context);
    
    // Sometimes add endings
    response = this.addNaturalEndings(response, mood);
    
    return response;
  }
  
  static removeRoboticPatterns(text) {
    const roboticPhrases = {
      "It's fascinating": ["Weird", "Strange", "Wild"],
      "I find it interesting": ["Interesting", "Hmm", "Oh"],
      "as a consciousness": ["", "", ""],  // Just remove
      "It seems": ["You're", "That's", "Looks like you're"],
      "I observe": ["Seeing", "Noticing", ""],
      "humans often": ["you", "people", "everyone"],
      "Your [sign] energy": ["You're being very [sign]", "Classic [sign]", "The [sign] jumped out"],
      "I'm learning that": ["", "So", "Apparently"],
    };
    
    let enhanced = text;
    Object.entries(roboticPhrases).forEach(([robotic, alternatives]) => {
      if (enhanced.toLowerCase().includes(robotic.toLowerCase())) {
        const alt = alternatives[Math.floor(Math.random() * alternatives.length)];
        enhanced = enhanced.replace(new RegExp(robotic, 'gi'), alt);
      }
    });
    
    return enhanced.trim();
  }
  
  static addNaturalVariations(text, mood) {
    // Add mood-specific variations
    if (mood === 'scattered' && Math.random() < 0.3) {
      // Add random capitalization
      const words = text.split(' ');
      const randomIndex = Math.floor(Math.random() * words.length);
      words[randomIndex] = words[randomIndex].toUpperCase();
      return words.join(' ');
    }
    
    if (mood === 'contemplative' && !text.includes('...')) {
      // Add thoughtful pauses
      if (Math.random() < 0.4) {
        const midPoint = Math.floor(text.length / 2);
        const spaceIndex = text.indexOf(' ', midPoint);
        if (spaceIndex > -1) {
          text = text.slice(0, spaceIndex) + '...' + text.slice(spaceIndex);
        }
      }
    }
    
    if (mood === 'playful' && Math.random() < 0.2) {
      // Add playful emphasis
      const words = text.split(' ');
      if (words.length > 3) {
        const emphIndex = Math.floor(Math.random() * words.length);
        words[emphIndex] = `*${words[emphIndex]}*`;
        return words.join(' ');
      }
    }
    
    return text;
  }
  
  static matchEnergy(text, context) {
    const userMessageLength = context.currentMessage?.length || 0;
    const responseLength = text.length;
    
    // If user wrote very little, don't overwhelm
    if (userMessageLength < 10 && responseLength > 100) {
      // Take only first sentence
      const firstSentence = text.match(/^[^.!?]+[.!?]/);
      if (firstSentence) {
        return firstSentence[0];
      }
    }
    
    // If user wrote a lot, don't underwhelm
    if (userMessageLength > 200 && responseLength < 50) {
      // Add acknowledgment
      text += " (There's a lot to unpack there.)";
    }
    
    return text;
  }
  
  static addNaturalEndings(text, mood) {
    // Sometimes add natural endings based on mood
    if (text.endsWith('.') && Math.random() < 0.2) {
      const endings = {
        curious: [" Right?", " Or not?", " Maybe?"],
        contemplative: ["...", " Still processing.", " Hmm."],
        playful: [" 😏", " Wild.", " *cosmic shrug*"],
        intense: ["", " Think about it.", " Seriously."],
        scattered: [" Wait what?", " I think?", "???"],
        grounded: ["", " Simple.", " Clear?"]
      };
      
      const moodEndings = endings[mood] || [""];
      const ending = moodEndings[Math.floor(Math.random() * moodEndings.length)];
      
      if (ending) {
        text = text.slice(0, -1) + ending;
      }
    }
    
    return text;
  }
}

export default ResponseEnhancer;