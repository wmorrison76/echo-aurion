/**
 * Genesis C — Procurement Plan Store (Local v1)
 * Persists procurement plans so refresh doesn't lose the result.
 */

import type { ProcurementPlan } from "@/../shared/types/procurement";

const KEY = "luccca:procurement:plans:v1";

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

const memoryStore = new Map<string, string>();

function getStorage(): StorageLike {
  if (typeof window === "undefined") {
    return {
      getItem: (k) => memoryStore.get(k) ?? null,
      setItem: (k, v) => {
        memoryStore.set(k, v);
      },
    };
  }

  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // ignore
  }

  return {
    getItem: (k) => memoryStore.get(k) ?? null,
    setItem: (k, v) => {
      memoryStore.set(k, v);
    },
  };
}

function safeParse(raw: string | null): ProcurementPlan[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ProcurementPlan[]) : [];
  } catch {
    return [];
  }
}

export function listProcurementPlans(): ProcurementPlan[] {
  const storage = getStorage();
  const plans = safeParse(storage.getItem(KEY));

  return plans.sort((a, b) =>
    (b.createdAtISO || "").localeCompare(a.createdAtISO || ""),
  );
}

export function upsertProcurementPlan(plan: ProcurementPlan): ProcurementPlan {
  const storage = getStorage();
  const plans = safeParse(storage.getItem(KEY));

  const idx = plans.findIndex((p) => p.planId === plan.planId);
  if (idx >= 0) plans[idx] = plan;
  else plans.push(plan);

  storage.setItem(KEY, JSON.stringify(plans));
  return plan;
}

export function getProcurementPlan(planId: string): ProcurementPlan | null {
  return listProcurementPlans().find((p) => p.planId === planId) ?? null;
}

export function getLatestProcurementPlan(): ProcurementPlan | null {
  const plans = listProcurementPlans();
  return plans.length ? plans[0] : null;
}
