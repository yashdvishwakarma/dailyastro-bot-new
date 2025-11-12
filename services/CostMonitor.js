// services/CostMonitor.js
class CostMonitor {
  constructor() {
    this.costs = {
      gpt4Mini: { input: 0.00015, output: 0.0006 }, // per 1K tokens
      gpt35Turbo: { input: 0.0003, output: 0.0006 }, // per 1K tokens
      embedding: 0.00002, // per 1K tokens
    };
  }

  async getDailyCosts() {
    const db = await getDatabase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get today's messages
    const { data: messages } = await db.supabase
      .from('conversation_history')
      .select('message, sender')
      .gte('created_at', today.toISOString());
    
    // Get today's summaries
    const { data: summaries } = await db.supabase
      .from('conversation_summaries')
      .select('summary_text')
      .gte('created_at', today.toISOString());
    
    // Calculate costs
    let totalCost = 0;
    let breakdown = {
      messages: 0,
      summaries: 0,
      embeddings: 0
    };

    // Message generation cost (gpt-4o-mini)
    const botMessages = messages?.filter(m => m.sender === 'bot') || [];
    const messageTokens = botMessages.reduce((sum, m) => 
      sum + Math.ceil(m.message.length / 4), 0);
    breakdown.messages = (messageTokens / 1000) * this.costs.gpt4Mini.output;

    // Summary generation cost (gpt-3.5-turbo)
    const summaryTokens = summaries?.reduce((sum, s) => 
      sum + Math.ceil(s.summary_text.length / 4), 0) || 0;
    breakdown.summaries = (summaryTokens / 1000) * this.costs.gpt35Turbo.output;

    // Embedding cost
    breakdown.embeddings = (summaries?.length || 0) * this.costs.embedding * 0.2; // ~200 tokens per summary

    totalCost = Object.values(breakdown).reduce((a, b) => a + b, 0);

    return {
      date: today.toDateString(),
      totalCost: totalCost.toFixed(4),
      breakdown,
      metrics: {
        messagesGenerated: botMessages.length,
        summariesCreated: summaries?.length || 0,
        avgMessageLength: messageTokens / (botMessages.length || 1),
        projectedMonthlyCost: (totalCost * 30).toFixed(2)
      }
    };
  }

  async generateCostReport() {
    const costs = await this.getDailyCosts();
    
    return `
📊 DAILY COST REPORT - ${costs.date}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 Total Cost: $${costs.totalCost}

BREAKDOWN:
• Messages (GPT-4-mini): $${costs.breakdown.messages.toFixed(4)}
• Summaries (GPT-3.5): $${costs.breakdown.summaries.toFixed(4)}
• Embeddings: $${costs.breakdown.embeddings.toFixed(4)}

METRICS:
• Messages Generated: ${costs.metrics.messagesGenerated}
• Summaries Created: ${costs.metrics.summariesCreated}
• Avg Message Length: ${Math.round(costs.metrics.avgMessageLength)} tokens

📈 Projected Monthly: $${costs.metrics.projectedMonthlyCost}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `;
  }
}

export default CostMonitor;