import { describe, expect, it } from "vitest";
import type { OpsTask } from "../types/ops-gantt";
import { computeRiskAndReadiness } from "./risk";

function task(partial: Partial<OpsTask>): OpsTask {
  const now = new Date("2026-01-20T12:00:00.000Z").toISOString();
  return {
    taskId: partial.taskId ?? "t-1",
    eventId: partial.eventId ?? "e-1",
    scope: partial.scope ?? "beo",
    department: partial.department ?? "Events",
    title: partial.title ?? "Task",
    start: partial.start ?? now,
    end: partial.end ?? now,
    durationMinutes: partial.durationMinutes ?? 60,
    percentComplete: partial.percentComplete ?? 0,
    status: partial.status ?? "not_started",
    dependencies: partial.dependencies ?? [],
    requiredArtifacts: partial.requiredArtifacts ?? [],
    tags: partial.tags ?? [],
    riskScore: partial.riskScore ?? 0,
    slackMinutes: partial.slackMinutes,
    blockingReason: partial.blockingReason,
    assigneeIds: partial.assigneeIds,
    resourceIds: partial.resourceIds,
    checklist: partial.checklist,
    costImpact: partial.costImpact,
  };
}

describe("computeRiskAndReadiness", () => {
  it("raises risk for blocked + due-soon + missing artifacts", () => {
    const nowMs = new Date("2026-01-20T12:00:00.000Z").getTime();
    const dueSoon = new Date(nowMs + 6 * 60 * 60 * 1000).toISOString();

    const tasks: OpsTask[] = [
      task({
        taskId: "t1",
        status: "blocked",
        percentComplete: 10,
        requiredArtifacts: ["beo_signed"],
        end: dueSoon,
      }),
    ];

    const out = computeRiskAndReadiness(tasks, { nowMs, dueSoonHours: 72 });
    expect(out.tasks[0].riskScore).toBeGreaterThan(60);
    expect(out.summary.blockedCount).toBe(1);
    expect(out.summary.missingArtifactsCount).toBe(1);
    expect(out.summary.dueSoonCount).toBe(1);
  });

  it("keeps risk low for done tasks", () => {
    const nowMs = new Date("2026-01-20T12:00:00.000Z").getTime();
    const tasks: OpsTask[] = [
      task({ taskId: "t1", status: "done", percentComplete: 100, requiredArtifacts: ["po_sent"] }),
      task({ taskId: "t2", status: "done", percentComplete: 100 }),
    ];
    const out = computeRiskAndReadiness(tasks, { nowMs });
    expect(out.summary.readinessPct).toBe(100);
    expect(out.summary.eventRiskScore).toBeLessThan(25);
  });
});

