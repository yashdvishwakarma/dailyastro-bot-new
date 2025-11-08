// migration/transform-astronow.js

const MigrationPlan = {
  phase1: {
    name: "Foundation (Week 1)",
    tasks: [
      {
        file: "consciousness/PersonalityEngine.js",
        action: "CREATE",
        priority: 1,
        code: "// Copy PersonalityEngine code from above"
      },
      {
        file: "consciousness/ConversationDynamics.js",
        action: "CREATE",
        priority: 1,
        code: "// Copy ConversationDynamics code from above"
      },
      {
        file: "handlers/ConversationHandler.js",
        action: "REPLACE",
        priority: 1,
        backup: true
      },
      {
        file: "database/schema.sql",
        action: "MIGRATE",
        priority: 1,
        script: `
          -- Add new columns to existing tables
          ALTER TABLE users ADD COLUMN IF NOT EXISTS chosen_bot_name TEXT DEFAULT 'AstroNow';
          ALTER TABLE users ADD COLUMN IF NOT EXISTS ghost_risk_score FLOAT DEFAULT 0;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_conversation_style TEXT;
          
          -- Create new tables
          CREATE TABLE IF NOT EXISTS conversation_threads (...);
          CREATE TABLE IF NOT EXISTS relationships (...);
          CREATE TABLE IF NOT EXISTS bot_consciousness (...);
          CREATE TABLE IF NOT EXISTS conversation_memory (...);
        `
      }
    ]
  },
  
  phase2: {
    name: "Intelligence Layer (Week 2)",
    tasks: [
      {
        file: "intelligence/IntentAnalyzer.js",
        action: "CREATE",
        priority: 2
      },
      {
        file: "intelligence/SubtextReader.js",
        action: "CREATE",
        priority: 2
      },
      {
        file: "consciousness/MemoryWeaver.js",
        action: "CREATE",
        priority: 2
      },
      {
        file: "services/SelfMessageService.js",
        action: "CREATE",
        priority: 2
      }
    ]
  },
  

  phase3: {
    name: "Personality Injection (Week 3)",
    tasks: [
      {
        file: "utils/constants.js",
        action: "REPLACE",
        priority: 3,
        backup: true
      },
      {
        file: "consciousness/ValueGenerator.js",
        action: "CREATE",
        priority: 3
      },
      {
        file: "bot.js",
        action: "MODIFY",
        priority: 3,
        changes: [
          "Add self-message cron job",
          "Integrate PersonalityEngine",
          "Add conversation flow monitoring"
        ]
      }
    ]
  },
  
  phase4: {
    name: "Testing & Optimization (Week 4)",
    tasks: [
      {
        action: "A/B Testing",
        description: "Run both systems parallel for gradual rollout",
        percentage: "Start 10%, increase 20% daily"
      },
      {
        action: "Monitor Metrics",
        metrics: [
          "avg_conversation_length",
          "user_return_rate",
          "ghost_risk_reduction",
          "value_score_per_message"
        ]
      },
      {
        action: "Fine-tune",
        parameters: [
          "bot_mood_cycles",
          "question_frequency",
          "self_message_timing",
          "vulnerability_balance"
        ]
      }
    ]
  }
};

module.exports = MigrationPlan;