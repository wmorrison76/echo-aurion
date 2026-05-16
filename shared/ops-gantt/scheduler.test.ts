import { describe, expect, it } from "vitest";
import type { OpsTask } from "../types/ops-gantt";
import { computeCriticalPathAndSlack } from "./scheduler";

function task(partial: Partial<OpsTask> & Pick<OpsTask, "taskId" | "eventId">): OpsTask {
  const start = partial.start ?? "2026-01-21T10:00:00.000Z";
  const durationMinutes = partial.durationMinutes ?? 60;
  const end = partial.end ?? new Date(new Date(start).getTime() + durationMinutes * 60_000).toISOString();
  return {
    taskId: partial.taskId,
    eventId: partial.eventId,
    scope: partial.scope ?? "beo",
    department: partial.department ?? "Events",
    title: partial.title ?? partial.taskId,
    start,
    end,
    durationMinutes,
    percentComplete: partial.percentComplete ?? 0,
    status: partial.status ?? "not_started",
    dependencies: partial.dependencies ?? [],
    riskScore: partial.riskScore ?? 0,
    tags: partial.tags,
    requiredArtifacts: partial.requiredArtifacts,
    checklist: partial.checklist,
    assigneeIds: partial.assigneeIds,
    blockingReason: partial.blockingReason,
    costImpact: partial.costImpact,
    slackMinutes: partial.slackMinutes,
  };
}

describe("computeCriticalPathAndSlack", () => {
  it("computes slack for a simple FS chain", () => {
    const a = task({ taskId: "A", eventId: "E", durationMinutes: 60 });
    const b = task({
      taskId: "B",
      eventId: "E",
      durationMinutes: 60,
      dependencies: [{ dependsOnTaskId: "A", type: "FS", lagMinutes: 0 }],
    });
    const c = task({
      taskId: "C",
      eventId: "E",
      durationMinutes: 60,
      dependencies: [{ dependsOnTaskId: "B", type: "FS", lagMinutes: 0 }],
    });

    const res = computeCriticalPathAndSlack([a, b, c]);
    expect(res.issues.length).toBe(0);
    expect(res.criticalPathTaskIds.sort()).toEqual(["A", "B", "C"]);
    const byId = new Map(res.tasks.map((t) => [t.taskId, t]));
    expect(byId.get("A")!.slackMinutes).toBe(0);
    expect(byId.get("B")!.slackMinutes).toBe(0);
    expect(byId.get("C")!.slackMinutes).toBe(0);
  });

  it("detects missing dependency task", () => {
    const a = task({
      taskId: "A",
      eventId: "E",
      dependencies: [{ dependsOnTaskId: "MISSING", type: "FS" }],
    });
    const res = computeCriticalPathAndSlack([a]);
    expect(res.issues.some((i) => i.kind === "missing_dependency_task")).toBe(true);
  });
});

