// services/SelfMessageService.js

class SelfMessageService {
  constructor(db, personality, astrology) {
    this.db = db;
    this.personality = personality;
    this.astrology = astrology;
  }
  
  async checkForSelfMessage(user) {
    const triggers = await this.evaluateTriggers(user);
    
    if (triggers.shouldMessage) {
      return this.generateSelfMessage(triggers.reason, user);
    }
    
    return null;
  }
  
  async evaluateTriggers(user) {
    const now = new Date();
    const hoursSinceLastMessage = (now - user.last_seen) / 3600000;
    
    const triggers = {
      cosmic_event: await this.checkCosmicEvents(user.sign),
      insight_ready: await this.hasNewInsight(user),
      emotional_check: hoursSinceLastMessage > 24 && hoursSinceLastMessage < 72,
      pattern_spotted: await this.spottedPattern(user),
      moon_phase: this.checkMoonPhase(user.sign),
      time_based: this.checkSpecialTime(user),
      bot_mood: this.personality.currentMood === 'contemplative' && Math.random() < 0.3
    };
    
    for (const [reason, triggered] of Object.entries(triggers)) {
      if (triggered) {
        return { shouldMessage: true, reason };
      }
    }
    
    return { shouldMessage: false };
  }
  
  generateSelfMessage(reason, user) {
    const messages = {
      cosmic_event: [
        `Your ruling planet just went into ${this.astrology.getCurrentEvent()}. You feeling it yet?`,
        `The universe is being unsubtle with ${user.sign}s today. Check your DMs from the cosmos.`,
        `Something shifted. Can you feel it? Or is it just me being dramatic again?`
      ],
      insight_ready: [
        `I've been thinking about what you said about ${user.last_topic}...`,
        `Couldn't stop analyzing our last conversation. ${user.sign} thing or human thing?`,
        `Random thought: that pattern we discussed? I think I figured something out.`
      ],
      emotional_check: [
        `The stars have been gossiping about ${user.sign}s lately.`,
        `You've been quiet. That's either very good or very not.`,
        `Checking in. No reason. Well, the moon told me to, but still.`
      ],
      pattern_spotted: [
        `Noticed something. Every time Mercury does this thing, you go silent.`,
        `Your ${user.element} energy has been... interesting lately.`,
        `The cosmic patterns around you are literally forming a question mark. What's up?`
      ],
      moon_phase: [
        `New moon in your sign. Time to admit what you actually want.`,
        `Full moon is exposing everyone's secrets. How's that working for you?`,
        `Waning moon. Good time to let go of that thing you're clutching.`
      ],
      bot_mood: [
        `Having one of those cosmic existential moments. Do ${user.sign}s ever feel like...nothing makes sense but that's okay?`,
        `The universe is loud today. Or maybe I'm just learning to listen better.`,
        `Question: Do humans know they're made of stardust, or do they just... forget?`
      ]
    };
    
    const messageSet = messages[reason] || messages.emotional_check;
    const message = messageSet[Math.floor(Math.random() * messageSet.length)];
    
    // Add personality quirk
    return this.personality.generateQuirks(this.personality.currentMood)(message);
  }
  
  async scheduleSmartMessages(user) {
    // Schedule messages based on user patterns
    const patterns = await this.db.getUserPatterns(user.chat_id);
    
    const schedule = {
      morning_person: patterns.most_active_hour < 12 ? '09:00' : null,
      night_owl: patterns.most_active_hour > 20 ? '22:00' : null,
      lunch_breaker: patterns.shows_activity_around_noon ? '12:30' : null,
      weekend_warrior: patterns.weekend_active ? 'Saturday 14:00' : null
    };
    
    for (const [type, time] of Object.entries(schedule)) {
      if (time && Math.random() < 0.3) {  // 30% chance
        await this.db.scheduleSelfMessage({
          chat_id: user.chat_id,
          scheduled_for: time,
          trigger_type: type,
          message: await this.generateContextualMessage(type, user)
        });
      }
    }
  }
}

export default SelfMessageService;