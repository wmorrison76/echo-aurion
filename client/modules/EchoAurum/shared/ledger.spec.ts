import { describe, expect, it } from "vitest";
import {
  MemoryJournalStore,
  appendImmutableEvent,
  verifyLedgerIntegrity,
} from "./ledger";
const BASE_EVENT = {
  ledgerId: "ledger-1",
  payload: {
    debitAccount: "1000",
    creditAccount: "2000",
    amount: 1250,
    currency: "USD",
    serviceDate: "2024-11-05",
    memo: "Rooms revenue allocation",
  },
  source: { type: "opera", reservationId: "R-88310" } as const,
};
describe("appendImmutableEvent", () => {
  it("chains hashes to enforce immutability", () => {
    const store = new MemoryJournalStore();
    const first = appendImmutableEvent(store, BASE_EVENT);
    const second = appendImmutableEvent(store, {
      ...BASE_EVENT,
      payload: { ...BASE_EVENT.payload, amount: 980, memo: "Rooms allowance" },
    });
    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(second.previousHash).toBe(first.hash);
    expect(verifyLedgerIntegrity(store, BASE_EVENT.ledgerId)).toBe(true);
  });
  it("detects tampering when hashes change", () => {
    const store = new MemoryJournalStore();
    appendImmutableEvent(store, BASE_EVENT);
    const [event] = store.getEvents(BASE_EVENT.ledgerId);
    if (!event) {
      throw new Error("Expected event to exist");
    }
    event.payload.amount = 9999;
    expect(verifyLedgerIntegrity(store, BASE_EVENT.ledgerId)).toBe(false);
  });
});
