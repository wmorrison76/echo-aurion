import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Siren,
  TriangleAlert,
} from "lucide-react";
import type {
  SentinelSummary,
  SentinelAlert,
  SentinelTransaction,
} from "@shared/sentinel";
const SAMPLE_TRANSACTIONS: SentinelTransaction[] = [
  {
    id: "tx-aurum-101",
    ledgerId: "ledger-luccca",
    vendor: "Harborline Services",
    amount: 85000,
    currency: "USD",
    bankAccount: "US9123",
    country: "US",
    submittedAt: "2024-11-04T18:32:00Z",
    metadata: {
      blacklist: ["Harborline Services"],
      threshold: 50000,
      historicalAverage: 32000,
    },
  },
  {
    id: "tx-aurum-102",
    ledgerId: "ledger-luccca",
    vendor: "Sundial Catering",
    amount: 42000,
    currency: "USD",
    bankAccount: "US8842",
    country: "MX",
    submittedAt: "2024-11-04T19:15:00Z",
    metadata: { allowedCountries: ["US", "CA"], historicalAverage: 18000 },
  },
  {
    id: "tx-aurum-103",
    ledgerId: "ledger-luccca",
    vendor: "Echo Towers AV",
    amount: 27000,
    currency: "USD",
    bankAccount: "US3321",
    country: "US",
    submittedAt: "2024-11-04T20:05:00Z",
    metadata: { threshold: 100000, historicalAverage: 26000 },
  },
];
interface PanelState {
  status: "loading" | "ready" | "error";
  data?: SentinelSummary;
  message?: string;
}
function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
function formatSeverity(severity: SentinelAlert["severity"]) {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    default:
      return "Info";
  }
}
export default function EchoSentinelPanel() {
  const [state, setState] = useState<PanelState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/sentinel/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions: SAMPLE_TRANSACTIONS }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const message =
            typeof errorBody?.error === "string"
              ? errorBody.error
              : "Unable to load EchoSentinel guardrails.";
          throw new Error(message);
        }
        const payload = (await response.json()) as { summary: SentinelSummary };
        if (!cancelled) {
          setState({ status: "ready", data: payload.summary });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to load EchoSentinel guardrails.";
          setState({ status: "error", message });
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);
  const { status, data, message } = state;
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <div className="flex items-center justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            EchoSentinel
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            Fraud guardrail posture
          </h3>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            {" "}
            Zelda telemetry, Argus audit hashes, and policy controls feed
            EchoSentinel to score vendor payouts in real time.{" "}
          </p>{" "}
        </div>{" "}
        {status === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-aurum-300" />
        ) : (
          <Siren className="h-6 w-6 text-aurum-300" />
        )}{" "}
      </div>{" "}
      {status === "error" && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {" "}
          <AlertCircle className="mt-1 h-4 w-4 text-red-300" />{" "}
          <div>
            {" "}
            <p className="font-semibold">EchoSentinel unavailable</p>{" "}
            <p className="mt-1 text-xs text-red-200/80">{message}</p>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {status === "ready" && data && (
        <div className="mt-6 space-y-6">
          {" "}
          <div className="grid gap-4 sm:grid-cols-3">
            {" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                Flagged
              </p>{" "}
              <p className="mt-2 text-xl font-semibold text-foreground">
                {" "}
                {data.flaggedTransactions} / {data.totalTransactions}{" "}
              </p>{" "}
              <p className="mt-1 text-xs text-muted-foreground">
                Highest severity: {formatSeverity(data.highestSeverity)}
              </p>{" "}
            </div>{" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                Flagged amount
              </p>{" "}
              <p className="mt-2 text-xl font-semibold text-foreground">
                {formatCurrency(data.stats.flaggedAmount, "USD")}
              </p>{" "}
              <p className="mt-1 text-xs text-muted-foreground">
                Vendors flagged: {data.stats.vendorsFlagged}
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
              <ShieldCheck className="h-4 w-4 text-aurum-300" /> Highest risk
              alerts{" "}
            </p>{" "}
            <ul className="mt-3 space-y-3">
              {" "}
              {data.alerts.length === 0 ? (
                <li className="rounded-xl border border-border/40 bg-surface/60 p-4 text-sm text-muted-foreground/80">
                  {" "}
                  <TriangleAlert className="mr-2 inline h-4 w-4 text-aurum-300" />{" "}
                  No alerts open.{" "}
                </li>
              ) : (
                data.alerts.slice(0, 3).map((alert) => (
                  <li
                    key={alert.transactionId}
                    className="rounded-xl border border-border/40 bg-surface/60 p-4 text-sm text-muted-foreground"
                  >
                    {" "}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-sm font-semibold text-foreground">
                          {alert.vendor}
                        </p>{" "}
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground/80">
                          {" "}
                          {alert.transactionId} •{" "}
                          {formatSeverity(alert.severity)}{" "}
                        </p>{" "}
                      </div>{" "}
                      <div className="flex items-center gap-4">
                        {" "}
                        <div>
                          {" "}
                          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                            Amount
                          </p>{" "}
                          <p className="text-sm font-semibold text-foreground">
                            {" "}
                            {formatCurrency(alert.amount, alert.currency)}{" "}
                          </p>{" "}
                        </div>{" "}
                        <div>
                          {" "}
                          <p className="text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                            Score
                          </p>{" "}
                          <p className="text-sm font-semibold text-aurum-200">
                            {alert.score.toFixed(1)}
                          </p>{" "}
                        </div>{" "}
                        <AlertTriangle className="h-5 w-5 text-aurum-300" />{" "}
                      </div>{" "}
                    </div>{" "}
                    <p className="mt-2 text-xs text-muted-foreground/90">
                      {alert.narrative}
                    </p>{" "}
                  </li>
                ))
              )}{" "}
            </ul>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
