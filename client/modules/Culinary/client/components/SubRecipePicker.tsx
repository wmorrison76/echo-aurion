import React, { useEffect, useMemo, useState } from "react";
import { Search, Layers } from "lucide-react";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type SubRecipeOption = {
  id: string;
  title: string;
  course?: string | null;
  cuisine?: string | null;
  tags?: string[] | null;
  cost?: number | null;
  currency?: string | null;
  yieldQty?: number | null;
  yieldUnit?: string | null;
};

type SubRecipePickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: SubRecipeOption[];
  onConfirm: (selected: SubRecipeOption[]) => void;
  isDarkMode: boolean;
  formatCurrency: (value: number | null | undefined, currency?: string | null) => string;
};

const SubRecipePicker: React.FC<SubRecipePickerProps> = ({
  open,
  onOpenChange,
  options,
  onConfirm,
  isDarkMode,
  formatCurrency,
}) => {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedIds(new Set());
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.trim().toLowerCase();
    return options.filter((option) => {
      const haystack = [
        option.title,
        option.course,
        option.cuisine,
        ...(option.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [options, search]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (!selectedIds.size) return;
    const selected = options.filter((option) => selectedIds.has(option.id));
    onConfirm(selected);
    onOpenChange(false);
  };

  const handleConfirmSingle = (option: SubRecipeOption) => {
    onConfirm([option]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-3xl space-y-4 border-0 bg-white/95 p-6 shadow-xl dark:bg-slate-950/95",
          isDarkMode
            ? "border border-[#c8a97e]/15 text-white/80"
            : "border border-slate-200 text-slate-900",
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold uppercase tracking-[0.28em]">
            <Layers className="h-4 w-4" aria-hidden />
            Add Sub Recipe
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search recipes by name, tag, course, or cuisine"
              className={cn(
                "w-full rounded-xl border px-3 py-2 pr-9 text-sm",
                isDarkMode
                  ? "border-[#c8a97e]/25 bg-slate-950/60 text-white/80 placeholder:text-[#c8a97e]/50"
                  : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400",
              )}
            />
            <Search
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          </div>
          <div
            className={cn(
              "text-xs uppercase tracking-[0.28em]",
              isDarkMode ? "text-[#c8a97e]/80/70" : "text-slate-500",
            )}
          >
            {filtered.length} recipes available
          </div>
        </div>

        <ScrollArea className="max-h-[360px] overflow-hidden rounded-2xl border border-dashed">
          <div
            className={cn(
              "divide-y",
              isDarkMode
                ? "divide-amber-500/15 bg-slate-950/40"
                : "divide-slate-200 bg-white/70",
            )}
          >
            {filtered.length === 0 ? (
              <div
                className={cn(
                  "flex h-40 items-center justify-center text-sm",
                  isDarkMode ? "text-[#c8a97e]/80/70" : "text-slate-500",
                )}
              >
                No recipes match your search.
              </div>
            ) : (
              filtered.map((option) => {
                const isSelected = selectedIds.has(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleSelection(option.id)}
                    onDoubleClick={() => handleConfirmSingle(option)}
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition",
                      isSelected
                        ? isDarkMode
                          ? "border-l-2 border-[#c8a97e]/80 bg-[#c8a97e]/08"
                          : "border-l-2 border-sky-400 bg-sky-100/70"
                        : isDarkMode
                          ? "hover:bg-amber-500/5"
                          : "hover:bg-slate-100/70",
                    )}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(option.id)}
                      onClick={(event) => event.stopPropagation()}
                      className={cn(
                        "mt-1 h-4 w-4",
                        isDarkMode
                          ? "border-[#c8a97e]/50 data-[state=checked]:bg-[#c8a97e]"
                          : "border-slate-300 data-[state=checked]:bg-slate-900",
                      )}
                    />
                    <div className="flex flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold tracking-[0.08em]">
                          {option.title}
                        </span>
                        {option.course ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "uppercase tracking-[0.25em]",
                              isDarkMode
                                ? "border-[#c8a97e]/25 text-[#c8a97e]/80/80"
                                : "border-slate-300 text-slate-600",
                            )}
                          >
                            {option.course}
                          </Badge>
                        ) : null}
                        {option.cuisine ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "uppercase tracking-[0.25em]",
                              isDarkMode
                                ? "border-[#c8a97e]/25 text-[#c8a97e]/80/80"
                                : "border-slate-300 text-slate-600",
                            )}
                          >
                            {option.cuisine}
                          </Badge>
                        ) : null}
                      </div>
                      {option.tags && option.tags.length > 0 ? (
                        <div
                          className={cn(
                            "flex flex-wrap gap-1 text-[11px] uppercase tracking-[0.28em]",
                            isDarkMode ? "text-[#c8a97e]/80/70" : "text-slate-400",
                          )}
                        >
                          {option.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      ) : null}
                      {(option.yieldQty || option.yieldUnit) && (
                        <div
                          className={cn(
                            "text-[11px] uppercase tracking-[0.28em]",
                            isDarkMode ? "text-[#c8a97e]/80/65" : "text-slate-400",
                          )}
                        >
                          Yield: {option.yieldQty ?? "—"} {option.yieldUnit ?? ""}
                        </div>
                      )}
                    </div>
                    <div
                      className={cn(
                        "whitespace-nowrap text-sm font-semibold",
                        isDarkMode ? "text-[#c8a97e]/80" : "text-slate-700",
                      )}
                    >
                      {formatCurrency(option.cost, option.currency)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className={cn(
              "mt-2 sm:mt-0",
              isDarkMode ? "text-[#c8a97e]/80 hover:bg-[#c8a97e]/08" : "text-slate-600",
            )}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedIds.size}
            className={cn(
              isDarkMode
                ? "bg-amber-500 text-slate-950 hover:bg-[#c8a97e]"
                : "bg-slate-900 text-white hover:bg-slate-800",
            )}
          >
            Add {selectedIds.size ? `(${selectedIds.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubRecipePicker;
