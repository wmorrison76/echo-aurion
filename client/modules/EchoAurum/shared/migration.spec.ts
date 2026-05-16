import { describe, expect, it } from "vitest";
import { buildMigrationToolkit, type CompetitorExport } from "./migration";
const EXPORTS: CompetitorExport[] = [
  {
    platform: "M3",
    files: [
      { name: "m3_gl.csv", type: "csv", sizeKb: 820, records: 4200 },
      { name: "m3_ap.csv", type: "csv", sizeKb: 640, records: 1800 },
    ],
    glCodes: ["5110", "5125"],
    apVendors: 240,
    payrollProfiles: 36,
    notes: "Includes LUCCCA AP vendors",
  },
  {
    platform: "QuickBooks",
    files: [{ name: "qbo_gl.xlsx", type: "xlsx", sizeKb: 540, records: 2600 }],
    glCodes: ["5110", "5132"],
    apVendors: 120,
    payrollProfiles: 18,
  },
];
describe("buildMigrationToolkit", () => {
  it("produces guided import steps and adapter readiness", () => {
    const toolkit = buildMigrationToolkit({ exports: EXPORTS });
    expect(toolkit.totalRecords).toBe(4200 + 1800 + 2600);
    expect(toolkit.totalVendors).toBe(360);
    expect(toolkit.steps.length).toBeGreaterThan(0);
    expect(toolkit.adapters.some((adapter) => adapter.platform === "M3")).toBe(
      true,
    );
    expect(toolkit.readinessScore).toBeGreaterThan(0);
    expect(
      toolkit.blockers.some((blocker) => blocker.includes("QuickBooks")),
    ).toBe(true);
  });
});
