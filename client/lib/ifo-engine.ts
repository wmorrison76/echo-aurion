/**
 * LUCCCA Genesis E — IFO Engine
 * Deterministic business logic (no LLM, no randomness).
 *
 * Responsibilities:
 * - Risk scoring: flags + severity
 * - Location suggestion: heuristic-based fulfillment location
 * - Audit-trail friendly: all decisions are transparent + repeatable
 */

import type { InternalFulfillmentOrder, IFOSeverity } from "@/shared/types/ifo";

/**
 * Compute hours until due date
 */
function hoursUntil(dueAt: number, now = Date.now()): number {
  return (dueAt - now) / (60 * 60 * 1000);
}

/**
 * Deterministic risk computation
 * Returns risk object with flags + severity for audit/UI display
 */
export function computeIFORisk(
  ifo: InternalFulfillmentOrder,
): InternalFulfillmentOrder["risk"] {
  const flags: string[] = [];
  const h = hoursUntil(ifo.dueAt);

  // Time-based flags
  if (h < 0) {
    flags.push("OVERDUE");
  } else if (h <= 24) {
    flags.push("DUE_SOON");
  } else if (h <= 72) {
    flags.push("DUE_72H");
  }

  // Lead time risk: if any item's leadTimeHours > hours remaining
  const leadTimeMax = Math.max(
    0,
    ...(ifo.items.map((i) => i.leadTimeHours ?? 0) || [0]),
  );
  if (leadTimeMax > 0 && leadTimeMax > h) {
    flags.push("LEADTIME_RISK");
  }

  // Determine severity (critical > warning > info)
  let severity: IFOSeverity = "info";
  if (flags.includes("OVERDUE")) {
    severity = "critical";
  } else if (flags.includes("LEADTIME_RISK") || flags.includes("DUE_SOON")) {
    severity = "warning";
  }

  return { severity, flags };
}

/**
 * Suggest fulfillment location based on item types + names
 * v1 Heuristic: replace later with Genesis J ML model
 *
 * Rules:
 * - If all items are INGREDIENT => storeroom
 * - If pastry-like keywords in item names => pastry-commissary
 * - Default => banquets-commissary
 */
export function suggestFulfillingLocationId(
  ifo: InternalFulfillmentOrder,
): string {
  const names = ifo.items.map((i) => i.name.toLowerCase()).join(" ");

  // Pastry keywords (heuristic, expandable)
  const pastryHints = [
    "cake",
    "cheesecake",
    "tart",
    "bread",
    "croissant",
    "danish",
    "dessert",
    "pastry",
    "chocolate",
    "torte",
    "mousse",
  ];
  const isPastry = pastryHints.some((h) => names.includes(h));

  // If no PREP/RECIPE/FINISHED_GOOD, it's ingredients only => storeroom
  const hasNonIngredient = ifo.items.some((i) => i.type !== "INGREDIENT");
  if (!hasNonIngredient) {
    return "storeroom";
  }

  // If pastry-like, send to pastry commissary
  if (isPastry) {
    return "pastry-commissary";
  }

  // Default: banquets commissary for prep/finished goods
  return "banquets-commissary";
}

/**
 * Recompute IFO with engine rules (idempotent)
 * Applies risk scoring + location suggestion
 * Returns updated IFO ready for storage
 */
export function recomputeIFO(
  ifo: InternalFulfillmentOrder,
): InternalFulfillmentOrder {
  const risk = computeIFORisk(ifo);

  // Only suggest location if not yet set
  const fulfillingLocationId =
    ifo.fulfillingLocationId ?? suggestFulfillingLocationId(ifo);

  return {
    ...ifo,
    fulfillingLocationId,
    risk,
  };
}
