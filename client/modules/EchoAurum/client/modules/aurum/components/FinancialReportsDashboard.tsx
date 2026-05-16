import React from "react";

import { Calendar, Download, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { fetchWithLucccaSession } from "../../auth";

type ReportType =
  | "trial_balance"
  | "balance_sheet"
  | "income_statement"
  | "cash_flow";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export function FinancialReportsDashboard() {
  const [reportType, setReportType] =
    React.useState<ReportType>("income_statement");
  const [entityId, setEntityId] = React.useState("ent_hotel_main");
  const [periodDate, setPeriodDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [startDate, setStartDate] = React.useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = React.useState(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = React.useState(false);
  const [reportData, setReportData] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleGenerateReport = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/aurum/reports/${reportType}?entityId=${encodeURIComponent(entityId)}`;
      if (reportType === "trial_balance" || reportType === "balance_sheet") {
        url += `&periodDate=${encodeURIComponent(periodDate)}`;
      } else {
        url += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }

      const response = await fetchWithLucccaSession(url);
      if (!response.ok) throw new Error("Failed to generate report");
      const data = await response.json();
      setReportData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [endDate, entityId, periodDate, reportType, startDate]);

  const headerSummary = React.useMemo(() => {
    if (!reportData) return null;
    if (reportType === "trial_balance") {
      const sum = reportData?.summary;
      return sum
        ? {
            primary: `Debits: ${formatCurrency(sum.totalDebits || 0)}`,
            secondary: `Credits: ${formatCurrency(sum.totalCredits || 0)}`,
            ok: Boolean(sum.isBalanced),
          }
        : null;
    }
    if (reportType === "income_statement") {
      return {
        primary: `Revenue: ${formatCurrency(reportData?.totalRevenue || 0)}`,
        secondary: `Net income: ${formatCurrency(reportData?.netIncome || 0)}`,
        ok: true,
      };
    }
    if (reportType === "balance_sheet") {
      return {
        primary: `Assets: ${formatCurrency(reportData?.summary?.assets?.current || 0)}`,
        secondary: `Balanced: ${String(Boolean(reportData?.summary?.isBalanced))}`,
        ok: Boolean(reportData?.summary?.isBalanced),
      };
    }
    if (reportType === "cash_flow") {
      return {
        primary: `Net cash flow: ${formatCurrency(reportData?.summary?.netCashFlow || 0)}`,
        secondary: `Operating: ${formatCurrency(reportData?.summary?.operatingCashFlow || 0)}`,
        ok: true,
      };
    }
    return null;
  }, [reportData, reportType]);

  return (
    <div className="w-full bg-background rounded-lg border border-gray-200 shadow-sm">
      <div className="border-b border-gray-200 px-4 md:px-6 py-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">
          Financial Reports
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {(
            [
              { id: "income_statement", label: "P&L Statement", icon: "📊" },
              { id: "balance_sheet", label: "Balance Sheet", icon: "⚖️" },
              { id: "trial_balance", label: "Trial Balance", icon: "✓" },
              { id: "cash_flow", label: "Cash Flow", icon: "💰" },
            ] as const
          ).map((report) => (
            <button
              key={report.id}
              onClick={() => setReportType(report.id)}
              className={cn(
                "p-2 rounded-lg border text-xs md:text-sm font-medium transition-colors",
                reportType === report.id
                  ? "bg-blue-50 border-primary text-blue-700"
                  : "bg-background border-gray-200 text-foreground hover:bg-surface",
              )}
            >
              <span className="mr-1">{report.icon}</span>
              {report.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Entity
            </label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ent_hotel_main">Main Hotel</SelectItem>
                <SelectItem value="ent_spa">Spa</SelectItem>
                <SelectItem value="ent_restaurant">Restaurant</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {reportType === "trial_balance" || reportType === "balance_sheet" ? (
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Period Date
              </label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={periodDate}
                  onChange={(e) => setPeriodDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
                />
              </div>
            </div>
          ) : (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Start Date
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  End Date
                </label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 px-3 py-2 border border-border rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleGenerateReport}
            disabled={loading}
            className="gap-2"
          >
            {loading ? "Generating..." : "Generate Report"}{" "}
            <TrendingUp className="h-4 w-4" />
          </Button>
          {reportData ? (
            <Button variant="outline" className="gap-2" disabled>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          ) : null}
        </div>
      </div>

      <div>
        {error ? (
          <div className="p-4 md:p-6 bg-red-50 border-b border-red-200 text-red-700">
            Error: {error}
          </div>
        ) : null}

        {!reportData ? (
          <div className="p-12 text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Generate a report to get started</p>
          </div>
        ) : (
          <div className="p-4 md:p-6 space-y-4">
            {headerSummary ? (
              <div
                className={cn(
                  "rounded-lg border p-3 text-sm font-medium",
                  headerSummary.ok
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{headerSummary.primary}</span>
                  <span className="text-muted-foreground">
                    {headerSummary.secondary}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border bg-surface p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Raw report payload
              </div>
              <pre className="text-xs overflow-auto max-h-[60vh] whitespace-pre-wrap">
                {JSON.stringify(reportData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
