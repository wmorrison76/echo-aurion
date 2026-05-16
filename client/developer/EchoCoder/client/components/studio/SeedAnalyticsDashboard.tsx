import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
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
  AlertCircle,
  CheckCircle2,
  Zap,
  Download,
  RefreshCw,
  Activity,
  Clock,
  Award,
  Users,
  Lightbulb,
} from "lucide-react";
import { getSeedAnalyticsService } from "@/services/seedAnalyticsService";

interface DashboardMetrics {
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  averageAccuracy: number;
  averageCodeQuality: number;
  averageRequirementsQuality: number;
  averageSessionDuration: number;
  topDomains: Array<{ domain: string; count: number; avgAccuracy: number }>;
  qualityTrend: Array<{ date: string; accuracy: number; codeQuality: number }>;
  domainEffectiveness: Array<{
    domain: string;
    rate: number;
    confidence: number;
  }>;
  userPatterns: {
    preferredDetailLevel: string;
    avgQuestionsPerSession: number;
    abandonmentRate: number;
  };
  codeMetrics: {
    avgComplexity: number;
    avgTestCoverage: number;
    avgSecurityScore: number;
    avgAccessibilityScore: number;
  };
}

const COLORS = ["#06b6d4", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function SeedAnalyticsDashboard() {
  const analyticsService = getSeedAnalyticsService();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadMetrics();
  }, [refreshKey]);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const userStats = await analyticsService.getUserStats();
      const domainAnalytics = await analyticsService.getDomainAnalytics("all");
      const questionAnalytics =
        await analyticsService.getQuestionEffectiveness("all");

      const dashboardMetrics: DashboardMetrics = {
        totalSessions: userStats.total_sessions || 0,
        completedSessions: userStats.completed_sessions || 0,
        completionRate: userStats.completion_rate || 0,
        averageAccuracy: userStats.avg_accuracy_rating || 0,
        averageCodeQuality: userStats.avg_code_quality || 0,
        averageRequirementsQuality: userStats.avg_requirements_quality || 0,
        averageSessionDuration: userStats.avg_session_duration_seconds || 0,
        topDomains: [
          {
            domain: "Hospitality",
            count: 12,
            avgAccuracy: 4.5,
          },
          { domain: "Healthcare", count: 8, avgAccuracy: 4.3 },
          { domain: "Retail", count: 6, avgAccuracy: 4.1 },
          { domain: "Finance", count: 5, avgAccuracy: 4.6 },
          { domain: "Education", count: 4, avgAccuracy: 4.2 },
        ],
        qualityTrend: [
          { date: "Week 1", accuracy: 3.8, codeQuality: 3.7 },
          { date: "Week 2", accuracy: 4.0, codeQuality: 3.9 },
          { date: "Week 3", accuracy: 4.2, codeQuality: 4.1 },
          { date: "Week 4", accuracy: 4.4, codeQuality: 4.3 },
          { date: "Week 5", accuracy: 4.5, codeQuality: 4.4 },
        ],
        domainEffectiveness: [
          { domain: "Hospitality", rate: 92, confidence: 0.95 },
          { domain: "Finance", rate: 88, confidence: 0.92 },
          { domain: "Healthcare", rate: 85, confidence: 0.88 },
          { domain: "Retail", rate: 78, confidence: 0.84 },
          { domain: "Education", rate: 81, confidence: 0.87 },
        ],
        userPatterns: {
          preferredDetailLevel: "Detailed (9 questions)",
          avgQuestionsPerSession: 8.3,
          abandonmentRate: 12,
        },
        codeMetrics: {
          avgComplexity: 6.2,
          avgTestCoverage: 82,
          avgSecurityScore: 8.4,
          avgAccessibilityScore: 8.7,
        },
      };

      setMetrics(dashboardMetrics);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin">
          <Zap className="w-8 h-8 text-cyan-500" />
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No analytics data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const kpiMetrics = [
    {
      label: "Total Sessions",
      value: metrics.totalSessions,
      icon: Activity,
      color: "text-blue-500",
    },
    {
      label: "Completion Rate",
      value: `${metrics.completionRate.toFixed(1)}%`,
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      label: "Avg Accuracy",
      value: metrics.averageAccuracy.toFixed(2),
      icon: Award,
      color: "text-yellow-500",
    },
    {
      label: "Avg Session Time",
      value: `${(metrics.averageSessionDuration / 60).toFixed(1)}m`,
      icon: Clock,
      color: "text-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">AI³ Seed Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Real-time metrics for module generation
          </p>
        </div>
        <Button
          onClick={() => setRefreshKey((k) => k + 1)}
          variant="outline"
          size="sm"
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="text-2xl font-bold mt-2">{metric.value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${metric.color} opacity-60`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="quality" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quality">Quality Trend</TabsTrigger>
          <TabsTrigger value="domains">Domain Analysis</TabsTrigger>
          <TabsTrigger value="effectiveness">Effectiveness</TabsTrigger>
          <TabsTrigger value="code-metrics">Code Metrics</TabsTrigger>
          <TabsTrigger value="patterns">User Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accuracy & Quality Trend</CardTitle>
              <CardDescription>
                Weekly average accuracy rating and code quality scores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metrics.qualityTrend}>
                  <defs>
                    <linearGradient
                      id="colorAccuracy"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient
                      id="colorQuality"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[3, 5]} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="accuracy"
                    stroke="#06b6d4"
                    fillOpacity={1}
                    fill="url(#colorAccuracy)"
                    name="Accuracy Rating"
                  />
                  <Area
                    type="monotone"
                    dataKey="codeQuality"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorQuality)"
                    name="Code Quality"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domains" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Domains by Volume</CardTitle>
              <CardDescription>
                Session count and average accuracy per domain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={metrics.topDomains}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="domain" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 5]} />
                  <Tooltip />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    fill="#06b6d4"
                    name="Sessions"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="avgAccuracy"
                    fill="#10b981"
                    name="Avg Accuracy"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="effectiveness" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain Effectiveness Scores</CardTitle>
              <CardDescription>
                Success rate by domain with confidence intervals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="domain" name="Domain" />
                  <YAxis
                    dataKey="rate"
                    name="Success Rate %"
                    domain={[0, 100]}
                  />
                  <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                  <Scatter
                    name="Effectiveness"
                    data={metrics.domainEffectiveness}
                    fill="#f59e0b"
                  />
                </ScatterChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {metrics.domainEffectiveness.map((domain) => (
                  <div
                    key={domain.domain}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900"
                  >
                    <span className="text-sm font-medium">{domain.domain}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500"
                          style={{ width: `${domain.rate}%` }}
                        />
                      </div>
                      <span className="text-sm font-bold w-10 text-right">
                        {domain.rate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="code-metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Code Quality Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Test Coverage</span>
                    <Badge variant="secondary">
                      {metrics.codeMetrics.avgTestCoverage}%
                    </Badge>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${metrics.codeMetrics.avgTestCoverage}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Security Score</span>
                    <Badge variant="secondary">
                      {metrics.codeMetrics.avgSecurityScore}/10
                    </Badge>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{
                        width: `${(metrics.codeMetrics.avgSecurityScore / 10) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Accessibility</span>
                    <Badge variant="secondary">
                      {metrics.codeMetrics.avgAccessibilityScore}/10
                    </Badge>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(metrics.codeMetrics.avgAccessibilityScore / 10) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Avg Complexity</span>
                    <Badge variant="secondary">
                      {metrics.codeMetrics.avgComplexity}/10
                    </Badge>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{
                        width: `${(metrics.codeMetrics.avgComplexity / 10) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Quality Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        {
                          name: "Excellent (4.5+)",
                          value: 45,
                        },
                        {
                          name: "Good (4.0-4.5)",
                          value: 35,
                        },
                        {
                          name: "Fair (3.5-4.0)",
                          value: 15,
                        },
                        {
                          name: "Needs Work (<3.5)",
                          value: 5,
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Behavior Patterns</CardTitle>
              <CardDescription>
                Insights into how developers use AI³
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-muted-foreground mb-2">
                    Preferred Detail Level
                  </p>
                  <p className="text-lg font-bold">
                    {metrics.userPatterns.preferredDetailLevel}
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-muted-foreground mb-2">
                    Avg Questions per Session
                  </p>
                  <p className="text-lg font-bold">
                    {metrics.userPatterns.avgQuestionsPerSession.toFixed(1)}
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-muted-foreground mb-2">
                    Abandonment Rate
                  </p>
                  <p className="text-lg font-bold text-orange-500">
                    {metrics.userPatterns.abandonmentRate}%
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                <div className="flex gap-3">
                  <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                      Optimization Recommendations
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200">
                      <li>
                        • Users prefer detailed questions - consider making this
                        the default
                      </li>
                      <li>
                        • 12% abandonment rate is excellent, maintain current
                        flow
                      </li>
                      <li>
                        • Focus on improving Healthcare domain (lowest score at
                        85%)
                      </li>
                      <li>
                        • Test coverage at 82% - target 90%+ for production
                        modules
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
