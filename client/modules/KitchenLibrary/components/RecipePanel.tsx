import React from "react";

import type { Recipe } from "@/../shared/types/recipe";
import { initializeSampleRecipes, listRecipes } from "@/lib/recipe-store";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle, ChefHat } from "lucide-react";
import { useI18n } from "@/i18n";

export default function RecipePanel() {
  const { t } = useI18n();
  const [recipes, setRecipes] = React.useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = React.useState<Recipe | null>(
    null,
  );

  React.useEffect(() => {
    initializeSampleRecipes();
    const next = listRecipes();
    setRecipes(next);
    if (!selectedRecipe && next.length > 0) {
      setSelectedRecipe(next[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              {t("module.kitchen-library.title")}
            </h2>
            <div className="flex items-center gap-2">
              <ModuleChatButton
                moduleId="kitchen-library"
                moduleName={t("module.kitchen-library.title")}
              />
              <Badge variant="outline">
                {recipes.length} {t("module.kitchen-library.recipes")}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-foreground/60">
            {t("module.kitchen-library.description")}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        <div className="flex-shrink-0 w-64 border border-border/30 rounded-lg overflow-auto bg-muted/20">
          <div className="p-3 space-y-2">
            {recipes.length > 0 ? (
              recipes.map((recipe) => (
                <button
                  key={recipe.recipeId}
                  onClick={() => setSelectedRecipe(recipe)}
                  className={[
                    "w-full text-left p-3 rounded-lg transition-colors",
                    selectedRecipe?.recipeId === recipe.recipeId
                      ? "bg-primary/20 border border-primary/50"
                      : "hover:bg-muted/60 border border-transparent",
                  ].join(" ")}
                >
                  <div className="font-semibold text-sm text-foreground">
                    {recipe.recipeName}
                  </div>
                  <div className="text-xs text-foreground/60 mt-1">
                    {recipe.ingredients.length} ingredients •{" "}
                    {recipe.portionsPerRecipe} portion
                    {recipe.portionsPerRecipe !== 1 ? "s" : ""}
                  </div>
                  {recipe.yieldCategory ? (
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      {recipe.yieldCategory}
                    </Badge>
                  ) : null}
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-sm text-foreground/60">
                No recipes yet
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {selectedRecipe ? (
            <Card className="border-0 shadow-none bg-transparent h-full">
              <CardHeader className="px-0 pt-0 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      {selectedRecipe.recipeName}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {selectedRecipe.portionsPerRecipe} portion
                      {selectedRecipe.portionsPerRecipe !== 1 ? "s" : ""} per
                      recipe
                    </CardDescription>
                  </div>
                  {selectedRecipe.yieldCategory ? (
                    <Badge className="bg-primary/20 text-primary border-primary/50">
                      {selectedRecipe.yieldCategory}
                    </Badge>
                  ) : null}
                </div>
              </CardHeader>

              <CardContent className="px-0">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-3">
                      {t("module.kitchen-library.ingredients")}
                    </h3>
                    <div className="space-y-2">
                      {selectedRecipe.ingredients.map((ing) => (
                        <div
                          key={ing.ingredientId}
                          className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium text-sm text-foreground">
                              {ing.ingredientName}
                            </div>
                            <div className="text-xs text-foreground/60 mt-1">
                              {ing.quantityPerPortion} {ing.unit} per portion
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-foreground">
                              {(ing.yieldPercent * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-foreground/60">
                              yield
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                    <div className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      About Yield Loss
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                      Yield % accounts for trim, waste, and cooking loss. For
                      example, 80% yield on a raw protein means 20% is lost to
                      trimming and shrinkage during cooking.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <AlertCircle className="mx-auto mb-4 h-8 w-8 text-slate-400" />
                <p className="text-sm text-foreground/60">
                  {t("module.kitchen-library.selectRecipe")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
