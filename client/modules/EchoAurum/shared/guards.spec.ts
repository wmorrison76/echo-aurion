import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, evaluateGuardrails } from "./guards";
describe("evaluateGuardrails", () => {
  it("returns info when no rules trigger", () => {
    const result = evaluateGuardrails({
      ledgerId: "ledger",
      vendor: "Trusted Vendor",
      amount: 1000,
      currency: "USD",
    });
    expect(result.severity).toBe("info");
    expect(result.outcomes.every((item) => !item.triggered)).toBe(true);
  });
  it("escalates severity when critical rule triggers", () => {
    const result = evaluateGuardrails(
      {
        ledgerId: "ledger",
        vendor: "Fraudster LLC",
        amount: 250000,
        currency: "USD",
        country: "RU",
        metadata: {
          blacklist: ["Fraudster LLC"],
          threshold: 50000,
          allowedCountries: ["US"],
          historicalAverage: 40000,
        },
      },
      { rules: DEFAULT_RULES },
    );
    expect(result.severity).toBe("critical");
    expect(
      result.outcomes.find((item) => item.id === "vendor-blacklist")?.triggered,
    ).toBe(true);
  });
});
