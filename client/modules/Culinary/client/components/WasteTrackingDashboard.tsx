import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import type { WasteEntry, WasteCategory } from "@/lib/waste-tracking";

interface WasteTrackingDashboardProps {
  onAddEntry?: (entry: Omit<WasteEntry, "id" | "timestamp">) => void;
  entries?: WasteEntry[];
  dailyRevenue?: number;
}

const WASTE_CATEGORIES: { value: WasteCategory; label: string; description: string }[] = [
  { value: "spoilage", label: "Spoilage", description: "Items expired or gone bad" },
  { value: "prep-loss", label: "Prep Loss", description: "Trimmings, peeling, natural loss" },
  { value: "plate-waste", label: "Plate Waste", description: "Returned or uneaten food" },
  { value: "overproduction", label: "Overproduction", description: "Excess prepared items" },
  { value: "other", label: "Other", description: "Other waste reasons" },
];

export const WasteTrackingDashboard: React.FC<WasteTrackingDashboardProps> = ({
  onAddEntry,
  entries = [],
  dailyRevenue = 0,
}) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<WasteCategory>("spoilage");
  const [ingredientName, setIngredientName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("lb");
  const [costPerUnit, setCostPerUnit] = useState("");
  const [reason, setReason] = useState("");

  const totalWasteCost = entries.reduce((sum, e) => sum + e.totalCost, 0);
  const wastePercent = dailyRevenue > 0 ? Math.round((totalWasteCost / dailyRevenue) * 10000) / 100 : 0;

  // Group by category
  const byCategory = entries.reduce(
    (acc, entry) => {
      if (!acc[entry.category]) {
        acc[entry.category] = { count: 0, totalCost: 0 };
      }
      acc[entry.category].count++;
      acc[entry.category].totalCost += entry.totalCost;
      return acc;
    },
    {} as Record<WasteCategory, { count: number; totalCost: number }>,
  );

  const handleAddEntry = () => {
    if (!ingredientName || !quantity || !costPerUnit) {
      alert("Please fill in all fields");
      return;
    }

    onAddEntry?.({
      date: new Date().toISOString().split("T")[0],
      category: selectedCategory,
      ingredientName,
      quantityWasted: parseFloat(quantity),
      unit,
      costPerUnit: parseFloat(costPerUnit),
      totalCost: parseFloat(quantity) * parseFloat(costPerUnit),
      reason: reason || undefined,
    });

    // Reset form
    setIngredientName("");
    setQuantity("");
    setCostPerUnit("");
    setReason("");
    setSelectedCategory("spoilage");
    setOpenDialog(false);
  };

  const getRiskLevel = (percent: number) => {
    if (percent > 5) return "high";
    if (percent > 3) return "medium";
    return "low";
  };

  const riskLevel = getRiskLevel(wastePercent);

  return (
    <div className="w-full space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className={riskLevel === "high" ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20" : ""}>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Today's Waste Cost</div>
            <div className="text-3xl font-bold text-red-600">${totalWasteCost.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-2">
              {entries.length} waste entries
            </div>
          </CardContent>
        </Card>

        <Card className={riskLevel === "high" ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20" : ""}>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Waste % of Revenue</div>
            <div className="text-3xl font-bold">{wastePercent}%</div>
            <div className="text-xs text-muted-foreground mt-2">
              Target: 2-3%
            </div>
            {wastePercent > 3 && (
              <Badge variant="destructive" className="mt-2">Alert</Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Potential Savings</div>
            <div className="text-3xl font-bold text-green-600">
              ${(totalWasteCost / 2).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              If waste reduced by 50%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert if high waste */}
      {riskLevel === "high" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Waste is {wastePercent}% of revenue. This is above industry standard (2-3%). Focus on reducing waste.
          </AlertDescription>
        </Alert>
      )}

      {/* Waste by Category */}
      {Object.keys(byCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Waste by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {WASTE_CATEGORIES.map((cat) => {
                const data = byCategory[cat.value];
                if (!data) return null;
                return (
                  <div key={cat.value} className="p-3 rounded border">
                    <p className="text-sm font-medium">{cat.label}</p>
                    <p className="text-2xl font-bold mt-1">${data.totalCost.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{data.count} entries</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Entries */}
      {entries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Waste Entries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {entries
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, 10)
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start justify-between p-3 rounded border hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{entry.ingredientName}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {WASTE_CATEGORIES.find((c) => c.value === entry.category)?.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {entry.quantityWasted} {entry.unit}
                        </span>
                      </div>
                      {entry.reason && (
                        <p className="text-xs text-muted-foreground mt-1">{entry.reason}</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-bold">${entry.totalCost.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        ${entry.costPerUnit.toFixed(2)}/unit
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogTrigger asChild>
          <Button className="gap-2" size="lg">
            <Plus className="h-4 w-4" />
            Log Waste Entry
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Log Food Waste</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as WasteCategory)}
                className="w-full rounded border border-input px-3 py-2 text-sm"
              >
                {WASTE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label} - {cat.description}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Ingredient Name</label>
              <AutocompleteInput
                suggestionType="ingredients"
                placeholder="Search ingredients..."
                value={ingredientName}
                onChange={(e) => setIngredientName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Quantity</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  step="0.1"
                  placeholder="0.0"
                  className="w-full rounded border border-input px-2 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Unit</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full rounded border border-input px-2 py-2 text-sm"
                >
                  <option value="lb">lb</option>
                  <option value="oz">oz</option>
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="cup">cup</option>
                  <option value="L">L</option>
                  <option value="ml">ml</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Cost/Unit</label>
                <input
                  type="number"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full rounded border border-input px-2 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Reason (Optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why was this wasted?"
                rows={2}
                className="w-full rounded border border-input px-3 py-2 text-sm resize-none"
              />
            </div>

            {quantity && costPerUnit && (
              <div className="p-3 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-semibold">
                  Total Cost: ${(parseFloat(quantity) * parseFloat(costPerUnit)).toFixed(2)}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setOpenDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddEntry}
                disabled={!ingredientName || !quantity || !costPerUnit}
                className="flex-1"
              >
                Log Waste
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WasteTrackingDashboard;
