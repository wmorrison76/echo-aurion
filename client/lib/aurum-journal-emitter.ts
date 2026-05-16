/**
 * Genesis D — Aurum Journal Emitter
 * Converts an AttributionDecision into an AurumJournalEntry and emits it on OSBus.
 */

import type { AttributionDecision } from "@/../shared/types/attribution";
import type { AurumJournalEntry } from "@/../shared/types/aurum-journal";

import { osBus } from "@/lib/os-bus";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function emitAurumJournalFromDecision(args: {
  decision: AttributionDecision;
  sourceType: AurumJournalEntry["sourceType"];
  sourceId: string;
}): AurumJournalEntry {
  const { decision, sourceType, sourceId } = args;

  const lines: AurumJournalEntry["lines"] = [];

  if (decision.receivingCost > 0) {
    lines.push({
      locationId: decision.receivingLocationId,
      type: "COGS_DEBIT",
      amount: decision.receivingCost,
      memo: `COGS assigned to receiving location via Genesis D. (${decision.appliedRuleName ?? "default"})`,
    });
  }

  if (decision.producerCost > 0 && decision.producerLocationId) {
    lines.push({
      locationId: decision.producerLocationId,
      type: "COGS_DEBIT",
      amount: decision.producerCost,
      memo: `COGS assigned to producer location via Genesis D. (${decision.appliedRuleName ?? "default"})`,
    });
  }

  if (
    decision.creditProducer &&
    decision.producerLocationId &&
    decision.receivingCost > 0
  ) {
    lines.push({
      locationId: decision.producerLocationId,
      type: "INTERNAL_CREDIT",
      amount: decision.receivingCost,
      memo: `Internal credit to producer (commissary fulfillment).`,
    });
  }

  const entry: AurumJournalEntry = {
    entryId: uid("aurum_journal"),
    createdAtISO: new Date().toISOString(),
    sourceType,
    sourceId,
    note: `Genesis D attribution: ${decision.explanation}`,
    lines,
  };

  osBus.emit("aurum:journal_entry_created", entry);
  return entry;
}
