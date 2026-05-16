import type { GroupIntelligenceSnapshot } from "@/../shared/types/group-intelligence";

/**
 * Group Intelligence Snapshot Store
 * Persists group intelligence snapshots to localStorage for later retrieval
 * Enables group-level operational dashboards to persist across page refreshes
 */

const KEY = "luccca:groupIntelligence";

function loadAll(): GroupIntelligenceSnapshot[] {
  try {
    const stored = localStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load group intelligence snapshots:", error);
    return [];
  }
}

function saveAll(snapshots: GroupIntelligenceSnapshot[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshots));
  } catch (error) {
    console.error("Failed to save group intelligence snapshots:", error);
  }
}

/**
 * Get all group intelligence snapshots (newest first)
 */
export function listGroupSnapshots(): GroupIntelligenceSnapshot[] {
  return loadAll();
}

/**
 * Insert or update a group intelligence snapshot
 * Updates if groupId already exists, otherwise prepends to list
 */
export function upsertGroupSnapshot(snapshot: GroupIntelligenceSnapshot): void {
  const all = loadAll();
  const existingIdx = all.findIndex((s) => s.groupId === snapshot.groupId);

  if (existingIdx >= 0) {
    // Update existing
    all[existingIdx] = snapshot;
  } else {
    // Prepend new (newest first)
    all.unshift(snapshot);
  }

  saveAll(all);
}

/**
 * Get a single group intelligence snapshot by groupId
 */
export function getGroupSnapshot(
  groupId: string,
): GroupIntelligenceSnapshot | null {
  const all = loadAll();
  return all.find((s) => s.groupId === groupId) || null;
}

/**
 * Delete a group intelligence snapshot by groupId
 */
export function deleteGroupSnapshot(groupId: string): void {
  const all = loadAll();
  const filtered = all.filter((s) => s.groupId !== groupId);
  saveAll(filtered);
}

/**
 * Clear all group intelligence snapshots (use with caution)
 */
export function clearGroupSnapshots(): void {
  try {
    localStorage.removeItem(KEY);
  } catch (error) {
    console.error("Failed to clear group intelligence snapshots:", error);
  }
}
