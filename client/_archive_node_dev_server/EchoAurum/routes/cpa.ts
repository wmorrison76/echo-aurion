import type { RequestHandler } from "express";
import {
  generateTrialBalanceExport,
  assembleWorkpaperBundle,
} from "../../shared/cpa";
import { MemoryJournalStore, appendImmutableEvent } from "../../shared/ledger";
const store = new MemoryJournalStore(); // Seed demo events for export preview
appendImmutableEvent(store, {
  ledgerId: "ledger-demo",
  payload: {
    debitAccount: "1000",
    creditAccount: "2000",
    amount: 875,
    currency: "USD",
    serviceDate: "2024-11-05",
    memo: "Cash receipt",
  },
  source: { type: "manual", submittedBy: "demo@luccca.cloud" },
});
appendImmutableEvent(store, {
  ledgerId: "ledger-demo",
  payload: {
    debitAccount: "1200",
    creditAccount: "4000",
    amount: 540,
    currency: "USD",
    serviceDate: "2024-11-05",
    memo: "Rooms revenue",
  },
  source: { type: "manual", submittedBy: "demo@luccca.cloud" },
});
export const handleCpaExport: RequestHandler = (req, res) => {
  const ledgerId = (req.body?.ledgerId as string) ?? "ledger-demo";
  const events = store.getEvents(ledgerId);
  const tb = generateTrialBalanceExport(events);
  const workpapers = assembleWorkpaperBundle({
    ledgerId,
    period: req.body?.period ?? "2024-11",
    preparedBy: req.body?.preparedBy ?? "controller@luccca.cloud",
    documents: [
      { name: "trial-balance.csv", contentType: "text/csv", content: tb.csv },
    ],
  });
  res.json({ ledgerId, trialBalance: tb, workpapers });
};
