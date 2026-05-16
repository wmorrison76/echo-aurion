/**
 * Genesis Combined Procurement Orchestrator Types
 * Merges E/F/G/H/D logic into single unified plan
 */

import type { GenesisConfig } from "@/shared/types/genesis-config";
import type { InternalFulfillmentOrder } from "@/shared/types/internal-fulfillment";
import type { ProcurementCalendarDrop } from "@/shared/types/procurement-calendar";

/**
 * Demand item (from queue, PARs, or inventory offsets)
 */
export interface DemandItem {
  demandId: string;
  locationId: string; // requesting outlet
  itemKey: string;
  itemName: string;
  unit: string;
  quantity: number;
  quantityOffset: number; // from Genesis G offsets
  totalQuantity: number; // quantity + offset
  dueAt: string; // ISO
  priority: "ASAP" | "STANDARD" | "LOW";
  sourceType: "IFO" | "PAR" | "OFFSET" | "LEAD_TIME_TASK";
  sourceId: string; // reference to IFO/PAR/offset that created this
  leadTimeHours?: number; // if from a lead-time task
  notes?: string;
}

/**
 * Supply option (where we can get this item)
 */
export interface SupplyOption {
  supplierId: string; // vendor ID or internal commissary ID
  sourceType: "INTERNAL" | "VENDOR";
  availableQty: number;
  leadTimeDays: number;
  availableDate: string; // ISO
  costPerUnit: number;
  totalCost: number;
  deliveryWindow?: {
    startISO: string;
    endISO: string;
  };
  vendorDropDate?: string; // ISO (for vendor drops)
  notes?: string;
}

/**
 * Procurement line (matched demand + supply)
 */
export interface ProcurementLine {
  lineId: string;
  demandId: string; // which demand this fulfills
  locationId: string; // requesting outlet
  itemKey: string;
  itemName: string;
  unit: string;
  quantity: number;
  supplierId: string; // vendor or internal
  sourceType: "INTERNAL" | "VENDOR";
  costPerUnit: number;
  totalCost: number;
  orderAt: string; // ISO: when to order
  deliverBy: string; // ISO: when it should arrive
  costAttributionMode: "SOURCE_PAYS" | "REQUESTING_OUTLET_PAYS" | "SPLIT";
  costAttributionPayerId?: string; // who pays (outlet ID)
  notes?: string;
}

/**
 * Audit note for a procurement line
 */
export interface ProcurementAuditNote {
  lineId: string;
  noteId: string;
  category:
    | "COST_CHANGE"
    | "RULE_APPLIED"
    | "OFFSET_APPLIED"
    | "LEAD_TIME"
    | "OTHER";
  oldValue?: string;
  newValue?: string;
  reason: string;
  createdAt: string; // ISO
}

/**
 * Combined procurement plan (output from orchestrator)
 * Groups all procurement needs by drop date, vendor, cost attribution
 */
export interface CombinedProcurementPlan {
  planId: string;
  version: 1;
  propertyId: string;

  // Generation metadata
  generatedAt: string; // ISO
  generatedBy?: string; // userId or "genesis-orchestrator"
  idempotencyChecksum: string; // hash to detect duplicates

  // Correlation with orchestrator run
  correlationId: string; // ties to genesis.procurement.plan.generated event

  // Input snapshots (for audit trail)
  configUsed: GenesisConfig;
  venueDropsAtTime?: ProcurementCalendarDrop[];
  inventoryLevelsAtTime?: Record<string, number>; // itemKey → qty
  activePARsAtTime?: any[]; // PAR snapshot

  // All demand (before matching)
  demand: DemandItem[];

  // All lines (after matching + cost attribution)
  procurementLines: ProcurementLine[];

  // Grouped by drop date (for easy viewing)
  dropsByDate: Array<{
    dropDate: string; // ISO
    vendorId: string;
    lines: ProcurementLine[];
    totalValue: number;
    cutoffTime: string; // "Friday EOD" etc
  }>;

  // Cost summary
  costSummary: {
    totalCost: number;
    byMode: Record<string, number>; // mode → total cost
    byOutlet: Record<string, number>; // outlet ID → total cost
  };

  // Audit trail
  auditNotes: ProcurementAuditNote[];

  // Warnings/risks
  risks: Array<{
    severity: "INFO" | "WARNING" | "CRITICAL";
    message: string;
    affectedLineIds: string[];
  }>;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  // When to run
  autoRun: boolean;
  runOnSchedule?: "DAILY" | "WEEKLY"; // time TBD
  runOnEvent?: Array<"QUEUE_CHANGE" | "INVENTORY_CHANGE" | "PAR_CHANGE">;

  // Behavior
  excludeInternal: boolean; // exclude internal transfers from procurement plan
  consolidateByVendor: boolean; // group items from same vendor
  enforceCutoffs: boolean; // respect vendor drop cutoff times
  autoGenerateAurumDrafts: boolean; // auto-create journal entries

  // Thresholds
  minLineValue: number; // skip lines below this value
  maxPlanHorizon: number; // days ahead to plan for
}

/**
 * Input to orchestrator
 */
export interface OrchestratorInput {
  config: GenesisConfig;
  vendorDrops: ProcurementCalendarDrop[];
  inventoryOffsets: Array<{
    itemKey: string;
    locationId: string;
    offsetQty: number;
    reason: string;
  }>;
  activePARs: any[]; // ParProjection[]
  openIFOs: InternalFulfillmentOrder[];
  currentInventory: Record<string, number>; // itemKey → qty
  now: number; // timestamp
}

/**
 * Output from orchestrator (plan + metadata)
 */
export interface OrchestratorOutput {
  plan: CombinedProcurementPlan;
  executionTimeMs: number;
  warnings: string[];
  aurumDraftsToCreate: Array<{
    accountCode: string;
    debit: number;
    credit: number;
    description: string;
    sourceLineIds: string[];
  }>;
}

/**
 * Orchestrator state (for caching + idempotency)
 */
export interface OrchestratorState {
  lastPlanId?: string;
  lastGeneratedAt?: string; // ISO
  lastIdempotencyChecksum?: string;
  cachedPlan?: CombinedProcurementPlan;
  cacheExpiresAt?: string; // ISO (5 min cache)
}
