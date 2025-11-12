// test/loadTest.js
import getDatabase from '../services/DatabaseService.js';
import getMemoryManager from '../services/ConversationMemoryManager.js';

async function loadTestMemorySystem() {
  const db = await getDatabase();
  const memoryManager = getMemoryManager();
  const testChatId = 'loadtest_' + Date.now();
  
  console.log('🏋️ LOAD TEST: Memory System');
  console.log(`Test Chat ID: ${testChatId}`);
  console.log('-'.repeat(50));
  
  // Test 1: Bulk message insertion
  console.log('\n📝 Test 1: Adding 100 messages...');
  const startTime = Date.now();
  
  for (let i = 0; i < 100; i++) {
    await db.storeMessage(
      testChatId,
      i % 2 === 0 ? 'user' : 'bot',
      `Message ${i}: This is a test of the memory system under load conditions.`
    );
    
    if (i % 10 === 9) {
      console.log(`  Progress: ${i + 1}/100 messages`);
    }
  }
  
  const insertTime = Date.now() - startTime;
  console.log(`✅ Insertion complete: ${insertTime}ms (${insertTime/100}ms per message)`);
  
  // Test 2: Summarization performance
  console.log('\n🤖 Test 2: Summarization performance...');
  const sumStartTime = Date.now();
  
  // Should trigger 10 summarizations
  for (let batch = 0; batch < 10; batch++) {
    await memoryManager.performSummarization(testChatId);
    console.log(`  Batch ${batch + 1}/10 complete`);
  }
  
  const sumTime = Date.now() - sumStartTime;
  console.log(`✅ Summarization complete: ${sumTime}ms (${sumTime/10}ms per summary)`);
  
  // Test 3: Context retrieval performance
  console.log('\n🔍 Test 3: Context retrieval performance...');
  const queries = [
    "How are things going?",
    "What did we talk about?",
    "Tell me more about that",
    "I'm feeling anxious",
    "What should I do?"
  ];
  
  const contextStartTime = Date.now();
  for (const query of queries) {
    const context = await memoryManager.getEnhancedContext(testChatId, query);
    console.log(`  Query: "${query}" - Retrieved ${context.recentMessages?.length} messages`);
  }
  
  const contextTime = Date.now() - contextStartTime;
  console.log(`✅ Context retrieval: ${contextTime}ms (${contextTime/queries.length}ms per query)`);
  
  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  await db.supabase
    .from('conversation_history')
    .delete()
    .eq('chat_id', testChatId);
  
  await db.supabase
    .from('conversation_summaries')
    .delete()
    .eq('chat_id', testChatId);
  
  console.log('✅ Load test complete!');
  
  // Performance summary
  console.log('\n📊 PERFORMANCE SUMMARY:');
  console.log(`Message insertion: ${(1000 / (insertTime/100)).toFixed(1)} messages/second`);
  console.log(`Summarization: ${(sumTime/10/1000).toFixed(2)} seconds per batch`);
  console.log(`Context retrieval: ${(contextTime/queries.length).toFixed(1)}ms per query`);
}

loadTestMemorySystem().catch(console.error);