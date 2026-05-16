import React from "react";
import { cn } from "@/lib/glass";
import type { Event, Space } from "../types";
import type { OpsTask } from "@shared/types/ops-gantt";
import { usePersistedViewState } from "@/lib/use-persisted-view-state";
import { deriveOpsForEvent } from "../lib/derived-ops-cache";

function ms(iso: string): number | null {
  const d = new Date(iso);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

function fmt(iso: string): string {
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

export function CriticalPathView({
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
    () => `maestro-bqt:critical:${initialScope ?? "all"}`,
    [initialScope],
  );
  const [viewState, setViewState] = usePersistedViewState<{
    selectedEventId: string;
    scope: "all" | "beo" | "production";
  }>({
    key: `view:${viewKeyBase}`,
    defaultValue: {
      selectedEventId: String(events?.[0]?.id ?? ""),
      scope: initialScope ?? "all",
    },
  });

  const selectedEventId = viewState.selectedEventId;
  const scope = viewState.scope;
  const setSelectedEventId = (next: string) =>
    setViewState((s) => ({ ...s, selectedEventId: next }));
  const setScope = (next: typeof scope) =>
    setViewState((s) => ({ ...s, scope: next }));

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

  const { tasks, criticalSet } = React.useMemo(() => {
    if (!selectedEvent)
      return { tasks: [] as OpsTask[], criticalSet: new Set<string>() };

    const derived = deriveOpsForEvent({
      event: selectedEvent,
      spacesById,
      includeProductionScope: scope !== "beo",
    });
    const filtered =
      scope === "all"
        ? derived.tasks
        : scope === "beo"
          ? derived.tasks.filter((t) => t.scope === "beo")
          : derived.tasks.filter((t) => t.scope === "production");

    return { tasks: filtered, criticalSet: derived.criticalSet };
  }, [selectedEvent, spacesById, scope]);

  const criticalTasks = React.useMemo(() => {
    const list = tasks.filter((t) => criticalSet.has(t.taskId));
    list.sort((a, b) => (ms(a.start) ?? 0) - (ms(b.start) ?? 0));
    return list;
  }, [tasks, criticalSet]);

  const taskById = React.useMemo(
    () => new Map(tasks.map((t) => [t.taskId, t])),
    [tasks],
  );

  // Build a human-readable critical chain by finding a “start” node (no critical deps) and walking forward.
  const chain = React.useMemo(() => {
    const crit = criticalTasks;
    const critSet = new Set(crit.map((t) => t.taskId));
    if (crit.length === 0) return [] as OpsTask[];

    const incoming = new Map<string, number>();
    for (const t of crit) incoming.set(t.taskId, 0);
    for (const t of crit) {
      for (const d of t.dependencies ?? []) {
        if (!critSet.has(d.dependsOnTaskId)) continue;
        incoming.set(t.taskId, (incoming.get(t.taskId) ?? 0) + 1);
      }
    }
    const start =
      crit.find((t) => (incoming.get(t.taskId) ?? 0) === 0) ?? crit[0];

    const nextBy = new Map<string, OpsTask[]>();
    for (const t of crit) {
      for (const d of t.dependencies ?? []) {
        if (!critSet.has(d.dependsOnTaskId)) continue;
        const arr = nextBy.get(d.dependsOnTaskId) ?? [];
        arr.push(t);
        nextBy.set(d.dependsOnTaskId, arr);
      }
    }

    const out: OpsTask[] = [];
    const visited = new Set<string>();
    let cur: OpsTask | undefined = start;
    while (cur && !visited.has(cur.taskId)) {
      visited.add(cur.taskId);
      out.push(cur);
      const nextCandidates = nextBy.get(cur.taskId) ?? [];
      nextCandidates.sort((a, b) => (ms(a.start) ?? 0) - (ms(b.start) ?? 0));
      cur = nextCandidates[0];
    }
    return out;
  }, [criticalTasks]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border/20 bg-background/95 px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">
          Critical Path View
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
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 p-3">
        <div className="col-span-5 min-h-0 rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-border/10 text-xs font-semibold text-foreground">
            Critical tasks ({criticalTasks.length})
          </div>
          <div className="overflow-auto h-full divide-y divide-border/10">
            {criticalTasks.map((t) => (
              <div key={t.taskId} className="px-3 py-2">
                <div className="text-sm font-medium text-foreground">
                  {t.title}
                </div>
                <div className="text-xs text-foreground/60">
                  {t.scope.toUpperCase()} • {t.department.toUpperCase()} •{" "}
                  {t.status}
                </div>
                <div className="text-xs text-foreground/60 mt-1">
                  {fmt(t.start)} → {fmt(t.end)}
                </div>
              </div>
            ))}
            {criticalTasks.length === 0 && (
              <div className="p-6 text-sm text-foreground/60">
                No critical tasks.
              </div>
            )}
          </div>
        </div>

        <div className="col-span-7 min-h-0 rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-border/10 text-xs font-semibold text-foreground">
            Critical chain (best-effort)
          </div>
          <div className="p-3 overflow-auto h-full">
            {chain.length === 0 ? (
              <div className="p-6 text-sm text-foreground/60">
                No chain to display.
              </div>
            ) : (
              <div className="space-y-2">
                {chain.map((t, idx) => (
                  <div
                    key={t.taskId}
                    className="rounded-md border border-border/20 bg-background/30 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">
                          {idx + 1}. {t.title}
                        </div>
                        <div className="text-xs text-foreground/60">
                          {t.scope.toUpperCase()} • {t.department.toUpperCase()}{" "}
                          • {t.status}
                        </div>
                      </div>
                      <div className="text-xs text-foreground/60 whitespace-nowrap">
                        {fmt(t.start)}
                      </div>
                    </div>
                    {(t.dependencies || []).length > 0 && (
                      <div className="mt-2 text-[11px] text-foreground/60">
                        deps:{" "}
                        {t.dependencies
                          ?.map(
                            (d) =>
                              taskById.get(d.dependsOnTaskId)?.title ??
                              d.dependsOnTaskId,
                          )
                          .slice(0, 3)
                          .join(" • ")}
                        {t.dependencies && t.dependencies.length > 3
                          ? " • …"
                          : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
