import * as Astronomy from 'astronomy-engine';
import OpenAI from 'openai';
import { config } from '../config.js';

class AstrologyService {
    constructor() {
        this.openai = new OpenAI({ apiKey: config.openai.apiKey });

        this.ZODIAC_SIGNS = [
            'Aries', 'Taurus', 'Gemini', 'Cancer',
            'Leo', 'Virgo', 'Libra', 'Scorpio',
            'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ];

        this.PLANETS = [
            'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
            'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
        ];
    }

    /** Get coordinates for a city using OpenAI (avoiding external Maps APIs) */
    async calculateCoordinates(cityString) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a geocoding assistant. Return ONLY a JSON object with 'lat' (number), 'lon' (number), and 'formatted_city' (string) for the given location. Use standard decimal coordinates. Example: {\"lat\": 40.7128, \"lon\": -74.0060, \"formatted_city\": \"New York, USA\"}"
                    },
                    {
                        role: "user",
                        content: cityString
                    }
                ],
                temperature: 0
            });

            const content = response.choices[0].message.content.trim();
            const jsonStr = content.replace(/```json/g, '').replace(/```/g, '');
            return JSON.parse(jsonStr);
        } catch (error) {
            console.error("Geocoding error:", error);
            return { lat: 51.5074, lon: -0.1278, formatted_city: "London, UK (Default)" };
        }
    }

    /**
     * Calculate a full natal chart.
     * @param {string} dateStr - YYYY-MM-DD
     * @param {string} timeStr - HH:MM (24h)
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {object|null} Chart object or null on error
     */
    calculateNatalChart(dateStr, timeStr, lat, lon) {
        try {
            console.log("Astronomy keys in Service:", Object.keys(Astronomy).sort());

            if (!dateStr || !timeStr) {
                console.error("calculateNatalChart: missing dateStr or timeStr", { dateStr, timeStr });
                return null;
            }
            const iso = `${dateStr}T${timeStr}:00Z`;
            const date = new Date(iso);
            if (isNaN(date.getTime())) {
                console.error("calculateNatalChart: invalid date constructed", { iso, date });
                return null;
            }

            const chart = {};

            // 1. Planetary positions
            for (const planet of this.PLANETS) {
                const body = Astronomy.Body[planet];
                const vec = Astronomy.GeoVector(body, date, true);
                const ecliptic = Astronomy.Ecliptic(vec);
                chart[planet] = this.getZodiacSign(ecliptic.elon);
            }

            // 2. Ascendant (Rising sign)
            const lst = Astronomy.SiderealTime(date) + lon / 15.0; // hours
            const lstRad = (lst * 15) * (Math.PI / 180);
            const eps = Astronomy.e_tilt(Astronomy.MakeTime(date)).tobl * (Math.PI / 180);
            const latRad = lat * (Math.PI / 180);
            const y = -Math.cos(lstRad);
            const x = Math.sin(lstRad) * Math.cos(eps) + Math.tan(latRad) * Math.sin(eps);
            let ascDeg = Math.atan2(y, x) * (180 / Math.PI);
            if (ascDeg < 0) ascDeg += 360;
            chart['Ascendant'] = this.getZodiacSign(ascDeg);

            // 3. Whole‑sign houses
            chart['Houses'] = this.calculateWholeSignHouses(chart['Ascendant'].sign);

            return chart;
        } catch (error) {
            console.error("Chart calculation error:", error);
            return null;
        }
    }

    /** Convert ecliptic longitude to zodiac sign information */
    getZodiacSign(longitude) {
        let lon = longitude % 360;
        if (lon < 0) lon += 360;
        const index = Math.floor(lon / 30);
        const degree = Math.floor(lon % 30);
        const minute = Math.floor((lon % 30 - degree) * 60);
        return {
            sign: this.ZODIAC_SIGNS[index],
            degree,
            minute,
            full_degree: lon
        };
    }

    calculateWholeSignHouses(ascendantSign) {
        const houses = {};
        const startIdx = this.ZODIAC_SIGNS.indexOf(ascendantSign);
        for (let i = 0; i < 12; i++) {
            const signIdx = (startIdx + i) % 12;
            houses[i + 1] = this.ZODIAC_SIGNS[signIdx];
        }
        return houses;
    }

    /** Get current planetary transits */
    getCurrentTransits() {
        const now = new Date();
        const transits = {};
        const observer = new Astronomy.Observer(0, 0, 0);
        for (const planet of this.PLANETS) {
            const body = Astronomy.Body[planet];
            const vec = Astronomy.GeoVector(body, now, true);
            const ecliptic = Astronomy.Ecliptic(vec);
            transits[planet] = this.getZodiacSign(ecliptic.elon);
        }
        return transits;
    }
}

export default new AstrologyService();
