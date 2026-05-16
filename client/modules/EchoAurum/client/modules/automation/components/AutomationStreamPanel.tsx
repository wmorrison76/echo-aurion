import React, { useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  GaugeCircle,
  Loader2,
  Network,
  PlayCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutomationStream } from "../hooks/useAutomationStream";
type StatusConfig = { label: string; className: string };
const STATUS_CONFIG: Record<AutomationDecisionStatus, StatusConfig> = {
  ready: {
    label: "Ready",
    className: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  },
  review: {
    label: "Review",
    className: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  },
  hold: {
    label: "Hold",
    className: "border-red-500/40 bg-red-500/10 text-red-200",
  },
  posted: {
    label: "Posted",
    className: "border-sky-400/40 bg-sky-500/10 text-sky-200",
  },
};
const STREAM_LABELS: Record<AutomationStream, string> = {
  vendor_exchange: "Vendor exchange",
  pms: "PMS",
  pos: "POS",
};
export default function AutomationStreamPanel() {
  const { status, data, message } = useAutomationStream();
  const topDecisions = useMemo(() => {
    if (!data) {
      return [] as AutomationDecision[];
    }
    return [...data.decisions]
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 4);
  }, [data]);
  const primaryCurrency = useMemo(() => {
    if (!data) {
      return null;
    }
    const entries = Object.entries(data.summary.currencyTotals);
    if (entries.length === 0) {
      return null;
    }
    return entries.sort(([, a], [, b]) => b.total - a.total)[0];
  }, [data]);
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <div className="flex items-center justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            Automation stream
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            Real-time vendor, PMS, and POS orchestration
          </h3>{" "}
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {" "}
            Feed ingestion aligns LUCCCA vendor exchange, Opera PMS folios, and
            Toast POS checkouts into a single automation layer with
            ledger-backed provenance.{" "}
          </p>{" "}
        </div>{" "}
        {status === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-aurum-300" />
        ) : (
          <Network className="h-6 w-6 text-aurum-300" />
        )}{" "}
      </div>{" "}
      {status === "error" && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {" "}
          <AlertTriangle className="mt-1 h-4 w-4 text-red-300" />{" "}
          <div>
            {" "}
            <p className="font-semibold">
              Unable to load automation stream
            </p>{" "}
            <p className="mt-1 text-xs text-red-200/80">{message}</p>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {status === "unauthenticated" && (
        <SessionRequiredNotice
          description={
            message ??
            "Authenticate with a controller persona to monitor automation guardrails."
          }
        />
      )}{" "}
      {status === "ready" && data && (
        <div className="mt-6 space-y-6">
          {" "}
          <div className="grid gap-4 sm:grid-cols-3">
            {" "}
            <SummaryCard
              icon={<PlayCircle className="h-5 w-5 text-emerald-200" />}
              title="Ready for release"
              value={data.summary.counts.ready}
              description={
                primaryCurrency
                  ? formatCurrency(primaryCurrency[1].ready, primaryCurrency[0])
                  : undefined
              }
            />{" "}
            <SummaryCard
              icon={<Activity className="h-5 w-5 text-amber-200" />}
              title="Needs review"
              value={data.summary.counts.review + data.summary.counts.hold}
              description={
                primaryCurrency
                  ? formatCurrency(
                      primaryCurrency[1].review + primaryCurrency[1].hold,
                      primaryCurrency[0],
                    )
                  : undefined
              }
            />{" "}
            <SummaryCard
              icon={<CheckCircle2 className="h-5 w-5 text-sky-200" />}
              title="PMS + POS auto-posted"
              value={
                data.summary.streams.pms.count + data.summary.streams.pos.count
              }
              description={`${data.summary.streams.pms.count} PMS • ${data.summary.streams.pos.count} POS`}
            />{" "}
          </div>{" "}
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            {" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  {" "}
                  <GaugeCircle className="h-4 w-4 text-aurum-300" /> Ledger
                  integrity{" "}
                </p>{" "}
                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em]",
                    data.summary.ledgerIntegrity
                      ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                      : "border border-red-500/40 bg-red-500/10 text-red-200",
                  )}
                >
                  {" "}
                  {data.summary.ledgerIntegrity ? "Verified" : "Attention"}{" "}
                </span>{" "}
              </div>{" "}
              <p className="mt-3 text-xs text-muted-foreground">
                {" "}
                {data.summary.ledgerIntegrity
                  ? "Hash chain validation succeeded for streamed journal events."
                  : "Checksum mismatch detected; investigate upstream ingest."}{" "}
              </p>{" "}
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {" "}
                {Object.entries(data.summary.streams).map(
                  ([stream, summary]) => (
                    <li
                      key={stream}
                      className="flex items-center justify-between"
                    >
                      {" "}
                      <span className="font-medium text-foreground">
                        {STREAM_LABELS[stream as AutomationStream]}
                      </span>{" "}
                      <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground/80">
                        {" "}
                        {summary.count} events ·{" "}
                        {summary.counts.ready +
                          summary.counts.review +
                          summary.counts.hold}{" "}
                        actionable{" "}
                      </span>{" "}
                    </li>
                  ),
                )}{" "}
              </ul>{" "}
            </div>{" "}
            <div className="rounded-xl border border-border/40 bg-surface/60 p-4">
              {" "}
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                {" "}
                <Activity className="h-4 w-4 text-aurum-300" /> Priority
                automations{" "}
              </p>{" "}
              <ul className="mt-4 space-y-4 text-sm text-muted-foreground">
                {" "}
                {topDecisions.map((decision) => (
                  <li
                    key={decision.id}
                    className="rounded-lg border border-border/40 bg-surface-variant/60 p-4"
                  >
                    {" "}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-sm font-semibold text-foreground">
                          {decision.title}
                        </p>{" "}
                        <p className="mt-1 text-xs text-muted-foreground/80">
                          {decision.summary}
                        </p>{" "}
                      </div>{" "}
                      <div className="flex items-center gap-3">
                        {" "}
                        <StatusBadge status={decision.status} />{" "}
                        <div className="text-right">
                          {" "}
                          <p className="text-sm font-semibold text-foreground">
                            {" "}
                            {formatCurrency(
                              decision.amount,
                              decision.currency,
                            )}{" "}
                          </p>{" "}
                          <p className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground">
                            {" "}
                            Confidence {formatPercent(decision.confidence)}{" "}
                          </p>{" "}
                        </div>{" "}
                      </div>{" "}
                    </div>{" "}
                    {decision.actions.length > 0 && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {" "}
                        Next: {decision.actions[0]}{" "}
                      </p>
                    )}{" "}
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
  icon: React.ReactNode;
  title: string;
  value: number;
  description?: string;
}
function SummaryCard({ icon, title, value, description }: SummaryCardProps) {
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
function StatusBadge({ status }: { status: AutomationDecisionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.25em]",
        config.className,
      )}
    >
      {" "}
      {config.label}{" "}
    </span>
  );
}
function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value);
}
function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}
