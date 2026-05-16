import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DishComponentRow,
  RecipeSummary,
  formatCurrencyValue,
  parseQuantityValue,
} from "../utils";
import { PlusCircle, Search, Link, Trash2 } from "lucide-react";

const useRecipeOptions = (summaries: Map<string, RecipeSummary>) =>
  useMemo(
    () =>
      Array.from(summaries.values()).map((summary) => ({
        id: summary.id,
        title: summary.menuName || summary.title,
        cuisine: summary.cuisine,
        course: summary.course,
        cost: summary.costPerPortion,
        currency: summary.currency,
        tags: summary.tags,
      })),
    [summaries],
  );

type DishComponentsTableProps = {
  rows: DishComponentRow[];
  recipeSummaries: Map<string, RecipeSummary>;
  onRowChange: (rowId: string, patch: Partial<DishComponentRow>) => void;
  onAssignRecipe: (rowId: string, recipeId: string | null) => void;
  onAddRow: () => void;
  onRemoveRow: (rowId: string) => void;
  onFocusRow: (rowId: string) => void;
  className?: string;
};

const DishComponentsTable: React.FC<DishComponentsTableProps> = ({
  rows,
  recipeSummaries,
  onRowChange,
  onAssignRecipe,
  onAddRow,
  onRemoveRow,
  onFocusRow,
  className,
}) => {
  const options = useRecipeOptions(recipeSummaries);
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  const handleSelect = (rowId: string, recipeId: string) => {
    onAssignRecipe(rowId, recipeId);
    setOpenRowId(null);
    onFocusRow(rowId);
  };

  return (
    <Card className={cn("border-primary/30 bg-background/95 shadow-lg", className)}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase tracking-[0.35em] text-muted-foreground">
          Dish Components
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-[96px_minmax(0,1.2fr)_minmax(0,1.2fr)_auto] gap-3 rounded-xl border border-primary/30 bg-muted/20 p-3 text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          <div>Qty</div>
          <div>Component</div>
          <div>Notes</div>
          <div className="text-right">Cost</div>
        </div>
        <div className="space-y-3">
          {rows.map((row) => {
            const summary = row.recipeId
              ? recipeSummaries.get(row.recipeId)
              : null;
            const qtyValue = parseQuantityValue(row.quantity || "1");
            const rowCost =
              summary?.costPerPortion != null
                ? summary.costPerPortion * qtyValue
                : null;
            const currency = summary?.currency ?? "USD";
            return (
              <div
                key={row.id}
                className="grid grid-cols-[96px_minmax(0,1.2fr)_minmax(0,1.2fr)_auto] gap-3 rounded-xl border border-primary/20 bg-background/70 p-3 shadow-sm backdrop-blur"
              >
                <Input
                  value={row.quantity}
                  onChange={(event) =>
                    onRowChange(row.id, { quantity: event.target.value })
                  }
                  placeholder="1 ea"
                  className="h-10 rounded-lg border-primary/30"
                  enableSuggestions={false}
                />
                <div className="space-y-2">
                  <Popover
                    open={openRowId === row.id}
                    onOpenChange={(open) => setOpenRowId(open ? row.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="h-10 w-full justify-between rounded-lg border-primary/30"
                      >
                        <span className="truncate text-left text-sm font-medium">
                          {row.recipeId
                            ? row.label || summary?.menuName || summary?.title
                            : row.label || "Select recipe"}
                        </span>
                        <Search className="h-4 w-4 opacity-70" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[360px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search recipes..." />
                        <CommandList>
                          <CommandEmpty>No recipes found.</CommandEmpty>
                          <CommandGroup>
                            <ScrollArea className="max-h-72">
                              {options.map((option) => (
                                <CommandItem
                                  key={option.id}
                                  onSelect={() =>
                                    handleSelect(row.id, option.id)
                                  }
                                >
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                      <span>{option.title}</span>
                                      {option.course ? (
                                        <Badge
                                          variant="outline"
                                          className="px-1 text-[10px] uppercase tracking-[0.28em]"
                                        >
                                          {option.course}
                                        </Badge>
                                      ) : null}
                                      {option.cuisine ? (
                                        <Badge
                                          variant="outline"
                                          className="px-1 text-[10px] uppercase tracking-[0.28em]"
                                        >
                                          {option.cuisine}
                                        </Badge>
                                      ) : null}
                                    </div>
                                    <div className="flex flex-wrap gap-1 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                                      {option.tags.slice(0, 4).map((tag) => (
                                        <span key={tag}>{tag}</span>
                                      ))}
                                    </div>
                                    {option.cost != null ? (
                                      <span className="text-xs text-muted-foreground">
                                        Cost per portion:{" "}
                                        {formatCurrencyValue(
                                          option.cost,
                                          option.currency,
                                        )}
                                      </span>
                                    ) : null}
                                  </div>
                                </CommandItem>
                              ))}
                            </ScrollArea>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Input
                    value={row.label}
                    onChange={(event) =>
                      onRowChange(row.id, { label: event.target.value })
                    }
                    placeholder="Display name"
                    className="h-10 rounded-lg border-primary/20"
                    suggestionScope={["recipes", "collections", "tags"]}
                    minSuggestionQueryLength={1}
                  />
                </div>
                <Textarea
                  value={row.notes}
                  onChange={(event) =>
                    onRowChange(row.id, { notes: event.target.value })
                  }
                  placeholder="Prep, plating, mise notes"
                  className="h-24 rounded-lg border-primary/20"
                />
                <div className="flex flex-col items-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onFocusRow(row.id)}
                    className="h-9 w-9 rounded-full"
                    title="Preview recipe"
                  >
                    <Link className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveRow(row.id)}
                    className="h-9 w-9 rounded-full text-destructive"
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <div className="text-right text-sm font-semibold">
                    {rowCost != null
                      ? formatCurrencyValue(rowCost, currency)
                      : "—"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddRow}
            className="rounded-full border-primary/40"
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Add component
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DishComponentsTable;
