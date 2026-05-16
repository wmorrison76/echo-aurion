/**
 * MaestroBQT + Genesis Integration Types
 * Ensures MaestroBQT references Genesis entities, not duplicates
 *
 * Genesis A-H contract compliance
 */

/**
 * Genesis A - Canonical Entities (DO NOT DUPLICATE)
 * MaestroBQT references by ID only
 */
export interface GenesisEvent {
  id: string;
  orgId: string;
  outlettId?: string;
  name: string;
  date: string; // ISO 8601 date
  time?: string;
  status: string;
  guestCount: number;
  guaranteedGuests: number;
  // Cross-module references
  beoId?: string;
  menuId?: string;
  // Metadata
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GenesisBEO {
  id: string;
  eventId: string; // References Genesis A Event
  orgId: string;
  outlettId?: string;
  status: "draft" | "tentative" | "definite" | "executing" | "closed";
  // BEO structure
  functions?: BEOFunction[];
  // Recipe references
  recipeBindings?: RecipeBinding[];
  // Metadata
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BEOFunction {
  id: string;
  name: string;
  moments: BEOMoment[];
}

export interface BEOMoment {
  id: string;
  name: string;
  time?: string;
  menuItems: BEOMenuItem[];
}

export interface BEOMenuItem {
  id: string;
  name: string;
  recipeId?: string; // References Genesis A Recipe
  portionSize?: string;
  yield?: number;
  quantity: number;
}

export interface RecipeBinding {
  recipeId: string; // References Genesis A Recipe
  beoLineItemId: string;
  scaling: RecipeScaling;
}

export interface RecipeScaling {
  guestCount: number;
  portionSize: number;
  yieldLoss: number;
  calculatedIngredients: ScaledIngredient[];
}

export interface ScaledIngredient {
  itemId: string; // References Genesis A Inventory Item
  quantity: number;
  unit: string;
  source: "recipe" | "manual" | "package" | "transfer";
}

/**
 * ProductionNode - Genesis C (Commissary/Butcher/Production Kitchen)
 * First-class production nodes, not vendors
 */
export type ProductionNodeType =
  | "OUTLET"
  | "COMMISSARY"
  | "BUTCHER"
  | "PRODUCTION_KITCHEN"
  | "BAR"
  | "BAKERY";

export interface ProductionNode {
  id: string;
  name: string;
  type: ProductionNodeType;
  orgId: string;
  // Capabilities
  canProduce: boolean;
  canFabricate: boolean;
  canBake: boolean;
  canColdPrep: boolean;
  canHotPrep: boolean;
  canReceive: boolean;
  canTransfer: boolean;
  // Constraints
  maxLaborHoursByDayPart?: {
    morning?: number;
    afternoon?: number;
    evening?: number;
  };
  equipmentConstraints?: string[];
  // Default attributes
  defaultDepartments?: string[];
  defaultGLCostCenterId?: string;
  // Receiving
  receivingDock?: string;
  address?: string;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * TransferRule - Genesis C
 * Defines transfers between ProductionNodes
 */
export type TransferType = "INGREDIENT" | "PREP_ITEM" | "FINISHED_GOOD";

export interface TransferRule {
  fromNodeId: string; // References ProductionNode
  toNodeId: string; // References ProductionNode
  transferType: TransferType;
  leadTimeMinutes: number;
  handlingNotes?: string;
  defaultChargeModel?: {
    payingEntityId: string;
    creditingEntityId: string;
    markup?: number;
  };
  allowedCategories?: string[];
}

/**
 * RoutingPolicy - Genesis C
 * Determines which ProductionNode handles what
 */
export interface RoutingPolicy {
  id: string;
  appliesToCategory: string; // "protein", "pastry", "sauces", etc.
  conditions: RoutingCondition[];
  defaultNodeId: string; // References ProductionNode
  overrideAllowedRoles?: string[];
}

export interface RoutingCondition {
  guestCountThreshold?: number;
  equipmentRequirement?: string[];
  laborAvailability?: boolean;
}

/**
 * OrderLine - Genesis E
 * Order line with production node attribution
 */
export interface OrderLine {
  id: string;
  orderId: string;
  itemId: string; // References Genesis A Inventory Item
  quantity: number;
  unit: string;
  vendorId?: string; // References Genesis A Vendor (if from vendor)
  // Production attribution (CRITICAL)
  producingNodeId: string; // References ProductionNode (NOT vendor)
  receivingNodeId: string; // References ProductionNode
  payingNodeId: string; // References ProductionNode (usually outlet)
  // Source traceability
  sourceBEODs: string[]; // References Genesis BEO
  sourceRecipeIds?: string[]; // References Genesis A Recipe
  sourceEventIds?: string[]; // References Genesis Event
  // Status
  status: "pending" | "ordered" | "received" | "exception";
  /**
   * Logistics (best-effort; used for purchasing/receiving handshake + risk).
   */
  neededByAt?: string; // ISO datetime
  expectedDeliveryAt?: string; // ISO datetime
  leadTimeDays?: number;
  /**
   * Receiving exceptions (short ship, damaged, etc).
   */
  exception?: {
    kind: "short_ship" | "damaged" | "missing" | "other";
    quantityMissing?: number;
    note?: string;
  };
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * TraceEntry - Genesis F + H
 * Explains origin, assumptions, math, dependencies, and change history
 */
export interface TraceEntry {
  id: string;
  entityType: "beo" | "recipe" | "order" | "timeline" | "cost";
  entityId: string;
  // Origin
  origin: {
    source: "recipe" | "manual" | "package" | "transfer" | "calculation";
    sourceId?: string;
    sourceType?: string;
  };
  // Assumptions
  assumptions: {
    portionSize?: number;
    yield?: number;
    routing?: {
      nodeId: string;
      reason: string;
    };
    vendorMatch?: {
      vendorId: string;
      reason: string;
    };
  };
  // Math breakdown
  calculation?: {
    formula: string;
    inputs: Record<string, number>;
    result: number;
    steps?: string[];
  };
  // Dependencies
  dependencies: {
    affectsBEODs?: string[];
    affectsRecipes?: string[];
    affectsOrders?: string[];
    affectsTimeline?: boolean;
  };
  // Change history (Genesis H)
  changeHistory: TraceChange[];
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface TraceChange {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
  changeType: "created" | "updated" | "deleted" | "calculated";
  changeDescription: string;
  oldValue?: any;
  newValue?: any;
  impact?: string[];
}

/**
 * ChangeEvent - Genesis F + H
 * System events emitted for all meaningful changes
 */
export type ChangeEventType =
  | "BEO_UPDATED"
  | "RECIPE_RESCALED"
  | "TIMELINE_SHIFTED"
  | "ORDER_REGENERATED"
  | "RECEIVING_EXCEPTION";

export interface ChangeEvent {
  id: string;
  type: ChangeEventType;
  entityType: "beo" | "recipe" | "order" | "timeline" | "receiving";
  entityId: string;
  // Impact
  affectedBEODs: string[];
  affectedOrders?: string[];
  affectedTimeline?: boolean;
  // Preview (before commitment)
  preview?: {
    oldState: any;
    newState: any;
    impact: string[];
  };
  // Acknowledgement (for destructive changes)
  requiresAcknowledgment: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  // Metadata
  createdBy?: string;
  createdAt: string;
}
