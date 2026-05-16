/**
 * Test database connection
 * Run with: npm run db:test
 */

import { testConnection, closePool } from './connection';

async function main() {
  console.log('🔍 Testing database connection...\n');
  
  try {
    const success = await testConnection();
    
    if (success) {
      console.log('\n✅ Connection test PASSED');
      console.log('   Your database is ready to use!');
      process.exit(0);
    } else {
      console.log('\n❌ Connection test FAILED');
      console.log('   Check your DATABASE_URL and network access');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Connection test error:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
