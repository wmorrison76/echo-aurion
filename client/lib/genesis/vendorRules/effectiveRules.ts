/**
 * Vendor Effective-Dating Utilities (Patch D)
 * Provides deterministic version ID generation and effective date rule application
 */

import type {
  VendorRuleChange,
  VendorScheduleRule,
  VendorRulesVersion,
} from "@/../shared/types/vendor-effective-dated";

function yyyy_mm_dd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function stableStringify(obj: any): string {
  // stable stringify for hashing (sort keys recursively)
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
 * Compute a stable, deterministic version ID for a set of vendor rules
 * as-of a specific date. Used for audit trails and journals.
 *
 * Format: "vrv_" + YYYYMMDD + "_" + hash prefix
 */
export function computeVersionId(
  vendors: VendorScheduleRule[],
  asOfDateISO: string,
): string {
  // lightweight deterministic id (not crypto-secure): "vrv_" + hash prefix
  const s = stableStringify({ asOfDateISO, vendors });
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return `vrv_${asOfDateISO.replaceAll("-", "")}_${hash.toString(16)}`;
}

/**
 * Apply effective-dated changes to a base set of vendor rules.
 * Returns a snapshot of rules as-of a given date, with all applicable
 * changes (effective on or before that date) applied cumulatively.
 *
 * @param baseVendors - The base/current vendor rules
 * @param changes - All pending/future changes
 * @param asOf - The date to resolve rules as-of (default: today)
 * @returns A VendorRulesVersion snapshot
 */
export function applyEffectiveChanges(
  baseVendors: VendorScheduleRule[],
  changes: VendorRuleChange[],
  asOf: Date = new Date(),
): VendorRulesVersion {
  const asOfDateISO = yyyy_mm_dd(asOf);

  // Filter changes effective on or before asOf date
  const applicable = changes
    .filter((c) => c.effectiveDateISO <= asOfDateISO)
    .sort(
      (a, b) =>
        a.effectiveDateISO.localeCompare(b.effectiveDateISO) ||
        a.createdAt.localeCompare(b.createdAt),
    );

  // Start with base vendors
  const byId = new Map<string, VendorScheduleRule>();
  baseVendors.forEach((v) => byId.set(v.vendorId, { ...v }));

  // Apply each change cumulatively
  for (const ch of applicable) {
    const v = byId.get(ch.vendorId);
    if (!v) continue;
    byId.set(ch.vendorId, { ...v, ...ch.patch, vendorId: v.vendorId });
  }

  // Sort vendors by name for deterministic ordering
  const vendors = Array.from(byId.values()).sort((a, b) =>
    a.vendorName.localeCompare(b.vendorName),
  );

  // Compute version ID
  const versionId = computeVersionId(vendors, asOfDateISO);

  return {
    versionId,
    asOfDateISO,
    vendors,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Create a new VendorRuleChange object
 */
export function createVendorRuleChange(
  vendorId: string,
  effectiveDateISO: string,
  patch: Partial<Omit<VendorScheduleRule, "vendorId">>,
  memo: string,
  createdBy?: string,
): VendorRuleChange {
  return {
    changeId: `change_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    vendorId,
    effectiveDateISO,
    patch,
    memo,
    createdAt: new Date().toISOString(),
    createdBy,
  };
}

/**
 * Calculate the effective vendor name for a vendor as-of a date
 * (returns the name from the effective version)
 */
export function getEffectiveVendorName(
  baseVendors: VendorScheduleRule[],
  changes: VendorRuleChange[],
  vendorId: string,
  asOf: Date = new Date(),
): string | null {
  const version = applyEffectiveChanges(baseVendors, changes, asOf);
  const vendor = version.vendors.find((v) => v.vendorId === vendorId);
  return vendor?.vendorName || null;
}

/**
 * Get all changes that will be effective within a date range
 */
export function getChangesInRange(
  changes: VendorRuleChange[],
  fromDateISO: string,
  toDateISO: string,
): VendorRuleChange[] {
  return changes.filter(
    (c) => c.effectiveDateISO >= fromDateISO && c.effectiveDateISO <= toDateISO,
  );
}

/**
 * Check if a change is already effective (effective date is today or earlier)
 */
export function isChangeEffective(
  change: VendorRuleChange,
  asOf: Date = new Date(),
): boolean {
  const asOfDateISO = yyyy_mm_dd(asOf);
  return change.effectiveDateISO <= asOfDateISO;
}

/**
 * Get pending changes (effective in the future)
 */
export function getPendingChanges(
  changes: VendorRuleChange[],
  asOf: Date = new Date(),
): VendorRuleChange[] {
  return changes.filter((c) => !isChangeEffective(c, asOf));
}
