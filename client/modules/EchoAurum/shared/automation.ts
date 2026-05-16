import { buildTriadAssistInsight, evaluateTriad, type TriadInput } from "./ap";
import { createOperaJournalEntries, type OperaCharge } from "./adapters/opera";
import { createToastJournalEntries, type ToastCheck } from "./adapters/toast";
import {
  MemoryJournalStore,
  appendImmutableEvent,
  verifyLedgerIntegrity,
  type AppendJournalInput,
  type JournalEventEnvelope,
} from "./ledger";
export type AutomationStream = "vendor_exchange" | "pms" | "pos";
export type AutomationDecisionStatus = "ready" | "hold" | "review" | "posted";
export interface AutomationDecision {
  id: string;
  stream: AutomationStream;
  status: AutomationDecisionStatus;
  title: string;
  summary: string;
  amount: number;
  currency: string;
  confidence: number;
  effectiveDate: string;
  actions: string[];
  vendor?: string;
  propertyId?: string;
  locationId?: string;
  metadata: Record<string, unknown>;
  priorityScore: number;
}
export interface CurrencyBreakdown {
  ready: number;
  hold: number;
  review: number;
  posted: number;
  total: number;
}
export interface StreamSummary {
  count: number;
  counts: Record<AutomationDecisionStatus, number>;
}
export interface AutomationSummary {
  totalDecisions: number;
  counts: Record<AutomationDecisionStatus, number>;
  streams: Record<AutomationStream, StreamSummary>;
  currencyTotals: Record<string, CurrencyBreakdown>;
  ledgerIntegrity: boolean;
}
export interface AutomationStreamInput {
  ledgerId: string;
  vendorTriads: TriadInput[];
  operaCharges: OperaCharge[];
  toastChecks: ToastCheck[];
}
export interface AutomationFeedResult {
  ledgerId: string;
  decisions: AutomationDecision[];
  events: JournalEventEnvelope[];
  summary: AutomationSummary;
}
type CurrencyAccumulator = {
  ready: number;
  hold: number;
  review: number;
  posted: number;
};
type RegisterContext = {
  counts: Record<AutomationDecisionStatus, number>;
  streams: Record<AutomationStream, StreamSummary>;
  currencyBuckets: Map<string, CurrencyAccumulator>;
};
export function composeAutomationStream(
  input: AutomationStreamInput,
): AutomationFeedResult {
  const store = new MemoryJournalStore();
  const events: JournalEventEnvelope[] = [];
  const decisions: AutomationDecision[] = [];
  const counts: Record<AutomationDecisionStatus, number> = {
    ready: 0,
    hold: 0,
    review: 0,
    posted: 0,
  };
  const streams: Record<AutomationStream, StreamSummary> = {
    vendor_exchange: {
      count: 0,
      counts: { ready: 0, hold: 0, review: 0, posted: 0 },
    },
    pms: { count: 0, counts: { ready: 0, hold: 0, review: 0, posted: 0 } },
    pos: { count: 0, counts: { ready: 0, hold: 0, review: 0, posted: 0 } },
  };
  const currencyBuckets = new Map<string, CurrencyAccumulator>();
  const registerContext: RegisterContext = { counts, streams, currencyBuckets };
  const triads = [...input.vendorTriads].sort(
    (a, b) =>
      new Date(a.invoice.invoiceDate).getTime() -
      new Date(b.invoice.invoiceDate).getTime(),
  );
  for (const triad of triads) {
    const triadResult = evaluateTriad(triad);
    const insight = buildTriadAssistInsight(triadResult);
    const status =
      triadResult.status === "matched"
        ? "ready"
        : triadResult.status === "matched_with_variance"
          ? "review"
          : "hold";
    const amount = roundCurrency(triad.invoice.total);
    const confidence = computeTriadConfidence(triad, status);
    const defaultActions =
      status === "ready"
        ? ["Auto-release to treasury queue"]
        : ["Route to AP variance desk"];
    const decision: AutomationDecision = {
      id: triad.invoice.id,
      stream: "vendor_exchange",
      status,
      title: `${triad.invoice.vendor} invoice ${triad.invoice.id}`,
      summary: insight.narrative,
      amount,
      currency: triad.invoice.currency,
      confidence,
      effectiveDate: triad.invoice.invoiceDate,
      actions: insight.actions.length > 0 ? insight.actions : defaultActions,
      vendor: triad.invoice.vendor,
      metadata: {
        purchaseOrderId: triad.purchaseOrder.id,
        triadStatus: triadResult.status,
        variance: triadResult.totalVariance,
        discrepancyCount: triadResult.discrepancies.length,
        ocrFields: triad.ocr?.length ?? 0,
        receiptCount: triad.receipts.length,
      },
      priorityScore: Number((amount * confidence).toFixed(2)),
    };
    decisions.push(decision);
    registerDecision(decision, registerContext);
    if (status !== "hold" && amount > 0) {
      const entry: AppendJournalInput = {
        ledgerId: input.ledgerId,
        payload: {
          debitAccount: "5100",
          creditAccount: "2000",
          amount,
          currency: triad.invoice.currency,
          serviceDate: triad.invoice.invoiceDate,
          memo: `Invoice ${triad.invoice.id} ${triad.invoice.vendor}`,
          meta: {
            invoiceId: triad.invoice.id,
            vendor: triad.invoice.vendor,
            purchaseOrderId: triad.purchaseOrder.id,
            discrepancyCount: triadResult.discrepancies.length,
            variance: triadResult.totalVariance,
          },
        },
        source: {
          type: "vendor_exchange",
          invoiceId: triad.invoice.id,
          vendor: triad.invoice.vendor,
        },
      };
      const envelope = appendImmutableEvent(store, entry);
      events.push(envelope);
    }
  }
  const operaCharges = [...input.operaCharges].sort(
    (a, b) => new Date(a.postedAt).getTime() - new Date(b.postedAt).getTime(),
  );
  for (const charge of operaCharges) {
    const entries = createOperaJournalEntries(input.ledgerId, charge);
    appendEntries(entries, store, events);
    const amount = roundCurrency(Math.abs(charge.amount));
    const decision: AutomationDecision = {
      id: `${charge.reservationId}-${charge.folioNumber}`,
      stream: "pms",
      status: "posted",
      title: `Opera folio ${charge.folioNumber}`,
      summary: `Charge categorized as ${charge.category} at property ${charge.propertyId}.`,
      amount,
      currency: charge.currency,
      confidence: 0.97,
      effectiveDate: charge.postedAt,
      actions: ["Ledger entry appended from Opera PMS feed"],
      propertyId: charge.propertyId,
      metadata: {
        reservationId: charge.reservationId,
        folioNumber: charge.folioNumber,
        category: charge.category,
      },
      priorityScore: Number((amount * 0.97).toFixed(2)),
    };
    decisions.push(decision);
    registerDecision(decision, registerContext);
  }
  const toastChecks = [...input.toastChecks].sort(
    (a, b) => new Date(a.closedAt).getTime() - new Date(b.closedAt).getTime(),
  );
  for (const check of toastChecks) {
    const entries = createToastJournalEntries(input.ledgerId, check);
    appendEntries(entries, store, events);
    const net = check.items.reduce((sum, item) => sum + item.net, 0);
    const amount = roundCurrency(Math.max(net, 0));
    const discounts = check.items
      .filter((item) => item.category === "discount")
      .reduce((sum, item) => sum + Math.abs(item.net), 0);
    const decision: AutomationDecision = {
      id: check.checkId,
      stream: "pos",
      status: "posted",
      title: `Toast check ${check.checkId}`,
      summary: `POS session closed by ${check.server}; revenue recognized for location ${check.locationId}.`,
      amount,
      currency: check.currency,
      confidence: 0.95,
      effectiveDate: check.closedAt,
      actions: ["Revenue journalized via Toast POS feed"],
      locationId: check.locationId,
      metadata: {
        server: check.server,
        itemCount: check.items.length,
        discountValue: roundCurrency(discounts),
      },
      priorityScore: Number((amount * 0.95).toFixed(2)),
    };
    decisions.push(decision);
    registerDecision(decision, registerContext);
  }
  const summary: AutomationSummary = {
    totalDecisions: decisions.length,
    counts,
    streams,
    currencyTotals: buildCurrencyTotals(currencyBuckets),
    ledgerIntegrity: verifyLedgerIntegrity(store, input.ledgerId),
  };
  const orderedDecisions = [...decisions].sort(
    (a, b) =>
      new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime(),
  );
  return {
    ledgerId: input.ledgerId,
    decisions: orderedDecisions,
    events,
    summary,
  };
}
function registerDecision(
  decision: AutomationDecision,
  context: RegisterContext,
) {
  context.counts[decision.status] += 1;
  context.streams[decision.stream].count += 1;
  context.streams[decision.stream].counts[decision.status] += 1;
  const bucket = ensureCurrencyBucket(
    context.currencyBuckets,
    decision.currency,
  );
  bucket[decision.status] += decision.amount;
}
function appendEntries(
  entries: AppendJournalInput[],
  store: MemoryJournalStore,
  events: JournalEventEnvelope[],
) {
  for (const entry of entries) {
    const envelope = appendImmutableEvent(store, entry);
    events.push(envelope);
  }
}
function ensureCurrencyBucket(
  map: Map<string, CurrencyAccumulator>,
  currency: string,
) {
  const existing = map.get(currency);
  if (existing) {
    return existing;
  }
  const bucket: CurrencyAccumulator = {
    ready: 0,
    hold: 0,
    review: 0,
    posted: 0,
  };
  map.set(currency, bucket);
  return bucket;
}
function buildCurrencyTotals(
  map: Map<string, CurrencyAccumulator>,
): Record<string, CurrencyBreakdown> {
  const totals: Record<string, CurrencyBreakdown> = {};
  for (const [currency, bucket] of map.entries()) {
    const ready = roundCurrency(bucket.ready);
    const hold = roundCurrency(bucket.hold);
    const review = roundCurrency(bucket.review);
    const posted = roundCurrency(bucket.posted);
    totals[currency] = {
      ready,
      hold,
      review,
      posted,
      total: roundCurrency(ready + hold + review + posted),
    };
  }
  return totals;
}
function computeTriadConfidence(
  triad: TriadInput,
  status: AutomationDecisionStatus,
) {
  if (triad.ocr && triad.ocr.length > 0) {
    const average =
      triad.ocr.reduce((sum, item) => sum + item.confidence, 0) /
      triad.ocr.length;
    const normalized = average > 1 ? average / 100 : average;
    return clamp(normalized, 0.35, 0.99);
  }
  switch (status) {
    case "ready":
      return 0.92;
    case "review":
      return 0.68;
    default:
      return 0.42;
  }
}
function roundCurrency(value: number) {
  return Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100;
}
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
