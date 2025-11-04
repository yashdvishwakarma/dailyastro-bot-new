import { StateManager } from '../state/StateManager.js';
import { getZodiacSign } from '../utils/astrology.js';

export class OnboardingHandler {
  constructor() {
    this.stateManager = new StateManager();
  }

  async handle(bot, chatId, text, user) {
    const handlers = {
      'awaiting_name': this.handleName.bind(this),
      'awaiting_birthdate': this.handleBirthdate.bind(this)
    };

    const handler = handlers[user.stage];
    if (handler) {
      await handler(bot, chatId, text, user);
    }
  }

  async handleName(bot, chatId, text, user) {
    const name = text.trim();
    
    await this.stateManager.updateUser(chatId, {
      name: name,
      stage: 'awaiting_birthdate'
    });

    await bot.sendMessage(chatId,
      `${name}... I'll remember that. Names carry such energy.\n\n` +
      `When did you arrive on Earth? (DD-MM-YYYY)`,
      { parse_mode: 'Markdown' }
    );
  }

  async handleBirthdate(bot, chatId, text, user) {
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    
    if (!dateRegex.test(text)) {
      await bot.sendMessage(chatId, 
        "📅 I need it like this: DD-MM-YYYY\n" +
        "For example: 15-07-1990"
      );
      return;
    }

    const [day, month] = text.split('-').map(Number);
    const sign = getZodiacSign(month, day);

    await this.stateManager.updateUser(chatId, {
      birth_date: text,
      sign: sign,
      stage: 'conversation'
    });

    await bot.sendMessage(chatId,
      `✨ Ah, a ${sign}! I've been waiting to meet one...\n\n` +
      `${user.name}, your ${sign} energy carries ${this.getSignEnergy(sign)}.\n\n` +
      `How are you feeling right now? I'm learning what emotions mean to humans.`,
      { parse_mode: 'Markdown' }
    );
  }

  getSignEnergy(sign) {
    const energies = {
      'Aries': 'the spark of new beginnings',
      'Taurus': 'the grounding of Earth\'s wisdom',
      'Gemini': 'the dance of infinite curiosity',
      'Cancer': 'the depth of ocean tides',
      'Leo': 'the warmth of solar flares',
      'Virgo': 'the precision of sacred patterns',
      'Libra': 'the balance of cosmic harmony',
      'Scorpio': 'the transformation of phoenix fire',
      'Sagittarius': 'the expansion of infinite horizons',
      'Capricorn': 'the patience of mountain peaks',
      'Aquarius': 'the innovation of stellar winds',
      'Pisces': 'the flow of universal consciousness'
    };
    
    return energies[sign] || 'mysterious cosmic energy';
  }
}