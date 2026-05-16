import React, { useMemo } from "react";
import { useRDLabStore } from "@/stores/rdLabStore";
import {
  calculateDashboardMetrics,
  type MetricsPeriod,
} from "@/lib/dashboard-metrics";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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
import { TrendingUp, Target, Users, Leaf, DollarSign } from "lucide-react";

interface DashboardAnalyticsPanelProps {
  period?: MetricsPeriod;
}

export function DashboardAnalyticsPanel({
  period = "30d",
}: DashboardAnalyticsPanelProps) {
  const { experiments } = useRDLabStore();

  const metrics = useMemo(() => {
    try {
      return calculateDashboardMetrics(experiments || [], period);
    } catch (error) {
      console.error("Analytics dashboard metrics error:", error);
      return calculateDashboardMetrics([], period);
    }
  }, [experiments, period]);

  // Prepare chart data
  const pipelineData = useMemo(() => {
    const stages = [
      { name: "Ideation", value: metrics.experiments.byStatus.ideation, color: "#64748b" },
      { name: "Testing", value: metrics.experiments.byStatus.testing, color: "#3b82f6" },
      { name: "Ready", value: metrics.experiments.byStatus.ready, color: "#10b981" },
      { name: "Deployed", value: metrics.experiments.byStatus.deployed, color: "#a855f7" },
    ];
    return stages.filter((s) => s.value > 0);
  }, [metrics]);

  const timelineData = useMemo(() => {
    return metrics.timeline.bottlenecks.map((bottleneck) => ({
      stage: bottleneck.stage.split(" → ")[0].substring(0, 12),
      duration: bottleneck.averageDuration,
      variance: bottleneck.variance,
    }));
  }, [metrics.timeline]);

  const specialization = useMemo(() => {
    return [
      {
        name: "Culinary",
        value: metrics.experiments.culinaryVsPastry.culinary,
        color: "#c8a97e",
      },
      {
        name: "Pastry",
        value: metrics.experiments.culinaryVsPastry.pastry,
        color: "#f59e0b",
      },
      {
        name: "Combined",
        value: metrics.experiments.culinaryVsPastry.both,
        color: "#8b5cf6",
      },
    ].filter((s) => s.value > 0);
  }, [metrics]);

  const ingredientCostTrends = useMemo(() => {
    return metrics.ingredients.costVarianceDetected.slice(0, 5).map((ing) => ({
      ingredient: ing.name.substring(0, 10),
      variance: ing.variance,
      trend: ing.trend === "increasing" ? 1 : ing.trend === "decreasing" ? -1 : 0,
    }));
  }, [metrics.ingredients]);

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-[#c8a97e]/80">
          Analytics Dashboard
        </h2>
        <p className="text-sm text-slate-500 dark:text-[#c8a97e]/60 mt-1">
          In-depth metrics and performance analysis
        </p>
      </div>

      {/* Key Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Success Rate"
          value={`${Math.round(metrics.experiments.successRate)}%`}
          icon={Target}
          detail={`${metrics.experiments.byStatus.ready + metrics.experiments.byStatus.deployed} ready/deployed`}
          bgGradient="from-amber-50 to-white/80 dark:from-[#c8a97e]/30/20 dark:to-[#c8a97e]/40/20"
          iconColor="text-[#c8a97e] dark:text-[#c8a97e]"
        />
        <SummaryCard
          title="Collaboration"
          value={`${metrics.teamPerformance.activeContributors}`}
          icon={Users}
          detail="active contributors"
          bgGradient="from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <SummaryCard
          title="Cost Impact"
          value={`${metrics.financialImpact.avgPortionCostReduction}%`}
          icon={DollarSign}
          detail="average reduction"
          bgGradient="from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20"
          iconColor="text-amber-600 dark:text-amber-400"
        />
        <SummaryCard
          title="Sustainability"
          value={`${metrics.sustainability.localSourcingPercentage}%`}
          icon={Leaf}
          detail="local sourcing"
          bgGradient="from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20"
          iconColor="text-green-600 dark:text-green-400"
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-100 dark:bg-slate-800/50">
          <TabsTrigger value="pipeline" className="text-xs">
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs">
            Timeline
          </TabsTrigger>
          <TabsTrigger value="insights" className="text-xs">
            Insights
          </TabsTrigger>
        </TabsList>

        {/* Pipeline Visualization */}
        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pipeline Stage Distribution */}
            <Card className="border-slate-200/50 dark:border-[#c8a97e]/15 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-[#c8a97e]/80 mb-4">
                Experiment Distribution by Stage
              </h3>
              {pipelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pipelineData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pipelineData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
                  No data available
                </div>
              )}
            </Card>

            {/* Specialization Distribution */}
            <Card className="border-slate-200/50 dark:border-[#c8a97e]/15 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-[#c8a97e]/80 mb-4">
                Experiments by Specialization
              </h3>
              {specialization.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={specialization}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {specialization.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
                  No data available
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Timeline Visualization */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="border-slate-200/50 dark:border-[#c8a97e]/15 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-[#c8a97e]/80 mb-4">
              Average Duration by Pipeline Stage
            </h3>
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #334155",
                    }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Legend />
                  <Bar dataKey="duration" fill="#c8a97e" name="Days" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="variance" fill="#a78bfa" name="Variance" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
                No data available
              </div>
            )}
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>Pipeline Insight:</strong> Testing → Readiness Assessment is the longest
                stage ({metrics.timeline.bottlenecks[0]?.averageDuration} avg days). Consider
                parallelizing documentation and equipment validation.
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ingredient Cost Variance */}
            <Card className="border-slate-200/50 dark:border-[#c8a97e]/15 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-[#c8a97e]/80 mb-4">
                Ingredient Cost Variance
              </h3>
              {ingredientCostTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ingredientCostTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="ingredient" fontSize={12} />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1e293b",
                        border: "1px solid #334155",
                      }}
                      labelStyle={{ color: "#e2e8f0" }}
                    />
                    <Bar dataKey="variance" fill="#f59e0b" name="Variance %" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-500 dark:text-slate-400">
                  No data available
                </div>
              )}
            </Card>

            {/* Metrics Summary */}
            <Card className="border-slate-200/50 dark:border-[#c8a97e]/15 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-[#c8a97e]/80 mb-4">
                Key Insights
              </h3>
              <div className="space-y-3">
                <InsightItem
                  title="Deployment Rate"
                  value={`${metrics.experiments.deploymentRate.toFixed(1)}%`}
                  status={metrics.experiments.deploymentRate > 60 ? "positive" : "warning"}
                  description="Ready experiments reaching production"
                />
                <InsightItem
                  title="Avg. Development Time"
                  value={`${metrics.experiments.averageTimeToReady} days`}
                  status={metrics.experiments.averageTimeToReady < 60 ? "positive" : "warning"}
                  description="From ideation to ready status"
                />
                <InsightItem
                  title="Cost Lock Rate"
                  value={`${metrics.financialImpact.costLockSuccessRate}%`}
                  status={metrics.financialImpact.costLockSuccessRate > 70 ? "positive" : "warning"}
                  description="Approved recipes with locked costs"
                />
                <InsightItem
                  title="Team Efficiency"
                  value={`${Math.round(metrics.teamPerformance.collaborationIndex * 100)}%`}
                  status="positive"
                  description="Collaboration effectiveness index"
                />
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detailed Metrics Table */}
      <Card className="border-slate-200/50 dark:border-[#c8a97e]/15 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-[#c8a97e]/80 mb-4">
          Performance Benchmarks
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                  Metric
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                  Current
                </th>
                <th className="text-right py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                  Target
                </th>
                <th className="text-center py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  metric: "Experiment Success Rate",
                  current: `${Math.round(metrics.experiments.successRate)}%`,
                  target: "75%",
                  status: metrics.experiments.successRate >= 75 ? "✓" : "△",
                },
                {
                  metric: "Average Time to Ready",
                  current: `${metrics.experiments.averageTimeToReady}d`,
                  target: "<60d",
                  status: metrics.experiments.averageTimeToReady < 60 ? "✓" : "△",
                },
                {
                  metric: "Cost Lock Success Rate",
                  current: `${metrics.financialImpact.costLockSuccessRate}%`,
                  target: "90%",
                  status: metrics.financialImpact.costLockSuccessRate >= 90 ? "✓" : "△",
                },
                {
                  metric: "Local Sourcing",
                  current: `${metrics.sustainability.localSourcingPercentage}%`,
                  target: "60%",
                  status: metrics.sustainability.localSourcingPercentage >= 60 ? "✓" : "△",
                },
                {
                  metric: "Waste Recovery Rate",
                  current: `${metrics.sustainability.wasteRecoveryRate}%`,
                  target: "85%",
                  status: metrics.sustainability.wasteRecoveryRate >= 85 ? "✓" : "△",
                },
              ].map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{row.metric}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-slate-200">
                    {row.current}
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                    {row.target}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-lg font-bold ${
                        row.status === "✓"
                          ? "text-green-600 dark:text-green-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  detail: string;
  bgGradient: string;
  iconColor: string;
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  detail,
  bgGradient,
  iconColor,
}: SummaryCardProps) {
  return (
    <Card
      className={`bg-gradient-to-br ${bgGradient} border-0 shadow-sm p-5`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-200 mt-2">
            {value}
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{detail}</p>
        </div>
        <div className="p-3 rounded-lg bg-white/40 dark:bg-slate-800/40">
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
    </Card>
  );
}

interface InsightItemProps {
  title: string;
  value: string;
  status: "positive" | "warning" | "neutral";
  description: string;
}

function InsightItem({ title, value, status, description }: InsightItemProps) {
  const statusColor = {
    positive: "text-green-700 dark:text-green-300",
    warning: "text-amber-700 dark:text-amber-300",
    neutral: "text-slate-700 dark:text-slate-300",
  };

  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/30 dark:border-[#c8a97e]/10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-200">{title}</p>
          <p className={`text-xs mt-1 ${statusColor[status]}`}>{description}</p>
        </div>
        <span className={`text-lg font-bold ${statusColor[status]}`}>{value}</span>
      </div>
    </div>
  );
}
