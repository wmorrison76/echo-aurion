import React, { useEffect, useState } from "react";
import { S, guestFetch, type Flash } from "../shared";

type IRDItem = { id: string; name: string; description?: string; price: number; category: string; tags?: string[]; allergens?: string[]; available?: boolean };
type OrderLine = { item_id: string; name: string; qty: number; price: number };

export function IRDView({ onBack, setTracker, flash }: { onBack: () => void; setTracker: (id: string) => void; flash: Flash }) {
  const [items, setItems] = useState<IRDItem[]>([]);
  const [cart, setCart] = useState<Record<string, OrderLine>>({});
  const [loading, setLoading] = useState(true);
  const [desiredTime, setDesiredTime] = useState("now");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await guestFetch("/api/guest-concierge/in-room-dining/menu");
        const j = await r.json();
        setItems(j.items || []);
      } finally { setLoading(false); }
    })();
  }, []);

  const add = (it: IRDItem) => setCart(c => {
    const line = c[it.id];
    return { ...c, [it.id]: { item_id: it.id, name: it.name, qty: (line?.qty || 0) + 1, price: it.price } };
  });
  const sub = (id: string) => setCart(c => {
    const line = c[id]; if (!line) return c;
    const next = { ...c };
    if (line.qty <= 1) delete next[id]; else next[id] = { ...line, qty: line.qty - 1 };
    return next;
  });
  const lines = Object.values(cart);
  const total = lines.reduce((s, l) => s + (l.qty * l.price), 0);

  async function submit() {
    if (!lines.length) return;
    setSubmitting(true);
    try {
      const r = await guestFetch("/api/guest-concierge/in-room-dining/order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, desired_time: desiredTime }),
      });
      const j = await r.json();
      if (!r.ok) { flash("err", j?.detail || "Failed"); return; }
      flash("ok", j.message || "Order received");
      setCart({});
      setTracker(j.order_id);
    } finally { setSubmitting(false); }
  }

  if (loading) return <div style={{ color: "#c8a97e", padding: 40, textAlign: "center" }}>Loading menu…</div>;

  const grouped: Record<string, IRDItem[]> = {};
  items.forEach(it => { (grouped[it.category] ||= []).push(it); });

  return (
    <section data-testid="ird-view" style={S.section}>
      <div style={S.viewHeader}>
        <button onClick={onBack} style={S.linkBtn}>← Back</button>
        <h2 style={{ ...S.h2, margin: 0 }}>In-Room Dining</h2>
      </div>
      <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 14px" }}>24h. Track your order like a pizza — live updates.</p>

      {Object.entries(grouped).map(([cat, list]) => (
        <div key={cat} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>{cat}</div>
          {list.map(it => {
            const qty = cart[it.id]?.qty || 0;
            return (
              <div key={it.id} data-testid={`ird-item-${it.id}`} style={{ ...S.venueCard, padding: 12, display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#f5efe4" }}>{it.name}</div>
                  {it.description && <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4 }}>{it.description}</div>}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    {(it.tags || []).map(t => <span key={t} style={S.chipGold}>{t}</span>)}
                    {(it.allergens || []).length > 0 && (
                      <span style={S.chipWarn}>⚠ {it.allergens!.join(", ")}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#c8a97e", fontWeight: 700, marginTop: 6 }}>${it.price.toFixed(2)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {qty > 0 && <button data-testid={`ird-sub-${it.id}`} onClick={() => sub(it.id)} style={S.qtyBtn}>−</button>}
                  {qty > 0 && <span style={{ fontSize: 14, fontWeight: 700, color: "#f5efe4", minWidth: 18, textAlign: "center" }}>{qty}</span>}
                  <button data-testid={`ird-add-${it.id}`} onClick={() => add(it)} style={S.qtyBtnGold}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {lines.length > 0 && (
        <div data-testid="ird-cart" style={{ ...S.venueCard, position: "sticky", bottom: 12, background: "rgba(10,14,26,0.95)", backdropFilter: "blur(10px)", borderColor: "rgba(200,169,126,0.4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700 }}>Your order · {lines.length} item{lines.length > 1 ? "s" : ""}</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f5efe4" }}>${total.toFixed(2)}</div>
          </div>
          <label style={{ ...S.label, marginTop: 4 }}>Deliver</label>
          <select data-testid="ird-when" value={desiredTime} onChange={e => setDesiredTime(e.target.value)} style={{ ...S.input, padding: "10px 12px" }}>
            <option value="now">As soon as possible</option>
            <option value="in 30 min">In 30 minutes</option>
            <option value="in 45 min">In 45 minutes</option>
            <option value="in 60 min">In an hour</option>
          </select>
          <button data-testid="ird-submit" disabled={submitting} onClick={submit} style={{ ...S.primaryBtn, marginTop: 12, opacity: submitting ? 0.6 : 1 }}>
            {submitting ? "Sending…" : `Send to kitchen · $${total.toFixed(2)}`}
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Domino's-style 4-stage tracker ───────────────────────────────────────
const IRD_STAGES: { key: string; label: string; emoji: string }[] = [
  { key: "received", label: "Received", emoji: "📋" },
  { key: "preparing", label: "Preparing", emoji: "👨‍🍳" },
  { key: "on-the-way", label: "On the way", emoji: "🛎" },
  { key: "delivered", label: "Delivered", emoji: "🎉" },
];

export function TrackerView({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      const r = await guestFetch(`/api/guest-concierge/in-room-dining/order/${orderId}`);
      if (!r.ok) { setErr(`Status ${r.status}`); return; }
      const j = await r.json(); setOrder(j.order);
    } catch (e: any) { setErr(e.message || "Network error"); }
  }
  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [orderId]);

  const stage = order?.stage || "received";
  const stageIdx = Math.max(0, IRD_STAGES.findIndex(s => s.key === stage));

  return (
    <section data-testid="ird-tracker" style={S.section}>
      <div style={S.viewHeader}>
        <button onClick={onBack} style={S.linkBtn}>← Back</button>
        <h2 style={{ ...S.h2, margin: 0 }}>Order #{orderId.slice(-6).toUpperCase()}</h2>
      </div>
      {err && <div style={S.errMsg}>{err}</div>}
      {!order && !err && <div style={{ color: "#94a3b8", fontSize: 12 }}>Loading…</div>}
      {order && (
        <>
          <div style={{ ...S.venueCard, padding: 18 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700, marginBottom: 4 }}>Estimated arrival</div>
            <div style={{ fontSize: 28, fontWeight: 200, color: "#f5efe4", letterSpacing: -0.5 }}>
              {order.eta ? new Date(order.eta).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Room {order.room} · ${Number(order.total || 0).toFixed(2)}</div>

            <div data-testid="tracker-stages" style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 22 }}>
              {IRD_STAGES.map((s, i) => {
                const done = i <= stageIdx;
                const active = i === stageIdx;
                return (
                  <React.Fragment key={s.key}>
                    <div data-testid={`stage-${s.key}`} style={{ flex: 1, textAlign: "center", opacity: done ? 1 : 0.35 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 999, margin: "0 auto",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: done ? "linear-gradient(135deg, #c8a97e, #e9d5a5)" : "rgba(255,255,255,0.05)",
                        color: done ? "#0a0e1a" : "#94a3b8",
                        fontSize: 20,
                        boxShadow: active ? "0 0 0 4px rgba(200,169,126,0.25)" : undefined,
                        animation: active ? "pulse 1.6s ease-in-out infinite" : undefined,
                      }}>{s.emoji}</div>
                      <div style={{ fontSize: 9, letterSpacing: 1.5, color: done ? "#f5efe4" : "#64748b", textTransform: "uppercase", fontWeight: 700, marginTop: 6 }}>{s.label}</div>
                    </div>
                    {i < IRD_STAGES.length - 1 && (
                      <div style={{ flex: 0.5, height: 2, background: i < stageIdx ? "#c8a97e" : "rgba(255,255,255,0.08)", marginTop: -16 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
            <style>{`@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }`}</style>
          </div>

          <div style={{ ...S.venueCard, marginTop: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700, marginBottom: 8 }}>Items</div>
            {(order.lines || []).map((l: any, i: number) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#f5efe4", padding: "6px 0", borderBottom: "1px dashed rgba(255,255,255,0.05)" }}>
                <span>{l.qty}× {l.name}</span>
                <span style={{ color: "#c8a97e" }}>${((l.price || 0) * (l.qty || 1)).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
