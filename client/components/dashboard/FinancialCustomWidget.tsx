import React, { useEffect, useState } from "react";
import { cn } from "@/lib/glass";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import type { FinancialCustomWidget } from "./FinancialCustomWidgetBuilder";

interface FinancialDataRow {
  outlet_id: string;
  outlet_name: string;
  period: string;
  metrics: Record<string, number>;
  comparison?: {
    budget?: Record<string, number>;
    prior_year?: Record<string, number>;
    prior_period?: Record<string, number>;
  };
  last_updated: string;
}

interface MetricConfig {
  label: string;
  type: "currency" | "percentage" | "count";
}

const METRIC_CONFIGS: Record<string, MetricConfig> = {
  revenue: { label: "Revenue", type: "currency" },
  cogs: { label: "COGS", type: "currency" },
  gross_profit: { label: "Gross Profit", type: "currency" },
  gross_margin_percent: { label: "Gross Margin %", type: "percentage" },
  labor_cost: { label: "Labor Cost", type: "currency" },
  labor_cost_percent: { label: "Labor Cost %", type: "percentage" },
  overhead_cost: { label: "Overhead", type: "currency" },
  operating_expense: { label: "Operating Expense", type: "currency" },
  operating_income: { label: "Operating Income", type: "currency" },
  net_income: { label: "Net Income", type: "currency" },
  transaction_count: { label: "Transactions", type: "count" },
  covers_served: { label: "Covers", type: "count" },
  average_check: { label: "Avg Check", type: "currency" },
};

interface FinancialCustomWidgetProps {
  config: FinancialCustomWidget;
  minimized?: boolean;
  showHeader?: boolean;
  title?: string;
  icon?: string;
  widgetId?: string;
  userId?: string;
  onMinimize?: () => void;
  onPin?: () => void;
  onDetach?: () => void;
  isPinned?: boolean;
}

export function FinancialCustomWidget({
  config,
  minimized = false,
  showHeader = false,
  title,
  icon = "💰",
  widgetId,
  userId,
}: FinancialCustomWidgetProps) {
  const [data, setData] = useState<FinancialDataRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchFinancialData();
    const interval = setInterval(fetchFinancialData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [config]);

  const fetchFinancialData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/financial-data-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_ids: config.selectedOutlets,
          metrics: config.selectedMetrics,
          period: {
            type: config.selectedPeriod.type,
            start_date:
              config.selectedPeriod.startDate ||
              `${config.selectedPeriod.fiscalYear}-${String(config.selectedPeriod.fiscalPeriod).padStart(2, "0")}-01`,
            end_date: new Date().toISOString().split("T")[0],
            fiscal_year: config.selectedPeriod.fiscalYear,
            fiscal_period: config.selectedPeriod.fiscalPeriod,
          },
          drill_down_level: config.drillDownLevel,
          include_comparisons: config.includeComparisons,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch financial data");
      }

      const result = await response.json();
      setData(result.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  const formatValue = (
    value: number,
    type: "currency" | "percentage" | "count",
  ): string => {
    if (type === "currency") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }

    if (type === "percentage") {
      return `${value.toFixed(1)}%`;
    }

    return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  };

  const getVarianceIndicator = (actual: number, comparison?: number) => {
    if (!comparison) return null;
    const variance = actual - comparison;
    const variancePercent = (variance / Math.abs(comparison)) * 100;

    if (variancePercent > 0) {
      return {
        icon: TrendingUp,
        color: "text-green-500",
        text: `+${variancePercent.toFixed(1)}%`,
      };
    } else if (variancePercent < 0) {
      return {
        icon: TrendingDown,
        color: "text-red-500",
        text: `${variancePercent.toFixed(1)}%`,
      };
    }

    return null;
  };

  if (minimized) {
    return (
      <div className="flex items-center justify-center min-h-[60px] text-foreground/40">
        <span className="text-xs">{config.name}</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-background/40 to-background/20">
      {/* Header */}
      {showHeader && (
        <div className="border-b border-border/30 px-3 py-2 flex items-center justify-between bg-gradient-to-r from-primary/10 to-transparent">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <span>{icon}</span>
            {title || config.name}
          </h3>
          {lastUpdated && (
            <span className="text-xs text-foreground/40">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {isLoading && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <div className="inline-block animate-spin mb-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
              </div>
              <p className="text-xs text-foreground/60">
                Loading financial data...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span className="text-xs">{error}</span>
          </div>
        )}

        {!isLoading && !error && data.length === 0 && (
          <div className="flex items-center justify-center min-h-[200px] text-center">
            <div>
              <p className="text-sm text-foreground/60 mb-2">
                No data available
              </p>
              <p className="text-xs text-foreground/40">
                Check your outlet and metric selections
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && data.length > 0 && (
          <div className="space-y-4">
            {data.map((row) => (
              <div key={row.outlet_id} className="space-y-2">
                {/* Outlet Header */}
                <div className="flex items-center justify-between px-2">
                  <h4 className="font-medium text-xs text-foreground">
                    {row.outlet_name}
                  </h4>
                  <span className="text-xs text-foreground/40">
                    {row.period}
                  </span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-2">
                  {config.selectedMetrics.map((metricId) => {
                    const metricConfig = METRIC_CONFIGS[metricId];
                    if (!metricConfig) return null;

                    const value = row.metrics[metricId] ?? 0;
                    const budgetValue = row.comparison?.budget?.[metricId];
                    const priorYearValue =
                      row.comparison?.prior_year?.[metricId];

                    let comparisonValue = undefined;
                    let comparisonLabel = "";

                    if (
                      config.includeComparisons.budget &&
                      budgetValue !== undefined
                    ) {
                      comparisonValue = budgetValue;
                      comparisonLabel = "Budget";
                    } else if (
                      config.includeComparisons.priorYear &&
                      priorYearValue !== undefined
                    ) {
                      comparisonValue = priorYearValue;
                      comparisonLabel = "Prior Year";
                    }

                    const variance = getVarianceIndicator(
                      value,
                      comparisonValue,
                    );
                    const VarianceIcon = variance?.icon;

                    return (
                      <div
                        key={metricId}
                        className="bg-background/40 border border-border/30 rounded-lg p-2 hover:border-border/50 transition-colors"
                      >
                        <div className="text-xs text-foreground/60 mb-1">
                          {metricConfig.label}
                        </div>
                        <div className="flex items-baseline justify-between gap-1">
                          <div className="text-sm font-semibold text-foreground">
                            {formatValue(value, metricConfig.type)}
                          </div>
                          {variance && VarianceIcon && (
                            <div
                              className={cn(
                                "flex items-center gap-0.5",
                                variance.color,
                              )}
                            >
                              <VarianceIcon size={12} />
                              <span className="text-xs font-medium">
                                {variance.text}
                              </span>
                            </div>
                          )}
                        </div>
                        {comparisonLabel && comparisonValue !== undefined && (
                          <div className="text-xs text-foreground/40 mt-1">
                            {comparisonLabel}:{" "}
                            {formatValue(comparisonValue, metricConfig.type)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
