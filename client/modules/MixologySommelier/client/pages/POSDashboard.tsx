import React from "react";

import { format } from "date-fns";
import {
  AlertTriangle,
  BarChart3,
  DollarSign,
  Loader2,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import posAPIService, {
  type RevenueReport,
  type SalesData,
  type TopItem,
} from "../lib/pos-api";

interface StatCard {
  label: string;
  value: string;
  change: number;
  icon: React.ReactNode;
  trend: "up" | "down";
}

export default function POSDashboard() {
  const [venueId, setVenueId] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [salesData, setSalesData] = React.useState<SalesData[]>([]);
  const [topItems, setTopItems] = React.useState<TopItem[]>([]);
  const [revenueReport, setRevenueReport] = React.useState<RevenueReport[]>([]);
  const [selectedPeriod, setSelectedPeriod] = React.useState<
    "week" | "month" | "year"
  >("week");

  const [stats, setStats] = React.useState({
    totalRevenue: 0,
    totalMargin: 0,
    avgMarginPercent: 0,
    totalTransactions: 0,
  });

  const loadDashboardData = React.useCallback(async () => {
    if (!venueId) return;
    setLoading(true);

    try {
      const endDate = new Date();
      const startDate = new Date();
      if (selectedPeriod === "week") startDate.setDate(endDate.getDate() - 7);
      if (selectedPeriod === "month")
        startDate.setMonth(endDate.getMonth() - 1);
      if (selectedPeriod === "year")
        startDate.setFullYear(endDate.getFullYear() - 1);

      const [sales, top, revenue] = await Promise.all([
        posAPIService.getSalesData(venueId, startDate, endDate, "day"),
        posAPIService.getTopSellingItems(venueId, startDate, endDate, 10),
        posAPIService.getRevenueReport(venueId, startDate, endDate),
      ]);

      setSalesData(sales);
      setTopItems(top);
      setRevenueReport(revenue);

      const totalRevenue = sales.reduce(
        (sum, s) => sum + (s.total_revenue || 0),
        0,
      );
      const totalMargin = sales.reduce(
        (sum, s) => sum + (s.total_margin || 0),
        0,
      );
      const avgMarginPercent =
        sales.length > 0
          ? sales.reduce((sum, s) => sum + (s.avg_margin_percent || 0), 0) /
            sales.length
          : 0;
      const totalTransactions = sales.reduce(
        (sum, s) => sum + (s.transaction_count || 0),
        0,
      );

      setStats({
        totalRevenue,
        totalMargin,
        avgMarginPercent,
        totalTransactions,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, venueId]);

  React.useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  const statCards: StatCard[] = [
    {
      label: "Total Revenue",
      value: `$${stats.totalRevenue.toFixed(2)}`,
      change: 12.5,
      icon: <DollarSign className="w-6 h-6" />,
      trend: "up",
    },
    {
      label: "Total Margin",
      value: `$${stats.totalMargin.toFixed(2)}`,
      change: 8.3,
      icon: <TrendingUp className="w-6 h-6" />,
      trend: "up",
    },
    {
      label: "Avg Margin %",
      value: `${stats.avgMarginPercent.toFixed(1)}%`,
      change: -2.1,
      icon: <BarChart3 className="w-6 h-6" />,
      trend: "down",
    },
    {
      label: "Transactions",
      value: stats.totalTransactions.toString(),
      change: 5.4,
      icon: <ShoppingCart className="w-6 h-6" />,
      trend: "up",
    },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">POS Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Sales tracking and revenue analytics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Venue</label>
            <select
              value={venueId}
              onChange={(e) => setVenueId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-background border border-border"
            >
              <option value="">Select venue...</option>
              <option value="venue-001">Main Venue</option>
              <option value="venue-002">Downtown Location</option>
            </select>
          </div>

          <div className="md:col-span-2 flex items-end gap-2">
            {(["week", "month", "year"] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex-1 ${
                  selectedPeriod === period
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {!venueId ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Select a venue to view dashboard.
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map((stat) => (
                <Card key={stat.label}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          {stat.label}
                        </p>
                        <p className="text-2xl font-bold">{stat.value}</p>
                        <div
                          className={`text-xs font-semibold mt-2 flex items-center gap-1 ${
                            stat.trend === "up"
                              ? "text-emerald-600"
                              : "text-rose-600"
                          }`}
                        >
                          {stat.trend === "up" ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {Math.abs(stat.change)}%
                        </div>
                      </div>
                      <div className="text-primary">{stat.icon}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Sales Trend</CardTitle>
                <CardDescription>Revenue by day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {salesData.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No sales data available
                    </p>
                  ) : (
                    salesData.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-muted-foreground">
                          {format(new Date(item.period), "MMM dd")}
                        </span>
                        <span className="font-semibold">
                          ${(item.total_revenue || 0).toFixed(0)}
                        </span>
                        <span className="text-muted-foreground">
                          {item.transaction_count} tx
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Selling Items</CardTitle>
                  <CardDescription>Best performers</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topItems.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No sales data
                    </p>
                  ) : (
                    topItems.slice(0, 5).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-semibold">{item.item_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.transaction_count} sales • Avg: $
                            {item.avg_price.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            {item.total_qty.toFixed(0)} units
                          </p>
                          <p className="text-xs text-emerald-600">
                            ${item.total_revenue.toFixed(0)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Margin Analysis</CardTitle>
                  <CardDescription>Profitability by day</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {revenueReport.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No report data
                    </p>
                  ) : (
                    revenueReport.slice(0, 5).map((report, idx) => (
                      <div key={idx} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold">
                            {format(new Date(report.sale_date), "MMM dd, yyyy")}
                          </p>
                          <span className="text-sm font-bold">
                            {report.avg_margin_percent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div>
                            <p>Revenue</p>
                            <p className="text-primary font-semibold">
                              ${report.total_revenue.toFixed(0)}
                            </p>
                          </div>
                          <div>
                            <p>Margin</p>
                            <p className="text-emerald-600 font-semibold">
                              ${report.total_margin.toFixed(0)}
                            </p>
                          </div>
                          <div>
                            <p>Transactions</p>
                            <p className="font-semibold">
                              {report.transactions}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="border-yellow-500/40 bg-yellow-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" /> Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {stats.avgMarginPercent < 20 ? (
                  <p className="text-yellow-700">
                    Average margin is below target (20%). Consider pricing
                    optimization.
                  </p>
                ) : null}
                {topItems.length === 0 ? (
                  <p className="text-yellow-700">
                    No sales data available for the selected period.
                  </p>
                ) : null}
                {stats.totalTransactions > 0 ? (
                  <p className="text-emerald-700">
                    Sales integration is active.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
