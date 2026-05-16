import React, { useEffect, useState } from "react";
import type {
  LaborOptimizationResult,
  LaborSnapshot,
} from "@shared/cashAnalytics";
import {
  SessionRequiredNotice,
  fetchWithSession,
  useSession,
} from "@/modules/auth";
const SAMPLE_ENTRIES: LaborSnapshot[] = [
  {
    property: "Echo Towers",
    department: "Housekeeping",
    scheduledHours: 420,
    overtimeHours: 68,
    overtimeCost: 4800,
    baselineOvertimeCost: 3400,
  },
  {
    property: "Harborline",
    department: "Food & Beverage",
    scheduledHours: 360,
    overtimeHours: 54,
    overtimeCost: 4100,
    baselineOvertimeCost: 2950,
  },
  {
    property: "Sundial Villas",
    department: "Banquets",
    scheduledHours: 310,
    overtimeHours: 42,
    overtimeCost: 3200,
    baselineOvertimeCost: 2500,
  },
  {
    property: "Harborline",
    department: "Security",
    scheduledHours: 280,
    overtimeHours: 28,
    overtimeCost: 2100,
    baselineOvertimeCost: 1800,
  },
];
interface PanelState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: LaborOptimizationResult;
  message?: string;
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
function formatHours(value: number) {
  return `${value.toFixed(1)} hrs`;
}
export default function LaborOptimizerPanel() {
  const { session, status: sessionStatus, sessionError } = useSession();
  const [state, setState] = useState<PanelState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    if (sessionStatus === "loading") {
      setState({ status: "loading" });
      return () => {
        cancelled = true;
      };
    }
    if (sessionStatus === "error") {
      setState({
        status: "error",
        message: sessionError ?? "Unable to resolve session.",
      });
      return () => {
        cancelled = true;
      };
    }
    if (!session) {
      setState({
        status: "unauthenticated",
        message:
          "Authenticate with a controller persona to analyze labor optimization opportunities.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithSession("/api/cash/labor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: SAMPLE_ENTRIES }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load labor optimizer.";
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          optimization: LaborOptimizationResult;
        };
        if (!cancelled) {
          setState({ status: "ready", data: payload.optimization });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load labor optimizer.";
          setState({ status: "error", message });
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [session, sessionStatus, sessionError]);
  const { status, data, message } = state;
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <div className="flex items-center justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            Labor optimizer
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            Overtime trade recommendations
          </h3>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            {" "}
            Echo Ai³ analyzes LUCCCA labor feeds to suggest overtime trades that
            preserve service levels while reducing spend.{" "}
          </p>{" "}
        </div>{" "}
        {status === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-aurum-300" />
        ) : (
          <PiggyBank className="h-6 w-6 text-aurum-300" />
        )}{" "}
      </div>{" "}
      {status === "error" && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {" "}
          <AlertCircle className="mt-1 h-4 w-4 text-red-300" />{" "}
          <div>
            {" "}
            <p className="font-semibold">
              Unable to load savings insights
            </p>{" "}
            <p className="mt-1 text-xs text-red-200/80">{message}</p>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {status === "unauthenticated" && (
        <SessionRequiredNotice
          description={
            message ??
            "Authenticate with a controller persona to review overtime optimization."
          }
        />
      )}{" "}
      {status === "ready" && data && (
        <div className="mt-6 space-y-6">
          {" "}
          <div className="grid gap-4 sm:grid-cols-3">
            {" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                Total savings
              </p>{" "}
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatCurrency(data.totalSavings)}
              </p>{" "}
              <p className="mt-1 text-xs text-muted-foreground">
                Across {data.propertiesImpacted} properties
              </p>{" "}
            </div>{" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                Shifted overtime
              </p>{" "}
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatHours(data.totalRecommendedShift)}
              </p>{" "}
              <p className="mt-1 text-xs text-muted-foreground">
                Realign coverage to baseline
              </p>{" "}
            </div>{" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                Narrative
              </p>{" "}
              <p className="mt-2 text-sm text-foreground">
                {data.narrative}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div>
            {" "}
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              {" "}
              <Timer className="h-4 w-4 text-aurum-300" /> Top
              opportunities{" "}
            </p>{" "}
            <ul className="mt-3 space-y-3">
              {" "}
              {data.recommendations.slice(0, 4).map((rec) => (
                <li
                  key={`${rec.property}-${rec.department}`}
                  className="flex flex-col justify-between rounded-xl border border-border/40 bg-surface/60 p-4 text-sm text-muted-foreground sm:flex-row sm:items-center"
                >
                  {" "}
                  <div>
                    {" "}
                    <p className="text-sm font-semibold text-foreground">
                      {rec.property}
                    </p>{" "}
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                      {rec.department}
                    </p>{" "}
                  </div>{" "}
                  <div className="mt-3 flex items-center gap-6 sm:mt-0">
                    {" "}
                    <div>
                      {" "}
                      <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground/80">
                        Shift
                      </p>{" "}
                      <p className="text-sm font-semibold text-foreground">
                        {formatHours(rec.recommendedOvertimeShift)}
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground/80">
                        Savings
                      </p>{" "}
                      <p className="text-sm font-semibold text-aurum-200">
                        {formatCurrency(rec.savings)}
                      </p>{" "}
                    </div>{" "}
                    <ArrowUpRight className="h-5 w-5 text-aurum-300" />{" "}
                  </div>{" "}
                </li>
              ))}{" "}
            </ul>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
