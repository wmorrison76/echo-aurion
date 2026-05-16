/**
 * Genesis G — Inventory Store (Local v1)
 * Persists inventory state per location (items, ledger, health snapshots).
 */

import type {
  InventoryItemState,
  InventoryLedgerEntry,
  InventoryLocation,
  InventoryHealthSnapshot,
} from "@/../shared/types/inventory";

const LOC_KEY = "luccca:inventory_locations:v1";
const STATE_KEY = (locationId: string) =>
  `luccca:inventory_state:v1:${locationId}`;
const LEDGER_KEY = (locationId: string) =>
  `luccca:inventory_ledger:v1:${locationId}`;
const HEALTH_KEY = (locationId: string) =>
  `luccca:inventory_health:v1:${locationId}`;

/**
 * Safe JSON parse with fallback to null.
 */
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Generate a unique ID with prefix and timestamp.
 */
function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * ===== LOCATION CRUD =====
 */

export function listInventoryLocations(): InventoryLocation[] {
  return safeParse<InventoryLocation[]>(localStorage.getItem(LOC_KEY)) ?? [];
}

export function upsertInventoryLocation(loc: InventoryLocation): void {
  const all = listInventoryLocations();
  const idx = all.findIndex((l) => l.locationId === loc.locationId);
  if (idx >= 0) {
    all[idx] = loc;
  } else {
    all.push(loc);
  }
  localStorage.setItem(LOC_KEY, JSON.stringify(all));
}

export function initializeSampleLocations(): void {
  const existing = listInventoryLocations();
  if (existing.length > 0) return;

  const sample: InventoryLocation[] = [
    {
      locationId: "storeroom_main",
      locationName: "Storeroom",
      type: "STOREROOM",
      timezone: "America/New_York",
    },
    {
      locationId: "bqt_commissary",
      locationName: "Banquets Production",
      type: "COMMISSARY_BQT",
      timezone: "America/New_York",
    },
    {
      locationId: "pastry_commissary",
      locationName: "Pastry Commissary",
      type: "COMMISSARY_PASTRY",
      timezone: "America/New_York",
    },
    {
      locationId: "rest_0",
      locationName: "Restaurant 0",
      type: "OUTLET",
      timezone: "America/New_York",
    },
  ];

  localStorage.setItem(LOC_KEY, JSON.stringify(sample));
}

/**
 * ===== ITEM STATE CRUD =====
 */

export function getInventoryState(locationId: string): InventoryItemState[] {
  return (
    safeParse<InventoryItemState[]>(
      localStorage.getItem(STATE_KEY(locationId)),
    ) ?? []
  );
}

export function setInventoryState(
  locationId: string,
  items: InventoryItemState[],
): void {
  localStorage.setItem(STATE_KEY(locationId), JSON.stringify(items));
}

export function upsertInventoryItem(
  locationId: string,
  item: InventoryItemState,
): void {
  const all = getInventoryState(locationId);
  const idx = all.findIndex(
    (x) => x.ingredientName === item.ingredientName && x.unit === item.unit,
  );
  if (idx >= 0) {
    all[idx] = item;
  } else {
    all.push(item);
  }
  setInventoryState(locationId, all);
}

export function getInventoryItem(
  locationId: string,
  ingredientName: string,
  unit: string,
): InventoryItemState | null {
  const all = getInventoryState(locationId);
  return (
    all.find((x) => x.ingredientName === ingredientName && x.unit === unit) ??
    null
  );
}

/**
 * ===== LEDGER CRUD =====
 */

export function appendLedger(
  locationId: string,
  entry: Omit<InventoryLedgerEntry, "entryId" | "createdAtISO">,
): InventoryLedgerEntry {
  const all =
    safeParse<InventoryLedgerEntry[]>(
      localStorage.getItem(LEDGER_KEY(locationId)),
    ) ?? [];

  const full: InventoryLedgerEntry = {
    entryId: uid("inv_led"),
    createdAtISO: new Date().toISOString(),
    ...entry,
  };

  all.push(full);
  localStorage.setItem(LEDGER_KEY(locationId), JSON.stringify(all));
  return full;
}

export function listLedger(locationId: string): InventoryLedgerEntry[] {
  return (
    safeParse<InventoryLedgerEntry[]>(
      localStorage.getItem(LEDGER_KEY(locationId)),
    ) ?? []
  );
}

/**
 * ===== HEALTH SNAPSHOT CRUD =====
 */

export function getInventoryHealth(
  locationId: string,
): InventoryHealthSnapshot | null {
  return safeParse<InventoryHealthSnapshot>(
    localStorage.getItem(HEALTH_KEY(locationId)),
  );
}

export function setInventoryHealth(
  locationId: string,
  snap: InventoryHealthSnapshot,
): void {
  localStorage.setItem(HEALTH_KEY(locationId), JSON.stringify(snap));
}
