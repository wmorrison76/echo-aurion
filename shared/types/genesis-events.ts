/**
 * Genesis Event Bus Types
 * Handshake contract: all modules speak the same event language
 * Features: idempotency, correlation, tracing, audit
 */

import type {
  GenesisConfig,
  PolicyRevision,
} from "@/shared/types/genesis-config";
import type {
  InternalFulfillmentOrder,
  IFOStatus,
} from "@/shared/types/internal-fulfillment";
import type { InventoryMove } from "@/shared/types/inventory-move";
import type { ProcurementCalendarPlan } from "@/shared/types/procurement-calendar";
import type { ParProjection } from "@/shared/types/par";
import type { AurumJournalEntry } from "@/shared/types/aurum-journal";

/**
 * Actor context (who triggered the event)
 */
export interface EventActor {
  userId?: string;
  role?: string;
  system?: string; // "genesis-orchestrator" | "genesis-e-panel" etc.
}

/**
 * Base event structure (all genesis events extend this)
 */
export interface GenesisEventBase {
  // Unique ID for this event
  eventId: string; // uuid

  // Idempotency: prevents duplicate processing
  // hash of "meaning" (e.g., "outlet_storeroom_12oz_coffee_2025-01-05")
  idempotencyKey: string;

  // Tracing: ties multiple events together
  correlationId: string; // shared across request → claim → fulfill
  causationId?: string; // previous event that triggered this

  // Context
  timestamp: string; // ISO 8601
  actor: EventActor;
  propertyId: string;
  outletScope: string[]; // affected outlet IDs

  // Explanation (for audit UI)
  explain: string;
}

/**
 * Onboarding complete: configuration generated
 */
export interface GenesisConfigGeneratedEvent extends GenesisEventBase {
  payload: {
    config: GenesisConfig;
    sectionCount: number; // how many sections filled
  };
}

/**
 * Configuration updated: policy revision applied
 */
export interface GenesisConfigUpdatedEvent extends GenesisEventBase {
  payload: {
    changes: PolicyRevision;
    affectedOutlets: string[];
    affectedCommissaries: string[];
  };
}

/**
 * Queue: request created
 */
export interface GenesisQueueRequestedEvent extends GenesisEventBase {
  payload: {
    ifo: InternalFulfillmentOrder;
    sourceType: "ADHOC" | "BEO" | "REO" | "PAR_REPLENISH" | "SHORTAGE_RECOVERY";
  };
}

/**
 * Queue: request claimed by commissary/outlet
 */
export interface GenesisQueueClaimedEvent extends GenesisEventBase {
  payload: {
    ifoId: string;
    claimedByLocationId: string;
    claimedAt: string; // ISO
  };
}

/**
 * Queue: request fulfilled (transfer created)
 */
export interface GenesisQueueFulfilledEvent extends GenesisEventBase {
  payload: {
    ifoId: string;
    transferId: string;
    fulfilledByLocationId: string;
    deliveredAt: string; // ISO
    costAttributionMode: "SOURCE_PAYS" | "REQUESTING_OUTLET_PAYS" | "SPLIT";
  };
}

/**
 * Procurement: combined plan generated
 */
export interface GenesisProcurementPlanGeneratedEvent extends GenesisEventBase {
  payload: {
    planId: string;
    totalLines: number;
    totalValue: number;
    vendorCount: number;
    dropDateCount: number;
    idempotencyChecksum: string; // to detect duplicates
  };
}

/**
 * Vendor Calendar: drops updated
 */
export interface GenesisVendorDropsUpdatedEvent extends GenesisEventBase {
  payload: {
    drops: Array<{
      vendorId: string;
      dropDate: string; // ISO
      lineCount: number;
      value: number;
    }>;
  };
}

/**
 * Inventory: offsets applied
 */
export interface GenesisInventoryOffsetsUpdatedEvent extends GenesisEventBase {
  payload: {
    offsets: Array<{
      locationId: string;
      itemKey: string;
      offsetQty: number;
      reason: string;
    }>;
  };
}

/**
 * PARs: standing pars + lead-time tasks updated
 */
export interface GenesisPARsUpdatedEvent extends GenesisEventBase {
  payload: {
    pars: ParProjection[];
    leadTimeTasks: Array<{
      taskId: string;
      locationId: string;
      dueAt: string; // ISO
      quantity: number;
      reason: string;
    }>;
  };
}

/**
 * Cost Rules: attribution rules updated
 */
export interface GenesisCostRulesUpdatedEvent extends GenesisEventBase {
  payload: {
    oldRule: string; // previous mode
    newRule: string; // new mode
    affectedLines: number; // how many lines affected
  };
}

/**
 * Aurum: journal draft created
 */
export interface AurumJournalDraftCreatedEvent extends GenesisEventBase {
  payload: {
    draft: {
      draftId: string;
      accountCode: string;
      debit: number;
      credit: number;
      description: string;
      sourceReferences: Array<{
        type: "IFO" | "TRANSFER" | "PROCUREMENT";
        id: string;
      }>;
    };
  };
}

/**
 * Aurum: journal annotated (for explanation)
 */
export interface AurumJournalAnnotatedEvent extends GenesisEventBase {
  payload: {
    journalId: string;
    annotations: Array<{
      field: string;
      oldValue: string;
      newValue: string;
      reason: string;
    }>;
  };
}

/**
 * Audit: entry appended (general purpose)
 */
export interface GenesisAuditAppendedEvent extends GenesisEventBase {
  payload: {
    auditId: string;
    category: "CONFIG" | "COST" | "RULE" | "OUTLET" | "OTHER";
    details: Record<string, any>;
  };
}

/**
 * Union of all genesis event types
 */
export type GenesisEvent =
  | GenesisConfigGeneratedEvent
  | GenesisConfigUpdatedEvent
  | GenesisQueueRequestedEvent
  | GenesisQueueClaimedEvent
  | GenesisQueueFulfilledEvent
  | GenesisProcurementPlanGeneratedEvent
  | GenesisVendorDropsUpdatedEvent
  | GenesisInventoryOffsetsUpdatedEvent
  | GenesisPARsUpdatedEvent
  | GenesisCostRulesUpdatedEvent
  | AurumJournalDraftCreatedEvent
  | AurumJournalAnnotatedEvent
  | GenesisAuditAppendedEvent;

/**
 * Helper: create idempotency key from scope
 * Ensures same event won't be processed twice
 */
export function makeIdempotencyKey(
  scope: string,
  type: string,
  value: string,
): string {
  return `${scope}:${type}:${value}`;
}

/**
 * Helper: check if event is likely a duplicate based on key + timestamp
 */
export function isIdempotentDuplicate(
  lastSeenKey: string,
  lastSeenTime: number,
  currentKey: string,
  currentTime: number,
  deduplicationWindowMs: number = 10000, // 10 seconds
): boolean {
  if (lastSeenKey !== currentKey) return false;
  return currentTime - lastSeenTime < deduplicationWindowMs;
}

/**
 * Helper: extract cause chain from event
 */
export function getCauseChain(event: GenesisEventBase): string[] {
  const chain: string[] = [];
  let current = event;

  while (current) {
    chain.push(current.eventId);
    if (!current.causationId) break;
    // Note: in real implementation, you'd look up causationId in event store
    break;
  }

  return chain;
}

/**
 * Helper: format event for display
 */
export function formatEventForDisplay(event: GenesisEventBase): string {
  return `[${new Date(event.timestamp).toLocaleTimeString()}] ${event.explain}`;
}
