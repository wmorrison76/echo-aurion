/**
 * Genesis E — Internal Fulfillment Store (Local v1)
 * Persists IFOs across refresh and supports listing by commissary/outlet.
 */

import type { InternalFulfillmentOrder } from "@/../shared/types/internal-fulfillment";

const KEY = "luccca:internal_fulfillment:v1";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const memoryStore = new Map<string, string>();

function getStorage(): StorageLike {
  if (typeof window === "undefined") {
    return {
      getItem: (k) => memoryStore.get(k) ?? null,
      setItem: (k, v) => {
        memoryStore.set(k, v);
      },
    };
  }

  try {
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
  } catch {
    // ignore
  }

  return {
    getItem: (k) => memoryStore.get(k) ?? null,
    setItem: (k, v) => {
      memoryStore.set(k, v);
    },
  };
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readAll(): InternalFulfillmentOrder[] {
  const storage = getStorage();
  return safeParse<InternalFulfillmentOrder[]>(storage.getItem(KEY), []);
}

function writeAll(all: InternalFulfillmentOrder[]) {
  const storage = getStorage();
  storage.setItem(KEY, JSON.stringify(all));
}

export function listIFOs(): InternalFulfillmentOrder[] {
  return readAll().sort((a, b) =>
    (b.updatedAtISO || "").localeCompare(a.updatedAtISO || ""),
  );
}

export function getIFO(ifoId: string): InternalFulfillmentOrder | null {
  return readAll().find((o) => o.ifoId === ifoId) ?? null;
}

export function upsertIFO(
  order: InternalFulfillmentOrder,
): InternalFulfillmentOrder {
  const all = readAll();
  const now = new Date().toISOString();
  const next: InternalFulfillmentOrder = {
    ...order,
    createdAtISO: order.createdAtISO || now,
    updatedAtISO: now,
  };

  const idx = all.findIndex((o) => o.ifoId === order.ifoId);
  if (idx >= 0) all[idx] = next;
  else all.push(next);

  writeAll(all);
  return next;
}

export function createDraftIFO(
  args: Omit<
    InternalFulfillmentOrder,
    "ifoId" | "createdAtISO" | "updatedAtISO" | "status"
  >,
): InternalFulfillmentOrder {
  const now = new Date().toISOString();
  const draft: InternalFulfillmentOrder = {
    ...args,
    ifoId: uid("ifo"),
    createdAtISO: now,
    updatedAtISO: now,
    status: "DRAFT",
  };
  return upsertIFO(draft);
}

export function listIFOsForRequestingLocation(
  locationId: string,
): InternalFulfillmentOrder[] {
  return listIFOs().filter((o) => o.requestingLocationId === locationId);
}

export function listIFOsForFulfillingLocation(
  locationId: string,
): InternalFulfillmentOrder[] {
  return listIFOs().filter((o) => o.fulfillingLocationId === locationId);
}
