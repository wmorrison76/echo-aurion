import { describe, it, expect } from "vitest";
import {
  exportToERP,
  payWithGateway,
  normalizeOcrPayload,
} from "../functions/_shared/adapters.ts";
import type { ERP, Gateway } from "../functions/_shared/adapters.ts";
describe("ERP export coverage", () => {
  const header = {
    id: "inv-test-123",
    org_id: "org-test",
    vendor: "Test Vendor",
    total: 128.45,
    status: "normalized",
  } as const;
  const lines = [
    {
      id: "line-1",
      invoice_id: header.id,
      item_code: "SKU-1",
      description: "Item 1",
      qty: 2,
      unit_price: 10,
    },
    {
      id: "line-2",
      invoice_id: header.id,
      item_code: "SKU-2",
      description: "Item 2",
      qty: 4,
      unit_price: 15,
    },
  ];
  (["r365", "simphony", "netsuite"] as ERP[]).forEach((erp) => {
    it(`exports successfully for ${erp}`, async () => {
      const result = await exportToERP(erp, header, lines, {});
      expect(result.status).toBe("success");
      expect(result.erp_id).toContain(header.id);
    });
  });
});
describe("Payment gateway coverage", () => {
  (["stripe", "square", "adyen"] as Gateway[]).forEach((gateway) => {
    it(`handles ${gateway} authorization`, async () => {
      const result = await payWithGateway(gateway, 42.5, {});
      expect(result.payment_status).toBe("authorized");
      expect(result.transaction_id).toMatch(new RegExp(gateway.toUpperCase()));
    });
  });
});
describe("OCR normalization coverage", () => {
  it("normalizes raw payload with mixed fields", () => {
    const raw = {
      header: {
        vendor: "Example Co",
        total: "123.45",
        invoice_number: "INV-99",
        invoice_date: "2024-01-31",
      },
      lines: [
        {
          description: "Apples",
          qty: "2",
          unit_price: "1.50",
          total_price: "3.00",
          item_code: "APL-01",
          uom: "ea",
        },
        {
          description: "Bananas",
          qty: 3,
          price: 0.85,
          item_code: "BAN-02",
          unit: "ea",
        },
      ],
    };
    const normalized = normalizeOcrPayload(raw, {
      confidence: 82,
      engine: "test",
    });
    expect(normalized.header.vendor).toBe("Example Co");
    expect(normalized.header.total).toBeCloseTo(123.45);
    expect(normalized.lines).toHaveLength(2);
    expect(normalized.lines[0].description).toBe("Apples");
    expect(normalized.lines[1].unit_price).toBeCloseTo(0.85);
    expect(normalized.metrics.lineCount).toBe(2);
  });
});
