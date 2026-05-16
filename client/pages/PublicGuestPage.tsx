/**
 * Public Guest Ordering Page (iter263.4)
 * No-auth, mobile-first menu + ordering / booking-request flow.
 * Routes: /ird/:slug · /spa/:slug
 */
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API = window.location.origin;

export default function PublicGuestPage({ kind }: { kind: "ird" | "spa" }) {
  const params = useParams<{ slug?: string }>();
  const slug = params.slug || "main";
  const [menu, setMenu] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [room, setRoom] = useState("");
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState<any>(null);

  useEffect(() => {
    fetch(`${API}/api/${kind}-public/menu?slug=${slug}`)
      .then(r => r.json()).then(setMenu);
  }, [kind, slug]);

  if (!menu) return <div style={loading}>Loading menu…</div>;

  const submit = async () => {
    if (kind === "ird") {
      const items = cart.map(c => ({ item_id: c.id, name: c.name, qty: c.qty, unit_price: c.price || 0 }));
      const r = await fetch(`${API}/api/ird-public/order`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_no: room, guest_name: name, items, section: slug })
      });
      setSubmitted(await r.json());
    } else {
      const c = cart[0];
      if (!c) return;
      const r = await fetch(`${API}/api/spa-public/booking-request`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: name, room_no: room, service_id: c.id, service_name: c.name,
          duration_minutes: c.duration_minutes || 60, price: c.price,
          requested_for: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        })
      });
      setSubmitted(await r.json());
    }
  };

  if (submitted) {
    return (
      <div style={shell}>
        <div style={hero}>
          <h1>{kind === "ird" ? "Order received" : "Booking requested"}</h1>
          <p style={{ opacity: 0.8 }}>
            {kind === "ird"
              ? `Order ${submitted.order_id} · Room ${submitted.room_no}. Total $${submitted.grand_total?.toFixed(2)}${submitted.test_mode ? " (TEST)" : ""}.`
              : `Booking ${submitted.booking_id} · ${submitted.service_name}, ${submitted.duration_minutes}m at ${submitted.requested_for}.`}
          </p>
          <button onClick={() => { setSubmitted(null); setCart([]); }} style={primaryBtn}>← New order</button>
        </div>
      </div>
    );
  }

  // SPA preview supports categories with services[]; IRD with sections with items[]
  const categories = kind === "spa" ? (menu.categories || []) : (menu.sections || []);
  const totalPrice = cart.reduce((s, c) => s + (c.price || 0) * (c.qty || 1), 0);

  return (
    <div style={shell}>
      <div style={hero}>
        <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 2, textTransform: "uppercase" }}>{kind === "ird" ? "In-Room Dining" : "Spa & Wellness"}</div>
        <h1 style={{ margin: "6px 0 4px", fontSize: 32 }}>{menu.title}</h1>
        <div style={{ opacity: 0.7 }}>{menu.subtitle}</div>
        {menu._preview && <div style={{ marginTop: 8, fontSize: 11, color: "#facc15" }}>📋 PREVIEW — not yet published</div>}
      </div>

      {/* Guest info */}
      <div style={section}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input placeholder="Room no." value={room} onChange={e => setRoom(e.target.value)} data-testid="public-room" style={input} />
          <input placeholder="Your name (optional)" value={name} onChange={e => setName(e.target.value)} data-testid="public-name" style={input} />
        </div>
      </div>

      {categories.map((c: any) => (
        <div key={c.id} style={section}>
          <h2 style={{ color: "#c8a97e", margin: "0 0 4px" }}>{c.header || c.name}</h2>
          {c.availability && <div style={{ fontSize: 11, opacity: 0.6 }}>{c.availability}</div>}
          {c.description && <div style={{ fontSize: 12, opacity: 0.65 }}>{c.description}</div>}
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {(kind === "spa" ? c.services : c.items || []).map((it: any) => {
              const inCart = cart.find(x => x.id === it.id);
              const price = it.price || it.durations?.[0]?.price;
              const dur = it.durations?.[0]?.minutes;
              return (
                <div key={it.id} data-testid={`public-item-${it.id}`} style={card}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{it.name}</div>
                      {it.description && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{it.description}</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      {price !== undefined && <div style={{ fontWeight: 700, color: "#c8a97e", fontSize: 16 }}>${price}</div>}
                      {it.flat_price_label && !price && <div style={{ fontSize: 12, color: "#c8a97e" }}>{it.flat_price_label}</div>}
                      {dur && <div style={{ fontSize: 11, opacity: 0.6 }}>{dur} min</div>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {inCart ? (
                      <>
                        <button onClick={() => setCart(cart.map(x => x.id === it.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} style={iconBtn}>−</button>
                        <span style={{ alignSelf: "center" }}>{inCart.qty}</span>
                        <button onClick={() => setCart(cart.map(x => x.id === it.id ? { ...x, qty: x.qty + 1 } : x))} style={iconBtn}>+</button>
                        <button onClick={() => setCart(cart.filter(x => x.id !== it.id))} style={removeBtn}>Remove</button>
                      </>
                    ) : (
                      <button onClick={() => setCart([...cart, { id: it.id, name: it.name, price, qty: 1, duration_minutes: dur }])}
                        data-testid={`public-add-${it.id}`} style={addBtn}>
                        {kind === "ird" ? "Add to order" : "Request booking"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Sticky cart */}
      {cart.length > 0 && (
        <div style={cartBar}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>{cart.length} item{cart.length > 1 ? "s" : ""}</div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>${totalPrice.toFixed(2)}</div>
          </div>
          <button onClick={submit} disabled={!room} data-testid="public-submit" style={{ ...primaryBtn, opacity: room ? 1 : 0.5 }}>
            {kind === "ird" ? "Place order" : "Submit booking request"}
          </button>
        </div>
      )}
    </div>
  );
}

const shell: React.CSSProperties = { background: "#0a0e17", color: "#e2e8f0", minHeight: "100vh", padding: "0 0 120px", fontFamily: "system-ui, sans-serif" };
const hero: React.CSSProperties = { padding: "40px 24px 24px", background: "linear-gradient(180deg, rgba(200,169,126,0.18), transparent)" };
const section: React.CSSProperties = { padding: "20px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" };
const card: React.CSSProperties = { padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" };
const input: React.CSSProperties = { padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)", color: "white", fontSize: 14 };
const primaryBtn: React.CSSProperties = { padding: "12px 22px", borderRadius: 10, background: "#c8a97e", color: "#0b0f14", border: "none", fontWeight: 700, cursor: "pointer", fontSize: 14 };
const addBtn: React.CSSProperties = { padding: "8px 14px", borderRadius: 8, background: "transparent", border: "1px solid #c8a97e", color: "#c8a97e", fontWeight: 600, cursor: "pointer", fontSize: 12 };
const removeBtn: React.CSSProperties = { ...addBtn, borderColor: "#ef4444", color: "#ef4444" };
const iconBtn: React.CSSProperties = { width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "none", color: "white", cursor: "pointer", fontSize: 18 };
const cartBar: React.CSSProperties = { position: "fixed", left: 0, right: 0, bottom: 0, padding: 16, background: "rgba(10,14,23,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid #c8a97e", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 };
const loading: React.CSSProperties = { color: "white", padding: 40, textAlign: "center", background: "#0a0e17", minHeight: "100vh" };
