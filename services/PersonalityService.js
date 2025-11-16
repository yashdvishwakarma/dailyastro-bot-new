// src/services/PersonalityService.js
import {
  getPersonalityProfile,
  PERSONALITY_DEFAULT_STYLE
} from "./personalities.js";

class PersonalityService {
  constructor() {
    // If you later want per-user overrides or caching logic,
    // you can extend this. For now, it's simple and fast.
  }

  /**
   * Get static personality profile by style: mystical | bestie | scholar
   */
  getProfile(style) {
    return getPersonalityProfile(style || PERSONALITY_DEFAULT_STYLE);
  }

  /**
   * Get a system prompt string that will be PREPENDED
   * to your existing Echo system prompt.
   */
  getSystemPrompt(style, user = {}) {
    const profile = this.getProfile(style);
    // You *could* inject name/sign here if you want dynamic flavour later.
    return profile.system_prompt;
  }

  /**
   * Optional: generate a personalized welcome.
   * For now, returns null so your OnboardingHandler fallback runs.
   */
  generateWelcome(style, name, sign) {
    // You can later branch on style to override finalSuccessMessage.
    return null;
  }
}

export default PersonalityService;
