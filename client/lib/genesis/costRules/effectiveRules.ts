/**
 * Cost Rule Effective-Dating Utilities (Patch E)
 * Mirrors vendor-effective-dated pattern for cost attribution rules
 */

import type {
  CostAttributionRule,
  CostRuleChange,
  CostRulesVersion,
} from "@/../shared/types/genesis-cost-rules";

function yyyy_mm_dd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function stableStringify(obj: any): string {
  const seen = new WeakSet();
  const sorter = (value: any): any => {
    if (value && typeof value === "object") {
      if (seen.has(value)) return value;
      seen.add(value);
      if (Array.isArray(value)) return value.map(sorter);
      return Object.keys(value)
        .sort()
        .reduce((acc: any, k) => {
          acc[k] = sorter(value[k]);
          return acc;
        }, {});
    }
    return value;
  };
  return JSON.stringify(sorter(obj));
}

/**
 * Compute a stable, deterministic version ID for cost rules as-of a date
 */
export function computeVersionId(
  rules: CostAttributionRule[],
  asOfDateISO: string,
): string {
  const s = stableStringify({ asOfDateISO, rules });
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return `crv_${asOfDateISO.replaceAll("-", "")}_${hash.toString(16)}`;
}

/**
 * Apply effective-dated changes to cost rules
 */
export function applyEffectiveChanges(
  baseRules: CostAttributionRule[],
  changes: CostRuleChange[],
  asOf: Date = new Date(),
): CostRulesVersion {
  const asOfDateISO = yyyy_mm_dd(asOf);

  const applicable = changes
    .filter((c) => c.effectiveDateISO <= asOfDateISO)
    .sort(
      (a, b) =>
        a.effectiveDateISO.localeCompare(b.effectiveDateISO) ||
        a.createdAt.localeCompare(b.createdAt),
    );

  const byId = new Map<string, CostAttributionRule>();
  baseRules.forEach((r) => byId.set(r.ruleId, { ...r }));

  for (const ch of applicable) {
    const r = byId.get(ch.ruleId || "");
    if (!r) continue;
    const updated = { ...r, ...ch.patch, outletId: r.outletId };
    byId.set(updated.ruleId || ch.ruleId, updated);
  }

  const rules = Array.from(byId.values()).sort((a, b) =>
    (a.outletName || "").localeCompare(b.outletName || ""),
  );

  const versionId = computeVersionId(rules, asOfDateISO);

  return {
    versionId,
    asOfDateISO,
    rules,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Create a new cost rule change
 */
export function createCostRuleChange(
  outletId: string,
  effectiveDateISO: string,
  patch: Partial<Omit<CostAttributionRule, "outletId">>,
  memo: string,
  createdBy?: string,
): CostRuleChange {
  return {
    changeId: `cost_change_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    outletId,
    effectiveDateISO,
    patch,
    memo,
    createdAt: new Date().toISOString(),
    createdBy,
  };
}

/**
 * Get pending changes (effective in future)
 */
export function getPendingChanges(
  changes: CostRuleChange[],
  asOf: Date = new Date(),
): CostRuleChange[] {
  const asOfDateISO = yyyy_mm_dd(asOf);
  return changes.filter((c) => c.effectiveDateISO > asOfDateISO);
}
