/**
 * LUCCCA Event Lifecycle Engine
 * =============================
 * 
 * The complete prospect-to-payment lifecycle for hospitality events.
 * Industry-defining system that connects:
 * 
 * EchoEvents (CRM) → BEO/REO → Menu Integration → EchoLayout → 
 * Maestro (Production) → Culinary (Recipes) → Operations (Costing) → 
 * EchoAurum (P&L) → Payment
 * 
 * Full Lifecycle:
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │                    EVENT LIFECYCLE ENGINE                                    │
 * ├─────────────────────────────────────────────────────────────────────────────┤
 * │                                                                              │
 * │  PHASE 1: SALES & PLANNING                                                  │
 * │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
 * │  │ Prospect │─▶│ Qualify  │─▶│ Proposal │─▶│ Contract │─▶│ Deposit  │     │
 * │  │  (Lead)  │  │ (Score)  │  │  (BEO)   │  │ (E-Sign) │  │ Payment  │     │
 * │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
 * │                                                                              │
 * │  PHASE 2: EVENT DESIGN                                                      │
 * │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
 * │  │  Menu    │─▶│  Recipe  │─▶│  Layout  │─▶│  Labor   │                    │
 * │  │ Selection│  │  Costing │  │  Design  │  │ Planning │                    │
 * │  └──────────┘  └──────────┘  └──────────┘  └──────────┘                    │
 * │                                                                              │
 * │  PHASE 3: PRE-EVENT                                                         │
 * │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
 * │  │  Order   │─▶│  Receive │─▶│Production│─▶│   Prep   │                    │
 * │  │Inventory │  │  Goods   │  │ Schedule │  │  Checklist│                   │
 * │  └──────────┘  └──────────┘  └──────────┘  └──────────┘                    │
 * │                                                                              │
 * │  PHASE 4: EVENT EXECUTION                                                   │
 * │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
 * │  │  Setup   │─▶│ Service  │─▶│Real-time │─▶│  Breakdown│                   │
 * │  │          │  │          │  │ Tracking │  │          │                    │
 * │  └──────────┘  └──────────┘  └──────────┘  └──────────┘                    │
 * │                                                                              │
 * │  PHASE 5: POST-EVENT & FINANCIAL                                           │
 * │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
 * │  │  Final   │─▶│  Post-   │─▶│ Invoice  │─▶│  P&L     │─▶│  Payment │     │
 * │  │  Count   │  │  Eval    │  │ Generate │  │ Drill-down│ │  Collect │     │
 * │  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
 * │                                                                              │
 * │  ┌──────────────────────────────────────────────────────────────────────┐   │
 * │  │                     ECHOAURUM INTEGRATION                             │   │
 * │  │  Real-time P&L • COGS Tracking • GL Posting • Revenue Recognition    │   │
 * │  └──────────────────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────────────────┘
 */

import { logger } from '../lib/logger.js';
import { unifiedEventBus, UNIFIED_EVENT_TYPES } from '../lib/unified-event-bus.js';
import { operationsCoreEngine } from './operations-core-engine.js';
import { aiForecastingEngine } from './ai-forecasting-engine.js';
import { getEventLifecycleStore, type EventLifecycleStore } from './event-lifecycle-store.js';
import { beoManagementService } from './beo-management.js';
import { scaleBEORecipes } from './beo-recipe-scaling-service.js';
import { designLayoutFromBEO } from './echo-layout-design-service.js';
import { isStrict, StrictModeError } from '../lib/strict-mode.js';
import * as crypto from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Event lifecycle stages
 */
export enum EventLifecycleStage {
  // Phase 1: Sales & Planning
  PROSPECT = 'prospect',
  QUALIFIED = 'qualified',
  PROPOSAL_SENT = 'proposal_sent',
  NEGOTIATION = 'negotiation',
  CONTRACT_SENT = 'contract_sent',
  CONTRACT_SIGNED = 'contract_signed',
  DEPOSIT_RECEIVED = 'deposit_received',
  
  // Phase 2: Event Design
  MENU_SELECTED = 'menu_selected',
  BEO_CREATED = 'beo_created',
  BEO_APPROVED = 'beo_approved',
  LAYOUT_DESIGNED = 'layout_designed',
  LABOR_SCHEDULED = 'labor_scheduled',
  
  // Phase 3: Pre-Event
  INVENTORY_ORDERED = 'inventory_ordered',
  INVENTORY_RECEIVED = 'inventory_received',
  PRODUCTION_SCHEDULED = 'production_scheduled',
  PREP_STARTED = 'prep_started',
  
  // Phase 4: Event Execution
  SETUP_STARTED = 'setup_started',
  EVENT_IN_PROGRESS = 'event_in_progress',
  EVENT_COMPLETED = 'event_completed',
  
  // Phase 5: Post-Event
  POST_EVENT_REVIEW = 'post_event_review',
  FINAL_INVOICE_SENT = 'final_invoice_sent',
  PAYMENT_RECEIVED = 'payment_received',
  CLOSED = 'closed',
  
  // Other
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold',
}

/**
 * Complete event record
 */
export interface EventRecord {
  id: string;
  orgId: string;
  outletId: string;
  
  // Basic info
  name: string;
  type: EventType;
  status: EventLifecycleStage;
  
  // Client info
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientCompany?: string;

  // Source linkage (A2): the prospect this event was converted from.
  // Persisted to lifecycle_events.prospect_id and stamped on derived BEO rows.
  prospectId?: string;
  
  // Event details
  eventDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  guaranteedCount?: number;
  
  // Venue/Space
  spaceIds: string[];
  layoutId?: string;
  
  // Menu/BEO
  beoId?: string;
  menuSelections: MenuSelection[];
  
  // Financial
  pricing: EventPricing;
  payments: EventPayment[];
  costTracking: EventCostTracking;
  
  // Staff
  laborAllocation: LaborAllocation;
  
  // Timeline
  timeline: EventTimelineEntry[];
  
  // Documents
  documents: EventDocument[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  assignedTo: string[];
  tags: string[];
  notes: string;
}

export type EventType = 
  | 'wedding'
  | 'corporate'
  | 'social'
  | 'banquet'
  | 'conference'
  | 'gala'
  | 'private_dining'
  | 'cocktail_reception'
  | 'holiday_party'
  | 'other';

/**
 * Menu selection for event
 */
export interface MenuSelection {
  id: string;
  menuItemId: string;
  menuItemName: string;
  recipeId?: string;
  category: 'appetizer' | 'entree' | 'dessert' | 'beverage' | 'side' | 'other';
  
  // Quantities
  quantity: number;
  perPerson: boolean;
  
  // Pricing
  unitPrice: number;
  totalPrice: number;
  
  // Costing
  recipeCost?: number;
  foodCostPercentage?: number;
  
  // Dietary
  dietaryTags: string[];
  allergens: string[];
  
  // Notes
  specialInstructions?: string;
}

/**
 * Event pricing breakdown
 */
export interface EventPricing {
  // Base pricing
  foodRevenue: number;
  beverageRevenue: number;
  roomRental: number;
  serviceCharge: number;
  serviceChargePercentage: number;
  
  // Add-ons
  avEquipment: number;
  decorations: number;
  entertainment: number;
  valet: number;
  otherCharges: number;
  
  // Calculations
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  gratuity: number;
  gratuityPercentage: number;
  
  // Totals
  grandTotal: number;
  
  // Deposits
  depositRequired: number;
  depositReceived: number;
  balanceDue: number;
  
  // Per person
  pricePerPerson: number;
}

/**
 * Event payment record
 */
export interface EventPayment {
  id: string;
  type: 'deposit' | 'progress' | 'final' | 'refund' | 'adjustment';
  amount: number;
  method: 'credit_card' | 'check' | 'wire' | 'cash' | 'house_account';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  
  // Reference
  referenceNumber?: string;
  invoiceId?: string;
  
  // Timing
  dueDate?: string;
  paidDate?: string;
  
  // Notes
  notes?: string;
  processedBy?: string;
}

/**
 * Event cost tracking - THE CORE OF P&L DRILL-DOWN
 */
export interface EventCostTracking {
  // Food costs
  theoreticalFoodCost: number;
  actualFoodCost: number;
  foodCostVariance: number;
  foodCostPercentage: number;
  
  // Beverage costs
  theoreticalBeverageCost: number;
  actualBeverageCost: number;
  beverageCostVariance: number;
  beverageCostPercentage: number;
  
  // Labor costs
  scheduledLaborCost: number;
  actualLaborCost: number;
  laborCostVariance: number;
  laborCostPercentage: number;
  
  // Other costs
  rentalCost: number;
  equipmentCost: number;
  linensDecorCost: number;
  entertainmentCost: number;
  vendorCosts: VendorCost[];
  otherDirectCosts: number;
  
  // Overhead allocation
  overheadAllocation: number;
  overheadAllocationMethod: 'percentage' | 'fixed' | 'per_guest';
  
  // Totals
  totalCost: number;
  totalCOGS: number;
  
  // Profitability
  grossProfit: number;
  grossProfitMargin: number;
  contributionMargin: number;
  netProfit: number;
  netProfitMargin: number;
  
  // Per guest metrics
  revenuePerGuest: number;
  costPerGuest: number;
  profitPerGuest: number;
  
  // Ingredient-level breakdown
  ingredientCosts: IngredientCostDetail[];
  
  // Recipe-level breakdown
  recipeCosts: RecipeCostDetail[];
}

export interface VendorCost {
  vendorId: string;
  vendorName: string;
  category: string;
  amount: number;
  invoiceNumber?: string;
  paid: boolean;
}

export interface IngredientCostDetail {
  ingredientId: string;
  ingredientName: string;
  category: string;
  quantityUsed: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  percentageOfTotal: number;
}

export interface RecipeCostDetail {
  recipeId: string;
  recipeName: string;
  category: string;
  quantityPrepared: number;
  costPerPortion: number;
  totalCost: number;
  percentageOfTotal: number;
  ingredientBreakdown: IngredientCostDetail[];
}

/**
 * Labor allocation for event
 */
export interface LaborAllocation {
  totalHours: number;
  totalCost: number;
  
  positions: LaborPosition[];
  
  // By phase
  setupHours: number;
  serviceHours: number;
  breakdownHours: number;
  
  // Metrics
  guestsPerServer: number;
  laborCostPerGuest: number;
}

export interface LaborPosition {
  positionId: string;
  positionName: string;
  staffCount: number;
  hoursPerPerson: number;
  hourlyRate: number;
  totalHours: number;
  totalCost: number;
  assignedEmployees?: string[];
}

/**
 * Event timeline entry
 */
export interface EventTimelineEntry {
  id: string;
  timestamp: string;
  stage: EventLifecycleStage;
  action: string;
  description: string;
  performedBy: string;
  automatedAction: boolean;
  data?: Record<string, any>;
}

/**
 * Event document
 */
export interface EventDocument {
  id: string;
  type: 'proposal' | 'contract' | 'beo' | 'invoice' | 'receipt' | 'floor_plan' | 'menu' | 'other';
  name: string;
  url: string;
  version: number;
  status: 'draft' | 'sent' | 'signed' | 'approved' | 'archived';
  createdAt: string;
  signedAt?: string;
  signedBy?: string;
}

// ============================================================================
// GL ACCOUNT MAPPING (for EchoAurum integration)
// ============================================================================

export interface GLAccountMapping {
  revenue: {
    foodRevenue: string;
    beverageRevenue: string;
    roomRental: string;
    serviceCharge: string;
    otherRevenue: string;
  };
  cogs: {
    foodCost: string;
    beverageCost: string;
    laborCost: string;
    otherDirectCost: string;
  };
  expenses: {
    rentals: string;
    entertainment: string;
    decorations: string;
    vendorServices: string;
  };
  liabilities: {
    depositsReceived: string;
    taxPayable: string;
    gratuityPayable: string;
  };
  receivables: {
    accountsReceivable: string;
  };
}

const DEFAULT_GL_MAPPING: GLAccountMapping = {
  revenue: {
    foodRevenue: '4100-00',
    beverageRevenue: '4200-00',
    roomRental: '4300-00',
    serviceCharge: '4400-00',
    otherRevenue: '4900-00',
  },
  cogs: {
    foodCost: '5100-00',
    beverageCost: '5200-00',
    laborCost: '5300-00',
    otherDirectCost: '5900-00',
  },
  expenses: {
    rentals: '6100-00',
    entertainment: '6200-00',
    decorations: '6300-00',
    vendorServices: '6400-00',
  },
  liabilities: {
    depositsReceived: '2100-00',
    taxPayable: '2200-00',
    gratuityPayable: '2300-00',
  },
  receivables: {
    accountsReceivable: '1200-00',
  },
};

// ============================================================================
// EVENT LIFECYCLE ENGINE
// ============================================================================

export class EventLifecycleEngine {
  // Event storage — write-through cache backed by lifecycle_events table.
  // The Map serves the hot read path; every mutation persists via this.store.
  // On boot we best-effort hydrate the cache from the DB so server restarts
  // no longer drop events between prospect → BEO → payment.
  private events: Map<string, EventRecord> = new Map();
  private store: EventLifecycleStore = getEventLifecycleStore();
  private hydrationPromise: Promise<void> | null = null;

  // GL Account mapping
  private glMapping: GLAccountMapping = DEFAULT_GL_MAPPING;

  // Lifecycle hooks
  private stageHooks: Map<EventLifecycleStage, ((event: EventRecord) => Promise<void>)[]> = new Map();

  constructor() {
    this.initializeEventListeners();
    this.registerDefaultHooks();
    this.hydrationPromise = this.hydrateFromStore();
    logger.info('[EventLifecycleEngine] Initialized');
  }

  /**
   * Best-effort hydration: load every persisted EventRecord into the cache
   * so synchronous getters work after a restart. Failures are logged and
   * swallowed — the engine still functions; reads will fall through to the
   * store on demand.
   */
  private async hydrateFromStore(): Promise<void> {
    try {
      const all = await this.store.listAll();
      for (const event of all) this.events.set(event.id, event);
      if (all.length > 0) {
        logger.info('[EventLifecycleEngine] Hydrated cache from store', { count: all.length });
      }
    } catch (err) {
      logger.error('[EventLifecycleEngine] Hydration failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /** Public hook so callers can await the initial hydration if they want to. */
  async ready(): Promise<void> {
    if (this.hydrationPromise) await this.hydrationPromise;
  }

  /**
   * Persist an event and update the cache. Replaces the previous in-memory-
   * only `this.events.set(...)` pattern.
   */
  private async persist(event: EventRecord): Promise<void> {
    event.updatedAt = new Date().toISOString();
    this.events.set(event.id, event);
    await this.store.save(event);
  }

  /**
   * Read by id. Tries the cache first, then falls through to the store and
   * back-fills the cache on a hit. Returns undefined if neither has the row.
   */
  private async loadEvent(eventId: string): Promise<EventRecord | undefined> {
    const cached = this.events.get(eventId);
    if (cached) return cached;
    const fromStore = await this.store.get(eventId);
    if (fromStore) this.events.set(eventId, fromStore);
    return fromStore;
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  private initializeEventListeners(): void {
    // Listen for prospect stage changes
    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.PROSPECT_STAGE_CHANGED, async (event) => {
      await this.handleProspectStageChange(event.payload);
    });

    // Listen for BEO events
    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.BEO_CREATED, async (event) => {
      await this.handleBEOCreated(event.payload);
    });

    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.BEO_APPROVED, async (event) => {
      await this.handleBEOApproved(event.payload);
    });

    // Listen for inventory events
    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.INVENTORY_UPDATED, async (event) => {
      if (event.payload.eventId) {
        await this.updateEventCosts(event.payload.eventId);
      }
    });

    // Listen for production events
    unifiedEventBus.subscribe(UNIFIED_EVENT_TYPES.PRODUCTION_GENERATED, async (event) => {
      if (event.payload.eventId) {
        await this.handleProductionGenerated(event.payload);
      }
    });

    logger.info('[EventLifecycleEngine] Event listeners initialized');
  }

  /**
   * Register default lifecycle hooks
   */
  private registerDefaultHooks(): void {
    // When contract is signed, create BEO
    this.registerStageHook(EventLifecycleStage.CONTRACT_SIGNED, async (event) => {
      await this.createBEOFromEvent(event);
    });

    // When BEO is approved, scale recipes (A3), calculate costs, create
    // production orders, and feed forecasting. Recipe scaling runs first
    // so the cost-calc + production passes can read scaled_ingredients
    // back out instead of recomputing from raw recipes.
    this.registerStageHook(EventLifecycleStage.BEO_APPROVED, async (event) => {
      if (event.beoId) {
        try {
          const result = await scaleBEORecipes({ beoId: event.beoId });
          logger.info('[EventLifecycleEngine] BEO recipes scaled on approval', {
            beoId: event.beoId,
            recipesScaled: result.recipesScaled,
            ingredientsWritten: result.ingredientsWritten,
          });
        } catch (err) {
          logger.error('[EventLifecycleEngine] BEO recipe scaling failed', {
            beoId: event.beoId,
            error: err instanceof Error ? err.message : String(err),
          });
        }

        // A6: auto-generate the layout design alongside recipe scaling.
        // Soft-fail unconditionally — a missing room spec or a sparse
        // catalog should never block costing or forecasting downstream.
        // The design enters pending_approval so the chef reviews it
        // before it's stamped onto the BEO.
        try {
          const layout = await designLayoutFromBEO({
            beoId: event.beoId,
            generatedBy: 'engine:beo-approved',
            allowSoftFail: true,
          });
          logger.info('[EventLifecycleEngine] Layout design generated on BEO approval', {
            beoId: event.beoId,
            designId: layout.designId,
            style: layout.style,
            tableCount: layout.totals.tableCount,
          });
        } catch (err) {
          logger.error('[EventLifecycleEngine] Layout design failed (non-blocking)', {
            beoId: event.beoId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
      await this.calculateEventCosts(event);
      await this.createProductionOrders(event);
      await this.feedToForecasting(event);
    });

    // When deposit is received, post to GL
    this.registerStageHook(EventLifecycleStage.DEPOSIT_RECEIVED, async (event) => {
      await this.postDepositToGL(event);
    });

    // When event is completed, finalize costs
    this.registerStageHook(EventLifecycleStage.EVENT_COMPLETED, async (event) => {
      await this.finalizeEventCosts(event);
      await this.generateFinalInvoice(event);
    });

    // When payment is received, recognize revenue
    this.registerStageHook(EventLifecycleStage.PAYMENT_RECEIVED, async (event) => {
      await this.recognizeRevenue(event);
      await this.postToGL(event);
    });
  }

  // ============================================================================
  // EVENT LIFECYCLE MANAGEMENT
  // ============================================================================

  /**
   * Create new event from prospect
   */
  async createEventFromProspect(prospect: {
    id: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    clientCompany?: string;
    eventName: string;
    eventType: EventType;
    eventDate: string;
    startTime: string;
    endTime: string;
    guestCount: number;
    estimatedRevenue: number;
    notes?: string;
    orgId: string;
    outletId: string;
    assignedTo: string;
  }): Promise<EventRecord> {
    const event: EventRecord = {
      id: crypto.randomUUID(),
      orgId: prospect.orgId,
      outletId: prospect.outletId,
      name: prospect.eventName,
      type: prospect.eventType,
      status: EventLifecycleStage.PROSPECT,
      // A2: prospect.id is the prospect itself; clientId is preserved for
      // backwards compatibility with downstream code that treats it as a
      // generic actor key, but prospectId is the canonical FK from now on.
      prospectId: prospect.id,
      clientId: prospect.id,
      clientName: prospect.clientName,
      clientEmail: prospect.clientEmail,
      clientPhone: prospect.clientPhone,
      clientCompany: prospect.clientCompany,
      eventDate: prospect.eventDate,
      startTime: prospect.startTime,
      endTime: prospect.endTime,
      guestCount: prospect.guestCount,
      spaceIds: [],
      menuSelections: [],
      pricing: this.initializePricing(prospect.guestCount, prospect.estimatedRevenue),
      payments: [],
      costTracking: this.initializeCostTracking(),
      laborAllocation: this.initializeLaborAllocation(),
      timeline: [{
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        stage: EventLifecycleStage.PROSPECT,
        action: 'Event created from prospect',
        description: `New ${prospect.eventType} event created for ${prospect.clientName}`,
        performedBy: prospect.assignedTo,
        automatedAction: false,
      }],
      documents: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: prospect.assignedTo,
      assignedTo: [prospect.assignedTo],
      tags: [],
      notes: prospect.notes || '',
    };

    await this.persist(event);

    // Emit event
    await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.CALENDAR_EVENT_CREATED, {
      eventId: event.id,
      eventType: event.type,
      eventDate: event.eventDate,
      guestCount: event.guestCount,
    }, {
      source: { bus: 'unified', module: 'event_lifecycle' },
      tenantId: event.orgId,
      outletId: event.outletId,
    });

    logger.info(`[EventLifecycleEngine] Created event ${event.id} from prospect`);

    return event;
  }

  /**
   * Advance event to next stage
   */
  async advanceStage(
    eventId: string,
    newStage: EventLifecycleStage,
    performedBy: string,
    notes?: string,
    data?: Record<string, any>
  ): Promise<EventRecord> {
    const event = await this.loadEvent(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const previousStage = event.status;
    event.status = newStage;
    event.updatedAt = new Date().toISOString();

    // Add timeline entry
    event.timeline.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      stage: newStage,
      action: `Stage changed from ${previousStage} to ${newStage}`,
      description: notes || `Event advanced to ${newStage}`,
      performedBy,
      automatedAction: false,
      data,
    });

    await this.persist(event);

    // Execute stage hooks
    await this.executeStageHooks(newStage, event);

    // Emit stage change event
    await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.CALENDAR_EVENT_UPDATED, {
      eventId: event.id,
      previousStage,
      newStage,
      performedBy,
    }, {
      source: { bus: 'unified', module: 'event_lifecycle' },
      tenantId: event.orgId,
      outletId: event.outletId,
    });

    logger.info(`[EventLifecycleEngine] Event ${eventId} advanced from ${previousStage} to ${newStage}`);

    return event;
  }

  /**
   * Register hook for lifecycle stage
   */
  registerStageHook(stage: EventLifecycleStage, hook: (event: EventRecord) => Promise<void>): void {
    const hooks = this.stageHooks.get(stage) || [];
    hooks.push(hook);
    this.stageHooks.set(stage, hooks);
  }

  /**
   * Execute hooks for a stage
   */
  private async executeStageHooks(stage: EventLifecycleStage, event: EventRecord): Promise<void> {
    const hooks = this.stageHooks.get(stage) || [];
    for (const hook of hooks) {
      try {
        await hook(event);
      } catch (error: any) {
        logger.error(`[EventLifecycleEngine] Hook failed for stage ${stage}`, error);
      }
    }
  }

  // ============================================================================
  // MENU & BEO MANAGEMENT
  // ============================================================================

  /**
   * Add menu selections to event
   */
  async addMenuSelections(
    eventId: string,
    selections: Omit<MenuSelection, 'id' | 'recipeCost' | 'foodCostPercentage'>[]
  ): Promise<EventRecord> {
    const event = await this.loadEvent(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    for (const selection of selections) {
      const menuSelection: MenuSelection = {
        id: crypto.randomUUID(),
        ...selection,
      };

      // Calculate recipe cost if recipe is mapped
      if (selection.recipeId) {
        const costResult = await operationsCoreEngine.calculateRecipeCost(
          selection.recipeId,
          [], // Would pass actual ingredients
          1
        );
        menuSelection.recipeCost = costResult.costPerServing;
        menuSelection.foodCostPercentage = (costResult.costPerServing / selection.unitPrice) * 100;
      }

      event.menuSelections.push(menuSelection);
    }

    // Recalculate pricing
    await this.recalculatePricing(event);

    // Update event
    await this.persist(event);

    logger.info(`[EventLifecycleEngine] Added ${selections.length} menu selections to event ${eventId}`);

    return event;
  }

  /**
   * Create BEO from event (A2)
   *
   * On CONTRACT_SIGNED, persist a real beo_banquet_orders row via
   * beoManagementService and stamp it with both the lifecycle_event_id
   * (this EventRecord) and the prospect_id (if the event came from a
   * prospect). The chain now has a durable FK trail:
   *
   *     prospect.id ──► lifecycle_events.prospect_id
   *                     lifecycle_events.id ──► beo_banquet_orders.lifecycle_event_id
   *                     prospects.id ──► beo_banquet_orders.prospect_id
   *
   * If the BEO insert fails (missing department, calendar event row, etc.)
   * we still emit the BEO_CREATED bus event with a generated id so any
   * subscribers downstream don't stall. The error is logged for diagnosis.
   */
  private async createBEOFromEvent(event: EventRecord): Promise<void> {
    let beoId: string;
    let beoNumber: string | undefined;
    let beoCreatedRealRow = false;

    try {
      const beo = await beoManagementService.createBEO({
        orgId: event.orgId,
        eventId: event.id,                            // calendar_events.id contract; A7 reconciles
        outletId: event.outletId,
        eventDate: event.eventDate,
        eventTypeCode: this.mapEventTypeToCode(event.type),
        // department_id is a hard NOT NULL on beo_banquet_orders. The
        // engine doesn't yet know which department owns the event, so we
        // surface that as content metadata for the human BEO builder to
        // resolve. The lifecycle_event_id linkage is the load-bearing FK.
        departmentId: (event as any).primaryDepartmentId ?? event.outletId,
        contentData: {
          source: 'event-lifecycle-engine',
          stage: 'auto-created-on-contract-signed',
          guestCount: event.guestCount,
          menuSelections: event.menuSelections,
          spaceIds: event.spaceIds,
          eventName: event.name,
          eventType: event.type,
        },
        createdByUserId: event.createdBy,
        // A2 linkage — these are picked up by the extended INSERT.
        lifecycleEventId: event.id,
        prospectId: event.prospectId,
      } as any);
      beoId = beo.id;
      beoNumber = beo.beoNumber;
      beoCreatedRealRow = true;
    } catch (err) {
      // A4.6: in strict mode, rethrow so operators see the data quality
      // issue instead of a silent placeholder. Default behavior (NODE_ENV
      // != production and no strict env var set) is unchanged from A2 —
      // log a warn, generate a placeholder UUID, let the chain continue.
      const message = err instanceof Error ? err.message : String(err);
      if (isStrict({ area: 'beo-create' })) {
        logger.error('[EventLifecycleEngine] beoManagementService.createBEO failed (strict mode)', {
          eventId: event.id,
          error: message,
        });
        throw new StrictModeError(
          'beo-create',
          `Could not create BEO for event ${event.id}: ${message}`,
          { eventId: event.id, originalError: message },
        );
      }
      beoId = crypto.randomUUID();
      logger.warn('[EventLifecycleEngine] beoManagementService.createBEO failed; using placeholder id (set BEO_CHAIN_STRICT=true to fail loudly)', {
        eventId: event.id,
        placeholderBeoId: beoId,
        error: message,
      });
    }

    event.beoId = beoId;
    event.timeline.push({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      stage: EventLifecycleStage.BEO_CREATED,
      action: 'BEO created',
      description: beoCreatedRealRow
        ? `BEO ${beoNumber ?? beoId} created (lifecycle_event_id=${event.id})`
        : `BEO ${beoId} placeholder (deferred to human builder)`,
      performedBy: 'system',
      automatedAction: true,
    });

    await this.persist(event);

    await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.BEO_CREATED, {
      beoId,
      beoNumber,
      eventId: event.id,
      lifecycleEventId: event.id,
      prospectId: event.prospectId,
      eventDate: event.eventDate,
      guestCount: event.guestCount,
      menuSelections: event.menuSelections,
      persistedRow: beoCreatedRealRow,
    }, {
      source: { bus: 'unified', module: 'event_lifecycle' },
      tenantId: event.orgId,
      outletId: event.outletId,
    });

    logger.info(`[EventLifecycleEngine] Created BEO ${beoId} for event ${event.id}`, {
      persistedRow: beoCreatedRealRow,
    });
  }

  /** Map the engine's EventType to the 3-letter code beo numbering uses. */
  private mapEventTypeToCode(t: EventType): string {
    switch (t) {
      case 'wedding': return 'WED';
      case 'corporate': return 'COR';
      case 'banquet': return 'BAN';
      case 'conference': return 'COR';
      case 'gala': return 'BAN';
      case 'cocktail_reception': return 'BAN';
      case 'private_dining': return 'BAN';
      case 'holiday_party': return 'BAN';
      case 'social': return 'OTH';
      default: return 'OTH';
    }
  }

  // ============================================================================
  // COST CALCULATION - THE HEART OF P&L DRILL-DOWN
  // ============================================================================

  /**
   * Calculate all event costs
   */
  async calculateEventCosts(event: EventRecord): Promise<EventCostTracking> {
    const costTracking: EventCostTracking = this.initializeCostTracking();

    // Calculate food costs from menu selections
    let totalFoodCost = 0;
    const recipeCosts: RecipeCostDetail[] = [];
    const ingredientCosts: IngredientCostDetail[] = [];

    for (const selection of event.menuSelections) {
      if (selection.recipeId) {
        const result = await operationsCoreEngine.calculateRecipeCost(
          selection.recipeId,
          [], // Would pass actual ingredients
          1
        );

        const totalQuantity = selection.perPerson ? 
          selection.quantity * event.guestCount : 
          selection.quantity;

        const recipeTotalCost = result.costPerServing * totalQuantity;
        totalFoodCost += recipeTotalCost;

        recipeCosts.push({
          recipeId: selection.recipeId,
          recipeName: selection.menuItemName,
          category: selection.category,
          quantityPrepared: totalQuantity,
          costPerPortion: result.costPerServing,
          totalCost: recipeTotalCost,
          percentageOfTotal: 0, // Calculated later
          ingredientBreakdown: result.ingredientCosts.map(ic => ({
            ingredientId: ic.ingredientId,
            ingredientName: ic.ingredientName,
            category: '',
            quantityUsed: ic.quantity * totalQuantity,
            unit: ic.unit,
            unitCost: ic.unitCost,
            totalCost: ic.lineCost * totalQuantity,
            percentageOfTotal: 0,
          })),
        });

        // Aggregate ingredient costs
        for (const ic of result.ingredientCosts) {
          const existing = ingredientCosts.find(i => i.ingredientId === ic.ingredientId);
          if (existing) {
            existing.quantityUsed += ic.quantity * totalQuantity;
            existing.totalCost += ic.lineCost * totalQuantity;
          } else {
            ingredientCosts.push({
              ingredientId: ic.ingredientId,
              ingredientName: ic.ingredientName,
              category: '',
              quantityUsed: ic.quantity * totalQuantity,
              unit: ic.unit,
              unitCost: ic.unitCost,
              totalCost: ic.lineCost * totalQuantity,
              percentageOfTotal: 0,
            });
          }
        }
      }
    }

    // Calculate percentages
    for (const recipe of recipeCosts) {
      recipe.percentageOfTotal = totalFoodCost > 0 ? (recipe.totalCost / totalFoodCost) * 100 : 0;
    }
    for (const ingredient of ingredientCosts) {
      ingredient.percentageOfTotal = totalFoodCost > 0 ? (ingredient.totalCost / totalFoodCost) * 100 : 0;
    }

    // Set food costs
    costTracking.theoreticalFoodCost = totalFoodCost;
    costTracking.actualFoodCost = totalFoodCost; // Updated after event with actuals
    costTracking.foodCostPercentage = event.pricing.foodRevenue > 0 ? 
      (totalFoodCost / event.pricing.foodRevenue) * 100 : 0;

    // Calculate labor costs
    let laborCost = 0;
    for (const position of event.laborAllocation.positions) {
      laborCost += position.totalCost;
    }
    costTracking.scheduledLaborCost = laborCost;
    costTracking.actualLaborCost = laborCost;
    costTracking.laborCostPercentage = event.pricing.grandTotal > 0 ?
      (laborCost / event.pricing.grandTotal) * 100 : 0;

    // Sum other costs
    const otherCosts = costTracking.rentalCost + 
      costTracking.equipmentCost + 
      costTracking.linensDecorCost + 
      costTracking.entertainmentCost +
      costTracking.vendorCosts.reduce((sum, v) => sum + v.amount, 0) +
      costTracking.otherDirectCosts;

    // Total COGS
    costTracking.totalCOGS = totalFoodCost + costTracking.theoreticalBeverageCost + laborCost;
    costTracking.totalCost = costTracking.totalCOGS + otherCosts + costTracking.overheadAllocation;

    // Profitability
    costTracking.grossProfit = event.pricing.grandTotal - costTracking.totalCOGS;
    costTracking.grossProfitMargin = event.pricing.grandTotal > 0 ?
      (costTracking.grossProfit / event.pricing.grandTotal) * 100 : 0;
    
    costTracking.contributionMargin = event.pricing.grandTotal - costTracking.totalCost;
    costTracking.netProfit = costTracking.contributionMargin;
    costTracking.netProfitMargin = event.pricing.grandTotal > 0 ?
      (costTracking.netProfit / event.pricing.grandTotal) * 100 : 0;

    // Per guest metrics
    const guestCount = event.guaranteedCount || event.guestCount;
    costTracking.revenuePerGuest = event.pricing.grandTotal / guestCount;
    costTracking.costPerGuest = costTracking.totalCost / guestCount;
    costTracking.profitPerGuest = costTracking.netProfit / guestCount;

    // Set detailed breakdowns
    costTracking.recipeCosts = recipeCosts;
    costTracking.ingredientCosts = ingredientCosts;

    // Update event
    event.costTracking = costTracking;
    await this.persist(event);

    logger.info(`[EventLifecycleEngine] Calculated costs for event ${event.id}: Total COGS $${costTracking.totalCOGS.toFixed(2)}, Gross Profit $${costTracking.grossProfit.toFixed(2)} (${costTracking.grossProfitMargin.toFixed(1)}%)`);

    return costTracking;
  }

  /**
   * Update event costs with actual consumption
   */
  private async updateEventCosts(eventId: string): Promise<void> {
    const event = await this.loadEvent(eventId);
    if (!event) return;

    // This would aggregate actual consumption from inventory transactions
    // For now, costs are theoretical until event completion
  }

  /**
   * Finalize event costs with actuals
   */
  private async finalizeEventCosts(event: EventRecord): Promise<void> {
    // This would:
    // 1. Get actual inventory consumption
    // 2. Get actual labor hours worked
    // 3. Calculate variances
    // 4. Update cost tracking with actuals
    
    event.costTracking.foodCostVariance = 
      event.costTracking.actualFoodCost - event.costTracking.theoreticalFoodCost;
    event.costTracking.laborCostVariance =
      event.costTracking.actualLaborCost - event.costTracking.scheduledLaborCost;

    await this.persist(event);

    logger.info(`[EventLifecycleEngine] Finalized costs for event ${event.id}`);
  }

  // ============================================================================
  // ECHOAURUM INTEGRATION (GL POSTING)
  // ============================================================================

  /**
   * Post deposit to GL
   */
  private async postDepositToGL(event: EventRecord): Promise<void> {
    const depositAmount = event.payments
      .filter(p => p.type === 'deposit' && p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    if (depositAmount <= 0) return;

    // This would create GL journal entries:
    // DR: Cash/Bank Account
    // CR: Deposits Received (Liability)

    const journalEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      reference: `EVT-${event.id}-DEP`,
      description: `Deposit received for ${event.name}`,
      entries: [
        { account: '1000-00', debit: depositAmount, credit: 0 }, // Cash
        { account: this.glMapping.liabilities.depositsReceived, debit: 0, credit: depositAmount },
      ],
      eventId: event.id,
      orgId: event.orgId,
    };

    await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.JOURNAL_ENTRY_CREATED, journalEntry, {
      source: { bus: 'unified', module: 'event_lifecycle' },
      tenantId: event.orgId,
    });

    logger.info(`[EventLifecycleEngine] Posted deposit $${depositAmount} to GL for event ${event.id}`);
  }

  /**
   * Recognize revenue and post to GL
   */
  private async recognizeRevenue(event: EventRecord): Promise<void> {
    // This would create GL journal entries for revenue recognition:
    // DR: Deposits Received (reverse liability)
    // DR: Accounts Receivable (for balance)
    // CR: Revenue accounts (Food, Beverage, Service Charge, etc.)
    // CR: Tax Payable
    // CR: Gratuity Payable

    const journalEntries = [
      // Reverse deposit liability
      { account: this.glMapping.liabilities.depositsReceived, debit: event.pricing.depositReceived, credit: 0 },
      
      // Revenue recognition
      { account: this.glMapping.revenue.foodRevenue, debit: 0, credit: event.pricing.foodRevenue },
      { account: this.glMapping.revenue.beverageRevenue, debit: 0, credit: event.pricing.beverageRevenue },
      { account: this.glMapping.revenue.roomRental, debit: 0, credit: event.pricing.roomRental },
      { account: this.glMapping.revenue.serviceCharge, debit: 0, credit: event.pricing.serviceCharge },
      
      // Tax & Gratuity payable
      { account: this.glMapping.liabilities.taxPayable, debit: 0, credit: event.pricing.taxAmount },
      { account: this.glMapping.liabilities.gratuityPayable, debit: 0, credit: event.pricing.gratuity },
      
      // COGS
      { account: this.glMapping.cogs.foodCost, debit: event.costTracking.actualFoodCost, credit: 0 },
      { account: this.glMapping.cogs.beverageCost, debit: event.costTracking.actualBeverageCost, credit: 0 },
      { account: this.glMapping.cogs.laborCost, debit: event.costTracking.actualLaborCost, credit: 0 },
    ];

    const journalEntry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      reference: `EVT-${event.id}-REV`,
      description: `Revenue recognition for ${event.name}`,
      entries: journalEntries,
      eventId: event.id,
      orgId: event.orgId,
    };

    await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.JOURNAL_ENTRY_CREATED, journalEntry, {
      source: { bus: 'unified', module: 'event_lifecycle' },
      tenantId: event.orgId,
    });

    logger.info(`[EventLifecycleEngine] Recognized revenue $${event.pricing.grandTotal} for event ${event.id}`);
  }

  /**
   * Post complete event to GL
   */
  private async postToGL(event: EventRecord): Promise<void> {
    // This creates the complete P&L entry for the event
    // Allows drill-down from P&L to event level
    
    await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.REVENUE_RECORDED, {
      eventId: event.id,
      eventName: event.name,
      eventDate: event.eventDate,
      revenue: event.pricing.grandTotal,
      foodRevenue: event.pricing.foodRevenue,
      beverageRevenue: event.pricing.beverageRevenue,
      foodCost: event.costTracking.actualFoodCost,
      beverageCost: event.costTracking.actualBeverageCost,
      laborCost: event.costTracking.actualLaborCost,
      grossProfit: event.costTracking.grossProfit,
      grossProfitMargin: event.costTracking.grossProfitMargin,
      netProfit: event.costTracking.netProfit,
      netProfitMargin: event.costTracking.netProfitMargin,
    }, {
      source: { bus: 'unified', module: 'event_lifecycle' },
      tenantId: event.orgId,
      outletId: event.outletId,
    });
  }

  // ============================================================================
  // PRODUCTION & INVENTORY
  // ============================================================================

  /**
   * Create production orders from event
   */
  private async createProductionOrders(event: EventRecord): Promise<void> {
    for (const selection of event.menuSelections) {
      if (selection.recipeId) {
        const quantity = selection.perPerson ?
          selection.quantity * event.guestCount :
          selection.quantity;

        await operationsCoreEngine.scheduleProduction(
          selection.recipeId,
          selection.menuItemName,
          quantity,
          event.eventDate,
          event.orgId,
          event.outletId,
          event.id,
          event.beoId
        );
      }
    }

    logger.info(`[EventLifecycleEngine] Created production orders for event ${event.id}`);
  }

  /**
   * Feed event data to forecasting engine
   */
  private async feedToForecasting(event: EventRecord): Promise<void> {
    await aiForecastingEngine.addEvent({
      id: event.id,
      name: event.name,
      type: this.mapEventTypeToForecast(event.type),
      date: event.eventDate,
      startTime: event.startTime,
      endTime: event.endTime,
      guestCount: event.guestCount,
      outletId: event.outletId,
      menuItems: event.menuSelections.map(m => m.recipeId).filter(Boolean) as string[],
      beoId: event.beoId,
      status: 'confirmed',
    });

    logger.info(`[EventLifecycleEngine] Fed event ${event.id} to forecasting engine`);
  }

  // ============================================================================
  // PAYMENT MANAGEMENT
  // ============================================================================

  /**
   * Record payment for event
   */
  async recordPayment(
    eventId: string,
    payment: Omit<EventPayment, 'id'>
  ): Promise<EventRecord> {
    const event = await this.loadEvent(eventId);
    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const paymentRecord: EventPayment = {
      id: crypto.randomUUID(),
      ...payment,
    };

    event.payments.push(paymentRecord);

    // Update pricing
    if (paymentRecord.status === 'completed') {
      if (paymentRecord.type === 'deposit') {
        event.pricing.depositReceived += paymentRecord.amount;
      }
      event.pricing.balanceDue = event.pricing.grandTotal - 
        event.payments
          .filter(p => p.status === 'completed' && p.type !== 'refund')
          .reduce((sum, p) => sum + p.amount, 0);
    }

    // Check if deposit triggers stage advance
    if (paymentRecord.type === 'deposit' && paymentRecord.status === 'completed') {
      if (event.status === EventLifecycleStage.CONTRACT_SIGNED) {
        await this.advanceStage(eventId, EventLifecycleStage.DEPOSIT_RECEIVED, 'system', 'Deposit payment received');
      }
    }

    // Check if final payment triggers stage advance
    if (paymentRecord.type === 'final' && paymentRecord.status === 'completed' && event.pricing.balanceDue <= 0) {
      if (event.status === EventLifecycleStage.FINAL_INVOICE_SENT) {
        await this.advanceStage(eventId, EventLifecycleStage.PAYMENT_RECEIVED, 'system', 'Final payment received');
      }
    }

    await this.persist(event);

    logger.info(`[EventLifecycleEngine] Recorded ${payment.type} payment of $${payment.amount} for event ${eventId}`);

    return event;
  }

  /**
   * Generate final invoice for event
   */
  private async generateFinalInvoice(event: EventRecord): Promise<void> {
    // This would generate invoice document
    const invoice: EventDocument = {
      id: crypto.randomUUID(),
      type: 'invoice',
      name: `Invoice-${event.id.slice(0, 8)}`,
      url: '', // Would be generated PDF URL
      version: 1,
      status: 'draft',
      createdAt: new Date().toISOString(),
    };

    event.documents.push(invoice);
    await this.persist(event);

    await unifiedEventBus.publish(UNIFIED_EVENT_TYPES.INVOICE_RECORDED, {
      invoiceId: invoice.id,
      eventId: event.id,
      amount: event.pricing.balanceDue,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    }, {
      source: { bus: 'unified', module: 'event_lifecycle' },
      tenantId: event.orgId,
    });

    logger.info(`[EventLifecycleEngine] Generated final invoice for event ${event.id}`);
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  private async handleProspectStageChange(payload: any): Promise<void> {
    // Handle prospect stage changes from CRM
  }

  private async handleBEOCreated(payload: any): Promise<void> {
    // Handle BEO creation from Maestro
  }

  private async handleBEOApproved(payload: any): Promise<void> {
    // Handle BEO approval
    const event = Array.from(this.events.values()).find(e => e.beoId === payload.beoId);
    if (event) {
      await this.advanceStage(event.id, EventLifecycleStage.BEO_APPROVED, 'system', 'BEO approved');
    }
  }

  private async handleProductionGenerated(payload: any): Promise<void> {
    // Handle production generation
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private initializePricing(guestCount: number, estimatedRevenue: number): EventPricing {
    return {
      foodRevenue: 0,
      beverageRevenue: 0,
      roomRental: 0,
      serviceCharge: 0,
      serviceChargePercentage: 22,
      avEquipment: 0,
      decorations: 0,
      entertainment: 0,
      valet: 0,
      otherCharges: 0,
      subtotal: 0,
      taxRate: 8.25,
      taxAmount: 0,
      gratuity: 0,
      gratuityPercentage: 0,
      grandTotal: estimatedRevenue,
      depositRequired: estimatedRevenue * 0.5,
      depositReceived: 0,
      balanceDue: estimatedRevenue,
      pricePerPerson: guestCount > 0 ? estimatedRevenue / guestCount : 0,
    };
  }

  private initializeCostTracking(): EventCostTracking {
    return {
      theoreticalFoodCost: 0,
      actualFoodCost: 0,
      foodCostVariance: 0,
      foodCostPercentage: 0,
      theoreticalBeverageCost: 0,
      actualBeverageCost: 0,
      beverageCostVariance: 0,
      beverageCostPercentage: 0,
      scheduledLaborCost: 0,
      actualLaborCost: 0,
      laborCostVariance: 0,
      laborCostPercentage: 0,
      rentalCost: 0,
      equipmentCost: 0,
      linensDecorCost: 0,
      entertainmentCost: 0,
      vendorCosts: [],
      otherDirectCosts: 0,
      overheadAllocation: 0,
      overheadAllocationMethod: 'percentage',
      totalCost: 0,
      totalCOGS: 0,
      grossProfit: 0,
      grossProfitMargin: 0,
      contributionMargin: 0,
      netProfit: 0,
      netProfitMargin: 0,
      revenuePerGuest: 0,
      costPerGuest: 0,
      profitPerGuest: 0,
      ingredientCosts: [],
      recipeCosts: [],
    };
  }

  private initializeLaborAllocation(): LaborAllocation {
    return {
      totalHours: 0,
      totalCost: 0,
      positions: [],
      setupHours: 0,
      serviceHours: 0,
      breakdownHours: 0,
      guestsPerServer: 20,
      laborCostPerGuest: 0,
    };
  }

  private async recalculatePricing(event: EventRecord): Promise<void> {
    let foodRevenue = 0;
    let beverageRevenue = 0;

    for (const selection of event.menuSelections) {
      const total = selection.perPerson ?
        selection.unitPrice * selection.quantity * event.guestCount :
        selection.unitPrice * selection.quantity;

      if (selection.category === 'beverage') {
        beverageRevenue += total;
      } else {
        foodRevenue += total;
      }
    }

    event.pricing.foodRevenue = foodRevenue;
    event.pricing.beverageRevenue = beverageRevenue;
    event.pricing.subtotal = foodRevenue + beverageRevenue + 
      event.pricing.roomRental + event.pricing.avEquipment + 
      event.pricing.decorations + event.pricing.entertainment + 
      event.pricing.valet + event.pricing.otherCharges;
    
    event.pricing.serviceCharge = event.pricing.subtotal * (event.pricing.serviceChargePercentage / 100);
    event.pricing.taxAmount = (event.pricing.subtotal + event.pricing.serviceCharge) * (event.pricing.taxRate / 100);
    event.pricing.grandTotal = event.pricing.subtotal + event.pricing.serviceCharge + event.pricing.taxAmount + event.pricing.gratuity;
    event.pricing.balanceDue = event.pricing.grandTotal - event.pricing.depositReceived;
    event.pricing.pricePerPerson = event.guestCount > 0 ? event.pricing.grandTotal / event.guestCount : 0;
  }

  private mapEventTypeToForecast(type: EventType): 'banquet' | 'private_event' | 'holiday' | 'conference' | 'wedding' | 'regular' {
    const mapping: Record<EventType, 'banquet' | 'private_event' | 'holiday' | 'conference' | 'wedding' | 'regular'> = {
      wedding: 'wedding',
      corporate: 'conference',
      social: 'private_event',
      banquet: 'banquet',
      conference: 'conference',
      gala: 'banquet',
      private_dining: 'private_event',
      cocktail_reception: 'private_event',
      holiday_party: 'holiday',
      other: 'regular',
    };
    return mapping[type] || 'regular';
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  getEvent(eventId: string): EventRecord | undefined {
    return this.events.get(eventId);
  }

  listEvents(orgId: string, filters?: {
    outletId?: string;
    status?: EventLifecycleStage;
    dateFrom?: string;
    dateTo?: string;
  }): EventRecord[] {
    let events = Array.from(this.events.values()).filter(e => e.orgId === orgId);

    if (filters?.outletId) {
      events = events.filter(e => e.outletId === filters.outletId);
    }
    if (filters?.status) {
      events = events.filter(e => e.status === filters.status);
    }
    if (filters?.dateFrom) {
      events = events.filter(e => e.eventDate >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
      events = events.filter(e => e.eventDate <= filters.dateTo!);
    }

    return events.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }

  getEventProfitability(eventId: string): EventCostTracking | undefined {
    return this.events.get(eventId)?.costTracking;
  }

  getStats(): {
    totalEvents: number;
    byStage: Record<EventLifecycleStage, number>;
    totalRevenue: number;
    totalProfit: number;
  } {
    const events = Array.from(this.events.values());
    const byStage: Record<string, number> = {};

    for (const stage of Object.values(EventLifecycleStage)) {
      byStage[stage] = events.filter(e => e.status === stage).length;
    }

    return {
      totalEvents: events.length,
      byStage: byStage as Record<EventLifecycleStage, number>,
      totalRevenue: events.reduce((sum, e) => sum + e.pricing.grandTotal, 0),
      totalProfit: events.reduce((sum, e) => sum + e.costTracking.netProfit, 0),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const eventLifecycleEngine = new EventLifecycleEngine();

export default eventLifecycleEngine;
