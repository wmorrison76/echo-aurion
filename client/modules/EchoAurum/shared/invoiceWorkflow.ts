import {
  buildTriadAssistInsight,
  evaluateTriad,
  type AiAssistInsight,
  type TriadInput,
  type TriadMatchResult,
} from "./ap";
export type StageStatus = "pending" | "in_progress" | "completed" | "blocked";
export type WorkflowStageId = "ingest" | "triad" | "approvals" | "payment";
export type ApprovalStatus = "pending" | "approved" | "rejected" | "delegated";
export type PaymentMethod = "ach" | "wire" | "virtual_card" | "check";
export type RiskSeverity = "low" | "medium" | "high";
export interface WorkflowStageMetric {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning" | "danger";
}
export interface WorkflowStage {
  id: WorkflowStageId;
  label: string;
  status: StageStatus;
  summary: string;
  actor?: string;
  startedAt?: string;
  completedAt?: string;
  notice?: string;
  actions: string[];
  metrics: WorkflowStageMetric[];
}
export interface ApprovalDecision {
  id: string;
  role: string;
  status: ApprovalStatus;
  required: boolean;
  actor?: string;
  decidedAt?: string;
  notes?: string;
  escalation?: string;
}
export interface PaymentExecutionWindow {
  start: string;
  end: string;
  cutOff: string;
}
export interface PaymentRun {
  status: "queued" | "scheduled" | "released" | "blocked";
  method: PaymentMethod;
  amount: number;
  currency: string;
  scheduledFor: string;
  executionWindow: PaymentExecutionWindow;
  queueReference: string;
  bank: string;
  accountLast4: string;
  releaseChannel: "treasury_queue" | "auto" | "manual";
  releaseConditions?: string[];
}
export interface InvoiceIngestMeta {
  channel: "email" | "edi" | "portal" | "api";
  capturedAt: string;
  completedAt?: string;
  operator?: string;
  attachments: number;
  queueReference: string;
  duplicateCheckScore?: number;
  ocrConfidence?: number;
}
export interface RiskSignal {
  id: string;
  type: string;
  message: string;
  severity: RiskSeverity;
  detectedAt: string;
  source: string;
}
export interface InvoicePolicy {
  straightThroughThreshold: number;
  varianceHoldThreshold: number;
  receiptCoverageThreshold: number;
}
export interface InvoiceWorkflowInput {
  triad: TriadInput;
  ingest: InvoiceIngestMeta;
  approvals: ApprovalDecision[];
  payment: PaymentRun;
  policy: InvoicePolicy;
  riskSignals?: RiskSignal[];
}
export type AuditEventStatus = "recorded" | "pending" | "alert";
export interface AuditEvent {
  id: string;
  stage: WorkflowStageId | "risk";
  at: string;
  actor: string;
  event: string;
  status: AuditEventStatus;
  details?: string;
  metadata?: Record<string, unknown>;
}
export interface InvoiceWorkflowMetrics {
  varianceAmount: number;
  ocrConfidence: number;
  approvalsCompleted: number;
  approvalsRequired: number;
  receiptCoverage: number;
  riskScore: number;
  discrepancyCount: number;
}
export interface InvoiceWorkflowSummary {
  invoiceId: string;
  vendor: string;
  total: number;
  currency: string;
  dueDate: string;
  status: "ready" | "awaiting_review" | "blocked";
  narrative: string;
  releaseWindow: PaymentExecutionWindow;
  queueReference: string;
}
export interface InvoiceWorkflowResult {
  summary: InvoiceWorkflowSummary;
  metrics: InvoiceWorkflowMetrics;
  triad: { result: TriadMatchResult; insight: AiAssistInsight };
  stages: WorkflowStage[];
  approvals: ApprovalDecision[];
  payment: PaymentRun;
  auditTrail: AuditEvent[];
  outstandingActions: string[];
  riskSignals: RiskSignal[];
}
export function buildInvoiceWorkflow(
  input: InvoiceWorkflowInput,
): InvoiceWorkflowResult {
  const triadResult = evaluateTriad(input.triad);
  const triadInsight = buildTriadAssistInsight(triadResult);
  const ocrConfidence = resolveOcrConfidence(input);
  const receiptCoverage = computeReceiptCoverage(input.triad);
  const approvals = normalizeApprovals(input.approvals);
  const approvalsRequired = approvals.filter((item) => item.required).length;
  const approvalsCompleted = approvals.filter(
    (item) => item.required && item.status === "approved",
  ).length;
  const hasRejectedApproval = approvals.some(
    (item) => item.status === "rejected",
  );
  const pendingApprovals = approvals.filter(
    (item) => item.required && item.status !== "approved",
  );
  const varianceHold =
    Math.abs(triadResult.totalVariance) > input.policy.varianceHoldThreshold;
  const receiptHold = receiptCoverage < input.policy.receiptCoverageThreshold;
  const highSeveritySignal = (input.riskSignals ?? []).some(
    (signal) => signal.severity === "high",
  );
  let status: InvoiceWorkflowSummary["status"] = "ready";
  if (
    triadResult.status === "exception" ||
    hasRejectedApproval ||
    varianceHold ||
    receiptHold ||
    highSeveritySignal
  ) {
    status = "blocked";
  } else if (
    pendingApprovals.length > 0 ||
    triadResult.status === "matched_with_variance"
  ) {
    status = "awaiting_review";
  }
  const narrativeParts: string[] = [];
  if (status === "blocked") {
    narrativeParts.push("Release halted until review completes.");
  } else if (status === "awaiting_review") {
    narrativeParts.push("Release awaiting final approval or variance review.");
  } else {
    narrativeParts.push("Invoice eligible for scheduled payment window.");
  }
  if (triadResult.discrepancies.length > 0) {
    narrativeParts.push(
      `${triadResult.discrepancies.length} discrepancy${triadResult.discrepancies.length === 1 ? "" : "s"} detected.`,
    );
  }
  if (pendingApprovals.length > 0) {
    narrativeParts.push(
      `${pendingApprovals.length} approval${pendingApprovals.length === 1 ? "" : "s"} pending.`,
    );
  }
  if (varianceHold) {
    narrativeParts.push(
      `Variance ${formatCurrency(Math.abs(triadResult.totalVariance), input.triad.invoice.currency)} exceeds hold threshold.`,
    );
  }
  if (receiptHold) {
    narrativeParts.push(
      `Receipt coverage ${toPercent(receiptCoverage)} below policy floor of ${toPercent(input.policy.receiptCoverageThreshold)}.`,
    );
  }
  if (highSeveritySignal) {
    narrativeParts.push(
      "High severity risk signal requires treasury escalation.",
    );
  }
  const payment = derivePaymentRun(input.payment, {
    status,
    varianceHold,
    receiptHold,
    hasRejectedApproval,
    pendingApprovals,
    triadResult,
    riskSignals: input.riskSignals ?? [],
  });
  const stages = buildStages({
    input,
    triadResult,
    triadInsight,
    ocrConfidence,
    receiptCoverage,
    approvals,
    pendingApprovals,
    payment,
    status,
    varianceHold,
    receiptHold,
    highSeveritySignal,
  });
  const outstandingActions = computeOutstandingActions({
    triadResult,
    triadInsight,
    pendingApprovals,
    varianceHold,
    receiptHold,
    highSeveritySignal,
    policy: input.policy,
    riskSignals: input.riskSignals ?? [],
    currency: input.triad.invoice.currency,
  });
  const auditTrail = buildAuditTrail({
    input,
    approvals,
    triadResult,
    triadInsight,
    payment,
    highSeveritySignal,
  });
  return {
    summary: {
      invoiceId: input.triad.invoice.id,
      vendor: input.triad.invoice.vendor,
      total: input.triad.invoice.total,
      currency: input.triad.invoice.currency,
      dueDate: input.triad.invoice.dueDate,
      status,
      narrative: narrativeParts.join("").trim(),
      releaseWindow: payment.executionWindow,
      queueReference: payment.queueReference,
    },
    metrics: {
      varianceAmount: triadResult.totalVariance,
      ocrConfidence,
      approvalsCompleted,
      approvalsRequired,
      receiptCoverage,
      riskScore: computeRiskScore({
        triadResult,
        receiptCoverage,
        approvalsRequired,
        approvalsCompleted,
        riskSignals: input.riskSignals ?? [],
      }),
      discrepancyCount: triadResult.discrepancies.length,
    },
    triad: { result: triadResult, insight: triadInsight },
    stages,
    approvals,
    payment,
    auditTrail,
    outstandingActions,
    riskSignals: input.riskSignals ?? [],
  };
}
function resolveOcrConfidence(input: InvoiceWorkflowInput): number {
  if (typeof input.ingest.ocrConfidence === "number") {
    return clamp(input.ingest.ocrConfidence, 0, 1);
  }
  const ocr = input.triad.ocr ?? [];
  if (ocr.length === 0) {
    return 0;
  }
  const average =
    ocr.reduce(
      (sum, item) =>
        sum +
        clamp(typeof item.confidence === "number" ? item.confidence : 0, 0, 1),
      0,
    ) / ocr.length;
  return clamp(average, 0, 1);
}
function computeReceiptCoverage(triad: TriadInput): number {
  const invoiceTotals = triad.invoice.lines.reduce(
    (acc, line) => {
      return {
        quantity: acc.quantity + line.quantity,
        received:
          acc.received +
          Math.min(line.quantity, aggregateReceiptQuantity(triad, line.sku)),
      };
    },
    { quantity: 0, received: 0 },
  );
  if (invoiceTotals.quantity === 0) {
    return 1;
  }
  return clamp(invoiceTotals.received / invoiceTotals.quantity, 0, 1);
}
function aggregateReceiptQuantity(triad: TriadInput, sku: string): number {
  return triad.receipts.reduce((sum, receipt) => {
    const line = receipt.lines.find((item) => item.sku === sku);
    return sum + (line?.receivedQty ?? 0);
  }, 0);
}
function normalizeApprovals(approvals: ApprovalDecision[]): ApprovalDecision[] {
  return approvals.map((approval, index) => ({
    ...approval,
    id: approval.id ?? `approval-${index}`,
    required: approval.required !== false,
  }));
}
function derivePaymentRun(
  payment: PaymentRun,
  context: {
    status: InvoiceWorkflowSummary["status"];
    varianceHold: boolean;
    receiptHold: boolean;
    hasRejectedApproval: boolean;
    pendingApprovals: ApprovalDecision[];
    triadResult: TriadMatchResult;
    riskSignals: RiskSignal[];
  },
): PaymentRun {
  const releaseConditions = new Set(payment.releaseConditions ?? []);
  if (context.pendingApprovals.length > 0) {
    releaseConditions.add(
      `${context.pendingApprovals.length} approval${context.pendingApprovals.length === 1 ? "" : "s"} pending`,
    );
  }
  if (context.triadResult.status === "exception") {
    releaseConditions.add("Resolve triad exception before release");
  }
  if (context.varianceHold) {
    releaseConditions.add("Variance exceeds policy threshold");
  }
  if (context.receiptHold) {
    releaseConditions.add("Receipt coverage below policy");
  }
  if (context.hasRejectedApproval) {
    releaseConditions.add("Re-run approval ladder after rejection");
  }
  if (context.riskSignals.some((signal) => signal.severity === "high")) {
    releaseConditions.add("High severity risk signal escalation required");
  }
  const status = context.status === "blocked" ? "blocked" : payment.status;
  return {
    ...payment,
    status,
    releaseConditions: Array.from(releaseConditions),
  };
}
function buildStages(context: {
  input: InvoiceWorkflowInput;
  triadResult: TriadMatchResult;
  triadInsight: AiAssistInsight;
  ocrConfidence: number;
  receiptCoverage: number;
  approvals: ApprovalDecision[];
  pendingApprovals: ApprovalDecision[];
  payment: PaymentRun;
  status: InvoiceWorkflowSummary["status"];
  varianceHold: boolean;
  receiptHold: boolean;
  highSeveritySignal: boolean;
}): WorkflowStage[] {
  const ingestionStage: WorkflowStage = {
    id: "ingest",
    label: "Invoice intake & OCR",
    status: "completed",
    summary: `${capitalize(context.input.ingest.channel)} capture completed for invoice ${context.input.triad.invoice.id}.`,
    actor: context.input.ingest.operator ?? "Echo ingest service",
    startedAt: context.input.ingest.capturedAt,
    completedAt:
      context.input.ingest.completedAt ?? context.input.ingest.capturedAt,
    actions: [`Queued as ${context.input.ingest.queueReference}`],
    metrics: compactMetrics([
      { label: "Attachments", value: String(context.input.ingest.attachments) },
      {
        label: "OCR confidence",
        value: toPercent(context.ocrConfidence),
        tone:
          context.ocrConfidence >= 0.9
            ? "positive"
            : context.ocrConfidence >= 0.75
              ? "warning"
              : "danger",
      },
      typeof context.input.ingest.duplicateCheckScore === "number"
        ? {
            label: "Duplicate score",
            value: toPercent(context.input.ingest.duplicateCheckScore),
            tone:
              context.input.ingest.duplicateCheckScore < 0.4
                ? "positive"
                : "warning",
          }
        : undefined,
    ]),
  };
  const triadStageStatus: StageStatus =
    context.triadResult.status === "matched"
      ? "completed"
      : context.triadResult.status === "matched_with_variance"
        ? "in_progress"
        : "blocked";
  const triadStage: WorkflowStage = {
    id: "triad",
    label: "Triad matching",
    status: triadStageStatus,
    summary: context.triadInsight.headline,
    startedAt:
      context.input.ingest.completedAt ?? context.input.ingest.capturedAt,
    completedAt:
      triadStageStatus === "completed"
        ? (context.input.ingest.completedAt ?? context.input.ingest.capturedAt)
        : undefined,
    actions: context.triadInsight.actions,
    metrics: compactMetrics([
      { label: "Status", value: humanizeStatus(context.triadResult.status) },
      {
        label: "Discrepancies",
        value: String(context.triadResult.discrepancies.length),
        tone:
          context.triadResult.discrepancies.length === 0
            ? "positive"
            : context.triadResult.status === "exception"
              ? "danger"
              : "warning",
      },
      {
        label: "Variance",
        value: formatCurrency(
          Math.abs(context.triadResult.totalVariance),
          context.input.triad.invoice.currency,
        ),
        tone:
          Math.abs(context.triadResult.totalVariance) === 0
            ? "positive"
            : "warning",
      },
      {
        label: "Receipt coverage",
        value: toPercent(context.receiptCoverage),
        tone:
          context.receiptCoverage >=
          context.input.policy.receiptCoverageThreshold
            ? "positive"
            : "danger",
      },
    ]),
  };
  const hasRejectedApproval = context.approvals.some(
    (item) => item.status === "rejected",
  );
  const approvalsStageStatus: StageStatus = hasRejectedApproval
    ? "blocked"
    : context.pendingApprovals.length > 0
      ? "in_progress"
      : "completed";
  const approvalsStage: WorkflowStage = {
    id: "approvals",
    label: "Approval ladder",
    status: approvalsStageStatus,
    summary:
      approvalsStageStatus === "completed"
        ? "All required approvals captured."
        : approvalsStageStatus === "blocked"
          ? "Approval rejected – escalate for remediation."
          : `${context.pendingApprovals.length} approval${context.pendingApprovals.length === 1 ? "" : "s"} outstanding.`,
    actions: context.pendingApprovals.map(
      (approval) => `${approval.role} approval pending`,
    ),
    metrics: compactMetrics([
      {
        label: "Completed",
        value: `${context.approvals.filter((item) => item.status === "approved").length}/${context.approvals.length}`,
      },
      context.approvals.length > 0
        ? {
            label: "Critical",
            value: String(
              context.approvals.filter((item) => item.required).length,
            ),
            tone:
              context.pendingApprovals.length === 0 ? "positive" : "warning",
          }
        : undefined,
    ]),
  };
  const paymentStageStatus: StageStatus =
    context.status === "blocked"
      ? "blocked"
      : context.payment.status === "released"
        ? "completed"
        : "in_progress";
  const paymentStage: WorkflowStage = {
    id: "payment",
    label: "Payment execution",
    status: paymentStageStatus,
    summary:
      paymentStageStatus === "completed"
        ? `Payment released via ${context.payment.method.toUpperCase()}.`
        : paymentStageStatus === "blocked"
          ? "Treasury hold in effect until issues resolved."
          : `Scheduled for ${formatDateTime(context.payment.scheduledFor)} (${context.payment.method.toUpperCase()}).`,
    actions: context.payment.releaseConditions ?? [],
    metrics: compactMetrics([
      {
        label: "Amount",
        value: formatCurrency(context.payment.amount, context.payment.currency),
      },
      {
        label: "Cut-off",
        value: formatDateTime(context.payment.executionWindow.cutOff),
      },
      context.highSeveritySignal
        ? { label: "Escalation", value: "Required", tone: "danger" }
        : undefined,
    ]),
  };
  return [ingestionStage, triadStage, approvalsStage, paymentStage];
}
function computeOutstandingActions(context: {
  triadResult: TriadMatchResult;
  triadInsight: AiAssistInsight;
  pendingApprovals: ApprovalDecision[];
  varianceHold: boolean;
  receiptHold: boolean;
  highSeveritySignal: boolean;
  policy: InvoicePolicy;
  riskSignals: RiskSignal[];
  currency: string;
}): string[] {
  const actions: string[] = [];
  if (context.triadResult.status !== "matched") {
    context.triadResult.discrepancies.forEach((discrepancy) => {
      actions.push(discrepancy.message);
    });
  }
  context.pendingApprovals.forEach((approval) => {
    actions.push(`${approval.role} approval pending`);
  });
  if (context.varianceHold) {
    actions.push(
      `Variance exceeds ${formatCurrency(context.policy.varianceHoldThreshold, context.currency)}`,
    );
  }
  if (context.receiptHold) {
    actions.push(
      `Receipt coverage below ${toPercent(context.policy.receiptCoverageThreshold)}`,
    );
  }
  if (context.highSeveritySignal) {
    actions.push("Resolve high severity risk signal");
  }
  context.riskSignals.forEach((signal) => {
    if (signal.severity !== "low") {
      actions.push(signal.message);
    }
  });
  if (context.triadInsight.actions.length > 0) {
    context.triadInsight.actions.forEach((action) => actions.push(action));
  }
  return Array.from(new Set(actions));
}
function buildAuditTrail(context: {
  input: InvoiceWorkflowInput;
  approvals: ApprovalDecision[];
  triadResult: TriadMatchResult;
  triadInsight: AiAssistInsight;
  payment: PaymentRun;
  highSeveritySignal: boolean;
}): AuditEvent[] {
  const events: AuditEvent[] = [];
  const invoiceId = context.input.triad.invoice.id;
  const ingestCompleted =
    context.input.ingest.completedAt ?? context.input.ingest.capturedAt;
  events.push({
    id: `${invoiceId}-ingest`,
    stage: "ingest",
    at: context.input.ingest.capturedAt,
    actor: context.input.ingest.operator ?? "Echo ingest service",
    event: `Invoice ingested via ${context.input.ingest.channel.toUpperCase()} channel`,
    status: "recorded",
    details: `${context.input.ingest.attachments} attachment${context.input.ingest.attachments === 1 ? "" : "s"} captured with OCR confidence ${toPercent(resolveOcrConfidence(context.input))}.`,
  });
  events.push({
    id: `${invoiceId}-triad`,
    stage: "triad",
    at: advanceTimestamp(ingestCompleted, 2),
    actor: "Triad engine",
    event: context.triadInsight.headline,
    status:
      context.triadResult.status === "exception"
        ? "alert"
        : context.triadResult.status === "matched"
          ? "recorded"
          : "pending",
    details: context.triadInsight.narrative,
    metadata: {
      discrepancies: context.triadResult.discrepancies,
      variance: context.triadResult.totalVariance,
    },
  });
  context.approvals.forEach((approval, index) => {
    events.push({
      id: `${invoiceId}-approval-${index}`,
      stage: "approvals",
      at: approval.decidedAt ?? advanceTimestamp(ingestCompleted, 5 + index),
      actor: approval.actor ?? approval.role,
      event:
        approval.status === "approved"
          ? `${approval.role} approved payment`
          : approval.status === "rejected"
            ? `${approval.role} rejected release`
            : `${approval.role} pending approval`,
      status:
        approval.status === "approved"
          ? "recorded"
          : approval.status === "rejected"
            ? "alert"
            : "pending",
      details: approval.notes,
    });
  });
  events.push({
    id: `${invoiceId}-payment`,
    stage: "payment",
    at: context.payment.scheduledFor,
    actor:
      context.payment.releaseChannel === "auto" ? "EchoSentinel" : "Treasury",
    event:
      context.payment.status === "released"
        ? `Payment released via ${context.payment.method.toUpperCase()}`
        : `Payment scheduled via ${context.payment.method.toUpperCase()}`,
    status:
      context.payment.status === "released"
        ? "recorded"
        : context.payment.status === "blocked"
          ? "alert"
          : "pending",
    details: `Queue reference ${context.payment.queueReference}. Amount ${formatCurrency(context.payment.amount, context.payment.currency)}.`,
  });
  if (context.highSeveritySignal) {
    const highSignal = (context.input.riskSignals ?? []).find(
      (signal) => signal.severity === "high",
    );
    if (highSignal) {
      events.push({
        id: `${invoiceId}-risk-${highSignal.id}`,
        stage: "risk",
        at: highSignal.detectedAt,
        actor: highSignal.source,
        event: highSignal.message,
        status: "alert",
        details: `Severity ${highSignal.severity.toUpperCase()} · Type ${highSignal.type}`,
      });
    }
  }
  return events.sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
}
function computeRiskScore(context: {
  triadResult: TriadMatchResult;
  receiptCoverage: number;
  approvalsRequired: number;
  approvalsCompleted: number;
  riskSignals: RiskSignal[];
}): number {
  const varianceRatio = Math.min(
    Math.abs(context.triadResult.totalVariance) /
      Math.max(context.triadResult.invoiceTotal, 1),
    1,
  );
  const pendingApprovalRatio =
    context.approvalsRequired === 0
      ? 0
      : (context.approvalsRequired - context.approvalsCompleted) /
        context.approvalsRequired;
  const coveragePenalty = 1 - context.receiptCoverage;
  const severityWeights: Record<RiskSeverity, number> = {
    low: 0.25,
    medium: 0.6,
    high: 1,
  };
  const signalScore = Math.min(
    context.riskSignals.reduce(
      (sum, signal) => sum + severityWeights[signal.severity],
      0,
    ) / 3,
    1,
  );
  const base =
    varianceRatio * 40 +
    pendingApprovalRatio * 25 +
    coveragePenalty * 20 +
    signalScore * 15;
  const exceptionBonus = context.triadResult.status === "exception" ? 10 : 0;
  return Math.round(Math.min(100, base + exceptionBonus));
}
function compactMetrics(
  metrics: Array<WorkflowStageMetric | undefined>,
): WorkflowStageMetric[] {
  return metrics.filter((metric): metric is WorkflowStageMetric =>
    Boolean(metric),
  );
}
function humanizeStatus(status: TriadMatchResult["status"]): string {
  switch (status) {
    case "matched":
      return "Matched";
    case "matched_with_variance":
      return "Variance";
    default:
      return "Exception";
  }
}
function capitalize(value: string): string {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function toPercent(value: number): string {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
}
function formatCurrency(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
}
function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function advanceTimestamp(timestamp: string, minutes: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
