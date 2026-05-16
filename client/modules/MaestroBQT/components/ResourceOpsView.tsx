import React from "react";
import { cn } from "@/lib/glass";
import type { Event } from "../types";
import type { OpsResource, OpsTask } from "@shared/types/ops-gantt";
import { computeResourceLoad } from "@shared/ops-gantt/resources";
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

function fmtDay(msValue: number): string {
  try {
    const d = new Date(msValue);
    if (!Number.isFinite(d.getTime())) return "—";
    return d.toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

function resourceIdForDepartment(dept: string): string {
  return `team-${dept.toLowerCase()}`;
}

export function ResourceOpsView({
  events,
  initialScope,
}: {
  events: Event[];
  initialScope?: "all" | "beo" | "production";
}) {
  const viewKeyBase = React.useMemo(
    () => `maestro-bqt:resource:${initialScope ?? "all"}`,
    [initialScope],
  );
  const [viewState, setViewState] = usePersistedViewState<{
    scope: "all" | "beo" | "production";
    daysAhead: number;
    bucketMinutes: number;
    selectedResourceId: string | null;
    query: string;
    viewMode: "utilization" | "allocations" | "conflicts";
    zoom: number;
    capacityOverrides: Record<string, number>;
  }>({
    key: `view:${viewKeyBase}`,
    defaultValue: {
      scope: initialScope ?? "all",
      daysAhead: 14,
      bucketMinutes: 60,
      selectedResourceId: null,
      query: "",
      viewMode: "utilization",
      zoom: 1,
      capacityOverrides: {},
    },
  });

  const scope = viewState.scope;
  const daysAhead = viewState.daysAhead;
  const bucketMinutes = viewState.bucketMinutes;
  const selectedResourceId = viewState.selectedResourceId;
  const query = viewState.query;
  const viewMode = viewState.viewMode;
  const zoom = viewState.zoom;
  const capacityOverrides = viewState.capacityOverrides;

  const setScope = (next: typeof scope) =>
    setViewState((s) => ({ ...s, scope: next }));
  const setDaysAhead = (next: number) =>
    setViewState((s) => ({ ...s, daysAhead: next }));
  const setBucketMinutes = (next: number) =>
    setViewState((s) => ({ ...s, bucketMinutes: next }));
  const setSelectedResourceId = (next: string | null) =>
    setViewState((s) => ({ ...s, selectedResourceId: next }));
  const setQuery = (next: string) =>
    setViewState((s) => ({ ...s, query: next }));
  const setViewMode = (next: typeof viewMode) =>
    setViewState((s) => ({ ...s, viewMode: next }));
  const setZoom = (next: number) =>
    setViewState((s) => ({
      ...s,
      zoom: clamp(Math.round(next * 100) / 100, 0.5, 2.5),
    }));
  const setCapacityOverride = (resourceId: string, nextCap: number) =>
    setViewState((s) => ({
      ...s,
      capacityOverrides: {
        ...(s.capacityOverrides || {}),
        [resourceId]: clamp(Math.floor(nextCap || 1), 1, 999),
      },
    }));
  const bumpCapacity = (resourceId: string, delta: number) => {
    const cur = capacityOverrides?.[resourceId];
    const base = Number.isFinite(cur) ? Number(cur) : 1;
    setCapacityOverride(resourceId, base + delta);
  };

  React.useEffect(() => {
    if (!initialScope) return;
    setScope(initialScope);
  }, [initialScope]);

  const now = Date.now();
  const windowEnd =
    now + Math.max(1, Math.round(daysAhead)) * 24 * 60 * 60 * 1000;

  const { tasks, resources } = React.useMemo(() => {
    const out: OpsTask[] = [];
    const resourcesMap = new Map<string, OpsResource>();

    // Build synthetic “team” resources per department with tunable capacities.
    const ensureTeam = (dept: string) => {
      const id = resourceIdForDepartment(dept);
      if (resourcesMap.has(id)) return;
      const capacity =
        dept === "Culinary"
          ? 4
          : dept === "BanquetOps"
            ? 6
            : dept === "Pastry"
              ? 2
              : dept === "Bar"
                ? 2
                : dept === "Purchasing"
                  ? 1
                  : dept === "Receiving"
                    ? 1
                    : dept === "Stewarding"
                      ? 2
                      : dept === "Events"
                        ? 2
                        : dept === "Sales"
                          ? 2
                          : dept === "AV"
                            ? 1
                            : dept === "Finance"
                              ? 1
                              : 1;

      const overrideCap = capacityOverrides?.[id];
      resourcesMap.set(id, {
        resourceId: id,
        resourceType: "team",
        name: `${dept} Team`,
        capacity: Number.isFinite(Number(overrideCap))
          ? Number(overrideCap)
          : capacity,
      });
    };

    for (const evt of events) {
      const startMs = ms(evt.startDateTime);
      if (startMs === null) continue;
      if (startMs > windowEnd) continue;
      const derived = deriveOpsForEvent({
        event: evt,
        includeProductionScope: true,
      });

      for (const t of derived.tasks) {
        if (scope !== "all" && t.scope !== scope) continue;
        const endMs = ms(t.end);
        if (endMs === null || endMs < now) continue;

        ensureTeam(t.department);
        out.push({
          ...t,
          resourceIds:
            t.resourceIds && t.resourceIds.length > 0
              ? t.resourceIds
              : [resourceIdForDepartment(t.department)],
        });
      }
    }

    const resources = Array.from(resourcesMap.values());
    return { tasks: out, resources };
  }, [events, scope, now, windowEnd, capacityOverrides]);

  const load = React.useMemo(
    () => computeResourceLoad(tasks, resources, { bucketMinutes }),
    [tasks, resources, bucketMinutes],
  );

  React.useEffect(() => {
    if (
      selectedResourceId &&
      resources.some((r) => r.resourceId === selectedResourceId)
    )
      return;
    setSelectedResourceId(resources[0]?.resourceId ?? null);
  }, [resources, selectedResourceId]);

  const filteredResources = React.useMemo(() => {
    const q = String(query || "")
      .trim()
      .toLowerCase();
    if (!q) return resources;
    return resources.filter((r) =>
      `${r.name} ${r.resourceType} ${r.resourceId}`.toLowerCase().includes(q),
    );
  }, [resources, query]);

  const eventById = React.useMemo(
    () => new Map<string, Event>(events.map((e) => [String(e.id), e])),
    [events],
  );
  const taskById = React.useMemo(
    () => new Map<string, OpsTask>(tasks.map((t) => [String(t.taskId), t])),
    [tasks],
  );

  const selectedAllocations = React.useMemo(() => {
    if (!selectedResourceId) return [];
    const list = load.allocations.filter(
      (a) => String(a.resourceId) === String(selectedResourceId),
    );
    list.sort((a, b) => a.startMs - b.startMs);
    return list;
  }, [load.allocations, selectedResourceId]);

  const bucketsByResource = React.useMemo(() => {
    const map = new Map<string, typeof load.buckets>();
    for (const b of load.buckets) {
      const arr = map.get(b.resourceId) ?? [];
      arr.push(b);
      map.set(b.resourceId, arr);
    }
    for (const arr of map.values())
      arr.sort((a, b) => a.bucketStartMs - b.bucketStartMs);
    return map;
  }, [load.buckets]);

  const conflictsByResource = React.useMemo(() => {
    const map = new Map<string, typeof load.conflicts>();
    for (const c of load.conflicts) {
      const arr = map.get(c.resourceId) ?? [];
      arr.push(c);
      map.set(c.resourceId, arr);
    }
    return map;
  }, [load.conflicts]);

  const selectedBuckets = selectedResourceId
    ? (bucketsByResource.get(selectedResourceId) ?? [])
    : [];
  const selectedConflicts = selectedResourceId
    ? (conflictsByResource.get(selectedResourceId) ?? [])
    : [];
  const selectedResource = selectedResourceId
    ? (resources.find((r) => r.resourceId === selectedResourceId) ?? null)
    : null;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border/20 bg-background/95 px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-foreground">
          Resource View
        </div>
        <div className="text-xs text-foreground/60">
          {resources.length} resources • {load.conflicts.length} conflicts
        </div>
      </div>

      <div className="p-3 border-b border-border/10 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-foreground/60">Search</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Resource name…"
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground w-[220px] max-w-[70vw]"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-foreground/60">Scope</label>
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

        <div className="flex items-center gap-2">
          <label className="text-xs text-foreground/60">Bucket</label>
          <select
            value={String(bucketMinutes)}
            onChange={(e) =>
              setBucketMinutes(parseInt(e.target.value, 10) || 60)
            }
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            {[30, 60, 120, 240].map((m) => (
              <option key={m} value={String(m)}>
                {m} min
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-foreground/60">View</label>
          <div className="inline-flex rounded-md border border-border/30 overflow-hidden">
            {(
              [
                { id: "utilization", label: "Utilization" },
                { id: "allocations", label: "Allocations" },
                { id: "conflicts", label: "Conflicts" },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id)}
                className={cn(
                  "px-3 py-1.5 text-xs transition-colors",
                  viewMode === v.id
                    ? "bg-primary/20 text-primary"
                    : "bg-background text-foreground/70 hover:text-foreground",
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="text-xs text-foreground/60">Zoom</label>
          <div className="inline-flex rounded-md border border-border/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setZoom(zoom - 0.25)}
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
              onClick={() => setZoom(zoom + 0.25)}
              className="px-2 py-1.5 text-xs bg-background text-foreground/70 hover:text-foreground"
              title="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3">
        <div className="lg:col-span-5 min-h-0 rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-border/10 text-xs font-semibold text-foreground">
            Resources
          </div>
          <div className="lg:hidden p-3 border-b border-border/10">
            <select
              value={selectedResourceId ?? ""}
              onChange={(e) => setSelectedResourceId(e.target.value || null)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
            >
              {filteredResources.map((r) => (
                <option key={r.resourceId} value={r.resourceId}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="hidden lg:block overflow-auto h-full divide-y divide-border/10">
            {filteredResources.map((r) => {
              const buckets = bucketsByResource.get(r.resourceId) ?? [];
              const conflicts = conflictsByResource.get(r.resourceId) ?? [];
              const peak = buckets.reduce(
                (m, b) => Math.max(m, b.utilization),
                0,
              );
              const isSelected = r.resourceId === selectedResourceId;
              return (
                <button
                  key={r.resourceId}
                  type="button"
                  onClick={() => setSelectedResourceId(r.resourceId)}
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-foreground/5 transition-colors",
                    isSelected && "bg-primary/10",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {r.name}
                      </div>
                      <div className="text-xs text-foreground/60">
                        cap {r.capacity ?? 1} • peak {Math.round(peak * 100)}% •{" "}
                        {conflicts.length} conflicts
                      </div>
                    </div>
                    <div
                      className={cn(
                        "text-[10px] font-semibold px-2 py-1 rounded-full border",
                        conflicts.length > 0
                          ? "border-red-500/30 bg-red-500/10 text-red-600"
                          : "border-border/30 bg-background text-foreground/60",
                      )}
                    >
                      {r.resourceType}
                    </div>
                  </div>
                </button>
              );
            })}
            {filteredResources.length === 0 && (
              <div className="p-6 text-sm text-foreground/60">
                No resources.
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-7 min-h-0 rounded-lg border border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-border/10 flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">
              {selectedResource?.name ?? "Resource"}
            </div>
            <div className="text-xs text-foreground/60">
              {selectedConflicts.length} conflicts • {selectedBuckets.length}{" "}
              buckets
            </div>
          </div>

          <div className="p-3 space-y-3 overflow-auto h-full">
            {/* Capacity controls (synthetic teams) */}
            {selectedResource ? (
              <div className="rounded-md border border-border/20 bg-background/30 p-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      Capacity
                    </div>
                    <div className="text-[11px] text-foreground/60">
                      {selectedResource.resourceId} • type{" "}
                      {selectedResource.resourceType}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        bumpCapacity(selectedResource.resourceId, -1)
                      }
                      className="h-8 px-2 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      title="Decrease capacity"
                    >
                      −
                    </button>
                    <input
                      value={String(
                        capacityOverrides?.[selectedResource.resourceId] ??
                          selectedResource.capacity ??
                          1,
                      )}
                      onChange={(e) =>
                        setCapacityOverride(
                          selectedResource.resourceId,
                          parseInt(e.target.value, 10) || 1,
                        )
                      }
                      className="h-8 w-16 rounded-md border border-border bg-background px-2 text-sm text-foreground text-center"
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        bumpCapacity(selectedResource.resourceId, +1)
                      }
                      className="h-8 px-2 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      title="Increase capacity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Heat strip */}
            {viewMode === "utilization" ? (
              <div className="rounded-md border border-border/20 bg-background/30 p-2">
                <div className="text-xs font-semibold text-foreground mb-2">
                  Utilization
                </div>
                {selectedBuckets.length === 0 ? (
                  <div className="text-xs text-foreground/60">
                    No utilization data.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="flex gap-1 min-w-max">
                      {selectedBuckets.map((b) => {
                        const u = b.utilization;
                        const cls =
                          u >= 1
                            ? "bg-red-500/60"
                            : u >= 0.8
                              ? "bg-amber-500/60"
                              : u >= 0.5
                                ? "bg-primary/50"
                                : "bg-foreground/20";
                        const w = clamp(Math.round(3 * zoom), 2, 10);
                        return (
                          <div
                            key={b.bucketStartMs}
                            className={cn(
                              "h-6 rounded-sm border border-border/20",
                              cls,
                            )}
                            style={{ width: `${w * 4}px` }}
                            title={`${new Date(b.bucketStartMs).toLocaleString()} • ${Math.round(u * 100)}% • peak ${b.peakUnits}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Allocations (what is consuming the resource) */}
            {viewMode === "allocations" ? (
              <div className="rounded-md border border-border/20 bg-background/30 p-2">
                <div className="text-xs font-semibold text-foreground mb-2">
                  Allocations
                </div>
                {selectedAllocations.length === 0 ? (
                  <div className="text-xs text-foreground/60">
                    No allocations. (Today this is department-level; connect
                    Scheduler to see individual staff assignments.)
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedAllocations.slice(0, 250).map((a) => {
                      const t = taskById.get(String(a.taskId));
                      const ev = eventById.get(String(a.eventId));
                      return (
                        <div
                          key={`${a.taskId}-${a.startMs}`}
                          className="rounded-md border border-border/20 bg-background/40 p-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-foreground truncate">
                                {t?.title ?? String(a.taskId)}
                              </div>
                              <div className="text-xs text-foreground/60">
                                {(t?.scope ?? "—").toUpperCase()} •{" "}
                                {(t?.department ?? "—").toUpperCase()} •{" "}
                                {t?.status ?? "—"}
                              </div>
                              <div className="text-[11px] text-foreground/60 mt-1 truncate">
                                Event: {ev?.name ?? String(a.eventId)}
                              </div>
                            </div>
                            <div className="text-xs text-foreground/60 whitespace-nowrap">
                              {new Date(a.startMs).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {" → "}
                              {new Date(a.endMs).toLocaleString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                window.dispatchEvent(
                                  new CustomEvent("ops:navigate", {
                                    detail: {
                                      kind: "gantt",
                                      eventId: String(a.eventId),
                                    },
                                  }),
                                )
                              }
                              className="text-[11px] px-2 py-1 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                            >
                              Open event Gantt
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {selectedAllocations.length > 250 ? (
                      <div className="text-[11px] text-foreground/60">
                        Showing first 250 allocations…
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}

            {/* Conflicts */}
            {viewMode === "conflicts" ? (
              <div className="rounded-md border border-border/20 bg-background/30 p-2">
                <div className="text-xs font-semibold text-foreground mb-2">
                  Conflicts
                </div>
                {selectedConflicts.length === 0 ? (
                  <div className="text-xs text-foreground/60">
                    No capacity conflicts in window.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedConflicts.map((c, idx) => (
                      <div
                        key={idx}
                        className="rounded-md border border-red-500/25 bg-red-500/10 p-2"
                      >
                        <div className="text-xs font-semibold text-red-700">
                          peak {c.observedPeak} / cap {c.capacity}
                        </div>
                        <div className="text-[11px] text-red-700/80">
                          {c.message}
                        </div>
                        <div className="text-[11px] text-red-700/70 mt-1">
                          {fmtDay(c.windowStartMs)} → {fmtDay(c.windowEndMs)}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => bumpCapacity(c.resourceId, +1)}
                            className="text-[11px] px-2 py-1 rounded-md border border-red-500/30 text-red-700 hover:bg-red-500/10"
                            title="Temporary capacity override (demo)"
                          >
                            Increase cap +1
                          </button>
                          {c.taskIds?.length ? (
                            <button
                              type="button"
                              onClick={() =>
                                window.dispatchEvent(
                                  new CustomEvent("ops:navigate", {
                                    detail: {
                                      kind: "gantt",
                                      eventId: String(
                                        c.taskIds?.[0]
                                          ? (taskById.get(String(c.taskIds[0]))
                                              ?.eventId ?? "")
                                          : "",
                                      ),
                                    },
                                  }),
                                )
                              }
                              className="text-[11px] px-2 py-1 rounded-md border border-red-500/30 text-red-700 hover:bg-red-500/10"
                            >
                              Open related event
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
