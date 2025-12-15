// services/MetricsService.js - NEW FILE

import getDatabase from './DatabaseService.js';

class MetricsService {
  constructor(dbInstance = null) {
    this.dbPromise = dbInstance ? Promise.resolve(dbInstance) : getDatabase();
  }

  async getDb() {
    if (!this.db) {
      this.db = await this.dbPromise;
    }
    return this.db;
  }




  async trackVulnerability(userId, messageNumber, message, severity, emotion) {
    // Track when users first share something vulnerable


    const existing = await db.query(
      'SELECT id FROM vulnerability_metrics WHERE user_id = $1 LIMIT 1',
      [userId]
    );

    if (!existing.rows.length) {
      // First vulnerable share
      await db.query(`
        INSERT INTO vulnerability_metrics 
        (user_id, message_number, vulnerability_type, message, severity)
        VALUES ($1, $2, $3, $4, $5)
      `, [userId, messageNumber, emotion, message, severity]);

      // console.log(`📊 First vulnerability at message #${messageNumber}: "${message.substring(0, 50)}..."`);
    }
  }





  async trackGhosting(userId, lastMessageCount) {
    // Track if user ghosts after 5 messages
    const db = await this.getDb();
    if (lastMessageCount === 5) {

      db.logConversationMetric(userId, 'potential_ghost', { message_count: 5, timestamp: new Date() });
      // await db.query(`
      //   INSERT INTO conversation_metrics 
      //   (user_id, metric_type, metric_value)
      //   VALUES ($1, 'potential_ghost', $2)
      // `, [userId, { message_count: 5, timestamp: new Date() }]);
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

    const db = await this.getDb();
    db.logConversationMetric(userId, 'greeting_response', { type: responseType, response: response.substring(0, 100) });
    // await db.query(`
    //   INSERT INTO conversation_metrics 
    //   (user_id, metric_type, metric_value)
    //   VALUES ($1, 'greeting_response', $2)
    // `, [userId, { type: responseType, response: response.substring(0, 100) }]);

    // console.log(`📊 Greeting response type: ${responseType}`);
  }

  // async getDailyMetrics() {

  //   const db = await this.getDb();

  //   const metrics = await db.query(`
  //     SELECT 
  //       COUNT(DISTINCT user_id) as total_users,
  //       AVG(CAST(metric_value->>'message_count' AS INTEGER)) as avg_messages_before_vulnerability,
  //       COUNT(CASE WHEN metric_type = 'potential_ghost' THEN 1 END) as ghost_after_5,
  //       COUNT(CASE WHEN metric_type = 'greeting_response' 
  //             AND metric_value->>'type' = 'engage' THEN 1 END) as engaged_greetings,
  //       COUNT(CASE WHEN metric_type = 'greeting_response' 
  //             AND metric_value->>'type' = 'deflect' THEN 1 END) as deflected_greetings
  //     FROM conversation_metrics
  //     WHERE created_at > NOW() - INTERVAL '24 hours'
  //   `);
  //   console.log('📊 Daily metrics collected:', metrics);
  //   if (metrics.data === null) 
  //   {
  //     return null ;
  //   }
  //   else
  //   {
  //     return metrics.rows[0];
  //   }
  // }

  async getDailyMetrics() {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await this.supabase
        .from('conversation_metrics')
        .select('user_id, metric_type, metric_value, created_at')
        .gt('created_at', since);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const users = new Set();
      let ghostAfter5 = 0;
      let engaged = 0;
      let deflected = 0;
      const messageCounts = [];

      for (const row of data) {
        users.add(row.user_id);
        const val = typeof row.metric_value === 'string' ? JSON.parse(row.metric_value) : row.metric_value;

        if (row.metric_type === 'potential_ghost') ghostAfter5++;
        if (row.metric_type === 'greeting_response') {
          if (val.type === 'engage') engaged++;
          if (val.type === 'deflect') deflected++;
        }
        if (val?.message_count) messageCounts.push(val.message_count);
      }

      const avgMessages =
        messageCounts.length > 0
          ? messageCounts.reduce((a, b) => a + b, 0) / messageCounts.length
          : 0;

      const metrics = {
        total_users: users.size,
        avg_messages_before_vulnerability: avgMessages,
        ghost_after_5: ghostAfter5,
        engaged_greetings: engaged,
        deflected_greetings: deflected
      };

      console.log('📊 Daily metrics collected:', metrics);
      return metrics;
    } catch (err) {
      console.error('Error computing daily metrics:', err);
      return null;
    }
  }
  // Log any metric (replaces all raw INSERT INTO conversation_metrics ...)


  // Static helpers for OpenAIService usage
  static increment(metric) {
    console.log(`[Metrics] Increment: ${metric}`);
  }

  static log(metric, data) {
    console.log(`[Metrics] Log: ${metric}`, data);
  }
}

export default MetricsService;