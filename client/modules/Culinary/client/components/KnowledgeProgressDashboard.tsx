/**
 * Knowledge Progress Dashboard
 * Displays Echo's knowledge base growth and learning progress
 * Shows culinary types and regional coverage with auto-switch indicator
 */

import React, { useState, useEffect } from "react";
import {
  Zap,
  Rocket,
  TrendingUp,
  Globe,
  ChefHat,
  Play,
  Pause,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import KnowledgeProgressTracker, {
  type KnowledgeProgressState,
  type CulinaryType,
  type Region,
} from "@/echo/services/knowledgeProgressTracker";
import { useBackgroundCrawler } from "@/hooks/use-background-crawler";

interface KnowledgeProgressDashboardProps {
  onModeChange?: (mode: "learning" | "on_demand") => void;
  compact?: boolean;
}

export function KnowledgeProgressDashboard({
  onModeChange,
  compact = false,
}: KnowledgeProgressDashboardProps) {
  const [tracker] = useState(() => new KnowledgeProgressTracker());
  const [state, setState] = useState<KnowledgeProgressState>(
    tracker.getProgressState(),
  );
  const { status, start, stop, updateStatus } = useBackgroundCrawler();

  // Update local state from crawler progress and tracker (more frequently when running)
  useEffect(() => {
    const interval = setInterval(() => {
      // Update from the actual progress data if available
      if (status.progress) {
        setState(status.progress);
      } else {
        // Fall back to tracker state
        setState(tracker.getProgressState());
      }
    }, status.isRunning ? 2000 : 5000); // Update every 2s when running, 5s when idle

    return () => clearInterval(interval);
  }, [tracker, status, status.isRunning]);

  const handleToggleCrawler = async () => {
    console.log("🎬 Toggle button clicked. Current status:", {
      isRunning: status.isRunning,
      mode: status.mode,
    });

    try {
      if (status.isRunning) {
        console.log("⏹️ Stopping crawler...");
        stop();
      } else {
        console.log("▶️ Starting crawler...");
        start();
      }

      // Force immediate status update
      setTimeout(() => {
        console.log("📊 Updating status...");
        updateStatus();
        const newTracker = new KnowledgeProgressTracker();
        setState(newTracker.getProgressState());
      }, 300);
    } catch (error) {
      console.error("�� Error toggling crawler:", error);
    }
  };

  const summary = tracker.getSummary();
  const modeColor =
    state.mode === "learning"
      ? "bg-blue-500/10 text-blue-700 border-blue-200"
      : "bg-amber-500/10 text-amber-700 border-amber-200";

  if (compact) {
    return (
      <div className="space-y-2 p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {state.mode === "learning" ? (
              <Rocket className="w-4 h-4 text-blue-600" />
            ) : (
              <Zap className="w-4 h-4 text-amber-600" />
            )}
            <span className="text-sm font-semibold">{summary.mode}</span>
          </div>
          <span className="text-sm text-slate-600">
            {state.overallCoverage}% Coverage
          </span>
        </div>
        <Progress value={state.overallCoverage} className="h-2" />
        {state.mode === "learning" && state.nextThreshold && (
          <p className="text-xs text-slate-600">{state.nextThreshold}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-600" />
            Echo Knowledge Base Progress
          </h3>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleToggleCrawler}
              variant={status.isRunning ? "default" : "outline"}
              size="sm"
              className="flex items-center gap-2"
              title={
                status.isRunning ? "Stop Learning Mode" : "Start Learning Mode"
              }
            >
              {status.isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start
                </>
              )}
            </Button>
            {status.isRunning && (
              <div className="text-sm font-semibold text-slate-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 whitespace-nowrap">
                📦 {(state.totalApprovedItems || 0).toLocaleString()} items
              </div>
            )}
            <div
              className={`px-3 py-1 rounded-full border ${modeColor} text-sm font-semibold flex items-center gap-2`}
            >
              {state.mode === "learning" ? (
                <>
                  <Rocket className="w-4 h-4" />
                  Learning Mode
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  On-Demand Mode
                </>
              )}
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-600">
          {state.totalApprovedItems.toLocaleString()} approved items |{" "}
          {state.totalRejectedItems.toLocaleString()} rejected |{" "}
          {state.overallCoverage}% coverage
        </p>
      </div>

      {/* Overall Coverage */}
      <Card className="bg-gradient-to-br from-slate-50 to-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Overall Knowledge Coverage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Progress value={state.overallCoverage} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className="font-semibold">{state.overallCoverage}%</span>
              <span className="text-slate-600">Target: 100%</span>
            </div>
          </div>

          {state.mode === "learning" && state.nextThreshold && (
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 font-medium">
                📈 {state.nextThreshold}
              </p>
            </div>
          )}

          {state.didAutoSwitch && state.autoSwitchTime && (
            <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-700 font-medium">
                ✨ Auto-switched to On-Demand Mode on{" "}
                {new Date(state.autoSwitchTime).toLocaleDateString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Culinary Types Progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ChefHat className="w-4 h-4" />
            Culinary Types (with Checkpoints)
          </CardTitle>
          <CardDescription>
            Progress across cooking disciplines and specializations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.culinaryMetrics.map((metric) => {
              const completedCheckpoints = Object.values(
                metric.checkpoints,
              ).filter((v) => v).length;

              return (
                <div
                  key={metric.type}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm">{metric.label}</p>
                      <p className="text-xs text-slate-600">
                        {metric.itemsApproved} recipes
                      </p>
                    </div>
                    <Badge
                      variant={metric.coverage >= 60 ? "default" : "secondary"}
                    >
                      {metric.coverage}%
                    </Badge>
                  </div>

                  <Progress value={metric.coverage} className="h-2" />

                  {/* Checkpoints */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center gap-1 text-xs">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          metric.checkpoints.allergens
                            ? "bg-green-500"
                            : "bg-slate-300"
                        }`}
                      />
                      <span>Allergens</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          metric.checkpoints.nutrition
                            ? "bg-green-500"
                            : "bg-slate-300"
                        }`}
                      />
                      <span>Nutrition</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          metric.checkpoints.techniques
                            ? "bg-green-500"
                            : "bg-slate-300"
                        }`}
                      />
                      <span>Techniques</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          metric.checkpoints.flavorBalance
                            ? "bg-green-500"
                            : "bg-slate-300"
                        }`}
                      />
                      <span>Flavor</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs col-span-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          metric.checkpoints.substitutions
                            ? "bg-green-500"
                            : "bg-slate-300"
                        }`}
                      />
                      <span>Substitutions</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 pt-1">
                    {completedCheckpoints}/5 checkpoints complete
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Regional Coverage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Regional & Cuisine Coverage
          </CardTitle>
          <CardDescription>
            Knowledge across world cuisines and regional cooking styles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {state.regionalMetrics.map((metric) => (
              <div
                key={metric.region}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium">{metric.label}</p>
                  <Badge
                    variant={metric.coverage >= 40 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {metric.coverage}%
                  </Badge>
                </div>

                <Progress value={metric.coverage} className="h-2" />

                <p className="text-xs text-slate-600">
                  {metric.recipesCount} recipes
                </p>

                {metric.cuisinesRepresented.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {metric.cuisinesRepresented.slice(0, 2).map((cuisine) => (
                      <Badge
                        key={cuisine}
                        variant="outline"
                        className="text-xs"
                      >
                        {cuisine}
                      </Badge>
                    ))}
                    {metric.cuisinesRepresented.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{metric.cuisinesRepresented.length - 2}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm text-slate-600">Approved Items</p>
              <p className="text-2xl font-bold">
                {(state.totalApprovedItems / 1000).toFixed(1)}k
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm text-slate-600">Coverage</p>
              <p className="text-2xl font-bold">{state.overallCoverage}%</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm text-slate-600">Culinary Types</p>
              <p className="text-2xl font-bold">
                {
                  state.culinaryMetrics.filter((m) => m.itemsApproved > 0)
                    .length
                }
                /5
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-sm text-slate-600">Regions</p>
              <p className="text-2xl font-bold">
                {state.regionalMetrics.filter((m) => m.recipesCount > 0).length}
                /16
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default KnowledgeProgressDashboard;
