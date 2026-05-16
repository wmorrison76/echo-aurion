/**
 * Calendar Store (Zustand)
 * Global state management for the enterprise calendar system.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {
  AccessLevel,
  CalendarConflict,
  CalendarEvent,
  CalendarOutlet,
  CalendarStoreState,
  CalendarViewMode,
  PendingOperation,
} from "@/types/calendar";

const initialState = {
  // Filters & selection
  selectedOutlets: [] as string[],
  selectedDate: new Date().toISOString().split("T")[0],
  expandedEventId: null as string | null,
  viewMode: "month" as CalendarViewMode,

  // Data
  events: [] as CalendarEvent[],
  outlets: [] as CalendarOutlet[],
  conflicts: [] as CalendarConflict[],
  userPermissions: {} as Record<string, AccessLevel>,

  // UI state
  isLoadingEvents: false,
  showConflictAlert: false,
  conflictToShow: undefined as CalendarConflict | undefined,

  // Real-time sync & offline support
  pendingOperations: [] as PendingOperation[],
  lastSyncTime: 0,
  isSyncing: false,
  syncError: null as string | null,
};

export const useCalendarStore = create<CalendarStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // -----------------------------------------------------
        // Outlet selection
        // -----------------------------------------------------
        setSelectedOutlets: (ids: string[]) => {
          set({ selectedOutlets: ids }, false, { type: "setSelectedOutlets" });
        },
        addSelectedOutlet: (id: string) => {
          const current = get().selectedOutlets;
          if (current.includes(id)) return;
          set({ selectedOutlets: [...current, id] }, false, {
            type: "addSelectedOutlet",
          });
        },
        removeSelectedOutlet: (id: string) => {
          set(
            {
              selectedOutlets: get().selectedOutlets.filter(
                (outlet) => outlet !== id,
              ),
            },
            false,
            { type: "removeSelectedOutlet" },
          );
        },

        // -----------------------------------------------------
        // Events
        // -----------------------------------------------------
        setEvents: (events: CalendarEvent[]) => {
          set({ events }, false, { type: "setEvents" });
        },
        addEvent: (event: CalendarEvent) => {
          const current = get().events;
          if (current.some((e) => e.id === event.id)) return;
          set({ events: [event, ...current] }, false, { type: "addEvent" });
        },
        updateEvent: (event: CalendarEvent) => {
          const updated = get().events.map((e) =>
            e.id === event.id ? event : e,
          );
          set({ events: updated }, false, { type: "updateEvent" });
        },
        removeEvent: (eventId: string) => {
          set({ events: get().events.filter((e) => e.id !== eventId) }, false, {
            type: "removeEvent",
          });
        },

        // -----------------------------------------------------
        // Conflicts
        // -----------------------------------------------------
        setConflicts: (conflicts: CalendarConflict[]) => {
          set({ conflicts }, false, { type: "setConflicts" });
        },
        addConflict: (conflict: CalendarConflict) => {
          const current = get().conflicts;
          if (current.some((c) => c.id === conflict.id)) return;
          set({ conflicts: [conflict, ...current] }, false, {
            type: "addConflict",
          });
        },
        acknowledgeConflict: (conflictId: string) => {
          const updated = get().conflicts.map((c) =>
            c.id === conflictId
              ? {
                  ...c,
                  acknowledged_at: new Date().toISOString(),
                  acknowledged_by: [...(c.acknowledged_by || [])],
                }
              : c,
          );
          set({ conflicts: updated }, false, { type: "acknowledgeConflict" });
        },

        // -----------------------------------------------------
        // Permissions
        // -----------------------------------------------------
        setUserPermissions: (perms: Record<string, AccessLevel>) => {
          set({ userPermissions: perms }, false, {
            type: "setUserPermissions",
          });
        },

        // -----------------------------------------------------
        // Expansion & detail view
        // -----------------------------------------------------
        toggleEventExpansion: (eventId: string | null) => {
          const current = get().expandedEventId;
          const newId = current === eventId ? null : eventId;
          set({ expandedEventId: newId }, false, {
            type: "toggleEventExpansion",
          });
        },

        // -----------------------------------------------------
        // Conflict alerts
        // -----------------------------------------------------
        setShowConflictAlert: (show: boolean) => {
          set({ showConflictAlert: show }, false, {
            type: "setShowConflictAlert",
          });
        },
        setConflictToShow: (conflict?: CalendarConflict) => {
          set(
            { conflictToShow: conflict, showConflictAlert: !!conflict },
            false,
            { type: "setConflictToShow" },
          );
        },

        // -----------------------------------------------------
        // View & date
        // -----------------------------------------------------
        setViewMode: (mode: CalendarViewMode) => {
          set({ viewMode: mode }, false, { type: "setViewMode" });
        },
        setSelectedDate: (date: string) => {
          set({ selectedDate: date }, false, { type: "setSelectedDate" });
        },

        // -----------------------------------------------------
        // Loading state
        // -----------------------------------------------------
        setIsLoadingEvents: (loading: boolean) => {
          set({ isLoadingEvents: loading }, false, {
            type: "setIsLoadingEvents",
          });
        },

        // -----------------------------------------------------
        // Pending operations & offline support
        // -----------------------------------------------------
        addPendingOperation: (operation: PendingOperation) => {
          const current = get().pendingOperations;
          set({ pendingOperations: [operation, ...current] }, false, {
            type: "addPendingOperation",
          });
        },
        removePendingOperation: (operationId: string) => {
          const current = get().pendingOperations;
          set(
            {
              pendingOperations: current.filter((op) => op.id !== operationId),
            },
            false,
            { type: "removePendingOperation" },
          );
        },
        updatePendingOperation: (
          operationId: string,
          updates: Partial<PendingOperation>,
        ) => {
          const updated = get().pendingOperations.map((op) =>
            op.id === operationId ? { ...op, ...updates } : op,
          );
          set({ pendingOperations: updated }, false, {
            type: "updatePendingOperation",
          });
        },
        clearPendingOperations: () => {
          set({ pendingOperations: [] }, false, {
            type: "clearPendingOperations",
          });
        },

        // -----------------------------------------------------
        // Sync state
        // -----------------------------------------------------
        setIsSyncing: (syncing: boolean) => {
          set({ isSyncing: syncing }, false, { type: "setIsSyncing" });
        },
        setSyncError: (error: string | null) => {
          set({ syncError: error }, false, { type: "setSyncError" });
        },
        setLastSyncTime: (time: number) => {
          set({ lastSyncTime: time }, false, { type: "setLastSyncTime" });
        },

        // -----------------------------------------------------
        // Utility
        // -----------------------------------------------------
        clear: () => {
          set(initialState as any, false, { type: "clear" });
        },
      }),
      {
        name: "calendar-store",
        partialize: (state: any) => ({
          selectedOutlets: state.selectedOutlets,
          selectedDate: state.selectedDate,
          viewMode: state.viewMode,
        }),
        version: 1,
        migrate: (persistedState: any, version: number) => {
          if (version < 1) return { ...persistedState, version: 1 };
          return persistedState;
        },
      },
    ),
    { name: "CalendarStore" } as any,
  ),
);

/**
 * Selector hooks for optimized component rendering
 */
export const useSelectedOutlets = () =>
  useCalendarStore((state) => state.selectedOutlets);
export const useCalendarViewMode = () =>
  useCalendarStore((state) => state.viewMode);
export const useSelectedDate = () =>
  useCalendarStore((state) => state.selectedDate);

export const useCalendarEvents = () =>
  useCalendarStore((state) => state.events);
export const useSelectedDateEvents = () => {
  const selectedDate = useSelectedDate();
  const events = useCalendarEvents();
  return events.filter((e) => e.date === selectedDate);
};

export const useOutletEvents = () => {
  const selectedOutlets = useSelectedOutlets();
  const events = useCalendarEvents();
  if (selectedOutlets.length === 0) return events;
  return events.filter((e) => selectedOutlets.includes(e.outlet_id));
};

export const useCalendarConflicts = () =>
  useCalendarStore((state) => state.conflicts);
export const useUnresolvedConflicts = () => {
  const conflicts = useCalendarConflicts();
  return conflicts.filter((c) => !c.resolved_at);
};
export const useCriticalConflicts = () => {
  const conflicts = useCalendarConflicts();
  return conflicts.filter((c) => c.severity === "critical" && !c.resolved_at);
};

export const useCalendarOutlets = () =>
  useCalendarStore((state) => state.outlets);

export const useExpandedEventId = () =>
  useCalendarStore((state) => state.expandedEventId);
export const useExpandedEvent = () => {
  const expandedEventId = useExpandedEventId();
  const events = useCalendarEvents();
  if (!expandedEventId) return null;
  return events.find((e) => e.id === expandedEventId) || null;
};

export const useConflictAlert = () => {
  const show = useCalendarStore((state) => state.showConflictAlert);
  const conflict = useCalendarStore((state) => state.conflictToShow);
  return { show, conflict };
};

export const useIsLoadingEvents = () =>
  useCalendarStore((state) => state.isLoadingEvents);
export const useEventPermission = (eventId: string) =>
  useCalendarStore((state) => state.userPermissions[eventId] || "read");
export const useUserPermissions = () =>
  useCalendarStore((state) => state.userPermissions);

export const useConflictedEvents = () => {
  const conflicts = useCalendarConflicts();
  const eventIds = new Set<string>();
  for (const conflict of conflicts) {
    if (!conflict.resolved_at) {
      eventIds.add(conflict.event_id_1);
      eventIds.add(conflict.event_id_2);
    }
  }
  const events = useCalendarEvents();
  return events.filter((e) => eventIds.has(e.id));
};

export const useEventConflictCount = (eventId: string) => {
  const conflicts = useCalendarConflicts();
  return conflicts.filter(
    (c) =>
      (c.event_id_1 === eventId || c.event_id_2 === eventId) && !c.resolved_at,
  ).length;
};

export const useCalendarStats = () => {
  const events = useCalendarEvents();
  const conflicts = useCalendarConflicts();
  const unresolvedConflicts = conflicts.filter((c) => !c.resolved_at);
  const criticalConflicts = unresolvedConflicts.filter(
    (c) => c.severity === "critical",
  );

  return {
    totalEvents: events.length,
    totalConflicts: conflicts.length,
    unresolvedConflicts: unresolvedConflicts.length,
    criticalConflicts: criticalConflicts.length,
    confirmedEvents: events.filter((e) => e.status === "confirmed").length,
    pendingEvents: events.filter((e) => e.status === "pending").length,
    totalGuests: events.reduce((sum, e) => sum + (e.guest_count || 0), 0),
    totalRevenue: events.reduce((sum, e) => sum + (e.revenue || 0), 0),
  };
};
