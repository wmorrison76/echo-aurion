import React, { useCallback, useEffect, useMemo, useState } from "react";
import { get } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  Target,
  LineChart as LineChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

type MetricsResponse = {
  success: boolean;
  data: {
    clientsCount: number;
    prospectsCount: number;
    openProspectsCount: number;
    pipeline18: number;
    weighted18: number;
  };
};

type ForecastMonth = {
  month: string;
  pipeline: number;
  weighted: number;
  goal: number;
  gap: number;
  byStage: Record<string, number>;
};

type ForecastResponse = {
  success: boolean;
  data: {
    start: string;
    months: ForecastMonth[];
  };
};

type SalesGoalSummary = {
  userId: string;
  year: number;
  annualTarget: number;
  actualRevenue: number;
  pipelineRevenue: number;
  pipelineCount: number;
  pipelineTarget: number;
  conversionRatio: { prospects: number; clients: number; wins: number };
  requiredProspects?: number;
  coverageRatio?: number;
  monthlyRequiredProspects?: Record<string, number>;
  gap: number;
  attainment: number;
};

type SalesGoalsSummaryResponse = {
  success: boolean;
  data: SalesGoalSummary[];
};

const STAGE_COLORS: Record<string, string> = {
  prospect: "#94a3b8",
  qualified: "#3b82f6",
  proposal: "#8b5cf6",
  negotiation: "#f59e0b",
  won: "#10b981",
  beo_created: "#22c55e",
  lost: "#ef4444",
  lead: "#94a3b8",
  completed: "#22c55e",
};

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<MetricsResponse["data"] | null>(null);
  const [forecast, setForecast] = useState<ForecastMonth[]>([]);
  const [salesGoals, setSalesGoals] = useState<SalesGoalSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const year = new Date().getUTCFullYear();
      const [m, f, s] = await Promise.all([
        get<MetricsResponse>("/api/crm/metrics"),
        get<ForecastResponse>("/api/crm/forecast?months=18"),
        get<SalesGoalsSummaryResponse>(
          `/api/crm/sales-goals/summary?year=${year}`,
        ),
      ]);
      setMetrics(m?.data || null);
      setForecast(Array.isArray(f?.data?.months) ? f.data.months : []);
      setSalesGoals(Array.isArray(s?.data) ? s.data : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll().catch(() => {
      setIsLoading(false);
    });
  }, [fetchAll]);

  const chartData = useMemo(
    () =>
      forecast.map((m) => ({
        month: m.month.slice(0, 7),
        pipeline: Math.round(m.pipeline),
        weighted: Math.round(m.weighted),
        goal: Math.round(m.goal || 0),
      })),
    [forecast],
  );

  const stageTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const m of forecast) {
      for (const [stage, value] of Object.entries(m.byStage || {})) {
        totals[stage] = (totals[stage] || 0) + Number(value || 0);
      }
    }
    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
        color: STAGE_COLORS[name] || "#64748b",
      }))
      .sort((a, b) => b.value - a.value);
  }, [forecast]);

  const salesGoalChart = useMemo(
    () =>
      salesGoals.map((row) => ({
        manager: row.userId === "local" ? "Local" : row.userId.slice(0, 8),
        actual: Math.round(row.actualRevenue),
        goal: Math.round(row.annualTarget),
        pipeline: Math.round(row.pipelineRevenue),
      })),
    [salesGoals],
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-2">
              CRM health, pipeline, and 18‑month forecast.
            </p>
          </div>
          <Button variant="outline" onClick={fetchAll} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" /> Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics?.clientsCount?.toLocaleString() ?? "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Contacts in CRM
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" /> Prospects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {metrics?.prospectsCount?.toLocaleString() ?? "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <Badge variant="secondary" className="mr-2">
                  Open: {metrics?.openProspectsCount ?? 0}
                </Badge>
                Active pipeline rows
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Pipeline
                (18mo)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                ${Math.round(metrics?.pipeline18 || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Unweighted</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <LineChartIcon className="h-4 w-4 text-green-500" /> Weighted
                (18mo)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ${Math.round(metrics?.weighted18 || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Stage-weighted
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>18‑Month Forecast</CardTitle>
              <CardDescription>
                Pipeline vs weighted vs goals (if set).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="pipeline"
                        stroke="#3b82f6"
                        name="Pipeline"
                      />
                      <Line
                        type="monotone"
                        dataKey="weighted"
                        stroke="#10b981"
                        name="Weighted"
                      />
                      <Line
                        type="monotone"
                        dataKey="goal"
                        stroke="#f59e0b"
                        name="Goal"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stage Mix</CardTitle>
              <CardDescription>
                Total pipeline by stage (18 months)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : stageTotals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No forecast data
                </div>
              ) : (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stageTotals}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, value }) =>
                          `${name}: $${Number(value).toLocaleString()}`
                        }
                      >
                        {stageTotals.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sales Manager Goals</CardTitle>
            <CardDescription>
              Annual goals vs actuals, plus pipeline coverage aligned to the
              10:3:1 rule.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : salesGoals.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No sales goals configured yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesGoalChart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="manager" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="actual" fill="#10b981" name="Actual" />
                      <Bar dataKey="goal" fill="#f59e0b" name="Goal" />
                      <Bar dataKey="pipeline" fill="#3b82f6" name="Pipeline" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  {salesGoals.map((row) => (
                    <div
                      key={`${row.userId}-${row.year}`}
                      className="rounded-lg border border-border/60 p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">
                          {row.userId === "local"
                            ? "Local Manager"
                            : row.userId}
                        </div>
                        <Badge variant="secondary">
                          {Math.round(row.attainment * 100)}% goal hit
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Goal ${Math.round(row.annualTarget).toLocaleString()} •
                        Actual ${Math.round(row.actualRevenue).toLocaleString()}{" "}
                        • Gap ${Math.round(row.gap).toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {row.requiredProspects ? (
                          <>
                            Required prospects {row.requiredProspects} •
                            Coverage{" "}
                            {Math.round((row.coverageRatio || 0) * 100)}%
                          </>
                        ) : (
                          <>Coverage needs more pipeline data</>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="outline">
                          Pipeline $
                          {Math.round(row.pipelineRevenue).toLocaleString()}
                        </Badge>
                        <Badge variant="outline">
                          Pipeline target {row.pipelineTarget}
                        </Badge>
                        <Badge variant="outline">
                          10:{row.conversionRatio.clients}:
                          {row.conversionRatio.wins} ratio
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
