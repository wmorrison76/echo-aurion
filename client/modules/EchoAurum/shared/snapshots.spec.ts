import { describe, expect, it } from "vitest";
import { MemoryJournalStore, appendImmutableEvent } from "./ledger";
import { SnapshotStore, generateSnapshot, verifySnapshot } from "./snapshots";
const BASE_EVENT = {
  ledgerId: "ledger-snapshot",
  payload: {
    debitAccount: "1000",
    creditAccount: "2000",
    amount: 500,
    currency: "USD",
    serviceDate: "2024-11-05",
  },
  source: { type: "manual", submittedBy: "controller@luccca.cloud" } as const,
};
describe("generateSnapshot", () => {
  it("creates Zelda snapshot anchored to journal hash", () => {
    const journalStore = new MemoryJournalStore();
    appendImmutableEvent(journalStore, BASE_EVENT);
    appendImmutableEvent(journalStore, {
      ...BASE_EVENT,
      payload: {
        ...BASE_EVENT.payload,
        amount: 275,
        debitAccount: "1200",
        creditAccount: "4200",
      },
    });
    const snapshotStore = new SnapshotStore();
    const snapshot = generateSnapshot(
      { ledgerId: BASE_EVENT.ledgerId },
      journalStore,
      snapshotStore,
    );
    expect(snapshot.eventCount).toBe(2);
    expect(snapshot.previousSnapshotHash).toBeNull();
    expect(verifySnapshot(snapshot, journalStore)).toBe(true);
  });
  it("links snapshots through previous hash", () => {
    const journalStore = new MemoryJournalStore();
    appendImmutableEvent(journalStore, BASE_EVENT);
    const snapshotStore = new SnapshotStore();
    const first = generateSnapshot(
      { ledgerId: BASE_EVENT.ledgerId },
      journalStore,
      snapshotStore,
    );
    appendImmutableEvent(journalStore, {
      ...BASE_EVENT,
      payload: { ...BASE_EVENT.payload, amount: 125 },
    });
    const second = generateSnapshot(
      { ledgerId: BASE_EVENT.ledgerId },
      journalStore,
      snapshotStore,
    );
    expect(second.previousSnapshotHash).toBe(first.hash);
    expect(verifySnapshot(second, journalStore)).toBe(true);
  });
});
