/**
 * Inventory Ledger Store
 * Provides localStorage-backed ledger lines per location (snapshots of on-hand inventory).
 * Uses append-only pattern with snapshot caching.
 */

interface LedgerEntry {
  itemKey: string;
  name: string;
  qty: number;
  uom: string;
  direction: "IN" | "OUT";
  timestamp: number;
  note?: string;
}

interface LedgerLine {
  itemKey: string;
  name: string;
  onHand: number;
  uom: string;
}

interface InventorySnapshot {
  locationId: string;
  lines: LedgerLine[];
  updatedAt: number;
}

interface LocationLedger {
  locationId: string;
  entries: LedgerEntry[];
}

const STORAGE_KEY_LEDGER = "luccca:inventory_ledger:v1";
const STORAGE_KEY_SNAPSHOTS = "luccca:inventory_snapshots:v1";

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function computeSnapshotFromLedger(entries: LedgerEntry[]): LedgerLine[] {
  const aggregated = new Map<string, LedgerLine>();

  for (const entry of entries) {
    const existing = aggregated.get(entry.itemKey) || {
      itemKey: entry.itemKey,
      name: entry.name,
      onHand: 0,
      uom: entry.uom,
    };

    const delta = entry.direction === "IN" ? entry.qty : -entry.qty;
    existing.onHand = Math.max(0, existing.onHand + delta);

    aggregated.set(entry.itemKey, existing);
  }

  return Array.from(aggregated.values()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function initializeInventoryLedgerSamples() {
  const locations = ["storeroom", "banquets-commissary", "pastry-commissary"];

  locations.forEach((locationId) => {
    const existing = localStorage.getItem(
      `${STORAGE_KEY_LEDGER}:${locationId}`,
    );
    if (existing) return;

    let entries: LedgerEntry[] = [];
    const now = Date.now();

    if (locationId === "storeroom") {
      entries = [
        {
          itemKey: "chicken_breast_6oz",
          name: "Chicken Breast 6oz",
          qty: 48,
          uom: "cs",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "flour_ap",
          name: "Flour AP",
          qty: 25,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "olive_oil",
          name: "Olive Oil",
          qty: 5,
          uom: "L",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "eggs",
          name: "Eggs",
          qty: 180,
          uom: "ct",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "butter",
          name: "Butter",
          qty: 15,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "salt",
          name: "Kosher Salt",
          qty: 5,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "black_pepper",
          name: "Black Pepper Ground",
          qty: 2,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "garlic_powder",
          name: "Garlic Powder",
          qty: 3,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "paprika",
          name: "Hungarian Paprika",
          qty: 2,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "thyme",
          name: "Fresh Thyme",
          qty: 1,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
      ];
    } else if (locationId === "banquets-commissary") {
      entries = [
        {
          itemKey: "chicken_stock",
          name: "Chicken Stock",
          qty: 20,
          uom: "L",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "demi_glace",
          name: "Demi-Glace",
          qty: 8,
          uom: "L",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "veal_jus",
          name: "Veal Jus",
          qty: 5,
          uom: "L",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "beef_tenderloin",
          name: "Beef Tenderloin Prime",
          qty: 12,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "salmon_fillet",
          name: "Salmon Fillet",
          qty: 8,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "lobster_tail",
          name: "Lobster Tail 4-6oz",
          qty: 10,
          uom: "ct",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "asparagus",
          name: "Asparagus Fresh",
          qty: 5,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "truffle_oil",
          name: "Truffle Oil",
          qty: 1,
          uom: "L",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "caviar",
          name: "Caviar Beluga",
          qty: 200,
          uom: "g",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "foie_gras",
          name: "Foie Gras Terrine",
          qty: 500,
          uom: "g",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
      ];
    } else if (locationId === "pastry-commissary") {
      entries = [
        {
          itemKey: "butter_premium",
          name: "European Butter Unsalted",
          qty: 20,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "chocolate_dark",
          name: "Dark Chocolate 70% Couverture",
          qty: 10,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "chocolate_white",
          name: "White Chocolate Couverture",
          qty: 5,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "vanilla_pods",
          name: "Madagascar Vanilla Pods",
          qty: 50,
          uom: "ct",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "almond_flour",
          name: "Almond Flour Blanched",
          qty: 15,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "pistachio",
          name: "Pistachio Paste",
          qty: 8,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "strawberry_puree",
          name: "Strawberry Puree",
          qty: 12,
          uom: "L",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "passion_fruit",
          name: "Passion Fruit Puree",
          qty: 10,
          uom: "L",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "gold_leaf",
          name: "Edible Gold Leaf 24k",
          qty: 100,
          uom: "sheet",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
        {
          itemKey: "fondant",
          name: "Fondant White Premium",
          qty: 25,
          uom: "lb",
          direction: "IN",
          timestamp: now - 86400000,
          note: "Initial stock",
        },
      ];
    }

    localStorage.setItem(
      `${STORAGE_KEY_LEDGER}:${locationId}`,
      JSON.stringify(entries),
    );

    const snapshot = computeSnapshotFromLedger(entries);
    localStorage.setItem(
      `${STORAGE_KEY_SNAPSHOTS}:${locationId}`,
      JSON.stringify({
        locationId,
        lines: snapshot,
        updatedAt: now,
      } as InventorySnapshot),
    );
  });
}

export function getLocationSnapshot(locationId: string): LedgerLine[] {
  const cached = safeParse<InventorySnapshot>(
    localStorage.getItem(`${STORAGE_KEY_SNAPSHOTS}:${locationId}`),
  );

  if (cached?.lines) {
    return cached.lines;
  }

  const entries = safeParse<LedgerEntry[]>(
    localStorage.getItem(`${STORAGE_KEY_LEDGER}:${locationId}`),
  );

  if (!entries) {
    return [];
  }

  const snapshot = computeSnapshotFromLedger(entries);
  const inventorySnapshot: InventorySnapshot = {
    locationId,
    lines: snapshot,
    updatedAt: Date.now(),
  };

  localStorage.setItem(
    `${STORAGE_KEY_SNAPSHOTS}:${locationId}`,
    JSON.stringify(inventorySnapshot),
  );

  return snapshot;
}

export function getSnapshotMeta(locationId: string): {
  locationId: string;
  updatedAt?: number;
  lineCount: number;
} {
  const cached = safeParse<InventorySnapshot>(
    localStorage.getItem(`${STORAGE_KEY_SNAPSHOTS}:${locationId}`),
  );
  return {
    locationId,
    updatedAt: cached?.updatedAt,
    lineCount: cached?.lines?.length ?? 0,
  };
}

export function getLocationLedger(locationId: string): LocationLedger {
  const entries = safeParse<LedgerEntry[]>(
    localStorage.getItem(`${STORAGE_KEY_LEDGER}:${locationId}`),
  );

  return {
    locationId,
    entries: entries || [],
  };
}

export function appendLedgerEntry(locationId: string, entry: LedgerEntry) {
  const current = safeParse<LedgerEntry[]>(
    localStorage.getItem(`${STORAGE_KEY_LEDGER}:${locationId}`),
  );

  const entries = current || [];
  entries.push({
    ...entry,
    timestamp: Date.now(),
  });

  localStorage.setItem(
    `${STORAGE_KEY_LEDGER}:${locationId}`,
    JSON.stringify(entries),
  );

  const snapshot = computeSnapshotFromLedger(entries);
  const inventorySnapshot: InventorySnapshot = {
    locationId,
    lines: snapshot,
    updatedAt: Date.now(),
  };

  localStorage.setItem(
    `${STORAGE_KEY_SNAPSHOTS}:${locationId}`,
    JSON.stringify(inventorySnapshot),
  );
}

export function updateOnHand(
  locationId: string,
  itemKey: string,
  newQty: number,
) {
  const current = safeParse<LedgerEntry[]>(
    localStorage.getItem(`${STORAGE_KEY_LEDGER}:${locationId}`),
  );

  if (!current) {
    return;
  }

  const snapshot = computeSnapshotFromLedger(current);
  const currentOnHand =
    snapshot.find((l) => l.itemKey === itemKey)?.onHand || 0;
  const delta = newQty - currentOnHand;

  if (delta === 0) {
    return;
  }

  const direction = delta > 0 ? "IN" : "OUT";
  const item = snapshot.find((l) => l.itemKey === itemKey);

  if (item) {
    appendLedgerEntry(locationId, {
      itemKey,
      name: item.name,
      qty: Math.abs(delta),
      uom: item.uom,
      direction,
      timestamp: Date.now(),
      note: "Correction",
    });
  }
}
