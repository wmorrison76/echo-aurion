import React from "react";
import { osBus } from "@/lib/os-bus";
import { MasterOpsGantt } from "@/modules/MaestroBQT/components/MasterOpsGantt";
import type { Event, Space } from "@/modules/MaestroBQT/types";

type CalendarEvent = {
  id: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  guest_count?: number;
  status?: string;
  event_type_code?: string;
  location_room?: string;
  department?: string;
};

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
  if (alt) return alt;
  return "default";
}

function mapStatus(s?: string): Event["status"] {
  const v = String(s || "").toLowerCase();
  if (v.includes("cancel")) return "canceled";
  if (v.includes("complete")) return "completed";
  if (v.includes("tent")) return "tentative";
  return "definite";
}

function eventTypeFromCode(code?: string): string {
  const c = String(code || "")
    .toUpperCase()
    .trim();
  if (c === "WED") return "wedding";
  if (c === "COR") return "conference";
  if (c === "BAN") return "banquet";
  if (c === "SEM") return "seminar";
  return "banquet";
}

export function MasterOpsPanel() {
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refetchEvents = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/calendar/events", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Org-ID": getOrgIdForRequest(),
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items: CalendarEvent[] =
        (Array.isArray(data?.data?.events) && data.data.events) ||
        (Array.isArray(data?.events) && data.events) ||
        [];
      setEvents(items);
    } catch (e: any) {
      setError(e?.message ? String(e.message) : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refetchEvents();
  }, [refetchEvents]);

  React.useEffect(() => {
    const unsubs: Array<() => void> = [];
    unsubs.push(osBus.on("calendar:event_created", () => void refetchEvents()));
    unsubs.push(osBus.on("calendar:event_updated", () => void refetchEvents()));
    unsubs.push(osBus.on("beo:created", () => void refetchEvents()));
    unsubs.push(osBus.on("beo:updated", () => void refetchEvents()));
    const handleLegacy = () => void refetchEvents();
    window.addEventListener(
      "echo-event-created",
      handleLegacy as EventListener,
    );
    window.addEventListener(
      "echo-event-updated",
      handleLegacy as EventListener,
    );
    return () => {
      unsubs.forEach((u) => u());
      window.removeEventListener(
        "echo-event-created",
        handleLegacy as EventListener,
      );
      window.removeEventListener(
        "echo-event-updated",
        handleLegacy as EventListener,
      );
    };
  }, [refetchEvents]);

  const mappedEvents = React.useMemo<Event[]>(() => {
    return events
      .map((e) => {
        const start = String(e.start_time || "");
        const end = String(e.end_time || "");
        if (!start || !end) return null;
        const room = String(e.location_room || "").trim();
        const guest = Number(e.guest_count || 0);
        const evt: Event = {
          id: String(e.id),
          name: String(e.title || e.id),
          status: mapStatus(e.status),
          guestCountCurrent: guest,
          guestCountExpected: guest,
          startDateTime: start,
          endDateTime: end,
          spaceIds: room ? [room] : [],
          departmentIds: [],
          metadata: {
            beoNumber: `BEO-${e.id}`,
            eventType: eventTypeFromCode(e.event_type_code),
            space: room || undefined,
          },
        };
        return evt;
      })
      .filter(Boolean) as Event[];
  }, [events]);

  const spaces = React.useMemo<Space[]>(() => [], []);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border/20 bg-background/95 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-foreground">
            Master Ops
          </div>
          {loading && (
            <div className="text-xs text-foreground/60">Loading…</div>
          )}
          {error && <div className="text-xs text-destructive">{error}</div>}
        </div>
        <button
          type="button"
          onClick={() => void refetchEvents()}
          className="text-xs px-3 py-1.5 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <MasterOpsGantt
          events={mappedEvents}
          spaces={spaces}
          daysAhead={30}
          scope="beo"
          scrollKey="echo-events:master-ops"
          onTaskClick={(task) => {
            // Route user into BEO Gantt; panel host decides tab.
            window.dispatchEvent(
              new CustomEvent("ops:navigate", {
                detail: { eventId: task.eventId },
              }),
            );
          }}
        />
      </div>
    </div>
  );
}
