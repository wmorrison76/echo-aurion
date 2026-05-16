import React, { useMemo } from "react";
import { useRDLabStore } from "@/stores/rdLabStore";
import {
  calculateDashboardMetrics,
  type MetricsPeriod,
} from "@/lib/dashboard-metrics";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  TrendingUp,
  Zap,
  Calendar,
  PlusCircle,
  BarChart3,
  Clock,
  CheckCircle,
  Beaker,
} from "lucide-react";

interface DashboardQuickAccessPanelProps {
  period?: MetricsPeriod;
  onNewExperiment?: () => void;
  onViewAnalytics?: () => void;
}

export function DashboardQuickAccessPanel({
  period = "30d",
  onNewExperiment,
  onViewAnalytics,
}: DashboardQuickAccessPanelProps) {
  const { experiments } = useRDLabStore();

  const metrics = useMemo(() => {
    try {
      return calculateDashboardMetrics(experiments || [], period);
    } catch (error) {
      console.error("Quick access metrics error:", error);
      return calculateDashboardMetrics([], period);
    }
  }, [experiments, period]);

  // Empty state
  if (!experiments || experiments.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
        <Card className="border border-border dark:border-slate-800 bg-card p-6 lg:col-span-3">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Beaker className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Ready to start experimenting?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Create your first experiment to unlock the full power of R&D Labs
            </p>
            <Button onClick={onNewExperiment} className="gap-2" size="sm">
              <PlusCircle className="h-4 w-4" />
              Create First Experiment
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-full">
      {/* Quick Actions */}
      <Card className="border border-border dark:border-slate-800 bg-card p-6 lg:col-span-1">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h3>
        <div className="space-y-3">
          <Button onClick={onNewExperiment} className="w-full gap-2" size="sm">
            <PlusCircle className="h-4 w-4" />
            New Experiment
          </Button>
          <Button
            onClick={onViewAnalytics}
            variant="outline"
            className="w-full gap-2"
            size="sm"
          >
            <BarChart3 className="h-4 w-4" />
            Full Analytics
          </Button>
          <Button variant="outline" className="w-full gap-2" size="sm">
            <Calendar className="h-4 w-4" />
            View Timeline
          </Button>
        </div>
      </Card>

      {/* Supply Risk Alerts */}
      <Card className="border border-border dark:border-slate-800 bg-card p-6 lg:col-span-1">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Supply Alerts
        </h3>
        {metrics.ingredients.supplyRisks.length > 0 ? (
          <div className="space-y-3">
            {metrics.ingredients.supplyRisks.slice(0, 3).map((risk, idx) => (
              <div
                key={idx}
                className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-500/30 rounded-lg"
              >
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  {risk.name}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  {risk.mitigation}
                </p>
                <div className="mt-2 text-xs">
                  <span
                    className={`inline-block px-2 py-1 rounded font-medium ${
                      risk.riskLevel === "high"
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                        : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                    }`}
                  >
                    {risk.riskLevel.charAt(0).toUpperCase() +
                      risk.riskLevel.slice(1)}{" "}
                    Risk
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-500/30 rounded-lg text-center">
            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm text-green-700 dark:text-green-300">
              No supply risks detected
            </p>
          </div>
        )}
      </Card>

      {/* Trending Insights */}
      <Card className="border border-border dark:border-slate-800 bg-card p-6 lg:col-span-1">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-[#c8a97e]" />
          Trending Insights
        </h3>
        <div className="space-y-3">
          {[
            {
              icon: TrendingUp,
              title: "Deployment Momentum",
              detail: `${metrics.experiments.deploymentRate.toFixed(1)}% of ready experiments deployed`,
              highlight: "bg-green-50 dark:bg-green-900/20",
              textColor: "text-green-700 dark:text-green-300",
            },
            {
              icon: Clock,
              title: "Pipeline Velocity",
              detail: `Avg ${metrics.experiments.averageTimeToReady} days ideation → ready`,
              highlight: "bg-blue-50 dark:bg-blue-900/20",
              textColor: "text-blue-700 dark:text-blue-300",
            },
            {
              icon: TrendingUp,
              title: "Cost Optimization",
              detail: `${metrics.financialImpact.avgPortionCostReduction.toFixed(1)}% avg portion cost reduction`,
              highlight: "bg-amber-50 dark:bg-amber-900/20",
              textColor: "text-amber-700 dark:text-amber-300",
            },
          ].map((insight, idx) => {
            const Icon = insight.icon;
            return (
              <div
                key={idx}
                className={`p-3 ${insight.highlight} border border-slate-200/30 dark:border-[#c8a97e]/10 rounded-lg`}
              >
                <div className="flex items-start gap-3">
                  <Icon
                    className={`h-5 w-5 ${insight.textColor} flex-shrink-0 mt-0.5`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${insight.textColor}`}>
                      {insight.title}
                    </p>
                    <p
                      className={`text-xs ${insight.textColor} opacity-75 mt-1`}
                    >
                      {insight.detail}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Top Ingredients by Usage */}
      <Card className="border border-border dark:border-slate-800 bg-card p-6 lg:col-span-1">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Most Used Ingredients
        </h3>
        <div className="space-y-2">
          {metrics.ingredients.mostUsed.slice(0, 5).map((ingredient, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 bg-muted/50 dark:bg-slate-800/30 rounded-lg"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {ingredient.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {ingredient.count} experiments
                </p>
              </div>
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                  ingredient.volatilityTier === "critical"
                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                    : ingredient.volatilityTier === "high"
                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                      : ingredient.volatilityTier === "moderate"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                        : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                }`}
              >
                {ingredient.volatilityTier}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Upcoming Milestones */}
      <Card className="border border-border dark:border-slate-800 bg-card p-6 lg:col-span-1">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Upcoming Milestones
        </h3>
        {metrics.timeline.projectedCompletionDates.length > 0 ? (
          <div className="space-y-2">
            {metrics.timeline.projectedCompletionDates
              .slice(0, 3)
              .map((milestone) => {
                const daysUntil = Math.ceil(
                  (milestone.estimatedDate.getTime() - new Date().getTime()) /
                    (1000 * 60 * 60 * 24),
                );
                return (
                  <div
                    key={milestone.experimentId}
                    className="p-3 bg-muted/50 dark:bg-slate-800/30 rounded-lg border border-border dark:border-slate-700"
                  >
                    <p className="text-sm font-medium text-foreground line-clamp-1">
                      {milestone.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {daysUntil > 0 ? `In ${daysUntil} days` : "Due soon"}
                    </p>
                  </div>
                );
              })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No active milestones
          </p>
        )}
      </Card>

      {/* Team Performance Snapshot */}
      <Card className="border border-border dark:border-slate-800 bg-card p-6 lg:col-span-1">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Team Performance
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Task Status
              </span>
              <span className="text-xs text-muted-foreground opacity-75">
                {metrics.teamPerformance.tasksOnTrack}/{" "}
                {metrics.teamPerformance.tasksOnTrack +
                  metrics.teamPerformance.tasksOverdue}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600"
                style={{
                  width: `${
                    (metrics.teamPerformance.tasksOnTrack /
                      (metrics.teamPerformance.tasksOnTrack +
                        metrics.teamPerformance.tasksOverdue)) *
                    100
                  }%`,
                }}
              />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Top Contributors
            </p>
            <div className="space-y-1">
              {metrics.teamPerformance.topContributors
                .slice(0, 3)
                .map((contributor) => (
                  <div
                    key={contributor.name}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted-foreground">
                      {contributor.name}
                    </span>
                    <span className="font-medium text-foreground">
                      {contributor.experimentsOwned}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
