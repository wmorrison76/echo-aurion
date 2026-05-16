import React, { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
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
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "./shared";
import {
  getAllPlateCosts,
  getPlateCostsByRecipe,
  getAveragePlateCost,
  getStandardDeviationOfPlateCost,
  calculateMenuItemCosting,
  calculateCostDistribution,
  getRecipeCostTrend,
  getRecipeCostChangePercent,
  getWastePercentageByCategory,
} from "@/lib/plate-costing-utils";

type RecipeFilter = "all" | "high-variance" | "on-target" | "below-target";

const SAMPLE_RECIPES = [
  { id: "rec-pan-sear-scallops", name: "Pan-Seared Scallops" },
  { id: "rec-herb-roasted-chicken", name: "Herb-Roasted Chicken" },
  { id: "rec-grilled-vegetables", name: "Grilled Vegetables" },
];

const RECIPE_PRICES: Record<string, number> = {
  "rec-pan-sear-scallops": 65.0,
  "rec-herb-roasted-chicken": 32.0,
  "rec-grilled-vegetables": 18.0,
};

const RECIPE_TARGETS: Record<string, number> = {
  "rec-pan-sear-scallops": 65,
  "rec-herb-roasted-chicken": 65,
  "rec-grilled-vegetables": 60,
};

export default function PlateCostingWorkspace() {
  const { toast } = useToast();
  const [recipeFilter, setRecipeFilter] = useState<RecipeFilter>("all");
  const [selectedRecipe, setSelectedRecipe] = useState<string>("rec-pan-sear-scallops");

  const allPlateCosts = getAllPlateCosts();

  // Get costing data for selected recipe
  const selectedPlateCosts = useMemo(
    () => getPlateCostsByRecipe(selectedRecipe),
    [selectedRecipe],
  );

  const avgCost = useMemo(
    () => getAveragePlateCost(selectedRecipe),
    [selectedRecipe],
  );

  const stdDev = useMemo(
    () => getStandardDeviationOfPlateCost(selectedRecipe),
    [selectedRecipe],
  );

  const costTrend = useMemo(() => getRecipeCostTrend(selectedRecipe), [selectedRecipe]);

  const costChangePercent = useMemo(
    () => getRecipeCostChangePercent(selectedRecipe),
    [selectedRecipe],
  );

  const menuCosting = useMemo(() => {
    const price = RECIPE_PRICES[selectedRecipe] || 50;
    const target = RECIPE_TARGETS[selectedRecipe] || 65;
    return calculateMenuItemCosting(selectedRecipe, price, target);
  }, [selectedRecipe]);

  // Cost distribution data for selected recipe
  const costDistributions = useMemo(() => {
    return selectedPlateCosts
      .map((p) => calculateCostDistribution(p.id))
      .filter(Boolean);
  }, [selectedPlateCosts]);

  // Summary statistics for all recipes
  const recipeCoastingData = useMemo(() => {
    return SAMPLE_RECIPES.map((recipe) => {
      const avg = getAveragePlateCost(recipe.id);
      const price = RECIPE_PRICES[recipe.id] || 50;
      const margin = price > 0 ? ((price - avg) / price) * 100 : 0;
      const target = RECIPE_TARGETS[recipe.id] || 65;
      const status =
        margin >= target
          ? "on-target"
          : margin < target - 5
            ? "below-target"
            : "above-target";

      return {
        name: recipe.name,
        cost: Math.round(avg * 100) / 100,
        price: price,
        margin: Math.round(margin * 100) / 100,
        status: status,
      };
    });
  }, []);

  // Distribution breakdown for all recipes
  const avgDistributionData = useMemo(() => {
    if (costDistributions.length === 0) {
      return {
        ingredients: 0,
        labor: 0,
        overhead: 0,
        waste: 0,
      };
    }

    const avg = costDistributions.reduce(
      (acc, dist) => ({
        ingredients: acc.ingredients + dist.ingredientsCostPercent,
        labor: acc.labor + dist.laborCostPercent,
        overhead: acc.overhead + dist.overheadCostPercent,
        waste: acc.waste + dist.wasteCostPercent,
      }),
      { ingredients: 0, labor: 0, overhead: 0, waste: 0 },
    );

    const count = costDistributions.length;
    return {
      ingredients: Math.round((avg.ingredients / count) * 100) / 100,
      labor: Math.round((avg.labor / count) * 100) / 100,
      overhead: Math.round((avg.overhead / count) * 100) / 100,
      waste: Math.round((avg.waste / count) * 100) / 100,
    };
  }, [costDistributions]);

  const costDistributionChart = [
    { name: "Ingredients", value: avgDistributionData.ingredients },
    { name: "Labor", value: avgDistributionData.labor },
    { name: "Overhead", value: avgDistributionData.overhead },
    { name: "Waste", value: avgDistributionData.waste },
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Plate Costing & Analysis</h1>
        <p className="text-sm text-muted-foreground">
          Track and analyze recipe costs, margins, and profit performance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Plate Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedPlateCosts.length} samples
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Price Point
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(RECIPE_PRICES[selectedRecipe] || 50)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target margin:{" "}
              {RECIPE_TARGETS[selectedRecipe] || 65}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Profit Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {menuCosting.actualMargin.toFixed(1)}%
            </div>
            <p className={`text-xs mt-1 ${
              menuCosting.status === "below-target"
                ? "text-red-600"
                : menuCosting.status === "on-target"
                  ? "text-green-600"
                  : "text-blue-600"
            }`}>
              {menuCosting.status === "below-target" && "Below target"}
              {menuCosting.status === "on-target" && "On target"}
              {menuCosting.status === "above-target" && "Above target"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cost Change
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">
                {Math.abs(costChangePercent).toFixed(1)}%
              </div>
              {costChangePercent > 0 ? (
                <TrendingUp className="h-5 w-5 text-red-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-green-600" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">vs. previous period</p>
          </CardContent>
        </Card>
      </div>

      {/* Recipe Selection and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recipe Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium">Select Recipe</label>
              <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SAMPLE_RECIPES.map((recipe) => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      {recipe.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Cost Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Trend</CardTitle>
            <CardDescription>Historical plate cost</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={costTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#3b82f6"
                  dot={{ fill: "#3b82f6" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cost Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cost Distribution</CardTitle>
            <CardDescription>Average breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={costDistributionChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recipe Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recipe Costing Comparison</CardTitle>
          <CardDescription>All tracked recipes summary</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Avg Cost</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Margin</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipeCoastingData.map((recipe) => (
                  <TableRow
                    key={recipe.name}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      const selectedId = SAMPLE_RECIPES.find(
                        (r) => r.name === recipe.name,
                      )?.id;
                      if (selectedId) setSelectedRecipe(selectedId);
                    }}
                  >
                    <TableCell className="font-medium">{recipe.name}</TableCell>
                    <TableCell>{formatCurrency(recipe.cost)}</TableCell>
                    <TableCell>{formatCurrency(recipe.price)}</TableCell>
                    <TableCell className="font-medium">
                      {recipe.margin.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          recipe.status === "below-target"
                            ? "destructive"
                            : recipe.status === "on-target"
                              ? "default"
                              : "secondary"
                        }
                      >
                        {recipe.status === "below-target" && "Below Target"}
                        {recipe.status === "on-target" && "On Target"}
                        {recipe.status === "above-target" && "Above Target"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {menuCosting.recommendations && menuCosting.recommendations.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-950/20">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <CardTitle className="text-base">Recommendations</CardTitle>
                <CardDescription>Actions to optimize profitability</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              {menuCosting.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
