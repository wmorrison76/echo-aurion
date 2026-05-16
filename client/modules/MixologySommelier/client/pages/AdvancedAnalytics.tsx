import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  AlertTriangle,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { ApiService } from "../lib/api";
const CHART_COLORS = ["#00d1ff", "#ff006e", "#00ff9f", "#ffa400", "#c59963"];
interface Forecast {
  item_id: string;
  date: string;
  predicted_qty: number;
  confidence_lower: number;
  confidence_upper: number;
  confidence_score: number;
}
interface Anomaly {
  item_id: string;
  date: string;
  anomaly_type: string;
  confidence_score: number;
  description: string;
}
interface Alert {
  id: string;
  alert_type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
}
export function AdvancedAnalytics() {
  const [venueId, setVenueId] = useState<string>("");
  const [selectedMetric, setSelectedMetric] = useState<
    "revenue" | "anomalies" | "forecasts" | "optimization"
  >("revenue");
  const [syncInProgress, setSyncInProgress] = useState(false);
  const { data: forecastData, isLoading: forecastLoading } = useQuery({
    queryKey: ["forecasts", venueId],
    queryFn: () => ApiService.analytics.getForecasts(venueId, 30),
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000,
  });
  const { data: anomalyData, isLoading: anomalyLoading } = useQuery({
    queryKey: ["anomalies", venueId],
    queryFn: () => ApiService.analytics.getAnomalies(venueId),
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000,
  });
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["revenue", venueId],
    queryFn: () => ApiService.analytics.getRevenue(venueId, 30),
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000,
  });
  const { data: topItems, isLoading: topItemsLoading } = useQuery({
    queryKey: ["top-items", venueId],
    queryFn: () => ApiService.analytics.getTopItems(venueId, 30, 10),
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000,
  });
  const { data: optimizationData, isLoading: optimizationLoading } = useQuery({
    queryKey: ["optimization", venueId],
    queryFn: () => ApiService.analytics.getInventoryOptimization(venueId),
    enabled: !!venueId,
    staleTime: 5 * 60 * 1000,
  });
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ["alerts", venueId],
    queryFn: () => ApiService.analytics.getActiveAlerts(venueId),
    enabled: !!venueId,
    staleTime: 60 * 1000,
  });
  const handleInitiateSync = async (syncType: string) => {
    if (!venueId) return;
    setSyncInProgress(true);
    try {
      await ApiService.analytics.initiateSync(venueId, syncType);
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncInProgress(false);
    }
  };
  const getForecastChartData = useCallback(() => {
    if (!forecastData?.data) return [];
    const groupedByDate = new Map<string, any>();
    forecastData.data.forEach((forecast: Forecast) => {
      const date = new Date(forecast.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (!groupedByDate.has(date)) {
        groupedByDate.set(date, { date, totalPredicted: 0, count: 0 });
      }
      const entry = groupedByDate.get(date);
      entry.totalPredicted += forecast.predicted_qty;
      entry.count += 1;
    });
    return Array.from(groupedByDate.values()).map((entry) => ({
      date: entry.date,
      predicted: Math.round(entry.totalPredicted / entry.count),
    }));
  }, [forecastData]);
  const getAnomalyStats = useCallback(() => {
    if (!anomalyData?.data) return { total: 0, critical: 0, warning: 0 };
    const critical = anomalyData.data.filter(
      (a: Anomaly) => a.confidence_score > 0.8,
    ).length;
    const warning = anomalyData.data.filter(
      (a: Anomaly) => a.confidence_score <= 0.8,
    ).length;
    return { total: anomalyData.data.length, critical, warning };
  }, [anomalyData]);
  const getAlertStats = useCallback(() => {
    if (!alertsData?.data) return { total: 0, critical: 0, warning: 0 };
    const critical = alertsData.data.filter(
      (a: Alert) => a.severity === "critical",
    ).length;
    const warning = alertsData.data.filter(
      (a: Alert) => a.severity === "warning",
    ).length;
    return { total: alertsData.data.length, critical, warning };
  }, [alertsData]);
  const urgentReorders =
    optimizationData?.data?.filter((item: any) =>
      item.reorder_recommendation.includes("URGENT"),
    ) || [];
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      {" "}
      <div className="max-w-7xl mx-auto">
        {" "}
        <div className="mb-8">
          {" "}
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            {" "}
            <TrendingUp className="w-10 h-10 text-cyan-400" /> Advanced
            Analytics & Insights{" "}
          </h1>{" "}
          <p className="text-slate-400">
            {" "}
            Real-time forecasting, anomaly detection, and predictive inventory
            optimization{" "}
          </p>{" "}
        </div>{" "}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {" "}
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:border-cyan-500 transition">
            {" "}
            <p className="text-slate-400 text-sm font-medium">
              {" "}
              Forecast Accuracy{" "}
            </p>{" "}
            <p className="text-2xl font-bold text-cyan-400 mt-2">
              {" "}
              {forecastData?.data
                ? (
                    forecastData.data.reduce(
                      (sum: number, f: Forecast) => sum + f.confidence_score,
                      0,
                    ) / forecastData.data.length
                  ).toFixed(0)
                : "—"}{" "}
              %{" "}
            </p>{" "}
          </div>{" "}
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:border-cyan-500 transition">
            {" "}
            <p className="text-slate-400 text-sm font-medium">
              {" "}
              Active Anomalies{" "}
            </p>{" "}
            <p className="text-2xl font-bold text-orange-400 mt-2">
              {" "}
              {getAnomalyStats().total}{" "}
            </p>{" "}
            <p className="text-xs text-red-400 mt-1">
              {" "}
              {getAnomalyStats().critical} critical{" "}
            </p>{" "}
          </div>{" "}
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:border-cyan-500 transition">
            {" "}
            <p className="text-slate-400 text-sm font-medium">
              Active Alerts
            </p>{" "}
            <p className="text-2xl font-bold text-red-400 mt-2">
              {" "}
              {getAlertStats().total}{" "}
            </p>{" "}
            <p className="text-xs text-red-400 mt-1">
              {" "}
              {getAlertStats().critical} critical{" "}
            </p>{" "}
          </div>{" "}
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:border-cyan-500 transition">
            {" "}
            <p className="text-slate-400 text-sm font-medium">
              {" "}
              Urgent Reorders{" "}
            </p>{" "}
            <p className="text-2xl font-bold text-yellow-400 mt-2">
              {" "}
              {urgentReorders.length}{" "}
            </p>{" "}
            <p className="text-xs text-yellow-400 mt-1">Action required</p>{" "}
          </div>{" "}
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 hover:border-cyan-500 transition">
            {" "}
            <p className="text-slate-400 text-sm font-medium">
              Avg Confidence
            </p>{" "}
            <p className="text-2xl font-bold text-green-400 mt-2">
              {" "}
              {forecastData?.data
                ? (
                    (forecastData.data.reduce(
                      (sum: number, f: Forecast) => sum + f.confidence_score,
                      0,
                    ) /
                      forecastData.data.length) *
                    100
                  ).toFixed(0)
                : "—"}{" "}
              %{" "}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {" "}
          {(["revenue", "anomalies", "forecasts", "optimization"] as const).map(
            (metric) => (
              <button
                key={metric}
                onClick={() => setSelectedMetric(metric)}
                className={`p-3 rounded-lg font-medium transition ${selectedMetric === metric ? "bg-cyan-600 text-white" : "bg-slate-700/50 text-slate-400 hover:bg-slate-700"}`}
              >
                {" "}
                {metric === "anomalies"
                  ? "Anomalies"
                  : metric.charAt(0).toUpperCase() + metric.slice(1)}{" "}
              </button>
            ),
          )}{" "}
        </div>{" "}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {" "}
          <div className="lg:col-span-2 bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            {" "}
            <h3 className="text-lg font-bold text-white mb-4">
              {" "}
              Sales Forecast (Next 30 Days){" "}
            </h3>{" "}
            {forecastLoading ? (
              <div className="h-80 flex items-center justify-center text-slate-400">
                {" "}
                Loading forecast data...{" "}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                {" "}
                <LineChart data={getForecastChartData()}>
                  {" "}
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(100, 116, 139, 0.3)"
                  />{" "}
                  <XAxis stroke="rgba(148, 163, 184, 0.5)" />{" "}
                  <YAxis stroke="rgba(148, 163, 184, 0.5)" />{" "}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.95)",
                      border: "1px solid rgba(148, 163, 184, 0.3)",
                      borderRadius: "8px",
                    }}
                  />{" "}
                  <Legend />{" "}
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    stroke="#00d1ff"
                    strokeWidth={2}
                    dot={false}
                    name="Predicted Sales"
                  />{" "}
                </LineChart>{" "}
              </ResponsiveContainer>
            )}{" "}
          </div>{" "}
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
            {" "}
            <h3 className="text-lg font-bold text-white mb-4">
              Alert Summary
            </h3>{" "}
            {alertsLoading ? (
              <div className="text-slate-400">Loading alerts...</div>
            ) : (
              <div className="space-y-3">
                {" "}
                <div className="flex items-center justify-between p-3 bg-red-900/30 rounded border border-red-700/50">
                  {" "}
                  <span className="text-white">Critical</span>{" "}
                  <span className="text-xl font-bold text-red-400">
                    {" "}
                    {getAlertStats().critical}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="flex items-center justify-between p-3 bg-yellow-900/30 rounded border border-yellow-700/50">
                  {" "}
                  <span className="text-white">Warnings</span>{" "}
                  <span className="text-xl font-bold text-yellow-400">
                    {" "}
                    {getAlertStats().warning}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="flex items-center justify-between p-3 bg-blue-900/30 rounded border border-blue-700/50">
                  {" "}
                  <span className="text-white">Info</span>{" "}
                  <span className="text-xl font-bold text-blue-400">
                    {" "}
                    {getAlertStats().total -
                      getAlertStats().critical -
                      getAlertStats().warning}{" "}
                  </span>{" "}
                </div>{" "}
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
        {selectedMetric === "anomalies" && (
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 mb-8">
            {" "}
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              {" "}
              <AlertTriangle className="w-5 h-5 text-orange-400" /> Detected
              Anomalies{" "}
            </h3>{" "}
            {anomalyLoading ? (
              <div className="text-slate-400">Loading anomalies...</div>
            ) : anomalyData?.data && anomalyData.data.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {" "}
                {anomalyData.data.map((anomaly: Anomaly, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-800/50 border border-orange-600/50 rounded text-sm"
                  >
                    {" "}
                    <div className="flex items-start justify-between mb-1">
                      {" "}
                      <span className="font-medium text-white">
                        {" "}
                        {anomaly.anomaly_type}{" "}
                      </span>{" "}
                      <span className="text-orange-400">
                        {" "}
                        {(anomaly.confidence_score * 100).toFixed(0)}%
                        confidence{" "}
                      </span>{" "}
                    </div>{" "}
                    <p className="text-slate-400 text-xs">
                      {" "}
                      {anomaly.description}{" "}
                    </p>{" "}
                  </div>
                ))}{" "}
              </div>
            ) : (
              <p className="text-slate-400">No anomalies detected</p>
            )}{" "}
          </div>
        )}{" "}
        {selectedMetric === "optimization" && (
          <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 mb-8">
            {" "}
            <h3 className="text-lg font-bold text-white mb-4">
              {" "}
              Inventory Optimization Recommendations{" "}
            </h3>{" "}
            {optimizationLoading ? (
              <div className="text-slate-400">Loading recommendations...</div>
            ) : optimizationData?.data && optimizationData.data.length > 0 ? (
              <div className="overflow-x-auto">
                {" "}
                <table className="w-full text-sm">
                  {" "}
                  <thead>
                    {" "}
                    <tr className="border-b border-slate-600">
                      {" "}
                      <th className="text-left p-3 text-slate-300">
                        Item
                      </th>{" "}
                      <th className="text-right p-3 text-slate-300">
                        {" "}
                        Current Qty{" "}
                      </th>{" "}
                      <th className="text-right p-3 text-slate-300">
                        {" "}
                        Days of Stock{" "}
                      </th>{" "}
                      <th className="text-right p-3 text-slate-300">
                        {" "}
                        Recommended{" "}
                      </th>{" "}
                      <th className="text-left p-3 text-slate-300">
                        Action
                      </th>{" "}
                    </tr>{" "}
                  </thead>{" "}
                  <tbody>
                    {" "}
                    {optimizationData.data
                      .slice(0, 10)
                      .map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-border">
                          {" "}
                          <td className="p-3 text-white">
                            {item.item_name}
                          </td>{" "}
                          <td className="p-3 text-right text-slate-300">
                            {" "}
                            {item.current_qty}{" "}
                          </td>{" "}
                          <td className="p-3 text-right text-slate-300">
                            {" "}
                            {item.days_of_stock.toFixed(1)}{" "}
                          </td>{" "}
                          <td className="p-3 text-right text-slate-300">
                            {" "}
                            {item.optimal_stock}{" "}
                          </td>{" "}
                          <td className="p-3">
                            {" "}
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded ${item.reorder_recommendation.includes("URGENT") ? "bg-red-900/50 text-red-200" : item.reorder_recommendation.includes("HIGH") ? "bg-yellow-900/50 text-yellow-200" : "bg-green-900/50 text-green-200"}`}
                            >
                              {" "}
                              {item.reorder_recommendation}{" "}
                            </span>{" "}
                          </td>{" "}
                        </tr>
                      ))}{" "}
                  </tbody>{" "}
                </table>{" "}
              </div>
            ) : (
              <p className="text-slate-400">No optimization data available</p>
            )}{" "}
          </div>
        )}{" "}
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6">
          {" "}
          <h3 className="text-lg font-bold text-white mb-4">
            {" "}
            Real-time Sync Operations{" "}
          </h3>{" "}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {" "}
            {[
              "inventory_pull",
              "inventory_push",
              "pricing_sync",
              "menu_sync",
            ].map((syncType) => (
              <button
                key={syncType}
                onClick={() => handleInitiateSync(syncType)}
                disabled={syncInProgress}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-600 text-white rounded-lg font-medium text-sm transition"
              >
                {" "}
                {syncInProgress ? (
                  <Clock className="w-4 h-4 inline mr-2 animate-spin" />
                ) : null}{" "}
                {syncType.replace(/_/g, "").toUpperCase()}{" "}
              </button>
            ))}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
