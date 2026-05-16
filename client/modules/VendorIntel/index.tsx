import React, { useState, useEffect } from "react";

const BACKEND = window.location.origin;
function fmt(n: number) { return n ? "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "$0"; }

function Badge({ text, variant }: { text: string; variant: string }) {
  const c: Record<string, string> = { success: "#10b981", warning: "#f59e0b", danger: "#ef4444", info: "#3b82f6", neutral: "#64748b" };
  const color = c[variant] || "#64748b";
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, letterSpacing: "0.04em", textTransform: "uppercase" }}>{text}</span>;
}

export default function VendorIntel() {
  const [comparisons, setComparisons] = useState<any>(null);
  const [rogue, setRogue] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);
  const [tab, setTab] = useState("compare");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [comp, rg, al] = await Promise.all([
        fetch(`${BACKEND}/api/vendor-intel/price-comparison`).then(r => r.json()),
        fetch(`${BACKEND}/api/vendor-intel/rogue-spend`).then(r => r.json()),
        fetch(`${BACKEND}/api/vendor-intel/price-alerts`).then(r => r.json()),
      ]);
      setComparisons(comp);
      setRogue(rg);
      setAlerts(al);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading Vendor Intelligence...</div>;

  const card: React.CSSProperties = { background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden", marginBottom: 14 };
  const th: React.CSSProperties = { padding: "8px 12px", textAlign: "left", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(148,163,184,0.4)", borderBottom: "1px solid rgba(255,255,255,0.04)" };
  const td: React.CSSProperties = { padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.02)", fontSize: 11, color: "#94a3b8" };
  const mono: React.CSSProperties = { fontFamily: "'IBM Plex Mono', monospace" };
  const TABS = [{ id: "compare", l: "Price Comparison" }, { id: "rogue", l: `Rogue Spend (${rogue?.rogue_count || 0})` }, { id: "alerts", l: `Price Alerts (${alerts?.alert_count || 0})` }];

  const items = (comparisons?.comparisons || []).filter((c: any) => !search || c.item.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ fontFamily: "'IBM Plex Sans', -apple-system, sans-serif", padding: 24, color: "#e2e8f0" }} data-testid="vendor-intel-panel">
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 300, letterSpacing: "0.12em", color: "#c8a97e", margin: 0 }}>VENDOR PRICE INTELLIGENCE</h1>
        <p style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", marginTop: 2 }}>Side-by-side vendor pricing &bull; Rogue spend detection &bull; Price increase alerts</p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
        {[
          { l: "Items Tracked", v: comparisons?.total_items || 0, c: "#3b82f6" },
          { l: "With Savings", v: comparisons?.items_with_savings || 0, c: "#10b981" },
          { l: "Rogue Spend", v: fmt(rogue?.total_rogue_spend || 0), c: rogue?.total_rogue_spend > 0 ? "#ef4444" : "#10b981" },
          { l: "Price Alerts", v: alerts?.alert_count || 0, c: alerts?.alert_count > 0 ? "#f59e0b" : "#10b981" },
        ].map((k, i) => (
          <div key={i} style={{ ...card, padding: "14px 16px", marginBottom: 0 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.5)" }}>{k.l}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: k.c, ...mono }}>{k.v}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 3, marginBottom: 16, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`vi-tab-${t.id}`} onClick={() => setTab(t.id)}
            style={{ padding: "8px 18px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500, borderRadius: "6px 6px 0 0",
              background: tab === t.id ? "rgba(200,169,126,0.10)" : "transparent", color: tab === t.id ? "#c8a97e" : "#64748b",
              borderBottom: tab === t.id ? "2px solid #c8a97e" : "2px solid transparent" }}>{t.l}</button>
        ))}
      </div>

      {/* Price Comparison */}
      {tab === "compare" && (
        <div>
          <input data-testid="search-items" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: 300, padding: "8px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)", color: "#e2e8f0", fontSize: 12, marginBottom: 12, outline: "none" }} />
          <div style={card}>
            <div style={{ maxHeight: 500, overflow: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Item</th><th style={th}>Best Vendor</th><th style={{ ...th, textAlign: "right" }}>Price</th><th style={th}>Unit</th><th style={th}>Trend</th><th style={{ ...th, textAlign: "right" }}>Spread</th><th style={th}>Vendors</th></tr></thead>
                <tbody>
                  {items.map((c: any, i: number) => (
                    <tr key={i}>
                      <td style={{ ...td, fontWeight: 500, color: "#f1f5f9" }}>{c.item}</td>
                      <td style={{ ...td, color: "#10b981" }}>{c.cheapest_vendor}</td>
                      <td style={{ ...td, ...mono, textAlign: "right", fontWeight: 600 }}>{fmt(c.cheapest_price)}</td>
                      <td style={td}>{c.unit}</td>
                      <td style={td}>
                        {c.vendors?.[0]?.price_trend === "rising" ? <Badge text="Rising" variant="danger" /> :
                         c.vendors?.[0]?.price_trend === "falling" ? <Badge text="Falling" variant="success" /> :
                         <Badge text="Stable" variant="neutral" />}
                      </td>
                      <td style={{ ...td, ...mono, textAlign: "right", color: c.price_spread_pct > 5 ? "#ef4444" : "#64748b" }}>
                        {c.price_spread_pct > 0 ? `${c.price_spread_pct}%` : "-"}
                      </td>
                      <td style={td}>{c.vendor_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rogue Spend */}
      {tab === "rogue" && (
        <div>
          {rogue?.rogue_count === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: "#10b981", marginBottom: 4 }}>No Rogue Spend Detected</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>All purchases are from the optimal vendor for each item</div>
            </div>
          ) : (
            <div style={card}>
              <div style={{ maxHeight: 400, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Item</th><th style={th}>Ordered From</th><th style={{ ...th, textAlign: "right" }}>Paid</th><th style={th}>Cheaper At</th><th style={{ ...th, textAlign: "right" }}>Price</th><th style={{ ...th, textAlign: "right" }}>Overpay</th></tr></thead>
                  <tbody>
                    {(rogue?.rogue_items || []).map((r: any, i: number) => (
                      <tr key={i}>
                        <td style={{ ...td, fontWeight: 500, color: "#f1f5f9" }}>{r.item}</td>
                        <td style={{ ...td, color: "#ef4444" }}>{r.ordered_from}</td>
                        <td style={{ ...td, ...mono, textAlign: "right" }}>{fmt(r.price_paid)}</td>
                        <td style={{ ...td, color: "#10b981" }}>{r.cheapest_vendor}</td>
                        <td style={{ ...td, ...mono, textAlign: "right" }}>{fmt(r.cheapest_price)}</td>
                        <td style={{ ...td, ...mono, textAlign: "right", color: "#ef4444", fontWeight: 600 }}>{fmt(r.overpayment)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Price Alerts */}
      {tab === "alerts" && (
        <div>
          {(alerts?.alerts || []).length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 14, color: "#10b981" }}>No Price Increases Detected</div>
            </div>
          ) : (
            (alerts?.alerts || []).map((a: any, i: number) => (
              <div key={i} style={{ ...card, borderLeft: `3px solid ${a.severity === "critical" ? "#ef4444" : a.severity === "warning" ? "#f59e0b" : "#3b82f6"}` }}>
                <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontWeight: 600, color: "#f1f5f9" }}>{a.item}</span>
                    <span style={{ color: "#64748b", marginLeft: 8, fontSize: 11 }}>from {a.vendor}</span>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ ...mono, fontSize: 11, color: "#64748b" }}>{fmt(a.previous_price)}</span>
                    <span style={{ color: "#64748b" }}>&rarr;</span>
                    <span style={{ ...mono, fontSize: 13, fontWeight: 600, color: "#ef4444" }}>{fmt(a.current_price)}</span>
                    <Badge text={`+${a.increase_pct}%`} variant="danger" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
