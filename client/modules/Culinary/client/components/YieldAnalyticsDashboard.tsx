/**
 * Yield Analytics Dashboard
 *
 * Displays yield performance metrics, trends, and recommendations
 */

import React, { useEffect, useState } from "react";
const { useState, useEffect } = React;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Target,
} from "lucide-react";
import {
  yieldComparisonService,
  type YieldPerformanceMetrics,
} from "../services/yield-comparison-service";
import { productionYieldTracker } from "../services/production-yield-tracker";
import type { YieldComparison } from "../services/yield-comparison-service";

export function YieldAnalyticsDashboard() {
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<YieldPerformanceMetrics | null>(null);
  const [comparisons, setComparisons] = useState<YieldComparison[]>([]);
  const [needsReview, setNeedsReview] = useState<
    Array<{ recipeId: string; recipeName: string; issueCount: number }>
  >([]);

  useEffect(() => {
    loadData();
  }, [selectedRecipeId]);

  const loadData = () => {
    if (selectedRecipeId) {
      const recipeMetrics =
        yieldComparisonService.getPerformanceMetrics(selectedRecipeId);
      setMetrics(recipeMetrics);

      const recipeComparisons =
        yieldComparisonService.getComparisons(selectedRecipeId);
      setComparisons(recipeComparisons);
    } else {
      const reviewList = yieldComparisonService.getRecipesNeedingReview();
      setNeedsReview(reviewList);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto p-6 space-y-6 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            Yield Analytics Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and analyze yield performance across all recipes
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recipes">Recipes</TabsTrigger>
          <TabsTrigger value="comparisons">Comparisons</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Total Recipes Tracked
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {needsReview.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Needs Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {needsReview.filter((r) => r.issueCount > 0).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Average Accuracy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {metrics
                    ? `${(metrics.averageAccuracy * 100).toFixed(1)}%`
                    : "—"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Total Comparisons
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {comparisons.length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recipes Needing Review */}
          {needsReview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Recipes Needing Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {needsReview.slice(0, 10).map((recipe) => (
                    <div
                      key={recipe.recipeId}
                      className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-surface cursor-pointer"
                      onClick={() => setSelectedRecipeId(recipe.recipeId)}
                    >
                      <div>
                        <p className="font-semibold text-foreground">
                          {recipe.recipeName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {recipe.issueCount} issue
                          {recipe.issueCount !== 1 ? "s" : ""} detected
                        </p>
                      </div>
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4 mt-4">
          {selectedRecipeId && metrics ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{metrics.recipeName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Average Accuracy
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {(metrics.averageAccuracy * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Recent Variance
                      </p>
                      <p
                        className={`text-2xl font-bold ${metrics.recentVariance > 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {metrics.recentVariance > 0 ? "+" : ""}
                        {metrics.recentVariance.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Sample Count
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {metrics.sampleCount}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">Trend:</p>
                    {metrics.varianceTrend === "improving" ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-semibold">Improving</span>
                      </div>
                    ) : metrics.varianceTrend === "declining" ? (
                      <div className="flex items-center gap-1 text-red-600">
                        <TrendingDown className="w-4 h-4" />
                        <span className="font-semibold">Declining</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Target className="w-4 h-4" />
                        <span className="font-semibold">Stable</span>
                      </div>
                    )}
                  </div>

                  {metrics.recommendations.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-foreground">
                        Recommendations:
                      </p>
                      {metrics.recommendations.map((rec, idx) => (
                        <Alert key={idx}>
                          <AlertDescription>{rec}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Select a recipe to view detailed metrics
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comparisons" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Yield Comparisons</CardTitle>
            </CardHeader>
            <CardContent>
              {comparisons.length > 0 ? (
                <div className="space-y-2">
                  {comparisons.slice(0, 20).map((comp, idx) => (
                    <div
                      key={idx}
                      className={`p-3 border rounded-lg ${
                        comp.needsReview
                          ? "border-destructive bg-destructive/10"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">
                            {comp.ingredientName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Predicted: {comp.predictedYield.toFixed(1)}% |
                            Actual: {comp.actualYield.toFixed(1)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold ${comp.variancePercent > 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {comp.variancePercent > 0 ? "+" : ""}
                            {comp.variancePercent.toFixed(1)}%
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Accuracy: {(comp.accuracy * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      {comp.suggestedAdjustment && (
                        <Alert className="mt-2">
                          <AlertDescription>
                            Suggested yield adjustment:{" "}
                            {comp.suggestedAdjustment.toFixed(1)}%
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No comparisons available. Start tracking production yields to
                  see comparisons.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Yield Improvement Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {needsReview.length > 0 ? (
                <div className="space-y-3">
                  {needsReview.map((recipe) => {
                    const recipeMetrics =
                      yieldComparisonService.getPerformanceMetrics(
                        recipe.recipeId,
                      );
                    return (
                      <Alert
                        key={recipe.recipeId}
                        variant={
                          recipe.issueCount > 5 ? "destructive" : "default"
                        }
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div>
                            <p className="font-semibold">{recipe.recipeName}</p>
                            <p className="text-sm mt-1">
                              {recipe.issueCount} yield comparison
                              {recipe.issueCount !== 1 ? "s" : ""} need
                              {recipe.issueCount === 1 ? "s" : ""} review.
                            </p>
                            {recipeMetrics &&
                              recipeMetrics.recommendations.length > 0 && (
                                <ul className="list-disc list-inside mt-2 text-sm">
                                  {recipeMetrics.recommendations.map(
                                    (rec, idx) => (
                                      <li key={idx}>{rec}</li>
                                    ),
                                  )}
                                </ul>
                              )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    All recipes are performing within acceptable yield variance
                    ranges.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
