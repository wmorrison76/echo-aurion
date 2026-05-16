/**
 * Maestro Banquets Event-Centric Data Types
 *
 * Central types for the Maestro Banquets Unified Operations System.
 * All entities are organized around the Event object as the single source of truth.
 *
 * Architecture:
 * - Event (root entity containing all operational context)
 * - ChangelogEntry (immutable log of all changes)
 * - AutoAction (cascading updates triggered by changes)
 * - RiskFlag (operational alerts and warnings)
 * - StationBreakdown (production organization)
 * - LaborRequirement (scheduling needs)
 * - InventoryDelta (supply chain impact)
 */

// ============================================================================
// ENUM TYPES
// ============================================================================

export type EventStatus =
  | "draft"
  | "confirmed"
  | "in_production"
  | "executed"
  | "archived";

export type EventTypeCode = "WED" | "COR" | "BAN" | "SEM" | "OTH";

export type ChangelogStatus = "pending" | "applied" | "rejected";

export type ChangeSource =
  | "event_planner"
  | "chef"
  | "system"
  | "guest_management"
  | "inventory"
  | "labor"
  | "purchasing";

export type RiskSeverity = "low" | "medium" | "high" | "critical";

export type RiskCategory =
  | "inventory"
  | "labor"
  | "schedule"
  | "compliance"
  | "budget"
  | "timeline";

export type StationType =
  | "hot"
  | "cold"
  | "garde"
  | "pastry"
  | "beverage"
  | "plating";

export type SkillLevel = "junior" | "mid" | "senior" | "exec";

export type TaskStatus = "pending" | "in_progress" | "completed";

export type InventoryStatus = "covered" | "tight" | "short";

export type AutoActionStatus = "pending" | "executed" | "failed";

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Event: Root entity containing all operational context for a single banquet
 */
export interface Event {
  id: string;
  orgId: string;
  outlettId?: string;

  // Event basics
  name: string;
  eventTypeCode: EventTypeCode;
  date: string; // ISO 8601 date
  time?: string; // Service time
  status: EventStatus;

  // Contact & venue
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  venueId?: string;
  venueName?: string;

  // Guest info
  guestCount: number;
  guaranteedGuests: number;
  guestCountForecast?: number;

  // Cross-module references
  beoId?: string;
  beoLastUpdated?: string;
  menuId?: string;
  menuItems?: MenuItemBinding[];
  recipes: RecipeBinding[];
  productionBreakdown: StationBreakdown[];
  laborPlan: LaborRequirement[];
  inventoryImpact: InventoryDelta[];

  // Operational state
  changelog: ChangelogEntry[];
  riskFlags: RiskFlag[];
  approvalsPending?: number;
  autoActionsQueued?: AutoAction[];

  // Timeline
  timeline: TimelineEvent[];
  prepStartDate?: string;
  setupStartTime?: string;
  serviceStartTime?: string;
  cleanupEndTime?: string;

  // Metadata
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;

  // Optional notes
  description?: string;
  internalNotes?: string;
  specialRequests?: string;
}

/**
 * MenuItemBinding: Links a menu item to recipes & production context
 */
export interface MenuItemBinding {
  id: string;
  menuId: string;
  name: string;
  recipeId: string;
  recipeName?: string;
  courseName?: string;
  yieldCount: number;
  portionSize?: string;
  dietaryNotes?: string[];
  allergieWarnings?: string[];
  productionNote?: string;
}

/**
 * RecipeBinding: Links canonical recipe to this event's production
 */
export interface RecipeBinding {
  id: string;
  eventId: string;
  recipeId: string;
  recipeName: string;
  yieldBase: number;
  yieldRequired: number;
  scaleFactor: number;
  batchSize: number;
  batchCount: number;
  prepTime: number; // minutes
  cookTime: number; // minutes
  totalTime: number; // minutes
  station: StationType;
  dependencies: string[]; // recipeIds of dependencies
  overrides?: {
    ingredients?: Record<string, string>; // ingredient -> substitution
    techniques?: string[];
    timings?: Record<string, number>;
  };
}

/**
 * ChangelogEntry: Immutable record of every change to the event
 */
export interface ChangelogEntry {
  id: string;
  eventId: string;
  timestamp: string; // ISO 8601
  source: ChangeSource;
  userId: string;
  userName?: string;

  // What changed
  field: string; // e.g., "guestCount", "menuItems", "laborHours"
  oldValue?: any;
  newValue?: any;
  delta?: Record<string, any>; // Complex changes

  // Impact assessment
  affectedSystems: string[]; // modules affected by this change
  autoActions: AutoAction[]; // actions triggered
  requiresApproval: boolean;
  approvalId?: string;
  status: ChangelogStatus;

  // Audit
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
}

/**
 * AutoAction: Cascading update triggered by a change
 *
 * Example: Guest count +50 → triggers inventory delta → creates PO
 */
export interface AutoAction {
  id: string;
  changelogId: string;
  eventId: string;

  // Action definition
  system: string; // "inventory", "labor", "recipes", etc.
  action: string; // "scale_recipes", "update_inventory", "adjust_labor"
  payload: Record<string, any>;

  // Execution status
  status: AutoActionStatus;
  executedAt?: string;
  error?: string;

  // Rollback capability
  canRollback: boolean;
  rollbackAction?: AutoAction;
}

/**
 * RiskFlag: Operational alert or warning
 */
export interface RiskFlag {
  id: string;
  eventId: string;
  severity: RiskSeverity;
  category: RiskCategory;
  message: string;
  detectedAt: string;

  // Context
  affectedItem?: string; // e.g., ingredient name, staff member name
  affectedSystem?: string; // module affected

  // Resolution
  suggestedAction?: string;
  actionUrl?: string; // Deep link to resolution UI
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

// ============================================================================
// PRODUCTION ENTITIES
// ============================================================================

/**
 * StationBreakdown: Organization of production by kitchen station
 */
export interface StationBreakdown {
  id: string;
  eventId: string;
  station: StationType;

  // Tasks
  tasks: ProductionTask[];
  totalTasks: number;

  // Workload
  totalPrepTime: number; // minutes
  totalCookTime: number; // minutes
  parallelizableHours: number;
  bottlenecks: string[]; // task names blocking others

  // Staffing
  staffRequired: number;
  skillsNeeded: SkillLevel[];
  assignedStaff?: Array<{
    staffId: string;
    name: string;
    skillLevel: SkillLevel;
    hoursAssigned: number;
  }>;

  // Timeline
  prepStartTime?: string;
  startCookTime?: string;
  finishTime?: string;
}

/**
 * ProductionTask: Individual task in the production breakdown
 */
export interface ProductionTask {
  id: string;
  recipeBindingId: string;
  station: StationType;
  recipeName: string;

  // Scaling
  yieldCount: number;
  batchSize: number;
  batchNumber: number;

  // Timing
  prepTime: number; // minutes
  totalTime: number; // minutes
  dependencies: string[]; // task IDs

  // Status
  status: TaskStatus;
  assignedTo?: string; // Staff ID
  startedAt?: string;
  completedAt?: string;
  notes?: string;

  // QC
  qualityCheck?: {
    passedAt?: string;
    checkedBy?: string;
    issues?: string[];
  };
}

// ============================================================================
// LABOR ENTITIES
// ============================================================================

/**
 * LaborRequirement: Staffing needs for the event
 */
export interface LaborRequirement {
  id: string;
  eventId: string;
  station: StationType;

  // Requirements
  date: string; // ISO 8601 date
  skillLevel: SkillLevel;
  headcount: number;
  hoursPerDay: number;

  // Timing
  callTime?: string; // When staff should arrive
  releaseTime?: string; // When staff can leave
  breakTimes?: Array<{ start: string; end: string }>;

  // Assignments
  assignedStaff?: Array<{
    staffId: string;
    name: string;
    skillLevel: SkillLevel;
    confirmed: boolean;
  }>;

  // Risk
  unfilledPositions: number;
  overtimeRisk: boolean;
  costImpact?: number;
}

// ============================================================================
// INVENTORY ENTITIES
// ============================================================================

/**
 * InventoryDelta: Impact on inventory for a single item
 */
export interface InventoryDelta {
  id: string;
  eventId: string;
  itemId: string;
  itemName: string;
  unit: string; // "pcs", "lb", "ml", etc.

  // Quantities
  required: number;
  onHand: number;
  allocated: number; // Already committed to other events
  inTransit: number; // Ordered but not received
  safetyStock: number;

  // Status
  status: InventoryStatus;
  shortage?: number; // If short, how much needed
  suggestedOrder?: number;

  // Sourcing
  primaryVendor?: string;
  alternateVendor?: string;
  leadDays: number;

  // Cost
  unitCost?: number;
  totalCost?: number;
}

// ============================================================================
// TIMELINE ENTITIES
// ============================================================================

/**
 * TimelineEvent: Milestone or checkpoint in event timeline
 */
export interface TimelineEvent {
  id: string;
  eventId: string;
  name: string;
  scheduledAt: string; // ISO 8601
  actualAt?: string;
  type:
    | "prep_start"
    | "ingredient_delivery"
    | "setup_start"
    | "service_start"
    | "service_end"
    | "cleanup_start"
    | "cleanup_end"
    | "milestone"
    | "checkpoint";

  // Details
  description?: string;
  owner?: string;
  completed: boolean;
  notes?: string;
}

// ============================================================================
// DTO / API RESPONSE TYPES
// ============================================================================

/**
 * EventListResponse: Response for list events endpoint
 */
export interface EventListResponse {
  success: boolean;
  events: Array<
    Pick<
      Event,
      | "id"
      | "name"
      | "date"
      | "status"
      | "guestCount"
      | "guaranteedGuests"
      | "eventTypeCode"
    >
  >;
  total: number;
  orgId: string;
}

/**
 * EventDetailResponse: Response for get event endpoint
 */
export interface EventDetailResponse {
  success: boolean;
  event: Event;
  orgId: string;
}

/**
 * ChangelogResponse: Response for changelog queries
 */
export interface ChangelogResponse {
  success: boolean;
  changes: ChangelogEntry[];
  eventId: string;
  total: number;
  orgId: string;
}

/**
 * RiskAssessmentResponse: Response for risk check
 */
export interface RiskAssessmentResponse {
  success: boolean;
  eventId: string;
  risks: RiskFlag[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  orgId: string;
}

/**
 * ProductionBreakdownResponse: Response for production details
 */
export interface ProductionBreakdownResponse {
  success: boolean;
  eventId: string;
  breakdown: StationBreakdown[];
  timeline: TimelineEvent[];
  totalPrepHours: number;
  bottlenecks: string[];
  orgId: string;
}
