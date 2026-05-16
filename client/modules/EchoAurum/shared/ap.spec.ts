import { describe, expect, it } from "vitest";
import { buildTriadAssistInsight, evaluateTriad, type TriadInput } from "./ap";
const BASE_TRIAD: TriadInput = {
  invoice: {
    id: "INV-100",
    vendor: "Sysco Coastal",
    purchaseOrderId: "PO-100",
    invoiceDate: "2024-11-05",
    dueDate: "2024-12-05",
    currency: "USD",
    total: 9600,
    lines: [
      {
        sku: "SYS-001",
        description: "Prime ribeye",
        quantity: 100,
        unitCost: 48,
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
        unitCost: 48,
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
          receivedAt: "2024-11-04T10:00:00Z",
        },
      ],
    },
  ],
};
describe("evaluateTriad", () => {
  it("passes when invoice matches PO and receipts", () => {
    const result = evaluateTriad(BASE_TRIAD);
    expect(result.status).toBe("matched");
    expect(result.discrepancies).toHaveLength(0);
  });
  it("flags price and quantity variances", () => {
    const result = evaluateTriad({
      ...BASE_TRIAD,
      invoice: {
        ...BASE_TRIAD.invoice,
        lines: [
          {
            sku: "SYS-001",
            description: "Prime ribeye",
            quantity: 110,
            unitCost: 50,
          },
        ],
      },
    });
    expect(result.status).toBe("exception");
    expect(result.discrepancies.some((d) => d.type === "quantity")).toBe(true);
    expect(result.discrepancies.some((d) => d.type === "price")).toBe(true);
  });
});
describe("buildTriadAssistInsight", () => {
  it("returns straight-through messaging for clean matches", () => {
    const result = evaluateTriad(BASE_TRIAD);
    const insight = buildTriadAssistInsight(result);
    expect(insight.headline).toMatch(/Triad clean/);
  });
  it("surfaces actions when discrepancies exist", () => {
    const result = evaluateTriad({
      ...BASE_TRIAD,
      invoice: {
        ...BASE_TRIAD.invoice,
        lines: [
          {
            sku: "SYS-001",
            description: "Prime ribeye",
            quantity: 110,
            unitCost: 48,
          },
        ],
      },
    });
    const insight = buildTriadAssistInsight(result);
    expect(insight.actions.length).toBeGreaterThan(0);
  });
});
