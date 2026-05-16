/**
 * Risk Dashboard Component - Enhanced UI/UX
 * Professional financial intelligence display
 */

import React from "react";
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  DollarSign,
  CheckCircle,
} from "lucide-react";
import type { Financial, Shortage, Event, Conflict } from "../types";
import { cn } from "@/lib/glass";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface RiskDashboardProps {
  financials: Financial[];
  shortages: Shortage[];
  conflicts: Conflict[];
  events: Event[];
}

export function RiskDashboard({
  financials,
  shortages,
  conflicts,
  events,
}: RiskDashboardProps) {
  const metrics = React.useMemo(() => {
    const totalRevenue = financials.reduce(
      (sum, f) => sum + f.projectedRevenue,
      0,
    );
    const totalCost = financials.reduce((sum, f) => sum + f.projectedCost, 0);
    const totalMargin = totalRevenue - totalCost;
    const avgMarginPercent =
      financials.length > 0
        ? financials.reduce((sum, f) => sum + f.margin_percentage, 0) /
          financials.length
        : 0;
    const avgRiskScore =
      financials.length > 0
        ? financials.reduce((sum, f) => sum + f.riskScore, 0) /
          financials.length
        : 0;
    const criticalShortages = shortages.filter(
      (s) => s.severity === "critical",
    ).length;
    const highRiskEvents = financials.filter((f) => f.riskScore > 0.7).length;

    return {
      totalRevenue,
      totalCost,
      totalMargin,
      avgMarginPercent,
      avgRiskScore,
      criticalShortages,
      highRiskEvents,
    };
  }, [financials, shortages]);

  const getRiskLevel = (
    score: number,
  ): "low" | "medium" | "high" | "critical" => {
    if (score < 0.3) return "low";
    if (score < 0.6) return "medium";
    if (score < 0.8) return "high";
    return "critical";
  };

  const getRiskColor = (
    level: "low" | "medium" | "high" | "critical",
  ): string => {
    switch (level) {
      case "low":
        return "text-green-600 bg-green-500/10 border-green-500/30";
      case "medium":
        return "text-amber-600 bg-amber-500/10 border-amber-500/30";
      case "high":
        return "text-orange-600 bg-orange-500/10 border-orange-500/30";
      case "critical":
        return "text-red-600 bg-red-500/10 border-red-500/30";
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const riskLevel = getRiskLevel(metrics.avgRiskScore);

  return (
    <Card className="border-border/20 bg-background/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-foreground">
              Financial Intelligence
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Real-time financial metrics and risk analysis
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Revenue */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground/60">
                Revenue
              </span>
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(metrics.totalRevenue)}
            </p>
            <p className="text-xs text-foreground/50 mt-1">
              {financials.length} event{financials.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Cost */}
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground/60">
                Cost
              </span>
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(metrics.totalCost)}
            </p>
            <p className="text-xs text-foreground/50 mt-1">
              {metrics.totalRevenue > 0
                ? `${((metrics.totalCost / metrics.totalRevenue) * 100).toFixed(1)}% of revenue`
                : "—"}
            </p>
          </div>

          {/* Margin */}
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground/60">
                Margin
              </span>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(metrics.totalMargin)}
            </p>
            <p className="text-xs text-green-600 font-medium mt-1">
              {metrics.avgMarginPercent.toFixed(1)}% average
            </p>
          </div>

          {/* Risk Score */}
          <div className={cn("rounded-lg border p-3", getRiskColor(riskLevel))}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-foreground/60">
                Risk Score
              </span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <p className="text-xl font-bold text-foreground">
              {(metrics.avgRiskScore * 100).toFixed(0)}%
            </p>
            <div className="mt-1">
              <Badge
                variant="outline"
                className={cn("text-xs font-medium", getRiskColor(riskLevel))}
              >
                {riskLevel.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Alerts & Issues
          </h4>

          {/* Critical Shortages */}
          {metrics.criticalShortages > 0 && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-700">
                    {metrics.criticalShortages} Critical Shortage
                    {metrics.criticalShortages > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-red-600">
                    Inventory items below minimum levels
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* High Risk Events */}
          {metrics.highRiskEvents > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-700">
                    {metrics.highRiskEvents} Event
                    {metrics.highRiskEvents > 1 ? "s" : ""} at High Risk
                  </p>
                  <p className="text-xs text-amber-600">
                    Financial risk score above 70%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Conflicts */}
          {conflicts.length > 0 && (
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-orange-700">
                    {conflicts.length} Conflict{conflicts.length > 1 ? "s" : ""}{" "}
                    Detected
                  </p>
                  <p className="text-xs text-orange-600">
                    Space, time, or resource conflicts
                  </p>
                </div>
              </div>
            </div>
          )}

          {metrics.criticalShortages === 0 &&
            metrics.highRiskEvents === 0 &&
            conflicts.length === 0 && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-700">
                    All Systems Normal
                  </p>
                </div>
                <p className="text-xs text-green-600">No critical alerts</p>
              </div>
            )}
        </div>

        {/* Top Risk Events */}
        {financials.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">
              Top Risk Events
            </h4>
            <div className="space-y-1">
              {financials
                .sort((a, b) => b.riskScore - a.riskScore)
                .slice(0, 3)
                .map((fin) => {
                  const event = events.find((e) => e.id === fin.eventId);
                  const eventRiskLevel = getRiskLevel(fin.riskScore);
                  return (
                    <div
                      key={fin.eventId}
                      className="rounded-lg border border-border/20 bg-background/40 p-2.5 hover:bg-background/60 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground truncate flex-1">
                          {event?.name || "Unknown Event"}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-medium ml-2",
                            getRiskColor(eventRiskLevel),
                          )}
                        >
                          {(fin.riskScore * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RiskDashboard;
