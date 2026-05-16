import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock4,
  ExternalLink,
  ShieldAlert,
  Workflow,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import type {
  ComplianceAutomationPlan,
  ControlAutomationWorkflow,
  EnrichedComplianceIncident,
  ZapierWorkflowMapping,
} from "../../../../shared/complianceAutomation";
import { SessionRequiredNotice } from "@/modules/auth";
import { cn } from "@/lib/utils";
import { useComplianceAutomationPlan } from "../hooks/useComplianceAutomationPlan";
export default function ComplianceAutomationPanel() {
  const { status, data, message } = useComplianceAutomationPlan();
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <header className="flex flex-wrap items-start justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            {" "}
            Automation Runbooks{" "}
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            {" "}
            Zapier-driven evidence workflows{" "}
          </h3>{" "}
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {" "}
            SOC 2 and PCI controls stream into Zapier playbooks with Argus
            telemetry, alerting compliance teams when evidence deadlines or
            breaches occur.{" "}
          </p>{" "}
        </div>{" "}
        {status === "loading" ? (
          <Clock4 className="h-5 w-5 animate-spin text-aurum-300" />
        ) : (
          <Workflow className="h-5 w-5 text-aurum-300" />
        )}{" "}
      </header>{" "}
      {status === "error" ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {" "}
          <AlertTriangle className="mt-0.5 h-4 w-4" />{" "}
          <div>
            {" "}
            <p className="font-semibold">
              {" "}
              Unable to load compliance automations{" "}
            </p>{" "}
            <p className="mt-1 text-xs text-red-200/80">{message}</p>{" "}
          </div>{" "}
        </div>
      ) : null}{" "}
      {status === "unauthenticated" ? (
        <SessionRequiredNotice
          description={
            message ??
            "Authenticate with a controller persona to orchestrate compliance automations."
          }
        />
      ) : null}{" "}
      {status === "ready" && data ? (
        <AutomationContent plan={data} />
      ) : null}{" "}
    </div>
  );
}
function AutomationContent({ plan }: { plan: ComplianceAutomationPlan }) {
  return (
    <div className="mt-6 space-y-6">
      {" "}
      <SummaryGrid plan={plan} />{" "}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        {" "}
        <WorkflowList workflows={plan.workflows.slice(0, 4)} />{" "}
        <ZapierCatalog catalog={plan.zapierCatalog.slice(0, 4)} />{" "}
      </div>{" "}
      <IncidentList
        incidents={plan.incidents.slice(0, 4)}
        recommendations={plan.recommendations}
      />{" "}
    </div>
  );
}
function SummaryGrid({ plan }: { plan: ComplianceAutomationPlan }) {
  const { summary } = plan;
  const monitorCount = summary.automationHealth.monitor;
  const criticalCount = summary.automationHealth.critical;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {" "}
      <SummaryCard
        title="Workflows orchestrated"
        value={summary.totalWorkflows}
        description={`${summary.activeZapierWorkflows} Zapier integrations active`}
        icon={<Zap className="h-5 w-5 text-aurum-300" />}
      />{" "}
      <SummaryCard
        title="Automation health"
        value={`${summary.automationHealth.excellent} excellent`}
        description={`${monitorCount} monitor · ${criticalCount} critical`}
        icon={<Activity className="h-5 w-5 text-emerald-300" />}
      />{" "}
      <SummaryCard
        title="Avg completion"
        value={`${summary.averageCompletionMinutes} mins`}
        description={`Generated ${formatRelative(summary.generatedAt)}`}
        icon={<Clock4 className="h-5 w-5 text-sky-300" />}
      />{" "}
    </div>
  );
}
function SummaryCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: ReactNode;
  description?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <div className="flex items-center gap-3 text-muted-foreground">
        {" "}
        {icon}{" "}
        <p className="text-xs font-semibold uppercase tracking-[0.25em]">
          {" "}
          {title}{" "}
        </p>{" "}
      </div>{" "}
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>{" "}
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground/80">{description}</p>
      ) : null}{" "}
    </div>
  );
}
function WorkflowList({
  workflows,
}: {
  workflows: ControlAutomationWorkflow[];
}) {
  return (
    <section className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <div className="flex items-center justify-between gap-3">
        {" "}
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {" "}
          Control workflows{" "}
        </p>{" "}
        <ShieldAlert className="h-4 w-4 text-aurum-300" />{" "}
      </div>{" "}
      <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
        {" "}
        {workflows.map((workflow) => (
          <li
            key={workflow.controlId}
            className="rounded-lg border border-border/40 bg-surface-variant/60 p-4"
          >
            {" "}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {" "}
              <div>
                {" "}
                <p className="text-sm font-semibold text-foreground">
                  {" "}
                  {workflow.title}{" "}
                </p>{" "}
                <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
                  {" "}
                  {workflow.framework} · Owner {workflow.owner}{" "}
                </p>{" "}
              </div>{" "}
              <HealthPill
                health={workflow.automationHealth}
                status={workflow.status}
              />{" "}
            </div>{" "}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {" "}
              {workflow.triggers.map((trigger) => (
                <div
                  key={`${workflow.controlId}-${trigger.event}-${trigger.condition}`}
                  className="rounded-lg border border-border/30 bg-surface/70 p-3"
                >
                  {" "}
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                    {" "}
                    {trigger.event.replace("_", "")}{" "}
                  </p>{" "}
                  <p className="mt-1 text-xs text-muted-foreground/80">
                    {" "}
                    {trigger.condition}{" "}
                  </p>{" "}
                </div>
              ))}{" "}
            </div>{" "}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {" "}
              {workflow.actions.map((action) => (
                <span
                  key={`${workflow.controlId}-${action.type}-${action.destination}`}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-medium uppercase tracking-[0.25em]",
                    action.type === "zapier"
                      ? "border-aurum-300/50 bg-aurum-500/10 text-aurum-100"
                      : action.type === "ticket"
                        ? "border-red-500/40 bg-red-500/10 text-red-200"
                        : "border-border/40 bg-surface/80 text-muted-foreground",
                  )}
                >
                  {" "}
                  {action.type === "zapier" ? (
                    <Bot className="h-3.5 w-3.5" />
                  ) : action.type === "ticket" ? (
                    <ShieldAlert className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}{" "}
                  {action.type}{" "}
                </span>
              ))}{" "}
            </div>{" "}
          </li>
        ))}{" "}
        {workflows.length === 0 ? (
          <li className="rounded-lg border border-border/40 bg-surface-variant/60 p-4 text-xs text-muted-foreground/80">
            {" "}
            All workflows nominal.{" "}
          </li>
        ) : null}{" "}
      </ul>{" "}
    </section>
  );
}
function ZapierCatalog({ catalog }: { catalog: ZapierWorkflowMapping[] }) {
  return (
    <section className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <div className="flex items-center justify-between gap-3">
        {" "}
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {" "}
          Zapier integrations{" "}
        </p>{" "}
        <Zap className="h-4 w-4 text-aurum-300" />{" "}
      </div>{" "}
      <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
        {" "}
        {catalog.map((workflow) => (
          <li
            key={workflow.workflowId}
            className="rounded-lg border border-border/40 bg-surface-variant/60 p-4"
          >
            {" "}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {" "}
              <div>
                {" "}
                <p className="text-sm font-semibold text-foreground">
                  {" "}
                  {workflow.name}{" "}
                </p>{" "}
                <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
                  {" "}
                  {workflow.connectedApps.join(" •")}{" "}
                </p>{" "}
              </div>{" "}
              <StatusBadge status={workflow.status} />{" "}
            </div>{" "}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground/80">
              {" "}
              <span>Latency {workflow.avgLatencySeconds ?? 0}s</span>{" "}
              <span>Failures 24h {workflow.failuresPast24h}</span>{" "}
              {workflow.lastRunAt ? (
                <span>Last run {formatRelative(workflow.lastRunAt)}</span>
              ) : null}{" "}
            </div>{" "}
            {workflow.url ? (
              <a
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-aurum-200 hover:text-aurum-100"
                href={workflow.url}
                target="_blank"
                rel="noreferrer"
              >
                {" "}
                Open in Zapier <ExternalLink className="h-3.5 w-3.5" />{" "}
              </a>
            ) : null}{" "}
          </li>
        ))}{" "}
        {catalog.length === 0 ? (
          <li className="rounded-lg border border-border/40 bg-surface-variant/60 p-4 text-xs text-muted-foreground/80">
            {" "}
            No Zapier workflows mapped.{" "}
          </li>
        ) : null}{" "}
      </ul>{" "}
    </section>
  );
}
function IncidentList({
  incidents,
  recommendations,
}: {
  incidents: EnrichedComplianceIncident[];
  recommendations: string[];
}) {
  return (
    <section className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {" "}
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {" "}
          Incidents & recommendations{" "}
        </p>{" "}
        <AlertTriangle className="h-4 w-4 text-aurum-300" />{" "}
      </div>{" "}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {" "}
        <ul className="space-y-3 text-sm text-muted-foreground">
          {" "}
          {incidents.map((incident) => (
            <li
              key={`${incident.controlId}-${incident.detectedAt}`}
              className="rounded-lg border border-border/40 bg-surface-variant/60 p-4"
            >
              {" "}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {" "}
                <div>
                  {" "}
                  <p className="text-sm font-semibold text-foreground">
                    {" "}
                    {incident.controlTitle}{" "}
                  </p>{" "}
                  <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
                    {" "}
                    {incident.framework} · Detected{""}{" "}
                    {formatRelative(incident.detectedAt)}{" "}
                  </p>{" "}
                </div>{" "}
                <StatusBadge
                  status={
                    incident.severity === "critical" ? "degraded" : "healthy"
                  }
                  label={incident.severity}
                />{" "}
              </div>{" "}
              <p className="mt-2 text-xs text-muted-foreground/80">
                {" "}
                {incident.summary}{" "}
              </p>{" "}
              {incident.remediationDeadline ? (
                <p className="mt-2 text-xs text-muted-foreground/70">
                  {" "}
                  Deadline {formatRelative(incident.remediationDeadline)}{" "}
                </p>
              ) : null}{" "}
            </li>
          ))}{" "}
          {incidents.length === 0 ? (
            <li className="rounded-lg border border-border/40 bg-surface-variant/60 p-4 text-xs text-muted-foreground/80">
              {" "}
              No incidents logged.{" "}
            </li>
          ) : null}{" "}
        </ul>{" "}
        <div className="rounded-lg border border-border/40 bg-surface-variant/60 p-4 text-xs text-muted-foreground">
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-foreground">
            {" "}
            Recommended actions{" "}
          </p>{" "}
          <ul className="mt-3 space-y-2">
            {" "}
            {recommendations.map((item) => (
              <li key={item} className="flex items-start gap-2">
                {" "}
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-aurum-300" />{" "}
                <span>{item}</span>{" "}
              </li>
            ))}{" "}
          </ul>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
function HealthPill({
  health,
  status,
}: {
  health: ControlAutomationWorkflow["automationHealth"];
  status: ControlAutomationWorkflow["status"];
}) {
  const palette = {
    excellent: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    monitor: "border-amber-400/40 bg-amber-500/10 text-amber-200",
    critical: "border-red-500/40 bg-red-500/10 text-red-200",
  }[health];
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em]",
        palette,
      )}
    >
      {" "}
      {health} · {status}{" "}
    </span>
  );
}
function StatusBadge({
  status,
  label,
}: {
  status: "healthy" | "degraded";
  label?: string;
}) {
  const palette =
    status === "healthy"
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
      : "border-red-500/40 bg-red-500/10 text-red-200";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em]",
        palette,
      )}
    >
      {" "}
      {label ?? status}{" "}
    </span>
  );
}
function formatRelative(value: string) {
  const date = new Date(value);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}
