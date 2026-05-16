import type { AuthenticatedProfile } from "@shared/profile";
const FRAMEWORK_LABELS = {
  SOC2: "SOC 2",
  PCI: "PCI DSS",
  GDPR: "GDPR",
} as const;
interface ProfileMetricsSectionProps {
  metrics: AuthenticatedProfile["metrics"];
  compliance: AuthenticatedProfile["compliance"];
}
export function ProfileMetricsSection({
  metrics,
  compliance,
}: ProfileMetricsSectionProps) {
  const frameworkEntries = Object.entries(compliance.summary.frameworks);
  const metricCards = [
    {
      label: "Compliance coverage",
      value: `${metrics.complianceCoveragePercent}%`,
      context: `${metrics.totalControls} controls mapped`,
    },
    {
      label: "Controls failing",
      value: metrics.failingControls,
      context: `${metrics.attentionControls} controls attention`,
    },
    {
      label: "Automations running",
      value: metrics.activeAutomations,
      context: `${metrics.healthyConnectors} healthy connectors`,
    },
    {
      label: "Active sessions",
      value: metrics.activeSessions,
      context: "Phoenix guardrails applied",
    },
  ];
  return (
    <section className="rounded-3xl border border-border/40 bg-surface/90 p-8 shadow-[0_35px_90px_-45px_rgba(8,12,22,0.65)]">
      {" "}
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1.2fr_0.8fr]">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            Control health
          </p>{" "}
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            Compliance telemetry overview
          </h2>{" "}
          <p className="mt-3 text-sm text-muted-foreground">
            {" "}
            Zapier, Supabase, and Argus feeds keep coverage above target.
            Failing controls trigger real-time remediation workflows and
            guardrail escalations.{" "}
          </p>{" "}
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {" "}
            {metricCards.map((card) => (
              <MetricCard
                key={card.label}
                label={card.label}
                value={card.value}
                context={card.context}
              />
            ))}{" "}
          </div>{" "}
        </div>{" "}
        <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            Framework coverage
          </p>{" "}
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            {" "}
            {frameworkEntries.map(([framework, summary]) => (
              <li
                key={framework}
                className="rounded-xl border border-border/40 bg-surface/70 p-4"
              >
                {" "}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {" "}
                  <p className="text-sm font-semibold text-foreground">
                    {
                      FRAMEWORK_LABELS[
                        framework as keyof typeof FRAMEWORK_LABELS
                      ]
                    }
                  </p>{" "}
                  <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground/70">
                    {" "}
                    Next evidence {formatDate(summary.nextDueAt)}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs uppercase tracking-[0.24em]">
                  {" "}
                  <FrameworkChip
                    tone="emerald"
                    label="Passing"
                    value={summary.passing}
                  />{" "}
                  <FrameworkChip
                    tone="amber"
                    label="Attention"
                    value={summary.attention}
                  />{" "}
                  <FrameworkChip
                    tone="red"
                    label="Failing"
                    value={summary.failing}
                  />{" "}
                </div>{" "}
              </li>
            ))}{" "}
          </ul>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
function MetricCard({
  label,
  value,
  context,
}: {
  label: string;
  value: string | number;
  context: string;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-5">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        {label}
      </p>{" "}
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>{" "}
      <p className="mt-2 text-xs text-muted-foreground/70">{context}</p>{" "}
    </div>
  );
}
function FrameworkChip({
  tone,
  label,
  value,
}: {
  tone: "emerald" | "amber" | "red";
  label: string;
  value: number;
}) {
  const palette = {
    emerald: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-400/40 bg-amber-500/10 text-amber-200",
    red: "border-red-500/40 bg-red-500/10 text-red-200",
  }[tone];
  return (
    <span
      className={`rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.24em] ${palette}`}
    >
      {" "}
      {label} {value}{" "}
    </span>
  );
}
function formatDate(value?: string) {
  if (!value) {
    return "n/a";
  }
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
