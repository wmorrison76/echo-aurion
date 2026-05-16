import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  DollarSign,
  Target,
} from "lucide-react";

interface MetricCard {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

interface RevenueData {
  period: string;
  revenue: number;
  growth: number;
}

const defaultMetrics: MetricCard[] = [
  {
    title: "Total Revenue",
    value: "$148,500",
    change: 12.5,
    icon: <DollarSign className="h-5 w-5" />,
    color: "emerald",
  },
  {
    title: "Customer LTV",
    value: "$2,450",
    change: 8.3,
    icon: <Users className="h-5 w-5" />,
    color: "blue",
  },
  {
    title: "Conversion Rate",
    value: "3.24%",
    change: 2.1,
    icon: <Target className="h-5 w-5" />,
    color: "purple",
  },
  {
    title: "Avg Order Value",
    value: "$185",
    change: -1.5,
    icon: <TrendingUp className="h-5 w-5" />,
    color: "orange",
  },
];

const revenueData: RevenueData[] = [
  { period: "Jan", revenue: 45000, growth: 5 },
  { period: "Feb", revenue: 52000, growth: 15.5 },
  { period: "Mar", revenue: 48000, growth: -7.7 },
  { period: "Apr", revenue: 61000, growth: 27 },
  { period: "May", revenue: 55000, growth: -9.8 },
  { period: "Jun", revenue: 66000, growth: 20 },
];

const topCustomers = [
  { name: "Sarah Johnson", spent: 18500, orders: 45, lastOrder: "2025-01-12" },
  { name: "Michael Chen", spent: 14200, orders: 28, lastOrder: "2025-01-10" },
  {
    name: "Emily Rodriguez",
    spent: 12500,
    orders: 24,
    lastOrder: "2025-01-13",
  },
  { name: "David Thompson", spent: 11800, orders: 20, lastOrder: "2025-01-08" },
  { name: "Jessica Lee", spent: 10300, orders: 18, lastOrder: "2025-01-11" },
];

export default function AurumContent() {
  const [timeRange, setTimeRange] = useState<
    "week" | "month" | "quarter" | "year"
  >("month");

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      emerald:
        "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
      blue: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
      purple:
        "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
      orange:
        "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
    };
    return colors[color] || colors.blue;
  };

  const getTextColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      emerald: "text-emerald-700 dark:text-emerald-400",
      blue: "text-blue-700 dark:text-blue-400",
      purple: "text-purple-700 dark:text-purple-400",
      orange: "text-orange-700 dark:text-orange-400",
    };
    return colors[color] || colors.blue;
  };

  const getChangeColor = (change: number) => {
    return change > 0
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-6 h-full overflow-y-auto pb-4">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(["week", "month", "quarter", "year"] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded text-sm font-semibold transition-colors ${
              timeRange === range
                ? "bg-blue-500 text-white"
                : "bg-slate-200 dark:bg-slate-800 text-foreground hover:bg-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {range.charAt(0).toUpperCase() + range.slice(1)}
          </button>
        ))}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-4 gap-4">
        {defaultMetrics.map((metric, idx) => (
          <Card key={idx} className={`border ${getColorClasses(metric.color)}`}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div
                  className={`p-3 rounded-lg ${getColorClasses(metric.color)}`}
                >
                  <div className={getTextColorClasses(metric.color)}>
                    {metric.icon}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`${getChangeColor(metric.change)} border-current`}
                >
                  {metric.change > 0 ? "+" : ""}
                  {metric.change}%
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs mb-1">
                {metric.title}
              </p>
              <p className="text-2xl font-bold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueData.map((data, idx) => {
                const maxRevenue = Math.max(
                  ...revenueData.map((d) => d.revenue),
                );
                const percentage = (data.revenue / maxRevenue) * 100;

                return (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-semibold">
                        {data.period}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ${(data.revenue / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <div
                      className={`text-xs font-semibold mt-1 ${getChangeColor(data.growth)}`}
                    >
                      {data.growth > 0 ? "↑" : "↓"} {Math.abs(data.growth)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Customer Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Top Segments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>VIP Customers (10%)</span>
                <span className="font-semibold">$45,200</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: "42%" }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Regular (40%)</span>
                <span className="font-semibold">$52,100</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: "48%" }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Occasional (50%)</span>
                <span className="font-semibold">$51,200</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: "47%" }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Customers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Customers by LTV</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 font-semibold">Customer</th>
                  <th className="text-right py-2 font-semibold">Total Spent</th>
                  <th className="text-center py-2 font-semibold">Orders</th>
                  <th className="text-right py-2 font-semibold">Last Order</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((customer, idx) => (
                  <tr
                    key={idx}
                    className="border-b hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    <td className="py-3 font-semibold">{customer.name}</td>
                    <td className="text-right py-3 text-emerald-600 dark:text-emerald-400 font-bold">
                      ${customer.spent.toLocaleString()}
                    </td>
                    <td className="text-center py-3">
                      <Badge variant="outline">{customer.orders}</Badge>
                    </td>
                    <td className="text-right py-3 text-muted-foreground">
                      {customer.lastOrder}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base">Key Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="text-2xl">📈</div>
            <div>
              <p className="font-semibold text-sm">Revenue Growing Steadily</p>
              <p className="text-xs text-muted-foreground">
                June showed 20% growth with strong customer retention at 87%
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-2xl">👥</div>
            <div>
              <p className="font-semibold text-sm">
                VIP Customers Driving Value
              </p>
              <p className="text-xs text-muted-foreground">
                Top 10% of customers account for 30% of total revenue
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <p className="font-semibold text-sm">AOV Declining Slightly</p>
              <p className="text-xs text-muted-foreground">
                Consider upsell and cross-sell strategies to increase per-order
                value
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
