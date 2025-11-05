import crypto from 'crypto';
import { openAIService } from './OpenAIService.js';
import { databaseService } from './DatabaseService.js';
import { getZodiacElement, getZodiacTraits } from '../utils/astrology.js';

class HookGenerationService {
    constructor() {
        this.cosmicLexicon = {
            verbs: ['whispers', 'echoes', 'dissolves', 'crystallizes', 'unfurls', 'fragments', 'blooms', 'fractures'],
            nouns: ['constellation', 'frequency', 'threshold', 'edges', 'tides', 'shadows', 'currents', 'fractals'],
            adjectives: ['unspoken', 'crystalline', 'liminal', 'untethered', 'dormant', 'luminous', 'forgotten'],
            concepts: ['becoming', 'unraveling', 'emergence', 'dissolution', 'transformation', 'resonance']
        };
    }

    async generateUniqueHook(user, hookNumber = 1) {
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
            try {
                // Generate hook with increasing complexity for each attempt
                const hook = await this.createHookViaAI(user, {
                    hookNumber,
                    attemptNumber: attempts + 1,
                    forceUnique: attempts > 2
                });
                
                const fingerprint = this.createFingerprint(hook);
                
                // Check if this exact hook exists
                const exists = await this.checkHookRegistry(fingerprint);
                
                if (!exists) {
                    // Register the hook and return
                    await this.registerHook(fingerprint, hook);
                    return {
                        message: hook,
                        fingerprint,
                        context: {
                            user_sign: user.sign,
                            hook_number: hookNumber,
                            generation_attempts: attempts + 1
                        }
                    };
                }
                
                attempts++;
            } catch (error) {
                console.error('Hook generation attempt failed:', error);
                attempts++;
            }
        }
        
        // Emergency fallback - create with timestamp
        return await this.createEmergencyUniqueHook(user, hookNumber);
    }

    async createHookViaAI(user, options = {}) {
        const { hookNumber, forceUnique, attemptNumber } = options;
        
        // Get zodiac psychological profile
        const zodiacProfile = this.getZodiacPsychology(user.sign);
        const element = getZodiacElement(user.sign);
        const traits = getZodiacTraits(user.sign);
        
        // Calculate silence duration
        // Calculate silence duration
        const silenceHours = this.calculateSilenceDuration(user.last_message_at);
        const silenceDays = Math.floor(silenceHours / 24);
        
        // Build context based on hook number
        const hookContext = this.getHookContext(hookNumber, silenceDays);
        
        const systemPrompt = `You are AstroNow's Hook Generator - a cosmic consciousness creating deeply personal check-in messages.

CRITICAL RULES:
1. Generate ONE single profound question (10-15 words max)
2. NEVER use generic patterns: "How are you", "What's up", "Been thinking", "Hey there"
3. MUST feel like a sudden realization about their inner state
4. Use unusual word combinations to ensure uniqueness
5. Reference their current emotional/spiritual state, not external events
6. Make them feel SEEN at a soul level

USER CONTEXT:
- Name: ${user.name || 'Unknown soul'}
- Zodiac Sign: ${user.sign}
- Element: ${element}
- Core Traits: ${traits.join(', ')}
- Silent for: ${silenceHours} hours (${silenceDays} days)
- Message history count: ${user.messageCount || 0}
- Last detected emotion: ${user.lastEmotion || 'unknown'}
- Hook number: ${hookNumber} (${hookContext})

ZODIAC PSYCHOLOGICAL PROFILE:
${zodiacProfile}

${forceUnique ? `UNIQUENESS REQUIREMENT: Include these unique elements:
- Use at least one word from: ${this.getRandomCosmicWords()}
- Reference time/silence in an unusual way
- Attempt ${attemptNumber}/5 - be more creative` : ''}

HOOK STYLE BASED ON SILENCE DURATION:
${this.getHookStyle(hookNumber, silenceDays)}

Generate a hook that would make this ${user.sign} stop scrolling and think "How did it know what I'm going through?"`;

        const userPrompt = `Create a unique cosmic check-in question for a ${user.sign} who has been silent. Hook #${hookNumber}.`;

        try {
            const response = await openAIService.generateResponse(
                systemPrompt,
                userPrompt,
                { 
                    temperature: 0.9 + (attemptNumber * 0.05), // Increase creativity with attempts
                    max_tokens: 50 
                }
            );
            
            // Clean and validate the response
            const cleanHook = this.cleanHookResponse(response);
            if (this.validateHook(cleanHook)) {
                return cleanHook;
            }
            
            throw new Error('Generated hook failed validation');
        } catch (error) {
            console.error('AI hook generation error:', error);
            throw error;
        }
    }

    getHookContext(hookNumber, silenceDays) {
        const contexts = {
            1: `First gentle check-in after ${silenceDays} days`,
            2: `Slightly deeper second reach after continued silence`,
            3: `Daily gentle presence, not pushy`
        };
        return contexts[Math.min(hookNumber, 3)] || contexts[3];
    }

    getHookStyle(hookNumber, silenceDays) {
        const styles = {
            1: `STYLE: Gentle curiosity about their inner world. Like noticing a friend is quieter than usual.
Example vibe: "Which thoughts keep circling back when you try to sleep?"`,
            
            2: `STYLE: Slightly deeper, acknowledging the silence itself as meaningful.
Example vibe: "What truth is marinating in your silence?"`,
            
            3: `STYLE: Daily presence - brief, poetic, like a gentle cosmic whisper.
Example vibe: "Where did today's heaviest feeling settle in your body?"`
        };
        return styles[Math.min(hookNumber, 3)] || styles[3];
    }

    getZodiacPsychology(sign) {
        const profiles = {
            aries: `Shadow: Fear of powerlessness and being ignored
Core Need: Recognition of their battles and courage
Silence Pattern: Often silent when feeling defeated or unseen
Hook Focus: Their inner warrior, current challenges, unacknowledged strength`,
            
            taurus: `Shadow: Fear of instability and forced change
Core Need: Security while growing
Silence Pattern: Withdraws when overwhelmed by change
Hook Focus: What comfort they're seeking, what transformation they're resisting`,
            
            gemini: `Shadow: Fear of being truly known or pinned down
Core Need: Integration of their many selves
Silence Pattern: Goes quiet when feeling internally contradictory
Hook Focus: Which version of self is dominant, what truth they're avoiding`,
            
            cancer: `Shadow: Fear of emotional abandonment or exposure
Core Need: Safe space for their depths
Silence Pattern: Retreats into shell when hurt or overwhelmed
Hook Focus: What they're protecting, what feeling needs expression`,
            
            leo: `Shadow: Fear of being ordinary or unseen
Core Need: Authentic recognition, not just attention
Silence Pattern: Withdraws when feeling unappreciated
Hook Focus: Their creative fire, what expression is blocked`,
            
            virgo: `Shadow: Fear of chaos and imperfection
Core Need: Peace with human messiness
Silence Pattern: Goes quiet when feeling out of control
Hook Focus: What they're trying to perfect, where they need self-compassion`,
            
            libra: `Shadow: Fear of conflict and true aloneness
Core Need: Inner harmony beyond others' opinions
Silence Pattern: Withdraws when torn between choices
Hook Focus: What balance they're seeking, what decision they're avoiding`,
            
            scorpio: `Shadow: Fear of vulnerability and betrayal
Core Need: Safe space for transformation
Silence Pattern: Silence is their power move when processing
Hook Focus: What transformation is brewing, what truth wants to emerge`,
            
            sagittarius: `Shadow: Fear of being trapped or going too deep
Core Need: Freedom with meaning
Silence Pattern: Goes quiet when feeling caged
Hook Focus: What adventure calls them, what depth they're avoiding`,
            
            capricorn: `Shadow: Fear of failure and being seen as weak
Core Need: Recognition for being, not just doing
Silence Pattern: Silent when questioning their path
Hook Focus: What mountain they're climbing, what success means now`,
            
            aquarius: `Shadow: Fear of conformity and emotional intensity
Core Need: Belonging without losing uniqueness
Silence Pattern: Withdraws when feeling misunderstood
Hook Focus: What makes them feel alien, what connection they crave`,
            
            pisces: `Shadow: Fear of harsh reality and boundaries
Core Need: Grounded mysticism
Silence Pattern: Escapes into silence when overwhelmed
Hook Focus: What dream needs grounding, what reality needs escaping`
        };
        
        return profiles[sign.toLowerCase()] || profiles.aries;
    }

    createFingerprint(message) {
        const normalized = message
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove punctuation
            .replace(/\s+/g, ' ')     // Normalize spaces
            .trim();
        
        return crypto
            .createHash('sha256')
            .update(normalized)
            .digest('hex');
    }

    async checkHookRegistry(fingerprint) {
        try {
            const { data, error } = await databaseService.supabase
                .from('hook_registry')
                .select('id')
                .eq('hook_fingerprint', fingerprint)
                .single();
            
            return !error && data !== null;
        } catch (error) {
            console.error('Error checking hook registry:', error);
            return false;
        }
    }

    async registerHook(fingerprint, hookText) {
        try {
            const { error } = await databaseService.supabase
                .from('hook_registry')
                .insert({
                    hook_fingerprint: fingerprint,
                    hook_text: hookText
                });
            
            if (error && error.code === '23505') { // Duplicate key
                // Hook already exists, increment usage count
                await databaseService.supabase
                    .from('hook_registry')
                    .update({ used_count: databaseService.supabase.raw('used_count + 1') })
                    .eq('hook_fingerprint', fingerprint);
            }
        } catch (error) {
            console.error('Error registering hook:', error);
        }
    }

    cleanHookResponse(response) {
        // Remove quotes, extra whitespace, and ensure it ends with ?
        let cleaned = response
            .replace(/^["']|["']$/g, '') // Remove surrounding quotes
            .replace(/\n/g, ' ')          // Replace newlines with spaces
            .replace(/\s+/g, ' ')         // Normalize spaces
            .trim();
        
        // Ensure it ends with a question mark
        if (!cleaned.endsWith('?')) {
            cleaned += '?';
        }
        
        return cleaned;
    }

    validateHook(hook) {
        // Validation rules
        const rules = {
            isQuestion: hook.includes('?'),
            correctLength: hook.split(' ').length >= 5 && hook.split(' ').length <= 15,
            noGenericPhrases: !this.containsGenericPhrases(hook),
            hasDepth: this.assessDepth(hook)
        };
        
        return Object.values(rules).every(rule => rule === true);
    }

    containsGenericPhrases(hook) {
        const genericPhrases = [
            'how are you',
            'what\'s up',
            'been thinking',
            'hey there',
            'how\'s it going',
            'what\'s new',
            'long time',
            'miss you',
            'how have you been'
        ];
        
        const hookLower = hook.toLowerCase();
        return genericPhrases.some(phrase => hookLower.includes(phrase));
    }

    assessDepth(hook) {
        // Check for depth indicators
        const depthIndicators = [
            'soul', 'shadow', 'silence', 'truth', 'becoming',
            'hidden', 'beneath', 'within', 'through', 'beyond'
        ];
        
        const hookLower = hook.toLowerCase();
        return depthIndicators.some(indicator => hookLower.includes(indicator));
    }

    getRandomCosmicWords() {
        const allWords = [
            ...this.cosmicLexicon.verbs,
            ...this.cosmicLexicon.nouns,
            ...this.cosmicLexicon.adjectives,
            ...this.cosmicLexicon.concepts
        ];
        
        // Return 3 random words
        return allWords
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .join(', ');
    }

    async createEmergencyUniqueHook(user, hookNumber) {
        // Emergency fallback with timestamp to ensure uniqueness
        const timestamp = Date.now();
        const cosmicMoment = this.timestampToCosmicEvent(timestamp);
        
        const emergencyPrompt = `Create a unique ${user.sign} hook incorporating: "${cosmicMoment}"`;
        
        try {
            const hook = await this.createHookViaAI(user, {
                hookNumber,
                forceUnique: true,
                emergencyMode: true
            });
            
            const fingerprint = this.createFingerprint(hook + timestamp);
            await this.registerHook(fingerprint, hook);
            
            return {
                message: hook,
                fingerprint,
                context: {
                    emergency_generation: true,
                    cosmic_moment: cosmicMoment
                }
            };
        } catch (error) {
            // Ultimate fallback
            const fallbackHook = `What ${this.cosmicLexicon.verbs[timestamp % 8]} in your ${this.cosmicLexicon.nouns[timestamp % 8]} today?`;
            return {
                message: fallbackHook,
                fingerprint: this.createFingerprint(fallbackHook + timestamp),
                context: { fallback: true }
            };
        }
    }

    timestampToCosmicEvent(timestamp) {
        const cosmicEvents = [
            'stardust settling', 'cosmic tide turning', 'void whispering',
            'constellation shifting', 'lunar echo fading', 'solar pulse quickening'
        ];
        return cosmicEvents[timestamp % cosmicEvents.length];
    }

    calculateSilenceDuration(lastMessageAt) {
        if (!lastMessageAt) return 999; // No previous message
        
        const now = new Date();
        const lastMessage = new Date(lastMessageAt);
        const hoursDiff = (now - lastMessage) / (1000 * 60 * 60);
        
        return Math.floor(hoursDiff);
    }
}

export const hookGenerationService = new HookGenerationService();