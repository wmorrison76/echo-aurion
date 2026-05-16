import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
  Users,
  Package,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useRecipeCostCalculation, useCostVarianceStatus } from "@/hooks/use-recipe-costing";
import { getInventoryItem } from "@/data/inventoryItems";
import { IngredientRow } from "@/types/ingredients";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/context/LanguageContext";

interface RecipeCostSummaryProps {
  ingredients: IngredientRow[];
  servings?: number;
  recipeTitle?: string;
  compact?: boolean;
  expandable?: boolean;
  showBreakdown?: boolean;
  currency?: string;
}

export function RecipeCostSummary({
  ingredients,
  servings = 1,
  recipeTitle,
  compact = false,
  expandable = true,
  showBreakdown = true,
  currency = "USD",
}: RecipeCostSummaryProps) {
  const { t } = useTranslation();
  const { summary } = useRecipeCostCalculation(ingredients, servings);
  const varianceStatus = useCostVarianceStatus(summary.estimatedCostVariance);

  const linkedPercentage = useMemo(() => {
    if (summary.ingredientCount === 0) return 0;
    return Math.round((summary.linkedCount / summary.ingredientCount) * 100);
  }, [summary.linkedCount, summary.ingredientCount]);

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="text-sm space-y-0.5">
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-[#c8a97e]" />
            <span className="text-xs text-muted-foreground">Recipe Total</span>
          </div>
          <div className="text-lg font-bold">
            {formatCurrency(summary.totalRecipeCost)}
          </div>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <div className="text-sm space-y-0.5">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-[#c8a97e]" />
            <span className="text-xs text-muted-foreground">Per Serving</span>
          </div>
          <div className="text-lg font-bold">
            {formatCurrency(summary.costPerServing)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-[#c8a97e]/25 bg-amber-50/30 dark:border-[#c8a97e]/30/30 dark:bg-neutral-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-[#c8a97e]" />
              Cost Analysis
            </CardTitle>
            {recipeTitle && (
              <CardDescription className="mt-1 text-xs">
                {recipeTitle}
              </CardDescription>
            )}
          </div>
          <Badge
            variant={linkedPercentage >= 80 ? "default" : "secondary"}
            className="text-xs"
          >
            {linkedPercentage}% Linked
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main cost metrics */}
        <div className="grid grid-cols-2 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1 p-2.5 rounded-lg bg-white/50 dark:bg-slate-900/30"
          >
            <span className="text-xs text-muted-foreground font-medium">
              Total Recipe Cost
            </span>
            <div className="text-2xl font-bold text-[#b8976c] dark:text-[#c8a97e]/80">
              {formatCurrency(summary.totalRecipeCost)}
            </div>
            {servings > 1 && (
              <p className="text-xs text-muted-foreground">
                for {servings} serving{servings !== 1 ? "s" : ""}
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-1 p-2.5 rounded-lg bg-white/50 dark:bg-slate-900/30"
          >
            <span className="text-xs text-muted-foreground font-medium">
              Cost per Serving
            </span>
            <div className="text-2xl font-bold text-[#b8976c] dark:text-[#c8a97e]/80">
              {formatCurrency(summary.costPerServing)}
            </div>
            {servings <= 1 && (
              <p className="text-xs text-muted-foreground">
                Single serving
              </p>
            )}
          </motion.div>
        </div>

        {/* Variance indicator */}
        {summary.estimatedCostVariance !== null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-lg border-l-2",
              summary.estimatedCostVariance > 5
                ? "bg-red-50/50 border-red-400 dark:bg-red-950/20"
                : summary.estimatedCostVariance < -5
                  ? "bg-green-50/50 border-green-400 dark:bg-green-950/20"
                  : "bg-slate-50/50 border-slate-400 dark:bg-slate-900/20",
            )}
          >
            {summary.estimatedCostVariance > 5 ? (
              <TrendingUp className="h-4 w-4 text-red-600 flex-shrink-0" />
            ) : summary.estimatedCostVariance < -5 ? (
              <TrendingDown className="h-4 w-4 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-slate-600 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium">
                {varianceStatus.label}
              </p>
              <p className="text-xs text-muted-foreground">
                vs. previous orders
              </p>
            </div>
          </motion.div>
        )}

        {/* Ingredient breakdown */}
        {showBreakdown && summary.ingredientCount > 0 && (
          <>
            <Separator className="my-2" />
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Ingredients
                </p>
                <span className="text-xs text-muted-foreground">
                  {summary.linkedCount} of {summary.ingredientCount} linked
                </span>
              </div>

              {summary.suppliers.size > 0 && (
                <div className="space-y-1 pl-6">
                  {Array.from(summary.suppliers.entries()).map(
                    ([supplierId, cost]) => {
                      const supplierName =
                        supplierId === "sup-harvest-kitchens"
                          ? "Harvest Kitchens"
                          : supplierId === "sup-urban-butcher"
                            ? "Urban Butcher"
                            : supplierId === "sup-coastal-produce"
                              ? "Coastal Produce"
                              : supplierId === "sup-atelier-patisserie"
                                ? "Atelier Patisserie"
                                : supplierId === "sup-lavilla-preserves"
                                  ? "LaVilla Preserves"
                                  : "Other";

                      const percentage = Math.round(
                        (cost / summary.totalRecipeCost) * 100,
                      );

                      return (
                        <div
                          key={supplierId}
                          className="flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                            <span className="text-muted-foreground">
                              {supplierName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">
                              {formatCurrency(cost)}
                            </span>
                            <span className="text-muted-foreground">
                              ({percentage}%)
                            </span>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}

        {/* Unlinked warning */}
        {linkedPercentage < 100 && linkedPercentage > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-2.5 bg-yellow-50/50 dark:bg-yellow-950/20 rounded border-l-2 border-yellow-400 text-xs space-y-1"
          >
            <p className="font-medium flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {summary.ingredientCount - summary.linkedCount} ingredient
              {summary.ingredientCount - summary.linkedCount !== 1 ? "s" : ""} not
              linked
            </p>
            <p className="text-muted-foreground">
              Link them for accurate cost tracking
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact inline cost display (for recipe cards)
interface InlineCostBadgeProps {
  ingredients: IngredientRow[];
  servings?: number;
  showVariance?: boolean;
}

export function InlineCostBadge({
  ingredients,
  servings = 1,
  showVariance = false,
}: InlineCostBadgeProps) {
  const { summary } = useRecipeCostCalculation(ingredients, servings);
  const varianceStatus = useCostVarianceStatus(summary.estimatedCostVariance);

  const linkedPercentage = useMemo(() => {
    if (summary.ingredientCount === 0) return 0;
    return Math.round((summary.linkedCount / summary.ingredientCount) * 100);
  }, [summary.linkedCount, summary.ingredientCount]);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="secondary" className="gap-1">
        <DollarSign className="h-3 w-3" />
        ${summary.costPerServing.toFixed(2)}/serving
      </Badge>

      {showVariance && summary.estimatedCostVariance !== null && (
        <Badge
          variant={
            summary.estimatedCostVariance > 5
              ? "destructive"
              : summary.estimatedCostVariance < -5
                ? "default"
                : "outline"
          }
          className="gap-1"
        >
          {summary.estimatedCostVariance > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {varianceStatus.label}
        </Badge>
      )}

      {linkedPercentage < 100 && (
        <Badge variant="outline" className="text-xs">
          {linkedPercentage}% linked
        </Badge>
      )}
    </div>
  );
}
