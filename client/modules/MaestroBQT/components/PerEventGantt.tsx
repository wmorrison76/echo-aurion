import React from "react";
import { cn } from "@/lib/glass";
import type { Event, Space } from "../types";
import type { OpsTask } from "@shared/types/ops-gantt";
import type { OpsEvent } from "@shared/types/ops-gantt";
import { instantiateTemplate } from "@shared/ops-gantt/templates";
import {
  bulkShiftTasks,
  recalculateSchedule,
} from "@shared/ops-gantt/recalculate";
import { computeCriticalPathAndSlack } from "@shared/ops-gantt/scheduler";
import { OpsTaskDetailDrawer } from "./OpsTaskDetailDrawer";
import { isMenuLocked } from "../lib/revision-store";
import { appendAuditEntry } from "@/lib/ops-audit";
import {
  applyTaskOverrides,
  loadTaskOverrides,
  upsertTaskOverride,
} from "../lib/task-overrides";
import { usePersistedScroll } from "@/lib/use-persisted-scroll";
import { usePersistedViewState } from "@/lib/use-persisted-view-state";
import { deriveOpsForEvent } from "../lib/derived-ops-cache";

function ms(iso: string): number | null {
  const d = new Date(iso);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function PerEventGantt({
  events,
  spaces,
  initialScope,
}: {
  events: Event[];
  spaces: Space[];
  initialScope?: "all" | "beo" | "production";
}) {
  const spacesById = React.useMemo(
    () => new Map(spaces.map((s) => [s.id, s])),
    [spaces],
  );

  const viewKeyBase = React.useMemo(
    () => `maestro-bqt:per-event:${initialScope ?? "all"}`,
    [initialScope],
  );
  const [viewState, setViewState] = usePersistedViewState<{
    selectedEventId: string;
    scope: "all" | "beo" | "production";
    zoom: number;
    selectedTaskId: string | null;
    drawerOpen: boolean;
  }>({
    key: `view:${viewKeyBase}`,
    defaultValue: {
      selectedEventId: String(events?.[0]?.id ?? ""),
      scope: initialScope ?? "all",
      zoom: 1,
      selectedTaskId: null,
      drawerOpen: false,
    },
  });

  const selectedEventId = viewState.selectedEventId;
  const scope = viewState.scope;
  const zoom = Number.isFinite(viewState.zoom) ? viewState.zoom : 1;
  const selectedTaskId = viewState.selectedTaskId;
  const drawerOpen = Boolean(viewState.drawerOpen);

  const setSelectedEventId = (next: string) =>
    setViewState((s) => ({ ...s, selectedEventId: next }));
  const setScope = (next: typeof scope) =>
    setViewState((s) => ({ ...s, scope: next }));
  const setZoom = (next: number) =>
    setViewState((s) => ({
      ...s,
      zoom: clamp(Math.round(next * 100) / 100, 0.5, 2.5),
    }));
  const setSelectedTaskId = (next: string | null) =>
    setViewState((s) => ({ ...s, selectedTaskId: next }));
  const setDrawerOpen = (next: boolean) =>
    setViewState((s) => ({ ...s, drawerOpen: next }));
  const [workingTasks, setWorkingTasks] = React.useState<OpsTask[]>([]);
  const [criticalSet, setCriticalSet] = React.useState<Set<string>>(new Set());

  const { scrollRef: timelineScrollRef } = usePersistedScroll({
    storageKey: `scroll:maestro-bqt:per-event:timeline:${selectedEventId || "none"}:${scope}`,
    enabled: true,
  });
  const { scrollRef: detailScrollRef } = usePersistedScroll({
    storageKey: `scroll:maestro-bqt:per-event:detail:${selectedEventId || "none"}:${scope}`,
    enabled: true,
  });

  React.useEffect(() => {
    const exists = (events || []).some(
      (e) => String(e.id) === String(selectedEventId),
    );
    if (exists) return;
    if (events.length > 0) setSelectedEventId(String(events[0].id));
  }, [events, selectedEventId]);

  React.useEffect(() => {
    if (!initialScope) return;
    setScope(initialScope);
  }, [initialScope]);

  const selectedEvent = React.useMemo(
    () => events.find((e) => String(e.id) === String(selectedEventId)) ?? null,
    [events, selectedEventId],
  );

  const editsLocked = React.useMemo(
    () => (selectedEvent ? isMenuLocked(selectedEvent.id) : false),
    [selectedEvent],
  );

  const derived = React.useMemo(() => {
    if (!selectedEvent)
      return { tasks: [] as OpsTask[], criticalSet: new Set<string>() };

    const base = deriveOpsForEvent({
      event: selectedEvent,
      spacesById,
      includeProductionScope: true,
    });
    const filtered =
      scope === "all"
        ? base.tasks
        : scope === "beo"
          ? base.tasks.filter((t) => t.scope === "beo")
          : base.tasks.filter((t) => t.scope === "production");

    return { tasks: filtered, criticalSet: base.criticalSet };
  }, [selectedEvent, spacesById, scope]);

  // Initialize/reset editable tasks when event/scope changes.
  React.useEffect(() => {
    setWorkingTasks(derived.tasks);
    setCriticalSet(derived.criticalSet);
  }, [derived.tasks, derived.criticalSet]);

  const tasks = workingTasks;

  const applyShift = React.useCallback(
    (deltaMinutes: number) => {
      setWorkingTasks((prev) => {
        const shifted = bulkShiftTasks(prev, deltaMinutes);
        const { tasks: scheduled } = recalculateSchedule(shifted, {
          shiftToSatisfyDependencies: true,
        });
        const { tasks: withSlack, criticalPathTaskIds } =
          computeCriticalPathAndSlack(scheduled);
        setCriticalSet(new Set(criticalPathTaskIds));
        return withSlack;
      });
      if (selectedEvent) {
        appendAuditEntry({
          eventId: selectedEvent.id,
          beoId: `beo-${selectedEvent.id}`,
          entityType: "event",
          entityId: selectedEvent.id,
          action: "task.shift_bulk",
          summary: `Bulk shifted schedule ${deltaMinutes > 0 ? "+" : ""}${deltaMinutes}m`,
          details: { deltaMinutes },
        });
      }
    },
    [selectedEvent],
  );

  React.useEffect(() => {
    if (selectedTaskId && tasks.some((t) => t.taskId === selectedTaskId))
      return;
    setSelectedTaskId(tasks[0]?.taskId ?? null);
  }, [tasks, selectedTaskId]);

  const taskById = React.useMemo(
    () => new Map(tasks.map((t) => [t.taskId, t])),
    [tasks],
  );
  const selectedTask = selectedTaskId
    ? (taskById.get(selectedTaskId) ?? null)
    : null;

  // Best-effort OpsEvent for the drawer (same shape as template input)
  const opsEventForDrawer = React.useMemo(() => {
    if (!selectedEvent) return null;
    const start = new Date(selectedEvent.startDateTime);
    const end = new Date(selectedEvent.endDateTime);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()))
      return null;
    const spaceName = (() => {
      const first = selectedEvent.spaceIds?.[0];
      if (!first) return "Unassigned Space";
      return spacesById.get(first)?.name ?? first;
    })();
    return {
      eventId: selectedEvent.id,
      beoNumber: selectedEvent.metadata?.beoNumber ?? `BEO-${selectedEvent.id}`,
      eventName: selectedEvent.name || selectedEvent.id,
      clientName: selectedEvent.metadata?.clientName ?? "Client",
      property: selectedEvent.metadata?.property ?? "Local Property",
      space: spaceName,
      eventType:
        selectedEvent.metadata?.eventType ??
        selectedEvent.metadata?.type ??
        "banquet",
      startDateTime: selectedEvent.startDateTime,
      endDateTime: selectedEvent.endDateTime,
      setupStart:
        selectedEvent.metadata?.setupStart ??
        new Date(start.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      strikeEnd:
        selectedEvent.metadata?.strikeEnd ??
        new Date(end.getTime() + 60 * 60 * 1000).toISOString(),
      guestCountGuaranteed:
        selectedEvent.metadata?.guestCountGuaranteed ??
        selectedEvent.guestCountExpected ??
        0,
      guestCountExpected: selectedEvent.guestCountExpected ?? 0,
      serviceStyle: selectedEvent.metadata?.serviceStyle ?? "buffet",
      status: "tentative",
      financialStatus: selectedEvent.metadata?.financialStatus ?? "deposit_due",
      priority: selectedEvent.metadata?.priority ?? "P2",
      lastBEORevision: selectedEvent.metadata?.lastBEORevision ?? 1,
      revisionHistory: selectedEvent.metadata?.revisionHistory ?? [],
      owners: selectedEvent.metadata?.owners ?? {},
    };
  }, [selectedEvent, spacesById]);

  const timeWindow = React.useMemo(() => {
    const times = tasks
      .flatMap((t) => [ms(t.start), ms(t.end)])
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (times.length === 0) {
      const now = Date.now();
      return { startMs: now, endMs: now + 60 * 60 * 1000 };
    }
    const startMs = Math.min(...times);
    const endMs = Math.max(...times);
    return { startMs, endMs: Math.max(endMs, startMs + 60 * 60 * 1000) };
  }, [tasks]);

  const timelineWidth = React.useMemo(() => {
    const spanMs = timeWindow.endMs - timeWindow.startMs;
    const hours = Math.max(1, Math.ceil(spanMs / (60 * 60 * 1000)));
    return Math.max(900, Math.round(hours * 70 * zoom));
  }, [timeWindow, zoom]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, OpsTask[]>();
    for (const t of tasks) {
      const key = t.department;
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    const out = Array.from(map.entries())
      .map(([department, list]) => ({
        department,
        tasks: list
          .slice()
          .sort((a, b) => (ms(a.start) ?? 0) - (ms(b.start) ?? 0)),
      }))
      .sort((a, b) => a.department.localeCompare(b.department));
    return out;
  }, [tasks]);

  return (
    <div className="h-full flex flex-col">
      <OpsTaskDetailDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        opsEvent={opsEventForDrawer as any}
        task={selectedTask}
        allTasks={tasks}
        onTaskUpdate={(taskId, patch) => {
          setWorkingTasks((prev) => {
            const next = prev.map((t) =>
              t.taskId === taskId ? { ...t, ...patch } : t,
            );
            const { tasks: scheduled } = recalculateSchedule(next, {
              shiftToSatisfyDependencies: true,
            });
            const { tasks: withSlack, criticalPathTaskIds } =
              computeCriticalPathAndSlack(scheduled);
            setCriticalSet(new Set(criticalPathTaskIds));
            return withSlack;
          });
          if (selectedEvent) {
            const t = tasks.find((x) => x.taskId === taskId);
            if (t) upsertTaskOverride(selectedEvent.id, t, patch);
            appendAuditEntry({
              eventId: selectedEvent.id,
              beoId: `beo-${selectedEvent.id}`,
              entityType: "task",
              entityId: taskId,
              action: patch.status
                ? "task.status_change"
                : "task.percent_change",
              summary: patch.status
                ? `Task status → ${patch.status}`
                : "Task progress updated",
              details: patch,
            });
          }
        }}
      />

      <div className="border-b border-border/20 bg-background/95 px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">
          Per-Event Gantt
        </div>
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

          <div className="inline-flex rounded-md border border-border/30 overflow-hidden">
            {(["all", "beo", "production"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={cn(
                  "px-3 py-1.5 text-xs transition-colors",
                  scope === s
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
                  Math.max(0.5, Math.round((z - 0.25) * 100) / 100),
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
                  Math.min(2.5, Math.round((z + 0.25) * 100) / 100),
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

      <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 p-3">
        {/* Left: timeline */}
        <div className="col-span-8 min-h-0 rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-border/10 text-xs text-foreground/60 flex items-center justify-between">
            <div>
              {selectedEvent ? (
                <>
                  <span className="text-foreground font-medium">
                    {selectedEvent.name}
                  </span>{" "}
                  <span className="text-foreground/50">
                    ({tasks.length} tasks)
                  </span>
                </>
              ) : (
                "No event selected"
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => applyShift(-60)}
                className="text-[11px] px-2 py-1 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                title="Bulk shift earlier"
                disabled={editsLocked}
              >
                −60m
              </button>
              <button
                type="button"
                onClick={() => applyShift(60)}
                className="text-[11px] px-2 py-1 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                title="Bulk shift later"
                disabled={editsLocked}
              >
                +60m
              </button>
              <div className="text-[11px] text-foreground/50">
                scroll horizontally to pan
              </div>
            </div>
          </div>

          <div
            ref={timelineScrollRef as any}
            className="overflow-x-auto overflow-y-auto h-full"
          >
            <div className="min-h-full" style={{ width: timelineWidth }}>
              <div className="h-7 border-b border-border/10 bg-background/30" />
              <div className="p-2 space-y-2">
                {grouped.map((g) => (
                  <div
                    key={g.department}
                    className="rounded-md border border-border/20 bg-background/30"
                  >
                    <div className="px-2 py-1.5 border-b border-border/10 text-xs font-semibold text-foreground">
                      {g.department.toUpperCase()}
                    </div>
                    <div className="p-2 space-y-1">
                      {g.tasks.map((t) => {
                        const sMs = ms(t.start);
                        const eMs = ms(t.end);
                        if (sMs === null || eMs === null) return null;
                        const spanMs = timeWindow.endMs - timeWindow.startMs;
                        const leftPx =
                          ((clamp(sMs, timeWindow.startMs, timeWindow.endMs) -
                            timeWindow.startMs) /
                            spanMs) *
                          timelineWidth;
                        const rightPx =
                          ((clamp(eMs, timeWindow.startMs, timeWindow.endMs) -
                            timeWindow.startMs) /
                            spanMs) *
                          timelineWidth;
                        const widthPx = clamp(
                          rightPx - leftPx,
                          10,
                          timelineWidth,
                        );
                        const isSelected = t.taskId === selectedTaskId;
                        const isCritical = criticalSet.has(t.taskId);

                        return (
                          <button
                            key={t.taskId}
                            type="button"
                            onClick={() => {
                              setSelectedTaskId(t.taskId);
                              setDrawerOpen(true);
                            }}
                            className={cn(
                              "relative w-full h-8 rounded bg-foreground/5 border border-border/20 text-left",
                              isSelected && "ring-1 ring-primary/50",
                            )}
                          >
                            <div
                              className={cn(
                                "absolute inset-y-0 rounded-sm border border-border/30 bg-primary/20 text-[11px] text-foreground",
                                isCritical && "ring-1 ring-primary/40",
                              )}
                              style={{ left: leftPx, width: widthPx }}
                              title={t.title}
                            >
                              <div className="h-full px-2 flex items-center justify-between gap-2">
                                <div className="truncate">{t.title}</div>
                                <div className="flex items-center gap-2 text-[10px] text-foreground/60">
                                  {typeof t.slackMinutes === "number" ? (
                                    <span>
                                      slack {Math.round(t.slackMinutes)}m
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="h-16" />
            </div>
          </div>
        </div>

        {/* Right: details */}
        <div className="col-span-4 min-h-0 rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-border/10 text-sm font-semibold text-foreground">
            Task Details
          </div>
          <div
            ref={detailScrollRef as any}
            className="p-3 space-y-3 overflow-auto h-full"
          >
            {selectedTask ? (
              <>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {selectedTask.title}
                  </div>
                  <div className="text-xs text-foreground/60">
                    {selectedTask.scope.toUpperCase()} •{" "}
                    {selectedTask.department.toUpperCase()} •{" "}
                    {selectedTask.status}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs">
                  <div className="rounded-md border border-border/20 bg-background/30 px-2 py-2">
                    <div className="text-foreground/60">Start</div>
                    <div className="text-foreground">
                      {fmtTime(selectedTask.start)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/20 bg-background/30 px-2 py-2">
                    <div className="text-foreground/60">End</div>
                    <div className="text-foreground">
                      {fmtTime(selectedTask.end)}
                    </div>
                  </div>
                  <div className="rounded-md border border-border/20 bg-background/30 px-2 py-2">
                    <div className="text-foreground/60">Duration</div>
                    <div className="text-foreground">
                      {selectedTask.durationMinutes} min
                    </div>
                  </div>
                  <div className="rounded-md border border-border/20 bg-background/30 px-2 py-2">
                    <div className="text-foreground/60">Slack</div>
                    <div className="text-foreground">
                      {typeof selectedTask.slackMinutes === "number"
                        ? `${Math.round(selectedTask.slackMinutes)} min`
                        : "—"}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border border-border/20 bg-background/30 p-2">
                  <div className="text-xs font-semibold text-foreground mb-1">
                    Dependencies
                  </div>
                  {(selectedTask.dependencies || []).length === 0 ? (
                    <div className="text-xs text-foreground/60">None</div>
                  ) : (
                    <div className="space-y-1">
                      {selectedTask.dependencies?.map((d) => (
                        <div
                          key={`${d.dependsOnTaskId}-${d.type}`}
                          className="text-xs text-foreground/70"
                        >
                          {d.type} →{" "}
                          {taskById.get(d.dependsOnTaskId)?.title ??
                            d.dependsOnTaskId}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-md border border-border/20 bg-background/30 p-2">
                  <div className="text-xs font-semibold text-foreground mb-1">
                    Required Artifacts
                  </div>
                  {(selectedTask.requiredArtifacts || []).length === 0 ? (
                    <div className="text-xs text-foreground/60">None</div>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedTask.requiredArtifacts?.map((a) => (
                        <span
                          key={a}
                          className="text-[10px] px-2 py-1 rounded-full border border-border/30 bg-background text-foreground/70"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-md border border-border/20 bg-background/30 p-2">
                  <div className="text-xs font-semibold text-foreground mb-1">
                    Checklist
                  </div>
                  {(selectedTask.checklist || []).length === 0 ? (
                    <div className="text-xs text-foreground/60">
                      No checklist items yet.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {selectedTask.checklist?.map((c) => (
                        <div key={c.id} className="text-xs text-foreground/70">
                          {c.completed ? "✓" : "○"} {c.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-6 text-sm text-foreground/60">
                No task selected.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
