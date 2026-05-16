/** iter242 · 3D Storage Map (mobile-friendly horizontal pan).
 *
 * Shows shelves as cards in a horizontal scrolling row with subtle
 * perspective transform to feel "3D-ish". Tap a shelf → item list.
 * Pinch / pan handled by browser native horizontal scroll on phones.
 *
 * The "3D" feel is intentionally cheap: rotateY(-12deg) + translateZ
 * on each card, with parallax-style scaling. No three.js to keep the
 * shell light + battery-friendly.
 */
import React from "react";
import { API } from "@/lib/api-url";
import { ShelfArScan } from "./ShelfArScan";

type Shelf = {
  id: string; label: string; zone: string;
  x_idx: number; y_idx: number; items?: string[];
  last_audit_at?: string;
};

const ZONE_COLORS: Record<string, string> = {
  "walk-in-cold": "#60a5fa",
  "walk-in-meat": "#ef4444",
  "dry-storage":  "#d4af37",
  "bar":          "#a855f7",
  "freezer":      "#22d3ee",
};

export function StorageMapTab() {
  const [shelves, setShelves] = React.useState<Shelf[]>([]);
  const [zone, setZone] = React.useState<string | null>(null);
  const [active, setActive] = React.useState<Shelf | null>(null);
  const [arOpen, setArOpen] = React.useState(false);

  const load = React.useCallback(() => {
    const qs = zone ? `?zone=${zone}` : "";
    fetch(`${API()}/api/storage-map/shelves${qs}`)
      .then((r) => r.json())
      .then((d) => setShelves(d?.rows || []))
      .catch(() => undefined);
  }, [zone]);

  React.useEffect(() => {
    fetch(`${API()}/api/storage-map/seed-demo`, { method: "POST" }).finally(load);
  }, [load]);

  const zonesList = Array.from(new Set(shelves.map((s) => s.zone))).sort();

  return (
    <div data-testid="storage-map-root" style={{ padding: "12px 0 100px" }}>
      <div style={{ padding: "0 12px", marginBottom: 12, display: "flex",
                      justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#d4af37", fontWeight: 700 }}>
            🗺 3D STORAGE MAP
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 300, color: "#f5efe4", margin: "4px 0 0" }}>
            {shelves.length} shelves · pan horizontally
          </h1>
        </div>
        <button data-testid="storage-ar-scan-btn" onClick={() => setArOpen(true)} style={{
          background: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(34,211,238,0.1))",
          border: "1px solid rgba(34,211,238,0.5)", color: "#22d3ee",
          padding: "8px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700,
          letterSpacing: 1, cursor: "pointer", fontFamily: "inherit",
        }}>📷 AR SCAN</button>
      </div>

      {/* Zone filter pills */}
      <div data-testid="storage-zones" style={{ display: "flex", gap: 6, padding: "0 12px 10px",
                       overflowX: "auto", scrollbarWidth: "none" as any }}>
        <button data-testid="storage-zone-all" onClick={() => setZone(null)} style={pill(zone == null, "#d4af37")}>
          ALL ZONES
        </button>
        {zonesList.map((z) => (
          <button key={z} data-testid={`storage-zone-${z}`}
            onClick={() => setZone(z)} style={pill(zone === z, ZONE_COLORS[z] || "#94a3b8")}>
            {z.replace(/-/g, " ").toUpperCase()}
          </button>
        ))}
      </div>

      {/* Horizontal "3D" pan */}
      <div data-testid="storage-pan-row" style={{
        display: "flex", gap: 12, overflowX: "auto", padding: "20px 16px 30px",
        WebkitOverflowScrolling: "touch", scrollbarWidth: "none" as any,
        perspective: "1000px", scrollSnapType: "x mandatory",
      }}>
        <style>{`[data-testid='storage-pan-row']::-webkit-scrollbar{display:none;}`}</style>
        {shelves.map((s, i) => (
          <button key={s.id} data-testid={`storage-shelf-${s.id}`}
            onClick={() => setActive(s)}
            style={{
              flex: "0 0 auto", scrollSnapAlign: "center",
              width: 180, minHeight: 240, borderRadius: 10,
              padding: 12, color: "#f5efe4", cursor: "pointer", fontFamily: "inherit",
              background: `linear-gradient(160deg, ${ZONE_COLORS[s.zone] || "#475569"}25 0%, rgba(10,14,26,0.95) 80%)`,
              border: `1px solid ${ZONE_COLORS[s.zone] || "#475569"}55`,
              transform: `rotateY(-${Math.min(8, i * 0.5)}deg) translateZ(0)`,
              transformStyle: "preserve-3d",
              boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
              textAlign: "left",
            }}>
            <div style={{ fontSize: 8, letterSpacing: 2, color: ZONE_COLORS[s.zone] || "#94a3b8",
                            fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
              {s.zone}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#f5efe4", marginBottom: 8 }}>
              {s.label}
            </div>
            <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 1, marginBottom: 6 }}>
              {(s.items || []).length} items
            </div>
            {(s.items || []).slice(0, 4).map((it, j) => (
              <div key={j} style={{ fontSize: 10, color: "#cbd5e1", padding: "2px 0",
                                       overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                · {it}
              </div>
            ))}
            {(s.items || []).length > 4 && (
              <div style={{ fontSize: 9, color: "#64748b", marginTop: 4 }}>
                +{(s.items || []).length - 4} more
              </div>
            )}
          </button>
        ))}
      </div>

      {active && <ShelfDetail shelf={active} onClose={() => setActive(null)} />}
      {arOpen && <ShelfArScan onClose={() => setArOpen(false)} />}
    </div>
  );
}


function ShelfDetail({ shelf, onClose }: { shelf: Shelf; onClose: () => void }) {
  return (
    <div data-testid="storage-shelf-detail" onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 99999987, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "flex-end", backdropFilter: "blur(3px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", background: "linear-gradient(180deg, #0a0e1a 0%, #1a1f2e 100%)",
        borderRadius: "14px 14px 0 0", padding: 14, paddingBottom: 28,
        maxHeight: "70vh", overflowY: "auto",
        border: `1px solid ${ZONE_COLORS[shelf.zone] || "#475569"}66`,
      }}>
        <div style={{ fontSize: 9, letterSpacing: 3, color: ZONE_COLORS[shelf.zone] || "#d4af37", fontWeight: 700 }}>
          {shelf.zone.toUpperCase()}
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 400, color: "#f5efe4", margin: "4px 0 12px" }}>
          {shelf.label}
        </h2>
        {(shelf.items || []).map((it, i) => (
          <div key={i} data-testid={`shelf-item-${i}`} style={{
            padding: "8px 10px", marginBottom: 4, borderRadius: 5,
            background: "rgba(148,163,184,0.06)",
            border: "1px solid rgba(148,163,184,0.15)",
            color: "#f5efe4", fontSize: 12,
          }}>
            {it}
          </div>
        ))}
      </div>
    </div>
  );
}


function pill(active: boolean, color: string): React.CSSProperties {
  return {
    flex: "0 0 auto", padding: "5px 10px", borderRadius: 999,
    fontSize: 9, letterSpacing: 1, fontWeight: 700,
    background: active ? `${color}22` : "transparent",
    border: `1px solid ${active ? `${color}88` : "rgba(148,163,184,0.2)"}`,
    color: active ? color : "#94a3b8", cursor: "pointer", fontFamily: "inherit",
    whiteSpace: "nowrap",
  };
}
