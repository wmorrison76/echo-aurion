import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Search, Plus, Minus, Trash2, Send, ArrowLeft,
  CheckCircle2, Clock, DollarSign, Truck, Package,
  ShoppingCart, AlertTriangle, Building2, ChevronRight
} from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  code: string;
  category: string;
  contact_email: string;
  delivery_days: string[];
  min_order: number;
  payment_terms: string;
  status: string;
  rating: number;
}

interface Ingredient {
  id: string;
  name: string;
  category: string;
  current_stock: number;
  par_level: number;
  unit: string;
  unit_cost: number;
  is_low_stock: boolean;
  stock_pct: number;
  supplier: string;
}

interface CartItem {
  ingredient_id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_price: number;
}

export default function VendorOrdering() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [inventory, setInventory] = useState<Ingredient[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/ordering/vendors");
      const data = await res.json();
      setVendors(data.vendors || []);
    } catch (e) { console.error("Failed to fetch vendors", e); }
  }, []);

  const fetchInventory = useCallback(async () => {
    try {
      const url = lowStockOnly ? "/api/ordering/on-hand?low_stock_only=true" : "/api/ordering/on-hand";
      const res = await fetch(url);
      const data = await res.json();
      setInventory(data.items || []);
    } catch (e) { console.error("Failed to fetch inventory", e); }
  }, [lowStockOnly]);

  const fetchRecentOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/ordering/vendor-orders?limit=10");
      const data = await res.json();
      setRecentOrders(data.orders || []);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([fetchVendors(), fetchInventory(), fetchRecentOrders()]).then(() => setLoading(false));
  }, [fetchVendors, fetchInventory, fetchRecentOrders]);

  const addToCart = (item: Ingredient) => {
    const parDelta = Math.max(item.par_level - item.current_stock, 1);
    setCart((prev) => {
      const existing = prev.find((c) => c.ingredient_id === item.id);
      if (existing) {
        return prev.map((c) => c.ingredient_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        ingredient_id: item.id,
        name: item.name,
        quantity: parDelta,
        unit: item.unit,
        unit_price: item.unit_cost,
      }];
    });
  };

  const updateQuantity = (ingredientId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => c.ingredient_id === ingredientId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (ingredientId: string) => {
    setCart((prev) => prev.filter((c) => c.ingredient_id !== ingredientId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const submitOrder = async () => {
    if (!selectedVendor || cart.length === 0) return;
    try {
      const res = await fetch("/api/ordering/vendor-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendor_id: selectedVendor.id,
          outlet_id: "main",
          items: cart.map((item) => ({
            ingredient_id: item.ingredient_id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
          })),
        }),
      });
      const order = await res.json();
      setOrderSubmitted(order);
      setCart([]);
      setShowCart(false);
      fetchRecentOrders();
    } catch (e) {
      console.error("Failed to submit order", e);
    }
  };

  const filteredInventory = inventory.filter((item) =>
    !searchTerm || item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Order confirmation
  if (orderSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center" data-testid="vendor-order-confirmation">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold mb-2">Purchase Order Created</h2>
        <p className="text-sm text-muted-foreground mb-1">
          {orderSubmitted.po_number}
        </p>
        <p className="text-xs text-muted-foreground mb-1">
          Vendor: {orderSubmitted.vendor_name}
        </p>
        <p className="text-2xl font-bold text-primary mb-4">
          ${orderSubmitted.total?.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          {orderSubmitted.items?.length} items &middot; Status: {orderSubmitted.status}
        </p>
        <button
          onClick={() => setOrderSubmitted(null)}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          data-testid="new-vendor-order-btn"
        >
          Place Another Order
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="vendor-ordering">
      {/* Header */}
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Vendor Ordering</h2>
          </div>
          <button
            onClick={() => setShowCart(true)}
            className="relative p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            data-testid="cart-btn"
          >
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </button>
        </div>

        {/* Vendor Selection */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {vendors.map((v) => (
            <button
              key={v.id}
              onClick={() => setSelectedVendor(v)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl border whitespace-nowrap text-sm transition-all",
                selectedVendor?.id === v.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/30 bg-background/50 hover:border-border/60 text-muted-foreground"
              )}
              data-testid={`vendor-${v.code}`}
            >
              <Building2 className="w-3.5 h-3.5" />
              {v.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/20">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search inventory items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border/40 bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            data-testid="vendor-search"
          />
        </div>
        <button
          onClick={() => { setLowStockOnly(!lowStockOnly); }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs whitespace-nowrap transition-colors border",
            lowStockOnly
              ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
              : "border-border/30 bg-background/50 text-muted-foreground hover:bg-muted/50"
          )}
          data-testid="low-stock-filter"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Low Stock
        </button>
      </div>

      {/* Inventory Items */}
      <div className="flex-1 overflow-auto p-4">
        {!selectedVendor && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Select a vendor above to start ordering</p>
          </div>
        )}

        {selectedVendor && (
          <>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium">{selectedVendor.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedVendor.category} &middot; {selectedVendor.payment_terms}
                  {selectedVendor.delivery_days.length > 0 && ` &middot; Delivery: ${selectedVendor.delivery_days.join(", ")}`}
                </p>
              </div>
              {selectedVendor.min_order > 0 && (
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full",
                  cartTotal >= selectedVendor.min_order
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                )}>
                  Min: ${selectedVendor.min_order.toFixed(0)} {cartTotal > 0 && `(${cartTotal >= selectedVendor.min_order ? "met" : `$${(selectedVendor.min_order - cartTotal).toFixed(0)} more`})`}
                </span>
              )}
            </div>

            <div className="space-y-2">
              {filteredInventory.map((item) => {
                const inCart = cart.find((c) => c.ingredient_id === item.id);
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all",
                      item.is_low_stock ? "border-amber-500/30 bg-amber-500/5" : "border-border/30 bg-background/50",
                      inCart && "border-primary/40 bg-primary/5"
                    )}
                    data-testid={`inventory-item-${item.id}`}
                  >
                    {/* Stock indicator */}
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{
                      background: `conic-gradient(${item.stock_pct > 60 ? '#22c55e' : item.stock_pct > 30 ? '#eab308' : '#ef4444'} ${item.stock_pct}%, transparent 0)`,
                    }}>
                      <div className="w-7 h-7 rounded-md bg-background flex items-center justify-center text-[9px] font-bold">
                        {Math.round(item.stock_pct)}%
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        On hand: {item.current_stock} {item.unit} &middot; Par: {item.par_level} {item.unit}
                        {item.is_low_stock && <span className="text-amber-400 ml-1">LOW</span>}
                      </p>
                      <p className="text-xs text-primary font-medium">${item.unit_cost.toFixed(2)}/{item.unit}</p>
                    </div>

                    {/* Add/Qty controls */}
                    {inCart ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-7 h-7 rounded-full border border-border/40 flex items-center justify-center hover:bg-muted/50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-bold w-8 text-center">{inCart.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
              {filteredInventory.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No items found</p>
              )}
            </div>

            {/* Recent POs */}
            {recentOrders.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border/30">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Recent Purchase Orders</h3>
                <div className="space-y-2">
                  {recentOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/20">
                      <div>
                        <p className="text-xs font-medium">{order.po_number}</p>
                        <p className="text-[10px] text-muted-foreground">{order.vendor_name} &middot; {order.items?.length} items</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${order.total?.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{order.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Cart Bar */}
      {cart.length > 0 && !showCart && (
        <div className="sticky bottom-0 p-3 border-t border-border/40 bg-background/95 backdrop-blur-sm">
          <button
            onClick={() => setShowCart(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            data-testid="view-cart-btn"
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Review Order ({cart.length} items)
            </span>
            <span className="font-bold">${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart Slide-Over */}
      {showCart && (
        <div className="fixed inset-0 z-[200] flex justify-end" data-testid="cart-panel">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-background border-l border-border/40 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border/40">
              <button onClick={() => setShowCart(false)} className="p-1 hover:bg-muted rounded">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="font-semibold">Purchase Order</h3>
              <span className="text-sm text-muted-foreground">{cart.length} items</span>
            </div>

            {selectedVendor && (
              <div className="p-3 border-b border-border/30 bg-muted/20">
                <p className="text-sm font-medium">{selectedVendor.name}</p>
                <p className="text-[10px] text-muted-foreground">{selectedVendor.payment_terms} &middot; {selectedVendor.category}</p>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {cart.map((item) => (
                <div key={item.ingredient_id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">${item.unit_price.toFixed(2)} / {item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQuantity(item.ingredient_id, -1)} className="w-6 h-6 rounded-full border border-border/40 flex items-center justify-center">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-bold w-8 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.ingredient_id, 1)} className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeFromCart(item.ingredient_id)} className="w-6 h-6 rounded-full text-red-400 hover:bg-red-500/10 flex items-center justify-center">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold w-16 text-right">
                    ${(item.unit_price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border/40 space-y-3">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${cartTotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax (8.5%)</span><span>${(cartTotal * 0.085).toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base pt-1 border-t border-border/30">
                  <span>Total</span><span>${(cartTotal * 1.085).toFixed(2)}</span>
                </div>
              </div>
              {selectedVendor && selectedVendor.min_order > 0 && cartTotal < selectedVendor.min_order && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-400 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Minimum order: ${selectedVendor.min_order.toFixed(0)} — need ${(selectedVendor.min_order - cartTotal).toFixed(2)} more
                </div>
              )}
              <button
                onClick={submitOrder}
                disabled={cart.length === 0 || !selectedVendor}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
                data-testid="submit-vendor-order-btn"
              >
                <Send className="w-4 h-4" />
                Create Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
