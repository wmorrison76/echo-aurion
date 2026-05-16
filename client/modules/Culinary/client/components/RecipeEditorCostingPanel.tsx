import React from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { RecipeCostSummary, InlineCostBadge } from "@/components/RecipeCostSummary";
import { QuickOrderPanel } from "@/components/QuickOrderPanel";
import { IngredientRow } from "@/types/ingredients";
import { Separator } from "@/components/ui/separator";

interface RecipeEditorCostingPanelProps {
  ingredients: IngredientRow[];
  recipeTitle?: string;
  servings?: number;
  onOrderCreated?: (items: any[]) => void;
  compact?: boolean;
}

/**
 * Unified costing panel for recipe editor
 * Displays cost summary, variance tracking, and quick order functionality
 * Designed for minimal UI intrusion while providing powerful costing features
 */
export function RecipeEditorCostingPanel({
  ingredients,
  recipeTitle,
  servings = 1,
  onOrderCreated,
  compact = false,
}: RecipeEditorCostingPanelProps) {
  // Filter out empty and divider rows
  const activeIngredients = ingredients.filter(
    (ing) => ing.type !== "divider" && ing.item.trim().length > 0,
  );

  if (activeIngredients.length === 0) {
    return null; // Don't show panel if no ingredients
  }

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Zap className="h-4 w-4 text-[#c8a97e]" />
            <span className="text-sm font-semibold">Cost Analysis</span>
          </div>
          <QuickOrderPanel
            ingredients={activeIngredients}
            recipeTitle={recipeTitle}
            onOrderCreated={onOrderCreated}
            trigger={
              <button className="text-xs font-medium text-[#c8a97e] hover:text-[#b8976c] dark:text-[#c8a97e] dark:hover:text-[#c8a97e]">
                Create Order
              </button>
            }
          />
        </div>
        <InlineCostBadge
          ingredients={activeIngredients}
          servings={servings}
          showVariance={true}
        />
        <Separator className="my-2" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      <RecipeCostSummary
        ingredients={activeIngredients}
        servings={servings}
        recipeTitle={recipeTitle}
        compact={false}
        showBreakdown={true}
      />

      <div className="flex gap-2 justify-end">
        <QuickOrderPanel
          ingredients={activeIngredients}
          recipeTitle={recipeTitle}
          onOrderCreated={onOrderCreated}
        />
      </div>

      <Separator />
    </motion.div>
  );
}

/**
 * Simpler version for recipe cards (list view)
 */
export function RecipeCardCostingBadge({
  ingredients,
  servings = 1,
}: {
  ingredients: IngredientRow[];
  servings?: number;
}) {
  const activeIngredients = ingredients.filter(
    (ing) => ing.type !== "divider" && ing.item.trim().length > 0,
  );

  if (activeIngredients.length === 0) return null;

  return (
    <div className="flex gap-2 flex-wrap">
      <InlineCostBadge
        ingredients={activeIngredients}
        servings={servings}
        showVariance={true}
      />
    </div>
  );
}
