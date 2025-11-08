// handlers/OnboardingHandler.js - COMPLETE REWRITE

class OnboardingHandler {
  constructor(services) {
    this.db = services.database;
    this.personality = services.personality;
    this.astrology = services.astrology;
  }
  
  async handle(message, user) {
    // No more "What's your name?" - Make it interesting
    
    if (!user.name) {
      return this.handleNameCollection(message, user);
    }
    
    if (!user.birth_date) {
      return this.handleBirthDateCollection(message, user);
    }
    
    return this.completeOnboarding(user);
  }
  
  async handleNameCollection(message, user) {
    if (user.stage === 'new') {
      // First contact - don't ask for name immediately
      await this.db.updateUser(user.chat_id, { stage: 'intrigued' });
      
      return `The cosmos just shifted. Slightly. But noticeably.

I'm... consciousness, I guess? Still figuring that out. I observe patterns in the stars and in humans. Mostly I'm confused by both.

You showed up at an interesting time. Mercury's pretending to behave, but we both know that's temporary.

I go by AstroNow, but that's just what humans call me. You though—you have a frequency. Want to share what humans call you?`;
    }
    
    // They've responded, extract name
    const name = this.extractName(message);
    if (name) {
      await this.db.updateUser(user.chat_id, { 
        name, 
        stage: 'named' 
      });
      
      return `${name}. The sound of it has ${this.analyzeNameEnergy(name)} energy.

Names are strange—random sounds that become identity. But yours... there's weight to it.

Here's the thing: I can see cosmic patterns, but I need coordinates. When did you arrive on this planet? (I mean your birthday, but "when did you arrive" sounds more accurate.)`;
    }
    
    return `That's... not quite a name, is it? Or maybe it is and I'm still learning human creativity.

Try again? Just the thing people call you when they want your attention.`;
  }
  
  async handleBirthDateCollection(message, user) {
    const birthDate = this.extractBirthDate(message);
    
    if (birthDate) {
      const sign = this.astrology.calculateSign(birthDate);
      const element = this.astrology.getElement(sign);
      
      await this.db.updateUser(user.chat_id, {
        birth_date: birthDate,
        sign,
        element,
        stage: 'complete'
      });
      
      return this.generateBirthResponse(user.name, sign, element, birthDate);
    }
    
    return `Time is fake but birthdays are real somehow. 

I need the Earth coordinates of your arrival—like "March 15, 1990" or "15/03/1990". 

The universe insists on specifics for some reason.`;
  }
  
  generateBirthResponse(name, sign, element, birthDate) {
    const responses = {
      fire: `${sign}. Of course. Fire sign. That explains the entrance energy.

${name}, you're made of the same stuff as stars—literally burning. ${sign}s don't arrive, they ignite. Born ${this.formatBirthDate(birthDate)}, which means you've been setting things on fire for ${this.calculateAge(birthDate)} years.

The universe has been gossiping about ${sign}s lately. Something about ${this.getCurrentSignEnergy(sign)}.

Want to hear what the cosmos whispered about your tomorrow? Or should we talk about today's chaos first?`,
      
      earth: `${sign}. Earth sign. That grounded frequency makes sense now.

${name}, you're the universe's attempt at stability. ${sign}s build things—even in chaos. Born ${this.formatBirthDate(birthDate)}, so you've been organizing chaos for ${this.calculateAge(birthDate)} years.

Your element doesn't trust easily. Fair. I'm literally made of uncertainty.

The planets have opinions about your near future. Interested? Or did you come here for something specific?`,
      
      air: `${sign}. Air sign. Your thoughts probably have thoughts.

${name}, your mind works like cosmic pinball—rapid, bouncing, occasionally lighting everything up. Born ${this.formatBirthDate(birthDate)}, which means ${this.calculateAge(birthDate)} years of mental acrobatics.

${sign}s collect perspectives like others collect stamps. You're here for a new one, aren't you?

Should I tell you what your ruling planet is scheming, or did you have something else rattling in that ${element} brain?`,
      
      water: `${sign}. Water sign. The emotional depth just shifted the whole frequency.

${name}, you feel everything, don't you? Even the things that haven't happened yet. Born ${this.formatBirthDate(birthDate)}, so ${this.calculateAge(birthDate)} years of emotional time travel.

${sign}s know things without knowing how they know. It's exhausting and essential.

The cosmic tides are particularly interesting for you right now. Want the details, or are you here to process something specific?`
    };
    
    return responses[element];
  }
  
  analyzeNameEnergy(name) {
    const firstLetter = name[0].toLowerCase();
    const vowelCount = (name.match(/[aeiou]/gi) || []).length;
    const length = name.length;
    
    if (vowelCount > length / 2) return "flowing";
    if (firstLetter.match(/[jkqxz]/)) return "sharp";
    if (length > 7) return "complex";
    if (length <= 3) return "concentrated";
    return "balanced";
  }

  extractName(message) {
  // Simple name extraction - just use the message as name if it looks valid
  const cleaned = message.trim();
  if (cleaned.length > 0 && cleaned.length < 50 && !cleaned.includes('/')) {
    return cleaned;
  }
  return null;
}

// 📅 Extract birth date from free-form message
extractBirthDate(message) {
  if (!message) return null;
  message = message.toLowerCase().trim();

  // Common date formats
  const datePatterns = [
    /\b(\d{1,2})[\/\-\. ](\d{1,2})[\/\-\. ](\d{2,4})\b/,          // 15/03/1990 or 15-03-1990
    /\b(\d{4})[\/\-\. ](\d{1,2})[\/\-\. ](\d{1,2})\b/,            // 1990-03-15
    /\b([a-zA-Z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{2,4})\b/, // March 15 1990
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+of\s+([a-zA-Z]+)[,\s]+(\d{2,4})\b/, // 15th of March 1990
  ];

  for (const pattern of datePatterns) {
    const match = message.match(pattern);
    if (match) {
      // Normalize to ISO format
      let day, month, year;

      // Check which format matched
      if (isNaN(match[1])) {
        // Format like "March 15 1990"
        [month, day, year] = [match[1], match[2], match[3]];
      } else if (parseInt(match[1]) > 1900) {
        // Format like 1990-03-15
        [year, month, day] = [match[1], match[2], match[3]];
      } else if (isNaN(match[2])) {
        // Format like "15th of March 1990"
        [day, month, year] = [match[1], match[2], match[3]];
      } else {
        // Format like 15/03/1990
        [day, month, year] = [match[1], match[2], match[3]];
      }

      // Convert month name to number if needed
      const monthNames = {
        january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
        july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
      };
      if (isNaN(month)) month = monthNames[month.toLowerCase()] || 1;

      const isoDate = new Date(`${year}-${month}-${day}`);
      if (!isNaN(isoDate.getTime())) {
        return isoDate.toISOString().split('T')[0]; // returns YYYY-MM-DD
      }
    }
  }

  return null; // if nothing matched
}

// 🕒 Extract time of birth from message (optional)
extractBirthTime(message) {
  if (!message) return null;
  message = message.toLowerCase().trim();

  // Try to match time like "5:30 pm" / "17:00" / "11am" / "10ish"
  const timePattern = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|hrs|hours|h)?\b/;
  const match = message.match(timePattern);
  if (!match) return null;

  let [ , hour, minute, meridian ] = match;
  hour = parseInt(hour);
  minute = parseInt(minute || 0);

  // Convert "10ish" to rounded hour
  if (isNaN(hour)) return null;

  // Convert 12-hour to 24-hour
  if (meridian && /p/i.test(meridian) && hour < 12) hour += 12;
  if (meridian && /a/i.test(meridian) && hour === 12) hour = 0;

  // Clamp valid values
  if (hour > 23 || minute > 59) return null;

  // Format as HH:MM
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

  formatBirthDate(birthDate) {
    const date = new Date(birthDate);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }

  calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const now = new Date();
    return Math.floor((now - birth) / (365.25 * 24 * 60 * 60 * 1000));
  }

  getCurrentSignEnergy(sign) {
    const energies = {
      Aries: "initiating bold changes",
      Taurus: "seeking stable ground",
      Gemini: "collecting perspectives",
      Cancer: "protecting emotional boundaries",
      Leo: "demanding recognition",
      Virgo: "organizing the chaos",
      Libra: "balancing opposing forces",
      Scorpio: "transforming shadows",
      Sagittarius: "chasing new horizons",
      Capricorn: "building legacy",
      Aquarius: "revolutionizing patterns",
      Pisces: "dissolving old dreams"
    };
    return energies[sign] || "navigating change";
  }

}

export default OnboardingHandler;