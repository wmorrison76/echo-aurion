import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Trash2, UtensilsCrossed } from "lucide-react";
import type { MenuItem } from "../components/BeoMenuPicker";
import {
  getMenuCatalogItems,
  removeMenuCatalogItem,
  upsertMenuCatalogItems,
} from "../lib/menu-catalog-store";
import {
  importCulinaryRecipes,
  importPastryRecipes,
} from "../lib/culinary-menu-import";

function newItemId(name: string, category: string): string {
  const base = `${category}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
  return `menu-${base || Math.random().toString(36).slice(2, 10)}`;
}

export default function MenuCatalogPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState("all");
  const [outletFilter, setOutletFilter] = React.useState("all");
  const [items, setItems] = React.useState<MenuItem[]>(() =>
    getMenuCatalogItems(),
  );

  const [isNewOpen, setIsNewOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({
    name: "",
    category: "Entree",
    description: "",
    price: "",
    cost: "",
    outletId: "all",
    menuVersion: "v1",
    effectiveFrom: "",
    effectiveTo: "",
    dietary: "",
    allergens: "",
  });

  const categories = React.useMemo(() => {
    const fromData = Array.from(new Set(items.map((i) => i.category))).filter(
      Boolean,
    );
    const defaults = ["Appetizer", "Entree", "Dessert", "Beverage", "Side"];
    return Array.from(new Set([...defaults, ...fromData])).sort();
  }, [items]);

  const filteredItems = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch =
        q.length === 0 ||
        item.name.toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === "all" || item.category === categoryFilter;
      const matchesOutlet =
        outletFilter === "all" ||
        item.outletId === outletFilter ||
        !item.outletId;
      return matchesSearch && matchesCategory && matchesOutlet;
    });
  }, [items, searchQuery, categoryFilter, outletFilter]);

  const outlets = React.useMemo(() => {
    const fromData = Array.from(
      new Set(items.map((i) => i.outletId).filter(Boolean)),
    ) as string[];
    return ["all", ...fromData];
  }, [items]);

  const avgPrice = React.useMemo(() => {
    if (items.length === 0) return 0;
    return items.reduce((sum, i) => sum + (i.price || 0), 0) / items.length;
  }, [items]);

  const avgMargin = React.useMemo(() => {
    const withCost = items.filter((i) => typeof i.cost === "number");
    if (withCost.length === 0) return 0;
    return (
      withCost.reduce((sum, i) => sum + ((i.price || 0) - (i.cost || 0)), 0) /
      withCost.length
    );
  }, [items]);

  const addNew = React.useCallback(() => {
    const name = draft.name.trim();
    if (!name) return;
    const category = String(draft.category || "Entree");
    const next: MenuItem = {
      id: newItemId(name, category),
      name,
      category,
      description: draft.description.trim(),
      price: Number.parseFloat(draft.price) || 0,
      cost: Number.parseFloat(draft.cost) || 0,
      preparationTime: 20,
      servingSize: "per person",
      dietary: draft.dietary
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      allergens: draft.allergens
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      popularity: 0.75,
      upsellPotential: 0.6,
      outletId: draft.outletId || "all",
      menuVersion: draft.menuVersion || "v1",
      effectiveFrom: draft.effectiveFrom || undefined,
      effectiveTo: draft.effectiveTo || undefined,
    };
    upsertMenuCatalogItems([next], { source: { kind: "manual" } });
    setItems(getMenuCatalogItems());
    setIsNewOpen(false);
    setDraft({
      name: "",
      category: "Entree",
      description: "",
      price: "",
      cost: "",
      outletId: "all",
      menuVersion: "v1",
      effectiveFrom: "",
      effectiveTo: "",
      dietary: "",
      allergens: "",
    });
  }, [draft]);

  const removeItem = React.useCallback((id: string) => {
    removeMenuCatalogItem(id);
    setItems(getMenuCatalogItems());
  }, []);

  const handleImport = React.useCallback(
    (source: "culinary" | "pastry") => {
      const itemsToAdd =
        source === "culinary"
          ? importCulinaryRecipes({ outletId: outletFilter })
          : importPastryRecipes({ outletId: outletFilter });
      if (itemsToAdd.length === 0) return;
      upsertMenuCatalogItems(itemsToAdd, { source: { kind: "import" } });
      setItems(getMenuCatalogItems());
    },
    [outletFilter],
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Menu Catalog</h1>
            <p className="text-muted-foreground">
              Central library for imported and curated banquet menus.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => handleImport("culinary")}>
              Import Culinary
            </Button>
            <Button variant="outline" onClick={() => handleImport("pastry")}>
              Import Pastry
            </Button>
            <Button className="shadow-glow" onClick={() => setIsNewOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> New Item
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{items.length}</div>
              <p className="text-xs text-muted-foreground">In catalog</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.max(0, categories.length)}
              </div>
              <p className="text-xs text-muted-foreground">
                Distinct categories
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Price</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${avgPrice.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Per person</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${avgMargin.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Price minus cost</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search menu items…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={outletFilter} onValueChange={setOutletFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map((outlet) => (
                    <SelectItem key={outlet} value={outlet}>
                      {outlet === "all" ? "All Outlets" : outlet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <div className="text-sm font-semibold">No menu items yet</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Create a new item here, or import a banquet menu from the BEO
                builder “Menu” step.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className="hover:shadow-lg transition-all duration-200 flex flex-col"
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">
                        {item.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {item.description}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">{item.category}</Badge>
                    {(item.dietary || []).slice(0, 3).map((d) => (
                      <Badge key={d} variant="secondary">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="text-sm text-muted-foreground">
                    Allergens:{" "}
                    {(item.allergens || []).length
                      ? item.allergens.join(", ")
                      : "—"}
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                    <div>
                      <span className="text-2xl font-bold text-emerald-600">
                        ${(item.price || 0).toFixed(2)}
                      </span>
                      {typeof item.cost === "number" ? (
                        <div className="text-xs text-muted-foreground">
                          Cost ${item.cost.toFixed(2)} • Margin $
                          {(item.price - item.cost).toFixed(2)}
                        </div>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {item.servingSize || "per person"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>New Menu Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select
                    value={draft.category}
                    onValueChange={(v) =>
                      setDraft((p) => ({ ...p, category: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        "Appetizer",
                        "Entree",
                        "Dessert",
                        "Beverage",
                        "Side",
                      ].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Outlet</Label>
                  <Input
                    value={draft.outletId}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, outletId: e.target.value }))
                    }
                    placeholder="all or outlet id"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Menu Version</Label>
                  <Input
                    value={draft.menuVersion}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, menuVersion: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, description: e.target.value }))
                  }
                  className="min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.price}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, price: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cost</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.cost}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, cost: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Dietary (comma separated)</Label>
                  <Input
                    value={draft.dietary}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, dietary: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Effective From</Label>
                  <Input
                    type="date"
                    value={draft.effectiveFrom}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, effectiveFrom: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Effective To</Label>
                  <Input
                    type="date"
                    value={draft.effectiveTo}
                    onChange={(e) =>
                      setDraft((p) => ({ ...p, effectiveTo: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Allergens (comma separated)</Label>
                <Input
                  value={draft.allergens}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, allergens: e.target.value }))
                  }
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsNewOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={addNew} disabled={!draft.name.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
