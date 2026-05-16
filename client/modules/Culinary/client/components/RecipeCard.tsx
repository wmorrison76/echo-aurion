import React, { useState, useMemo } from "react";
import {
  Star,
  Pencil,
  RotateCcw,
  Trash2,
  ExternalLink,
  DollarSign,
  X,
} from "lucide-react";
import { useTranslation } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { ResponsiveImage } from "@/components/ResponsiveImage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { useAppData } from "@/context/AppDataContext";
import { resolveAllergenTags, type AllergenTagDef } from "@/lib/taxonomy";

export function RecipeCard({
  r,
  onPreview,
  onFav,
  onRate,
  onTrash,
  inTrash,
  onDestroy,
  selectMode,
  selected,
  onToggleSelect,
  onUpdateTags,
  onToggleGlobal,
}: {
  r: any; // Type from useAppData
  onPreview: () => void;
  onFav: () => void;
  onRate: (n: number) => void;
  onTrash: () => void;
  inTrash?: boolean;
  onDestroy?: () => void;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onUpdateTags?: (tags: string[]) => void;
  onToggleGlobal?: (recipeId: string, isGlobal: boolean) => void;
}) {
  const { t } = useTranslation();
  const cover = r.imageDataUrls?.[0] ?? r.image ?? undefined;
  const stars = Array.from({ length: 5 }, (_, i) => i < (r.rating || 0));
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [categoryInput, setCategoryInput] = useState("");

  // Calculate recipe cost from extra data if available
  const recipeCost = (() => {
    try {
      const serverNotes = r.extra?.serverNotes as any;
      if (serverNotes?.totals?.fullRecipeCost) {
        return serverNotes.totals.fullRecipeCost;
      }
    } catch {}
    return null;
  })();

  const portionCost = (() => {
    if (!recipeCost) return null;
    try {
      const serverNotes = r.extra?.serverNotes as any;
      const portionCount = serverNotes?.portionCount;
      if (portionCount) {
        return recipeCost / portionCount;
      }
    } catch {}
    return null;
  })();

  // Gather allergen + diet tags from recipe metadata
  const allergenDietTags: AllergenTagDef[] = useMemo(() => {
    const raw: string[] = [];
    const extra = r.extra as any;
    if (Array.isArray(extra?.allergens)) raw.push(...extra.allergens);
    if (Array.isArray(extra?.taxonomy?.allergens)) raw.push(...extra.taxonomy.allergens);
    if (Array.isArray(extra?.taxonomy?.diets)) raw.push(...extra.taxonomy.diets);
    return resolveAllergenTags(raw);
  }, [r.extra]);

  return (
    <div
      className={cn(
        "rounded-xl border bg-white dark:bg-zinc-900 shadow-sm overflow-hidden glow transition-colors",
        selectMode && selected
          ? "border-primary ring-2 ring-primary/40 bg-primary/5 dark:bg-primary/10"
          : undefined,
      )}
      data-echo-key="card:recipes:result"
    >
      <div className="grid grid-cols-[90px_1fr] gap-2 p-2 items-start">
        <div className="relative h-[85px] w-[85px] shrink-0">
          {cover ? (
            <ResponsiveImage
              src={cover}
              alt={r.title}
              width={85}
              height={85}
              aspectRatio="1/1"
              blurhash={r.blurhash}
              className="rounded"
              objectFit="cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded bg-muted text-muted-foreground">
              No Image
            </div>
          )}
          {selectMode && (
            <button
              type="button"
              aria-pressed={selected}
              onClick={(event) => {
                event.preventDefault();
                onToggleSelect?.();
              }}
              className={cn(
                "absolute left-2 top-2 rounded-full px-3 py-1 text-xs font-semibold shadow focus-visible:outline-none focus-visible:ring",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-background/90 text-foreground hover:bg-primary hover:text-primary-foreground",
              )}
            >
              {selected ? t("recipeSearch.selected") : t("recipeSearch.select")}
            </button>
          )}
        </div>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="flex items-start justify-between gap-1">
            <h2 className="m-0 text-sm font-semibold line-clamp-1">
              {r.title}
            </h2>
            <div className="flex items-center gap-1">
              <button
                className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                  r.isGlobal
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
                onClick={() => onToggleGlobal?.(r.id, !r.isGlobal)}
                title={
                  r.isGlobal ? "Click to make private" : "Click to make global"
                }
              >
                {r.isGlobal ? "Global" : "Private"}
              </button>
              <button
                className={`shrink-0 p-1 rounded ${r.favorite ? "text-yellow-500" : "text-muted-foreground"} hover:bg-black/5`}
                onClick={onFav}
                aria-label="Favorite"
              >
                <Star className={r.favorite ? "fill-current" : ""} size={16} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {stars.map((on, i) => (
              <button
                key={i}
                className={`p-0.5 ${on ? "text-yellow-500" : "text-muted-foreground"}`}
                onClick={() => onRate(i + 1)}
                aria-label={`rate ${i + 1}`}
              >
                ★
              </button>
            ))}
          </div>
          <div className="flex items-center flex-wrap gap-2">
            {r.tags?.length ? (
              <p className="m-0 text-xs text-muted-foreground flex-1">
                {r.tags.slice(0, 5).join(" · ")}
              </p>
            ) : (
              <p className="m-0 text-xs text-muted-foreground italic">
                No categories
              </p>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-5 px-1.5 text-xs"
              onClick={() => setShowCategoryDialog(true)}
              title="Edit categories"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
          <Dialog
            open={showCategoryDialog}
            onOpenChange={setShowCategoryDialog}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Edit Categories for {r.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Add category:</label>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={categoryInput}
                      onChange={(e) => setCategoryInput(e.target.value)}
                      placeholder="e.g., Soup, Appetizer"
                      className="flex-1 rounded-md border bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-ring text-sm"
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && categoryInput.trim()) {
                          const newTags = [
                            ...(r.tags || []),
                            categoryInput.trim(),
                          ];
                          onUpdateTags?.(Array.from(new Set(newTags)));
                          setCategoryInput("");
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        if (categoryInput.trim()) {
                          const newTags = [
                            ...(r.tags || []),
                            categoryInput.trim(),
                          ];
                          onUpdateTags?.(Array.from(new Set(newTags)));
                          setCategoryInput("");
                        }
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Current categories:
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {r.tags?.length ? (
                      r.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => {
                            onUpdateTags?.(
                              (r.tags || []).filter((t) => t !== tag),
                            );
                          }}
                        >
                          {tag}
                          <X className="h-3 w-3 ml-1" />
                        </Badge>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        No categories assigned
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Allergen & Diet Tags */}
          {allergenDietTags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1" data-testid="recipe-card-allergen-tags">
              {allergenDietTags.map((tag) => (
                <span
                  key={tag.slug}
                  className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide"
                  style={{ backgroundColor: tag.color, color: tag.textColor }}
                  title={tag.label}
                  data-testid={`allergen-tag-${tag.slug}`}
                >
                  ({tag.code}) {tag.label}
                </span>
              ))}
            </div>
          )}

          {/* Cost Display Badges */}
          {(recipeCost || portionCost) && (
            <div className="mt-2 flex flex-wrap gap-2 items-center">
              {portionCost && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <DollarSign className="h-2.5 w-2.5" />$
                  {portionCost.toFixed(2)}/portion
                </Badge>
              )}
              {recipeCost && !portionCost && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <DollarSign className="h-2.5 w-2.5" />${recipeCost.toFixed(2)}{" "}
                  total
                </Badge>
              )}
            </div>
          )}

          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="secondary" onClick={onPreview}>
              Preview
            </Button>
            {inTrash ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onTrash}
                  title={t("recipeSearch.restore")}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                {onDestroy && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onDestroy}
                    title={t("recipeSearch.deleteForever")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={onTrash}
                title="Move to trash"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              asChild
              data-echo-key="cta:recipes:open"
            >
              <a href={`/modules/Culinary/recipe/${r.id}`}>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
