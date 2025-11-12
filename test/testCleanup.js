// test/testCleanup.js
import CleanupService from '../services/CleanupService.js';

async function testCleanup() {
  const cleanup = new CleanupService();
  
  console.log('📊 Getting cleanup stats...');
  const stats = await cleanup.getCleanupStats();
  console.log(stats);
  
  if (stats.nextCleanupNeeded) {
    console.log('\n🧹 Running cleanup...');
    const result = await cleanup.performCleanup();
    console.log('Results:', result);
  } else {
    console.log('\n✅ No cleanup needed yet');
  }
}

testCleanup().catch(console.error);