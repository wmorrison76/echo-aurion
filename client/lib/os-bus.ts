/**
 * LUCCCA OS Bus (Canonical)
 * -----------------------------------------
 * Single global event bus for inter-module communication.
 *
 * Why this exists:
 * - Prevent fragmentation: multiple modules had their own event buses.
 * - Builder-safe: additive change (doesn't break old buses).
 * - Enables "Event Sales -> Global Calendar -> MaestroBQT" reliably.
 *
 * Rules:
 * - All cross-module events MUST go through this bus.
 * - Modules may still use local events internally, but cross-module = OS Bus.
 */

import type { GenesisAProfile } from "@/../shared/types/genesis";
import type { GenesisBConfig } from "@/../shared/types/genesis-b";
import type { AurumJournalEntry } from "@/../shared/types/aurum-journal";
import type { InternalFulfillmentOrder } from "@/../shared/types/internal-fulfillment";
import type { InventoryMove } from "@/../shared/types/inventory-move";
import type { ProcurementCalendarPlan } from "@/../shared/types/procurement-calendar";
import type { ParProjection } from "@/../shared/types/par";
import type { ChangeEvent } from "@/modules/MaestroBQT/types/genesis-integration";
import type { Prospect, ProspectStage } from "@shared/types/prospect";
import type {
  SurplusAvailability,
  InventoryLedgerEntry,
  InventoryItemState,
} from "@/../shared/types/inventory";
import type { InventoryTransferProposal } from "@/lib/ifo-to-inventory";

export type OSBusEventMap = {
  // Calendar / Events
  // `event` is optional to keep backwards compatibility with emitters that only send IDs.
  "calendar:event_created": { eventId: string; source?: string; event?: unknown };
  "calendar:event_updated": { eventId: string; source?: string; event?: unknown };

  // CRM / Pipeline
  "prospect:stage_changed": {
    prospectId: string;
    stage: ProspectStage;
    source?: string;
    prospect?: Prospect;
  };
  "prospect:converted": {
    prospectId: string;
    clientId?: string;
    eventId?: string;
    source?: string;
    prospect?: Prospect;
  };

  // Maestro Banquets
  "maestro:event_received": { eventId: string; source?: string };

  // BEO (later)
  "beo:created": { beoId: string; eventId: string; source?: string };
  "beo:updated": { beoId: string; eventId: string; source?: string };

  // Production Intelligence
  "production:generated": {
    beoId: string;
    revision: number;
    sheets: any[];
    source?: string;
  };

  // Purchasing Intelligence
  "purchasing:plan_generated": {
    planId: string;
    beoId: string;
    revision: number;
    generatedAt: string;
    ingredients: any[];
    source?: string;
  };

  "purchasing:optimized": {
    beoId: string;
    revision: number;
    generatedAt: string;
    orders: any[];
    source?: string;
  };

  // Receiving / exceptions (handshake)
  "receiving:exception": {
    beoId: string;
    orderId: string;
    kind: "short_ship" | "damaged" | "missing" | "other";
    quantityMissing?: number;
    note?: string;
    createdAt: string;
    source?: string;
  };

  // Change notifications (Genesis F/H)
  "change-event": ChangeEvent;

  // Labor Intelligence
  "labor:plan_generated": {
    planId: string;
    beoId: string;
    revision: number;
    eventDate: string;
    eventTimeRange: string;
    generatedAt: string;
    requirements: any[];
    deltas: any[];
    source?: string;
  };

  // Echo AI Advisory
  "echo:advisory_generated": {
    advisoryId: string;
    beoId: string;
    revision: number;
    title: string;
    summary: string;
    impacts: {
      foodCostDelta?: number;
      laborHoursDelta?: number;
      laborStaffDelta?: number;
    };
    recommendations: string[];
    severity: "info" | "warning" | "critical";
    generatedAt: string;
    source?: string;
  };

  // Group Intelligence
  "group:intelligence_generated": {
    groupId: string;
    groupName: string;
    generatedAt: string;
    events: any[];
    purchasePlan: {
      totalCost: number;
      lines: any[];
    };
    laborPlan: {
      totalHours: number;
      totalStaff: number;
      lines: any[];
    };
    source?: string;
  };

  // Audit trail (shared)
  "audit:entry": {
    entry: any;
    source?: string;
  };

  // Procurement (Genesis C)
  "procurement:plan_generated": {
    planId: string;
    groupId?: string | null;
    windowStartISO: string;
    windowEndISO: string;
    source?: string;
  };

  // Procurement Calendar (Genesis F)
  "procurement:calendar_plan_generated": ProcurementCalendarPlan & {
    source?: string;
  };

  // Genesis
  "genesis:a_saved": GenesisAProfile;
  "genesis:b_saved": GenesisBConfig;

  // Aurum (Genesis D)
  "aurum:journal_entry_created": AurumJournalEntry;

  // Internal Fulfillment (Genesis E)
  "fulfillment:ifo_updated": InternalFulfillmentOrder;
  "inventory:move_created": InventoryMove;
  "inventory:transfer_proposed": InventoryTransferProposal;

  // Inventory (Genesis G)
  "inventory:surplus_broadcast": {
    surplus: SurplusAvailability;
  };

  "inventory:updated": {
    locationId: string;
    item: InventoryItemState;
    ledger: InventoryLedgerEntry;
  };

  // Inventory Mini Panel (Genesis G)
  "inventory:snapshot_updated": {
    locationId: string;
    snapshot: Array<{
      itemKey: string;
      name: string;
      onHand: number;
      uom: string;
    }>;
    updatedAt: number;
    source?: string;
  };

  "inventory:adjustment_proposed": {
    adjustmentId: string;
    locationId: string;
    source: string;
    lines: Array<{
      itemKey: string;
      name: string;
      qty: number;
      uom: string;
      direction: "IN" | "OUT";
    }>;
    note: string;
    createdAt: number;
  };

  "inventory:adjustment_committed": {
    adjustmentId: string;
    locationId: string;
    committedAt: number;
    source?: string;
  };

  "inventory:surplus_broadcasted": {
    id: string;
    locationId: string;
    name: string;
    qty: number;
    uom: string;
    note?: string;
    createdAt: number;
    expiresAt?: number;
    source?: string;
  };

  "inventory:leaderboard_updated": {
    cadence: "DAILY" | "WEEKLY" | "MONTHLY";
    leaderboard: any;
    source?: string;
  };

  // Inventory Rewards (U4.9)
  "inventory:reward_issued": {
    id: string;
    kind: string;
    severity: string;
    locationId: string;
    title: string;
    message: string;
    issuedAt: number;
    source?: string;
  };

  "chefnet:recognition_posted": {
    kind: string;
    locationId: string;
    title: string;
    message: string;
    severity: string;
    issuedAt: number;
    sourceRewardId: string;
    source?: string;
  };

  // Genesis Configuration (Onboarding + Config Management)
  "genesis:config_generated": {
    eventId: string;
    idempotencyKey: string;
    correlationId: string;
    timestamp: string;
    actor: {
      userId?: string;
      role?: string;
      system?: string;
    };
    propertyId: string;
    outletScope: string[];
    explain: string;
    payload: {
      configId: string;
      sectionCount: number;
    };
  };

  "genesis:config_updated": {
    eventId: string;
    idempotencyKey: string;
    correlationId: string;
    timestamp: string;
    actor: {
      userId?: string;
      role?: string;
      system?: string;
    };
    propertyId: string;
    outletScope: string[];
    explain: string;
    payload: {
      changeCount: number;
      affectedOutlets: string[];
    };
  };

  // Genesis Queue Events (E)
  "genesis:queue_requested": {
    eventId: string;
    idempotencyKey: string;
    correlationId: string;
    timestamp: string;
    actor: {
      userId?: string;
      role?: string;
      system?: string;
    };
    propertyId: string;
    outletScope: string[];
    explain: string;
    payload: {
      ifoId: string;
      sourceType: string;
    };
  };

  "genesis:queue_claimed": {
    eventId: string;
    idempotencyKey: string;
    correlationId: string;
    timestamp: string;
    actor: {
      userId?: string;
      role?: string;
      system?: string;
    };
    propertyId: string;
    outletScope: string[];
    explain: string;
    payload: {
      ifoId: string;
      claimedByLocationId: string;
    };
  };

  "genesis:queue_fulfilled": {
    eventId: string;
    idempotencyKey: string;
    correlationId: string;
    timestamp: string;
    actor: {
      userId?: string;
      role?: string;
      system?: string;
    };
    propertyId: string;
    outletScope: string[];
    explain: string;
    payload: {
      ifoId: string;
      transferId: string;
      costAttributionMode: string;
    };
  };

  // Genesis Procurement Orchestrator
  "genesis:procurement_plan_generated": {
    eventId: string;
    idempotencyKey: string;
    correlationId: string;
    timestamp: string;
    actor: {
      userId?: string;
      role?: string;
      system?: string;
    };
    propertyId: string;
    outletScope: string[];
    explain: string;
    payload: {
      planId: string;
      totalLines: number;
      totalValue: number;
      idempotencyChecksum: string;
    };
  };

  // Genesis Vendor Drops (F)
  "genesis:vendor_drops_updated": {
    eventId: string;
    idempotencyKey: string;
    correlationId: string;
    timestamp: string;
    actor: {
      userId?: string;
      role?: string;
      system?: string;
    };
    propertyId: string;
    outletScope: string[];
    explain: string;
    payload: {
      dropCount: number;
      vendorCount: number;
    };
  };

  // Genesis Inventory Offsets (G)
  "genesis:inventory_offsets_updated": {
    eventId: string;
    idempotencyKey: string;
    correlationId: string;
    timestamp: string;
    actor: {
      userId?: string;
      role?: string;
      system?: string;
    };
    propertyId: string;
    outletScope: string[];
    explain: string;
    payload: {
      offsetCount: number;
      affectedItems: string[];
    };
  };

  // Genesis PARs & Lead Time (H)
  "genesis:pars_updated": {
    eventId: string;
    idempotencyKey: string;
    correlationId: string;
    timestamp: string;
    actor: {
      userId?: string;
      role?: string;
      system?: string;
    };
    propertyId: string;
    outletScope: string[];
    explain: string;
    payload: {
      parCount: number;
      leadTimeTaskCount: number;
    };
  };

  // Genesis Cost Attribution (D)
  "genesis:cost_rules_updated": {
    eventId: string;
    idempotencyKey: string;
    correlationId: string;
    timestamp: string;
    actor: {
      userId?: string;
      role?: string;
      system?: string;
    };
    propertyId: string;
    outletScope: string[];
    explain: string;
    payload: {
      oldRule: string;
      newRule: string;
      affectedLines: number;
    };
  };

  // Aurum Journal (D)
  "aurum:journal_draft_created": {
    eventId: string;
    idempotencyKey: string;
    correlationId: string;
    timestamp: string;
    actor: {
      userId?: string;
      role?: string;
      system?: string;
    };
    propertyId: string;
    outletScope: string[];
    explain: string;
    payload: {
      draftId: string;
      accountCode: string;
      debit: number;
      credit: number;
    };
  };

  "aurum:journal_annotated": {
    eventId: string;
    idempotencyKey: string;
    correlationId: string;
    timestamp: string;
    actor: {
      userId?: string;
      role?: string;
      system?: string;
    };
    propertyId: string;
    outletScope: string[];
    explain: string;
    payload: {
      journalId: string;
      annotationCount: number;
    };
  };

  // Genesis Audit Trail
  "genesis:audit_appended": {
    eventId: string;
    idempotencyKey: string;
    correlationId: string;
    timestamp: string;
    actor: {
      userId?: string;
      role?: string;
      system?: string;
    };
    propertyId: string;
    outletScope: string[];
    explain: string;
    payload: {
      auditId: string;
      category: string;
    };
  };

  // PAR Intelligence (Genesis H)
  "par:projection_created": {
    locationId: string;
    projections: ParProjection[];
    timestamp: string;
    source?: string;
  };

  // UI
  "ui:open_panel": {
    panelKey: string;
    payload?: unknown;
    tab?: string;
    focus?: boolean;
    source?: string;
  };

  // Video Conference – in-call Echo / Phase 13 integration
  "video_conference:request_summary": {
    roomId: string;
    roomName?: string;
    requestSummary: boolean;
    syncActions?: boolean;
    source?: string;
  };

  /**
   * Unified / bridging (industry-standard direction)
   * - Allows legacy internal buses (MaestroEventBus, FinancialEventBus) to bridge into the canonical OS Bus
   *   without forcing immediate refactors across the monorepo.
   */
  "maestro:internal_event": { message: any; source?: string };
  "financial:event": { event: any; source?: string };
  "ai:ops_context": { topic: string; event: string; payload: any; at: number; source?: string };

  // Deprecation / Legacy Path Blocking
  "legacy:path_blocked": {
    flag: string;
    context: string;
    blockedAt: number;
    message: string;
  };
};

type Handler<T> = (payload: T) => void;
type AnyHandler = (event: keyof OSBusEventMap, payload: any) => void;

class OSBus {
  private handlers: Map<keyof OSBusEventMap, Set<Handler<any>>> = new Map();
  private anyHandlers: Set<AnyHandler> = new Set();
  private history: Array<{ event: keyof OSBusEventMap; payload: any; at: number }> = [];
  private maxHistorySize = 2000;

  on<K extends keyof OSBusEventMap>(
    event: K,
    handler: Handler<OSBusEventMap[K]>,
  ) {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler as Handler<any>);
    this.handlers.set(event, set);
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to all OS Bus events (wildcard).
   * Useful for orchestration, AI, and diagnostics.
   */
  onAny(handler: AnyHandler) {
    this.anyHandlers.add(handler);
    return () => this.anyHandlers.delete(handler);
  }

  off<K extends keyof OSBusEventMap>(
    event: K,
    handler: Handler<OSBusEventMap[K]>,
  ) {
    const set = this.handlers.get(event);
    if (!set) return;
    set.delete(handler as Handler<any>);
    if (set.size === 0) this.handlers.delete(event);
  }

  emit<K extends keyof OSBusEventMap>(event: K, payload: OSBusEventMap[K]) {
    // Store history (best-effort; capped).
    this.history.push({ event, payload, at: Date.now() });
    if (this.history.length > this.maxHistorySize) this.history.shift();

    // Wildcard subscribers.
    for (const handler of this.anyHandlers) {
      try {
        handler(event, payload);
      } catch (err) {
        console.error(`[OSBus] wildcard handler error for ${String(event)}`, err);
      }
    }

    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[OSBus] handler error for ${String(event)}`, err);
      }
    }
  }

  /**
   * Best-effort event history for diagnostics/replay.
   * (Client-side only; not a durable store.)
   */
  getHistory(filter?: { event?: keyof OSBusEventMap; limit?: number }) {
    const limit = Math.max(1, Math.floor(filter?.limit ?? 200));
    const list = filter?.event ? this.history.filter((h) => h.event === filter.event) : this.history;
    return list.slice(-limit);
  }
}

export const osBus = new OSBus();
