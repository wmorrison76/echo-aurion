import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/glass";
import {
  TrendingUp,
  Calendar,
  Cloud,
  AlertCircle,
  Loader,
  BarChart3,
} from "lucide-react";
import { useDemandForecastIntegration } from "./integrations/forecast-integration";
import { useTraceEmitter } from "@/lib/trace-emitter";

interface DemandForecast {
  date: string;
  dayOfWeek: string;
  baselineCovers: number;
  weatherFactor: number;
  seasonalFactor: number;
  eventFactor: number;
  predictedCovers: number;
  confidence: number;
  recommendations: string[];
}

export const DemandForecasting: React.FC = () => {
  const [forecasts, setForecasts] = useState<DemandForecast[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedWeeks, setSelectedWeeks] = useState(4);
  const [forecastPlan, setForecastPlan] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const { applyForecast } = useDemandForecastIntegration();
  const { emit } = useTraceEmitter();

  useEffect(() => {
    const loadPlan = async () => {
      setPlanLoading(true);
      try {
        const response = await fetch("/api/forecast-plan?orgId=demo-org");
        const data = await response.json();
        if (data?.plan) {
          setForecastPlan(data.plan);
        }
      } catch (error) {
        console.error("Failed to load forecast plan:", error);
      } finally {
        setPlanLoading(false);
      }
    };
    loadPlan();
  }, []);

  const updatePlanDay = (
    index: number,
    patch: Partial<{ forecast: number; override: number | null }>,
  ) => {
    setForecastPlan((prev: any) => {
      if (!prev) return prev;
      const nextDays = [...prev.days];
      const current = nextDays[index];
      const updated = { ...current, ...patch };
      nextDays[index] = updated;
      const updatedPlan = { ...prev, days: nextDays };

      // Emit trace for forecast plan update
      emit(
        "forecast-plan",
        prev.orgId || "demo-org",
        "forecast-hub",
        "forecast",
        {
          action: "update_plan_day",
          dayIndex: index,
          date: current.date,
          previousForecast: current.forecast,
          previousOverride: current.override,
          patch,
        },
        {
          updatedForecast: updated.forecast,
          updatedOverride: updated.override,
          dayDate: current.date,
        },
        {
          downstreamImplications: [
            {
              type: "demand_delta",
              entityType: "demand-delta",
              entityId: `delta-${current.date}`,
              impact: "Forecast update may trigger demand delta calculations",
            },
            {
              type: "inventory_implication",
              entityType: "inventory-implication",
              entityId: `impl-${current.date}`,
              impact: "Forecast change may require inventory adjustments",
            },
          ],
        },
      ).catch(() => {
        // Ignore trace errors - graceful degradation
      });

      return updatedPlan;
    });
  };

  const savePlan = async () => {
    if (!forecastPlan) return;
    setPlanSaving(true);
    try {
      const response = await fetch("/api/forecast-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(forecastPlan),
      });
      if (response.ok) {
        const data = await response.json();
        if (data?.plan) {
          setForecastPlan(data.plan);

          // Emit trace for forecast plan save
          emit(
            "forecast-plan",
            forecastPlan.orgId || "demo-org",
            "forecast-hub",
            "forecast",
            {
              action: "save_plan",
              planDays: forecastPlan.days?.length || 0,
            },
            {
              saved: true,
              planId: data.plan?.id || forecastPlan.orgId || "demo-org",
            },
            {
              downstreamImplications: [
                {
                  type: "forecast_plan_updated",
                  entityType: "forecast-plan",
                  entityId: forecastPlan.orgId || "demo-org",
                  impact:
                    "Forecast plan saved may trigger downstream demand calculations",
                },
              ],
            },
          ).catch(() => {
            // Ignore trace errors - graceful degradation
          });
        }
      }
    } catch (error) {
      console.error("Failed to save forecast plan:", error);
    } finally {
      setPlanSaving(false);
    }
  };

  const generateForecasts = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/forecast/demand-advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weeks: selectedWeeks,
          historicalData: true,
          includeSeasonality: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setForecasts(data);

        // Calculate average confidence
        const avgConfidence =
          data.length > 0
            ? data.reduce(
                (sum: number, f: DemandForecast) => sum + f.confidence,
                0,
              ) / data.length
            : 0;

        // Emit trace for forecast generation
        emit(
          "forecast",
          `forecast-${selectedWeeks}w-${Date.now()}`,
          "forecast-hub",
          "forecast",
          {
            action: "generate_forecasts",
            weeks: selectedWeeks,
            historicalData: true,
            includeSeasonality: true,
          },
          {
            forecastCount: data.length,
            avgConfidence: Math.round(avgConfidence),
            dateRange:
              data.length > 0
                ? { start: data[0].date, end: data[data.length - 1].date }
                : null,
          },
          {
            confidence: avgConfidence / 100, // Convert to 0-1 scale
            downstreamImplications: [
              {
                type: "demand_delta",
                entityType: "demand-delta",
                entityId: `delta-batch-${Date.now()}`,
                impact:
                  "Forecast generation triggers demand delta calculations",
              },
              {
                type: "inventory_implication",
                entityType: "inventory-implication",
                entityId: `impl-batch-${Date.now()}`,
                impact: "Forecasts may require inventory adjustments",
              },
              {
                type: "schedule_implication",
                entityType: "schedule",
                entityId: `schedule-${Date.now()}`,
                impact: "Forecasts may require staffing adjustments",
              },
            ],
          },
        ).catch(() => {
          // Ignore trace errors - graceful degradation
        });

        // Apply forecasts to schedule and inventory
        data.forEach((forecast: any) => {
          applyForecast({
            id: forecast.id || `forecast-${forecast.date}`,
            date: forecast.date,
            outletId: "", // Would come from context
            demand: forecast.predictedCovers,
            avgPerStaff: 20, // Default, would be configurable
            requiredIngredients: [], // Would be calculated from forecast
          });
        });
      }
    } catch (error) {
      console.error("Forecasting error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className={cn(
        "w-full h-full flex flex-col p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800",
      )}
    >
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
          <h1 className="text-3xl font-bold text-foreground dark:text-white">
            Demand Forecasting
          </h1>
        </div>
        <p className="text-muted-foreground">
          AI-powered predictions based on weather, seasonality, and events
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Forecast Plan (21-day)</CardTitle>
          <Button
            onClick={savePlan}
            disabled={!forecastPlan || planSaving}
            size="sm"
          >
            {planSaving ? "Saving..." : "Save Plan"}
          </Button>
        </CardHeader>
        <CardContent>
          {planLoading ? (
            <p className="text-sm text-muted-foreground">Loading plan...</p>
          ) : forecastPlan ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Forecast</TableHead>
                    <TableHead className="text-right">Override</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forecastPlan.days.map((day: any, index: number) => (
                    <TableRow key={day.date}>
                      <TableCell>{day.date}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={day.forecast}
                          onChange={(event) =>
                            updatePlanDay(index, {
                              forecast: Number(event.target.value),
                            })
                          }
                          className="h-8 w-24 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={day.override ?? ""}
                          onChange={(event) => {
                            const value = event.target.value;
                            updatePlanDay(index, {
                              override: value === "" ? null : Number(value),
                            });
                          }}
                          className="h-8 w-24 text-right"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No plan loaded.</p>
          )}
        </CardContent>
      </Card>

      {forecasts.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1">
          <BarChart3 className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold text-foreground dark:text-white mb-2">
            Generate Forecast
          </h2>
          <p className="text-muted-foreground max-w-md text-center mb-6">
            Predict covers for the next weeks using AI analysis
          </p>
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Forecast Weeks: {selectedWeeks}
            </label>
            <input
              type="range"
              min="1"
              max="12"
              value={selectedWeeks}
              onChange={(e) => setSelectedWeeks(Number(e.target.value))}
              className="w-48"
            />
          </div>
          <Button
            onClick={generateForecasts}
            disabled={isGenerating}
            size="lg"
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {isGenerating ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                Generate Forecast
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {forecasts.map((forecast, idx) => (
              <div
                key={idx}
                className="bg-background dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-border p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground dark:text-white">
                    {forecast.dayOfWeek}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {forecast.date}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Predicted
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {forecast.predictedCovers}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Confidence
                    </p>
                    <p className="text-2xl font-bold text-primary dark:text-blue-400">
                      {forecast.confidence}%
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Baseline</span>
                    <span>{forecast.baselineCovers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weather</span>
                    <span className="font-semibold">
                      {forecast.weatherFactor > 0 ? "+" : ""}
                      {Math.round(forecast.weatherFactor * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seasonal</span>
                    <span className="font-semibold">
                      {forecast.seasonalFactor > 0 ? "+" : ""}
                      {Math.round(forecast.seasonalFactor * 100)}%
                    </span>
                  </div>
                </div>

                {forecast.recommendations.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-2">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                      Recommendations:
                    </p>
                    {forecast.recommendations.map((rec, i) => (
                      <p
                        key={i}
                        className="text-xs text-blue-700 dark:text-primary"
                      >
                        • {rec}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <Button
            onClick={() => setForecasts([])}
            variant="outline"
            size="sm"
            className="mt-6"
          >
            Generate New Forecast
          </Button>
        </div>
      )}
    </div>
  );
};

export default DemandForecasting;
