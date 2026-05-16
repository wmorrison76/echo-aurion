import type { RequestHandler } from "express";
import {
  buildInvoiceWorkflow,
  type InvoiceWorkflowInput,
  type InvoiceIngestMeta,
  type ApprovalDecision,
  type PaymentRun,
  type InvoicePolicy,
  type RiskSignal,
} from "../../shared/invoiceWorkflow";
import type { TriadInput } from "../../shared/ap";
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function ensureString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} must be a string`);
  }
  return value;
}
function ensureNumber(value: unknown, name: string): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${name} must be a number`);
  }
  return value;
}
function parseTriad(value: unknown): TriadInput {
  if (!isRecord(value)) {
    throw new Error("triad payload is required");
  }
  const { invoice, purchaseOrder, receipts, ocr } = value;
  if (!isRecord(invoice) || !Array.isArray(invoice.lines)) {
    throw new Error("invoice payload is invalid");
  }
  if (!isRecord(purchaseOrder) || !Array.isArray(purchaseOrder.lines)) {
    throw new Error("purchase order payload is invalid");
  }
  if (!Array.isArray(receipts)) {
    throw new Error("receipts payload must be an array");
  }
  const invoiceLines = invoice.lines.map((line, index) => {
    if (!isRecord(line)) {
      throw new Error(`invoice line ${index} is invalid`);
    }
    return {
      sku: ensureString(line.sku, `invoice.lines[${index}].sku`),
      description: ensureString(
        line.description,
        `invoice.lines[${index}].description`,
      ),
      quantity: ensureNumber(line.quantity, `invoice.lines[${index}].quantity`),
      unitCost: ensureNumber(line.unitCost, `invoice.lines[${index}].unitCost`),
      receiptId:
        typeof line.receiptId === "string" ? line.receiptId : undefined,
    };
  });
  const purchaseOrderLines = purchaseOrder.lines.map((line, index) => {
    if (!isRecord(line)) {
      throw new Error(`purchase order line ${index} is invalid`);
    }
    return {
      sku: ensureString(line.sku, `purchaseOrder.lines[${index}].sku`),
      description: ensureString(
        line.description,
        `purchaseOrder.lines[${index}].description`,
      ),
      orderedQty: ensureNumber(
        line.orderedQty,
        `purchaseOrder.lines[${index}].orderedQty`,
      ),
      unitCost: ensureNumber(
        line.unitCost,
        `purchaseOrder.lines[${index}].unitCost`,
      ),
    };
  });
  const parsedReceipts = receipts.map((receipt, receiptIndex) => {
    if (!isRecord(receipt) || !Array.isArray(receipt.lines)) {
      throw new Error(`receipt ${receiptIndex} is invalid`);
    }
    return {
      id: ensureString(receipt.id, `receipts[${receiptIndex}].id`),
      purchaseOrderId: ensureString(
        receipt.purchaseOrderId,
        `receipts[${receiptIndex}].purchaseOrderId`,
      ),
      lines: receipt.lines.map((line, lineIndex) => {
        if (!isRecord(line)) {
          throw new Error(`receipt line ${lineIndex} is invalid`);
        }
        return {
          sku: ensureString(
            line.sku,
            `receipts[${receiptIndex}].lines[${lineIndex}].sku`,
          ),
          receivedQty: ensureNumber(
            line.receivedQty,
            `receipts[${receiptIndex}].lines[${lineIndex}].receivedQty`,
          ),
          receivedAt: ensureString(
            line.receivedAt,
            `receipts[${receiptIndex}].lines[${lineIndex}].receivedAt`,
          ),
        };
      }),
    };
  });
  const parsedOcr = Array.isArray(ocr)
    ? ocr.map((entry, index) => {
        if (!isRecord(entry)) {
          throw new Error(`ocr entry ${index} is invalid`);
        }
        const value =
          typeof entry.value === "string" || typeof entry.value === "number"
            ? entry.value
            : String(entry.value ?? "");
        return {
          field: ensureString(entry.field, `ocr[${index}].field`),
          value,
          confidence:
            typeof entry.confidence === "number" ? entry.confidence : undefined,
        };
      })
    : undefined;
  return {
    invoice: {
      id: ensureString(invoice.id, "invoice.id"),
      vendor: ensureString(invoice.vendor, "invoice.vendor"),
      purchaseOrderId: ensureString(
        invoice.purchaseOrderId,
        "invoice.purchaseOrderId",
      ),
      invoiceDate: ensureString(invoice.invoiceDate, "invoice.invoiceDate"),
      dueDate: ensureString(invoice.dueDate, "invoice.dueDate"),
      currency: ensureString(invoice.currency, "invoice.currency"),
      total: ensureNumber(invoice.total, "invoice.total"),
      lines: invoiceLines,
    },
    purchaseOrder: {
      id: ensureString(purchaseOrder.id, "purchaseOrder.id"),
      vendor: ensureString(purchaseOrder.vendor, "purchaseOrder.vendor"),
      currency: ensureString(purchaseOrder.currency, "purchaseOrder.currency"),
      lines: purchaseOrderLines,
    },
    receipts: parsedReceipts,
    ocr: parsedOcr,
  } satisfies TriadInput;
}
function parseIngest(value: unknown): InvoiceIngestMeta {
  if (!isRecord(value)) {
    throw new Error("ingest metadata is required");
  }
  const { channel, capturedAt, attachments, queueReference } = value;
  if (
    typeof channel !== "string" ||
    typeof capturedAt !== "string" ||
    typeof attachments !== "number" ||
    typeof queueReference !== "string"
  ) {
    throw new Error("ingest metadata is invalid");
  }
  return {
    channel: value.channel as InvoiceIngestMeta["channel"],
    capturedAt: capturedAt as string,
    completedAt:
      typeof value.completedAt === "string" ? value.completedAt : undefined,
    operator: typeof value.operator === "string" ? value.operator : undefined,
    attachments,
    queueReference,
    duplicateCheckScore:
      typeof value.duplicateCheckScore === "number"
        ? value.duplicateCheckScore
        : undefined,
    ocrConfidence:
      typeof value.ocrConfidence === "number" ? value.ocrConfidence : undefined,
  };
}
function parseApprovals(value: unknown): ApprovalDecision[] {
  if (!Array.isArray(value)) {
    throw new Error("approvals must be an array");
  }
  return value.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.role !== "string" ||
      typeof item.status !== "string"
    ) {
      throw new Error(`approval at index ${index} is invalid`);
    }
    return {
      id: typeof item.id === "string" ? item.id : `approval-${index}`,
      role: item.role,
      status: item.status as ApprovalDecision["status"],
      required: item.required === false ? false : true,
      actor: typeof item.actor === "string" ? item.actor : undefined,
      decidedAt:
        typeof item.decidedAt === "string" ? item.decidedAt : undefined,
      notes: typeof item.notes === "string" ? item.notes : undefined,
      escalation:
        typeof item.escalation === "string" ? item.escalation : undefined,
    } satisfies ApprovalDecision;
  });
}
function parsePayment(value: unknown): PaymentRun {
  if (!isRecord(value)) {
    throw new Error("payment payload is required");
  }
  const {
    method,
    amount,
    currency,
    scheduledFor,
    executionWindow,
    queueReference,
    bank,
    accountLast4,
    releaseChannel,
  } = value;
  if (
    typeof method !== "string" ||
    typeof amount !== "number" ||
    typeof currency !== "string" ||
    typeof scheduledFor !== "string"
  ) {
    throw new Error("payment payload is invalid");
  }
  if (
    !isRecord(executionWindow) ||
    typeof executionWindow.start !== "string" ||
    typeof executionWindow.end !== "string" ||
    typeof executionWindow.cutOff !== "string"
  ) {
    throw new Error("payment execution window is invalid");
  }
  if (
    typeof queueReference !== "string" ||
    typeof bank !== "string" ||
    typeof accountLast4 !== "string" ||
    typeof releaseChannel !== "string"
  ) {
    throw new Error("payment queue metadata is invalid");
  }
  return {
    status:
      typeof value.status === "string"
        ? (value.status as PaymentRun["status"])
        : "queued",
    method: method as PaymentRun["method"],
    amount,
    currency,
    scheduledFor,
    executionWindow: {
      start: executionWindow.start,
      end: executionWindow.end,
      cutOff: executionWindow.cutOff,
    },
    queueReference,
    bank,
    accountLast4,
    releaseChannel: releaseChannel as PaymentRun["releaseChannel"],
    releaseConditions: Array.isArray(value.releaseConditions)
      ? value.releaseConditions.filter(
          (item): item is string => typeof item === "string",
        )
      : undefined,
  };
}
function parsePolicy(value: unknown): InvoicePolicy {
  if (!isRecord(value)) {
    throw new Error("policy payload is required");
  }
  const {
    straightThroughThreshold,
    varianceHoldThreshold,
    receiptCoverageThreshold,
  } = value;
  if (
    typeof straightThroughThreshold !== "number" ||
    typeof varianceHoldThreshold !== "number" ||
    typeof receiptCoverageThreshold !== "number"
  ) {
    throw new Error("policy thresholds are invalid");
  }
  return {
    straightThroughThreshold,
    varianceHoldThreshold,
    receiptCoverageThreshold,
  } satisfies InvoicePolicy;
}
function parseRiskSignals(value: unknown): RiskSignal[] | undefined {
  if (value == null) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error("risk signals must be an array when provided");
  }
  return value.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.message !== "string" ||
      typeof item.severity !== "string" ||
      typeof item.detectedAt !== "string" ||
      typeof item.type !== "string" ||
      typeof item.source !== "string"
    ) {
      throw new Error(`risk signal at index ${index} is invalid`);
    }
    return {
      id: item.id,
      type: item.type,
      message: item.message,
      severity: item.severity as RiskSignal["severity"],
      detectedAt: item.detectedAt,
      source: item.source,
    } satisfies RiskSignal;
  });
}
function parseInvoiceWorkflowInput(body: unknown): InvoiceWorkflowInput {
  if (!isRecord(body)) {
    throw new Error("request body must be an object");
  }
  const triad = parseTriad(body.triad);
  const ingest = parseIngest(body.ingest);
  const approvals = parseApprovals(body.approvals);
  const payment = parsePayment(body.payment);
  const policy = parsePolicy(body.policy);
  const riskSignals = parseRiskSignals(body.riskSignals);
  return { triad, ingest, approvals, payment, policy, riskSignals };
}
export const handleInvoiceWorkflow: RequestHandler = (req, res) => {
  try {
    const payload = parseInvoiceWorkflowInput(req.body);
    const workflow = buildInvoiceWorkflow(payload);
    res.json({ workflow });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to compose invoice workflow.";
    const statusCode =
      message.includes("invalid") || message.includes("required") ? 400 : 500;
    res.status(statusCode).json({ error: message });
  }
};
