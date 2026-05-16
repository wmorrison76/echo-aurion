/**
 * Maestro Zustand Store
 *
 * Centralized state management for the Maestro Dashboard.
 * Handles event list, current event, filters, and panel layout state.
 *
 * This complements MaestroContext which handles real-time updates.
 */

import { create } from "zustand";
import type { Event } from "@shared/types/maestro";

export interface MaestroStoreState {
  // Event list state
  events: Event[];
  eventsLoading: boolean;
  eventsError: string | null;

  // Selected event
  selectedEventId: string | null;

  // Selected BEO (for detail view)
  selectedBEOId: string | null;

  // Filters
  statusFilter: string;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  outletFilter: string | null;

  // Panel layout
  selectedPanel: string;
  panelLayout: Record<string, any>;
  minimizedPanels: Set<string>;
  fullscreenPanel: string | null;

  // UI state
  sidebarOpen: boolean;
  showWatchPanel: boolean;
  selectedTab: string;

  // Actions
  setEvents: (events: Event[]) => void;
  setEventsLoading: (loading: boolean) => void;
  setEventsError: (error: string | null) => void;
  selectEvent: (eventId: string | null) => void;
  selectBEO: (beoId: string | null) => void;
  setStatusFilter: (status: string) => void;
  setDateRange: (start: string | null, end: string | null) => void;
  setOutletFilter: (outlet: string | null) => void;
  setSelectedPanel: (panel: string) => void;
  setPanelLayout: (panelId: string, layout: any) => void;
  togglePanelMinimize: (panelId: string) => void;
  setFullscreenPanel: (panelId: string | null) => void;
  toggleSidebar: () => void;
  toggleWatchPanel: () => void;
  setSelectedTab: (tab: string) => void;
  clearFilters: () => void;
}

export const useMaestroStore = create<MaestroStoreState>((set) => ({
  // Initial state
  events: [],
  eventsLoading: false,
  eventsError: null,
  selectedEventId: null,
  selectedBEOId: null,
  statusFilter: "confirmed",
  dateRangeStart: null,
  dateRangeEnd: null,
  outletFilter: null,
  selectedPanel: "event_command",
  panelLayout: {},
  minimizedPanels: new Set(),
  fullscreenPanel: null,
  sidebarOpen: true,
  showWatchPanel: true,
  selectedTab: "overview",

  // Actions
  setEvents: (events) =>
    set(() => ({
      events,
    })),

  setEventsLoading: (loading) =>
    set(() => ({
      eventsLoading: loading,
    })),

  setEventsError: (error) =>
    set(() => ({
      eventsError: error,
    })),

  selectEvent: (eventId) =>
    set(() => ({
      selectedEventId: eventId,
    })),

  selectBEO: (beoId) =>
    set(() => ({
      selectedBEOId: beoId,
    })),

  setStatusFilter: (status) =>
    set(() => ({
      statusFilter: status,
    })),

  setDateRange: (start, end) =>
    set(() => ({
      dateRangeStart: start,
      dateRangeEnd: end,
    })),

  setOutletFilter: (outlet) =>
    set(() => ({
      outletFilter: outlet,
    })),

  setSelectedPanel: (panel) =>
    set(() => ({
      selectedPanel: panel,
    })),

  setPanelLayout: (panelId, layout) =>
    set((state) => ({
      panelLayout: {
        ...state.panelLayout,
        [panelId]: layout,
      },
    })),

  togglePanelMinimize: (panelId) =>
    set((state) => {
      const next = new Set(state.minimizedPanels);
      if (next.has(panelId)) {
        next.delete(panelId);
      } else {
        next.add(panelId);
      }
      return { minimizedPanels: next };
    }),

  setFullscreenPanel: (panelId) =>
    set(() => ({
      fullscreenPanel: panelId,
    })),

  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),

  toggleWatchPanel: () =>
    set((state) => ({
      showWatchPanel: !state.showWatchPanel,
    })),

  setSelectedTab: (tab) =>
    set(() => ({
      selectedTab: tab,
    })),

  clearFilters: () =>
    set(() => ({
      statusFilter: "confirmed",
      dateRangeStart: null,
      dateRangeEnd: null,
      outletFilter: null,
    })),
}));
