import React, { useState, useEffect, useCallback, useRef } from "react";

const API = window.location.origin;

/* ── Color Palette ── */
const T = {
  bg: "#faf9f7", card: "#ffffff", border: "#e8e4df", accent: "#1a1a2e",
  gold: "#b8860b", goldLight: "#f5ecd7", green: "#2d6a4f", greenLight: "#d4edda",
  red: "#c0392b", redLight: "#fde8e8", blue: "#2563eb", dim: "#6b7280",
  text: "#1a1a2e", muted: "#9ca3af", warm: "#8b7355",
};

/* ── Shared Components ── */
function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
      <div style={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.gold}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   AUTH SCREEN — Room Number + Last Name
   ═══════════════════════════════════════════════ */
function AuthScreen({ onAuth, S }: { onAuth: (token: string, room: string, name: string) => void; S: any }) {
  const [room, setRoom] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room.trim() || !lastName.trim()) { setError("Please enter both room number and last name."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/api/guest-order/auth`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_number: room.trim(), last_name: lastName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Authentication failed."); setLoading(false); return; }
      onAuth(data.token, data.room_number, data.guest_name);
    } catch { setError("Connection error. Please try again."); }
    setLoading(false);
  };

  return (
    <div data-testid="guest-auth-screen" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${S.bg} 0%, ${S.bg}ee 100%)`, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, background: S.card, borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.08)", padding: "48px 36px", textAlign: "center" }}>
        <div style={{ fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase", color: S.gold, fontWeight: 600, marginBottom: 8, fontFamily: `'${S.fontBody}', sans-serif` }}>{S.headerText}</div>
        <h1 style={{ fontSize: 28, fontWeight: 300, color: S.accent, margin: "0 0 8px", fontFamily: `'${S.fontHeading}', serif` }}>Welcome</h1>
        <p style={{ fontSize: 14, color: S.dim, marginBottom: 32, lineHeight: 1.5, fontFamily: `'${S.fontBody}', sans-serif` }}>Enter your room number and last name to begin ordering</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Room Number</label>
            <input data-testid="guest-room-input" value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. 412" autoFocus
              style={{ width: "100%", padding: "14px 16px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 18, fontWeight: 600, color: T.text, background: T.bg, outline: "none", textAlign: "center", letterSpacing: "0.1em", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", textAlign: "left", fontSize: 11, fontWeight: 600, color: T.dim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Last Name</label>
            <input data-testid="guest-name-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Smith"
              style={{ width: "100%", padding: "14px 16px", borderRadius: 10, border: `1.5px solid ${T.border}`, fontSize: 16, color: T.text, background: T.bg, outline: "none", textAlign: "center", boxSizing: "border-box" }} />
          </div>
          {error && <div data-testid="guest-auth-error" style={{ background: T.redLight, color: T.red, padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button data-testid="guest-auth-submit" type="submit" disabled={loading}
            style={{ width: "100%", padding: "14px 0", borderRadius: 10, border: "none", background: T.accent, color: "#fff", fontSize: 15, fontWeight: 600, cursor: loading ? "wait" : "pointer", letterSpacing: "0.05em", opacity: loading ? 0.7 : 1, transition: "opacity 0.2s" }}>
            {loading ? "Verifying..." : "Start Ordering"}
          </button>
        </form>
        <p style={{ fontSize: 11, color: T.muted, marginTop: 24 }}>Charges will be applied to your room folio</p>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════
   MENU & ORDERING SCREEN
   ═══════════════════════════════════════════════ */
interface CartItem { item_id: string; name: string; price: number; quantity: number; prep_time_mins: number; special_instructions?: string; }
interface MenuItem { id: string; name: string; category: string; subcategory: string; price: number; description: string; period: string; prep_time_mins: number; available_count: number | null; ordered_count: number; remaining: number | null; image_emoji: string; active: boolean; }
interface MenuData { current_period: { period_id: string; label: string; start_time?: string; end_time?: string }; all_periods: any[]; menu: Record<string, MenuItem[]>; total_items: number; }

function OrderingScreen({ token, room, guestName, onLogout, S }: { token: string; room: string; guestName: string; onLogout: () => void; S: any }) {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [confirmation, setConfirmation] = useState<any>(null);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [trackingData, setTrackingData] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMenu = useCallback(() => {
    fetch(`${API}/api/guest-order/menu?token=${token}`).then(r => r.json()).then((d: MenuData) => {
      setMenu(d);
      const cats = Object.keys(d.menu || {});
      if (cats.length > 0 && !activeCategory) setActiveCategory(cats[0]);
    });
  }, [token, activeCategory]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);
      if (existing) {
        if (item.remaining !== null && existing.quantity >= item.remaining) return prev;
        return prev.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item_id: item.id, name: item.name, price: item.price, quantity: 1, prep_time_mins: item.prep_time_mins }];
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setCart(prev => prev.map(c => c.item_id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setOrdering(true);
    try {
      const res = await fetch(`${API}/api/guest-order/order`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_number: room, guest_name: guestName, session_token: token, items: cart, special_instructions: specialInstructions }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.detail || "Order failed"); setOrdering(false); return; }
      setConfirmation(data);
      setCart([]);
      setSpecialInstructions("");
      setShowCart(false);
    } catch { alert("Connection error. Please try again."); }
    setOrdering(false);
  };

  // WebSocket + polling fallback for order status updates
  useEffect(() => {
    if (!confirmation?.order_id) return;

    // Initial fetch
    fetch(`${API}/api/guest-order/track/${confirmation.order_id}`)
      .then(r => r.json()).then(d => setTrackingData(d));

    // Try WebSocket for real-time updates
    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    try {
      const wsUrl = API.replace("https://", "wss://").replace("http://", "ws://") + "/ws";
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        ws?.send(JSON.stringify({ type: "subscribe", channel: "orders" }));
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "order_status_update" && msg.data?.order_id === confirmation.order_id) {
            // Instant update from WebSocket
            setTrackingData((prev: any) => prev ? {
              ...prev,
              status: msg.data.status,
              status_label: msg.data.status_label,
            } : prev);
          }
        } catch {}
      };
      ws.onerror = () => {
        // Fallback to polling if WebSocket fails
        if (!pollTimer) {
          pollTimer = setInterval(() => {
            fetch(`${API}/api/guest-order/track/${confirmation.order_id}`)
              .then(r => r.json()).then(d => setTrackingData(d)).catch(() => {});
          }, 5000);
        }
      };
    } catch {
      // Fallback to polling
      pollTimer = setInterval(() => {
        fetch(`${API}/api/guest-order/track/${confirmation.order_id}`)
          .then(r => r.json()).then(d => setTrackingData(d)).catch(() => {});
      }, 5000);
    }

    return () => {
      if (ws && ws.readyState <= 1) ws.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [confirmation?.order_id]);

  // Loading state
  if (!menu) return <div style={{ minHeight: "100vh", background: T.bg }}><Spinner /></div>;

  // ── Confirmation + Live Tracking Screen ──
  if (confirmation) {
    const status = trackingData?.status || "received";
    const steps = ["received", "preparing", "delivering", "delivered"];
    const stepIdx = steps.indexOf(status);
    const stepLabels: Record<string, string> = { received: "Received", preparing: "Preparing", delivering: "On the Way", delivered: "Delivered" };
    const stepIcons: Record<string, string> = { received: "📋", preparing: "👨‍🍳", delivering: "🚀", delivered: "✓" };

    return (
      <div data-testid="order-confirmation" style={{ minHeight: "100vh", background: S.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ width: "100%", maxWidth: 440, background: S.card, borderRadius: 20, boxShadow: "0 8px 40px rgba(0,0,0,0.08)", padding: "40px 32px", textAlign: "center" }}>
          {status === "delivered" ? (
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#d4edda", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>✓</div>
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: `${S.gold}20`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 28 }}>{stepIcons[status] || "📋"}</div>
          )}
          <h2 style={{ fontSize: 20, fontWeight: 300, color: S.accent, margin: "0 0 4px", fontFamily: `'${S.fontHeading}', serif` }}>
            {status === "delivered" ? "Enjoy Your Meal!" : trackingData?.status_label || "Order Confirmed"}
          </h2>
          <p style={{ fontSize: 13, color: S.dim, marginBottom: 24 }}>{confirmation.message}</p>

          {/* Progress Tracker */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, padding: "0 8px" }}>
            {steps.map((step, i) => {
              const active = i <= stepIdx;
              const current = i === stepIdx;
              return (
                <React.Fragment key={step}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: "0 0 auto" }}>
                    <div data-testid={`track-step-${step}`} style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: active ? (current ? S.gold : "#2d6a4f") : `${S.dim}20`,
                      color: active ? "#fff" : S.dim,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: active ? 14 : 12, fontWeight: 700,
                      transition: "all 0.3s",
                      boxShadow: current ? `0 0 0 3px ${S.gold}30` : "none",
                    }}>
                      {active ? (step === "delivered" ? "✓" : stepIcons[step]) : (i + 1)}
                    </div>
                    <span style={{ fontSize: 9, color: active ? S.text : S.dim, fontWeight: active ? 600 : 400, textTransform: "uppercase", letterSpacing: "0.04em" }}>{stepLabels[step]}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: i < stepIdx ? "#2d6a4f" : `${S.dim}20`, margin: "0 4px", marginBottom: 18, transition: "background 0.3s" }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Order Details */}
          <div style={{ background: S.bg, borderRadius: 12, padding: "14px 18px", marginBottom: 16, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: S.dim }}>Order ID</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: S.text, fontFamily: "monospace" }}>{confirmation.order_id}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: S.dim }}>Total</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: S.gold }}>${confirmation.total.toFixed(2)}</span>
            </div>
            {status !== "delivered" && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, color: S.dim }}>Est. Delivery</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#2d6a4f" }}>{confirmation.estimated_delivery_mins} min</span>
              </div>
            )}
          </div>

          {status !== "delivered" && (
            <div style={{ fontSize: 10, color: S.dim, marginBottom: 16, animation: "pulse 2s infinite" }}>
              Live tracking — updates every 5 seconds
              <style>{`@keyframes pulse { 0%,100% { opacity:0.6 } 50% { opacity:1 } }`}</style>
            </div>
          )}

          <button data-testid="order-again-btn" onClick={() => { setConfirmation(null); setTrackingData(null); loadMenu(); }}
            style={{ width: "100%", padding: "13px 0", borderRadius: 10, border: `1.5px solid ${S.accent}`, background: "transparent", color: S.accent, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Order More
          </button>
        </div>
      </div>
    );
  }

  const categories = Object.keys(menu.menu || {});
  const categoryLabels: Record<string, string> = { food: "Food & Dining", beverage: "Beverages", sundry: "Sundries", amenity: "Amenities" };
  const categoryIcons: Record<string, string> = { food: "🍽", beverage: "🥂", sundry: "🛍", amenity: "✨" };

  return (
    <div data-testid="guest-ordering-screen" style={{ minHeight: "100vh", background: S.bg, fontFamily: `'${S.fontBody}', -apple-system, BlinkMacSystemFont, sans-serif`, paddingBottom: cart.length > 0 ? 80 : 0 }}>
      {/* Header */}
      <div style={{ background: S.card, borderBottom: `1px solid ${S.bg === S.card ? '#e8e4df' : 'transparent'}`, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: S.gold, fontWeight: 600 }}>{S.headerText}</div>
              <div style={{ fontSize: 13, color: S.dim, marginTop: 2 }}>Room {room} · {guestName}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ background: S.goldLight, padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: S.gold }}>
                {menu.current_period.label}
              </div>
              <button data-testid="guest-logout-btn" onClick={onLogout} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${S.dim}30`, background: "transparent", color: S.dim, fontSize: 11, cursor: "pointer" }}>Exit</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px" }}>
        {/* Period info */}
        <div style={{ padding: "20px 0 12px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 300, color: S.accent, margin: 0, fontFamily: `'${S.fontHeading}', serif` }}>{menu.current_period.label} Menu</h2>
          {menu.current_period.start_time && (
            <p style={{ fontSize: 12, color: T.dim, margin: "4px 0 0" }}>
              Available {menu.current_period.start_time} – {menu.current_period.end_time} · {menu.total_items} items
            </p>
          )}
        </div>

        {/* Category Tabs */}
        <div ref={scrollRef} style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, WebkitOverflowScrolling: "touch" }}>
          {categories.map(cat => (
            <button key={cat} data-testid={`cat-tab-${cat}`} onClick={() => setActiveCategory(cat)}
              style={{
                padding: "8px 18px", borderRadius: 20, border: `1.5px solid ${activeCategory === cat ? S.accent : S.dim + '30'}`,
                background: activeCategory === cat ? S.accent : S.card, color: activeCategory === cat ? (S.bg.startsWith('#0') || S.bg.startsWith('#1') ? '#fff' : '#fff') : S.text,
                fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 6,
              }}>
              {S.showEmoji && <span>{categoryIcons[cat] || "📦"}</span>}
              {categoryLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1)}
              <span style={{ fontSize: 11, opacity: 0.7 }}>({(menu.menu[cat] || []).length})</span>
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div style={{ paddingTop: 8, paddingBottom: 24 }}>
          {(menu.menu[activeCategory] || []).map(item => {
            const inCart = cart.find(c => c.item_id === item.id);
            const lowStock = item.remaining !== null && item.remaining <= 3;
            const cardBg = S.cardStyle === "glass" ? `${S.card}cc` : S.card;
            const cardBorder = S.cardStyle === "bordered" ? `1.5px solid ${S.gold}30` : S.cardStyle === "flat" ? `1px solid transparent` : `1px solid ${S.dim}15`;
            const cardShadow = S.cardStyle === "elevated" ? "0 1px 4px rgba(0,0,0,0.03)" : S.cardStyle === "glass" ? "0 4px 16px rgba(0,0,0,0.06)" : "none";
            return (
              <div key={item.id} data-testid={`menu-item-${item.id}`}
                style={{ background: cardBg, borderRadius: S.borderRadius, marginBottom: 12, padding: "18px 20px", border: cardBorder, boxShadow: cardShadow, transition: "box-shadow 0.2s", backdropFilter: S.cardStyle === "glass" ? "blur(8px)" : undefined }}>
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  {S.showEmoji && <div style={{ fontSize: 32, lineHeight: 1 }}>{item.image_emoji}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: S.text }}>{item.name}</div>
                        {S.showDescription && <div style={{ fontSize: 12, color: S.dim, marginTop: 3, lineHeight: 1.4 }}>{item.description}</div>}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {item.price > 0 ? (
                          <div style={{ fontSize: 17, fontWeight: 700, color: S.accent }}>${item.price}</div>
                        ) : (
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#2d6a4f", background: "#d4edda", padding: "3px 10px", borderRadius: 10 }}>Complimentary</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {S.showPrepTime && <span style={{ fontSize: 11, color: S.muted }}>{item.prep_time_mins}min prep</span>}
                        {lowStock && <span style={{ fontSize: 10, fontWeight: 600, color: "#c0392b", background: "#fde8e8", padding: "2px 8px", borderRadius: 6 }}>Only {item.remaining} left</span>}
                      </div>
                      <div>
                        {!inCart ? (
                          <button data-testid={`add-${item.id}`} onClick={() => addToCart(item)}
                            style={{ padding: "7px 18px", borderRadius: 8, border: `1.5px solid ${T.accent}`, background: "transparent", color: T.accent, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s" }}>
                            Add
                          </button>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <button onClick={() => updateQty(item.id, -1)} style={{ width: 30, height: 30, borderRadius: 8, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                            <span style={{ fontSize: 15, fontWeight: 700, color: T.accent, minWidth: 20, textAlign: "center" }}>{inCart.quantity}</span>
                            <button onClick={() => addToCart(item)} style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: T.accent, color: "#fff", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart Footer */}
      {cart.length > 0 && !showCart && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200 }}>
          <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 20px 16px" }}>
            <button data-testid="view-cart-btn" onClick={() => setShowCart(true)}
              style={{ width: "100%", padding: "14px 20px", borderRadius: 14, border: "none", background: T.accent, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 20px rgba(26,26,46,0.3)" }}>
              <span>View Order ({cartCount} {cartCount === 1 ? "item" : "items"})</span>
              <span style={{ fontFamily: "monospace", fontSize: 17 }}>${cartTotal.toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={() => setShowCart(false)}>
          <div data-testid="cart-drawer" onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 680, background: T.card, borderRadius: "20px 20px 0 0", maxHeight: "85vh", overflow: "auto", boxShadow: "0 -4px 30px rgba(0,0,0,0.15)" }}>
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: T.accent, margin: 0 }}>Your Order</h3>
                <button onClick={() => setShowCart(false)} style={{ width: 32, height: 32, borderRadius: "50%", border: `1px solid ${T.border}`, background: T.bg, color: T.dim, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </div>
              <div style={{ fontSize: 12, color: T.dim, marginTop: 4 }}>Room {room} · {guestName}</div>
            </div>
            <div style={{ padding: "16px 24px" }}>
              {cart.map(item => (
                <div key={item.item_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: `1px solid ${T.border}30` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: T.dim }}>${item.price} each</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => updateQty(item.item_id, -1)} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 14, cursor: "pointer" }}>−</button>
                    <span style={{ fontSize: 14, fontWeight: 700, minWidth: 18, textAlign: "center" }}>{item.quantity}</span>
                    <button onClick={() => updateQty(item.item_id, 1)} style={{ width: 28, height: 28, borderRadius: 7, border: "none", background: T.accent, color: "#fff", fontSize: 14, cursor: "pointer" }}>+</button>
                    <span style={{ fontSize: 14, fontWeight: 600, color: T.accent, minWidth: 55, textAlign: "right" }}>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </div>
              ))}
              {/* Special Instructions */}
              <div style={{ marginTop: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: T.dim, textTransform: "uppercase", letterSpacing: "0.06em" }}>Special Instructions</label>
                <textarea data-testid="special-instructions" value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} placeholder="Allergies, preferences, delivery notes..."
                  style={{ width: "100%", marginTop: 6, padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 13, resize: "vertical", minHeight: 60, fontFamily: "inherit", boxSizing: "border-box" }} />
              </div>
              {/* Totals */}
              <div style={{ marginTop: 20, padding: "16px 0", borderTop: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: T.dim }}>Subtotal ({cartCount} items)</span>
                  <span style={{ fontSize: 13, color: T.text }}>${cartTotal.toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: T.muted }}>Charged to Room {room}</span>
                  <span style={{ fontSize: 11, color: T.muted }}>Tax & gratuity added at checkout</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: T.accent }}>Total</span>
                  <span style={{ fontSize: 20, fontWeight: 700, color: T.gold, fontFamily: "monospace" }}>${cartTotal.toFixed(2)}</span>
                </div>
              </div>
              <button data-testid="place-order-btn" onClick={placeOrder} disabled={ordering}
                style={{ width: "100%", padding: "16px 0", borderRadius: 12, border: "none", background: T.green, color: "#fff", fontSize: 16, fontWeight: 600, cursor: ordering ? "wait" : "pointer", opacity: ordering ? 0.7 : 1, marginTop: 8, letterSpacing: "0.03em", transition: "opacity 0.2s" }}>
                {ordering ? "Placing Order..." : `Place Order · $${cartTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════
   MAIN GUEST ORDERING APP
   ═══════════════════════════════════════════════ */
export default function GuestOrderingApp() {
  const [auth, setAuth] = useState<{ token: string; room: string; name: string } | null>(null);
  const [dynamicStyle, setDynamicStyle] = useState<any>(null);

  // Load menu styling from backend
  useEffect(() => {
    fetch(`${API}/api/guest-order/style`)
      .then(r => r.json())
      .then(s => {
        setDynamicStyle(s);
        // Inject Google Fonts dynamically
        const fontUrls = (s.fonts || []).filter((f: any) =>
          [s.font_heading, s.font_body, s.font_accent].includes(f.name)
        ).map((f: any) => f.url);
        fontUrls.forEach((url: string) => {
          if (!document.querySelector(`link[href="${url}"]`)) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = url;
            document.head.appendChild(link);
          }
        });
        // Apply dynamic colors to T
        if (s.color_background) T.bg = s.color_background;
        if (s.color_card) T.card = s.color_card;
        if (s.color_accent) T.accent = s.color_accent;
        if (s.color_gold) { T.gold = s.color_gold; T.goldLight = `${s.color_gold}20`; }
        if (s.color_text) T.text = s.color_text;
        if (s.color_muted) { T.muted = s.color_muted; T.dim = s.color_muted; }
      })
      .catch(() => {});
  }, []);

  const handleAuth = (token: string, room: string, name: string) => {
    setAuth({ token, room, name });
  };

  const handleLogout = () => {
    setAuth(null);
  };

  // Pass style info to components via a simple object
  const styleCtx = dynamicStyle || {};
  const fontHeading = styleCtx.font_heading || "Georgia";
  const fontBody = styleCtx.font_body || "Inter";
  const fontAccent = styleCtx.font_accent || "Great Vibes";
  const headerText = styleCtx.header_text || "In-Room Dining";
  const showEmoji = styleCtx.show_emoji !== false;
  const showPrepTime = styleCtx.show_prep_time !== false;
  const showDescription = styleCtx.show_description !== false;
  const borderRadius = styleCtx.border_radius || 14;
  const cardStyle = styleCtx.card_style || "elevated";

  // Override T colors if dynamic style loaded
  const S = {
    ...T,
    bg: styleCtx.color_background || T.bg,
    card: styleCtx.color_card || T.card,
    accent: styleCtx.color_accent || T.accent,
    gold: styleCtx.color_gold || T.gold,
    goldLight: `${styleCtx.color_gold || T.gold}20`,
    text: styleCtx.color_text || T.text,
    dim: styleCtx.color_muted || T.dim,
    muted: styleCtx.color_muted || T.muted,
    fontHeading, fontBody, fontAccent, headerText,
    showEmoji, showPrepTime, showDescription, borderRadius, cardStyle,
  };

  if (!auth) return <AuthScreen onAuth={handleAuth} S={S} />;
  return <OrderingScreen token={auth.token} room={auth.room} guestName={auth.name} onLogout={handleLogout} S={S} />;
}
