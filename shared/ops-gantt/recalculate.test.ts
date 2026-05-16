import { describe, expect, it } from "vitest";
import type { OpsTask } from "../types/ops-gantt";
import { recalculateSchedule } from "./recalculate";

function makeTask(partial: Partial<OpsTask> & Pick<OpsTask, "taskId" | "eventId">): OpsTask {
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
  };
}

describe("recalculateSchedule", () => {
  it("shifts a downstream FS task later to satisfy predecessor", () => {
    const a = makeTask({
      taskId: "A",
      eventId: "E",
      start: "2026-01-21T10:00:00.000Z",
      durationMinutes: 120,
    });
    // Starts too early (should move to 12:00).
    const b = makeTask({
      taskId: "B",
      eventId: "E",
      start: "2026-01-21T11:00:00.000Z",
      durationMinutes: 60,
      dependencies: [{ dependsOnTaskId: "A", type: "FS", lagMinutes: 0 }],
    });

    const res = recalculateSchedule([a, b], { shiftToSatisfyDependencies: true });
    const byId = new Map(res.tasks.map((t) => [t.taskId, t]));
    expect(byId.get("B")!.start).toBe("2026-01-21T12:00:00.000Z");
    expect(byId.get("B")!.end).toBe("2026-01-21T13:00:00.000Z");
  });

  it("supports SS dependencies", () => {
    const a = makeTask({
      taskId: "A",
      eventId: "E",
      start: "2026-01-21T10:00:00.000Z",
      durationMinutes: 120,
    });
    const b = makeTask({
      taskId: "B",
      eventId: "E",
      start: "2026-01-21T09:00:00.000Z",
      durationMinutes: 60,
      dependencies: [{ dependsOnTaskId: "A", type: "SS", lagMinutes: 30 }],
    });

    const res = recalculateSchedule([a, b], { shiftToSatisfyDependencies: true });
    const byId = new Map(res.tasks.map((t) => [t.taskId, t]));
    expect(byId.get("B")!.start).toBe("2026-01-21T10:30:00.000Z");
  });
});

