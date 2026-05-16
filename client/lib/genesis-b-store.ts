import type {
  CostAttributionMode,
  GenesisBConfig,
  InventoryCadence,
  LocationKind,
} from "@/../shared/types/genesis-b";

const KEY_B = "luccca:genesis:B:v1";

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

function nowISO() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export function getGenesisB(): GenesisBConfig {
  const storage = getStorage();
  const raw = storage.getItem(KEY_B);

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as GenesisBConfig;
      if (parsed && parsed.version === 1) {
        return parsed;
      }
    } catch {
      // fall through to defaults
    }
  }

  const storeroomId = uid("loc");
  const prodId = uid("loc");
  const pastryId = uid("loc");

  const outlet0Id = uid("outlet");
  const outlet1Id = uid("outlet");

  const created = nowISO();

  const defaults: GenesisBConfig = {
    version: 1,

    locations: [
      {
        id: storeroomId,
        name: "Storeroom",
        kind: "STOREROOM",
        canActAsCommissary: true,
        cadence: "DAILY",
        notes: "Primary receiving node: paper/plastic, bev, food.",
      },
      {
        id: prodId,
        name: "Banquets Production",
        kind: "PRODUCTION_COMMISSARY",
        canActAsCommissary: true,
        cadence: "PER_EVENT",
        notes: "BEO production + internal fulfillment to outlets.",
      },
      {
        id: pastryId,
        name: "Pastry Commissary",
        kind: "PASTRY_COMMISSARY",
        canActAsCommissary: true,
        cadence: "AM_PM",
        notes: "Standing pars for items with 2–3 day lead time.",
      },
      {
        id: outlet0Id,
        name: "Restaurant 0",
        kind: "OUTLET",
        canActAsCommissary: false,
        cadence: "DAILY",
        notes: null,
      },
      {
        id: outlet1Id,
        name: "In-Room Dining",
        kind: "OUTLET",
        canActAsCommissary: false,
        cadence: "DAILY",
        notes: "Can temporarily act as commissary in surge periods.",
      },
    ],

    fulfillmentRules: [
      {
        fromLocationId: storeroomId,
        toOutletId: outlet0Id,
        isEnabled: true,
        leadTimeHours: 2,
        defaultDueTime: "NEXT_DELIVERY_WINDOW",
      },
      {
        fromLocationId: storeroomId,
        toOutletId: outlet1Id,
        isEnabled: true,
        leadTimeHours: 2,
        defaultDueTime: "NEXT_DELIVERY_WINDOW",
      },
      {
        fromLocationId: prodId,
        toOutletId: outlet0Id,
        isEnabled: true,
        leadTimeHours: 12,
        defaultDueTime: "CUSTOM",
        notes: "e.g., 5 gal chicken stock",
      },
      {
        fromLocationId: prodId,
        toOutletId: outlet1Id,
        isEnabled: true,
        leadTimeHours: 12,
        defaultDueTime: "CUSTOM",
      },
      {
        fromLocationId: pastryId,
        toOutletId: outlet0Id,
        isEnabled: true,
        leadTimeHours: 48,
        defaultDueTime: "CUSTOM",
        notes: "standing pars recommended",
      },
      {
        fromLocationId: pastryId,
        toOutletId: outlet1Id,
        isEnabled: true,
        leadTimeHours: 48,
        defaultDueTime: "CUSTOM",
      },
    ],

    apn: {
      mode: "RECEIVING_OUTLET_PAYS",
      producerCreditEnabled: true,
      auditNotationsEnabled: true,
      allowSubBuckets: true,
    },

    createdAtISO: created,
    updatedAtISO: created,
  };

  storage.setItem(KEY_B, JSON.stringify(defaults));
  return defaults;
}

export function saveGenesisB(
  next: Omit<GenesisBConfig, "createdAtISO" | "updatedAtISO">,
) {
  const storage = getStorage();
  const existing = getGenesisB();

  const updated: GenesisBConfig = {
    ...next,
    createdAtISO: existing.createdAtISO ?? nowISO(),
    updatedAtISO: nowISO(),
  };

  storage.setItem(KEY_B, JSON.stringify(updated));
  return updated;
}

export const KIND_LABELS: Record<LocationKind, string> = {
  OUTLET: "Outlet",
  STOREROOM: "Storeroom (Receiving)",
  PRODUCTION_COMMISSARY: "Banquets Production Commissary",
  PASTRY_COMMISSARY: "Pastry Commissary",
};

export const CADENCE_LABELS: Record<InventoryCadence, string> = {
  PER_EVENT: "Per Event (REO/BEO)",
  DAILY: "Daily",
  AM_PM: "AM / PM",
  WEEKLY: "Weekly",
  MONTH_END: "Month End",
  AS_NEEDED: "As Needed",
};

export const APN_MODE_LABELS: Record<CostAttributionMode, string> = {
  RECEIVING_OUTLET_PAYS: "Receiving Outlet Pays (default)",
  PRODUCER_PAYS: "Producer Pays",
  SPLIT: "Split Cost",
  MANUAL_OVERRIDE: "Manual Override (rare)",
};
