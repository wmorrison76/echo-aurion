/**
 * Genesis D — Procurement -> Aurum Bridge
 * Takes a procurement plan and creates journal entries per vendor order / drop.
 */

import type { ProcurementPlan } from "@/../shared/types/procurement";

import { decideAttribution } from "@/lib/attribution-engine";
import { emitAurumJournalFromDecision } from "@/lib/aurum-journal-emitter";

export function postProcurementPlanToAurum(args: {
  plan: ProcurementPlan;
  receivingLocationId: string;
  producerLocationId?: string | null;
}): void {
  const { plan } = args;

  for (const order of plan.orders) {
    const totalCost = Number(order.totalCost ?? 0);

    const decision = decideAttribution({
      flowType: "VENDOR_PURCHASE",
      totalCost,
      receivingLocationId: args.receivingLocationId,
      producerLocationId: args.producerLocationId ?? null,
      vendorId: order.vendorId,
    });

    emitAurumJournalFromDecision({
      decision,
      sourceType: "PROCUREMENT_PLAN",
      sourceId: plan.planId,
    });
  }
}
