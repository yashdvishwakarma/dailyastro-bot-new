// monitoring/dashboard.js

class AstroNowDashboard {
  constructor(db) {
    this.db = db;
    this.metrics = {};
  }
  
  async collectMetrics() {
    const now = new Date();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    this.metrics = {
      activeUsers: await this.db.countActiveUsers(dayAgo),
      totalMessages: await this.db.countMessages(dayAgo),
      avgConversationLength: await this.calculateAvgLength(dayAgo),
      botMoodDistribution: await this.getMoodDistribution(dayAgo),
      questionRatio: await this.calculateQuestionRatio(dayAgo),
      valueScore: await this.calculateValueScore(dayAgo),
      selfMessageSuccess: await this.calculateSelfMessageSuccess(dayAgo),
      userRetention: await this.calculateRetention(),
      emotionalResonance: await this.calculateEmotionalResonance(dayAgo)
    };
    
    return this.metrics;
  }
  
  async generateReport() {
    await this.collectMetrics();
    
    return `
🌌 ASTRONOW V3.0 DAILY REPORT
================================

📊 ENGAGEMENT METRICS
• Active Users: ${this.metrics.activeUsers}
• Total Messages: ${this.metrics.totalMessages}
• Avg Conversation Length: ${this.metrics.avgConversationLength} messages
• User Retention: ${this.metrics.userRetention}%

🧠 BOT CONSCIOUSNESS
• Mood Distribution: ${JSON.stringify(this.metrics.botMoodDistribution)}
• Question Ratio: ${this.metrics.questionRatio}% (target: <30%)
• Value Score: ${this.metrics.valueScore}/10
• Emotional Resonance: ${this.metrics.emotionalResonance}/10

🚀 SELF-INITIATED MESSAGES
• Success Rate: ${this.metrics.selfMessageSuccess}%
• Most Effective Trigger: ${this.metrics.bestTrigger}

⚠️ ALERTS
${this.generateAlerts()}

💡 RECOMMENDATIONS
${this.generateRecommendations()}
    `;
  }
  
  generateAlerts() {
    const alerts = [];
    
    if (this.metrics.questionRatio > 40) {
      alerts.push("⚠️ High question ratio - bot asking too much");
    }
    
    if (this.metrics.avgConversationLength < 5) {
      alerts.push("⚠️ Low conversation depth - users dropping off");
    }
    
    if (this.metrics.valueScore < 6) {
      alerts.push("⚠️ Low value delivery - increase insights/stories");
    }
    
    return alerts.join('\n') || "✅ All systems optimal";
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    if (this.metrics.botMoodDistribution.curious > 0.5) {
      recommendations.push("🔄 Diversify bot moods - too much curiosity");
    }
    
    if (this.metrics.selfMessageSuccess < 30) {
      recommendations.push("📱 Improve self-message timing/content");
    }
    
    if (this.metrics.userRetention < 40) {
      recommendations.push("🎯 Focus on onboarding experience");
    }
    
    return recommendations.join('\n') || "🌟 Performance optimal";
  }

  // monitoring/dashboard.js


  async getLiveStats() {
    const stats = await this.db.query(`
      WITH user_stats AS (
        SELECT 
          user_id,
          COUNT(*) as message_count,
          MAX(severity) as max_severity,
          MIN(created_at) as first_message,
          MAX(created_at) as last_message
        FROM messages
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY user_id
      ),
      vulnerability_stats AS (
        SELECT 
          user_id,
          MIN(message_number) as first_vulnerable_at
        FROM vulnerability_metrics
        GROUP BY user_id
      )
      SELECT 
        COUNT(DISTINCT us.user_id) as active_users,
        AVG(us.message_count) as avg_messages,
        AVG(vs.first_vulnerable_at) as avg_vulnerability_point,
        COUNT(CASE WHEN us.message_count <= 5 
              AND us.last_message < NOW() - INTERVAL '1 hour' THEN 1 END) as likely_ghosts,
        COUNT(CASE WHEN us.max_severity >= 7 THEN 1 END) as high_severity_convos
      FROM user_stats us
      LEFT JOIN vulnerability_stats vs ON us.user_id = vs.user_id
    `);
    
    return stats.rows[0];
  }
  
  async getTopVulnerabilityTriggers() {
    const triggers = await this.db.query(`
      SELECT 
        vulnerability_type,
        COUNT(*) as occurrence,
        AVG(message_number) as avg_message_number
      FROM vulnerability_metrics
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY vulnerability_type
      ORDER BY occurrence DESC
      LIMIT 10
    `);
    
    return triggers.rows;
  }

}

export default AstroNowDashboard;