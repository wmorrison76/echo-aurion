import crypto from "crypto";
export type JournalEventSource =
  | { type: "opera"; reservationId: string }
  | { type: "toast"; checkId: string }
  | { type: "vendor_exchange"; invoiceId: string; vendor: string }
  | { type: "craft"; purchaseOrderId: string }
  | { type: "manual"; submittedBy: string };
export interface JournalEventPayload {
  debitAccount: string;
  creditAccount: string;
  amount: number;
  currency: string;
  serviceDate: string;
  memo?: string;
  meta?: Record<string, unknown>;
}
export interface JournalEventEnvelope {
  id: string;
  ledgerId: string;
  sequence: number;
  payload: JournalEventPayload;
  source: JournalEventSource;
  recordedAt: string;
  hash: string;
  previousHash: string | null;
}
export interface AppendJournalInput {
  ledgerId: string;
  payload: JournalEventPayload;
  source: JournalEventSource;
}
export interface JournalStore {
  getLastEvent(ledgerId: string): JournalEventEnvelope | null;
  append(event: JournalEventEnvelope): void;
  getEvents(ledgerId: string): JournalEventEnvelope[];
}
export class MemoryJournalStore implements JournalStore {
  private readonly events = new Map<string, JournalEventEnvelope[]>();
  getLastEvent(ledgerId: string) {
    const list = this.events.get(ledgerId);
    return list?.[list.length - 1] ?? null;
  }
  append(event: JournalEventEnvelope) {
    const list = this.events.get(event.ledgerId) ?? [];
    list.push(event);
    this.events.set(event.ledgerId, list);
  }
  getEvents(ledgerId: string) {
    return [...(this.events.get(ledgerId) ?? [])];
  }
}
function computeEventHash(event: Omit<JournalEventEnvelope, "hash">) {
  const hash = crypto.createHash("sha256");
  hash.update(JSON.stringify(event));
  return hash.digest("hex");
}
export function appendImmutableEvent(
  store: JournalStore,
  input: AppendJournalInput,
) {
  const previous = store.getLastEvent(input.ledgerId);
  const nextSequence = previous ? previous.sequence + 1 : 1;
  const recordedAt = new Date().toISOString();
  const baseEvent: Omit<JournalEventEnvelope, "hash"> = {
    id: crypto.randomUUID(),
    ledgerId: input.ledgerId,
    sequence: nextSequence,
    payload: input.payload,
    source: input.source,
    recordedAt,
    previousHash: previous?.hash ?? null,
  };
  const hash = computeEventHash(baseEvent);
  const envelope: JournalEventEnvelope = { ...baseEvent, hash };
  store.append(envelope);
  return envelope;
}
export function verifyLedgerIntegrity(store: JournalStore, ledgerId: string) {
  const events = store.getEvents(ledgerId);
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    const expectedPrev = index === 0 ? null : events[index - 1].hash;
    if (event.previousHash !== expectedPrev) {
      return false;
    }
    const { hash, ...rest } = event;
    if (computeEventHash(rest) !== hash) {
      return false;
    }
  }
  return true;
}
