import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp, TrendingDown, Activity } from "lucide-react";
interface AnomalyData {
  metric: string;
  value: number;
  expected: number;
  zscore: number;
  is_anomaly: boolean;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
}
interface DashboardState {
  loading: boolean;
  error: string | null;
  laborAnomalies: AnomalyData[];
  revenueAnomalies: AnomalyData[];
  maintenanceRisks: AnomalyData[];
  scheduleOptimization: {
    recommended_headcount: number;
    expected_revenue: number;
    optimal_labor_pct: number;
    confidence: number;
  } | null;
  anomalyTrend: {
    trend: "improving" | "degrading" | "stable";
    score: number;
    change_pct: number;
  } | null;
}
export interface AdvancedAnalyticsDashboardProps {
  org_id: string;
  outlet_id: string;
  dept_id?: string;
  refreshInterval?: number;
}
export default function AdvancedAnalyticsDashboard({
  org_id,
  outlet_id,
  dept_id,
  refreshInterval = 60000,
}: AdvancedAnalyticsDashboardProps) {
  const [state, setState] = React.useState<DashboardState>({
    loading: true,
    error: null,
    laborAnomalies: [],
    revenueAnomalies: [],
    maintenanceRisks: [],
    scheduleOptimization: null,
    anomalyTrend: null,
  });
  const [timeRange, setTimeRange] = React.useState<number>(30);
  const fetchAnalytics = React.useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    const params = new URLSearchParams({
      org_id,
      outlet_id,
      days: String(timeRange),
    });

    const fetchJson = async (url: string) => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      try {
        return await fetch(url, { signal: controller.signal });
      } catch {
        return null;
      } finally {
        window.clearTimeout(timeout);
      }
    };

    const [laborRes, revenueRes, maintenanceRes, trendRes] = await Promise.all([
      fetchJson(`/api/advanced-ai/labor-anomalies?${params}`),
      fetchJson(`/api/advanced-ai/revenue-anomalies?${params}`),
      fetchJson(`/api/advanced-ai/maintenance-risks?org_id=${org_id}&days=${timeRange}`),
      fetchJson(`/api/advanced-ai/anomaly-trend?${params}&type=labor`),
    ]);

    const parseResponse = async <T,>(response: Response | null): Promise<T | null> => {
      if (!response || !response.ok) return null;
      try {
        return (await response.json()) as T;
      } catch {
        return null;
      }
    };

    const laborData = (await parseResponse<{ anomalies?: AnomalyData[] }>(laborRes))?.anomalies || [];
    const revenueData = (await parseResponse<{ anomalies?: AnomalyData[] }>(revenueRes))?.anomalies || [];
    const maintenanceData = (await parseResponse<{ risks?: AnomalyData[] }>(maintenanceRes))?.risks || [];
    const trendData = (await parseResponse<{ trend?: DashboardState["anomalyTrend"] }>(trendRes))?.trend || null;

    let optimizationData = null;
    if (dept_id) {
      try {
        const optimRes = await fetchJson(
          `/api/advanced-ai/schedule-optimization?org_id=${org_id}&outlet_id=${outlet_id}&dept_id=${dept_id}`,
        );
        if (optimRes?.ok) {
          const json = await optimRes.json().catch(() => null);
          optimizationData = json?.optimization ?? null;
        }
      } catch {
        optimizationData = null;
      }
    }

    const hasAnySuccess =
      laborRes?.ok || revenueRes?.ok || maintenanceRes?.ok || trendRes?.ok || optimizationData !== null;

    setState((prev) => ({
      ...prev,
      loading: false,
      error: hasAnySuccess ? null : "Advanced analytics is temporarily unavailable.",
      laborAnomalies: laborData,
      revenueAnomalies: revenueData,
      maintenanceRisks: maintenanceData,
      scheduleOptimization: optimizationData,
      anomalyTrend: trendData,
    }));
  }, [dept_id, org_id, outlet_id, timeRange]);

  React.useEffect(() => {
    void fetchAnalytics();
    const interval = window.setInterval(() => {
      void fetchAnalytics();
    }, refreshInterval);
    return () => window.clearInterval(interval);
  }, [fetchAnalytics, refreshInterval]);
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "#ef4444";
      case "high":
        return "#f97316";
      case "medium":
        return "#eab308";
      case "low":
        return "#3b82f6";
      default:
        return "#6b7280";
    }
  };
  const anomalyDistribution = [
    {
      name: "Critical",
      count:
        state.laborAnomalies.filter((a) => a.severity === "critical").length +
        state.revenueAnomalies.filter((a) => a.severity === "critical").length,
      fill: "#ef4444",
    },
    {
      name: "High",
      count:
        state.laborAnomalies.filter((a) => a.severity === "high").length +
        state.revenueAnomalies.filter((a) => a.severity === "high").length,
      fill: "#f97316",
    },
    {
      name: "Medium",
      count:
        state.laborAnomalies.filter((a) => a.severity === "medium").length +
        state.revenueAnomalies.filter((a) => a.severity === "medium").length,
      fill: "#eab308",
    },
    {
      name: "Low",
      count:
        state.laborAnomalies.filter((a) => a.severity === "low").length +
        state.revenueAnomalies.filter((a) => a.severity === "low").length,
      fill: "#3b82f6",
    },
  ];
  const confidenceData = state.laborAnomalies
    .concat(state.revenueAnomalies)
    .slice(0, 10)
    .map((a) => ({
      name: a.metric.substring(0, 15),
      confidence: (a.confidence * 100).toFixed(0),
      zscore: Math.abs(a.zscore).toFixed(1),
    }));
  return (
    <div className="space-y-6 p-6">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <h1 className="text-3xl font-bold">Advanced Analytics</h1>{" "}
        <div className="flex gap-2">
          {" "}
          <Button
            variant={timeRange === 7 ? "default" : "outline"}
            onClick={() => setTimeRange(7)}
            size="sm"
          >
            {" "}
            7 Days{" "}
          </Button>{" "}
          <Button
            variant={timeRange === 30 ? "default" : "outline"}
            onClick={() => setTimeRange(30)}
            size="sm"
          >
            {" "}
            30 Days{" "}
          </Button>{" "}
          <Button
            variant={timeRange === 90 ? "default" : "outline"}
            onClick={() => setTimeRange(90)}
            size="sm"
          >
            {" "}
            90 Days{" "}
          </Button>{" "}
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            {" "}
            Refresh{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {" "}
          <div className="flex gap-2">
            {" "}
            <AlertCircle className="h-5 w-5 flex-shrink-0" />{" "}
            <p>{state.error}</p>{" "}
          </div>{" "}
        </div>
      )}{" "}
      {/* KPI Cards */}{" "}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Total Anomalies{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              {state.laborAnomalies.length + state.revenueAnomalies.length}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground">
              {" "}
              {state.anomalyTrend?.trend === "improving"
                ? "Improving"
                : state.anomalyTrend?.trend === "degrading"
                  ? "Degrading"
                  : "Stable"}{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Health Score{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              {state.anomalyTrend?.score.toFixed(1) || 0}%{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground">
              {" "}
              {state.anomalyTrend && state.anomalyTrend.change_pct > 0 ? (
                <span className="flex items-center gap-1 text-red-600">
                  {" "}
                  <TrendingDown className="h-3 w-3" />{" "}
                  {Math.abs(state.anomalyTrend.change_pct).toFixed(1)}%{" "}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-green-600">
                  {" "}
                  <TrendingUp className="h-3 w-3" />{" "}
                  {Math.abs(state.anomalyTrend?.change_pct || 0).toFixed(1)}
                  %{" "}
                </span>
              )}{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {" "}
              Critical Alerts{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-red-600">
              {" "}
              {state.laborAnomalies.filter((a) => a.severity === "critical")
                .length +
                state.revenueAnomalies.filter((a) => a.severity === "critical")
                  .length}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground">
              {" "}
              Action required immediately{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        {state.scheduleOptimization && (
          <Card>
            {" "}
            <CardHeader className="pb-3">
              {" "}
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {" "}
                Recommended Headcount{" "}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="text-2xl font-bold">
                {" "}
                {state.scheduleOptimization.recommended_headcount}{" "}
              </div>{" "}
              <p className="text-xs text-muted-foreground">
                {" "}
                {(state.scheduleOptimization.confidence * 100).toFixed(0)}%
                confidence{" "}
              </p>{" "}
            </CardContent>{" "}
          </Card>
        )}{" "}
      </div>{" "}
      {/* Charts */}{" "}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {" "}
        {/* Anomaly Distribution */}{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Anomaly Severity Distribution</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <BarChart data={anomalyDistribution}>
                {" "}
                <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="name" />{" "}
                <YAxis /> <Tooltip />{" "}
                <Bar dataKey="count" fill="#3b82f6" />{" "}
              </BarChart>{" "}
            </ResponsiveContainer>{" "}
          </CardContent>{" "}
        </Card>{" "}
        {/* Confidence Levels */}{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Anomaly Confidence & Z-Scores</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <ScatterChart data={confidenceData}>
                {" "}
                <CartesianGrid strokeDasharray="3 3" />{" "}
                <XAxis dataKey="confidence" name="Confidence %" />{" "}
                <YAxis dataKey="zscore" name="Z-Score" />{" "}
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={{
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                  }}
                />{" "}
                <Scatter
                  name="Anomalies"
                  data={confidenceData}
                  fill="#8b5cf6"
                />{" "}
              </ScatterChart>{" "}
            </ResponsiveContainer>{" "}
          </CardContent>{" "}
        </Card>{" "}
        {/* Labor Anomalies Detail */}{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>
              Labor Cost Anomalies ({state.laborAnomalies.length})
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {" "}
              {state.laborAnomalies.slice(0, 5).map((anomaly, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border p-3"
                  style={{
                    borderLeftColor: getSeverityColor(anomaly.severity),
                    borderLeftWidth: "4px",
                  }}
                >
                  {" "}
                  <div>
                    {" "}
                    <p className="text-sm font-medium">{anomaly.metric}</p>{" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      Value: ${anomaly.value.toFixed(2)} | Expected: ${" "}
                      {anomaly.expected.toFixed(2)}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="text-right">
                    {" "}
                    <span
                      className="inline-block rounded-full px-2 py-1 text-xs font-semibold text-white"
                      style={{
                        backgroundColor: getSeverityColor(anomaly.severity),
                      }}
                    >
                      {" "}
                      {anomaly.severity.toUpperCase()}{" "}
                    </span>{" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      Confidence: {(anomaly.confidence * 100).toFixed(0)}%{" "}
                    </p>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
              {state.laborAnomalies.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {" "}
                  No labor anomalies detected{" "}
                </p>
              )}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        {/* Revenue Anomalies Detail */}{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>
              Revenue Anomalies ({state.revenueAnomalies.length})
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {" "}
              {state.revenueAnomalies.slice(0, 5).map((anomaly, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg border p-3"
                  style={{
                    borderLeftColor: getSeverityColor(anomaly.severity),
                    borderLeftWidth: "4px",
                  }}
                >
                  {" "}
                  <div>
                    {" "}
                    <p className="text-sm font-medium">{anomaly.metric}</p>{" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      Value: ${anomaly.value.toFixed(2)} | Expected: ${" "}
                      {anomaly.expected.toFixed(2)}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="text-right">
                    {" "}
                    <span
                      className="inline-block rounded-full px-2 py-1 text-xs font-semibold text-white"
                      style={{
                        backgroundColor: getSeverityColor(anomaly.severity),
                      }}
                    >
                      {" "}
                      {anomaly.severity.toUpperCase()}{" "}
                    </span>{" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      Confidence: {(anomaly.confidence * 100).toFixed(0)}%{" "}
                    </p>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
              {state.revenueAnomalies.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {" "}
                  No revenue anomalies detected{" "}
                </p>
              )}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Maintenance Risks */}{" "}
      {state.maintenanceRisks.length > 0 && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="flex items-center gap-2">
              {" "}
              <Activity className="h-5 w-5" /> Maintenance Risk Assessment{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-3">
              {" "}
              {state.maintenanceRisks.map((risk, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-orange-50 p-4 border border-orange-200"
                >
                  {" "}
                  <p className="font-medium text-orange-900">
                    {risk.metric}
                  </p>{" "}
                  <p className="text-sm text-orange-700">
                    {" "}
                    Risk Level:{" "}
                    <span className="font-semibold">
                      {(risk.confidence * 100).toFixed(0)}%
                    </span>{" "}
                  </p>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
