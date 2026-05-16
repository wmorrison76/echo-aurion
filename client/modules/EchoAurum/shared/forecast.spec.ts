import { describe, expect, it } from "vitest";
import {
  buildForecastNarrative,
  buildForecastScenario,
  buildStressTestScenario,
  applySensitivityAdjustments,
  type ForecastScenarioInput,
} from "./forecast";
const INPUT: ForecastScenarioInput = {
  base: [
    {
      date: "2024-11-05",
      roomsAvailable: 200,
      baselineOccupancy: 0.78,
      adr: 185,
    },
    {
      date: "2024-11-06",
      roomsAvailable: 200,
      baselineOccupancy: 0.74,
      adr: 180,
    },
  ],
  events: [
    {
      id: "EVT-1",
      name: "City Marathon",
      impact: 0.12,
      startDate: "2024-11-05",
      endDate: "2024-11-05",
    },
  ],
  weather: [
    { date: "2024-11-05", temperatureAnomaly: 3, precipitationChance: 0.1 },
    { date: "2024-11-06", temperatureAnomaly: -2, precipitationChance: 0.6 },
  ],
};
describe("buildForecastScenario", () => {
  it("blends event and weather drivers into revenue projection", () => {
    const scenario = buildForecastScenario(INPUT, "Storm guard");
    expect(scenario.projection).toHaveLength(2);
    expect(scenario.projection[0].occupancy).toBeGreaterThan(
      INPUT.base[0].baselineOccupancy,
    );
    expect(scenario.projection[1].occupancy).toBeLessThan(
      INPUT.base[1].baselineOccupancy,
    );
  });
  it("applies sensitivity settings", () => {
    const adjustedBase = applySensitivityAdjustments(INPUT.base, {
      adrDeltaPercent: 10,
      groupPickupDelta: 0.05,
      wagePressure: 2,
    });
    const scenario = buildForecastScenario(
      { ...INPUT, base: adjustedBase },
      "Sensitivity",
    );
    expect(scenario.projection[0].adr).toBeGreaterThan(INPUT.base[0].adr);
    expect(scenario.projection[0].occupancy).toBeGreaterThan(
      INPUT.base[0].baselineOccupancy,
    );
  });
  it("handles stress test scenarios", () => {
    const baseScenario = buildForecastScenario(INPUT, "Base");
    const scenario = buildStressTestScenario(INPUT, {
      capitalProjectRoomsOffline: 40,
      eventCancellations: ["EVT-1"],
    });
    expect(scenario.projection[0].adr).toBeCloseTo(INPUT.base[0].adr, 2);
    expect(scenario.projection[0].revenue).toBeLessThan(
      baseScenario.projection[0].revenue,
    );
  });
});
describe("buildForecastNarrative", () => {
  it("summarizes forecast scenario", () => {
    const scenario = buildForecastScenario(INPUT, "Core");
    const narrative = buildForecastNarrative(scenario);
    expect(narrative.headline).toMatch(/projected revenue/);
    expect(narrative.actions.length).toBeGreaterThan(0);
  });
});
