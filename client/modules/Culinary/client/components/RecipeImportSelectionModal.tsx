import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

export interface DetectedRecipe {
  page: number;
  title: string;
  ingredients?: string[];
  instructions?: string[];
  prepTime?: string;
  cookTime?: string;
  yield?: string;
  difficulty?: string;
  fullText?: string;
}

interface RecipeImportSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipes: DetectedRecipe[];
  onImport: (selectedRecipes: DetectedRecipe[]) => Promise<void>;
  isLoading?: boolean;
  bookName?: string;
}

export function RecipeImportSelectionModal({
  open,
  onOpenChange,
  recipes,
  onImport,
  isLoading = false,
  bookName = "Cookbook",
}: RecipeImportSelectionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [previewIndex, setPreviewIndex] = useState<number | null>(
    recipes.length > 0 ? 0 : null
  );
  const [selectAll, setSelectAll] = useState(false);

  const previewRecipe = useMemo(() => {
    if (previewIndex === null || previewIndex >= recipes.length) return null;
    return recipes[previewIndex];
  }, [previewIndex, recipes]);

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedIds(new Set(recipes.map((_, i) => i)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRecipe = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === recipes.length && recipes.length > 0);
  };

  const handleImport = async () => {
    const selectedRecipes = recipes.filter((_, i) => selectedIds.has(i));
    await onImport(selectedRecipes);
    onOpenChange(false);
  };

  const selectedCount = selectedIds.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Import Recipes from {bookName} ({recipes.length} detected)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 overflow-hidden">
          {/* Left Panel: Recipe List */}
          <div className="flex flex-col border rounded-lg bg-background/50">
            <div className="border-b p-3 flex items-center justify-between">
              <div className="text-sm font-semibold">Detected Recipes</div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                  disabled={recipes.length === 0}
                  title="Select all recipes"
                />
                <label
                  htmlFor="select-all"
                  className="text-xs font-medium cursor-pointer"
                >
                  Select All
                </label>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-1 p-3">
                {recipes.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No recipes detected
                  </div>
                ) : (
                  recipes.map((recipe, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded cursor-pointer transition-colors hover:bg-primary/10",
                        previewIndex === index && "bg-primary/20 border-l-2 border-primary",
                      )}
                      onClick={() => setPreviewIndex(index)}
                    >
                      <Checkbox
                        id={`recipe-${index}`}
                        checked={selectedIds.has(index)}
                        onCheckedChange={(checked) =>
                          handleSelectRecipe(index, checked as boolean)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="font-medium truncate text-foreground">
                          {recipe.title || `Recipe from p.${recipe.page}`}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Page {recipe.page}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel: Recipe Preview */}
          <div className="flex flex-col border rounded-lg bg-background/50">
            {previewRecipe ? (
              <>
                <div className="border-b p-3 bg-primary/10">
                  <h3 className="font-semibold text-sm">
                    {previewRecipe.title || `Recipe from p.${previewRecipe.page}`}
                  </h3>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    Page {previewRecipe.page}
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-3 p-3 text-xs">
                    {/* Metadata */}
                    {(previewRecipe.prepTime ||
                      previewRecipe.cookTime ||
                      previewRecipe.yield) && (
                      <div className="grid grid-cols-2 gap-2 text-[11px] border-b pb-2">
                        {previewRecipe.prepTime && (
                          <div>
                            <span className="font-semibold text-muted-foreground">
                              Prep:
                            </span>{" "}
                            {previewRecipe.prepTime}
                          </div>
                        )}
                        {previewRecipe.cookTime && (
                          <div>
                            <span className="font-semibold text-muted-foreground">
                              Cook:
                            </span>{" "}
                            {previewRecipe.cookTime}
                          </div>
                        )}
                        {previewRecipe.yield && (
                          <div className="col-span-2">
                            <span className="font-semibold text-muted-foreground">
                              Yield:
                            </span>{" "}
                            {previewRecipe.yield}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ingredients */}
                    {previewRecipe.ingredients &&
                      previewRecipe.ingredients.length > 0 && (
                        <div>
                          <div className="font-semibold text-foreground mb-1">
                            Ingredients
                          </div>
                          <ul className="space-y-0.5 text-[11px] list-disc list-inside">
                            {previewRecipe.ingredients.slice(0, 15).map((ing, i) => (
                              <li key={i} className="text-muted-foreground">
                                {ing}
                              </li>
                            ))}
                            {previewRecipe.ingredients.length > 15 && (
                              <li className="text-muted-foreground italic">
                                +{previewRecipe.ingredients.length - 15} more
                                ingredients
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                    {/* Instructions */}
                    {previewRecipe.instructions &&
                      previewRecipe.instructions.length > 0 && (
                        <div>
                          <div className="font-semibold text-foreground mb-1">
                            Instructions
                          </div>
                          <ol className="space-y-0.5 text-[11px] list-decimal list-inside">
                            {previewRecipe.instructions.slice(0, 8).map((inst, i) => (
                              <li key={i} className="text-muted-foreground">
                                {inst}
                              </li>
                            ))}
                            {previewRecipe.instructions.length > 8 && (
                              <li className="text-muted-foreground italic">
                                +{previewRecipe.instructions.length - 8} more
                                steps
                              </li>
                            )}
                          </ol>
                        </div>
                      )}

                    {!previewRecipe.ingredients &&
                      !previewRecipe.instructions &&
                      previewRecipe.fullText && (
                        <div className="text-[11px] whitespace-pre-wrap text-muted-foreground max-h-[200px] overflow-hidden">
                          {previewRecipe.fullText.slice(0, 500)}
                          {previewRecipe.fullText.length > 500 && "..."}
                        </div>
                      )}
                  </div>
                </ScrollArea>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center text-sm">
                  <div>Select a recipe to preview</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary and Actions */}
        <div className="border-t pt-3 space-y-3">
          <div className="text-sm text-muted-foreground">
            {selectedCount === 0 ? (
              <span>Select recipes to import them for Echo knowledge</span>
            ) : (
              <span className="font-medium">
                {selectedCount} recipe{selectedCount !== 1 ? "s" : ""} selected
                for import
              </span>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={selectedCount === 0 || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
            >
              {isLoading ? "Importing..." : `Import ${selectedCount} Recipe${selectedCount !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
