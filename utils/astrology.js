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