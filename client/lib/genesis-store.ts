import type {
  ForecastHorizon,
  GenesisAProfile,
  OperationScale,
} from "@/../shared/types/genesis";

const KEY_A = "luccca:genesis:A:v1";

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

export function getGenesisA(): GenesisAProfile {
  const storage = getStorage();
  const raw = storage.getItem(KEY_A);

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as GenesisAProfile;
      if (parsed && parsed.version === 1) {
        return parsed;
      }
    } catch {
      // fall through to default
    }
  }

  const created = nowISO();
  const defaultProfile: GenesisAProfile = {
    version: 1,

    propertyName: null,
    goLiveDateISO: null,

    scale: "SINGLE_OUTLET",

    kitchensCount: 1,
    hasOvernightBaker: false,
    hasOvernightCook: false,

    defaultForecastHorizon: "DAYS_30",

    createdAtISO: created,
    updatedAtISO: created,
  };

  storage.setItem(KEY_A, JSON.stringify(defaultProfile));
  return defaultProfile;
}

export function saveGenesisA(
  next: Omit<GenesisAProfile, "createdAtISO" | "updatedAtISO">,
) {
  const storage = getStorage();
  const existing = getGenesisA();

  const updated: GenesisAProfile = {
    ...next,
    createdAtISO: existing.createdAtISO ?? nowISO(),
    updatedAtISO: nowISO(),
  };

  storage.setItem(KEY_A, JSON.stringify(updated));
  return updated;
}

export const SCALE_LABELS: Record<OperationScale, string> = {
  SINGLE_OUTLET: "Single Outlet (one kitchen)",
  MULTI_OUTLET: "Multi-Outlet (same property)",
  RESORT: "Resort (banquets + multiple kitchens)",
  PORTFOLIO: "Portfolio (multiple properties)",
};

export const HORIZON_LABELS: Record<ForecastHorizon, string> = {
  DAYS_7: "7 days",
  DAYS_30: "30 days",
  DAYS_60: "60 days",
  DAYS_90: "90 days",
};
