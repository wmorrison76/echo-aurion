import React from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
export default function MonitoringDashboard() {
  const [metrics, setMetrics] = React.useState<any>(null);
  const [health, setHealth] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());
  React.useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const [metricsRes, healthRes] = await Promise.all([
        fetch("/api/performance/stats"),
        fetch("/api/auto-healing/health"),
      ]);
      if (metricsRes.ok && healthRes.ok) {
        const metricsData = await metricsRes.json();
        const healthData = await healthRes.json();
        setMetrics(metricsData.stats);
        setHealth(healthData.status);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error);
    } finally {
      setLoading(false);
    }
  };
  if (loading || !metrics || !health) {
    return (
      <div className="flex items-center justify-center p-12">
        {" "}
        <div className="text-center">
          {" "}
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-primary" />{" "}
          <p className="mt-2 text-muted-foreground">
            Loading monitoring data...
          </p>{" "}
        </div>{" "}
      </div>
    );
  }
  const responseTimeData = [
    { name: "P50", value: metrics.requests.percentiles.p50 },
    { name: "P75", value: metrics.requests.percentiles.p75 },
    { name: "P95", value: metrics.requests.percentiles.p95 },
    { name: "P99", value: metrics.requests.percentiles.p99 },
  ];
  const endpointData = metrics.endpoints.slice(0, 5).map((ep: any) => ({
    name: `${ep.method} ${ep.path}`.substring(0, 20),
    requests: ep.count,
    avgTime: ep.avgDuration,
  }));
  const systemHealth = health.overallHealth === "healthy" ? 100 : 50;
  return (
    <div className="space-y-6 p-6">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <h1 className="text-3xl font-bold">System Monitoring</h1>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <span className="text-sm text-muted-foreground">
            {" "}
            Last updated: {lastUpdated.toLocaleTimeString()}{" "}
          </span>{" "}
          <Button onClick={fetchMetrics} size="sm" variant="outline">
            {" "}
            <RefreshCw className="h-4 w-4" />{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      {/* Status Overview */}{" "}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="flex items-center gap-2 text-sm">
              {" "}
              {health.overallHealth === "healthy" ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}{" "}
              System Health{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold capitalize">
              {" "}
              {health.overallHealth}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground">
              {" "}
              {health.endpoints.filter((e: any) => e.healthy).length}/{" "}
              {health.endpoints.length} endpoints healthy{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm">Request Volume</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              {metrics.requests.total.toLocaleString()}{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground">
              {" "}
              {metrics.requests.requestsPerSecond.toFixed(2)} RPS{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card>
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="flex items-center gap-2 text-sm">
              {" "}
              {metrics.requests.errorRate < 1 ? (
                <TrendingDown className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingUp className="h-5 w-5 text-red-600" />
              )}{" "}
              Error Rate{" "}
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              {metrics.requests.errorRate.toFixed(2)}%{" "}
            </div>{" "}
            <p className="text-xs text-muted-foreground">
              {" "}
              {metrics.requests.failedRequests} failed requests{" "}
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Detailed Metrics */}{" "}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {" "}
        {/* Response Time Distribution */}{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Response Time Percentiles</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <BarChart data={responseTimeData}>
                {" "}
                <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="name" />{" "}
                <YAxis /> <Tooltip />{" "}
                <Bar dataKey="value" fill="#3b82f6" />{" "}
              </BarChart>{" "}
            </ResponsiveContainer>{" "}
          </CardContent>{" "}
        </Card>{" "}
        {/* Top Endpoints */}{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Top Endpoints by Request Count</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <ResponsiveContainer width="100%" height={300}>
              {" "}
              <BarChart data={endpointData}>
                {" "}
                <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="name" />{" "}
                <YAxis /> <Tooltip />{" "}
                <Bar dataKey="requests" fill="#8b5cf6" />{" "}
              </BarChart>{" "}
            </ResponsiveContainer>{" "}
          </CardContent>{" "}
        </Card>{" "}
        {/* Database Performance */}{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Database Performance</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-3">
            {" "}
            <div>
              {" "}
              <p className="text-sm text-muted-foreground">
                Average Query Time
              </p>{" "}
              <p className="text-2xl font-bold">
                {" "}
                {metrics.queries.avgDuration}ms{" "}
              </p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="text-sm text-muted-foreground">
                Slow Queries ({">"}500ms)
              </p>{" "}
              <p className="text-2xl font-bold text-orange-600">
                {" "}
                {metrics.queries.slowQueries}{" "}
              </p>{" "}
            </div>{" "}
            <div>
              {" "}
              <p className="text-sm text-muted-foreground">
                P99 Query Time
              </p>{" "}
              <p className="text-2xl font-bold">
                {" "}
                {metrics.queries.percentiles.p99}ms{" "}
              </p>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        {/* Endpoint Errors */}{" "}
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Endpoints with Errors</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-2">
              {" "}
              {metrics.endpoints
                .filter((e: any) => e.errorCount > 0)
                .slice(0, 5)
                .map((endpoint: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded bg-red-50 p-2"
                  >
                    {" "}
                    <span className="text-sm">
                      {" "}
                      {endpoint.method} {endpoint.path}{" "}
                    </span>{" "}
                    <span className="inline-block rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                      {" "}
                      {endpoint.errorCount} errors{" "}
                    </span>{" "}
                  </div>
                ))}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Endpoint Details */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>All Monitored Endpoints</CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="overflow-x-auto">
            {" "}
            <table className="w-full text-sm">
              {" "}
              <thead>
                {" "}
                <tr className="border-b">
                  {" "}
                  <th className="px-4 py-2 text-left font-medium">
                    Endpoint
                  </th>{" "}
                  <th className="px-4 py-2 text-right font-medium">Requests</th>{" "}
                  <th className="px-4 py-2 text-right font-medium">
                    {" "}
                    Avg Time{" "}
                  </th>{" "}
                  <th className="px-4 py-2 text-right font-medium">
                    {" "}
                    Max Time{" "}
                  </th>{" "}
                  <th className="px-4 py-2 text-right font-medium">
                    Errors
                  </th>{" "}
                </tr>{" "}
              </thead>{" "}
              <tbody>
                {" "}
                {metrics.endpoints.map((endpoint: any, idx: number) => (
                  <tr key={idx} className="border-b hover:bg-surface">
                    {" "}
                    <td className="px-4 py-2">
                      {" "}
                      <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs font-mono font-semibold text-blue-800">
                        {" "}
                        {endpoint.method}{" "}
                      </span>
                      {""} {endpoint.path}{" "}
                    </td>{" "}
                    <td className="px-4 py-2 text-right">
                      {" "}
                      {endpoint.count.toLocaleString()}{" "}
                    </td>{" "}
                    <td className="px-4 py-2 text-right">
                      {" "}
                      {endpoint.avgDuration}ms{" "}
                    </td>{" "}
                    <td className="px-4 py-2 text-right">
                      {" "}
                      {endpoint.maxDuration}ms{" "}
                    </td>{" "}
                    <td className="px-4 py-2 text-right">
                      {" "}
                      {endpoint.errorCount > 0 ? (
                        <span className="text-red-600">
                          {endpoint.errorCount}
                        </span>
                      ) : (
                        <span className="text-green-600">0</span>
                      )}{" "}
                    </td>{" "}
                  </tr>
                ))}{" "}
              </tbody>{" "}
            </table>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
