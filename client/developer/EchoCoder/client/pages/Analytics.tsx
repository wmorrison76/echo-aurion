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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ResponsiveContainer as ResponsiveLayoutContainer,
  ResponsiveGrid,
  useBreakpoint,
} from "@/components/layout";
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Zap,
  Download,
  RefreshCw,
} from "lucide-react";
import { getAnalyticsService } from "@/services/analyticsService";

export default function AnalyticsPage() {
  const analytics = getAnalyticsService();
  const [loading, setLoading] = useState(true);
  const [codeGenMetrics, setCodeGenMetrics] = useState<any>({});
  const [perfMetrics, setPerfMetrics] = useState<any>({});
  const [predictions, setPredictions] = useState<any>({});
  const [errors, setErrors] = useState<any[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";

  useEffect(() => {
    loadAnalytics();
  }, [refreshKey]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [codeGen, perf, pred, errs] = await Promise.all([
        analytics.getCodeGenerationAnalytics(30),
        analytics.getPerformanceSummary(undefined, 30),
        analytics.generatePredictions(),
        analytics.getErrorLogs(30, 20),
      ]);

      setCodeGenMetrics(codeGen);
      setPerfMetrics(perf);
      setPredictions(pred);
      setErrors(errs);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    const data = await analytics.getFullAnalyticsExport(90);
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
    }
  };

  const trendColor =
    predictions.trend === "improving"
      ? "text-green-600"
      : predictions.trend === "declining"
        ? "text-red-600"
        : "text-gray-600";

  return (
    <ResponsiveLayoutContainer className="py-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 sm:h-10 sm:w-10" />
              <span>Analytics & Insights</span>
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground mt-2">
              Real-time metrics, performance tracking, and AI predictions
            </p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="flex-1 sm:flex-none text-xs sm:text-sm"
              size={isMobile ? "sm" : "default"}
              aria-label="Refresh analytics data"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
              <span className="inline sm:hidden">Refresh</span>
            </Button>
            <Button 
              onClick={handleExport} 
              className="flex-1 sm:flex-none text-xs sm:text-sm"
              size={isMobile ? "sm" : "default"}
              aria-label="Export analytics data"
            >
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
              <span className="inline sm:hidden">Export</span>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <ResponsiveGrid 
              cols={{ xs: 1, sm: 2, md: 2, lg: 4, xl: 4 }} 
              gap="md"
            >
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Modules Generated
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold">
                    {codeGenMetrics.total_modules_generated || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Avg Generation Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold">
                    {Math.round(codeGenMetrics.avg_generation_time || 0)}ms
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Per module
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Success Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold">
                    {Math.round(codeGenMetrics.success_rate || 0)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Generation success
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                    Total Cost
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl sm:text-3xl font-bold">
                    ${(codeGenMetrics.total_cost || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    API costs
                  </p>
                </CardContent>
              </Card>
            </ResponsiveGrid>

            {/* AI Predictions */}
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  AI Predictions & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ResponsiveGrid 
                  cols={{ xs: 1, sm: 2, md: 2, lg: 4, xl: 4 }} 
                  gap="md"
                >
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Predicted Error Rate
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {predictions.predicted_error_rate || 0}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Next Most Used Module
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {predictions.next_most_used_module || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Predicted Gen Time
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {predictions.predicted_generation_time_ms || 0}ms
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Usage Trend
                    </p>
                    <Badge className={`mt-2 ${trendColor}`}>
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {predictions.trend || "stable"}
                    </Badge>
                  </div>
                </ResponsiveGrid>

                {predictions.recommended_optimizations &&
                  predictions.recommended_optimizations.length > 0 && (
                    <div className="pt-4 border-t border-blue-200 dark:border-blue-800 space-y-2">
                      <p className="text-xs sm:text-sm font-medium">Recommendations:</p>
                      <div className="space-y-2">
                        {predictions.recommended_optimizations.map(
                          (rec: string, i: number) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-xs sm:text-sm"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                              <span>{rec}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Detailed Metrics */}
            <Tabs defaultValue="performance" className="w-full">
              <TabsList className={`grid w-full gap-1 ${
                isMobile ? "grid-cols-1" : "grid-cols-3"
              }`}>
                <TabsTrigger value="performance" className="text-xs sm:text-sm">
                  Performance
                </TabsTrigger>
                <TabsTrigger value="errors" className="text-xs sm:text-sm">
                  Errors ({errors.length})
                </TabsTrigger>
                <TabsTrigger value="summary" className="text-xs sm:text-sm">
                  Summary
                </TabsTrigger>
              </TabsList>

              {/* Performance Tab */}
              <TabsContent value="performance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Performance Metrics</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Last 30 days - Memory, CPU, render times
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Object.entries(perfMetrics).length > 0 ? (
                      <ResponsiveGrid 
                        cols={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 3 }} 
                        gap="md"
                      >
                        {Object.entries(perfMetrics).map(
                          ([metric, data]: [string, any]) => (
                            <div
                              key={metric}
                              className="p-3 sm:p-4 border rounded-lg space-y-2"
                            >
                              <h4 className="font-semibold capitalize text-xs sm:text-sm">
                                {metric}
                              </h4>
                              <div className="grid grid-cols-3 gap-2 text-xs">
                                <div>
                                  <p className="text-muted-foreground text-xs">Avg</p>
                                  <p className="font-bold">
                                    {Math.round(data.avg)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Min</p>
                                  <p className="font-bold">
                                    {Math.round(data.min)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground text-xs">Max</p>
                                  <p className="font-bold">
                                    {Math.round(data.max)}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Samples: {data.count}
                              </p>
                            </div>
                          ),
                        )}
                      </ResponsiveGrid>
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        No performance data available
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Errors Tab */}
              <TabsContent value="errors" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Error Logs</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Unresolved errors from last 30 days
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {errors.length > 0 ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {errors.map((err) => (
                          <div
                            key={err.id}
                            className="p-3 sm:p-4 border rounded-lg space-y-2 bg-red-50/50 dark:bg-red-950/20"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-red-900 dark:text-red-100 text-xs sm:text-sm">
                                  {err.error_type}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {err.error_message}
                                </p>
                              </div>
                              <Badge variant="destructive" className="text-xs flex-shrink-0">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Unresolved</span>
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {err.module_name} •{" "}
                              {new Date(err.timestamp).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                        <p className="text-xs sm:text-sm">No unresolved errors</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base sm:text-lg">Analytics Summary</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      30-day overview and insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ResponsiveGrid 
                      cols={{ xs: 1, sm: 2, md: 2, lg: 2, xl: 2 }} 
                      gap="md"
                    >
                      <div className="space-y-2 p-3 sm:p-4 border rounded-lg">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                          Total Code Lines Generated
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold">
                          {codeGenMetrics.total_lines || 0}
                        </p>
                      </div>
                      <div className="space-y-2 p-3 sm:p-4 border rounded-lg">
                        <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                          Most Used Model
                        </p>
                        <p className="text-2xl sm:text-3xl font-bold">
                          {codeGenMetrics.most_used_model || "N/A"}
                        </p>
                      </div>
                    </ResponsiveGrid>

                    <div className="pt-4 border-t space-y-3">
                      <h4 className="font-semibold text-sm">Insights</h4>
                      <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>High success rate indicates robust code generation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>Performance metrics are consistently tracked</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>AI-powered predictions help optimize workflows</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </ResponsiveLayoutContainer>
  );
}
