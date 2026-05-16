import React, { useMemo } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Brain,
  ChartSpline,
  Loader2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVarianceInsights } from "../hooks/useVarianceInsights";
const DRIVER_LABELS: Record<VarianceDriverType, string> = {
  rate: "Rate",
  volume: "Volume",
  mix: "Mix",
  timing: "Timing",
  staffing: "Staffing",
};
export default function VarianceInsightsPanel() {
  const { status, data, message } = useVarianceInsights();
  const topDrivers = useMemo(() => {
    if (!data) {
      return [] as { type: VarianceDriverType; amount: number }[];
    }
    return Object.entries(data.summary.driverTotals)
      .map(([type, amount]) => ({ type: type as VarianceDriverType, amount }))
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
      .slice(0, 3);
  }, [data]);
  const topRootCauses = useMemo(
    () => data?.rootCauses.slice(0, 4) ?? [],
    [data],
  );
  const staffingSignals = useMemo(
    () => data?.staffing.slice(0, 3) ?? [],
    [data],
  );
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <div className="flex items-center justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            Ai³ variance diagnostics
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            Root-cause narratives & predictive staffing
          </h3>{" "}
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {" "}
            Echo Ai³ combines GL variances, LUCCCA staffing benchmarks, and
            occupancy trajectories to pinpoint the most material drivers and
            recommend shift adjustments.{" "}
          </p>{" "}
        </div>{" "}
        {status === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-aurum-300" />
        ) : (
          <Brain className="h-6 w-6 text-aurum-300" />
        )}{" "}
      </div>{" "}
      {status === "error" && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {" "}
          <AlertTriangle className="mt-1 h-4 w-4 text-red-300" />{" "}
          <div>
            {" "}
            <p className="font-semibold">
              Unable to load variance insights
            </p>{" "}
            <p className="mt-1 text-xs text-red-200/80">{message}</p>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {status === "unauthenticated" && (
        <SessionRequiredNotice
          description={
            message ??
            "Authenticate with an auditor persona to analyze variance narratives."
          }
        />
      )}{" "}
      {status === "ready" && data && (
        <div className="mt-6 space-y-6">
          {" "}
          <div className="grid gap-4 sm:grid-cols-3">
            {" "}
            <SummaryCard
              title="Net variance"
              value={formatCurrency(data.summary.totalVariance)}
              description={`${data.summary.propertiesImpacted} properties • ${data.summary.departmentsImpacted} departments`}
              icon={<ChartSpline className="h-5 w-5 text-aurum-200" />}
            />{" "}
            <SummaryCard
              title="Favorable"
              value={formatCurrency(Math.abs(data.summary.negativeVariance))}
              description="Budget cushion available for redeployment"
              icon={<ArrowUpRight className="h-5 w-5 text-emerald-200" />}
            />{" "}
            <SummaryCard
              title="Top drivers"
              value={
                topDrivers
                  .map((driver) => DRIVER_LABELS[driver.type])
                  .join(" •") || "n/a"
              }
              description={`GL focus: ${topRootCauses[0]?.glCode ?? "--"}`}
              icon={<Users className="h-5 w-5 text-sky-200" />}
            />{" "}
          </div>{" "}
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            {" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Variance narratives
              </p>{" "}
              <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
                {" "}
                {topRootCauses.map((cause) => (
                  <li
                    key={`${cause.propertyId}-${cause.glCode}`}
                    className="rounded-lg border border-border/40 bg-surface-variant/60 p-4"
                  >
                    {" "}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-sm font-semibold text-foreground">
                          {" "}
                          {cause.propertyName} • {cause.department}{" "}
                        </p>{" "}
                        <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
                          {" "}
                          GL {cause.glCode} · {cause.accountName}{" "}
                        </p>{" "}
                      </div>{" "}
                      <SeverityBadge
                        severity={cause.severity}
                        amount={cause.variance}
                      />{" "}
                    </div>{" "}
                    <p className="mt-3 text-xs text-muted-foreground/80">
                      {cause.narrative}
                    </p>{" "}
                    <ul className="mt-3 space-y-2 text-xs text-muted-foreground/70">
                      {" "}
                      {cause.recommendedActions.map((action) => (
                        <li key={action}>• {action}</li>
                      ))}{" "}
                    </ul>{" "}
                  </li>
                ))}{" "}
              </ul>{" "}
            </div>{" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                Predictive staffing
              </p>{" "}
              <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
                {" "}
                {staffingSignals.map((signal) => (
                  <li
                    key={`${signal.propertyId}-${signal.department}`}
                    className="rounded-lg border border-border/40 bg-surface-variant/60 p-4"
                  >
                    {" "}
                    <div className="flex items-center justify-between gap-3">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-sm font-semibold text-foreground">
                          {" "}
                          {signal.propertyName} • {signal.department}{" "}
                        </p>{" "}
                        <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
                          {" "}
                          GL {signal.glCode} · {signal.accountName}{" "}
                        </p>{" "}
                      </div>{" "}
                      <ShiftBadge
                        shift={signal.shift}
                        deltaHours={signal.deltaHours}
                        confidence={signal.confidence}
                      />{" "}
                    </div>{" "}
                    <p className="mt-3 text-xs text-muted-foreground/80">
                      {signal.rationale}
                    </p>{" "}
                  </li>
                ))}{" "}
              </ul>{" "}
            </div>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
interface SummaryCardProps {
  title: string;
  value: string;
  description?: string;
  icon: React.ReactNode;
}
function SummaryCard({ title, value, description, icon }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <div className="flex items-center gap-3 text-muted-foreground">
        {" "}
        {icon}{" "}
        <p className="text-xs font-semibold uppercase tracking-[0.25em]">
          {title}
        </p>{" "}
      </div>{" "}
      <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>{" "}
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground/80">{description}</p>
      ) : null}{" "}
    </div>
  );
}
function SeverityBadge({
  severity,
  amount,
}: {
  severity: "low" | "medium" | "high";
  amount: number;
}) {
  const palette = {
    low: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    medium: "border-amber-400/40 bg-amber-500/10 text-amber-200",
    high: "border-red-500/40 bg-red-500/10 text-red-200",
  }[severity];
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em]",
        palette,
      )}
    >
      {" "}
      {severity} · {formatCurrency(amount)}{" "}
    </span>
  );
}
function ShiftBadge({
  shift,
  deltaHours,
  confidence,
}: {
  shift: "add" | "cut" | "hold";
  deltaHours: number;
  confidence: number;
}) {
  const palette = {
    add: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
    cut: "border-red-500/40 bg-red-500/10 text-red-200",
    hold: "border-sky-400/40 bg-sky-500/10 text-sky-200",
  }[shift];
  const label =
    shift === "add" ? "+ Hours" : shift === "cut" ? "- Hours" : "Hold";
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em]",
        palette,
      )}
    >
      {" "}
      {label} · {Math.abs(deltaHours).toFixed(1)}h ·{" "}
      {(confidence * 100).toFixed(0)}%{" "}
    </span>
  );
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value);
}
