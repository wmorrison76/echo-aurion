/**
 * Genesis D — Attribution Engine (Deterministic)
 * Finds the best matching enabled rule by priority and applies it to a transaction.
 */

import type {
  AttributionDecision,
  AttributionScope,
  CostFlowType,
} from "@/../shared/types/attribution";

import {
  initializeGenesisDRules,
  listAttributionRules,
} from "@/lib/attribution-store";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function matches(scope: AttributionScope, tx: AttributionScope): boolean {
  const keys = Object.keys(scope) as (keyof AttributionScope)[];
  for (const k of keys) {
    const expected = scope[k];
    if (expected === null || expected === undefined) continue;
    const actual = tx[k];
    if (String(expected) !== String(actual)) return false;
  }
  return true;
}

export function decideAttribution(args: {
  flowType: CostFlowType;
  totalCost: number;

  receivingLocationId: string;
  producerLocationId?: string | null;

  vendorId?: string | null;
  ingredientId?: string | null;
  category?: string | null;
}): AttributionDecision {
  initializeGenesisDRules();
  const rules = listAttributionRules().filter((r) => r.enabled);

  const txScope: AttributionScope = {
    flowType: args.flowType,
    receivingLocationId: args.receivingLocationId,
    producerLocationId: args.producerLocationId ?? null,
    vendorId: args.vendorId ?? null,
    ingredientId: args.ingredientId ?? null,
    category: args.category ?? null,
  };

  let applied = null;

  for (const r of rules) {
    if (matches(r.scope ?? {}, txScope)) {
      applied = r;
      break;
    }
  }

  const total = Math.max(0, Number(args.totalCost || 0));

  const mode = applied?.mode ?? "RECEIVING_PAYS";
  const creditProducer = Boolean(applied?.creditProducer ?? false);

  let receivingCost = 0;
  let producerCost = 0;

  if (mode === "RECEIVING_PAYS") {
    receivingCost = total;
    producerCost = 0;
  } else if (mode === "PRODUCER_PAYS") {
    receivingCost = 0;
    producerCost = total;
  } else if (mode === "SPLIT") {
    const split = applied?.split;
    if (split?.type === "PERCENT") {
      receivingCost = (total * (split.receivingShare ?? 0)) / 100;
      producerCost = (total * (split.producerShare ?? 0)) / 100;
    } else if (split?.type === "FIXED") {
      receivingCost = Math.min(total, Math.max(0, split.receivingShare ?? 0));
      producerCost = Math.min(
        total - receivingCost,
        Math.max(0, split.producerShare ?? 0),
      );
    } else {
      receivingCost = total;
      producerCost = 0;
    }
  } else {
    receivingCost = total;
    producerCost = 0;
  }

  const explanation = applied
    ? `Applied rule "${applied.name}" (mode=${mode}, creditProducer=${creditProducer}). ${applied.note ?? ""}`.trim()
    : `No matching rule found. Defaulting to RECEIVING_PAYS.`;

  return {
    decisionId: uid("decision"),
    decidedAtISO: new Date().toISOString(),
    appliedRuleId: applied?.ruleId ?? null,
    appliedRuleName: applied?.name ?? null,
    mode,
    creditProducer,
    receivingLocationId: args.receivingLocationId,
    producerLocationId: args.producerLocationId ?? null,
    totalCost: total,
    receivingCost,
    producerCost,
    scope: txScope,
    explanation,
  };
}
