import React, { useEffect, useState } from "react";
import type {
  PortfolioExposure,
  PortfolioRollupSummary,
} from "@shared/cashAnalytics";
import {
  SessionRequiredNotice,
  fetchWithSession,
  useSession,
} from "@/modules/auth";
const SAMPLE_ENTRIES: PortfolioExposure[] = [
  {
    property: "Echo Towers",
    revenue: 128000,
    laborCost: 46000,
    exposure: 0,
    region: "West",
    brand: "LUCCCA Signature",
  },
  {
    property: "Harborline",
    revenue: 94000,
    laborCost: 34000,
    exposure: 0,
    region: "East",
    brand: "LUCCCA Boutique",
  },
  {
    property: "Sundial Villas",
    revenue: 72000,
    laborCost: 26000,
    exposure: 0,
    region: "East",
    brand: "LUCCCA Signature",
  },
  {
    property: "Ridgecrest Lodge",
    revenue: 56000,
    laborCost: 22000,
    exposure: 0,
    region: "Mountain",
    brand: "LUCCCA Retreat",
  },
];
interface PanelState {
  status: "loading" | "ready" | "error" | "unauthenticated";
  data?: PortfolioRollupSummary;
  message?: string;
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}
export default function PortfolioRollupPanel() {
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
          "Authenticate with a controller persona to view portfolio exposure analytics.",
      });
      return () => {
        cancelled = true;
      };
    }
    async function load() {
      setState({ status: "loading" });
      try {
        const response = await fetchWithSession("/api/cash/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries: SAMPLE_ENTRIES }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load portfolio analytics.";
          throw new Error(message);
        }
        const payload = (await response.json()) as {
          summary: PortfolioRollupSummary;
        };
        if (!cancelled) {
          setState({ status: "ready", data: payload.summary });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load portfolio analytics.";
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
            Portfolio roll-ups
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            Region &amp; brand exposure
          </h3>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            {" "}
            Echo Ai³ consolidates LUCCCA property feeds to show revenue mix,
            labor load, and margin by region and brand.{" "}
          </p>{" "}
        </div>{" "}
        {status === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-aurum-300" />
        ) : (
          <ChartPie className="h-6 w-6 text-aurum-300" />
        )}{" "}
      </div>{" "}
      {status === "error" && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {" "}
          <AlertTriangle className="mt-1 h-4 w-4 text-red-300" />{" "}
          <div>
            {" "}
            <p className="font-semibold">Unable to load portfolio mix</p>{" "}
            <p className="mt-1 text-xs text-red-200/80">{message}</p>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {status === "unauthenticated" && (
        <SessionRequiredNotice
          description={
            message ??
            "Authenticate with a controller persona to view portfolio exposure analytics."
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
                Portfolio revenue
              </p>{" "}
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatCurrency(data.totalRevenue)}
              </p>{" "}
            </div>{" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                Labor cost
              </p>{" "}
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatCurrency(data.totalLabor)}
              </p>{" "}
            </div>{" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                Labor margin
              </p>{" "}
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatPercent(data.marginPercent)}
              </p>{" "}
              <p className="mt-1 text-xs text-muted-foreground">
                {data.narrative}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div className="grid gap-6 lg:grid-cols-2">
            {" "}
            <RollupList
              title="By region"
              icon={<MapPin className="h-4 w-4 text-aurum-300" />}
              rows={data.byRegion}
            />{" "}
            <RollupList
              title="By brand"
              icon={<Building2 className="h-4 w-4 text-aurum-300" />}
              rows={data.byBrand}
            />{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
interface RollupListProps {
  title: string;
  icon: React.ReactNode;
  rows: PortfolioRollupSummary["byRegion"];
}
function RollupList({ title, icon, rows }: RollupListProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-surface/60 p-4 text-sm text-muted-foreground/80">
        {" "}
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em]">
          {" "}
          <Percent className="h-4 w-4 text-aurum-300" /> {title}{" "}
        </p>{" "}
        <p className="mt-2 text-sm">No roll-up data available.</p>{" "}
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border/40 bg-surface/60 p-4 text-sm text-muted-foreground">
      {" "}
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em]">
        {" "}
        {icon} {title}{" "}
      </p>{" "}
      <ul className="mt-3 space-y-3">
        {" "}
        {rows.slice(0, 4).map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-4 text-sm"
          >
            {" "}
            <div>
              {" "}
              <p className="text-sm font-semibold text-foreground">
                {row.key}
              </p>{" "}
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                {" "}
                {formatPercent(row.exposure * 100)} exposure{" "}
              </p>{" "}
            </div>{" "}
            <div className="flex items-center gap-4">
              {" "}
              <div>
                {" "}
                <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                  Revenue
                </p>{" "}
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(row.revenue)}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                  Margin
                </p>{" "}
                <p className="text-sm font-semibold text-aurum-200">
                  {formatPercent(row.marginPercent)}
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </li>
        ))}{" "}
      </ul>{" "}
    </div>
  );
}
