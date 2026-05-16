/**
 * GlobalCalendarView
 *
 * Main calendar view for the Global Calendar module.
 * IMPORTANT: This module is panel-loaded, so it must be self-initializing:
 * - loads outlets into the calendar store
 * - selects outlets by default
 * - fetches events
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/glass";
import type { CalendarEvent, CalendarOutlet } from "@/types/calendar";
import {
  useCalendarStore,
  useSelectedDate,
  useCalendarOutlets,
} from "../stores/useCalendarStore";
import { useCalendarEvents as useFetchCalendarEvents } from "../hooks/useCalendarEvents";
import { useConflictDetection } from "../hooks/useConflictDetection";

import CalendarHeader from "./CalendarHeader";
import EnhancedCalendarGrid from "./EnhancedCalendarGrid";
import DayDrillDownModal from "./DayDrillDownModal";
import { DayCalendarView } from "@/components/calendar/DayCalendarView";
import { WeekCalendarView } from "@/components/calendar/WeekCalendarView";

interface GlobalCalendarViewProps {
  onEventClick?: (event: CalendarEvent) => void;
  onAddEvent?: () => void;
  onSettings?: () => void;
  onCreateOutlet?: () => void;
  onShowConflicts?: () => void;
  containerClassName?: string;
}

function getOrgIdForRequest(): string {
  if (typeof window === "undefined") return "default";
  const orgRaw = localStorage.getItem("auth_org");
  if (orgRaw) {
    try {
      const parsed = JSON.parse(orgRaw);
      const id = String(parsed?.id || "").trim();
      if (id) return id;
    } catch {
      // ignore
    }
  }
  const userRaw = localStorage.getItem("auth_user");
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw);
      const id = String(parsed?.org_id || "").trim();
      if (id) return id;
    } catch {
      // ignore
    }
  }
  const alt = String(localStorage.getItem("orgId") || "").trim();
  return alt || "default";
}

function isoDateLocal(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export const GlobalCalendarView: React.FC<GlobalCalendarViewProps> = ({
  onEventClick,
  onAddEvent,
  onSettings,
  onCreateOutlet,
  onShowConflicts,
  containerClassName,
}) => {
  const selectedDate = useSelectedDate();
  const outlets = useCalendarOutlets();
  const viewMode = useCalendarStore((s) => s.viewMode);
  const toggleEventExpansion = useCalendarStore((s) => s.toggleEventExpansion);
  const selectedOutlets = useCalendarStore((s) => s.selectedOutlets);
  const setSelectedOutlets = useCalendarStore((s) => s.setSelectedOutlets);

  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const [drillDate, setDrillDate] = useState<string | null>(null);

  // iter167: Right-click on a day cell dispatches this event → opens drill modal
  useEffect(() => {
    const onDrill = (e: Event) => {
      const ce = e as CustomEvent<{ date: string }>;
      if (ce?.detail?.date) setDrillDate(ce.detail.date);
    };
    window.addEventListener("global-calendar:day-drill", onDrill);
    return () => window.removeEventListener("global-calendar:day-drill", onDrill);
  }, []);

  // Fetch events with filters (uses store.selectedOutlets + store.selectedDate)
  const { events, isLoading, error } = useFetchCalendarEvents({
    autoFetch: true,
    debounceMs: 250,
  });

  // Detect conflicts across selected outlets
  const { summary: conflictSummary } = useConflictDetection({
    autoDetect: true,
    pollIntervalMs: 30000,
    includeAllOutlets: true,
  });

  const calendarDate = useMemo(() => {
    // Use local date parsing to avoid timezone drift
    if (!selectedDate) return new Date();
    const [y, m, d] = selectedDate.split("-").map((n) => Number(n));
    if (!y || !m || !d) return new Date();
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  const normalizedEvents = useMemo(
    () => events.map((e) => ({ ...e, status: e.status || "pending" })),
    [events],
  );

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      toggleEventExpansion(event.id);
      onEventClick?.(event);
    },
    [toggleEventExpansion, onEventClick],
  );

  const handleDateClick = useCallback((date: Date) => {
    useCalendarStore.setState({ selectedDate: isoDateLocal(date) });
  }, []);

  // Boot: load outlets and select defaults
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setBooting(true);
        setBootError(null);

        const orgId = getOrgIdForRequest();
        const res = await fetch("/api/calendar/outlets", {
          method: "GET",
          headers: { "Content-Type": "application/json", "X-Org-ID": orgId },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(
            json?.error || `Outlets request failed: ${res.status}`,
          );

        const list = Array.isArray(json?.data)
          ? (json.data as CalendarOutlet[])
          : [];
        if (!cancelled) {
          useCalendarStore.setState({ outlets: list });
          // If no selection yet, select all non-archived outlets (or all)
          if (
            (useCalendarStore.getState().selectedOutlets || []).length === 0
          ) {
            const ids = list
              .filter((o) => !(o as any).is_archived)
              .map((o) => o.id);
            setSelectedOutlets(ids);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setBootError(
            e instanceof Error ? e.message : "Failed to initialize calendar",
          );
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSelectedOutlets]);

  // If outlets loaded and nothing selected, select all (covers persisted empty selections)
  useEffect(() => {
    if (outlets.length > 0 && selectedOutlets.length === 0) {
      setSelectedOutlets(
        outlets.filter((o) => !(o as any).is_archived).map((o) => o.id),
      );
    }
  }, [outlets, selectedOutlets, setSelectedOutlets]);

  return (
    <div
      className={cn(
        "h-full w-full bg-background text-foreground p-4 flex flex-col min-h-0",
        containerClassName,
      )}
    >
      <CalendarHeader
        onAddEvent={onAddEvent}
        onSettings={onSettings}
        onCreateOutlet={onCreateOutlet}
        showOutletSelector={true}
      />

      {bootError ? (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
          <p className="text-sm text-red-900 dark:text-red-100">
            Calendar init error: {bootError}
          </p>
        </div>
      ) : null}

      {booting ? (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            Loading calendars…
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
          <p className="text-sm text-red-900 dark:text-red-100">
            Error loading events: {error.message}
          </p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            Loading events…
          </p>
        </div>
      ) : null}

      {outlets.length === 0 && !booting ? (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            No outlets found. Create an outlet in Calendar Admin to start
            scheduling.
          </p>
        </div>
      ) : null}

      <div className="flex-1 overflow-hidden min-h-0">
        {viewMode === "month" ? (
          <EnhancedCalendarGrid
            date={calendarDate}
            onEventClick={handleEventClick}
            onDateClick={handleDateClick}
            selectedDate={selectedDate}
            showOutletIndicators={true}
            highlightConflicts={true}
          />
        ) : viewMode === "week" ? (
          <WeekCalendarView
            date={calendarDate}
            events={normalizedEvents as any[]}
            onEventClick={handleEventClick}
          />
        ) : (
          <DayCalendarView
            date={calendarDate}
            events={normalizedEvents as any[]}
            onEventClick={handleEventClick}
          />
        )}
      </div>

      {conflictSummary.total > 0 ? (
        <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-between rounded-lg">
          <span className="text-xs text-amber-900 dark:text-amber-100">
            {conflictSummary.critical > 0 ? (
              <span className="font-bold mr-2">
                {conflictSummary.critical} critical conflict
                {conflictSummary.critical !== 1 ? "s" : ""}
              </span>
            ) : null}
            {conflictSummary.warning > 0 ? (
              <span className="mr-2">
                {conflictSummary.warning} warning
                {conflictSummary.warning !== 1 ? "s" : ""}
              </span>
            ) : null}
          </span>
          {onShowConflicts ? (
            <button
              onClick={onShowConflicts}
              className="text-xs font-medium text-primary dark:text-blue-400 hover:underline"
            >
              Review Conflicts →
            </button>
          ) : null}
        </div>
      ) : null}

      {drillDate && (
        <DayDrillDownModal dateStr={drillDate} onClose={() => setDrillDate(null)} />
      )}
    </div>
  );
};

export default GlobalCalendarView;
