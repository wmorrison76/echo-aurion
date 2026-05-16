import React, { useMemo } from "react";
import type { Recipe } from "@shared/recipes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { DishComponentRow, RecipeSummary, formatCurrencyValue } from "../utils";
import { ArrowRight } from "lucide-react";

type RecipePreviewPanelProps = {
  rows: DishComponentRow[];
  recipeSummaries: Map<string, RecipeSummary>;
  recipeMap: Map<string, Recipe>;
  activeComponentId: string | null;
  onFocusRow: (rowId: string) => void;
  onNavigateToRecipe: (recipeId: string) => void;
  className?: string;
};

const RecipePreviewPanel: React.FC<RecipePreviewPanelProps> = ({
  rows,
  recipeSummaries,
  recipeMap,
  activeComponentId,
  onFocusRow,
  onNavigateToRecipe,
  className,
}) => {
  const entries = useMemo(() => {
    return rows
      .filter((row) => row.recipeId)
      .map((row) => {
        const summary = row.recipeId ? recipeSummaries.get(row.recipeId) : null;
        const recipe = row.recipeId ? recipeMap.get(row.recipeId) : null;
        return {
          row,
          summary,
          recipe,
        };
      })
      .filter((entry) => entry.summary && entry.recipe) as Array<{
      row: DishComponentRow;
      summary: RecipeSummary;
      recipe: Recipe;
    }>;
  }, [recipeMap, recipeSummaries, rows]);

  const activeEntry = useMemo(() => {
    if (!entries.length) return null;
    if (!activeComponentId) return entries[0]!;
    return (
      entries.find((entry) => entry.row.id === activeComponentId) ?? entries[0]!
    );
  }, [activeComponentId, entries]);

  return (
    <Card className={cn("border-primary/30 bg-background/95 shadow-lg", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">
          Component Explorer
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <ScrollArea className="max-h-72 rounded-xl border border-primary/30">
          <div className="flex flex-col divide-y divide-primary/20">
            {entries.length === 0 ? (
              <div className="flex h-48 items-center justify-center px-4 text-center text-xs uppercase tracking-[0.32em] text-muted-foreground">
                Select recipes to unlock deep linking
              </div>
            ) : (
              entries.map(({ row, summary }) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onFocusRow(row.id)}
                  className={`flex flex-col items-start gap-1 px-4 py-3 text-left transition hover:bg-primary/10 ${row.id === activeEntry?.row.id ? "bg-primary/15" : ""}`}
                >
                  <span className="text-sm font-semibold tracking-[0.12em]">
                    {row.label || summary.menuName || summary.title}
                  </span>
                  <div className="flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
                    {summary.course ? (
                      <Badge variant="outline">{summary.course}</Badge>
                    ) : null}
                    {summary.cuisine ? (
                      <Badge variant="outline">{summary.cuisine}</Badge>
                    ) : null}
                    {summary.allergens.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="space-y-3">
          {activeEntry ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                    Component detail
                  </div>
                  <h3 className="text-lg font-semibold tracking-[0.08em]">
                    {activeEntry.row.label ||
                      activeEntry.summary.menuName ||
                      activeEntry.summary.title}
                  </h3>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateToRecipe(activeEntry.summary.id)}
                  className="rounded-full border-primary/40 text-primary hover:bg-primary/10"
                >
                  Open in search
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                {activeEntry.summary.course ? (
                  <Badge variant="outline">{activeEntry.summary.course}</Badge>
                ) : null}
                {activeEntry.summary.cuisine ? (
                  <Badge variant="outline">{activeEntry.summary.cuisine}</Badge>
                ) : null}
                {activeEntry.summary.costPerPortion != null ? (
                  <Badge variant="outline">
                    Cost{" "}
                    {formatCurrencyValue(
                      activeEntry.summary.costPerPortion,
                      activeEntry.summary.currency,
                    )}
                  </Badge>
                ) : null}
              </div>
              <Separator className="bg-primary/20" />
              {activeEntry.summary.description ? (
                <p className="text-sm text-muted-foreground">
                  {activeEntry.summary.description}
                </p>
              ) : null}
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                  Key ingredients
                </div>
                <ScrollArea className="max-h-40 rounded-xl border border-primary/20">
                  <ul className="space-y-1.5 p-3 text-sm">
                    {activeEntry.recipe.ingredients?.map((line, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-0.5 h-1.5 w-1.5 flex-none rounded-full bg-primary/60" />
                        <span>{line}</span>
                      </li>
                    )) ?? (
                      <li className="text-xs text-muted-foreground">
                        No ingredient list captured.
                      </li>
                    )}
                  </ul>
                </ScrollArea>
              </div>
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.32em] text-muted-foreground">
                  Directions snapshot
                </div>
                <ScrollArea className="max-h-40 rounded-xl border border-primary/20">
                  <ol className="space-y-2.5 p-3 text-sm">
                    {activeEntry.recipe.instructions?.length ? (
                      activeEntry.recipe.instructions.map((step, index) => (
                        <li key={index} className="flex gap-2">
                          <span className="font-semibold text-primary">
                            {index + 1}.
                          </span>
                          <span>{step}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-xs text-muted-foreground">
                        No detailed instructions imported for this recipe.
                      </li>
                    )}
                  </ol>
                </ScrollArea>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-muted/20 p-6 text-center text-xs uppercase tracking-[0.35em] text-muted-foreground">
              Select a component to preview recipe lineage
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecipePreviewPanel;
