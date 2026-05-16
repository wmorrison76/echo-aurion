import React, { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import {
  useProfitAndLoss,
  useProfitAndLossHistory,
} from "../hooks/useProfitAndLoss";
import { cn } from "@/lib/utils";
interface ProfitAndLossReportProps {
  entityId: string;
  defaultPeriod?: string;
}
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};
const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};
export function ProfitAndLossReport({
  entityId,
  defaultPeriod,
}: ProfitAndLossReportProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(
    defaultPeriod || new Date().toISOString().split("T")[0],
  );
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const {
    data: plData,
    isLoading,
    error,
  } = useProfitAndLoss(entityId, selectedPeriod, true);
  const { data: historyData } = useProfitAndLossHistory(
    entityId,
    new Date(new Date().setMonth(new Date().getMonth() - 11))
      .toISOString()
      .split("T")[0],
    selectedPeriod,
  );
  if (isLoading) {
    return (
      <div className="space-y-4">
        {" "}
        <div className="h-96 bg-surface-variant/20 rounded-lg animate-pulse" />{" "}
      </div>
    );
  }
  if (error || !plData) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-6">
        {" "}
        <p className="text-sm text-red-200">
          {" "}
          Unable to load P&L data. Please try again.{" "}
        </p>{" "}
      </div>
    );
  }
  const hasVariance = plData.variance !== undefined;
  const chartData = historyData ? historyData.slice(-12) : [];
  return (
    <div className="space-y-6">
      {" "}
      {/* Period Selection */}{" "}
      <div className="flex items-center justify-between gap-4">
        {" "}
        <div className="flex-1 max-w-xs">
          {" "}
          <label className="text-sm font-medium text-foreground mb-2 block">
            {" "}
            Select Period{" "}
          </label>{" "}
          <input
            type="month"
            value={selectedPeriod.slice(0, 7)}
            onChange={(e) => {
              const [year, month] = e.target.value.split("-");
              setSelectedPeriod(`${year}-${month}-01`);
            }}
            className="w-full px-3 py-2 border border-border/40 rounded-lg bg-surface text-foreground text-sm"
          />{" "}
        </div>{" "}
        <div className="flex gap-2">
          {" "}
          <Button variant="outline" size="sm">
            {" "}
            Export PDF{" "}
          </Button>{" "}
          <Button variant="outline" size="sm">
            {" "}
            Export Excel{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Key Metrics Overview */}{" "}
      <div className="grid gap-4 md:grid-cols-4">
        {" "}
        <MetricCard
          label="Total Revenue"
          value={plData.revenue.total}
          change={plData.variance?.revenueVariancePercent}
          isPositive
        />{" "}
        <MetricCard
          label="Gross Profit"
          value={plData.grossProfit}
          change={plData.variance?.grossProfitVariancePercent}
          isPositive
        />{" "}
        <MetricCard
          label="Operating Income"
          value={plData.operatingIncome}
          change={plData.variance?.operatingIncomeVariancePercent}
          isPositive
        />{" "}
        <MetricCard
          label="Net Income"
          value={plData.netIncome}
          change={plData.variance?.netIncomeVariancePercent}
          isPositive={plData.netIncome >= 0}
        />{" "}
      </div>{" "}
      {/* Charts Section */}{" "}
      <div className="grid gap-6 lg:grid-cols-2">
        {" "}
        {/* Revenue Trend Chart */}{" "}
        {chartData.length > 0 && (
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-base">
                Revenue Trend (12 Months)
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <ResponsiveContainer width="100%" height={300}>
                {" "}
                <LineChart data={chartData}>
                  {" "}
                  <CartesianGrid strokeDasharray="3 3" />{" "}
                  <XAxis
                    dataKey="periodDate"
                    tickFormatter={(date) =>
                      new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                      })
                    }
                  />{" "}
                  <YAxis
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                  />{" "}
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value as number)}
                  />{" "}
                  <Legend />{" "}
                  <Line
                    type="monotone"
                    dataKey="revenue.total"
                    stroke="#8b5cf6"
                    name="Total Revenue"
                  />{" "}
                  <Line
                    type="monotone"
                    dataKey="netIncome"
                    stroke="#10b981"
                    name="Net Income"
                  />{" "}
                </LineChart>{" "}
              </ResponsiveContainer>{" "}
            </CardContent>{" "}
          </Card>
        )}{" "}
        {/* Revenue Breakdown Pie Chart */}{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="text-base">Revenue Breakdown</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <PieChart>
                {" "}
                <Pie
                  data={[
                    { name: "Room Revenue", value: plData.revenue.roomRevenue },
                    { name: "F&B Revenue", value: plData.revenue.foodBeverage },
                    {
                      name: "Other Revenue",
                      value: plData.revenue.otherOperatingRevenue,
                    },
                  ].filter((item) => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) =>
                    `${entry.name}: ${formatPercent(entry.value / plData.revenue.total)}`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {" "}
                  {[0, 1, 2].map((index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={["#8b5cf6", "#3b82f6", "#10b981"][index]}
                    />
                  ))}{" "}
                </Pie>{" "}
                <Tooltip
                  formatter={(value: any) => formatCurrency(value as number)}
                />{" "}
              </PieChart>{" "}
            </ResponsiveContainer>{" "}
          </CardContent>{" "}
        </Card>{" "}
        {/* Operating Expenses Chart */}{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="text-base">
              Operating Expenses Breakdown
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <BarChart
                data={[
                  {
                    name: "Salaries",
                    value: plData.operatingExpenses.salariesAndWages,
                  },
                  {
                    name: "Utilities",
                    value: plData.operatingExpenses.utilities,
                  },
                  {
                    name: "Maintenance",
                    value: plData.operatingExpenses.maintenance,
                  },
                  {
                    name: "Marketing",
                    value: plData.operatingExpenses.marketing,
                  },
                  {
                    name: "Admin",
                    value: plData.operatingExpenses.administrative,
                  },
                ].filter((item) => item.value > 0)}
              >
                {" "}
                <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="name" />{" "}
                <YAxis
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`}
                />{" "}
                <Tooltip
                  formatter={(value: any) => formatCurrency(value as number)}
                />{" "}
                <Bar dataKey="value" fill="#ef4444" />{" "}
              </BarChart>{" "}
            </ResponsiveContainer>{" "}
          </CardContent>{" "}
        </Card>{" "}
        {/* Margin Trend Chart */}{" "}
        {chartData.length > 0 && (
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-base">
                Profitability Margins (12 Months)
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <ResponsiveContainer width="100%" height={300}>
                {" "}
                <LineChart data={chartData}>
                  {" "}
                  <CartesianGrid strokeDasharray="3 3" />{" "}
                  <XAxis
                    dataKey="periodDate"
                    tickFormatter={(date) =>
                      new Date(date).toLocaleDateString("en-US", {
                        month: "short",
                      })
                    }
                  />{" "}
                  <YAxis
                    tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
                  />{" "}
                  <Tooltip
                    formatter={(value: any) => formatPercent(value as number)}
                  />{" "}
                  <Legend />{" "}
                  <Line
                    type="monotone"
                    dataKey="grossProfitMargin"
                    stroke="#10b981"
                    name="Gross Margin %"
                  />{" "}
                  <Line
                    type="monotone"
                    dataKey="operatingMargin"
                    stroke="#f59e0b"
                    name="Operating Margin %"
                  />{" "}
                  <Line
                    type="monotone"
                    dataKey="netMargin"
                    stroke="#3b82f6"
                    name="Net Margin %"
                  />{" "}
                </LineChart>{" "}
              </ResponsiveContainer>{" "}
            </CardContent>{" "}
          </Card>
        )}{" "}
      </div>{" "}
      {/* Detailed P&L Statement */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>
            Profit & Loss Statement - Detailed Breakdown
          </CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-4">
          {" "}
          {/* Revenue Section */}{" "}
          <PLSection
            title="REVENUE"
            expanded={expandedSection === "revenue"}
            onToggle={() =>
              setExpandedSection(
                expandedSection === "revenue" ? null : "revenue",
              )
            }
          >
            {" "}
            <PLLineItem
              label="Room Revenue"
              value={plData.revenue.roomRevenue}
              parentTotal={plData.revenue.total}
              indent
            />{" "}
            <PLLineItem
              label="Food & Beverage Revenue"
              value={plData.revenue.foodBeverage}
              parentTotal={plData.revenue.total}
              indent
            />{" "}
            <PLLineItem
              label="Other Operating Revenue"
              value={plData.revenue.otherOperatingRevenue}
              parentTotal={plData.revenue.total}
              indent
            />{" "}
            <PLLineItem
              label="Total Revenue"
              value={plData.revenue.total}
              priorValue={plData.priorPeriod?.revenue.total}
              variance={plData.variance?.revenueVariance}
              variancePercent={plData.variance?.revenueVariancePercent}
              isBold
            />{" "}
          </PLSection>{" "}
          {/* Cost of Revenue Section */}{" "}
          <PLSection
            title="COST OF REVENUE"
            expanded={expandedSection === "costOfRevenue"}
            onToggle={() =>
              setExpandedSection(
                expandedSection === "costOfRevenue" ? null : "costOfRevenue",
              )
            }
          >
            {" "}
            <PLLineItem
              label="Cost of Food & Beverage"
              value={plData.costOfRevenue.costOfFoodBeverage}
              parentTotal={plData.revenue.total}
              indent
              isExpense
            />{" "}
            <PLLineItem
              label="Cost of Room Services"
              value={plData.costOfRevenue.costOfRoomServices}
              parentTotal={plData.revenue.total}
              indent
              isExpense
            />{" "}
            <PLLineItem
              label="Other Cost of Revenue"
              value={plData.costOfRevenue.otherCostOfRevenue}
              parentTotal={plData.revenue.total}
              indent
              isExpense
            />{" "}
            <PLLineItem
              label="Total Cost of Revenue"
              value={plData.costOfRevenue.total}
              priorValue={plData.priorPeriod?.costOfRevenue.total}
              parentTotal={plData.revenue.total}
              isExpense
              isBold
            />{" "}
          </PLSection>{" "}
          {/* Gross Profit */}{" "}
          <PLLineItem
            label="GROSS PROFIT"
            value={plData.grossProfit}
            priorValue={plData.priorPeriod?.grossProfit}
            variance={plData.variance?.grossProfitVariance}
            variancePercent={plData.variance?.grossProfitVariancePercent}
            percentOfRevenue={plData.grossProfitMargin}
            isBold
            highlight="success"
          />{" "}
          {/* Operating Expenses Section */}{" "}
          <PLSection
            title="OPERATING EXPENSES"
            expanded={expandedSection === "opex"}
            onToggle={() =>
              setExpandedSection(expandedSection === "opex" ? null : "opex")
            }
          >
            {" "}
            <PLLineItem
              label="Salaries & Wages"
              value={plData.operatingExpenses.salariesAndWages}
              parentTotal={plData.revenue.total}
              indent
              isExpense
            />{" "}
            <PLLineItem
              label="Utilities"
              value={plData.operatingExpenses.utilities}
              parentTotal={plData.revenue.total}
              indent
              isExpense
            />{" "}
            <PLLineItem
              label="Maintenance & Repairs"
              value={plData.operatingExpenses.maintenance}
              parentTotal={plData.revenue.total}
              indent
              isExpense
            />{" "}
            <PLLineItem
              label="Marketing & Advertising"
              value={plData.operatingExpenses.marketing}
              parentTotal={plData.revenue.total}
              indent
              isExpense
            />{" "}
            <PLLineItem
              label="Administrative"
              value={plData.operatingExpenses.administrative}
              parentTotal={plData.revenue.total}
              indent
              isExpense
            />{" "}
            <PLLineItem
              label="Depreciation & Amortization"
              value={plData.operatingExpenses.depreciation}
              parentTotal={plData.revenue.total}
              indent
              isExpense
            />{" "}
            <PLLineItem
              label="Other Operating Expenses"
              value={plData.operatingExpenses.otherOperatingExpenses}
              parentTotal={plData.revenue.total}
              indent
              isExpense
            />{" "}
            <PLLineItem
              label="Total Operating Expenses"
              value={plData.operatingExpenses.total}
              priorValue={plData.priorPeriod?.operatingExpenses.total}
              parentTotal={plData.revenue.total}
              isExpense
              isBold
            />{" "}
          </PLSection>{" "}
          {/* Operating Income */}{" "}
          <PLLineItem
            label="OPERATING INCOME"
            value={plData.operatingIncome}
            priorValue={plData.priorPeriod?.operatingIncome}
            variance={plData.variance?.operatingIncomeVariance}
            variancePercent={plData.variance?.operatingIncomeVariancePercent}
            percentOfRevenue={plData.operatingMargin}
            isBold
            highlight={plData.operatingIncome >= 0 ? "success" : "warning"}
          />{" "}
          {/* Other Income/Expense Section */}{" "}
          {plData.otherIncomeExpense.total !== 0 && (
            <>
              {" "}
              <PLSection
                title="OTHER INCOME (EXPENSE)"
                expanded={expandedSection === "other"}
                onToggle={() =>
                  setExpandedSection(
                    expandedSection === "other" ? null : "other",
                  )
                }
              >
                {" "}
                {plData.otherIncomeExpense.interestIncome > 0 && (
                  <PLLineItem
                    label="Interest Income"
                    value={plData.otherIncomeExpense.interestIncome}
                    parentTotal={plData.revenue.total}
                    indent
                  />
                )}{" "}
                {plData.otherIncomeExpense.interestExpense > 0 && (
                  <PLLineItem
                    label="Interest Expense"
                    value={plData.otherIncomeExpense.interestExpense}
                    parentTotal={plData.revenue.total}
                    indent
                    isExpense
                  />
                )}{" "}
                {plData.otherIncomeExpense.gainOnSale > 0 && (
                  <PLLineItem
                    label="Gain on Sale of Assets"
                    value={plData.otherIncomeExpense.gainOnSale}
                    parentTotal={plData.revenue.total}
                    indent
                  />
                )}{" "}
                {plData.otherIncomeExpense.miscellaneous !== 0 && (
                  <PLLineItem
                    label="Miscellaneous"
                    value={plData.otherIncomeExpense.miscellaneous}
                    parentTotal={plData.revenue.total}
                    indent
                    isExpense={plData.otherIncomeExpense.miscellaneous < 0}
                  />
                )}{" "}
                <PLLineItem
                  label="Total Other Income (Expense)"
                  value={plData.otherIncomeExpense.total}
                  isBold
                />{" "}
              </PLSection>{" "}
            </>
          )}{" "}
          {/* Income Before Tax */}{" "}
          <PLLineItem
            label="INCOME BEFORE TAXES"
            value={plData.incomeBeforeTax}
            percentOfRevenue={plData.incomeBeforeTax / plData.revenue.total}
            isBold
            highlight={plData.incomeBeforeTax >= 0 ? "success" : "warning"}
          />{" "}
          {/* Taxes */}{" "}
          {plData.incomeTax > 0 && (
            <PLLineItem
              label="Income Tax Expense"
              value={plData.incomeTax}
              parentTotal={plData.revenue.total}
              isExpense
            />
          )}{" "}
          {/* Net Income */}{" "}
          <PLLineItem
            label="NET INCOME"
            value={plData.netIncome}
            priorValue={plData.priorPeriod?.netIncome}
            variance={plData.variance?.netIncomeVariance}
            variancePercent={plData.variance?.netIncomeVariancePercent}
            percentOfRevenue={plData.netMargin}
            isBold
            highlight={plData.netIncome >= 0 ? "success" : "error"}
            textSize="lg"
          />{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Variance Analysis (if prior period data exists) */}{" "}
      {hasVariance && plData.variance && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Variance Analysis vs. Prior Period</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-4">
              {" "}
              <div className="grid gap-4 md:grid-cols-2">
                {" "}
                <VarianceItem
                  label="Revenue Variance"
                  amount={plData.variance.revenueVariance}
                  percent={plData.variance.revenueVariancePercent}
                />{" "}
                <VarianceItem
                  label="Gross Profit Variance"
                  amount={plData.variance.grossProfitVariance}
                  percent={plData.variance.grossProfitVariancePercent}
                />{" "}
                <VarianceItem
                  label="Operating Income Variance"
                  amount={plData.variance.operatingIncomeVariance}
                  percent={plData.variance.operatingIncomeVariancePercent}
                />{" "}
                <VarianceItem
                  label="Net Income Variance"
                  amount={plData.variance.netIncomeVariance}
                  percent={plData.variance.netIncomeVariancePercent}
                />{" "}
              </div>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
function MetricCard({
  label,
  value,
  change,
  isPositive,
}: {
  label: string;
  value: number;
  change?: number;
  isPositive?: boolean;
}) {
  return (
    <Card>
      {" "}
      <CardContent className="pt-6">
        {" "}
        <div className="space-y-2">
          {" "}
          <p className="text-sm font-medium text-muted-foreground">
            {label}
          </p>{" "}
          <p className="text-2xl font-bold text-foreground">
            {formatCurrency(value)}
          </p>{" "}
          {change !== undefined && change !== 0 && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm font-medium",
                change >= 0
                  ? isPositive
                    ? "text-emerald-400"
                    : "text-red-400"
                  : isPositive
                    ? "text-red-400"
                    : "text-emerald-400",
              )}
            >
              {" "}
              {change >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}{" "}
              {formatPercent(change)}{" "}
            </div>
          )}{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
function PLSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {" "}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 text-left font-semibold text-foreground hover:bg-surface-variant/30 p-2 rounded transition"
      >
        {" "}
        <span className={`text-xs transition ${expanded ? "rotate-90" : ""}`}>
          ▶
        </span>{" "}
        {title}{" "}
      </button>{" "}
      {expanded && <div className="pl-4 space-y-1">{children}</div>}{" "}
    </div>
  );
}
function PLLineItem({
  label,
  value,
  priorValue,
  variance,
  variancePercent,
  parentTotal,
  percentOfRevenue,
  indent = false,
  isExpense = false,
  isBold = false,
  highlight,
  textSize = "base",
}: {
  label: string;
  value: number;
  priorValue?: number;
  variance?: number;
  variancePercent?: number;
  parentTotal?: number;
  percentOfRevenue?: number;
  indent?: boolean;
  isExpense?: boolean;
  isBold?: boolean;
  highlight?: "success" | "warning" | "error";
  textSize?: "base" | "lg";
}) {
  const percentOfTotal = parentTotal ? (value / parentTotal) * 100 : null;
  const bgColor = highlight
    ? highlight === "success"
      ? "bg-emerald-500/10"
      : highlight === "warning"
        ? "bg-amber-500/10"
        : "bg-red-500/10"
    : isBold
      ? "bg-surface-variant/40"
      : "";
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 rounded transition",
        indent && "ml-4",
        bgColor,
        isBold && "border-t border-b border-border/40",
      )}
    >
      {" "}
      <div className="flex-1">
        {" "}
        <p
          className={cn(
            "text-foreground",
            isBold ? "font-bold" : "font-medium",
            textSize === "lg" && "text-lg",
          )}
        >
          {" "}
          {label}{" "}
        </p>{" "}
        {percentOfTotal !== null && (
          <p className="text-xs text-muted-foreground">
            {" "}
            {percentOfTotal.toFixed(1)}% of revenue{" "}
          </p>
        )}{" "}
      </div>{" "}
      <div className="flex items-center gap-6">
        {" "}
        {priorValue !== undefined && (
          <div className="text-right">
            {" "}
            <p className="text-xs text-muted-foreground">Prior Period</p>{" "}
            <p className="text-sm font-medium text-foreground">
              {" "}
              {formatCurrency(priorValue)}{" "}
            </p>{" "}
          </div>
        )}{" "}
        <div className="text-right min-w-[120px]">
          {" "}
          <p
            className={cn(
              isBold ? "font-bold text-lg" : "font-medium",
              isExpense ? "text-red-400" : "text-emerald-400",
            )}
          >
            {" "}
            {formatCurrency(value)}{" "}
          </p>{" "}
          {percentOfRevenue !== undefined && (
            <p className="text-xs text-muted-foreground">
              {" "}
              {formatPercent(percentOfRevenue)}{" "}
            </p>
          )}{" "}
        </div>{" "}
        {variance !== undefined && variance !== 0 && (
          <div className="text-right min-w-[100px]">
            {" "}
            <p
              className={cn(
                "text-sm font-medium",
                variance >= 0
                  ? isExpense
                    ? "text-emerald-400"
                    : "text-emerald-400"
                  : isExpense
                    ? "text-red-400"
                    : "text-red-400",
              )}
            >
              {" "}
              {variance >= 0 ? "+" : ""}
              {formatCurrency(variance)}{" "}
            </p>{" "}
            {variancePercent !== undefined && (
              <p className="text-xs text-muted-foreground">
                {" "}
                ({variancePercent >= 0 ? "+" : ""}
                {formatPercent(variancePercent)}){" "}
              </p>
            )}{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
function VarianceItem({
  label,
  amount,
  percent,
}: {
  label: string;
  amount: number;
  percent: number;
}) {
  const isPositive = amount >= 0;
  return (
    <div
      className={cn(
        "p-4 rounded-lg border",
        isPositive
          ? "border-emerald-500/30 bg-emerald-500/10"
          : "border-red-500/30 bg-red-500/10",
      )}
    >
      {" "}
      <p className="text-sm font-medium text-muted-foreground">{label}</p>{" "}
      <div className="flex items-center gap-2 mt-2">
        {" "}
        <p
          className={cn(
            "text-2xl font-bold",
            isPositive ? "text-emerald-400" : "text-red-400",
          )}
        >
          {" "}
          {formatCurrency(amount)}{" "}
        </p>{" "}
        <div
          className={cn(
            "flex items-center gap-1 text-sm font-medium",
            isPositive ? "text-emerald-400" : "text-red-400",
          )}
        >
          {" "}
          {isPositive ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}{" "}
          {formatPercent(Math.abs(percent))}{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
export default ProfitAndLossReport;
