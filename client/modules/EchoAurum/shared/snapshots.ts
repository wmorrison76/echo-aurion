import crypto from "crypto";
import type { JournalEventEnvelope, JournalStore } from "./ledger";
import { MemoryJournalStore, verifyLedgerIntegrity } from "./ledger";
export interface SnapshotBalance {
  account: string;
  balance: number;
}
export interface SnapshotEnvelope {
  id: string;
  ledgerId: string;
  asOf: string;
  eventCount: number;
  balances: SnapshotBalance[];
  journalHash: string;
  previousSnapshotHash: string | null;
  hash: string;
}
export class SnapshotStore {
  private readonly snapshots = new Map<string, SnapshotEnvelope[]>();
  append(snapshot: SnapshotEnvelope) {
    const list = this.snapshots.get(snapshot.ledgerId) ?? [];
    list.push(snapshot);
    this.snapshots.set(snapshot.ledgerId, list);
  }
  getLatest(ledgerId: string) {
    const list = this.snapshots.get(ledgerId);
    return list?.[list.length - 1] ?? null;
  }
  getAll(ledgerId: string) {
    return [...(this.snapshots.get(ledgerId) ?? [])];
  }
}
export interface SnapshotInput {
  ledgerId: string;
  asOf?: string;
  store?: JournalStore;
}
function computeJournalHash(events: JournalEventEnvelope[]) {
  const hash = crypto.createHash("sha256");
  for (const event of events) {
    hash.update(event.hash);
  }
  return hash.digest("hex");
}
function computeSnapshotHash(snapshot: Omit<SnapshotEnvelope, "hash">) {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(snapshot));
  return hash.digest("hex");
}
export function generateSnapshot(
  input: SnapshotInput,
  journalStore: JournalStore,
  snapshotStore: SnapshotStore,
) {
  const events = journalStore.getEvents(input.ledgerId);
  if (!verifyLedgerIntegrity(journalStore, input.ledgerId)) {
    throw new Error("Ledger integrity failed; cannot snapshot.");
  }
  const balances = new Map<string, number>();
  for (const event of events) {
    const debit = balances.get(event.payload.debitAccount) ?? 0;
    balances.set(event.payload.debitAccount, debit + event.payload.amount);
    const credit = balances.get(event.payload.creditAccount) ?? 0;
    balances.set(event.payload.creditAccount, credit - event.payload.amount);
  }
  const sortedBalances = [...balances.entries()]
    .map(([account, balance]) => ({ account, balance }))
    .sort((a, b) => a.account.localeCompare(b.account));
  const previous = snapshotStore.getLatest(input.ledgerId);
  const baseSnapshot: Omit<SnapshotEnvelope, "hash"> = {
    id: crypto.randomUUID(),
    ledgerId: input.ledgerId,
    asOf: input.asOf ?? new Date().toISOString(),
    eventCount: events.length,
    balances: sortedBalances,
    journalHash: computeJournalHash(events),
    previousSnapshotHash: previous?.hash ?? null,
  };
  const hash = computeSnapshotHash(baseSnapshot);
  const envelope: SnapshotEnvelope = { ...baseSnapshot, hash };
  snapshotStore.append(envelope);
  return envelope;
}
export function verifySnapshot(
  snapshot: SnapshotEnvelope,
  journalStore: JournalStore,
) {
  const events = journalStore.getEvents(snapshot.ledgerId);
  if (events.length !== snapshot.eventCount) {
    return false;
  }
  if (computeJournalHash(events) !== snapshot.journalHash) {
    return false;
  }
  const { hash, ...rest } = snapshot;
  return computeSnapshotHash(rest) === hash;
}
export function createSnapshotFromEvents(
  events: JournalEventEnvelope[],
): SnapshotEnvelope {
  const store = new MemoryJournalStore();
  for (const event of events) {
    store.append(event);
  }
  const snapshotStore = new SnapshotStore();
  return generateSnapshot(
    { ledgerId: events[0]?.ledgerId ?? "ledger" },
    store,
    snapshotStore,
  );
}
