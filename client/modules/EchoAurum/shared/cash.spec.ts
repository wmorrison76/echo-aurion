import { describe, expect, it } from "vitest";
import { optimizeCashLadder, type CashLadderInput } from "./cash";
const INPUT: CashLadderInput = {
  minimumBalance: 10000,
  positions: [
    {
      date: "2024-11-05",
      openingBalance: 12500,
      inflows: 5000,
      outflows: 2000,
    },
    {
      date: "2024-11-06",
      openingBalance: 15500,
      inflows: 3000,
      outflows: 2500,
    },
  ],
  payables: [
    {
      vendor: "Sysco Coastal",
      amount: 8000,
      dueDate: "2024-11-05",
      discountAvailable: { percent: 2, expiresOn: "2024-11-04" },
    },
    { vendor: "Beverage Alliance", amount: 6000, dueDate: "2024-11-07" },
  ],
};
describe("optimizeCashLadder", () => {
  it("projects balances and flags shortfalls", () => {
    const result = optimizeCashLadder(INPUT);
    expect(result.projectedBalances).toHaveLength(2);
    expect(result.shortfallDate).toBe("2024-11-05");
  });
  it("prioritizes vendor discounts by savings", () => {
    const result = optimizeCashLadder(INPUT);
    expect(result.discountRecommendations[0].vendor).toBe("Sysco Coastal");
    expect(result.discountRecommendations[0].savings).toBeCloseTo(160, 2);
  });
});
