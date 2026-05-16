import React, { useCallback, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  AlertCircle,
  TrendingDown,
  TrendingUp,
  Plus,
  Trash2,
  Filter,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { cn } from "@/lib/utils";
import { formatCurrency, generateId, percent } from "./shared";
import {
  getPlateCostsByRecipe,
  getWasteRecordsByPlateCost,
  getTotalWasteCostByRecipe,
  getWastePercentageByCategory,
  getTotalWastePercentage,
  getAllPlateCosts,
  calculateCostDistribution,
} from "@/lib/plate-costing-utils";
import type { WasteRecord, PlateCost } from "@/types/plate-costing";

type WasteFilter = {
  category?: string;
  recipeName?: string;
  dateRange?: "week" | "month" | "all";
};

const WASTE_CATEGORIES = [
  { id: "prep-waste", label: "Prep Waste", color: "#ef4444" },
  { id: "cooking-loss", label: "Cooking Loss", color: "#f97316" },
  { id: "plate-waste", label: "Plate Waste", color: "#eab308" },
  { id: "disposal", label: "Disposal", color: "#8b5cf6" },
  { id: "spoilage", label: "Spoilage", color: "#3b82f6" },
];

export default function WasteTrackingWorkspace() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<WasteFilter>({
    dateRange: "month",
  });
  const [isAddingWaste, setIsAddingWaste] = useState(false);
  const [newWaste, setNewWaste] = useState({
    plateCostId: "",
    ingredientName: "",
    category: "prep-waste",
    quantityWasted: 0,
    unit: "oz",
    costOfWaste: 0,
    reason: "",
    preventionNotes: "",
  });

  const allPlateCosts = getAllPlateCosts();

  // Get waste records based on filters
  const wasteRecords = useMemo(() => {
    const records: (WasteRecord & { plateCost: PlateCost })[] = [];

    allPlateCosts.forEach((plateCost) => {
      const categoryWaste = plateCost.waste.filter((w) => {
        if (filters.category && w.wasteCategory !== filters.category) {
          return false;
        }
        if (
          filters.recipeName &&
          !plateCost.recipeName
            .toLowerCase()
            .includes(filters.recipeName.toLowerCase())
        ) {
          return false;
        }
        return true;
      });

      categoryWaste.forEach((w) => {
        records.push({ ...w, plateCost });
      });
    });

    return records;
  }, [filters]);

  // Calculate waste by category
  const wasteByCategory = useMemo(() => {
    const grouped = new Map<string, number>();
    WASTE_CATEGORIES.forEach((cat) => {
      grouped.set(cat.id, 0);
    });

    wasteRecords.forEach((record) => {
      const current = grouped.get(record.wasteCategory) || 0;
      grouped.set(record.wasteCategory, current + record.costOfWaste);
    });

    return Array.from(grouped.entries()).map(([category, cost]) => ({
      category: WASTE_CATEGORIES.find((c) => c.id === category)?.label || category,
      cost,
    }));
  }, [wasteRecords]);

  // Calculate waste by recipe
  const wasteByRecipe = useMemo(() => {
    const grouped = new Map<string, number>();

    allPlateCosts.forEach((plateCost) => {
      const recipeName = plateCost.recipeName;
      const wasteCost = plateCost.waste.reduce((sum, w) => sum + w.costOfWaste, 0);
      if (wasteCost > 0) {
        const current = grouped.get(recipeName) || 0;
        grouped.set(recipeName, current + wasteCost);
      }
    });

    return Array.from(grouped.entries())
      .map(([recipe, cost]) => ({
        recipe,
        cost,
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [allPlateCosts]);

  // Calculate waste trends
  const wasteTrends = useMemo(() => {
    const grouped = new Map<string, number>();

    allPlateCosts.forEach((plateCost) => {
      const date = new Date(plateCost.platingDate).toLocaleDateString();
      const wasteCost = plateCost.waste.reduce((sum, w) => sum + w.costOfWaste, 0);
      const current = grouped.get(date) || 0;
      grouped.set(date, current + wasteCost);
    });

    return Array.from(grouped.entries())
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allPlateCosts]);

  // Calculate waste percentages
  const totalWasteCost = wasteRecords.reduce((sum, w) => sum + w.costOfWaste, 0);
  const totalIngrientsCost = allPlateCosts.reduce((sum, p) => {
    return sum + p.ingredientCosts.reduce((iSum, ic) => iSum + ic.totalCost, 0);
  }, 0);
  const wastePercent =
    totalIngrientsCost > 0 ? (totalWasteCost / totalIngrientsCost) * 100 : 0;

  const handleAddWaste = useCallback(() => {
    if (!newWaste.plateCostId || !newWaste.ingredientName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Waste Record Added",
      description: `Added ${newWaste.quantityWasted}${newWaste.unit} of waste for ${newWaste.ingredientName}`,
    });

    setNewWaste({
      plateCostId: "",
      ingredientName: "",
      category: "prep-waste",
      quantityWasted: 0,
      unit: "oz",
      costOfWaste: 0,
      reason: "",
      preventionNotes: "",
    });
    setIsAddingWaste(false);
  }, [newWaste, toast]);

  const costDistributions = useMemo(() => {
    const dists = allPlateCosts
      .map((p) => calculateCostDistribution(p.id))
      .filter(Boolean);
    return dists;
  }, [allPlateCosts]);

  const avgWastePercent =
    costDistributions.length > 0
      ? costDistributions.reduce((sum, d) => sum + (d?.wasteCostPercent || 0), 0) /
        costDistributions.length
      : 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Waste Tracking & Analysis</h1>
        <p className="text-sm text-muted-foreground">
          Monitor and analyze food waste by category, recipe, and time period
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Waste Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalWasteCost)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {wastePercent.toFixed(1)}% of ingredient cost
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Waste Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{wasteRecords.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {allPlateCosts.length} plates tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Waste %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgWastePercent.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">per plate cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {wasteByCategory[0]?.category || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(wasteByCategory[0]?.cost || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select
                value={filters.category || "all"}
                onValueChange={(value) =>
                  setFilters((f) => ({
                    ...f,
                    category: value === "all" ? undefined : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {WASTE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Recipe</label>
              <Input
                placeholder="Filter by recipe name"
                value={filters.recipeName || ""}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    recipeName: e.target.value || undefined,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select
                value={filters.dateRange || "all"}
                onValueChange={(value) =>
                  setFilters((f) => ({
                    ...f,
                    dateRange: value as any,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Waste by Category Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Waste by Category</CardTitle>
            <CardDescription>Cost distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={wasteByCategory}
                  dataKey="cost"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {WASTE_CATEGORIES.map((cat) => (
                    <Cell key={cat.id} fill={cat.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Waste Trends Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Waste Trends</CardTitle>
            <CardDescription>Daily waste cost over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={wasteTrends}>
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
                  stroke="#ef4444"
                  dot={{ fill: "#ef4444" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Waste by Recipe */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Waste by Recipe</CardTitle>
          <CardDescription>Top recipes with most waste cost</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={wasteByRecipe}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="recipe"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Bar dataKey="cost" fill="#f97316" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Waste Records Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Waste Records</CardTitle>
              <CardDescription>Detailed waste tracking entries</CardDescription>
            </div>
            <Dialog open={isAddingWaste} onOpenChange={setIsAddingWaste}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add Record
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Waste Record</DialogTitle>
                  <DialogDescription>
                    Log a new waste entry for tracking and analysis
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Plate Cost</label>
                    <Select
                      value={newWaste.plateCostId}
                      onValueChange={(value) =>
                        setNewWaste((w) => ({
                          ...w,
                          plateCostId: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select plate" />
                      </SelectTrigger>
                      <SelectContent>
                        {allPlateCosts.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.recipeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ingredient Name</label>
                    <Input
                      value={newWaste.ingredientName}
                      onChange={(e) =>
                        setNewWaste((w) => ({
                          ...w,
                          ingredientName: e.target.value,
                        }))
                      }
                      placeholder="e.g., Carrot trim"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={newWaste.category}
                      onValueChange={(value) =>
                        setNewWaste((w) => ({
                          ...w,
                          category: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WASTE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantity</label>
                      <Input
                        type="number"
                        value={newWaste.quantityWasted}
                        onChange={(e) =>
                          setNewWaste((w) => ({
                            ...w,
                            quantityWasted: parseFloat(e.target.value) || 0,
                          }))
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Unit</label>
                      <Select
                        value={newWaste.unit}
                        onValueChange={(value) =>
                          setNewWaste((w) => ({
                            ...w,
                            unit: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="lb">lb</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cost of Waste</label>
                    <Input
                      type="number"
                      value={newWaste.costOfWaste}
                      onChange={(e) =>
                        setNewWaste((w) => ({
                          ...w,
                          costOfWaste: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="$0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reason</label>
                    <Input
                      value={newWaste.reason}
                      onChange={(e) =>
                        setNewWaste((w) => ({
                          ...w,
                          reason: e.target.value,
                        }))
                      }
                      placeholder="e.g., Normal trim, Overcooking"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prevention Notes</label>
                    <Textarea
                      value={newWaste.preventionNotes}
                      onChange={(e) =>
                        setNewWaste((w) => ({
                          ...w,
                          preventionNotes: e.target.value,
                        }))
                      }
                      placeholder="How can we reduce this waste in the future?"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddingWaste(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddWaste}>Add Record</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ingredient</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Recipe</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wasteRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No waste records found
                    </TableCell>
                  </TableRow>
                ) : (
                  wasteRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.ingredientName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {WASTE_CATEGORIES.find((c) => c.id === record.wasteCategory)
                            ?.label || record.wasteCategory}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.plateCost.recipeName}
                      </TableCell>
                      <TableCell>
                        {record.quantityWasted}
                        {record.unit}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(record.costOfWaste)}
                      </TableCell>
                      <TableCell className="text-sm">{record.reason}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Prevention recommendations */}
      {wastePercent > 8 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900/30 dark:bg-yellow-950/20">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <CardTitle className="text-base">High Waste Alert</CardTitle>
                <CardDescription>Waste is at {wastePercent.toFixed(1)}% - above target</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Consider reviewing:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Portion control and plate sizing</li>
              <li>Prep techniques and training</li>
              <li>Recipe modifications for better yield</li>
              <li>Ingredient sourcing and quality</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
