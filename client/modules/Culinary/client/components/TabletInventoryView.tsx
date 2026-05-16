/**
 * Tablet-Optimized Inventory View
 *
 * Optimized for tablet touch interactions
 */

import React, { useState } from "react";
const { useState } = React;
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, Package, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/glass";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  costPerUnit: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

interface TabletInventoryViewProps {
  items: InventoryItem[];
  onItemSelect?: (item: InventoryItem) => void;
}

export function TabletInventoryView({
  items,
  onItemSelect,
}: TabletInventoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = Array.from(new Set(items.map((item) => item.category)));

  const filtered = items.filter((item) => {
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getStatusColor = (status: InventoryItem["status"]) => {
    switch (status) {
      case "in_stock":
        return "bg-green-500/20 text-green-600 dark:text-green-400";
      case "low_stock":
        return "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400";
      case "out_of_stock":
        return "bg-red-500/20 text-red-600 dark:text-red-400";
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border p-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 text-base"
            />
          </div>
          <Button variant="outline" size="lg" className="h-12 px-6">
            <Filter className="h-5 w-5 mr-2" />
            Filter
          </Button>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            onClick={() => setSelectedCategory(null)}
            className="h-10 px-4 whitespace-nowrap"
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              className="h-10 px-4 whitespace-nowrap"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className={cn(
                "touch-manipulation cursor-pointer hover:border-primary transition-colors",
                item.status === "out_of_stock" && "opacity-60",
              )}
              onClick={() => onItemSelect?.(item)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{item.name}</CardTitle>
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span className="font-semibold text-foreground">
                    {item.quantity} {item.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Cost:</span>
                  <span className="font-semibold text-foreground">
                    ${item.costPerUnit.toFixed(2)}/{item.unit}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-1 rounded text-xs font-medium",
                      getStatusColor(item.status),
                    )}
                  >
                    {item.status === "in_stock"
                      ? "In Stock"
                      : item.status === "low_stock"
                        ? "Low Stock"
                        : "Out of Stock"}
                  </span>
                  {item.status !== "in_stock" && (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No items found</p>
          </div>
        )}
      </div>
    </div>
  );
}
