import type { OpsDependencyType, OpsTask, UUID } from "../types/ops-gantt";
import { parseIsoToMs, formatMsToIso } from "./time";

export interface RecalculateScheduleOptions {
  /**
   * When true, tasks are shifted later to satisfy dependency constraints,
   * while preserving each task's durationMinutes.
   *
   * When false, dependency constraints are evaluated, but tasks are not shifted
   * (useful for diagnostics-only).
   */
  shiftToSatisfyDependencies: boolean;
}

export interface RecalculateScheduleIssue {
  kind: "invalid_datetime" | "missing_dependency_task" | "cyclic_dependencies";
  message: string;
  taskId?: UUID;
  dependsOnTaskId?: UUID;
}

export interface RecalculateScheduleResult {
  tasks: OpsTask[];
  issues: RecalculateScheduleIssue[];
}

type Edge = {
  from: UUID;
  to: UUID;
  type: OpsDependencyType;
  lagMinutes: number;
};

const DEFAULT_DEP_TYPE: OpsDependencyType = "FS";

function toEdges(tasks: OpsTask[]): { edges: Edge[]; issues: RecalculateScheduleIssue[] } {
  const issues: RecalculateScheduleIssue[] = [];
  const byId = new Map(tasks.map((t) => [t.taskId, t] as const));
  const edges: Edge[] = [];

  for (const t of tasks) {
    for (const dep of t.dependencies ?? []) {
      if (!byId.has(dep.dependsOnTaskId)) {
        issues.push({
          kind: "missing_dependency_task",
          message: `Task '${t.taskId}' depends on missing task '${dep.dependsOnTaskId}'.`,
          taskId: t.taskId,
          dependsOnTaskId: dep.dependsOnTaskId,
        });
        continue;
      }
      edges.push({
        from: dep.dependsOnTaskId,
        to: t.taskId,
        type: dep.type ?? DEFAULT_DEP_TYPE,
        lagMinutes: dep.lagMinutes ?? 0,
      });
    }
  }

  return { edges, issues };
}

function topoSort(taskIds: UUID[], edges: Edge[]): { topo: UUID[]; cyclic: boolean } {
  const indeg = new Map<UUID, number>();
  const out = new Map<UUID, Edge[]>();
  for (const id of taskIds) indeg.set(id, 0);
  for (const e of edges) {
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    if (!out.has(e.from)) out.set(e.from, []);
    out.get(e.from)!.push(e);
  }

  const q: UUID[] = [];
  for (const [id, d] of indeg.entries()) if (d === 0) q.push(id);

  const topo: UUID[] = [];
  while (q.length) {
    const id = q.shift()!;
    topo.push(id);
    for (const e of out.get(id) ?? []) {
      indeg.set(e.to, (indeg.get(e.to) ?? 0) - 1);
      if ((indeg.get(e.to) ?? 0) === 0) q.push(e.to);
    }
  }

  return { topo, cyclic: topo.length !== taskIds.length };
}

/**
 * Recalculate schedule by enforcing dependency constraints.
 *
 * This is the core for:
 * - Dragging tasks (then reflow dependents)
 * - Bulk shifting an event schedule
 * - Template instantiation correctness when upstream dates change
 */
export function recalculateSchedule(
  inputTasks: OpsTask[],
  options: RecalculateScheduleOptions = { shiftToSatisfyDependencies: true },
): RecalculateScheduleResult {
  const issues: RecalculateScheduleIssue[] = [];
  const tasks = inputTasks.map((t) => ({ ...t }));

  const taskIds = tasks.map((t) => t.taskId);
  const { edges, issues: edgeIssues } = toEdges(tasks);
  issues.push(...edgeIssues);

  const startMs = new Map<UUID, number>();
  const endMs = new Map<UUID, number>();
  const durMs = new Map<UUID, number>();

  for (const t of tasks) {
    const s = parseIsoToMs(t.start);
    const e = parseIsoToMs(t.end);
    if (s === null || e === null) {
      issues.push({
        kind: "invalid_datetime",
        message: `Invalid datetime for task '${t.taskId}'.`,
        taskId: t.taskId,
      });
      continue;
    }
    const durationMs = Math.max(0, Math.round(t.durationMinutes)) * 60_000;
    startMs.set(t.taskId, s);
    endMs.set(t.taskId, e);
    durMs.set(t.taskId, durationMs);
  }

  const { topo, cyclic } = topoSort(taskIds, edges);
  if (cyclic) {
    issues.push({
      kind: "cyclic_dependencies",
      message: "Cyclic dependencies detected; schedule recalculation is best-effort.",
    });
  }

  if (!options.shiftToSatisfyDependencies) {
    return { tasks, issues };
  }

  // Forward reflow: if a task violates constraints, shift it later (preserving duration).
  for (const id of topo) {
    const s = startMs.get(id);
    const d = durMs.get(id);
    if (s === undefined || d === undefined) continue;

    let requiredStart = s;

    const incoming = edges.filter((e) => e.to === id);
    for (const edge of incoming) {
      const predStart = startMs.get(edge.from);
      const predEnd = endMs.get(edge.from);
      const predDur = durMs.get(edge.from);
      if (predStart === undefined || predEnd === undefined || predDur === undefined) continue;
      const lag = edge.lagMinutes * 60_000;

      if (edge.type === "FS") {
        requiredStart = Math.max(requiredStart, predEnd + lag);
      } else if (edge.type === "SS") {
        requiredStart = Math.max(requiredStart, predStart + lag);
      } else if (edge.type === "FF") {
        // Our finish must be >= predecessor finish + lag.
        const requiredFinish = predEnd + lag;
        requiredStart = Math.max(requiredStart, requiredFinish - d);
      }
    }

    if (requiredStart > s) {
      startMs.set(id, requiredStart);
      endMs.set(id, requiredStart + d);
    } else {
      // Keep original, but align end to durationMinutes to avoid drift.
      endMs.set(id, s + d);
    }
  }

  const outTasks = tasks.map((t) => {
    const s = startMs.get(t.taskId);
    const e = endMs.get(t.taskId);
    if (s === undefined || e === undefined) return t;
    return {
      ...t,
      start: formatMsToIso(s),
      end: formatMsToIso(e),
    };
  });

  return { tasks: outTasks, issues };
}

export function bulkShiftTasks(inputTasks: OpsTask[], deltaMinutes: number): OpsTask[] {
  const deltaMs = deltaMinutes * 60_000;
  return inputTasks.map((t) => {
    const s = parseIsoToMs(t.start);
    const e = parseIsoToMs(t.end);
    if (s === null || e === null) return t;
    return { ...t, start: formatMsToIso(s + deltaMs), end: formatMsToIso(e + deltaMs) };
  });
}

