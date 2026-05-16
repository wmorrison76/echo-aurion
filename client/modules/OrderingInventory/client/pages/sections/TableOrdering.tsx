import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Users, Clock, DollarSign, Plus, X, Check,
  ChevronRight, RefreshCw, Search, Filter,
  Utensils, AlertCircle, CheckCircle2
} from "lucide-react";

const API = (import.meta as any).env?.VITE_API_URL || "";

interface Table {
  id: string;
  number: string;
  name: string;
  zone: string;
  status: "available" | "occupied" | "reserved" | "cleaning";
  capacity: number;
  server_id: string | null;
  current_order_id: string | null;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  modifiers: string[];
  notes?: string;
  line_total: number;
  status: string;
}

interface Order {
  id: string;
  table_id: string | null;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  server_name?: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  available: "bg-emerald-500/20 border-emerald-500/40 text-emerald-400",
  occupied: "bg-amber-500/20 border-amber-500/40 text-amber-400",
  reserved: "bg-blue-500/20 border-blue-500/40 text-blue-400",
  cleaning: "bg-purple-500/20 border-purple-500/40 text-purple-400",
};

const ORDER_STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400",
  submitted: "bg-amber-500/20 text-amber-400",
  preparing: "bg-orange-500/20 text-orange-400",
  ready: "bg-emerald-500/20 text-emerald-400",
  served: "bg-green-500/20 text-green-400",
  closed: "bg-gray-500/20 text-gray-400",
  cancelled: "bg-red-500/20 text-red-400",
};

export default function TableOrdering() {
  const [tables, setTables] = useState<Table[]>([]);
  const [zones, setZones] = useState<string[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>("all");
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTables = useCallback(async () => {
    try {
      const url = selectedZone === "all"
        ? "/api/ordering/tables"
        : `/api/ordering/tables?zone=${encodeURIComponent(selectedZone)}`;
      const res = await fetch(url);
      const data = await res.json();
      setTables(data.tables || []);
      setZones(data.zones || []);
    } catch (e) {
      console.error("Failed to fetch tables", e);
    }
  }, [selectedZone]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/ordering/stats");
      setStats(await res.json());
    } catch (e) { /* ignore */ }
  }, []);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch("/api/ordering/menu");
      const data = await res.json();
      setMenuItems(data.items || []);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchTables(), fetchStats(), fetchMenu()]).then(() => setLoading(false));
    const interval = setInterval(() => { fetchTables(); fetchStats(); }, 15000);
    return () => clearInterval(interval);
  }, [fetchTables, fetchStats, fetchMenu]);

  const selectTable = async (table: Table) => {
    setSelectedTable(table);
    if (table.current_order_id) {
      try {
        const res = await fetch(`/api/ordering/orders/${table.current_order_id}`);
        if (res.ok) setCurrentOrder(await res.json());
      } catch (e) { /* ignore */ }
    } else {
      setCurrentOrder(null);
    }
  };

  const createOrder = async (table: Table) => {
    try {
      const res = await fetch("/api/ordering/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_id: table.id,
          order_type: "dine_in",
          server_name: "Floor Staff",
          items: [],
        }),
      });
      const order = await res.json();
      setCurrentOrder(order);
      fetchTables();
    } catch (e) {
      console.error("Failed to create order", e);
    }
  };

  const addItemToOrder = async (menuItem: any) => {
    if (!currentOrder) return;
    try {
      const res = await fetch(`/api/ordering/orders/${currentOrder.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{
            menu_item_id: menuItem.id,
            name: menuItem.name,
            quantity: 1,
            price: menuItem.price || 0,
          }],
        }),
      });
      if (res.ok) setCurrentOrder(await res.json());
    } catch (e) {
      console.error("Failed to add item", e);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await fetch(`/api/ordering/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchTables();
      fetchStats();
      if (status === "closed" || status === "cancelled") {
        setCurrentOrder(null);
        setSelectedTable(null);
      }
    } catch (e) {
      console.error("Failed to update order", e);
    }
  };

  const filteredMenu = menuItems.filter((item) =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTables = tables;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4" />
          <p className="text-sm text-muted-foreground">Loading table layout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full" data-testid="table-ordering">
      {/* Left: Table Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Stats Bar */}
        {stats && (
          <div className="flex gap-3 p-4 border-b border-border/40 bg-muted/20">
            <StatCard
              icon={<Utensils className="w-4 h-4" />}
              label="Tables"
              value={`${stats.tables.occupied}/${stats.tables.total}`}
              sub="occupied"
            />
            <StatCard
              icon={<Clock className="w-4 h-4" />}
              label="Active Orders"
              value={stats.orders.active}
              sub="in progress"
            />
            <StatCard
              icon={<DollarSign className="w-4 h-4" />}
              label="Revenue"
              value={`$${stats.orders.revenue?.toFixed(2) || "0.00"}`}
              sub="today"
            />
            <StatCard
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="Closed"
              value={stats.orders.closed}
              sub="orders"
            />
          </div>
        )}

        {/* Zone Filter */}
        <div className="flex items-center gap-2 p-3 border-b border-border/30">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <button
            onClick={() => setSelectedZone("all")}
            className={cn(
              "px-3 py-1 text-xs rounded-full transition-colors",
              selectedZone === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            All
          </button>
          {zones.map((z) => (
            <button
              key={z}
              onClick={() => setSelectedZone(z)}
              className={cn(
                "px-3 py-1 text-xs rounded-full transition-colors",
                selectedZone === z
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              {z}
            </button>
          ))}
          <button
            onClick={() => { fetchTables(); fetchStats(); }}
            className="ml-auto p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Table Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {filteredTables.map((table) => (
              <button
                key={table.id}
                data-testid={`table-${table.number}`}
                onClick={() => selectTable(table)}
                className={cn(
                  "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 min-h-[90px]",
                  STATUS_COLORS[table.status] || "bg-muted border-border",
                  selectedTable?.id === table.id && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
              >
                <span className="text-lg font-bold">{table.number}</span>
                <span className="text-[10px] opacity-70 mt-0.5">{table.zone}</span>
                <div className="flex items-center gap-1 mt-1">
                  <Users className="w-3 h-3 opacity-60" />
                  <span className="text-[10px]">{table.capacity}</span>
                </div>
                <span className="text-[9px] uppercase tracking-wider mt-1 opacity-80">{table.status}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Order Panel */}
      <div className="w-[340px] border-l border-border/40 flex flex-col bg-muted/10">
        {selectedTable ? (
          <>
            <div className="p-4 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedTable.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedTable.zone} &middot; {selectedTable.capacity} seats &middot; {selectedTable.status}
                  </p>
                </div>
                <button onClick={() => { setSelectedTable(null); setCurrentOrder(null); }} className="p-1 hover:bg-muted rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {currentOrder ? (
              <>
                {/* Order Status */}
                <div className="p-3 border-b border-border/30">
                  <div className="flex items-center justify-between">
                    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", ORDER_STATUS_COLORS[currentOrder.status])}>
                      {currentOrder.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {currentOrder.items.length} items
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="flex-1 overflow-auto p-3 space-y-2">
                  {currentOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-border/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          x{item.quantity} @ ${item.price.toFixed(2)}
                        </p>
                      </div>
                      <span className="text-sm font-medium ml-2">${item.line_total.toFixed(2)}</span>
                    </div>
                  ))}

                  {/* Add items from menu */}
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <div className="relative mb-2">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search menu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-border/40 bg-background/50 focus:outline-none focus:ring-1 focus:ring-primary"
                        data-testid="menu-search"
                      />
                    </div>
                    <div className="space-y-1 max-h-[200px] overflow-auto">
                      {filteredMenu.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => addItemToOrder(item)}
                          className="w-full flex items-center justify-between p-2 rounded-md text-sm hover:bg-muted/50 transition-colors"
                          data-testid={`menu-item-${item.id}`}
                        >
                          <span className="truncate">{item.name}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs text-muted-foreground">${item.price?.toFixed(2) || "0.00"}</span>
                            <Plus className="w-3.5 h-3.5 text-primary" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Order Total & Actions */}
                <div className="p-3 border-t border-border/40 space-y-2">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${currentOrder.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${currentOrder.tax.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-base"><span>Total</span><span>${currentOrder.total.toFixed(2)}</span></div>
                  </div>
                  <div className="flex gap-2">
                    {currentOrder.status === "open" && (
                      <button
                        onClick={() => updateOrderStatus(currentOrder.id, "submitted")}
                        className="flex-1 py-2 px-3 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        data-testid="submit-order-btn"
                      >
                        Submit to Kitchen
                      </button>
                    )}
                    {currentOrder.status === "submitted" && (
                      <button
                        onClick={() => updateOrderStatus(currentOrder.id, "preparing")}
                        className="flex-1 py-2 px-3 text-sm rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                      >
                        Mark Preparing
                      </button>
                    )}
                    {currentOrder.status === "preparing" && (
                      <button
                        onClick={() => updateOrderStatus(currentOrder.id, "ready")}
                        className="flex-1 py-2 px-3 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                      >
                        Ready to Serve
                      </button>
                    )}
                    {(currentOrder.status === "ready" || currentOrder.status === "served") && (
                      <button
                        onClick={() => updateOrderStatus(currentOrder.id, "closed")}
                        className="flex-1 py-2 px-3 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                        data-testid="close-order-btn"
                      >
                        Close Order
                      </button>
                    )}
                    <button
                      onClick={() => updateOrderStatus(currentOrder.id, "cancelled")}
                      className="py-2 px-3 text-sm rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <Utensils className="w-12 h-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No active order</p>
                <button
                  onClick={() => createOrder(selectedTable)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
                  data-testid="new-order-btn"
                >
                  <Plus className="w-4 h-4" />
                  New Order
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <Utensils className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Select a table to manage orders</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Tap any table on the grid</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: any; sub: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-background/50 border border-border/30">
      <div className="p-1.5 rounded-md bg-primary/10 text-primary">{icon}</div>
      <div>
        <p className="text-sm font-semibold leading-tight">{value}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}
