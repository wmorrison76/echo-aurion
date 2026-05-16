import React from "react";
import { osBus } from "@/lib/os-bus";
import { cn } from "@/lib/glass";
import { getOpsRole, listOpsRoles, setOpsRole } from "@/lib/ops-rbac";
import { OpsAuditPanel } from "./OpsAuditPanel";
import { appendConfirmation } from "@/lib/ops-confirmations";
import { appendAuditEntry } from "@/lib/ops-audit";
import { usePersistedScroll } from "@/lib/use-persisted-scroll";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { OpsEvent, OpsTask } from "@shared/types/ops-gantt";
import { instantiateTemplate } from "@shared/ops-gantt/templates";
import { recalculateSchedule } from "@shared/ops-gantt/recalculate";
import { computeCriticalPathAndSlack } from "@shared/ops-gantt/scheduler";

type CalendarEvent = {
  id: string;
  title?: string;
  start_time?: string;
  end_time?: string;
  // API returns 'start' and 'end' fields
  start?: string;
  end?: string;
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

function isoDate(iso: string): string | null {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  try {
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function ms(iso: string): number | null {
  const d = new Date(iso);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function minutesSinceMidnight(iso: string): number | null {
  const d = new Date(iso);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return null;
  return d.getHours() * 60 + d.getMinutes();
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
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

export function BeoOpsGanttPanel() {
  const [events, setEvents] = React.useState<CalendarEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = React.useState<string>("");
  const [selectedDate, setSelectedDate] = React.useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const userSetDateRef = React.useRef(false);
  const [scale, setScale] = React.useState<"day" | "week" | "month">("day");
  const [zoom, setZoom] = React.useState<number>(1);
  const [opsRole, setOpsRoleState] = React.useState(() => getOpsRole());
  const [showAudit, setShowAudit] = React.useState<boolean>(true);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailTask, setDetailTask] = React.useState<OpsTask | null>(null);
  const { scrollRef: mainScrollRef } = usePersistedScroll({
    storageKey: `scroll:echo-events:beo-gantt:${selectedEventId || "none"}:${selectedDate}:${scale}:${zoom}`,
    enabled: true,
  });

  // Allow deep-link from Master Ops / other modules to select the right event.
  React.useEffect(() => {
    const handler = (evt: Event) => {
      const ce = evt as unknown as CustomEvent<any>;
      const detail = ce?.detail ?? {};
      const eventId = String(detail?.eventId || "").trim();
      if (!eventId) return;
      setSelectedEventId(eventId);
      // Best-effort: keep date aligned with the event day (if known)
      const found = events.find((e) => String(e.id) === eventId);
      const startStr = found?.start_time || found?.start;
      if (startStr) {
        const d = isoDate(startStr);
        if (d) {
          userSetDateRef.current = true;
          setSelectedDate(d);
        }
      }
    };
    window.addEventListener("ops:navigate", handler as EventListener);
    return () =>
      window.removeEventListener("ops:navigate", handler as EventListener);
  }, [events]);

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
        (Array.isArray(data?.data) && data.data) ||
        (Array.isArray(data?.data?.events) && data.data.events) ||
        (Array.isArray(data?.data?.items) && data.data.items) ||
        (Array.isArray(data?.events) && data.events) ||
        (Array.isArray(data?.items) && data.items) ||
        [];

      setEvents(items);
      if (!selectedEventId && items.length > 0 && items[0]?.id) {
        setSelectedEventId(String(items[0].id));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedEventId]);

  React.useEffect(() => {
    void refetchEvents();
  }, [refetchEvents]);

  // Keep the panel reactive to new events/BEOs (same idea as Global Calendar).
  React.useEffect(() => {
    const unsubs: Array<() => void> = [];

    unsubs.push(osBus.on("calendar:event_created", () => void refetchEvents()));
    unsubs.push(osBus.on("calendar:event_updated", () => void refetchEvents()));
    unsubs.push(osBus.on("beo:created", () => void refetchEvents()));
    unsubs.push(osBus.on("beo:updated", () => void refetchEvents()));

    const handleLegacy = () => void refetchEvents();
    window.addEventListener("echo-event-created", handleLegacy);

    return () => {
      unsubs.forEach((u) => u());
      window.removeEventListener("echo-event-created", handleLegacy);
    };
  }, [refetchEvents]);

  const selectedEvent = React.useMemo(
    () => events.find((e) => String(e.id) === String(selectedEventId)) ?? null,
    [events, selectedEventId],
  );

  const { tasks, criticalSet } = React.useMemo(() => {
    if (!selectedEvent?.id)
      return { tasks: [] as OpsTask[], criticalSet: new Set<string>() };

    // Support both 'start_time'/'end_time' and 'start'/'end' field names
    const startStr = selectedEvent.start_time || selectedEvent.start;
    const endStr = selectedEvent.end_time || selectedEvent.end;
    const start = startStr ? new Date(startStr) : null;
    const end = endStr ? new Date(endStr) : null;
    const startIso =
      start && Number.isFinite(start.getTime())
        ? start.toISOString()
        : new Date().toISOString();
    const endIso =
      end && Number.isFinite(end.getTime())
        ? end.toISOString()
        : new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();

    const ev: OpsEvent = {
      eventId: String(selectedEvent.id),
      beoNumber: `BEO-${String(selectedEvent.id).slice(0, 8)}`,
      eventName: String(selectedEvent.title || "Event"),
      clientName: "Client",
      property: "Property",
      space: String(selectedEvent.location_room || "Unassigned Space"),
      eventType: eventTypeFromCode(selectedEvent.event_type_code),
      startDateTime: startIso,
      endDateTime: endIso,
      setupStart: new Date(
        new Date(startIso).getTime() - 2 * 60 * 60 * 1000,
      ).toISOString(),
      strikeEnd: new Date(
        new Date(endIso).getTime() + 60 * 60 * 1000,
      ).toISOString(),
      guestCountGuaranteed: Number(selectedEvent.guest_count || 0),
      guestCountExpected: Number(selectedEvent.guest_count || 0),
      serviceStyle: "buffet",
      status: "tentative",
      financialStatus: "deposit_due",
      priority: "P2",
      lastBEORevision: 1,
      revisionHistory: [],
      owners: {},
    };

    // BEO-only tasks: production scope explicitly excluded.
    const { tasks: raw } = instantiateTemplate({
      event: ev,
      includeProductionScope: false,
    });
    const { tasks: scheduled } = recalculateSchedule(raw, {
      shiftToSatisfyDependencies: true,
    });
    const { tasks: withSlack, criticalPathTaskIds } =
      computeCriticalPathAndSlack(scheduled);
    return { tasks: withSlack, criticalSet: new Set(criticalPathTaskIds) };
  }, [selectedEvent]);

  // Default date to earliest task day for immediate visibility.
  React.useEffect(() => {
    if (userSetDateRef.current) return;
    if (tasks.length === 0) return;
    const earliest = tasks
      .map((t) => new Date(t.start))
      .filter((d) => Number.isFinite(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())[0];
    if (!earliest) return;
    setSelectedDate(earliest.toISOString().slice(0, 10));
  }, [tasks]);

  const range = React.useMemo(() => {
    const [y, m, d] = selectedDate.split("-").map((x) => parseInt(x, 10));
    const base =
      Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)
        ? new Date(y, m - 1, d)
        : new Date();

    if (scale === "day") {
      const start = new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate(),
        0,
        0,
        0,
        0,
      ).getTime();
      const end = start + 24 * 60 * 60 * 1000;
      return { startMs: start, endMs: end, label: selectedDate };
    }

    if (scale === "week") {
      // Monday-start week
      const day = base.getDay(); // 0=Sun
      const mondayOffset = (day + 6) % 7;
      const startDate = new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate() - mondayOffset,
        0,
        0,
        0,
        0,
      );
      const start = startDate.getTime();
      const end = start + 7 * 24 * 60 * 60 * 1000;
      const label = `${startDate.toISOString().slice(0, 10)} → ${new Date(end - 1).toISOString().slice(0, 10)}`;
      return { startMs: start, endMs: end, label };
    }

    // month
    const startDate = new Date(
      base.getFullYear(),
      base.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const endDate = new Date(
      base.getFullYear(),
      base.getMonth() + 1,
      1,
      0,
      0,
      0,
      0,
    );
    const start = startDate.getTime();
    const end = endDate.getTime();
    const label = `${startDate.toISOString().slice(0, 7)}`;
    return { startMs: start, endMs: end, label };
  }, [scale, selectedDate]);

  const windowTasks = React.useMemo(() => {
    const startMs = range.startMs;
    const endMs = range.endMs;
    return tasks.filter((t) => {
      const s = ms(t.start);
      const e = ms(t.end);
      if (s === null || e === null) return false;
      return s < endMs && e > startMs;
    });
  }, [tasks, range]);

  const departments = React.useMemo(() => {
    const set = new Set<string>();
    for (const t of windowTasks) set.add(t.department);
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b));
  }, [windowTasks]);

  const dayTimeRange = React.useMemo(() => {
    // Only used for "day" scale tick labels and positioning.
    const dayOnly = tasks.filter((t) => isoDate(t.start) === selectedDate);
    if (dayOnly.length === 0) return { startMin: 6 * 60, endMin: 22 * 60 };
    const mins = dayOnly
      .flatMap((t) => [
        minutesSinceMidnight(t.start),
        minutesSinceMidnight(t.end),
      ])
      .filter((v) => v !== null) as number[];
    const min = Math.min(...mins);
    const max = Math.max(...mins);
    const startMin = Math.floor(min / 60) * 60;
    const endMin = Math.ceil(max / 60) * 60;
    return {
      startMin: clamp(startMin, 0, 24 * 60),
      endMin: clamp(Math.max(endMin, startMin + 60), 0, 24 * 60),
    };
  }, [tasks, selectedDate]);

  const timelineWidth = React.useMemo(() => {
    const days = Math.max(
      1,
      Math.ceil((range.endMs - range.startMs) / (24 * 60 * 60 * 1000)),
    );
    if (scale === "day") {
      const hours = Math.max(
        1,
        Math.round((dayTimeRange.endMin - dayTimeRange.startMin) / 60),
      );
      const hourPx = 84 * zoom;
      return Math.max(520, Math.round(hours * hourPx));
    }
    const dayPx = scale === "week" ? 160 * zoom : 70 * zoom;
    return Math.max(520, Math.round(days * dayPx));
  }, [range, scale, zoom, dayTimeRange]);

  return (
    <div className="h-full flex flex-col">
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detailTask?.title ?? "Task"}</DialogTitle>
            <DialogDescription>
              {detailTask
                ? `${detailTask.department} • ${detailTask.status} • ${Math.round(detailTask.percentComplete)}%`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="text-xs text-foreground/60">
            Shortcuts for this BEO:
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDetailOpen(false)}
              className="h-9 px-3 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedEventId) return;
                window.dispatchEvent(
                  new CustomEvent("ops:navigate", {
                    detail: { kind: "menu_item", eventId: selectedEventId },
                  }),
                );
                setDetailOpen(false);
              }}
              className="h-9 px-3 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5"
            >
              Menus
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedEventId) return;
                appendConfirmation({
                  eventId: selectedEventId,
                  beoId: `beo-${selectedEventId}`,
                  kind: "recipe.user_accepted",
                  status: "pending",
                  message:
                    "EchoAI couldn’t find existing recipe → user accepted AI generated recipe. Confirmation required.",
                  link: { kind: "recipe" },
                });
                appendAuditEntry({
                  eventId: selectedEventId,
                  beoId: `beo-${selectedEventId}`,
                  entityType: "revision",
                  entityId: selectedEventId,
                  action: "task.percent_change",
                  summary: "AI recipe accepted (Echo Events)",
                });
                setDetailOpen(false);
              }}
              className="h-9 px-3 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5"
              title="Create confirmation record"
            >
              Accept AI recipe
            </button>
            <button
              type="button"
              onClick={() => {
                if (!selectedEventId) return;
                window.dispatchEvent(
                  new CustomEvent("ops:navigate", {
                    detail: {
                      kind: "purchase_order",
                      eventId: selectedEventId,
                    },
                  }),
                );
                setDetailOpen(false);
              }}
              className="h-9 px-3 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25"
            >
              Orders
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="border-b border-border/20 bg-background/95 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-sm font-semibold text-foreground">
            BEO Gantt (Echo Events)
          </div>
          {loading && (
            <div className="text-xs text-foreground/60">Loading…</div>
          )}
          {error && <div className="text-xs text-destructive">{error}</div>}
        </div>
        <div className="flex items-center gap-2">
          {selectedEventId && (
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("open-panel", {
                    detail: {
                      id: "maestro-bqt",
                      eventId: selectedEventId,
                      beoId: `beo-${selectedEventId}`,
                    },
                  }),
                )
              }
              className="text-xs px-3 py-1.5 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
            >
              Open in Maestro BQT
            </button>
          )}
          <button
            type="button"
            onClick={() => void refetchEvents()}
            className="text-xs px-3 py-1.5 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-border/10 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-foreground/60">Event</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground min-w-[280px]"
          >
            {events.map((e) => (
              <option key={String(e.id)} value={String(e.id)}>
                {String(e.title || e.id)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-foreground/60">Anchor</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              userSetDateRef.current = true;
              setSelectedDate(e.target.value);
            }}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          />
        </div>

        <div className="text-xs text-foreground/60">
          Window: <span className="text-foreground">{range.label}</span> •{" "}
          <span className="text-foreground">{windowTasks.length}</span> tasks •
          BEO-scope only (production excluded)
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={opsRole}
            onChange={(e) => {
              const next = e.target.value as any;
              setOpsRole(next);
              setOpsRoleState(next);
            }}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            title="Ops role (RBAC demo)"
          >
            {listOpsRoles().map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowAudit((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            {showAudit ? "Hide audit" : "Show audit"}
          </button>

          <div className="inline-flex rounded-md border border-border/30 overflow-hidden">
            {(["day", "week", "month"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScale(s)}
                className={cn(
                  "px-3 py-1.5 text-xs transition-colors",
                  scale === s
                    ? "bg-primary/20 text-primary"
                    : "bg-background text-foreground/70 hover:text-foreground",
                )}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="inline-flex rounded-md border border-border/30 overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setZoom((z) =>
                  clamp(Math.round((z - 0.25) * 100) / 100, 0.5, 2.5),
                )
              }
              className="px-2 py-1.5 text-xs bg-background text-foreground/70 hover:text-foreground"
              title="Zoom out"
            >
              −
            </button>
            <div className="px-2 py-1.5 text-[11px] bg-background text-foreground/60">
              {Math.round(zoom * 100)}%
            </div>
            <button
              type="button"
              onClick={() =>
                setZoom((z) =>
                  clamp(Math.round((z + 0.25) * 100) / 100, 0.5, 2.5),
                )
              }
              className="px-2 py-1.5 text-xs bg-background text-foreground/70 hover:text-foreground"
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {showAudit && selectedEventId ? (
        <div className="px-3 pb-3">
          <OpsAuditPanel eventId={selectedEventId} />
        </div>
      ) : null}

      <div ref={mainScrollRef as any} className="flex-1 overflow-auto p-3">
        {windowTasks.length === 0 ? (
          <div className="p-6 text-sm text-foreground/60">
            No BEO tasks in this window.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="rounded-md border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
              <div className="px-2 py-1.5 border-b border-border/10 text-[11px] text-foreground/70 flex items-center justify-between">
                <div>Timeline</div>
                <div className="text-[11px] text-foreground/50">
                  scroll horizontally to pan
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="relative" style={{ width: timelineWidth }}>
                  {/* Ticks */}
                  {scale === "day" ? (
                    <div className="flex h-6 border-b border-border/10 bg-background/30">
                      {(() => {
                        const step = 60; // minutes
                        const cols = Math.max(
                          1,
                          Math.floor(
                            (dayTimeRange.endMin - dayTimeRange.startMin) /
                              step,
                          ),
                        );
                        const colWidth = timelineWidth / cols;
                        const labels: React.ReactNode[] = [];
                        for (let i = 0; i <= cols; i++) {
                          const min = dayTimeRange.startMin + i * step;
                          const hour = Math.floor(min / 60);
                          labels.push(
                            <div
                              key={i}
                              className="h-full border-l border-border/10 flex items-center px-1 text-[10px] text-foreground/50"
                              style={{ width: colWidth }}
                            >
                              {String(hour).padStart(2, "0")}:00
                            </div>,
                          );
                        }
                        return labels;
                      })()}
                    </div>
                  ) : (
                    <div className="flex h-6 border-b border-border/10 bg-background/30">
                      {(() => {
                        const days = Math.max(
                          1,
                          Math.ceil(
                            (range.endMs - range.startMs) /
                              (24 * 60 * 60 * 1000),
                          ),
                        );
                        const colWidth = timelineWidth / days;
                        const labels: React.ReactNode[] = [];
                        for (let i = 0; i < days; i++) {
                          const d = new Date(
                            range.startMs + i * 24 * 60 * 60 * 1000,
                          );
                          labels.push(
                            <div
                              key={i}
                              className="h-full border-l border-border/10 flex items-center px-1 text-[10px] text-foreground/50"
                              style={{ width: colWidth }}
                            >
                              {d.toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </div>,
                          );
                        }
                        return labels;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {departments.map((dept) => {
              const lane = windowTasks.filter((t) => t.department === dept);
              return (
                <div
                  key={dept}
                  className="rounded-md border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden"
                >
                  <div className="px-2 py-1.5 border-b border-border/10 text-xs font-semibold text-foreground">
                    {dept.toUpperCase()}
                  </div>
                  <div className="overflow-x-auto">
                    <div
                      className="p-2 space-y-1"
                      style={{ width: timelineWidth }}
                    >
                      {lane.map((t) => {
                        const sMs = ms(t.start);
                        const eMs = ms(t.end);
                        if (sMs === null || eMs === null) return null;

                        const critical = criticalSet.has(t.taskId);

                        // Compute offset in the current window
                        const leftMs =
                          scale === "day"
                            ? (() => {
                                const sMin =
                                  minutesSinceMidnight(t.start) ??
                                  dayTimeRange.startMin;
                                return (
                                  (clamp(
                                    sMin,
                                    dayTimeRange.startMin,
                                    dayTimeRange.endMin,
                                  ) -
                                    dayTimeRange.startMin) *
                                  60_000
                                );
                              })()
                            : clamp(sMs, range.startMs, range.endMs) -
                              range.startMs;

                        const rightMs =
                          scale === "day"
                            ? (() => {
                                const eMin =
                                  minutesSinceMidnight(t.end) ??
                                  (minutesSinceMidnight(t.start) ??
                                    dayTimeRange.startMin) +
                                    Math.max(15, t.durationMinutes);
                                return (
                                  (clamp(
                                    eMin,
                                    dayTimeRange.startMin,
                                    dayTimeRange.endMin,
                                  ) -
                                    dayTimeRange.startMin) *
                                  60_000
                                );
                              })()
                            : clamp(eMs, range.startMs, range.endMs) -
                              range.startMs;

                        const spanMs =
                          scale === "day"
                            ? Math.max(
                                60_000,
                                (dayTimeRange.endMin - dayTimeRange.startMin) *
                                  60_000,
                              )
                            : Math.max(60_000, range.endMs - range.startMs);

                        const leftPx = (leftMs / spanMs) * timelineWidth;
                        const widthPx = clamp(
                          ((rightMs - leftMs) / spanMs) * timelineWidth,
                          10,
                          timelineWidth,
                        );

                        return (
                          <button
                            key={t.taskId}
                            type="button"
                            onClick={() => {
                              setDetailTask(t);
                              setDetailOpen(true);
                            }}
                            className="relative h-7 rounded bg-foreground/5 border border-border/20 w-full text-left hover:bg-foreground/[0.06] transition-colors"
                            title="Task actions"
                          >
                            <div
                              className={cn(
                                "absolute inset-y-0 rounded-sm border border-border/30 bg-primary/20 text-[11px] text-foreground",
                                critical && "ring-1 ring-primary/40",
                              )}
                              style={{
                                left: `${leftPx}px`,
                                width: `${widthPx}px`,
                              }}
                            >
                              <div className="h-full px-2 flex items-center truncate">
                                {t.title}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
