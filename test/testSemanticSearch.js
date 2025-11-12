// test/testSemanticSearch.js
import getDatabase from '../services/DatabaseService.js';
import OpenAIService from '../services/OpenAIService.js';

async function testSemanticSearch() {
  const db = await getDatabase();
  const openai = new OpenAIService();
  const chatId = '6729670408';
  
  console.log('🔍 Testing Semantic Search Fix...\n');
  
  // Create a test embedding
  const testQuery = "Tell me about our previous conversations";
  const embedding = await openai.createEmbedding(testQuery);
  
  if (!embedding) {
    console.log('❌ Failed to create embedding');
    return;
  }
  
  console.log('✅ Embedding created');
  
  // Test the semantic search
  try {
    const results = await db.semanticSearch(chatId, embedding, 5);
    
    if (results && results.length > 0) {
      console.log(`✅ Semantic search working! Found ${results.length} matches:`);
      results.forEach((result, idx) => {
        console.log(`\n${idx + 1}. Similarity: ${result.similarity.toFixed(3)}`);
        console.log(`   Content: "${result.content.substring(0, 100)}..."`);
      });
    } else {
      console.log('⚠️  No semantic matches found (might need more summaries with embeddings)');
    }
  } catch (error) {
    console.error('❌ Semantic search error:', error.message);
  }
}

testSemanticSearch().catch(console.error);