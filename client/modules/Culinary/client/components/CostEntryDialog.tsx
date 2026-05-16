import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import { useAppData } from "@/context/AppDataContext";
import type { CostEntry } from "@/lib/costing-engine";

interface IngredientCostRow {
  ingredientId: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
}

export interface CostEntryDialogProps {
  onSave: (entry: Omit<CostEntry, "id" | "timestamp">) => void;
}

export const CostEntryDialog: React.FC<CostEntryDialogProps> = ({ onSave }) => {
  const { recipes } = useAppData();
  const [open, setOpen] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [ingredients, setIngredients] = useState<IngredientCostRow[]>([]);
  const [portionCount, setPortionCount] = useState("1");
  const [sellingPrice, setSellingPrice] = useState("");
  const [portionSize, setPortionSize] = useState("");
  const [notes, setNotes] = useState("");

  const [newIngredient, setNewIngredient] = useState<IngredientCostRow>({
    ingredientId: "",
    ingredientName: "",
    quantity: 0,
    unit: "",
    costPerUnit: 0,
  });

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);

  const totalCost = ingredients.reduce((sum, ing) => sum + ing.quantity * ing.costPerUnit, 0);
  const costPerPortion = portionCount ? totalCost / parseInt(portionCount) : 0;
  const foodCostPercent = sellingPrice ? Math.round((costPerPortion / parseFloat(sellingPrice)) * 10000) / 100 : 0;

  const handleAddIngredient = () => {
    if (!newIngredient.ingredientName || newIngredient.costPerUnit <= 0) {
      alert("Please fill in ingredient name and cost");
      return;
    }

    setIngredients([...ingredients, { ...newIngredient }]);
    setNewIngredient({
      ingredientId: "",
      ingredientName: "",
      quantity: 0,
      unit: "",
      costPerUnit: 0,
    });
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRecipeId || !sellingPrice || ingredients.length === 0) {
      alert("Please fill in all required fields");
      return;
    }

    const entry: Omit<CostEntry, "id" | "timestamp"> = {
      recipeId: selectedRecipeId,
      recipeName: selectedRecipe?.title || "Unknown",
      ingredientCosts: ingredients.map((ing) => ({
        ingredientId: ing.ingredientId,
        ingredientName: ing.ingredientName,
        quantity: ing.quantity,
        unit: ing.unit,
        costPerUnit: ing.costPerUnit,
        totalCost: ing.quantity * ing.costPerUnit,
      })),
      totalRecipeCost: totalCost,
      portionCount: parseInt(portionCount),
      costPerPortion,
      sellingPrice: parseFloat(sellingPrice),
      portionSize: portionSize || "standard",
      notes,
    };

    onSave(entry);

    // Reset form
    setSelectedRecipeId("");
    setIngredients([]);
    setPortionCount("1");
    setSellingPrice("");
    setPortionSize("");
    setNotes("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Log Cost Entry
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-96 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Recipe Cost Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Recipe Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Select Recipe *</label>
            <AutocompleteInput
              suggestionType="recipes"
              placeholder="Search recipes..."
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              onSuggestionSelect={(suggestion) => {
                const recipe = recipes.find((r) => r.title === suggestion);
                setSelectedRecipeId(recipe?.id || "");
              }}
            />
          </div>

          {selectedRecipe && (
            <div className="p-2 rounded bg-muted text-sm">
              Selected: <strong>{selectedRecipe.title}</strong>
            </div>
          )}

          {/* Ingredients */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ingredient Costs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Ingredient List */}
              {ingredients.length > 0 && (
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                  {ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-1 bg-muted/50 rounded">
                      <div className="flex-1">
                        <p className="font-medium">{ing.ingredientName}</p>
                        <p className="text-xs text-muted-foreground">
                          {ing.quantity} {ing.unit} @ ${ing.costPerUnit}/unit = ${(ing.quantity * ing.costPerUnit).toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(idx)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Ingredient Row */}
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs font-semibold">Add Ingredient</p>
                <div className="grid grid-cols-12 gap-2">
                  <AutocompleteInput
                    suggestionType="ingredients"
                    placeholder="Ingredient"
                    value={newIngredient.ingredientName}
                    onChange={(e) => setNewIngredient({ ...newIngredient, ingredientName: e.target.value })}
                    className="col-span-5"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={newIngredient.quantity || ""}
                    onChange={(e) => setNewIngredient({ ...newIngredient, quantity: parseFloat(e.target.value) })}
                    step="0.01"
                    className="col-span-2 rounded border border-input px-2 py-1 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Unit"
                    value={newIngredient.unit}
                    onChange={(e) => setNewIngredient({ ...newIngredient, unit: e.target.value })}
                    className="col-span-2 rounded border border-input px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Cost"
                    value={newIngredient.costPerUnit || ""}
                    onChange={(e) => setNewIngredient({ ...newIngredient, costPerUnit: parseFloat(e.target.value) })}
                    step="0.01"
                    className="col-span-2 rounded border border-input px-2 py-1 text-sm"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddIngredient}
                    className="col-span-1"
                  >
                    +
                  </Button>
                </div>
              </div>

              {/* Total */}
              {ingredients.length > 0 && (
                <div className="border-t pt-2 flex justify-end">
                  <p className="text-sm font-semibold">
                    Total Cost: ${totalCost.toFixed(2)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portion & Pricing */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Portions *</label>
              <input
                type="number"
                value={portionCount}
                onChange={(e) => setPortionCount(e.target.value)}
                min="1"
                className="w-full rounded border border-input px-2 py-1 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Selling Price/Portion *</label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                step="0.01"
                placeholder="0.00"
                className="w-full rounded border border-input px-2 py-1 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Portion Size</label>
              <input
                type="text"
                value={portionSize}
                onChange={(e) => setPortionSize(e.target.value)}
                placeholder="e.g., 6oz"
                className="w-full rounded border border-input px-2 py-1 text-sm"
              />
            </div>
          </div>

          {/* Calculated Values */}
          {ingredients.length > 0 && sellingPrice && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Cost/Portion</p>
                  <p className="text-lg font-bold">${costPerPortion.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Food Cost %</p>
                  <p className="text-lg font-bold">{foodCostPercent}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Profit/Portion</p>
                  <p className="text-lg font-bold text-green-600">
                    ${(parseFloat(sellingPrice) - costPerPortion).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about this costing..."
              rows={2}
              className="w-full rounded border border-input px-2 py-1 text-sm resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!selectedRecipeId || !sellingPrice || ingredients.length === 0}>
              Save Entry
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CostEntryDialog;
