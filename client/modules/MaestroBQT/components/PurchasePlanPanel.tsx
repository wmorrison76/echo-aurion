import React from "react";
import type { PurchasePlan } from "@/../shared/types/purchasing";
import { osBus } from "@/lib/os-bus";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingUp } from "lucide-react";

interface PurchasePlanPanelProps {
  plan?: PurchasePlan | null;
  beoId?: string | null;
}

export default function PurchasePlanPanel({
  plan: externalPlan,
  beoId,
}: PurchasePlanPanelProps) {
  const [busPlan, setBusPlan] = React.useState<PurchasePlan | null>(null);

  React.useEffect(() => {
    const unsubscribe = osBus.on("purchasing:plan_generated", (payload) => {
      setBusPlan({
        planId: payload.planId,
        beoId: payload.beoId,
        revision: payload.revision,
        generatedAt: payload.generatedAt,
        ingredients: payload.ingredients,
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const plan = React.useMemo(() => {
    if (externalPlan) return externalPlan;
    if (beoId && busPlan && busPlan.beoId !== beoId) return null;
    return busPlan;
  }, [externalPlan, busPlan, beoId]);

  if (!plan) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-slate-400" />
          <p className="text-sm text-slate-500">
            No purchase plan generated yet.
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Generate a BEO to create a purchase plan.
          </p>
        </div>
      </div>
    );
  }

  const totalToOrder = plan.ingredients.reduce(
    (sum, ing) => sum + ing.toOrder,
    0,
  );
  const itemsNeedingOrder = plan.ingredients.filter(
    (ing) => ing.toOrder > 0,
  ).length;

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Purchase Plan
            </h2>
            <Badge variant="outline">Rev {plan.revision}</Badge>
          </div>
          <p className="text-xs text-foreground/60">
            Ingredient requirements derived from production sheets
          </p>

          {/* Delta Summary */}
          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border/20">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {plan.ingredients.length}
              </div>
              <div className="text-xs text-foreground/60">Ingredients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {itemsNeedingOrder}
              </div>
              <div className="text-xs text-foreground/60">To Order</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {totalToOrder}
              </div>
              <div className="text-xs text-foreground/60">Total Units</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <Card className="border-0 shadow-none bg-transparent rounded-none h-full">
          <CardContent className="p-4">
            {plan.ingredients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-left text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                      <th className="pb-3 pr-4">Ingredient</th>
                      <th className="pb-3 pr-4 text-right w-20">Required</th>
                      <th className="pb-3 pr-4 text-right w-20">On-Hand</th>
                      <th className="pb-3 pr-4 text-right w-20">On-Order</th>
                      <th className="pb-3 pr-4 text-right w-20">To Order</th>
                      <th className="pb-3 pr-4 text-right w-16">Unit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.ingredients.map((ingredient) => {
                      const needsOrder = ingredient.toOrder > 0;
                      return (
                        <tr
                          key={ingredient.ingredientId}
                          className={`border-b border-border/10 hover:bg-muted/30 transition-colors ${
                            needsOrder
                              ? "bg-amber-50/40 dark:bg-amber-950/20"
                              : ""
                          }`}
                        >
                          <td className="py-3 pr-4 font-medium text-foreground">
                            <div className="flex items-center gap-2">
                              {ingredient.ingredientName}
                              {needsOrder && (
                                <TrendingUp className="h-3 w-3 text-amber-600" />
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4 text-right text-foreground font-semibold">
                            {ingredient.required}
                          </td>
                          <td className="py-3 pr-4 text-right text-foreground/70">
                            {ingredient.onHand}
                          </td>
                          <td className="py-3 pr-4 text-right text-foreground/70">
                            {ingredient.onOrder}
                          </td>
                          <td
                            className={`py-3 pr-4 text-right font-semibold ${
                              needsOrder
                                ? "text-amber-600"
                                : "text-foreground/50"
                            }`}
                          >
                            {ingredient.toOrder}
                          </td>
                          <td className="py-3 pr-4 text-right text-foreground/60 text-xs">
                            {ingredient.unit}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-foreground/60">
                No ingredients in this plan.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
