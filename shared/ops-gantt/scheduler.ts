import type { OpsDependency, OpsDependencyType, OpsTask, UUID } from "../types/ops-gantt";
import { parseIsoToMs } from "./time";

export interface ScheduleDiagnosticsIssue {
  kind:
    | "invalid_datetime"
    | "negative_duration"
    | "missing_dependency_task"
    | "cyclic_dependencies";
  message: string;
  taskId?: UUID;
  dependsOnTaskId?: UUID;
}

export interface ScheduleResult {
  /**
   * Tasks with calculated slackMinutes filled in (best-effort).
   * Sorting order is unchanged from input.
   */
  tasks: OpsTask[];
  /**
   * Tasks on the critical path (slackMinutes === 0).
   */
  criticalPathTaskIds: UUID[];
  issues: ScheduleDiagnosticsIssue[];
}

type Edge = {
  from: UUID; // dependsOn -> task
  to: UUID;
  type: OpsDependencyType;
  lagMinutes: number;
};

const DEFAULT_DEP_TYPE: OpsDependencyType = "FS";

function normalizeDeps(deps?: OpsDependency[]): OpsDependency[] {
  if (!deps || deps.length === 0) return [];
  return deps.map((d) => ({
    dependsOnTaskId: d.dependsOnTaskId,
    type: d.type ?? DEFAULT_DEP_TYPE,
    lagMinutes: d.lagMinutes ?? 0,
  }));
}

/**
 * Compute slack (float, minutes) via a simplified CPM:
 * - Forward pass computes earliest start/finish (ES/EF) respecting deps + lag.
 * - Backward pass computes latest start/finish (LS/LF) using project finish = max(EF).
 * - Slack = LS - ES (minutes)
 *
 * Notes:
 * - This is deterministic and fast; it assumes task durations are authoritative
 *   and does not attempt to "auto-shift" tasks yet.
 * - We validate and report issues instead of throwing, so UI can still render.
 */
export function computeCriticalPathAndSlack(inputTasks: OpsTask[]): ScheduleResult {
  const issues: ScheduleDiagnosticsIssue[] = [];

  const byId = new Map<UUID, OpsTask>();
  for (const t of inputTasks) {
    byId.set(t.taskId, t);
  }

  const edges: Edge[] = [];
  for (const task of inputTasks) {
    const deps = normalizeDeps(task.dependencies);
    for (const dep of deps) {
      if (!byId.has(dep.dependsOnTaskId)) {
        issues.push({
          kind: "missing_dependency_task",
          message: `Task '${task.taskId}' depends on missing task '${dep.dependsOnTaskId}'.`,
          taskId: task.taskId,
          dependsOnTaskId: dep.dependsOnTaskId,
        });
        continue;
      }
      edges.push({
        from: dep.dependsOnTaskId,
        to: task.taskId,
        type: dep.type ?? DEFAULT_DEP_TYPE,
        lagMinutes: dep.lagMinutes ?? 0,
      });
    }
  }

  // Validate datetimes/durations.
  const startMs = new Map<UUID, number>();
  const endMs = new Map<UUID, number>();
  const durationMin = new Map<UUID, number>();

  for (const task of inputTasks) {
    const s = parseIsoToMs(task.start);
    const e = parseIsoToMs(task.end);
    if (s === null || e === null) {
      issues.push({
        kind: "invalid_datetime",
        message: `Invalid datetime for task '${task.taskId}'.`,
        taskId: task.taskId,
      });
      continue;
    }
    startMs.set(task.taskId, s);
    endMs.set(task.taskId, e);
    if (!Number.isFinite(task.durationMinutes) || task.durationMinutes < 0) {
      issues.push({
        kind: "negative_duration",
        message: `Invalid durationMinutes for task '${task.taskId}'.`,
        taskId: task.taskId,
      });
    }
    durationMin.set(task.taskId, Math.max(0, task.durationMinutes));
  }

  // Build adjacency + indegree for topo sort.
  const outgoing = new Map<UUID, Edge[]>();
  const indeg = new Map<UUID, number>();
  for (const task of inputTasks) indeg.set(task.taskId, 0);
  for (const edge of edges) {
    if (!outgoing.has(edge.from)) outgoing.set(edge.from, []);
    outgoing.get(edge.from)!.push(edge);
    indeg.set(edge.to, (indeg.get(edge.to) ?? 0) + 1);
  }

  const queue: UUID[] = [];
  for (const [id, d] of indeg.entries()) {
    if (d === 0) queue.push(id);
  }

  const topo: UUID[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    topo.push(id);
    for (const edge of outgoing.get(id) ?? []) {
      const next = edge.to;
      indeg.set(next, (indeg.get(next) ?? 0) - 1);
      if ((indeg.get(next) ?? 0) === 0) queue.push(next);
    }
  }

  if (topo.length !== inputTasks.length) {
    issues.push({
      kind: "cyclic_dependencies",
      message: "Cyclic dependencies detected; critical path/slack is best-effort.",
    });
  }

  // Forward pass: ES/EF in ms.
  const ES = new Map<UUID, number>();
  const EF = new Map<UUID, number>();

  for (const id of topo) {
    const baseStart = startMs.get(id);
    const dur = durationMin.get(id) ?? 0;
    // If datetime invalid, skip.
    if (baseStart === undefined) continue;

    let es = baseStart;
    // ES constrained by dependencies.
    for (const edge of edges.filter((e) => e.to === id)) {
      const predEs = ES.get(edge.from);
      const predEf = EF.get(edge.from);
      if (predEs === undefined || predEf === undefined) continue;
      const lagMs = edge.lagMinutes * 60 * 1000;
      if (edge.type === "FS") es = Math.max(es, predEf + lagMs);
      else if (edge.type === "SS") es = Math.max(es, predEs + lagMs);
      else if (edge.type === "FF") {
        // FF means our finish cannot be before predecessor finish+lag
        const minFinish = predEf + lagMs;
        es = Math.max(es, minFinish - dur * 60 * 1000);
      }
    }

    const ef = es + dur * 60 * 1000;
    ES.set(id, es);
    EF.set(id, ef);
  }

  // Project finish = max EF.
  let projectFinish = 0;
  for (const ef of EF.values()) projectFinish = Math.max(projectFinish, ef);

  // Backward pass: LS/LF in ms.
  const LS = new Map<UUID, number>();
  const LF = new Map<UUID, number>();

  const reverseTopo = [...topo].reverse();
  for (const id of reverseTopo) {
    const dur = durationMin.get(id) ?? 0;
    const durMs = dur * 60 * 1000;
    if (!ES.has(id) || !EF.has(id)) continue;

    // Start with project finish.
    let lf = projectFinish;

    // Constrain by successors.
    const succEdges = edges.filter((e) => e.from === id);
    for (const edge of succEdges) {
      const succ = edge.to;
      const succLs = LS.get(succ);
      const succLf = LF.get(succ);
      const lagMs = edge.lagMinutes * 60 * 1000;
      if (succLs === undefined || succLf === undefined) continue;

      if (edge.type === "FS") lf = Math.min(lf, succLs - lagMs);
      else if (edge.type === "SS") lf = Math.min(lf, succLs - lagMs + durMs);
      else if (edge.type === "FF") lf = Math.min(lf, succLf - lagMs);
    }

    const ls = lf - durMs;
    LF.set(id, lf);
    LS.set(id, ls);
  }

  const outTasks = inputTasks.map((task) => {
    const es = ES.get(task.taskId);
    const ls = LS.get(task.taskId);
    if (es === undefined || ls === undefined) return { ...task, slackMinutes: undefined };
    const slack = (ls - es) / (60 * 1000);
    return { ...task, slackMinutes: Math.max(0, slack) };
  });

  const criticalPathTaskIds = outTasks
    .filter((t) => typeof t.slackMinutes === "number" && t.slackMinutes <= 0.00001)
    .map((t) => t.taskId);

  return { tasks: outTasks, criticalPathTaskIds, issues };
}

