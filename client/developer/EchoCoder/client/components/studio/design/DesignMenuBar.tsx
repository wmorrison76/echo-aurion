import React from "react";
import { Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { designLibrary, type LibraryItem } from "./library";

export interface DesignMenuBarProps {
  onAdd: (type: string, props?: Record<string, any>) => void;
}

export function DesignMenuBar({ onAdd }: DesignMenuBarProps) {
  const [query, setQuery] = React.useState("");
  const [activeGroup, setActiveGroup] = React.useState<string | null>(
    designLibrary[0]?.label ?? null,
  );
  const normalized = query.trim().toLowerCase();

  const filteredGroups = React.useMemo(() => {
    if (!normalized) return designLibrary;
    return designLibrary
      .map((group) => {
        const items = group.items.filter((item) => {
          const haystack = `${item.name} ${item.type}`.toLowerCase();
          return haystack.includes(normalized);
        });
        return { ...group, items };
      })
      .filter((group) => group.items.length > 0);
  }, [normalized]);

  const hasSearch = normalized.length > 0;
  const groupsToRender = hasSearch ? filteredGroups : designLibrary;
  const showEmpty = hasSearch && filteredGroups.length === 0;

  React.useEffect(() => {
    if (hasSearch) {
      setActiveGroup(null);
      return;
    }
    if (!groupsToRender.some((group) => group.label === activeGroup)) {
      setActiveGroup(groupsToRender[0]?.label ?? null);
    }
  }, [hasSearch, groupsToRender, activeGroup]);

  const handleAdd = React.useCallback(
    (item: LibraryItem) => {
      onAdd(item.type, item.props ?? {});
    },
    [onAdd],
  );

  const handleGroupClick = React.useCallback((label: string) => {
    setActiveGroup((prev) => (prev === label ? null : label));
  }, []);

  const activeGroupDefinition =
    !hasSearch && activeGroup
      ? (groupsToRender.find((group) => group.label === activeGroup) ?? null)
      : null;

  const renderItemButtons = React.useCallback(
    (items: LibraryItem[]) => (
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <button
            key={`${item.type}-${item.name}`}
            type="button"
            onClick={() => handleAdd(item)}
            className="relative z-[1000] flex flex-col items-start gap-1 rounded-md border border-border/60 bg-background/80 px-3 py-2 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="font-medium text-foreground">{item.name}</span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {item.type}
            </span>
          </button>
        ))}
      </div>
    ),
    [handleAdd],
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search components..."
          className="h-9 pl-8 text-xs"
        />
      </div>

      {showEmpty ? (
        <div className="rounded-md border border-dashed border-border/60 bg-background/60 px-3 py-4 text-center text-xs text-muted-foreground">
          No components found. Try a different search.
        </div>
      ) : null}

      {!showEmpty && (
        <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
          {!hasSearch ? (
            <>
              <div className="grid gap-2 sm:grid-cols-2">
                {groupsToRender.map((group) => (
                  <button
                    key={group.label}
                    type="button"
                    onClick={() => handleGroupClick(group.label)}
                    className={cn(
                      "relative z-[1000] flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium transition",
                      activeGroup === group.label
                        ? "border-primary/40 bg-primary/10 text-foreground shadow-sm"
                        : "border-border/60 bg-background/80 hover:border-primary/30 hover:bg-primary/5",
                    )}
                  >
                    <span className="truncate">{group.label}</span>
                    <Badge
                      variant="secondary"
                      className="ml-auto text-[10px] tracking-wide"
                    >
                      {group.items.length}
                    </Badge>
                  </button>
                ))}
              </div>
              {activeGroupDefinition ? (
                <div className="rounded-lg border border-primary/25 bg-background/85 p-3 shadow-inner">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      {activeGroupDefinition.label}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] tracking-wide"
                    >
                      {activeGroupDefinition.items.length} items
                    </Badge>
                  </div>
                  <div className="mt-3">
                    {renderItemButtons(activeGroupDefinition.items)}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="space-y-3">
              {groupsToRender.map((group) => (
                <div
                  key={group.label}
                  className="rounded-lg border border-border/60 bg-background/75 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      {group.label}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[10px] tracking-wide"
                    >
                      {group.items.length}
                    </Badge>
                  </div>
                  {renderItemButtons(group.items)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DesignMenuBar;
