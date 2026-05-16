/**
 * Genesis H — Standing PAR Store
 * Persists PAR rules to localStorage with in-memory fallback.
 * Provides CRUD operations for managing standing inventory targets.
 */

import type { StandingParRule, GenesisHConfig } from "@/../shared/types/par";

const KEY = "luccca:par_rules:v1";

const memoryStore = new Map<string, string>();

function getStorage(): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
} {
  if (typeof window === "undefined") {
    return {
      getItem: (k) => memoryStore.get(k) ?? null,
      setItem: (k, v) => {
        memoryStore.set(k, v);
      },
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
    setItem: (k, v) => {
      memoryStore.set(k, v);
    },
  };
}

/**
 * Safe JSON parse with fallback to null.
 */
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Generate a unique ID with prefix and timestamp.
 */
function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/**
 * Read all PAR rules from storage.
 */
function readAll(): StandingParRule[] {
  const storage = getStorage();
  const raw = storage.getItem(KEY);
  return safeParse<StandingParRule[]>(raw) ?? [];
}

/**
 * Write all PAR rules to storage.
 */
function writeAll(rules: StandingParRule[]): void {
  const storage = getStorage();
  storage.setItem(KEY, JSON.stringify(rules));
}

/**
 * List all PAR rules.
 */
export function listParRules(): StandingParRule[] {
  return readAll();
}

/**
 * Get a specific PAR rule by ID.
 */
export function getParRule(parId: string): StandingParRule | null {
  return readAll().find((r) => r.parId === parId) ?? null;
}

/**
 * Get all PAR rules for a specific location.
 */
export function getParRulesForLocation(locationId: string): StandingParRule[] {
  return readAll().filter((r) => r.locationId === locationId);
}

/**
 * Upsert a PAR rule (create if new, update if exists by parId).
 */
export function upsertParRule(rule: StandingParRule): StandingParRule {
  const all = readAll();
  const idx = all.findIndex((r) => r.parId === rule.parId);
  if (idx >= 0) {
    all[idx] = rule;
  } else {
    all.push(rule);
  }
  writeAll(all);
  return rule;
}

/**
 * Create a new PAR rule with auto-generated ID.
 */
export function createParRule(
  input: Omit<StandingParRule, "parId">,
): StandingParRule {
  const rule: StandingParRule = {
    ...input,
    parId: uid("par"),
  };
  return upsertParRule(rule);
}

/**
 * Delete a PAR rule by ID.
 */
export function deleteParRule(parId: string): void {
  const all = readAll();
  const filtered = all.filter((r) => r.parId !== parId);
  writeAll(filtered);
}

/**
 * Initialize sample PAR rules for demo/onboarding.
 * Idempotent: only creates samples if no rules exist yet.
 */
export function initializeSampleParRules(): void {
  const existing = readAll();
  if (existing.length > 0) return;

  const now = new Date().toISOString();

  const samples: StandingParRule[] = [
    {
      parId: uid("par"),
      locationId: "pastry_commissary",
      ingredientName: "Cheesecake 9in",
      unit: "ea",
      baseParQty: 30,
      leadTimeDays: 3,
      dayOfWeekModifiers: {
        Fri: 2.0, // 60 on Friday
        Sat: 2.0, // 60 on Saturday
      },
      allowAutoIncrease: true,
      allowAutoDecrease: true,
      lastReviewedAtISO: now,
    },
    {
      parId: uid("par"),
      locationId: "pastry_commissary",
      ingredientName: "Croissants",
      unit: "ea",
      baseParQty: 100,
      leadTimeDays: 1,
      allowAutoIncrease: true,
      allowAutoDecrease: false,
      lastReviewedAtISO: now,
    },
    {
      parId: uid("par"),
      locationId: "bqt_commissary",
      ingredientName: "Chicken Stock",
      unit: "gal",
      baseParQty: 10,
      leadTimeDays: 1,
      allowAutoIncrease: true,
      allowAutoDecrease: true,
      lastReviewedAtISO: now,
    },
    {
      parId: uid("par"),
      locationId: "bqt_commissary",
      ingredientName: "Demi-glace",
      unit: "gal",
      baseParQty: 5,
      leadTimeDays: 2,
      allowAutoIncrease: true,
      allowAutoDecrease: false,
      lastReviewedAtISO: now,
    },
    {
      parId: uid("par"),
      locationId: "storeroom_main",
      ingredientName: "All-Purpose Flour",
      unit: "cs",
      baseParQty: 10,
      leadTimeDays: 1,
      allowAutoIncrease: true,
      allowAutoDecrease: true,
      lastReviewedAtISO: now,
    },
  ];

  samples.forEach((rule) => {
    const all = readAll();
    all.push(rule);
    writeAll(all);
  });
}
