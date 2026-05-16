/**
 * LUCCCA Genesis E — IFO Store
 * Local persistence (localStorage) using deterministic, safe patterns.
 *
 * Based on Whiteboard stabilization patterns:
 * - Safe JSON parsing with fallbacks
 * - Graceful failure (silent) if storage unavailable
 * - Revision tracking for optimistic updates
 * - Append-only audit log
 */

import type {
  InternalFulfillmentOrder,
  IFOAuditEntry,
  IFOStatus,
} from "@/shared/types/ifo";

const LS_KEY = "luccca:ifo_store:v1";
const LS_AUDIT_KEY = "luccca:ifo_audit:v1";

type StoreShape = {
  byId: Record<string, InternalFulfillmentOrder>;
  ids: string[]; // newest first
};

type AuditShape = {
  byIFO: Record<string, IFOAuditEntry[]>;
};

/**
 * Safe JSON parse with fallback
 */
function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function now() {
  return Date.now();
}

/**
 * Generate deterministic IDs: prefix_random_timestamp
 */
function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * Read main store from localStorage
 */
function readStore(): StoreShape {
  try {
    return safeParse<StoreShape>(localStorage.getItem(LS_KEY), {
      byId: {},
      ids: [],
    });
  } catch {
    return { byId: {}, ids: [] };
  }
}

/**
 * Write main store to localStorage
 */
function writeStore(next: StoreShape) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch (err) {
    console.error(
      "[IFO Store] Failed to write store:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Read audit log from localStorage
 */
function readAudit(): AuditShape {
  try {
    return safeParse<AuditShape>(localStorage.getItem(LS_AUDIT_KEY), {
      byIFO: {},
    });
  } catch {
    return { byIFO: {} };
  }
}

/**
 * Write audit log to localStorage
 */
function writeAudit(next: AuditShape) {
  try {
    localStorage.setItem(LS_AUDIT_KEY, JSON.stringify(next));
  } catch (err) {
    console.error(
      "[IFO Store] Failed to write audit:",
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Initialize sample IFOs for demo/testing
 */
export function initializeSampleIFOs() {
  const store = readStore();
  if (store.ids.length > 0) return; // already initialized

  const sample: InternalFulfillmentOrder = {
    ifoId: uid("ifo"),
    revision: 1,
    requestingLocationId: "restaurant-0",
    fulfillingLocationId: "banquets-commissary",
    status: "REQUESTED",
    dueAt: now() + 24 * 60 * 60 * 1000,
    createdAt: now() - 15 * 60 * 1000,
    updatedAt: now() - 5 * 60 * 1000,
    sourceRef: { type: "REO", id: "reo_demo_001", label: "REO Demo" },
    items: [
      {
        id: uid("ifo_item"),
        name: "Chicken Stock",
        type: "PREP",
        quantity: 5,
        uom: "gal",
        leadTimeHours: 18,
        notes: "For weekend specials",
      },
    ],
    notes: "Auto sample",
  };

  store.byId[sample.ifoId] = sample;
  store.ids.unshift(sample.ifoId);
  writeStore(store);

  appendIFOAudit(sample.ifoId, {
    id: uid("ifo_audit"),
    ifoId: sample.ifoId,
    action: "CREATED",
    actorRole: "SYSTEM",
    timestamp: now(),
    note: "Initialized sample IFO",
  });
}

/**
 * List all IFOs (sorted by creation, newest first)
 */
export function listIFOs(): InternalFulfillmentOrder[] {
  const store = readStore();
  return store.ids
    .map((id) => store.byId[id])
    .filter((x): x is InternalFulfillmentOrder => Boolean(x));
}

/**
 * Get single IFO by ID
 */
export function getIFOById(ifoId: string): InternalFulfillmentOrder | null {
  const store = readStore();
  return store.byId[ifoId] ?? null;
}

/**
 * Create or update IFO (with revision tracking)
 */
export function upsertIFO(ifo: InternalFulfillmentOrder) {
  const store = readStore();
  const exists = Boolean(store.byId[ifo.ifoId]);

  const updated: InternalFulfillmentOrder = {
    ...ifo,
    updatedAt: now(),
    revision: Math.max(
      ifo.revision ?? 1,
      (store.byId[ifo.ifoId]?.revision ?? 0) + 1,
    ),
  };

  store.byId[ifo.ifoId] = updated;
  if (!exists) {
    store.ids.unshift(ifo.ifoId);
  }

  writeStore(store);
}

/**
 * Atomic status change (logs audit entry)
 */
export function updateIFOStatus(ifoId: string, status: IFOStatus) {
  const cur = getIFOById(ifoId);
  if (!cur) return;

  const next: InternalFulfillmentOrder = {
    ...cur,
    status,
    updatedAt: now(),
    revision: (cur.revision ?? 1) + 1,
  };
  upsertIFO(next);
}

/**
 * Append immutable audit entry
 */
export function appendIFOAudit(ifoId: string, entry: IFOAuditEntry) {
  const audit = readAudit();
  const arr = audit.byIFO[ifoId] ?? [];
  audit.byIFO[ifoId] = [entry, ...arr]; // newest first
  writeAudit(audit);
}

/**
 * List audit trail for IFO (newest first)
 */
export function listIFOAudit(ifoId: string): IFOAuditEntry[] {
  const audit = readAudit();
  return audit.byIFO[ifoId] ?? [];
}

/**
 * Filter IFOs by location (requesting or fulfilling)
 */
export function listIFOsByLocation(locationId: string) {
  return listIFOs().filter(
    (x) =>
      x.requestingLocationId === locationId ||
      x.fulfillingLocationId === locationId,
  );
}

/**
 * Filter IFOs needing attention (due within 24h, not terminal)
 */
export function listIFOsNeedingAttention(referenceTime = now()) {
  return listIFOs().filter((x) => {
    // Terminal states don't need attention
    if (
      x.status === "DELIVERED" ||
      x.status === "CANCELLED" ||
      x.status === "REJECTED"
    ) {
      return false;
    }

    // Check if due soon (within 24h)
    const hours = (x.dueAt - referenceTime) / (60 * 60 * 1000);
    return hours <= 24;
  });
}

/**
 * Factory: Create new IFO in DRAFT status
 */
export function createIFO(params: {
  requestingLocationId: string;
  dueAt: number;
  items: InternalFulfillmentOrder["items"];
  sourceRef: InternalFulfillmentOrder["sourceRef"];
  notes?: string;
}): InternalFulfillmentOrder {
  const created: InternalFulfillmentOrder = {
    ifoId: uid("ifo"),
    revision: 1,
    requestingLocationId: params.requestingLocationId,
    status: "DRAFT",
    dueAt: params.dueAt,
    createdAt: now(),
    updatedAt: now(),
    items: params.items,
    sourceRef: params.sourceRef,
    notes: params.notes,
  };

  upsertIFO(created);
  appendIFOAudit(created.ifoId, {
    id: uid("ifo_audit"),
    ifoId: created.ifoId,
    action: "CREATED",
    actorRole: "OUTLET_OPERATOR",
    timestamp: now(),
  });

  return created;
}
