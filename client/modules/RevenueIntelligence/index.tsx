import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, BarChart3, Layers, Target, ArrowUpRight, ArrowDownRight, RefreshCw, Zap, ShoppingBag, Smartphone, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND = window.location.origin;
async function api(path: string) {
  const res = await fetch(`${BACKEND}/api/analytics${path}`, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type TabId = "overview" | "recovery" | "yield" | "channels";
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "recovery", label: "Margin Recovery", icon: Target },
  { id: "yield", label: "Yield Variance", icon: TrendingUp },
  { id: "channels", label: "Channel Mix", icon: Layers },
];

export default function RevenueIntelligencePanel() {
  const [tab, setTab] = useState<TabId>("overview");
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }} data-testid="revenue-intel-panel">
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(245,158,11,0.15))", border: "1px solid rgba(16,185,129,0.25)" }}>
          <TrendingUp className="w-[18px] h-[18px] text-emerald-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white tracking-wide">Revenue Intelligence</div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Cross-Module Analytics & Yield Benchmarking</div>
        </div>
      </div>
      <div className="flex border-b px-3 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`ri-tab-${t.id}`} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors"
            style={{ borderColor: tab === t.id ? "#10b981" : "transparent", color: tab === t.id ? "#6ee7b7" : "#64748b" }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "overview" && <OverviewTab />}
        {tab === "recovery" && <RecoveryTab />}
        {tab === "yield" && <YieldTab />}
        {tab === "channels" && <ChannelsTab />}
      </div>
    </div>
  );
}

/* ═══════════════════ OVERVIEW ═══════════════════ */

function OverviewTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api("/cross-module?days=30").then(setData).catch(() => {}); }, []);
  if (!data) return <Loading />;
  const s = data.summary;
  return (
    <div className="space-y-5" data-testid="ri-overview-tab">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        <Kpi label="Menu Items" value={s.total_menu_items} accent="text-slate-300" icon={<UtensilsCrossed className="w-3.5 h-3.5 text-slate-500" />} />
        <Kpi label="Flagged Margins" value={s.flagged_margin_items} accent="text-rose-400" icon={<TrendingDown className="w-3.5 h-3.5 text-rose-500" />} />
        <Kpi label="Revenue at Risk" value={`$${s.revenue_at_risk.toLocaleString()}`} accent="text-amber-400" icon={<Zap className="w-3.5 h-3.5 text-amber-500" />} />
        <Kpi label="AI Fixes Applied" value={s.total_ai_fixes} accent="text-violet-400" icon={<Target className="w-3.5 h-3.5 text-violet-500" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ChannelCard icon={<ShoppingBag className="w-4 h-4 text-cyan-400" />} title="Micro-Market" color="cyan"
          stats={[
            { label: "Kiosks", value: s.mm_kiosks },
            { label: "Revenue", value: `$${s.mm_revenue}` },
            { label: "Sales", value: s.mm_sales },
            { label: "Low Stock", value: s.mm_low_stock, warn: s.mm_low_stock > 0 },
          ]} />
        <ChannelCard icon={<Smartphone className="w-4 h-4 text-violet-400" />} title="Mobile Preorder" color="violet"
          stats={[
            { label: "Lockers", value: s.mo_lockers },
            { label: "Today Orders", value: s.mo_today_orders },
            { label: "Revenue", value: `$${s.mo_today_revenue}` },
            { label: "Pickup Rate", value: `${(s.mo_pickup_rate * 100).toFixed(0)}%` },
          ]} />
        <ChannelCard icon={<UtensilsCrossed className="w-4 h-4 text-emerald-400" />} title="Cafeteria" color="emerald"
          stats={[
            { label: "Revenue", value: `$${s.caf_today_revenue}` },
            { label: "Transactions", value: s.caf_today_transactions },
            { label: "Waste (lbs)", value: s.caf_waste_lbs, warn: s.caf_waste_lbs > 10 },
            { label: "Avg Food Cost", value: `${(s.avg_food_cost_pct * 100).toFixed(1)}%` },
          ]} />
      </div>

      <div className="bg-slate-800/30 rounded-lg border border-slate-700/20 p-4">
        <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3">Channel Revenue Mix</h3>
        <div className="space-y-2">
          {data.channel_mix.map((ch: any) => (
            <div key={ch.channel} className="flex items-center gap-3">
              <span className="text-xs text-slate-300 w-32">{ch.channel}</span>
              <div className="flex-1 h-2 bg-slate-700/40 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(ch.pct * 100, 2)}%`, background: ch.source === "fix-menu" ? "#f59e0b" : ch.source === "micro-market" ? "#06b6d4" : ch.source === "mobile-order" ? "#a855f7" : "#10b981" }} />
              </div>
              <span className="text-xs font-mono text-white w-20 text-right">${ch.revenue}</span>
              <span className="text-[10px] text-slate-500 w-12 text-right">{(ch.pct * 100).toFixed(1)}%</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-slate-700/30 flex justify-between">
          <span className="text-xs text-slate-400">Total Daily Revenue</span>
          <span className="text-sm font-bold text-emerald-400 font-mono">${data.total_channel_revenue}</span>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ MARGIN RECOVERY ═══════════════════ */

function RecoveryTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api("/cross-module?days=30").then(setData).catch(() => {}); }, []);
  if (!data) return <Loading />;
  const opps = data.recovery_opportunities || [];
  const totalImpact = opps.reduce((sum: number, o: any) => sum + (o.strategies?.[0]?.monthly_impact || 0), 0);
  return (
    <div className="space-y-4" data-testid="ri-recovery-tab">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <Kpi label="Recovery Opportunities" value={opps.length} accent="text-amber-400" />
        <Kpi label="Est. Monthly Impact" value={`$${totalImpact.toLocaleString()}`} accent="text-emerald-400" />
        <Kpi label="Revenue at Risk" value={`$${data.summary.revenue_at_risk.toLocaleString()}`} accent="text-rose-400" />
      </div>

      {opps.map((opp: any, i: number) => (
        <div key={i} data-testid={`recovery-opp-${i}`} className="bg-slate-800/40 rounded-lg border border-amber-500/15 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">{opp.item_name}</span>
              {opp.category && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-700/40 text-slate-400">{opp.category}</span>}
            </div>
            <span className="text-[10px] font-mono text-rose-400 font-bold">{(opp.current_food_cost_pct * 100).toFixed(1)}% food cost</span>
          </div>
          <div className="flex gap-4 text-[10px] text-slate-500 mb-3">
            <span>Cost: <span className="text-white">${opp.food_cost}</span></span>
            <span>Price: <span className="text-white">${opp.current_price}</span></span>
            <span>Vol: <span className="text-white">{opp.monthly_volume}/mo</span></span>
          </div>
          <div className="space-y-1.5">
            {(opp.strategies || []).map((st: any, j: number) => (
              <div key={j} className="flex items-center justify-between bg-slate-700/20 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={cn("text-[9px] font-mono px-1.5 py-0.5 rounded border",
                    st.strategy === "price_optimize" ? "bg-amber-500/10 text-amber-300 border-amber-500/20" :
                    st.strategy === "micro_market_bundle" ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/20" :
                    "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                  )}>{st.label}</span>
                  {st.new_price && <span className="text-[10px] text-slate-400">New: <span className="text-white font-mono">${st.new_price}</span></span>}
                  {st.delta && <span className="text-[10px] text-emerald-400">(+${st.delta})</span>}
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> ${st.monthly_impact?.toLocaleString()}/mo
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {opps.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No margin recovery opportunities — all items within target.</div>}
    </div>
  );
}

/* ═══════════════════ YIELD VARIANCE ═══════════════════ */

function YieldTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api("/yield-variance").then(setData).catch(() => {}); }, []);
  if (!data) return <Loading />;
  return (
    <div className="space-y-5" data-testid="ri-yield-tab">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Total Items" value={data.total_items} accent="text-slate-300" />
        <Kpi label="Projected Yield" value={`$${data.total_projected_yield.toLocaleString()}`} accent="text-blue-400" />
        <Kpi label="Actual Yield" value={`$${data.total_actual_yield.toLocaleString()}`} accent="text-emerald-400" />
        <Kpi label="Total Variance" value={`${data.total_variance >= 0 ? '+' : ''}$${data.total_variance.toLocaleString()}`}
          accent={data.total_variance >= 0 ? "text-emerald-400" : "text-rose-400"} />
      </div>

      {/* Category Breakdown */}
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/20 p-4">
        <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">Yield by Category</h3>
        <div className="space-y-2">
          {data.by_category.map((cat: any) => (
            <div key={cat.category} className="flex items-center justify-between bg-slate-700/20 rounded-lg px-3 py-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-white font-medium w-28">{cat.category}</span>
                <span className="text-[10px] text-slate-400">{cat.items} items</span>
                {cat.flagged > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300">{cat.flagged} flagged</span>}
              </div>
              <div className="flex items-center gap-4 text-[10px]">
                <span className="text-slate-400">Proj: <span className="text-blue-300 font-mono">${cat.projected.toLocaleString()}</span></span>
                <span className="text-slate-400">Act: <span className="text-emerald-300 font-mono">${cat.actual.toLocaleString()}</span></span>
                <span className={cn("font-mono font-bold flex items-center gap-0.5", cat.variance >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {cat.variance >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  ${Math.abs(cat.variance).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Worst Performers */}
      {data.worst_performers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5" /> Worst Yield Variance ({data.negative_variance_count} items)
          </h3>
          <div className="space-y-1.5">
            {data.worst_performers.map((item: any, i: number) => (
              <div key={i} data-testid={`worst-yield-${i}`} className="flex items-center justify-between bg-rose-500/5 rounded-lg px-3 py-2 border border-rose-500/15">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white">{item.item_name}</span>
                  <span className="text-[9px] font-mono text-slate-400">{item.category}</span>
                  <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-mono",
                    item.status === "above_target" ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"
                  )}>{(item.food_cost_pct * 100).toFixed(1)}% FC vs {(item.industry_target_fc * 100).toFixed(0)}% target</span>
                </div>
                <span className="text-xs font-mono text-rose-400 font-bold">{item.variance >= 0 ? '+' : ''}${item.variance.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Best Performers */}
      {data.best_performers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Best Yield Performers ({data.positive_variance_count} items)
          </h3>
          <div className="space-y-1.5">
            {data.best_performers.slice(0, 5).map((item: any, i: number) => (
              <div key={i} data-testid={`best-yield-${i}`} className="flex items-center justify-between bg-emerald-500/5 rounded-lg px-3 py-2 border border-emerald-500/15">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white">{item.item_name}</span>
                  <span className="text-[9px] font-mono text-slate-400">{item.category}</span>
                </div>
                <span className="text-xs font-mono text-emerald-400 font-bold">+${item.variance.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Industry Benchmarks Reference */}
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/20 p-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Industry Food Cost Benchmarks</h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.industry_benchmarks).map(([cat, pct]) => (
            <span key={cat} className="text-[10px] px-2 py-1 rounded bg-slate-700/30 text-slate-300 font-mono">
              {cat}: {((pct as number) * 100).toFixed(0)}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ CHANNEL MIX ═══════════════════ */

function ChannelsTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api("/cross-module?days=30").then(setData).catch(() => {}); }, []);
  if (!data) return <Loading />;
  const channels = data.channel_mix || [];
  const s = data.summary;
  return (
    <div className="space-y-5" data-testid="ri-channels-tab">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Kpi label="Total Revenue" value={`$${data.total_channel_revenue}`} accent="text-emerald-400" />
        <Kpi label="Channels Active" value={channels.filter((c: any) => c.revenue > 0).length} accent="text-blue-400" />
        <Kpi label="Menu Items" value={s.total_menu_items} accent="text-slate-300" />
        <Kpi label="Kiosks + Lockers" value={s.mm_kiosks + s.mo_lockers} accent="text-violet-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {channels.map((ch: any, i: number) => {
          const color = ch.source === "fix-menu" ? "amber" : ch.source === "micro-market" ? "cyan" : ch.source === "mobile-order" ? "violet" : "emerald";
          return (
            <div key={i} data-testid={`channel-card-${i}`} className="bg-slate-800/40 rounded-lg border border-slate-700/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-white">{ch.channel}</span>
                <span className={`text-lg font-bold font-mono text-${color}-400`}>${ch.revenue}</span>
              </div>
              <div className="h-2 bg-slate-700/40 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all" style={{
                  width: `${Math.max(ch.pct * 100, 3)}%`,
                  background: color === "amber" ? "#f59e0b" : color === "cyan" ? "#06b6d4" : color === "violet" ? "#a855f7" : "#10b981"
                }} />
              </div>
              <div className="text-[10px] text-slate-500">{(ch.pct * 100).toFixed(1)}% of total revenue</div>
            </div>
          );
        })}
      </div>

      {/* Cross-sell recommendations */}
      <div className="bg-slate-800/30 rounded-lg border border-emerald-500/15 p-4">
        <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5" /> Cross-Channel Optimization
        </h3>
        <div className="space-y-2">
          {s.flagged_margin_items > 0 && (
            <OptimizationTip
              label="Menu-to-MicroMarket"
              description={`${s.flagged_margin_items} flagged menu items could be repositioned as grab-and-go offerings in micro-markets at optimized pricing`}
              impact={`Est. $${Math.round(s.revenue_at_risk * 0.15).toLocaleString()}/mo recovery`} />
          )}
          {s.mm_low_stock > 0 && (
            <OptimizationTip
              label="Replenishment Alert"
              description={`${s.mm_low_stock} micro-market items at or below par level — revenue leakage from stockouts`}
              impact="Prevent lost sales" />
          )}
          {s.mo_pickup_rate < 0.8 && s.mo_today_orders > 0 && (
            <OptimizationTip
              label="Pickup Optimization"
              description={`Pickup rate at ${(s.mo_pickup_rate * 100).toFixed(0)}% — consider SMS reminders or extended hold times`}
              impact="Reduce food waste from expired orders" />
          )}
          {s.caf_waste_lbs > 5 && (
            <OptimizationTip
              label="Waste Reduction"
              description={`${s.caf_waste_lbs} lbs cafeteria waste today — analyze overproduction patterns`}
              impact="Reduce food cost 3-5%" />
          )}
          <OptimizationTip
            label="Bundle Strategy"
            description="Create cross-channel bundles: dine-in entree + micro-market snack + mobile preorder lunch combo"
            impact="Increase avg order value 15-20%" />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ SHARED COMPONENTS ═══════════════════ */

function ChannelCard({ icon, title, color, stats }: { icon: React.ReactNode; title: string; color: string; stats: { label: string; value: any; warn?: boolean }[] }) {
  return (
    <div className={`bg-slate-800/40 rounded-lg border border-${color}-500/15 p-4`}>
      <div className="flex items-center gap-2 mb-3">{icon}<span className="text-xs font-semibold text-white">{title}</span></div>
      <div className="grid grid-cols-2 gap-2">
        {stats.map(s => (
          <div key={s.label}>
            <div className="text-[10px] text-slate-500">{s.label}</div>
            <div className={cn("text-sm font-bold font-mono", s.warn ? "text-amber-400" : "text-white")}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OptimizationTip({ label, description, impact }: { label: string; description: string; impact: string }) {
  return (
    <div className="flex items-start gap-2 bg-slate-700/20 rounded-lg px-3 py-2">
      <ArrowUpRight className="w-3.5 h-3.5 mt-0.5 text-emerald-400 flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">{label}</span>
        </div>
        <div className="text-xs text-slate-300">{description}</div>
        <div className="text-[10px] text-emerald-400 mt-0.5">{impact}</div>
      </div>
    </div>
  );
}

function Loading() { return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-slate-500 animate-spin" /></div>; }

function Kpi({ label, value, accent, icon }: { label: string; value: any; accent: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/30 rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn("text-lg font-bold", accent)}>{value ?? 0}</div>
    </div>
  );
}
