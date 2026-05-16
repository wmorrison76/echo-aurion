import type { OpsConflict, OpsConflictKind } from "./conflicts";
import type { OpsDepartment, OpsTask } from "../types/ops-gantt";
import { parseIsoToMs } from "./time";

export type OpsRiskSummary = {
  eventRiskScore: number; // 0-100
  readinessPct: number; // 0-100
  readinessByDepartment: Record<string, number>;
  blockedCount: number;
  dueSoonCount: number;
  missingArtifactsCount: number;
};

export type OpsRiskOptions = {
  nowMs?: number;
  eventStartMs?: number | null;
  conflicts?: OpsConflict[];
  dueSoonHours?: number; // default 72
};

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function clamp100(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function ms(iso: string): number | null {
  return parseIsoToMs(iso);
}

function conflictPenalty(kind: OpsConflictKind): number {
  // Tunable weights.
  if (kind === "dependency_blocked") return 40;
  if (kind === "dependency_overdue") return 25;
  if (kind === "task_overlap_same_assignee") return 10;
  return 10; // invalid_datetime
}

export function computeRiskAndReadiness(tasks: OpsTask[], opts: OpsRiskOptions = {}): {
  tasks: OpsTask[];
  summary: OpsRiskSummary;
} {
  const nowMs = typeof opts.nowMs === "number" ? opts.nowMs : Date.now();
  const dueSoonHours = typeof opts.dueSoonHours === "number" ? opts.dueSoonHours : 72;
  const dueSoonMs = nowMs + dueSoonHours * 60 * 60 * 1000;

  const conflicts = opts.conflicts ?? [];
  const conflictsByTask = new Map<string, OpsConflict[]>();
  for (const c of conflicts) {
    for (const id of c.taskIds) {
      const arr = conflictsByTask.get(id) ?? [];
      arr.push(c);
      conflictsByTask.set(id, arr);
    }
  }

  let blockedCount = 0;
  let dueSoonCount = 0;
  let missingArtifactsCount = 0;

  const withRisk: OpsTask[] = tasks.map((t) => {
    let risk = 0;

    if (t.status === "blocked") {
      risk += 60;
      blockedCount += 1;
    }

    const endMs = ms(t.end);
    const dueSoon = endMs !== null && endMs <= dueSoonMs && t.status !== "done";
    if (dueSoon) {
      risk += 15;
      dueSoonCount += 1;
    }

    // Missing artifacts heuristic:
    // artifacts are considered satisfied iff the task is done.
    const needsArtifacts = (t.requiredArtifacts ?? []).length > 0;
    const artifactsMissing = needsArtifacts && t.status !== "done";
    if (artifactsMissing) {
      // higher penalty when due soon
      risk += dueSoon ? 25 : 10;
      missingArtifactsCount += 1;
    }

    const taskConflicts = conflictsByTask.get(t.taskId) ?? [];
    if (taskConflicts.length > 0) {
      for (const c of taskConflicts) risk += conflictPenalty(c.kind);
    }

    // Light weighting: incomplete work contributes modest risk.
    const incompleteness = 1 - clamp01((t.percentComplete ?? 0) / 100);
    risk += Math.round(incompleteness * 10);

    return { ...t, riskScore: clamp100(risk) };
  });

  // Readiness: average completion (0-100), plus department breakdown.
  const readinessPct =
    withRisk.length === 0
      ? 0
      : clamp100(Math.round(withRisk.reduce((acc, t) => acc + (t.percentComplete ?? 0), 0) / withRisk.length));

  const byDept = new Map<OpsDepartment, OpsTask[]>();
  for (const t of withRisk) {
    const arr = byDept.get(t.department) ?? [];
    arr.push(t);
    byDept.set(t.department, arr);
  }

  const readinessByDepartment: Record<string, number> = {};
  for (const [dept, list] of byDept.entries()) {
    readinessByDepartment[dept] =
      list.length === 0
        ? 0
        : clamp100(Math.round(list.reduce((acc, t) => acc + (t.percentComplete ?? 0), 0) / list.length));
  }

  // Event risk score: weighted blend of top task risks + blockers + missing artifacts.
  const topRisks = withRisk
    .map((t) => t.riskScore ?? 0)
    .slice()
    .sort((a, b) => b - a)
    .slice(0, Math.min(8, withRisk.length));
  const topAvg = topRisks.length ? topRisks.reduce((a, b) => a + b, 0) / topRisks.length : 0;

  const blockersBoost = clamp100(blockedCount * 8);
  const artifactsBoost = clamp100(missingArtifactsCount * 4);
  const dueSoonBoost = clamp100(dueSoonCount * 2);

  const eventRiskScore = clamp100(Math.round(0.55 * topAvg + 0.2 * blockersBoost + 0.15 * artifactsBoost + 0.1 * dueSoonBoost));

  return {
    tasks: withRisk,
    summary: {
      eventRiskScore,
      readinessPct,
      readinessByDepartment,
      blockedCount,
      dueSoonCount,
      missingArtifactsCount,
    },
  };
}

