import { describe, expect, it } from "vitest";
import {
  buildEliminationNarrative,
  identifyEliminationCandidates,
} from "./eliminations";
const USALI_EVENTS = [
  {
    id: "1",
    ledgerId: "ledger",
    sequence: 1,
    payload: {
      debitAccount: "1200",
      creditAccount: "4000",
      amount: 1000,
      currency: "USD",
      serviceDate: "2024-11-05",
    },
    source: { type: "manual", submittedBy: "controller@luccca.cloud" },
    recordedAt: "2024-11-05T12:00:00Z",
    hash: "hash1",
    previousHash: null,
  },
] as const;
const GAAP_EVENTS = [
  {
    id: "1",
    ledgerId: "ledger",
    sequence: 1,
    payload: {
      debitAccount: "1200",
      creditAccount: "4000",
      amount: 200,
      currency: "USD",
      serviceDate: "2024-11-05",
    },
    source: { type: "manual", submittedBy: "controller@luccca.cloud" },
    recordedAt: "2024-11-05T12:00:00Z",
    hash: "hash2",
    previousHash: null,
  },
] as const;
describe("identifyEliminationCandidates", () => {
  it("returns variance between ledgers", () => {
    const candidates = identifyEliminationCandidates(
      [...USALI_EVENTS],
      [...GAAP_EVENTS],
      100,
    );
    expect(candidates[0].variance).toBe(800);
    expect(candidates[0].material).toBe(true);
  });
});
describe("buildEliminationNarrative", () => {
  it("produces narrative with actions for material variances", () => {
    const candidates = identifyEliminationCandidates(
      [...USALI_EVENTS],
      [...GAAP_EVENTS],
      100,
    );
    const narrative = buildEliminationNarrative("ledger", candidates);
    expect(narrative.headline).toMatch(/elimination/);
    expect(narrative.actions.length).toBeGreaterThan(0);
  });
});
