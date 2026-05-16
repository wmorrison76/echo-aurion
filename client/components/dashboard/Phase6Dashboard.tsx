import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
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
  ScatterChart,
  Scatter,
} from "recharts";
import {
  AlertCircle,
  TrendingUp,
  Zap,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "../ui/use-toast";

interface LaborForecast {
  id: string;
  eventId: string;
  predictedLaborHours: number;
  predictedStaffCount: number;
  predictedLaborCost: number;
  predictionConfidence: number;
  lowerBoundHours: number;
  upperBoundHours: number;
  forecastStatus: string;
  createdAt: string;
}

interface SchedulingSuggestion {
  id: string;
  productionTaskId: string;
  suggestedAssignments: Array<{
    employeeId: string;
    employeeName: string;
    role: string;
    estimatedHours: number;
    skillMatch: number;
    costEstimate: number;
  }>;
  solutionQualityScore: number;
  skillMatchPercentage: number;
  coveragePercentage: number;
  estimatedTotalCost: number;
  acceptanceStatus: string;
  createdAt: string;
}

interface ForecastAccuracy {
  meanAbsolutePercentageError: number;
  rootMeanSquaredError: number;
  totalForecasts: number;
  accurateForecasts: number;
}

export function Phase6Dashboard() {
  const [activeTab, setActiveTab] = useState("forecasts");
  const [forecasts, setForecasts] = useState<LaborForecast[]>([]);
  const [suggestions, setSuggestions] = useState<SchedulingSuggestion[]>([]);
  const [accuracy, setAccuracy] = useState<ForecastAccuracy | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedForecast, setSelectedForecast] =
    useState<LaborForecast | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<SchedulingSuggestion | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Load initial data
    if (activeTab === "forecasts") {
      loadForecasts();
    } else if (activeTab === "scheduling") {
      loadSuggestions();
    } else if (activeTab === "analytics") {
      loadAccuracy();
    }
  }, [activeTab]);

  const loadForecasts = async () => {
    setLoading(true);
    try {
      // In a real implementation, this would fetch from the API
      // const response = await fetch('/api/phase6/forecasts');
      // const data = await response.json();
      // setForecasts(data.data || []);

      // Mock data for demonstration
      const mockForecasts: LaborForecast[] = [
        {
          id: "f1",
          eventId: "e1",
          predictedLaborHours: 24.5,
          predictedStaffCount: 5,
          predictedLaborCost: 735,
          predictionConfidence: 0.92,
          lowerBoundHours: 20.8,
          upperBoundHours: 28.2,
          forecastStatus: "pending",
          createdAt: new Date().toISOString(),
        },
        {
          id: "f2",
          eventId: "e2",
          predictedLaborHours: 18.0,
          predictedStaffCount: 4,
          predictedLaborCost: 540,
          predictionConfidence: 0.88,
          lowerBoundHours: 15.3,
          upperBoundHours: 20.7,
          forecastStatus: "pending",
          createdAt: new Date().toISOString(),
        },
      ];
      setForecasts(mockForecasts);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load forecasts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockSuggestions: SchedulingSuggestion[] = [
        {
          id: "s1",
          productionTaskId: "t1",
          suggestedAssignments: [
            {
              employeeId: "emp1",
              employeeName: "Chef Sarah",
              role: "lead_chef",
              estimatedHours: 8,
              skillMatch: 95,
              costEstimate: 280,
            },
            {
              employeeId: "emp2",
              employeeName: "Sous Chef Mike",
              role: "sous_chef",
              estimatedHours: 6,
              skillMatch: 88,
              costEstimate: 210,
            },
            {
              employeeId: "emp3",
              employeeName: "Prep Assistant Alex",
              role: "prep_assistant",
              estimatedHours: 10,
              skillMatch: 78,
              costEstimate: 250,
            },
          ],
          solutionQualityScore: 87.5,
          skillMatchPercentage: 87,
          coveragePercentage: 95,
          estimatedTotalCost: 740,
          acceptanceStatus: "pending",
          createdAt: new Date().toISOString(),
        },
      ];
      setSuggestions(mockSuggestions);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load scheduling suggestions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAccuracy = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      const mockAccuracy: ForecastAccuracy = {
        meanAbsolutePercentageError: 8.5,
        rootMeanSquaredError: 3.2,
        totalForecasts: 42,
        accurateForecasts: 38,
      };
      setAccuracy(mockAccuracy);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load accuracy metrics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptSuggestion = async (suggestionId: string) => {
    setLoading(true);
    try {
      // POST /api/phase6/auto-schedule/{suggestionId}/accept
      toast({
        title: "Success",
        description: "Scheduling suggestion accepted",
      });
      await loadSuggestions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept suggestion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const rejectSuggestion = async (suggestionId: string) => {
    setLoading(true);
    try {
      // POST /api/phase6/auto-schedule/{suggestionId}/reject
      toast({
        title: "Success",
        description: "Scheduling suggestion rejected",
      });
      await loadSuggestions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject suggestion",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const confidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600";
    if (confidence >= 0.7) return "text-yellow-600";
    return "text-red-600";
  };

  const qualityColor = (quality: number) => {
    if (quality >= 85) return "text-green-600";
    if (quality >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="w-full space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Zap className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-slate-900">
            Phase 6: ML & Automation
          </h1>
        </div>
        <p className="text-slate-600">
          Machine learning forecasting, automated scheduling, and smart labor
          optimization
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total Forecasts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {accuracy?.totalForecasts || 0}
            </div>
            <p className="text-xs text-blue-700 mt-1">
              {accuracy?.accurateForecasts || 0} accurate
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Avg. Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {accuracy
                ? `${(100 - accuracy.meanAbsolutePercentageError).toFixed(1)}%`
                : "—"}
            </div>
            <p className="text-xs text-green-700 mt-1">
              Mean error: {accuracy?.meanAbsolutePercentageError.toFixed(1)}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Pending Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {
                suggestions.filter((s) => s.acceptanceStatus === "pending")
                  .length
              }
            </div>
            <p className="text-xs text-purple-700 mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Accepted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {
                suggestions.filter((s) => s.acceptanceStatus === "accepted")
                  .length
              }
            </div>
            <p className="text-xs text-orange-700 mt-1">
              Implemented suggestions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="forecasts" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Forecasts
          </TabsTrigger>
          <TabsTrigger value="scheduling" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Auto-Scheduling
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Forecasts Tab */}
        <TabsContent value="forecasts" className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          {!loading && forecasts.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-slate-500">
                  No forecasts available
                </p>
              </CardContent>
            </Card>
          )}

          {!loading &&
            forecasts.map((forecast) => (
              <Card
                key={forecast.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedForecast(forecast)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Event {forecast.eventId}
                      </CardTitle>
                      <CardDescription>
                        Forecast created{" "}
                        {new Date(forecast.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge
                      className={confidenceColor(forecast.predictionConfidence)}
                    >
                      {(forecast.predictionConfidence * 100).toFixed(0)}%
                      confident
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-600 font-medium">
                        Predicted Hours
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {forecast.predictedLaborHours.toFixed(1)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Range: {forecast.lowerBoundHours.toFixed(1)} -{" "}
                        {forecast.upperBoundHours.toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">
                        Staff Count
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        {forecast.predictedStaffCount}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">
                        Estimated Cost
                      </p>
                      <p className="text-2xl font-bold text-slate-900">
                        ${forecast.predictedLaborCost.toFixed(0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-medium">
                        Status
                      </p>
                      <Badge variant="outline" className="mt-2">
                        {forecast.forecastStatus}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        {/* Auto-Scheduling Tab */}
        <TabsContent value="scheduling" className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-slate-500">
                  No scheduling suggestions
                </p>
              </CardContent>
            </Card>
          )}

          {!loading &&
            suggestions.map((suggestion) => (
              <Card key={suggestion.id} className="border-2 border-slate-200">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>Task {suggestion.productionTaskId}</CardTitle>
                      <CardDescription>
                        {suggestion.suggestedAssignments.length} staff members
                        suggested
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Badge
                        className={qualityColor(
                          suggestion.solutionQualityScore,
                        )}
                      >
                        Quality: {suggestion.solutionQualityScore.toFixed(1)}
                      </Badge>
                      <Badge
                        variant={
                          suggestion.acceptanceStatus === "accepted"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {suggestion.acceptanceStatus}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-xs text-slate-600">Skill Match</p>
                      <p className="text-xl font-bold text-blue-900">
                        {suggestion.skillMatchPercentage}%
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-xs text-slate-600">Coverage</p>
                      <p className="text-xl font-bold text-green-900">
                        {suggestion.coveragePercentage}%
                      </p>
                    </div>
                    <div className="bg-orange-50 p-3 rounded">
                      <p className="text-xs text-slate-600">Est. Cost</p>
                      <p className="text-xl font-bold text-orange-900">
                        ${suggestion.estimatedTotalCost}
                      </p>
                    </div>
                  </div>

                  {/* Staff Assignments */}
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900">
                      Suggested Assignments
                    </p>
                    {suggestion.suggestedAssignments.map((assignment, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-50 p-3 rounded"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {assignment.employeeName}
                          </p>
                          <p className="text-sm text-slate-600">
                            {assignment.role}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-900">
                              {assignment.estimatedHours}h @ $
                              {assignment.costEstimate}
                            </p>
                            <p className="text-xs text-slate-600">
                              Skill: {assignment.skillMatch}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  {suggestion.acceptanceStatus === "pending" && (
                    <div className="flex gap-2 pt-4">
                      <Button
                        variant="default"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => acceptSuggestion(suggestion.id)}
                        disabled={loading}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => rejectSuggestion(suggestion.id)}
                        disabled={loading}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          )}

          {!loading && accuracy && (
            <>
              {/* Accuracy Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Forecast Accuracy Metrics</CardTitle>
                  <CardDescription>
                    Historical performance of ML model predictions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div>
                      <p className="text-sm text-slate-600">Mean Absolute %</p>
                      <p className="text-3xl font-bold text-slate-900">
                        {accuracy.meanAbsolutePercentageError.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">RMSE</p>
                      <p className="text-3xl font-bold text-slate-900">
                        {accuracy.rootMeanSquaredError.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Success Rate</p>
                      <p className="text-3xl font-bold text-green-600">
                        {(
                          (accuracy.accurateForecasts /
                            accuracy.totalForecasts) *
                          100
                        ).toFixed(0)}
                        %
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Sample Size</p>
                      <p className="text-3xl font-bold text-slate-900">
                        {accuracy.totalForecasts}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Forecast Performance Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { month: "Jan", accurate: 8, inaccurate: 2 },
                        { month: "Feb", accurate: 10, inaccurate: 1 },
                        { month: "Mar", accurate: 9, inaccurate: 2 },
                        { month: "Apr", accurate: 11, inaccurate: 1 },
                        { month: "May", accurate: 10, inaccurate: 1 },
                        { month: "Jun", accurate: 12, inaccurate: 1 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="accurate" fill="#22c55e" name="Accurate" />
                      <Bar
                        dataKey="inaccurate"
                        fill="#ef4444"
                        name="Inaccurate"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
