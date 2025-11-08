// services/MetricsService.js - NEW FILE

class MetricsService {
  constructor(database) {
    this.db = database;
    //this.initializeTables();
  }
  
  
  async trackVulnerability(userId, messageNumber, message, severity, emotion) {
    // Track when users first share something vulnerable
    const existing = await this.db.query(
      'SELECT id FROM vulnerability_metrics WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    
    if (!existing.rows.length) {
      // First vulnerable share
      await this.db.query(`
        INSERT INTO vulnerability_metrics 
        (user_id, message_number, vulnerability_type, message, severity)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, messageNumber, emotion, message, severity]);
      
      console.log(`📊 First vulnerability at message #${messageNumber}: "${message.substring(0, 50)}..."`);
    }
  }
  
  async trackGhosting(userId, lastMessageCount) {
    // Track if user ghosts after 5 messages
    if (lastMessageCount === 5) {
      await this.db.query(`
        INSERT INTO conversation_metrics 
        (user_id, metric_type, metric_value)
        VALUES ($1, 'potential_ghost', $2)
      `, [userId, { message_count: 5, timestamp: new Date() }]);
    }
  }
  
  async trackResponseToGreeting(userId, response) {
    // Track how users respond to "How's your inner world?"
    const responseTypes = {
      deflect: /fine|good|okay|alright|nm|nothing/i,
      engage: /chaotic|peaceful|rough|tired|stressed|anxious|happy|excited/i,
      deep: /lost|confused|struggling|depressed|lonely|scared/i
    };
    
    let responseType = 'other';
    for (const [type, pattern] of Object.entries(responseTypes)) {
      if (pattern.test(response)) {
        responseType = type;
        break;
      }
    }
    
    await this.db.query(`
      INSERT INTO conversation_metrics 
      (user_id, metric_type, metric_value)
      VALUES ($1, 'greeting_response', $2)
    `, [userId, { type: responseType, response: response.substring(0, 100) }]);
    
    console.log(`📊 Greeting response type: ${responseType}`);
  }
  
  async getDailyMetrics() {
    const metrics = await this.db.query(`
      SELECT 
        COUNT(DISTINCT user_id) as total_users,
        AVG(CAST(metric_value->>'message_count' AS INTEGER)) as avg_messages_before_vulnerability,
        COUNT(CASE WHEN metric_type = 'potential_ghost' THEN 1 END) as ghost_after_5,
        COUNT(CASE WHEN metric_type = 'greeting_response' 
              AND metric_value->>'type' = 'engage' THEN 1 END) as engaged_greetings,
        COUNT(CASE WHEN metric_type = 'greeting_response' 
              AND metric_value->>'type' = 'deflect' THEN 1 END) as deflected_greetings
      FROM conversation_metrics
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    
    return metrics.rows[0];
  }
}

export default MetricsService;