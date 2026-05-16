/**
 * Employee Progress Chart Component
 *
 * Visualizes employee progress over time with charts
 * Shows trends, milestones, and trajectory
 */

import React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Calendar,
  RefreshCw,
  Download,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/glass";

interface ProgressDataPoint {
  date: string;
  overallRating: number;
  punctuality: number;
  quality: number;
  teamwork: number;
  communication: number;
  problemSolving: number;
}

interface EmployeeProgressChart {
  employeeId: string;
  employeeName: string;
  dataPoints: ProgressDataPoint[];
  trends: Record<string, "improving" | "stable" | "declining">;
  milestones: Array<{
    date: string;
    type: string;
    description: string;
    value: number;
  }>;
  trajectory: {
    currentLevel: number;
    projectedLevel: number;
    growthRate: number;
    confidence: number;
  };
  insights: string[];
}

export function EmployeeProgressChart({ employeeId }: { employeeId: string }) {
  const { toast } = useToast();
  const [chart, setChart] = React.useState<EmployeeProgressChart | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [startDate, setStartDate] = React.useState(
    format(subDays(new Date(), 90), "yyyy-MM-dd"),
  );
  const [endDate, setEndDate] = React.useState(format(new Date(), "yyyy-MM-dd"));

  React.useEffect(() => {
    loadChart();
  }, [employeeId, startDate, endDate]);

  const loadChart = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/development/progress/${employeeId}?startDate=${startDate}&endDate=${endDate}`,
      );
      const data = await response.json();
      if (data.success) {
        setChart(data.data);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load progress chart",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const chartData =
    chart?.dataPoints.map((p) => ({
      date: format(new Date(p.date), "MMM d"),
      overall: p.overallRating,
      punctuality: p.punctuality,
      quality: p.quality,
      teamwork: p.teamwork,
      communication: p.communication,
      problemSolving: p.problemSolving,
    })) || [];

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-8 h-8 text-primary" />
            Employee Progress Chart
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track performance over time with trends and milestones
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
          />
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
          />
          <Button onClick={loadChart} disabled={loading}>
            <RefreshCw
              className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      {chart && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Current Level
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {chart.trajectory.currentLevel.toFixed(0)}/100
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Projected (30 days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {chart.trajectory.projectedLevel.toFixed(0)}/100
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Growth Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {chart.trajectory.growthRate > 0 ? "+" : ""}
                  {chart.trajectory.growthRate.toFixed(1)}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Confidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {chart.trajectory.confidence.toFixed(0)}%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
              <CardDescription>
                {chart.dataPoints.length} data point(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                  />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" domain={[0, 5]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="overall"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    name="Overall Rating"
                  />
                  <Line
                    type="monotone"
                    dataKey="quality"
                    stroke="#10b981"
                    strokeWidth={1}
                    name="Quality"
                  />
                  <Line
                    type="monotone"
                    dataKey="teamwork"
                    stroke="#3b82f6"
                    strokeWidth={1}
                    name="Teamwork"
                  />
                  <Line
                    type="monotone"
                    dataKey="communication"
                    stroke="#f59e0b"
                    strokeWidth={1}
                    name="Communication"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(chart.trends).map(([metric, trend]) => (
                  <div
                    key={metric}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <span className="font-medium text-foreground capitalize">
                      {metric}
                    </span>
                    {trend === "improving" ? (
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    ) : trend === "declining" ? (
                      <TrendingDown className="w-5 h-5 text-red-600" />
                    ) : (
                      <Target className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Milestones */}
          {chart.milestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {chart.milestones.map((milestone, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 border border-border rounded-lg"
                    >
                      <Award className="w-5 h-5 text-yellow-600" />
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          {milestone.description}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(milestone.date), "PPP")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Insights */}
          {chart.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>AI Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {chart.insights.map((insight, idx) => (
                    <li key={idx}>{insight}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
