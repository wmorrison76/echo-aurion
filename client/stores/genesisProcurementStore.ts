/**
 * Genesis Procurement Store
 * Persists procurement plans and audit trail
 * Storage key: luccca:genesis:procurement:v1
 */

import type { ProcurementPlan } from "@/../shared/types/genesis-procurement";

const STORAGE_KEY = "luccca:genesis:procurement:v1";
const MAX_PLANS = 100;

interface ProcurementStoreData {
  lastPlan: ProcurementPlan | null;
  history: ProcurementPlan[];
  updatedAt: string;
}

/**
 * Load all procurement plans from storage
 */
function loadProcurementData(): ProcurementStoreData {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return {
        lastPlan: null,
        history: [],
        updatedAt: new Date().toISOString(),
      };
    }
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load procurement data:", e);
    return {
      lastPlan: null,
      history: [],
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Save procurement data to storage
 */
function saveProcurementData(data: ProcurementStoreData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save procurement data (quota exceeded?):", e);
    // Fallback: try to save just the last plan
    try {
      const minimalData: ProcurementStoreData = {
        lastPlan: data.lastPlan,
        history: [],
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimalData));
    } catch (e2) {
      console.error("Failed to save minimal procurement data:", e2);
    }
  }
}

/**
 * Save a procurement plan
 */
export function saveProcurementPlan(plan: ProcurementPlan): void {
  const data = loadProcurementData();

  data.lastPlan = plan;
  data.history.unshift(plan); // Add to front of history
  data.history = data.history.slice(0, MAX_PLANS); // Keep last 100
  data.updatedAt = new Date().toISOString();

  saveProcurementData(data);
}

/**
 * Get the last generated plan
 */
export function getLastProcurementPlan(): ProcurementPlan | null {
  const data = loadProcurementData();
  return data.lastPlan;
}

/**
 * Get a plan by ID
 */
export function getProcurementPlanById(planId: string): ProcurementPlan | null {
  const data = loadProcurementData();
  return data.history.find((p) => p.planId === planId) || null;
}

/**
 * Get procurement history
 */
export function getProcurementHistory(limit: number = 10): ProcurementPlan[] {
  const data = loadProcurementData();
  return data.history.slice(0, limit);
}

/**
 * Clear all procurement data
 */
export function clearProcurementData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear procurement data:", e);
  }
}

/**
 * Export procurement history as JSON
 */
export function exportProcurementHistoryAsJSON(): string {
  const data = loadProcurementData();
  return JSON.stringify(data, null, 2);
}

/**
 * Get storage stats
 */
export function getProcurementStorageStats(): {
  planCount: number;
  lastUpdated: string;
  totalValue: number;
} {
  const data = loadProcurementData();
  const totalValue = data.history.reduce((sum, p) => sum + p.totalValue, 0);

  return {
    planCount: data.history.length,
    lastUpdated: data.updatedAt,
    totalValue,
  };
}
