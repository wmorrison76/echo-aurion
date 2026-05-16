import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  BarChart3,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Search,
  Package,
  Wine,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LiquorItem {
  id: string;
  name: string;
  spirit_type: string;
  producer: string;
  abv: number;
  retail_price: number;
  cost_price: number;
  total_qty: number;
  par_level: number;
  reorder_point: number;
  pour_cost_pct?: number;
}

// Demo data — will be replaced by API when backend is wired
const DEMO_INVENTORY: LiquorItem[] = [
  { id: "lq-1", name: "Clase Azul Reposado", spirit_type: "Tequila", producer: "Clase Azul", abv: 40, retail_price: 28, cost_price: 8.40, total_qty: 12, par_level: 8, reorder_point: 4, pour_cost_pct: 15.0 },
  { id: "lq-2", name: "Macallan 18 Year", spirit_type: "Scotch", producer: "Macallan", abv: 43, retail_price: 45, cost_price: 18.50, total_qty: 6, par_level: 6, reorder_point: 3, pour_cost_pct: 20.6 },
  { id: "lq-3", name: "Grey Goose", spirit_type: "Vodka", producer: "Bacardi", abv: 40, retail_price: 16, cost_price: 3.20, total_qty: 24, par_level: 18, reorder_point: 8, pour_cost_pct: 10.0 },
  { id: "lq-4", name: "Ketel One", spirit_type: "Vodka", producer: "Diageo", abv: 40, retail_price: 14, cost_price: 2.80, total_qty: 4, par_level: 12, reorder_point: 6, pour_cost_pct: 10.0 },
  { id: "lq-5", name: "Hendrick's Gin", spirit_type: "Gin", producer: "Grant's", abv: 41.4, retail_price: 15, cost_price: 4.50, total_qty: 15, par_level: 10, reorder_point: 5, pour_cost_pct: 15.0 },
  { id: "lq-6", name: "Opus One 2018", spirit_type: "Red Wine", producer: "Opus One", abv: 14.5, retail_price: 95, cost_price: 45.00, total_qty: 2, par_level: 6, reorder_point: 3, pour_cost_pct: 23.7 },
  { id: "lq-7", name: "Veuve Clicquot Brut", spirit_type: "Champagne", producer: "LVMH", abv: 12, retail_price: 22, cost_price: 7.50, total_qty: 18, par_level: 12, reorder_point: 6, pour_cost_pct: 17.0 },
  { id: "lq-8", name: "Don Julio 1942", spirit_type: "Tequila", producer: "Diageo", abv: 40, retail_price: 35, cost_price: 14.00, total_qty: 8, par_level: 6, reorder_point: 3, pour_cost_pct: 20.0 },
  { id: "lq-9", name: "Johnnie Walker Blue", spirit_type: "Scotch", producer: "Diageo", abv: 40, retail_price: 55, cost_price: 22.00, total_qty: 5, par_level: 4, reorder_point: 2, pour_cost_pct: 20.0 },
  { id: "lq-10", name: "Patron Silver", spirit_type: "Tequila", producer: "Bacardi", abv: 40, retail_price: 14, cost_price: 3.50, total_qty: 20, par_level: 15, reorder_point: 8, pour_cost_pct: 12.5 },
  { id: "lq-11", name: "Caymus Cabernet 2021", spirit_type: "Red Wine", producer: "Caymus Vineyards", abv: 14.8, retail_price: 28, cost_price: 10.50, total_qty: 10, par_level: 8, reorder_point: 4, pour_cost_pct: 18.8 },
  { id: "lq-12", name: "Maker's Mark", spirit_type: "Bourbon", producer: "Beam Suntory", abv: 45, retail_price: 12, cost_price: 2.40, total_qty: 16, par_level: 12, reorder_point: 6, pour_cost_pct: 10.0 },
];

const SPIRIT_TYPES = ["all", "Tequila", "Vodka", "Scotch", "Gin", "Bourbon", "Red Wine", "Champagne"];

type SortKey = "name" | "total_qty" | "cost_price" | "retail_price" | "pour_cost_pct";

export const LiquorInventory: React.FC = () => {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [inventory] = useState<LiquorItem[]>(DEMO_INVENTORY);

  const filtered = useMemo(() => {
    let items = [...inventory];
    if (filterType !== "all") {
      items = items.filter((i) => i.spirit_type === filterType);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.producer.toLowerCase().includes(q) ||
          i.spirit_type.toLowerCase().includes(q),
      );
    }
    items.sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      if (typeof av === "string" && typeof bv === "string") {
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return items;
  }, [inventory, search, filterType, sortKey, sortAsc]);

  const totalValue = inventory.reduce((s, i) => s + i.cost_price * i.total_qty, 0);
  const totalBottles = inventory.reduce((s, i) => s + i.total_qty, 0);
  const lowStockCount = inventory.filter((i) => i.total_qty <= i.reorder_point).length;
  const avgPourCost = inventory.reduce((s, i) => s + (i.pour_cost_pct ?? 0), 0) / inventory.length;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const SortHeader = ({ label, field, className }: { label: string; field: SortKey; className?: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={cn(
        "flex items-center gap-1 text-[11px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors",
        className,
      )}
    >
      {label}
      <ArrowUpDown className={cn("w-3 h-3", sortKey === field && "text-zinc-200")} />
    </button>
  );

  return (
    <div className="sommelier-module p-6 md:p-8 space-y-6 bg-zinc-950 min-h-full" data-testid="liquor-inventory-page">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Liquor Inventory
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Spirits, wine & champagne — par levels, pour cost, reorder alerts
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          className="bg-white text-zinc-950 hover:bg-zinc-200"
          data-testid="add-item-btn"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Item
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/50 rounded-xl">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Total Value</p>
            <p className="text-2xl font-semibold tabular-nums text-zinc-50 mt-1">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-zinc-500">{inventory.length} SKUs</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/50 rounded-xl">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Bottles On-Hand</p>
            <p className="text-2xl font-semibold tabular-nums text-zinc-50 mt-1">{totalBottles}</p>
            <p className="text-xs text-zinc-500">across all categories</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/50 rounded-xl">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Below Reorder</p>
            <p className={cn("text-2xl font-semibold tabular-nums mt-1", lowStockCount > 0 ? "text-rose-400" : "text-emerald-400")}>
              {lowStockCount}
            </p>
            <p className="text-xs text-zinc-500">items need ordering</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/50 rounded-xl">
          <CardContent className="p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Avg Pour Cost</p>
            <p className="text-2xl font-semibold tabular-nums text-emerald-400 mt-1">
              {avgPourCost.toFixed(1)}%
            </p>
            <p className="text-xs text-zinc-500">target: 18%</p>
          </CardContent>
        </Card>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Search spirits, wines, producers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900/60 border-zinc-800/50 text-zinc-200 placeholder:text-zinc-600 h-9"
            data-testid="inventory-search"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {SPIRIT_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                filterType === type
                  ? "bg-zinc-100 text-zinc-900"
                  : "bg-zinc-800/40 text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200",
              )}
              data-testid={`filter-${type}`}
            >
              {type === "all" ? "All Categories" : type}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <Card className="bg-zinc-900/60 backdrop-blur-xl border-zinc-800/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="inventory-table">
            <thead>
              <tr className="border-b border-zinc-800/50">
                <th className="text-left px-4 py-3">
                  <SortHeader label="Item" field="name" />
                </th>
                <th className="text-left px-4 py-3">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500">Type</span>
                </th>
                <th className="text-right px-4 py-3">
                  <SortHeader label="On-Hand" field="total_qty" className="justify-end" />
                </th>
                <th className="text-right px-4 py-3">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500">Par</span>
                </th>
                <th className="text-right px-4 py-3">
                  <SortHeader label="Cost/Pour" field="cost_price" className="justify-end" />
                </th>
                <th className="text-right px-4 py-3">
                  <SortHeader label="Price/Pour" field="retail_price" className="justify-end" />
                </th>
                <th className="text-right px-4 py-3">
                  <SortHeader label="Pour %" field="pour_cost_pct" className="justify-end" />
                </th>
                <th className="text-center px-4 py-3">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-500">Status</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const stockPct = item.total_qty / Math.max(item.par_level, 1);
                const isLow = item.total_qty <= item.reorder_point;
                const isCritical = item.total_qty <= 2;

                return (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-800/20 hover:bg-zinc-800/30 transition-colors"
                    data-testid={`inventory-row-${item.id}`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{item.name}</p>
                        <p className="text-[11px] text-zinc-500">{item.producer}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="outline"
                        className="text-[10px] bg-zinc-800/40 text-zinc-400 border-zinc-700/30"
                      >
                        {item.spirit_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("text-sm tabular-nums font-medium", isCritical ? "text-rose-400" : isLow ? "text-amber-400" : "text-zinc-200")}>
                        {item.total_qty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm tabular-nums text-zinc-500">{item.par_level}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm tabular-nums text-zinc-300">${item.cost_price.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm tabular-nums text-zinc-200">${item.retail_price.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn(
                        "text-sm tabular-nums font-medium",
                        (item.pour_cost_pct ?? 0) <= 15 ? "text-emerald-400" :
                        (item.pour_cost_pct ?? 0) <= 22 ? "text-zinc-200" : "text-rose-400",
                      )}>
                        {item.pour_cost_pct?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isCritical ? (
                        <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-[10px]" variant="outline">
                          Critical
                        </Badge>
                      ) : isLow ? (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]" variant="outline">
                          Low
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]" variant="outline">
                          OK
                        </Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
