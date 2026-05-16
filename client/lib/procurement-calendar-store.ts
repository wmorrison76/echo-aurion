/**
 * Genesis F — Procurement Calendar Store (Local v1)
 * Persists the generated procurement calendar plans (vendor drops + assigned lines).
 */

import type { ProcurementCalendarPlan } from "@/../shared/types/procurement-calendar";

const KEY = "luccca:procurement_calendar_plans:v1";

/**
 * Read all procurement calendar plans from localStorage.
 */
function readAll(): ProcurementCalendarPlan[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProcurementCalendarPlan[];
  } catch (error) {
    console.error(
      "Failed to parse procurement calendar plans from localStorage:",
      error,
    );
    return [];
  }
}

/**
 * Write all procurement calendar plans to localStorage.
 */
function writeAll(plans: ProcurementCalendarPlan[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(plans));
  } catch (error) {
    console.error(
      "Failed to save procurement calendar plans to localStorage:",
      error,
    );
  }
}

/**
 * Insert or update a procurement calendar plan.
 * Returns the plan that was saved.
 */
export function upsertProcurementCalendarPlan(
  plan: ProcurementCalendarPlan,
): ProcurementCalendarPlan {
  const all = readAll();
  const idx = all.findIndex((p) => p.planId === plan.planId);

  if (idx >= 0) {
    all[idx] = plan;
  } else {
    all.push(plan);
  }

  writeAll(all);
  return plan;
}

/**
 * Get the most recent procurement calendar plan (by createdAtISO).
 * Returns null if no plans exist.
 */
export function getLatestProcurementCalendarPlan(): ProcurementCalendarPlan | null {
  const all = readAll();
  if (all.length === 0) return null;

  return (
    all.sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO))[0] ?? null
  );
}

/**
 * Get a specific procurement calendar plan by ID.
 * Returns null if not found.
 */
export function getProcurementCalendarPlan(
  planId: string,
): ProcurementCalendarPlan | null {
  const all = readAll();
  return all.find((p) => p.planId === planId) ?? null;
}

/**
 * List all procurement calendar plans (sorted newest first).
 */
export function listProcurementCalendarPlans(): ProcurementCalendarPlan[] {
  const all = readAll();
  return all.sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
}

/**
 * Delete a procurement calendar plan by ID.
 */
export function deleteProcurementCalendarPlan(planId: string): void {
  const all = readAll();
  const filtered = all.filter((p) => p.planId !== planId);
  writeAll(filtered);
}

/**
 * Clear all procurement calendar plans.
 */
export function clearAllProcurementCalendarPlans(): void {
  writeAll([]);
}
