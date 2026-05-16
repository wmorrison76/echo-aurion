import React, { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Loader2,
  ChevronDown,
} from "lucide-react";
import type { ConsolidatedPnL, OutletPnLReport } from "@shared/outlets";
import { SessionRequiredNotice } from "@/modules/auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { fetchWithLucccaSession } from "../../auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface PnLViewState {
  status: "idle" | "loading" | "ready" | "error";
  data: ConsolidatedPnL | null;
  message?: string;
}
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(value);
};
const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};
const getVarianceColor = (variance: number) => {
  if (variance > 0) return "text-red-400";
  if (variance < -5) return "text-green-400";
  return "text-yellow-400";
};
const getVarianceIcon = (variance: number) => {
  if (variance > 0) return <TrendingDown className="h-4 w-4" />;
  if (variance < -5) return <TrendingUp className="h-4 w-4" />;
  return <AlertTriangle className="h-4 w-4" />;
};
export function MultiOutletPnL() {
  const [state, setState] = useState<PnLViewState>({
    status: "loading",
    data: null,
  });
  const [selectedYear, setSelectedYear] = useState(2024);
  const [expandedOutlet, setExpandedOutlet] = useState<string | null>(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(11);
  useEffect(() => {
    fetchConsolidatedPnL();
  }, [selectedYear]);
  const fetchConsolidatedPnL = async () => {
    setState({ status: "loading", data: null });
    try {
      const response = await fetchWithLucccaSession(
        `/api/outlets/consolidated/pnl?year=${selectedYear}`,
      );
      if (response.ok) {
        const data = await response.json();
        setState({ status: "ready", data: data.consolidated });
      } else {
        setState({
          status: "error",
          data: null,
          message: "Failed to load P&L data",
        });
      }
    } catch (error) {
      setState({
        status: "error",
        data: null,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
  if (state.status === "error") {
    return (
      <div className="space-y-4 rounded-2xl border border-border/40 bg-surface-variant/60 p-6">
        {" "}
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {" "}
          <AlertTriangle className="mt-0.5 h-4 w-4" />{" "}
          <div>
            {" "}
            <p className="font-semibold">Unable to load P&L data</p>{" "}
            <p className="mt-1 text-xs text-red-200/80">{state.message}</p>{" "}
          </div>{" "}
        </div>{" "}
      </div>
    );
  }
  if (!state.data) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border/40 bg-surface-variant/60 p-12">
        {" "}
        <Loader2 className="h-5 w-5 animate-spin text-aurum-300" />{" "}
      </div>
    );
  }
  const data = state.data;
  const monthData = data.monthly[selectedMonthIndex] || data.monthly[0];
  return (
    <div className="space-y-6">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            {" "}
            Consolidated View{" "}
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            {" "}
            Multi-Outlet P&L Dashboard{" "}
          </h3>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            {" "}
            Macro view of all {data.outletCount} outlets with monthly drill-down
            and YTD performance tracking.{" "}
          </p>{" "}
        </div>{" "}
        <div className="flex items-center gap-3">
          {" "}
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            {" "}
            <SelectTrigger className="w-32">
              {" "}
              <SelectValue />{" "}
            </SelectTrigger>{" "}
            <SelectContent>
              {" "}
              <SelectItem value="2024">2024</SelectItem>{" "}
              <SelectItem value="2023">2023</SelectItem>{" "}
              <SelectItem value="2022">2022</SelectItem>{" "}
            </SelectContent>{" "}
          </Select>{" "}
          <BarChart3 className="h-5 w-5 text-aurum-300" />{" "}
        </div>{" "}
      </div>{" "}
      <div className="grid gap-4 sm:grid-cols-4">
        {" "}
        <MetricCard
          label="Total Outlets"
          value={data.outletCount}
          subtitle="Active locations"
        />{" "}
        <MetricCard
          label="YTD Revenue"
          value={formatCurrency(data.ytd.revenue.actual)}
          subtitle={`Budget: ${formatCurrency(data.ytd.revenue.budget)}`}
        />{" "}
        <MetricCard
          label="YTD EBITDA"
          value={formatCurrency(data.ytd.ebitda.actual)}
          subtitle={`Margin: ${formatPercent(data.ytd.ebitda.actual / data.ytd.revenue.actual)}`}
        />{" "}
        <MetricCard
          label="Budget Variance"
          value={formatPercent(
            data.ytd.revenue.actual / data.ytd.revenue.budget - 1,
          )}
          subtitle="vs YTD Budget"
          color={
            data.ytd.revenue.actual < data.ytd.revenue.budget
              ? "text-red-400"
              : "text-green-400"
          }
        />{" "}
      </div>{" "}
      <div className="space-y-4 rounded-2xl border border-border/40 bg-surface-variant/60 p-5">
        {" "}
        <h4 className="text-sm font-semibold text-foreground">
          {" "}
          Monthly Trends{" "}
        </h4>{" "}
        <div className="space-y-3">
          {" "}
          {data.monthly.map((month, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedMonthIndex(idx)}
              className={cn(
                "w-full rounded-xl p-3 text-left transition border border-border/40",
                selectedMonthIndex === idx
                  ? "bg-aurum-500/20 border-aurum-400/50"
                  : "bg-surface/50 hover:bg-surface/80",
              )}
            >
              {" "}
              <div className="flex items-center justify-between">
                {" "}
                <span className="font-medium text-foreground">
                  {" "}
                  {month.monthName}{" "}
                </span>{" "}
                <div className="flex items-center gap-3 text-xs">
                  {" "}
                  <span className="text-muted-foreground">
                    {" "}
                    {formatCurrency(month.revenue.actual)}{" "}
                  </span>{" "}
                  <span className="text-aurum-200">
                    {" "}
                    {formatCurrency(month.ebitda.actual)}{" "}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </button>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      <div className="space-y-4 rounded-2xl border border-border/40 bg-surface-variant/60 p-5">
        {" "}
        <h4 className="text-sm font-semibold text-foreground">
          {" "}
          {monthData.monthName} Performance{" "}
        </h4>{" "}
        <PnLTable
          revenue={monthData.revenue}
          cogs={monthData.cogs}
          labor={monthData.labor}
          otherExpenses={monthData.otherExpenses}
          grossProfit={monthData.grossProfit}
          ebitda={monthData.ebitda}
        />{" "}
      </div>{" "}
      <div className="space-y-4">
        {" "}
        {Object.entries(data.byOutlet || {}).map(([outletId, report]) => (
          <OutletPnLCard
            key={outletId}
            report={report}
            isExpanded={expandedOutlet === outletId}
            onToggle={() =>
              setExpandedOutlet(expandedOutlet === outletId ? null : outletId)
            }
          />
        ))}{" "}
      </div>{" "}
    </div>
  );
}
function MetricCard({
  label,
  value,
  subtitle,
  color = "text-foreground",
}: {
  label: string;
  value: string | number;
  subtitle: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface-variant/60 p-4">
      {" "}
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-aurum-200">
        {" "}
        {label}{" "}
      </p>{" "}
      <p className={cn("mt-2 text-xl font-semibold", color)}>{value}</p>{" "}
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>{" "}
    </div>
  );
}
function PnLTable({
  revenue,
  cogs,
  labor,
  otherExpenses,
  grossProfit,
  ebitda,
}: {
  revenue: { budget: number; forecast: number; actual: number };
  cogs: { budget: number; forecast: number; actual: number };
  labor: { budget: number; forecast: number; actual: number };
  otherExpenses: { budget: number; forecast: number; actual: number };
  grossProfit: { budget: number; forecast: number; actual: number };
  ebitda: { budget: number; forecast: number; actual: number };
}) {
  return (
    <div className="overflow-x-auto">
      {" "}
      <table className="w-full text-sm">
        {" "}
        <thead>
          {" "}
          <tr className="border-b border-border/40 text-xs uppercase tracking-[0.2em] text-aurum-200">
            {" "}
            <th className="px-4 py-2 text-left font-semibold">Category</th>{" "}
            <th className="px-4 py-2 text-right font-semibold">Budget</th>{" "}
            <th className="px-4 py-2 text-right font-semibold">Forecast</th>{" "}
            <th className="px-4 py-2 text-right font-semibold">Actual</th>{" "}
            <th className="px-4 py-2 text-right font-semibold">Var %</th>{" "}
          </tr>{" "}
        </thead>{" "}
        <tbody>
          {" "}
          <PnLRow
            label="Revenue"
            budget={revenue.budget}
            forecast={revenue.forecast}
            actual={revenue.actual}
          />{" "}
          <PnLRow
            label="COGS"
            budget={cogs.budget}
            forecast={cogs.forecast}
            actual={cogs.actual}
            indent
          />{" "}
          <PnLRow
            label="Labor"
            budget={labor.budget}
            forecast={labor.forecast}
            actual={labor.actual}
            indent
          />{" "}
          <PnLRow
            label="Other Expenses"
            budget={otherExpenses.budget}
            forecast={otherExpenses.forecast}
            actual={otherExpenses.actual}
            indent
          />{" "}
          <PnLRow
            label="Gross Profit"
            budget={grossProfit.budget}
            forecast={grossProfit.forecast}
            actual={grossProfit.actual}
            highlight
          />{" "}
          <PnLRow
            label="EBITDA"
            budget={ebitda.budget}
            forecast={ebitda.forecast}
            actual={ebitda.actual}
            highlight
          />{" "}
        </tbody>{" "}
      </table>{" "}
    </div>
  );
}
function PnLRow({
  label,
  budget,
  forecast,
  actual,
  indent = false,
  highlight = false,
}: {
  label: string;
  budget: number;
  forecast: number;
  actual: number;
  indent?: boolean;
  highlight?: boolean;
}) {
  const variance = actual - budget;
  const variancePercent = budget !== 0 ? variance / budget : 0;
  return (
    <tr
      className={cn(
        "border-b border-border/40 text-xs",
        highlight && "bg-aurum-500/10 font-semibold",
        indent && "bg-surface/30",
      )}
    >
      {" "}
      <td className={cn("px-4 py-2 text-foreground", indent && "pl-8")}>
        {" "}
        {label}{" "}
      </td>{" "}
      <td className="px-4 py-2 text-right text-muted-foreground">
        {" "}
        {formatCurrency(budget)}{" "}
      </td>{" "}
      <td className="px-4 py-2 text-right text-muted-foreground">
        {" "}
        {formatCurrency(forecast)}{" "}
      </td>{" "}
      <td className="px-4 py-2 text-right text-foreground font-medium">
        {" "}
        {formatCurrency(actual)}{" "}
      </td>{" "}
      <td
        className={cn(
          "px-4 py-2 text-right flex items-center gap-1 justify-end",
          getVarianceColor(variancePercent),
        )}
      >
        {" "}
        {getVarianceIcon(variancePercent)} {formatPercent(variancePercent)}{" "}
      </td>{" "}
    </tr>
  );
}
function OutletPnLCard({
  report,
  isExpanded,
  onToggle,
}: {
  report: OutletPnLReport;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const ytdVariancePercent =
    report.ytd.revenue.budget !== 0
      ? (report.ytd.revenue.actual - report.ytd.revenue.budget) /
        report.ytd.revenue.budget
      : 0;
  return (
    <div className="rounded-2xl border border-border/40 bg-surface-variant/60">
      {" "}
      <button
        onClick={onToggle}
        className="w-full p-5 text-left hover:bg-surface-variant/80 transition"
      >
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div className="flex-1">
            {" "}
            <h4 className="font-semibold text-foreground">
              {" "}
              {report.outletName}{" "}
            </h4>{" "}
            <div className="mt-2 grid gap-4 sm:grid-cols-4 text-sm">
              {" "}
              <div>
                {" "}
                <p className="text-xs text-muted-foreground">Revenue</p>{" "}
                <p className="text-foreground font-medium">
                  {" "}
                  {formatCurrency(report.ytd.revenue.actual)}{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-xs text-muted-foreground">EBITDA</p>{" "}
                <p className="text-foreground font-medium">
                  {" "}
                  {formatCurrency(report.ytd.ebitda.actual)}{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-xs text-muted-foreground">
                  YTD vs Budget
                </p>{" "}
                <p
                  className={cn(
                    "font-medium",
                    getVarianceColor(ytdVariancePercent),
                  )}
                >
                  {" "}
                  {formatPercent(ytdVariancePercent)}{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <p className="text-xs text-muted-foreground">Prior Year</p>{" "}
                <p className="text-foreground font-medium">
                  {" "}
                  {formatCurrency(report.priorYear.revenue)}{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <ChevronDown
            className={cn("h-5 w-5 transition", isExpanded && "rotate-180")}
          />{" "}
        </div>{" "}
      </button>{" "}
      {isExpanded && (
        <div className="border-t border-border/40 p-5">
          {" "}
          <PnLTable
            revenue={report.ytd.revenue}
            cogs={report.ytd.cogs}
            labor={report.ytd.labor}
            otherExpenses={report.ytd.otherExpenses}
            grossProfit={report.ytd.grossProfit}
            ebitda={report.ytd.ebitda}
          />{" "}
        </div>
      )}{" "}
    </div>
  );
}
