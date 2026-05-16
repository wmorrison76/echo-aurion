import { AlertTriangle, CheckCircle2, Clock3, Zap } from "lucide-react";
import type { ReactNode } from "react";
import type { AuthenticatedProfile } from "@shared/profile";
import type { ControlStatus } from "@shared/compliance";
const STATUS_BADGES: Record<
  ControlStatus,
  { label: string; className: string }
> = {
  passing: {
    label: "Passing",
    className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  },
  attention: {
    label: "Attention",
    className: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  },
  failing: {
    label: "Failing",
    className: "border-red-500/40 bg-red-500/10 text-red-200",
  },
};
interface ProfileWorkflowSectionProps {
  automationRuns: AuthenticatedProfile["automationRuns"];
  compliance: AuthenticatedProfile["compliance"];
}
export function ProfileWorkflowSection({
  automationRuns,
  compliance,
}: ProfileWorkflowSectionProps) {
  const scheduleMap = new Map(
    compliance.schedule.map((item) => [item.controlId, item]),
  );
  const breachMap = new Map(
    compliance.breaches.map((item) => [item.controlId, item]),
  );
  const automationQueueMap = new Map(
    compliance.automationQueue.map((item) => [item.controlId, item]),
  );
  return (
    <section className="rounded-3xl border border-border/40 bg-surface/90 p-8 shadow-[0_35px_90px_-45px_rgba(8,12,22,0.65)]">
      {" "}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            Automation workflows
          </p>{" "}
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            Zapier orchestration status
          </h2>{" "}
          <p className="mt-3 text-sm text-muted-foreground">
            {" "}
            Every automation run links to a control in the SOC/PCI library.
            Failing or paused automations surface remediation context and the
            next evidence deadline.{" "}
          </p>{" "}
          <ul className="mt-6 space-y-4 text-sm text-muted-foreground">
            {" "}
            {automationRuns.map((automation) => {
              const controlBreach = breachMap.get(automation.controlId);
              const controlStatus: ControlStatus =
                controlBreach?.status ?? "passing";
              const statusBadge = STATUS_BADGES[controlStatus];
              const schedule = scheduleMap.get(automation.controlId);
              const queueDetails = automationQueueMap.get(automation.controlId);
              return (
                <li
                  key={automation.id}
                  className="rounded-2xl border border-border/40 bg-surface-variant/60 p-5"
                >
                  {" "}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {" "}
                    <div>
                      {" "}
                      <p className="text-sm font-semibold text-foreground">
                        {automation.title}
                      </p>{" "}
                      <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground/70">
                        {" "}
                        {automation.zapierWorkflowId} ·{" "}
                        {automation.targetApp}{" "}
                      </p>{" "}
                    </div>{" "}
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.24em] ${statusBadge.className}`}
                    >
                      {" "}
                      {statusBadge.label}{" "}
                    </span>{" "}
                  </div>{" "}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {" "}
                    <AutomationMeta
                      icon={<Zap className="h-4 w-4 text-aurum-200" />}
                      label="Run status"
                      value={formatAutomationStatus(
                        automation.status,
                        automation.outcome,
                      )}
                    />{" "}
                    <AutomationMeta
                      icon={<Clock3 className="h-4 w-4 text-aurum-200" />}
                      label="Next evidence"
                      value={formatDate(schedule?.nextDueAt)}
                    />{" "}
                  </div>{" "}
                  {queueDetails ? (
                    <p className="mt-3 text-xs text-muted-foreground/70">
                      {" "}
                      Workflow action: {queueDetails.action}{" "}
                    </p>
                  ) : null}{" "}
                  {controlBreach ? (
                    <div className="mt-4 rounded-xl border border-border/40 bg-surface/70 p-4 text-xs text-muted-foreground">
                      {" "}
                      <p className="flex items-center gap-2 font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                        {" "}
                        <AlertTriangle className="h-4 w-4 text-red-300" />{" "}
                        {controlBreach.title}{" "}
                      </p>{" "}
                      <p className="mt-2 text-muted-foreground/80">
                        {controlBreach.variance}
                      </p>{" "}
                      <ul className="mt-2 space-y-1 text-muted-foreground/70">
                        {" "}
                        {controlBreach.recommendedActions
                          .slice(0, 2)
                          .map((action) => (
                            <li key={action}>• {action}</li>
                          ))}{" "}
                      </ul>{" "}
                    </div>
                  ) : (
                    <p className="mt-4 flex items-center gap-2 text-xs text-emerald-200">
                      {" "}
                      <CheckCircle2 className="h-4 w-4" /> Control passing.
                      Evidence captured {formatDate(schedule?.nextDueAt)}.{" "}
                    </p>
                  )}{" "}
                </li>
              );
            })}{" "}
          </ul>{" "}
        </div>{" "}
        <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Upcoming evidence
          </p>{" "}
          <ul className="mt-4 space-y-3 text-xs text-muted-foreground">
            {" "}
            {compliance.schedule.slice(0, 6).map((item) => (
              <li
                key={item.controlId}
                className="rounded-lg border border-border/40 bg-surface/70 p-4"
              >
                {" "}
                <p className="text-sm font-semibold text-foreground">
                  {item.title}
                </p>{" "}
                <p className="mt-1 uppercase tracking-[0.24em] text-muted-foreground/70">
                  {" "}
                  {item.framework} · Owner {item.owner}{" "}
                </p>{" "}
                <p className="mt-2 text-muted-foreground/70">
                  Due {formatDate(item.nextDueAt)}
                </p>{" "}
                <p className="mt-2 truncate text-muted-foreground/50">
                  Evidence: {item.evidenceUri}
                </p>{" "}
              </li>
            ))}{" "}
          </ul>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
function AutomationMeta({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/70 p-4 text-xs uppercase tracking-[0.24em] text-muted-foreground">
      {" "}
      <span className="flex items-center gap-2 text-muted-foreground">
        {" "}
        {icon} {label}{" "}
      </span>{" "}
      <p className="mt-2 text-sm normal-case text-foreground">{value}</p>{" "}
    </div>
  );
}
function formatDate(value?: string) {
  if (!value) {
    return "n/a";
  }
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
}
function formatAutomationStatus(
  status: AuthenticatedProfile["automationRuns"][number]["status"],
  outcome: AuthenticatedProfile["automationRuns"][number]["outcome"],
) {
  const statusLabel = {
    running: "Running",
    scheduled: "Scheduled",
    paused: "Paused",
  }[status];
  const outcomeLabel = {
    success: "healthy",
    warning: "warning",
    error: "error",
  }[outcome];
  return `${statusLabel} · ${outcomeLabel}`;
}
