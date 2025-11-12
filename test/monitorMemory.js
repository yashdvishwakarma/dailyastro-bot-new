// test/monitorMemory.js
import getDatabase from '../services/DatabaseService.js';
import getMemoryManager from '../services/ConversationMemoryManager.js';

async function monitorMemorySystem() {
  const db = await getDatabase();
  const chatId = process.argv[2] || '6729670408'; // Can pass chat ID as argument
  
  console.clear();
  console.log('🔮 MEMORY SYSTEM MONITOR');
  console.log('=' .repeat(50));
  console.log(`Chat ID: ${chatId}`);
  console.log(`Time: ${new Date().toLocaleString()}`);
  console.log('=' .repeat(50));
  
  // 1. Message Stats
  const totalMessages = await db.getMessageCount(chatId);
  const unsummarizedCount = await db.getUnsummarizedMessageCount(chatId);
  
  console.log('\n📊 MESSAGE STATISTICS:');
  console.log(`Total Messages: ${totalMessages}`);
  console.log(`Unsummarized: ${unsummarizedCount}`);
  console.log(`Summarized: ${totalMessages - unsummarizedCount}`);
  console.log(`Progress to next summary: ${unsummarizedCount}/10`);
  
  // 2. Summary Stats
  const summaries = await db.getRecentSummaries(chatId, 5);
  
  console.log('\n📚 SUMMARIES:');
  console.log(`Total Summaries: ${summaries.length}`);
  
  if (summaries.length > 0) {
    console.log('\nLatest Summaries:');
    summaries.forEach((summary, idx) => {
      console.log(`\n${idx + 1}. Created: ${new Date(summary.created_at).toLocaleString()}`);
      console.log(`   Messages: ${summary.message_count}`);
      console.log(`   Preview: "${summary.summary_text.substring(0, 100)}..."`);
    });
  }
  
  // 3. Embedding Stats
  const { data: embeddings } = await db.supabase
    .from('conversation_embeddings')
    .select('id')
    .eq('chat_id', chatId);
  
  console.log(`\n🧮 EMBEDDINGS: ${embeddings?.length || 0} stored`);
  
  // 4. Recent Activity
  const recentMessages = await db.getFullRecentMessages(chatId, 5);
  
  console.log('\n💬 RECENT ACTIVITY:');
  recentMessages.forEach((msg, idx) => {
    const time = new Date(msg.created_at).toLocaleTimeString();
    const preview = msg.message.substring(0, 60);
    console.log(`${time} [${msg.sender}]: ${preview}...`);
  });
  
  // 5. Memory Health Check
  console.log('\n🏥 HEALTH CHECK:');
  const memoryManager = getMemoryManager();
  const testContext = await memoryManager.getEnhancedContext(chatId, "test");
  
  console.log(`✅ Context Retrieval: ${testContext.hasContext ? 'Working' : 'No context yet'}`);
  console.log(`✅ Recent Messages: ${testContext.recentMessages?.length || 0} retrieved`);
  console.log(`✅ Summaries Available: ${testContext.summaries?.length || 0}`);
  console.log(`✅ Semantic Search: ${testContext.semanticMatches?.length || 0} matches`);
  
  console.log('\n' + '=' .repeat(50));
  console.log('Monitor complete. Press Ctrl+C to exit.');
}

// Auto-refresh every 10 seconds
async function autoMonitor() {
  while (true) {
    await monitorMemorySystem();
    await new Promise(resolve => setTimeout(resolve, 10000));
    console.clear();
  }
}

// Run monitor
if (process.argv.includes('--auto')) {
  autoMonitor().catch(console.error);
} else {
  monitorMemorySystem().catch(console.error);
}