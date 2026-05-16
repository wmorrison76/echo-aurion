/**
 * LUCCCA Genesis E — Internal Fulfillment Orders (IFO)
 * Canonical types for v1: deterministic, audit-friendly, extensible.
 *
 * Parallel to existing internal-fulfillment.ts but with enhanced structure:
 * - Finer-grained status (PARTIAL, IN_PRODUCTION vs. PICKING)
 * - Risk scoring fields
 * - Cost attribution decision structure
 * - Immutable audit trail
 */

export type IFOStatus =
  | "DRAFT"
  | "REQUESTED"
  | "ACCEPTED"
  | "IN_PRODUCTION"
  | "READY"
  | "DELIVERED"
  | "CANCELLED"
  | "REJECTED"
  | "PARTIAL";

export type IFOItemType = "INGREDIENT" | "PREP" | "RECIPE" | "FINISHED_GOOD";

export type IFOSourceType =
  | "MANUAL"
  | "REO"
  | "BEO"
  | "SURPLUS_CLAIM"
  | "AUTO_PAR";

export type IFOActorRole =
  | "OUTLET_OPERATOR"
  | "COMMISSARY_OPERATOR"
  | "RECEIVING"
  | "FINANCE_ADMIN"
  | "SUPER_ADMIN"
  | "SYSTEM";

export type IFOSeverity = "info" | "warning" | "critical";

/**
 * IFORef — Source reference
 * Links IFO to originating system (BEO, REO, etc.)
 */
export interface IFORef {
  type: IFOSourceType;
  id?: string; // REO/BEO id when relevant
  label?: string; // user-friendly label
}

/**
 * IFOItem — Line item in request
 */
export interface IFOItem {
  id: string;
  name: string;
  type: IFOItemType;
  quantity: number;
  uom: string;
  notes?: string;

  // Optional canonical linking
  recipeId?: string;
  ingredientId?: string;

  // Used for deterministic risk scoring + production planning
  leadTimeHours?: number; // how long to produce/prepare
  yieldPercent?: number; // 0..1 (e.g., 0.92 for 92% yield)
}

/**
 * IFOAttributionDecision — Cost attribution determined by Genesis D
 * Immutable once set; tracks reasoning for audit.
 */
export interface IFOAttributionDecision {
  mode: "RECEIVING_PAYS" | "PRODUCER_PAYS" | "SPLIT" | "FINANCE_OVERRIDE";

  debitLocationId: string; // where cost lands
  creditLocationId?: string; // where credit lands (optional)

  reasonCode:
    | "DEFAULT_RULE"
    | "AUTO_DETECTED_SOURCE"
    | "ADMIN_OVERRIDE"
    | "LEGACY_MIGRATION";

  note?: string;
  decidedAt: number; // epoch ms
}

/**
 * IFOJournalRef — Link to EchoAurum journal entry
 */
export interface IFOJournalRef {
  journalEntryId: string;
  createdAt: number;
}

/**
 * IFOAuditEntry — Immutable action log
 * Append-only; used for compliance + replay.
 */
export interface IFOAuditEntry {
  id: string;
  ifoId: string;

  action:
    | "CREATED"
    | "REQUESTED"
    | "ACCEPTED"
    | "UPDATED"
    | "STATUS_CHANGED"
    | "SPLIT"
    | "DELIVERED"
    | "CANCELLED"
    | "REJECTED"
    | "NOTE_ADDED"
    | "SYSTEM_RISK_FLAGGED";

  actorRole: IFOActorRole;
  actorLabel?: string; // e.g., "Chef John Smith"

  timestamp: number; // epoch ms
  diff?: Record<string, unknown>; // shallow diff for v1
  note?: string;
}

/**
 * InternalFulfillmentOrder — Main entity
 * Represents a request from one location to another for items.
 */
export interface InternalFulfillmentOrder {
  ifoId: string;
  revision: number;

  // Actors
  requestingLocationId: string;
  fulfillingLocationId?: string; // optional until accepted

  // State
  status: IFOStatus;

  // Timeline
  dueAt: number; // epoch ms
  createdAt: number;
  updatedAt: number;

  // Content
  items: IFOItem[];
  sourceRef: IFORef;

  // Computed / Determined
  risk?: {
    severity: IFOSeverity;
    flags: string[]; // e.g., ["DUE_SOON", "LEADTIME_RISK"]
  };

  attribution?: IFOAttributionDecision;
  journalRefs?: IFOJournalRef[];

  notes?: string;
}
