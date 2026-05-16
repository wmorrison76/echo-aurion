/**
 * Genesis Config Store
 * localStorage-backed persistence for GenesisConfig
 * Handles load, save, update, and policy revisions
 */

import type {
  GenesisConfig,
  PolicyRevision,
  RoleConfig,
} from "@/../shared/types/genesis-config";
import { createDefaultGenesisConfig } from "@/../shared/types/genesis-config";

const KEY_CONFIG = "luccca:genesis:config:v2";
const KEY_REVISIONS = "luccca:genesis:revisions:v2";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const memoryStore = new Map<string, string>();

/**
 * Get storage (localStorage or fallback to memory)
 */
function getStorage(): StorageLike {
  if (typeof window === "undefined") {
    return {
      getItem: (k) => memoryStore.get(k) ?? null,
      setItem: (k, v) => memoryStore.set(k, v),
    };
  }

  try {
    if (typeof localStorage !== "undefined") {
      return localStorage;
    }
  } catch {
    // ignore
  }

  return {
    getItem: (k) => memoryStore.get(k) ?? null,
    setItem: (k, v) => memoryStore.set(k, v),
  };
}

/**
 * Safe JSON parse with fallback
 */
function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Get current GenesisConfig
 * Returns default config if none exists
 */
export function getGenesisConfig(): GenesisConfig {
  const storage = getStorage();
  const raw = storage.getItem(KEY_CONFIG);

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as GenesisConfig;
      if (parsed && parsed.version === 2) {
        return parsed;
      }
    } catch {
      // fall through to default
    }
  }

  // Return new default
  return createDefaultGenesisConfig(`prop_${Date.now()}`, "New Property");
}

/**
 * Save complete GenesisConfig
 */
export function saveGenesisConfig(config: GenesisConfig): void {
  try {
    const storage = getStorage();
    const updated: GenesisConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    storage.setItem(KEY_CONFIG, JSON.stringify(updated));
  } catch (err) {
    console.error("[GenesisConfigStore] saveGenesisConfig error:", err);
  }
}

/**
 * Update partial config (merge with existing)
 */
export function updateGenesisConfig(
  patch: Partial<GenesisConfig>,
): GenesisConfig {
  try {
    const current = getGenesisConfig();
    const updated: GenesisConfig = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    saveGenesisConfig(updated);
    return updated;
  } catch (err) {
    console.error("[GenesisConfigStore] updateGenesisConfig error:", err);
    return getGenesisConfig();
  }
}

/**
 * Append a policy revision
 */
export function appendPolicyRevision(revision: PolicyRevision): void {
  try {
    const current = getGenesisConfig();
    const updated: GenesisConfig = {
      ...current,
      policyRevisions: [...current.policyRevisions, revision],
      updatedAt: new Date().toISOString(),
    };
    saveGenesisConfig(updated);
  } catch (err) {
    console.error("[GenesisConfigStore] appendPolicyRevision error:", err);
  }
}

/**
 * Get all policy revisions
 */
export function getPolicyRevisions(): PolicyRevision[] {
  const config = getGenesisConfig();
  return config.policyRevisions ?? [];
}

/**
 * Get a specific policy revision by ID
 */
export function getPolicyRevision(revisionId: string): PolicyRevision | null {
  const revisions = getPolicyRevisions();
  return revisions.find((r) => r.revisionId === revisionId) ?? null;
}

/**
 * Get policy revisions that affect a specific outlet
 */
export function getPolicyRevisionsForOutlet(
  outletId: string,
): PolicyRevision[] {
  return getPolicyRevisions().filter((rev) =>
    rev.changes.some((change) => change.impactedOutlets.includes(outletId)),
  );
}

/**
 * Get policy revisions after a specific date
 */
export function getPolicyRevisionsAfter(dateISO: string): PolicyRevision[] {
  return getPolicyRevisions().filter((rev) => rev.effectiveDate >= dateISO);
}

/**
 * Clear all config (reset to default)
 */
export function resetGenesisConfig(): void {
  try {
    const storage = getStorage();
    storage.setItem(
      KEY_CONFIG,
      JSON.stringify(
        createDefaultGenesisConfig(`prop_${Date.now()}`, "New Property"),
      ),
    );
  } catch (err) {
    console.error("[GenesisConfigStore] resetGenesisConfig error:", err);
  }
}

/**
 * Export config as JSON (for backup/sharing)
 */
export function exportGenesisConfig(): string {
  const config = getGenesisConfig();
  return JSON.stringify(config, null, 2);
}

/**
 * Import config from JSON
 */
export function importGenesisConfig(jsonString: string): GenesisConfig | null {
  try {
    const imported = JSON.parse(jsonString) as GenesisConfig;
    if (imported && imported.version === 2) {
      saveGenesisConfig(imported);
      return imported;
    }
  } catch (err) {
    console.error("[GenesisConfigStore] importGenesisConfig error:", err);
  }
  return null;
}

/**
 * Get a specific role by ID
 */
export function getRoleById(roleId: string): RoleConfig | null {
  const config = getGenesisConfig();
  return config.roles.find((r) => r.id === roleId) ?? null;
}

/**
 * Update a role
 */
export function updateRole(role: RoleConfig): void {
  try {
    const current = getGenesisConfig();
    const updated: GenesisConfig = {
      ...current,
      roles: current.roles.map((r) => (r.id === role.id ? role : r)),
      updatedAt: new Date().toISOString(),
    };
    saveGenesisConfig(updated);
  } catch (err) {
    console.error("[GenesisConfigStore] updateRole error:", err);
  }
}

/**
 * Add a new role
 */
export function addRole(role: RoleConfig): void {
  try {
    const current = getGenesisConfig();
    const existing = current.roles.find((r) => r.id === role.id);
    if (existing) {
      console.warn(`[GenesisConfigStore] Role ${role.id} already exists`);
      return;
    }
    const updated: GenesisConfig = {
      ...current,
      roles: [...current.roles, role],
      updatedAt: new Date().toISOString(),
    };
    saveGenesisConfig(updated);
  } catch (err) {
    console.error("[GenesisConfigStore] addRole error:", err);
  }
}

/**
 * Get outlets affected by a change to cost attribution
 */
export function getAffectedOutletsByCostChange(
  fromMode: string,
  toMode: string,
): string[] {
  const config = getGenesisConfig();
  // All outlets that have orders/transfers are affected
  return config.outlets.map((o) => o.id);
}

/**
 * Check if config is valid (has required sections)
 */
export function isConfigValid(): boolean {
  const config = getGenesisConfig();
  return (
    config.propertyId &&
    config.propertyName &&
    config.outlets.length > 0 &&
    config.commissaries.length > 0 &&
    config.receiving.locations.length > 0
  );
}

/**
 * Get config completion percentage (0-100)
 */
export function getConfigCompletion(): number {
  const config = getGenesisConfig();
  let completed = 0;
  let total = 7; // 7 onboarding sections

  if (config.propertyName) completed++;
  if (config.outlets.length > 0) completed++;
  if (config.commissaries.length > 0) completed++;
  if (config.receiving.locations.length > 0) completed++;
  if (config.costAttribution.default) completed++;
  if (config.roles.length > 0) completed++;
  if (config.auditPolicy) completed++;

  return Math.round((completed / total) * 100);
}
