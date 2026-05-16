import type { AdvisoryMessage } from "@/../shared/types/advisory";

/**
 * Advisory Store
 * Persists advisories to localStorage for both Sales and Ops workflows
 * Enables advisory history across page refreshes
 */

const KEY = "luccca:advisories";

function loadAll(): AdvisoryMessage[] {
  try {
    const stored = localStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load advisories from storage:", error);
    return [];
  }
}

function saveAll(advisories: AdvisoryMessage[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(advisories));
  } catch (error) {
    console.error("Failed to save advisories to storage:", error);
  }
}

/**
 * Get all advisories (newest first)
 */
export function listAdvisories(): AdvisoryMessage[] {
  return loadAll();
}

/**
 * Insert or update an advisory
 * Updates if advisoryId already exists, otherwise prepends to list
 */
export function upsertAdvisory(advisory: AdvisoryMessage): void {
  const all = loadAll();
  const existingIdx = all.findIndex(
    (a) => a.advisoryId === advisory.advisoryId,
  );

  if (existingIdx >= 0) {
    // Update existing
    all[existingIdx] = advisory;
  } else {
    // Prepend new (newest first)
    all.unshift(advisory);
  }

  saveAll(all);
}

/**
 * Get all advisories for a specific BEO (newest first)
 */
export function listAdvisoriesForBeo(beoId: string): AdvisoryMessage[] {
  return loadAll().filter((a) => a.beoId === beoId);
}

/**
 * Get a single advisory by ID
 */
export function getAdvisory(advisoryId: string): AdvisoryMessage | null {
  const all = loadAll();
  return all.find((a) => a.advisoryId === advisoryId) || null;
}

/**
 * Delete an advisory by ID
 */
export function deleteAdvisory(advisoryId: string): void {
  const all = loadAll();
  const filtered = all.filter((a) => a.advisoryId !== advisoryId);
  saveAll(filtered);
}

/**
 * Clear all advisories (use with caution)
 */
export function clearAdvisories(): void {
  try {
    localStorage.removeItem(KEY);
  } catch (error) {
    console.error("Failed to clear advisories:", error);
  }
}
