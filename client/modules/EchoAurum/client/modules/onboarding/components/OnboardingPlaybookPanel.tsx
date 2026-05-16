import React, { useMemo } from "react";
import {
  AlertTriangle,
  BarChart3,
  Loader2,
  MapPinned,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnboardingPlaybook } from "../hooks/useOnboardingPlaybook";
export default function OnboardingPlaybookPanel() {
  const { status, data, message } = useOnboardingPlaybook();
  const timeline = useMemo(() => data?.phases ?? [], [data]);
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <div className="flex items-center justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            Customer onboarding
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            Phased playbooks with ROI benchmarking
          </h3>{" "}
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {" "}
            Guided rollout sequences align LUCCCA control frameworks with
            tangible ROI lift, GL code impacts, and Zapier automations so every
            property lands value in under 30 days.{" "}
          </p>{" "}
        </div>{" "}
        {status === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-aurum-300" />
        ) : (
          <Rocket className="h-6 w-6 text-aurum-300" />
        )}{" "}
      </div>{" "}
      {status === "error" && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {" "}
          <AlertTriangle className="mt-1 h-4 w-4 text-red-300" />{" "}
          <div>
            {" "}
            <p className="font-semibold">
              Unable to load onboarding playbook
            </p>{" "}
            <p className="mt-1 text-xs text-red-200/80">{message}</p>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {status === "unauthenticated" && (
        <SessionRequiredNotice
          description={
            message ??
            "Authenticate with a controller persona to review onboarding playbooks."
          }
        />
      )}{" "}
      {status === "ready" && data && (
        <div className="mt-6 space-y-6">
          {" "}
          <div className="grid gap-4 sm:grid-cols-3">
            {" "}
            <SummaryCard
              icon={<Rocket className="h-5 w-5 text-aurum-200" />}
              title="Total duration"
              value={`${data.totalDuration} days`}
              description="From kick-off to ROI dashboards"
            />{" "}
            <SummaryCard
              icon={<BarChart3 className="h-5 w-5 text-emerald-200" />}
              title="ROI lift"
              value={`${data.overallLiftPercent.toFixed(1)}%`}
              description="Baseline to Phase 3 cumulative"
            />{" "}
            <SummaryCard
              icon={<MapPinned className="h-5 w-5 text-sky-200" />}
              title="Avg. payback"
              value={`${data.averagePayback.toFixed(1)} days`}
              description="Per phase to breakeven"
            />{" "}
          </div>{" "}
          <div className="space-y-4">
            {" "}
            {timeline.map((phase) => (
              <div
                key={phase.id}
                className="rounded-xl border border-border/40 bg-surface/60 p-4"
              >
                {" "}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-sm font-semibold text-foreground">
                      {phase.name}
                    </p>{" "}
                    <p className="mt-1 text-xs uppercase tracking-[0.25em] text-muted-foreground/70">
                      {" "}
                      GL {phase.glCodes.join(",")} · {phase.metricLabel}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-muted-foreground">
                    {" "}
                    <span className="rounded-full border border-border/40 bg-surface-variant/60 px-3 py-1">
                      Days {phase.startDay}–{phase.endDay}
                    </span>{" "}
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1",
                        toneForLift(phase.liftPercent),
                      )}
                    >
                      {phase.liftPercent.toFixed(1)}% lift
                    </span>{" "}
                    <span className="rounded-full border border-border/40 bg-surface-variant/60 px-3 py-1">
                      Payback {phase.paybackDays.toFixed(1)}d
                    </span>{" "}
                  </div>{" "}
                </div>{" "}
                <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                  {" "}
                  {phase.objectives.map((objective) => (
                    <li key={objective}>• {objective}</li>
                  ))}{" "}
                </ul>{" "}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground/70">
                  {" "}
                  {phase.dependencies.length > 0 ? (
                    <span>Depends on {phase.dependencies.join(",")}</span>
                  ) : (
                    <span>No dependencies</span>
                  )}{" "}
                  <span>
                    Cumulative ROI {formatCurrency(phase.cumulativeRoi)}
                  </span>{" "}
                  {phase.zapierWorkflowId ? (
                    <span>Zapier {phase.zapierWorkflowId}</span>
                  ) : null}{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
function SummaryCard({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description?: string;
}) {
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
function toneForLift(lift: number) {
  if (lift >= 50) {
    return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  }
  if (lift >= 20) {
    return "border-sky-400/40 bg-sky-500/10 text-sky-200";
  }
  return "border-amber-400/40 bg-amber-500/10 text-amber-200";
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
  }).format(value);
}
