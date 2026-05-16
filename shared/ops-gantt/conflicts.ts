import type { OpsDependency, OpsTask, OpsTaskStatus, UUID } from "../types/ops-gantt";
import { parseIsoToMs } from "./time";

export type OpsConflictKind =
  | "dependency_overdue"
  | "dependency_blocked"
  | "invalid_datetime"
  | "task_overlap_same_assignee";

export type OpsConflictSeverity = "info" | "warning" | "error" | "critical";

export interface OpsConflict {
  kind: OpsConflictKind;
  severity: OpsConflictSeverity;
  message: string;
  eventId: UUID;
  taskIds: UUID[];
}

function severityForStatus(status: OpsTaskStatus): OpsConflictSeverity {
  if (status === "blocked") return "critical";
  if (status === "in_progress") return "warning";
  return "error";
}

function normalizeDeps(deps?: OpsDependency[]): OpsDependency[] {
  if (!deps) return [];
  return deps.map((d) => ({
    dependsOnTaskId: d.dependsOnTaskId,
    type: d.type ?? "FS",
    lagMinutes: d.lagMinutes ?? 0,
  }));
}

/**
 * Conflict engine v1 (non-placeholder):
 * - Validates datetime integrity
 * - Flags dependency blockers (blocked predecessors)
 * - Flags overdue dependencies (task starts before dependency constraint is satisfied)
 * - Flags overlapping tasks for same assignee
 *
 * Next increments will add: room/equipment capacity, vendor lead time, missing artifacts.
 */
export function detectConflicts(tasks: OpsTask[]): OpsConflict[] {
  const conflicts: OpsConflict[] = [];
  const byId = new Map<UUID, OpsTask>(tasks.map((t) => [t.taskId, t]));

  // 1) Datetime integrity + dependency constraints
  for (const t of tasks) {
    const s = parseIsoToMs(t.start);
    const e = parseIsoToMs(t.end);
    if (s === null || e === null || e < s) {
      conflicts.push({
        kind: "invalid_datetime",
        severity: "error",
        message: `Invalid start/end datetime for '${t.title}'.`,
        eventId: t.eventId,
        taskIds: [t.taskId],
      });
      continue;
    }

    for (const dep of normalizeDeps(t.dependencies)) {
      const pred = byId.get(dep.dependsOnTaskId);
      if (!pred) continue;

      if (pred.status === "blocked") {
        conflicts.push({
          kind: "dependency_blocked",
          severity: "critical",
          message: `'${t.title}' is blocked by '${pred.title}'.`,
          eventId: t.eventId,
          taskIds: [pred.taskId, t.taskId],
        });
      }

      const predStart = parseIsoToMs(pred.start);
      const predEnd = parseIsoToMs(pred.end);
      if (predStart === null || predEnd === null) continue;

      const lagMs = (dep.lagMinutes ?? 0) * 60_000;
      const requiredStartMs =
        dep.type === "SS"
          ? predStart + lagMs
          : dep.type === "FF"
            ? predEnd + lagMs - Math.max(0, Math.round(t.durationMinutes)) * 60_000
            : predEnd + lagMs; // FS default

      if (s < requiredStartMs) {
        conflicts.push({
          kind: "dependency_overdue",
          severity: severityForStatus(t.status),
          message: `'${t.title}' violates dependency timing vs '${pred.title}'.`,
          eventId: t.eventId,
          taskIds: [pred.taskId, t.taskId],
        });
      }
    }
  }

  // 2) Overlap on assignees (same event)
  const byAssignee = new Map<string, OpsTask[]>();
  for (const t of tasks) {
    for (const a of t.assigneeIds ?? []) {
      const key = `${t.eventId}::${a}`;
      const list = byAssignee.get(key) ?? [];
      list.push(t);
      byAssignee.set(key, list);
    }
  }

  for (const list of byAssignee.values()) {
    const sorted = list
      .slice()
      .map((t) => ({ t, s: parseIsoToMs(t.start), e: parseIsoToMs(t.end) }))
      .filter((x) => x.s !== null && x.e !== null)
      .sort((a, b) => (a.s! - b.s!));

    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i];
        const b = sorted[j];
        if (b.s! >= a.e!) break;
        conflicts.push({
          kind: "task_overlap_same_assignee",
          severity: "warning",
          message: `Assignee overlap: '${a.t.title}' overlaps '${b.t.title}'.`,
          eventId: a.t.eventId,
          taskIds: [a.t.taskId, b.t.taskId],
        });
      }
    }
  }

  return conflicts;
}

