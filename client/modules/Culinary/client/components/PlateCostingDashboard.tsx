import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, AlertTriangle, TrendingUp, TrendingDown } from "lucide-react";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import type { PlateServed, CompRecord } from "@/lib/plate-costing";

interface PlateCostingDashboardProps {
  platesServed?: PlateServed[];
  comps?: CompRecord[];
  onRecordPlate?: (plate: Omit<PlateServed, "id" | "date" | "timestamp">) => void;
  onRecordComp?: (comp: Omit<CompRecord, "id" | "date" | "timestamp">) => void;
}

const COMP_REASONS = [
  { value: "quality-issue", label: "Quality Issue", color: "red" },
  { value: "mistake", label: "Kitchen Mistake", color: "orange" },
  { value: "promotion", label: "Promotion", color: "blue" },
  { value: "vip-guest", label: "VIP Guest", color: "purple" },
  { value: "error", label: "Server Error", color: "yellow" },
  { value: "other", label: "Other", color: "gray" },
];

const PLATE_STATUSES = [
  { value: "served", label: "Served", icon: "✓", color: "green" },
  { value: "returned", label: "Returned", icon: "↩", color: "orange" },
  { value: "comp", label: "Comped", icon: "◎", color: "blue" },
  { value: "waste", label: "Waste", icon: "✗", color: "red" },
];

export const PlateCostingDashboard: React.FC<PlateCostingDashboardProps> = ({
  platesServed = [],
  comps = [],
  onRecordPlate,
  onRecordComp,
}) => {
  const [plateDialogOpen, setPlateDialogOpen] = useState(false);
  const [compDialogOpen, setCompDialogOpen] = useState(false);

  // Plate form state
  const [recipeName, setRecipeName] = useState("");
  const [portionSize, setPortionSize] = useState("");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [plateStatus, setPlateStatus] = useState<PlateServed["status"]>("served");
  const [plateReason, setPlateReason] = useState("");

  // Comp form state
  const [compRecipeName, setCompRecipeName] = useState("");
  const [compCost, setCompCost] = useState("");
  const [compReason, setCompReason] = useState<CompRecord["reason"]>("quality-issue");
  const [compNotes, setCompNotes] = useState("");

  const handleRecordPlate = () => {
    if (!recipeName || !portionSize || !cost || !price) {
      alert("Please fill in all required fields");
      return;
    }

    onRecordPlate?.({
      plateVariantId: `variant-${Date.now()}`,
      recipeName,
      portionSize,
      cost: parseFloat(cost),
      price: parseFloat(price),
      status: plateStatus,
      reason: plateReason || undefined,
    });

    setRecipeName("");
    setPortionSize("");
    setCost("");
    setPrice("");
    setPlateStatus("served");
    setPlateReason("");
    setPlateDialogOpen(false);
  };

  const handleRecordComp = () => {
    if (!compRecipeName || !compCost) {
      alert("Please fill in all required fields");
      return;
    }

    onRecordComp?.({
      recipeName: compRecipeName,
      cost: parseFloat(compCost),
      reason: compReason,
      notes: compNotes || undefined,
    });

    setCompRecipeName("");
    setCompCost("");
    setCompReason("quality-issue");
    setCompNotes("");
    setCompDialogOpen(false);
  };

  // Calculate metrics
  const todayPlates = platesServed.filter((p) => p.date === new Date().toISOString().split("T")[0]);
  const servedCount = todayPlates.filter((p) => p.status === "served").length;
  const returnedCount = todayPlates.filter((p) => p.status === "returned").length;
  const compCount = todayPlates.filter((p) => p.status === "comp").length;
  const wasteCount = todayPlates.filter((p) => p.status === "waste").length;

  const todayRevenue = todayPlates.reduce((sum, p) => sum + p.price, 0);
  const todayCost = todayPlates.reduce((sum, p) => sum + p.cost, 0);
  const todayComps = comps.filter((c) => c.date === new Date().toISOString().split("T")[0]);
  const todayCompCost = todayComps.reduce((sum, c) => sum + c.cost, 0);

  const returnRate = servedCount > 0 ? Math.round((returnedCount / servedCount) * 10000) / 100 : 0;
  const compPercent = todayRevenue > 0 ? Math.round((todayCompCost / todayRevenue) * 10000) / 100 : 0;

  const hasHighReturnRate = returnRate > 5;
  const hasHighCompRate = compPercent > 3;

  return (
    <div className="w-full space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Served</p>
            <p className="text-2xl font-bold">{servedCount}</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓</p>
          </CardContent>
        </Card>

        <Card className={returnedCount > 0 ? "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20" : ""}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Returned</p>
            <p className="text-2xl font-bold">{returnedCount}</p>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">{returnRate}%</p>
          </CardContent>
        </Card>

        <Card className={todayComps.length > 0 ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20" : ""}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Comped</p>
            <p className="text-2xl font-bold">{todayComps.length}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">${todayCompCost.toFixed(0)}</p>
          </CardContent>
        </Card>

        <Card className={wasteCount > 0 ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20" : ""}>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Waste</p>
            <p className="text-2xl font-bold">{wasteCount}</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">×</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Food Cost</p>
            <p className="text-2xl font-bold">
              {todayRevenue > 0 ? Math.round((todayCost / todayRevenue) * 10000) / 100 : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {hasHighReturnRate && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Return rate is {returnRate}% (target: &lt;2%). Check preparation quality and presentation.
          </AlertDescription>
        </Alert>
      )}

      {hasHighCompRate && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Comp rate is {compPercent}% of revenue (target: &lt;1%). Review comp approval process.
          </AlertDescription>
        </Alert>
      )}

      {/* Record Plate & Comp Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Dialog open={plateDialogOpen} onOpenChange={setPlateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" size="lg">
              <Plus className="h-4 w-4" />
              Record Plate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Plate Served</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Recipe Name *</label>
                <AutocompleteInput
                  suggestionType="recipes"
                  placeholder="Search recipes..."
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Portion Size *</label>
                  <input
                    type="text"
                    value={portionSize}
                    onChange={(e) => setPortionSize(e.target.value)}
                    placeholder="e.g., 6oz"
                    className="w-full rounded border border-input px-2 py-1 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Cost *</label>
                  <input
                    type="number"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    step="0.01"
                    className="w-full rounded border border-input px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Menu Price *</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  step="0.01"
                  className="w-full rounded border border-input px-2 py-1 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Status *</label>
                <select
                  value={plateStatus}
                  onChange={(e) => setPlateStatus(e.target.value as PlateServed["status"])}
                  className="w-full rounded border border-input px-2 py-1 text-sm"
                >
                  {PLATE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {plateStatus !== "served" && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Reason</label>
                  <input
                    type="text"
                    value={plateReason}
                    onChange={(e) => setPlateReason(e.target.value)}
                    placeholder="Why was this plate returned/wasted?"
                    className="w-full rounded border border-input px-2 py-1 text-sm"
                  />
                </div>
              )}

              {cost && price && (
                <div className="p-2 rounded bg-green-50 dark:bg-green-950/20 text-sm">
                  <p className="text-muted-foreground">Profit</p>
                  <p className="font-bold text-green-600 dark:text-green-400">
                    ${(parseFloat(price) - parseFloat(cost)).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setPlateDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleRecordPlate} disabled={!recipeName || !portionSize || !cost || !price} className="flex-1">
                  Record
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={compDialogOpen} onOpenChange={setCompDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2" size="lg">
              <Plus className="h-4 w-4" />
              Record Comp
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Complimentary Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Recipe Name *</label>
                <AutocompleteInput
                  suggestionType="recipes"
                  placeholder="Search recipes..."
                  value={compRecipeName}
                  onChange={(e) => setCompRecipeName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Cost *</label>
                <input
                  type="number"
                  value={compCost}
                  onChange={(e) => setCompCost(e.target.value)}
                  step="0.01"
                  className="w-full rounded border border-input px-2 py-1 text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Reason *</label>
                <select
                  value={compReason}
                  onChange={(e) => setCompReason(e.target.value as CompRecord["reason"])}
                  className="w-full rounded border border-input px-2 py-1 text-sm"
                >
                  {COMP_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Notes</label>
                <textarea
                  value={compNotes}
                  onChange={(e) => setCompNotes(e.target.value)}
                  placeholder="Why was this comped?"
                  rows={2}
                  className="w-full rounded border border-input px-2 py-1 text-sm resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setCompDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleRecordComp} disabled={!compRecipeName || !compCost} className="flex-1">
                  Record Comp
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recent Plates */}
      {todayPlates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today's Plates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {todayPlates.slice(-15).reverse().map((plate) => (
                <div key={plate.id} className="flex items-start justify-between p-2 rounded hover:bg-muted/50 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{plate.recipeName}</p>
                    <p className="text-xs text-muted-foreground">{plate.portionSize}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <Badge
                      variant={
                        plate.status === "served"
                          ? "default"
                          : plate.status === "returned"
                            ? "secondary"
                            : "destructive"
                      }
                      className="text-xs"
                    >
                      {plate.status}
                    </Badge>
                    <p className="font-semibold text-right min-w-16">${(plate.price - plate.cost).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlateCostingDashboard;
