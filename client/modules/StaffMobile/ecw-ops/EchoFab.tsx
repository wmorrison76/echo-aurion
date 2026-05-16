/** iter228 · Mobile Echo FAB + Activity/Dashboard/P&L rail.
 *
 * Sits bottom-right *above* the tab bar so it no longer blocks the Photos
 * tab button (William's fix — was blocking the tab underneath).
 *
 * Tap once → opens the right-side rail with:
 *   • Activity feed  (real events · auto-refreshes only when visible)
 *   • Show Dashboard (outlet KPIs · switch outlets)
 *   • Show my P&L   (MTD P&L with forecast/budget variance banners)
 *
 * Battery-safe: polling is paused when tab is backgrounded or rail closed.
 */
import React from "react";
import { API } from "@/lib/api-url";

type RailView = "activity" | "dashboard" | "pnl";

export function EchoFab({ outletId, onSwitchOutlet }: {
  outletId: string;
  onSwitchOutlet?: (id: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState<RailView>("activity");

  return (
    <>
      {/* ECHO pill — sits well above the tab bar so it never blocks the
          Photos button (William's iter230 fix). Re-shaped from the iter228
          gold circle to a distinct pill labelled ECHO so it reads as an
          action and not a decoration. */}
      <button data-testid="echo-mobile-fab" onClick={() => setOpen(true)}
        aria-label="Open Echo — Activity · Dashboard · P&L"
        style={{
          position: "fixed",
          right: 14,
          bottom: 98, // 68 tabbar + 30 clearance so photos tab is never blocked
          padding: "10px 16px", borderRadius: 22,
          background: "linear-gradient(95deg, rgba(200,169,126,0.98) 0%, rgba(148,103,37,0.92) 100%)",
          border: "1px solid rgba(255,255,255,0.18)",
          color: "#0a0e1a", fontSize: 12, cursor: "pointer",
          boxShadow: "0 10px 28px rgba(200,169,126,0.45), 0 2px 6px rgba(0,0,0,0.4)",
          zIndex: 9999990, fontWeight: 700, letterSpacing: 2,
          display: "flex", alignItems: "center", gap: 6,
        }}>
        <span style={{ fontSize: 14, lineHeight: 1 }}>◉</span>
        <span>ECHO</span>
      </button>

      {open && (
        <EchoRail outletId={outletId} view={view} onSetView={setView}
                   onClose={() => setOpen(false)}
                   onSwitchOutlet={onSwitchOutlet} />
      )}
    </>
  );
}


function EchoRail({ outletId, view, onSetView, onClose, onSwitchOutlet }: {
  outletId: string; view: RailView; onSetView: (v: RailView) => void;
  onClose: () => void; onSwitchOutlet?: (id: string) => void;
}) {
  return (
    <div data-testid="echo-rail-scrim" onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
                zIndex: 9999995 }}>
      <div onClick={(e) => e.stopPropagation()} data-testid="echo-rail"
        style={{
          position: "absolute", right: 0, top: 0, bottom: 0,
          width: "min(86%, 380px)", background: "#0a0e1a",
          borderLeft: "1px solid rgba(200,169,126,0.3)",
          display: "flex", flexDirection: "column",
        }}>
        {/* Header */}
        <header style={{
          padding: "14px 16px 10px", borderBottom: "1px solid rgba(200,169,126,0.15)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 9, letterSpacing: 3, color: "#c8a97e", fontWeight: 700 }}>
              ECHO
            </div>
            <h2 style={{ fontSize: 16, margin: "2px 0 0", color: "#f5efe4", fontWeight: 400 }}>
              {view === "activity" ? "Activity" :
               view === "dashboard" ? "Dashboard" : "P&L"}
            </h2>
          </div>
          <button data-testid="echo-rail-close" onClick={onClose}
            style={{ background: "transparent", border: "1px solid rgba(148,163,184,0.2)",
                      color: "#94a3b8", padding: "6px 10px", borderRadius: 6,
                      fontSize: 13, cursor: "pointer" }}>
            ✕
          </button>
        </header>

        {/* View-switcher chips */}
        <div style={{ display: "flex", gap: 6, padding: "10px 16px 4px" }}>
          {(["activity", "dashboard", "pnl"] as RailView[]).map((v) => (
            <button key={v} data-testid={`echo-rail-tab-${v}`}
              onClick={() => onSetView(v)}
              style={{
                flex: 1, padding: "6px 8px",
                background: view === v ? "rgba(200,169,126,0.15)" : "transparent",
                border: `1px solid ${view === v ? "rgba(200,169,126,0.5)" : "rgba(148,163,184,0.15)"}`,
                borderRadius: 6, color: view === v ? "#c8a97e" : "#94a3b8",
                fontSize: 11, fontWeight: 600, textTransform: "uppercase",
                letterSpacing: 1, cursor: "pointer",
              }}>
              {v === "pnl" ? "P&L" : v}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {view === "activity" && <ActivityView outletId={outletId} />}
          {view === "dashboard" && <DashboardView outletId={outletId} onSwitchOutlet={onSwitchOutlet} />}
          {view === "pnl" && <PnlView outletId={outletId} />}
        </div>
      </div>
    </div>
  );
}


// ── Activity feed ──────────────────────────────────────────────────────
function ActivityView({ outletId }: { outletId: string }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const r = await fetch(`${API()}/api/ecw-ops/activity?outlet_id=${outletId}&limit=30`);
        const d = await r.json();
        if (!cancelled) setRows(d?.rows || []);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Fetch failed");
      }
    }
    void load();
    // Battery-safe polling: only while tab is visible
    const tick = () => { if (!document.hidden) void load(); };
    const int = setInterval(tick, 60_000); // 60s interval
    const onVis = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; clearInterval(int);
                     document.removeEventListener("visibilitychange", onVis); };
  }, [outletId]);

  if (err) return <Empty icon="⚠" text={err} />;
  if (rows.length === 0) return <Empty icon="⏱" text="No recent activity yet. Come back after a line check or PO." />;

  return (
    <div data-testid="echo-activity-list" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows.map((r) => <ActivityRow key={r.id} row={r} />)}
    </div>
  );
}


function ActivityRow({ row }: { row: any }) {
  const color = kindColor(row.kind);
  return (
    <div data-testid={`echo-activity-${row.id}`} style={{
      padding: 10, background: "rgba(200,169,126,0.03)",
      borderLeft: `3px solid ${color}`,
      border: "1px solid rgba(200,169,126,0.1)",
      borderRadius: 4,
    }}>
      <div style={{ fontSize: 13, color: "#f5efe4", fontWeight: 500 }}>
        {row.title}
      </div>
      {row.detail && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
          {row.detail}
        </div>
      )}
      <div style={{ fontSize: 9, color: "#64748b", marginTop: 4, letterSpacing: 1, textTransform: "uppercase" }}>
        {row.kind} · {friendlyTime(row.created_at)}
      </div>
    </div>
  );
}


function kindColor(kind: string): string {
  const map: Record<string, string> = {
    po_sent: "#c8a97e", delivery: "#10b981", line_check: "#3b82f6",
    invoice_flagged: "#f43f5e", commissary_request: "#a855f7", waste: "#fbbf24",
  };
  return map[kind] || "#94a3b8";
}


// ── Dashboard ─────────────────────────────────────────────────────────
function DashboardView({ outletId, onSwitchOutlet }: {
  outletId: string; onSwitchOutlet?: (id: string) => void;
}) {
  const [data, setData] = React.useState<any>(null);
  const [outlets, setOutlets] = React.useState<any[]>([]);

  React.useEffect(() => {
    const ac = new AbortController();
    async function load() {
      try {
        const [a, b] = await Promise.all([
          fetch(`${API()}/api/ecw-ops/dashboard?outlet_id=${outletId}`, { signal: ac.signal }).then((r) => r.json()),
          fetch(`${API()}/api/echoaurium/outlets`, {
            signal: ac.signal, headers: { "X-User-Id": "chef-william" },
          }).then((r) => r.json()),
        ]);
        setData(a);
        setOutlets(b?.rows || []);
      } catch {}
    }
    void load();
    return () => ac.abort();
  }, [outletId]);

  if (!data) return <Empty icon="⏳" text="Loading…" />;
  const k = data.kpis || {};

  return (
    <div data-testid="echo-dashboard-root">
      {/* Outlet switcher inside rail */}
      {outlets.length > 1 && onSwitchOutlet && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", marginBottom: 6 }}>
            DRIVING OUTLET
          </div>
          <select data-testid="dashboard-outlet-switcher" value={outletId}
            onChange={(e) => onSwitchOutlet(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(200,169,126,0.3)", borderRadius: 6,
                      color: "#f5efe4", fontSize: 13 }}>
            {outlets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ fontSize: 15, color: "#f5efe4", fontWeight: 500, marginBottom: 2 }}>
        {data.outlet_name}
      </div>
      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 14 }}>
        {data.today}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <Kpi label="Today sales" value={`$${k.today_sales?.toLocaleString() || 0}`} color="#c8a97e" />
        <Kpi label="Covers" value={k.today_covers?.toString() || "0"} color="#3b82f6" />
        <Kpi label="Avg check" value={`$${k.avg_check?.toFixed(2) || "0.00"}`} color="#10b981" />
        <Kpi label="Open POs" value={k.open_pos?.toString() || "0"} color="#fbbf24" />
        <Kpi label="Open reqs" value={k.open_requisitions?.toString() || "0"} color="#a855f7" />
        <Kpi label="Deliveries" value={k.deliveries_today?.toString() || "0"} color="#10b981" />
        <Kpi label="Flagged invoices" value={k.flagged_invoices?.toString() || "0"}
          color={k.flagged_invoices ? "#f43f5e" : "#64748b"} />
      </div>
    </div>
  );
}


// ── P&L (full EchoAurium GL-level statement) ────────────────────────────
function PnlView({ outletId }: { outletId: string }) {
  const [compare, setCompare] = React.useState<"budget" | "forecast" | "prior_year">("budget");
  const [data, setData] = React.useState<any>(null);
  const [occ, setOcc] = React.useState<any>(null);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({ revenue: true });

  React.useEffect(() => {
    Promise.all([
      fetch(`${API()}/api/echoaurium/pnl/full?outlet_id=${outletId}&period=2026-03&compare=${compare}`).then((r) => r.json()),
      fetch(`${API()}/api/echoaurium/pnl/occupancy?period=2026-03`).then((r) => r.json()),
    ]).then(([p, o]) => {
      setData(p);
      setOcc(o?.occupancy);
    });
  }, [outletId, compare]);

  if (!data) return <Empty icon="⏳" text="Loading EchoAurium P&L…" />;
  if (!data.ok) {
    return <Empty icon="⚠" text={data.detail || "No P&L data"} />;
  }

  const k = data.kpis || {};
  const banners = data.banners || {};
  const sections = data.sections || {};

  const SECTION_ORDER = [
    { key: "revenue",         title: "REVENUE",           emoji: "💰" },
    { key: "cogs",            title: "COST OF SALES",     emoji: "🧾" },
    { key: "labor",           title: "LABOR",             emoji: "👥" },
    { key: "payroll_related", title: "PAYROLL-RELATED",   emoji: "📋" },
    { key: "other_exp",       title: "OTHER EXPENSES",    emoji: "⚙️" },
  ];

  return (
    <div data-testid="echo-pnl-root">
      {/* Compare toggle */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {(["budget", "forecast", "prior_year"] as const).map((c) => (
          <button key={c} data-testid={`pnl-compare-${c}`}
            onClick={() => setCompare(c)}
            style={{
              flex: 1, padding: "6px 4px",
              background: compare === c ? "rgba(200,169,126,0.15)" : "transparent",
              border: `1px solid ${compare === c ? "rgba(200,169,126,0.5)" : "rgba(148,163,184,0.15)"}`,
              borderRadius: 6, color: compare === c ? "#c8a97e" : "#94a3b8",
              fontSize: 10, fontWeight: 600, textTransform: "uppercase",
              letterSpacing: 1, cursor: "pointer",
            }}>
            vs {c === "prior_year" ? "PY" : c}
          </button>
        ))}
      </div>

      {/* Header */}
      <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>
        {data.outlet_name} · {data.period} · {data.outlet_kind}
      </div>

      {/* Hotel-level occupancy strip (top of P&L per William — resort context) */}
      {occ && (
        <div data-testid="occupancy-strip" style={{
          padding: "8px 10px", marginBottom: 10, borderRadius: 6,
          background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)",
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#93c5fd", marginBottom: 4 }}>
            PIER SIXTY SIX · RESORT
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            <MiniStat label="Occ" value={`${occ.occupancy_pct}%`} />
            <MiniStat label="Rooms" value={occ.occupied_rooms?.toLocaleString()} />
            <MiniStat label="ADR" value={`$${Math.round(occ.adr || 0)}`} />
            <MiniStat label="RevPAR" value={`$${Math.round(occ.revpar || 0)}`} />
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
        <KpiTile label="Revenue" value={`$${k.total_revenue?.toLocaleString()}`} color="#c8a97e" />
        <KpiTile label="Food %" value={`${k.food_cost_pct}%`} color={k.food_cost_pct > 32 ? "#f43f5e" : "#10b981"} />
        <KpiTile label="Labor %" value={`${k.labor_cost_pct}%`} color={k.labor_cost_pct > 35 ? "#f43f5e" : "#10b981"} />
        <KpiTile label="Prime %" value={`${k.prime_cost_pct}%`} color={k.prime_cost_pct > 65 ? "#f43f5e" : k.prime_cost_pct > 55 ? "#fbbf24" : "#10b981"} />
        <KpiTile label="GP %" value={`${k.gross_profit_pct}%`} color="#a855f7" />
        <KpiTile label="Dept P %" value={`${k.departmental_profit_pct}%`} color={k.departmental_profit_pct > 15 ? "#10b981" : "#fbbf24"} />
      </div>

      {/* Collapsible GL sections */}
      {SECTION_ORDER.map(({ key, title, emoji }) => {
        const sec = sections[key];
        if (!sec) return null;
        const banner = banners[key];
        const isOpen = !!expanded[key];
        return (
          <PnlSection key={key} title={title} emoji={emoji} section={sec}
            banner={banner} open={isOpen} compare={compare}
            onToggle={() => setExpanded((p) => ({ ...p, [key]: !p[key] }))} />
        );
      })}

      {/* Drill-down */}
      <button data-testid="pnl-invoices-btn"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("echo:open-invoices", {
            detail: { outlet_id: outletId },
          }));
        }}
        style={{
          width: "100%", marginTop: 14, padding: 10,
          background: "rgba(200,169,126,0.08)",
          border: "1px solid rgba(200,169,126,0.3)", borderRadius: 6,
          color: "#c8a97e", fontSize: 12, fontWeight: 600, cursor: "pointer",
        }}>
        View invoices → 🚩 flag mis-coded
      </button>
    </div>
  );
}


function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 12, color: "#f5efe4", fontFamily: "monospace", marginTop: 2, fontWeight: 500 }}>{value}</div>
    </div>
  );
}


function KpiTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div data-testid={`pnl-kpi-${label.toLowerCase().replace(/\s/g, "-")}`}
      style={{
        padding: "8px 10px", background: "rgba(200,169,126,0.04)",
        border: "1px solid rgba(200,169,126,0.15)", borderRadius: 6,
      }}>
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#94a3b8", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 14, color, fontFamily: "monospace", marginTop: 3, fontWeight: 500 }}>{value}</div>
    </div>
  );
}


function PnlSection({ title, emoji, section, banner, open, compare, onToggle }: {
  title: string; emoji: string; section: any;
  banner?: { color: string; flash: boolean; label: string };
  open: boolean; compare: string; onToggle: () => void;
}) {
  const bg = banner?.color === "red"   ? "rgba(244,63,94,0.08)"
           : banner?.color === "green" ? "rgba(16,185,129,0.06)"
           : "rgba(200,169,126,0.04)";
  const border = banner?.color === "red"   ? "rgba(244,63,94,0.4)"
              : banner?.color === "green" ? "rgba(16,185,129,0.3)"
              : "rgba(200,169,126,0.15)";
  return (
    <div data-testid={`pnl-section-${title.toLowerCase().replace(/\s/g, "-")}`}
      style={{
        marginBottom: 6, background: bg, border: `1px solid ${border}`,
        borderRadius: 6, overflow: "hidden",
        animation: banner?.flash ? "pnl-flash 1.4s ease-in-out infinite" : undefined,
      }}>
      <style>{`
        @keyframes pnl-flash {
          0%, 100% { box-shadow: 0 0 0 rgba(244,63,94,0); }
          50% { box-shadow: 0 0 20px rgba(244,63,94,0.4); }
        }
      `}</style>
      <button onClick={onToggle} data-testid={`pnl-section-toggle-${title.toLowerCase().replace(/\s/g, "-")}`}
        style={{
          width: "100%", padding: "10px 12px", textAlign: "left",
          background: "transparent", border: "none", cursor: "pointer",
          color: "#f5efe4", display: "flex", justifyContent: "space-between",
          alignItems: "center",
        }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#c8a97e", fontWeight: 700 }}>
            {emoji} {title}
          </div>
          <div style={{ fontSize: 14, fontFamily: "monospace", marginTop: 2 }}>
            ${section.actual_total?.toLocaleString()}
          </div>
          {banner?.label && (
            <div style={{ fontSize: 10, marginTop: 2,
                           color: banner.color === "red" ? "#fca5a5"
                                : banner.color === "green" ? "#86efac"
                                : "#94a3b8" }}>
              {banner.label}
            </div>
          )}
        </div>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 12px 12px", borderTop: "1px solid rgba(148,163,184,0.08)" }}>
          {section.lines.map((ln: any) => (
            <PnlLineRow key={ln.id} line={ln} compare={compare} />
          ))}
        </div>
      )}
    </div>
  );
}


function PnlLineRow({ line, compare }: { line: any; compare: string }) {
  const cmp = line[compare] || line.budget;
  const variance = line.actual - cmp;
  const sign = variance >= 0 ? "+" : "";
  return (
    <div data-testid={`pnl-line-${line.gl_code}`} style={{
      display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 6,
      padding: "5px 0", fontSize: 11, color: "#cbd5e1",
      borderBottom: "1px solid rgba(148,163,184,0.06)",
    }}>
      <span style={{ fontFamily: "monospace", color: "#64748b" }}>{line.gl_code}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {line.label}
      </span>
      <span style={{ fontFamily: "monospace", textAlign: "right", color: "#f5efe4" }}>
        ${line.actual?.toLocaleString()}
        <span style={{ marginLeft: 6, fontSize: 9,
                        color: variance > 0 ? (line.section === "revenue" ? "#86efac" : "#fca5a5")
                             : (line.section === "revenue" ? "#fca5a5" : "#86efac") }}>
          {sign}${Math.abs(variance).toLocaleString()}
        </span>
      </span>
    </div>
  );
}


function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div data-testid={`kpi-${label.toLowerCase().replace(/\s/g, "-")}`}
      style={{
        padding: "10px 12px", background: "rgba(200,169,126,0.04)",
        border: "1px solid rgba(200,169,126,0.15)", borderRadius: 6,
      }}>
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: "#94a3b8", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 16, color, fontFamily: "monospace", marginTop: 4, fontWeight: 500 }}>
        {value}
      </div>
    </div>
  );
}


function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ padding: "48px 24px", textAlign: "center", color: "#64748b" }}>
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 12 }}>{text}</div>
    </div>
  );
}


function friendlyTime(iso?: string): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}
