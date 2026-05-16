/**
 * LUCCCA Genesis E — IFO → Genesis D (Aurum) Bridge
 * Cost attribution for internal transfers.
 *
 * Responsibilities:
 * - Build journal payload from IFO cost decision
 * - Emit aurum:journal_entry_created event (Genesis D listens)
 * - v1: Default rule is RECEIVING_PAYS (outlet pays commissary)
 * - Finance admin can override via Genesis D panel
 *
 * Flow:
 * 1. IFO status = DELIVERED
 * 2. GenesisEPanel calls buildIFOJournalPayload(ifo)
 * 3. Emits aurum:journal_entry_created → Genesis D posts journal entries
 */

import type {
  InternalFulfillmentOrder,
  IFOAttributionDecision,
} from "@/shared/types/ifo";

/**
 * Journal entry payload emitted to OSBus
 * Consumed by Genesis D (aurum journal listener)
 */
export type AurumIFOJournalPayload = {
  ifoId: string;
  debitLocationId: string; // where cost lands (receiving outlet)
  creditLocationId?: string; // where credit lands (producing commissary)
  memo: string; // human-readable description
  totalEstimatedCost?: number; // v1: optional, can be computed by Genesis D
  createdAt: number; // epoch ms
};

/**
 * Determine default cost attribution (deterministic)
 * v1 Rule: Receiving location (requester) always pays
 * Override via Genesis D panel if needed
 */
export function getDefaultAttributionDecision(
  ifo: InternalFulfillmentOrder,
): IFOAttributionDecision {
  return {
    mode: "RECEIVING_PAYS",
    debitLocationId: ifo.requestingLocationId,
    creditLocationId: ifo.fulfillingLocationId,
    reasonCode: "DEFAULT_RULE",
    note: "Genesis E v1 default: receiving location (outlet) pays",
    decidedAt: Date.now(),
  };
}

/**
 * Build journal payload from IFO
 * Returns null if IFO cannot be journalized (missing fulfilling location)
 */
export function buildIFOJournalPayload(
  ifo: InternalFulfillmentOrder,
): AurumIFOJournalPayload | null {
  // Use existing attribution decision or compute default
  const attribution = ifo.attribution ?? getDefaultAttributionDecision(ifo);

  if (!attribution.debitLocationId) {
    return null;
  }

  return {
    ifoId: ifo.ifoId,
    debitLocationId: attribution.debitLocationId,
    creditLocationId: attribution.creditLocationId,
    memo:
      attribution.note ?? buildDefaultMemo(ifo, attribution.creditLocationId),
    createdAt: Date.now(),
  };
}

/**
 * Build human-readable memo for journal entry
 */
function buildDefaultMemo(
  ifo: InternalFulfillmentOrder,
  creditLocation?: string,
): string {
  const items = ifo.items
    .map((i) => `${i.quantity}${i.uom} ${i.name}`)
    .join(", ");

  const creditPart = creditLocation ? ` credited to ${creditLocation}` : "";

  return (
    `IFO fulfillment: ${ifo.requestingLocationId} requested ` +
    `(${items}) from ${ifo.fulfillingLocationId ?? "unassigned"}${creditPart}`
  );
}
