import { describe, expect, it } from "vitest";
import type { TriadInput } from "./ap";
import type { OperaCharge } from "./adapters/opera";
import type { ToastCheck } from "./adapters/toast";
import type { JournalEventEnvelope } from "./ledger";
import { composeAutomationStream } from "./automation";
const TRIAD_READY: TriadInput = {
  invoice: {
    id: "INV-READY",
    vendor: "Sysco Coastal",
    purchaseOrderId: "PO-100",
    invoiceDate: "2024-11-05",
    dueDate: "2024-11-25",
    currency: "USD",
    total: 9600,
    lines: [
      {
        sku: "SYS-001",
        description: "Prime ribeye",
        quantity: 100,
        unitCost: 96,
      },
    ],
  },
  purchaseOrder: {
    id: "PO-100",
    vendor: "Sysco Coastal",
    currency: "USD",
    lines: [
      {
        sku: "SYS-001",
        description: "Prime ribeye",
        orderedQty: 100,
        unitCost: 96,
      },
    ],
  },
  receipts: [
    {
      id: "RCPT-100",
      purchaseOrderId: "PO-100",
      lines: [
        {
          sku: "SYS-001",
          receivedQty: 100,
          receivedAt: "2024-11-05T06:30:00Z",
        },
      ],
    },
  ],
  ocr: [
    { confidence: 0.94, field: "total", value: 9600 },
    { confidence: 0.91, field: "vendor", value: "Sysco Coastal" },
  ],
};
const TRIAD_HOLD: TriadInput = {
  invoice: {
    id: "INV-HOLD",
    vendor: "Harborline Services",
    purchaseOrderId: "PO-200",
    invoiceDate: "2024-11-04",
    dueDate: "2024-11-24",
    currency: "USD",
    total: 14850,
    lines: [
      {
        sku: "HARB-010",
        description: "AV support",
        quantity: 12,
        unitCost: 1237.5,
      },
    ],
  },
  purchaseOrder: {
    id: "PO-200",
    vendor: "Harborline Services",
    currency: "USD",
    lines: [
      {
        sku: "HARB-010",
        description: "AV support",
        orderedQty: 8,
        unitCost: 1237.5,
      },
    ],
  },
  receipts: [
    {
      id: "RCPT-201",
      purchaseOrderId: "PO-200",
      lines: [
        { sku: "HARB-010", receivedQty: 6, receivedAt: "2024-11-04T04:20:00Z" },
      ],
    },
  ],
};
const OPERA_CHARGE: OperaCharge = {
  reservationId: "RSV-890",
  propertyId: "Echo Towers",
  folioNumber: "FOL-3021",
  postedAt: "2024-11-06T08:00:00Z",
  amount: 3420,
  currency: "USD",
  category: "room",
  description: "Group booking block",
};
const TOAST_CHECK: ToastCheck = {
  checkId: "CHK-5521",
  locationId: "LUCCCA-DWTN",
  openedAt: "2024-11-06T17:10:00Z",
  closedAt: "2024-11-06T18:05:00Z",
  currency: "USD",
  server: "Maria Lopez",
  items: [
    {
      menuItemId: "ITEM-FOOD-1",
      name: "Cedar plank salmon",
      category: "food",
      gross: 32,
      net: 28,
      tax: 2,
      cost: 12,
    },
    {
      menuItemId: "ITEM-DRINK-3",
      name: "Signature spritz",
      category: "beverage",
      gross: 14,
      net: 12,
      tax: 1.2,
      cost: 3.2,
    },
    {
      menuItemId: "ITEM-DISC-1",
      name: "Happy hour promo",
      category: "discount",
      gross: 0,
      net: -4,
      tax: 0,
    },
  ],
};
describe("composeAutomationStream", () => {
  it("aggregates vendor exchange, PMS, and POS feeds into automation decisions", () => {
    const feed = composeAutomationStream({
      ledgerId: "ledger-luccca",
      vendorTriads: [TRIAD_READY, TRIAD_HOLD],
      operaCharges: [OPERA_CHARGE],
      toastChecks: [TOAST_CHECK],
    });
    expect(feed.summary.ledgerIntegrity).toBe(true);
    expect(feed.summary.totalDecisions).toBe(4);
    expect(feed.summary.counts).toMatchObject({
      ready: 1,
      hold: 1,
      review: 0,
      posted: 2,
    });
    const vendorDecisions = feed.decisions.filter(
      (decision) => decision.stream === "vendor_exchange",
    );
    expect(vendorDecisions).toHaveLength(2);
    expect(
      vendorDecisions.find((decision) => decision.id === "INV-READY")?.status,
    ).toBe("ready");
    expect(
      vendorDecisions.find((decision) => decision.id === "INV-HOLD")?.status,
    ).toBe("hold");
    const vendorEventIds = feed.events
      .filter(isVendorExchangeEvent)
      .map((event) => event.source.invoiceId);
    expect(vendorEventIds).toContain("INV-READY");
    expect(vendorEventIds).not.toContain("INV-HOLD");
    const currencyTotals = feed.summary.currencyTotals["USD"];
    expect(currencyTotals.ready).toBeGreaterThan(0);
    expect(currencyTotals.total).toBeGreaterThan(currencyTotals.ready);
    const topDecision = feed.decisions[0];
    expect(new Date(topDecision.effectiveDate).getTime()).toBeGreaterThan(
      new Date(
        feed.decisions[feed.decisions.length - 1].effectiveDate,
      ).getTime(),
    );
  });
});
function isVendorExchangeEvent(
  event: JournalEventEnvelope,
): event is JournalEventEnvelope & {
  source: { type: "vendor_exchange"; invoiceId: string };
} {
  return event.source.type === "vendor_exchange";
}
