/**
 * Test Echo AI³ Integration
 */

import { intelligenceOrchestrator } from './orchestrator/intelligence-orchestrator';

async function testEchoAI3() {
  console.log('🧪 Testing Echo AI³ Integration\n');
  
  // Test 1: Simple decision
  console.log('Test 1: Order Placement Decision');
  console.log('─'.repeat(50));
  
  const decision1 = await intelligenceOrchestrator.analyzeDecision(
    'user-123' as any,
    'org-456' as any,
    'Need chicken for weekend rush',
    'place_order',
    {
      item: 'chicken breast',
      quantity: 50,
      unit: 'lbs',
      vendor: 'Sysco'
    }
  );
  
  console.log('\n📄 Simple Explanation:');
  console.log(intelligenceOrchestrator.explainDecision(decision1, 'simple'));
  
  console.log('\n📄 Standard Explanation:');
  console.log(intelligenceOrchestrator.explainDecision(decision1, 'standard'));
  
  console.log('\n📄 Geek Speak:');
  console.log(intelligenceOrchestrator.explainDecision(decision1, 'geek-speak'));
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Echo AI³ Test Complete!');
}

testEchoAI3().catch(console.error);
