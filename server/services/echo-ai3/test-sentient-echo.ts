/**
 * Test Sentient Echo
 */

import { sentientEcho } from './sentient-echo';

async function testSentientEcho() {
  console.log('🌟 Testing Sentient Echo\n');
  console.log('='.repeat(60));
  
  // Test 1: Ask Echo a question
  console.log('\n📝 Test 1: Asking Echo about ordering');
  console.log('-'.repeat(60));
  
  const answer1 = await sentientEcho.ask(
    'user-123' as any,
    'org-456' as any,
    'Should I order fish daily or weekly?',
    'standard'
  );
  
  console.log('\n💬 Echo says:');
  console.log(answer1);
  
  // Test 2: Ask about staffing
  console.log('\n\n📝 Test 2: Asking Echo about staffing');
  console.log('-'.repeat(60));
  
  const answer2 = await sentientEcho.ask(
    'user-123' as any,
    'org-456' as any,
    'My best server just called out for dinner rush. What do I do?',
    'simple'
  );
  
  console.log('\n💬 Echo says:');
  console.log(answer2);
  
  // Test 3: Make a decision with wisdom
  console.log('\n\n📝 Test 3: Making a decision with Echo');
  console.log('-'.repeat(60));
  
  const decision = await sentientEcho.decide(
    'user-123' as any,
    'org-456' as any,
    'Need supplies for weekend rush',
    'place_order',
    { item: 'chicken breast', qty: 50, unit: 'lbs' },
    'standard'
  );
  
  console.log('\n📊 Decision:');
  console.log(decision.explanation);
  console.log('\n' + decision.wisdom);
  
  // Test 4: Echo's status
  console.log('\n\n📝 Test 4: Echo Status');
  console.log('-'.repeat(60));
  
  const status = sentientEcho.getStatus();
  console.log(JSON.stringify(status, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Sentient Echo Tests Complete!');
  console.log('\n🌟 Echo is alive with 35 years of hospitality wisdom');
}

testSentientEcho().catch(console.error);
