/**
 * Reasoning Engine
 * Explains WHY, not just WHAT
 */

import { wisdomEngine } from '../wisdom/wisdom-engine';

export class ReasoningEngine {
  /**
   * Explain why a decision should be made
   */
  explainWhy(
    decision: string,
    context: Record<string, any>,
    domain: string
  ): {
    reasoning: string[];
    wisdom: any[];
    confidence: number;
    recommendation: 'strongly_recommend' | 'recommend' | 'consider' | 'caution' | 'avoid';
  } {
    const reasoning: string[] = [];
    const relevantWisdom = wisdomEngine.getWisdom(domain, decision);
    
    // Apply wisdom to reasoning
    if (relevantWisdom.length > 0) {
      relevantWisdom.slice(0, 3).forEach(w => {
        reasoning.push(`Experience shows: ${w.principle}`);
        reasoning.push(`Because: ${w.reasoning}`);
      });
    }
    
    // Analyze context
    if (context.forecast) {
      reasoning.push(`Forecast predicts ${context.forecast.demand} covers`);
    }
    
    if (context.inventory) {
      reasoning.push(`Current inventory: ${context.inventory.status}`);
    }
    
    if (context.historical) {
      reasoning.push(`Historical data shows ${context.historical.pattern}`);
    }
    
    // Calculate recommendation
    const avgConfidence = relevantWisdom.length > 0
      ? relevantWisdom.reduce((sum, w) => sum + w.confidence, 0) / relevantWisdom.length
      : 0.5;
    
    let recommendation: any = 'consider';
    if (avgConfidence > 0.95) recommendation = 'strongly_recommend';
    else if (avgConfidence > 0.85) recommendation = 'recommend';
    else if (avgConfidence < 0.6) recommendation = 'caution';
    else if (avgConfidence < 0.4) recommendation = 'avoid';
    
    return {
      reasoning,
      wisdom: relevantWisdom,
      confidence: avgConfidence,
      recommendation
    };
  }
  
  /**
   * Explain a past decision
   */
  explainPastDecision(
    decision: any,
    outcome: any
  ): string {
    let explanation = `Decision: ${decision.action}\n`;
    explanation += `Outcome: ${outcome.success ? 'Success' : 'Failed'}\n\n`;
    
    if (outcome.success) {
      explanation += `✅ This worked because:\n`;
    } else {
      explanation += `❌ This failed because:\n`;
    }
    
    explanation += decision.reasoning.map((r: string) => `  • ${r}`).join('\n');
    
    if (outcome.lessonLearned) {
      explanation += `\n\n📚 Lesson Learned: ${outcome.lessonLearned}`;
    }
    
    return explanation;
  }
}

export const reasoningEngine = new ReasoningEngine();
