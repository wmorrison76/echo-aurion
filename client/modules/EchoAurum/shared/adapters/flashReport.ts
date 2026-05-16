import {
  MemoryJournalStore,
  appendImmutableEvent,
  verifyLedgerIntegrity,
  type JournalEventEnvelope,
} from "../ledger";
import type { OperaCharge } from "./opera";
import { createOperaJournalEntries, summarizeOperaCharges } from "./opera";
import type { ToastCheck } from "./toast";
import { createToastJournalEntries, summarizeToastChecks } from "./toast";
export interface FlashReportInput {
  ledgerId: string;
  operaCharges?: OperaCharge[];
  toastChecks?: ToastCheck[];
}
export interface FlashReportTotals {
  roomsRevenue: number;
  allowances: number;
  taxes: number;
  foodRevenue: number;
  beverageRevenue: number;
  serviceRevenue: number;
  discounts: number;
}
export interface FlashReportResult {
  ledgerId: string;
  totals: FlashReportTotals;
  events: JournalEventEnvelope[];
  integrity: boolean;
  opera: ReturnType<typeof summarizeOperaCharges>;
  toast: ReturnType<typeof summarizeToastChecks>;
}
const DEFAULT_TOTALS: FlashReportTotals = {
  roomsRevenue: 0,
  allowances: 0,
  taxes: 0,
  foodRevenue: 0,
  beverageRevenue: 0,
  serviceRevenue: 0,
  discounts: 0,
};
export function generateFlashReport(
  input: FlashReportInput,
): FlashReportResult {
  const store = new MemoryJournalStore();
  const ledgerId = input.ledgerId;
  const events: JournalEventEnvelope[] = [];
  const operaCharges = input.operaCharges ?? [];
  for (const charge of operaCharges) {
    const journalEntries = createOperaJournalEntries(ledgerId, charge);
    for (const entry of journalEntries) {
      const envelope = appendImmutableEvent(store, entry);
      events.push(envelope);
    }
  }
  const toastChecks = input.toastChecks ?? [];
  for (const check of toastChecks) {
    const journalEntries = createToastJournalEntries(ledgerId, check);
    for (const entry of journalEntries) {
      const envelope = appendImmutableEvent(store, entry);
      events.push(envelope);
    }
  }
  const totals = events.reduce<FlashReportTotals>(
    (acc, event) => {
      const ledgerAccount = event.payload.creditAccount;
      const amount = event.payload.amount;
      switch (ledgerAccount) {
        case "4000":
          acc.roomsRevenue += amount;
          break;
        case "4100":
          acc.allowances += amount;
          break;
        case "7000":
          acc.taxes += amount;
          break;
        case "4200":
          acc.foodRevenue += amount;
          break;
        case "4300":
          acc.beverageRevenue += amount;
          break;
        case "4400":
          acc.serviceRevenue += amount;
          break;
        default:
          break;
      }
      if (event.payload.debitAccount === "4100") {
        acc.allowances += amount;
        if (event.source.type === "toast") {
          acc.discounts += amount;
        }
      }
      return acc;
    },
    { ...DEFAULT_TOTALS },
  );
  const integrity = verifyLedgerIntegrity(store, ledgerId);
  return {
    ledgerId,
    totals,
    events,
    integrity,
    opera: summarizeOperaCharges(operaCharges),
    toast: summarizeToastChecks(toastChecks),
  };
}
