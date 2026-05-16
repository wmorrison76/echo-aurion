/********************************************************************
 * LUCCCA — BUILD 12
 * useChangeFeedStore.ts
 *
 * PURPOSE:
 *  - Single source of truth for live change events
 *  - Allows any module to publish change events
 *  - Retained history, FIFO, max length
 *
 * INTEGRATION:
 *  - ChangeFeedPanel subscribes to this store
 *  - EventScheduler, MaintenanceScheduler, OverrideCenter publish to it
 *********************************************************************/

import { create } from "zustand";

export type ChangeFeedEvent = {
  id: string;
  ts: number;
  type: string; // "event", "maintenance", "override", "conflict"
  action: string; // "created", "updated", "approved", "denied"
  severity: "info" | "warn" | "danger";
  message: string;
  source: string; // who triggered event
};

type ChangeFeedState = {
  events: ChangeFeedEvent[];
  publish: (e: Omit<ChangeFeedEvent, "id" | "ts">) => void;
  clear: () => void;
};

export const useChangeFeedStore = create<ChangeFeedState>((set) => ({
  events: [],

  publish: (payload) =>
    set((state) => ({
      events: [
        {
          id: `cf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ts: Date.now(),
          ...payload,
        },
        ...state.events.slice(0, 99),
      ],
    })),

  clear: () => set({ events: [] }),
}));
