import {
  AlertTriangle,
  ArrowUpRight,
  Banknote,
  BarChart3,
  CalendarClock,
  Factory,
  LineChart,
  PieChart,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type {
  CostCenterBreakdown,
  OutletPnL,
  OutletPnlReport,
  PaymentBucket,
  PaymentEventSummary,
  ScheduleItemSummary,
} from "../../../shared/pnl";
import { SessionRequiredNotice } from "@/modules/auth";
import { cn } from "@/lib/utils";
import { useOutletPnl } from "../hooks/useOutletPnl";
import { GLDrillDownPanel } from "./GLDrillDownPanel";
import { BudgetVariancePanel } from "./BudgetVariancePanel";
export default function OutletPnlPanel() {
  const { status, data, message } = useOutletPnl();
  const [selectedGLCode, setSelectedGLCode] = useState<string | null>(null);
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
      {" "}
      <header className="flex flex-wrap items-start justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            {" "}
            Outlet P&L{" "}
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            {" "}
            Outlet-level P&L with drill-downs{" "}
          </h3>{" "}
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {" "}
            Consolidated revenue, expense, and EBITDA visibility with cost
            center drill-downs, maintenance schedules, and payment timelines
            across LUCCCA properties.{" "}
          </p>{" "}
        </div>{" "}
        {status === "loading" ? (
          <PieChart className="h-5 w-5 animate-spin text-aurum-300" />
        ) : (
          <LineChart className="h-5 w-5 text-aurum-300" />
        )}{" "}
      </header>{" "}
      {status === "error" ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {" "}
          <AlertTriangle className="mt-0.5 h-4 w-4" />{" "}
          <div>
            {" "}
            <p className="font-semibold">Unable to load outlet P&L</p>{" "}
            <p className="mt-1 text-xs text-red-200/80">{message}</p>{" "}
          </div>{" "}
        </div>
      ) : null}{" "}
      {status === "unauthenticated" ? (
        <SessionRequiredNotice
          description={
            message ??
            "Authenticate with a controller persona to drill into outlet-level financials."
          }
        />
      ) : null}{" "}
      {status === "ready" && data ? (
        <ReportContent
          report={data}
          selectedGLCode={selectedGLCode}
          onSelectGLCode={setSelectedGLCode}
        />
      ) : null}{" "}
    </div>
  );
}
function ReportContent({
  report,
  selectedGLCode,
  onSelectGLCode,
}: {
  report: OutletPnlReport;
  selectedGLCode: string | null;
  onSelectGLCode: (code: string | null) => void;
}) {
  if (selectedGLCode) {
    return (
      <div className="mt-6 space-y-6">
        {" "}
        <GLDrillDownPanel
          accountCode={selectedGLCode}
          onBack={() => onSelectGLCode(null)}
        />{" "}
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-6">
      {" "}
      <SummaryGrid report={report} /> <BudgetVariancePanel />{" "}
      <OutletList
        outlets={report.outlets}
        onSelectGLCode={onSelectGLCode}
      />{" "}
    </div>
  );
}
function SummaryGrid({ report }: { report: OutletPnlReport }) {
  const { consolidated } = report;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {" "}
      <SummaryCard
        title="Consolidated revenue"
        value={formatCurrency(consolidated.revenue)}
        description={`Variance ${formatSignedCurrency(consolidated.revenueVsBudget)}`}
        icon={<Banknote className="h-5 w-5 text-aurum-300" />}
      />{" "}
      <SummaryCard
        title="EBITDA"
        value={formatCurrency(consolidated.ebitda)}
        description={`Margin ${(consolidated.margin * 100).toFixed(1)}% · Var ${formatSignedCurrency(consolidated.ebitdaVsBudget)}`}
        icon={<BarChart3 className="h-5 w-5 text-emerald-300" />}
      />{" "}
      <SummaryCard
        title="Period"
        value={`${formatDate(report.period.start)} – ${formatDate(report.period.end)}`}
        description="Includes schedules & payment timeline aggregation"
        icon={<CalendarClock className="h-5 w-5 text-sky-300" />}
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
function OutletList({
  outlets,
  onSelectGLCode,
}: {
  outlets: OutletPnL[];
  onSelectGLCode: (code: string) => void;
}) {
  return (
    <div className="space-y-5">
      {" "}
      {outlets.map((outlet) => (
        <OutletCard
          key={outlet.outletId}
          outlet={outlet}
          onSelectGLCode={onSelectGLCode}
        />
      ))}{" "}
    </div>
  );
}
function OutletCard({
  outlet,
  onSelectGLCode,
}: {
  outlet: OutletPnL;
  onSelectGLCode: (code: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border/40 bg-surface/70 p-5">
      {" "}
      <header className="flex flex-wrap items-start justify-between gap-4">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
            {" "}
            {outlet.region} · {outlet.currency}{" "}
          </p>{" "}
          <h4 className="mt-2 text-lg font-semibold text-foreground">
            {" "}
            {outlet.name}{" "}
          </h4>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            {" "}
            Revenue {formatCurrency(outlet.revenue)} · EBITDA{""}{" "}
            {formatCurrency(outlet.ebitda)} · Margin{""}{" "}
            {(outlet.ebitdaMargin * 100).toFixed(1)}%{" "}
          </p>{" "}
        </div>{" "}
        <div className="grid gap-2 text-xs text-muted-foreground">
          {" "}
          <VarianceBadge
            label="Revenue variance"
            value={outlet.revenueVsBudget}
          />{" "}
          <VarianceBadge
            label="EBITDA variance"
            value={outlet.ebitdaVsBudget}
          />{" "}
        </div>{" "}
      </header>{" "}
      <div className="mt-4 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        {" "}
        <CostCenterTable
          costCenters={outlet.costCenters}
          onSelectGLCode={onSelectGLCode}
        />{" "}
        <div className="space-y-4">
          {" "}
          <ScheduleStack schedules={outlet.schedules} />{" "}
          <PaymentStack payments={outlet.payments} />{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
function VarianceBadge({ label, value }: { label: string; value: number }) {
  const palette =
    value >= 0
      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
      : "border-red-500/40 bg-red-500/10 text-red-200";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 font-semibold uppercase tracking-[0.25em]",
        palette,
      )}
    >
      {" "}
      <ArrowUpRight className="h-3.5 w-3.5" /> {label}:{" "}
      {formatSignedCurrency(value)}{" "}
    </span>
  );
}
function CostCenterTable({
  costCenters,
  onSelectGLCode,
}: {
  costCenters: CostCenterBreakdown[];
  onSelectGLCode: (code: string) => void;
}) {
  return (
    <section className="rounded-xl border border-border/40 bg-surface-variant/60 p-4">
      {" "}
      <header className="flex items-center justify-between gap-3">
        {" "}
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {" "}
          Cost centers{" "}
        </p>{" "}
        <Factory className="h-4 w-4 text-aurum-300" />{" "}
      </header>{" "}
      <div className="mt-4 overflow-x-auto">
        {" "}
        <table className="w-full min-w-[520px] table-fixed text-left text-xs text-muted-foreground">
          {" "}
          <thead className="text-[0.65rem] uppercase tracking-[0.25em] text-muted-foreground/70">
            {" "}
            <tr>
              {" "}
              <th className="pb-2 pr-4 font-semibold">Cost center</th>{" "}
              <th className="pb-2 pr-4 font-semibold">Revenue</th>{" "}
              <th className="pb-2 pr-4 font-semibold">Expense</th>{" "}
              <th className="pb-2 pr-4 font-semibold">Net</th>{" "}
              <th className="pb-2 pr-4 font-semibold">Schedule impact</th>{" "}
            </tr>{" "}
          </thead>{" "}
          <tbody className="text-[0.7rem]">
            {" "}
            {costCenters.map((center) => (
              <tr
                key={center.costCenter}
                className="border-t border-border/20 transition hover:bg-surface/60"
              >
                {" "}
                <td className="py-2 pr-4 text-foreground">
                  {" "}
                  {center.costCenter}{" "}
                </td>{" "}
                <td className="py-2 pr-4">
                  {" "}
                  {formatCurrency(center.totalRevenue)}{" "}
                </td>{" "}
                <td className="py-2 pr-4">
                  {" "}
                  {formatCurrency(center.totalExpense)}{" "}
                </td>{" "}
                <td
                  className={cn(
                    "py-2 pr-4",
                    center.netContribution >= 0
                      ? "text-emerald-200"
                      : "text-red-200",
                  )}
                >
                  {" "}
                  {formatCurrency(center.netContribution)}{" "}
                </td>{" "}
                <td className="py-2 pr-4">
                  {" "}
                  {formatCurrency(center.scheduleImpact)}{" "}
                </td>{" "}
              </tr>
            ))}{" "}
          </tbody>{" "}
        </table>{" "}
      </div>{" "}
      <div className="mt-4 space-y-2 text-[0.65rem] text-muted-foreground/80">
        {" "}
        {costCenters.slice(0, 3).map((center) => (
          <div key={`${center.costCenter}-accounts`}>
            {" "}
            <p className="font-semibold uppercase tracking-[0.25em] text-muted-foreground/60">
              {" "}
              {center.costCenter} drivers{" "}
            </p>{" "}
            <div className="mt-1 flex flex-wrap gap-2">
              {" "}
              {center.accounts.slice(0, 4).map((account) => (
                <button
                  key={account.accountCode}
                  onClick={() => onSelectGLCode(account.accountCode)}
                  className="rounded-full border border-border/30 bg-surface/80 px-3 py-1 text-[0.65rem] transition hover:border-aurum-400/60 hover:bg-surface-variant/80"
                >
                  {" "}
                  {account.accountCode} · {account.accountName} ·{""}{" "}
                  {formatCurrency(account.amount)}{" "}
                </button>
              ))}{" "}
            </div>{" "}
          </div>
        ))}{" "}
      </div>{" "}
    </section>
  );
}
function ScheduleStack({ schedules }: { schedules: OutletPnL["schedules"] }) {
  return (
    <section className="rounded-xl border border-border/40 bg-surface-variant/60 p-4">
      {" "}
      <header className="flex items-center justify-between gap-3">
        {" "}
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {" "}
          Maintenance schedules{" "}
        </p>{" "}
        <CalendarClock className="h-4 w-4 text-aurum-300" />{" "}
      </header>{" "}
      <p className="mt-2 text-[0.7rem] text-muted-foreground/70">
        {" "}
        Total scheduled impact {formatCurrency(schedules.totalAmount)}{" "}
      </p>{" "}
      <div className="mt-3 space-y-2 text-[0.7rem] text-muted-foreground">
        {" "}
        {renderScheduleItems("Upcoming", schedules.upcoming)}{" "}
        {renderScheduleItems("Overdue", schedules.overdue)}{" "}
      </div>{" "}
    </section>
  );
}
function renderScheduleItems(title: string, items: ScheduleItemSummary[]) {
  if (items.length === 0) {
    return (
      <div>
        {" "}
        <p className="font-semibold uppercase tracking-[0.25em] text-muted-foreground/60">
          {" "}
          {title}{" "}
        </p>{" "}
        <p className="mt-1 text-muted-foreground/50">No items.</p>{" "}
      </div>
    );
  }
  return (
    <div>
      {" "}
      <p className="font-semibold uppercase tracking-[0.25em] text-muted-foreground/60">
        {" "}
        {title}{" "}
      </p>{" "}
      <ul className="mt-1 space-y-1">
        {" "}
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-surface/70 px-3 py-2"
          >
            {" "}
            <div>
              {" "}
              <p className="text-foreground">{item.description}</p>{" "}
              <p className="text-muted-foreground/70">{item.costCenter}</p>{" "}
            </div>{" "}
            <div className="text-right">
              {" "}
              <p>{formatCurrency(item.amount)}</p>{" "}
              <p className="text-muted-foreground/70">
                {" "}
                Due {formatRelative(item.dueAt)}{" "}
              </p>{" "}
            </div>{" "}
          </li>
        ))}{" "}
      </ul>{" "}
    </div>
  );
}
function PaymentStack({ payments }: { payments: OutletPnL["payments"] }) {
  return (
    <section className="rounded-xl border border-border/40 bg-surface-variant/60 p-4">
      {" "}
      <header className="flex items-center justify-between gap-3">
        {" "}
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          {" "}
          Payment timeline{" "}
        </p>{" "}
        <Banknote className="h-4 w-4 text-aurum-300" />{" "}
      </header>{" "}
      <div className="mt-3 grid gap-2 text-[0.7rem] text-muted-foreground">
        {" "}
        <div className="grid grid-cols-2 gap-2">
          {" "}
          {payments.buckets.map((bucket) => (
            <PaymentBucketCard key={bucket.label} bucket={bucket} />
          ))}{" "}
        </div>{" "}
        <div>
          {" "}
          <p className="font-semibold uppercase tracking-[0.25em] text-muted-foreground/60">
            {" "}
            Upcoming payments{" "}
          </p>{" "}
          <ul className="mt-2 space-y-1">
            {" "}
            {payments.upcomingPayments.length === 0 ? (
              <li className="rounded-lg border border-border/30 bg-surface/70 px-3 py-2">
                {" "}
                No payments scheduled.{" "}
              </li>
            ) : (
              payments.upcomingPayments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-surface/70 px-3 py-2"
                >
                  {" "}
                  <div>
                    {" "}
                    <p className="text-foreground">{payment.vendor}</p>{" "}
                    <p className="text-muted-foreground/70">
                      {" "}
                      {payment.costCenter}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="text-right">
                    {" "}
                    <p>{formatCurrency(payment.amount)}</p>{" "}
                    <p className="text-muted-foreground/70">
                      {" "}
                      {payment.status} · {formatRelative(payment.dueAt)}{" "}
                    </p>{" "}
                  </div>{" "}
                </li>
              ))
            )}{" "}
          </ul>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
function PaymentBucketCard({ bucket }: { bucket: PaymentBucket }) {
  const palette =
    bucket.label === "overdue"
      ? "border-red-500/40 bg-red-500/10 text-red-200"
      : bucket.label === "later"
        ? "border-border/40 bg-surface/80 text-muted-foreground"
        : "border-aurum-300/40 bg-aurum-500/10 text-aurum-100";
  const label =
    bucket.label === "overdue"
      ? "Overdue"
      : bucket.label === "this_week"
        ? "Due this week"
        : bucket.label === "next_week"
          ? "Due next week"
          : "Later";
  return (
    <div className={cn("rounded-lg border px-3 py-2", palette)}>
      {" "}
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.25em]">
        {" "}
        {label}{" "}
      </p>{" "}
      <p className="mt-1 text-sm font-semibold text-foreground">
        {" "}
        {formatCurrency(bucket.amount)}{" "}
      </p>{" "}
      <p className="text-[0.65rem] text-muted-foreground/80">
        {" "}
        {bucket.count} payments{" "}
      </p>{" "}
    </div>
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
function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
function formatRelative(value: string) {
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const now = Date.now();
  const target = new Date(value).getTime();
  const diffMs = target - now;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return formatter.format(diffHours, "hour");
  }
  return formatter.format(diffDays, "day");
}
