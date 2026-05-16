/**
 * Genesis Cost Rules Store (Patch E Upgrade)
 * Persists cost attribution rules with effective-dating support
 * Storage key: luccca:genesis:cost_rules:v1
 *
 * Patch E adds:
 * - Effective-dated rule changes (schedule for future dates)
 * - Deterministic versioning (versionId tied to asOfDate + rules)
 * - Backward compatibility with existing API
 */

import type {
  CostRuleChange,
  CostRulesVersion,
} from "@/../shared/types/genesis-cost-rules";
import {
  applyEffectiveChanges,
  createCostRuleChange,
  getPendingChanges,
} from "@/lib/genesis/costRules/effectiveRules";
import { osBus } from "@/lib/os-bus";

const STORAGE_KEY = "luccca:genesis:cost_rules:v1";
const MAX_RULES = 5000;

export interface CostAttributionRule {
  ruleId: string;
  outletId: string;
  outletName: string;
  attributionMode: "SOURCE_PAYS" | "REQUESTING_OUTLET_PAYS" | "SPLIT";
  splitPercentage?: number; // Used when attributionMode === "SPLIT"
  isEnabled: boolean;
  priority: number; // Higher number = higher priority
  createdAt: string;
  updatedAt: string;
  note?: string;
}

interface CostRulesStoreData {
  rules: CostAttributionRule[];
  changes: CostRuleChange[];
  updatedAt: string;
}

/**
 * Generate sample cost rules for demo
 */
function generateSampleRules(): CostAttributionRule[] {
  return [
    {
      ruleId: "rule_commissary_001",
      outletId: "outlet_commissary_kitchen",
      outletName: "Kitchen Commissary",
      attributionMode: "SOURCE_PAYS",
      isEnabled: true,
      priority: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: "Commissary costs paid by source",
    },
    {
      ruleId: "rule_outlet_restaurant",
      outletId: "outlet_restaurant",
      outletName: "Restaurant",
      attributionMode: "REQUESTING_OUTLET_PAYS",
      isEnabled: true,
      priority: 90,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: "Restaurant outlet pays for its requests",
    },
    {
      ruleId: "rule_outlet_banquet",
      outletId: "outlet_banquet",
      outletName: "Banquets",
      attributionMode: "REQUESTING_OUTLET_PAYS",
      isEnabled: true,
      priority: 90,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: "Banquet outlet pays for its requests",
    },
    {
      ruleId: "rule_outlet_pastry",
      outletId: "outlet_pastry",
      outletName: "Pastry",
      attributionMode: "REQUESTING_OUTLET_PAYS",
      isEnabled: true,
      priority: 90,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: "Pastry outlet pays for its requests",
    },
    {
      ruleId: "rule_split_kitchen",
      outletId: "outlet_kitchen_temp",
      outletName: "Temporary Kitchen",
      attributionMode: "SPLIT",
      splitPercentage: 50,
      isEnabled: false,
      priority: 50,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: "Split cost example (disabled)",
    },
  ];
}

/**
 * Load all cost rules from storage
 */
function loadCostRulesData(): CostRulesStoreData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return {
        rules: generateSampleRules(),
        changes: [],
        updatedAt: new Date().toISOString(),
      };
    }
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      changes: parsed.changes || [],
    };
  } catch (e) {
    console.error("Failed to load cost rules data:", e);
    return {
      rules: generateSampleRules(),
      changes: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Save cost rules data to storage
 */
function saveCostRulesData(data: CostRulesStoreData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save cost rules data (quota exceeded?):", e);
    // Fallback: continue in memory
  }
}

/**
 * Get all cost rules
 */
export function getCostRules(): CostAttributionRule[] {
  const data = loadCostRulesData();
  return data.rules.sort((a, b) => b.priority - a.priority);
}

/**
 * Get rules for a specific outlet
 */
export function getRulesForOutlet(outletId: string): CostAttributionRule[] {
  const data = loadCostRulesData();
  return data.rules
    .filter((r) => r.outletId === outletId)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get a rule by ID
 */
export function getCostRuleById(ruleId: string): CostAttributionRule | null {
  const data = loadCostRulesData();
  return data.rules.find((r) => r.ruleId === ruleId) || null;
}

/**
 * Save or update a cost rule
 */
export function saveCostRule(rule: CostAttributionRule): void {
  const data = loadCostRulesData();

  // Check if rule exists
  const existingIndex = data.rules.findIndex((r) => r.ruleId === rule.ruleId);

  if (existingIndex >= 0) {
    // Update existing rule
    data.rules[existingIndex] = {
      ...rule,
      updatedAt: new Date().toISOString(),
    };
  } else {
    // Add new rule
    data.rules.push({
      ...rule,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Cap the rules
  if (data.rules.length > MAX_RULES) {
    // Keep the most recently updated rules
    data.rules = data.rules
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, MAX_RULES);
  }

  data.updatedAt = new Date().toISOString();
  saveCostRulesData(data);
}

/**
 * Delete a cost rule
 */
export function deleteCostRule(ruleId: string): void {
  const data = loadCostRulesData();
  data.rules = data.rules.filter((r) => r.ruleId !== ruleId);
  data.updatedAt = new Date().toISOString();
  saveCostRulesData(data);
}

/**
 * Toggle a rule's enabled state
 */
export function toggleCostRule(ruleId: string, enabled: boolean): void {
  const data = loadCostRulesData();

  const rule = data.rules.find((r) => r.ruleId === ruleId);
  if (rule) {
    rule.isEnabled = enabled;
    rule.updatedAt = new Date().toISOString();
    data.updatedAt = new Date().toISOString();
    saveCostRulesData(data);
  }
}

/**
 * Get all enabled rules sorted by priority
 */
export function getEnabledRules(): CostAttributionRule[] {
  return getCostRules().filter((r) => r.isEnabled);
}

/**
 * Get statistics about cost rules
 */
export function getCostRulesStats(): {
  total: number;
  enabled: number;
  byMode: {
    SOURCE_PAYS: number;
    REQUESTING_OUTLET_PAYS: number;
    SPLIT: number;
  };
} {
  const rules = getCostRules();
  return {
    total: rules.length,
    enabled: rules.filter((r) => r.isEnabled).length,
    byMode: {
      SOURCE_PAYS: rules.filter((r) => r.attributionMode === "SOURCE_PAYS")
        .length,
      REQUESTING_OUTLET_PAYS: rules.filter(
        (r) => r.attributionMode === "REQUESTING_OUTLET_PAYS",
      ).length,
      SPLIT: rules.filter((r) => r.attributionMode === "SPLIT").length,
    },
  };
}

/**
 * Clear all cost rules (reset to defaults)
 */
export function resetCostRules(): void {
  const data: CostRulesStoreData = {
    rules: generateSampleRules(),
    changes: [],
    updatedAt: new Date().toISOString(),
  };
  saveCostRulesData(data);
}

// ============================================================================
// PATCH E: NEW EFFECTIVE-DATING FUNCTIONS
// ============================================================================

/**
 * Get cost rules as-of a specific date, with all applicable changes applied
 * Returns a CostRulesVersion snapshot including versionId
 */
export function getVersion(asOf: Date = new Date()): CostRulesVersion {
  const data = loadCostRulesData();
  return applyEffectiveChanges(data.rules, data.changes, asOf);
}

/**
 * Schedule a cost rule change for a future effective date
 */
export function scheduleChange(
  outletId: string,
  effectiveDateISO: string,
  patch: any,
  memo: string,
  actor?: string,
): CostRuleChange {
  const data = loadCostRulesData();

  const change = createCostRuleChange(
    outletId,
    effectiveDateISO,
    patch,
    memo,
    actor,
  );

  const existingIndex = data.changes.findIndex(
    (c: CostRuleChange) =>
      c.outletId === outletId && c.effectiveDateISO === effectiveDateISO,
  );

  if (existingIndex >= 0) {
    data.changes[existingIndex] = change;
  } else {
    data.changes.push(change);
  }

  data.updatedAt = new Date().toISOString();
  saveCostRulesData(data);

  osBus.emit("genesis:cost_rule_change_scheduled", {
    changeId: change.changeId,
    outletId,
    effectiveDateISO,
    memo,
    actor,
    timestamp: new Date().toISOString(),
  });

  return change;
}

/**
 * Get all pending cost rule changes
 */
export function getPending(): CostRuleChange[] {
  const data = loadCostRulesData();
  return getPendingChanges(data.changes);
}

/**
 * Revert a pending change
 */
export function revertChange(changeId: string): void {
  const data = loadCostRulesData();
  data.changes = data.changes.filter(
    (c: CostRuleChange) => c.changeId !== changeId,
  );
  data.updatedAt = new Date().toISOString();
  saveCostRulesData(data);

  osBus.emit("genesis:cost_rule_change_reverted", {
    changeId,
    timestamp: new Date().toISOString(),
  });
}
