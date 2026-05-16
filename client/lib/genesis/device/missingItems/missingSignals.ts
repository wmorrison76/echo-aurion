/**
 * Missing-item signals (v1)
 * ------------------------
 * Safe heuristic; upgrade to POS + daily inventory later.
 * This will NOT block ordering.
 */
export type MissingSignal = { key: string; label: string; reason: string };

export function computeMissingItemsSignals(input: {
  queueRequests: any[];
  offsets: any[];
  lastPlan: any | null;
}): MissingSignal[] {
  const out: MissingSignal[] = [];
  if (input.queueRequests.length > 0 && !input.lastPlan) {
    out.push({
      key: "queue_unplanned",
      label: "Unplanned internal requests",
      reason: "Queue exists but AI procurement has not been run.",
    });
  }
  return out;
}
