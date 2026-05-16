import { describe, expect, it } from "vitest";
import type { OpsTask } from "../types/ops-gantt";
import { detectConflicts } from "./conflicts";

function t(partial: Partial<OpsTask> & Pick<OpsTask, "taskId" | "eventId">): OpsTask {
  const start = partial.start ?? "2026-01-21T10:00:00.000Z";
  const durationMinutes = partial.durationMinutes ?? 60;
  const end =
    partial.end ??
    new Date(new Date(start).getTime() + Math.round(durationMinutes) * 60_000).toISOString();
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
    assigneeIds: partial.assigneeIds ?? [],
  };
}

describe("detectConflicts", () => {
  it("flags dependency timing violations", () => {
    const a = t({
      taskId: "A",
      eventId: "E",
      title: "Upstream",
      start: "2026-01-21T10:00:00.000Z",
      durationMinutes: 120,
    });
    const b = t({
      taskId: "B",
      eventId: "E",
      title: "Downstream",
      start: "2026-01-21T11:00:00.000Z",
      durationMinutes: 60,
      dependencies: [{ dependsOnTaskId: "A", type: "FS", lagMinutes: 0 }],
    });

    const conflicts = detectConflicts([a, b]);
    expect(conflicts.some((c) => c.kind === "dependency_overdue")).toBe(true);
  });

  it("flags same-assignee overlaps", () => {
    const a = t({
      taskId: "A",
      eventId: "E",
      title: "Task A",
      start: "2026-01-21T10:00:00.000Z",
      durationMinutes: 120,
      assigneeIds: ["u1"],
    });
    const b = t({
      taskId: "B",
      eventId: "E",
      title: "Task B",
      start: "2026-01-21T11:00:00.000Z",
      durationMinutes: 60,
      assigneeIds: ["u1"],
    });

    const conflicts = detectConflicts([a, b]);
    expect(conflicts.some((c) => c.kind === "task_overlap_same_assignee")).toBe(true);
  });
});

