import { describe, expect, it } from "vitest";
import type { OpsTask } from "@shared/types/ops-gantt";
import { applyTaskOverrides } from "./task-overrides";
import { taskKey } from "./revision-store";

function t(partial: Partial<OpsTask>): OpsTask {
  return {
    taskId: partial.taskId ?? "t1",
    eventId: partial.eventId ?? "e1",
    scope: partial.scope ?? "beo",
    department: partial.department ?? "Events",
    title: partial.title ?? "Draft initial BEO",
    start: partial.start ?? "2026-01-20T10:00:00.000Z",
    end: partial.end ?? "2026-01-20T11:00:00.000Z",
    durationMinutes: partial.durationMinutes ?? 60,
    percentComplete: partial.percentComplete ?? 0,
    status: partial.status ?? "not_started",
    riskScore: partial.riskScore ?? 0,
    dependencies: partial.dependencies ?? [],
    requiredArtifacts: partial.requiredArtifacts ?? [],
    tags: partial.tags ?? [],
  };
}

describe("applyTaskOverrides", () => {
  it("applies status and percent by stable key", () => {
    const base = [
      t({ taskId: "a", title: "Menu locked", department: "Culinary" }),
    ];
    const key = taskKey(base[0]);
    const out = applyTaskOverrides(base, [
      { key, status: "done", percentComplete: 100 },
    ]);
    expect(out[0].status).toBe("done");
    expect(out[0].percentComplete).toBe(100);
  });

  it("ignores overrides for unknown keys", () => {
    const base = [t({ taskId: "a" })];
    const out = applyTaskOverrides(base, [
      { key: "nope", status: "done", percentComplete: 100 },
    ]);
    expect(out[0].status).toBe(base[0].status);
    expect(out[0].percentComplete).toBe(base[0].percentComplete);
  });

  it("key stays stable for same scope/department/title", () => {
    const a = t({
      taskId: "a",
      scope: "beo",
      department: "Events",
      title: "Draft initial BEO",
    });
    const b = t({
      taskId: "b",
      scope: "beo",
      department: "Events",
      title: "Draft initial BEO",
    });
    expect(taskKey(a)).toBe(taskKey(b));
  });
});
