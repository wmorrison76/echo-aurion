// iter266.12 · Chef Outlet Dashboard
// ====================================
// Per William's brief: full breakdown of orders placed/received, standing
// inventory, menu mix, price fluctuations, Monte Carlo 1/3/5/7d with
// operator-selectable iterations (1k/2k/5k/7500), labor + PTO/call-off,
// per-station performance for the "dream team" schedule recommendation,
// hourly breakdown, prep schedules. All real data, no placeholders.
//
// Backend: /api/chef-outlet/dashboard?outlet_id=...&iterations=...
//
// Echo Chronos UI/UX language — dark-first, mono numerics, gold accents.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useThemeTokens } from "@/styles/design-tokens";
import { useAuth } from "@/lib/auth-context";
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, Box, Brain, Building2,
  CalendarDays, ChefHat, DollarSign, Flame, ListChecks, Loader2, Package,
  Sparkles, Timer, TrendingUp, Users, RefreshCw,
} from "lucide-react";

type ChefOutletData = {
  found: boolean;
  outlet_id: string;
  outlet_name: string;
  outlet_type?: string;
  generated_at: string;
  orders: {
    placed_today: number; placed_open: number;
    received_today: number; received_today_cost: number;
    received_ytd_count: number; received_ytd_cost: number;
    recent_invoices: Array<{ id: string; vendor: string; amount: number; date: string; line_count: number }>;
  };
  inventory: {
    source: string; snapshot_date: string;
    item_count: number; total_value: number; low_stock_count: number;
    note?: string;
  };
  price_movers: Array<{
    description: string; vendor: string; uom: string;
    baseline_price: number; current_price: number;
    delta_pct: number; direction: "up" | "down";
  }>;
  menu_mix: {
    source: string; date_iso: string;
    items: Array<{ item_id: string; name: string; units_sold: number; revenue: number; price: number; category: string }>;
    totals: { items_tracked: number; total_units: number; total_revenue: number };
    by_category: Array<{ category: string; units: number; revenue: number }>;
  };
  forecast: {
    available: boolean; iterations: number; iterations_options?: number[];
    history_days?: number; data_source?: string;
    base_mean_per_day?: number; base_stdev_per_day?: number;
    horizons?: Record<string, { horizon_days: number; p10: number; p50: number; p90: number; mean: number; stdev: number }>;
    reason?: string;
  };
  labor: {
    week_start: string; today_shift_count: number;
    today_shifts: Array<{ employee_id: string; employee_name: string; in_time: string; out_time: string; position: string; tier?: number; flags?: string[] }>;
    by_day: Array<{ date: string; shifts: number }>;
    by_station: Array<{ station: string; shifts: number; hours: number }>;
    hourly_distribution: Array<{ hour: number; shifts_starting: number }>;
    pto_count: number; call_off_count: number;
    dream_team: Array<{ employee_id: string; employee_name: string; positions: string[]; shifts: number; tier: number }>;
  };
  ytd: {
    ytd_start: string; ytd_cost: number; ytd_sales: number;
    ytd_sales_source: string | null; ytd_margin_pct: number | null;
  };
};

const ITERATION_OPTIONS = [1000, 2000, 5000, 7500] as const;

export default function ChefOutletDashboard() {
  const t = useThemeTokens();
  const { user } = useAuth();
  const [outlets, setOutlets] = useState<Array<{ outlet_id: string; name: string; outlet_type?: string }>>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<string | null>(null);
  const [iterations, setIterations] = useState<number>(2000);
  const [data, setData] = useState<ChefOutletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load chef's outlets
  useEffect(() => {
    const load = async () => {
      try {
        const email = user?.email || "";
        const qs = email ? `?email=${encodeURIComponent(email)}` : "";
        const r = await fetch(`/api/chef-outlet/outlets-for-chef${qs}`);
        const j = await r.json();
        setOutlets(j.outlets || []);
        if (j.outlets?.length && !selectedOutlet) {
          setSelectedOutlet(j.outlets[0].outlet_id);
        }
      } catch (e) {
        setError(`Couldn't load outlets: ${(e as Error).message}`);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  // iter266.15 · Listen for cross-panel deep-link (Chronos outlet card → Chef Outlet Dashboard)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id === "chef-outlet-dashboard" && detail?.outlet_id) {
        setSelectedOutlet(detail.outlet_id);
      }
    };
    window.addEventListener("open-panel", handler as EventListener);
    return () => window.removeEventListener("open-panel", handler as EventListener);
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedOutlet) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/chef-outlet/dashboard?outlet_id=${encodeURIComponent(selectedOutlet)}&iterations=${iterations}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j);
      setError(null);
    } catch (e) {
      setError(`Dashboard fetch failed: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [selectedOutlet, iterations]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const margin = data?.ytd.ytd_margin_pct;
  const marginTone = margin == null ? t.textMuted
    : margin >= 55 ? "#22c55e" : margin >= 35 ? "#f59e0b" : "#ef4444";

  return (
    <div
      data-testid="chef-outlet-dashboard"
      style={{
        height: "100%", display: "flex", flexDirection: "column",
        background: t.panelBg, color: t.textPrimary, overflow: "hidden",
      }}
    >
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 20px", borderBottom: `1px solid ${t.border}`,
        background: "var(--aurion-surface-elevated)",
      }}>
        <ChefHat size={18} style={{ color: t.accent }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10, color: t.accent, letterSpacing: "0.18em",
            textTransform: "uppercase", fontWeight: 700,
          }}>
            Echo AURION · Chef Outlet Dashboard
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: t.textPrimary }}>
            {data?.outlet_name || "Select an outlet"}
            {data?.outlet_type && (
              <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 10, fontWeight: 500 }}>
                · {data.outlet_type}
              </span>
            )}
          </div>
        </div>

        <select
          data-testid="chef-outlet-selector"
          value={selectedOutlet || ""}
          onChange={(e) => setSelectedOutlet(e.target.value)}
          style={{
            background: t.surface, color: t.textPrimary,
            border: `1px solid ${t.border}`, borderRadius: 4,
            padding: "6px 10px", fontSize: 12, fontFamily: "inherit",
            minWidth: 200,
          }}
        >
          {outlets.map(o => (
            <option key={o.outlet_id} value={o.outlet_id}>{o.name}</option>
          ))}
        </select>

        <button
          data-testid="chef-outlet-refresh"
          onClick={fetchData}
          style={{
            background: "transparent", border: `1px solid ${t.border}`,
            color: t.textSecondary, padding: "6px 10px", borderRadius: 4,
            fontSize: 11, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Refresh
        </button>
      </div>

      {/* KPI strip */}
      {data?.found && (
        <div data-testid="chef-outlet-kpis" style={{
          display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 10, padding: "12px 20px", borderBottom: `1px solid ${t.border}`,
        }}>
          <Kpi t={t} icon={<DollarSign size={12} />} label="YTD Sales" value={fmt$(data.ytd.ytd_sales)} sub={data.ytd.ytd_sales_source || "—"} />
          <Kpi t={t} icon={<DollarSign size={12} />} label="YTD Cost" value={fmt$(data.ytd.ytd_cost)} sub={`${data.orders.received_ytd_count} invoices`} tone="warn" />
          <Kpi t={t} icon={<TrendingUp size={12} />} label="YTD Margin" value={margin != null ? `${margin}%` : "—"} sub="profit after cogs" color={marginTone} />
          <Kpi t={t} icon={<Package size={12} />} label="Inventory Value" value={fmt$(data.inventory.total_value)} sub={`${data.inventory.item_count} SKUs`} />
          <Kpi t={t} icon={<Users size={12} />} label="Today's Shifts" value={String(data.labor.today_shift_count)} sub={`${data.labor.pto_count} PTO · ${data.labor.call_off_count} call-off`} tone={data.labor.call_off_count > 0 ? "warn" : "ok"} />
          <Kpi t={t} icon={<ListChecks size={12} />} label="Menu Items Mixed" value={String(data.menu_mix.totals.items_tracked)} sub={fmt$(data.menu_mix.totals.total_revenue)} />
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px 20px 24px" }}>
        {error && (
          <div data-testid="chef-outlet-error" style={{
            padding: 12, marginBottom: 12, fontSize: 12,
            color: "#ef4444", background: "#ef444411",
            border: `1px solid #ef444433`, borderRadius: 4,
          }}>{error}</div>
        )}

        {loading && !data ? (
          <div style={{ padding: 60, textAlign: "center", color: t.textMuted, fontSize: 13 }}>
            <Loader2 size={20} className="animate-spin" style={{ display: "inline-block", marginRight: 8, verticalAlign: "middle" }} />
            Loading chef dashboard…
          </div>
        ) : !data?.found ? (
          <div style={{ padding: 40, textAlign: "center", color: t.textMuted }}>
            No outlets assigned. Ask your admin to add outlet access in Onboarding.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 360px", gap: 18 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              <MonteCarloCard
                data={data.forecast} iterations={iterations}
                onIterationChange={setIterations} t={t}
              />
              <MenuMixCard menu={data.menu_mix} t={t} />
              <LaborCard labor={data.labor} t={t} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
              <OrdersCard orders={data.orders} t={t} />
              <InventoryCard inv={data.inventory} t={t} />
              <PriceMoversCard movers={data.price_movers} t={t} />
              <DreamTeamCard team={data.labor.dream_team} t={t} />
            </div>
          </div>
        )}

        {data?.generated_at && (
          <div style={{ marginTop: 18, fontSize: 10, color: t.textMuted, textAlign: "right" }}>
            Generated {new Date(data.generated_at).toLocaleTimeString()} · auto-refresh 60s
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────── building blocks ───────────────

function fmt$(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Math.round(n).toLocaleString()}`;
}

function Kpi({ t, icon, label, value, sub, tone, color }: {
  t: ReturnType<typeof useThemeTokens>;
  icon: React.ReactNode; label: string; value: string; sub?: string;
  tone?: "ok" | "warn" | "down"; color?: string;
}) {
  const toneColor = color
    || (tone === "down" ? "#ef4444"
      : tone === "warn" ? "#f59e0b"
        : tone === "ok" ? "#22c55e" : t.textPrimary);
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`,
      borderTop: `2px solid ${toneColor}`, borderRadius: 4,
      padding: "10px 12px", display: "flex", flexDirection: "column", gap: 3,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5,
        fontSize: 9, color: t.textMuted, letterSpacing: "0.1em",
        textTransform: "uppercase", fontWeight: 600 }}>
        <span style={{ color: toneColor }}>{icon}</span>{label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color: toneColor, fontFamily: "monospace", lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 9, color: t.textMuted }}>{sub}</div>}
    </div>
  );
}

function Section({ t, icon, title, sub, children, testid, action }: {
  t: ReturnType<typeof useThemeTokens>;
  icon: React.ReactNode; title: string; sub?: string;
  children: React.ReactNode; testid?: string; action?: React.ReactNode;
}) {
  return (
    <section data-testid={testid} style={{
      background: t.surface, border: `1px solid ${t.border}`, borderRadius: 6,
      padding: 14,
    }}>
      <header style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
      }}>
        <span style={{ color: t.accent }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>{title}</div>
          {sub && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 1 }}>{sub}</div>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function MonteCarloCard({ data, iterations, onIterationChange, t }: {
  data: ChefOutletData["forecast"]; iterations: number;
  onIterationChange: (n: number) => void;
  t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <Section
      t={t}
      icon={<Brain size={14} />}
      title="Monte Carlo Forecast · 1 / 3 / 5 / 7 day"
      sub={data.available
        ? `${data.history_days} days history · ${data.data_source} · ${data.iterations.toLocaleString()} iterations`
        : `Unavailable: ${data.reason || "no revenue history"}`}
      testid="chef-monte-carlo"
      action={
        <div style={{ display: "flex", gap: 4 }}>
          {ITERATION_OPTIONS.map(n => (
            <button
              key={n}
              data-testid={`chef-mc-iter-${n}`}
              onClick={() => onIterationChange(n)}
              style={{
                padding: "4px 8px", fontSize: 10, fontWeight: 700,
                background: iterations === n ? t.accent : "transparent",
                color: iterations === n ? t.panelBg : t.textSecondary,
                border: `1px solid ${iterations === n ? t.accent : t.border}`,
                borderRadius: 3, cursor: "pointer", fontFamily: "monospace",
              }}
            >
              {n >= 1000 ? `${n / 1000}k` : n}
            </button>
          ))}
        </div>
      }
    >
      {!data.available ? (
        <div style={{ padding: 16, textAlign: "center", color: t.textMuted, fontSize: 11 }}>
          Connect this outlet's POS feed to enable Monte Carlo predictions.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {Object.entries(data.horizons || {}).map(([key, h]) => (
            <div key={key} data-testid={`chef-mc-${key}`} style={{
              padding: 10, background: t.panelBg, borderRadius: 4,
              border: `1px solid ${t.border}`,
            }}>
              <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.1em",
                textTransform: "uppercase", marginBottom: 4 }}>
                {h.horizon_days}-day
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "monospace", color: t.accent }}>
                {fmt$(h.p50)}
              </div>
              <div style={{ fontSize: 9, color: t.textMuted, marginTop: 4 }}>
                P10 {fmt$(h.p10)} · P90 {fmt$(h.p90)}
              </div>
              <div style={{
                marginTop: 6, height: 4, background: `${t.accent}22`,
                borderRadius: 2, position: "relative",
              }}>
                <div style={{
                  position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
                  background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)`,
                  opacity: 0.5,
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function MenuMixCard({ menu, t }: {
  menu: ChefOutletData["menu_mix"]; t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <Section
      t={t}
      icon={<Flame size={14} />}
      title="Menu Mix · Today"
      sub={`${menu.totals.total_units} units · ${fmt$(menu.totals.total_revenue)} · source ${menu.source}`}
      testid="chef-menu-mix"
    >
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 12 }}>
        <div data-testid="chef-menu-items" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: 6 }}>Top Items</div>
          {menu.items.slice(0, 8).map((it, i) => {
            const pct = menu.totals.total_revenue > 0
              ? (it.revenue / menu.totals.total_revenue) * 100 : 0;
            return (
              <div key={it.item_id || i} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: t.textPrimary }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}</span>
                  <span style={{ fontFamily: "monospace", color: t.accent, marginLeft: 8 }}>{fmt$(it.revenue)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <div style={{ flex: 1, height: 3, background: `${t.accent}22`, borderRadius: 1.5 }}>
                    <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: t.accent, borderRadius: 1.5 }} />
                  </div>
                  <span style={{ fontSize: 9, color: t.textMuted, fontFamily: "monospace", minWidth: 60, textAlign: "right" }}>
                    {it.units_sold}u · ${it.price.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div data-testid="chef-menu-categories" style={{ minWidth: 0 }}>
          <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: 6 }}>By Category</div>
          {menu.by_category.slice(0, 6).map(c => (
            <div key={c.category} style={{
              display: "flex", justifyContent: "space-between",
              padding: "4px 0", fontSize: 11, borderBottom: `1px dashed ${t.border}`,
            }}>
              <span style={{ color: t.textPrimary }}>{c.category}</span>
              <span style={{ color: t.accent, fontFamily: "monospace" }}>{fmt$(c.revenue)}</span>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

function LaborCard({ labor, t }: {
  labor: ChefOutletData["labor"]; t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <Section
      t={t}
      icon={<Users size={14} />}
      title="Labor · This Week"
      sub={`${labor.today_shift_count} on today · ${labor.by_station.length} stations`}
      testid="chef-labor"
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div data-testid="chef-labor-stations">
          <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: 6 }}>By Station</div>
          {labor.by_station.slice(0, 6).map(s => (
            <div key={s.station} style={{
              display: "flex", justifyContent: "space-between",
              padding: "3px 0", fontSize: 11,
              borderBottom: `1px dashed ${t.border}`,
            }}>
              <span style={{ color: t.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.station}</span>
              <span style={{ color: t.textSecondary, fontFamily: "monospace" }}>
                {s.shifts}sh · {s.hours.toFixed(0)}h
              </span>
            </div>
          ))}
        </div>
        <div data-testid="chef-labor-hourly">
          <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: 6 }}>Hourly Shifts Starting</div>
          <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 60 }}>
            {labor.hourly_distribution.map(h => {
              const max = Math.max(1, ...labor.hourly_distribution.map(x => x.shifts_starting));
              const pct = (h.shifts_starting / max) * 100;
              return (
                <div key={h.hour} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: "100%", background: h.shifts_starting > 0 ? t.accent : `${t.textMuted}33`,
                    height: `${Math.max(2, pct)}%`, borderRadius: 1, minHeight: 2,
                  }} />
                  <div style={{ fontSize: 8, color: t.textMuted, marginTop: 2, fontFamily: "monospace" }}>{h.hour}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

function OrdersCard({ orders, t }: {
  orders: ChefOutletData["orders"]; t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <Section
      t={t}
      icon={<ListChecks size={14} />}
      title="Orders"
      sub={`${orders.received_today} received today · ${orders.placed_open} open`}
      testid="chef-orders"
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <Stat t={t} label="Placed Today" value={String(orders.placed_today)} />
        <Stat t={t} label="Open" value={String(orders.placed_open)} />
        <Stat t={t} label="Received" value={String(orders.received_today)} />
        <Stat t={t} label="Today Cost" value={fmt$(orders.received_today_cost)} />
      </div>
      {orders.recent_invoices.length > 0 && (
        <div data-testid="chef-orders-recent">
          <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.1em",
            textTransform: "uppercase", marginBottom: 4 }}>Recent</div>
          {orders.recent_invoices.slice(0, 5).map(inv => (
            <div key={inv.id} style={{
              display: "flex", justifyContent: "space-between",
              padding: "3px 0", fontSize: 10, color: t.textSecondary,
              borderBottom: `1px dashed ${t.border}`,
            }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.vendor}</span>
              <span style={{ color: t.accent, fontFamily: "monospace" }}>{fmt$(inv.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function InventoryCard({ inv, t }: {
  inv: ChefOutletData["inventory"]; t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <Section
      t={t}
      icon={<Box size={14} />}
      title="Standing Inventory"
      sub={`${inv.snapshot_date} · ${inv.source}`}
      testid="chef-inventory"
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Stat t={t} label="Items" value={String(inv.item_count)} />
        <Stat t={t} label="Value" value={fmt$(inv.total_value)} />
        <Stat t={t} label="Low Stock" value={String(inv.low_stock_count)} tone={inv.low_stock_count > 0 ? "warn" : "ok"} />
      </div>
      {inv.note && (
        <div style={{ marginTop: 8, fontSize: 9, color: t.textMuted, fontStyle: "italic" }}>{inv.note}</div>
      )}
    </Section>
  );
}

function PriceMoversCard({ movers, t }: {
  movers: ChefOutletData["price_movers"]; t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <Section
      t={t}
      icon={<TrendingUp size={14} />}
      title="Price Movers · 30d"
      sub={`${movers.length} SKUs with >1% change`}
      testid="chef-price-movers"
    >
      {movers.length === 0 ? (
        <div style={{ fontSize: 11, color: t.textMuted, padding: 8, textAlign: "center" }}>
          Pricing steady — no movers detected.
        </div>
      ) : (
        movers.slice(0, 6).map((m, i) => {
          const color = m.direction === "up" ? "#ef4444" : "#22c55e";
          const Arrow = m.direction === "up" ? ArrowUp : ArrowDown;
          return (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between",
              padding: "5px 0", fontSize: 10,
              borderBottom: `1px dashed ${t.border}`,
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: t.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.description}</div>
                <div style={{ color: t.textMuted, fontSize: 9 }}>{m.vendor}</div>
              </div>
              <div style={{ textAlign: "right", marginLeft: 6 }}>
                <div style={{ color, fontWeight: 700, display: "flex", alignItems: "center", gap: 2, justifyContent: "flex-end" }}>
                  <Arrow size={10} />{Math.abs(m.delta_pct).toFixed(1)}%
                </div>
                <div style={{ color: t.textMuted, fontSize: 9, fontFamily: "monospace" }}>
                  ${m.current_price.toFixed(2)}
                </div>
              </div>
            </div>
          );
        })
      )}
    </Section>
  );
}

function DreamTeamCard({ team, t }: {
  team: ChefOutletData["labor"]["dream_team"]; t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <Section
      t={t}
      icon={<Sparkles size={14} />}
      title="Dream Team · Peak Hours"
      sub="Echo AI³ suggests these employees for high-volume coverage"
      testid="chef-dream-team"
    >
      {team.length === 0 ? (
        <div style={{ fontSize: 11, color: t.textMuted, padding: 8, textAlign: "center" }}>
          Not enough shifts scheduled this week to rank a dream team.
        </div>
      ) : (
        team.map((p, i) => (
          <div key={p.employee_id} data-testid={`chef-dream-team-${i}`} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "6px 0", borderBottom: `1px dashed ${t.border}`,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: `${t.accent}22`, color: t.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, fontFamily: "monospace",
            }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: t.textPrimary, fontWeight: 600,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.employee_name}</div>
              <div style={{ fontSize: 9, color: t.textMuted,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.positions.slice(0, 3).join(" · ") || "—"}
              </div>
            </div>
            <div style={{ fontSize: 10, color: t.textSecondary, fontFamily: "monospace" }}>
              {p.shifts}sh · T{p.tier}
            </div>
          </div>
        ))
      )}
    </Section>
  );
}

function Stat({ t, label, value, tone }: {
  t: ReturnType<typeof useThemeTokens>;
  label: string; value: string; tone?: "ok" | "warn";
}) {
  const color = tone === "warn" ? "#f59e0b" : tone === "ok" ? "#22c55e" : t.textPrimary;
  return (
    <div style={{
      background: t.panelBg, border: `1px solid ${t.border}`,
      borderRadius: 4, padding: "6px 8px",
    }}>
      <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.1em",
        textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}
