/**
 * IRDHubPanel — in-room dining + minibar command
 */
import React, { useEffect, useState } from "react";
import { Utensils, Wine, Package, RefreshCw, Clock, Plus } from "lucide-react";
import { useLiveEvents } from "@/hooks/useLiveEvents";

const ACCENT = "#c8a97e";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";

const fmt = (n: any, d = 0) => (typeof n === "number" ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : n ?? "—");

export default function IRDHubPanel() {
  const [kpis, setKpis] = useState<any>(null);
  const [orders, setOrders] = useState<any>(null);
  const [restock, setRestock] = useState<any>(null);
  const [menu, setMenu] = useState<any>(null);
  const [newRoom, setNewRoom] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});

  const load = async () => {
    const [k, o, r, m] = await Promise.all([
      fetch(`${API}/api/ird-hub/kpis`).then(r => r.json()),
      fetch(`${API}/api/ird-hub/orders?limit=30`).then(r => r.json()),
      fetch(`${API}/api/ird-hub/restock-queue`).then(r => r.json()),
      fetch(`${API}/api/ird-hub/menu`).then(r => r.json()),
    ]);
    setKpis(k); setOrders(o); setRestock(r); setMenu(m);
  };

  useEffect(() => {
    fetch(`${API}/api/ird-hub/seed`, { method: "POST" }).then(() => load());
    const iv = setInterval(load, 60_000);
    return () => clearInterval(iv);
  }, []);

  useLiveEvents(["ird.", "concierge."], () => load());
  
  const addItem = (id: string) => setSelectedItems(p => ({ ...p, [id]: (p[id] || 0) + 1 }));
  const removeItem = (id: string) => setSelectedItems(p => {
    const n = { ...p }; if (n[id] > 1) n[id]--; else delete n[id]; return n;
  });

  const submitOrder = async () => {
    if (!newRoom || Object.keys(selectedItems).length === 0) return;
    const items = Object.entries(selectedItems).map(([menu_id, qty]) => ({ menu_id, qty }));
    await fetch(`${API}/api/ird-hub/orders`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room_no: newRoom, items, delivery_eta_minutes: 30 }),
    }).then(r => r.json());
    setNewRoom(""); setSelectedItems({}); load();
  };

  const triggerRestock = async (room: string) => {
    await fetch(`${API}/api/ird-hub/minibar/${room}/restock`, { method: "POST" });
    load();
  };

  const statusColor = (s: string) => ({ received: AMBER, preparing: "#60a5fa", enroute: "#a855f7", delivered: GREEN, cancelled: "#64748b" }[s] || "#94a3b8");

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="ird-hub">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b flex-wrap gap-2" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em]" style={{ color: `${ACCENT}99` }}>IRD Ops</div>
          <div className="text-[22px] font-semibold text-white mt-0.5 tracking-tight">In-Room Dining & Minibar</div>
          <div className="text-[10px] text-white/40 mt-0.5">Orders · Delivery · Minibar restock queue · refresh every 1 min</div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px]"
          style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
          data-testid="ird-refresh">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {kpis && (
          <div className="grid grid-cols-6 gap-3" data-testid="ird-kpi-grid">
            <div className="rounded p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Orders 24h</div>
              <div className="text-[22px] font-semibold text-white">{kpis.orders_24h}</div>
            </div>
            <div className="rounded p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Revenue 24h</div>
              <div className="text-[22px] font-semibold" style={{ color: GREEN }}>${fmt(kpis.revenue_24h, 0)}</div>
            </div>
            <div className="rounded p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Avg Ticket</div>
              <div className="text-[22px] font-semibold text-white">${fmt(kpis.avg_ticket, 0)}</div>
            </div>
            <div className="rounded p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Avg Delivery</div>
              <div className="text-[22px] font-semibold text-white">{fmt(kpis.avg_delivery_minutes, 0)}m</div>
            </div>
            <div className="rounded p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Minibar Rev</div>
              <div className="text-[22px] font-semibold" style={{ color: GREEN }}>${fmt(kpis.minibar_revenue_24h, 0)}</div>
            </div>
            <div className="rounded p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
              <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Open Orders</div>
              <div className="text-[22px] font-semibold" style={{ color: AMBER }}>{kpis.open_orders}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {/* New order builder */}
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="ird-new-order">
            <div className="flex items-center gap-2 mb-2">
              <Plus size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>New Order</div>
            </div>
            <input value={newRoom} onChange={e => setNewRoom(e.target.value)} placeholder="Room #"
              className="w-full mb-2 px-2 py-1.5 text-[11px] rounded"
              style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, color: "white" }}
              data-testid="ird-room-input" />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {(menu?.items || []).map((m: any) => (
                <div key={m.id} className="flex items-center justify-between py-1 text-[10px] border-b border-white/5">
                  <span className="text-white">{m.name}</span>
                  <span style={{ color: "#94a3b8" }}>${m.price}</span>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => removeItem(m.id)} className="w-5 h-5 rounded text-white" style={{ background: "rgba(255,255,255,0.08)" }}>−</button>
                    <span className="text-white w-4 text-center">{selectedItems[m.id] || 0}</span>
                    <button onClick={() => addItem(m.id)} className="w-5 h-5 rounded text-white" style={{ background: `${ACCENT}40` }} data-testid={`add-${m.id}`}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={submitOrder} disabled={!newRoom || Object.keys(selectedItems).length === 0}
              className="mt-3 w-full py-2 rounded text-[11px] font-semibold"
              style={{ background: ACCENT, color: "#04060d", opacity: (!newRoom || Object.keys(selectedItems).length === 0) ? 0.5 : 1 }}
              data-testid="ird-submit-order">
              Submit Order
            </button>
          </div>

          {/* Order list */}
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="ird-orders">
            <div className="flex items-center gap-2 mb-2">
              <Utensils size={14} style={{ color: ACCENT }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Recent Orders</div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {(orders?.items || []).slice(0, 20).map((o: any) => (
                <div key={o.id} className="py-1.5 border-b border-white/5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white">#{o.room_no} · {o.ticket_no}</span>
                    <span style={{ color: statusColor(o.status) }}>{o.status}</span>
                  </div>
                  <div className="text-[9px]" style={{ color: "#64748b" }}>
                    ${o.subtotal} · {o.items?.length || 0} items · eta {new Date(o.delivery_eta).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Restock queue */}
          <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="ird-restock">
            <div className="flex items-center gap-2 mb-2">
              <Package size={14} style={{ color: AMBER }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>Minibar Restock ({restock?.count || 0})</div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {(restock?.items || []).slice(0, 20).map((r: any) => (
                <div key={r.room_no} className="py-1.5 border-b border-white/5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white">Room {r.room_no}</span>
                    <button onClick={() => triggerRestock(r.room_no)} className="px-2 py-0.5 rounded text-[9px]"
                      style={{ background: `${GREEN}22`, color: GREEN, border: `1px solid ${GREEN}40` }}
                      data-testid={`restock-${r.room_no}`}>
                      restock
                    </button>
                  </div>
                  <div className="text-[9px]" style={{ color: "#64748b" }}>{r.low_items.length} items low</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
