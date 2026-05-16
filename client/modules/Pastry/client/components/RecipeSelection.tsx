import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowUp,
  ArrowDown,
  ClipboardList,
  X,
  Wine,
  Utensils,
} from "lucide-react";
import type { Recipe } from "@shared/recipes";
import type { ServerNoteRecipe } from "@shared/server-notes";
import { silverwareOptions } from "@shared/server-notes";
import {
  MENU_CATEGORIES,
  type MenuCategoryKey,
  getCategoryLabel,
  resolveMenuCategoryKey,
  resolveMenuName,
  resolveMenuPrice,
} from "@/lib/menu-metadata";

export type RecipeSelectionProps = {
  availableRecipes: Recipe[];
  selectedRecipes: ServerNoteRecipe[];
  onRecipesChange: (recipes: ServerNoteRecipe[]) => void;
};

type PreparedMenuItem = {
  recipe: Recipe;
  menuName: string;
  menuPrice: string | null;
  category: MenuCategoryKey | null;
};

const OTHER_LABEL = "Other Items";

export function RecipeSelection({
  availableRecipes,
  selectedRecipes,
  onRecipesChange,
}: RecipeSelectionProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const selectedIds = useMemo(
    () => new Set(selectedRecipes.map((item) => item.recipe.id)),
    [selectedRecipes],
  );

  const preparedMenu = useMemo<PreparedMenuItem[]>(() => {
    const lower = search.trim().toLowerCase();
    return availableRecipes
      .map((recipe) => {
        const menuName = resolveMenuName(recipe);
        const menuPrice = resolveMenuPrice(recipe);
        const category = resolveMenuCategoryKey(recipe);
        return { recipe, menuName, menuPrice, category } satisfies PreparedMenuItem;
      })
      .filter(({ recipe, menuName }) => {
        if (!lower) return true;
        return (
          menuName.toLowerCase().includes(lower) ||
          (recipe.description ?? "").toLowerCase().includes(lower) ||
          recipe.tags?.some((tag) => tag.toLowerCase().includes(lower)) ||
          recipe.title.toLowerCase().includes(lower)
        );
      })
      .sort((a, b) => a.menuName.localeCompare(b.menuName));
  }, [availableRecipes, search]);

  const categorizedMenu = useMemo(() => {
    const buckets = new Map<MenuCategoryKey, PreparedMenuItem[]>();
    for (const category of MENU_CATEGORIES) {
      buckets.set(category.key, []);
    }
    const orphans: PreparedMenuItem[] = [];

    for (const item of preparedMenu) {
      if (item.category && buckets.has(item.category)) {
        buckets.get(item.category)!.push(item);
      } else {
        orphans.push(item);
      }
    }

    return { buckets, orphans };
  }, [preparedMenu]);

  const toggleRecipe = (recipe: Recipe) => {
    const existing = selectedRecipes.find((item) => item.recipe.id === recipe.id);
    if (existing) {
      onRecipesChange(selectedRecipes.filter((item) => item.recipe.id !== recipe.id));
    } else {
      onRecipesChange([
        ...selectedRecipes,
        {
          recipe,
          order: selectedRecipes.length,
          wineSelection: "",
          sellingNotes: "",
          serviceInstructions: "",
          silverwareRequired: [],
        },
      ]);
    }
  };

  const moveRecipe = (recipeId: string, direction: -1 | 1) => {
    const index = selectedRecipes.findIndex((item) => item.recipe.id === recipeId);
    if (index === -1) return;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= selectedRecipes.length) return;
    const next = [...selectedRecipes];
    const [moved] = next.splice(index, 1);
    next.splice(newIndex, 0, moved);
    onRecipesChange(next.map((item, idx) => ({ ...item, order: idx })));
  };

  const updateRecipe = (recipeId: string, patch: Partial<ServerNoteRecipe>) => {
    onRecipesChange(
      selectedRecipes.map((item) =>
        item.recipe.id === recipeId ? { ...item, ...patch } : item,
      ),
    );
  };

  return (
    <div className="space-y-5">
      {selectedRecipes.length > 0 && (
        <Card>
          <CardHeader className="space-y-1 px-3 py-2.5">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">Selected Menu Items ({selectedRecipes.length})</span>
              <Badge variant="secondary" className="text-[11px]">
                Reorder with arrows
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 px-3 pb-3 pt-0">
            {selectedRecipes.map((entry, index) => {
              const menuName = resolveMenuName(entry.recipe);
              const menuPrice = resolveMenuPrice(entry.recipe);
              const categoryLabel =
                getCategoryLabel(resolveMenuCategoryKey(entry.recipe)) ||
                entry.recipe.course ||
                "—";
              return (
                <div key={entry.recipe.id} className="rounded-lg border px-2.5 py-2 text-[12px]">
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="flex flex-col gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5.5 w-5.5"
                        onClick={() => moveRecipe(entry.recipe.id, -1)}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5.5 w-5.5"
                        onClick={() => moveRecipe(entry.recipe.id, 1)}
                        disabled={index === selectedRecipes.length - 1}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <img
                      src={
                        entry.recipe.imageDataUrls?.[0] ||
                        entry.recipe.image ||
                        "https://cdn.builder.io/api/v1/image/assets%2Fplaceholder"
                      }
                      alt={entry.recipe.title}
                      className="h-12 w-12 rounded object-cover"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="truncate text-[12px] font-semibold">{menuName}</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {categoryLabel}
                            {menuPrice ? ` • ${menuPrice}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.25 text-[11px]">
                          <Badge variant="outline" className="text-[10px]">
                            #{index + 1}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setExpanded(expanded === entry.recipe.id ? null : entry.recipe.id)
                            }
                            aria-label="Toggle details"
                          >
                            <ClipboardList className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleRecipe(entry.recipe)}
                            aria-label="Remove menu item"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {expanded === entry.recipe.id && (
                        <div className="mt-2.5 grid gap-2.5 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`wine-${entry.recipe.id}`} className="flex items-center gap-1.5 text-[11px]">
                              <Wine className="h-3 w-3" /> Wine Pairing & Selection
                            </Label>
                            <Textarea
                              id={`wine-${entry.recipe.id}`}
                              placeholder="Recommended pairings, glass pours, upsell notes..."
                              value={entry.wineSelection || ""}
                              onChange={(event) =>
                                updateRecipe(entry.recipe.id, {
                                  wineSelection: event.target.value,
                                })
                              }
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`sell-${entry.recipe.id}`} className="text-[11px]">
                              Server Selling Notes
                            </Label>
                            <Textarea
                              id={`sell-${entry.recipe.id}`}
                              placeholder="Talking points, ingredient sourcing, flavor highlights..."
                              value={entry.sellingNotes || ""}
                              onChange={(event) =>
                                updateRecipe(entry.recipe.id, {
                                  sellingNotes: event.target.value,
                                })
                              }
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`service-${entry.recipe.id}`} className="text-[11px]">
                              Service Instructions
                            </Label>
                            <Textarea
                              id={`service-${entry.recipe.id}`}
                              placeholder="Pass timing, finishing garnish, plating calls..."
                              value={entry.serviceInstructions || ""}
                              onChange={(event) =>
                                updateRecipe(entry.recipe.id, {
                                  serviceInstructions: event.target.value,
                                })
                              }
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="flex items-center gap-1.5 text-[11px]">
                              <Utensils className="h-3 w-3" /> Required Silverware
                            </Label>
                            <div className="grid max-h-28 grid-cols-2 gap-1.5 overflow-y-auto text-xs">
                              {silverwareOptions.map((item) => {
                                const checked = entry.silverwareRequired?.includes(item) ?? false;
                                return (
                                  <div key={item} className="flex items-center gap-1.5">
                                    <Checkbox
                                      id={`${entry.recipe.id}-${item}`}
                                      checked={checked}
                                      onCheckedChange={(state) => {
                                        const set = new Set(entry.silverwareRequired ?? []);
                                        if (state) {
                                          set.add(item);
                                        } else {
                                          set.delete(item);
                                        }
                                        updateRecipe(entry.recipe.id, {
                                          silverwareRequired: Array.from(set),
                                        });
                                      }}
                                    />
                                    <Label htmlFor={`${entry.recipe.id}-${item}`} className="text-[11px]">
                                      {item}
                                    </Label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="space-y-2 px-3 py-2.5">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium">Menu Library</span>
            <Input
              placeholder="Search menu items, tags, notes..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="h-8 w-full min-w-[200px] text-sm md:w-60"
            />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-3 pb-3 pt-0">
          {MENU_CATEGORIES.map((category) => {
            const items = categorizedMenu.buckets.get(category.key) ?? [];
            if (!items.length) return null;
            return (
              <div key={category.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                  <span>{category.label}</span>
                  <span>{items.length}</span>
                </div>
                <div className="space-y-1.5">
                  {items.map(({ recipe, menuName, menuPrice }) => {
                    const isSelected = selectedIds.has(recipe.id);
                    const checkboxId = `menu-item-${recipe.id}`;
                    return (
                      <div
                        key={recipe.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleRecipe(recipe)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleRecipe(recipe);
                          }
                        }}
                        className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[12px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 ${
                          isSelected
                            ? "border-primary/70 bg-primary/10"
                            : "border-muted bg-background/80 hover:border-foreground/40"
                        }`}
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={isSelected}
                          onCheckedChange={() => toggleRecipe(recipe)}
                          onClick={(event) => event.stopPropagation()}
                        />
                        <label htmlFor={checkboxId} className="flex w-full items-center gap-2">
                          <img
                            src={
                              recipe.imageDataUrls?.[0] ||
                              recipe.image ||
                              "https://cdn.builder.io/api/v1/image/assets%2Fplaceholder"
                            }
                            alt={recipe.title}
                            className="h-10 w-10 flex-shrink-0 rounded object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="truncate font-semibold">{menuName}</span>
                              {menuPrice && (
                                <span className="text-[11px] font-medium text-primary/80">
                                  {menuPrice}
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {recipe.description || "No description provided."}
                            </p>
                          </div>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {categorizedMenu.orphans.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
                <span>{OTHER_LABEL}</span>
                <span>{categorizedMenu.orphans.length}</span>
              </div>
              <div className="space-y-1.5">
                {categorizedMenu.orphans.map(({ recipe, menuName, menuPrice }) => {
                  const isSelected = selectedIds.has(recipe.id);
                  const checkboxId = `menu-item-${recipe.id}`;
                  return (
                    <div
                      key={recipe.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleRecipe(recipe)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          toggleRecipe(recipe);
                        }
                      }}
                      className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[12px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 ${
                        isSelected
                          ? "border-primary/70 bg-primary/10"
                          : "border-muted bg-background/80 hover:border-foreground/40"
                      }`}
                    >
                      <Checkbox
                        id={checkboxId}
                        checked={isSelected}
                        onCheckedChange={() => toggleRecipe(recipe)}
                        onClick={(event) => event.stopPropagation()}
                      />
                      <label htmlFor={checkboxId} className="flex w-full items-center gap-2">
                        <img
                          src={
                            recipe.imageDataUrls?.[0] ||
                            recipe.image ||
                            "https://cdn.builder.io/api/v1/image/assets%2Fplaceholder"
                          }
                          alt={recipe.title}
                          className="h-10 w-10 flex-shrink-0 rounded object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold">{menuName}</span>
                            {menuPrice && (
                              <span className="text-[11px] font-medium text-primary/80">
                                {menuPrice}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {recipe.description || "No description provided."}
                          </p>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {preparedMenu.length === 0 && (
            <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              No menu items match that search. Adjust filters or add new recipes first.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
