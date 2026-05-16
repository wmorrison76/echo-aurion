/**
 * Echo AURION · PurchRec Sprint 1 (iter263)
 *
 * Two casino-grade capabilities the audit flagged as gaps:
 *   - Three-way match exception worklist
 *   - Par-driven auto-PO scanner
 *
 * Endpoints: /api/purchrec/match/* and /api/purchrec/par/*
 * Theme: aurion CSS vars so this panel tracks Light/Dark global toggle.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2, AlertTriangle, RefreshCw, ShoppingCart, ScanLine, FileSearch,
  ArrowRight, Truck,
} from "lucide-react";

const API = window.location.origin;

type MatchLine = {
  sku: string; description: string;
  po_qty: number; po_unit_price: number;
  received_qty: number; invoice_qty: number; invoice_unit_price: number;
};
type Match = {
  po_id: string; vendor: string; outlet: string;
  status: "ok" | "exception"; exceptions: string[]; lines: MatchLine[];
};
type ExceptionsResp = {
  summary: { total_pos: number; ok: number; exception: number; value_at_risk_usd: number };
  exceptions: Match[];
};
type SuggestedLine = { sku: string; description: string; qty_to_order: number; packs: number; unit_price: number; extended: number };
type SuggestedPO = { suggested_po_id: string; outlet: string; vendor: string; lines: SuggestedLine[]; total: number; reason: string };
type ScanResp = {
  summary: { suggested_po_count: number; estimated_spend: number };
  suggestions: SuggestedPO[];
};

export default function PurchRecSprint1() {
  const [tab, setTab] = useState<"match" | "par">("match");
  return (
    <div
      data-testid="purchrec-sprint1"
      style={{
        minHeight: "100%",
        background: "var(--aurion-panel-bg, #0a0e17)",
        color: "var(--aurion-text-primary, #e2e8f0)",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <Header />
      <Tabs value={tab} onChange={setTab} />
      <div style={{ padding: "18px 28px 48px" }}>
        {tab === "match" ? <MatchTab /> : <ParTab />}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{
      padding: "20px 28px 12px",
      borderBottom: "1px solid var(--aurion-border)",
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          Purchasing & Receiving · Sprint 1
        </h1>
        <span style={{ fontSize: 11, color: "var(--aurion-text-muted)", letterSpacing: 1.4, textTransform: "uppercase" }}>
          3-Way Match · Par-Driven Auto-PO
        </span>
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: "var(--aurion-text-secondary)" }}>
        Casino-grade procurement controls. Matches PO ↔ Receipt ↔ Invoice line-by-line and
        auto-cuts replenishment POs when stock dips below reorder point.
      </div>
    </div>
  );
}

function Tabs({ value, onChange }: { value: "match" | "par"; onChange: (v: "match" | "par") => void }) {
  return (
    <div style={{
      display: "flex", gap: 2, padding: "0 28px",
      borderBottom: "1px solid var(--aurion-border)",
    }}>
      <TabBtn id="match" active={value === "match"} onClick={() => onChange("match")} icon={<FileSearch size={14} />}>
        3-Way Match
      </TabBtn>
      <TabBtn id="par" active={value === "par"} onClick={() => onChange("par")} icon={<ScanLine size={14} />}>
        Par-Driven Auto-PO
      </TabBtn>
    </div>
  );
}

function TabBtn({ id, active, onClick, icon, children }: {
  id: string; active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <button
      data-testid={`purchrec-tab-${id}`}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px", border: "none", background: "transparent",
        color: active ? "var(--aurion-accent)" : "var(--aurion-text-secondary)",
        borderBottom: `2px solid ${active ? "var(--aurion-accent)" : "transparent"}`,
        fontSize: 13, fontWeight: active ? 600 : 500, cursor: "pointer",
      }}
    >
      {icon} {children}
    </button>
  );
}

// ════════════════════ 3-WAY MATCH ════════════════════

function MatchTab() {
  const [data, setData] = useState<ExceptionsResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/purchrec/match/exceptions`);
      setData(await r.json());
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const resolve = async (po_id: string) => {
    await fetch(`${API}/api/purchrec/match/resolve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ po_id, note: "Reviewed and accepted via Sprint 1 panel", actor: "admin" }),
    });
    setResolved(prev => new Set([...prev, po_id]));
  };

  if (loading || !data) return <Loading />;
  
  // Guard against API errors returning partial/malformed data
  if (!data.summary || !data.exceptions) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--aurion-watch)" }}>
        ⚠ Failed to load match data. Please refresh or check backend logs.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Stat label="POs scanned" value={data.summary.total_pos} icon={<Truck size={14} />} />
        <Stat label="OK" value={data.summary.ok} icon={<CheckCircle2 size={14} />} tone="ok" />
        <Stat label="Exceptions" value={data.summary.exception} icon={<AlertTriangle size={14} />} tone={data.summary.exception > 0 ? "warn" : "ok"} />
        <Stat label="Value at risk" value={`$${data.summary.value_at_risk_usd.toLocaleString()}`} icon={<AlertTriangle size={14} />} tone={data.summary.value_at_risk_usd > 0 ? "warn" : "ok"} />
      </div>

      <Card title={`Exception worklist · ${data.exceptions.length}`}>
        {data.exceptions.length === 0 ? (
          <Empty msg="✓ All purchase orders match clean — no exceptions." />
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {data.exceptions.map(m => (
              <div key={m.po_id} data-testid={`match-exception-${m.po_id}`} style={{
                padding: 14, borderRadius: 10,
                background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
              }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                  <strong style={{ color: "var(--aurion-accent)" }}>{m.po_id}</strong>
                  <span style={{ color: "var(--aurion-text-muted)", fontSize: 12 }}>
                    {m.vendor} · {m.outlet}
                  </span>
                  <span style={{ marginLeft: "auto", ...statusPill(m.status) }}>{m.status}</span>
                </div>

                <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
                  {m.exceptions.map((x, i) => (
                    <div key={i} style={{
                      padding: "6px 10px", borderRadius: 6, fontSize: 12,
                      background: "rgba(245,158,11,0.10)",
                      color: "var(--aurion-watch)",
                      border: "1px solid var(--aurion-border)",
                    }}>
                      ⚠ {x}
                    </div>
                  ))}
                </div>

                {/* Line table */}
                <div style={{ overflow: "auto" }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                    <thead style={{ color: "var(--aurion-text-muted)", textAlign: "left" }}>
                      <tr>
                        <th style={th}>SKU</th>
                        <th style={th}>Description</th>
                        <th style={thNum}>PO qty</th>
                        <th style={thNum}>Received</th>
                        <th style={thNum}>Invoice qty</th>
                        <th style={thNum}>PO $</th>
                        <th style={thNum}>Inv $</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.lines.map(ln => {
                        const qtyMis = ln.po_qty !== ln.received_qty || ln.received_qty !== ln.invoice_qty;
                        const priceMis = ln.po_unit_price !== ln.invoice_unit_price;
                        return (
                          <tr key={ln.sku} style={{ borderTop: "1px solid var(--aurion-border)" }}>
                            <td style={td}><code>{ln.sku}</code></td>
                            <td style={td}>{ln.description}</td>
                            <td style={tdNum}>{ln.po_qty}</td>
                            <td style={{ ...tdNum, color: qtyMis ? "var(--aurion-watch)" : undefined }}>{ln.received_qty}</td>
                            <td style={{ ...tdNum, color: qtyMis ? "var(--aurion-watch)" : undefined }}>{ln.invoice_qty}</td>
                            <td style={tdNum}>${ln.po_unit_price.toFixed(2)}</td>
                            <td style={{ ...tdNum, color: priceMis ? "var(--aurion-watch)" : undefined }}>${ln.invoice_unit_price.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button
                    onClick={() => resolve(m.po_id)}
                    disabled={resolved.has(m.po_id)}
                    data-testid={`resolve-${m.po_id}`}
                    style={{
                      padding: "8px 14px", borderRadius: 8,
                      background: resolved.has(m.po_id) ? "rgba(16,185,129,0.14)" : "var(--aurion-accent)",
                      color: resolved.has(m.po_id) ? "var(--aurion-healthy)" : "#0b0f14",
                      border: "none", fontWeight: 700, fontSize: 12, cursor: "pointer",
                    }}>
                    {resolved.has(m.po_id) ? "✓ Resolved" : "Mark resolved"}
                  </button>
                  <button
                    onClick={load}
                    style={{
                      padding: "8px 14px", borderRadius: 8,
                      background: "transparent", border: "1px solid var(--aurion-border)",
                      color: "var(--aurion-text-secondary)", fontSize: 12, cursor: "pointer",
                    }}>
                    <RefreshCw size={12} style={{ marginRight: 4, verticalAlign: -2 }} /> Refresh
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ════════════════════ PAR + AUTO-PO ════════════════════

function ParTab() {
  const [scan, setScan] = useState<ScanResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setScan(await (await fetch(`${API}/api/purchrec/par/scan`)).json());
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const cutAll = async () => {
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/purchrec/par/auto-po`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actor: "admin", auto_submit: true }),
      });
      const j = await r.json();
      setCreated(j.pos || []);
    } finally { setBusy(false); }
  };

  if (loading || !scan) return <Loading />;

  // Guard against API errors returning partial/malformed data
  if (!scan.summary || !scan.suggestions) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--aurion-watch)" }}>
        ⚠ Failed to load par scan data. Please refresh or check backend logs.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <Stat label="Suggested POs" value={scan.summary.suggested_po_count} icon={<ShoppingCart size={14} />} />
        <Stat label="Est. spend" value={`$${scan.summary.estimated_spend.toLocaleString()}`} icon={<ShoppingCart size={14} />} tone="warn" />
      </div>

      <Card title="Suggested replenishment POs">
        {scan.suggestions.length === 0 ? (
          <Empty msg="✓ All SKUs at par — nothing to order." />
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <button
                onClick={cutAll} disabled={busy}
                data-testid="purchrec-auto-po-all"
                style={{
                  padding: "10px 16px", borderRadius: 8,
                  background: "var(--aurion-accent)", color: "#0b0f14",
                  border: "none", fontWeight: 700, cursor: "pointer", fontSize: 12,
                  opacity: busy ? 0.6 : 1,
                }}>
                {busy ? "Cutting…" : `Cut all ${scan.suggestions.length} POs → Approval queue`}
              </button>
              <button
                onClick={load}
                style={{
                  padding: "10px 14px", borderRadius: 8,
                  background: "transparent", border: "1px solid var(--aurion-border)",
                  color: "var(--aurion-text-secondary)", fontSize: 12, cursor: "pointer",
                }}>
                <RefreshCw size={12} style={{ marginRight: 4, verticalAlign: -2 }} /> Refresh
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {scan.suggestions.map(s => (
                <div key={s.suggested_po_id} data-testid={`par-suggestion-${s.suggested_po_id}`} style={{
                  padding: 14, borderRadius: 10,
                  background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
                }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                    <strong style={{ color: "var(--aurion-accent)" }}>{s.suggested_po_id}</strong>
                    <span style={{ fontSize: 12, color: "var(--aurion-text-muted)" }}>
                      {s.vendor} · {s.outlet}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--aurion-watch)", marginLeft: 8 }}>{s.reason}</span>
                    <strong style={{ marginLeft: "auto", color: "var(--aurion-accent)" }}>${s.total.toLocaleString()}</strong>
                  </div>
                  <div style={{ overflow: "auto" }}>
                    <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                      <thead style={{ color: "var(--aurion-text-muted)", textAlign: "left" }}>
                        <tr><th style={th}>SKU</th><th style={th}>Description</th><th style={thNum}>Qty</th><th style={thNum}>Packs</th><th style={thNum}>Unit $</th><th style={thNum}>Ext $</th></tr>
                      </thead>
                      <tbody>
                        {s.lines.map(ln => (
                          <tr key={ln.sku} style={{ borderTop: "1px solid var(--aurion-border)" }}>
                            <td style={td}><code>{ln.sku}</code></td>
                            <td style={td}>{ln.description}</td>
                            <td style={tdNum}>{ln.qty_to_order}</td>
                            <td style={tdNum}>{ln.packs}</td>
                            <td style={tdNum}>${ln.unit_price.toFixed(2)}</td>
                            <td style={tdNum}>${ln.extended.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            {created.length > 0 && (
              <div style={{
                marginTop: 16, padding: 12, borderRadius: 8,
                background: "rgba(16,185,129,0.10)",
                border: "1px solid var(--aurion-healthy)",
                color: "var(--aurion-healthy)", fontSize: 13,
              }}>
                ✓ Created {created.length} PO(s) in Purchasing Approvals queue:{" "}
                {created.map(p => p.po_id).join(", ")}
                <ArrowRight size={12} style={{ marginLeft: 6, verticalAlign: -2 }} />
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// ════════════════════ primitives ════════════════════

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{
      padding: 16, borderRadius: 10,
      background: "var(--aurion-surface-elevated, #1a1f2e)",
      border: "1px solid var(--aurion-border)",
    }}>
      <h3 style={{
        margin: "0 0 12px", fontSize: 11, fontWeight: 700,
        letterSpacing: 1.6, textTransform: "uppercase",
        color: "var(--aurion-text-muted)",
      }}>{title}</h3>
      {children}
    </section>
  );
}
function Stat({ label, value, icon, tone }: {
  label: string; value: string | number; icon?: React.ReactNode;
  tone?: "ok" | "warn";
}) {
  const color =
    tone === "warn" ? "var(--aurion-watch)" :
    tone === "ok" ? "var(--aurion-healthy)" : "var(--aurion-accent)";
  return (
    <div style={{
      padding: 14, borderRadius: 10,
      background: "var(--aurion-surface-elevated)",
      border: "1px solid var(--aurion-border)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6,
                    fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4,
                    color: "var(--aurion-text-muted)", marginBottom: 6 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
function Loading() {
  return <div style={{ padding: 40, textAlign: "center", color: "var(--aurion-text-muted)" }}>Loading…</div>;
}
function Empty({ msg }: { msg: string }) {
  return <div style={{ padding: 40, textAlign: "center", color: "var(--aurion-text-muted)" }}>{msg}</div>;
}
function statusPill(s: string): React.CSSProperties {
  const map: Record<string, [string, string]> = {
    ok: ["rgba(16,185,129,0.14)", "var(--aurion-healthy)"],
    exception: ["rgba(245,158,11,0.14)", "var(--aurion-watch)"],
  };
  const [bg, fg] = map[s] || ["rgba(100,116,139,0.14)", "var(--aurion-text-muted)"];
  return {
    padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700,
    letterSpacing: 1, textTransform: "uppercase",
    background: bg, color: fg,
  };
}
const th: React.CSSProperties  = { padding: "6px 8px", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 };
const thNum: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties  = { padding: "8px", whiteSpace: "nowrap" };
const tdNum: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
