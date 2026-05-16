import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Store } from "@/modules/PurchasingReceiving/client/lib/store";

export default function InventoryLookup() {
  const [query, setQuery] = useState("");
  const items = useMemo(() => Store.listItems() || [], []);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(lower) ||
        (item.category || "").toLowerCase().includes(lower) ||
        (item.sku || "").toLowerCase().includes(lower),
    );
  }, [items, query]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Inventory Lookup</h2>
        <p className="text-sm text-muted-foreground">
          Search every item across outlets, categories, and SKUs.
        </p>
      </div>

      <Card className="border border-border bg-surface">
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search item name, SKU, or category"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((item) => (
          <Card key={item.id} className="border border-border bg-surface">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.sku ?? "SKU unknown"}
                  </p>
                </div>
                <Badge variant="outline">{item.unit ?? "unit"}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Category:{" "}
                <span className="text-foreground">
                  {item.category ?? "Uncategorized"}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="border border-dashed bg-surface">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No inventory items match your search.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
