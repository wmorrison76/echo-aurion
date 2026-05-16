/**
 * Genesis G — Surplus Store
 * Tracks extra product that can be claimed by outlets for REOs/specials.
 */

import type { SurplusAvailability } from "@/../shared/types/inventory";

const KEY = "luccca:surplus:v1";

/**
 * Read all surplus records from localStorage.
 */
function readAll(): SurplusAvailability[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SurplusAvailability[];
  } catch {
    return [];
  }
}

/**
 * Write all surplus records to localStorage.
 */
function writeAll(all: SurplusAvailability[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (error) {
    console.error("Failed to save surplus to localStorage:", error);
  }
}

/**
 * Generate a unique ID with prefix and timestamp.
 */
function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * List all surplus items (sorted newest first).
 */
export function listSurplus(): SurplusAvailability[] {
  const all = readAll();
  return all.sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
}

/**
 * Create a new surplus availability record.
 * Auto-generates surplusId and createdAtISO.
 */
export function createSurplus(
  input: Omit<SurplusAvailability, "surplusId" | "createdAtISO">,
): SurplusAvailability {
  const all = readAll();

  const full: SurplusAvailability = {
    surplusId: uid("surplus"),
    createdAtISO: new Date().toISOString(),
    ...input,
  };

  all.push(full);
  writeAll(all);
  return full;
}

/**
 * Get a specific surplus record by ID.
 */
export function getSurplus(surplusId: string): SurplusAvailability | null {
  const all = readAll();
  return all.find((s) => s.surplusId === surplusId) ?? null;
}

/**
 * Claim a portion of surplus (reduces availableQty).
 * Returns the updated surplus record, or null if not found.
 */
export function claimSurplus(
  surplusId: string,
  qtyToClaim: number,
): SurplusAvailability | null {
  const all = readAll();
  const idx = all.findIndex((s) => s.surplusId === surplusId);

  if (idx < 0) return null;

  const surplus = all[idx];
  const remaining = Math.max(0, surplus.availableQty - qtyToClaim);

  all[idx] = { ...surplus, availableQty: remaining };
  writeAll(all);

  return all[idx];
}

/**
 * Delete a surplus record by ID.
 */
export function deleteSurplus(surplusId: string): void {
  const all = readAll();
  const filtered = all.filter((s) => s.surplusId !== surplusId);
  writeAll(filtered);
}

/**
 * Clear all surplus records.
 */
export function clearAllSurplus(): void {
  writeAll([]);
}
