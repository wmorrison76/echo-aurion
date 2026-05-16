/**
 * Genesis Audit Store
 * localStorage-backed audit trail for all config + cost + rule changes
 * Used by Genesis D (Aurum) for journaling and reversal
 */

import type { GenesisEventBase } from "@/../shared/types/genesis-events";

export type AuditCategory =
  | "CONFIG"
  | "COST"
  | "RULE"
  | "OUTLET"
  | "COMMISSARY"
  | "OTHER";

/**
 * Individual audit entry
 */
export interface AuditEntry extends GenesisEventBase {
  auditId: string;
  category: AuditCategory;
  details: Record<string, any>;
  reversible: boolean; // can this change be reversed?
  reversalId?: string; // if reversed, which audit entry reversed this?
}

const KEY_AUDIT = "luccca:genesis:audit:v1";
const MAX_ENTRIES = 5000; // cap to prevent storage bloat

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
 * Load all audit entries
 */
function loadAuditEntries(): AuditEntry[] {
  return safeParse(getStorage().getItem(KEY_AUDIT), []);
}

/**
 * Save all audit entries
 */
function saveAuditEntries(entries: AuditEntry[]): void {
  try {
    const storage = getStorage();
    // Cap to prevent storage bloat
    const capped = entries.slice(-MAX_ENTRIES);
    storage.setItem(KEY_AUDIT, JSON.stringify(capped));
  } catch (err) {
    console.error("[GenesisAuditStore] saveAuditEntries error:", err);
  }
}

/**
 * Append a single audit entry
 */
export function appendAuditEntry(entry: AuditEntry): void {
  try {
    const entries = loadAuditEntries();
    entries.push(entry);
    saveAuditEntries(entries);
  } catch (err) {
    console.error("[GenesisAuditStore] appendAuditEntry error:", err);
  }
}

/**
 * Get all audit entries
 */
export function listAuditEntries(): AuditEntry[] {
  return loadAuditEntries().sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

/**
 * Get audit entries by category
 */
export function listAuditByCategory(category: AuditCategory): AuditEntry[] {
  return loadAuditEntries().filter((e) => e.category === category);
}

/**
 * Get audit entries for a specific outlet
 */
export function listAuditByOutlet(outletId: string): AuditEntry[] {
  return loadAuditEntries().filter((e) => e.outletScope.includes(outletId));
}

/**
 * Get audit entries by actor (userId)
 */
export function listAuditByActor(userId: string): AuditEntry[] {
  return loadAuditEntries().filter((e) => e.actor.userId === userId);
}

/**
 * Get audit entries within a date range
 */
export function listAuditInRange(
  startISO: string,
  endISO: string,
): AuditEntry[] {
  return loadAuditEntries().filter(
    (e) => e.timestamp >= startISO && e.timestamp <= endISO,
  );
}

/**
 * Get a specific audit entry by ID
 */
export function getAuditEntryById(auditId: string): AuditEntry | null {
  return loadAuditEntries().find((e) => e.auditId === auditId) ?? null;
}

/**
 * Mark an audit entry as reversed
 */
export function markAuditReversed(auditId: string, reversalId: string): void {
  try {
    const entries = loadAuditEntries();
    const entry = entries.find((e) => e.auditId === auditId);
    if (entry) {
      entry.reversalId = reversalId;
      saveAuditEntries(entries);
    }
  } catch (err) {
    console.error("[GenesisAuditStore] markAuditReversed error:", err);
  }
}

/**
 * Get reversible entries (for undo/rollback)
 */
export function listReversibleEntries(): AuditEntry[] {
  return loadAuditEntries().filter((e) => e.reversible && !e.reversalId);
}

/**
 * Get entries related to cost changes
 */
export function listCostChangeEntries(): AuditEntry[] {
  return loadAuditEntries().filter((e) =>
    ["COST", "RULE"].includes(e.category),
  );
}

/**
 * Get entries related to config changes
 */
export function listConfigChangeEntries(): AuditEntry[] {
  return loadAuditEntries().filter((e) =>
    ["CONFIG", "OUTLET", "COMMISSARY"].includes(e.category),
  );
}

/**
 * Export audit trail as CSV (for reporting)
 */
export function exportAuditAsCSV(): string {
  const entries = listAuditEntries();
  const headers = [
    "Timestamp",
    "Category",
    "Actor",
    "Outlets",
    "Summary",
    "Reversible",
  ];
  const rows = entries.map((e) => [
    e.timestamp,
    e.category,
    e.actor.userId ?? e.actor.system ?? "unknown",
    e.outletScope.join(";"),
    e.explain,
    e.reversible ? "Yes" : "No",
  ]);

  const csv = [
    headers.join(","),
    ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
  ].join("\n");

  return csv;
}

/**
 * Get audit summary (counts by category)
 */
export function getAuditSummary(): Record<AuditCategory, number> {
  const entries = loadAuditEntries();
  const summary: Record<AuditCategory, number> = {
    CONFIG: 0,
    COST: 0,
    RULE: 0,
    OUTLET: 0,
    COMMISSARY: 0,
    OTHER: 0,
  };

  for (const entry of entries) {
    summary[entry.category]++;
  }

  return summary;
}

/**
 * Archive old audit entries (cleanup)
 * Keep only entries newer than cutoffDays
 */
export function archiveOldEntries(cutoffDays: number): number {
  try {
    const cutoffTime = new Date().getTime() - cutoffDays * 24 * 60 * 60 * 1000;
    const entries = loadAuditEntries();
    const kept = entries.filter(
      (e) => new Date(e.timestamp).getTime() > cutoffTime,
    );
    const archived = entries.length - kept.length;

    if (archived > 0) {
      saveAuditEntries(kept);
    }

    return archived;
  } catch (err) {
    console.error("[GenesisAuditStore] archiveOldEntries error:", err);
    return 0;
  }
}

/**
 * Clear all audit entries (dangerous — use with caution)
 */
export function clearAllAudit(): void {
  try {
    const storage = getStorage();
    storage.setItem(KEY_AUDIT, JSON.stringify([]));
  } catch (err) {
    console.error("[GenesisAuditStore] clearAllAudit error:", err);
  }
}

/**
 * Get total audit entry count
 */
export function getAuditCount(): number {
  return loadAuditEntries().length;
}

/**
 * Create a summary of recent changes (for UI display)
 */
export function getRecentChanges(limitDays: number = 7): AuditEntry[] {
  const cutoffTime = new Date().getTime() - limitDays * 24 * 60 * 60 * 1000;
  return loadAuditEntries()
    .filter((e) => new Date(e.timestamp).getTime() > cutoffTime)
    .slice(0, 50); // top 50 recent
}
