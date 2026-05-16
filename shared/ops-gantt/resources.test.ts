import { describe, expect, it } from "vitest";
import type { OpsResource, OpsTask } from "../types/ops-gantt";
import { computeResourceLoad } from "./resources";

function task(partial: Partial<OpsTask> & Pick<OpsTask, "taskId" | "eventId">): OpsTask {
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
    resourceIds: partial.resourceIds ?? [],
  };
}

describe("computeResourceLoad", () => {
  it("detects over-capacity equipment overlaps", () => {
    const resources: OpsResource[] = [
      { resourceId: "oven-1", resourceType: "equipment", name: "Combi Oven", capacity: 1 },
    ];

    const tasks: OpsTask[] = [
      task({
        taskId: "A",
        eventId: "E",
        start: "2026-01-21T10:00:00.000Z",
        durationMinutes: 120,
        resourceIds: ["oven-1"],
      }),
      task({
        taskId: "B",
        eventId: "E",
        start: "2026-01-21T11:00:00.000Z",
        durationMinutes: 60,
        resourceIds: ["oven-1"],
      }),
    ];

    const res = computeResourceLoad(tasks, resources, { bucketMinutes: 30 });
    expect(res.conflicts.length).toBeGreaterThan(0);
    expect(res.conflicts[0]!.resourceId).toBe("oven-1");
    expect(res.conflicts[0]!.observedPeak).toBeGreaterThan(1);
  });

  it("does not flag overlap if capacity accommodates it", () => {
    const resources: OpsResource[] = [
      { resourceId: "oven-2", resourceType: "equipment", name: "Ovens", capacity: 2 },
    ];
    const tasks: OpsTask[] = [
      task({
        taskId: "A",
        eventId: "E",
        start: "2026-01-21T10:00:00.000Z",
        durationMinutes: 120,
        resourceIds: ["oven-2"],
      }),
      task({
        taskId: "B",
        eventId: "E",
        start: "2026-01-21T11:00:00.000Z",
        durationMinutes: 60,
        resourceIds: ["oven-2"],
      }),
    ];

    const res = computeResourceLoad(tasks, resources, { bucketMinutes: 30 });
    expect(res.conflicts.length).toBe(0);
  });
});

