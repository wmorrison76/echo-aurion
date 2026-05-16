import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowDown, ArrowUp, Clock, X } from "lucide-react";
import { getMenuCatalogItems } from "../lib/menu-catalog-store";

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  cost?: number;
  preparationTime: number;
  servingSize: string;
  dietary: string[];
  allergens: string[];
  popularity: number;
  upsellPotential: number;
  outletId?: string;
  baseItemId?: string;
  menuVersion?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
}

export interface SelectedMenuItem extends MenuItem {
  order: number;
}

interface BeoMenuPickerProps {
  eventDetails: {
    title: string;
    guestCount: number;
    date: string;
    eventType: string;
  };
  availableMenuItems?: MenuItem[];
  outletId?: string;
  selectedItems: SelectedMenuItem[];
  onSelectedItemsChange: (items: SelectedMenuItem[]) => void;
  onNext?: () => void;
}

const DIETARY_COLORS: Record<string, string> = {
  vegan: "bg-green-100 text-green-800",
  vegetarian: "bg-green-50 text-green-700",
  "gluten-free": "bg-yellow-100 text-yellow-800",
  "gluten-free available": "bg-yellow-50 text-yellow-700",
};

export function BeoMenuPicker({
  eventDetails,
  availableMenuItems,
  outletId,
  selectedItems,
  onSelectedItemsChange,
  onNext,
}: BeoMenuPickerProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(
    null,
  );

  const menuItems = React.useMemo<MenuItem[]>(() => {
    if (Array.isArray(availableMenuItems) && availableMenuItems.length > 0)
      return availableMenuItems;
    const all = getMenuCatalogItems();
    if (!outletId) return all;
    return all.filter(
      (item) =>
        !item.outletId || item.outletId === "all" || item.outletId === outletId,
    );
  }, [availableMenuItems, outletId]);

  const selectedIds = React.useMemo(
    () => new Set(selectedItems.map((item) => item.id)),
    [selectedItems],
  );

  const categories = React.useMemo(() => {
    return Array.from(new Set(menuItems.map((item) => item.category)))
      .filter(Boolean)
      .sort();
  }, [menuItems]);

  const filteredItems = React.useMemo(() => {
    const q = searchQuery.toLowerCase();
    return menuItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === null || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, searchQuery, categoryFilter]);

  const groupedByCategory = React.useMemo(() => {
    const groups: Record<string, MenuItem[]> = {};
    filteredItems.forEach((item) => {
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const toggleItem = React.useCallback(
    (item: MenuItem) => {
      if (selectedIds.has(item.id)) {
        onSelectedItemsChange(selectedItems.filter((si) => si.id !== item.id));
        return;
      }
      const nextOrder =
        Math.max(-1, ...selectedItems.map((si) => si.order)) + 1;
      const newItem: SelectedMenuItem = { ...item, order: nextOrder };
      onSelectedItemsChange([...selectedItems, newItem]);
    },
    [onSelectedItemsChange, selectedIds, selectedItems],
  );

  const moveItem = React.useCallback(
    (id: string, direction: "up" | "down") => {
      const index = selectedItems.findIndex((si) => si.id === id);
      if (index === -1) return;
      const next = selectedItems.slice();
      if (direction === "up" && index > 0) {
        [next[index], next[index - 1]] = [next[index - 1], next[index]];
      } else if (direction === "down" && index < next.length - 1) {
        [next[index], next[index + 1]] = [next[index + 1], next[index]];
      }
      next.forEach((it, i) => (it.order = i));
      onSelectedItemsChange(next);
    },
    [onSelectedItemsChange, selectedItems],
  );

  const removeItem = React.useCallback(
    (id: string) =>
      onSelectedItemsChange(selectedItems.filter((si) => si.id !== id)),
    [onSelectedItemsChange, selectedItems],
  );

  const perPersonPrice = React.useMemo(
    () => selectedItems.reduce((sum, item) => sum + (item.price || 0), 0),
    [selectedItems],
  );
  const totalPrice = perPersonPrice * (eventDetails.guestCount || 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Menu Selection for {eventDetails.title}</CardTitle>
          <CardDescription>
            {eventDetails.guestCount} guests • {eventDetails.date} •{" "}
            {eventDetails.eventType}
          </CardDescription>
        </CardHeader>
      </Card>

      {menuItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <div className="text-sm font-semibold">No menu items available</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Import a menu in this BEO flow, or add items in the Menu Catalog
              tab.
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Search Items</Label>
                  <Input
                    id="search"
                    placeholder="Search by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={categoryFilter === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCategoryFilter(null)}
                    >
                      All
                    </Button>
                    {categories.map((cat) => (
                      <Button
                        key={cat}
                        variant={categoryFilter === cat ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCategoryFilter(cat)}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {Object.entries(groupedByCategory).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <Card
                        key={item.id}
                        className={`cursor-pointer transition-all ${
                          selectedIds.has(item.id)
                            ? "ring-2 ring-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => toggleItem(item)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedIds.has(item.id)}
                              onCheckedChange={() => toggleItem(item)}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="min-w-0">
                                  <h4 className="font-medium truncate">
                                    {item.name}
                                  </h4>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {item.description}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-semibold">
                                    ${(item.price || 0).toFixed(2)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    per person
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2 items-center">
                                {(item.dietary || []).map((diet) => (
                                  <Badge
                                    key={diet}
                                    variant="secondary"
                                    className={`text-xs ${DIETARY_COLORS[diet] || "bg-surface"}`}
                                  >
                                    {diet}
                                  </Badge>
                                ))}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
                                  <Clock className="h-3 w-3" />
                                  <span>{item.preparationTime} min</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Selected Items</CardTitle>
                <CardDescription>
                  {selectedItems.length} items selected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No items selected yet
                  </p>
                ) : (
                  <>
                    <ScrollArea className="h-48 rounded-md border p-3">
                      <div className="space-y-2">
                        {selectedItems.map((item, index) => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-2 p-2 bg-muted rounded text-sm"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {item.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ${(item.price || 0).toFixed(2)}/person
                              </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveItem(item.id, "up")}
                                disabled={index === 0}
                                className="h-6 w-6 p-0"
                              >
                                <ArrowUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => moveItem(item.id, "down")}
                                disabled={index === selectedItems.length - 1}
                                className="h-6 w-6 p-0"
                              >
                                <ArrowDown className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeItem(item.id)}
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Items:</span>
                        <span className="font-medium">
                          {selectedItems.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Per Person:</span>
                        <span className="font-medium">
                          ${perPersonPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Guests:</span>
                        <span className="font-medium">
                          {eventDetails.guestCount}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-base font-bold text-primary">
                        <span>Total:</span>
                        <span>${totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                    {onNext && (
                      <Button
                        className="w-full bg-cyan-500 hover:bg-cyan-600"
                        onClick={onNext}
                        disabled={selectedItems.length === 0}
                      >
                        Next: Setup Requirements
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
