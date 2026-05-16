import { describe, expect, it } from "vitest";
import { CommissionEngine, type CommissionRule } from "../server/services/commission-engine";

describe("CommissionEngine.calculate", () => {
  it("handles commission-only rules", () => {
    const rule: CommissionRule = {
      id: "rule-1",
      org_id: "org-1",
      model: "commission_only",
      effective_from: "2025-01-01",
      commission_rate: 0.1,
    };

    const result = CommissionEngine.calculate(1000, rule);
    expect(result).toEqual({ commissionAmount: 100, model: "commission_only", appliedRate: 0.1 });
  });

  it("handles salary-plus-commission rules", () => {
    const rule: CommissionRule = {
      id: "rule-2",
      org_id: "org-1",
      model: "salary_plus_commission",
      effective_from: "2025-01-01",
      base_salary: 80000,
      commission_rate: 0.05,
    };

    const result = CommissionEngine.calculate(2000, rule);
    expect(result).toEqual({ commissionAmount: 100, model: "salary_plus_commission", appliedRate: 0.05 });
  });

  it("applies tiered accelerators when thresholds are met", () => {
    const rule: CommissionRule = {
      id: "rule-3",
      org_id: "org-1",
      model: "tiered_accelerator",
      effective_from: "2025-01-01",
      commission_rate: 0.04,
      tiers: [
        { threshold: 0, rate: 0.04 },
        { threshold: 10000, rate: 0.08 },
      ],
    };

    const result = CommissionEngine.calculate(12000, rule);
    expect(result).toEqual({ commissionAmount: 960, model: "tiered_accelerator", appliedRate: 0.08 });
  });

  it("returns zeroed commission without an active rule", () => {
    const result = CommissionEngine.calculate(5000, null);
    expect(result).toEqual({ commissionAmount: 0, model: "commission_only", appliedRate: 0 });
  });
});
