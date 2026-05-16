/** iter242 · Vendor comparison panel for the Orders flow.
 *
 * Shows: every vendor that quotes the item, group affiliation logo
 * (Avendra/Foodbuy/Entegra/Direct), cheapest highlighted, next delivery date.
 * Tapping a vendor adds the item to the order at that price.
 */
import React from "react";
import { API } from "@/lib/api-url";

type Quote = {
  vendor: string; group_id: string; price: number;
  next_delivery: string; pack_size?: string;
  is_cheapest: boolean; group_logo_letter?: string; group_color?: string;
};

const COMMON_ITEMS = [
  "Cucumber case",
  "Heritage tomato 5#",
  "Whole milk gal",
  "Russet potato 50#",
  "Boneless chicken breast 40#",
  "Wild salmon side",
  "Ribeye 12oz",
  "Mesclun mix 3#",
  "Lemon case 165ct",
  "Sourdough loaf",
];

export function VendorCompareModal({ onClose, onPick }: {
  onClose: () => void;
  onPick?: (item: string, quote: Quote) => void;
}) {
  const [item, setItem] = React.useState<string>(COMMON_ITEMS[0]);
  const [quotes, setQuotes] = React.useState<Quote[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    setLoading(true);
    fetch(`${API()}/api/purchasing/item/${encodeURIComponent(item)}/price-compare`)
      .then((r) => r.json())
      .then((d) => setQuotes((d?.quotes || []).sort((a: Quote, b: Quote) => a.price - b.price)))
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false));
  }, [item]);

  return (
    <div data-testid="vendor-compare-modal" onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 99999988, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "flex-end", backdropFilter: "blur(3px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: "100%", background: "linear-gradient(180deg, #0a0e1a 0%, #1a1f2e 100%)",
        borderRadius: "14px 14px 0 0", padding: 14, paddingBottom: 28,
        maxHeight: "85vh", display: "flex", flexDirection: "column",
        border: "1px solid rgba(212,175,55,0.4)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#d4af37", fontWeight: 700 }}>
              💰 VENDOR COMPARISON
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
              Cheapest auto-highlighted · group affiliation shown
            </div>
          </div>
          <button data-testid="vendor-compare-close" onClick={onClose} style={{
            background: "transparent", color: "#94a3b8",
            border: "1px solid rgba(148,163,184,0.25)", borderRadius: 6,
            width: 30, height: 30, fontSize: 14, cursor: "pointer",
          }}>×</button>
        </div>

        {/* Item picker */}
        <button data-testid="vendor-compare-item-btn"
          onClick={() => setSearchOpen((o) => !o)}
          style={{
            padding: 11, borderRadius: 6, marginBottom: 10,
            background: "rgba(8,12,22,0.8)", border: "1px solid rgba(148,163,184,0.2)",
            color: "#f5efe4", fontSize: 13, textAlign: "left", cursor: "pointer",
            fontFamily: "inherit", display: "flex", justifyContent: "space-between",
          }}>
          <span>{item}</span>
          <span style={{ color: "#64748b" }}>{searchOpen ? "▲" : "▼"}</span>
        </button>

        {searchOpen && (
          <div data-testid="vendor-compare-list" style={{
            maxHeight: 200, overflowY: "auto", marginBottom: 8,
            border: "1px solid rgba(148,163,184,0.15)", borderRadius: 6,
          }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search items…"
              style={{ width: "100%", padding: 8, background: "rgba(8,12,22,0.95)",
                          border: "none", borderBottom: "1px solid rgba(148,163,184,0.15)",
                          color: "#f5efe4", fontSize: 12, fontFamily: "inherit" }} />
            {COMMON_ITEMS.filter((i) => !search || i.toLowerCase().includes(search.toLowerCase())).map((i) => (
              <button key={i} onClick={() => { setItem(i); setSearchOpen(false); }}
                style={{ width: "100%", padding: 9, textAlign: "left",
                            background: "transparent", border: "none",
                            borderBottom: "1px solid rgba(148,163,184,0.08)",
                            color: "#cbd5e1", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {i}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading && <div style={{ padding: 20, color: "#94a3b8", textAlign: "center", fontSize: 12 }}>Loading quotes…</div>}
          {!loading && quotes.map((q, i) => (
            <button key={q.vendor} data-testid={`vendor-quote-${q.vendor.toLowerCase().replace(/\s/g, '-')}`}
              onClick={() => { onPick?.(item, q); onClose(); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: 11, marginBottom: 6, borderRadius: 8,
                background: q.is_cheapest ? "rgba(16,185,129,0.1)" : "rgba(148,163,184,0.05)",
                border: `1px solid ${q.is_cheapest ? "rgba(16,185,129,0.45)" : "rgba(148,163,184,0.15)"}`,
                color: "#f5efe4", textAlign: "left", cursor: "pointer", fontFamily: "inherit",
              }}>
              {q.group_logo_letter && (
                <div style={{
                  width: 36, height: 36, borderRadius: 6, fontWeight: 800, fontSize: 16,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: q.group_color || "#475569", color: "#0a0e1a", flexShrink: 0,
                }}>{q.group_logo_letter}</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {q.vendor}
                  {q.is_cheapest && (
                    <span data-testid="vendor-cheapest-badge" style={{
                      marginLeft: 6, fontSize: 8, padding: "2px 5px", borderRadius: 3,
                      background: "#10b981", color: "#0a0e1a", letterSpacing: 1, fontWeight: 700,
                    }}>CHEAPEST</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>
                  Delivery {q.next_delivery} · {q.pack_size}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 17, fontWeight: 700,
                                color: q.is_cheapest ? "#34d399" : "#f5efe4" }}>
                  ${q.price}
                </div>
                {i > 0 && quotes[0] && (
                  <div style={{ fontSize: 9, color: "#ef4444" }}>
                    +${(q.price - quotes[0].price).toFixed(2)}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
