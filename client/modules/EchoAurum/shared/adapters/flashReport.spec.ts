import { describe, expect, it } from "vitest";
import { generateFlashReport } from "./flashReport";
import type { OperaCharge } from "./opera";
import type { ToastCheck } from "./toast";
const OPERA_FIXTURES: OperaCharge[] = [
  {
    reservationId: "R-100",
    propertyId: "LUCCCA-BAY",
    folioNumber: "F-1",
    postedAt: "2024-11-05",
    amount: 350,
    currency: "USD",
    category: "room",
  },
  {
    reservationId: "R-100",
    propertyId: "LUCCCA-BAY",
    folioNumber: "F-1",
    postedAt: "2024-11-05",
    amount: 30,
    currency: "USD",
    category: "allowance",
  },
];
const TOAST_FIXTURES: ToastCheck[] = [
  {
    checkId: "CHK-1",
    locationId: "LUCCCA-BAY-FNB",
    openedAt: "2024-11-05T18:00:00Z",
    closedAt: "2024-11-05T18:45:00Z",
    currency: "USD",
    server: "Avery",
    items: [
      {
        menuItemId: "M-1",
        name: "Tasting menu",
        category: "food",
        gross: 120,
        net: 120,
        tax: 9.6,
        cost: 48,
      },
      {
        menuItemId: "M-2",
        name: "Wine pairing",
        category: "beverage",
        gross: 65,
        net: 65,
        tax: 5.2,
        cost: 20,
      },
      {
        menuItemId: "M-3",
        name: "Loyalty discount",
        category: "discount",
        gross: -25,
        net: -25,
        tax: 0,
      },
    ],
  },
];
describe("generateFlashReport", () => {
  it("creates ledger events and aggregates flash metrics", () => {
    const report = generateFlashReport({
      ledgerId: "ledger-test",
      operaCharges: OPERA_FIXTURES,
      toastChecks: TOAST_FIXTURES,
    });
    expect(report.integrity).toBe(true);
    expect(report.events.length).toBeGreaterThanOrEqual(6);
    expect(report.totals.roomsRevenue).toBe(350);
    expect(report.totals.allowances).toBe(55);
    expect(report.totals.foodRevenue).toBe(120);
    expect(report.totals.beverageRevenue).toBe(65);
    expect(report.totals.discounts).toBe(25);
  });
});
