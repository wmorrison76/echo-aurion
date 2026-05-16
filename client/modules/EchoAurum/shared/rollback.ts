import type {
  AppendJournalInput,
  JournalEventEnvelope,
  JournalStore,
} from "./ledger";
import { appendImmutableEvent, verifyLedgerIntegrity } from "./ledger";
export interface RollbackRequest {
  ledgerId: string;
  eventId: string;
  reason: string;
  requestedBy: string;
}
export interface RollbackPlan {
  original: JournalEventEnvelope;
  compensatingEntry: AppendJournalInput;
}
export interface RollbackResult {
  applied: JournalEventEnvelope;
  plan: RollbackPlan;
}
export function createRollbackPlan(
  store: JournalStore,
  request: RollbackRequest,
): RollbackPlan {
  const events = store.getEvents(request.ledgerId);
  if (!verifyLedgerIntegrity(store, request.ledgerId)) {
    throw new Error("Ledger integrity failed; rollback aborted.");
  }
  const original = events.find((event) => event.id === request.eventId);
  if (!original) {
    throw new Error(`Journal event ${request.eventId} not found.`);
  }
  const compensatingEntry: AppendJournalInput = {
    ledgerId: request.ledgerId,
    payload: {
      debitAccount: original.payload.creditAccount,
      creditAccount: original.payload.debitAccount,
      amount: original.payload.amount,
      currency: original.payload.currency,
      serviceDate: new Date().toISOString(),
      memo: `Rollback: ${request.reason}`,
      meta: { rollbackOf: original.id, requestedBy: request.requestedBy },
    },
    source: { type: "manual", submittedBy: request.requestedBy },
  };
  return { original, compensatingEntry };
}
export function applyRollback(
  store: JournalStore,
  plan: RollbackPlan,
): RollbackResult {
  const applied = appendImmutableEvent(store, plan.compensatingEntry);
  return { applied, plan };
}
