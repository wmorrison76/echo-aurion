import { describe, expect, it } from "vitest";
import {
  buildProfitabilitySummaries,
  buildStageVelocity,
  normalizeNextActions,
} from "../server/services/crm/metrics";

describe("EchoEvents CRM metrics helpers", () => {
  it("normalizes next actions and summarizes SLA status", () => {
    const now = new Date("2025-01-10T00:00:00Z");
    const { items, summary } = normalizeNextActions(
      [
        { id: "1", due_at: "2025-01-09T00:00:00Z", status: "due" },
        { id: "2", due_at: "2025-01-11T00:00:00Z", status: "due" },
        { id: "3", due_at: "2025-01-08T00:00:00Z", status: "completed" },
      ],
      now,
    );

    const byId = new Map(items.map((item) => [item.id, item.status]));
    expect(byId.get("1")).toBe("overdue");
    expect(byId.get("2")).toBe("due");
    expect(byId.get("3")).toBe("completed");
    expect(summary).toEqual({ total: 3, overdue: 1, due: 1 });
  });

  it("builds stage velocity summaries with stall detection", () => {
    const now = new Date("2025-01-10T00:00:00Z");
    const { entries, summary } = buildStageVelocity(
      [
        { id: "p1", status: "proposal", updated_at: "2024-12-20T00:00:00Z" },
        { id: "p2", status: "qualified", updated_at: "2025-01-08T00:00:00Z" },
      ],
      14,
      now,
    );

    expect(entries).toHaveLength(2);
    expect(summary).toEqual({ stalled: 1, stallDays: 14 });
  });

  it("summarizes profitability from revenue and allocations", () => {
    const results = buildProfitabilitySummaries(
      [{ id: "ev1", revenue: 10000 }],
      [{ event_id: "ev1", total_cost: 3500 }],
    );

    expect(results).toEqual([
      {
        eventId: "ev1",
        revenueForecast: 10000,
        cogsForecast: 3500,
        margin: 6500,
        marginPct: 0.65,
      },
    ]);
  });
});
