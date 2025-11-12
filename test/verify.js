// test/verify.js
import getDatabase from '../services/DatabaseService.js';

async function verifySetup() {
  console.log('✅ SETUP VERIFICATION');
  console.log('=' .repeat(40));
  
  const db = await getDatabase();
  const checks = {
    'Database connection': false,
    'Summarized column exists': false,
    'Summaries table exists': false,
    'Embeddings table exists': false,
    'Vector extension enabled': false
  };
  
  try {
    // Check database connection
    await db.supabase.from('conversation_history').select('count').limit(1);
    checks['Database connection'] = true;
    
    // Check summarized column
    const { data: columnCheck } = await db.supabase
      .from('conversation_history')
      .select('summarized')
      .limit(1);
    checks['Summarized column exists'] = columnCheck !== null;
    
    // Check summaries table
    const { error: summariesError } = await db.supabase
      .from('conversation_summaries')
      .select('count')
      .limit(1);
    checks['Summaries table exists'] = !summariesError;
    
    // Check embeddings table
    const { error: embeddingsError } = await db.supabase
      .from('conversation_embeddings')
      .select('count')
      .limit(1);
    checks['Embeddings table exists'] = !embeddingsError;
    
    // Check vector extension
    const { data: extensions } = await db.supabase
      .rpc('pg_available_extensions')
      .eq('name', 'vector');
    checks['Vector extension enabled'] = extensions && extensions.length > 0;
    
  } catch (error) {
    console.error('Verification error:', error.message);
  }
  
  // Display results
  console.log('\nVERIFICATION RESULTS:');
  let allPassed = true;
  
  for (const [check, passed] of Object.entries(checks)) {
    console.log(`${passed ? '✅' : '❌'} ${check}`);
    if (!passed) allPassed = false;
  }
  
  console.log('\n' + '=' .repeat(40));
  if (allPassed) {
    console.log('🎉 ALL CHECKS PASSED! System ready.');
  } else {
    console.log('⚠️  Some checks failed. Please review setup.');
  }
}

verifySetup().catch(console.error);