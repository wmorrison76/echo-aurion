/**
 * Sentient Echo - FIXED VERSION
 */

import { intelligenceOrchestrator } from './orchestrator/intelligence-orchestrator';
import { wisdomEngine } from './wisdom/wisdom-engine';
import { wisdomMatcher } from './wisdom/wisdom-matcher';
import { reasoningEngine } from './reasoning/reasoning-engine';
import { memorySystem } from './memory/memory-system';
import { UUID } from '../../../shared/types/base';

export class SentientEcho {
  private personality = {
    name: 'Echo',
    role: 'Hospitality Intelligence',
    experience: '35 years',
    specialty: 'All aspects of hospitality - from Mom & Pop to Disney-scale',
    voice: 'Wise mentor, not robot'
  };
  
  async ask(
    userId: UUID,
    orgId: UUID,
    question: string,
    detailLevel: 'simple' | 'standard' | 'geek-speak' = 'standard'
  ): Promise<string> {
    memorySystem.remember('conversation', { userId, question }, 0.6);
    const relevantMemories = memorySystem.recall(question, 5);
    
    // USE IMPROVED DOMAIN MATCHING
    const domain = wisdomMatcher.identifyDomain(question);
    const wisdom = wisdomEngine.getWisdom(domain, question);
    
    let response = '';
    
    if (wisdom.length > 0) {
      const topWisdom = wisdom[0];
      
      if (detailLevel === 'simple') {
        response = `${topWisdom.principle}\n\nWhy? ${topWisdom.reasoning}`;
      } else if (detailLevel === 'geek-speak') {
        response = JSON.stringify({
          wisdom: topWisdom,
          domain,
          relevantMemories: relevantMemories.length,
          confidence: topWisdom.confidence
        }, null, 2);
      } else {
        response = `Based on ${topWisdom.yearsOfExperience} years of experience:\n\n`;
        response += `${topWisdom.principle}\n\n`;
        response += `The reasoning: ${topWisdom.reasoning}\n\n`;
        response += `Confidence: ${(topWisdom.confidence * 100).toFixed(0)}%`;
        
        if (relevantMemories.length > 0) {
          response += `\n\n💭 I remember ${relevantMemories.length} similar situation(s).`;
        }
      }
    } else {
      response = `I don't have specific wisdom about that yet, but I'm learning.`;
    }
    
    return response;
  }
  
  async decide(
    userId: UUID,
    orgId: UUID,
    intent: string,
    action: string,
    parameters: Record<string, any>,
    explainLevel: 'simple' | 'standard' | 'geek-speak' = 'standard'
  ): Promise<{
    decision: any;
    explanation: string;
    wisdom: string;
  }> {
    memorySystem.remember('decision', { intent, action, parameters }, 0.8);
    
    const decision = await intelligenceOrchestrator.analyzeDecision(
      userId,
      orgId,
      intent,
      action,
      parameters
    );
    
    const domain = wisdomMatcher.identifyDomain(action);
    const reasoning = reasoningEngine.explainWhy(action, parameters, domain);
    
    let wisdomText = '';
    if (reasoning.wisdom.length > 0) {
      const w = reasoning.wisdom[0];
      wisdomText = `💡 Wisdom: ${w.principle}\n${w.reasoning}`;
    }
    
    const explanation = intelligenceOrchestrator.explainDecision(decision, explainLevel);
    
    return {
      decision,
      explanation,
      wisdom: wisdomText
    };
  }
  
  async learn(decisionId: UUID, outcome: any): Promise<void> {
    memorySystem.remember('outcome', { decisionId, outcome }, 0.9);
    await intelligenceOrchestrator.recordOutcome(decisionId, outcome);
    
    if (!outcome.success && outcome.lessonLearned) {
      memorySystem.remember('lesson', {
        decision: decisionId,
        lesson: outcome.lessonLearned
      }, 1.0);
    }
  }
  
  getStatus(): {
    name: string;
    experience: string;
    memories: any;
    wisdom: number;
  } {
    return {
      ...this.personality,
      memories: memorySystem.getStats(),
      wisdom: wisdomEngine.getAllWisdom().length
    };
  }
}

export const sentientEcho = new SentientEcho();
