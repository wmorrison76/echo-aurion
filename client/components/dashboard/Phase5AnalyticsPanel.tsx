import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, TrendingUp, TrendingDown, Award } from "lucide-react";
import { cn } from "@/lib/glass";

export interface DepartmentAnalytics {
  departmentId: string;
  departmentName: string;
  eventsAnalyzed: number;
  avgHoursVariance: number;
  avgCostVariance: number;
  avgProductivityScore: number;
  overallEfficiencyIndex: number;
}

export interface Phase5AnalyticsPanelProps {
  departmentId: string;
  departmentName: string;
  className?: string;
  compact?: boolean;
}

const getVarianceColor = (variance: number): string => {
  if (variance < -20) return "text-green-600"; // Better than estimate
  if (variance < 0) return "text-blue-600"; // Slightly better
  if (variance < 20) return "text-amber-600"; // Slightly over
  return "text-red-600"; // Significantly over
};

const getEfficiencyColor = (efficiency: number): string => {
  if (efficiency >= 90) return "bg-green-100 text-green-800";
  if (efficiency >= 75) return "bg-blue-100 text-blue-800";
  if (efficiency >= 60) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
};

export function Phase5AnalyticsPanel({
  departmentId,
  departmentName,
  className,
  compact = false,
}: Phase5AnalyticsPanelProps) {
  const [analytics, setAnalytics] = useState<DepartmentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/phase5/analytics/department/${departmentId}`,
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const data = await response.json();
        setAnalytics(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [departmentId]);

  if (compact) {
    // Compact mobile view
    if (loading || !analytics) {
      return (
        <div className="p-2 text-center text-xs text-muted-foreground">
          {loading ? "Loading..." : "No data"}
        </div>
      );
    }

    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Productivity:</span>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              analytics.avgProductivityScore >= 80
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-700",
            )}
          >
            {analytics.avgProductivityScore.toFixed(0)}%
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Efficiency:</span>
          <Badge
            className={cn(
              "text-xs",
              getEfficiencyColor(analytics.overallEfficiencyIndex),
            )}
          >
            {analytics.overallEfficiencyIndex.toFixed(0)}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Events:</span>
          <span className="font-semibold">{analytics.eventsAnalyzed}</span>
        </div>
      </div>
    );
  }

  // Full view
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {departmentName} Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="text-center text-sm text-muted-foreground">
            Loading analytics...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && analytics && (
          <>
            {/* Productivity Score */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">
                  Productivity Score
                </span>
                <span
                  className={cn(
                    "text-lg font-bold",
                    getVarianceColor(100 - analytics.avgProductivityScore),
                  )}
                >
                  {analytics.avgProductivityScore.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={analytics.avgProductivityScore}
                className="h-2"
              />
              <p className="text-xs text-muted-foreground">
                {analytics.avgProductivityScore >= 80
                  ? "Excellent - consistently on target"
                  : analytics.avgProductivityScore >= 60
                    ? "Good - minor variance"
                    : "Needs improvement - significant variance"}
              </p>
            </div>

            {/* Efficiency Index */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Efficiency Index</span>
                <Badge
                  className={cn(
                    "text-sm",
                    getEfficiencyColor(analytics.overallEfficiencyIndex),
                  )}
                >
                  <Award className="h-3 w-3 mr-1" />
                  {analytics.overallEfficiencyIndex.toFixed(1)}
                </Badge>
              </div>
              <Progress
                value={Math.min(analytics.overallEfficiencyIndex, 100)}
                className="h-2"
              />
            </div>

            {/* Hours Variance */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold flex items-center gap-2">
                  {analytics.avgHoursVariance > 0 ? (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  )}
                  Hours Variance
                </span>
                <span
                  className={cn(
                    "text-sm font-bold",
                    getVarianceColor(analytics.avgHoursVariance),
                  )}
                >
                  {analytics.avgHoursVariance > 0 ? "+" : ""}
                  {analytics.avgHoursVariance.toFixed(1)}h
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {Math.abs(analytics.avgHoursVariance) < 1
                  ? "Excellent estimation accuracy"
                  : `${Math.abs(analytics.avgHoursVariance).toFixed(1)} hours ${analytics.avgHoursVariance > 0 ? "over" : "under"} estimate on average`}
              </p>
            </div>

            {/* Cost Variance */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold">Cost Variance</span>
                <span
                  className={cn(
                    "text-sm font-bold",
                    getVarianceColor(analytics.avgCostVariance),
                  )}
                >
                  {analytics.avgCostVariance > 0 ? "+" : ""}$
                  {Math.abs(analytics.avgCostVariance).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Labor cost deviation from estimates
              </p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold">{analytics.eventsAnalyzed}</p>
                <p className="text-xs text-muted-foreground">Events Analyzed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {analytics.avgProductivityScore >= 80
                    ? "A"
                    : analytics.avgProductivityScore >= 70
                      ? "B"
                      : "C"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Department Grade
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default Phase5AnalyticsPanel;
