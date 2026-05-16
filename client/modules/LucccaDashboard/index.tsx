/**
 * iter182 · Luccca JARVIS Dashboard
 *
 * Two-tab executive hub:
 *   Tab 1 "Executive" — JARVIS-level KPI grid + AI narrative + top tickets + celebrations
 *   Tab 2 "Classic"   — legacy widgets grid (placeholder reusing same KPIs for now)
 *
 * Each tab customisable: click gear → toggle tiles on/off, drag to reorder (localStorage).
 * Share-with-team: POST /api/dashboard/share → URL `/board/{share_id}` (read-only, 2h TTL).
 */
import React, { useEffect, useMemo, useState } from "react";
import { usePanelState } from "@/lib/usePanelState";
import { adminFetch } from "@/lib/admin-auth";
import { useAuth } from "@/lib/auth-context";

const PANEL_ID = "luccca-jarvis-dashboard";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

type Tab = "executive" | "classic";

type Kpi = { label: string; value: any; icon?: string; hint?: string };

const LS_LAYOUT = (tab: Tab) => `luccca-dash-layout-${tab}`;

export default function LucccaDashboard() {
  const { user } = useAuth();
  // iter266.3 · Auto-scope to the outlets this user is assigned to (via
  // admin_users.outlet_ids). "all" or empty list → no scoping filter.
  const userOutletIds = useMemo(() => {
    const list = user?.outlet_ids || [];
    return list.filter((o) => o && o !== "all");
  }, [user?.outlet_ids]);
  const scopeAllOutlets = !userOutletIds.length || (user?.outlet_ids?.includes("all") ?? false);
  const greetingName = useMemo(() => {
    const full = user?.name || "";
    return full.split(/\s+/)[0] || "there";
  }, [user?.name]);

  const [tab, setTab] = usePanelState<Tab>(PANEL_ID, "tab", "executive");
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [order, setOrder] = useState<string[]>([]);
  const [customizing, setCustomizing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_LAYOUT(tab));
      if (raw) {
        const j = JSON.parse(raw);
        setHidden(new Set(j.hidden || []));
        setOrder(j.order || []);
      } else { setHidden(new Set()); setOrder([]); }
    } catch {}
  }, [tab]);

  async function load() {
    setLoading(true);
    try {
      // iter266.3 · Send the user's assigned outlets so the backend can scope
      // KPIs to just what this user oversees. Empty / "all" → portfolio view.
      const params = new URLSearchParams();
      if (userOutletIds.length) params.set("outlets", userOutletIds.join(","));
      const qs = params.toString();
      const r = await fetch(`${API()}/api/dashboard/overview${qs ? "?" + qs : ""}`);
      if (r.ok) setData((await r.json()).overview);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); const id = setInterval(load, 60_000); return () => clearInterval(id); }, [userOutletIds.join(",")]);

  function saveLayout(nextHidden: Set<string>, nextOrder: string[]) {
    setHidden(new Set(nextHidden));
    setOrder([...nextOrder]);
    try {
      localStorage.setItem(LS_LAYOUT(tab), JSON.stringify({ hidden: Array.from(nextHidden), order: nextOrder }));
    } catch {}
  }

  function toggleTile(label: string) {
    const next = new Set(hidden);
    if (next.has(label)) next.delete(label); else next.add(label);
    saveLayout(next, order);
  }

  function moveTile(label: string, dir: -1 | 1) {
    const kpis: Kpi[] = data?.kpi || [];
    const labels = applyOrder(kpis, order).map(k => k.label);
    const i = labels.indexOf(label);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= labels.length) return;
    [labels[i], labels[j]] = [labels[j], labels[i]];
    saveLayout(hidden, labels);
  }

  async function shareBoard() {
    const r = await adminFetch(`${API()}/api/dashboard/share`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tab, layout: { hidden: Array.from(hidden), order },
        expires_minutes: 120,
      }),
    });
    if (!r.ok) { alert("Share failed: " + await r.text()); return; }
    const j = await r.json();
    const url = `${window.location.origin}/board/${j.share_id}`;
    setShareUrl(url);
    try { await navigator.clipboard.writeText(url); } catch {}
  }

  const kpis: Kpi[] = data?.kpi || [];
  const visibleKpis = useMemo(() =>
    applyOrder(kpis, order).filter(k => !hidden.has(k.label)),
    [kpis, order, hidden]
  );
  const topTickets = data?.top_ticket_categories || [];
  const celebrations = data?.celebrations_this_week || [];

  return (
    <div data-testid="luccca-dashboard" style={S.root}>
      {/* Top hero bar */}
      <header style={S.hero}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={S.eyebrow}>LUCCCA · Manager Dashboard</div>
          <h1 style={S.heroTitle}>Good {partOfDay(now)}, {greetingName}</h1>
          <div style={S.heroSub}>
            {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            {" · "}
            {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
            {scopeAllOutlets ? null : (
              <span style={{ marginLeft: 10, fontSize: 11, color: "#c8a97e" }}>
                · Scoped to {userOutletIds.length} outlet{userOutletIds.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {!loading && kpis.length > 0 && (
            <div data-testid="dash-ai-narrative" style={S.narrative}>
              {narrative(data)}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.tabs}>
            <button data-testid="dash-tab-executive" onClick={() => setTab("executive")} style={{ ...S.tabBtn, ...(tab === "executive" ? S.tabBtnActive : {}) }}>Executive</button>
            <button data-testid="dash-tab-classic" onClick={() => setTab("classic")} style={{ ...S.tabBtn, ...(tab === "classic" ? S.tabBtnActive : {}) }}>Classic</button>
          </div>
          <button data-testid="dash-customize" onClick={() => setCustomizing(v => !v)} style={S.chromeBtn}>⚙ {customizing ? "Done" : "Customize"}</button>
          <button data-testid="dash-share" onClick={shareBoard} style={{ ...S.chromeBtn, background: "linear-gradient(90deg, rgba(200,169,126,0.22), rgba(200,169,126,0.05))", color: "#c8a97e", borderColor: "#c8a97e" }}>📡 Share with team</button>
          <button onClick={load} style={S.chromeBtn} title="Refresh">↻</button>
        </div>
      </header>

      {shareUrl && (
        <div data-testid="dash-share-banner" style={S.shareBanner}>
          <span style={{ color: "#86efac" }}>✓ Board link copied to clipboard</span>
          <code style={{ marginLeft: 8, padding: "2px 8px", background: "rgba(0,0,0,0.3)", borderRadius: 4, fontSize: 11, color: "#c8a97e" }}>{shareUrl}</code>
          <button onClick={() => setShareUrl(null)} style={{ marginLeft: "auto", ...S.chromeBtn }}>Dismiss</button>
        </div>
      )}

      <section data-testid={`dash-tab-content-${tab}`} style={S.content}>
        {/* KPI grid */}
        <div style={{ ...S.grid, gridTemplateColumns: tab === "executive" ? "repeat(4, 1fr)" : "repeat(3, 1fr)" }}>
          {visibleKpis.map(k => (
            <KpiTile
              key={k.label} kpi={k}
              customizing={customizing}
              onHide={() => toggleTile(k.label)}
              onMoveLeft={() => moveTile(k.label, -1)}
              onMoveRight={() => moveTile(k.label, 1)}
            />
          ))}
          {customizing && kpis.filter(k => hidden.has(k.label)).map(k => (
            <button key={"h_" + k.label} data-testid={`dash-show-${k.label}`} onClick={() => toggleTile(k.label)} style={{ ...S.kpi, opacity: 0.4, cursor: "pointer", border: "1px dashed rgba(200,169,126,0.4)" }}>
              <div style={{ fontSize: 12, color: "#c8a97e", textAlign: "center" }}>+ Show<br />{k.label}</div>
            </button>
          ))}
        </div>

        {/* Secondary widgets */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14, marginTop: 16 }}>
          <div data-testid="dash-tickets-widget" style={S.widget}>
            <div style={S.widgetHeader}>🎫 Top open ticket categories</div>
            {topTickets.length === 0
              ? <div style={S.empty}>No open tickets 🎉</div>
              : topTickets.map((t: any) => (
                  <div key={t.category} style={S.ticketRow}>
                    <span style={{ fontSize: 12, color: "#f8fafc", fontWeight: 600, textTransform: "capitalize" }}>{t.category || "(uncategorised)"}</span>
                    <span style={{ fontSize: 14, color: "#c8a97e", fontWeight: 800 }}>{t.count}</span>
                  </div>
                ))}
          </div>

          <div data-testid="dash-celebrations-widget" style={S.widget}>
            <div style={S.widgetHeader}>🎉 Celebrations this week</div>
            {celebrations.length === 0
              ? <div style={S.empty}>Nothing this week.</div>
              : celebrations.slice(0, 6).map((c: any, i: number) => (
                  <div key={i} style={S.celebRow}>
                    <span style={{ fontSize: 20 }}>{c.kind === "birthday" ? "🎂" : c.kind === "anniversary" ? "🏅" : "⭐"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#f8fafc", fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8" }}>
                        {c.department} · {new Date(c.date + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        {c.years ? ` · ${c.years}yr` : ""}
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiTile({ kpi, customizing, onHide, onMoveLeft, onMoveRight }: {
  kpi: Kpi; customizing: boolean;
  onHide: () => void; onMoveLeft: () => void; onMoveRight: () => void;
}) {
  return (
    <div data-testid={`kpi-${kpi.label}`} style={S.kpi}>
      <div style={{ fontSize: 22 }}>{kpi.icon || "◆"}</div>
      <div style={{ fontSize: 34, fontWeight: 800, color: "var(--foreground, #f8fafc)", letterSpacing: -1, marginTop: 4 }}>{fmt(kpi.value)}</div>
      <div style={{ fontSize: 11, color: "var(--muted-foreground, #94a3b8)", marginTop: 4, letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>{kpi.label}</div>
      {kpi.hint && <div style={{ fontSize: 10, color: "var(--muted-foreground, #64748b)", marginTop: 3 }}>{kpi.hint}</div>}
      {customizing && (
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
          <button onClick={onMoveLeft} style={S.tinyBtn} title="Move left">←</button>
          <button onClick={onMoveRight} style={S.tinyBtn} title="Move right">→</button>
          <button onClick={onHide} style={{ ...S.tinyBtn, color: "#fca5a5", borderColor: "rgba(239,68,68,0.3)" }} title="Hide">Hide</button>
        </div>
      )}
    </div>
  );
}

function applyOrder<T extends { label: string }>(arr: T[], order: string[]): T[] {
  if (!order.length) return arr;
  const map = new Map(arr.map(x => [x.label, x]));
  const seen = new Set<string>();
  const out: T[] = [];
  for (const l of order) {
    const v = map.get(l);
    if (v) { out.push(v); seen.add(l); }
  }
  for (const x of arr) if (!seen.has(x.label)) out.push(x);
  return out;
}

function narrative(o: any): string {
  if (!o) return "";
  const k = Object.fromEntries((o.kpi || []).map((x: Kpi) => [x.label, x.value]));
  const bits: string[] = [];
  if (k["Open relay tickets"]) bits.push(`${k["Open relay tickets"]} open ticket${k["Open relay tickets"] === 1 ? "" : "s"} across departments`);
  if (k["Open guest requests"]) bits.push(`${k["Open guest requests"]} guest request${k["Open guest requests"] === 1 ? "" : "s"} in flight`);
  if (k["Activations last 7d"]) bits.push(`${k["Activations last 7d"]} activation${k["Activations last 7d"] === 1 ? "" : "s"} in the last 7 days`);
  if (!bits.length) return "All systems calm — no notable open items.";
  return bits.join(" · ") + ".";
}

function fmt(v: any): string {
  if (v == null) return "—";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}
function partOfDay(d: Date): string {
  const h = d.getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

const S: Record<string, React.CSSProperties> = {
  root: { height: "100%", display: "flex", flexDirection: "column", background: "var(--background, #0a0e1a)", color: "var(--foreground, #f8fafc)" },
  hero: { display: "flex", alignItems: "flex-start", gap: 16, padding: "24px 32px 18px", borderBottom: "1px solid var(--border, rgba(255,255,255,0.06))" },
  eyebrow: { fontSize: 9, letterSpacing: 4, color: "var(--primary, #c8a97e)", textTransform: "uppercase", fontWeight: 700 },
  heroTitle: { fontSize: 32, margin: "6px 0 2px", fontWeight: 300, letterSpacing: -0.5, color: "var(--foreground, #f8fafc)" },
  heroSub: { fontSize: 12, color: "var(--muted-foreground, #94a3b8)" },
  narrative: { marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "linear-gradient(90deg, rgba(200,169,126,0.08), rgba(167,139,250,0.06))", border: "1px solid rgba(200,169,126,0.25)", fontSize: 13, color: "var(--foreground, #e2e8f0)", lineHeight: 1.5 },
  tabs: { display: "inline-flex", padding: 3, borderRadius: 10, background: "var(--muted, rgba(255,255,255,0.04))", border: "1px solid var(--border, rgba(255,255,255,0.1))", gap: 2 },
  tabBtn: { padding: "7px 14px", borderRadius: 7, background: "transparent", color: "var(--muted-foreground, #94a3b8)", border: 0, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", cursor: "pointer" },
  tabBtnActive: { background: "var(--background, #0a0e1a)", color: "var(--foreground, #f8fafc)", boxShadow: "0 1px 2px rgba(0,0,0,0.2)" },
  chromeBtn: { padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border, rgba(255,255,255,0.12))", background: "var(--muted, rgba(255,255,255,0.03))", color: "var(--foreground, #cbd5e1)", fontSize: 11, fontWeight: 600, letterSpacing: 0.3, cursor: "pointer" },
  shareBanner: { display: "flex", alignItems: "center", padding: "8px 24px", background: "rgba(34,197,94,0.08)", borderBottom: "1px solid rgba(34,197,94,0.3)", fontSize: 12 },
  content: { flex: 1, padding: "20px 28px", overflow: "auto" },
  grid: { display: "grid", gap: 14 },
  kpi: { padding: 18, borderRadius: 14, background: "var(--card, rgba(255,255,255,0.03))", border: "1px solid var(--border, rgba(255,255,255,0.08))", display: "flex", flexDirection: "column", alignItems: "flex-start", minHeight: 140 },
  tinyBtn: { padding: "3px 8px", fontSize: 9, letterSpacing: 1, fontWeight: 700, textTransform: "uppercase", background: "transparent", color: "#c8a97e", border: "1px solid rgba(200,169,126,0.3)", borderRadius: 4, cursor: "pointer" },
  widget: { padding: 16, borderRadius: 14, background: "var(--card, rgba(255,255,255,0.03))", border: "1px solid var(--border, rgba(255,255,255,0.08))" },
  widgetHeader: { fontSize: 10, letterSpacing: 3, color: "var(--primary, #c8a97e)", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 },
  empty: { padding: 18, textAlign: "center", fontSize: 12, color: "var(--muted-foreground, #64748b)" },
  ticketRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border, rgba(255,255,255,0.04))" },
  celebRow: { display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid var(--border, rgba(255,255,255,0.04))" },
};
