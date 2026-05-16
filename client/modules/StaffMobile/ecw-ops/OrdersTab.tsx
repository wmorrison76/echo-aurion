/** iter225 · Orders Hub — redesigned per William's request.
 *
 * Hamburger (top-left) opens left-drawer nav:
 *   • Order Guide   — frequently-ordered items, quick re-order
 *   • Vendor Catalogs — browse supplier lines
 *   • Orders        — 5 sub-status tabs with search
 *   • Inventory     — back-reference to Inventory tab (with voice order)
 *
 * Each view has its own search bar.
 * Voice order entry: Web Speech API → parses "10 pounds chicken" → basket
 * Offline: failed requests queue to localStorage + flush on reconnect
 */
import React from "react";
import { API } from "@/lib/api-url";
import { VendorCompareModal } from "./VendorCompareModal";

type HubView = "order-guide" | "vendor-catalogs" | "orders" | "inventory" | "commissary" | "reconciliation" | "scorecards";
type OrderSubTab = "new" | "for-approval" | "placed" | "received" | "canceled";

export function OrdersTab({ outletId }: { outletId: string }) {
  const [view, setView] = React.useState<HubView>("orders");
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // Flush offline queue on mount
  React.useEffect(() => { void flushOfflineQueue(); }, []);

  return (
    <div data-testid="orders-hub-root" style={{ padding: 0, paddingBottom: 16 }}>
      {/* Sticky sub-header with hamburger */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        display: "flex", alignItems: "center", gap: 10,
        padding: "12px 16px", background: "rgba(10,14,26,0.95)",
        borderBottom: "1px solid rgba(200,169,126,0.15)",
      }}>
        <button data-testid="orders-hub-menu" onClick={() => setDrawerOpen(true)}
          style={{ background: "transparent", border: "1px solid rgba(200,169,126,0.3)",
                    color: "#c8a97e", padding: "6px 10px", borderRadius: 6,
                    fontSize: 14, cursor: "pointer" }}>☰</button>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#c8a97e", textTransform: "uppercase" }}>
            {view === "order-guide" ? "Order Guide" :
             view === "vendor-catalogs" ? "Vendor Catalogs" :
             view === "commissary" ? "Commissary" :
             view === "reconciliation" ? "Reconciliation" :
             view === "scorecards" ? "Vendor Scorecards" :
             view === "inventory" ? "Inventory (voice)" : "Orders"}
          </div>
          <h2 style={{ fontSize: 16, margin: "1px 0 0", fontWeight: 500 }}>
            {view === "orders" ? "Procurement" :
             view === "order-guide" ? "Quick reorder" :
             view === "commissary" ? "Internal transfer" :
             view === "reconciliation" ? "PO vs Invoice" :
             view === "scorecards" ? "Reliability" :
             view === "vendor-catalogs" ? "Suppliers" : "Walk-in count"}
          </h2>
        </div>
      </div>

      <OfflineBanner />

      <div style={{ padding: 16 }}>
        {view === "orders" && <OrdersView outletId={outletId} />}
        {view === "order-guide" && <OrderGuideView outletId={outletId} />}
        {view === "vendor-catalogs" && <VendorCatalogsView />}
        {view === "commissary" && <CommissaryView outletId={outletId} />}
        {view === "reconciliation" && <ReconciliationView outletId={outletId} />}
        {view === "scorecards" && <ScorecardsView outletId={outletId} />}
        {view === "inventory" && <InventoryVoiceView outletId={outletId} />}
      </div>

      {drawerOpen && (
        <Drawer onClose={() => setDrawerOpen(false)} current={view}
          onNavigate={(v) => { setView(v); setDrawerOpen(false); }} />
      )}
    </div>
  );
}

// ── Drawer ──────────────────────────────────────────────────────────────
function Drawer({ current, onNavigate, onClose }: {
  current: HubView; onNavigate: (v: HubView) => void; onClose: () => void;
}) {
  const entries: { key: HubView; emoji: string; label: string; sub: string }[] = [
    { key: "order-guide",     emoji: "📋", label: "Order Guide",     sub: "Quick reorder · favorites" },
    { key: "vendor-catalogs", emoji: "🏷️", label: "Vendor Catalogs", sub: "Browse supplier lines" },
    { key: "commissary",      emoji: "🏭", label: "Commissary",      sub: "Production · Pastry · Storeroom" },
    { key: "orders",          emoji: "🚚", label: "Orders",          sub: "Status tracker · receive" },
    { key: "reconciliation",  emoji: "📒", label: "Reconciliation",  sub: "PO vs invoice · accruals · EOM" },
    { key: "inventory",       emoji: "📦", label: "Inventory",       sub: "Voice count · walk-in safe" },
  ];
  return (
    <div data-testid="orders-hub-drawer" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9999998,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "80%", maxWidth: 320, height: "100%",
        background: "#0a0e1a", borderRight: "1px solid rgba(200,169,126,0.3)",
        padding: "20px 16px",
      }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#c8a97e",
                      textTransform: "uppercase", marginBottom: 12 }}>Orders Hub</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {entries.map((e) => (
            <button key={e.key}
              data-testid={`orders-hub-drawer-${e.key}`}
              onClick={() => onNavigate(e.key)}
              style={{
                padding: "12px 14px", textAlign: "left",
                background: current === e.key ? "rgba(200,169,126,0.12)" : "transparent",
                border: `1px solid ${current === e.key ? "rgba(200,169,126,0.4)" : "rgba(148,163,184,0.1)"}`,
                borderRadius: 8, color: "#f5efe4", cursor: "pointer",
              }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{e.emoji} {e.label}</div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{e.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Offline banner ──────────────────────────────────────────────────────
function OfflineBanner() {
  const [online, setOnline] = React.useState(navigator.onLine);
  const [qCount, setQCount] = React.useState(getOfflineQueue().length);
  React.useEffect(() => {
    const on = () => { setOnline(true); void flushOfflineQueue().then(() => setQCount(getOfflineQueue().length)); };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const t = setInterval(() => setQCount(getOfflineQueue().length), 4000);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); clearInterval(t); };
  }, []);
  if (online && qCount === 0) return null;
  return (
    <div data-testid="orders-offline-banner" style={{
      padding: "8px 16px", fontSize: 11,
      background: online ? "rgba(251,191,36,0.1)" : "rgba(244,63,94,0.12)",
      color: online ? "#fbbf24" : "#f43f5e",
      borderBottom: `1px solid ${online ? "rgba(251,191,36,0.3)" : "rgba(244,63,94,0.3)"}`,
    }}>
      {online ? `📡 Syncing ${qCount} queued order${qCount === 1 ? "" : "s"}…`
              : `🥶 Offline · ${qCount} order${qCount === 1 ? "" : "s"} will send on reconnect`}
    </div>
  );
}

// ── Orders sub-view (with 5 status tabs + search) ───────────────────────
function OrdersView({ outletId }: { outletId: string }) {
  const [sub, setSub] = React.useState<OrderSubTab>("new");
  const [query, setQuery] = React.useState("");
  const [reqs, setReqs] = React.useState<any[]>([]);
  const [pos, setPos] = React.useState<any[]>([]);
  const [receiving, setReceiving] = React.useState<any>(null);
  const [vendorCompare, setVendorCompare] = React.useState(false);

  const load = React.useCallback(async () => {
    const [a, b] = await Promise.all([
      fetch(`${API()}/api/ecw-ops/inventory/order-requests?outlet_id=${outletId}&limit=100`).then((r) => r.json()),
      fetch(`${API()}/api/ecw-ops/inventory/purchase-orders?outlet_id=${outletId}&limit=100`).then((r) => r.json()),
    ]);
    setReqs(a?.rows || []); setPos(b?.rows || []);
  }, [outletId]);
  React.useEffect(() => { void load(); }, [load]);

  const filterByQuery = (text: string) => !query || text.toLowerCase().includes(query.toLowerCase());
  const newOrders = pos.filter((p) => p.status === "ordered" && filterByQuery(`${p.vendor_name} ${p.items?.map((i: any) => i.name).join(" ")}`));
  const forApproval = reqs.filter((r) => r.status === "pending_approval" && filterByQuery(`${r.items?.map((i: any) => i.name).join(" ")}`));
  const placed = reqs.filter((r) => r.status === "approved" || r.status === "ordered").filter((r) => filterByQuery(`${r.items?.map((i: any) => i.name).join(" ")}`));
  const received = pos.filter((p) => p.status === "received" || p.status === "received_with_variance").filter((p) => filterByQuery(`${p.vendor_name}`));
  const canceled = reqs.filter((r) => r.status === "rejected").filter((r) => filterByQuery(`${r.items?.map((i: any) => i.name).join(" ")}`));

  const counts = { new: newOrders.length, "for-approval": forApproval.length, placed: placed.length, received: received.length, canceled: canceled.length };

  return (
    <>
      <input data-testid="orders-search" placeholder="Search orders…"
        value={query} onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", marginBottom: 10,
                  background: "rgba(0,0,0,0.3)", border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: 6, color: "#f5efe4", fontSize: 13 }} />

      {/* Sub-status pills — horizontally scrollable */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 12,
                    scrollbarWidth: "none" as any }}>
        <style>{`.ecw-substab-row::-webkit-scrollbar { display: none; }`}</style>
        {([
          ["new", "🆕 New", counts.new],
          ["for-approval", "🟡 Approval", counts["for-approval"]],
          ["placed", "📄 Placed", counts.placed],
          ["received", "✓ Received", counts.received],
          ["canceled", "✕ Canceled", counts.canceled],
        ] as [OrderSubTab, string, number][]).map(([k, lbl, n]) => (
          <button key={k} data-testid={`orders-subtab-${k}`} onClick={() => setSub(k)}
            style={{
              flex: "0 0 auto", padding: "6px 12px", borderRadius: 14,
              background: sub === k ? "rgba(200,169,126,0.2)" : "rgba(148,163,184,0.08)",
              border: `1px solid ${sub === k ? "rgba(200,169,126,0.5)" : "rgba(148,163,184,0.15)"}`,
              color: sub === k ? "#c8a97e" : "#94a3b8",
              fontSize: 11, fontWeight: 500, whiteSpace: "nowrap", cursor: "pointer",
            }}>
            {lbl} · {n}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sub === "new" && newOrders.map((po) => <POListCard key={po.id} po={po} onReceive={() => setReceiving(po)} />)}
        {sub === "new" && newOrders.length === 0 && <Empty text="No new orders in transit." />}
        {sub === "for-approval" && forApproval.map((r) => <ReqListCard key={r.id} req={r} />)}
        {sub === "for-approval" && forApproval.length === 0 && <Empty text="Nothing waiting on approval." />}
        {sub === "placed" && placed.map((r) => <ReqListCard key={r.id} req={r} />)}
        {sub === "placed" && placed.length === 0 && <Empty text="No open orders." />}
        {sub === "received" && received.map((po) => <POListCard key={po.id} po={po} history />)}
        {sub === "received" && received.length === 0 && <Empty text="No deliveries yet." />}
        {sub === "canceled" && canceled.map((r) => <ReqListCard key={r.id} req={r} />)}
        {sub === "canceled" && canceled.length === 0 && <Empty text="No canceled / rejected orders." />}
      </div>

      {receiving && <ReceiveSheet po={receiving} onClose={() => setReceiving(null)}
        onDone={async () => { setReceiving(null); await load(); }} />}

      {/* iter242 · Vendor compare CTA */}
      <button data-testid="orders-vendor-compare-btn"
        onClick={() => setVendorCompare(true)}
        style={{
          marginTop: 14, padding: 12, width: "100%", borderRadius: 8,
          background: "linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(200,169,126,0.1) 100%)",
          border: "1px solid rgba(212,175,55,0.5)",
          color: "#d4af37", fontSize: 12, fontWeight: 700, letterSpacing: 1.5,
          cursor: "pointer", fontFamily: "inherit",
        }}>
        💰 COMPARE VENDORS · CHEAPEST + DELIVERY
      </button>
      {vendorCompare && <VendorCompareModal onClose={() => setVendorCompare(false)} />}
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ fontSize: 11, color: "#64748b", textAlign: "center", padding: 24 }}>{text}</div>;
}

function POListCard({ po, onReceive, history }: { po: any; onReceive?: () => void; history?: boolean }) {
  const variance = po.status === "received_with_variance";
  return (
    <div data-testid={`orders-po-${po.id}`}
      onClick={onReceive}
      style={{
        padding: 12, background: history && variance ? "rgba(244,63,94,0.05)" : "rgba(200,169,126,0.04)",
        border: `1px solid ${history && variance ? "rgba(244,63,94,0.3)" : "rgba(200,169,126,0.2)"}`,
        borderRadius: 8, cursor: onReceive ? "pointer" : "default",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
      <div>
        <div style={{ fontSize: 13 }}>{po.vendor_name}
          {po.status === "received" && <span style={{ marginLeft: 8, color: "#10b981", fontSize: 10 }}>✓</span>}
          {variance && <span style={{ marginLeft: 8, color: "#f43f5e", fontSize: 10 }}>⚠ variance</span>}
        </div>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
          {po.item_count} items · ${po.total?.toFixed(0)}
          {po.expected_delivery_date && <> · ETA {po.expected_delivery_date.slice(5, 10)}</>}
        </div>
      </div>
      {onReceive && <span style={{ color: "#c8a97e", fontSize: 11 }}>Receive →</span>}
    </div>
  );
}

function ReqListCard({ req }: { req: any }) {
  return (
    <div data-testid={`orders-req-${req.id}`} style={{
      padding: 10, background: "rgba(200,169,126,0.04)",
      border: "1px solid rgba(200,169,126,0.2)", borderRadius: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
        <span>{req.item_count} items · ${req.estimated_total?.toFixed(0)}</span>
        {req.priority === "urgent" && <span style={{ color: "#f43f5e", fontSize: 10 }}>🔥 URGENT</span>}
      </div>
      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
        {req.created_at?.slice(0, 10)} · {req.items?.slice(0, 3).map((i: any) => i.name).join(", ")}
        {req.items?.length > 3 && ` +${req.items.length - 3}`}
      </div>
      {req.status === "rejected" && req.rejection_reason && (
        <div style={{ fontSize: 10, color: "#f43f5e", marginTop: 4, fontStyle: "italic" }}>
          Rejected: {req.rejection_reason}
        </div>
      )}
    </div>
  );
}

// ── Order Guide view (curated + history-derived) ─────────────────────────
function OrderGuideView({ outletId }: { outletId: string }) {
  const [curatedGuides, setCuratedGuides] = React.useState<any[]>([]);
  const [activeGuide, setActiveGuide] = React.useState<string>("__history__");
  const [rows, setRows] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState("");
  const [basket, setBasket] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    fetch(`${API()}/api/ecw-ops/order-guides?outlet_id=${outletId}`)
      .then((r) => r.json()).then((d) => setCuratedGuides(d?.rows || []));
  }, [outletId]);

  React.useEffect(() => {
    if (activeGuide !== "__history__") {
      const g = curatedGuides.find((x) => x.id === activeGuide);
      const items = (g?.items || []).map((it: any, i: number) => ({
        item_id: it.item_id || it.sku || `curated-${i}`,
        name: it.name,
        last_vendor: it.preferred_vendor,
        last_unit_price: it.unit_cost,
        order_count: null,
      }));
      const f = query
        ? items.filter((it: any) => (it.name || "").toLowerCase().includes(query.toLowerCase()))
        : items;
      setRows(f);
      return;
    }
    const q = query ? `&q=${encodeURIComponent(query)}` : "";
    fetch(`${API()}/api/ecw-ops/order-guide?outlet_id=${outletId}${q}`)
      .then((r) => r.json()).then((d) => setRows(d?.rows || []));
  }, [outletId, query, activeGuide, curatedGuides]);

  async function submit() {
    const items = Object.entries(basket).map(([id, qty]) => {
      const r = rows.find((x) => x.item_id === id);
      return { item_id: id, name: r?.name || id, qty: Number(qty), unit: r?.unit || "each",
                unit_price: r?.last_unit_price || 0 };
    });
    if (items.length === 0) return;
    await submitRequisition({ outlet_id: outletId, items, priority: "normal",
                               note: activeGuide !== "__history__" ? `From order guide: ${curatedGuides.find((g) => g.id === activeGuide)?.name}` : "From Order Guide" });
    setBasket({});
    alert("✓ Order requested");
  }

  // iter236 · Direct place-order — skips the approval workflow for chefs
  // who have ordering authority (William does).
  async function placeDirect() {
    const items = Object.entries(basket).map(([id, qty]) => {
      const r = rows.find((x) => x.item_id === id);
      return { item_id: id, name: r?.name || id, qty: Number(qty), unit: r?.unit || "each",
                unit_price: r?.last_unit_price || 0 };
    });
    if (items.length === 0) return;
    // Group by vendor when possible
    const vendors = new Set(items.map((i) => (rows.find((r) => r.item_id === i.item_id)?.last_vendor) || "Default Supplier"));
    const vendorName = vendors.size === 1 ? Array.from(vendors)[0] as string : "Mixed vendors";
    try {
      const r = await fetch(`${API()}/api/ecw-ops/orders/place`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
        body: JSON.stringify({
          outlet_id: outletId, vendor_name: vendorName, items,
          note: "Placed from mobile order guide",
        }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      const d = await r.json();
      setBasket({});
      alert(`✓ PO ${d?.po?.id} placed — $${(d?.po?.total || 0).toFixed(2)}`);
    } catch (e: any) {
      alert(`Failed to place order: ${e.message || e}`);
    }
  }

  return (
    <>
      {/* Curated guide picker */}
      {curatedGuides.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
          <button data-testid="guide-pick-history" onClick={() => setActiveGuide("__history__")}
            style={pickBtn(activeGuide === "__history__")}>
            📊 From history
          </button>
          {curatedGuides.map((g) => (
            <button key={g.id} data-testid={`guide-pick-${g.id}`}
              onClick={() => setActiveGuide(g.id)}
              style={pickBtn(activeGuide === g.id)}>
              📋 {g.name}
            </button>
          ))}
        </div>
      )}

      <input data-testid="order-guide-search" placeholder="Search guide…"
        value={query} onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", marginBottom: 10,
                  background: "rgba(0,0,0,0.3)", border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: 6, color: "#f5efe4", fontSize: 13 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.length === 0 && <Empty text="Empty guide — build one on desktop or place a few orders to seed history." />}
        {rows.map((r) => (
          <div key={r.item_id} data-testid={`order-guide-${r.item_id}`} style={{
            padding: 10, background: basket[r.item_id] ? "rgba(16,185,129,0.08)" : "rgba(200,169,126,0.04)",
            border: `1px solid ${basket[r.item_id] ? "rgba(16,185,129,0.4)" : "rgba(200,169,126,0.15)"}`,
            borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>
                {r.order_count != null && `ordered ${r.order_count}× · `}last {r.last_vendor || "?"}
                {r.last_unit_price != null && ` · $${r.last_unit_price.toFixed(2)}/unit`}
              </div>
            </div>
            <input type="number" inputMode="decimal"
              data-testid={`order-guide-qty-${r.item_id}`}
              value={basket[r.item_id] || ""}
              placeholder="qty"
              onChange={(e) => {
                const n = Number(e.target.value);
                setBasket((p) => {
                  const next = { ...p };
                  if (n > 0) next[r.item_id] = n;
                  else delete next[r.item_id];
                  return next;
                });
              }}
              style={{ width: 60, padding: "6px 8px", textAlign: "right",
                        background: "rgba(0,0,0,0.4)", border: "1px solid rgba(200,169,126,0.3)",
                        borderRadius: 4, color: "#f5efe4", fontSize: 13, fontFamily: "monospace" }} />
          </div>
        ))}
      </div>
      {Object.keys(basket).length > 0 && (
        <div style={{ position: "fixed", bottom: 94, left: 16, right: 16, zIndex: 999998,
                        display: "flex", gap: 6 }}>
          <button data-testid="order-guide-submit" onClick={() => void submit()}
            style={{ flex: 1, padding: 14,
                      background: "rgba(148,163,184,0.15)", border: "1px solid rgba(148,163,184,0.4)",
                      borderRadius: 8, color: "#cbd5e1", fontWeight: 600, fontSize: 13,
                      cursor: "pointer" }}>
            📋 Request ({Object.keys(basket).length})
          </button>
          <button data-testid="order-guide-place-direct" onClick={() => void placeDirect()}
            style={{ flex: 1.2, padding: 14,
                      background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.5)",
                      borderRadius: 8, color: "#10b981", fontWeight: 700, fontSize: 13,
                      cursor: "pointer" }}>
            🚚 Place order now
          </button>
        </div>
      )}
    </>
  );
}


function pickBtn(active: boolean): React.CSSProperties {
  return {
    flex: "0 0 auto", padding: "6px 10px",
    background: active ? "rgba(200,169,126,0.15)" : "rgba(200,169,126,0.04)",
    border: `1px solid ${active ? "rgba(200,169,126,0.5)" : "rgba(200,169,126,0.15)"}`,
    borderRadius: 6, color: active ? "#c8a97e" : "#94a3b8",
    fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
  };
}

// ── Vendor Catalogs view ────────────────────────────────────────────────
function VendorCatalogsView() {
  const [vendors, setVendors] = React.useState<any[]>([]);
  const [vendorId, setVendorId] = React.useState<string>("");
  const [items, setItems] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    fetch(`${API()}/api/ecw-ops/vendors`).then((r) => r.json())
      .then((d) => { setVendors(d?.rows || []); if (d?.rows?.[0]) setVendorId(d.rows[0].id); });
  }, []);

  React.useEffect(() => {
    if (!vendorId) return;
    const q = query ? `&q=${encodeURIComponent(query)}` : "";
    fetch(`${API()}/api/ecw-ops/vendor-catalog?vendor_id=${vendorId}${q}`)
      .then((r) => r.json()).then((d) => setItems(d?.rows || []));
  }, [vendorId, query]);

  return (
    <>
      <select data-testid="vendor-catalog-picker" value={vendorId} onChange={(e) => setVendorId(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", marginBottom: 10,
                  background: "rgba(0,0,0,0.3)", border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: 6, color: "#f5efe4", fontSize: 13 }}>
        {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      <input data-testid="vendor-catalog-search" placeholder="Search catalog…"
        value={query} onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", marginBottom: 10,
                  background: "rgba(0,0,0,0.3)", border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: 6, color: "#f5efe4", fontSize: 13 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.length === 0 && <Empty text="No catalog items." />}
        {items.map((it) => (
          <div key={it.id} data-testid={`vendor-catalog-item-${it.id}`} style={{
            padding: 10, background: "rgba(200,169,126,0.04)",
            border: "1px solid rgba(200,169,126,0.15)", borderRadius: 6,
            display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>
                {it.sku && <span>{it.sku} · </span>}{it.pack_size}{it.category && ` · ${it.category}`}
              </div>
            </div>
            <div style={{ fontSize: 13, color: "#c8a97e", fontFamily: "monospace", whiteSpace: "nowrap" }}>
              ${it.unit_price.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ── Inventory Voice view ────────────────────────────────────────────────
function InventoryVoiceView({ outletId }: { outletId: string }) {
  const [transcript, setTranscript] = React.useState("");
  const [listening, setListening] = React.useState(false);
  const [parsed, setParsed] = React.useState<any[]>([]);
  const [items, setItems] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const recRef = React.useRef<any>(null);

  React.useEffect(() => {
    fetch(`${API()}/api/ecw-ops/items?outlet_id=${outletId}`)
      .then((r) => r.json()).then((d) => setItems(d?.rows || []));
  }, [outletId]);

  function startListening() {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { setErr("Voice not supported on this device. Type items instead."); return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    r.onresult = (e: any) => {
      const t = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript).join(" ");
      setTranscript(t);
      setParsed(parseTranscript(t, items));
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
    recRef.current = r; setListening(true); setErr(null);
  }

  function stopListening() {
    recRef.current?.stop?.();
    setListening(false);
  }

  async function submit() {
    if (parsed.length === 0) return;
    const items_payload = parsed.map((p) => ({
      item_id: p.item_id, name: p.name, qty: p.qty, unit: p.unit,
    }));
    await submitRequisition({
      outlet_id: outletId, items: items_payload, priority: "normal",
      note: `Voice: "${transcript.slice(0, 140)}"`,
    });
    alert("✓ Voice order sent");
    setTranscript(""); setParsed([]);
  }

  return (
    <>
      <div style={{ padding: 12, background: "rgba(200,169,126,0.06)",
                     border: "1px solid rgba(200,169,126,0.3)", borderRadius: 8,
                     marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#c8a97e", letterSpacing: 2,
                      textTransform: "uppercase", marginBottom: 8 }}>🎤 Voice order</div>
        <button data-testid="inventory-voice-toggle"
          onClick={listening ? stopListening : startListening}
          style={{ width: "100%", padding: 14, borderRadius: 8,
                    background: listening ? "rgba(244,63,94,0.15)" : "rgba(200,169,126,0.15)",
                    border: `1px solid ${listening ? "rgba(244,63,94,0.4)" : "rgba(200,169,126,0.4)"}`,
                    color: listening ? "#f43f5e" : "#c8a97e",
                    fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          {listening ? "⏹ Stop listening" : "🎙 Tap to speak order"}
        </button>
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
          Try: "Ten pounds chicken breast. Two cases of eggs. Five gallons heavy cream."
        </div>
      </div>

      {err && <div style={{ padding: 10, fontSize: 11, color: "#f43f5e",
                              background: "rgba(244,63,94,0.08)", borderRadius: 6, marginBottom: 10 }}>{err}</div>}

      {transcript && (
        <div style={{ padding: 10, marginBottom: 10, background: "rgba(0,0,0,0.3)",
                       border: "1px solid rgba(148,163,184,0.15)", borderRadius: 6, fontSize: 11 }}>
          <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 2, marginBottom: 4 }}>TRANSCRIPT</div>
          <div style={{ color: "#f5efe4" }}>{transcript}</div>
        </div>
      )}

      {parsed.length > 0 && (
        <>
          <div style={{ fontSize: 9, color: "#c8a97e", letterSpacing: 2, marginBottom: 6 }}>PARSED ORDER</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {parsed.map((p, i) => (
              <div key={i} data-testid={`voice-parsed-${i}`} style={{
                padding: 10, background: "rgba(16,185,129,0.05)",
                border: "1px solid rgba(16,185,129,0.3)", borderRadius: 6,
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 13 }}>{p.name}</div>
                  {!p.item_id && <div style={{ fontSize: 9, color: "#fbbf24" }}>⚠ no exact match · will send as text</div>}
                </div>
                <div style={{ fontSize: 13, color: "#10b981", fontFamily: "monospace" }}>{p.qty} {p.unit}</div>
              </div>
            ))}
          </div>
          <button data-testid="voice-submit" onClick={() => void submit()}
            style={{ marginTop: 12, width: "100%", padding: 14,
                      background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.5)",
                      borderRadius: 8, color: "#10b981", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            ✓ Send voice order · {parsed.length} item{parsed.length === 1 ? "" : "s"}
          </button>
        </>
      )}
    </>
  );
}

// ── Transcript parser ───────────────────────────────────────────────────
const NUMBER_WORDS: Record<string, number> = {
  "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6,
  "seven": 7, "eight": 8, "nine": 9, "ten": 10, "a dozen": 12,
  "twelve": 12, "twenty": 20, "thirty": 30, "half": 0.5,
};
const UNIT_WORDS = ["pound", "pounds", "lb", "lbs", "case", "cases", "gallon", "gallons",
                     "each", "dozen", "dozens", "bag", "bags", "box", "boxes", "piece", "pieces"];
function parseTranscript(text: string, items: any[]): any[] {
  // Split on sentence boundaries and "and"
  const chunks = text.toLowerCase()
    .replace(/\./g, "\n").replace(/,/g, "\n").split(/\n| and /).map((c) => c.trim()).filter(Boolean);
  const parsed: any[] = [];
  for (const chunk of chunks) {
    let qty = 0;
    // Try numeric first
    const numMatch = chunk.match(/(\d+(\.\d+)?)/);
    if (numMatch) qty = Number(numMatch[1]);
    else {
      for (const [w, v] of Object.entries(NUMBER_WORDS)) {
        if (chunk.includes(w)) { qty = v; break; }
      }
    }
    if (qty === 0) continue;
    // Unit
    let unit = "each";
    for (const u of UNIT_WORDS) { if (chunk.includes(u)) { unit = u; break; } }
    // Name — strip number & unit & stop-words
    let name = chunk
      .replace(new RegExp(`(\\d+(\\.\\d+)?)`), "")
      .replace(new RegExp(Object.keys(NUMBER_WORDS).join("|"), "g"), "")
      .replace(new RegExp(UNIT_WORDS.join("|"), "g"), "")
      .replace(/\b(of|the|some|please|add|order)\b/g, "")
      .trim();
    if (!name) continue;
    // Fuzzy match to menu_items
    const lowerName = name.toLowerCase();
    const match = items.find((it: any) => {
      const n = (it.name || "").toLowerCase();
      return n.includes(lowerName) || lowerName.includes(n.split(" ")[0]);
    });
    parsed.push({
      item_id: match?.id || null,
      name: match?.name || name,
      qty, unit,
    });
  }
  return parsed;
}

// ── Offline queue + requisition submit ──────────────────────────────────
const OFFLINE_KEY = "ecw_offline_order_queue";
function getOfflineQueue(): any[] {
  try { return JSON.parse(localStorage.getItem(OFFLINE_KEY) || "[]"); }
  catch { return []; }
}
function setOfflineQueue(q: any[]) { localStorage.setItem(OFFLINE_KEY, JSON.stringify(q)); }

async function submitRequisition(body: any): Promise<any> {
  const idempotency_key = `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const payload = { ...body, idempotency_key };
  if (!navigator.onLine) {
    const q = getOfflineQueue(); q.push(payload); setOfflineQueue(q);
    return { ok: true, queued: true };
  }
  try {
    const r = await fetch(`${API()}/api/ecw-ops/inventory/order-request-offline`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
      body: JSON.stringify(payload),
    }).then((r) => r.json());
    return r;
  } catch (e) {
    const q = getOfflineQueue(); q.push(payload); setOfflineQueue(q);
    return { ok: true, queued: true };
  }
}

async function flushOfflineQueue(): Promise<void> {
  const q = getOfflineQueue();
  if (q.length === 0 || !navigator.onLine) return;
  const remaining: any[] = [];
  for (const payload of q) {
    try {
      const r = await fetch(`${API()}/api/ecw-ops/inventory/order-request-offline`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
        body: JSON.stringify(payload),
      }).then((r) => r.json());
      if (!r.ok) remaining.push(payload);
    } catch { remaining.push(payload); }
  }
  setOfflineQueue(remaining);
}

// ── Receive sheet (shared with old Orders flow) ─────────────────────────
function ReceiveSheet({ po, onClose, onDone }: { po: any; onClose: () => void; onDone: () => void }) {
  const [received, setReceived] = React.useState<Record<string, string>>(
    () => Object.fromEntries((po.items || []).map((it: any) => [it.item_id, String(it.qty || 0)]))
  );
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);

  async function submit() {
    setSubmitting(true);
    try {
      const body = {
        items: po.items.map((it: any) => ({
          item_id: it.item_id,
          qty_received: Number(received[it.item_id] || it.qty || 0),
          variance_note: notes[it.item_id] || null,
        })),
      };
      const r = await fetch(`${API()}/api/ecw-ops/inventory/purchase-orders/${po.id}/receive`, {
        method: "POST", headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      if (r.ok) {
        alert(`✓ Receipt logged · ${r.po_status}${r.variance ? " (variance)" : ""}`);
        onDone();
      }
    } finally { setSubmitting(false); }
  }

  return (
    <div data-testid="receive-sheet" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "flex-end", zIndex: 9999999,
    }}>
      <div style={{
        background: "#0a0e1a", borderTop: "1px solid rgba(200,169,126,0.3)",
        borderTopLeftRadius: 16, borderTopRightRadius: 16,
        width: "100%", maxHeight: "85vh", overflowY: "auto",
        padding: 20, color: "#f5efe4",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, margin: 0 }}>Receive {po.vendor_name}</h3>
          <button onClick={onClose} style={{ fontSize: 14, color: "#94a3b8", background: "none", border: "none" }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(po.items || []).map((it: any) => {
            const exp = Number(it.qty || 0);
            const act = Number(received[it.item_id] || 0);
            const delta = act - exp;
            return (
              <div key={it.item_id} style={{
                padding: 10,
                background: delta === 0 ? "rgba(200,169,126,0.04)" : "rgba(251,191,36,0.06)",
                border: `1px solid ${delta === 0 ? "rgba(200,169,126,0.2)" : "rgba(251,191,36,0.3)"}`,
                borderRadius: 6,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13 }}>{it.name}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>
                      Ordered {exp} {it.unit}
                      {delta !== 0 && <span style={{ color: delta < 0 ? "#f43f5e" : "#10b981", marginLeft: 6 }}>
                        · {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                      </span>}
                    </div>
                  </div>
                  <input data-testid={`receive-qty-${it.item_id}`} type="number" inputMode="decimal"
                    value={received[it.item_id] || ""}
                    onChange={(e) => setReceived((p) => ({ ...p, [it.item_id]: e.target.value }))}
                    style={{ width: 70, padding: "6px 8px", textAlign: "right",
                              background: "rgba(0,0,0,0.4)", border: "1px solid rgba(200,169,126,0.3)",
                              borderRadius: 4, color: "#f5efe4", fontSize: 14, fontFamily: "monospace" }} />
                </div>
                {delta !== 0 && (
                  <input placeholder="Variance note" value={notes[it.item_id] || ""}
                    onChange={(e) => setNotes((p) => ({ ...p, [it.item_id]: e.target.value }))}
                    style={{ width: "100%", marginTop: 6, padding: "6px 8px",
                              background: "rgba(0,0,0,0.3)", border: "1px solid rgba(251,191,36,0.2)",
                              borderRadius: 4, color: "#f5efe4", fontSize: 11 }} />
                )}
              </div>
            );
          })}
        </div>
        <button data-testid="receive-submit" onClick={submit} disabled={submitting}
          style={{ width: "100%", marginTop: 14, padding: 14,
                    background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.5)",
                    borderRadius: 8, color: "#10b981", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          {submitting ? "Logging…" : "✓ Confirm receipt"}
        </button>
      </div>
    </div>
  );
}


// ── Commissary view (Production · Pastry · Storeroom internal ordering) ─
function CommissaryView({ outletId }: { outletId: string }) {
  const [commissaries, setCommissaries] = React.useState<any[]>([]);
  const [activeId, setActiveId] = React.useState<string>("");
  const [items, setItems] = React.useState<any[]>([]);
  const [query, setQuery] = React.useState("");
  const [basket, setBasket] = React.useState<Record<string, number>>({});
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch(`${API()}/api/ecw-ops/commissary/outlets`).then((r) => r.json())
      .then((d) => {
        const rows = d?.rows || [];
        setCommissaries(rows);
        if (rows[0] && !activeId) setActiveId(rows[0].id);
      });
  }, []);

  React.useEffect(() => {
    if (!activeId) return;
    const q = query ? `&q=${encodeURIComponent(query)}` : "";
    fetch(`${API()}/api/ecw-ops/commissary/catalog?commissary_id=${activeId}${q}`)
      .then((r) => r.json()).then((d) => setItems(d?.rows || []));
  }, [activeId, query]);

  async function submitTransfer() {
    const entries = Object.entries(basket);
    if (entries.length === 0) return;
    setBusy(true);
    try {
      const reqItems = entries.map(([id, qty]) => {
        const it = items.find((x) => x.id === id);
        return {
          item_id: id,
          sku: it?.sku,
          name: it?.name,
          qty,
          unit_cost: it?.unit_cost,
          pack_size: it?.pack_size,
        };
      });
      const r = await fetch(`${API()}/api/ecw-ops/commissary/transfer-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
        body: JSON.stringify({
          source_commissary_id: activeId,
          dest_outlet_id: outletId,
          items: reqItems,
          note: `Transfer request from ${outletId}`,
        }),
      });
      if (r.ok) {
        setMsg("✓ Transfer requested — commissary will see it");
        setBasket({});
      } else {
        setMsg("✗ Request failed");
      }
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  return (
    <>
      {/* Commissary tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
        {commissaries.map((c) => (
          <button key={c.id} data-testid={`commissary-tab-${c.id}`}
            onClick={() => setActiveId(c.id)}
            style={{
              flex: "0 0 auto", padding: "8px 12px",
              background: c.id === activeId ? "rgba(168,85,247,0.15)" : "rgba(200,169,126,0.04)",
              border: `1px solid ${c.id === activeId ? "rgba(168,85,247,0.5)" : "rgba(200,169,126,0.15)"}`,
              borderRadius: 6, color: c.id === activeId ? "#c4b5fd" : "#f5efe4",
              fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}>
            {c.kind === "pastry" ? "🥐" : c.kind === "production" ? "🍳" : "📦"} {c.name}
          </button>
        ))}
      </div>

      <input data-testid="commissary-search" placeholder="Search commissary catalog…"
        value={query} onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: "10px 12px", marginBottom: 10,
                  background: "rgba(0,0,0,0.3)", border: "1px solid rgba(148,163,184,0.2)",
                  borderRadius: 6, color: "#f5efe4", fontSize: 13 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.length === 0 && <Empty text="No items for this commissary yet." />}
        {items.map((it) => {
          const qty = basket[it.id] || 0;
          return (
            <div key={it.id} data-testid={`commissary-item-${it.id}`} style={{
              padding: 10,
              background: qty > 0 ? "rgba(168,85,247,0.08)" : "rgba(200,169,126,0.04)",
              border: `1px solid ${qty > 0 ? "rgba(168,85,247,0.4)" : "rgba(200,169,126,0.15)"}`,
              borderRadius: 6, display: "flex", justifyContent: "space-between",
              alignItems: "center", gap: 8,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis",
                                whiteSpace: "nowrap" }}>{it.name}</div>
                <div style={{ fontSize: 10, color: "#94a3b8" }}>
                  {it.pack_size} · ${it.unit_cost?.toFixed(2)}{it.category && ` · ${it.category}`}
                </div>
              </div>
              <input type="number" inputMode="decimal"
                data-testid={`commissary-qty-${it.id}`}
                value={qty || ""} placeholder="qty"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setBasket((p) => {
                    const next = { ...p };
                    if (n > 0) next[it.id] = n;
                    else delete next[it.id];
                    return next;
                  });
                }}
                style={{ width: 60, padding: "6px 8px", textAlign: "right",
                          background: "rgba(0,0,0,0.4)", border: "1px solid rgba(168,85,247,0.3)",
                          borderRadius: 4, color: "#f5efe4", fontSize: 13,
                          fontFamily: "monospace" }} />
            </div>
          );
        })}
      </div>

      {msg && (
        <div data-testid="commissary-msg" style={{
          marginTop: 10, padding: 8,
          background: msg.startsWith("✓") ? "rgba(16,185,129,0.1)" : "rgba(244,63,94,0.1)",
          border: `1px solid ${msg.startsWith("✓") ? "rgba(16,185,129,0.4)" : "rgba(244,63,94,0.4)"}`,
          borderRadius: 4, fontSize: 11,
          color: msg.startsWith("✓") ? "#10b981" : "#fca5a5",
        }}>{msg}</div>
      )}

      {Object.keys(basket).length > 0 && (
        <button data-testid="commissary-submit" onClick={() => void submitTransfer()}
          disabled={busy}
          style={{ position: "fixed", bottom: 94, left: 16, right: 16, padding: 14,
                    background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.5)",
                    borderRadius: 8, color: "#c4b5fd", fontWeight: 600, fontSize: 14,
                    cursor: "pointer", zIndex: 999998, opacity: busy ? 0.5 : 1 }}>
          🏭 Request {Object.keys(basket).length} item{Object.keys(basket).length === 1 ? "" : "s"}
        </button>
      )}
    </>
  );
}

// ── Reconciliation view (PO vs Invoice vs Delivery · ACCRUAL focus) ─────
function ReconciliationView({ outletId }: { outletId: string }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [overdueOnly, setOverdueOnly] = React.useState(false);
  const [atRisk, setAtRisk] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function loadAll() {
    const url = `${API()}/api/ecw-ops/reconciliation/open-orders?outlet_id=${outletId}`
      + (overdueOnly ? "&overdue_only=true" : "");
    const [a, b] = await Promise.all([
      fetch(url).then((r) => r.json()),
      fetch(`${API()}/api/ecw-ops/reconciliation/at-risk?outlet_id=${outletId}`).then((r) => r.json()),
    ]);
    setRows(a?.rows || []);
    setAtRisk(b);
  }

  React.useEffect(() => { void loadAll(); }, [outletId, overdueOnly]);

  async function bookAccruals() {
    if (!atRisk || atRisk.po_count === 0) return;
    setBusy(true);
    try {
      const period = atRisk.period;
      const r = await fetch(`${API()}/api/ecw-ops/reconciliation/accrual-sweep`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlet_id: outletId, period, dry_run: false }),
      }).then((r) => r.json());
      setMsg(`✓ Booked $${r.total_to_accrue?.toLocaleString()} to ${period} P&L · Finance notified`);
      void loadAll();
    } catch {
      setMsg("✗ Booking failed");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 6000);
    }
  }

  return (
    <>
      {/* Accrual banner — William's core concern */}
      {atRisk && atRisk.po_count > 0 && (
        <div data-testid="accrual-banner" style={{
          padding: 12, marginBottom: 10,
          background: "rgba(251,191,36,0.1)",
          border: "1px solid rgba(251,191,36,0.5)",
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#fbbf24", marginBottom: 4, fontWeight: 700 }}>
            📒 AT RISK · NEXT-MONTH SLIPPAGE
          </div>
          <div style={{ fontSize: 18, color: "#f5efe4", fontFamily: "monospace", fontWeight: 600 }}>
            ${atRisk.total_at_risk?.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: "#fbbf24", marginTop: 4, lineHeight: 1.5 }}>
            {atRisk.po_count} PO{atRisk.po_count === 1 ? "" : "s"} delivered in {atRisk.period} but
            no invoice yet. Book accruals so the cost hits {atRisk.period}, not next month.
          </div>
          <button data-testid="accrual-book" onClick={() => void bookAccruals()} disabled={busy}
            style={{
              marginTop: 8, padding: "8px 12px", fontSize: 11, fontWeight: 600,
              background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.6)",
              borderRadius: 5, color: "#fbbf24", cursor: "pointer",
              opacity: busy ? 0.5 : 1,
            }}>
            {busy ? "Booking…" : `📒 Book ${atRisk.po_count} accrual${atRisk.po_count === 1 ? "" : "s"} → ${atRisk.period}`}
          </button>
          {msg && (
            <div data-testid="accrual-msg" style={{ marginTop: 8, fontSize: 11,
                           color: msg.startsWith("✓") ? "#86efac" : "#fca5a5" }}>
              {msg}
            </div>
          )}
        </div>
      )}
      {atRisk && atRisk.po_count === 0 && (
        <div style={{ padding: 10, marginBottom: 10,
                       background: "rgba(16,185,129,0.08)",
                       border: "1px solid rgba(16,185,129,0.3)",
                       borderRadius: 6, fontSize: 11, color: "#86efac" }}>
          ✓ All {atRisk.period} deliveries are matched to in-period invoices.
        </div>
      )}

      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <button data-testid="recon-all"
          onClick={() => setOverdueOnly(false)} style={pickBtn(!overdueOnly)}>
          All open POs
        </button>
        <button data-testid="recon-overdue"
          onClick={() => setOverdueOnly(true)} style={pickBtn(overdueOnly)}>
          ⚠ Overdue
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.length === 0 && <Empty text={overdueOnly ? "No overdue POs — all on track." : "No open POs right now."} />}
        {rows.map((r) => {
          const days = r.days_overdue;
          const isOverdue = r.needs_attention;
          return (
            <div key={r.id} data-testid={`recon-po-${r.id}`} style={{
              padding: 10, borderRadius: 6,
              background: isOverdue ? "rgba(244,63,94,0.08)" : "rgba(200,169,126,0.04)",
              border: `1px solid ${isOverdue ? "rgba(244,63,94,0.4)" : "rgba(200,169,126,0.15)"}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, color: "#f5efe4", fontWeight: 500 }}>
                  {isOverdue && "🚨 "}{r.vendor_name}
                </div>
                <div style={{ fontSize: 12, color: "#c8a97e", fontFamily: "monospace" }}>
                  ${r.total?.toLocaleString?.() || r.total}
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                PO {r.po_number}{r.expected_delivery_date && ` · ETA ${r.expected_delivery_date}`}
              </div>
              <div style={{ fontSize: 10, color: isOverdue ? "#fca5a5" : "#94a3b8", marginTop: 2 }}>
                {r.invoice_matched ? `✓ ${r.invoices.length} invoice(s)` : "⏳ No invoice yet"}
                {" · "}
                {r.deliveries?.length > 0 ? `📦 ${r.deliveries.length} delivery` : "⏳ not received"}
                {days != null && days > 0 && ` · ${days}d late`}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}


// ── Vendor Scorecard view ───────────────────────────────────────────────
function ScorecardsView({ outletId }: { outletId: string }) {
  const [rows, setRows] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch(`${API()}/api/ecw-ops/vendor-scorecards?outlet_id=${outletId}&days=90`)
      .then((r) => r.json()).then((d) => setRows(d?.rows || []));
  }, [outletId]);

  return (
    <>
      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 10 }}>
        Past 90 days · reliability = 100 − variance% − lateness penalty
      </div>
      {rows.length === 0 && <Empty text="No vendor activity in the past 90 days." />}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((r) => {
          const score = r.reliability_score;
          const scoreColor = score >= 85 ? "#10b981" : score >= 65 ? "#fbbf24" : "#f43f5e";
          return (
            <div key={r.vendor_id} data-testid={`scorecard-${r.vendor_id}`} style={{
              padding: 10,
              background: "rgba(200,169,126,0.04)",
              border: `1px solid rgba(200,169,126,0.15)`,
              borderRadius: 6,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, color: "#f5efe4", fontWeight: 500 }}>
                  {r.vendor_name}
                </div>
                <div style={{ fontSize: 16, fontFamily: "monospace",
                                color: scoreColor, fontWeight: 600 }}>
                  {score}
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4,
                              display: "flex", gap: 10 }}>
                <span>{r.order_count} orders</span>
                <span>${r.total_spend?.toLocaleString()} spend</span>
                <span style={{ color: r.on_time_rate >= 90 ? "#10b981" : "#fbbf24" }}>
                  {r.on_time_rate}% on time
                </span>
                {r.variance_rate > 0 && (
                  <span style={{ color: "#f43f5e" }}>{r.variance_rate}% variance</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

