import React from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/glass";
import type { Event, Space } from "../types";
import type { OpsEvent, OpsTask, OpsTaskStatus } from "@shared/types/ops-gantt";
import { detectConflicts } from "@shared/ops-gantt/conflicts";
import { computeRiskAndReadiness } from "@shared/ops-gantt/risk";
import { computeCriticalPathAndSlack } from "@shared/ops-gantt/scheduler";
import { computeResourceLoad } from "@shared/ops-gantt/resources";
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

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "—";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch {
    return "—";
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

function startOfDayMs(msValue: number): number {
  const d = new Date(msValue);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function isWeekend(msValue: number): boolean {
  const d = new Date(msValue);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  return day === 0 || day === 6;
}

function isWeekStart(msValue: number): boolean {
  // Monday start (template-like)
  const d = new Date(msValue);
  const day = d.getDay(); // 1=Mon
  return day === 1;
}

function statusLabel(s: OpsTaskStatus): string {
  if (s === "not_started") return "Not started";
  if (s === "in_progress") return "In progress";
  if (s === "blocked") return "Blocked";
  return "Done";
}

function statusPillClasses(s: OpsTaskStatus): string {
  switch (s) {
    case "done":
      return "bg-green-500/10 text-green-600 border-green-500/25";
    case "blocked":
      return "bg-red-500/10 text-red-600 border-red-500/25";
    case "in_progress":
      return "bg-amber-500/10 text-amber-600 border-amber-500/25";
    default:
      return "bg-foreground/5 text-foreground/70 border-border/30";
  }
}

type Row =
  | {
      kind: "project";
      id: string;
      depth: 0;
      event: Event;
      opsEvent: OpsEvent;
      tasks: OpsTask[];
      progress: number;
      readyT24: boolean;
      riskScore: number;
      readinessPct: number;
      blockedCount: number;
      dueSoonCount: number;
      missingArtifactsCount: number;
      projectStart: string;
      projectEnd: string;
    }
  | {
      kind: "section";
      id: string;
      depth: 1;
      eventId: string;
      label: string;
      tasks: OpsTask[];
      progress: number;
      start: string;
      end: string;
    }
  | {
      kind: "task";
      id: string;
      depth: 2;
      task: OpsTask;
      start: string;
      end: string;
    };

export function MasterOpsGantt({
  events,
  spaces,
  daysAhead = 30,
  scope = "all",
  onTaskClick,
  scrollKey,
}: {
  events: Event[];
  spaces: Space[];
  daysAhead?: number;
  scope?: "all" | "beo" | "production";
  onTaskClick?: (task: OpsTask) => void;
  scrollKey?: string;
}) {
  const spacesById = React.useMemo(
    () => new Map(spaces.map((s) => [s.id, s])),
    [spaces],
  );
  const viewKey = scrollKey ?? "maestro-bqt:master-ops";
  const [viewState, setViewState] = usePersistedViewState<{
    collapsedProjects: string[];
    collapsedSections: string[];
    query: string;
    preset: "all" | "at_risk" | "blocked" | "purchasing_due" | "receiving_due";
    scale: "days" | "weeks";
    zoom: number;
    showMetrics: boolean;
  }>({
    key: `view:${viewKey}`,
    defaultValue: {
      collapsedProjects: [],
      collapsedSections: [],
      query: "",
      preset: "all",
      scale: "days",
      zoom: 1,
      showMetrics: true,
    },
  });

  const collapsedProjects = React.useMemo(
    () => new Set(viewState.collapsedProjects || []),
    [viewState.collapsedProjects],
  );
  const collapsedSections = React.useMemo(
    () => new Set(viewState.collapsedSections || []),
    [viewState.collapsedSections],
  );
  const query = viewState.query || "";
  const preset = viewState.preset;
  const scale = viewState.scale;
  const zoom = Number.isFinite(viewState.zoom) ? viewState.zoom : 1;
  const showMetrics = Boolean(viewState.showMetrics);

  const setQuery = (next: string) =>
    setViewState((s) => ({ ...s, query: next }));
  const setPreset = (next: typeof preset) =>
    setViewState((s) => ({ ...s, preset: next }));
  const setScale = (next: typeof scale) =>
    setViewState((s) => ({ ...s, scale: next }));
  const setZoom = (next: number) =>
    setViewState((s) => ({
      ...s,
      zoom: clamp(Math.round(next * 100) / 100, 0.5, 2.5),
    }));
  const setShowMetrics = (next: boolean) =>
    setViewState((s) => ({ ...s, showMetrics: next }));
  const toggleCollapsedProject = (id: string) =>
    setViewState((s) => {
      const next = new Set(s.collapsedProjects || []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...s, collapsedProjects: Array.from(next) };
    });
  const toggleCollapsedSection = (id: string) =>
    setViewState((s) => {
      const next = new Set(s.collapsedSections || []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...s, collapsedSections: Array.from(next) };
    });
  const [hoveredCol, setHoveredCol] = React.useState<number | null>(null);

  const now = Date.now();
  const windowEnd =
    now + Math.max(1, Math.round(daysAhead)) * 24 * 60 * 60 * 1000;
  const { scrollRef } = usePersistedScroll({
    storageKey: `scroll:${scrollKey ?? "maestro-bqt:master-ops"}`,
    enabled: true,
  });

  const projects = React.useMemo(() => {
    const out: Array<{
      event: Event;
      opsEvent: OpsEvent;
      tasks: OpsTask[];
      progress: number;
      readyT24: boolean;
      start: string;
      end: string;
    }> = [];

    for (const evt of events) {
      const startMs = ms(evt.startDateTime);
      const endMs = ms(evt.endDateTime);
      if (startMs === null || endMs === null) continue;
      if (startMs > windowEnd) continue;

      const spaceName = (() => {
        const first = evt.spaceIds?.[0];
        if (!first) return evt.metadata?.space ?? "Unassigned Space";
        return spacesById.get(first)?.name ?? first;
      })();

      const opsEvent: OpsEvent = {
        eventId: evt.id,
        beoNumber: evt.metadata?.beoNumber ?? `BEO-${evt.id}`,
        eventName: evt.name || evt.id,
        clientName: evt.metadata?.clientName ?? "Client",
        property: evt.metadata?.property ?? "Local Property",
        space: spaceName,
        eventType: evt.metadata?.eventType ?? evt.metadata?.type ?? "banquet",
        startDateTime: evt.startDateTime,
        endDateTime: evt.endDateTime,
        setupStart:
          evt.metadata?.setupStart ??
          new Date(startMs - 2 * 60 * 60 * 1000).toISOString(),
        strikeEnd:
          evt.metadata?.strikeEnd ??
          new Date(endMs + 60 * 60 * 1000).toISOString(),
        guestCountGuaranteed:
          evt.metadata?.guestCountGuaranteed ?? evt.guestCountExpected ?? 0,
        guestCountExpected: evt.guestCountExpected ?? 0,
        serviceStyle: evt.metadata?.serviceStyle ?? "buffet",
        status:
          evt.status === "definite"
            ? "definite"
            : evt.status === "canceled"
              ? "canceled"
              : evt.status === "completed"
                ? "completed"
                : "tentative",
        financialStatus: evt.metadata?.financialStatus ?? "deposit_due",
        priority: evt.metadata?.priority ?? "P2",
        lastBEORevision: evt.metadata?.lastBEORevision ?? 1,
        revisionHistory: evt.metadata?.revisionHistory ?? [],
        owners: evt.metadata?.owners ?? {},
      };

      const derived = deriveOpsForEvent({
        event: evt,
        spacesById,
        includeProductionScope: true,
      });
      const filtered =
        scope === "all"
          ? derived.tasks
          : scope === "beo"
            ? derived.tasks.filter((t) => t.scope === "beo")
            : derived.tasks.filter((t) => t.scope === "production");

      const conflicts = detectConflicts(filtered);
      const risk = computeRiskAndReadiness(filtered, { conflicts });

      const progress =
        filtered.length === 0
          ? 0
          : Math.round(
              filtered.reduce((acc, t) => acc + (t.percentComplete ?? 0), 0) /
                filtered.length,
            );

      // “Ready by T-24h” = all tasks that end within 24h of event start are done (best-effort heuristic for now).
      const t24 = startMs - 24 * 60 * 60 * 1000;
      const dueByT24 = filtered.filter((t) => {
        const e = ms(t.end);
        if (e === null) return false;
        return e <= t24;
      });
      const readyT24 =
        dueByT24.length === 0
          ? false
          : dueByT24.every((t) => t.status === "done");

      const times = filtered
        .flatMap((t) => [ms(t.start), ms(t.end)])
        .filter(
          (v): v is number => typeof v === "number" && Number.isFinite(v),
        );
      const minT = times.length ? Math.min(...times) : startMs;
      const maxT = times.length ? Math.max(...times) : endMs;

      out.push({
        event: evt,
        opsEvent,
        tasks: risk.tasks,
        progress,
        readyT24,
        start: new Date(minT).toISOString(),
        end: new Date(maxT).toISOString(),
        // risk summary isn't part of this object; injected later when building rows
      });
    }

    out.sort(
      (a, b) =>
        (ms(a.opsEvent.startDateTime) ?? 0) -
        (ms(b.opsEvent.startDateTime) ?? 0),
    );
    return out;
  }, [events, scope, spacesById, windowEnd]);

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: Row[] = [];

    for (const p of projects) {
      const projectId = p.opsEvent.eventId;
      const projectCollapsed = collapsedProjects.has(projectId);

      const conflicts = detectConflicts(p.tasks);
      const risk = computeRiskAndReadiness(p.tasks, { conflicts });

      const isPurchasingDue = risk.tasks.some(
        (t) =>
          t.department === "Purchasing" &&
          t.status !== "done" &&
          (ms(t.end) ?? Infinity) <= Date.now() + 72 * 60 * 60 * 1000,
      );
      const isReceivingDue = risk.tasks.some(
        (t) =>
          t.department === "Receiving" &&
          t.status !== "done" &&
          (ms(t.end) ?? Infinity) <= Date.now() + 72 * 60 * 60 * 1000,
      );
      const hasBlocked = risk.summary.blockedCount > 0;
      const atRisk = risk.summary.eventRiskScore >= 60 || !p.readyT24;

      const byDept = new Map<string, OpsTask[]>();
      for (const t of p.tasks) {
        const label = `${t.department}${t.scope === "production" ? " (Production)" : ""}`;
        const arr = byDept.get(label) ?? [];
        arr.push(t);
        byDept.set(label, arr);
      }

      const depts = Array.from(byDept.entries())
        .map(([label, tasks]) => ({
          label,
          tasks: tasks
            .slice()
            .sort((a, b) => (ms(a.start) ?? 0) - (ms(b.start) ?? 0)),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      const includeProject =
        q.length === 0 ||
        p.opsEvent.eventName.toLowerCase().includes(q) ||
        p.opsEvent.beoNumber.toLowerCase().includes(q) ||
        depts.some((d) =>
          d.tasks.some((t) => t.title.toLowerCase().includes(q)),
        );

      if (!includeProject) continue;

      // Preset filters (fast ops views)
      if (preset === "blocked" && !hasBlocked) continue;
      if (preset === "at_risk" && !atRisk) continue;
      if (preset === "purchasing_due" && !isPurchasingDue) continue;
      if (preset === "receiving_due" && !isReceivingDue) continue;

      out.push({
        kind: "project",
        id: projectId,
        depth: 0,
        event: p.event,
        opsEvent: p.opsEvent,
        tasks: risk.tasks,
        progress: p.progress,
        readyT24: p.readyT24,
        riskScore: risk.summary.eventRiskScore,
        readinessPct: risk.summary.readinessPct,
        blockedCount: risk.summary.blockedCount,
        dueSoonCount: risk.summary.dueSoonCount,
        missingArtifactsCount: risk.summary.missingArtifactsCount,
        projectStart: p.start,
        projectEnd: p.end,
      });

      if (projectCollapsed) continue;

      for (const d of depts) {
        const sectionId = `${projectId}:${d.label}`;
        const sectionCollapsed = collapsedSections.has(sectionId);

        const sectionProgress =
          d.tasks.length === 0
            ? 0
            : Math.round(
                d.tasks.reduce((acc, t) => acc + (t.percentComplete ?? 0), 0) /
                  d.tasks.length,
              );

        const sectionStart = (() => {
          const times = d.tasks
            .map((t) => ms(t.start))
            .filter((v): v is number => v !== null);
          return times.length
            ? new Date(Math.min(...times)).toISOString()
            : p.start;
        })();
        const sectionEnd = (() => {
          const times = d.tasks
            .map((t) => ms(t.end))
            .filter((v): v is number => v !== null);
          return times.length
            ? new Date(Math.max(...times)).toISOString()
            : p.end;
        })();

        out.push({
          kind: "section",
          id: sectionId,
          depth: 1,
          eventId: projectId,
          label: d.label,
          tasks: d.tasks,
          progress: sectionProgress,
          start: sectionStart,
          end: sectionEnd,
        });
        if (sectionCollapsed) continue;

        for (const t of d.tasks) {
          if (
            q.length &&
            !t.title.toLowerCase().includes(q) &&
            !p.opsEvent.eventName.toLowerCase().includes(q)
          )
            continue;
          out.push({
            kind: "task",
            id: t.taskId,
            depth: 2,
            task: t,
            start: t.start,
            end: t.end,
          });
        }
      }
    }

    return out;
  }, [projects, collapsedProjects, collapsedSections, query]);

  const portfolio = React.useMemo(() => {
    const nowMs = Date.now();
    const tasks = projects.flatMap((p) => p.tasks);

    const purchasingLate = tasks.filter((t) => {
      if (t.department !== "Purchasing") return false;
      if (t.status === "done") return false;
      const hasPo =
        (t.requiredArtifacts ?? []).includes("po_sent") ||
        (t.requiredArtifacts ?? []).includes("vendor_confirmed");
      if (!hasPo) return false;
      const e = ms(t.end);
      return e !== null && e < nowMs;
    }).length;

    const receivingLate = tasks.filter((t) => {
      if (t.department !== "Receiving") return false;
      if (t.status === "done") return false;
      const hasRecv = (t.requiredArtifacts ?? []).includes(
        "deliveries_received_complete",
      );
      if (!hasRecv) return false;
      const e = ms(t.end);
      return e !== null && e < nowMs;
    }).length;

    const byDept = new Map<string, number[]>();
    for (const t of tasks) {
      const arr = byDept.get(t.department) ?? [];
      arr.push(t.percentComplete ?? 0);
      byDept.set(t.department, arr);
    }
    const readinessByDept = Array.from(byDept.entries())
      .map(([dept, vals]) => ({
        dept,
        pct: vals.length
          ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
          : 0,
      }))
      .sort((a, b) => b.pct - a.pct);

    // Critical tasks due buckets (24/48/72h)
    const criticalDue = { h24: 0, h48: 0, h72: 0 };
    const criticalList: Array<{
      eventName: string;
      title: string;
      due: string;
      dept: string;
      scope: string;
    }> = [];
    for (const p of projects) {
      const { tasks: withSlack, criticalPathTaskIds } =
        computeCriticalPathAndSlack(p.tasks);
      const set = new Set(criticalPathTaskIds);
      for (const t of withSlack) {
        if (!set.has(t.taskId)) continue;
        if (t.status === "done") continue;
        const e = ms(t.end);
        if (e === null) continue;
        const delta = e - nowMs;
        if (delta <= 24 * 60 * 60 * 1000) criticalDue.h24 += 1;
        if (delta <= 48 * 60 * 60 * 1000) criticalDue.h48 += 1;
        if (delta <= 72 * 60 * 60 * 1000) criticalDue.h72 += 1;
        if (delta <= 72 * 60 * 60 * 1000) {
          criticalList.push({
            eventName: p.opsEvent.eventName,
            title: t.title,
            due: t.end,
            dept: t.department,
            scope: t.scope,
          });
        }
      }
    }
    criticalList.sort((a, b) => (ms(a.due) ?? 0) - (ms(b.due) ?? 0));

    // Resource overload (synthetic team resources by department).
    const teamResources = readinessByDept.map((d) => ({
      resourceId: `team-${d.dept}`,
      resourceType: "team" as const,
      name: `${d.dept} Team`,
      capacity:
        d.dept === "Culinary"
          ? 4
          : d.dept === "BanquetOps"
            ? 6
            : d.dept === "Pastry"
              ? 2
              : 2,
    }));
    const tasksWithTeams = tasks.map((t) => ({
      ...t,
      resourceIds: [`team-${t.department}`],
    }));
    const load = computeResourceLoad(tasksWithTeams, teamResources, {
      bucketMinutes: 60,
    });
    const overload = load.conflicts
      .slice()
      .sort(
        (a, b) => b.observedPeak - b.capacity - (a.observedPeak - a.capacity),
      )
      .slice(0, 6)
      .map((c) => ({
        name:
          teamResources.find((r) => r.resourceId === c.resourceId)?.name ??
          c.resourceId,
        message: c.message,
      }));

    const conflicts = detectConflicts(tasks);
    const risk = computeRiskAndReadiness(tasks, { nowMs, conflicts });

    const atRiskEvents = projects.filter((p) => {
      const rr = computeRiskAndReadiness(p.tasks, {
        nowMs,
        conflicts: detectConflicts(p.tasks),
      });
      return rr.summary.eventRiskScore >= 60;
    }).length;

    return {
      risk,
      readinessByDept,
      purchasingLate,
      receivingLate,
      atRiskEvents,
      criticalDue,
      criticalList: criticalList.slice(0, 10),
      overload,
    };
  }, [projects]);

  const timeWindow = React.useMemo(() => {
    const times = rows
      .flatMap((r) =>
        r.kind === "task"
          ? [ms(r.start), ms(r.end)]
          : r.kind === "section"
            ? [ms(r.start), ms(r.end)]
            : [ms(r.projectStart), ms(r.projectEnd)],
      )
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    const start = times.length ? Math.min(...times) : Date.now();
    const end = times.length ? Math.max(...times) : start + 24 * 60 * 60 * 1000;

    // pad
    const pad = 12 * 60 * 60 * 1000;
    return { startMs: start - pad, endMs: end + pad };
  }, [rows]);

  const timeline = React.useMemo(() => {
    const span = timeWindow.endMs - timeWindow.startMs;
    const day = 24 * 60 * 60 * 1000;

    const unitMs = scale === "weeks" ? 7 * day : day;
    const unitCount = Math.max(1, Math.ceil(span / unitMs));
    const colWidth = Math.round((scale === "weeks" ? 180 : 64) * zoom);
    const width = Math.max(920, unitCount * colWidth);

    const cols = Array.from({ length: unitCount }).map((_, i) => {
      const at = timeWindow.startMs + i * unitMs;
      const d = new Date(at);
      const label =
        scale === "weeks"
          ? `Wk of ${d.toISOString().slice(0, 10)}`
          : d.toLocaleDateString([], { month: "short", day: "numeric" });
      return { at, label };
    });

    return { unitMs, unitCount, colWidth, width, cols };
  }, [timeWindow, scale, zoom]);

  const todayStartMs = React.useMemo(() => startOfDayMs(Date.now()), []);

  const leftWidth = 640;
  const rowHeight = 32;

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b border-border/20 bg-background/95 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-foreground">
            Master Ops Gantt
          </div>
          <div className="text-xs text-foreground/60">
            {fmtDate(new Date(timeWindow.startMs).toISOString())} →{" "}
            {fmtDate(new Date(timeWindow.endMs).toISOString())}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMetrics((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-md border border-border/30 text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            {showMetrics ? "Hide metrics" : "Show metrics"}
          </button>

          <div className="inline-flex rounded-md border border-border/30 overflow-hidden">
            {[
              { id: "all", label: "All" },
              { id: "at_risk", label: "At risk" },
              { id: "blocked", label: "Blocked" },
              { id: "purchasing_due", label: "Purchasing due" },
              { id: "receiving_due", label: "Receiving due" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPreset(p.id as any)}
                className={cn(
                  "px-3 py-1.5 text-xs transition-colors",
                  preset === (p.id as any)
                    ? "bg-primary/20 text-primary"
                    : "bg-background text-foreground/70 hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-foreground/50 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks / BEO..."
              className="h-9 w-[240px] rounded-md border border-border bg-background pl-8 pr-2 text-sm text-foreground"
            />
          </div>

          <div className="inline-flex rounded-md border border-border/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setScale("days")}
              className={cn(
                "px-3 py-1.5 text-xs transition-colors",
                scale === "days"
                  ? "bg-primary/20 text-primary"
                  : "bg-background text-foreground/70 hover:text-foreground",
              )}
            >
              Days
            </button>
            <button
              type="button"
              onClick={() => setScale("weeks")}
              className={cn(
                "px-3 py-1.5 text-xs transition-colors",
                scale === "weeks"
                  ? "bg-primary/20 text-primary"
                  : "bg-background text-foreground/70 hover:text-foreground",
              )}
            >
              Weeks
            </button>
          </div>

          <div className="inline-flex rounded-md border border-border/30 overflow-hidden">
            <button
              type="button"
              onClick={() =>
                setZoom((z) =>
                  Math.max(0.75, Math.round((z - 0.25) * 100) / 100),
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

      {showMetrics ? (
        <div className="border-b border-border/20 bg-background/60 px-4 py-3">
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-4 rounded-lg border border-border/20 bg-background/40 p-3">
              <div className="text-xs font-semibold text-foreground mb-2">
                Readiness by department
              </div>
              <div className="space-y-2">
                {portfolio.readinessByDept.slice(0, 8).map((d) => (
                  <div key={d.dept} className="flex items-center gap-2">
                    <div className="w-[90px] text-[11px] text-foreground/70 truncate">
                      {d.dept}
                    </div>
                    <div className="flex-1 h-2 rounded bg-foreground/5 border border-border/20 overflow-hidden">
                      <div
                        className="h-full bg-primary/35"
                        style={{ width: `${clamp(d.pct, 0, 100)}%` }}
                      />
                    </div>
                    <div className="w-[34px] text-[11px] text-foreground/60 text-right">
                      {d.pct}%
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 rounded-lg border border-border/20 bg-background/40 p-3">
              <div className="text-xs font-semibold text-foreground mb-2">
                Hot list (next 72h)
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-foreground/70">
                <div className="rounded-md border border-border/20 bg-background/30 p-2">
                  <div className="text-foreground/50">Critical due 24h</div>
                  <div className="text-sm font-semibold text-foreground">
                    {portfolio.criticalDue.h24}
                  </div>
                </div>
                <div className="rounded-md border border-border/20 bg-background/30 p-2">
                  <div className="text-foreground/50">Critical due 48h</div>
                  <div className="text-sm font-semibold text-foreground">
                    {portfolio.criticalDue.h48}
                  </div>
                </div>
                <div className="rounded-md border border-border/20 bg-background/30 p-2">
                  <div className="text-foreground/50">Critical due 72h</div>
                  <div className="text-sm font-semibold text-foreground">
                    {portfolio.criticalDue.h72}
                  </div>
                </div>
                <div className="rounded-md border border-border/20 bg-background/30 p-2">
                  <div className="text-foreground/50">Blocked tasks</div>
                  <div className="text-sm font-semibold text-foreground">
                    {portfolio.risk.summary.blockedCount}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-[11px] text-foreground/60">
                At-risk events:{" "}
                <span className="text-foreground">
                  {portfolio.atRiskEvents}
                </span>{" "}
                • Portfolio risk:{" "}
                <span className="text-foreground">
                  {portfolio.risk.summary.eventRiskScore}
                </span>{" "}
                • Readiness:{" "}
                <span className="text-foreground">
                  {portfolio.risk.summary.readinessPct}%
                </span>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 rounded-lg border border-border/20 bg-background/40 p-3">
              <div className="text-xs font-semibold text-foreground mb-2">
                Purchasing / Receiving
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-foreground/70">
                <div className="rounded-md border border-border/20 bg-background/30 p-2">
                  <div className="text-foreground/50">Late POs</div>
                  <div className="text-sm font-semibold text-foreground">
                    {portfolio.purchasingLate}
                  </div>
                </div>
                <div className="rounded-md border border-border/20 bg-background/30 p-2">
                  <div className="text-foreground/50">Late receiving</div>
                  <div className="text-sm font-semibold text-foreground">
                    {portfolio.receivingLate}
                  </div>
                </div>
                <div className="col-span-2 rounded-md border border-border/20 bg-background/30 p-2">
                  <div className="text-foreground/50">Overload</div>
                  {portfolio.overload.length === 0 ? (
                    <div className="text-[11px] text-foreground/60">
                      No overload conflicts detected.
                    </div>
                  ) : (
                    <div className="mt-1 space-y-1">
                      {portfolio.overload.map((o, idx) => (
                        <div
                          key={idx}
                          className="text-[11px] text-foreground/70 truncate"
                        >
                          {o.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-12 rounded-lg border border-border/20 bg-background/40 p-3">
              <div className="text-xs font-semibold text-foreground mb-2">
                Critical tasks due (next 72h)
              </div>
              {portfolio.criticalList.length === 0 ? (
                <div className="text-[11px] text-foreground/60">
                  No critical tasks due in the next 72 hours.
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-2">
                  {portfolio.criticalList.map((t, idx) => (
                    <div
                      key={idx}
                      className="col-span-12 lg:col-span-6 rounded-md border border-border/20 bg-background/30 p-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] text-foreground/70 truncate">
                          <span className="text-foreground/50">
                            {t.eventName}
                          </span>{" "}
                          • {t.title}
                        </div>
                        <div className="text-[11px] text-foreground/60 whitespace-nowrap">
                          {fmtDate(t.due)} {fmtTime(t.due)}
                        </div>
                      </div>
                      <div className="text-[11px] text-foreground/50 mt-0.5">
                        {t.dept} • {t.scope.toUpperCase()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Split grid */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div ref={scrollRef as any} className="h-full overflow-auto">
          <div
            className="min-w-full"
            style={{ width: leftWidth + timeline.width }}
          >
            {/* Header row */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/20 flex">
              <div
                className="flex sticky left-0 z-20 bg-background/95 backdrop-blur-sm border-r border-border/20 shadow-[8px_0_18px_rgba(0,0,0,0.18)]"
                style={{ width: leftWidth }}
              >
                <div className="w-[330px] px-3 py-2 text-[11px] font-semibold text-foreground/70 border-r border-border/20">
                  Task / BEO
                </div>
                <div className="w-[120px] px-3 py-2 text-[11px] font-semibold text-foreground/70 border-r border-border/20">
                  Assignee
                </div>
                <div className="w-[90px] px-3 py-2 text-[11px] font-semibold text-foreground/70 border-r border-border/20">
                  Start
                </div>
                <div className="w-[90px] px-3 py-2 text-[11px] font-semibold text-foreground/70 border-r border-border/20">
                  Due
                </div>
                <div className="w-[90px] px-3 py-2 text-[11px] font-semibold text-foreground/70">
                  Status
                </div>
              </div>

              <div className="flex" style={{ width: timeline.width }}>
                {timeline.cols.map((c, idx) => (
                  <div
                    key={`${c.at}-${idx}`}
                    className={cn(
                      "px-2 py-2 text-[11px] font-semibold text-foreground/80 border-l border-border/25 whitespace-nowrap",
                      idx % 2 === 1 && "bg-foreground/[0.03]",
                      scale === "days" &&
                        isWeekend(c.at) &&
                        "bg-amber-500/[0.06]",
                      scale === "days" &&
                        startOfDayMs(c.at) === todayStartMs &&
                        "bg-primary/[0.10]",
                    )}
                    style={{ width: timeline.colWidth }}
                  >
                    {c.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Rows */}
            {rows.length === 0 ? (
              <div className="p-6 text-sm text-foreground/60">
                No BEOs in range.
              </div>
            ) : (
              <div
                className="relative"
                style={{ height: rows.length * rowHeight }}
                onMouseLeave={() => setHoveredCol(null)}
              >
                {rows.map((r, rowIdx) => {
                  const startMs = ms(
                    r.kind === "task"
                      ? r.start
                      : r.kind === "section"
                        ? r.start
                        : r.projectStart,
                  );
                  const endMs = ms(
                    r.kind === "task"
                      ? r.end
                      : r.kind === "section"
                        ? r.end
                        : r.projectEnd,
                  );
                  const span = timeWindow.endMs - timeWindow.startMs;
                  const leftPx =
                    startMs === null
                      ? 0
                      : ((clamp(startMs, timeWindow.startMs, timeWindow.endMs) -
                          timeWindow.startMs) /
                          span) *
                        timeline.width;
                  const rightPx =
                    endMs === null
                      ? 0
                      : ((clamp(endMs, timeWindow.startMs, timeWindow.endMs) -
                          timeWindow.startMs) /
                          span) *
                        timeline.width;
                  const widthPx = clamp(rightPx - leftPx, 6, timeline.width);

                  const nameCell = (() => {
                    if (r.kind === "project") {
                      return (
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleCollapsedProject(r.id)}
                            className="h-6 w-6 rounded hover:bg-foreground/5 flex items-center justify-center flex-shrink-0"
                            title="Expand/collapse"
                          >
                            {collapsedProjects.has(r.id) ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-foreground truncate">
                              {r.opsEvent.eventName}{" "}
                              <span className="text-foreground/50">
                                • {r.opsEvent.beoNumber}
                              </span>
                            </div>
                            <div className="text-[11px] text-foreground/60 truncate">
                              {fmtDate(r.opsEvent.startDateTime)}{" "}
                              {fmtTime(r.opsEvent.startDateTime)}–
                              {fmtTime(r.opsEvent.endDateTime)} •{" "}
                              {r.event.guestCountExpected} guests •{" "}
                              <span
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full border",
                                  r.readyT24
                                    ? "bg-green-500/10 text-green-600 border-green-500/25"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/25",
                                )}
                              >
                                {r.readyT24 ? "Ready T-24" : "At risk T-24"}
                              </span>{" "}
                              <span
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full border",
                                  r.riskScore >= 70
                                    ? "bg-red-500/10 text-red-600 border-red-500/25"
                                    : r.riskScore >= 50
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/25"
                                      : "bg-green-500/10 text-green-600 border-green-500/25",
                                )}
                                title={`Risk ${r.riskScore}/100 • readiness ${r.readinessPct}% • blocked ${r.blockedCount} • due soon ${r.dueSoonCount}`}
                              >
                                Risk {r.riskScore}
                              </span>{" "}
                              <span
                                className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded-full border",
                                  r.readinessPct >= 85
                                    ? "bg-green-500/10 text-green-600 border-green-500/25"
                                    : r.readinessPct >= 60
                                      ? "bg-amber-500/10 text-amber-600 border-amber-500/25"
                                      : "bg-red-500/10 text-red-600 border-red-500/25",
                                )}
                                title="Readiness (avg % complete)"
                              >
                                {r.readinessPct}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    if (r.kind === "section") {
                      const key = r.id;
                      return (
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6" />
                          <button
                            type="button"
                            onClick={() => toggleCollapsedSection(key)}
                            className="h-6 w-6 rounded hover:bg-foreground/5 flex items-center justify-center flex-shrink-0"
                            title="Expand/collapse"
                          >
                            {collapsedSections.has(key) ? (
                              <ChevronRight className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <div className="text-xs font-semibold text-foreground/80 truncate">
                            {r.label}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={() => onTaskClick?.(r.task)}
                        className="w-full text-left flex items-center gap-2 min-w-0 hover:bg-foreground/5 rounded px-1 py-0.5"
                        title="Open details"
                      >
                        <div className="w-6" />
                        <div className="w-6" />
                        <div className="text-xs text-foreground truncate">
                          {r.task.title}
                        </div>
                      </button>
                    );
                  })();

                  const progress =
                    r.kind === "project"
                      ? r.progress
                      : r.kind === "section"
                        ? r.progress
                        : (r.task.percentComplete ?? 0);
                  const status =
                    r.kind === "task" ? r.task.status : "in_progress";

                  return (
                    <div
                      key={r.id}
                      className={cn(
                        "flex w-full border-b border-border/10",
                        rowIdx % 2 === 1 && "bg-foreground/[0.01]",
                      )}
                      style={{
                        position: "absolute",
                        top: rowIdx * rowHeight,
                        height: rowHeight,
                      }}
                    >
                      <div
                        className={cn(
                          "flex items-center border-r border-border/20 sticky left-0 z-10 shadow-[8px_0_18px_rgba(0,0,0,0.12)]",
                          r.kind === "project" && "bg-background/40",
                          r.kind === "section" && "bg-background/20",
                          r.kind === "task" && "bg-background/10",
                        )}
                        style={{ width: leftWidth, height: rowHeight }}
                      >
                        <div className="w-[330px] px-2">
                          <div className="pl-2">{nameCell}</div>
                        </div>
                        <div className="w-[120px] px-3 text-xs text-foreground/50 border-l border-border/10">
                          —
                        </div>
                        <div className="w-[90px] px-3 text-xs text-foreground/60 border-l border-border/10">
                          {fmtDate(
                            r.kind === "task"
                              ? r.start
                              : r.kind === "section"
                                ? r.start
                                : r.projectStart,
                          )}
                        </div>
                        <div className="w-[90px] px-3 text-xs text-foreground/60 border-l border-border/10">
                          {fmtDate(
                            r.kind === "task"
                              ? r.end
                              : r.kind === "section"
                                ? r.end
                                : r.projectEnd,
                          )}
                        </div>
                        <div className="w-[90px] px-3 border-l border-border/10">
                          {r.kind === "task" ? (
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full border text-[11px]",
                                statusPillClasses(status),
                              )}
                            >
                              {statusLabel(status)}
                            </span>
                          ) : (
                            <div className="text-[11px] text-foreground/50">
                              {r.kind === "project"
                                ? `${r.tasks.length} tasks`
                                : `${r.tasks.length} tasks`}
                            </div>
                          )}
                        </div>
                      </div>

                      <div
                        className="relative"
                        style={{ width: timeline.width, height: rowHeight }}
                      >
                        {/* Grid lines */}
                        <div className="absolute inset-0 pointer-events-none">
                          {timeline.cols.map((_, idx) => (
                            <div key={idx}>
                              {/* Alternating column shading */}
                              <div
                                className={cn(
                                  "absolute top-0 bottom-0",
                                  idx % 2 === 1 && "bg-foreground/[0.025]",
                                  scale === "days" &&
                                    isWeekend(timeline.cols[idx]!.at) &&
                                    "bg-amber-500/[0.05]",
                                  scale === "days" &&
                                    startOfDayMs(timeline.cols[idx]!.at) ===
                                      todayStartMs &&
                                    "bg-primary/[0.08]",
                                )}
                                style={{
                                  left: idx * timeline.colWidth,
                                  width: timeline.colWidth,
                                }}
                              />
                              {/* Stronger vertical separator */}
                              <div
                                className={cn(
                                  "absolute top-0 bottom-0 border-l",
                                  scale === "days" &&
                                    isWeekStart(timeline.cols[idx]!.at)
                                    ? "border-border/50 border-l-2"
                                    : "border-border/25",
                                )}
                                style={{ left: idx * timeline.colWidth }}
                              />
                            </div>
                          ))}
                        </div>

                        {/* Hover column highlight */}
                        {hoveredCol !== null ? (
                          <div
                            className="absolute top-0 bottom-0 bg-foreground/[0.03] pointer-events-none"
                            style={{
                              left: hoveredCol * timeline.colWidth,
                              width: timeline.colWidth,
                            }}
                          />
                        ) : null}

                        {/* Bar */}
                        <div
                          className={cn(
                            "absolute top-1/2 -translate-y-1/2 h-3 rounded-sm border",
                            r.kind === "task" &&
                              r.task.status === "blocked" &&
                              "border-red-500/30 bg-red-500/15",
                            r.kind === "task" &&
                              r.task.status === "done" &&
                              "border-green-500/30 bg-green-500/15",
                            r.kind === "task" &&
                              r.task.status === "in_progress" &&
                              "border-amber-500/30 bg-amber-500/15",
                            r.kind === "task" &&
                              r.task.status === "not_started" &&
                              "border-border/30 bg-foreground/5",
                            r.kind !== "task" &&
                              "border-primary/25 bg-primary/10",
                          )}
                          style={{ left: leftPx, width: widthPx }}
                        >
                          <div
                            className="h-full rounded-sm bg-primary/35"
                            style={{ width: `${clamp(progress, 0, 100)}%` }}
                          />
                        </div>

                        {/* Hover detection layer */}
                        <div
                          className="absolute inset-0"
                          onMouseMove={(e) => {
                            const rect = (
                              e.currentTarget as HTMLDivElement
                            ).getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const idx = Math.max(
                              0,
                              Math.min(
                                timeline.unitCount - 1,
                                Math.floor(x / timeline.colWidth),
                              ),
                            );
                            setHoveredCol(idx);
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
