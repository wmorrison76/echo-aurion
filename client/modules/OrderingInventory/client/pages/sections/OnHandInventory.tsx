import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Package, Search, Filter, ArrowUpDown, DollarSign,
  AlertTriangle, TrendingDown, TrendingUp, BarChart3,
  ChevronDown, RefreshCw, Clock
} from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  par_level: number;
  unit: string;
  unit_cost: number;
  on_hand_value: number;
  is_low_stock: boolean;
  stock_pct: number;
  last_received: string | null;
  last_vendor: string;
  supplier: string;
}

interface Stats {
  total_items: number;
  total_value: number;
  low_stock_count: number;
}

type SortField = "name" | "current_stock" | "on_hand_value" | "stock_pct";
type SortDir = "asc" | "desc";

export default function OnHandInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterLow, setFilterLow] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/ordering/on-hand");
      const data = await res.json();
      setItems(data.items || []);
      setStats({
        total_items: data.total_items,
        total_value: data.total_value,
        low_stock_count: data.low_stock_count,
      });
    } catch (e) {
      console.error("Failed to fetch inventory", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const fetchHistory = async (item: InventoryItem) => {
    setSelectedItem(item);
    try {
      const res = await fetch(`/api/ordering/on-hand/${item.id}/history`);
      const data = await res.json();
      setHistory(data.transactions || []);
    } catch (e) {
      setHistory([]);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const filtered = items
    .filter((item) => {
      const matchSearch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLow = !filterLow || item.is_low_stock;
      return matchSearch && matchLow;
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const cmp = typeof aVal === "string" ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number);
      return sortDir === "asc" ? cmp : -cmp;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-full" data-testid="on-hand-inventory">
      {/* Main List */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Stats */}
        {stats && (
          <div className="flex gap-3 p-4 border-b border-border/40 bg-muted/20">
            <StatCard icon={<Package className="w-4 h-4" />} label="Total Items" value={stats.total_items} />
            <StatCard icon={<DollarSign className="w-4 h-4" />} label="On-Hand Value" value={`$${stats.total_value.toLocaleString()}`} />
            <StatCard
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Low Stock"
              value={stats.low_stock_count}
              highlight={stats.low_stock_count > 0}
            />
          </div>
        )}

        {/* Search + Filter */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search ingredients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border/40 bg-background/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid="inventory-search"
            />
          </div>
          <button
            onClick={() => setFilterLow(!filterLow)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors",
              filterLow
                ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                : "border-border/30 text-muted-foreground hover:bg-muted/50"
            )}
            data-testid="low-stock-toggle"
          >
            <AlertTriangle className="w-3 h-3" />
            Low Stock
          </button>
          <button
            onClick={fetchInventory}
            className="p-1.5 rounded-lg border border-border/30 text-muted-foreground hover:bg-muted/50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table Header */}
        <div className="flex items-center px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/20 bg-muted/10">
          <SortButton label="Item" field="name" current={sortField} dir={sortDir} onClick={toggleSort} className="flex-1" />
          <SortButton label="On Hand" field="current_stock" current={sortField} dir={sortDir} onClick={toggleSort} className="w-24 text-right" />
          <div className="w-20 text-right">Par</div>
          <SortButton label="Stock %" field="stock_pct" current={sortField} dir={sortDir} onClick={toggleSort} className="w-24 text-right" />
          <SortButton label="Value" field="on_hand_value" current={sortField} dir={sortDir} onClick={toggleSort} className="w-24 text-right" />
        </div>

        {/* Item Rows */}
        <div className="flex-1 overflow-auto">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => fetchHistory(item)}
              className={cn(
                "w-full flex items-center px-4 py-2.5 text-sm border-b border-border/10 hover:bg-muted/30 transition-colors text-left",
                selectedItem?.id === item.id && "bg-primary/5",
                item.is_low_stock && "bg-amber-500/5"
              )}
              data-testid={`inv-row-${item.id}`}
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">{item.category || "General"}</p>
              </div>
              <div className="w-24 text-right">
                <span className={cn(
                  "font-medium",
                  item.is_low_stock ? "text-amber-400" : "text-foreground"
                )}>
                  {item.current_stock}
                </span>
                <span className="text-xs text-muted-foreground ml-0.5">{item.unit}</span>
              </div>
              <div className="w-20 text-right text-muted-foreground">
                {item.par_level} {item.unit}
              </div>
              <div className="w-24 text-right">
                <StockBar pct={item.stock_pct} />
              </div>
              <div className="w-24 text-right font-medium">
                ${item.on_hand_value.toFixed(2)}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">No items found</p>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      <div className="w-[300px] border-l border-border/40 flex flex-col bg-muted/10">
        {selectedItem ? (
          <>
            <div className="p-4 border-b border-border/40">
              <h3 className="font-semibold text-base">{selectedItem.name}</h3>
              <p className="text-xs text-muted-foreground">{selectedItem.category || "General"}</p>
            </div>

            <div className="p-4 space-y-3 border-b border-border/30">
              <DetailRow label="On Hand" value={`${selectedItem.current_stock} ${selectedItem.unit}`} />
              <DetailRow label="Par Level" value={`${selectedItem.par_level} ${selectedItem.unit}`} />
              <DetailRow label="Unit Cost" value={`$${selectedItem.unit_cost.toFixed(2)}`} />
              <DetailRow label="On-Hand Value" value={`$${selectedItem.on_hand_value.toFixed(2)}`} highlight />
              <DetailRow label="Stock Level" value={`${selectedItem.stock_pct.toFixed(0)}%`} />
              {selectedItem.last_vendor && (
                <DetailRow label="Last Vendor" value={selectedItem.last_vendor} />
              )}
              {selectedItem.last_received && (
                <DetailRow label="Last Received" value={new Date(selectedItem.last_received).toLocaleDateString()} />
              )}
            </div>

            <div className="p-4 flex-1 overflow-auto">
              <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Transaction History</h4>
              {history.length > 0 ? (
                <div className="space-y-2">
                  {history.map((txn) => (
                    <div key={txn.id} className="p-2 rounded-lg bg-background/50 border border-border/20">
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-xs font-medium capitalize",
                          txn.type === "receiving" ? "text-emerald-400" : "text-red-400"
                        )}>
                          {txn.type === "receiving" ? <TrendingUp className="w-3 h-3 inline mr-1" /> : <TrendingDown className="w-3 h-3 inline mr-1" />}
                          {txn.type}
                        </span>
                        <span className="text-xs font-medium">
                          {txn.type === "receiving" ? "+" : "-"}{txn.quantity} {txn.unit}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {txn.vendor && `${txn.vendor} · `}${txn.total_cost?.toFixed(2) || "0.00"}
                      </p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {txn.timestamp && new Date(txn.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">No transactions yet</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <BarChart3 className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Select an item to view details</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Stock levels, costs, and transaction history</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: any; highlight?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 px-3 py-2 rounded-lg border",
      highlight ? "bg-amber-500/10 border-amber-500/30" : "bg-background/50 border-border/30"
    )}>
      <div className={cn("p-1.5 rounded-md", highlight ? "bg-amber-500/20 text-amber-400" : "bg-primary/10 text-primary")}>{icon}</div>
      <div>
        <p className="text-sm font-semibold leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function SortButton({
  label, field, current, dir, onClick, className
}: {
  label: string; field: SortField; current: SortField; dir: SortDir;
  onClick: (f: SortField) => void; className?: string;
}) {
  return (
    <button onClick={() => onClick(field)} className={cn("flex items-center gap-0.5 hover:text-foreground", className)}>
      {label}
      {current === field && <ArrowUpDown className="w-2.5 h-2.5" />}
    </button>
  );
}

function StockBar({ pct }: { pct: number }) {
  const color = pct > 60 ? "bg-emerald-500" : pct > 30 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full bg-muted/50 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs">{Math.round(pct)}%</span>
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-sm", highlight ? "font-bold text-primary" : "font-medium")}>{value}</span>
    </div>
  );
}
