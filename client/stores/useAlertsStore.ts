import { create } from "zustand";

export type AlertType = "critical" | "high" | "medium" | "low";

export type AlertModuleId =
  | "inventory"
  | "schedule"
  | "maintenance"
  | "purchasing-receiving"
  | string;

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  timestamp: number;
  module?: AlertModuleId;
}

type PersistedAlert = Omit<Alert, "timestamp"> & { timestamp: number };

type AlertsState = {
  alerts: Alert[];
  hydrate: () => void;
  upsertAlert: (alert: Alert) => void;
  addAlerts: (alerts: Alert[]) => void;
  dismissAlert: (id: string) => void;
  clearAll: () => void;
};

const STORAGE_KEY = "echo-alerts-v1";
const MAX_ALERTS = 50;

function safeParseAlerts(raw: string | null): PersistedAlert[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const alert = item as any;
        if (typeof alert.id !== "string") return null;
        if (typeof alert.title !== "string") return null;
        if (typeof alert.message !== "string") return null;
        if (typeof alert.type !== "string") return null;

        const timestamp = Number(alert.timestamp);
        if (!Number.isFinite(timestamp)) return null;

        return {
          id: alert.id,
          title: alert.title,
          message: alert.message,
          type: alert.type,
          timestamp,
          module: typeof alert.module === "string" ? alert.module : undefined,
        } as PersistedAlert;
      })
      .filter(Boolean) as PersistedAlert[];
  } catch {
    return [];
  }
}

function persistAlerts(alerts: Alert[]) {
  if (typeof window === "undefined") return;
  try {
    const serialized: PersistedAlert[] = alerts.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      type: a.type,
      timestamp: a.timestamp,
      module: a.module,
    }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  } catch {
    // ignore
  }
}

function normalizeAlerts(alerts: Alert[]): Alert[] {
  const byId = new Map<string, Alert>();
  for (const alert of alerts) {
    if (!alert || typeof alert.id !== "string") continue;
    byId.set(alert.id, alert);
  }

  return Array.from(byId.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_ALERTS);
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],

  hydrate: () => {
    if (typeof window === "undefined") return;
    const parsed = safeParseAlerts(window.localStorage.getItem(STORAGE_KEY));
    const alerts: Alert[] = parsed.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      type: a.type as AlertType,
      timestamp: a.timestamp,
      module: a.module,
    }));
    set({ alerts: normalizeAlerts(alerts) });
  },

  upsertAlert: (alert) => {
    set((state) => {
      const existing = state.alerts.find((a) => a.id === alert.id);
      const merged: Alert[] = existing
        ? state.alerts.map((a) => (a.id === alert.id ? alert : a))
        : [alert, ...state.alerts];

      const next = normalizeAlerts(merged);
      persistAlerts(next);
      return { alerts: next };
    });
  },

  addAlerts: (alerts) => {
    set((state) => {
      const merged = normalizeAlerts([...alerts, ...state.alerts]);
      persistAlerts(merged);
      return { alerts: merged };
    });
  },

  dismissAlert: (id) => {
    set((state) => {
      const next = state.alerts.filter((a) => a.id !== id);
      persistAlerts(next);
      return { alerts: next };
    });
  },

  clearAll: () => {
    set(() => {
      persistAlerts([]);
      return { alerts: [] };
    });
  },
}));
