/**
 * Genesis C — Unified Inventory Snapshot Adapter (v1)
 * Reads inventory from localStorage keys (stub) so procurement can subtract on-hand.
 */

import type { InventorySnapshotLine } from "@/../shared/types/procurement";

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

function safeReadJSON(key: string): any | null {
  const storage = getStorage();
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

type SourceDef = { key: string; defaultLocationId: string };

const SOURCES: SourceDef[] = [
  { key: "luccca:inventory:storeroom:v1", defaultLocationId: "storeroom" },
  {
    key: "luccca:inventory:banquets:v1",
    defaultLocationId: "banquets_production",
  },
  {
    key: "luccca:inventory:pastry:v1",
    defaultLocationId: "pastry_commissary",
  },
];

export function getUnifiedInventorySnapshot(): InventorySnapshotLine[] {
  const now = new Date().toISOString();
  const out: InventorySnapshotLine[] = [];

  for (const src of SOURCES) {
    const data = safeReadJSON(src.key);

    const lines = Array.isArray(data)
      ? data
      : Array.isArray(data?.lines)
        ? data.lines
        : [];

    for (const l of lines) {
      if (!l || typeof l !== "object") continue;

      const ingredientId = String(
        (l as any).ingredientId ?? (l as any).id ?? "",
      );
      if (!ingredientId) continue;

      const onHandQtyRaw = (l as any).onHandQty ?? (l as any).qty ?? 0;
      const onHandQty = Number(onHandQtyRaw);
      if (!Number.isFinite(onHandQty)) continue;

      out.push({
        ingredientId,
        onHandQty,
        unit: String((l as any).unit ?? "ea"),
        locationId: String((l as any).locationId ?? src.defaultLocationId),
        asOfISO: String((l as any).asOfISO ?? data?.asOfISO ?? now),
      });
    }
  }

  return out;
}
