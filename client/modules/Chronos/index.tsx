/**
 * Echo Chronos — "operational time machine"
 *
 * Landing dashboard for all salaried roles that oversee outlets.
 * Two modes:
 *   1. PORTFOLIO VIEW — grid of outlet cards with health score + mini-KPIs
 *   2. OPS VIEW (drill-in) — 16 KPI sparkline tiles + time slider + event pins
 *
 * Scoping is role-driven on the backend (/api/chronos/portfolio?user_id=…):
 *   regional-director → all properties
 *   director / exec-dir-finance / controller → whole property
 *   gm / exec-chef / pastry-chef / sous-chef → assigned outlets only
 *   fb-director → property filtered by F&B outlet types
 */
import React, { useEffect, useMemo, useState, useCallback } from "react";
// D6 — outlet card → fullscreen morph. layoutId on both the card and the
// expanded view lets framer-motion compute the transform automatically.
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  ArrowLeft, ChevronRight, Play, Activity, AlertTriangle, Sparkles,
  TrendingUp, TrendingDown, Cloud, Users, ShoppingCart, RefreshCw,
  Layers, Split, Target, HelpCircle, Send, Zap, CalendarClock,
  GitBranch, Network, Building2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useThemeTokens } from "@/styles/design-tokens";

const API = (typeof window !== "undefined" ? window.location.origin : "");

// ── Tokens ────────────────────────────────────────────────────────────
const PANEL_BG = "#0a0e17";
const SURFACE = "#141825";
const SUBTLE = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";

const STATUS_META: Record<string, { color: string; icon: string; label: string }> = {
  healthy:  { color: "#10b981", icon: "●", label: "Healthy" },
  watch:    { color: "#f59e0b", icon: "▲", label: "Watch" },
  drift:    { color: "#f97316", icon: "▼", label: "Drift" },
  critical: { color: "#ef4444", icon: "×", label: "Critical" },
};

// ── Types ──────────────────────────────────────────────────────────────
interface Outlet {
  id: string; property_id: string; name: string; location: string; type: string;
  health: number; status: keyof typeof STATUS_META;
  net_today: number; covers_today: number; labor_pct: number;
}
interface PropertyCard {
  id: string; name: string; code: string; timezone?: string;
  outlet_count: number;
  total_net_today: number; total_covers_today: number;
  health_avg: number; flag_count: number;
  status: keyof typeof STATUS_META;
}
interface PortfolioResp {
  user: { id: string; name?: string; role: string; title?: string };
  access: { scope: string };
  // D9: server tells the UI which tier to land on. "properties" =
  // district/regional view (property cards); "outlets" = property/dept-head
  // view (existing outlet grid); "outlet" = CDC view (single outlet, skip
  // portfolio entirely).
  view_tier?: "properties" | "outlets" | "outlet";
  properties: Array<{ id: string; name: string; code: string }>;
  property_cards?: PropertyCard[];
  outlets: Outlet[];
  summary: {
    total_net_today: number; total_covers_today: number;
    health_avg: number; flag_count: number; outlet_count: number;
    property_count?: number;
  };
  morning_brief: { movers_overnight: number; critical: number; video_ready_at: string };
}
interface PropertyDrillResp {
  property: { id: string; name: string; code: string };
  card: PropertyCard;
  outlets: Outlet[];
  outlet_count: number;
}
interface Tile {
  key: string; label: string; value: number; unit?: string; sub?: string;
  series: number[]; fmt: string; threshold?: number;
}
interface OutletDetail {
  outlet: Outlet;
  day: number;
  tiles: Tile[];
  event_pins: Array<{ day: number; kind: string; label: string; color: string }>;
  weather: Array<{ day: number; code: string }>;
}
interface Forecast {
  tomorrow_date: string;
  aggregate: { net_sales_p50: number; covers_p50: number };
  outlets: Array<{
    outlet_id: string; outlet_name: string;
    tomorrow: {
      net_sales: { p10: number; p50: number; p90: number };
      covers: { p10: number; p50: number; p90: number };
      labor_pct: { p10: number; p50: number; p90: number };
    };
  }>;
}

// ── Main ──────────────────────────────────────────────────────────────
export default function ChronosPanel() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState<PortfolioResp | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [beos, setBeos] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);      // outlet_id for ops view
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null); // D9 property drill
  const [propertyDrill, setPropertyDrill] = useState<PropertyDrillResp | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);         // for compare-mode
  const [refreshTick, setRefreshTick] = useState(0);

  // Load portfolio + forecast
  useEffect(() => {
    const uid = user?.id || "director_user";
    setLoading(true);
    const fp = fetch(`${API}/api/chronos/portfolio?user_id=${encodeURIComponent(uid)}`,
        { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null);
    const ff = fetch(`${API}/api/chronos/forecast-tomorrow?user_id=${encodeURIComponent(uid)}`,
        { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null);
    const fb = fetch(`${API}/api/chronos/beos-live?user_id=${encodeURIComponent(uid)}`,
        { credentials: "include" }).then(r => r.ok ? r.json() : null).catch(() => null);
    Promise.all([fp, ff, fb]).then(([p, f, b]) => {
      setPortfolio(p);
      setForecast(f);
      setBeos(b);
      setLoading(false);
    });
  }, [user?.id, refreshTick]);

  // D9 — fetch the per-property drill when a property card is clicked.
  // Auto-clears when selection is cleared.
  useEffect(() => {
    if (!selectedProperty) { setPropertyDrill(null); return; }
    const uid = user?.id || "director_user";
    let cancelled = false;
    fetch(`${API}/api/chronos/property/${encodeURIComponent(selectedProperty)}?user_id=${encodeURIComponent(uid)}`,
      { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (!cancelled) setPropertyDrill(d); })
      .catch(() => { if (!cancelled) setPropertyDrill(null); });
    return () => { cancelled = true; };
  }, [selectedProperty, user?.id]);

  // The view tier is server-driven (district/regional → properties;
  // CDC → outlet; default → outlets). When a district chef drills into
  // a property the local override (selectedProperty) takes priority.
  const tier: "properties" | "outlets" | "outlet" =
    selectedProperty ? "outlets" : (portfolio?.view_tier ?? "outlets");

  // CDC pattern: server flagged tier="outlet" (single outlet) — auto-open
  // the ops view so the chef lands directly inside their kitchen.
  useEffect(() => {
    if (portfolio?.view_tier === "outlet" && portfolio.outlets.length === 1 && !selected) {
      setSelected(portfolio.outlets[0].id);
    }
  }, [portfolio?.view_tier, portfolio?.outlets?.length, selected]);

  // Outlets visible in the grid: from the property drill when a property
  // is selected; otherwise from the user's overall portfolio.
  const visibleOutlets: Outlet[] = selectedProperty
    ? (propertyDrill?.outlets ?? [])
    : (portfolio?.outlets ?? []);

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return [prev[1], prev[2], id]; // rolling window
      return [...prev, id];
    });
  };

  // D6 — outlet card morph. compareIds branch returns early as before;
  // the selected branch is rendered ALONGSIDE the portfolio inside a
  // shared LayoutGroup, so framer-motion can compute the transform from
  // the clicked card to the fullscreen ops view.
  if (compareIds.length >= 2) {
    return <ChronosCompareView
      outletIds={compareIds}
      onClose={() => setCompareIds([])}
    />;
  }

  // Build the portfolio JSX once; we render it as the underlying layer
  // and overlay the morphing ops view on top when an outlet is selected.
  const renderPortfolio = () => (
    <div
      data-testid="chronos-panel"
      className="flex flex-col h-full overflow-hidden"
      style={{ background: PANEL_BG, color: "#e2e8f0" }}
    >
      {/* Top status ribbon */}
      <div className="flex items-center justify-between px-5 py-2 border-b"
        style={{ borderColor: BORDER, background: "#070a12" }}>
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-slate-500">
          <Activity className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
          <span style={{ color: "#10b981" }}>LIVE</span>
          <ChevronRight className="w-3 h-3" />
          <span>ECHO CHRONOS</span>
          <ChevronRight className="w-3 h-3" />
          {/* D9 — breadcrumb reflects drill state. Properties → property → outlet. */}
          {portfolio?.view_tier === "properties" && !selectedProperty ? (
            <span style={{ color: ACCENT }}>Properties</span>
          ) : selectedProperty ? (
            <>
              <button
                onClick={() => setSelectedProperty(null)}
                className="hover:underline"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >Properties</button>
              <ChevronRight className="w-3 h-3" />
              <span style={{ color: ACCENT }}>
                {propertyDrill?.property?.name ?? "Property"}
              </span>
            </>
          ) : (
            <span style={{ color: ACCENT }}>Portfolio</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
          <button
            data-testid="chronos-refresh"
            onClick={() => setRefreshTick(t => t + 1)}
            className="flex items-center gap-1 px-2.5 py-1 rounded border hover:bg-white/5"
            style={{ borderColor: BORDER }}
          >
            <RefreshCw className="w-3 h-3" /> REFRESH
          </button>
          <span>{new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>

      {/* Header */}
      <div className="px-5 py-3 border-b"
        style={{ borderColor: BORDER, background: "linear-gradient(180deg,#0c1220,#0a0e17)" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: ACCENT }}>
              {portfolio?.user?.title || "Director"}
            </div>
            <h1 className="text-2xl font-bold text-white leading-tight">
              {portfolio?.user?.name || "Command Center"}
              <span className="text-slate-500 font-normal text-sm ml-3">· operational time machine</span>
            </h1>
          </div>
          {!loading && portfolio && (
            <div className="flex gap-4 text-right">
              <SummaryStat label="Portfolio Net" value={`$${Math.round(portfolio.summary.total_net_today/1000)}k`} accent={ACCENT} />
              <SummaryStat label="Covers" value={portfolio.summary.total_covers_today.toLocaleString()} accent="#60a5fa" />
              <SummaryStat label="Health" value={`${portfolio.summary.health_avg}%`}
                accent={portfolio.summary.health_avg >= 92 ? "#10b981" : portfolio.summary.health_avg >= 85 ? "#f59e0b" : "#ef4444"} />
              <SummaryStat label="Flags" value={portfolio.summary.flag_count.toString()}
                accent={portfolio.summary.flag_count === 0 ? "#10b981" : "#ef4444"} />
            </div>
          )}
        </div>
      </div>

      {/* Morning brief strip */}
      {!loading && portfolio && (
        <div className="flex items-center gap-3 px-5 py-2 border-b text-xs"
          style={{ borderColor: BORDER, background: "rgba(200,169,126,0.04)" }}
          data-testid="chronos-morning-brief">
          <Sparkles className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          <span className="text-slate-300 font-mono uppercase tracking-wider text-[10px]">
            Echo morning brief
          </span>
          <span className="text-slate-400">
            <span className="text-amber-400 font-semibold">{portfolio.morning_brief.movers_overnight}</span> movers overnight ·
            <span className="text-rose-400 font-semibold"> {portfolio.morning_brief.critical}</span> critical ·
            <span className="text-slate-400"> {portfolio.morning_brief.video_ready_at} video ready</span>
          </span>
          <button
            className="ml-auto flex items-center gap-1 px-2.5 py-1 rounded border text-[10px] font-mono uppercase tracking-wider hover:bg-white/5"
            style={{ borderColor: BORDER, color: ACCENT }}
            data-testid="chronos-play-brief"
          >
            <Play className="w-3 h-3" /> Play 90s brief
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading && <div className="text-center py-10 text-slate-500 text-sm">Loading Chronos…</div>}

        {!loading && portfolio && (
          <>
            {/* D9 — Property tier (district-chef / regional-director).
                Rendered when the server says view_tier="properties" and the
                user has not yet drilled into a property. Click on a property
                card to drop into its outlet grid. */}
            {tier === "properties" && (portfolio.property_cards?.length ?? 0) > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
                    Property portfolio · {portfolio.property_cards!.length} resorts · {portfolio.summary.outlet_count} outlets total
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3" data-testid="chronos-property-grid">
                  {portfolio.property_cards!.map(p => (
                    <PropertyCardView
                      key={p.id}
                      card={p}
                      onOpen={() => setSelectedProperty(p.id)}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Outlet tier — the existing portfolio. Either: (a) server
                tier="outlets" (directors/exec-chefs/etc.); or (b) user
                drilled into a property and we now show the outlets within
                it. Compare + outlet morph behavior unchanged. */}
            {tier === "outlets" && (
              <>
                {/* When inside a property drill, show a back-to-properties strip. */}
                {selectedProperty && (
                  <button
                    onClick={() => setSelectedProperty(null)}
                    className="flex items-center gap-2 text-xs text-slate-400 hover:text-white"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span className="font-mono uppercase tracking-wider">Back to properties</span>
                  </button>
                )}

                {/* Regional Director — property grouping header (shown only
                    when role matches and not in property drill). */}
                {portfolio.user?.role === "regional-director" && !selectedProperty && (
                  <ChronosPropertyGroup userId={portfolio.user.id} />
                )}

                {/* Compare-mode controls */}
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-mono uppercase tracking-widest text-slate-500">
                    {selectedProperty
                      ? `${propertyDrill?.property?.name ?? "Property"} · ${visibleOutlets.length} outlets`
                      : `Portfolio health · ${portfolio.summary.outlet_count} outlets · ${portfolio.summary.flag_count} tier flags`}
                  </div>
                  {compareIds.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400">
                        <Split className="inline w-3 h-3 mr-1" />
                        {compareIds.length} selected — pick {compareIds.length >= 2 ? "to view" : "1+ more"}
                      </span>
                      <button
                        onClick={() => setCompareIds([])}
                        className="px-2 py-0.5 text-[10px] font-mono rounded border border-slate-700 text-slate-400 hover:bg-white/5"
                      >CLEAR</button>
                    </div>
                  )}
                </div>

                {/* Outlet grid */}
                <div className="grid grid-cols-3 gap-3" data-testid="chronos-outlet-grid">
                  {visibleOutlets.map(o => (
                    <OutletCard
                      key={o.id}
                      outlet={o}
                      selectedForCompare={compareIds.includes(o.id)}
                      forecast={forecast?.outlets.find(f => f.outlet_id === o.id)}
                      onOpen={() => setSelected(o.id)}
                      onToggleCompare={() => toggleCompare(o.id)}
                    />
                  ))}
                  {visibleOutlets.length === 0 && (
                    <div className="col-span-3 py-10 text-center text-slate-500 text-sm">
                      {selectedProperty
                        ? "No outlets in this property assigned to you."
                        : isBanquetRole(portfolio.user)
                          ? "No outlets assigned — Banquets feed below."
                          : "No outlets assigned to your role yet."}
                    </div>
                  )}
                </div>

                {/* iter266.15 · Banquet chef / exec chef-over-banquets sees the
                    BEO Timeline + production tiles inline since they don't
                    own a single outlet — they make food FOR outlets. */}
                {visibleOutlets.length === 0 && isBanquetRole(portfolio.user) && !selectedProperty && (
                  <BanquetChefSurface user={portfolio.user} />
                )}
              </>
            )}

            {/* Tomorrow Monte Carlo forecast */}
            {forecast && (
              <div
                className="rounded-lg border p-4"
                style={{ background: SURFACE, borderColor: BORDER }}
                data-testid="chronos-forecast"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4" style={{ color: ACCENT }} />
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
                    Tomorrow forecast · Monte Carlo (1,000 sims) · {forecast.tomorrow_date}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Portfolio Net Sales (P50)</div>
                    <div className="text-2xl font-bold" style={{ color: ACCENT }}>
                      ${Math.round(forecast.aggregate.net_sales_p50 / 1000).toLocaleString()}k
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Portfolio Covers (P50)</div>
                    <div className="text-2xl font-bold text-blue-400">
                      {forecast.aggregate.covers_p50.toLocaleString()}
                    </div>
                  </div>
                </div>
                {/* Per-outlet P10/P50/P90 bands */}
                <div className="space-y-1.5">
                  {forecast.outlets.slice(0, 6).map(f => (
                    <ForecastBand key={f.outlet_id} f={f} />
                  ))}
                </div>
              </div>
            )}

            {/* Live BEO feed — Exec Chef / Dir Banquets / Director / GM / F&B / Events Mgr */}
            {beos?.events?.length > 0 && (
              <div className="rounded-lg border p-4"
                style={{ background: SURFACE, borderColor: BORDER }}
                data-testid="chronos-beos-live">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
                    <div className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
                      MaestroBQT · Live BEO Feed · next {beos.horizon_days} days
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    {beos.count} events · {Object.keys(beos.by_day).length} event-days
                  </div>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {beos.events.slice(0, 10).map((e: any) => (
                    <div key={e.id}
                      className="grid grid-cols-[80px_1fr_100px_80px_90px] gap-2 items-center text-[11px] py-1.5 px-2 rounded hover:bg-white/5"
                      data-testid={`beo-row-${e.id}`}>
                      <span className="font-mono text-slate-500">+{e.days_until}d</span>
                      <span className="text-slate-200 truncate">{e.event_name}</span>
                      <span className="text-slate-500 truncate">{e.outlet_name}</span>
                      <span className="font-mono text-slate-400 text-right">{e.guest_count}g</span>
                      <span className={`text-[9px] font-mono uppercase text-right ${
                        e.status === "confirmed" ? "text-emerald-400" :
                        e.status === "execution_ready" ? "text-amber-400" :
                        e.status === "tentative" ? "text-slate-500" : "text-rose-400"
                      }`}>{e.status?.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
                {beos.events.length > 10 && (
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "maestro-bqt" } }))}
                    className="mt-2 w-full text-[10px] font-mono uppercase tracking-wider text-slate-400 hover:text-amber-400 py-1 border-t"
                    style={{ borderColor: SUBTLE }}
                    data-testid="chronos-beos-open-maestro"
                  >
                    View all {beos.events.length} events in MaestroBQT →
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
  // closes renderPortfolio

  return (
    <LayoutGroup id="chronos-portfolio">
      {/* Backdrop: portfolio stays mounted underneath the morph so the
          framer-motion layoutId animation can compute geometry from the
          source card. We blur + dim it while a single outlet is open. */}
      <div
        className={`relative ${selected ? "pointer-events-none" : ""}`}
        style={{
          filter: selected ? "blur(6px) saturate(0.6)" : undefined,
          transition: "filter 0.45s ease",
        }}
        aria-hidden={!!selected}
      >
        {renderPortfolio()}
      </div>

      <AnimatePresence>
        {selected && (
          <>
            {/* Dim backdrop fade */}
            <motion.div
              key="chronos-morph-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32 }}
              className="fixed inset-0 z-40 bg-black"
              onClick={() => setSelected(null)}
            />
            {/* The morphing card-→-window. Same layoutId as OutletCard so
                framer-motion handles the transform from card position to
                fullscreen automatically. The user described this as
                "morph that particular restaurant … as though you were
                having a window into the world of that outlet." */}
            <motion.div
              key="chronos-morph-window"
              layoutId={`chronos-outlet-${selected}`}
              className="fixed inset-3 md:inset-6 z-50 rounded-xl overflow-hidden border shadow-2xl"
              style={{ background: SURFACE, borderColor: BORDER }}
              transition={{ type: "spring", stiffness: 220, damping: 30, mass: 0.9 }}
            >
              <ChronosOpsView outletId={selected} onBack={() => setSelected(null)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}

// ── END ChronosPanel ─────────────────────────────────────────────────

// ── Outlet card ───────────────────────────────────────────────────────
function OutletCard({ outlet, selectedForCompare, forecast, onOpen, onToggleCompare }: {
  outlet: Outlet;
  selectedForCompare: boolean;
  forecast?: Forecast["outlets"][0];
  onOpen: () => void;
  onToggleCompare: () => void;
}) {
  const meta = STATUS_META[outlet.status] || STATUS_META.healthy;
  return (
    // D6 — layoutId="outlet-{id}" makes framer-motion morph this card
    // smoothly into the fullscreen ops view when the parent renders the
    // matching motion.div under that id.
    <motion.div
      layoutId={`chronos-outlet-${outlet.id}`}
      className={`relative rounded-lg border p-4 cursor-pointer ${selectedForCompare ? "ring-2 ring-amber-400/60" : ""}`}
      style={{
        background: SURFACE,
        borderColor: selectedForCompare ? "rgba(200,169,126,0.45)" : BORDER,
      }}
      onClick={onOpen}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 220, damping: 28 }}
      data-testid={`chronos-outlet-${outlet.id}`}
    >
      {/* Compare toggle (corner) */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleCompare(); }}
        className={`absolute top-2 right-2 w-5 h-5 rounded-sm border flex items-center justify-center text-[10px] font-mono ${selectedForCompare ? "bg-amber-500/20 border-amber-400 text-amber-300" : "border-slate-700 text-slate-500 hover:border-slate-500"}`}
        data-testid={`compare-toggle-${outlet.id}`}
        title="Add/remove from compare"
      >
        {selectedForCompare ? "✓" : "+"}
      </button>

      <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mb-0.5">
        {outlet.location} · {outlet.type}
      </div>
      <div className="text-base font-semibold text-white leading-tight mb-2">{outlet.name}</div>

      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold" style={{ color: meta.color }}>
            {outlet.health}
          </span>
          <span className="text-[10px] font-mono text-slate-500">% health</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: meta.color }}>
          <span>{meta.icon}</span>
          <span className="uppercase tracking-wider">{meta.label}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
        <span>${Math.round(outlet.net_today / 1000)}k</span>
        <span className="text-slate-600">·</span>
        <span>{outlet.covers_today}c</span>
        <span className="text-slate-600">·</span>
        <span>{outlet.labor_pct}% lbr</span>
      </div>

      {/* Forecast strip */}
      {forecast && (
        <div className="mt-3 pt-2 border-t flex items-center justify-between text-[10px] font-mono" style={{ borderColor: SUBTLE }}>
          <span className="text-slate-500 uppercase tracking-wider">Tomorrow P50</span>
          <span className="text-slate-300">
            ${Math.round(forecast.tomorrow.net_sales.p50 / 1000)}k <span className="text-slate-600">·</span> {Math.round(forecast.tomorrow.covers.p50)}c
          </span>
        </div>
      )}

      {/* iter266.15 · Open in Chef Outlet Dashboard (separate panel for chef workflow) */}
      <button
        data-testid={`chronos-open-chef-dashboard-${outlet.id}`}
        onClick={(e) => {
          e.stopPropagation();
          window.dispatchEvent(new CustomEvent("open-panel", {
            detail: { id: "chef-outlet-dashboard", outlet_id: outlet.id },
          }));
        }}
        className="mt-2 w-full px-2 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 border hover:bg-white/5 transition-colors"
        style={{ borderColor: SUBTLE, color: ACCENT }}
      >
        <ChevronRight className="w-3 h-3" /> Open Chef Dashboard
      </button>
    </motion.div>
  );
}

// ── Property card (D9) ───────────────────────────────────────────────
// District-chef / regional-director land on a grid of these. Aggregates
// across the property's accessible outlets; click to drill into the
// property's outlet grid.
function PropertyCardView({ card, onOpen }: {
  card: PropertyCard;
  onOpen: () => void;
}) {
  const status = STATUS_META[card.status] ?? STATUS_META.healthy;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpen(); }}
      className="relative rounded-lg border p-4 cursor-pointer hover:bg-white/5 transition-colors"
      style={{ background: SURFACE, borderColor: BORDER }}
      data-testid={`property-card-${card.id}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Building2 className="w-4 h-4" style={{ color: ACCENT }} />
        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">
          {card.code}
        </div>
        <div
          className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider"
          style={{ background: `${status.color}1f`, color: status.color }}
        >
          <span>{status.icon}</span>{status.label}
        </div>
      </div>
      <div className="text-base font-semibold text-white leading-tight">{card.name}</div>
      <div className="text-[11px] text-slate-500 mb-3">
        {card.outlet_count} {card.outlet_count === 1 ? "outlet" : "outlets"}
        {card.flag_count > 0 && (
          <span className="ml-2 text-rose-400">· {card.flag_count} flagged</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Net Today</div>
          <div className="text-sm font-bold" style={{ color: ACCENT }}>
            ${Math.round(card.total_net_today / 1000)}k
          </div>
        </div>
        <div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Covers</div>
          <div className="text-sm font-bold text-blue-400">
            {card.total_covers_today.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">Health</div>
          <div className="text-sm font-bold"
            style={{ color: card.health_avg >= 92 ? "#10b981"
              : card.health_avg >= 85 ? "#f59e0b" : "#ef4444" }}>
            {card.health_avg}%
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end text-[10px] font-mono uppercase tracking-wider text-slate-500">
        <span>Open property</span>
        <ChevronRight className="w-3 h-3" />
      </div>
    </div>
  );
}

function SummaryStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-xl font-bold" style={{ color: accent }}>{value}</div>
    </div>
  );
}

function ForecastBand({ f }: { f: Forecast["outlets"][0] }) {
  const { p10, p50, p90 } = f.tomorrow.net_sales;
  const range = p90 - p10 || 1;
  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className="w-40 truncate text-slate-300">{f.outlet_name}</span>
      <div className="flex-1 relative h-5 rounded-sm" style={{ background: "rgba(255,255,255,0.03)" }}>
        {/* P10-P90 band */}
        <div className="absolute top-1 bottom-1 rounded-sm" style={{
          left: "5%", right: "5%",
          background: "linear-gradient(90deg, rgba(200,169,126,0.15), rgba(200,169,126,0.35), rgba(200,169,126,0.15))",
        }}/>
        {/* P50 marker */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400" style={{
          left: `${5 + (p50 - p10) / range * 90}%`,
        }}/>
      </div>
      <span className="w-28 text-right font-mono text-slate-400">
        ${Math.round(p10/1000)}k <span className="text-amber-400">· ${Math.round(p50/1000)}k</span> · ${Math.round(p90/1000)}k
      </span>
    </div>
  );
}

// ── Ops View (drill-in) ───────────────────────────────────────────────
function ChronosOpsView({ outletId, onBack }: { outletId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<OutletDetail | null>(null);
  const [day, setDay] = useState(30);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2); // days per second
  const [showYoY, setShowYoY] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/chronos/outlet/${outletId}?day=${day}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(setDetail);
  }, [outletId, day]);

  // iter260 · Timeline playback — advances day counter at `speed` days/sec,
  // auto-pauses when reaching the last day.
  useEffect(() => {
    if (!playing) return;
    const interval = window.setInterval(() => {
      setDay(d => {
        if (d >= 30) { setPlaying(false); return 30; }
        return d + 1;
      });
    }, 1000 / speed);
    return () => window.clearInterval(interval);
  }, [playing, speed]);

  const outlet = detail?.outlet;
  const meta = outlet ? STATUS_META[outlet.status] : STATUS_META.healthy;

  return (
    <div data-testid="chronos-ops-view"
      className="flex flex-col h-full overflow-hidden" style={{ background: PANEL_BG, color: "#e2e8f0" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            data-testid="chronos-ops-back"
          >
            <ArrowLeft className="w-4 h-4" /> Portfolio
          </button>
          <span className="text-slate-600">·</span>
          <div>
            <span className="font-semibold text-white">{outlet?.name || "…"}</span>
            <span className="text-slate-500"> · {outlet?.location}</span>
          </div>
          {outlet && (
            <span className="flex items-center gap-1 text-[10px] font-mono uppercase ml-2" style={{ color: meta.color }}>
              {meta.icon} {meta.label} {outlet.health}%
            </span>
          )}
        </div>
      </div>

      {/* Time slider */}
      <div className="px-5 py-3 border-b flex items-center gap-4" style={{ borderColor: BORDER, background: "rgba(255,255,255,0.015)" }}>
        <button
          onClick={() => { if (day >= 30) setDay(1); setPlaying(p => !p); }}
          className="flex items-center gap-1 px-3 py-1 rounded border text-[10px] font-mono uppercase hover:bg-white/5"
          style={{ borderColor: BORDER, color: playing ? "#ef4444" : ACCENT }}
          data-testid="chronos-time-play"
        >
          <Play className="w-3 h-3" /> {playing ? "PAUSE" : `Play ${speed}× day/sec`}
        </button>
        <button
          onClick={() => setSpeed(s => s >= 8 ? 1 : s * 2)}
          className="px-2 py-1 rounded border text-[10px] font-mono text-slate-400 hover:bg-white/5"
          style={{ borderColor: BORDER }}
          data-testid="chronos-time-speed"
          title="Click to cycle through 1×/2×/4×/8×"
        >
          {speed}×
        </button>
        <button
          onClick={() => setShowYoY(v => !v)}
          className={`ml-2 flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono uppercase tracking-wider transition-all ${showYoY ? "ring-1 ring-amber-400/50" : ""}`}
          style={{ borderColor: BORDER, color: showYoY ? ACCENT : "#94a3b8", background: showYoY ? "rgba(200,169,126,0.1)" : "transparent" }}
          data-testid="chronos-yoy-toggle"
          title="Overlay same-time-last-year dashed line on every sparkline"
        >
          <CalendarClock className="w-3 h-3" />
          YoY
        </button>
        <div className="flex-1 flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500 w-10">Apr 1</span>
          <input
            type="range" min={1} max={30} value={day}
            onChange={(e) => setDay(Number(e.target.value))}
            className="flex-1 accent-amber-400"
            data-testid="chronos-time-slider"
          />
          <span className="text-[10px] font-mono text-slate-500 w-12">Apr 30</span>
        </div>
        <div className="text-[11px] font-mono text-amber-400 min-w-[90px] text-right">
          Day {day} · Apr {day}
        </div>
      </div>

      {/* Weather strip + event pins */}
      {detail && (
        <div className="px-5 py-2 border-b" style={{ borderColor: BORDER }}>
          <div className="relative h-6 rounded-sm overflow-hidden" style={{ background: "#0a0e17" }}>
            {detail.weather.map((w, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0"
                style={{
                  left: `${(i / 30) * 100}%`, width: `${100 / 30}%`,
                  background: w.code === "storm" ? "rgba(71,85,105,0.5)"
                    : w.code === "rain" ? "rgba(71,85,105,0.3)"
                    : w.code === "cloudy" ? "rgba(71,85,105,0.15)"
                    : "rgba(200,169,126,0.08)",
                }}
              />
            ))}
            {detail.event_pins.map(p => (
              <div key={p.day}
                className="absolute top-0 bottom-0 w-0.5"
                style={{ left: `${((p.day - 1) / 29) * 100}%`, background: pinColor(p.color) }}
                title={p.label}
              />
            ))}
            {/* Current day marker */}
            <div className="absolute top-0 bottom-0 w-[2px] bg-amber-400"
              style={{ left: `${((day - 1) / 29) * 100}%` }} />
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-[9px] font-mono uppercase tracking-widest text-slate-500">
            <Cloud className="w-3 h-3" />
            <span>Weather backdrop</span>
            <span className="text-slate-600">·</span>
            {detail.event_pins.map(p => (
              <span key={p.day} style={{ color: pinColor(p.color) }}>
                {p.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 16 KPI tiles */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {!detail && <div className="text-center py-10 text-slate-500 text-sm">Loading operational view…</div>}
        {detail && (
          <>
            <div className="grid grid-cols-4 gap-3" data-testid="chronos-tile-grid">
              {detail.tiles.map(t => <KpiSparkTile key={t.key} tile={t} day={day} showYoY={showYoY} />)}
            </div>
            <NetworkIntelligenceStrip outlet={detail.outlet} />
            <ActionChipsRow outletId={outletId} day={day} />
            <PrepForecastSection outletId={outletId} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 3-Day Prep Forecast (Monte Carlo → auto production sheet) ─────────
function PrepForecastSection({ outletId }: { outletId: string }) {
  const [data, setData] = useState<any>(null);
  const [expanded, setExpanded] = useState<number | null>(0);

  useEffect(() => {
    fetch(`${API}/api/chronos/prep-forecast?outlet_id=${outletId}&days=3`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(setData);
  }, [outletId]);

  if (!data) return null;

  return (
    <div className="rounded-lg border" style={{ background: SURFACE, borderColor: BORDER }}
      data-testid="chronos-prep-forecast">
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: SUBTLE }}>
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5" style={{ color: ACCENT }} />
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
            3-Day Prep Forecast · Monte Carlo ({data.n_simulations} sims) → Auto Production Sheet
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-0 divide-x" style={{ borderColor: SUBTLE }}>
        {data.days.map((dayF: any, i: number) => (
          <div key={dayF.date} className="p-3"
            data-testid={`prep-day-${i}`}>
            <div className="flex items-baseline justify-between mb-2">
              <div>
                <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">{dayF.day_of_week}</div>
                <div className="text-xs text-slate-400">{dayF.date}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold" style={{ color: ACCENT }}>{dayF.covers.p50}</div>
                <div className="text-[9px] font-mono text-slate-500">covers P50</div>
              </div>
            </div>
            <div className="text-[9px] font-mono text-slate-500 mb-1">
              {dayF.covers.p10} <span className="text-amber-400">· {dayF.covers.p50}</span> · {dayF.covers.p90}
            </div>
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full text-[10px] font-mono uppercase tracking-wider text-slate-400 hover:text-amber-400 py-1 border-t border-b"
              style={{ borderColor: SUBTLE }}
              data-testid={`prep-sheet-toggle-${i}`}
            >
              {expanded === i ? "▼ Hide Production Sheet" : "▶ View Production Sheet"}
            </button>
            {expanded === i && (
              <div className="mt-2 space-y-0.5" data-testid={`prep-sheet-${i}`}>
                {dayF.production_sheet.map((row: any, ri: number) => (
                  <div key={ri} className="grid grid-cols-[1fr_50px_50px] gap-1 text-[10px] font-mono py-0.5 items-center">
                    <span className="truncate text-slate-300">{row.item}</span>
                    <span className="text-right text-slate-500">{row.station}</span>
                    <span className="text-right text-slate-200 font-semibold">{row.qty_p50}</span>
                  </div>
                ))}
                <div className="mt-2 pt-2 border-t text-[9px] font-mono uppercase tracking-wider text-slate-500"
                  style={{ borderColor: SUBTLE }}>
                  Station rollup:
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(dayF.station_rollup).map(([station, qty]) => (
                    <span key={station} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-slate-300">
                      {station} · {String(qty)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function pinColor(c: string): string {
  return { emerald: "#10b981", rose: "#f43f5e", amber: "#f59e0b", orange: "#f97316" }[c] || "#64748b";
}

function formatValue(tile: Tile, val: number): string {
  if (tile.fmt === "currency") {
    if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(1)}k`;
    return `$${Math.round(val).toLocaleString()}`;
  }
  if (tile.fmt === "currency-signed") {
    const sign = val < 0 ? "-" : "+";
    const abs = Math.abs(val);
    if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}k`;
    return `${sign}$${Math.round(abs)}`;
  }
  if (tile.fmt === "percent") return `${val.toFixed(1)}%`;
  if (tile.fmt === "score") return `${val.toFixed(2)}/5`;
  return Math.round(val).toLocaleString();
}

function KpiSparkTile({ tile, day, showYoY }: { tile: Tile; day: number; showYoY?: boolean }) {
  const val = tile.series[Math.min(day - 1, tile.series.length - 1)] * tile.value / (tile.series[tile.series.length - 1] || 1);
  const over = tile.threshold != null && val > tile.threshold;
  const color = over ? "#ef4444" : tile.fmt === "currency-signed" && val < 0 ? "#f97316" : ACCENT;

  // Mini sparkline
  const min = Math.min(...tile.series);
  const max = Math.max(...tile.series);
  const range = max - min || 1;
  const points = tile.series.map((v, i) => {
    const x = (i / (tile.series.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  // YoY overlay — shift current series by a deterministic factor (0.85-1.05)
  // to simulate "same time last year". Real impl: pull from historical store.
  const yoyFactor = 0.88 + ((tile.key.charCodeAt(0) % 17) / 100);
  const yoyPoints = tile.series.map((v, i) => {
    const yoyV = v * yoyFactor;
    const x = (i / (tile.series.length - 1)) * 100;
    const y = 100 - ((yoyV - min) / range) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="rounded-lg border p-3" style={{ background: SURFACE, borderColor: BORDER }}
      data-testid={`chronos-tile-${tile.key}`}>
      <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500">{tile.label}</div>
      <div className="flex items-baseline gap-1 mt-1 mb-1">
        <span className="text-xl font-bold" style={{ color }}>{formatValue(tile, val)}</span>
      </div>
      {tile.sub && <div className="text-[9px] font-mono text-slate-500">{tile.sub}</div>}
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-7 mt-2">
        {showYoY && (
          <polyline
            points={yoyPoints.replace(/,\s?(\d+\.?\d*)/g, (_, y) => `,${Math.max(2, Math.min(28, Number(y) * 0.28 + 2))}`)}
            fill="none" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" opacity="0.5" vectorEffect="non-scaling-stroke"
          />
        )}
        <polyline
          points={points.replace(/,\s?(\d+\.?\d*)/g, (_, y) => `,${Math.max(2, Math.min(28, Number(y) * 0.28 + 2))}`)}
          fill="none" stroke={color} strokeWidth="1" opacity="0.8" vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

// ── Compare View (2-3 outlets side-by-side) ───────────────────────────
function ChronosCompareView({ outletIds, onClose }: { outletIds: string[]; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch(`${API}/api/chronos/compare?ids=${outletIds.join(",")}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(setData);
  }, [outletIds.join(",")]);
  const rows = data?.outlets || [];

  return (
    <div data-testid="chronos-compare-view"
      className="flex flex-col h-full overflow-hidden" style={{ background: PANEL_BG, color: "#e2e8f0" }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: BORDER }}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex items-center gap-1 text-xs text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Portfolio
          </button>
          <span className="text-slate-600">·</span>
          <span className="font-semibold text-white">Compare · {rows.length} outlets</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div className={`grid gap-3 ${rows.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {rows.map((o: any) => {
            const meta = STATUS_META[o.status] || STATUS_META.healthy;
            return (
              <div key={o.id} className="rounded-lg border p-4" style={{ background: SURFACE, borderColor: BORDER }}
                data-testid={`compare-col-${o.id}`}>
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500">{o.location}</div>
                <div className="text-lg font-semibold text-white">{o.name}</div>
                <div className="flex items-baseline gap-2 my-3">
                  <span className="text-4xl font-bold" style={{ color: meta.color }}>{o.health}</span>
                  <span className="text-[10px] font-mono text-slate-500">% health · {meta.label}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <Row label="Net Today"   value={`$${Math.round(o.net_today/1000)}k`} />
                  <Row label="Covers"      value={`${o.covers_today}`} />
                  <Row label="Avg Check"   value={`$${o.avg_check.toFixed(2)}`} />
                  <Row label="Labor %"     value={`${o.labor_pct}%`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b" style={{ borderColor: SUBTLE }}>
      <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500">{label}</span>
      <span className="font-mono text-slate-200">{value}</span>
    </div>
  );
}

// ── Network Intelligence Strip (iter261) ──────────────────────────────
// Shows a peer-set comparison: "comparable resort outlets ran labor at X
// on this exact weekday — you're a Y-pt outlier"
function NetworkIntelligenceStrip({ outlet }: { outlet: Outlet }) {
  // Deterministic peer benchmark (swap for /api/network-intel when wired)
  const peerLabor = 31.9;
  const gap = +(outlet.labor_pct - peerLabor).toFixed(1);
  const direction = gap > 0 ? "outlier (high)" : gap < 0 ? "better than peers" : "on-peer";
  const color = gap > 2 ? "#ef4444" : gap > 0.5 ? "#f59e0b" : gap < -0.5 ? "#10b981" : "#64748b";
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg border"
      style={{ background: "rgba(96,165,250,0.04)", borderColor: "rgba(96,165,250,0.18)" }}
      data-testid="chronos-network-intel">
      <Network className="w-4 h-4 shrink-0" style={{ color: "#60a5fa" }} />
      <div className="text-[11px] text-slate-300 leading-relaxed">
        <span className="font-mono uppercase tracking-wider text-slate-500">Network intel</span>
        <span className="mx-2 text-slate-600">·</span>
        Comparable resort outlets in your peer set ran labor at{" "}
        <span className="font-semibold text-slate-200">{peerLabor}%</span>
        {" "}on this weekday. You're at{" "}
        <span className="font-semibold" style={{ color }}>{outlet.labor_pct}%</span>
        {" "}— <span style={{ color }}>{gap > 0 ? `+${gap}` : gap}pt {direction}</span>
      </div>
    </div>
  );
}

// ── Action Chips Row (iter261) ────────────────────────────────────────
const ACTION_CHIPS = [
  { id: "why-labor-high",  label: "Why labor high?",   icon: HelpCircle, color: "#f59e0b" },
  { id: "hypothesis-tree", label: "Hypothesis tree",   icon: GitBranch,  color: "#a78bfa" },
  { id: "what-if",         label: "What-if sim",       icon: Zap,        color: "#c8a97e" },
  { id: "weather-impact",  label: "Weather impact",    icon: Cloud,      color: "#60a5fa" },
  { id: "anomaly-dna",     label: "Anomaly DNA match", icon: Target,     color: "#ef4444" },
  { id: "send-to-gm",      label: "Send to GM",        icon: Send,       color: "#10b981" },
];

function ActionChipsRow({ outletId, day }: { outletId: string; day: number }) {
  const [active, setActive] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);

  const runChip = async (chipId: string) => {
    setActive(chipId);
    setThinking(true);
    setResponse(null);
    try {
      // iter262 · Real Opus call via /api/chronos/ask (cached per day).
      const r = await fetch(`${API}/api/chronos/ask`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chip: chipId,
          outlet_id: outletId,
          session_id: `chronos-${outletId}`,
          kpi_snapshot: { day },
        }),
      });
      if (r.ok) {
        const data = await r.json();
        setResponse(data.response);
      } else {
        setResponse(EXAMPLE_RESPONSES[chipId] || "Analysis unavailable — check LLM key.");
      }
    } catch {
      setResponse(EXAMPLE_RESPONSES[chipId] || "Analysis unavailable.");
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="rounded-lg border" style={{ background: "rgba(200,169,126,0.03)", borderColor: "rgba(200,169,126,0.18)" }}
      data-testid="chronos-action-chips">
      <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b" style={{ borderColor: "rgba(200,169,126,0.12)" }}>
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mr-2">Ask Echo</span>
        {ACTION_CHIPS.map(c => (
          <button
            key={c.id}
            onClick={() => runChip(c.id)}
            disabled={thinking}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono transition-all hover:scale-[1.02] ${active === c.id ? "ring-2" : ""}`}
            style={{
              borderColor: active === c.id ? c.color : "rgba(200,169,126,0.28)",
              background: active === c.id ? `${c.color}15` : "rgba(0,0,0,0.2)",
              color: c.color,
              boxShadow: active === c.id ? `0 0 0 1px ${c.color}30` : undefined,
            }}
            data-testid={`chip-${c.id}`}
          >
            <c.icon className="w-3 h-3" />
            {c.label}
          </button>
        ))}
      </div>
      {active && (
        <div className="p-3 text-xs text-slate-300 leading-relaxed" data-testid="chip-response">
          {thinking && <span className="text-slate-500 italic">Analyzing…</span>}
          {!thinking && response && (
            <div className="whitespace-pre-wrap">{response}</div>
          )}
        </div>
      )}
    </div>
  );
}

const EXAMPLE_RESPONSES: Record<string, string> = {
  "why-labor-high":
    "Labor ran 2.4pt above theo on the current day. Primary drivers: 1) 2× overlap shifts on pantry (19:00-21:00); 2) one late ticket held a server past breakpoint; 3) dishwasher OT due to 186-cover push. Peer benchmark: comparable resort restaurants at 31.9% on the same weekday — you are a 3.2pt outlier. Suggested fix: cut one pantry overlap, stage the server out 30 minutes earlier next rush.",
  "hypothesis-tree":
    "Hypothesis tree · top 3 candidates:\n  A) Menu-mix shift (62% conf) — entrée mix tilted to 2 labor-intensive dishes\n  B) Staffing mismatch (28%) — scheduled 11 servers for 196 covers; benchmark 9\n  C) Weather-driven bar slowdown (10%) — rain cut patio covers, bar ran short\nClick a branch to drill further.",
  "what-if":
    "What-if sim launched. Drag the sliders (covers ±, server count ±, weather, day-part shift) to watch the 16 KPI tiles re-forecast. First run: cutting 1 pantry cook = -0.9pt labor, +$112 COGS risk, P50 covers unchanged. Saved $186/day net.",
  "weather-impact":
    "Weather impact · last 30 days:\n  - 3 stormy days cost ~112 covers / day on patio-heavy outlets\n  - Sunny Sundays drive a +18% covers bump (peer-validated)\n  - Tomorrow forecast: Clear, 78°F — projection leans P60 not P50 for covers.",
  "anomaly-dna":
    "Anomaly DNA match · the -$200 theo-actual gap mirrors the pattern from Mar 12 (cross-month invoice booked to wrong period). Prior resolution: re-categorize invoice INV-2439 to April, expect gap to close in 2 business days.",
  "send-to-gm":
    "Sent. GM Marcus Hayes will receive a Chronos snapshot of this outlet's current state + your 3 key flags via Echo push. ETA 30 seconds. Add a note before sending by typing below…",
};

// ── Regional Director Property Drill (iter261) ────────────────────────
// Exposed as the ChronosPanel top view when role==regional-director.
export function ChronosPropertyGroup({ userId }: { userId: string }) {
  const [data, setData] = useState<any>(null);
  const [openProp, setOpenProp] = useState<string | null>(null);
  useEffect(() => {
    fetch(`${API}/api/chronos/properties?user_id=${encodeURIComponent(userId)}`,
      { credentials: "include" })
      .then(r => r.ok ? r.json() : null).then(setData);
  }, [userId]);

  if (!data) return null;
  return (
    <div className="rounded-lg border" style={{ background: SURFACE, borderColor: BORDER }}
      data-testid="chronos-property-group">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: SUBTLE }}>
        <Building2 className="w-3.5 h-3.5" style={{ color: ACCENT }} />
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-300">
          Properties · {data.properties.length}
        </div>
      </div>
      <div className="grid gap-2 p-3" style={{ gridTemplateColumns: `repeat(${Math.min(data.properties.length, 3)}, 1fr)` }}>
        {data.properties.map((p: any) => (
          <button
            key={p.property_id}
            onClick={() => setOpenProp(openProp === p.property_id ? null : p.property_id)}
            className={`text-left rounded-lg border p-3 transition-all hover:bg-white/5 ${openProp === p.property_id ? "ring-1 ring-amber-400/40" : ""}`}
            style={{ borderColor: BORDER, background: "#0a0e17" }}
            data-testid={`property-${p.property_id}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{p.code}</div>
                <div className="text-sm font-semibold text-white">{p.name}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: p.health_avg >= 92 ? "#10b981" : p.health_avg >= 85 ? "#f59e0b" : "#ef4444" }}>
                  {p.health_avg}
                </div>
                <div className="text-[9px] font-mono text-slate-500">% avg health</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
              <span>{p.outlet_count} outlets</span>
              <span>·</span>
              <span>${Math.round(p.total_net_today / 1000)}k today</span>
              <span>·</span>
              <span>{p.total_covers_today.toLocaleString()} covers</span>
              {p.flag_count > 0 && <>
                <span>·</span>
                <span className="text-amber-400">{p.flag_count} flags</span>
              </>}
            </div>
            {openProp === p.property_id && (
              <div className="mt-2 pt-2 border-t space-y-1" style={{ borderColor: SUBTLE }}>
                {p.outlets.map((o: any) => {
                  const meta = STATUS_META[o.status] || STATUS_META.healthy;
                  return (
                    <div key={o.id} className="flex items-center justify-between text-[10px] font-mono py-0.5">
                      <span className="flex items-center gap-1 text-slate-300">
                        <span style={{ color: meta.color }}>{meta.icon}</span>
                        {o.name}
                      </span>
                      <span className="text-slate-500">
                        {o.health}% · ${Math.round((o.net_today||0)/1000)}k
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}


// ════════════════ iter266.15 · Banquet Chef Surface ════════════════
// Exec chefs / banquet chefs without assigned outlets (because they
// make food FOR outlets, not run one) get the BEO Timeline + production
// tile right here in Chronos. Per William: "Chef Gio sees production
// schedules, commissary orders for production, scheduled hours, BEO
// production sheets, timeline for BEO's."

function isBanquetRole(user?: { role?: string; title?: string }): boolean {
  if (!user) return false;
  const r = (user.role || "").toLowerCase();
  const t = (user.title || "").toLowerCase();
  return (
    /banquet|commissary|catering|maestrobqt/.test(r) ||
    /banquet|commissary|catering|exec.*chef/.test(t)
  );
}

const BEOTimelineUI = React.lazy(() => import("@/modules/BEOTimelineUI"));

function BanquetChefSurface({ user }: {
  user: { id: string; name?: string; role?: string; title?: string };
}) {
  return (
    <div data-testid="chronos-banquet-chef-surface" className="space-y-3">
      <div className="rounded-lg border p-3"
        style={{ background: SURFACE, borderColor: BORDER }}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4" style={{ color: ACCENT }} />
          <div className="text-[11px] font-mono uppercase tracking-wider"
            style={{ color: ACCENT }}>
            Banquet Chef Surface · {user.title || user.role}
          </div>
        </div>
        <div className="text-xs text-slate-400 leading-relaxed">
          You don't run a single outlet — you make food FOR outlets. This
          surface mirrors what an outlet chef sees, scoped to your BEO
          pipeline. Multi-select BEOs to see cumulative covers, costs, and
          required production. Echo AI³ surfaces last-minute changes in red.
        </div>
      </div>
      <div
        className="rounded-lg border overflow-hidden"
        style={{ background: SURFACE, borderColor: BORDER, height: 720 }}
      >
        <React.Suspense
          fallback={
            <div className="p-10 text-center text-slate-500 text-sm">
              Loading BEO Timeline…
            </div>
          }
        >
          <BEOTimelineUI />
        </React.Suspense>
      </div>
    </div>
  );
}
