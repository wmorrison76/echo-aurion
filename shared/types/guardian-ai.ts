/**
 * Guardian AI Types
 * Fraud detection and risk analysis types
 */

import { UUID, Money, ISODate } from './base';

// Re-export from security.ts for backward compatibility
export * from './security';

// ============================================================================
// TRANSACTION ANALYSIS (Legacy compatibility)
// ============================================================================

/**
 * Transaction to analyze (legacy format)
 */
export interface Transaction {
  id: UUID;
  orgId: UUID;

  // Financial
  amount: Money;
  currency: string;

  // Parties
  customerId?: UUID;
  employeeId?: UUID;
  locationId?: UUID;

  // Timing
  timestamp: ISODate;
  timeOfDay: {
    hour: number;
    minute: number;
    dayOfWeek: number;
  };

  // Type
  type: 'sale' | 'refund' | 'void' | 'discount' | 'comped' | 'adjustment';
  paymentMethod: 'cash' | 'credit' | 'debit' | 'gift_card' | 'house_account';

  // Context
  terminal?: string;
  tableNumber?: string;
  checkNumber?: string;

  // Items
  items?: {
    itemId: UUID;
    quantity: number;
    price: Money;
    discount?: Money;
  }[];

  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Risk analysis result (legacy format)
 */
export interface RiskAnalysis {
  transactionId: UUID;

  // Overall risk
  totalScore: number;
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  isFlagged: boolean;

  // Triggered rules
  triggeredRules: {
    ruleId: string;
    ruleName: string;
    score: number;
    category: string;
    description?: string;
  }[];

  // Recommendations
  recommendations: string[];
  requiresReview: boolean;
  requiresManagerApproval: boolean;

  // Pattern detection
  patterns?: {
    name: string;
    confidence: number;
    description: string;
  }[];

  // Metadata
  analyzedAt: ISODate;
  analysisVersion: string;
}

/**
 * Guardian AI configuration
 */
export interface GuardianConfig {
  ruleSetId: string;
  name: string;
  description?: string;
  version: string;

  // Rules
  rules: RiskRule[];

  // Thresholds
  thresholds: RiskThresholds;
  flagThreshold: number;

  // Features
  enablePatternDetection: boolean;
  enableBehaviorProfiling: boolean;

  // Actions
  autoReject?: boolean;
  requireManagerApproval?: boolean;
}

/**
 * Risk rule
 */
export interface RiskRule {
  id: string;
  name: string;
  description?: string;

  // Condition
  field: string;
  operator: RiskOperator;
  value: any;

  // Scoring
  score: number;
  weight?: number;

  // Metadata
  category?: 'financial' | 'temporal' | 'behavioral' | 'pattern';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  isActive?: boolean;
}

/**
 * Risk operators
 */
export type RiskOperator =
  | 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'between' | 'in' | 'nin' | 'mod'
  | 'contains' | 'matches' | 'custom';

/**
 * Risk thresholds
 */
export interface RiskThresholds {
  none: { min: number; max: number };
  low: { min: number; max: number };
  medium: { min: number; max: number };
  high: { min: number; max: number };
  critical: { min: number; max: number };
}
