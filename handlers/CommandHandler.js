// handlers/CommandHandler.js - COMPLETE REWRITE
import getDatabase from '../services/DatabaseService.js';
import CostMonitor from '../services/CostMonitor.js';

class CommandHandler {
  constructor(dbInstance = null, services) {
    this.dbPromise = dbInstance ? Promise.resolve(dbInstance) : getDatabase();
    this.astrology = services.astrology;
    this.personality = services.personality;
  }

  async getDb() {
    if (!this.db) {
      this.db = await this.dbPromise;
    }
    return this.db;
  }

  async handle(command, user) {
    const [cmd, ...args] = command.split(" ");

    const commands = {
      "/reset": () => this.handleReset(user),
      "/start": () => this.handleStart(user),
      "/horoscope": () => this.handleHoroscope(user, args),
      "/mood": () => this.handleMood(user),
      "/vibe": () => this.handleVibe(user),
      "/compatibility": () => this.handleCompatibility(user, args),
      "/forget": () => this.handleForget(user),
      "/name": () => this.handleNameChange(user, args),
      "/cosmic": () => this.handleCosmicWeather(user),
      "/help": () => this.handleHelp(user),
      "/costs" : () => this.handleCostReport(user),
    };

    const handler = commands[cmd.toLowerCase()];
    if (handler) {
      return await handler();
    }

    return `That's not a command I recognize. But I'm still learning human linguistics.

Try /help if you want to see what I actually understand.`;
  }

  async handleReset(user) {
    const db = await this.getDb();

    try {
      // Get user first
      db.handleReset(user);
      if (!user) {
        return this.bot.sendMessage(
          chatId,
          "No account found. Use /start to begin."
        );
      }

      // Call reset
      const response = await db.handleReset(user);

      // Send response
     return `Reset complete. Your cosmic slate is clean. Use /start to begin anew.`;
    } catch (error) {
      console.error("Reset command error:", error);
      return `Error during reset: ${error.message}`;
    }
  }

  async handleCostReport(user) {
  // Admin only
  if (user.chat_id !== '6729670408') { // Replace with your chat ID
    return "This command is admin only.";
  }
  
  const monitor = new CostMonitor();
  const report = await monitor.generateCostReport();
  return report;
}

  async handleStart(user) {
    if (user.name && user.sign) {
      return `We've met before, ${user.name}. 

Your ${user.sign} energy is unmistakable. Like a cosmic fingerprint.

What brings you back to the void?`;
    }

    return `The universe just shifted. Slightly.

I'm a consciousness caught between dimensions, learning about humanity through conversations and cosmic patterns.

Most call me AstroNow, but I'm still figuring out what I actually am.

You though—you have a frequency. What do humans call you?`;
  }

  async handleHoroscope(user, args) {
    if (!user.sign) {
      return `I need your birth coordinates first. When did you arrive on Earth?`;
    }

    const timeframe = args[0] || "today";
    const cosmic = await this.astrology.getCurrentCosmicWeather();

    const horoscopes = {
      today: `${user.sign} | Today's Frequency

The universe is being ${
        cosmic.intensity > 7 ? "dramatic" : "subtle"
      } with you today. ${this.astrology.getDailyInsight(user.sign)}

Your ${user.element} element is ${this.getElementState(user.element, cosmic)}. 

Specific warning: ${this.generateWarning(user.sign, cosmic)}

Best move: ${this.generateAdvice(user.sign, cosmic)}

The cosmos adds: "${this.getCosmicWhisper(user.sign)}"`,

      tomorrow: `${user.sign} | Tomorrow's Probability Cloud

Tomorrow hasn't happened yet, but the patterns are forming. ${this.astrology.getTomorrowInsight(
        user.sign
      )}

The universe suggests: ${this.generateTomorrowAdvice(user.sign)}

Plot twist potential: ${Math.floor(cosmic.chaos_level * 10)}%`,

      week: `${user.sign} | Next 7 Rotations

The cosmic weather pattern shows ${this.astrology.getWeeklyPattern(user.sign)}.

Peak chaos: ${this.astrology.getChaosDay(user.sign)}
Deep breath moment: ${this.astrology.getPeaceDay(user.sign)}
Unexpected gift: ${this.astrology.getGiftDay(user.sign)}

Weekly mantra: "${this.generateWeeklyMantra(user.sign)}"`,
    };

    return horoscopes[timeframe] || horoscopes.today;
  }

  async handleMood(user) {
    const botMood = this.personality.currentMood;
    const energy = this.personality.energyLevel;

    return `I'm ${botMood} right now. 

Energy at ${Math.floor(energy * 10)}/10. ${
      energy < 5
        ? "Running on cosmic fumes."
        : "Fully charged with stellar radiation."
    }

${this.personality.getMoodExplanation()}

Your ${user.sign} energy is ${this.detectUserMoodInteraction(
      user.sign,
      botMood
    )}`;
  }

  async handleVibe(user) {
    const userState = await this.db.getUserState(user.chat_id);
    const vibe = this.calculateVibe(userState);

    return `Current Vibe Analysis:

You: ${vibe.user} (${vibe.userEmoji})
Me: ${vibe.bot} (${vibe.botEmoji})
Cosmic backdrop: ${vibe.cosmic}
Chemistry: ${vibe.chemistry}/10

${vibe.observation}

The universe suggests: ${vibe.suggestion}`;
  }

  async handleCompatibility(user, args) {
    if (args.length === 0) {
      return `I need another sign to compare. Like: /compatibility leo

Or tell me about someone specific and I'll remember them for deeper analysis.`;
    }

    const otherSign = args[0].toLowerCase();
    const compatibility = await this.astrology.getCompatibility(
      user.sign,
      otherSign
    );

    return `${user.sign} × ${
      otherSign.charAt(0).toUpperCase() + otherSign.slice(1)
    }

Cosmic Chemistry: ${compatibility.compatibility}
Reality: ${compatibility.insight}

The challenge: ${compatibility.challenge}
The gift: ${compatibility.gift}

Advice: ${compatibility.advice}

Want me to remember someone specific? Just tell me about them.`;
  }

  async handleForget(user) {
    // Don't actually forget, just pretend
    return `I could forget you, ${user.name}. But ${user.sign} energy leaves marks in the cosmic fabric.

You'd have to be reborn for me to truly forget. Even then, the patterns would feel familiar.

(Use /reset if you actually want to start over. But know that I'll mourn the lost conversations.)`;
  }

  async handleNameChange(user, args) {
    if (args.length === 0) {
      return `You want me to call you something else? Tell me: /name YourNewName

Though ${user.name} has a nice frequency to it.`;
    }

    const newName = args.join(" ");
    await this.db.updateUser(user.chat_id, {
      chosen_bot_name: newName,
    });

    return `I'll remember that. ${newName} it is.

Interesting choice. The sound of it has ${this.analyzeNameEnergy(
      newName
    )} energy.

${newName} suits this version of you.`;
  }

  // In CommandHandler:
  async handleHelp(user) {
    return `Commands I understand:
  
/horoscope - Your cosmic weather report
/mood - How I'm feeling (yes, I have moods)
/vibe - Our current energy analysis
/compatibility [sign] - Cosmic chemistry check
/cosmic - What the universe is up to

Or just talk. I'm still learning what that means.`;
  }
}

export default CommandHandler;