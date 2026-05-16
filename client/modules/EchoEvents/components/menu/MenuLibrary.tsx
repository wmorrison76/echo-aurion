import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import EnhancedMenuParser from "../EnhancedMenuParser";
import type { Menu } from "@shared/menu-types";

const STORAGE_KEY = "echoCRM-parsed-menus";

type StoredMenu = Menu & {
  selectedItems?: string[];
  selectionTimestamp?: string;
};

type MenuLibraryProps = {
  selectedMenu: Menu | null;
  selectedItems: string[];
  onSelectMenu: (menu: Menu, selectedItems?: string[]) => void;
  onToggleItem: (itemId: string) => void;
};

const readStoredMenus = (): StoredMenu[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredMenu[]) : [];
  } catch {
    return [];
  }
};

export const MenuLibrary: React.FC<MenuLibraryProps> = ({
  selectedMenu,
  selectedItems,
  onSelectMenu,
  onToggleItem,
}) => {
  const [menus, setMenus] = useState<StoredMenu[]>(() => readStoredMenus());
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMenus(readStoredMenus());
  }, []);

  useEffect(() => {
    const handleStorage = () => setMenus(readStoredMenus());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleMenuSelected = useCallback(
    (menu: Menu, items?: string[]) => {
      onSelectMenu(menu, items ?? []);
      setMenus(readStoredMenus());
    },
    [onSelectMenu],
  );

  const filteredMenus = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return menus;
    return menus.filter((menu) =>
      [menu.name, menu.type, menu.outlet]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [menus, searchQuery]);

  const selectedSet = useMemo(() => new Set(selectedItems), [selectedItems]);

  const selectedCountLabel = selectedItems.length
    ? `${selectedItems.length} selected`
    : "No items selected";

  return (
    <div className="space-y-4">
      <Card className="border border-border/60 bg-background/80">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Menu Library</CardTitle>
            <p className="text-xs text-muted-foreground">
              Browse parsed menus and add items to the event pack.
            </p>
          </div>
          <EnhancedMenuParser
            onMenuSelected={handleMenuSelected}
            onMenuCreated={() => setMenus(readStoredMenus())}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search menus by name, type, or outlet"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <ScrollArea className="h-[260px] rounded-lg border border-border/60">
            <div className="space-y-3 p-3">
              {filteredMenus.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-xs text-muted-foreground">
                  Parse a menu to populate the library.
                </div>
              ) : (
                filteredMenus.map((menu) => {
                  const isActive = selectedMenu?.id === menu.id;
                  const itemCount = menu.sections.reduce(
                    (sum, section) => sum + (section.items?.length ?? 0),
                    0,
                  );
                  const selectedItemsCount = menu.selectedItems?.length ?? 0;
                  return (
                    <div
                      key={menu.id}
                      className={cn(
                        "rounded-lg border border-border/60 bg-background/70 p-3 transition",
                        isActive && "border-primary/60 bg-primary/5",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">
                              {menu.name}
                            </span>
                            {isActive && (
                              <Badge variant="secondary">Active</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {menu.type} • {itemCount} items
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isActive ? "outline" : "default"}
                          onClick={() =>
                            handleMenuSelected(menu, menu.selectedItems ?? [])
                          }
                        >
                          {isActive ? "Refresh" : "Use menu"}
                        </Button>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                        <Badge variant="outline">
                          {selectedItemsCount} saved
                        </Badge>
                        {menu.outlet && (
                          <Badge variant="outline">{menu.outlet}</Badge>
                        )}
                        {menu.effectiveDate && (
                          <Badge variant="outline">{menu.effectiveDate}</Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="border border-border/60 bg-background/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Menu Items
            </CardTitle>
            <Badge variant="outline">{selectedCountLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedMenu ? (
            <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
              Select a menu to preview and add items.
            </div>
          ) : (
            <ScrollArea className="h-[320px]">
              <div className="space-y-4 pr-2">
                {selectedMenu.sections.map((section) => (
                  <div key={section.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        {section.name}
                      </span>
                      <Badge variant="outline">
                        {section.items?.length ?? 0}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {section.items?.map((item) => {
                        const isSelected = selectedSet.has(item.id);
                        return (
                          <div
                            key={item.id}
                            className={cn(
                              "flex items-start justify-between gap-3 rounded-lg border border-border/60 px-3 py-2",
                              isSelected && "border-primary/60 bg-primary/5",
                            )}
                          >
                            <div>
                              <div className="text-sm font-medium">
                                {item.name}
                              </div>
                              {item.description && (
                                <p className="text-xs text-muted-foreground">
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
                                size="sm"
                                variant={isSelected ? "secondary" : "outline"}
                                className="mt-2"
                                onClick={() => onToggleItem(item.id)}
                              >
                                {isSelected ? "Remove" : "Add"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
