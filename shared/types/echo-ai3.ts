/**
 * Echo AI³ - Unified Intelligence System
 * Orchestrates Guardian AI + AurionOS + Learning
 */

import { UUID, ISODate } from './base';
import { DecisionClearance, CollisionDetection, YieldCalculation } from './aurionos';
import { SecurityEvent, ThreatLevel } from './security';

// ============================================================================
// INTELLIGENCE ORCHESTRATION
// ============================================================================

export interface IntelligenceContext {
  requestId: UUID;
  userId: UUID;
  orgId: UUID;
  timestamp: ISODate;
  
  // What's happening
  intent: string;
  action: string;
  parameters: Record<string, any>;
  
  // Context signals
  security: {
    threatLevel: ThreatLevel;
    recentEvents: SecurityEvent[];
  };
  operational: {
    decisionClearance?: DecisionClearance;
    collisions?: CollisionDetection[];
  };
  forecasting: {
    demand?: number;
    confidence?: number;
  };
  
  // Historical context
  similarDecisions: Decision[];
  outcomes: Outcome[];
}

export interface Decision {
  id: UUID;
  timestamp: ISODate;
  type: string;
  madeBy: 'human' | 'system';
  userId?: UUID;
  
  // Decision details
  action: string;
  parameters: Record<string, any>;
  
  // Intelligence analysis
  clearance: DecisionClearance;
  securityCheck: boolean;
  collisions: CollisionDetection[];
  
  // Outcome (filled later)
  outcome?: Outcome;
  
  // Explanation
  reasoning: string[];
  confidence: number;
}

export interface Outcome {
  decisionId: UUID;
  timestamp: ISODate;
  
  // What actually happened
  success: boolean;
  actualResult: Record<string, any>;
  expectedResult: Record<string, any>;
  
  // Impact
  financialImpact: number;
  operationalImpact: string;
  customerImpact?: string;
  
  // Learning
  variance: number;
  lessonLearned?: string;
}

// ============================================================================
// NATURAL LANGUAGE INTERFACE
// ============================================================================

export interface OperatorQuery {
  id: UUID;
  userId: UUID;
  timestamp: ISODate;
  
  // The question
  query: string;
  context?: Record<string, any>;
  
  // Response preference
  detailLevel: 'simple' | 'standard' | 'geek-speak';
  includeRecommendations: boolean;
}

export interface IntelligentResponse {
  queryId: UUID;
  timestamp: ISODate;
  
  // Answer
  answer: string;
  confidence: number;
  
  // Supporting data
  evidence: {
    source: string;
    data: any;
    relevance: number;
  }[];
  
  // Recommendations
  recommendations?: {
    action: string;
    reasoning: string;
    impact: string;
    confidence: number;
  }[];
  
  // Drill-down
  geekSpeakVersion?: string;
  relatedQueries?: string[];
}

// ============================================================================
// PROACTIVE ASSISTANCE
// ============================================================================

export interface ProactiveInsight {
  id: UUID;
  timestamp: ISODate;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  // The insight
  type: 'opportunity' | 'risk' | 'optimization' | 'alert';
  title: string;
  description: string;
  
  // Analysis
  impact: string;
  confidence: number;
  urgency: string;
  
  // Action
  suggestedAction: string;
  estimatedTimeToResolve: string;
  estimatedValueImpact: number;
  
  // Status
  acknowledged: boolean;
  acted: boolean;
  outcome?: Outcome;
}

// ============================================================================
// AUTOMATION
// ============================================================================

export interface AutomationRule {
  id: UUID;
  orgId: UUID;
  name: string;
  description: string;
  
  // Trigger
  trigger: {
    type: 'schedule' | 'event' | 'condition';
    config: Record<string, any>;
  };
  
  // Conditions
  conditions: {
    field: string;
    operator: string;
    value: any;
  }[];
  
  // Action
  action: {
    type: string;
    parameters: Record<string, any>;
  };
  
  // Safety
  requiresApproval: boolean;
  maxImpact: number;
  
  // Status
  enabled: boolean;
  lastRun?: ISODate;
  runCount: number;
}

