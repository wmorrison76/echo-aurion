/** iter224 · Inventory tab — mobile quick-count + low-stock flag + PO request.
 *
 * Flow: chef scans shelf → types on-hand count per item → system compares
 * to EchoAi-suggested par → flags low-stock (on_hand < 0.7 × par) →
 * "Request Order" bundles flagged items into a procurement requisition
 * (desktop picks it up for vendor/approval/PO).
 */
import React from "react";
import { API } from "@/lib/api-url";
import { InventoryAuditMode } from "./InventoryAuditMode";

type Row = {
  item_id: string; name: string; station_id: string;
  unit: string; par_default: number; par_suggested: number;
  on_hand: number; last_counted_at: string | null;
  last_counted_by: string | null; low_stock: boolean; gap: number;
};
type Station = { id: string; name: string };

export function InventoryTab({ outletId }: { outletId: string }) {
  const [auditOpen, setAuditOpen] = React.useState(false);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [stations, setStations] = React.useState<Station[]>([]);
  const [stationFilter, setStationFilter] = React.useState<string>("");
  const [counts, setCounts] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState<Record<string, boolean>>({});
  const [msg, setMsg] = React.useState<string | null>(null);
  const [basket, setBasket] = React.useState<Record<string, number>>({});
  const [reqModalOpen, setReqModalOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    const q = stationFilter ? `&station_id=${stationFilter}` : "";
    const [a, b] = await Promise.all([
      fetch(`${API()}/api/ecw-ops/inventory/levels?outlet_id=${outletId}${q}`).then((r) => r.json()),
      fetch(`${API()}/api/ecw-ops/stations?outlet_id=${outletId}`).then((r) => r.json()),
    ]);
    setRows(a?.rows || []);
    setStations(b?.rows || []);
  }, [outletId, stationFilter]);

  React.useEffect(() => { void load(); }, [load]);

  async function saveCount(row: Row) {
    const raw = counts[row.item_id];
    if (!raw || raw === String(row.on_hand)) return;
    const n = Number(raw);
    if (isNaN(n) || n < 0) return;
    setSaving((p) => ({ ...p, [row.item_id]: true }));
    try {
      const r = await fetch(`${API()}/api/ecw-ops/inventory/count`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
        body: JSON.stringify({
          outlet_id: outletId, item_id: row.item_id,
          on_hand: n, unit: row.unit,
        }),
      }).then((r) => r.json());
      if (r.ok) {
        setMsg(`✓ ${row.name}: ${n}${row.unit}`);
        setTimeout(() => setMsg(null), 2000);
        await load();
        setCounts((p) => { const c = { ...p }; delete c[row.item_id]; return c; });
      }
    } finally {
      setSaving((p) => ({ ...p, [row.item_id]: false }));
    }
  }

  function toggleBasket(row: Row) {
    setBasket((prev) => {
      const next = { ...prev };
      if (next[row.item_id]) { delete next[row.item_id]; }
      else { next[row.item_id] = Math.ceil(row.gap || row.par_suggested); }
      return next;
    });
  }

  async function submitOrderRequest(priority: "normal" | "urgent") {
    const basketIds = Object.keys(basket);
    if (basketIds.length === 0) return;
    const items = basketIds.map((id) => {
      const row = rows.find((r) => r.item_id === id);
      return {
        item_id: id, name: row?.name,
        qty: basket[id], unit: row?.unit || "each",
      };
    });
    const r = await fetch(`${API()}/api/ecw-ops/inventory/order-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-User-Id": "chef-william" },
      body: JSON.stringify({
        outlet_id: outletId, items, priority,
        note: "Mobile quick-order from Inventory tab",
      }),
    }).then((r) => r.json());
    if (r.ok) {
      setMsg(`✓ Order request sent · ${r.requisition.item_count} items · $${r.requisition.estimated_total}`);
      setTimeout(() => setMsg(null), 5000);
      setBasket({});
      setReqModalOpen(false);
    } else {
      alert("Failed: " + JSON.stringify(r).slice(0, 300));
    }
  }

  const filtered = rows;   // already server-filtered by stationFilter
  const lowCount = filtered.filter((r) => r.low_stock).length;
  const basketCount = Object.keys(basket).length;
  const basketTotal = filtered
    .filter((r) => basket[r.item_id])
    .reduce((a, r) => a + (basket[r.item_id] || 0) * 0, 0); // cost TBD

  return (
    <div data-testid="inventory-root" style={{ padding: 16, paddingBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>Inventory</h2>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: "2px 0 0" }}>
            Quick count · auto low-stock · request PO
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <button data-testid="inventory-audit-btn"
            onClick={() => setAuditOpen(true)}
            style={{
              display: "block", marginBottom: 6,
              padding: "4px 10px", borderRadius: 4,
              background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.45)",
              color: "#d4af37", fontSize: 10, fontWeight: 700, cursor: "pointer",
              letterSpacing: 1,
            }}>
            🎙 AUDIT
          </button>
          <div data-testid="inventory-lowcount" style={{
            fontSize: 10, color: lowCount > 0 ? "#f43f5e" : "#10b981",
            padding: "2px 8px", borderRadius: 3,
            background: lowCount > 0 ? "rgba(244,63,94,0.1)" : "rgba(16,185,129,0.1)",
            border: `1px solid ${lowCount > 0 ? "rgba(244,63,94,0.3)" : "rgba(16,185,129,0.3)"}`,
          }}>
            {lowCount > 0 ? `${lowCount} low stock` : "✓ stocked"}
          </div>
        </div>
      </div>
      {auditOpen && <InventoryAuditMode outletId={outletId} onClose={() => setAuditOpen(false)} />}

      <select data-testid="inventory-station-filter" value={stationFilter}
        onChange={(e) => setStationFilter(e.target.value)}
        style={{
          width: "100%", padding: "10px 12px", marginBottom: 12,
          background: "rgba(0,0,0,0.3)", border: "1px solid rgba(148,163,184,0.2)",
          borderRadius: 4, color: "#f5efe4", fontSize: 13,
        }}>
        <option value="">All stations</option>
        {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>

      {msg && (
        <div data-testid="inventory-msg" style={{
          padding: 8, marginBottom: 10, fontSize: 11,
          background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: 4, color: "#10b981",
        }}>
          {msg}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {filtered.map((row) => (
          <InventoryRow key={row.item_id} row={row}
            value={counts[row.item_id] ?? String(row.on_hand)}
            onChange={(v) => setCounts((p) => ({ ...p, [row.item_id]: v }))}
            onSave={() => void saveCount(row)}
            saving={!!saving[row.item_id]}
            inBasket={!!basket[row.item_id]}
            basketQty={basket[row.item_id]}
            onBasketQty={(q) => setBasket((p) => ({ ...p, [row.item_id]: q }))}
            onToggleBasket={() => toggleBasket(row)} />
        ))}
      </div>

      {basketCount > 0 && (
        <button data-testid="inventory-request-order"
          onClick={() => setReqModalOpen(true)}
          style={{
            position: "fixed", bottom: 74, left: 16, right: 16, zIndex: 999998,
            padding: 14, borderRadius: 8,
            background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.5)",
            color: "#10b981", fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}>
          📦 Request order · {basketCount} item{basketCount === 1 ? "" : "s"}
        </button>
      )}

      {reqModalOpen && (
        <div data-testid="order-request-modal" style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
          display: "flex", alignItems: "flex-end", zIndex: 9999999,
        }}>
          <div style={{
            background: "#0a0e1a", borderTop: "1px solid rgba(200,169,126,0.3)",
            borderTopLeftRadius: 16, borderTopRightRadius: 16,
            width: "100%", padding: 20, color: "#f5efe4",
          }}>
            <h3 style={{ fontSize: 16, margin: "0 0 8px" }}>Confirm order request</h3>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 12px" }}>
              This creates a procurement requisition. Your purchasing manager
              on desktop picks the vendor and turns it into a real PO.
            </p>
            <div style={{ maxHeight: 260, overflowY: "auto", marginBottom: 14 }}>
              {Object.keys(basket).map((id) => {
                const row = rows.find((r) => r.item_id === id);
                if (!row) return null;
                return (
                  <div key={id} style={{
                    padding: "8px 10px", background: "rgba(200,169,126,0.04)",
                    border: "1px solid rgba(200,169,126,0.2)", borderRadius: 6,
                    marginBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: 13 }}>{row.name}</span>
                    <span style={{ fontSize: 12, color: "#c8a97e", fontFamily: "monospace" }}>
                      {basket[id]} {row.unit}
                    </span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setReqModalOpen(false)}
                style={{ flex: 1, padding: 12, background: "transparent", border: "1px solid rgba(148,163,184,0.3)", borderRadius: 6, color: "#94a3b8", fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
              <button data-testid="order-request-submit-normal"
                onClick={() => void submitOrderRequest("normal")}
                style={{ flex: 1, padding: 12, background: "rgba(200,169,126,0.15)", border: "1px solid rgba(200,169,126,0.4)", borderRadius: 6, color: "#c8a97e", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Submit
              </button>
              <button data-testid="order-request-submit-urgent"
                onClick={() => void submitOrderRequest("urgent")}
                style={{ flex: 1, padding: 12, background: "rgba(244,63,94,0.15)", border: "1px solid rgba(244,63,94,0.4)", borderRadius: 6, color: "#f43f5e", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                🔥 Urgent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryRow({
  row, value, onChange, onSave, saving, inBasket, basketQty, onBasketQty, onToggleBasket,
}: {
  row: Row; value: string; onChange: (v: string) => void;
  onSave: () => void; saving: boolean;
  inBasket: boolean; basketQty?: number;
  onBasketQty: (q: number) => void;
  onToggleBasket: () => void;
}) {
  return (
    <div data-testid={`inventory-row-${row.item_id}`} style={{
      padding: 10,
      background: row.low_stock ? "rgba(244,63,94,0.06)" : "rgba(200,169,126,0.04)",
      border: `1px solid ${row.low_stock ? "rgba(244,63,94,0.3)" : "rgba(200,169,126,0.15)"}`,
      borderRadius: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "#f5efe4", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {row.name}
            {row.low_stock && <span style={{ marginLeft: 8, fontSize: 9, padding: "1px 5px", background: "rgba(244,63,94,0.2)", color: "#f43f5e", borderRadius: 3 }}>LOW</span>}
          </div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
            par {row.par_suggested} · on hand {row.on_hand}
            {row.gap > 0 && <span style={{ color: "#f43f5e" }}> · need {row.gap}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input data-testid={`inventory-count-${row.item_id}`}
            type="number" inputMode="decimal" value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onSave}
            style={{
              width: 60, padding: "6px 8px", textAlign: "right",
              background: "rgba(0,0,0,0.4)", border: "1px solid rgba(200,169,126,0.3)",
              borderRadius: 4, color: "#f5efe4", fontSize: 14, fontFamily: "monospace",
            }} />
          <button data-testid={`inventory-basket-${row.item_id}`}
            onClick={onToggleBasket}
            style={{
              padding: "6px 10px", minWidth: 36,
              background: inBasket ? "rgba(16,185,129,0.2)" : "transparent",
              border: `1px solid ${inBasket ? "rgba(16,185,129,0.5)" : "rgba(148,163,184,0.3)"}`,
              borderRadius: 4, color: inBasket ? "#10b981" : "#94a3b8",
              fontSize: 14, cursor: "pointer",
            }}>
            {inBasket ? "✓" : "+"}
          </button>
        </div>
      </div>
      {inBasket && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>Order qty:</span>
          <input data-testid={`inventory-basket-qty-${row.item_id}`}
            type="number" inputMode="decimal" value={basketQty || ""}
            onChange={(e) => onBasketQty(Number(e.target.value))}
            style={{
              width: 60, padding: "4px 6px", textAlign: "right",
              background: "rgba(0,0,0,0.4)", border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 4, color: "#10b981", fontSize: 12, fontFamily: "monospace",
            }} />
          <span style={{ fontSize: 10, color: "#94a3b8" }}>{row.unit}</span>
        </div>
      )}
      {saving && <div style={{ fontSize: 10, color: "#c8a97e", marginTop: 4 }}>saving…</div>}
    </div>
  );
}
