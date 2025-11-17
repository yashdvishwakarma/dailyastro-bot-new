
import PersonalityService from "../services/PersonalityService.js";
// OnboardingHandler.js - Stella onboarding (ENHANCED VERSION)
// Improvements in this version:
// 1) Added comprehensive error handling for all database operations
// 2) Fixed structured DOB state recovery from last_interaction
// 3) Added timezone capture for birth time
// 4) Enhanced input sanitization for XSS prevention
// 5) Added restart/reset functionality
// 6) Added future date and leap year validation
// 7) Proper cleanup of temporary storage
// 8) Added logging support
// 9) Added confirmation step before finalizing
// 10) Added analytics tracking points

// OnboardingHandler.js - Stella onboarding (STREAMLINED VERSION)
// Updates in this version:
// 1) Removed timezone handling - not needed
// 2) Removed confirmation step - go straight to completion
// 3) Enhanced vibe detection to accept text like "mystical", "bestie", "scholar" etc.
// 4) Now only 3 steps instead of 4

class OnboardingHandler {
  constructor(services) {
    this.db = services.database;
    this.astrology = services.astrology;
    this.personality = services.personality || null;
    this.logger = services.logger || console;
    this.analytics = services.analytics || null;

    // strict DD/MM/YYYY regex (accepts 1900-2099)
    this.dobRegex =
      /^(0?[1-9]|[12][0-9]|3[01])\/(0?[1-9]|1[0-2])\/((?:19|20)\d{2})$/;

    // valid vibe emojis map
    this.vibes = {
      "🔮": "mystical",
      "💬": "bestie",
      "📚": "scholar",
    };

    // Text-based vibe detection patterns
    this.vibePatterns = {
      mystical: ["mystical", "maven", "spiritual", "deep", "mystic", "🔮"],
      bestie: [
        "bestie",
        "cosmic bestie",
        "fun",
        "real",
        "friend",
        "casual",
        "💬",
      ],
      scholar: [
        "scholar",
        "detailed",
        "logical",
        "academic",
        "analytical",
        "📚",
      ],
    };
  }

  // Entry point with error handling
  async handle(message, user) {
    try {
      console.log("User state:", {
        stage: user.stage,
        name: user.name,
        sign: user.sign,
      });
      // Normalize and sanitize incoming message
      const text = this.sanitizeInput((message || "").toString().trim());

      // Check for restart command at any stage
      if (this.isRestartCommand(text) && user.stage !== "start") {
        return await this.handleRestart(user);
      }

      // Ensure stage exists on user
      const stage = user.stage || "start";

      // Track analytics
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

        case "complete":
          return `You're already onboarded! Say "menu" or ask me for today's reading. (Say "restart" to start over)`;

        default:
          // fallback to start
          await this.safeDbUpdate(user.chat_id, { stage: "get_sign" });
          return this.getSignPrompt();
      }
    } catch (error) {
      this.logger.error("OnboardingHandler error:", error);
      return `Sorry, something went wrong. Please try again or say "restart" to start over.`;
    }
  }

  // ---------- Input Sanitization ----------
  sanitizeInput(text) {
    // Remove potential XSS vectors while preserving legitimate characters
    return text.replace(/[<>\"'&]/g, "").substring(0, 500);
  }

  // ---------- Restart Functionality ----------
  isRestartCommand(text) {
    return /^(restart|reset|start over|begin again)$/i.test(text);
  }

  async handleRestart(user) {
    try {
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
    } catch (error) {
      this.logger.error("Restart failed:", error);
      return `Sorry, I couldn't restart the onboarding. Please try again.`;
    }
  }

  // ---------- Database Operations with Error Handling ----------
  async safeDbUpdate(chatId, patch) {
    console.log("Updating user:", { chatId, patch });
    try {
      const result = await this.db.updateUser(chatId, patch);
      console.log("DB update result:", result);
      return true;
    } catch (error) {
      this.logger.error("Database update failed:", { chatId, patch, error });
      throw error;
    }
  }

  // ---------- Stage handlers ----------
  getSignPrompt() {
    return `Hey! I'm Echo 🌟\nYour personal astrology companion.\n\nEvery morning I'll send you guidance based on the stars — all personalised to you.\n\nReady? This takes 30 seconds.\n\nStep 1 of 3:\nWhat's your zodiac sign? (or just tell me your birthday in DD/MM/YYYY)\n\n💡 Tip: Say "restart" anytime to start over.`;
  }

  async handleSignOrDob(text, user) {
    try {
      // If user provided a zodiac sign name
      const signCandidate = this.extractSign(text);
      if (signCandidate) {
        const element = await this.safeGetElement(signCandidate);
        await this.safeDbUpdate(user.chat_id, {
          sign: signCandidate,
          element: element,
          stage: "get_style",
        });
        return this.getVibePrompt(signCandidate);
      }

      // If structured fallback stage
      if (user.stage === "get_sign_structured") {
        return await this.handleStructuredDob(text, user);
      }

      // Otherwise expect strict DD/MM/YYYY
      if (!text) {
        await this.safeDbUpdate(user.chat_id, { stage: "get_sign" });
        return this.getSignPrompt();
      }

      if (this.dobRegex.test(text)) {
        const validationResult = this.validateDob(text);
        if (!validationResult.valid) {
          await this.incrementDobAttempts(user);
          return validationResult.error;
        }

        const iso = validationResult.iso;

        // Calculate sign with error handling
        const sign = await this.safeCalculateSign(iso);
        const element = sign ? await this.safeGetElement(sign) : null;

        await this.safeDbUpdate(user.chat_id, {
          birth_date: iso,
          sign: sign,
          element: element,
          stage: "get_style",
        });

        return this.getVibePrompt(sign, iso);
      }

      // not matched
      await this.incrementDobAttempts(user);
      return this.dobFailMessage(user);
    } catch (error) {
      this.logger.error("handleSignOrDob error:", error);
      return `Sorry, something went wrong. Please try again.`;
    }
  }

  getVibePrompt(sign, birthDate = null) {
    const signEmoji = sign ? this.getSignEmoji(sign) : "";
    const intro = birthDate
      ? `Perfect — your birthday is ${this.formatBirthDate(birthDate)}. ${
          sign ? `You're a ${sign}` : "I detected your sign"
        }.`
      : `Perfect! ${signEmoji}`;

    return `${intro}\n\nStep 2 of 3: Pick your vibe\nHow should I talk to you?\n\n🔮 Mystical Maven – deep & spiritual\n💬 Cosmic Bestie – fun & real\n📚 Star Scholar – detailed & logical\n\nJust reply with the emoji or type your choice (mystical/bestie/scholar)!`;
  }

  // Enhanced DOB validation
  validateDob(text) {
    const iso = this.ddmmyyyyToISO(text);
    if (!iso) {
      return {
        valid: false,
        error: `I couldn't parse that date. Please use DD/MM/YYYY format like 15/08/1999.`,
      };
    }

    // Check for future dates
    const date = new Date(iso);
    if (date > new Date()) {
      return {
        valid: false,
        error: `That date is in the future! Please enter your actual birthday in DD/MM/YYYY format.`,
      };
    }

    // Check age range
    const age = this.calculateAge(iso);
    if (age < 13) {
      return {
        valid: false,
        error: `You must be at least 13 years old to use this service.`,
      };
    }
    if (age > 120) {
      return {
        valid: false,
        error: `That date seems unlikely. Please check and re-enter your birthday in DD/MM/YYYY format.`,
      };
    }

    // Validate leap year dates
    const [year, month, day] = iso.split("-").map(Number);
    if (month === 2 && day === 29 && !this.isLeapYear(year)) {
      return {
        valid: false,
        error: `${year} wasn't a leap year, so February 29 doesn't exist for that year.`,
      };
    }

    return { valid: true, iso };
  }

  isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  // Structured DOB handler with proper state recovery
  async handleStructuredDob(text, user) {
    try {
      if (!text) {
        return `Okay — send your birthday in parts: \n• day 15\n• month 08\n• year 1999\nI'll stitch them together.`;
      }

      const lower = text.toLowerCase().trim();
      const dayMatch = lower.match(/day\s*(\d{1,2})/);
      const monthMatch = lower.match(/month\s*(\d{1,2})/);
      const yearMatch = lower.match(/year\s*((?:19|20)\d{2})/);

      // Parse existing temp data from last_interaction
      let temp = {};
      try {
        if (user.last_interaction && user.last_interaction.startsWith("{")) {
          temp = JSON.parse(user.last_interaction);
        }
      } catch (e) {
        this.logger.warn("Failed to parse last_interaction:", e);
      }

      // Update with new values
      if (dayMatch) temp._day = parseInt(dayMatch[1], 10);
      if (monthMatch) temp._month = parseInt(monthMatch[1], 10);
      if (yearMatch) temp._year = parseInt(yearMatch[1], 10);

      // Save temp back to DB
      await this.safeDbUpdate(user.chat_id, {
        last_interaction: JSON.stringify(temp),
        stage: "get_sign_structured",
      });

      if (temp._day && temp._month && temp._year) {
        const dd = String(temp._day).padStart(2, "0");
        const mm = String(temp._month).padStart(2, "0");
        const yyyy = String(temp._year);
        const candidate = `${dd}/${mm}/${yyyy}`;

        if (this.dobRegex.test(candidate)) {
          const validationResult = this.validateDob(candidate);
          if (!validationResult.valid) {
            // Clear temp storage and return error
            await this.safeDbUpdate(user.chat_id, { last_interaction: null });
            return validationResult.error;
          }

          const iso = validationResult.iso;
          const sign = await this.safeCalculateSign(iso);
          const element = sign ? await this.safeGetElement(sign) : null;

          // Clear temp storage and advance
          await this.safeDbUpdate(user.chat_id, {
            birth_date: iso,
            sign: sign,
            element: element,
            stage: "get_style",
            last_interaction: null,
          });

          return this.getVibePrompt(sign, iso);
        }

        // if constructed date invalid
        await this.safeDbUpdate(user.chat_id, { last_interaction: null });
        return `That combination doesn't form a valid date. Try again: day 15, month 08, year 1999.`;
      }

      // Ask for whatever is missing
      const missing = [];
      if (!temp._day) missing.push("day");
      if (!temp._month) missing.push("month");
      if (!temp._year) missing.push("year");
      return `Almost there — send the ${missing.join(" and ")} (e.g. '${
        missing[0]
      } ${
        missing[0] === "day" ? "15" : missing[0] === "month" ? "08" : "1999"
      }').`;
    } catch (error) {
      this.logger.error("handleStructuredDob error:", error);
      return `Sorry, something went wrong. Please try again or say "restart".`;
    }
  }

  // Safe astrology service calls
  async safeCalculateSign(isoDate) {
    try {
      return await this.astrology.calculateSign(isoDate);
    } catch (error) {
      this.logger.error("Failed to calculate sign:", error);
      return null;
    }
  }

  async safeGetElement(sign) {
    try {
      return await this.astrology.getElement(sign);
    } catch (error) {
      this.logger.error("Failed to get element:", error);
      return null;
    }
  }

  extractSign(text) {
    if (!text) return null;
    const normalized = text.toLowerCase().replace(/[^a-z]/g, "");
    const signs = [
      "aries",
      "taurus",
      "gemini",
      "cancer",
      "leo",
      "virgo",
      "libra",
      "scorpio",
      "sagittarius",
      "capricorn",
      "aquarius",
      "pisces",
    ];
    const found = signs.find((s) => normalized.includes(s));
    return found ? this.capitalize(found) : null;
  }

  getSignEmoji(sign) {
    const map = {
      Aries: "♈",
      Taurus: "♉",
      Gemini: "♊",
      Cancer: "♋",
      Leo: "♌",
      Virgo: "♍",
      Libra: "♎",
      Scorpio: "♏",
      Sagittarius: "♐",
      Capricorn: "♑",
      Aquarius: "♒",
      Pisces: "♓",
    };
    return map[sign] || "";
  }

  dobFailMessage(user) {
    const attempts = this.getDobAttempts(user);
    if (attempts >= 2) {
      return `I still couldn't read that. Let's do it step-by-step — reply with:\n• 'day 15'\n• 'month 08'\n• 'year 1999'\nI'll stitch them together.`;
    }
    return `Got it — but I need your birthday in DD/MM/YYYY format like 15/08/1999 ✨`;
  }

  // Enhanced vibe handler with emoji + text + personality integration
  async handleVibe(text, user) {
    try {
      const cleaned = (text || "").trim();

      if (!cleaned) {
        await this.safeDbUpdate(user.chat_id, { stage: "get_style" });
        return `Step 2 of 3: Pick your vibe — reply with an emoji (🔮 💬 📚) or type your choice (mystical/bestie/scholar)`;
      }

      // 1️⃣ Emoji-based selection
      const emoji = Object.keys(this.vibes).find((e) => cleaned.includes(e));
      if (emoji) {
        const style = this.vibes[emoji]; // mystical | bestie | scholar
        await this.saveVibeAndAdvance(user, style);
        return `Love it! ✨\n\nFinal step: What should I call you? `;
      }

      // 2️⃣ Text-based selection (e.g. "mystical", "bestie", "scholar", "fun vibe")
      const detectedStyle = this.detectVibeFromText
        ? this.detectVibeFromText(cleaned)
        : null;

      if (detectedStyle) {
        await this.saveVibeAndAdvance(user, detectedStyle);
        return `Love it! ✨\n\nFinal step: What should I call you?`;
      }

      // 3️⃣ Not understood
      return `I didn't catch that. Please:\n• Send an emoji: 🔮 💬 or 📚\n• Or type: mystical, bestie, or scholar`;
    } catch (error) {
      this.logger?.error?.("handleVibe error:", error);
      return `Sorry, something went wrong. Please try again.`;
    }
  }

  // Helper to detect vibe from text input
  // detectVibeFromText(text) {
  //   if (!text) return null;
  //   const lower = text.toLowerCase().trim();

  //   // Check each vibe pattern
  //   for (const [vibe, patterns] of Object.entries(this.vibePatterns)) {
  //     if (patterns.some(pattern => lower.includes(pattern))) {
  //       return vibe;
  //     }
  //   }

  //   // Check for numbered selection (1, 2, 3)
  //   if (/^[1]/.test(lower)) return 'mystical';
  //   if (/^[2]/.test(lower)) return 'bestie';
  //   if (/^[3]/.test(lower)) return 'scholar';

  //   return null;
  // }
  detectVibeFromText(text) {
    if (!text) return null;
    const lower = text.toLowerCase().trim();

    // Check each vibe pattern
    for (const [vibe, patterns] of Object.entries(this.vibePatterns)) {
      if (patterns.some((pattern) => lower.includes(pattern))) {
        return vibe;
      }
    }

    // Check for numbered selection (1, 2, 3)
    if (/^[1]/.test(lower)) return "mystical";
    if (/^[2]/.test(lower)) return "bestie";
    if (/^[3]/.test(lower)) return "scholar";

    return null;
  }

  async saveVibeAndAdvance(user, style) {
    // Base patch: always store style & advance stage
    const patch = {
      preferred_conversation_style: style, // 'mystical' | 'bestie' | 'scholar'
      stage: "get_name",
    };

    // Try to enrich with personality profile + version if service is available
    if (this.personality && typeof this.personality.getProfile === "function") {
      try {
        const personalityProfile = await this.personality.getProfile(style);

        if (personalityProfile) {
          // Optional: store full profile (JSON) – remove this line if you don't want it in DB
          patch.personality_profile = personalityProfile;

          // Store version so you can track/migrate later
          if (personalityProfile.meta?.version) {
            patch.personality_version = personalityProfile.meta.version;
          }
        }
      } catch (error) {
        this.logger?.warn?.(
          "Personality service failed, continuing without:",
          error
        );
        // We still proceed with base patch
      }
    }

    // Use safeDbUpdate if your handler defines it, otherwise fall back to db.updateUser
    if (typeof this.safeDbUpdate === "function") {
      await this.safeDbUpdate(user.chat_id, patch);
    } else {
      await this.db.updateUser(user.chat_id, patch);
    }
  }

  // Enhanced name handler with better validation
  async handleName(text, user) {
    try {
      const cleaned = this.sanitizeInput((text || "").trim());

      if (!cleaned) {
        await this.safeDbUpdate(user.chat_id, { stage: "get_name" });
        user = await this.db.getUser(user.chat_id);
        return `Final step: What should I call you?`;
      }
      debugger;
      if (/^skip$/i.test(cleaned)) {
        await this.safeDbUpdate(user.chat_id, { stage: "get_time" });
        return `No worries — we'll use a nickname later.\n\nOne last thing (optional): Do you know your birth time? Even a rough guess works (e.g., 'around 5pm' or '17:00').`;
      }

      const name = this.extractName(cleaned);
      if (!name) {
        return `That doesn't look like a name. Try something simple like "Asha" or "Rahul".`;
      }

      await this.safeDbUpdate(user.chat_id, { name, stage: "get_time" });

      return `Awesome ${name}! You're almost there 🎉\n\nOne last thing (optional): Do you know your birth time? Even a rough guess works (e.g., 'around 5pm' or '17:00').`;
    } catch (error) {
      this.logger.error("handleName error:", error);
      return `Sorry, something went wrong. Please try again.`;
    }
  }

  extractName(text) {
    const cleaned = text.trim();

    // Enhanced validation
    if (cleaned.length === 0 || cleaned.length > 50) return null;
    if (/[\d\/\\@#$%^&*()]/.test(cleaned)) return null; // Block more special chars
    if (/\b(admin|root|system|bot|Echo)\b/i.test(cleaned)) return null; // Block reserved names

    // Capitalize properly
    return cleaned
      .split(/\s+/)
      .map((s) => this.capitalize(s))
      .join(" ");
  }

  // Birth time handler - now goes straight to completion (no confirmation)
  async handleBirthTime(text, user) {
          console.log("time text is the code coming here ??? ", text);
    try {
      console.log("time text is the code coming here ??? ", text);
      if (!text) {
        await this.safeDbUpdate(user.chat_id, { stage: "get_time" });
        user = await this.db.getUser(user.chat_id);
        return `Do you know your birth time? e.g., '5:30 pm', '17:00', 'around 7am'.`;
      }

      const t = text.toLowerCase().trim();
      if (/^(skip|no idea|dont know|don't know|idk)$/i.test(t)) {
        // Complete onboarding without birth time
        await this.finishOnboarding(user);
        return this.finalSuccessMessage(user);
      }

      const parsed = this.parseTimeFuzzy(t);
      this.logger.info("Updating birth_time:", {
        chatId: user.chat_id,
        parsed,
        updatePayload: { birth_time: parsed, stage: "complete" },
      });
      if (!parsed) {
        return `I couldn't understand that time. Try '5pm', '5:30 pm', '17:00', 'around 8am'.`;
      }

      // Save time and complete onboarding immediately
      await this.safeDbUpdate(user.chat_id, {
        birth_time: parsed,
        stage: "complete",
        created_at: new Date().toISOString(),
      });

      // Track completion
      this.trackEvent("onboarding_complete", {
        userId: user.chat_id,
        hasName: !!user.name,
        hasBirthTime: true,
        sign: user.sign,
      });

      return this.finalSuccessMessage({ ...user, birth_time: parsed });
    } catch (error) {
      this.logger.error("handleBirthTime error:", error);
      return `Sorry, something went wrong. Please try again.`;
    }
  }
  async finishOnboarding(user) {
    try {
      await this.safeDbUpdate(user.chat_id, {
        stage: "complete",
        created_at: new Date().toISOString(),
      });

      // Track successful completion
      this.trackEvent("onboarding_complete", {
        userId: user.chat_id,
        hasName: !!user.name,
        hasBirthTime: false,
        sign: user.sign,
      });
    } catch (error) {
      this.logger.error("finishOnboarding error:", error);
      throw error;
    }
  }

  finalSuccessMessage(user) {
    const name = user.name || "friend";
    const sign = user.sign || "your sign";
    const birthTime = user.birth_time
      ? ` (birth time: ${user.birth_time})`
      : "";

    // Use personality service to generate personalized welcome if available
    if (this.personality && user.preferred_conversation_style) {
      try {
        const personalizedWelcome = this.PersonalityService.generateWelcome(
          user.preferred_conversation_style,
          name,
          sign
        );
        if (personalizedWelcome) {
          return personalizedWelcome;
        }
      } catch (error) {
        this.logger.warn("Personality service failed for welcome:", error);
      }
    }

    // Style-specific welcome messages
    const styleMessages = {
      mystical: `Perfect 💫\nThe cosmos have aligned, ${name}! Your celestial profile is complete${birthTime}.\n\nAs a ${sign}, the universe has unique messages for you. I'll decode the stars and send you divine guidance every morning at 9 AM.\n\nYour spiritual journey begins now. Say "reading" for today's cosmic wisdom, or "menu" to explore your mystical options.\n\n✨ May the stars guide your path ✨`,

      bestie: `Yaaas ${name}! We're all set! 🎉${birthTime}\n\nOkay so as a ${sign}, you've got some AMAZING energy coming your way! I'll slide into your DMs every morning at 9 AM with your daily cosmic tea ☕️\n\nWanna hear today's vibe? Just say "reading"! Or hit me with "menu" to see what else we can do together!\n\nThis is gonna be fun! 💫`,

      scholar: `Excellent, ${name}. Your astrological profile has been successfully configured${birthTime}.\n\nBased on your ${sign} sun sign placement, I'll provide detailed astrological analysis daily at 09:00. Each reading incorporates planetary transits, house positions, and aspect patterns relevant to your chart.\n\nCommands available:\n• "reading" - Today's detailed analysis\n• "menu" - Full command list\n• "compatibility" - Relationship insights\n\nYour personalized astrological journey begins now. 📊`,
    };

    const style = user.preferred_conversation_style || "bestie";
    return styleMessages[style] || styleMessages.bestie;
  }

  // ---------- Utilities ----------
  ddmmyyyyToISO(ddmmyyyy) {
    const m = ddmmyyyy.match(this.dobRegex);
    if (!m) return null;
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);

    // Validate day/month ranges
    if (month < 1 || month > 12) return null;
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (this.isLeapYear(year)) daysInMonth[1] = 29;
    if (day < 1 || day > daysInMonth[month - 1]) return null;

    // JS Date uses MM-1 — use UTC to avoid timezone shifts
    const date = new Date(Date.UTC(year, month - 1, day));
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split("T")[0]; // YYYY-MM-DD
  }

  formatBirthDate(isoDate) {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (error) {
      return isoDate;
    }
  }

  calculateAge(isoDate) {
    const birth = new Date(isoDate);
    const now = new Date();
    let age = now.getUTCFullYear() - birth.getUTCFullYear();
    const mNow = now.getUTCMonth();
    const mBirth = birth.getUTCMonth();
    const dNow = now.getUTCDate();
    const dBirth = birth.getUTCDate();
    if (mNow < mBirth || (mNow === mBirth && dNow < dBirth)) age--;
    return age;
  }

  capitalize(s) {
    return s && s.length ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
  }

  // Enhanced fuzzy time parser with better patterns
  parseTimeFuzzy(text) {
    if (!text) return null;
    const t = text
      .toLowerCase()
      .replace(/[^0-9apm:\s]/g, "")
      .trim();

    // Pattern 1: HH:MM with optional am/pm
    let m = t.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/i);
    if (m) {
      let hour = parseInt(m[1], 10);
      const minute = parseInt(m[2], 10);
      const meridian = (m[3] || "").toLowerCase();

      // Special-case: allow 24:00 -> 00:00
      if (hour === 24 && minute === 0) {
        return "00:00";
      }

      // Handle 12-hour format
      if (meridian === "pm" && hour < 12) hour += 12;
      if (meridian === "am" && hour === 12) hour = 0;

      if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) {
        return `${String(hour).padStart(2, "0")}:${String(minute).padStart(
          2,
          "0"
        )}`;
      }
    }

    // Pattern 2: Simple hour with am/pm
    m = t.match(/^(\d{1,2})(?:\s*(am|pm))$/i);
    if (m) {
      let hour = parseInt(m[1], 10);
      const meridian = (m[2] || "").toLowerCase();

      if (meridian === "pm" && hour < 12) hour += 12;
      if (meridian === "am" && hour === 12) hour = 0;

      if (hour >= 0 && hour < 24) {
        return `${String(hour).padStart(2, "0")}:00`;
      }
    }

    // Pattern 3: "around X", "about X", "Xish"
    m = t.match(/(\d{1,2})(?:ish)?/);
    if (m) {
      let hour = parseInt(m[1], 10);
      if (hour === 24) hour = 0;

      // For ambiguous times without AM/PM, make educated guess
      // Assume times 1-6 without AM/PM are PM (afternoon/evening)
      // Assume times 7-11 without AM/PM are AM (morning)
      // Times 12+ are kept as-is (24-hour format)
      if (hour >= 1 && hour <= 6 && !t.includes("am") && !t.includes("pm")) {
        hour += 12;
      }

      if (hour >= 0 && hour <= 23) {
        return `${String(hour).padStart(2, "0")}:00`;
      }
    }

    return null;
  }

  // ---------- DOB attempt tracking and fallback ----------
  getDobAttempts(user) {
    try {
      const last = user.last_interaction || "";

      // Check if it's a JSON object (structured DOB data)
      if (last.startsWith("{")) {
        // Look for dob_attempts in a different field or default to 0
        return user.dob_attempts || 0;
      }

      // Legacy format: dob_attempts:N
      const m = last.match(/dob_attempts:(\d+)/);
      if (m) return parseInt(m[1], 10);
    } catch (e) {
      this.logger.warn("getDobAttempts parsing error:", e);
    }
    return 0;
  }

  async incrementDobAttempts(user) {
    try {
      const attempts = this.getDobAttempts(user) + 1;

      // If attempts >= 2, move user into structured dob stage
      if (attempts >= 2) {
        await this.safeDbUpdate(user.chat_id, {
          dob_attempts: attempts,
          stage: "get_sign_structured",
          last_interaction: null, // Clear for structured DOB
        });
        this.trackEvent("dob_fallback_triggered", {
          userId: user.chat_id,
          attempts,
        });
      } else {
        await this.safeDbUpdate(user.chat_id, {
          dob_attempts: attempts,
        });
      }
    } catch (error) {
      this.logger.error("incrementDobAttempts error:", error);
    }
  }

  // Analytics helper
  trackEvent(eventName, properties = {}) {
    if (this.analytics) {
      try {
        this.analytics.track(eventName, {
          ...properties,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.warn("Analytics tracking failed:", error);
      }
    }
  }
}

export default OnboardingHandler;