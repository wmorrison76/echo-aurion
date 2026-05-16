/**
 * Multi-BEO Production Timeline Component
 * Genesis D compliance - Multi-BEO orchestration with ProductionNode lanes
 *
 * Shows multiple BEOs on same day with lanes by ProductionNode:
 * - Commissary
 * - Butcher
 * - Production Kitchen
 * - Outlet(s)
 */

import React from "react";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";
import type {
  ProductionNode,
  GenesisBEO,
  TraceEntry,
} from "../types/genesis-integration";
import { cn } from "@/lib/glass";
import { usePersistedViewState } from "@/lib/use-persisted-view-state";

export interface ProductionTask {
  id: string;
  beoId: string;
  beoName: string;
  nodeId: string; // References ProductionNode
  nodeName: string;
  taskName: string;
  startTime: string; // ISO timestamp
  endTime: string; // ISO timestamp
  department: string; // "hot", "cold", "pastry", "butcher", "bev"
  status: "pending" | "in_progress" | "completed" | "blocked";
  /**
   * Scheduling metadata (optional).
   * Used for critical path visualization and prioritization.
   */
  slackMinutes?: number;
  isCritical?: boolean;
  conflicts?: ConflictInfo[];
  traceId?: string; // References TraceEntry
}

export interface ConflictInfo {
  type: "labor" | "equipment" | "overlap";
  severity: "warning" | "error" | "critical";
  description: string;
  affectedBEODs: string[];
}

export interface MultiBEOProductionTimelineProps {
  beos: GenesisBEO[];
  productionNodes: ProductionNode[];
  tasks: ProductionTask[];
  selectedDate: string; // ISO date
  onTaskClick?: (task: ProductionTask) => void;
  onTraceClick?: (traceId: string) => void;
}

export function MultiBEOProductionTimeline({
  beos,
  productionNodes,
  tasks,
  selectedDate,
  onTaskClick,
  onTraceClick,
}: MultiBEOProductionTimelineProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);
  const [viewState, setViewState] = usePersistedViewState<{
    scale: "day" | "week" | "month";
    zoom: number;
  }>({
    key: "view:maestro-bqt:production-timeline",
    defaultValue: { scale: "day", zoom: 1 },
  });

  const scale = viewState.scale;
  const zoom = Number.isFinite(viewState.zoom) ? viewState.zoom : 1;
  const setScale = (next: typeof scale) =>
    setViewState((s) => ({ ...s, scale: next }));
  const setZoom = (next: number) =>
    setViewState((s) => ({
      ...s,
      zoom: Math.max(0.5, Math.min(2.5, Math.round(next * 100) / 100)),
    }));

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [hoveredTask, setHoveredTask] = React.useState<string | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<string | null>(null);

  const safeSelectedDate = React.useMemo(() => {
    // Expect "YYYY-MM-DD" from <input type="date">; fallback defensively.
    if (
      typeof selectedDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)
    ) {
      return selectedDate;
    }
    const fallback = new Date().toISOString().slice(0, 10);
    console.warn(
      "[MultiBEOProductionTimeline] Invalid selectedDate, falling back:",
      {
        selectedDate,
        fallback,
      },
    );
    return fallback;
  }, [selectedDate]);

  const range = React.useMemo(() => {
    const [y, m, d] = safeSelectedDate.split("-").map((x) => parseInt(x, 10));
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
      return { startMs: start, endMs: end, label: safeSelectedDate };
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
  }, [safeSelectedDate, scale]);

  const windowTasks = React.useMemo(() => {
    return tasks.filter((task) => {
      const s = new Date(task.startTime).getTime();
      const e = new Date(task.endTime).getTime();
      if (!Number.isFinite(s) || !Number.isFinite(e)) return false;
      return s < range.endMs && e > range.startMs;
    });
  }, [tasks, range]);

  // Group tasks by ProductionNode (lanes)
  const tasksByNode = React.useMemo(() => {
    const grouped: Record<string, ProductionTask[]> = {};
    productionNodes.forEach((node) => {
      grouped[node.id] = [];
    });
    windowTasks.forEach((task) => {
      if (grouped[task.nodeId]) {
        grouped[task.nodeId].push(task);
      }
    });
    for (const nodeId of Object.keys(grouped)) {
      grouped[nodeId].sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
    }
    return grouped;
  }, [windowTasks, productionNodes]);

  // Calculate time range for the day
  const timeRange = React.useMemo(() => {
    // Used only for day-scale hour slots.
    if (windowTasks.length === 0) {
      return { start: "06:00", end: "22:00" };
    }
    const times = windowTasks.flatMap((task) => [
      new Date(task.startTime).getTime(),
      new Date(task.endTime).getTime(),
    ]);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const startHour = Math.floor(new Date(minTime).getHours() / 2) * 2; // Round to nearest 2 hours
    const endHour = Math.ceil(new Date(maxTime).getHours() / 2) * 2;
    return {
      start: `${startHour.toString().padStart(2, "0")}:00`,
      end: `${Math.min(endHour, 24).toString().padStart(2, "0")}:00`,
    };
  }, [windowTasks]);

  const laneLabelWidth = React.useMemo(() => {
    // Tight defaults for panel system; grows slightly on wider panels.
    if (containerWidth >= 900) return 200;
    if (containerWidth >= 700) return 180;
    return 160;
  }, [containerWidth]);

  const timelineMetrics = React.useMemo(() => {
    if (scale === "day") {
      const [startHour] = timeRange.start.split(":").map(Number);
      const [endHour] = timeRange.end.split(":").map(Number);
      const hoursSpan = Math.max(1, endHour - startHour);

      const timelineWidth = Math.max(0, containerWidth - laneLabelWidth);
      const desiredColumns =
        timelineWidth > 0 ? Math.max(3, Math.floor(timelineWidth / 90)) : 6;
      const rawStepHours = hoursSpan / desiredColumns;
      const stepHours = rawStepHours <= 1.25 ? 1 : rawStepHours <= 2.5 ? 2 : 4;

      const slots: Array<{ label: string; atMs: number }> = [];
      for (let hour = startHour; hour <= endHour; hour += stepHours) {
        const label = `${hour.toString().padStart(2, "0")}:00`;
        const atMs = new Date(`${safeSelectedDate}T${label}:00`).getTime();
        slots.push({ label, atMs });
      }

      const colWidth = 90 * zoom;
      const timelinePx = Math.max(520, Math.round(slots.length * colWidth));
      const spanMs = Math.max(60_000, range.endMs - range.startMs);
      return { slots, colWidth, timelinePx, spanMs };
    }

    const dayCount = Math.max(
      1,
      Math.ceil((range.endMs - range.startMs) / (24 * 60 * 60 * 1000)),
    );
    const colWidth = (scale === "week" ? 140 : 80) * zoom;
    const timelinePx = Math.max(520, Math.round(dayCount * colWidth));
    const slots: Array<{ label: string; atMs: number }> = [];
    for (let i = 0; i < dayCount; i++) {
      const atMs = range.startMs + i * 24 * 60 * 60 * 1000;
      const d = new Date(atMs);
      slots.push({
        atMs,
        label: d.toLocaleDateString([], { month: "short", day: "numeric" }),
      });
    }
    const spanMs = Math.max(60_000, range.endMs - range.startMs);
    return { slots, colWidth, timelinePx, spanMs };
  }, [
    scale,
    timeRange,
    containerWidth,
    laneLabelWidth,
    zoom,
    safeSelectedDate,
    range,
  ]);

  // Calculate task position and width
  const getTaskStyle = (task: ProductionTask) => {
    const startTime = new Date(task.startTime).getTime();
    const endTime = new Date(task.endTime).getTime();
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      return { left: 0, width: 10 };
    }

    const spanMs = timelineMetrics.spanMs;
    const clampedStart = Math.max(
      range.startMs,
      Math.min(range.endMs, startTime),
    );
    const clampedEnd = Math.max(range.startMs, Math.min(range.endMs, endTime));
    const left =
      ((clampedStart - range.startMs) / spanMs) * timelineMetrics.timelinePx;
    const width = Math.max(
      10,
      ((Math.max(clampedEnd, clampedStart + 60_000) - clampedStart) / spanMs) *
        timelineMetrics.timelinePx,
    );
    return { left, width };
  };

  // Get BEO name
  const getBEOName = (beoId: string): string => {
    return beos.find((beo) => beo.id === beoId)?.id || beoId;
  };

  // Get conflict icon
  const getConflictIcon = (conflicts?: ConflictInfo[]) => {
    if (!conflicts || conflicts.length === 0) return null;
    const hasCritical = conflicts.some((c) => c.severity === "critical");
    const hasError = conflicts.some((c) => c.severity === "error");
    if (hasCritical || hasError) {
      return <AlertTriangle className="w-3 h-3 text-red-600" />;
    }
    return <AlertTriangle className="w-3 h-3 text-amber-600" />;
  };

  return (
    <div ref={containerRef} className="h-full bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
        <div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Production Timeline - {range.label}
          </h2>
          <p className="text-xs text-foreground/60 mt-1">
            {beos.length} BEO{beos.length !== 1 ? "s" : ""} across{" "}
            {productionNodes.length} production node
            {productionNodes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Timeline Grid */}
      <div className="flex-1 overflow-auto px-2 py-2">
        <div className="relative min-w-full">
          {windowTasks.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center max-w-md">
                <Info className="mx-auto mb-3 h-8 w-8 text-foreground/40" />
                <p className="text-sm font-medium text-foreground">
                  No production tasks scheduled for this date.
                </p>
                <p className="mt-1 text-xs text-foreground/60">
                  Select another date or generate tasks from events to populate
                  the Gantt view.
                </p>
              </div>
            </div>
          )}

          {/* Time slots header */}
          <div className="sticky top-0 z-10 bg-background border-b border-border/20 mb-2">
            <div className="flex">
              <div
                style={{ width: laneLabelWidth }}
                className="flex-shrink-0"
              />
              <div className="overflow-x-auto flex-1">
                <div
                  className="flex"
                  style={{ width: timelineMetrics.timelinePx }}
                >
                  {timelineMetrics.slots.map((slot) => (
                    <div
                      key={slot.atMs}
                      className="text-center py-2 border-r border-border/10"
                      style={{ width: timelineMetrics.colWidth }}
                    >
                      <span className="text-xs font-medium text-foreground/80">
                        {slot.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ProductionNode lanes */}
          <div className="space-y-2">
            {productionNodes.map((node) => {
              const nodeTasks = tasksByNode[node.id] || [];
              if (nodeTasks.length === 0) return null; // Hide empty lanes

              return (
                <div
                  key={node.id}
                  className="relative border border-border/20 rounded-lg bg-background/40 overflow-hidden"
                >
                  {/* Lane label */}
                  <div
                    className="absolute left-0 top-0 bottom-0 flex items-center px-2 bg-background/60 border-r border-border/20 z-10"
                    style={{ width: laneLabelWidth }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {node.name}
                      </p>
                      <p className="text-xs text-foreground/60 capitalize">
                        {node.type.replace("_", " ")}
                      </p>
                    </div>
                  </div>

                  {/* Tasks */}
                  <div
                    className="relative h-16"
                    style={{ marginLeft: laneLabelWidth }}
                  >
                    <div className="overflow-x-auto h-full">
                      <div
                        className="relative h-full"
                        style={{ width: timelineMetrics.timelinePx }}
                      >
                        {nodeTasks.map((task) => {
                          const style = getTaskStyle(task);
                          const isHovered = hoveredTask === task.id;
                          const isSelected = selectedTask === task.id;
                          const hasConflicts =
                            task.conflicts && task.conflicts.length > 0;
                          const isCritical = task.isCritical === true;

                          return (
                            <div
                              key={task.id}
                              className={cn(
                                "absolute top-2 bottom-2 rounded border cursor-pointer transition-all",
                                isSelected
                                  ? "border-primary shadow-lg bg-primary/20"
                                  : isHovered
                                    ? "border-primary/50 shadow-md bg-primary/10"
                                    : "border-border/40 bg-background/60",
                                hasConflicts &&
                                  "border-red-500/50 bg-red-500/10",
                                isCritical && "ring-1 ring-primary/40",
                              )}
                              style={{ left: style.left, width: style.width }}
                              onMouseEnter={() => setHoveredTask(task.id)}
                              onMouseLeave={() => setHoveredTask(null)}
                              onClick={() => {
                                setSelectedTask(task.id);
                                onTaskClick?.(task);
                                if (task.traceId) {
                                  onTraceClick?.(task.traceId);
                                }
                              }}
                              title={`${task.taskName} - ${task.beoName}`}
                            >
                              <div className="px-1 py-0.5 h-full flex flex-col justify-between">
                                <div className="flex items-start justify-between gap-1">
                                  <p className="text-xs font-medium text-foreground truncate flex-1">
                                    {task.taskName}
                                  </p>
                                  {getConflictIcon(task.conflicts)}
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-foreground/60">
                                    {task.beoName}
                                  </span>
                                  <span
                                    className={cn(
                                      "px-1.5 py-0.5 rounded text-xs font-medium",
                                      task.status === "completed" &&
                                        "bg-green-500/20 text-green-600",
                                      task.status === "in_progress" &&
                                        "bg-blue-500/20 text-blue-600",
                                      task.status === "pending" &&
                                        "bg-gray-500/20 text-gray-600",
                                      task.status === "blocked" &&
                                        "bg-red-500/20 text-red-600",
                                    )}
                                  >
                                    {task.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conflicts summary */}
          {windowTasks.some(
            (task) => task.conflicts && task.conflicts.length > 0,
          ) && (
            <div className="mt-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Timeline Conflicts Detected
                  </p>
                  <p className="text-xs text-foreground/80">
                    Some tasks have scheduling conflicts. Click on tasks with
                    warning icons to view details.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MultiBEOProductionTimeline;
