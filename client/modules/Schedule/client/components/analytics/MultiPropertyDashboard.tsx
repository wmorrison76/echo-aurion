import React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { AlertCircle, TrendingUp, DollarSign, Users } from "lucide-react";

interface PropertySummary {
  outlet: string;
  revenue: number;
  labor_cost: number;
  tips: number;
  labor_pct: number;
}

interface TrendData {
  week: string;
  revenue: number;
  labor_cost: number;
  labor_pct: number;
}

interface MultiPropertyDashboardProps {
  org_id: string;
  onPropertySelect?: (outlet: string) => void;
}

export const MultiPropertyDashboard: React.FC<MultiPropertyDashboardProps> = ({ org_id, onPropertySelect }) => {
  const [summary, setSummary] = React.useState<PropertySummary[]>([]);
  const [trend, setTrend] = React.useState<TrendData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org_id]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const summaryRes = await fetch(`/api/org-summary?org_id=${org_id}`);
      if (!summaryRes.ok) throw new Error("Failed to fetch summary");
      const summaryData = await summaryRes.json();
      setSummary(summaryData);

      const trendRes = await fetch(`/api/org-summary/trend?org_id=${org_id}&weeks=13`);
      if (!trendRes.ok) throw new Error("Failed to fetch trend");
      const trendData = await trendRes.json();
      setTrend(trendData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading dashboard...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-lg border-red-500/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-5 w-5" /> {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  const totals = summary.reduce(
    (acc, p) => ({
      revenue: acc.revenue + p.revenue,
      labor_cost: acc.labor_cost + p.labor_cost,
      tips: acc.tips + p.tips,
    }),
    { revenue: 0, labor_cost: 0, tips: 0 },
  );
  const avgLaborPct = totals.revenue > 0 ? Math.round((totals.labor_cost / totals.revenue) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <Card className="shadow-lg bg-gradient-to-br from-cyan-900 to-cyan-800 border-cyan-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-cyan-200 text-sm">Total Revenue</p>
                <p className="text-2xl font-bold text-cyan-300">${(totals.revenue / 1000).toFixed(1)}k</p>
              </div>
              <DollarSign className="h-10 w-10 text-cyan-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg bg-gradient-to-br from-red-900 to-red-800 border-red-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-200 text-sm">Labor %</p>
                <p className="text-2xl font-bold text-red-300">{avgLaborPct.toFixed(1)}%</p>
                <p className="text-xs text-red-400 mt-1">${totals.labor_cost.toFixed(0)} total</p>
              </div>
              <Users className="h-10 w-10 text-red-400/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg bg-gradient-to-br from-green-900 to-green-800 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-200 text-sm">Total Tips</p>
                <p className="text-2xl font-bold text-green-300">${totals.tips.toFixed(0)}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl bg-surface text-white border-cyan-500/20">
        <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600">
          <h3 className="text-lg font-semibold">Property Comparison</h3>
        </CardHeader>
        <CardContent className="pt-6" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={summary}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="outlet" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #00ffff" }} />
              <Legend />
              <Bar dataKey="revenue" fill="#00ffff" name="Revenue" />
              <Bar dataKey="labor_cost" fill="#ff8800" name="Labor Cost" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-xl bg-surface text-white border-cyan-500/20">
        <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600">
          <h3 className="text-lg font-semibold">13-Week Trend</h3>
        </CardHeader>
        <CardContent className="pt-6" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="week" stroke="#999" />
              <YAxis stroke="#999" />
              <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #00ffff" }} />
              <Legend />
              <Line type="monotone" dataKey="labor_pct" stroke="#00ffff" name="Labor %" />
              <Line type="monotone" dataKey="revenue" stroke="#00ff00" name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="shadow-xl bg-surface text-white border-cyan-500/20">
        <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600">
          <h3 className="text-lg font-semibold">Property Details</h3>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-4 text-cyan-300">Outlet</th>
                  <th className="text-right py-2 px-4 text-cyan-300">Revenue</th>
                  <th className="text-right py-2 px-4 text-cyan-300">Labor Cost</th>
                  <th className="text-right py-2 px-4 text-cyan-300">Labor %</th>
                  <th className="text-right py-2 px-4 text-cyan-300">Tips</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((p, i) => (
                  <tr
                    key={i}
                    className="border-b border-border hover:bg-slate-800/50 cursor-pointer"
                    onClick={() => onPropertySelect?.(p.outlet)}
                  >
                    <td className="py-3 px-4">{p.outlet}</td>
                    <td className="text-right py-3 px-4">${p.revenue.toFixed(0)}</td>
                    <td className="text-right py-3 px-4">${p.labor_cost.toFixed(0)}</td>
                    <td
                      className={`text-right py-3 px-4 font-semibold ${
                        p.labor_pct > 35 ? "text-red-400" : p.labor_pct > 32 ? "text-yellow-400" : "text-green-400"
                      }`}
                    >
                      {p.labor_pct.toFixed(1)}%
                    </td>
                    <td className="text-right py-3 px-4">${p.tips.toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiPropertyDashboard;
