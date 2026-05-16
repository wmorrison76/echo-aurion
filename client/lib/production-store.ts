import type { ProductionSheet } from "@/../shared/types/production";

/**
 * Production Sheet Store
 * Persists production sheets to localStorage for later retrieval
 * Used by group intelligence and other modules that need production data
 */

const KEY = "luccca:productionSheets";

function loadAll(): ProductionSheet[] {
  try {
    const stored = localStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Failed to load production sheets from storage:", error);
    return [];
  }
}

function saveAll(sheets: ProductionSheet[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sheets));
  } catch (error) {
    console.error("Failed to save production sheets to storage:", error);
  }
}

/**
 * Get all production sheets
 */
export function listProductionSheets(): ProductionSheet[] {
  return loadAll();
}

/**
 * Insert or update production sheets (upsert by productionId)
 */
export function upsertProductionSheets(sheets: ProductionSheet[]): void {
  const all = loadAll();

  for (const newSheet of sheets) {
    const existingIdx = all.findIndex(
      (s) => s.productionId === newSheet.productionId,
    );

    if (existingIdx >= 0) {
      // Update existing
      all[existingIdx] = newSheet;
    } else {
      // Add new
      all.push(newSheet);
    }
  }

  saveAll(all);
}

/**
 * Get all production sheets for a specific BEO
 */
export function getProductionSheetsForBeo(beoId: string): ProductionSheet[] {
  return loadAll().filter((s) => s.beoId === beoId);
}

/**
 * Get production sheets for a specific event
 */
export function getProductionSheetsForEvent(
  eventId: string,
): ProductionSheet[] {
  return loadAll().filter((s) => s.eventId === eventId);
}

/**
 * Get a single production sheet by ID
 */
export function getProductionSheet(
  productionId: string,
): ProductionSheet | null {
  return loadAll().find((s) => s.productionId === productionId) || null;
}

/**
 * Clear all production sheets (use with caution)
 */
export function clearProductionSheets(): void {
  try {
    localStorage.removeItem(KEY);
  } catch (error) {
    console.error("Failed to clear production sheets:", error);
  }
}
