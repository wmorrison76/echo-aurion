/**
 * Genesis E — Internal Fulfillment Engine
 * Orchestrates IFO lifecycle: submit -> approve -> pick -> deliver -> receive
 * Emits:
 * - fulfillment:ifo_updated
 * - inventory:move_created (when delivered/received)
 * - aurum:journal_entry_created (posting cost/credit)
 */

import type { InternalFulfillmentOrder } from "@/../shared/types/internal-fulfillment";
import type { InventoryMove } from "@/../shared/types/inventory-move";

import { osBus } from "@/lib/os-bus";
import { upsertIFO, getIFO } from "@/lib/internal-fulfillment-store";
import { decideAttribution } from "@/lib/attribution-engine";
import { emitAurumJournalFromDecision } from "@/lib/aurum-journal-emitter";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function setIFOStatus(
  ifoId: string,
  status: InternalFulfillmentOrder["status"],
): InternalFulfillmentOrder | null {
  const current = getIFO(ifoId);
  if (!current) return null;

  const next = upsertIFO({ ...current, status });
  osBus.emit("fulfillment:ifo_updated", next);
  return next;
}

export function deliverIFO(
  ifoId: string,
): { delivered: InternalFulfillmentOrder; move: InventoryMove } | null {
  const current = getIFO(ifoId);
  if (!current) return null;

  const delivered = upsertIFO({ ...current, status: "DELIVERED" });
  osBus.emit("fulfillment:ifo_updated", delivered);

  const move: InventoryMove = {
    moveId: uid("move"),
    createdAtISO: new Date().toISOString(),
    fromLocationId: delivered.fulfillingLocationId,
    toLocationId: delivered.requestingLocationId,
    reason: "INTERNAL_FULFILLMENT",
    sourceId: delivered.ifoId,
    lines: delivered.lines.map((l) => ({
      itemName: l.itemName,
      unit: l.unit,
      quantity: l.quantity,
      category: l.category ?? null,
    })),
    note: `IFO delivered: ${delivered.ifoId} (${delivered.sourceType})`,
  };

  osBus.emit("inventory:move_created", move);

  return { delivered, move };
}

export function receiveIFO(ifoId: string): {
  received: InternalFulfillmentOrder;
  entryId: string;
} | null {
  const current = getIFO(ifoId);
  if (!current) return null;

  const received = upsertIFO({ ...current, status: "RECEIVED" });
  osBus.emit("fulfillment:ifo_updated", received);

  const estimatedTotalCost = received.lines.reduce(
    (sum, l) => sum + Number(l.quantity) * 1,
    0,
  );

  const decision = decideAttribution({
    flowType: "INTERNAL_FULFILLMENT",
    totalCost: estimatedTotalCost,
    receivingLocationId: received.requestingLocationId,
    producerLocationId: received.fulfillingLocationId,
    vendorId: null,
  });

  const entry = emitAurumJournalFromDecision({
    decision,
    sourceType: "INTERNAL_FULFILLMENT",
    sourceId: received.ifoId,
  });

  return { received, entryId: entry.entryId };
}
