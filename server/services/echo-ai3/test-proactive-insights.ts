/**
 * Test Proactive Insights
 */

import { proactiveEngine } from './proactive/proactive-engine';

async function testProactiveInsights() {
  console.log('🔮 Testing Proactive Insights\n');
  console.log('='.repeat(60));
  
  const insights = await proactiveEngine.generateInsights('org-test' as any);
  
  console.log(`\n📊 Generated ${insights.length} insights:\n`);
  
  insights.forEach((insight, idx) => {
    console.log(`${idx + 1}. [${insight.priority.toUpperCase()}] ${insight.title}`);
    console.log(`   Type: ${insight.type}`);
    console.log(`   ${insight.description}`);
    console.log(`   Impact: ${insight.impact}`);
    console.log(`   Confidence: ${(insight.confidence * 100).toFixed(0)}%`);
    console.log(`   Action: ${insight.suggestedAction}`);
    console.log(`   Time: ${insight.estimatedTimeToResolve}`);
    if (insight.wisdomBased) {
      console.log(`   💡 Wisdom: ${insight.wisdomBased}`);
    }
    if (insight.dueBy) {
      console.log(`   ⏰ Due: ${new Date(insight.dueBy).toLocaleString()}`);
    }
    console.log('');
  });
  
  console.log('='.repeat(60));
  console.log('✅ Proactive Insights Test Complete!');
  console.log('\nEcho is now PROACTIVE - tells you what to do before you ask!');
}

testProactiveInsights().catch(console.error);
