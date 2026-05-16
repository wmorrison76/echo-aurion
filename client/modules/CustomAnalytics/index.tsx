import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  Loader,
  RefreshCw,
  Activity,
  Zap,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
interface CustomMetric {
  metricId: string;
  name: string;
  calculation: string;
  value: number;
  target: number;
  variance: number;
  trend: "up" | "down" | "stable";
  unit: string;
}
interface RealTimeDashboard {
  dashboardId: string;
  name: string;
  widgets: Array<{
    widgetId: string;
    title: string;
    type: "gauge" | "chart" | "table" | "kpi" | "sparkline";
    metrics: CustomMetric[];
    refreshInterval: number;
    alerts: Array<{
      condition: string;
      severity: "info" | "warning" | "critical";
      message: string;
    }>;
  }>;
  lastUpdated: string;
  refreshInterval: number;
  insights: string[];
  alerts: Array<{
    title: string;
    severity: "info" | "warning" | "critical";
    message: string;
    timestamp: string;
  }>;
}
export const CustomAnalytics: React.FC = () => {
  const { t } = useI18n();
  const [dashboard, setDashboard] = useState<RealTimeDashboard | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const handleGenerateDashboard = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/analytics/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboardType: "executive",
          timeframe: "realtime",
        }),
      });
      if (response.ok) {
        setDashboard(await response.json());
      }
    } catch (error) {
      console.error("Analytics error:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  useEffect(() => {
    if (!autoRefresh || !dashboard) return;
    const interval = setInterval(() => {
      handleGenerateDashboard();
    }, dashboard.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, dashboard?.refreshInterval]);
  const getVarianceColor = (variance: number) => {
    if (variance > 5) return "text-green-600 dark:text-green-400";
    if (variance < -5) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };
  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "📈";
      case "down":
        return "📉";
      default:
        return "→";
    }
  };
  const getAlertColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      case "warning":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
      case "info":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      default:
        return "bg-slate-100 dark:bg-slate-700 text-slate-800";
    }
  };
  return (
    <div className="w-full h-full flex flex-col p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {" "}
      <div className="mb-6">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div className="flex items-center gap-3 mb-2">
            {" "}
            <BarChart3 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />{" "}
            <div>
              {" "}
              <h1 className="text-3xl font-bold text-foreground dark:text-white">
                {" "}
                {t("module.custom-analytics.title")}{" "}
              </h1>{" "}
              <p className="text-muted-foreground">
                {" "}
                {t("module.custom-analytics.description")}{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex items-center gap-3">
            {" "}
            <ModuleChatButton
              moduleId="custom-analytics"
              moduleName={t("module.custom-analytics.title")}
            />{" "}
            {dashboard && (
              <div className="flex items-center gap-2">
                {" "}
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  {" "}
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded"
                  />{" "}
                  {t("module.custom-analytics.autoRefresh")}{" "}
                </label>{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {!dashboard ? (
        <div className="flex flex-col items-center justify-center flex-1">
          {" "}
          <BarChart3 className="w-16 h-16 text-emerald-600 dark:text-emerald-400 mx-auto mb-4 opacity-50" />{" "}
          <h2 className="text-2xl font-bold text-foreground dark:text-white mb-6">
            {" "}
            Generate Real-Time Dashboard{" "}
          </h2>{" "}
          <Button
            onClick={handleGenerateDashboard}
            disabled={isGenerating}
            size="lg"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {" "}
            {isGenerating ? (
              <>
                {" "}
                <Loader className="w-4 h-4 animate-spin" /> Loading...{" "}
              </>
            ) : (
              <>
                {" "}
                <Activity className="w-4 h-4" /> Create Dashboard{" "}
              </>
            )}{" "}
          </Button>{" "}
        </div>
      ) : (
        <>
          {" "}
          <div className="flex justify-between items-center mb-4 text-xs text-muted-foreground">
            {" "}
            <span>
              {" "}
              Last Updated:{""}{" "}
              {new Date(dashboard.lastUpdated).toLocaleTimeString()}{" "}
            </span>{" "}
            <Button
              onClick={handleGenerateDashboard}
              variant="ghost"
              size="sm"
              className="gap-1"
            >
              {" "}
              <RefreshCw className="w-3 h-3" /> Refresh{" "}
            </Button>{" "}
          </div>{" "}
          {dashboard.alerts.length > 0 && (
            <div className="mb-4 space-y-2">
              {" "}
              {dashboard.alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-3 text-sm flex gap-2 ${getAlertColor(alert.severity)}`}
                >
                  {" "}
                  <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" />{" "}
                  <div>
                    {" "}
                    <p className="font-semibold">{alert.title}</p>{" "}
                    <p className="text-xs opacity-90">{alert.message}</p>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>
          )}{" "}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 flex-1 overflow-y-auto">
            {" "}
            {dashboard.widgets.map((widget) => (
              <div
                key={widget.widgetId}
                className="bg-background dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-border"
              >
                {" "}
                <h3 className="font-semibold text-foreground dark:text-white mb-4">
                  {" "}
                  {widget.title}{" "}
                </h3>{" "}
                <div className="space-y-3">
                  {" "}
                  {widget.metrics.map((metric) => (
                    <div
                      key={metric.metricId}
                      className="flex justify-between items-start p-3 bg-slate-50 dark:bg-slate-700 rounded"
                    >
                      {" "}
                      <div className="flex-1">
                        {" "}
                        <p className="text-sm font-medium text-foreground dark:text-white">
                          {" "}
                          {metric.name}{" "}
                        </p>{" "}
                        <p className="text-xs text-muted-foreground">
                          {" "}
                          Target: {metric.target} {metric.unit}{" "}
                        </p>{" "}
                      </div>{" "}
                      <div className="text-right">
                        {" "}
                        <p className="text-2xl font-bold text-foreground dark:text-white">
                          {" "}
                          {metric.value}{" "}
                          <span className="text-sm text-muted-foreground ml-1">
                            {" "}
                            {metric.unit}{" "}
                          </span>{" "}
                        </p>{" "}
                        <p
                          className={`text-sm font-semibold ${getVarianceColor(metric.variance)}`}
                        >
                          {" "}
                          {getTrendIcon(metric.trend)}
                          {""} {metric.variance > 0 ? "+" : ""}{" "}
                          {metric.variance.toFixed(2)}%{" "}
                        </p>{" "}
                      </div>{" "}
                    </div>
                  ))}{" "}
                </div>{" "}
                {widget.alerts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 space-y-1">
                    {" "}
                    {widget.alerts.map((alert, i) => (
                      <p
                        key={i}
                        className="text-xs text-primary dark:text-blue-400"
                      >
                        {" "}
                        ℹ️ {alert.message}{" "}
                      </p>
                    ))}{" "}
                  </div>
                )}{" "}
              </div>
            ))}{" "}
          </div>{" "}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 border border-emerald-200 dark:border-slate-600">
            {" "}
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-3 flex items-center gap-2">
              {" "}
              <TrendingUp className="w-4 h-4" /> Key Insights{" "}
            </h3>{" "}
            <ul className="space-y-2 text-sm text-emerald-800 dark:text-emerald-300">
              {" "}
              {dashboard.insights.map((insight, i) => (
                <li key={i}>{insight}</li>
              ))}{" "}
            </ul>{" "}
          </div>{" "}
        </>
      )}{" "}
    </div>
  );
};
export default CustomAnalytics;
