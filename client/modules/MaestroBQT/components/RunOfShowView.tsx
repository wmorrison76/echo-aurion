import React from "react";
import { cn } from "@/lib/glass";
import type { Event, Space } from "../types";
import type { OpsTask } from "@shared/types/ops-gantt";
import { downloadTextFile } from "@/lib/genesis/device/orderGuides/download";
import { usePersistedViewState } from "@/lib/use-persisted-view-state";
import { deriveOpsForEvent } from "../lib/derived-ops-cache";

function ms(iso: string): number | null {
  const d = new Date(iso);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function isoDate(iso: string): string | null {
  const d = new Date(iso);
  const t = d.getTime();
  if (!Number.isFinite(t)) return null;
  try {
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n"))
    return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function tasksToCsv(tasks: OpsTask[]): string {
  const header = [
    "eventId",
    "taskId",
    "scope",
    "department",
    "title",
    "start",
    "end",
    "status",
  ].join(",");
  const lines = tasks.map((t) =>
    [
      csvEscape(t.eventId),
      csvEscape(t.taskId),
      csvEscape(t.scope),
      csvEscape(t.department),
      csvEscape(t.title),
      csvEscape(t.start),
      csvEscape(t.end),
      csvEscape(t.status),
    ].join(","),
  );
  return [header, ...lines].join("\n");
}

function tasksToDepartmentSheets(tasks: OpsTask[]): string {
  const byDept = new Map<string, OpsTask[]>();
  for (const t of tasks) {
    const key = t.department || "Unknown";
    const arr = byDept.get(key) ?? [];
    arr.push(t);
    byDept.set(key, arr);
  }

  const depts = Array.from(byDept.keys()).sort((a, b) => a.localeCompare(b));
  const chunks: string[] = [];
  for (const dept of depts) {
    const list = (byDept.get(dept) ?? [])
      .slice()
      .sort((a, b) => (ms(a.start) ?? 0) - (ms(b.start) ?? 0));
    chunks.push(`## ${dept.toUpperCase()}`);
    for (const t of list) {
      chunks.push(`- ${fmtTime(t.start)} — ${t.title} (${t.scope})`);
    }
    chunks.push("");
  }
  return chunks.join("\n");
}

function milestonesToIcs(params: {
  calendarName: string;
  eventTitle: string;
  milestones: Array<{ title: string; at: string }>;
}): string {
  const toIcsDate = (iso: string) => {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return null;
    // UTC format YYYYMMDDTHHMMSSZ
    return d
      .toISOString()
      .replaceAll("-", "")
      .replaceAll(":", "")
      .replace(".000Z", "Z");
  };

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//LUCCCA//MaestroBQT//EN");
  lines.push(`X-WR-CALNAME:${params.calendarName}`);

  for (const m of params.milestones) {
    const dt = toIcsDate(m.at);
    if (!dt) continue;
    const uid = `${params.eventTitle}-${m.title}-${dt}`.replaceAll(" ", "_");
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${toIcsDate(new Date().toISOString())}`);
    lines.push(`DTSTART:${dt}`);
    lines.push(`DTEND:${dt}`);
    lines.push(`SUMMARY:${params.eventTitle} • ${m.title}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function RunOfShowView({
  events,
  spaces,
}: {
  events: Event[];
  spaces: Space[];
}) {
  const spacesById = React.useMemo(
    () => new Map(spaces.map((s) => [s.id, s])),
    [spaces],
  );
  const [viewState, setViewState] = usePersistedViewState<{
    selectedEventId: string;
    showtimeMode: boolean;
    confirmedByEvent: Record<string, Record<string, boolean>>;
  }>({
    key: "view:maestro-bqt:run-of-show",
    defaultValue: {
      selectedEventId: String(events?.[0]?.id ?? ""),
      showtimeMode: false,
      confirmedByEvent: {},
    },
  });

  const selectedEventId = viewState.selectedEventId;
  const showtimeMode = Boolean(viewState.showtimeMode);
  const confirmed = viewState.confirmedByEvent?.[selectedEventId] ?? {};

  const setSelectedEventId = (next: string) =>
    setViewState((s) => ({ ...s, selectedEventId: next }));
  const setShowtimeMode = (next: boolean) =>
    setViewState((s) => ({ ...s, showtimeMode: next }));
  const setConfirmed = (
    updater:
      | Record<string, boolean>
      | ((prev: Record<string, boolean>) => Record<string, boolean>),
  ) =>
    setViewState((s) => {
      const prev = s.confirmedByEvent?.[selectedEventId] ?? {};
      const next =
        typeof updater === "function" ? (updater as any)(prev) : updater;
      return {
        ...s,
        confirmedByEvent: {
          ...(s.confirmedByEvent || {}),
          [selectedEventId]: next,
        },
      };
    });

  React.useEffect(() => {
    const exists = (events || []).some(
      (e) => String(e.id) === String(selectedEventId),
    );
    if (exists) return;
    if (events.length > 0) setSelectedEventId(String(events[0].id));
  }, [events, selectedEventId]);

  const selectedEvent = React.useMemo(
    () => events.find((e) => String(e.id) === String(selectedEventId)) ?? null,
    [events, selectedEventId],
  );

  const derived = React.useMemo(() => {
    if (!selectedEvent)
      return {
        tasks: [] as OpsTask[],
        milestones: [] as Array<{ title: string; at: string }>,
      };

    const startMs = ms(selectedEvent.startDateTime);
    const endMs = ms(selectedEvent.endDateTime);
    if (startMs === null || endMs === null)
      return {
        tasks: [] as OpsTask[],
        milestones: [] as Array<{ title: string; at: string }>,
      };
    const derived = deriveOpsForEvent({
      event: selectedEvent,
      spacesById,
      includeProductionScope: true,
    });

    const dayKey = isoDate(selectedEvent.startDateTime);
    const filtered = derived.tasks.filter((t) => {
      const d = isoDate(t.start);
      return dayKey ? d === dayKey : true;
    });

    filtered.sort((a, b) => (ms(a.start) ?? 0) - (ms(b.start) ?? 0));
    const milestones = (derived.milestones || []).map((m) => ({
      title: m.title,
      at: m.at,
    }));
    return { tasks: filtered, milestones };
  }, [selectedEvent, spacesById]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border/20 bg-background/95 px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">Run-of-Show</div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-foreground/60">Event</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground min-w-[280px]"
          >
            {(events || []).map((e) => (
              <option key={String(e.id)} value={String(e.id)}>
                {e.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() =>
              downloadTextFile(
                `run-of-show-${selectedEventId || "event"}.csv`,
                tasksToCsv(derived.tasks),
              )
            }
            className="text-xs px-3 py-1.5 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
            title="Export tasks CSV"
          >
            CSV
          </button>

          <button
            type="button"
            onClick={() =>
              downloadTextFile(
                `dept-sheets-${selectedEventId || "event"}.txt`,
                tasksToDepartmentSheets(derived.tasks),
              )
            }
            className="text-xs px-3 py-1.5 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
            title="Export department task sheets (text)"
          >
            Dept sheets
          </button>

          <button
            type="button"
            onClick={() => {
              if (!selectedEvent) return;
              const ics = milestonesToIcs({
                calendarName: "Maestro BQT Milestones",
                eventTitle: selectedEvent.name || selectedEvent.id,
                milestones: derived.milestones,
              });
              downloadTextFile(
                `milestones-${selectedEventId || "event"}.ics`,
                ics,
              );
            }}
            className="text-xs px-3 py-1.5 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
            title="Export milestones (.ics)"
          >
            ICS
          </button>

          <button
            type="button"
            onClick={() => {
              if (!selectedEvent) return;
              const payload = {
                generatedAt: new Date().toISOString(),
                event: selectedEvent,
                runOfShow: derived.tasks,
                milestones: derived.milestones,
              };
              downloadTextFile(
                `event-pack-${selectedEventId || "event"}.json`,
                JSON.stringify(payload, null, 2),
              );
            }}
            className="text-xs px-3 py-1.5 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/25 transition-colors"
            title="Export Event Pack (JSON)"
          >
            Event Pack
          </button>

          <button
            type="button"
            onClick={() => setShowtimeMode((v) => !v)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-md border transition-colors",
              showtimeMode
                ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/25"
                : "bg-background text-foreground/70 border-border/30 hover:text-foreground",
            )}
          >
            Showtime mode
          </button>
        </div>
      </div>

      <div className={cn("flex-1 overflow-auto p-3", showtimeMode && "p-5")}>
        {derived.tasks.length === 0 ? (
          <div className="p-6 text-sm text-foreground/60">
            No run-of-show tasks found.
          </div>
        ) : (
          <div className={cn("space-y-2", showtimeMode && "space-y-3")}>
            {derived.tasks.map((t) => {
              const key = `${t.eventId}:${t.taskId}`;
              const done = Boolean(confirmed[key]);
              return (
                <div
                  key={t.taskId}
                  className={cn(
                    "rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm px-3 py-2 flex items-start gap-3",
                    showtimeMode && "px-4 py-3",
                    done && "opacity-80",
                  )}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmed((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                    className={cn(
                      "mt-0.5 h-6 w-6 rounded-md border flex items-center justify-center text-xs font-bold",
                      done
                        ? "bg-primary/20 border-primary/30 text-primary"
                        : "bg-background border-border/30 text-foreground/60",
                    )}
                    aria-label={done ? "Mark unchecked" : "Mark complete"}
                  >
                    {done ? "✓" : ""}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "flex items-center justify-between gap-3",
                        showtimeMode && "gap-4",
                      )}
                    >
                      <div
                        className={cn(
                          "text-sm font-semibold text-foreground truncate",
                          showtimeMode && "text-base",
                        )}
                      >
                        {t.title}
                      </div>
                      <div
                        className={cn(
                          "text-xs text-foreground/60 whitespace-nowrap",
                          showtimeMode && "text-sm",
                        )}
                      >
                        {fmtTime(t.start)}
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-xs text-foreground/60 mt-0.5",
                        showtimeMode && "text-sm",
                      )}
                    >
                      {t.scope.toUpperCase()} • {t.department.toUpperCase()} •{" "}
                      {t.status}
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
