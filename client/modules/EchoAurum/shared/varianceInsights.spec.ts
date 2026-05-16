import { describe, expect, it } from "vitest";
import {
  calculateVarianceInsights,
  type VarianceObservation,
} from "./varianceInsights";
const OBSERVATIONS: VarianceObservation[] = [
  {
    propertyId: "prop-echo",
    propertyName: "Echo Towers",
    department: "F&B Production",
    glCode: "5110",
    accountName: "Cost of Goods Sold",
    period: "2024-11",
    actual: 98200,
    budget: 91000,
    forecast: 94000,
    driverBreakdown: [
      { type: "rate", percent: 0.6 },
      { type: "volume", percent: 0.4 },
    ],
    occupancyActual: 0.74,
    occupancyForecast: 0.81,
    staffHoursActual: 1280,
    staffHoursBudget: 1200,
    hoursPerOccupancyPoint: 6.5,
  },
  {
    propertyId: "prop-harbor",
    propertyName: "Harborline Hotel",
    department: "Housekeeping",
    glCode: "5125",
    accountName: "Hourly Labor",
    period: "2024-11",
    actual: 46800,
    budget: 49200,
    forecast: 47500,
    driverBreakdown: [
      { type: "staffing", percent: 0.7 },
      { type: "timing", percent: 0.3 },
    ],
    occupancyActual: 0.86,
    occupancyForecast: 0.8,
    staffHoursActual: 1620,
    staffHoursBudget: 1680,
    hoursPerOccupancyPoint: 4.2,
  },
];
describe("calculateVarianceInsights", () => {
  it("summarizes variance root causes and staffing guidance", () => {
    const result = calculateVarianceInsights({ observations: OBSERVATIONS });
    expect(result.summary.totalVariance).toBeCloseTo(
      98200 - 91000 + (46800 - 49200),
      2,
    );
    expect(result.summary.propertiesImpacted).toBe(2);
    expect(result.rootCauses[0].glCode).toBe("5110");
    expect(result.rootCauses[0].driver.type).toBe("rate");
    expect(result.rootCauses[1].driver.type).toBe("staffing");
    const staffingAction = result.staffing.find(
      (item) => item.propertyId === "prop-echo",
    );
    expect(staffingAction).toBeDefined();
    expect(staffingAction?.shift).toBe("add");
    expect(staffingAction?.deltaHours ?? 0).toBeGreaterThan(0);
  });
});
