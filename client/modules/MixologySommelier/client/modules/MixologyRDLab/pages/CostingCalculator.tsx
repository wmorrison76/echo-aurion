/**
 * Costing Calculator Page
 * Calculate and analyze recipe costs
 */

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, TrendingUp } from "lucide-react";
import { useRecipeStore } from "../stores/recipeStore";
import { RecipeService } from "../services/recipe-service";

export function CostingCalculator() {
  const { recipeId } = useParams<{ recipeId: string }>();
  const navigate = useNavigate();
  const { currentRecipe, loading, loadRecipe } = useRecipeStore();
  const [targetMargin, setTargetMargin] = useState(70);

  useEffect(() => {
    if (recipeId) {
      loadRecipe(recipeId);
    }
  }, [recipeId, loadRecipe]);

  const calculateCosting = async () => {
    if (!currentRecipe) return;
    try {
      const costing = await RecipeService.calculateCosting(
        currentRecipe.ingredients,
      );
      // Update recipe with new costing
      // This would typically update the store
    } catch (error) {
      console.error("Failed to calculate costing:", error);
    }
  };

  useEffect(() => {
    if (currentRecipe) {
      calculateCosting();
    }
  }, [currentRecipe]);

  if (loading || !currentRecipe) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Loading costing data...</p>
        </div>
      </div>
    );
  }

  const costing = currentRecipe.costing;
  const suggestedPrice = costing.totalCost / (1 - targetMargin / 100);

  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`/workspace/${recipeId}`)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Costing Calculator
          </h1>
          <p className="text-sm text-muted-foreground">{currentRecipe.name}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Cost Breakdown */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calculator className="text-primary" size={20} />
            <h2 className="text-lg font-semibold text-foreground">
              Cost Breakdown
            </h2>
          </div>
          <div className="space-y-3">
            {currentRecipe.ingredients.map((ing, index) => (
              <div
                key={index}
                className="flex justify-between items-center py-2 border-b border-border last:border-0"
              >
                <div>
                  <p className="font-medium text-foreground">{ing.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {ing.quantity} {ing.unit}
                  </p>
                </div>
                <p className="font-semibold text-foreground">
                  ${ing.cost.toFixed(2)}
                </p>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t-2 border-primary">
              <p className="font-semibold text-lg text-foreground">
                Total Cost
              </p>
              <p className="font-bold text-xl text-primary">
                ${costing.totalCost.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Calculator */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-primary" size={20} />
            <h2 className="text-lg font-semibold text-foreground">
              Pricing Calculator
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground">
                Target Margin (%)
              </label>
              <input
                type="number"
                value={targetMargin}
                onChange={(e) =>
                  setTargetMargin(parseFloat(e.target.value) || 0)
                }
                min="0"
                max="100"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Current Price
                </p>
                <p className="text-2xl font-bold text-foreground">
                  ${costing.sellingPrice.toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Suggested Price
                </p>
                <p className="text-2xl font-bold text-primary">
                  ${suggestedPrice.toFixed(2)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Current Margin
                </p>
                <p className="text-xl font-semibold text-foreground">
                  {costing.marginPercent.toFixed(1)}%
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">
                  Target Margin
                </p>
                <p className="text-xl font-semibold text-primary">
                  {targetMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
