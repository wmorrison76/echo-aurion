import { describe, expect, it } from "vitest";
import { MemoryJournalStore, appendImmutableEvent } from "./ledger";
import { applyRollback, createRollbackPlan } from "./rollback";
const BASE_EVENT = {
  ledgerId: "ledger-rollback",
  payload: {
    debitAccount: "1200",
    creditAccount: "4000",
    amount: 480,
    currency: "USD",
    serviceDate: "2024-11-05",
  },
  source: { type: "opera", reservationId: "R-100" } as const,
};
describe("Phoenix rollback", () => {
  it("creates compensating entry and preserves integrity", () => {
    const store = new MemoryJournalStore();
    const inserted = appendImmutableEvent(store, BASE_EVENT);
    const plan = createRollbackPlan(store, {
      ledgerId: BASE_EVENT.ledgerId,
      eventId: inserted.id,
      reason: "Duplicate posting",
      requestedBy: "controller@luccca.cloud",
    });
    const result = applyRollback(store, plan);
    expect(result.applied.payload.debitAccount).toBe(
      BASE_EVENT.payload.creditAccount,
    );
    expect(result.applied.payload.creditAccount).toBe(
      BASE_EVENT.payload.debitAccount,
    );
    expect(result.applied.previousHash).toBe(inserted.hash);
  });
});
