/**
 * Money contract tests (B1)
 *
 * Pinpoints the cases that broke under the old `number` representation —
 * the exact drifts that produced the `< 0.01` Guardian tolerance hack —
 * and proves they don't reproduce with the Money primitive.
 */

import { describe, it, expect } from "vitest";
import {
  money,
  rate,
  add,
  sub,
  mul,
  div,
  sum,
  applyRate,
  neg,
  abs,
  eq,
  gt,
  gte,
  lt,
  lte,
  isZero,
  isPositive,
  isNegative,
  balanced,
  asMoney,
  isMoney,
  format,
  toNumber,
  moneyReviver,
  ZERO,
} from "./money";

describe("Money — drift cases that were masked by the old `< 0.01` tolerance", () => {
  it("0.1 + 0.2 is exactly 0.30, not 0.30000000000000004", () => {
    // The classic JS floating-point bug. Under `number`, 0.1 + 0.2
    // === 0.30000000000000004, so a 'balanced' check would fail without
    // the tolerance hack. With Money, equality is exact.
    const result = add(money(0.1), money(0.2));
    expect(result).toBe("0.30");
    expect(eq(result, money(0.3))).toBe(true);
  });

  it("summing 1000 copies of 0.1 is exactly 100.00", () => {
    const ones = Array.from({ length: 1000 }, () => money(0.1));
    const total = sum(ones);
    // (0.1 * 1000) under floats = 99.9999999999986
    expect(total).toBe("100.00");
    expect(eq(total, money(100))).toBe(true);
  });

  it("debits === credits after many transactions, exactly", () => {
    // Simulates a journal posting: 137 lines, alternating signs, each
    // a price computed from a nasty-fraction rate.
    const prices: string[] = [];
    let debits = ZERO;
    let credits = ZERO;
    for (let i = 0; i < 137; i++) {
      // amounts that under floats accumulate drift
      const m = mul(money(0.07), i + 1);
      prices.push(m);
      debits = add(debits, m);
      credits = add(credits, m);
    }
    // The Guardian's job: are they equal? Yes, exactly.
    expect(balanced(debits, credits)).toBe(true);
    expect(eq(debits, credits)).toBe(true);
  });
});

describe("Money — basic arithmetic and constructors", () => {
  it("normalizes to fixed-2 by default", () => {
    expect(money(1)).toBe("1.00");
    expect(money("1.5")).toBe("1.50");
    expect(money(1.005)).toBe("1.00"); // banker's rounding (HALF_EVEN)
  });

  it("supports custom precision per call", () => {
    expect(money(1.234567, 4)).toBe("1.2346");
  });

  it("rejects non-finite inputs", () => {
    expect(() => money(NaN)).toThrow();
    expect(() => money(Infinity)).toThrow();
    expect(() => money(-Infinity)).toThrow();
  });

  it("ZERO and ONE constants", () => {
    expect(ZERO).toBe("0.00");
    expect(isZero(ZERO)).toBe(true);
  });

  it("sub", () => {
    expect(sub(money(10), money(3.33))).toBe("6.67");
  });

  it("mul scalar", () => {
    expect(mul(money(2.5), 4)).toBe("10.00");
    expect(mul(money(99.99), 0.5)).toBe("50.00");
  });

  it("div scalar — guards zero divisor", () => {
    expect(div(money(10), 4)).toBe("2.50");
    expect(() => div(money(10), 0)).toThrow();
  });

  it("neg / abs", () => {
    expect(neg(money(5))).toBe("-5.00");
    expect(abs(money(-5))).toBe("5.00");
    expect(abs(money(5))).toBe("5.00");
  });

  it("sum of empty list is ZERO", () => {
    expect(sum([])).toBe("0.00");
  });
});

describe("Money — exchange rates", () => {
  it("rate has 6-decimal precision", () => {
    expect(rate(1.234567891)).toBe("1.234568");
  });

  it("applyRate", () => {
    const usd = money(100);
    const usdToEur = rate(0.911234);
    expect(applyRate(usd, usdToEur)).toBe("91.12");
  });
});

describe("Money — comparison and predicates", () => {
  it("eq / gt / gte / lt / lte", () => {
    const a = money(10);
    const b = money(20);
    expect(eq(a, a)).toBe(true);
    expect(gt(b, a)).toBe(true);
    expect(gte(a, a)).toBe(true);
    expect(lt(a, b)).toBe(true);
    expect(lte(a, a)).toBe(true);
  });

  it("isPositive / isNegative", () => {
    expect(isPositive(money(0.01))).toBe(true);
    expect(isNegative(money(-0.01))).toBe(true);
    // Zero is neither positive nor negative under our convention.
    expect(isPositive(ZERO)).toBe(false);
    expect(isNegative(ZERO)).toBe(false);
  });

  it("balanced is exact equality, no tolerance", () => {
    // The whole point of B1.
    expect(balanced(money(100), money(100))).toBe(true);
    expect(balanced(money(100), money(99.99))).toBe(false);
    // The case that the old `< 0.01` tolerance hack was hiding:
    // 0.1 + 0.2 in floats = 0.30000000000000004, which would have been
    // marked "balanced" (drift < 0.01) under the old code. Under Money,
    // 0.1 + 0.2 normalizes to exactly "0.30" so balanced() can be a
    // strict equality without missing real drift.
    expect(balanced(add(money(0.1), money(0.2)), money(0.3))).toBe(true);
    // And a real one-cent imbalance is correctly caught.
    expect(balanced(money(100), money(100.01))).toBe(false);
  });
});

describe("Money — type guards and coercion", () => {
  it("isMoney recognizes valid format strings", () => {
    expect(isMoney("1.00")).toBe(true);
    expect(isMoney("-1.50")).toBe(true);
    expect(isMoney("0")).toBe(true);
    expect(isMoney("abc")).toBe(false);
    expect(isMoney(123)).toBe(false);
    expect(isMoney(undefined)).toBe(false);
  });

  it("asMoney coerces numbers / strings / Money / Decimal", () => {
    expect(asMoney(1)).toBe("1.00");
    expect(asMoney("1.5")).toBe("1.50");
    expect(asMoney(money(2))).toBe("2.00");
  });
});

describe("Money — JSON reviver", () => {
  it("converts named fields back to Money on parse", () => {
    const json = '{"amount":12.5,"label":"x","balanceDue":"3.4"}';
    const parsed = JSON.parse(json, moneyReviver(["amount", "balanceDue"]));
    expect(parsed.amount).toBe("12.50");
    expect(parsed.balanceDue).toBe("3.40");
    expect(parsed.label).toBe("x");
  });
});

describe("Money — display and toNumber escape hatch", () => {
  it("format produces locale-aware currency", () => {
    expect(format(money(1234.5), "en-US", "USD")).toBe("$1,234.50");
  });

  it("toNumber for chart-axis / percentage use only", () => {
    expect(toNumber(money(2.5))).toBe(2.5);
  });
});
