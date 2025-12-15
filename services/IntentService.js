// services/IntentService.js
import OpenAI from "openai";
const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

class IntentService {
  constructor() {
    // tuneable thresholds
    this.RULE_CONFIDENCE_THRESHOLD = 0.85;
    this.FINAL_DECISION_THRESHOLD = 0.65; // require this confidence to act on classification
    this.LLM_MODEL = "gpt-3.5-turbo";
  }

  // deterministic rule-based classifier
  classifyIntentRule(message = "") {
    const lower = (message || "").toLowerCase();

    // keyword buckets (extend as needed)
    const emotionalRegex = /\b(feel|felt|sad|alone|hurt|angry|lost|anxious|panic|depressed|broken|heartbreak|why am i|i'm struggling|i cant)\b/;
    const astroRegex = /\b(horoscope|reading|zodiac|transit|moon|sun sign|rising|venus|mars|mercury|birth|birthday|chart)\b/;
    const technicalRegex = /\b(code|api|bug|deploy|docker|function|class|error|stack|node|react|typescript|compile|server)\b/;

    let intent = "general";
    let score = 0.3;

    if (astroRegex.test(lower)) {
      intent = "astro_reading";
      score = 0.8;
    }

    if (emotionalRegex.test(lower)) {
      intent = "emotional_support";
      score = 0.88;
    }

    if (technicalRegex.test(lower)) {
      intent = "technical_help";
      score = 0.9;
    }

    // very short messages are ambiguous
    if (lower.trim().length < 20) {
      score = Math.min(score, 0.55);
    }

    return { intent, confidence: score, reason: "rule" };
  }

  // LLM fallback for ambiguous cases
  async classifyIntentViaLLM(message = "") {
    try {
      const prompt = `You are a classifier. Classify the user's intent into one of:
["emotional_support","astro_reading","technical_help","general"].
Return JSON only: {"intent":"", "confidence":0.00, "reason": "one-line"}.
Message: """${message}"""`;

      const resp = await openai.chat.completions.create({
        model: this.LLM_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.0,
        max_tokens: 80,
      });

      const content = resp.choices?.[0]?.message?.content?.trim();
      // robust parsing: try to extract JSON
      const firstBrace = content.indexOf("{");
      const lastBrace = content.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        const j = JSON.parse(content.slice(firstBrace, lastBrace + 1));
        // normalize
        return {
          intent: j.intent || "general",
          confidence: typeof j.confidence === "number" ? j.confidence : parseFloat(j.confidence) || 0.5,
          reason: j.reason || "llm",
        };
      }
      return { intent: "general", confidence: 0.5, reason: "parse_failed" };
    } catch (err) {
      console.error("IntentService LLM classifier error:", err?.message || err);
      return { intent: "general", confidence: 0.5, reason: "error" };
    }
  }

  // Ensemble orchestration: returns {intent, confidence, source}
  async classifyIntentEnsemble(message = "") {
    const rule = this.classifyIntentRule(message);
    if (rule.confidence >= this.RULE_CONFIDENCE_THRESHOLD) {
      return { intent: rule.intent, confidence: rule.confidence, source: "rule" };
    }

    // else ask LLM
    const llm = await this.classifyIntentViaLLM(message);
    // combine confidences (weighted)
    const combinedScore = (rule.confidence * 0.4) + (llm.confidence * 0.6);
    const chosen = llm.confidence >= rule.confidence ? llm.intent : rule.intent;
    return {
      intent: chosen,
      confidence: combinedScore,
      source: "ensemble",
      reasons: { rule, llm }
    };
  }
}

export default new IntentService();
