import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Star,
  Code2,
  FileText,
  Target,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  getAI3AnalyticsService,
  type AnalyticsDashboardData,
  type DomainStat,
} from "@/services/ai3AnalyticsService";

interface AI3AnalyticsDashboardProps {
  userId?: string;
  onExport?: () => void;
}

export const AI3AnalyticsDashboard: React.FC<AI3AnalyticsDashboardProps> = ({
  userId = "current-user",
  onExport,
}) => {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const analyticsService = getAI3AnalyticsService();

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const dashboardData = await analyticsService.getDashboardData(userId);
      setData(dashboardData);
      setError(null);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      const analyticsJson = await analyticsService.exportAnalytics(userId);
      const blob = new Blob([analyticsJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai3-analytics-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onExport?.();
    } catch (err) {
      console.error("Failed to export analytics:", err);
    }
  };

  if (error) {
    return (
      <Card className="w-full border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading analytics...</span>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 text-center text-muted-foreground">
          No analytics data available
        </CardContent>
      </Card>
    );
  }

  const completionRate = Math.round(data.performanceMetrics.completionRate * 100);
  const completionTrend =
    completionRate > 80 ? "up" : completionRate > 50 ? "stable" : "down";

  const domainColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI³ Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Track your AI³ Seed Generator performance and insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">{data.totalSessions}</p>
                <p className="text-xs text-muted-foreground">
                  {data.completedSessions} completed
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Accuracy Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">{data.averageAccuracyRating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">out of 5.0</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Code Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">{data.averageCodeQuality.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">out of 5.0</p>
              </div>
              <Code2 className="h-8 w-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold">{completionRate}%</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {completionTrend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span>{completionRate > 75 ? "Trending up" : "Trending down"}</span>
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Session Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Session Distribution</CardTitle>
                <CardDescription>Sessions by status</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Completed", value: data.completedSessions },
                        {
                          name: "In Progress",
                          value: data.totalSessions - data.completedSessions,
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#94a3b8" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Sessions</CardTitle>
                <CardDescription>Your latest AI³ sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                  {data.recentSessions.length > 0 ? (
                    data.recentSessions.slice(0, 5).map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between text-sm p-2 rounded border"
                      >
                        <div className="flex-1">
                          <p className="font-medium truncate">{session.initial_problem}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.domain || "General"} •{" "}
                            {new Date(session.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            session.status === "completed" ? "default" : "secondary"
                          }
                          className="ml-2"
                        >
                          {session.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No sessions yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Domains</CardTitle>
              <CardDescription>Performance by domain</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topDomains.length > 0 ? (
                <div className="space-y-4">
                  {data.topDomains.map((domain: DomainStat, index: number) => (
                    <div key={domain.domain || index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: domainColors[index % domainColors.length] }}
                          />
                          <span className="font-medium text-sm">{domain.domain}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {domain.total_sessions} sessions
                          </span>
                          <Badge variant={domain.is_recommended ? "default" : "secondary"}>
                            {domain.trending}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <div>
                          <p className="text-muted-foreground">Accuracy</p>
                          <p className="font-medium">
                            {(domain.avg_accuracy_rating || 0).toFixed(1)}/5.0
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Completion</p>
                          <p className="font-medium">
                            {Math.round(domain.completion_rate)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No domain data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Questions</CardTitle>
              <CardDescription>Most effective questions in your sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {data.topQuestions.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {data.topQuestions.map((question) => (
                    <div key={question.id} className="p-3 rounded border space-y-2">
                      <p className="text-sm font-medium line-clamp-2">
                        {question.question_text}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex gap-4 text-muted-foreground">
                          <span>Asked: {question.times_asked}</span>
                          <span>Helpful: {question.times_helpful}</span>
                          <span>Skipped: {question.times_skipped}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">
                            {question.effectiveness_score.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No question data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {data.performanceMetrics.avgSessionDuration}s
                </p>
                <p className="text-xs text-muted-foreground">per session</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Conversations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {data.performanceMetrics.avgConversationTurns.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">turns per session</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {Math.round(data.performanceMetrics.completionRate * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">sessions finished</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session Quality Trend</CardTitle>
              <CardDescription>Accuracy and code quality over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={[
                    {
                      name: "Recent",
                      accuracy: data.averageAccuracyRating,
                      quality: data.averageCodeQuality,
                    },
                    {
                      name: "All Time",
                      accuracy: data.averageAccuracyRating * 0.95,
                      quality: data.averageCodeQuality * 0.92,
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#3b82f6"
                    name="Accuracy Rating"
                  />
                  <Line
                    type="monotone"
                    dataKey="quality"
                    stroke="#10b981"
                    name="Code Quality"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AI3AnalyticsDashboard;
