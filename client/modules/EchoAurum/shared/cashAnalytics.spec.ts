import { describe, expect, it } from "vitest";
import {
  buildPortfolioExposure,
  buildPortfolioRollups,
  buildRunwaySummary,
  optimizeLabor,
  recommendLaborTrades,
  type RunwayProjection,
} from "./cashAnalytics";
const PROJECTIONS: RunwayProjection[] = [
  { date: "2024-11-05", closingBalance: 18000, varianceVsPrior: 500 },
  { date: "2024-11-06", closingBalance: 14000, varianceVsPrior: -200 },
  { date: "2024-11-07", closingBalance: 9000, varianceVsPrior: -800 },
];
describe("buildRunwaySummary", () => {
  it("identifies shortfall and builds narrative", () => {
    const summary = buildRunwaySummary(PROJECTIONS, 10000);
    expect(summary.shortfallDate).toBe("2024-11-07");
    expect(summary.runwayDays).toBe(2);
    expect(summary.narrative).toMatch(/Cash runway reaches minimum balance/);
  });
});
describe("recommendLaborTrades", () => {
  it("recommends overtime reductions", () => {
    const recommendations = recommendLaborTrades([
      {
        property: "Echo Towers",
        department: "Housekeeping",
        scheduledHours: 400,
        overtimeHours: 60,
        overtimeCost: 4200,
        baselineOvertimeCost: 3000,
      },
    ]);
    expect(recommendations[0].savings).toBeGreaterThan(0);
  });
});
describe("optimizeLabor", () => {
  it("summarizes total savings and narrative", () => {
    const result = optimizeLabor([
      {
        property: "Echo Towers",
        department: "Front Desk",
        scheduledHours: 320,
        overtimeHours: 40,
        overtimeCost: 2800,
        baselineOvertimeCost: 1800,
      },
      {
        property: "Harborline",
        department: "Banquets",
        scheduledHours: 260,
        overtimeHours: 32,
        overtimeCost: 2400,
        baselineOvertimeCost: 1900,
      },
    ]);
    expect(result.totalSavings).toBeGreaterThan(0);
    expect(result.recommendations).toHaveLength(2);
    expect(result.narrative).toMatch(/Top opportunity/);
  });
});
describe("buildPortfolioExposure", () => {
  it("calculates exposure mix", () => {
    const portfolio = buildPortfolioExposure([
      {
        property: "Echo Towers",
        revenue: 120000,
        laborCost: 42000,
        exposure: 0,
        region: "West",
        brand: "LUCCCA Signature",
      },
      {
        property: "Harborline",
        revenue: 80000,
        laborCost: 28000,
        exposure: 0,
        region: "East",
        brand: "LUCCCA Boutique",
      },
    ]);
    expect(portfolio.totalRevenue).toBe(200000);
    expect(portfolio.exposures[0].exposure).toBeCloseTo(0.6, 2);
  });
});
describe("buildPortfolioRollups", () => {
  it("aggregates region and brand exposure", () => {
    const summary = buildPortfolioRollups([
      {
        property: "Echo Towers",
        revenue: 120000,
        laborCost: 42000,
        exposure: 0,
        region: "West",
        brand: "LUCCCA Signature",
      },
      {
        property: "Harborline",
        revenue: 80000,
        laborCost: 28000,
        exposure: 0,
        region: "East",
        brand: "LUCCCA Boutique",
      },
      {
        property: "Sundial Villas",
        revenue: 60000,
        laborCost: 24000,
        exposure: 0,
        region: "East",
        brand: "LUCCCA Signature",
      },
    ]);
    expect(summary.totalRevenue).toBe(260000);
    expect(summary.byRegion[0].key).toBe("East");
    expect(summary.byRegion[0].exposure).toBeGreaterThan(
      summary.byRegion[1].exposure,
    );
    expect(summary.byBrand[0].key).toBe("LUCCCA Signature");
    expect(summary.narrative.length).toBeGreaterThan(0);
  });
});
