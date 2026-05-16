import React, { useState, useEffect } from "react";
import { RightClickMenu } from "@/lib/context-menu";
const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#8b5cf6", accentDim: "rgba(139,92,246,0.12)", green: "#10b981", red: "#ef4444", amber: "#f59e0b", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };
const fmt = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
function Badge({ text, color }: { text: string; color: string }) { return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>; }

export default function RetailOps() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/retail/dashboard`).then(r => r.json()).then(setData); }, []);
  if (!data) return <div data-testid="retail-ops-panel" style={{ height: "100%", background: C.bg, padding: 40, textAlign: "center", color: C.dim, borderRadius: 10 }}>Loading...</div>;
  const k = data.kpis;
  const catColors: Record<string, string> = { apparel: C.accent, souvenirs: C.amber, sundries: "#06b6d4", snacks: C.green, beverages: "#3b82f6", gifts: "#ec4899" };
  return (
    <div data-testid="retail-ops-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(139,92,246,0.04)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.accent }}>Retail Operations — Gift Shop</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {[{ l: "Items", v: k.total_items }, { l: "Revenue", v: fmt(k.total_revenue) }, { l: "Sales Today", v: k.total_sales }, { l: "Inventory Value", v: fmt(k.inventory_value) }, { l: "Low Stock", v: k.low_stock_items, c: k.low_stock_items > 0 ? C.red : C.green }, { l: "Avg Transaction", v: fmt(k.avg_transaction) }].map(kpi => (
            <div key={kpi.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", flex: "1 1 130px", minWidth: 120 }}>
              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{kpi.l}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: (kpi as any).c || C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Inventory</div>
            {(data.items || []).map((item: any) => {
              const itemCtx = [
                { label: "Record Sale", icon: "💳", action: () => { fetch(`${API}/api/retail/sales`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ item_id: item.id, item_name: item.name, quantity: 1, price: item.price }], payment_method: "credit_card" }) }).then(() => window.location.reload()); }, color: "#10b981" },
                { label: "Charge to Room", icon: "🏨", action: () => { const rm = prompt("Room number:"); if (rm) fetch(`${API}/api/retail/sales`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ item_id: item.id, item_name: item.name, quantity: 1, price: item.price }], payment_method: "room_charge", room_number: rm }) }).then(() => window.location.reload()); }, color: "#3b82f6" },
                { label: "divider", divider: true, action: () => {} },
                { label: "Adjust Stock (+5)", icon: "📦", action: () => { fetch(`${API}/api/retail/items/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qty_on_hand: item.qty_on_hand + 5 }) }).then(() => window.location.reload()); } },
                ...(item.qty_on_hand <= item.reorder_point ? [{ label: "Reorder Now", icon: "🔄", action: () => alert(`Reorder initiated for ${item.name}`), color: "#ef4444" }] : []),
              ];
              return (
              <RightClickMenu key={item.id} items={itemCtx}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}20`, cursor: "context-menu" }}>
                <div>
                  <span style={{ fontSize: 11, color: C.text }}>{item.name}</span>
                  <Badge text={item.category} color={catColors[item.category] || C.dim} />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 10, color: item.qty_on_hand <= item.reorder_point ? C.red : C.dim }}>{item.qty_on_hand} units</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.accent }}>{fmt(item.price)}</span>
                </div>
              </div>
              </RightClickMenu>
              );
            })}
          </div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Recent Sales</div>
            {(data.recent_sales || []).map((s: any) => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
                <div>
                  <div style={{ fontSize: 11, color: C.text }}>{(s.items || []).map((i: any) => i.item_name).join(", ")}</div>
                  <div style={{ fontSize: 9, color: C.dim }}>{s.payment_method} {s.room_number && `| Rm ${s.room_number}`}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.green, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(s.total)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
