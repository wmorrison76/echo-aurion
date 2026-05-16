/**
 * AurionOS Core Types
 * Governing algorithms for operational intelligence
 */

import { UUID, ISODate, Money } from './base';

// ============================================================================
// DECISION CLEARANCE ALGORITHM (DCA)
// ============================================================================

export type DecisionType = 
  | 'order_placement'
  | 'staffing_change'
  | 'menu_change'
  | 'price_change'
  | 'inventory_adjustment'
  | 'event_booking'
  | 'vendor_change';

export type ClearanceStatus = 'cleared' | 'flagged' | 'blocked';

export interface DecisionProposal {
  id: UUID;
  orgId: UUID;
  type: DecisionType;
  proposedBy: UUID;
  timestamp: ISODate;
  
  // The decision details
  action: string;
  parameters: Record<string, any>;
  
  // Context
  reason: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface DecisionClearance {
  proposalId: UUID;
  status: ClearanceStatus;
  confidence: number; // 0-1
  
  // Supporting signals
  supportingSignals: {
    forecast?: any;
    inventory?: any;
    labor?: any;
    historical?: any;
  };
  
  // Reasoning
  reasonVector: string[];
  flagReasons?: string[];
  blockReasons?: string[];
  
  // Traceability
  traceId: UUID;
  analyzedAt: ISODate;
  autoExecute: boolean;
}

// ============================================================================
// OPERATIONAL COLLISION DETECTION (OCD)
// ============================================================================

export type ResourceType = 
  | 'inventory'
  | 'labor'
  | 'equipment'
  | 'space'
  | 'budget'
  | 'vendor';

export interface Resource {
  id: UUID;
  type: ResourceType;
  name: string;
  capacity: number;
  unit: string;
  available: number;
}

export interface Operation {
  id: UUID;
  name: string;
  scheduledStart: ISODate;
  scheduledEnd: ISODate;
  requiredResources: {
    resourceId: UUID;
    required: number;
  }[];
  priority: number; // 1-10
}

export interface CollisionDetection {
  id: UUID;
  detectedAt: ISODate;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Conflicting operations
  operations: UUID[];
  
  // Resource conflicts
  conflicts: {
    resourceId: UUID;
    resourceName: string;
    required: number;
    available: number;
    deficit: number;
  }[];
  
  // Suggested resolutions
  resolutions: {
    option: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
  }[];
  
  // Auto-resolved
  autoResolved: boolean;
  resolution?: string;
}

// ============================================================================
// YIELD-AWARE COSTING
// ============================================================================

export interface YieldCalculation {
  ingredientId: UUID;
  ingredientName: string;
  
  // Raw input
  rawWeight: number;
  rawUnit: string;
  rawCost: Money;
  
  // Processing
  trimLoss: number; // percentage
  cookingLoss: number; // percentage
  
  // Usable yield
  usableWeight: number;
  usableUnit: string;
  costPerUsableUnit: Money;
  
  // Efficiency
  yieldPercentage: number;
  calculatedAt: ISODate;
}

export interface RecipeCosting {
  recipeId: UUID;
  recipeName: string;
  
  // Ingredient costs (yield-aware)
  ingredients: {
    ingredientId: UUID;
    ingredientName: string;
    quantityNeeded: number;
    unit: string;
    yieldAwareCost: Money;
  }[];
  
  // Total
  totalCost: Money;
  portionCost: Money;
  portionSize: number;
  
  // Metadata
  calculatedAt: ISODate;
  forecastDemand?: number;
}

// ============================================================================
// TRACE LEDGER
// ============================================================================

export interface TraceLedgerEntry {
  id: UUID;
  traceId: UUID;
  orgId: UUID;
  
  // Chain
  previousHash?: string;
  currentHash: string;
  
  // Event
  eventType: 'decision' | 'outcome' | 'input' | 'override';
  timestamp: ISODate;
  
  // Data
  payload: Record<string, any>;
  
  // Links
  linkedTo: UUID[]; // Related entries
  causedBy?: UUID; // Upstream decision
  resultedIn?: UUID[]; // Downstream outcomes
  
  // Immutability
  createdBy: UUID;
  locked: boolean;
}

