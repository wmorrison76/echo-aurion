import React, { useState, useEffect, useCallback } from "react";
import { RightClickMenu } from "@/lib/context-menu";
const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#f59e0b", accentDim: "rgba(245,158,11,0.12)", green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", purple: "#8b5cf6", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };
const fmt = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
function Badge({ text, color }: { text: string; color: string }) { return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>; }
type Tab = "dashboard" | "menu" | "minibar" | "orders" | "guest-platform";

function DashboardTab() {
  const [data, setData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  useEffect(() => {
    fetch(`${API}/api/ird/dashboard`).then(r => r.json()).then(setData);
    fetch(`${API}/api/guest-order/manager/alerts`).then(r => r.json()).then(d => setAlerts(d.alerts || []));
  }, []);
  const resetCount = (itemId: string, name: string) => {
    const count = prompt(`Reset count for "${name}". Enter new available count:`, "10");
    if (!count) return;
    fetch(`${API}/api/guest-order/manager/reset-count/${itemId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ available_count: parseInt(count) }) })
      .then(() => { setAlerts(prev => prev.filter(a => a.item_id !== itemId)); });
  };
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading...</div>;
  const k = data.kpis;
  return (
    <div data-testid="ird-dashboard">
      {alerts.length > 0 && (
        <div style={{ marginBottom: 16, background: `${C.red}10`, border: `1px solid ${C.red}30`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.red, marginBottom: 8, textTransform: "uppercase" }}>Sold-Out Alerts ({alerts.length})</div>
          {alerts.map((a: any) => (
            <div key={a.item_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.red}10` }}>
              <span style={{ fontSize: 12, color: C.text }}>{a.item_name} — <span style={{ color: C.red }}>SOLD OUT</span> ({a.ordered_count}/{a.available_count} ordered)</span>
              <button data-testid={`reset-${a.item_id}`} onClick={() => resetCount(a.item_id, a.item_name)} style={{ padding: "4px 12px", borderRadius: 5, border: `1px solid ${C.green}40`, background: "transparent", color: C.green, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Reset Count</button>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {[{ l: "Active Orders", v: k.active_orders }, { l: "Total Orders", v: k.total_orders }, { l: "IRD Revenue", v: fmt(k.ird_revenue) }, { l: "Minibar Revenue", v: fmt(k.minibar_revenue) }, { l: "Total Revenue", v: fmt(k.total_revenue) }, { l: "Menu Items", v: k.menu_items }].map(kpi => (
          <div key={kpi.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", flex: "1 1 130px", minWidth: 120 }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{kpi.l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>Recent Orders</div>
          {(data.recent_orders || []).slice(0, 5).map((o: any) => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
              <div><span style={{ fontSize: 11, color: C.text }}>Rm {o.room_number}</span> <Badge text={o.status} color={o.status === "received" ? C.amber : C.green} /> {o.source === "guest_ordering_platform" && <Badge text="QR" color={C.blue} />}</div>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.accent }}>{fmt(o.total)}</span>
            </div>
          ))}
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>Recent Minibar Charges</div>
          {(data.recent_charges || []).slice(0, 5).map((c: any) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
              <span style={{ fontSize: 11, color: C.text }}>Rm {c.room_number} — {c.item_name} x{c.quantity}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.amber }}>{fmt(c.total)}</span>
            </div>
          ))}
          {(data.recent_charges || []).length === 0 && <div style={{ fontSize: 10, color: C.dim }}>No charges yet</div>}
        </div>
      </div>
    </div>
  );
}

function MenuTab() {
  const [menu, setMenu] = useState<Record<string, any[]>>({});
  const [activeCat, setActiveCat] = useState("food");
  useEffect(() => { fetch(`${API}/api/ird/menu`).then(r => r.json()).then(d => setMenu(d.menu || {})); }, []);
  const catColors: Record<string, string> = { food: C.accent, beverage: C.blue, amenity: C.green, sundry: C.purple };
  return (
    <div data-testid="ird-menu">
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {Object.keys(menu).map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${activeCat === cat ? catColors[cat] || C.accent : C.border}`, background: activeCat === cat ? `${catColors[cat] || C.accent}15` : "transparent", color: activeCat === cat ? catColors[cat] || C.accent : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{cat} ({(menu[cat] || []).length})</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {(menu[activeCat] || []).map((item: any) => (
          <div key={item.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.name}</div>
              {item.price > 0 && <span style={{ fontSize: 16, fontWeight: 700, color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>${item.price}</span>}
              {item.price === 0 && <Badge text="Complimentary" color={C.green} />}
            </div>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 6 }}>{item.description}</div>
            <div style={{ fontSize: 9, color: C.muted }}>Available: {item.available_hours} | Prep: {item.prep_time_mins}m</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MinibarTab() {
  const [room, setRoom] = useState("412");
  const [data, setData] = useState<any>(null);
  const load = () => { fetch(`${API}/api/ird/minibar/${room}`).then(r => r.json()).then(setData); };
  useEffect(() => { load(); }, [room]);
  const consume = (itemId: string) => { fetch(`${API}/api/ird/minibar/consume`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ room_number: room, item_id: itemId, quantity: 1 }) }).then(() => load()); };
  const catColors: Record<string, string> = { water: "#06b6d4", soda: C.green, energy: C.amber, beer: "#f59e0b", wine: "#8b5cf6", spirits: C.red, snacks: "#ec4899" };
  if (!data) return null;
  return (
    <div data-testid="ird-minibar">
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: C.dim }}>Room:</span>
        <input value={room} onChange={e => setRoom(e.target.value)} style={{ width: 80, padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13, fontWeight: 700 }} data-testid="minibar-room-input" />
        <button onClick={load} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.accent}`, background: "transparent", color: C.accent, fontSize: 11, cursor: "pointer" }}>Load</button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 14, fontWeight: 700, color: C.amber, fontFamily: "'IBM Plex Mono', monospace" }}>Charges: {fmt(data.total_charges)}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
        {(data.inventory || []).map((item: any) => (
          <div key={item.id} style={{ background: C.card, border: `1px solid ${item.current_qty === 0 ? C.red : C.border}40`, borderRadius: 8, padding: 12, borderLeft: `3px solid ${catColors[item.category] || C.dim}` }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4 }}>{item.name}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: item.current_qty === 0 ? C.red : C.dim }}>{item.current_qty}/{item.par_level}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.accent }}>${item.price}</span>
            </div>
            {item.current_qty > 0 && <button onClick={() => consume(item.item_id)} style={{ marginTop: 4, width: "100%", padding: "2px 6px", borderRadius: 3, border: `1px solid ${C.green}30`, background: "transparent", color: C.green, fontSize: 8, cursor: "pointer" }}>Charge (consumed)</button>}
            {item.current_qty === 0 && <div style={{ marginTop: 4, fontSize: 9, color: C.red, textAlign: "center" }}>EMPTY — needs replenish</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const load = () => { fetch(`${API}/api/ird/orders`).then(r => r.json()).then(d => setOrders(d.orders || [])); };
  useEffect(() => { load(); }, []);
  const updateOrderStatus = (id: string, status: string) => { fetch(`${API}/api/ird/orders/${id}/status?status=${status}`, { method: "PUT" }).then(() => load()); };
  const statusColors: Record<string, string> = { received: C.amber, preparing: C.blue, delivering: C.purple, delivered: C.green, cancelled: C.red };
  return (
    <div data-testid="ird-orders">
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: "rgba(245,158,11,0.06)" }}>{["Order ID", "Room", "Guest", "Type", "Items", "Total", "Status", "ETA"].map(h => <th key={h} style={{ padding: "10px 10px", textAlign: "left", color: C.accent, fontWeight: 600, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {orders.map(o => {
              const orderCtx = [
                ...(o.status !== "preparing" ? [{ label: "Mark Preparing", icon: "🍳", action: () => updateOrderStatus(o.id, "preparing"), color: C.blue }] : []),
                ...(o.status !== "delivering" ? [{ label: "Out for Delivery", icon: "🚀", action: () => updateOrderStatus(o.id, "delivering"), color: C.purple }] : []),
                ...(o.status !== "delivered" ? [{ label: "Mark Delivered", icon: "✓", action: () => updateOrderStatus(o.id, "delivered"), color: C.green }] : []),
                { label: "divider", divider: true, action: () => {} },
                ...(o.status !== "cancelled" ? [{ label: "Cancel Order", icon: "✕", action: () => updateOrderStatus(o.id, "cancelled"), color: C.red }] : []),
              ];
              return (
              <RightClickMenu key={o.id} items={orderCtx}>
              <tr style={{ borderBottom: `1px solid ${C.border}40`, cursor: "context-menu" }}>
                <td style={{ padding: "8px 10px", color: C.muted, fontFamily: "'IBM Plex Mono', monospace", fontSize: 10 }}>{o.id}</td>
                <td style={{ padding: "8px 10px", color: C.text, fontWeight: 600 }}>{o.room_number}</td>
                <td style={{ padding: "8px 10px", color: C.text }}>{o.guest_name}</td>
                <td style={{ padding: "8px 10px" }}><Badge text={o.order_type || "food"} color={C.blue} /></td>
                <td style={{ padding: "8px 10px", color: C.dim }}>{(o.items || []).length} items</td>
                <td style={{ padding: "8px 10px", color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(o.total)}</td>
                <td style={{ padding: "8px 10px" }}><Badge text={o.status} color={statusColors[o.status] || C.dim} /></td>
                <td style={{ padding: "8px 10px", color: C.dim }}>{o.estimated_delivery_mins}m</td>
              </tr>
              </RightClickMenu>
              );
            })}
            {orders.length === 0 && <tr><td colSpan={8} style={{ padding: 20, textAlign: "center", color: C.dim }}>No orders yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Guest Platform Manager Tab ── */
function GuestPlatformTab() {
  const [subTab, setSubTab] = useState<"overview" | "designer" | "items">("overview");
  const [periods, setPeriods] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [style, setStyle] = useState<any>(null);
  const [fonts, setFonts] = useState<any[]>([]);
  const [layouts, setLayouts] = useState<Record<string, any>>({});
  const [seasonal, setSeasonal] = useState<Record<string, any>>({});

  const qrUrl = `${window.location.origin}/guest-order`;

  const loadAll = useCallback(() => {
    fetch(`${API}/api/guest-order/manager/periods`).then(r => r.json()).then(d => setPeriods(d.periods || []));
    fetch(`${API}/api/guest-order/manager/menu`).then(r => r.json()).then(d => setMenuItems(d.items || []));
    fetch(`${API}/api/guest-order/manager/alerts`).then(r => r.json()).then(d => setAlerts(d.alerts || []));
    fetch(`${API}/api/guest-order/manager/style`).then(r => r.json()).then(d => { setStyle(d.current || {}); setFonts(d.fonts || []); setLayouts(d.layouts || {}); setSeasonal(d.seasonal || {}); });
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const updatePeriod = (p: any, field: string, value: string) => {
    const updated = { ...p, [field]: value };
    fetch(`${API}/api/guest-order/manager/periods/${p.period_id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) })
      .then(() => loadAll());
  };

  const resetCount = (itemId: string, name: string) => {
    const count = prompt(`Reset count for "${name}". Enter new available count:`, "10");
    if (!count) return;
    fetch(`${API}/api/guest-order/manager/reset-count/${itemId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ available_count: parseInt(count) }) })
      .then(() => loadAll());
  };

  const updateItemCount = (itemId: string) => {
    const count = prompt("Set available count (leave empty for unlimited):");
    if (count === null) return;
    const val = count === "" ? null : parseInt(count);
    fetch(`${API}/api/guest-order/manager/menu/${itemId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ available_count: val }) })
      .then(() => loadAll());
  };

  const toggleItem = (itemId: string, active: boolean) => {
    fetch(`${API}/api/guest-order/manager/menu/${itemId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) })
      .then(() => loadAll());
  };

  const updateStyle = (updates: Record<string, any>) => {
    const newStyle = { ...style, ...updates };
    setStyle(newStyle);
    fetch(`${API}/api/guest-order/manager/style`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newStyle) });
  };

  const applyPreset = (layout: string) => {
    fetch(`${API}/api/guest-order/manager/style/preset/${layout}`, { method: "POST" })
      .then(r => r.json()).then(d => { setStyle(d); });
  };

  const periodLabels: Record<string, string> = { breakfast: "Breakfast", all_day: "All Day", overnight: "Overnight" };

  const subTabs = [
    { id: "overview" as const, label: "QR & Periods" },
    { id: "designer" as const, label: "Menu Designer" },
    { id: "items" as const, label: "Menu Items" },
  ];

  return (
    <div data-testid="guest-platform-tab">
      {/* Sub-navigation */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)} data-testid={`gp-sub-${t.id}`}
            style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${subTab === t.id ? C.accent : C.border}`, background: subTab === t.id ? C.accentDim : "transparent", color: subTab === t.id ? C.accent : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{t.label}</button>
        ))}
      </div>

      {/* ── Overview Sub-tab ── */}
      {subTab === "overview" && (<>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Guest Ordering QR Code</div>
          <div style={{ background: "#fff", borderRadius: 10, padding: 20, textAlign: "center", marginBottom: 12 }}>
            <img data-testid="qr-code-img" src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrUrl)}`} alt="QR Code" style={{ width: 180, height: 180 }} />
          </div>
          <div style={{ fontSize: 11, color: C.dim, textAlign: "center", marginBottom: 8, wordBreak: "break-all" }}>{qrUrl}</div>
          <button data-testid="copy-qr-url" onClick={() => { navigator.clipboard.writeText(qrUrl); }} style={{ width: "100%", padding: "8px 0", borderRadius: 6, border: `1px solid ${C.accent}`, background: "transparent", color: C.accent, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Copy Link</button>
        </div>

        {/* Alerts */}
        <div style={{ background: C.card, border: `1px solid ${alerts.length > 0 ? C.red : C.border}40`, borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: alerts.length > 0 ? C.red : C.accent, marginBottom: 12, textTransform: "uppercase" }}>
            Sold-Out Alerts ({alerts.length})
          </div>
          {alerts.length === 0 && <div style={{ fontSize: 12, color: C.dim, padding: 20, textAlign: "center" }}>No sold-out items</div>}
          {alerts.map((a: any) => (
            <div key={a.item_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}20` }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{a.item_name}</div>
                <div style={{ fontSize: 10, color: C.red }}>{a.ordered_count}/{a.available_count} ordered</div>
              </div>
              <button onClick={() => resetCount(a.item_id, a.item_name)} style={{ padding: "5px 12px", borderRadius: 5, border: `1px solid ${C.green}`, background: `${C.green}15`, color: C.green, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Reset Count</button>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Periods */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Menu Periods (Adjustable)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {periods.map(p => (
            <div key={p.period_id} style={{ background: C.bg, borderRadius: 8, padding: 14, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 8 }}>{p.label}</div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input data-testid={`period-start-${p.period_id}`} defaultValue={p.start_time} style={{ width: 70, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 12, textAlign: "center" }}
                  onBlur={e => updatePeriod(p, "start_time", e.target.value)} />
                <span style={{ fontSize: 11, color: C.dim }}>to</span>
                <input data-testid={`period-end-${p.period_id}`} defaultValue={p.end_time} style={{ width: 70, padding: "4px 8px", borderRadius: 4, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 12, textAlign: "center" }}
                  onBlur={e => updatePeriod(p, "end_time", e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      </div>
      </>)}

      {/* ── Designer Sub-tab ── */}
      {subTab === "designer" && style && (<>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Left: Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Layout Presets */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>Layout Presets</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.keys(layouts).map(key => (
                <button key={key} data-testid={`preset-${key}`} onClick={() => applyPreset(key)}
                  style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${style.layout === key ? C.accent : C.border}`, background: style.layout === key ? C.accentDim : "transparent", color: style.layout === key ? C.accent : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer", textTransform: "capitalize" }}>{key.replace("_", " ")}</button>
              ))}
            </div>
          </div>

          {/* Seasonal Templates */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 4, textTransform: "uppercase" }}>Seasonal Templates</div>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 10 }}>One-click holiday themes for marketing promotions</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {Object.keys(seasonal).map(key => {
                const labels: Record<string, string> = { valentines: "Valentine's", new_years: "New Year's", thanksgiving: "Thanksgiving", christmas: "Christmas", summer: "Summer", mothers_day: "Mother's Day" };
                const icons: Record<string, string> = { valentines: "♥", new_years: "✦", thanksgiving: "🍂", christmas: "❄", summer: "☀", mothers_day: "❀" };
                return (
                <button key={key} data-testid={`seasonal-${key}`} onClick={() => applyPreset(key)}
                  style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${style.layout === key ? C.accent : C.border}`, background: style.layout === key ? C.accentDim : "transparent", color: style.layout === key ? C.accent : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
                  {icons[key] || "•"} {labels[key] || key.replace("_", " ")}
                </button>
                );
              })}
            </div>
          </div>

          {/* Typography */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>Typography</div>
            {[{ label: "Heading Font", key: "font_heading", filter: ["serif", "sans-serif"] },
              { label: "Body Font", key: "font_body", filter: ["sans-serif", "serif"] },
              { label: "Accent Font (Artistic)", key: "font_accent", filter: ["script"] },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.06em" }}>{f.label}</div>
                <select data-testid={`font-${f.key}`} value={style[f.key] || ""} onChange={e => updateStyle({ [f.key]: e.target.value })}
                  style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }}>
                  {fonts.filter((fn: any) => f.filter.includes(fn.category)).map((fn: any) => (
                    <option key={fn.name} value={fn.name}>{fn.name} ({fn.style})</option>
                  ))}
                  {f.key === "font_accent" && fonts.filter((fn: any) => fn.category === "script").length === 0 && <option>Great Vibes</option>}
                </select>
                <div style={{ fontSize: 16, marginTop: 4, fontFamily: `'${style[f.key]}', serif`, color: C.text }}>{style[f.key]}</div>
              </div>
            ))}
          </div>

          {/* Colors */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>Colors</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[{ label: "Background", key: "color_background" }, { label: "Card", key: "color_card" }, { label: "Accent", key: "color_accent" }, { label: "Gold/Brand", key: "color_gold" }, { label: "Text", key: "color_text" }, { label: "Muted", key: "color_muted" }].map(c => (
                <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="color" value={style[c.key] || "#000"} onChange={e => updateStyle({ [c.key]: e.target.value })}
                    style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, cursor: "pointer", padding: 0 }} />
                  <div>
                    <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase" }}>{c.label}</div>
                    <div style={{ fontSize: 10, color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{style[c.key]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Options */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>Display Options</div>
            {[{ label: "Show Food Emoji", key: "show_emoji" }, { label: "Show Prep Time", key: "show_prep_time" }, { label: "Show Description", key: "show_description" }].map(opt => (
              <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer" }}>
                <input type="checkbox" checked={style[opt.key] ?? true} onChange={e => updateStyle({ [opt.key]: e.target.checked })}
                  style={{ width: 14, height: 14, accentColor: C.accent }} />
                <span style={{ fontSize: 11, color: C.text }}>{opt.label}</span>
              </label>
            ))}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>Card Style</div>
              <div style={{ display: "flex", gap: 4 }}>
                {["elevated", "flat", "bordered", "glass"].map(s => (
                  <button key={s} onClick={() => updateStyle({ card_style: s })}
                    style={{ padding: "4px 10px", borderRadius: 4, border: `1px solid ${style.card_style === s ? C.accent : C.border}`, background: style.card_style === s ? C.accentDim : "transparent", color: style.card_style === s ? C.accent : C.dim, fontSize: 10, cursor: "pointer", textTransform: "capitalize" }}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>Border Radius: {style.border_radius}px</div>
              <input type="range" min="0" max="24" value={style.border_radius || 14} onChange={e => updateStyle({ border_radius: parseInt(e.target.value) })}
                style={{ width: "100%", accentColor: C.accent }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>Header Text</div>
              <input value={style.header_text || ""} onChange={e => updateStyle({ header_text: e.target.value })}
                style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} />
            </div>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, position: "sticky", top: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>Live Preview</div>
          <div data-testid="menu-preview" style={{ background: style.color_background, borderRadius: 10, padding: 20, border: `1px solid ${C.border}`, minHeight: 400 }}>
            {/* Preview Header */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: style.color_gold, fontFamily: `'${style.font_body}', sans-serif`, fontWeight: 600 }}>{style.header_text || "In-Room Dining"}</div>
              <div style={{ fontSize: 22, fontWeight: 300, color: style.color_accent, fontFamily: `'${style.font_heading}', serif`, marginTop: 4 }}>Breakfast Menu</div>
              {style.subheader_text && <div style={{ fontSize: 18, color: style.color_gold, fontFamily: `'${style.font_accent}', cursive`, marginTop: 4 }}>{style.subheader_text}</div>}
            </div>
            {/* Preview Items */}
            {[{ name: "Eggs Benedict", price: 24, desc: "Poached eggs, Canadian bacon, hollandaise", prep: 15, emoji: "🍳" },
              { name: "Continental Breakfast", price: 28, desc: "Pastries, fresh fruit, yogurt, juice, coffee", prep: 10, emoji: "🥐" },
              { name: "Avocado Toast", price: 18, desc: "Sourdough, smashed avocado, poached egg", prep: 12, emoji: "🥑" },
            ].map((item, i) => {
              const cardBg = style.card_style === "glass" ? `${style.color_card}cc` : style.color_card;
              const cardBorder = style.card_style === "bordered" ? `1.5px solid ${style.color_gold}30` : style.card_style === "flat" ? "none" : `1px solid ${style.color_muted}20`;
              const cardShadow = style.card_style === "elevated" ? "0 2px 8px rgba(0,0,0,0.06)" : style.card_style === "glass" ? "0 4px 16px rgba(0,0,0,0.08)" : "none";
              return (
              <div key={i} style={{ background: cardBg, borderRadius: style.border_radius, marginBottom: 10, padding: "12px 14px", border: cardBorder, boxShadow: cardShadow, backdropFilter: style.card_style === "glass" ? "blur(8px)" : undefined }}>
                <div style={{ display: "flex", gap: 10 }}>
                  {style.show_emoji && <span style={{ fontSize: 24 }}>{item.emoji}</span>}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: style.color_text, fontFamily: `'${style.font_body}', sans-serif` }}>{item.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: style.color_accent, fontFamily: "'IBM Plex Mono', monospace" }}>${item.price}</span>
                    </div>
                    {style.show_description && <div style={{ fontSize: 10, color: style.color_muted, marginTop: 2, fontFamily: `'${style.font_body}', sans-serif` }}>{item.desc}</div>}
                    {style.show_prep_time && <div style={{ fontSize: 9, color: style.color_muted, marginTop: 4 }}>{item.prep}min prep</div>}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          <div style={{ marginTop: 10, fontSize: 10, color: C.dim, textAlign: "center" }}>Changes auto-save and apply to the live guest ordering page</div>
        </div>
      </div>
      </>)}

      {/* ── Items Sub-tab ── */}
      {subTab === "items" && (<>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Guest Menu Items ({menuItems.length})</div>
        <div style={{ background: C.bg, borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "rgba(245,158,11,0.06)" }}>
                {["Item", "Period", "Price", "Available", "Ordered", "Remaining", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: C.accent, fontWeight: 600, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {menuItems.map((item: any) => (
                <tr key={item.id} style={{ borderBottom: `1px solid ${C.border}20`, opacity: item.active ? 1 : 0.4 }}>
                  <td style={{ padding: "6px 10px", color: C.text, fontWeight: 500 }}>{item.image_emoji} {item.name}</td>
                  <td style={{ padding: "6px 10px" }}><Badge text={periodLabels[item.period] || item.period} color={C.blue} /></td>
                  <td style={{ padding: "6px 10px", color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{item.price > 0 ? `$${item.price}` : "Free"}</td>
                  <td style={{ padding: "6px 10px", color: C.dim }}>{item.available_count ?? "∞"}</td>
                  <td style={{ padding: "6px 10px", color: C.dim }}>{item.ordered_count}</td>
                  <td style={{ padding: "6px 10px" }}>
                    {item.sold_out ? <Badge text="SOLD OUT" color={C.red} /> : <span style={{ color: C.green }}>{item.remaining ?? "∞"}</span>}
                  </td>
                  <td style={{ padding: "6px 10px" }}>
                    <button onClick={() => toggleItem(item.id, item.active)} style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${item.active ? C.green : C.red}30`, background: "transparent", color: item.active ? C.green : C.red, fontSize: 9, cursor: "pointer" }}>{item.active ? "Active" : "Hidden"}</button>
                  </td>
                  <td style={{ padding: "6px 10px", display: "flex", gap: 4 }}>
                    <button data-testid={`set-count-${item.id}`} onClick={() => updateItemCount(item.id)} style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.accent}30`, background: "transparent", color: C.accent, fontSize: 9, cursor: "pointer" }}>Set Count</button>
                    {item.sold_out && <button onClick={() => resetCount(item.id, item.name)} style={{ padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.green}`, background: `${C.green}15`, color: C.green, fontSize: 9, fontWeight: 600, cursor: "pointer" }}>Reset</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>)}
    </div>
  );
}


export default function MinibarIRD() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "menu", label: "IRD Menu" },
    { id: "minibar", label: "Minibar" },
    { id: "orders", label: "Orders" },
    { id: "guest-platform", label: "Guest Platform" },
  ];
  return (
    <div data-testid="minibar-ird-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(245,158,11,0.04)" }}>
        {tabs.map(t => (<button key={t.id} onClick={() => setTab(t.id)} data-testid={`ird-tab-${t.id}`} style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${tab === t.id ? C.accent : "transparent"}`, background: tab === t.id ? C.accentDim : "transparent", color: tab === t.id ? C.accent : C.dim, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t.label}</button>))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {tab === "dashboard" && <DashboardTab />}
        {tab === "menu" && <MenuTab />}
        {tab === "minibar" && <MinibarTab />}
        {tab === "orders" && <OrdersTab />}
        {tab === "guest-platform" && <GuestPlatformTab />}
      </div>
    </div>
  );
}
