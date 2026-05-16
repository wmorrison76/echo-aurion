import React from "react";
import { cn } from "@/lib/glass";
import type { Event } from "../types";
import type { OpsTask, OpsDepartment } from "@shared/types/ops-gantt";
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

const DEPTS: Array<{ id: OpsDepartment | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "sales", label: "Sales" },
  { id: "events", label: "Events" },
  { id: "culinary", label: "Culinary" },
  { id: "pastry", label: "Pastry" },
  { id: "bar", label: "Bar" },
  { id: "av", label: "AV" },
  { id: "stewarding", label: "Stewarding" },
  { id: "purchasing", label: "Purchasing" },
  { id: "receiving", label: "Receiving" },
  { id: "banquetops", label: "Banquet Ops" },
];

export function DepartmentOpsView({
  events,
  initialScope,
}: {
  events: Event[];
  initialScope?: "beo" | "production" | "all";
}) {
  const viewKeyBase = React.useMemo(
    () => `maestro-bqt:department:${initialScope ?? "beo"}`,
    [initialScope],
  );
  const [viewState, setViewState] = usePersistedViewState<{
    department: (typeof DEPTS)[number]["id"];
    scope: "beo" | "production" | "all";
    daysAhead: number;
  }>({
    key: `view:${viewKeyBase}`,
    defaultValue: {
      department: "culinary",
      scope: initialScope ?? "beo",
      daysAhead: 14,
    },
  });

  const department = viewState.department;
  const scope = viewState.scope;
  const daysAhead = viewState.daysAhead;

  const setDepartment = (next: typeof department) =>
    setViewState((s) => ({ ...s, department: next }));
  const setScope = (next: typeof scope) =>
    setViewState((s) => ({ ...s, scope: next }));
  const setDaysAhead = (next: number) =>
    setViewState((s) => ({ ...s, daysAhead: next }));

  React.useEffect(() => {
    if (!initialScope) return;
    setScope(initialScope);
  }, [initialScope]);

  const tasks = React.useMemo(() => {
    const now = Date.now();
    const endWindow =
      now + Math.max(1, Math.round(daysAhead)) * 24 * 60 * 60 * 1000;
    const out: OpsTask[] = [];

    for (const evt of events) {
      const startMs = ms(evt.startDateTime);
      const endMs = ms(evt.endDateTime);
      if (startMs === null || endMs === null) continue;
      if (startMs > endWindow) continue;
      const derived = deriveOpsForEvent({
        event: evt,
        includeProductionScope: true,
      });
      out.push(...derived.tasks);
    }

    const filtered = out.filter((t) => {
      if (scope !== "all" && t.scope !== scope) return false;
      if (department !== "all" && t.department !== department) return false;
      const endMs = ms(t.end);
      if (endMs === null) return false;
      return endMs >= now;
    });

    filtered.sort((a, b) => (ms(a.start) ?? 0) - (ms(b.start) ?? 0));
    return filtered;
  }, [events, department, scope, daysAhead]);

  const groupedByDay = React.useMemo(() => {
    const map = new Map<string, OpsTask[]>();
    for (const t of tasks) {
      const key = isoDate(t.start) ?? "invalid";
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tasks]);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border/20 bg-background/95 px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">
          Department View
        </div>
        <div className="text-xs text-foreground/60">{tasks.length} tasks</div>
      </div>

      <div className="p-3 border-b border-border/10 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-foreground/60">Department</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value as any)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            {DEPTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-foreground/60">Scope</label>
          <div className="inline-flex rounded-md border border-border/30 overflow-hidden">
            {(["beo", "production", "all"] as const).map((s) => (
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

        <div className="flex items-center gap-2">
          <label className="text-xs text-foreground/60">Window</label>
          <select
            value={String(daysAhead)}
            onChange={(e) => setDaysAhead(parseInt(e.target.value, 10) || 14)}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            {[7, 14, 30, 60].map((d) => (
              <option key={d} value={String(d)}>
                Next {d} days
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {groupedByDay.length === 0 ? (
          <div className="p-6 text-sm text-foreground/60">
            No tasks in the current filter window.
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByDay.map(([day, list]) => (
              <div
                key={day}
                className="rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm"
              >
                <div className="px-3 py-2 border-b border-border/10 flex items-center justify-between">
                  <div className="text-xs font-semibold text-foreground">
                    {day}
                  </div>
                  <div className="text-[11px] text-foreground/60">
                    {list.length} tasks
                  </div>
                </div>
                <div className="divide-y divide-border/10">
                  {list.map((t) => (
                    <div key={t.taskId} className="px-3 py-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {t.title}
                          </div>
                          <div className="text-xs text-foreground/60">
                            {t.scope.toUpperCase()} •{" "}
                            {t.department.toUpperCase()} • {t.status}
                          </div>
                        </div>
                        <div className="text-xs text-foreground/60 whitespace-nowrap">
                          {t.start
                            ? new Date(t.start).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                          {" → "}
                          {t.end
                            ? new Date(t.end).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </div>
                      </div>
                      {(t.requiredArtifacts || []).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {t.requiredArtifacts?.slice(0, 6).map((a) => (
                            <span
                              key={a}
                              className="text-[10px] px-2 py-1 rounded-full border border-border/30 bg-background text-foreground/70"
                            >
                              {a}
                            </span>
                          ))}
                          {t.requiredArtifacts &&
                            t.requiredArtifacts.length > 6 && (
                              <span className="text-[10px] text-foreground/60">
                                +{t.requiredArtifacts.length - 6}
                              </span>
                            )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
