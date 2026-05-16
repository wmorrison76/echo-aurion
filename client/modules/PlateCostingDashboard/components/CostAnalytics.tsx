import React, { useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/glass";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { calculatePlateCost, type PlateRecipe, type PlateCostBreakdown } from "../lib/cost-calculator";
import { AlertCircle, TrendingUp, DollarSign } from "lucide-react";

export interface CostAnalyticsProps {
  sortBy: "cost" | "margin" | "name";
  onSelectRecipe: (recipeId: string) => void;
}

/**
 * Cost Analytics Component
 *
 * Displays:
 * - Cost breakdown (pie chart)
 * - Margin trending (line chart)
 * - Recipe comparison (bar chart)
 * - Variance heatmap
 */
export function CostAnalytics({ sortBy, onSelectRecipe }: CostAnalyticsProps) {
  const [recipes, setRecipes] = useState<PlateRecipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch sample recipes (in production, fetch from API)
  useEffect(() => {
    // Simulate loading recipes
    const sampleRecipes: PlateRecipe[] = [
      {
        id: "1",
        name: "Grilled Salmon",
        sellingPrice: 28.99,
        category: "Entree",
        ingredients: [
          {
            id: "salmon",
            name: "Atlantic Salmon Fillet",
            quantity: 6,
            unit: "oz",
            unitCost: 2.5,
            wastePercentage: 8,
          },
          {
            id: "lemon",
            name: "Fresh Lemon",
            quantity: 0.5,
            unit: "ea",
            unitCost: 0.75,
            wastePercentage: 15,
          },
          {
            id: "butter",
            name: "Butter",
            quantity: 1,
            unit: "oz",
            unitCost: 0.45,
            wastePercentage: 0,
          },
          {
            id: "herbs",
            name: "Fresh Herbs",
            quantity: 0.25,
            unit: "oz",
            unitCost: 1.2,
            wastePercentage: 20,
          },
        ],
      },
      {
        id: "2",
        name: "Ribeye Steak",
        sellingPrice: 35.99,
        category: "Entree",
        ingredients: [
          {
            id: "ribeye",
            name: "Ribeye Cut",
            quantity: 10,
            unit: "oz",
            unitCost: 2.8,
            wastePercentage: 12,
          },
          {
            id: "seasoning",
            name: "Seasoning Mix",
            quantity: 0.5,
            unit: "tsp",
            unitCost: 0.1,
            wastePercentage: 0,
          },
        ],
      },
      {
        id: "3",
        name: "Vegetable Pasta",
        sellingPrice: 18.99,
        category: "Entree",
        ingredients: [
          {
            id: "pasta",
            name: "Fresh Pasta",
            quantity: 8,
            unit: "oz",
            unitCost: 0.75,
            wastePercentage: 2,
          },
          {
            id: "vegetables",
            name: "Seasonal Vegetables",
            quantity: 5,
            unit: "oz",
            unitCost: 1.2,
            wastePercentage: 15,
          },
          {
            id: "sauce",
            name: "Tomato Sauce",
            quantity: 3,
            unit: "oz",
            unitCost: 0.5,
            wastePercentage: 0,
          },
        ],
      },
    ];

    setTimeout(() => {
      setRecipes(sampleRecipes);
      if (sampleRecipes.length > 0) {
        setSelectedRecipeId(sampleRecipes[0].id);
      }
      setLoading(false);
    }, 500);
  }, []);

  // Calculate costs for all recipes
  const costBreakdowns = useMemo(() => {
    return recipes.map((recipe) => calculatePlateCost(recipe));
  }, [recipes]);

  // Get selected recipe breakdown
  const selectedBreakdown = useMemo(() => {
    return costBreakdowns.find((c) => c.recipeId === selectedRecipeId);
  }, [selectedRecipeId, costBreakdowns]);

  // Prepare data for charts
  const sortedBreakdowns = useMemo(() => {
    const sorted = [...costBreakdowns];
    switch (sortBy) {
      case "cost":
        return sorted.sort((a, b) => a.totalCostWithWaste - b.totalCostWithWaste);
      case "name":
        return sorted.sort((a, b) => a.recipeName.localeCompare(b.recipeName));
      case "margin":
      default:
        return sorted.sort((a, b) => b.marginPercentage - a.marginPercentage);
    }
  }, [costBreakdowns, sortBy]);

  const comparisonChartData = useMemo(() => {
    return sortedBreakdowns.map((bd) => ({
      name: bd.recipeName,
      cost: Math.round(bd.totalCostWithWaste * 100) / 100,
      margin: Math.round(bd.marginPercentage * 10) / 10,
      price: bd.sellingPrice,
    }));
  }, [sortedBreakdowns]);

  const ingredientChartData = useMemo(() => {
    return selectedBreakdown
      ? selectedBreakdown.ingredients.map((ing) => ({
          name: ing.name,
          value: Math.round(ing.costWithWaste * 100) / 100,
        }))
      : [];
  }, [selectedBreakdown]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">Loading cost data...</p>
      </div>
    );
  }

  if (costBreakdowns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">No recipes found</p>
      </div>
    );
  }

  const COLORS = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Recipe List */}
      <div className="lg:col-span-1 flex flex-col gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            Recipes
          </h2>

          <div className="flex flex-col gap-2">
            {sortedBreakdowns.map((bd) => (
              <button
                key={bd.recipeId}
                onClick={() => {
                  setSelectedRecipeId(bd.recipeId);
                  onSelectRecipe(bd.recipeId);
                }}
                className={cn(
                  "p-3 rounded-lg text-left transition-colors border",
                  selectedRecipeId === bd.recipeId
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-transparent hover:bg-secondary text-foreground"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{bd.recipeName}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cost: ${bd.totalCostWithWaste.toFixed(2)}
                    </p>
                  </div>
                  <div
                    className={cn(
                      "text-xs font-bold px-2 py-1 rounded",
                      bd.marginPercentage >= 30
                        ? "bg-green-500/20 text-green-700"
                        : bd.marginPercentage >= 25
                          ? "bg-yellow-500/20 text-yellow-700"
                          : "bg-red-500/20 text-red-700"
                    )}
                  >
                    {bd.marginPercentage.toFixed(0)}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Columns - Charts and Details */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {/* KPIs */}
        {selectedBreakdown && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground mb-2">Total Cost</p>
              <p className="text-2xl font-bold text-foreground">
                ${selectedBreakdown.totalCostWithWaste.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground mb-2">Margin</p>
              <p className="text-2xl font-bold text-green-600">
                {selectedBreakdown.marginPercentage.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground mb-2">Selling Price</p>
              <p className="text-2xl font-bold text-foreground">
                ${selectedBreakdown.sellingPrice.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Ingredient Breakdown */}
        {selectedBreakdown && ingredientChartData.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Ingredient Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={ingredientChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) =>
                    `${name}: $${value.toFixed(2)}`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ingredientChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    `$${typeof value === "number" ? value.toFixed(2) : value}`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recipe Comparison */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Recipe Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis yAxisId="left" label={{ value: "Cost ($)", angle: -90, position: "insideLeft" }} />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{
                  value: "Margin (%)",
                  angle: 90,
                  position: "insideRight",
                }}
              />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="cost" fill="#3b82f6" name="Cost" />
              <Bar
                yAxisId="right"
                dataKey="margin"
                fill="#10b981"
                name="Margin %"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ingredient Details */}
        {selectedBreakdown && (
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Ingredient Details
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 font-medium">
                      Ingredient
                    </th>
                    <th className="text-right py-2 px-2 font-medium">
                      Qty
                    </th>
                    <th className="text-right py-2 px-2 font-medium">
                      Unit Cost
                    </th>
                    <th className="text-right py-2 px-2 font-medium">
                      Waste %
                    </th>
                    <th className="text-right py-2 px-2 font-medium">
                      Total Cost
                    </th>
                    <th className="text-right py-2 px-2 font-medium">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {selectedBreakdown.ingredients.map((ing, idx) => (
                    <tr key={idx} className="border-b border-border/50">
                      <td className="py-2 px-2 text-foreground">
                        {ing.name}
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">
                        {ing.quantity}
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">
                        ${ing.unitCost.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground">
                        {ing.wastePercentage}%
                      </td>
                      <td className="py-2 px-2 text-right font-medium">
                        ${ing.costWithWaste.toFixed(2)}
                      </td>
                      <td className="py-2 px-2 text-right font-medium">
                        {ing.percentOfTotal.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
