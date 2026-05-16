/**
 * Commissary Ordering — iter265.
 *
 * Wires to the existing FastAPI commissary backend
 * (backend/routes/commissary.py — 2,000+ lines of catalog/orders/pars/recipes).
 * This panel surfaces the operator-facing flow: browse catalog → build cart
 * → submit order → track status.
 *
 * Backend endpoints used:
 *   GET  /api/commissary/catalog?outlet_id=&lane=
 *   POST /api/commissary/orders       (create)
 *   GET  /api/commissary/orders?outlet_id=
 *   POST /api/commissary/orders/{id}/status
 *   GET  /api/commissary/pars/below?outlet_id=
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, Plus, Minus, Trash2, Package, AlertTriangle, RefreshCw } from "lucide-react";

const API = `${import.meta.env.VITE_BACKEND_URL || ""}/api/commissary`;

interface Product {
  id: string;
  outlet_id: string;
  lane: string;
  name: string;
  unit: string;
  pack_size?: number;
  description?: string;
  category?: string;
  lead_time_days?: number;
}

interface CartItem {
  product_id: string;
  name: string;
  unit: string;
  qty: number;
}

interface Order {
  id: string;
  outlet_id: string;
  status: string;
  created_at: string;
  items: Array<{ product_id: string; qty: number; name?: string }>;
  total_lines?: number;
}

interface ParBelow {
  product_id: string;
  product_name: string;
  current: number;
  par: number;
  shortfall: number;
}

export default function CommissaryOrderingPanel() {
  const [outletId, setOutletId] = useState<string>("default");
  const [lane, setLane] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pars, setPars] = useState<ParBelow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const laneParam = lane === "all" ? "" : `&lane=${lane}`;
      const [pRes, oRes, parsRes] = await Promise.all([
        fetch(`${API}/catalog?outlet_id=${outletId}${laneParam}`).then((r) => r.json()),
        fetch(`${API}/orders?outlet_id=${outletId}`).then((r) => r.json()),
        fetch(`${API}/pars/below?outlet_id=${outletId}`).then((r) => r.json()).catch(() => ({ items: [] })),
      ]);
      setProducts(pRes.products || []);
      setOrders(oRes.orders || []);
      setPars(parsRes.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [outletId, lane]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q),
    );
  }, [products, search]);

  function addToCart(p: Product) {
    setCart((prev) => {
      const found = prev.find((i) => i.product_id === p.id);
      if (found) {
        return prev.map((i) => (i.product_id === p.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { product_id: p.id, name: p.name, unit: p.unit, qty: 1 }];
    });
  }

  function setQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product_id === productId ? { ...i, qty: Math.max(0, i.qty + delta) } : i,
        )
        .filter((i) => i.qty > 0),
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((i) => i.product_id !== productId));
  }

  async function submitOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outlet_id: outletId,
          lane: lane === "all" ? "banquet" : lane,
          items: cart.map((i) => ({ product_id: i.product_id, qty: i.qty })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Order failed: ${err.detail || res.statusText}`);
        return;
      }
      setCart([]);
      await refresh();
    } finally {
      setSubmitting(false);
    }
  }

  function addParsBelowToCart() {
    setCart((prev) => {
      const out = [...prev];
      for (const p of pars) {
        const existing = out.find((i) => i.product_id === p.product_id);
        if (existing) {
          existing.qty = Math.max(existing.qty, p.shortfall);
        } else {
          out.push({
            product_id: p.product_id,
            name: p.product_name,
            unit: "each",
            qty: p.shortfall,
          });
        }
      }
      return out;
    });
  }

  return (
    <div className="p-4 space-y-4" data-testid="commissary-ordering-panel">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Package className="h-6 w-6 text-amber-600" />
          Commissary Ordering
          {loading && <span className="text-xs text-muted-foreground">syncing…</span>}
        </h2>
        <div className="flex gap-2 items-center">
          <Select value={outletId} onValueChange={setOutletId}>
            <SelectTrigger className="w-40" data-testid="outlet-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Main Kitchen</SelectItem>
              <SelectItem value="pastry">Pastry</SelectItem>
              <SelectItem value="banquet">Banquet</SelectItem>
              <SelectItem value="bar">Bar</SelectItem>
            </SelectContent>
          </Select>
          <Select value={lane} onValueChange={setLane}>
            <SelectTrigger className="w-32" data-testid="lane-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All lanes</SelectItem>
              <SelectItem value="pastry">Pastry</SelectItem>
              <SelectItem value="banquet">Banquet</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={refresh} data-testid="commissary-refresh-btn">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Catalog */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="text-base">Catalog ({filtered.length})</span>
              <Input
                placeholder="Search products…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 h-8 text-sm"
                data-testid="catalog-search"
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[60vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                {products.length === 0
                  ? "No products in catalog. Use POST /api/commissary/products (admin token) to add."
                  : "No products match your search."}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-1">Name</th>
                    <th className="py-1">Lane</th>
                    <th className="py-1">Unit</th>
                    <th className="py-1">Lead</th>
                    <th className="py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr key={p.id} className="border-b last:border-0" data-testid={`product-row-${p.id}`}>
                      <td className="py-1">
                        <p className="font-medium">{p.name}</p>
                        {p.category && (
                          <p className="text-[10px] text-muted-foreground">{p.category}</p>
                        )}
                      </td>
                      <td className="py-1">
                        <Badge variant="outline">{p.lane}</Badge>
                      </td>
                      <td className="py-1">{p.unit}</td>
                      <td className="py-1 text-xs">
                        {p.lead_time_days ? `${p.lead_time_days}d` : "—"}
                      </td>
                      <td className="py-1 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => addToCart(p)}
                          data-testid={`add-to-cart-${p.id}`}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Cart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Cart ({cart.length})
              </span>
              {pars.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addParsBelowToCart}
                  className="text-xs"
                  data-testid="add-pars-to-cart"
                >
                  <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" />
                  +{pars.length} below par
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[50vh] overflow-y-auto">
            {cart.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Empty cart</p>
            ) : (
              cart.map((i) => (
                <div
                  key={i.product_id}
                  className="flex items-center justify-between text-sm border-b py-1"
                  data-testid={`cart-item-${i.product_id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{i.name}</p>
                    <p className="text-[10px] text-muted-foreground">{i.unit}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => setQty(i.product_id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{i.qty}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => setQty(i.product_id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-red-500"
                      onClick={() => removeFromCart(i.product_id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
          {cart.length > 0 && (
            <div className="px-4 pb-3">
              <Button
                className="w-full"
                onClick={submitOrder}
                disabled={submitting}
                data-testid="submit-order-btn"
              >
                {submitting ? "Submitting…" : `Submit Order (${cart.length} items)`}
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Order history */}
      <Card data-testid="orders-history-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Orders ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-1">Order ID</th>
                  <th className="py-1">Date</th>
                  <th className="py-1">Status</th>
                  <th className="py-1">Lines</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 10).map((o) => (
                  <tr key={o.id} className="border-b last:border-0" data-testid={`order-row-${o.id}`}>
                    <td className="py-1 font-mono text-xs">{o.id}</td>
                    <td className="py-1 text-xs">
                      {new Date(o.created_at).toLocaleString()}
                    </td>
                    <td className="py-1">
                      <Badge
                        variant={
                          o.status === "fulfilled" ? "default" : o.status === "submitted" ? "outline" : "secondary"
                        }
                      >
                        {o.status}
                      </Badge>
                    </td>
                    <td className="py-1">{o.items?.length ?? o.total_lines ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
