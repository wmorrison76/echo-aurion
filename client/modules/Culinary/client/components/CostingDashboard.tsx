import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingDown, TrendingUp, Target, DollarSign } from "lucide-react";
import { useCostingEngine } from "@/hooks/use-costing-engine";
import type { ProfitabilityMetrics } from "@/lib/costing-engine";

export const CostingDashboard: React.FC = () => {
  const {
    allMetrics,
    riskRecipes,
    dailyReport,
    trendData,
    potentialSavings,
    selectRecipe,
    selectedRecipeId,
  } = useCostingEngine();

  const [viewMode, setViewMode] = useState<"overview" | "recipes" | "trends">("overview");

  const averageMargin = allMetrics.length > 0
    ? Math.round(
        (allMetrics.reduce((sum, m) => sum + m.profitMargin, 0) / allMetrics.length) * 100,
      ) / 100
    : 0;

  const totalRevenue = dailyReport?.totalRevenue || 0;
  const totalCosts = dailyReport?.totalCosts || 0;
  const foodCostPercent = dailyReport?.foodCostPercent || 0;

  return (
    <div className="w-full space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Food Cost %</div>
            <div className="text-3xl font-bold">{foodCostPercent}%</div>
            <div className="text-xs text-muted-foreground mt-2">
              Target: 30%
            </div>
            {foodCostPercent > 30 && (
              <Badge variant="destructive" className="mt-2">At Risk</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Avg Profit Margin</div>
            <div className="text-3xl font-bold">{averageMargin}%</div>
            <div className="text-xs text-muted-foreground mt-2">
              Across {allMetrics.length} recipes
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Daily Revenue</div>
            <div className="text-3xl font-bold">${(totalRevenue || 0).toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-2">
              Today's sales
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Potential Savings</div>
            <div className="text-3xl font-bold text-green-600">${potentialSavings.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-2">
              By optimizing to 30%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === "overview" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("overview")}
        >
          Overview
        </Button>
        <Button
          variant={viewMode === "recipes" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("recipes")}
        >
          Recipes ({allMetrics.length})
        </Button>
        <Button
          variant={viewMode === "trends" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("trends")}
        >
          Trends
        </Button>
      </div>

      {/* Overview Tab */}
      {viewMode === "overview" && (
        <div className="space-y-4">
          {/* Risk Recipes Alert */}
          {riskRecipes.length > 0 && (
            <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  {riskRecipes.length} Recipe{riskRecipes.length !== 1 ? "s" : ""} at Risk
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {riskRecipes.map((recipe) => (
                  <div
                    key={recipe.recipeId}
                    className="flex items-start justify-between p-2 rounded bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 cursor-pointer"
                    onClick={() => selectRecipe(recipe.recipeId)}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{recipe.recipeName}</p>
                      <p className="text-xs text-muted-foreground">
                        Food Cost: {recipe.foodCostPercent}% | Margin: {recipe.profitMargin}%
                      </p>
                      {recipe.recommendation && (
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          {recipe.recommendation}
                        </p>
                      )}
                    </div>
                    <Badge variant="destructive">{recipe.foodCostPercent}%</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Daily Summary */}
          {dailyReport && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Today's Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Costs</p>
                    <p className="text-2xl font-bold">${totalCosts.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Food Cost %</p>
                    <p className="text-2xl font-bold">{foodCostPercent}%</p>
                  </div>
                </div>

                {/* Recipe Breakdown */}
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold mb-2">Recipe Breakdown</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {dailyReport.recipeBreakdown.map((recipe) => (
                      <div
                        key={recipe.recipeId}
                        className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                      >
                        <div className="flex-1">
                          <p className="text-sm">{recipe.recipeName}</p>
                          <p className="text-xs text-muted-foreground">
                            {recipe.portionsSold} portions
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">${recipe.totalCost.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            ${(recipe.totalCost / recipe.portionsSold).toFixed(2)}/portion
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Recipes Tab */}
      {viewMode === "recipes" && (
        <Card>
          <CardHeader>
            <CardTitle>Recipe Profitability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-semibold">Recipe</th>
                    <th className="text-right py-2 px-2 font-semibold">Cost/Portion</th>
                    <th className="text-right py-2 px-2 font-semibold">Price/Portion</th>
                    <th className="text-right py-2 px-2 font-semibold">Food Cost %</th>
                    <th className="text-right py-2 px-2 font-semibold">Margin %</th>
                    <th className="text-center py-2 px-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allMetrics.map((metric) => (
                    <tr
                      key={metric.recipeId}
                      className="border-b hover:bg-muted/50 cursor-pointer"
                      onClick={() => selectRecipe(metric.recipeId)}
                    >
                      <td className="py-2 px-2 font-medium">{metric.recipeName}</td>
                      <td className="text-right py-2 px-2">${metric.costPerPortion.toFixed(2)}</td>
                      <td className="text-right py-2 px-2">
                        ${metric.sellingPricePerPortion.toFixed(2)}
                      </td>
                      <td className="text-right py-2 px-2">{metric.foodCostPercent}%</td>
                      <td className="text-right py-2 px-2">{metric.profitMargin}%</td>
                      <td className="text-center py-2 px-2">
                        <Badge variant={metric.isAtRisk ? "destructive" : "default"}>
                          {metric.isAtRisk ? "At Risk" : "Good"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trends Tab */}
      {viewMode === "trends" && trendData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Food Cost Trend
              {trendData.trendDirection === "improving" ? (
                <TrendingDown className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingUp className="h-5 w-5 text-red-600" />
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Average Food Cost %</p>
                <p className="text-2xl font-bold">{trendData.averagePercent}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trend</p>
                <p className="text-lg font-semibold capitalize">
                  {trendData.trendDirection === "improving" ? "📉 Improving" : "📈 Declining"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data Points</p>
                <p className="text-2xl font-bold">{trendData.timeframe.length}</p>
              </div>
            </div>

            {/* Trend Table */}
            <div className="border-t pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2">Date</th>
                      <th className="text-right py-2 px-2">Food Cost %</th>
                      <th className="text-right py-2 px-2">Avg Cost/Portion</th>
                      <th className="text-right py-2 px-2">Total Costs</th>
                      <th className="text-right py-2 px-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendData.timeframe.map((day, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2">{day.date}</td>
                        <td className="text-right py-2 px-2">{day.foodCostPercent}%</td>
                        <td className="text-right py-2 px-2">${day.averageCostPerPortion.toFixed(2)}</td>
                        <td className="text-right py-2 px-2">${day.totalCosts.toFixed(2)}</td>
                        <td className="text-right py-2 px-2">${day.totalRevenue.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CostingDashboard;
