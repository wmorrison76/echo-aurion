import React, { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAppData } from "@/context/AppDataContext";
import { useTranslation } from "@/context/LanguageContext";
import { buildStationChecklist } from "@/lib/station-checklist";
import { cn } from "@/lib/utils";

const METRIC_CARD_CLASS =
  "rounded-xl border border-white/60 bg-white/70 px-4 py-3 shadow-sm dark:border-[#c8a97e]/30 dark:bg-slate-900/60";

const MAX_AGGREGATE_BADGES = 6;

export default function LineChecklistPanel() {
  const { collections, recipes } = useAppData();
  const { t } = useTranslation();
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("");
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

  const sortedCollections = useMemo(() => {
    return [...collections].sort((a, b) => {
      const aTime = Date.parse(a.updatedAt) || 0;
      const bTime = Date.parse(b.updatedAt) || 0;
      return bTime - aTime;
    });
  }, [collections]);

  useEffect(() => {
    if (!sortedCollections.length) {
      if (selectedCollectionId) {
        setSelectedCollectionId("");
      }
      return;
    }
    if (!selectedCollectionId || !sortedCollections.some((collection) => collection.id === selectedCollectionId)) {
      setSelectedCollectionId(sortedCollections[0]!.id);
    }
  }, [selectedCollectionId, sortedCollections]);

  useEffect(() => {
    setCompletedItems(new Set());
  }, [selectedCollectionId]);

  const activeCollection = useMemo(
    () => sortedCollections.find((collection) => collection.id === selectedCollectionId),
    [sortedCollections, selectedCollectionId],
  );

  const checklist = useMemo(() => {
    if (!activeCollection) return null;
    return buildStationChecklist(activeCollection, recipes);
  }, [activeCollection, recipes]);

  const totalItems = checklist?.summary.totalItems ?? 0;
  const completedCount = checklist
    ? Array.from(completedItems).filter((itemId) => checklist.stations.some((station) =>
        station.recipes.some((recipe) => recipe.items.some((item) => item.id === itemId)),
      )).length
    : 0;

  const handleToggleItem = useCallback((itemId: string, next: boolean) => {
    setCompletedItems((prev) => {
      const nextSet = new Set(prev);
      if (next) {
        nextSet.add(itemId);
      } else {
        nextSet.delete(itemId);
      }
      return nextSet;
    });
  }, []);

  const handleMarkAll = useCallback(() => {
    if (!checklist) return;
    const nextSet = new Set<string>();
    checklist.stations.forEach((station) => {
      station.recipes.forEach((recipe) => {
        recipe.items.forEach((item) => {
          nextSet.add(item.id);
        });
      });
    });
    setCompletedItems(nextSet);
  }, [checklist]);

  const handleClearAll = useCallback(() => {
    setCompletedItems(new Set());
  }, []);

  const formatUpdatedLabel = useCallback(
    (updatedAt: string) => {
      const timestamp = Date.parse(updatedAt);
      if (!Number.isFinite(timestamp)) return t("purchRec.checklist.updatedUnknown", "Updated just now");
      return t("purchRec.checklist.updated", "Updated {relative}", {
        relative: formatDistanceToNow(timestamp, { addSuffix: true }),
      });
    },
    [t],
  );

  return (
    <Card className="backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <ClipboardList className="h-5 w-5" aria-hidden />
          {t("purchRec.checklist.title", "Line Checklist")}
        </CardTitle>
        <CardDescription>
          {t(
            "purchRec.checklist.description",
            "Generate a service line checklist from your latest menu collections, grouped by station.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1">
            <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId} disabled={!sortedCollections.length}>
              <SelectTrigger className="w-full min-w-[220px] lg:w-[320px]">
                <SelectValue placeholder={t("purchRec.checklist.select", "Select a collection")} />
              </SelectTrigger>
              <SelectContent>
                {sortedCollections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{collection.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(Date.parse(collection.updatedAt) || Date.now(), { addSuffix: true })}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeCollection ? (
              <span className="text-xs text-muted-foreground">
                {formatUpdatedLabel(activeCollection.updatedAt)}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAll}
              disabled={!checklist || completedCount >= totalItems || totalItems === 0}
            >
              {t("purchRec.checklist.markAll", "Mark all complete")}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearAll} disabled={!completedItems.size}>
              {t("purchRec.checklist.clear", "Reset")}
            </Button>
          </div>
        </div>

        {!sortedCollections.length ? (
          <div className="rounded-xl border border-dashed border-white/60 bg-white/60 p-6 text-center text-sm text-muted-foreground dark:border-[#c8a97e]/30 dark:bg-slate-900/60">
            {t(
              "purchRec.checklist.empty",
              "Create a menu collection in Recipe Search to generate a service checklist.",
            )}
          </div>
        ) : null}

        {checklist ? (
          <>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              <div className={METRIC_CARD_CLASS}>
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {t("purchRec.checklist.metrics.stations", "Stations")}
                </div>
                <div className="text-xl font-semibold text-slate-800 dark:text-white/80">
                  {checklist.summary.totalStations.toLocaleString()}
                </div>
              </div>
              <div className={METRIC_CARD_CLASS}>
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {t("purchRec.checklist.metrics.recipes", "Recipes")}
                </div>
                <div className="text-xl font-semibold text-slate-800 dark:text-white/80">
                  {checklist.summary.totalRecipes.toLocaleString()}
                </div>
              </div>
              <div className={METRIC_CARD_CLASS}>
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {t("purchRec.checklist.metrics.items", "Checklist Items")}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-semibold text-slate-800 dark:text-white/80">
                    {totalItems.toLocaleString()}
                  </span>
                  {totalItems > 0 ? (
                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {t("purchRec.checklist.metrics.completed", "{done}/{total} ready", {
                        done: completedCount.toLocaleString(),
                        total: totalItems.toLocaleString(),
                      })}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className={METRIC_CARD_CLASS}>
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  {t("purchRec.checklist.metrics.allergens", "Allergens flagged")}
                </div>
                <div className="text-sm font-medium text-slate-800 dark:text-white/80">
                  {checklist.summary.allergens.length
                    ? checklist.summary.allergens.join(", ")
                    : t("purchRec.checklist.allergens.none", "None flagged")}
                </div>
              </div>
            </div>

            {checklist.aggregates.length ? (
              <div className="flex flex-wrap gap-2">
                {checklist.aggregates.slice(0, MAX_AGGREGATE_BADGES).map((aggregate) => (
                  <Badge key={aggregate.ingredient} variant="outline" className="gap-1 font-medium">
                    <span>{aggregate.ingredient}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">×{aggregate.occurrences}</span>
                  </Badge>
                ))}
              </div>
            ) : null}

            {checklist.missing.length ? (
              <div className="rounded-xl border border-amber-400/60 bg-amber-50/80 p-4 text-xs text-amber-800 dark:border-amber-300/40 dark:bg-amber-950/60 dark:text-amber-100">
                <div className="font-semibold uppercase tracking-[0.2em]">
                  {t("purchRec.checklist.missing.title", "Recipes needing setup")}
                </div>
                <ul className="mt-2 space-y-1">
                  {checklist.missing.map((entry) => (
                    <li key={entry.recipeId}>
                      <span className="font-medium">{entry.recipeName}</span>
                      <span className="text-muted-foreground"> — </span>
                      {entry.reason === "missingServerNotes"
                        ? t(
                            "purchRec.checklist.missing.serverNotes",
                            "Add server notes metadata to enable station mapping.",
                          )
                        : t(
                            "purchRec.checklist.missing.ingredients",
                            "Add structured ingredients to include this recipe.",
                          )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <ScrollArea className="max-h-[520px] pr-3">
              <div className="space-y-4">
                {checklist.stations.map((station) => (
                  <div
                    key={station.id}
                    className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm transition hover:shadow-md dark:border-[#c8a97e]/30 dark:bg-slate-900/60"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-white/80">
                          {station.name}
                        </div>
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {t("purchRec.checklist.station.meta", "{recipes} recipes · {items} items", {
                            recipes: station.recipes.length,
                            items: station.totalItems,
                          })}
                        </div>
                      </div>
                      <Badge variant="outline" className="font-mono text-[11px] uppercase">
                        {t("purchRec.checklist.station.itemsBadge", "{count} items", {
                          count: station.totalItems,
                        })}
                      </Badge>
                    </div>
                    <Separator className="my-3" />
                    <div className="space-y-4">
                      {station.recipes.map((recipe) => (
                        <div key={`${station.id}::${recipe.id}`} className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-slate-800 dark:text-white/80">
                                {recipe.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {recipe.course
                                  ? t("purchRec.checklist.recipe.meta", "{course} · {portions}", {
                                      course: recipe.course,
                                      portions: recipe.portions
                                        ? `${recipe.portions.count} ${recipe.portions.unit ?? t("purchRec.checklist.recipe.portions", "portions")}`
                                        : t("purchRec.checklist.recipe.noPortions", "Portion count pending"),
                                    })
                                  : recipe.portions
                                    ? t("purchRec.checklist.recipe.portionOnly", "{count} {unit}", {
                                        count: recipe.portions.count,
                                        unit: recipe.portions.unit ?? t(
                                          "purchRec.checklist.recipe.portions",
                                          "portions",
                                        ),
                                      })
                                    : t("purchRec.checklist.recipe.metaFallback", "Station prep details")}
                              </div>
                            </div>
                            {recipe.allergens.length ? (
                              <Badge variant="secondary" className="whitespace-nowrap text-xs uppercase">
                                {t("purchRec.checklist.recipe.allergens", "Allergens: {list}", {
                                  list: recipe.allergens.join(", "),
                                })}
                              </Badge>
                            ) : null}
                          </div>
                          <ul className="space-y-2">
                            {recipe.items.map((item) => {
                              const checked = completedItems.has(item.id);
                              const details: string[] = [];
                              if (item.quantity && item.unit) {
                                details.push(`${item.quantity} ${item.unit}`);
                              } else if (item.quantity) {
                                details.push(item.quantity);
                              } else if (item.unit) {
                                details.push(item.unit);
                              }
                              if (item.prep) {
                                details.push(item.prep);
                              }
                              if (item.yieldText) {
                                details.push(t("purchRec.checklist.item.yield", "Yield {value}", {
                                  value: item.yieldText,
                                }));
                              }
                              return (
                                <li
                                  key={item.id}
                                  className={cn(
                                    "flex items-start gap-3 rounded-xl border border-white/60 bg-white/70 p-3 text-sm shadow-sm transition hover:border-primary/50 hover:bg-primary/5 dark:border-[#c8a97e]/30 dark:bg-slate-900/60 dark:hover:border-[#c8a97e]/60 dark:hover:bg-[#c8a97e]-900/40",
                                    checked &&
                                      "border-primary/60 bg-primary/10 dark:border-[#c8a97e]/60 dark:bg-[#c8a97e]/30/50",
                                  )}
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(value) =>
                                      handleToggleItem(item.id, value === true || value === "indeterminate")
                                    }
                                    aria-label={t("purchRec.checklist.item.aria", "Toggle {item}", {
                                      item: item.ingredient,
                                    })}
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium text-slate-800 dark:text-amber-50">
                                      {item.ingredient}
                                    </div>
                                    {details.length ? (
                                      <div className="text-xs text-muted-foreground">
                                        {details.join(" • ")}
                                      </div>
                                    ) : null}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
