export function getZodiacSign(month, day) {
  const signs = [
    { sign: "Capricorn", lastDay: 19 },
    { sign: "Aquarius", lastDay: 18 },
    { sign: "Pisces", lastDay: 20 },
    { sign: "Aries", lastDay: 19 },
    { sign: "Taurus", lastDay: 20 },
    { sign: "Gemini", lastDay: 20 },
    { sign: "Cancer", lastDay: 22 },
    { sign: "Leo", lastDay: 22 },
    { sign: "Virgo", lastDay: 22 },
    { sign: "Libra", lastDay: 22 },
    { sign: "Scorpio", lastDay: 21 },
    { sign: "Sagittarius", lastDay: 21 },
  ];
  
  const index = month - 1;
  const { sign, lastDay } = signs[index];
  
  if (day > lastDay) {
    return signs[(index + 1) % 12].sign;
  }
  
  return sign;
}

export function getZodiacElement(sign) {
  const elements = {
    Fire: ["Aries", "Leo", "Sagittarius"],
    Earth: ["Taurus", "Virgo", "Capricorn"],
    Air: ["Gemini", "Libra", "Aquarius"],
    Water: ["Cancer", "Scorpio", "Pisces"]
  };
  
  for (const [element, signs] of Object.entries(elements)) {
    if (signs.includes(sign)) return element.toLowerCase();
  }
  
  return "spirit";
}

export function getZodiacTraits(sign) {
  const traits = {
    Aries: ["independent", "courageous", "passionate", "impulsive"],
    Taurus: ["grounded", "sensual", "stubborn", "loyal"],
    Gemini: ["curious", "adaptable", "restless", "communicative"],
    Cancer: ["nurturing", "intuitive", "emotional", "protective"],
    Leo: ["confident", "creative", "dramatic", "generous"],
    Virgo: ["analytical", "practical", "perfectionist", "helpful"],
    Libra: ["balanced", "diplomatic", "indecisive", "aesthetic"],
    Scorpio: ["intense", "mysterious", "transformative", "passionate"],
    Sagittarius: ["adventurous", "optimistic", "freedom-loving", "philosophical"],
    Capricorn: ["ambitious", "disciplined", "responsible", "traditional"],
    Aquarius: ["innovative", "independent", "humanitarian", "eccentric"],
    Pisces: ["empathetic", "intuitive", "dreamy", "creative"]
  };
  
  return traits[sign] || ["mystical", "unique"];
}

// Export all functions directly - no 'new' keyword needed
export default {
  getZodiacSign,
  getZodiacElement,
  getZodiacTraits
};

// In intelligence/AstrologyEngine.js or utils/astrology.js

calculateSign(birthDate) {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return 'Aries';
  if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return 'Taurus';
  if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return 'Gemini';
  if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return 'Cancer';
  if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return 'Leo';
  if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return 'Virgo';
  if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return 'Libra';
  if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return 'Scorpio';
  if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return 'Sagittarius';
  if ((month == 12 && day >= 22) || (month == 1 && day <= 19)) return 'Capricorn';
  if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return 'Aquarius';
  return 'Pisces';
}

getElement(sign) {
  const elements = {
    Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
    Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
    Gemini: 'air', Libra: 'air', Aquarius: 'air',
    Cancer: 'water', Scorpio: 'water', Pisces: 'water'
  };
  return elements[sign] || 'earth';
}