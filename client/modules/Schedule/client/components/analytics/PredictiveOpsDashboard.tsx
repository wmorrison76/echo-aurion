import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { AlertCircle, TrendingUp, AlertTriangle, Zap } from "lucide-react";
interface Insight {
  alert: string;
  severity: "low" | "medium" | "high" | "critical";
  recommendation: string;
  metric?: string;
  value?: number;
  threshold?: number;
}
interface PredictiveOpsDashboardProps {
  org_id: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
export default function PredictiveOpsDashboard({
  org_id,
  autoRefresh = true,
  refreshInterval = 60000, // 1 minute default
}: PredictiveOpsDashboardProps) {
  const [insights, setInsights] = React.useState<Insight[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = React.useState<Date>(new Date());
  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/predictive-ops?org_id=${org_id}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      const data = await response.json();
      setInsights(data.insights || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error fetching insights:", err);
      setError("Failed to load insights. Please try again later.");
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };
  React.useEffect(() => {
    fetchInsights();
    if (!autoRefresh) return;
    const interval = setInterval(fetchInsights, refreshInterval);
    return () => clearInterval(interval);
  }, [org_id, autoRefresh, refreshInterval]);
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "high":
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case "medium":
        return <TrendingUp className="w-5 h-5 text-yellow-500" />;
      default:
        return <Zap className="w-5 h-5 text-blue-500" />;
    }
  };
  const getSeverityBgColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-950 border-red-700";
      case "high":
        return "bg-orange-950 border-orange-700";
      case "medium":
        return "bg-yellow-950 border-yellow-700";
      default:
        return "bg-blue-950 border-blue-700";
    }
  };
  const criticalCount = insights.filter(
    (i) => i.severity === "critical",
  ).length;
  const highCount = insights.filter((i) => i.severity === "high").length;
  return (
    <Card className="shadow-xl bg-surface text-white border-cyan-600/50">
      {" "}
      <CardHeader className="pb-3">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div className="flex items-center gap-2">
            {" "}
            <span className="text-2xl">📈</span>{" "}
            <div>
              {" "}
              <h2 className="text-lg font-semibold text-cyan-300">
                {" "}
                Predictive Operations{" "}
              </h2>{" "}
              <p className="text-xs text-gray-400">
                {" "}
                AI-driven anomaly detection{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          {criticalCount > 0 && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg px-3 py-1 flex items-center gap-2">
              {" "}
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />{" "}
              <span className="text-sm font-bold text-red-300">
                {" "}
                {criticalCount} Critical{" "}
              </span>{" "}
            </div>
          )}{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent>
        {" "}
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4">
            {" "}
            <p className="text-sm text-red-200">{error}</p>{" "}
          </div>
        )}{" "}
        {loading ? (
          <div className="text-center py-8">
            {" "}
            <div className="inline-block">
              {" "}
              <div className="w-8 h-8 border-4 border-cyan-600/30 border-t-cyan-600 rounded-full animate-spin" />{" "}
            </div>{" "}
            <p className="text-sm text-gray-400 mt-2">
              Analyzing operations...
            </p>{" "}
          </div>
        ) : insights.length === 0 ? (
          <div className="text-center py-8">
            {" "}
            <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />{" "}
            <p className="text-sm text-gray-400">No anomalies detected</p>{" "}
            <p className="text-xs text-muted-foreground mt-1">
              {" "}
              Operations appear to be running smoothly{" "}
            </p>{" "}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {" "}
            {insights.map((insight, idx) => (
              <div
                key={idx}
                className={`border rounded-lg p-3 transition-all ${getSeverityBgColor(insight.severity)}`}
              >
                {" "}
                <div className="flex items-start gap-3">
                  {" "}
                  <div className="mt-0.5">
                    {getSeverityIcon(insight.severity)}
                  </div>{" "}
                  <div className="flex-1 min-w-0">
                    {" "}
                    <div className="flex items-center gap-2 mb-1">
                      {" "}
                      <h3 className="font-semibold text-sm">
                        {insight.alert}
                      </h3>{" "}
                      <span
                        className={`text-xs px-2 py-0.5 rounded capitalize font-medium ${insight.severity === "critical" ? "bg-red-700 text-red-100" : insight.severity === "high" ? "bg-orange-700 text-orange-100" : insight.severity === "medium" ? "bg-yellow-700 text-yellow-100" : "bg-blue-700 text-blue-100"}`}
                      >
                        {" "}
                        {insight.severity}{" "}
                      </span>{" "}
                    </div>{" "}
                    <p className="text-sm text-gray-200 mb-2">
                      {" "}
                      {insight.recommendation}{" "}
                    </p>{" "}
                    {insight.metric && (
                      <p className="text-xs text-gray-400">
                        {" "}
                        Metric: {insight.metric}{" "}
                        {insight.value !== undefined &&
                          insight.threshold !== undefined && (
                            <span className="ml-2">
                              {" "}
                              (Current: {insight.value}, Threshold:{" "}
                              {insight.threshold}){" "}
                            </span>
                          )}{" "}
                      </p>
                    )}{" "}
                  </div>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
        <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          {" "}
          <p>
            {" "}
            Last updated: {lastUpdate.toLocaleTimeString()}
            {""}{" "}
            {autoRefresh &&
              `(auto-refresh every ${refreshInterval / 1000}s)`}{" "}
          </p>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
