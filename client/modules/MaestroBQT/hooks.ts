/**
 * MaestroBQT Hooks
 * React hooks for data management and event subscription
 */

// CRITICAL: Use window.React (set by react-shim) to avoid null import issues
// During dynamic module loading, direct imports can be null, but window.React is reliable
// react-shim.ts ensures React is available globally before any module loads
// NOTE: This must run at module load time (before hooks are called)

// CRITICAL: Import React normally - Vite will handle it correctly
// SIMPLIFIED: Just use the import - no complex initialization that might fail at module load time
import React from "react";

// Use React methods directly - always call React.useState, React.useEffect, etc.

import type {
  Event,
  Space,
  Task,
  Change,
  Shortage,
  Financial,
  Conflict,
} from "./types";
import { osBus } from "@/lib/os-bus";
import maestroApi from "./api";
import maestroEventBus from "./event-bus";

/**
 * Load all data with error handling and fallbacks
 */
export function useMaestroData() {
  const [events, setEvents] = React.useState<Event[]>([]);
  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [changes, setChanges] = React.useState<Change[]>([]);
  const [shortages, setShortages] = React.useState<Shortage[]>([]);
  const [financials, setFinancials] = React.useState<Financial[]>([]);
  const [conflicts, setConflicts] = React.useState<Conflict[]>([]);
  // `loading` should only be true for the initial load; refreshes should be "soft"
  // to avoid unmounting the UI (scroll resets / negative UX).
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const hasLoadedRef = React.useRef(false);

  const loadData = React.useCallback(async () => {
    try {
      // Initial load: show loading. Subsequent refreshes: keep UI stable.
      if (hasLoadedRef.current) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const data = await maestroApi.fetchAll();

      setEvents(data.events.data);
      setSpaces(data.spaces.data);
      setTasks(data.tasks.data);
      setChanges(data.changes.data);
      setShortages(data.shortages.data);
      setFinancials(data.financials.data);
      setConflicts(data.conflicts.data);
      hasLoadedRef.current = true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load data";
      setError(message);
      console.error("[useMaestroData] Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const upsertFromCalendarSnapshot = React.useCallback((rawEvent: any) => {
    if (!rawEvent || typeof rawEvent !== "object") return;
    const eventId = String(
      (rawEvent as any).id ??
        (rawEvent as any).eventId ??
        (rawEvent as any).event_id ??
        "",
    ).trim();
    if (!eventId) return;

    const titleRaw = String(
      (rawEvent as any).title ??
        (rawEvent as any).name ??
        (rawEvent as any).eventName ??
        "",
    ).trim();
    const name = titleRaw || `event-${eventId}`;

    const startDateTime = String(
      (rawEvent as any).start_time ??
        (rawEvent as any).startDateTime ??
        (rawEvent as any).start ??
        "",
    ).trim();
    const endDateTime = String(
      (rawEvent as any).end_time ??
        (rawEvent as any).endDateTime ??
        (rawEvent as any).end ??
        "",
    ).trim();

    const guestCountRaw =
      (rawEvent as any).guest_count ??
      (rawEvent as any).guestCountExpected ??
      (rawEvent as any).guestCount ??
      (rawEvent as any).capacity ??
      0;
    const guestCount = Math.max(
      0,
      Number.isFinite(Number(guestCountRaw)) ? Number(guestCountRaw) : 0,
    );

    const statusRaw = String((rawEvent as any).status ?? "")
      .toLowerCase()
      .trim();
    const status: Event["status"] =
      statusRaw === "possible"
        ? "tentative"
        : statusRaw === "pending"
          ? "definite"
          : statusRaw === "tentative" ||
              statusRaw === "definite" ||
              statusRaw === "in_house" ||
              statusRaw === "completed"
            ? (statusRaw as Event["status"])
            : statusRaw === "cancelled" || statusRaw === "canceled"
              ? "canceled"
              : "definite";

    const departmentRaw = String((rawEvent as any).department ?? "").trim();
    const departmentIds = departmentRaw
      ? [departmentRaw.toLowerCase().replace(/\s+/g, "_")]
      : [];

    const typeCode = String(
      (rawEvent as any).event_type_code ??
        (rawEvent as any).eventTypeCode ??
        (rawEvent as any).eventType ??
        "",
    )
      .toUpperCase()
      .trim();
    const eventType =
      typeCode === "WED"
        ? "wedding"
        : typeCode === "COR"
          ? "conference"
          : typeCode === "BAN"
            ? "banquet"
            : typeCode === "SEM"
              ? "seminar"
              : String(
                  (rawEvent as any).type ??
                    (rawEvent as any).eventType ??
                    departmentRaw ??
                    "banquet",
                ).toLowerCase();

    const spaceName = String(
      (rawEvent as any).location_room ??
        (rawEvent as any).space ??
        (rawEvent as any).venue ??
        "",
    ).trim();
    const spaceSlug = spaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "");
    const spaceId = spaceSlug ? `space-${spaceSlug}` : "";

    if (spaceId && spaceName) {
      setSpaces((prev) => {
        if (prev.some((s) => s.id === spaceId)) return prev;
        const capRaw =
          (rawEvent as any).max_capacity ??
          (rawEvent as any).capacity ??
          guestCount ??
          0;
        const capacity = Math.max(
          0,
          Number.isFinite(Number(capRaw)) ? Number(capRaw) : 0,
        );
        const next: Space = {
          id: spaceId,
          name: spaceName,
          type: "room",
          isActive: true,
          capacity,
          metadata: { source: "calendar", raw: rawEvent },
        };
        return [next, ...prev];
      });
    }

    const nextEvent: Event = {
      id: eventId,
      name,
      status,
      guestCountCurrent: guestCount,
      guestCountExpected: guestCount,
      startDateTime,
      endDateTime,
      spaceIds: spaceId ? [spaceId] : [],
      departmentIds,
      metadata: {
        source: "calendar",
        eventType,
        serviceStyle:
          (rawEvent as any).service_style ?? (rawEvent as any).serviceStyle,
        property: (rawEvent as any).property ?? (rawEvent as any).venueProperty,
        beoNumber: (rawEvent as any).beo_number ?? (rawEvent as any).beoNumber,
        raw: rawEvent,
      },
    };

    setEvents((prev) => {
      const idx = prev.findIndex((e) => e.id === eventId);
      if (idx === -1) return [nextEvent, ...prev];
      const copy = prev.slice();
      copy[idx] = {
        ...copy[idx],
        ...nextEvent,
        metadata: {
          ...(copy[idx].metadata || {}),
          ...(nextEvent.metadata || {}),
        },
      };
      return copy;
    });
  }, []);

  React.useEffect(() => {
    loadData();

    // Reload data every 30 seconds
    const interval = setInterval(loadData, 30 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Real-time updates (like Global Calendar): update instantly on new event/BEO signals.
  React.useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(
      osBus.on("calendar:event_created", (payload) => {
        const raw = (payload as any)?.event;
        if (raw) {
          upsertFromCalendarSnapshot(raw);
          return;
        }
        void loadData();
      }),
    );

    unsubs.push(
      osBus.on("calendar:event_updated", (payload) => {
        const raw = (payload as any)?.event;
        if (raw) {
          upsertFromCalendarSnapshot(raw);
          return;
        }
        void loadData();
      }),
    );

    unsubs.push(osBus.on("beo:created", () => void loadData()));
    unsubs.push(osBus.on("beo:updated", () => void loadData()));
    unsubs.push(osBus.on("maestro:event_received", () => void loadData()));

    const handleEchoEventCreated = (evt: Event) => {
      const ce = evt as unknown as CustomEvent<any>;
      const raw = ce?.detail?.event ?? ce?.detail;
      if (raw) {
        upsertFromCalendarSnapshot(raw);
        return;
      }
      void loadData();
    };

    window.addEventListener(
      "echo-event-created",
      handleEchoEventCreated as EventListener,
    );

    return () => {
      unsubs.forEach((u) => u());
      window.removeEventListener(
        "echo-event-created",
        handleEchoEventCreated as EventListener,
      );
    };
  }, [loadData, upsertFromCalendarSnapshot]);

  return {
    events,
    spaces,
    tasks,
    changes,
    shortages,
    financials,
    conflicts,
    loading,
    refreshing,
    error,
    refetch: loadData,
  };
}

/**
 * Subscribe to specific event types
 */
export function useEventBusSubscription(eventType: string | string[]) {
  const [lastEvent, setLastEvent] = React.useState<any>(null);
  const unsubscribeRef = React.useRef<(() => void)[]>([]);

  React.useEffect(() => {
    const types = Array.isArray(eventType) ? eventType : [eventType];

    types.forEach((type) => {
      const unsub = maestroEventBus.subscribeTo(type, (data) => {
        setLastEvent({ type, data, timestamp: Date.now() });
      });
      unsubscribeRef.current.push(unsub);
    });

    return () => {
      unsubscribeRef.current.forEach((unsub) => unsub());
      unsubscribeRef.current = [];
    };
  }, [eventType]);

  return lastEvent;
}

/**
 * Listen for event updates and refetch specific data
 */
export function useEventUpdates(refetch: () => void) {
  React.useEffect(() => {
    const unsub = maestroEventBus.subscribeTo("EVENT_UPDATED", () => {
      refetch();
    });

    return unsub;
  }, [refetch]);
}

/**
 * Listen for conflict detection
 */
export function useConflictDetection() {
  const [conflicts, setConflicts] = React.useState<string[]>([]);

  React.useEffect(() => {
    const conflictTypes = [
      "SPACE_CONFLICT_DETECTED",
      "SCHEDULE_CONFLICT_DETECTED",
      "STAFFING_CONFLICT",
      "PRODUCTION_CONFLICT",
      "HVAC_CONFLICT_DETECTED",
      "MARGIN_RISK_DETECTED",
    ];

    const unsubscribers = conflictTypes.map((type) =>
      maestroEventBus.subscribeTo(type, (data) => {
        setConflicts((prev) =>
          [...prev, `${type}: ${JSON.stringify(data)}`].slice(-10),
        );
      }),
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, []);

  return conflicts;
}

/**
 * Track loading state across multiple data operations
 */
export function useLoadingState(initialState = false) {
  const [loading, setLoading] = React.useState(initialState);

  const withLoading = React.useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    try {
      await fn();
    } catch (err) {
      console.error("Error during operation:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, withLoading, setLoading };
}

/**
 * Filter events by date range
 */
export function useEventsByDateRange(
  events: Event[],
  startDate: Date,
  endDate: Date,
) {
  return events.filter((event) => {
    const eventStart = new Date(event.startDateTime);
    return eventStart >= startDate && eventStart <= endDate;
  });
}

/**
 * Get events by space
 */
export function useEventsBySpace(events: Event[], spaceId: string) {
  return events.filter((event) => event.spaceIds.includes(spaceId));
}

/**
 * Get tasks by department
 */
export function useTasksByDepartment(tasks: Task[], department: string) {
  return tasks.filter((task) => task.department === department);
}

/**
 * Get shortages by severity
 */
export function useShortagesBySeverity(
  shortages: Shortage[],
  severity: string,
) {
  return shortages.filter((shortage) => shortage.severity === severity);
}

/**
 * Calculate critical metrics
 */
export function useMetricsCalculation(
  events: Event[],
  financials: Financial[],
) {
  return {
    totalEvents: events.length,
    totalRevenue: financials.reduce((sum, f) => sum + f.projectedRevenue, 0),
    averageMargin:
      financials.length > 0
        ? financials.reduce((sum, f) => sum + f.margin_percentage, 0) /
          financials.length
        : 0,
    totalGuests: events.reduce((sum, e) => sum + e.guestCountExpected, 0),
    averageRiskScore:
      financials.length > 0
        ? financials.reduce((sum, f) => sum + f.riskScore, 0) /
          financials.length
        : 0,
  };
}
