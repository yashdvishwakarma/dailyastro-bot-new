// OnboardingHandler.js - Clean implementation
import PersonalityService from "../services/PersonalityService.js";
import AstrologyService from "../services/AstrologyService.js";

class OnboardingHandler {
  constructor(services) {
    this.db = services.database;
    this.astrology = services.astrology;
    this.personality = services.personality || null;
    this.logger = services.logger || console;
    this.analytics = services.analytics || null;

    this.dobRegex = /^(0?[1-9]|[12][0-9]|3[01])\/(0?[1-9]|1[0-2])\/((?:19|20)\d{2})$/;

    this.vibes = {
      "🔮": "mystical",
      "💬": "bestie",
      "📚": "scholar",
    };

    this.vibePatterns = {
      mystical: ["mystical", "maven", "spiritual", "deep", "mystic", "🔮"],
      bestie: ["bestie", "cosmic bestie", "fun", "real", "friend", "casual", "💬"],
      scholar: ["scholar", "detailed", "logical", "academic", "analytical", "📚"],
    };
  }

  // ---------- Utility methods ----------
  sanitizeInput(text) {
    return text.replace(/[<>"'&]/g, "").substring(0, 500);
  }

  isRestartCommand(text) {
    return /^(restart|reset|start over|begin again)$/i.test(text);
  }

  async safeDbUpdate(chatId, patch) {
    try {
      await this.db.updateUser(chatId, patch);
      return true;
    } catch (e) {
      this.logger.error("Database update failed", e);
      throw e;
    }
  }

  // ---------- Main entry point ----------
  async handle(message, user) {
    try {
      const text = this.sanitizeInput((message || "").toString().trim());
      if (this.isRestartCommand(text) && user.stage !== "start") {
        return await this.handleRestart(user);
      }
      const stage = user.stage || "start";
      this.trackEvent("onboarding_step", { stage, userId: user.chat_id });
      switch (stage) {
        case "start":
        case "get_sign":
        case "get_sign_structured":
          return await this.handleSignOrDob(text, user);
        case "get_style":
          return await this.handleVibe(text, user);
        case "get_name":
          return await this.handleName(text, user);
        case "get_time":
          return await this.handleBirthTime(text, user);
        case "get_location":
          return await this.handleLocation(text, user);
        case "complete":
          return `You're already onboarded! Say "menu" or ask for a reading. (Say "restart" to start over)`;
        default:
          await this.safeDbUpdate(user.chat_id, { stage: "get_sign" });
          return this.getSignPrompt();
      }
    } catch (e) {
      this.logger.error("OnboardingHandler error", e);
      return `Sorry, something went wrong. Please try again or say "restart".`;
    }
  }

  // ---------- Restart ----------
  async handleRestart(user) {
    await this.safeDbUpdate(user.chat_id, {
      stage: "start",
      sign: null,
      element: null,
      birth_date: null,
      birth_time: null,
      name: null,
      preferred_conversation_style: null,
      last_interaction: null,
    });
    this.trackEvent("onboarding_restart", { userId: user.chat_id });
    return `Let's start fresh! 🌟\n\n${this.getSignPrompt()}`;
  }

  // ---------- Prompts ----------
  getSignPrompt() {
    return `Hey! I'm Echo 🌟\nYour personal astrology companion.\nStep 1 of 5: What's your zodiac sign? (or give birthday DD/MM/YYYY)`;
  }

  getVibePrompt(sign) {
    const emoji = sign ? this.getSignEmoji(sign) : "";
    return `${emoji ? `Perfect — you're a ${sign}!` : "Great!"}\nStep 2 of 5: Pick your vibe (🔮 mystical, 💬 bestie, 📚 scholar)`;
  }

  // ---------- Sign / DOB handling ----------
  async handleSignOrDob(text, user) {
    const signCandidate = this.extractSign(text);
    if (signCandidate) {
      const element = await this.safeGetElement(signCandidate);
      await this.safeDbUpdate(user.chat_id, { sign: signCandidate, element, stage: "get_style" });
      return this.getVibePrompt(signCandidate);
    }
    if (user.stage === "get_sign_structured") {
      return await this.handleStructuredDob(text, user);
    }
    if (!text) {
      await this.safeDbUpdate(user.chat_id, { stage: "get_sign" });
      return this.getSignPrompt();
    }
    if (this.dobRegex.test(text)) {
      const validation = this.validateDob(text);
      if (!validation.valid) {
        await this.incrementDobAttempts(user);
        return validation.error;
      }
      const iso = validation.iso;
      const sign = await this.safeCalculateSign(iso);
      const element = sign ? await this.safeGetElement(sign) : null;
      await this.safeDbUpdate(user.chat_id, { birth_date: iso, sign, element, stage: "get_style" });
      return this.getVibePrompt(sign);
    }
    await this.incrementDobAttempts(user);
    return this.dobFailMessage(user);
  }

  validateDob(text) {
    const iso = this.ddmmyyyyToISO(text);
    if (!iso) return { valid: false, error: "Please use DD/MM/YYYY format like 15/08/1999." };
    const date = new Date(iso);
    if (date > new Date()) return { valid: false, error: "Date cannot be in the future." };
    const age = this.calculateAge(iso);
    if (age < 13) return { valid: false, error: "You must be at least 13 years old." };
    if (age > 120) return { valid: false, error: "Age seems unrealistic, please check your date." };
    const [y, m, d] = iso.split("-").map(Number);
    if (m === 2 && d === 29 && !this.isLeapYear(y)) return { valid: false, error: `${y} is not a leap year, Feb 29 invalid.` };
    return { valid: true, iso };
  }

  isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  async handleStructuredDob(text, user) {
    if (!text) {
      return `Send birthday parts like:\n• day 15\n• month 08\n• year 1999`;
    }
    const lower = text.toLowerCase();
    const dayMatch = lower.match(/day\s*(\d{1,2})/);
    const monthMatch = lower.match(/month\s*(\d{1,2})/);
    const yearMatch = lower.match(/year\s*((?:19|20)\d{2})/);
    let temp = {};
    try {
      if (user.last_interaction && user.last_interaction.startsWith("{")) {
        temp = JSON.parse(user.last_interaction);
      }
    } catch (_) { }
    if (dayMatch) temp._day = parseInt(dayMatch[1]);
    if (monthMatch) temp._month = parseInt(monthMatch[1]);
    if (yearMatch) temp._year = parseInt(yearMatch[1]);
    await this.safeDbUpdate(user.chat_id, { last_interaction: JSON.stringify(temp), stage: "get_sign_structured" });
    if (temp._day && temp._month && temp._year) {
      const candidate = `${String(temp._day).padStart(2, "0")}/${String(temp._month).padStart(2, "0")}/${temp._year}`;
      if (this.dobRegex.test(candidate)) {
        const validation = this.validateDob(candidate);
        if (!validation.valid) {
          await this.safeDbUpdate(user.chat_id, { last_interaction: null });
          return validation.error;
        }
        const iso = validation.iso;
        const sign = await this.safeCalculateSign(iso);
        const element = sign ? await this.safeGetElement(sign) : null;
        await this.safeDbUpdate(user.chat_id, { birth_date: iso, sign, element, stage: "get_style", last_interaction: null });
        return this.getVibePrompt(sign);
      }
      await this.safeDbUpdate(user.chat_id, { last_interaction: null });
      return "That combination doesn't form a valid date. Try again.";
    }
    const missing = [];
    if (!temp._day) missing.push("day");
    if (!temp._month) missing.push("month");
    if (!temp._year) missing.push("year");
    return `Missing ${missing.join(", ")}. Please send them.`;
  }

  async safeCalculateSign(iso) {
    try { return await this.astrology.calculateSign(iso); } catch (e) { this.logger.error(e); return null; }
  }

  async safeGetElement(sign) {
    try { return await this.astrology.getElement(sign); } catch (e) { this.logger.error(e); return null; }
  }

  extractSign(text) {
    if (!text) return null;
    const normalized = text.toLowerCase().replace(/[^a-z]/g, "");
    const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
    const found = signs.find(s => normalized.includes(s));
    return found ? this.capitalize(found) : null;
  }

  getSignEmoji(sign) {
    const map = { Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓" };
    return map[sign] || "";
  }

  dobFailMessage(user) {
    const attempts = this.getDobAttempts(user);
    if (attempts >= 2) {
      return "I still couldn't read that. Let's do it step‑by‑step: send 'day 15', 'month 08', 'year 1999'.";
    }
    return "Please provide your birthday in DD/MM/YYYY format like 15/08/1999.";
  }

  // ---------- Vibe handling ----------
  async handleVibe(text, user) {
    const cleaned = (text || "").trim();
    if (!cleaned) {
      await this.safeDbUpdate(user.chat_id, { stage: "get_style" });
      return `Pick your vibe: 🔮 mystical, 💬 bestie, 📚 scholar`;
    }
    const emoji = Object.keys(this.vibes).find(e => cleaned.includes(e));
    if (emoji) {
      const style = this.vibes[emoji];
      await this.saveVibeAndAdvance(user, style);
      return `Love it! step 3 of 5: what should I call you?`;
    }
    const detected = this.detectVibeFromText(cleaned);
    if (detected) {
      await this.saveVibeAndAdvance(user, detected);
      return `Love it! step 3 of 5: what should I call you?`;
    }
    return `I didn't get that. Send an emoji (🔮💬📚) or type mystical, bestie, scholar.`;
  }

  detectVibeFromText(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    for (const [vibe, patterns] of Object.entries(this.vibePatterns)) {
      if (patterns.some(p => lower.includes(p))) return vibe;
    }
    if (/^[1]/.test(lower)) return "mystical";
    if (/^[2]/.test(lower)) return "bestie";
    if (/^[3]/.test(lower)) return "scholar";
    return null;
  }

  async saveVibeAndAdvance(user, style) {
    const patch = { preferred_conversation_style: style, stage: "get_name" };
    if (this.personality && typeof this.personality.getProfile === "function") {
      try {
        const profile = await this.personality.getProfile(style);
        if (profile) {
          patch.personality_profile = profile;
          if (profile.meta?.version) patch.personality_version = profile.meta.version;
        }
      } catch (e) { this.logger.warn(e); }
    }
    await this.safeDbUpdate(user.chat_id, patch);
  }

  // ---------- Name handling ----------
  async handleName(text, user) {
    const cleaned = this.sanitizeInput((text || "").trim());
    if (!cleaned) {
      await this.safeDbUpdate(user.chat_id, { stage: "get_name" });
      return `What should I call you?`;
    }
    if (/^skip$/i.test(cleaned)) {
      await this.safeDbUpdate(user.chat_id, { stage: "get_time" });
      return `No worries, we'll ask later for a nickname.`;
    }
    const name = this.extractName(cleaned);
    if (!name) return `That doesn't look like a name. Try something simple like "Asha".`;
    await this.safeDbUpdate(user.chat_id, { name, stage: "get_time" });
    return `Awesome ${name}! step 4 of 5: do you know your birth time? (e.g., '5:30 pm')`;
  }

  extractName(text) {
    const cleaned = text.trim();
    if (!cleaned || cleaned.length > 50) return null;
    if (/[\d\/\\@#$%^&*()]/.test(cleaned)) return null;
    if (/\b(admin|root|system|bot|Echo)\b/i.test(cleaned)) return null;
    return cleaned.split(/\s+/).map(s => this.capitalize(s)).join(" ");
  }

  // ---------- Birth time handling ----------
  async handleBirthTime(text, user) {
    if (!text) {
      await this.safeDbUpdate(user.chat_id, { stage: "get_time" });
      return `Do you know your birth time? e.g., '5:30 pm'`;
    }
    const t = text.toLowerCase().trim();
    if (/^(skip|no idea|dont know|idk)$/i.test(t)) {
      await this.finishOnboarding(user);
      return this.finalSuccessMessage(user);
    }
    const parsed = this.parseTimeFuzzy(t);
    if (!parsed) return `Couldn't understand that time. Try '5pm' or '17:00'.`;
    await this.safeDbUpdate(user.chat_id, { birth_time: parsed, stage: "get_location" });
    return `Got it! Last question: where were you born? (city, country)`;
  }

  // ---------- Location handling ----------
  async handleLocation(text, user) {
    if (!text) return `Where were you born? (city, country)`;
    const locationStr = this.sanitizeInput(text);
    const coords = await AstrologyService.calculateCoordinates(locationStr);
    const fresh = await this.db.getUser(user.chat_id);
    let chart = null;
    if (fresh.birth_date && fresh.birth_time) {
      chart = AstrologyService.calculateNatalChart(fresh.birth_date, fresh.birth_time, coords.lat, coords.lon);
    }
    await this.safeDbUpdate(user.chat_id, {
      birth_city: coords.formatted_city || locationStr,
      latitude: coords.lat,
      longitude: coords.lon,
      astrology_chart: chart,
      stage: "complete",
      created_at: new Date().toISOString(),
    });
    this.trackEvent("onboarding_complete", { userId: user.chat_id, hasName: !!fresh.name, hasBirthTime: !!fresh.birth_time, sign: fresh.sign, chart: !!chart });
    return this.finalSuccessMessage(fresh);
  }

  // ---------- Completion ----------
  async finishOnboarding(user) {
    await this.safeDbUpdate(user.chat_id, { stage: "complete", created_at: new Date().toISOString() });
    this.trackEvent("onboarding_complete", { userId: user.chat_id, hasName: !!user.name, hasBirthTime: !!user.birth_time, sign: user.sign });
  }

  finalSuccessMessage(user) {
    const name = user.name || "friend";
    const sign = user.sign || "your sign";
    const birthTime = user.birth_time ? ` (birth time: ${user.birth_time})` : "";
    if (this.personality && user.preferred_conversation_style) {
      try {
        const welcome = this.personality.generateWelcome(user.preferred_conversation_style, name, sign);
        if (welcome) return welcome;
      } catch (e) { this.logger.warn(e); }
    }
    const msgs = {
      mystical: `Perfect 💫 ${name}! Your profile is complete${birthTime}. As a ${sign}, expect daily guidance.`,
      bestie: `Yaaas ${name}! All set${birthTime}. As a ${sign}, you'll get daily cosmic tea.`,
      scholar: `Excellent ${name}. Your profile is ready${birthTime}. As a ${sign}, expect detailed analyses.`,
    };
    return msgs[user.preferred_conversation_style] || msgs.bestie;
  }

  // ---------- Date utilities ----------
  ddmmyyyyToISO(ddmmyyyy) {
    const m = ddmmyyyy.match(this.dobRegex);
    if (!m) return null;
    const day = parseInt(m[1]), month = parseInt(m[2]), year = parseInt(m[3]);
    if (month < 1 || month > 12) return null;
    const daysInMonth = [31, this.isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day < 1 || day > daysInMonth[month - 1]) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    return isNaN(date) ? null : date.toISOString().split("T")[0];
  }

  formatBirthDate(iso) {
    try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); } catch { return iso; }
  }

  calculateAge(iso) {
    const birth = new Date(iso);
    const now = new Date();
    let age = now.getUTCFullYear() - birth.getUTCFullYear();
    const mNow = now.getUTCMonth(), mBirth = birth.getUTCMonth();
    const dNow = now.getUTCDate(), dBirth = birth.getUTCDate();
    if (mNow < mBirth || (mNow === mBirth && dNow < dBirth)) age--;
    return age;
  }

  capitalize(s) { return s && s.length ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s; }

  // ---------- Time parsing ----------
  parseTimeFuzzy(text) {
    if (!text) return null;
    const t = text.toLowerCase().replace(/[^0-9apm:\s]/g, "").trim();
    let m = t.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
    if (m) {
      let h = parseInt(m[1]), min = parseInt(m[2]), mer = (m[3] || "").toLowerCase();
      if (h === 24 && min === 0) return "00:00";
      if (mer === "pm" && h < 12) h += 12;
      if (mer === "am" && h === 12) h = 0;
      if (h >= 0 && h < 24 && min >= 0 && min < 60) return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
    }
    m = t.match(/^(\d{1,2})(?:\s*(am|pm))$/i);
    if (m) {
      let h = parseInt(m[1]), mer = (m[2] || "").toLowerCase();
      if (mer === "pm" && h < 12) h += 12;
      if (mer === "am" && h === 12) h = 0;
      if (h >= 0 && h < 24) return `${String(h).padStart(2, "0")}:00`;
    }
    m = t.match(/(\d{1,2})(?:ish)?/);
    if (m) {
      let h = parseInt(m[1]);
      if (h === 24) h = 0;
      if (h >= 1 && h <= 6 && !t.includes("am") && !t.includes("pm")) h += 12;
      if (h >= 0 && h <= 23) return `${String(h).padStart(2, "0")}:00`;
    }
    return null;
  }

  // ---------- DOB attempts ----------
  getDobAttempts(user) {
    try {
      const last = user.last_interaction || "";
      if (last.startsWith("{")) return user.dob_attempts || 0;
      const m = last.match(/dob_attempts:(\d+)/);
      if (m) return parseInt(m[1]);
    } catch (e) { this.logger.warn(e); }
    return 0;
  }

  async incrementDobAttempts(user) {
    const attempts = this.getDobAttempts(user) + 1;
    if (attempts >= 2) {
      await this.safeDbUpdate(user.chat_id, { dob_attempts: attempts, stage: "get_sign_structured", last_interaction: null });
    } else {
      await this.safeDbUpdate(user.chat_id, { dob_attempts: attempts });
    }
  }

  // ---------- Analytics ----------
  trackEvent(name, props = {}) {
    if (this.analytics) {
      try { this.analytics.track(name, { ...props, timestamp: new Date().toISOString() }); } catch (e) { this.logger.warn(e); }
    }
  }
}

export default OnboardingHandler;