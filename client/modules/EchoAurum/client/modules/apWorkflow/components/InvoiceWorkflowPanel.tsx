import type React from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  FileText,
  Layers,
  Loader2,
  ShieldCheck,
  UserCheck,
  Workflow,
} from "lucide-react";
import type {
  ApprovalDecision,
  AuditEvent,
  InvoiceWorkflowMetrics,
  InvoiceWorkflowResult,
  RiskSignal,
  StageStatus,
  WorkflowStage,
} from "../../../shared/invoiceWorkflow";
import { Badge } from "@/components/ui/badge";
import { SessionRequiredNotice } from "@/modules/auth";
import { cn } from "@/lib/utils";
import { useInvoiceWorkflow } from "../hooks/useInvoiceWorkflow";
const stageIcons: Record<
  WorkflowStage["id"],
  React.ComponentType<{ className?: string }>
> = {
  ingest: FileText,
  triad: Workflow,
  approvals: UserCheck,
  payment: Banknote,
};
const stageStatusTone: Record<StageStatus, string> = {
  completed: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  in_progress: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  blocked: "border-red-500/40 bg-red-500/10 text-red-200",
  pending: "border-slate-400/40 bg-slate-500/10 text-slate-200",
};
const workflowStatusTone: Record<
  InvoiceWorkflowResult["summary"]["status"],
  {
    label: string;
    tone: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  ready: {
    label: "Ready for release",
    tone: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    icon: CheckCircle2,
  },
  awaiting_review: {
    label: "Awaiting review",
    tone: "border-amber-400/40 bg-amber-500/10 text-amber-200",
    icon: Layers,
  },
  blocked: {
    label: "Blocked",
    tone: "border-red-500/40 bg-red-500/10 text-red-200",
    icon: AlertTriangle,
  },
};
export default function InvoiceWorkflowPanel() {
  const { status, data, message } = useInvoiceWorkflow();
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <div className="flex items-start justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            {" "}
            Invoice workflow{" "}
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            {" "}
            Intake, triad, approvals, and payment orchestration{" "}
          </h3>{" "}
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {" "}
            Monitor how LUCCCA invoices move from ingest through triad matching,
            policy-driven approvals, and treasury release. Risk signals and
            audit evidence surface in-line for SOC/PCI readiness.{" "}
          </p>{" "}
        </div>{" "}
        {status === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-aurum-300" />
        ) : (
          <ShieldCheck className="h-6 w-6 text-aurum-300" />
        )}{" "}
      </div>{" "}
      {status === "error" ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {" "}
          <AlertTriangle className="mt-1 h-4 w-4" />{" "}
          <div>
            {" "}
            <p className="font-semibold">
              Unable to load invoice workflow
            </p>{" "}
            <p className="mt-1 text-xs text-red-200/80">{message}</p>{" "}
          </div>{" "}
        </div>
      ) : null}{" "}
      {status === "unauthenticated" ? (
        <SessionRequiredNotice
          description={
            message ??
            "Authenticate with a controller persona to orchestrate invoice intake-to-payment."
          }
        />
      ) : null}{" "}
      {status === "ready" && data ? (
        <div className="mt-6 space-y-6">
          {" "}
          <SummaryBlock summary={data.summary} metrics={data.metrics} />{" "}
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
            {" "}
            <WorkflowStages stages={data.stages} />{" "}
            <OutstandingActions
              actions={data.outstandingActions}
              riskSignals={data.riskSignals}
            />{" "}
          </div>{" "}
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            {" "}
            <ApprovalsList approvals={data.approvals} />{" "}
            <PaymentCard payment={data.payment} />{" "}
          </div>{" "}
          <AuditTrailList auditTrail={data.auditTrail} />{" "}
        </div>
      ) : null}{" "}
    </div>
  );
}
function SummaryBlock({
  summary,
  metrics,
}: {
  summary: InvoiceWorkflowResult["summary"];
  metrics: InvoiceWorkflowMetrics;
}) {
  const descriptor = workflowStatusTone[summary.status];
  const StatusIcon = descriptor.icon;
  return (
    <div className="rounded-xl border border-border/40 bg-surface/60 p-5">
      {" "}
      <div className="flex flex-wrap items-start justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/80">
            {" "}
            Invoice {summary.invoiceId} · {summary.vendor}{" "}
          </p>{" "}
          <h4 className="mt-2 text-2xl font-semibold text-foreground">
            {" "}
            {formatCurrency(summary.total, summary.currency)}{" "}
          </h4>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            {" "}
            {summary.narrative}{" "}
          </p>{" "}
        </div>{" "}
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em]",
            descriptor.tone,
          )}
        >
          {" "}
          <StatusIcon className="h-4 w-4" /> {descriptor.label}{" "}
        </span>{" "}
      </div>{" "}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {" "}
        <SummaryMetric
          label="Due date"
          value={formatDate(summary.dueDate)}
          description={`Release window ${formatDateTime(summary.releaseWindow.start)} – ${formatTime(summary.releaseWindow.end)}`}
        />{" "}
        <SummaryMetric
          label="Approvals"
          value={`${metrics.approvalsCompleted}/${metrics.approvalsRequired}`}
          description={`${metrics.discrepancyCount} discrepancy${metrics.discrepancyCount === 1 ? "" : "s"}`}
        />{" "}
        <SummaryMetric
          label="Variance"
          value={formatCurrency(
            Math.abs(metrics.varianceAmount),
            summary.currency,
          )}
          description={`Risk score ${metrics.riskScore}/100`}
        />{" "}
        <SummaryMetric
          label="OCR confidence"
          value={formatPercent(metrics.ocrConfidence)}
          description="Intake data quality"
        />{" "}
        <SummaryMetric
          label="Receipt coverage"
          value={formatPercent(metrics.receiptCoverage)}
          description="Dock confirmations"
        />{" "}
        <SummaryMetric
          label="Payment cut-off"
          value={formatTime(summary.releaseWindow.cutOff)}
          description={`Queue ${summary.queueReference}`}
        />{" "}
      </div>{" "}
    </div>
  );
}
function SummaryMetric({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-surface-variant/60 p-4">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground/70">
        {" "}
        {label}{" "}
      </p>{" "}
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>{" "}
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground/70">{description}</p>
      ) : null}{" "}
    </div>
  );
}
function WorkflowStages({ stages }: { stages: WorkflowStage[] }) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {" "}
        Workflow stages{" "}
      </p>{" "}
      <div className="mt-4 space-y-4">
        {" "}
        {stages.map((stage) => (
          <StageCard key={stage.id} stage={stage} />
        ))}{" "}
      </div>{" "}
    </div>
  );
}
function StageCard({ stage }: { stage: WorkflowStage }) {
  const Icon = stageIcons[stage.id];
  const tone = stageStatusTone[stage.status] ?? stageStatusTone.pending;
  return (
    <div className="rounded-lg border border-border/40 bg-surface-variant/60 p-4">
      {" "}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {" "}
        <div className="flex items-start gap-3">
          {" "}
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full border",
              tone,
            )}
          >
            {" "}
            <Icon className="h-4 w-4" />{" "}
          </span>{" "}
          <div>
            {" "}
            <p className="text-sm font-semibold text-foreground">
              {" "}
              {stage.label}{" "}
            </p>{" "}
            <p className="mt-1 text-xs text-muted-foreground/80">
              {" "}
              {stage.summary}{" "}
            </p>{" "}
            {stage.actions.length > 0 ? (
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground/70">
                {" "}
                {stage.actions.map((action) => (
                  <li key={action}>• {action}</li>
                ))}{" "}
              </ul>
            ) : null}{" "}
          </div>{" "}
        </div>{" "}
        <Badge
          variant="outline"
          className={cn(
            "self-start text-[0.65rem] uppercase tracking-[0.24em]",
            tone,
          )}
        >
          {" "}
          {humanizeStageStatus(stage.status)}{" "}
        </Badge>{" "}
      </div>{" "}
      {stage.metrics.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {" "}
          {stage.metrics.map((metric) => (
            <span
              key={`${stage.id}-${metric.label}`}
              className={cn(
                "rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em]",
                metricTone(metric.tone ?? "default"),
              )}
            >
              {" "}
              {metric.label}: {metric.value}{" "}
            </span>
          ))}{" "}
        </div>
      ) : null}{" "}
    </div>
  );
}
function ApprovalsList({ approvals }: { approvals: ApprovalDecision[] }) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {" "}
        Approval ladder{" "}
      </p>{" "}
      <ul className="mt-4 space-y-3">
        {" "}
        {approvals.map((approval) => (
          <li
            key={approval.id}
            className="rounded-lg border border-border/40 bg-surface-variant/60 p-4"
          >
            {" "}
            <div className="flex flex-wrap items-start justify-between gap-3">
              {" "}
              <div>
                {" "}
                <p className="text-sm font-semibold text-foreground">
                  {" "}
                  {approval.role}{" "}
                </p>{" "}
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {" "}
                  {approval.actor ?? "Pending assignment"}{" "}
                </p>{" "}
                {approval.notes ? (
                  <p className="mt-2 text-xs text-muted-foreground/70">
                    {" "}
                    {approval.notes}{" "}
                  </p>
                ) : null}{" "}
                {approval.escalation ? (
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    {" "}
                    Escalation: {approval.escalation}{" "}
                  </p>
                ) : null}{" "}
              </div>{" "}
              <Badge
                variant="outline"
                className={cn(
                  "text-[0.65rem] uppercase tracking-[0.24em]",
                  approvalTone(approval.status),
                )}
              >
                {" "}
                {humanizeApprovalStatus(approval.status)}{" "}
              </Badge>{" "}
            </div>{" "}
            {approval.decidedAt ? (
              <p className="mt-3 text-xs uppercase tracking-[0.24em] text-muted-foreground/60">
                {" "}
                {formatDateTime(approval.decidedAt)}{" "}
              </p>
            ) : null}{" "}
          </li>
        ))}{" "}
      </ul>{" "}
    </div>
  );
}
function PaymentCard({
  payment,
}: {
  payment: InvoiceWorkflowResult["payment"];
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {" "}
        Payment release{" "}
      </p>{" "}
      <div className="mt-3">
        {" "}
        <p className="text-lg font-semibold text-foreground">
          {" "}
          {formatCurrency(payment.amount, payment.currency)}{" "}
        </p>{" "}
        <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground/70">
          {" "}
          {payment.method.toUpperCase()} ·{""}{" "}
          {formatDateTime(payment.scheduledFor)}{" "}
        </p>{" "}
        <p className="mt-2 text-xs text-muted-foreground/70">
          {" "}
          Execution window {formatDateTime(payment.executionWindow.start)} –{""}{" "}
          {formatDateTime(payment.executionWindow.end)}{" "}
        </p>{" "}
        <p className="mt-1 text-xs text-muted-foreground/60">
          {" "}
          Queue reference {payment.queueReference}{" "}
        </p>{" "}
        <p className="mt-1 text-xs text-muted-foreground/60">
          {" "}
          Bank {payment.bank} · Account ••••{payment.accountLast4}{" "}
        </p>{" "}
      </div>{" "}
      {payment.releaseConditions && payment.releaseConditions.length > 0 ? (
        <div className="mt-4">
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
            {" "}
            Release conditions{" "}
          </p>{" "}
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground/70">
            {" "}
            {payment.releaseConditions.map((condition) => (
              <li key={condition}>• {condition}</li>
            ))}{" "}
          </ul>{" "}
        </div>
      ) : null}{" "}
    </div>
  );
}
function OutstandingActions({
  actions,
  riskSignals,
}: {
  actions: string[];
  riskSignals: RiskSignal[];
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {" "}
        Outstanding actions{" "}
      </p>{" "}
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {" "}
        {actions.length > 0 ? (
          actions.map((action) => <li key={action}>• {action}</li>)
        ) : (
          <li>All workflow checks satisfied.</li>
        )}{" "}
      </ul>{" "}
      {riskSignals.length > 0 ? (
        <div className="mt-5 space-y-2">
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground/70">
            {" "}
            Risk signals{" "}
          </p>{" "}
          {riskSignals.map((signal) => (
            <div
              key={signal.id}
              className="rounded-lg border border-border/40 bg-surface-variant/60 p-3 text-xs text-muted-foreground/80"
            >
              {" "}
              <div className="flex items-center justify-between gap-3">
                {" "}
                <span className="font-semibold text-foreground">
                  {" "}
                  {signal.message}{" "}
                </span>{" "}
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.24em]",
                    riskTone(signal.severity),
                  )}
                >
                  {" "}
                  {signal.severity}{" "}
                </span>{" "}
              </div>{" "}
              <p className="mt-1 text-muted-foreground/60">
                {" "}
                {signal.type} · {formatDateTime(signal.detectedAt)} ·{""}{" "}
                {signal.source}{" "}
              </p>{" "}
            </div>
          ))}{" "}
        </div>
      ) : null}{" "}
    </div>
  );
}
function AuditTrailList({ auditTrail }: { auditTrail: AuditEvent[] }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-surface/60 p-5">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {" "}
        Audit trail{" "}
      </p>{" "}
      <div className="mt-4 space-y-3">
        {" "}
        {auditTrail.map((event) => (
          <div
            key={event.id}
            className="relative rounded-lg border border-border/40 bg-surface-variant/60 p-4"
          >
            {" "}
            <span
              className={cn(
                "absolute left-4 top-4 h-2 w-2 -translate-x-1/2 rounded-full",
                auditTone(event.status),
              )}
            />{" "}
            <div className="pl-4">
              {" "}
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground/70">
                {" "}
                {formatDateTime(event.at)}{" "}
              </p>{" "}
              <p className="mt-1 text-sm font-semibold text-foreground">
                {" "}
                {event.event}{" "}
              </p>{" "}
              <p className="mt-1 text-xs text-muted-foreground/70">
                {" "}
                Actor: {event.actor}{" "}
              </p>{" "}
              {event.details ? (
                <p className="mt-2 text-xs text-muted-foreground/60">
                  {" "}
                  {event.details}{" "}
                </p>
              ) : null}{" "}
            </div>{" "}
          </div>
        ))}{" "}
      </div>{" "}
    </div>
  );
}
function humanizeStageStatus(status: StageStatus): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "blocked":
      return "Blocked";
    case "in_progress":
      return "In progress";
    default:
      return "Pending";
  }
}
function humanizeApprovalStatus(status: ApprovalDecision["status"]): string {
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "delegated":
      return "Delegated";
    default:
      return "Pending";
  }
}
function metricTone(
  tone: "default" | "positive" | "warning" | "danger",
): string {
  switch (tone) {
    case "positive":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
    case "warning":
      return "border-amber-400/40 bg-amber-500/10 text-amber-200";
    case "danger":
      return "border-red-500/40 bg-red-500/10 text-red-200";
    default:
      return "border-slate-400/40 bg-slate-500/10 text-slate-200";
  }
}
function approvalTone(status: ApprovalDecision["status"]): string {
  switch (status) {
    case "approved":
      return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
    case "rejected":
      return "border-red-500/40 bg-red-500/10 text-red-200";
    case "delegated":
      return "border-sky-400/40 bg-sky-500/10 text-sky-200";
    default:
      return "border-amber-400/40 bg-amber-500/10 text-amber-200";
  }
}
function riskTone(severity: RiskSignal["severity"]): string {
  switch (severity) {
    case "high":
      return "border-red-500/40 bg-red-500/10 text-red-200";
    case "medium":
      return "border-amber-400/40 bg-amber-500/10 text-amber-200";
    default:
      return "border-slate-400/40 bg-slate-500/10 text-slate-200";
  }
}
function auditTone(status: AuditEvent["status"]): string {
  switch (status) {
    case "recorded":
      return "bg-emerald-400";
    case "alert":
      return "bg-red-400";
    default:
      return "bg-amber-400";
  }
}
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
