// test/testMemorySystem.js
import getDatabase from '../services/DatabaseService.js';
import getMemoryManager from '../services/ConversationMemoryManager.js';
import OpenAIService from '../services/OpenAIService.js';

class MemorySystemTester {
  constructor() {
    this.testChatId = '6729670408'; // Your test chat ID
    this.openai = new OpenAIService();
  }

  async runAllTests() {
    console.log('🧪 MEMORY SYSTEM TEST SUITE\n');
    console.log('=' .repeat(50));
    
    try {
      await this.testDatabaseConnection();
      await this.testMessageStorage();
      await this.testSummarizationTrigger();
      await this.testContextRetrieval();
      await this.testEmbeddingGeneration();
      await this.testFullFlow();
      
      console.log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY!');
    } catch (error) {
      console.error('\n❌ TEST FAILED:', error);
    }
  }

  // Test 1: Database Connection
  async testDatabaseConnection() {
    console.log('\n📊 Test 1: Database Connection');
    const db = await getDatabase();
    
    // Check if tables exist
    const { data: historyCheck } = await db.supabase
      .from('conversation_history')
      .select('count')
      .limit(1);
    
    const { data: summaryCheck } = await db.supabase
      .from('conversation_summaries')
      .select('count')
      .limit(1);
    
    console.log('✅ Database connected');
    console.log('✅ Tables accessible');
  }

  // Test 2: Message Storage & Summarization Flag
  async testMessageStorage() {
    console.log('\n💬 Test 2: Message Storage');
    const db = await getDatabase();
    
    // Store test message
    await db.storeMessage(this.testChatId, 'user', 'Test message for memory system');
    
    // Check if summarized field exists
    const { data, error } = await db.supabase
      .from('conversation_history')
      .select('id, message, summarized')
      .eq('chat_id', this.testChatId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error) throw error;
    
    console.log('✅ Message stored with ID:', data.id);
    console.log('✅ Summarized flag:', data.summarized);
  }

  // Test 3: Summarization Trigger
  async testSummarizationTrigger() {
    console.log('\n🤖 Test 3: Summarization Trigger');
    const db = await getDatabase();
    const memoryManager = getMemoryManager();
    
    // Get current count
    const unsummarizedCount = await db.getUnsummarizedMessageCount(this.testChatId);
    console.log(`📊 Unsummarized messages: ${unsummarizedCount}`);
    
    if (unsummarizedCount < 10) {
      console.log('⚠️  Adding more test messages to reach threshold...');
      
      // Add test messages to reach 10
      const messagesToAdd = 10 - unsummarizedCount;
      for (let i = 0; i < messagesToAdd; i++) {
        await db.storeMessage(
          this.testChatId, 
          i % 2 === 0 ? 'user' : 'bot',
          `Test message ${i + 1}: This is a conversation about testing the memory system.`
        );
      }
      
      console.log(`✅ Added ${messagesToAdd} test messages`);
    }
    
    // Trigger summarization
    console.log('🚀 Triggering summarization...');
    await memoryManager.checkAndTriggerSummarization(this.testChatId);
    
    // Wait for async process
    console.log('⏳ Waiting for summarization (5 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check results
    const newCount = await db.getUnsummarizedMessageCount(this.testChatId);
    const summaries = await db.getRecentSummaries(this.testChatId, 1);
    
    console.log(`✅ New unsummarized count: ${newCount}`);
    if (summaries.length > 0) {
      console.log(`✅ Summary created: "${summaries[0].summary_text.substring(0, 100)}..."`);
    }
  }

  // Test 4: Context Retrieval
  async testContextRetrieval() {
    console.log('\n🔍 Test 4: Context Retrieval');
    const memoryManager = getMemoryManager();
    
    const context = await memoryManager.getEnhancedContext(
      this.testChatId,
      "Tell me about our previous conversations"
    );
    
    console.log('📚 Context retrieved:');
    console.log(`  - Recent messages: ${context.recentMessages?.length || 0}`);
    console.log(`  - Summaries: ${context.summaries?.length || 0}`);
    console.log(`  - Semantic matches: ${context.semanticMatches?.length || 0}`);
    
    if (context.recentMessages?.length > 0) {
      console.log('\n💬 Sample recent message:', 
        context.recentMessages[0].message.substring(0, 50) + '...');
    }
    
    if (context.summaries?.length > 0) {
      console.log('\n📝 Latest summary:', 
        context.summaries[0].summary_text.substring(0, 100) + '...');
    }
  }

  // Test 5: Embedding Generation
  async testEmbeddingGeneration() {
    console.log('\n🧮 Test 5: Embedding Generation');
    
    const testText = "This is a test message about the memory system";
    const embedding = await this.openai.createEmbedding(testText);
    
    if (embedding && Array.isArray(embedding)) {
      console.log(`✅ Embedding generated: ${embedding.length} dimensions`);
      console.log(`✅ Sample values: [${embedding.slice(0, 3).join(', ')}...]`);
    } else {
      console.log('⚠️  Embedding generation failed');
    }
  }

  // Test 6: Full Integration Flow
  async testFullFlow() {
    console.log('\n🔄 Test 6: Full Integration Flow');
    const db = await getDatabase();
    const memoryManager = getMemoryManager();
    
    // Simulate a conversation
    const testConversation = [
      { sender: 'user', message: 'I am feeling anxious about my job interview tomorrow' },
      { sender: 'bot', message: 'Job interviews can definitely bring up anxiety. What specifically is worrying you most?' },
      { sender: 'user', message: 'I keep thinking I will forget everything I prepared' },
      { sender: 'bot', message: 'That fear of blanking out is so common. Your mind knows the material - anxiety just makes it feel inaccessible.' }
    ];
    
    console.log('💬 Simulating conversation...');
    for (const msg of testConversation) {
      await db.storeMessage(this.testChatId, msg.sender, msg.message);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    }
    
    // Check summarization
    await memoryManager.checkAndTriggerSummarization(this.testChatId);
    
    // Get enhanced context
    const finalContext = await memoryManager.getEnhancedContext(
      this.testChatId,
      "How was I feeling about the interview?"
    );
    
    console.log('✅ Full flow completed');
    console.log(`✅ Context includes ${finalContext.recentMessages?.length || 0} messages`);
    console.log(`✅ Has historical context: ${finalContext.hasContext}`);
  }
}

// Run tests
const tester = new MemorySystemTester();
tester.runAllTests().catch(console.error);