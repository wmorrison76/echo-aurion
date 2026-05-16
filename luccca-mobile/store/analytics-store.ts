import { create } from "zustand";
import { persist } from "zustand/middleware";
import { executeSql, querySql } from "@/lib/database/sqlite";
import { getApiClient } from "@/lib/api-client";

export interface AnalyticsEvent {
  id: string;
  org_id: string;
  event_name: string;
  event_type: "app_event" | "user_action" | "system_event";
  properties: Record<string, any>;
  timestamp: string;
  synced: boolean;
}

export interface AnalyticsSnapshot {
  id: string;
  org_id: string;
  period: "daily" | "weekly" | "monthly";
  period_start: string;
  period_end: string;
  total_events: number;
  total_users: number;
  total_duration_minutes: number;
  conflict_events: number;
  sync_errors: number;
  created_at: string;
}

export interface AnalyticsState {
  events: AnalyticsEvent[];
  snapshots: AnalyticsSnapshot[];
  isLoading: boolean;
  error: string | null;
  isSyncing: boolean;

  trackEvent: (
    eventName: string,
    eventType?: "app_event" | "user_action" | "system_event",
    properties?: Record<string, any>,
  ) => Promise<void>;
  loadEvents: (filter?: { limit?: number }) => Promise<void>;
  loadSnapshots: (period?: "daily" | "weekly" | "monthly") => Promise<void>;
  syncAnalytics: () => Promise<void>;
  clearLocalEvents: () => Promise<void>;
  getEventCount: (type?: string) => number;
}

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      events: [],
      snapshots: [],
      isLoading: false,
      error: null,
      isSyncing: false,

      trackEvent: async (
        eventName,
        eventType = "app_event",
        properties = {},
      ) => {
        try {
          const id = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const timestamp = new Date().toISOString();

          const event: AnalyticsEvent = {
            id,
            org_id: "org_unknown",
            event_name: eventName,
            event_type: eventType,
            properties,
            timestamp,
            synced: false,
          };

          await executeSql(
            `INSERT INTO analytics_events 
            (id, org_id, event_name, event_type, properties, timestamp, synced) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              event.org_id,
              eventName,
              eventType,
              JSON.stringify(properties),
              timestamp,
              0,
            ],
          );

          set((state) => ({
            events: [event, ...state.events],
          }));

          console.log(
            `[Analytics] Tracked event: ${eventName} at ${timestamp}`,
          );
        } catch (error) {
          console.error("[Analytics] Failed to track event:", error);
        }
      },

      loadEvents: async (filter) => {
        set({ isLoading: true, error: null });
        try {
          const limit = filter?.limit ?? 100;
          const events = await querySql<AnalyticsEvent>(
            `SELECT * FROM analytics_events 
            ORDER BY timestamp DESC 
            LIMIT ?`,
            [limit],
          );
          set({ events });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load analytics events";
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      loadSnapshots: async (period = "daily") => {
        set({ isLoading: true, error: null });
        try {
          const snapshots = await querySql<AnalyticsSnapshot>(
            `SELECT * FROM analytics_snapshots 
            WHERE period = ? 
            ORDER BY period_start DESC 
            LIMIT 30`,
            [period],
          );
          set({ snapshots });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to load analytics snapshots";
          set({ error: message });
        } finally {
          set({ isLoading: false });
        }
      },

      syncAnalytics: async () => {
        try {
          set({ isSyncing: true, error: null });

          const unsyncedEvents = get().events.filter((e) => !e.synced);

          if (unsyncedEvents.length === 0) {
            return;
          }

          const api = getApiClient();
          await api.post("/analytics/events/batch", {
            events: unsyncedEvents.map((e) => ({
              event_name: e.event_name,
              event_type: e.event_type,
              properties: e.properties,
              timestamp: e.timestamp,
            })),
          });

          const unsyncedIds = unsyncedEvents.map((e) => e.id);
          await executeSql(
            `UPDATE analytics_events SET synced = 1 WHERE id IN (${unsyncedIds.map(() => "?").join(",")})`,
            unsyncedIds,
          );

          set((state) => ({
            events: state.events.map((e) =>
              unsyncedIds.includes(e.id) ? { ...e, synced: true } : e,
            ),
          }));

          console.log(
            `[Analytics] Synced ${unsyncedEvents.length} events to backend`,
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Failed to sync analytics";
          set({ error: message });
          throw error;
        } finally {
          set({ isSyncing: false });
        }
      },

      clearLocalEvents: async () => {
        try {
          await executeSql("DELETE FROM analytics_events WHERE synced = 1");
          set((state) => ({
            events: state.events.filter((e) => !e.synced),
          }));
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Failed to clear analytics events";
          set({ error: message });
          throw error;
        }
      },

      getEventCount: (type) => {
        if (!type) return get().events.length;
        return get().events.filter((e) => e.event_type === type).length;
      },
    }),
    {
      name: "analytics-store",
    },
  ),
);
