/**
 * Analytics Dashboard Component
 * Displays revenue trends, capacity utilization, and KPI metrics
 */

import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { format, subDays } from "date-fns";

interface DailyAnalytics {
  date: string;
  totalRevenue: number;
  confirmedEvents: number;
  totalEvents: number;
  totalGuests: number;
  capacityUtilization: number;
  conflictCount: number;
}

interface KPIMetric {
  id: string;
  name: string;
  value: number;
  target: number;
  variance: number;
  status: "on-track" | "warning" | "critical" | "exceeded";
  trend: "up" | "down" | "stable";
}

interface AnalyticsDashboardProps {
  orgId: string;
  dateRange?: number; // days back
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  orgId,
  dateRange = 30,
}) => {
  const [analytics, setAnalytics] = useState<DailyAnalytics[]>([]);
  const [kpis, setKPIs] = useState<KPIMetric[]>([]);
  const [capacity, setCapacity] = useState({
    totalCapacity: 0,
    usedCapacity: 0,
    utilizationPercent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange, orgId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = subDays(endDate, dateRange);

      const [analyticsRes, capacityRes, kpisRes] = await Promise.all([
        fetch(
          `/api/calendar/analytics/daily?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`,
        ),
        fetch(
          `/api/calendar/analytics/capacity?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`,
        ),
        fetch(
          `/api/calendar/analytics/kpis?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`,
        ),
      ]);

      if (analyticsRes.ok) {
        const { data } = await analyticsRes.json();
        setAnalytics(data);
      }

      if (capacityRes.ok) {
        const { data } = await capacityRes.json();
        setCapacity(data);
      }

      if (kpisRes.ok) {
        const { data } = await kpisRes.json();
        setKPIs(data.kpis);
      }

      setError(null);
    } catch (err) {
      setError("Failed to load analytics");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading analytics...</div>;
  }

  const chartData = analytics.map((a) => ({
    date: new Date(a.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    revenue: a.totalRevenue,
    events: a.confirmedEvents,
    guests: a.totalGuests,
  }));

  const totalRevenue = analytics.reduce((sum, a) => sum + a.totalRevenue, 0);
  const avgRevenue = analytics.length > 0 ? totalRevenue / analytics.length : 0;
  const totalEvents = analytics.reduce((sum, a) => sum + a.totalEvents, 0);
  const totalGuests = analytics.reduce((sum, a) => sum + a.totalGuests, 0);

  const statusColors: Record<
    "on-track" | "warning" | "critical" | "exceeded",
    string
  > = {
    "on-track": "bg-green-100 text-green-900",
    warning: "bg-yellow-100 text-yellow-900",
    critical: "bg-red-100 text-red-900",
    exceeded: "bg-blue-100 text-blue-900",
  };

  const kpiSummary = kpis.reduce(
    (acc, kpi) => {
      acc[kpi.status]++;
      return acc;
    },
    { "on-track": 0, warning: 0, critical: 0, exceeded: 0 },
  );

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {totalRevenue.toLocaleString("en-US", {
                maximumFractionDigits: 0,
              })}
            </div>
            <p className="text-xs text-gray-500">
              Avg: $
              {avgRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              /day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-xs text-gray-500">
              Avg: {(totalEvents / Math.max(analytics.length, 1)).toFixed(1)}
              /day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Guests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalGuests.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">
              Avg: {(totalGuests / Math.max(analytics.length, 1)).toFixed(0)}
              /day
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Capacity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {capacity.utilizationPercent}%
            </div>
            <p className="text-xs text-gray-500">
              {capacity.usedCapacity}/{capacity.totalCapacity}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value) => `$${value.toLocaleString()}`}
                contentStyle={{ backgroundColor: "#f3f4f6", border: "none" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Events vs Guests */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Events per Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: "#f3f4f6" }} />
                <Bar dataKey="events" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Guests per Day</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip contentStyle={{ backgroundColor: "#f3f4f6" }} />
                <Bar dataKey="guests" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* KPI Status */}
      {kpis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>KPI Status</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge className="bg-green-100 text-green-900">
                On Track: {kpiSummary["on-track"]}
              </Badge>
              <Badge className="bg-yellow-100 text-yellow-900">
                Warning: {kpiSummary.warning}
              </Badge>
              <Badge className="bg-red-100 text-red-900">
                Critical: {kpiSummary.critical}
              </Badge>
              <Badge className="bg-blue-100 text-blue-900">
                Exceeded: {kpiSummary.exceeded}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {kpis.map((kpi) => (
                <div
                  key={kpi.id}
                  className={`p-3 rounded-lg border ${statusColors[kpi.status]}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{kpi.name}</h4>
                      <p className="text-sm opacity-75">
                        Target: {kpi.target} | Current: {kpi.value}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={statusColors[kpi.status]}
                    >
                      {kpi.status === "on-track" && "✓"}
                      {kpi.status === "warning" && "⚠"}
                      {kpi.status === "critical" && "✕"}
                      {kpi.status === "exceeded" && "⬆"}
                    </Badge>
                  </div>
                  <div className="mt-1 bg-black/10 rounded h-2">
                    <div
                      className="bg-current h-2 rounded transition-all"
                      style={{
                        width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
