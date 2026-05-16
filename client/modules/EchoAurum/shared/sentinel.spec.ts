import { describe, expect, it } from "vitest";
import { analyzeWithEchoSentinel, type SentinelTransaction } from "./sentinel";
const BASE_TX: Omit<
  SentinelTransaction,
  "id" | "submittedAt" | "metadata" | "bankAccount"
> = {
  ledgerId: "ledger-1",
  vendor: "Harborline Services",
  amount: 85000,
  currency: "USD",
  country: "US",
};
describe("analyzeWithEchoSentinel", () => {
  it("flags transactions that trigger guardrails", () => {
    const transactions: SentinelTransaction[] = [
      {
        ...BASE_TX,
        id: "tx-1",
        submittedAt: "2024-10-01T10:00:00Z",
        bankAccount: "US123",
        metadata: { blacklist: ["Harborline Services"], threshold: 50000 },
      },
      {
        ...BASE_TX,
        id: "tx-2",
        submittedAt: "2024-10-01T11:00:00Z",
        vendor: "Echo Towers AV",
        amount: 25000,
        metadata: { threshold: 100000 },
      },
    ];
    const summary = analyzeWithEchoSentinel(transactions);
    expect(summary.flaggedTransactions).toBe(1);
    expect(summary.highestSeverity).toBe("critical");
    expect(
      summary.alerts[0].triggered.some(
        (outcome) => outcome.id === "vendor-blacklist",
      ),
    ).toBe(true);
    expect(summary.stats.flaggedAmount).toBe(85000);
    expect(summary.narrative).toMatch(/1 transaction flagged/);
  });
  it("returns clean summary when nothing triggers", () => {
    const transactions: SentinelTransaction[] = [
      {
        ...BASE_TX,
        id: "tx-3",
        submittedAt: "2024-10-02T10:00:00Z",
        vendor: "Harborline Services",
        amount: 15000,
        metadata: { threshold: 50000 },
      },
    ];
    const summary = analyzeWithEchoSentinel(transactions);
    expect(summary.flaggedTransactions).toBe(0);
    expect(summary.highestSeverity).toBe("info");
    expect(summary.alerts).toHaveLength(0);
    expect(summary.narrative).toMatch(/cleared/);
  });
});
