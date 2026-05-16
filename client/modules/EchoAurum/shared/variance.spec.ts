import { describe, expect, it } from "vitest";
import { buildVarianceRadar } from "./variance";
describe("buildVarianceRadar", () => {
  it("computes variance points and rankings", () => {
    const summary = buildVarianceRadar([
      {
        entity: "Hotel A",
        department: "Rooms",
        metric: "Revenue",
        actual: 120000,
        budget: 110000,
        prior: 100000,
      },
      {
        entity: "Hotel A",
        department: "Rooms",
        metric: "Labor",
        actual: 47000,
        budget: 50000,
        prior: 52000,
      },
      {
        entity: "Hotel A",
        department: "Rooms",
        metric: "Utilities",
        actual: 42000,
        budget: 36000,
        prior: 34000,
      },
      {
        entity: "Hotel B",
        department: "F&B",
        metric: "Food Cost",
        actual: 42000,
        budget: 38000,
        prior: 39000,
      },
    ]);
    expect(summary.points).toHaveLength(4);
    expect(summary.topUnfavorable.length).toBeGreaterThan(0);
    expect(summary.topFavorable.length).toBeGreaterThan(0);
  });
});
