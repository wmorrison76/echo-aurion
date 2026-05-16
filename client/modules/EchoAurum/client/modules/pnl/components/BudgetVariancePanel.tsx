import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";
import type { BudgetAnalysis, BudgetVariance } from "@shared/budget";
import { SessionRequiredNotice } from "@/modules/auth";
import { cn } from "@/lib/utils";
import { useBudgetAnalysis } from "../hooks/useBudgetAnalysis";
export function BudgetVariancePanel() {
  const { status, data, message } = useBudgetAnalysis();
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <header className="flex flex-wrap items-start justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            {" "}
            Budget Analysis{" "}
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            {" "}
            Budget vs. Actual Variance{" "}
          </h3>{" "}
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {" "}
            Real-time budget variance analysis with driver contributions and
            forecast adjustments.{" "}
          </p>{" "}
        </div>{" "}
        {status === "loading" ? (
          <BarChart3 className="h-5 w-5 animate-spin text-aurum-300" />
        ) : (
          <BarChart3 className="h-5 w-5 text-aurum-300" />
        )}{" "}
      </header>{" "}
      {status === "error" ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {" "}
          <AlertTriangle className="mt-0.5 h-4 w-4" />{" "}
          <div>
            {" "}
            <p className="font-semibold">Unable to load budget analysis</p>{" "}
            <p className="mt-1 text-xs text-red-200/80">{message}</p>{" "}
          </div>{" "}
        </div>
      ) : null}{" "}
      {status === "unauthenticated" ? (
        <SessionRequiredNotice
          description={
            message ??
            "Authenticate with a controller persona to view budget analysis."
          }
        />
      ) : null}{" "}
      {status === "ready" && data ? (
        <AnalysisContent analysis={data} />
      ) : null}{" "}
    </div>
  );
}
function AnalysisContent({ analysis }: { analysis: BudgetAnalysis }) {
  return (
    <div className="mt-6 space-y-6">
      {" "}
      <SummaryGrid analysis={analysis} />{" "}
      <TopVariancesGrid analysis={analysis} />{" "}
      <VarianceTable analysis={analysis} />{" "}
      <DriverContributionsSection analysis={analysis} />{" "}
    </div>
  );
}
function SummaryGrid({ analysis }: { analysis: BudgetAnalysis }) {
  return (
    <div className="grid gap-4 sm:grid-cols-4">
      {" "}
      <SummaryCard
        title="Total Budgeted"
        value={formatCurrency(analysis.totalBudgeted)}
        icon={<BarChart3 className="h-5 w-5 text-aurum-300" />}
      />{" "}
      <SummaryCard
        title="Total Actual"
        value={formatCurrency(analysis.totalActual)}
        icon={<BarChart3 className="h-5 w-5 text-emerald-300" />}
      />{" "}
      <SummaryCard
        title="Total Variance"
        value={formatSignedCurrency(analysis.totalVariance)}
        description={`${analysis.totalVariancePercent.toFixed(1)}% of budget`}
        icon={
          analysis.totalVariance >= 0 ? (
            <ArrowUp className="h-5 w-5 text-red-300" />
          ) : (
            <ArrowDown className="h-5 w-5 text-emerald-300" />
          )
        }
      />{" "}
      <SummaryCard
        title="Period"
        value={`FY ${analysis.fiscalYear}`}
        description="Annual budget cycle"
        icon={<BarChart3 className="h-5 w-5 text-sky-300" />}
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
function TopVariancesGrid({ analysis }: { analysis: BudgetAnalysis }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {" "}
      <section className="rounded-xl border border-border/40 bg-surface/60 p-4">
        {" "}
        <header className="flex items-center justify-between gap-3">
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {" "}
            Top Favorable Variances{" "}
          </p>{" "}
          <TrendingDown className="h-4 w-4 text-emerald-300" />{" "}
        </header>{" "}
        <div className="mt-3 space-y-3">
          {" "}
          {analysis.topFavorableVariances.length === 0 ? (
            <p className="text-[0.7rem] text-muted-foreground/70">
              {" "}
              No favorable variances{" "}
            </p>
          ) : (
            analysis.topFavorableVariances.map((variance, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2"
              >
                {" "}
                <div>
                  {" "}
                  <p className="text-sm font-semibold text-foreground">
                    {" "}
                    {variance.accountName}{" "}
                  </p>{" "}
                  <p className="text-[0.7rem] text-muted-foreground">
                    {" "}
                    {variance.accountCode}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="text-right">
                  {" "}
                  <p className="text-sm font-semibold text-emerald-300">
                    {" "}
                    {formatSignedCurrency(variance.variance)}{" "}
                  </p>{" "}
                  <p className="text-[0.7rem] text-muted-foreground">
                    {" "}
                    {variance.variancePercent.toFixed(1)}%{" "}
                  </p>{" "}
                </div>{" "}
              </div>
            ))
          )}{" "}
        </div>{" "}
      </section>{" "}
      <section className="rounded-xl border border-border/40 bg-surface/60 p-4">
        {" "}
        <header className="flex items-center justify-between gap-3">
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {" "}
            Top Unfavorable Variances{" "}
          </p>{" "}
          <TrendingUp className="h-4 w-4 text-red-300" />{" "}
        </header>{" "}
        <div className="mt-3 space-y-3">
          {" "}
          {analysis.topUnfavorableVariances.length === 0 ? (
            <p className="text-[0.7rem] text-muted-foreground/70">
              {" "}
              No unfavorable variances{" "}
            </p>
          ) : (
            analysis.topUnfavorableVariances.map((variance, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2"
              >
                {" "}
                <div>
                  {" "}
                  <p className="text-sm font-semibold text-foreground">
                    {" "}
                    {variance.accountName}{" "}
                  </p>{" "}
                  <p className="text-[0.7rem] text-muted-foreground">
                    {" "}
                    {variance.accountCode}{" "}
                  </p>{" "}
                </div>{" "}
                <div className="text-right">
                  {" "}
                  <p className="text-sm font-semibold text-red-300">
                    {" "}
                    {formatSignedCurrency(variance.variance)}{" "}
                  </p>{" "}
                  <p className="text-[0.7rem] text-muted-foreground">
                    {" "}
                    {variance.variancePercent.toFixed(1)}%{" "}
                  </p>{" "}
                </div>{" "}
              </div>
            ))
          )}{" "}
        </div>{" "}
      </section>{" "}
    </div>
  );
}
function VarianceTable({ analysis }: { analysis: BudgetAnalysis }) {
  return (
    <section className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        {" "}
        All Account Variances{" "}
      </p>{" "}
      <div className="mt-4 overflow-x-auto">
        {" "}
        <table className="w-full min-w-[620px] table-fixed text-left text-xs text-muted-foreground">
          {" "}
          <thead className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground/70">
            {" "}
            <tr>
              {" "}
              <th className="pb-2 pr-4 font-semibold">Account</th>{" "}
              <th className="pb-2 pr-4 text-right font-semibold">Budgeted</th>{" "}
              <th className="pb-2 pr-4 text-right font-semibold">Actual</th>{" "}
              <th className="pb-2 pr-4 text-right font-semibold">Variance</th>{" "}
              <th className="pb-2 pr-4 text-right font-semibold">%</th>{" "}
              <th className="pb-2 pr-4 font-semibold">Flag</th>{" "}
            </tr>{" "}
          </thead>{" "}
          <tbody className="text-[0.7rem]">
            {" "}
            {analysis.variances.map((variance, index) => (
              <tr key={index} className="border-t border-border/20">
                {" "}
                <td className="py-2 pr-4">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-foreground">
                      {variance.accountName}
                    </p>{" "}
                    <p className="text-muted-foreground/70">
                      {" "}
                      {variance.accountCode}{" "}
                    </p>{" "}
                  </div>{" "}
                </td>{" "}
                <td className="py-2 pr-4 text-right">
                  {" "}
                  {formatCurrency(variance.budgeted)}{" "}
                </td>{" "}
                <td className="py-2 pr-4 text-right">
                  {" "}
                  {formatCurrency(variance.actual)}{" "}
                </td>{" "}
                <td
                  className={cn(
                    "py-2 pr-4 text-right font-semibold",
                    variance.variance > 0 ? "text-red-300" : "text-emerald-300",
                  )}
                >
                  {" "}
                  {formatSignedCurrency(variance.variance)}{" "}
                </td>{" "}
                <td
                  className={cn(
                    "py-2 pr-4 text-right",
                    variance.variancePercent > 0
                      ? "text-red-300"
                      : "text-emerald-300",
                  )}
                >
                  {" "}
                  {variance.variancePercent.toFixed(1)}%{" "}
                </td>{" "}
                <td className="py-2 pr-4">
                  {" "}
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase",
                      variance.flag === "favorable"
                        ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                        : variance.flag === "unfavorable"
                          ? "border-red-400/40 bg-red-500/10 text-red-200"
                          : "border-border/40 bg-surface-variant/60 text-muted-foreground",
                    )}
                  >
                    {" "}
                    {variance.flag}{" "}
                  </span>{" "}
                </td>{" "}
              </tr>
            ))}{" "}
          </tbody>{" "}
        </table>{" "}
      </div>{" "}
    </section>
  );
}
function DriverContributionsSection({
  analysis,
}: {
  analysis: BudgetAnalysis;
}) {
  const entries = Object.entries(analysis.driverContributions);
  if (entries.length === 0) {
    return null;
  }
  return (
    <section className="rounded-xl border border-border/40 bg-surface/60 p-4">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
        {" "}
        Driver Contributions{" "}
      </p>{" "}
      <div className="mt-4 space-y-3">
        {" "}
        {entries.map(([name, contribution]) => (
          <div key={name}>
            {" "}
            <div className="flex items-center justify-between gap-3 text-sm">
              {" "}
              <p className="text-foreground">{name}</p>{" "}
              <p className="font-semibold text-aurum-300">
                {contribution}%
              </p>{" "}
            </div>{" "}
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-variant/60">
              {" "}
              <div
                className="h-full bg-aurum-400/60"
                style={{ width: `${Math.min(contribution, 100)}%` }}
              />{" "}
            </div>{" "}
          </div>
        ))}{" "}
      </div>{" "}
    </section>
  );
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
function formatSignedCurrency(value: number) {
  const formatted = formatCurrency(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}
