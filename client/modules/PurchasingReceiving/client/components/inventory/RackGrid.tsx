import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  InventoryItem,
  ParSuggestion,
  StorageBin,
  StorageRack,
} from "@shared/inventory";
interface RackGridProps {
  rack: StorageRack;
  bins: StorageBin[];
  itemsById: Map<string, InventoryItem>;
  parSuggestions?: Map<string, ParSuggestion>;
  onSelectBin?: (bin: StorageBin) => void;
  compact?: boolean;
}
const buildKey = (level: number, column: number) => `${level}:${column}`;
export function RackGrid({
  rack,
  bins,
  itemsById,
  parSuggestions,
  onSelectBin,
  compact,
}: RackGridProps) {
  const binMap = useMemo(() => {
    const map = new Map<string, StorageBin>();
    for (const bin of bins) {
      map.set(buildKey(bin.level, bin.column), bin);
    }
    return map;
  }, [bins]);
  const columnsStyle = useMemo(
    () => ({ gridTemplateColumns: `repeat(${rack.columns}, minmax(0, 1fr))` }),
    [rack.columns],
  );
  const levels = useMemo(
    () =>
      Array.from({ length: rack.levels }, (_, index) => rack.levels - index),
    [rack.levels],
  );
  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      {" "}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {" "}
        <div>
          {" "}
          Levels: {rack.levels} • Columns: {rack.columns}{" "}
        </div>{" "}
        <div className="flex items-center gap-2">
          {" "}
          <Badge variant="outline" className="uppercase tracking-wide">
            {rack.type}
          </Badge>{" "}
          {rack.notes ? (
            <span className="truncate text-xs">{rack.notes}</span>
          ) : null}{" "}
        </div>{" "}
      </div>{" "}
      <div
        className={cn("grid gap-2", compact && "gap-1 overflow-x-auto")}
        style={columnsStyle}
      >
        {" "}
        {levels.flatMap((level) =>
          Array.from({ length: rack.columns }, (_, columnIndex) => {
            const column = columnIndex + 1;
            const bin = binMap.get(buildKey(level, column));
            const item = bin?.itemId
              ? (itemsById.get(bin.itemId) ?? null)
              : null;
            const suggestion = bin?.itemId
              ? (parSuggestions?.get(bin.itemId) ?? null)
              : null;
            const glCode = item?.glCode ? item.glCode.slice(-4) : null;
            const highlight = suggestion
              ? Math.abs(suggestion.variancePct) >= 10
              : false;
            const empty = !bin || !item;
            return (
              <button
                key={`${level}-${column}`}
                type="button"
                onClick={() =>
                  bin && onSelectBin ? onSelectBin(bin) : undefined
                }
                className={cn(
                  "h-full min-h-[72px] rounded-lg border bg-card p-2 text-left text-xs transition hover:border-primary/60",
                  empty ? "border-dashed border-border" : "border-border",
                  highlight &&
                    "border-amber-400/80 shadow-[0_0_24px_rgba(251,191,36,0.25)]",
                  onSelectBin
                    ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    : "cursor-default",
                )}
                disabled={!onSelectBin}
              >
                {" "}
                <div className="flex items-center justify-between text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                  {" "}
                  <span>{bin?.label ?? `L${level}C${column}`}</span>{" "}
                  <span>
                    {" "}
                    L{level} / C{column}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="mt-1 text-[0.7rem] font-medium text-slate-100">
                  {" "}
                  {item ? (
                    <>
                      {" "}
                      <span className="text-primary">
                        {" "}
                        {glCode ? `GL ${glCode}` : "No GL"}{" "}
                      </span>{" "}
                      <span className="mx-1">•</span>{" "}
                      <span className="line-clamp-2 leading-tight">
                        {item.name}
                      </span>{" "}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Unassigned</span>
                  )}{" "}
                </div>{" "}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[0.65rem] text-muted-foreground">
                  {" "}
                  {bin?.parQty != null ? (
                    <Badge
                      variant="outline"
                      className="px-1 py-0 text-[0.65rem]"
                    >
                      {" "}
                      Par {bin.parQty}{" "}
                    </Badge>
                  ) : null}{" "}
                  {suggestion ? (
                    <Badge
                      variant="secondary"
                      className="px-1 py-0 text-[0.65rem]"
                    >
                      {" "}
                      AI: {suggestion.recommendedPar} (
                      {suggestion.variancePct >= 0 ? "+" : ""}{" "}
                      {suggestion.variancePct}% ){" "}
                    </Badge>
                  ) : null}{" "}
                  {bin?.notes ? (
                    <span className="line-clamp-2">{bin.notes}</span>
                  ) : null}{" "}
                </div>{" "}
              </button>
            );
          }),
        )}{" "}
      </div>{" "}
    </div>
  );
}
