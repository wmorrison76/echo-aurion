import React, { useState, useEffect, useCallback } from "react";
import {
  Wine, GlassWater, Search, RefreshCw, Camera, ClipboardCheck,
  BarChart3, Calendar, DollarSign, AlertTriangle, ThermometerSun,
  Grape, Martini, Clock, TrendingUp, Package, ChevronDown,
} from "lucide-react";

const API = window.location.origin;
const GET = (p: string) => fetch(`${API}/api/beverage-ops${p}`).then(r => r.json());
const POST = (p: string, b: any = {}) =>
  fetch(`${API}/api/beverage-ops${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json());

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";
const WINE_COLOR = "#7c3aed";
const SPIRIT_COLOR = "#f59e0b";

type Tab = "scan" | "consumption" | "cellar" | "cocktails" | "seasonal" | "audits";

export default function BeverageOpsPanel() {
  const [tab, setTab] = useState<Tab>("scan");
  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: "scan", label: "Bottle Scan", icon: Camera },
    { id: "consumption", label: "Consumption Bar", icon: GlassWater },
    { id: "cellar", label: "Wine Cellar", icon: Grape },
    { id: "cocktails", label: "Cocktail Costing", icon: Martini },
    { id: "seasonal", label: "Seasonal Program", icon: ThermometerSun },
    { id: "audits", label: "Audits", icon: ClipboardCheck },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }}
      data-testid="beverage-ops-panel">
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)" }}>
              <Wine className="w-4 h-4" style={{ color: WINE_COLOR }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">BEVERAGE OPERATIONS</div>
              <div className="text-[9px] tracking-[0.2em] uppercase" style={{ ...MONO, color: "rgba(124,58,237,0.6)" }}>Scan | Track | Cost | Plan</div>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} data-testid={`bev-tab-${t.id}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-medium transition-all"
                style={{
                  background: tab === t.id ? "rgba(124,58,237,0.08)" : "transparent",
                  color: tab === t.id ? WINE_COLOR : "rgba(148,163,184,0.5)",
                  border: tab === t.id ? "1px solid rgba(124,58,237,0.15)" : "1px solid transparent",
                }}>
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin" }}>
        {tab === "scan" && <BottleScanView />}
        {tab === "consumption" && <ConsumptionView />}
        {tab === "cellar" && <WineCellarView />}
        {tab === "cocktails" && <CocktailCostingView />}
        {tab === "seasonal" && <SeasonalView />}
        {tab === "audits" && <AuditView />}
      </div>
    </div>
  );
}

/* ─── Bottle Scan ─── */
function BottleScanView() {
  const [scans, setScans] = useState<any>(null);
  const [name, setName] = useState("");
  const [level, setLevel] = useState("half");
  const [size, setSize] = useState("750ml");
  const [location, setLocation] = useState("banquet_bar");
  const [cost, setCost] = useState("25");

  useEffect(() => { GET("/bottle-scans?limit=20").then(setScans); }, []);

  const doScan = async () => {
    if (!name) return;
    await POST("/bottle-scan", { item_name: name, volume_level: level, bottle_size: size, location, bottle_cost: parseFloat(cost) || 25 });
    setName("");
    GET("/bottle-scans?limit=20").then(setScans);
  };

  const levels = ["full", "9/10", "8/10", "7/10", "6/10", "half", "4/10", "3/10", "2/10", "1/10", "empty"];

  return (
    <div className="space-y-5" data-testid="bottle-scan-view">
      <div className="text-sm font-semibold text-white">Bottle Scan — Inventory Count</div>
      <div className="grid grid-cols-6 gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Bottle name..."
          className="col-span-2 px-3 py-2 rounded text-[11px] outline-none" style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
          data-testid="scan-name" />
        <select value={level} onChange={e => setLevel(e.target.value)} className="px-2 py-2 rounded text-[11px] outline-none"
          style={{ ...MONO, background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }} data-testid="scan-level">
          {levels.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select value={size} onChange={e => setSize(e.target.value)} className="px-2 py-2 rounded text-[11px] outline-none"
          style={{ ...MONO, background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }}>
          {["750ml", "1L", "1.75L"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={cost} onChange={e => setCost(e.target.value)} placeholder="$Cost" type="number"
          className="px-2 py-2 rounded text-[11px] outline-none" style={{ ...MONO, background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
        <button onClick={doScan} className="px-3 py-2 rounded text-[11px] font-medium"
          style={{ background: "rgba(124,58,237,0.1)", color: WINE_COLOR, border: "1px solid rgba(124,58,237,0.2)" }}
          data-testid="scan-btn">
          <Camera className="w-3.5 h-3.5 inline mr-1" />Scan
        </button>
      </div>
      {scans && (
        <div className="rounded-lg overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="px-4 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <span className="text-[10px] uppercase tracking-widest" style={{ ...MONO, color: WINE_COLOR }}>{scans.total_scans} scans | ${scans.total_value_remaining?.toFixed(2)} value</span>
          </div>
          <table className="w-full text-[10px]" style={MONO}>
            <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <th className="text-left px-3 py-1.5" style={{ color: "rgba(200,169,126,0.5)" }}>Bottle</th>
              <th className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>Level</th>
              <th className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>Oz Left</th>
              <th className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>Pours</th>
              <th className="text-right px-3 py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>Value</th>
            </tr></thead>
            <tbody>
              {scans.scans?.map((s: any, i: number) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td className="px-3 py-1.5 text-white">{s.item_name}</td>
                  <td className="text-right px-2 py-1.5" style={{ color: WINE_COLOR }}>{s.volume_level}</td>
                  <td className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.5)" }}>{s.remaining_oz}oz</td>
                  <td className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.5)" }}>{s.remaining_pours}</td>
                  <td className="text-right px-3 py-1.5 font-semibold" style={{ color: "#10b981" }}>${s.value_remaining}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Consumption Bar ─── */
function ConsumptionView() {
  const [beoNum, setBeoNum] = useState("7626");
  const [usage, setUsage] = useState<any>(null);

  const loadUsage = () => {
    if (!beoNum) return;
    GET(`/consumption/event-usage?beo_number=${beoNum}`).then(setUsage);
  };

  return (
    <div className="space-y-5" data-testid="consumption-view">
      <div className="text-sm font-semibold text-white">Consumption Bar Tracking</div>
      <div className="flex gap-2">
        <input value={beoNum} onChange={e => setBeoNum(e.target.value)} placeholder="BEO #"
          className="w-32 px-3 py-2 rounded text-[11px] outline-none" style={{ ...MONO, background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
        <button onClick={loadUsage} className="px-4 py-2 rounded text-[11px] font-medium"
          style={{ background: "rgba(124,58,237,0.1)", color: WINE_COLOR, border: "1px solid rgba(124,58,237,0.2)" }}>
          Calculate Usage
        </button>
      </div>
      {usage && usage.status === "complete" && (
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            <KPI label="Total Pours" value={String(usage.totals.total_pours)} color={WINE_COLOR} />
            <KPI label="Cost" value={`$${usage.totals.total_cost}`} />
            <KPI label="Est Revenue" value={`$${usage.totals.estimated_revenue?.toLocaleString()}`} color="#10b981" />
            <KPI label="Cost %" value={`${usage.totals.cost_pct}%`} color={usage.totals.cost_pct > 25 ? "#ef4444" : "#10b981"} />
            <KPI label="Drinks/Guest" value={String(usage.totals.drinks_per_guest)} />
          </div>
          <div className="rounded-lg p-3" style={{ background: usage.pricing_accuracy.menu_prices_align ? "rgba(16,185,129,0.03)" : "rgba(239,68,68,0.03)", border: `1px solid ${usage.pricing_accuracy.menu_prices_align ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)"}` }}>
            <div className="text-[10px]" style={{ color: "rgba(226,232,240,0.7)" }}>{usage.pricing_accuracy.note}</div>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <table className="w-full text-[10px]" style={MONO}>
              <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <th className="text-left px-3 py-1.5" style={{ color: ACCENT }}>Item</th>
                <th className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>Before</th>
                <th className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>After</th>
                <th className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>Pours</th>
                <th className="text-right px-3 py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>Cost</th>
              </tr></thead>
              <tbody>
                {usage.usage?.map((u: any, i: number) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td className="px-3 py-1.5 text-white">{u.name}</td>
                    <td className="text-right px-2 py-1.5" style={{ color: "#10b981" }}>{u.before_level}</td>
                    <td className="text-right px-2 py-1.5" style={{ color: "#ef4444" }}>{u.after_level}</td>
                    <td className="text-right px-2 py-1.5" style={{ color: WINE_COLOR }}>{u.usage_pours}</td>
                    <td className="text-right px-3 py-1.5 font-semibold" style={{ color: SPIRIT_COLOR }}>${u.usage_cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {usage && usage.status === "incomplete" && (
        <div className="rounded-lg p-4 text-center" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <AlertTriangle className="w-5 h-5 mx-auto mb-2" style={{ color: "#f59e0b" }} />
          <div className="text-[11px] text-white">{usage.message}</div>
        </div>
      )}
    </div>
  );
}

/* ─── Wine Cellar ─── */
function WineCellarView() {
  const [cellar, setCellar] = useState<any>(null);
  const [pairDish, setPairDish] = useState("grilled steak");
  const [pairings, setPairings] = useState<any>(null);

  useEffect(() => { GET("/wine-cellar").then(setCellar); }, []);

  return (
    <div className="space-y-5" data-testid="cellar-view">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Wine Cellar & Aging Tracker</div>
        {cellar && (
          <div className="flex items-center gap-3 text-[10px]" style={MONO}>
            <span style={{ color: "#10b981" }}>Peak: {cellar.status_counts?.peak || 0}</span>
            <span style={{ color: SPIRIT_COLOR }}>Aging: {cellar.status_counts?.aging || 0}</span>
            <span style={{ color: "#ef4444" }}>Past: {cellar.status_counts?.past_peak || 0}</span>
            <span style={{ color: ACCENT }}>{cellar.total_bottles} bottles | ${cellar.total_value?.toLocaleString()}</span>
          </div>
        )}
      </div>
      {cellar?.wines?.length > 0 ? (
        <div className="rounded-lg overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <table className="w-full text-[10px]" style={MONO}>
            <thead><tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              <th className="text-left px-3 py-1.5" style={{ color: ACCENT }}>Wine</th>
              <th className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>Vintage</th>
              <th className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>Region</th>
              <th className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>Qty</th>
              <th className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>Status</th>
              <th className="text-left px-3 py-1.5" style={{ color: "rgba(148,163,184,0.4)" }}>Recommendation</th>
            </tr></thead>
            <tbody>
              {cellar.wines.map((w: any, i: number) => (
                <tr key={i} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <td className="px-3 py-1.5 text-white">{w.name}</td>
                  <td className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.5)" }}>{w.vintage}</td>
                  <td className="text-right px-2 py-1.5" style={{ color: "rgba(148,163,184,0.5)" }}>{w.region}</td>
                  <td className="text-right px-2 py-1.5" style={{ color: WINE_COLOR }}>{w.quantity}</td>
                  <td className="text-right px-2 py-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[8px] uppercase" style={{
                      background: w.status === "peak" ? "rgba(16,185,129,0.1)" : w.status === "aging" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
                      color: w.status === "peak" ? "#10b981" : w.status === "aging" ? "#f59e0b" : "#ef4444",
                    }}>{w.status}</span>
                  </td>
                  <td className="px-3 py-1.5 text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>{w.drink_recommendation?.slice(0, 60)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg p-6 text-center" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <Grape className="w-6 h-6 mx-auto mb-2" style={{ color: "rgba(148,163,184,0.2)" }} />
          <div className="text-xs text-white mb-1">Wine Cellar Empty</div>
          <div className="text-[10px]" style={{ color: "rgba(148,163,184,0.4)" }}>Add wines via API to track aging and drinking windows.</div>
        </div>
      )}
      {/* Wine Pairing */}
      <div className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        <div className="text-[10px] uppercase tracking-widest mb-3" style={{ ...MONO, color: WINE_COLOR }}>Wine Pairing Suggestions</div>
        <div className="flex gap-2 mb-3">
          <input value={pairDish} onChange={e => setPairDish(e.target.value)} placeholder="Enter a dish..."
            className="flex-1 px-3 py-1.5 rounded text-[11px] outline-none" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, color: "#e2e8f0" }} />
          <button onClick={() => GET(`/wine-cellar/pairing-suggestions?dish=${encodeURIComponent(pairDish)}`).then(setPairings)}
            className="px-3 py-1.5 rounded text-[10px]" style={{ background: "rgba(124,58,237,0.1)", color: WINE_COLOR, border: "1px solid rgba(124,58,237,0.2)" }}>
            Pair
          </button>
        </div>
        {pairings?.pairings?.map((p: any, i: number) => (
          <div key={i} className="flex items-start gap-2 mb-2 p-2 rounded" style={{ background: "rgba(255,255,255,0.015)" }}>
            <Grape className="w-3 h-3 mt-0.5 shrink-0" style={{ color: WINE_COLOR }} />
            <div>
              <span className="text-[11px] font-medium text-white">{p.wine}</span>
              <span className="text-[10px] ml-2" style={{ color: "rgba(148,163,184,0.4)" }}>{p.region}</span>
              <div className="text-[9px] mt-0.5" style={{ color: "rgba(148,163,184,0.4)" }}>{p.why}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Cocktail Costing ─── */
function CocktailCostingView() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { GET("/cocktail-costing").then(setData); }, []);

  if (!data) return <Loader />;

  return (
    <div className="space-y-5" data-testid="cocktail-costing-view">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Cocktail Recipe Costing</div>
        <div className="text-[10px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>
          Avg Cost: {data.summary?.avg_cost_pct}% | Target: {data.summary?.target_cost_pct}%
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {data.cocktails?.map((c: any, i: number) => (
          <div key={i} className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-white">{c.name}</span>
              <span className="text-[8px] px-1.5 py-0.5 rounded uppercase" style={{
                ...MONO,
                background: c.pricing_status === "profitable" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
                color: c.pricing_status === "profitable" ? "#10b981" : "#ef4444",
              }}>{c.cost_pct}%</span>
            </div>
            <div className="text-[9px] mb-2" style={{ color: "rgba(148,163,184,0.3)" }}>{c.glassware} | {c.category}</div>
            <div className="space-y-0.5 mb-2">
              {c.ingredients?.map((ing: any, j: number) => (
                <div key={j} className="flex justify-between text-[9px]" style={MONO}>
                  <span style={{ color: "rgba(148,163,184,0.4)" }}>{ing.item} {ing.oz ? `${ing.oz}oz` : ""}</span>
                  <span style={{ color: "rgba(148,163,184,0.5)" }}>${ing.line_cost}</span>
                </div>
              ))}
            </div>
            <div className="pt-2 flex justify-between text-[10px]" style={{ borderTop: `1px solid ${BORDER}` }}>
              <span style={{ color: "rgba(148,163,184,0.4)" }}>Cost: <b style={{ color: SPIRIT_COLOR }}>${c.total_cost}</b></span>
              <span style={{ color: "rgba(148,163,184,0.4)" }}>Price: <b style={{ color: "#10b981" }}>${c.menu_price}</b></span>
              <span style={{ color: "rgba(148,163,184,0.4)" }}>Profit: <b style={{ color: "#10b981" }}>${c.profit}</b></span>
            </div>
            {c.in_stock_bottles > 0 && (
              <div className="text-[8px] mt-1" style={{ color: "rgba(148,163,184,0.3)" }}>{c.in_stock_bottles} bottles in stock | {c.pours_available} pours available</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Seasonal Program ─── */
function SeasonalView() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { GET("/seasonal-program").then(setData); }, []);
  if (!data) return <Loader />;

  return (
    <div className="space-y-5" data-testid="seasonal-view">
      <div className="text-sm font-semibold text-white">Seasonal Beverage Programs</div>
      <div className="text-[10px] px-3 py-1.5 rounded inline-block" style={{ ...MONO, background: "rgba(124,58,237,0.08)", color: WINE_COLOR }}>
        Current Season: {data.current_season}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(data.programs || {}).map(([season, prog]: [string, any]) => (
          <div key={season} className="rounded-lg p-4" style={{
            background: season === data.current_season ? "rgba(124,58,237,0.03)" : SURFACE,
            border: `1px solid ${season === data.current_season ? "rgba(124,58,237,0.15)" : BORDER}`,
          }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-semibold text-white">{prog.name}</span>
              <span className="text-[9px] capitalize" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>{season}</span>
            </div>
            <div className="flex gap-1 mb-3">
              {prog.themes?.map((t: string, i: number) => (
                <span key={i} className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.03)", color: "rgba(148,163,184,0.4)" }}>{t}</span>
              ))}
            </div>
            {prog.featured_cocktails?.map((c: any, i: number) => (
              <div key={i} className="flex justify-between py-1 text-[10px]" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div>
                  <span className="text-white">{c.name}</span>
                  <span className="text-[8px] ml-1" style={{ color: "rgba(148,163,184,0.3)" }}>{c.base}</span>
                </div>
                <div className="flex gap-3" style={MONO}>
                  <span style={{ color: SPIRIT_COLOR }}>${c.estimated_cost}</span>
                  <span style={{ color: "#10b981" }}>${c.suggested_price}</span>
                  <span style={{ color: "rgba(148,163,184,0.4)" }}>{c.cost_pct}%</span>
                </div>
              </div>
            ))}
            <div className="mt-2 text-[9px]" style={{ color: "rgba(148,163,184,0.3)" }}>
              Wine Focus: {prog.wine_focus?.join(", ")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Audits ─── */
function AuditView() {
  const [audits, setAudits] = useState<any>(null);
  useEffect(() => { GET("/audits").then(setAudits); }, []);

  const startAudit = async () => {
    await POST("/audit/start", { started_by: "Manager" });
    GET("/audits").then(setAudits);
  };

  return (
    <div className="space-y-5" data-testid="audit-view">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Monthly Beverage Audits</div>
        <button onClick={startAudit} className="px-3 py-1.5 rounded text-[10px] font-medium"
          style={{ background: "rgba(124,58,237,0.1)", color: WINE_COLOR, border: "1px solid rgba(124,58,237,0.2)" }}>
          + Start New Audit
        </button>
      </div>
      {audits?.audits?.map((a: any, i: number) => (
        <div key={i} className="rounded-lg p-4" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-white">{a.type} — {a.month}/{a.year}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded uppercase" style={{
              ...MONO,
              background: a.status === "completed" ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
              color: a.status === "completed" ? "#10b981" : "#f59e0b",
            }}>{a.status}</span>
          </div>
          <div className="grid grid-cols-4 gap-3 text-[10px]" style={MONO}>
            <div><span style={{ color: "rgba(148,163,184,0.4)" }}>Scans:</span> <span className="text-white">{a.scan_count || 0}</span></div>
            <div><span style={{ color: "rgba(148,163,184,0.4)" }}>Bottles:</span> <span className="text-white">{a.total_bottles || 0}</span></div>
            <div><span style={{ color: "rgba(148,163,184,0.4)" }}>Value:</span> <span style={{ color: "#10b981" }}>${a.total_value || 0}</span></div>
            <div><span style={{ color: "rgba(148,163,184,0.4)" }}>Variance:</span> <span style={{ color: a.variance_pct > 5 ? "#ef4444" : "#10b981" }}>{a.variance_pct || 0}%</span></div>
          </div>
        </div>
      ))}
      {(!audits?.audits || audits.audits.length === 0) && (
        <div className="rounded-lg p-6 text-center" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
          <ClipboardCheck className="w-6 h-6 mx-auto mb-2" style={{ color: "rgba(148,163,184,0.2)" }} />
          <div className="text-xs text-white">No audits yet</div>
        </div>
      )}
    </div>
  );
}

/* ─── Shared ─── */
function KPI({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg p-3" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="text-[8px] uppercase tracking-widest mb-1" style={{ color: "rgba(148,163,184,0.3)" }}>{label}</div>
      <div className="text-lg font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color: color || "#e2e8f0" }}>{value}</div>
    </div>
  );
}
function Loader() {
  return <div className="flex items-center justify-center h-40 gap-2"><RefreshCw className="w-4 h-4 animate-spin" style={{ color: WINE_COLOR }} /><span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Loading...</span></div>;
}
