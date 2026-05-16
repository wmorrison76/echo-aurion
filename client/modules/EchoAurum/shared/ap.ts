export interface ApInvoiceLine {
  sku: string;
  description: string;
  quantity: number;
  unitCost: number;
  receiptId?: string;
}
export interface ApInvoice {
  id: string;
  vendor: string;
  purchaseOrderId: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  lines: ApInvoiceLine[];
  total: number;
}
export interface ApPurchaseOrderLine {
  sku: string;
  description: string;
  orderedQty: number;
  unitCost: number;
}
export interface ApPurchaseOrder {
  id: string;
  vendor: string;
  currency: string;
  lines: ApPurchaseOrderLine[];
}
export interface ApReceiptLine {
  sku: string;
  receivedQty: number;
  receivedAt: string;
}
export interface ApReceipt {
  id: string;
  purchaseOrderId: string;
  lines: ApReceiptLine[];
}
export interface OcrExtraction {
  confidence: number;
  field: string;
  value: string | number;
}
export interface TriadInput {
  invoice: ApInvoice;
  purchaseOrder: ApPurchaseOrder;
  receipts: ApReceipt[];
  ocr?: OcrExtraction[];
}
export interface TriadDiscrepancy {
  sku: string;
  type: "quantity" | "price" | "missing_receipt" | "currency";
  expected?: number | string;
  actual?: number | string;
  message: string;
  confidence?: number;
}
export interface TriadMatchResult {
  status: "matched" | "matched_with_variance" | "exception";
  discrepancies: TriadDiscrepancy[];
  totalVariance: number;
  invoiceTotal: number;
}
function findPoLine(po: ApPurchaseOrder, sku: string) {
  return po.lines.find((line) => line.sku === sku);
}
function aggregateReceiptQty(receipts: ApReceipt[], sku: string) {
  return receipts.reduce((sum, receipt) => {
    const line = receipt.lines.find((item) => item.sku === sku);
    return sum + (line?.receivedQty ?? 0);
  }, 0);
}
export function evaluateTriad(input: TriadInput): TriadMatchResult {
  const discrepancies: TriadDiscrepancy[] = [];
  let totalVariance = 0;
  if (input.invoice.currency !== input.purchaseOrder.currency) {
    discrepancies.push({
      sku: "*",
      type: "currency",
      expected: input.purchaseOrder.currency,
      actual: input.invoice.currency,
      message: "Invoice currency mismatch",
    });
  }
  for (const line of input.invoice.lines) {
    const poLine = findPoLine(input.purchaseOrder, line.sku);
    if (!poLine) {
      discrepancies.push({
        sku: line.sku,
        type: "missing_receipt",
        message: "Invoice references SKU not present on purchase order",
      });
      continue;
    }
    if (line.unitCost !== poLine.unitCost) {
      const variance = (line.unitCost - poLine.unitCost) * line.quantity;
      totalVariance += variance;
      discrepancies.push({
        sku: line.sku,
        type: "price",
        expected: poLine.unitCost,
        actual: line.unitCost,
        message: "Unit cost variance detected",
      });
    }
    const receivedQty = aggregateReceiptQty(input.receipts, line.sku);
    if (receivedQty < line.quantity) {
      discrepancies.push({
        sku: line.sku,
        type: "missing_receipt",
        expected: line.quantity,
        actual: receivedQty,
        message: "Insufficient quantity received",
      });
    }
    if (line.quantity !== poLine.orderedQty) {
      const variance = (line.quantity - poLine.orderedQty) * line.unitCost;
      totalVariance += variance;
      discrepancies.push({
        sku: line.sku,
        type: "quantity",
        expected: poLine.orderedQty,
        actual: line.quantity,
        message: "Invoice quantity differs from purchase order",
        confidence: input.ocr?.find((ocr) => ocr.field === line.sku)
          ?.confidence,
      });
    }
  }
  const status: TriadMatchResult["status"] =
    discrepancies.length === 0
      ? "matched"
      : totalVariance === 0
        ? "matched_with_variance"
        : "exception";
  return {
    status,
    discrepancies,
    totalVariance,
    invoiceTotal: input.invoice.total,
  };
}
export interface AiAssistInsight {
  headline: string;
  narrative: string;
  actions: string[];
}
export function buildTriadAssistInsight(
  result: TriadMatchResult,
): AiAssistInsight {
  if (result.status === "matched") {
    return {
      headline: "Triad clean. Invoice eligible for straight-through payment.",
      narrative:
        "All invoice lines reconcile to purchase order and receiving data. No adjustments required.",
      actions: ["Queue for EchoSentinel payment release"],
    };
  }
  const discrepancyCount = result.discrepancies.length;
  const variance = result.totalVariance.toFixed(2);
  return {
    headline:
      result.status === "matched_with_variance"
        ? "Triad variance detected—review recommended."
        : "Triad exception requires intervention.",
    narrative: `${discrepancyCount} discrepancies flagged with total variance ${variance}. Prioritize vendor reconciliation before release.`,
    actions: result.discrepancies.map((discrepancy) => {
      switch (discrepancy.type) {
        case "quantity":
          return `Verify quantity for SKU ${discrepancy.sku}. Invoice ${discrepancy.actual} vs PO ${discrepancy.expected}.`;
        case "price":
          return `Price variance on SKU ${discrepancy.sku}. Expected ${discrepancy.expected}, got ${discrepancy.actual}.`;
        case "missing_receipt":
          return `Receipt gap for SKU ${discrepancy.sku}. Confirm receiving documents before approval.`;
        case "currency":
          return `Currency mismatch invoice ${discrepancy.actual} vs PO ${discrepancy.expected}. Coordinate FX approval.`;
        default:
          return `Investigate discrepancy on SKU ${discrepancy.sku}.`;
      }
    }),
  };
}
