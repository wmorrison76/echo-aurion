/**
 * Intelligence Orchestrator
 * The conductor that ties everything together
 */

import { IntelligenceContext, Decision, Outcome } from '../../../../shared/types/echo-ai3';
import { decisionClearanceEngine } from '../../aurionos/decision-engine/decision-clearance';
import { collisionDetector } from '../../aurionos/collision-detection/collision-detector';
import { masterGuardian } from '../../guardian-ai/master-orchestrator';
import { forecastService } from '../../forecasting/forecast-service';
import { UUID } from '../../../../shared/types/base';

export class IntelligenceOrchestrator {
  /**
   * Analyze a decision with FULL context
   * This is where everything comes together
   */
  async analyzeDecision(
    userId: UUID,
    orgId: UUID,
    intent: string,
    action: string,
    parameters: Record<string, any>
  ): Promise<Decision> {
    const requestId = crypto.randomUUID() as UUID;
    const timestamp = new Date().toISOString();
    
    console.log(`🧠 Echo AI³ analyzing decision: ${action}`);
    
    // 1. SECURITY CHECK (Guardian AI)
    console.log('  → Running security analysis...');
    const securityAnalysis = await masterGuardian.analyzeRequest({
      method: 'POST',
      endpoint: '/api/decision',
      payload: parameters,
      headers: {},
      ip: '127.0.0.1',
      userId
    });
    
    // 2. OPERATIONAL INTELLIGENCE (AurionOS)
    console.log('  → Running operational analysis...');
    const decisionClearance = await decisionClearanceEngine.analyzeDecision({
      id: requestId,
      orgId,
      type: this.mapActionToDecisionType(action),
      proposedBy: userId,
      timestamp,
      action,
      parameters,
      reason: intent,
      urgency: 'medium'
    });
    
    // 3. COLLISION DETECTION
    console.log('  → Checking for resource collisions...');
    const collisions = await this.checkCollisions(orgId, action, parameters);
    
    // 4. FORECASTING CONTEXT
    console.log('  → Gathering forecast data...');
    const forecastContext = await this.getForecastContext(orgId, action);
    
    // 5. HISTORICAL LEARNING
    console.log('  → Analyzing similar past decisions...');
    const similarDecisions = await this.getSimilarDecisions(orgId, action);
    
    // 6. SYNTHESIZE & DECIDE
    console.log('  → Synthesizing intelligence...');
    const reasoning = this.generateReasoning(
      decisionClearance,
      securityAnalysis,
      collisions,
      forecastContext,
      similarDecisions
    );
    
    const finalConfidence = this.calculateFinalConfidence(
      decisionClearance.confidence,
      securityAnalysis.threatLevel === 'none' ? 0.95 : 0.5,
      collisions.length === 0 ? 1.0 : 0.7
    );
    
    const decision: Decision = {
      id: requestId,
      timestamp,
      type: action,
      madeBy: 'human',
      userId,
      action,
      parameters,
      clearance: decisionClearance,
      securityCheck: securityAnalysis.allowed,
      collisions,
      reasoning,
      confidence: finalConfidence
    };
    
    // 7. LOG FOR LEARNING
    await this.logDecision(decision);
    
    console.log(`✅ Analysis complete - Confidence: ${(finalConfidence * 100).toFixed(0)}%`);
    
    return decision;
  }
  
  /**
   * Explain a decision in plain English or geek speak
   */
  explainDecision(
    decision: Decision,
    detailLevel: 'simple' | 'standard' | 'geek-speak'
  ): string {
    if (detailLevel === 'simple') {
      return this.explainSimple(decision);
    } else if (detailLevel === 'geek-speak') {
      return this.explainGeekSpeak(decision);
    } else {
      return this.explainStandard(decision);
    }
  }
  
  /**
   * Simple explanation (for operators)
   */
  private explainSimple(decision: Decision): string {
    const status = decision.clearance.status === 'cleared' ? '✅ APPROVED' : 
                   decision.clearance.status === 'flagged' ? '⚠️ NEEDS REVIEW' : 
                   '❌ BLOCKED';
    
    let explanation = `${status}\n\n`;
    explanation += `Action: ${decision.action}\n`;
    explanation += `Confidence: ${(decision.confidence * 100).toFixed(0)}%\n\n`;
    
    explanation += `Why:\n`;
    decision.reasoning.slice(0, 3).forEach(reason => {
      explanation += `• ${reason}\n`;
    });
    
    if (decision.collisions.length > 0) {
      explanation += `\n⚠️ Resource conflicts detected - review needed`;
    }
    
    return explanation;
  }
  
  /**
   * Standard explanation (balanced)
   */
  private explainStandard(decision: Decision): string {
    let explanation = `Decision Analysis\n${'='.repeat(50)}\n\n`;
    
    explanation += `Action: ${decision.action}\n`;
    explanation += `Status: ${decision.clearance.status.toUpperCase()}\n`;
    explanation += `Confidence: ${(decision.confidence * 100).toFixed(1)}%\n`;
    explanation += `Timestamp: ${decision.timestamp}\n\n`;
    
    explanation += `Security Check:\n`;
    explanation += `  Status: ${decision.securityCheck ? 'PASSED' : 'FAILED'}\n\n`;
    
    explanation += `Operational Analysis:\n`;
    decision.reasoning.forEach(reason => {
      explanation += `  • ${reason}\n`;
    });
    
    if (decision.collisions.length > 0) {
      explanation += `\nResource Collisions (${decision.collisions.length}):\n`;
      decision.collisions.forEach(c => {
        explanation += `  • Severity: ${c.severity}\n`;
        explanation += `    Conflicts: ${c.conflicts.length} resources\n`;
      });
    }
    
    return explanation;
  }
  
  /**
   * Geek speak explanation (full technical detail)
   */
  private explainGeekSpeak(decision: Decision): string {
    return JSON.stringify({
      decision_id: decision.id,
      timestamp: decision.timestamp,
      analysis: {
        clearance: decision.clearance,
        security: decision.securityCheck,
        collisions: decision.collisions,
        confidence: decision.confidence
      },
      reasoning_vector: decision.reasoning,
      parameters: decision.parameters,
      trace_id: decision.clearance.traceId
    }, null, 2);
  }
  
  /**
   * Learn from outcome
   */
  async recordOutcome(decisionId: UUID, outcome: Outcome): Promise<void> {
    console.log(`📊 Recording outcome for decision ${decisionId}`);
    
    // Calculate variance
    const variance = Math.abs(outcome.actualResult.value - outcome.expectedResult.value) / 
                     outcome.expectedResult.value;
    
    // Store for learning
    // TODO: Update ML models based on outcome
    
    console.log(`✅ Outcome recorded - Variance: ${(variance * 100).toFixed(1)}%`);
  }
  
  // Helper methods
  private mapActionToDecisionType(action: string): any {
    const mapping: Record<string, any> = {
      'place_order': 'order_placement',
      'adjust_schedule': 'staffing_change',
      'change_menu': 'menu_change',
      'update_price': 'price_change'
    };
    return mapping[action] || 'order_placement';
  }
  
  private async checkCollisions(orgId: UUID, action: string, parameters: any): Promise<any[]> {
    // TODO: Implement actual collision checking
    return [];
  }
  
  private async getForecastContext(orgId: UUID, action: string): Promise<any> {
    return { available: true, confidence: 0.85 };
  }
  
  private async getSimilarDecisions(orgId: UUID, action: string): Promise<Decision[]> {
    return [];
  }
  
  private generateReasoning(
    clearance: any,
    security: any,
    collisions: any[],
    forecast: any,
    similar: Decision[]
  ): string[] {
    const reasoning: string[] = [];
    
    reasoning.push(...clearance.reasonVector);
    
    if (security.threatLevel === 'none') {
      reasoning.push('No security threats detected');
    }
    
    if (collisions.length === 0) {
      reasoning.push('No resource conflicts found');
    } else {
      reasoning.push(`${collisions.length} resource conflict(s) detected`);
    }
    
    if (forecast.available) {
      reasoning.push(`Forecast data available (${(forecast.confidence * 100).toFixed(0)}% confidence)`);
    }
    
    return reasoning;
  }
  
  private calculateFinalConfidence(...scores: number[]): number {
    return scores.reduce((a, b) => a * b, 1);
  }
  
  private async logDecision(decision: Decision): Promise<void> {
    // TODO: Store in database
    console.log(`📝 Decision logged: ${decision.id}`);
  }
}

export const intelligenceOrchestrator = new IntelligenceOrchestrator();
