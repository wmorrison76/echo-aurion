import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2 } from "lucide-react";
import type { Menu } from "@shared/menu-types";

type EventMenuPanelProps = {
  selectedMenu: Menu | null;
  selectedItems: string[];
  onToggleItem: (itemId: string) => void;
  onClearMenu: () => void;
};

type SelectedItemSummary = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  allergens?: string[];
  dietaryInfo?: string[];
  sectionName: string;
};

const buildSelectedItems = (
  menu: Menu | null,
  selectedItems: string[],
): SelectedItemSummary[] => {
  if (!menu) return [];
  const selectedSet = new Set(selectedItems);
  const summaries: SelectedItemSummary[] = [];
  menu.sections.forEach((section) => {
    section.items.forEach((item) => {
      if (!selectedSet.has(item.id)) return;
      summaries.push({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        allergens: item.allergens,
        dietaryInfo: item.dietaryInfo,
        sectionName: section.name,
      });
    });
  });
  return summaries;
};

const downloadJson = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const EventMenuPanel: React.FC<EventMenuPanelProps> = ({
  selectedMenu,
  selectedItems,
  onToggleItem,
  onClearMenu,
}) => {
  const selectedSummaries = useMemo(
    () => buildSelectedItems(selectedMenu, selectedItems),
    [selectedMenu, selectedItems],
  );

  const totalPrice = useMemo(() => {
    return selectedSummaries.reduce((sum, item) => sum + (item.price ?? 0), 0);
  }, [selectedSummaries]);

  const handleExportPack = () => {
    if (!selectedMenu) return;
    const pack = {
      id: `menu-pack-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      menu: {
        id: selectedMenu.id,
        name: selectedMenu.name,
        type: selectedMenu.type,
        outlet: selectedMenu.outlet ?? null,
        effectiveDate: selectedMenu.effectiveDate ?? null,
      },
      summary: {
        selectedItemCount: selectedItems.length,
        totalPricePerGuest: Number(totalPrice.toFixed(2)),
        currency: "USD",
      },
      items: selectedSummaries,
    };
    downloadJson(`${selectedMenu.name}-event-pack.json`, pack);
  };

  return (
    <Card className="border border-border/60 bg-background/80">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Event Menu</CardTitle>
          <p className="text-xs text-muted-foreground">
            Curate items and export menu packs for BEO workflows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportPack}
            disabled={!selectedMenu || selectedItems.length === 0}
          >
            Export pack
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearMenu}
            disabled={!selectedMenu && selectedItems.length === 0}
          >
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!selectedMenu ? (
          <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
            Select a menu to start building an event pack.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              <Badge variant="outline">{selectedMenu.name}</Badge>
              <Badge variant="outline">{selectedItems.length} items</Badge>
              <Badge variant="outline">
                ${totalPrice.toFixed(2)} per guest
              </Badge>
            </div>
            <ScrollArea className="h-[360px] pr-2">
              <div className="space-y-3">
                {selectedSummaries.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                    Add items from the menu library to populate the pack.
                  </div>
                ) : (
                  selectedSummaries.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-background/70 px-3 py-2"
                    >
                      <div>
                        <div className="text-sm font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.sectionName}
                        </div>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.dietaryInfo?.map((diet) => (
                            <Badge
                              key={diet}
                              variant="secondary"
                              className="text-[10px]"
                            >
                              {diet}
                            </Badge>
                          ))}
                          {item.allergens?.map((allergen) => (
                            <Badge
                              key={allergen}
                              variant="destructive"
                              className="text-[10px]"
                            >
                              {allergen}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-primary">
                          ${item.price ?? 0}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onToggleItem(item.id)}
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
};
