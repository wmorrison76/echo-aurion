import type { InvoiceWorkflowInput } from "@shared/invoiceWorkflow";
export const invoiceWorkflowSeed: InvoiceWorkflowInput = {
  triad: {
    invoice: {
      id: "INV-7550",
      vendor: "Harborline Laundry",
      purchaseOrderId: "PO-4670",
      invoiceDate: "2024-11-05",
      dueDate: "2024-11-20",
      currency: "USD",
      total: 6120,
      lines: [
        {
          sku: "HL-01",
          description: "Laundry rotation",
          quantity: 300,
          unitCost: 20.4,
        },
      ],
    },
    purchaseOrder: {
      id: "PO-4670",
      vendor: "Harborline Laundry",
      currency: "USD",
      lines: [
        {
          sku: "HL-01",
          description: "Laundry rotation",
          orderedQty: 300,
          unitCost: 20.4,
        },
      ],
    },
    receipts: [
      {
        id: "RCPT-5790",
        purchaseOrderId: "PO-4670",
        lines: [
          {
            sku: "HL-01",
            receivedQty: 280,
            receivedAt: "2024-11-05T21:10:00Z",
          },
        ],
      },
    ],
    ocr: [
      { field: "total", value: 6120, confidence: 0.86 },
      { field: "dueDate", value: "2024-11-20", confidence: 0.82 },
      { field: "vendor", value: "Harborline Laundry", confidence: 0.9 },
    ],
  },
  ingest: {
    channel: "portal",
    capturedAt: "2024-11-06T11:08:00Z",
    completedAt: "2024-11-06T11:09:45Z",
    operator: "Echo ingest bot",
    attachments: 2,
    queueReference: "AP-QUEUE-88412",
    duplicateCheckScore: 0.18,
    ocrConfidence: 0.86,
  },
  approvals: [
    {
      id: "ap-review",
      role: "AP reviewer",
      status: "approved",
      required: true,
      actor: "Jordan Patel",
      decidedAt: "2024-11-06T12:10:00Z",
      notes: "Variance within tolerance, pending receiving confirmation.",
    },
    {
      id: "cost-center",
      role: "Cost center owner",
      status: "pending",
      required: true,
      escalation: "Escalate if not approved by 15:00 ET",
      notes: "Waiting for receiving upload.",
    },
    {
      id: "treasury",
      role: "Treasury",
      status: "pending",
      required: true,
      notes: "Release once cost center sign-off received.",
    },
  ],
  payment: {
    status: "queued",
    method: "ach",
    amount: 6120,
    currency: "USD",
    scheduledFor: "2024-11-07T14:30:00Z",
    executionWindow: {
      start: "2024-11-07T13:30:00Z",
      end: "2024-11-07T15:00:00Z",
      cutOff: "2024-11-07T15:30:00Z",
    },
    queueReference: "PAY-ACH-3221",
    bank: "Sunrise Treasury Bank",
    accountLast4: "4098",
    releaseChannel: "treasury_queue",
    releaseConditions: ["Treasury dual approval required"],
  },
  policy: {
    straightThroughThreshold: 5000,
    varianceHoldThreshold: 250,
    receiptCoverageThreshold: 0.92,
  },
  riskSignals: [
    {
      id: "rs-supplier-watch",
      type: "vendor",
      message:
        "Vendor risk watchlist triggered – outstanding compliance questionnaire.",
      severity: "medium",
      detectedAt: "2024-11-06T11:20:00Z",
      source: "Zelda Risk",
    },
    {
      id: "rs-ach-window",
      type: "cash",
      message: "ACH cut-off compressed due to bank maintenance window.",
      severity: "low",
      detectedAt: "2024-11-06T11:50:00Z",
      source: "Treasury Ops",
    },
  ],
};
