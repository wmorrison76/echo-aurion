import React, { useEffect, useMemo, useState, useCallback, Suspense, lazy } from "react";
import { useThemeTokens } from "@/styles/design-tokens";
import {
  ChevronRight, CalendarClock, Activity, Users, AlertTriangle, Clock, RefreshCw,
  DollarSign, TrendingUp, Building2, Timer, Shirt, ArrowRight, ChevronLeft,
  Brain, Check, Loader2, ShieldAlert, Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

// iter266.5 · Lazy-load the heavy inner ScheduleApp so the panel shows a
// Chronos-themed loader instantly instead of blocking on the full router.
const ScheduleApp = lazy(() => import("./client/App"));

/**
 * iter263 · Schedule v2 — Oracle ERP re-skin wrapper.
 * - Themed outer chrome (dark/light follows global toggle).
 * - Live Oracle-style ribbon pulling /api/echo-schedule/shifts so users see
 *   real shift counts, tier mix, compliance flags BEFORE the inner app loads.
 * The inner ScheduleApp is left untouched.
 *
 * iter266.4 · Department auto-scoping per William: "Pastry will be only able
 * to see staff scheduled or have the profile as pastry department." We scope
 * the outer Live Strip to the logged-in user's department; inner ScheduleApp
 * still allows lookup of any employee to move them over.
 */

interface LiveStats {
  total_shifts: number;
  unique_employees: number;
  tier_mix: Record<string, number>;
  compliance_flags: number;
  last_seen_iso: string | null;
}

const EMPTY: LiveStats = {
  total_shifts: 0,
  unique_employees: 0,
  tier_mix: {},
  compliance_flags: 0,
  last_seen_iso: null,
};

function useLiveScheduleStats(departmentScope: string | null) {
  const [stats, setStats] = useState<LiveStats>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const qs = departmentScope ? `?department=${encodeURIComponent(departmentScope)}` : "";
        const r = await fetch(`${window.location.origin}/api/echo-schedule/shifts${qs}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const rows: any[] = j.rows || [];
        const employees = new Set(rows.map(s => s.employee_id));
        const tier_mix: Record<string, number> = {};
        let compliance_flags = 0;
        let last_seen: string | null = null;
        for (const s of rows) {
          const t = `T${s.employee_tier ?? "?"}`;
          tier_mix[t] = (tier_mix[t] || 0) + 1;
          compliance_flags += (s.compliance_flags || []).length;
          if (s.created_at && (!last_seen || s.created_at > last_seen)) last_seen = s.created_at;
        }
        if (alive) {
          setStats({
            total_shifts: rows.length,
            unique_employees: employees.size,
            tier_mix,
            compliance_flags,
            last_seen_iso: last_seen,
          });
        }
      } catch {
        if (alive) setStats(EMPTY);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [departmentScope]);

  return { stats, loading };
}

export default function ScheduleModule() {
  const t = useThemeTokens();
  const { user } = useAuth();
  // iter266.4 · Department-scoped: pastry/banquets/foh/spa/eng/etc. roles
  // see only their own department's shifts in the live strip.
  // Admin / Owner / Exec roles see everything (scope = null).
  const departmentScope = useMemo<string | null>(() => {
    const role = (user?.role || "").toLowerCase();
    const dept = user?.department || null;
    const NO_SCOPE_ROLES = new Set([
      "admin", "owner", "regional-director", "director", "exec-dir-finance",
      "fb-director", "gm", "general-manager", "controller",
    ]);
    if (NO_SCOPE_ROLES.has(role)) return null;
    return dept;
  }, [user?.role, user?.department]);
  const { stats, loading } = useLiveScheduleStats(departmentScope);
  // iter266.8 · Workforce Command Dashboard shows first; clicking an outlet
  // tile morphs to the inner SchedulerGrid app.
  const [showScheduler, setShowScheduler] = useState(false);
  return (
    <div
      data-testid="schedule-module-oracle-frame"
      className="flex flex-col h-full overflow-hidden bg-background text-foreground"
      style={{ background: t.panelBg, color: t.textPrimary }}
    >
      {/* Status ribbon (theme-aware) */}
      <div
        className="flex items-center justify-between px-5 py-2 border-b"
        style={{
          borderColor: t.border,
          background: "var(--aurion-panel-bg, #070a12)",
        }}
      >
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest" style={{ color: t.textMuted }}>
          <Activity className="w-3.5 h-3.5" style={{ color: t.healthy }} />
          <span style={{ color: t.healthy }}>{loading ? "SYNCING" : "LIVE"}</span>
          <ChevronRight className="w-3 h-3" />
          <span>HR · WORKFORCE</span>
          <ChevronRight className="w-3 h-3" />
          <span style={{ color: t.accent }}>Schedule v2</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: t.textMuted }}>
          <CalendarClock className="w-3 h-3" />
          <span>Weekly plan · compliance · ratings · acknowledgements</span>
        </div>
      </div>

      {/* Header (theme-aware) */}
      <div
        className="px-5 py-3 border-b"
        style={{
          borderColor: t.border,
          background: "var(--aurion-surface-elevated)",
        }}
      >
        <div className="text-[10px] font-mono uppercase tracking-[0.3em]" style={{ color: t.accent }}>
          Echo Aurion · Schedule v2
        </div>
        <div className="text-xl font-bold" style={{ color: t.textPrimary }}>
          Workforce Command
          {departmentScope ? (
            <span style={{ color: t.accent, fontSize: 11, fontWeight: 600, marginLeft: 12, letterSpacing: "0.1em" }}>
              · SCOPED TO {departmentScope.toUpperCase()}
            </span>
          ) : null}
        </div>
        {/* iter266.10 · Tip Audit lives here per William — out of the
            Financial sidebar group, inside the FOH Schedule module so
            "everything is together". */}
        <button
          data-testid="schedule-tip-audit-link"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("open-panel", { detail: { id: "tip-audit-panel" } }));
          }}
          style={{
            marginLeft: "auto",
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", background: "transparent",
            border: `1px solid ${t.border}`, color: t.textSecondary,
            borderRadius: 4, fontSize: 11, cursor: "pointer", fontFamily: "inherit",
            letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.color = t.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.color = t.textSecondary; }}
        >
          Tip Audit →
        </button>
      </div>

      {/* Live Oracle-style strip — wired to /api/echo-schedule/shifts */}
      <div
        data-testid="schedule-live-strip"
        className="flex items-center gap-4 px-5 py-2 border-b text-[11px] font-mono"
        style={{ borderColor: t.border, background: t.surface }}
      >
        <Stat icon={<Users size={12} />} label="EMPLOYEES" value={stats.unique_employees} t={t} />
        <Stat icon={<Clock size={12} />} label="SHIFTS" value={stats.total_shifts} t={t} />
        <Stat
          icon={<AlertTriangle size={12} />}
          label="COMPLIANCE FLAGS"
          value={stats.compliance_flags}
          tone={stats.compliance_flags > 0 ? "warn" : "ok"}
          t={t}
        />
        <div className="flex items-center gap-2 ml-auto" style={{ color: t.textMuted }}>
          <span>TIER MIX</span>
          {Object.entries(stats.tier_mix).map(([k, v]) => (
            <span key={k} style={{ color: t.accent }}>
              {k}:{v}
            </span>
          ))}
        </div>
      </div>

      {/* iter266.8 · Workforce Command Dashboard — the proper labor analytics
          surface (multi-outlet KPI grid). Click any tile to morph into the
          full SchedulerGrid via the inner ScheduleApp. */}
      <WorkforceCommandDashboard
        user={user}
        departmentScope={departmentScope}
        t={t}
        onOpenScheduler={() => setShowScheduler(true)}
        visible={!showScheduler}
      />

      {/* Nested schedule app — only mounts after user picks an outlet tile */}
      {showScheduler && (
        <div className="flex-1 overflow-hidden bg-background">
          <button
            data-testid="schedule-back-to-dashboard"
            onClick={() => setShowScheduler(false)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px", margin: "10px 16px 0",
              background: "transparent", border: `1px solid ${t.border}`,
              color: t.textSecondary, borderRadius: 4,
              fontSize: 11, cursor: "pointer",
            }}
          >
            <ChevronLeft size={12} /> Back to Workforce Command
          </button>
          <Suspense fallback={<ScheduleChronosLoader t={t} />}>
            <ScheduleApp />
          </Suspense>
        </div>
      )}
    </div>
  );
}

// ════════════════ Workforce Command Dashboard ════════════════
// iter266.8 · Per William: the proper Schedule dashboard.
//   - Multi-outlet KPI mini-tiles (one per outlet user is assigned to)
//   - Sales today, Labor scheduled vs actual, Coverage %, Approaching OT,
//     Next apron-on time, On-clock-now count, Compliance flags
//   - Click any tile → morphs to the detailed SchedulerGrid

type WorkforceTile = {
  outlet_id: string; outlet_name: string;
  sales_today: number; labor_scheduled: number; labor_actual: number;
  labor_pct_of_sales: number;
  coverage_pct: number;
  approaching_ot: number; on_clock_now: number;
  compliance_flags: number;
  next_apron_on: { time: string; employee: string } | null;
  shifts_this_week: number;
};
type WorkforceResp = {
  generated_at: string;
  tiles: WorkforceTile[];
  portfolio: {
    sales_today: number; labor_scheduled: number; labor_actual: number;
    labor_pct_of_sales: number; coverage_pct: number;
    approaching_ot: number; on_clock_now: number; compliance_flags: number;
  };
  scope: { outlet_ids: string[]; department: string | null; multi_outlet: boolean };
};

function WorkforceCommandDashboard({
  user, departmentScope, t, onOpenScheduler, visible,
}: {
  user: ReturnType<typeof useAuth>["user"];
  departmentScope: string | null;
  t: ReturnType<typeof useThemeTokens>;
  onOpenScheduler: () => void;
  visible: boolean;
}) {
  const [data, setData] = useState<WorkforceResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const userOutlets = useMemo(() => {
    const list = user?.outlet_ids || [];
    return list.filter(o => o && o !== "all");
  }, [user?.outlet_ids]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (userOutlets.length) params.set("outlets", userOutlets.join(","));
      if (departmentScope) params.set("department", departmentScope);
      const r = await fetch(`/api/echo-schedule/dashboard?${params}`);
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  }, [userOutlets.join(","), departmentScope]);
  useEffect(() => { load(); const id = setInterval(load, 60_000); return () => clearInterval(id); }, [load]);

  if (!visible) return null;

  return (
    <div data-testid="workforce-command-dashboard" style={{
      flex: 1, overflow: "hidden", display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) 320px",
      gap: 0,
      background: t.panelBg, color: t.textPrimary,
    }}>
      <div style={{ overflow: "auto", padding: "18px 24px 28px" }}>
      {/* Portfolio totals strip */}
      {data && (
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 12, marginBottom: 18,
        }} data-testid="workforce-portfolio-strip">
          <PortfolioMetric icon={<DollarSign size={13} />} label="Sales Today"
            value={`$${data.portfolio.sales_today.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} t={t} />
          <PortfolioMetric icon={<Users size={13} />} label="Labor Scheduled"
            value={`$${data.portfolio.labor_scheduled.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} t={t} />
          <PortfolioMetric icon={<Activity size={13} />} label="Labor Actual"
            value={`$${data.portfolio.labor_actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            sublabel={`${data.portfolio.labor_pct_of_sales}% of sales`} t={t} />
          <PortfolioMetric icon={<TrendingUp size={13} />} label="Coverage"
            value={`${data.portfolio.coverage_pct}%`}
            tone={data.portfolio.coverage_pct >= 95 ? "ok" : data.portfolio.coverage_pct >= 85 ? "warn" : "down"} t={t} />
          <PortfolioMetric icon={<Timer size={13} />} label="Approaching OT"
            value={String(data.portfolio.approaching_ot)}
            tone={data.portfolio.approaching_ot === 0 ? "ok" : data.portfolio.approaching_ot < 3 ? "warn" : "down"} t={t} />
          <PortfolioMetric icon={<AlertTriangle size={13} />} label="Compliance Flags"
            value={String(data.portfolio.compliance_flags)}
            tone={data.portfolio.compliance_flags === 0 ? "ok" : data.portfolio.compliance_flags < 3 ? "warn" : "down"} t={t} />
        </div>
      )}

      {/* Section header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: t.textPrimary }}>
          {data?.scope.multi_outlet ? "Outlets · Click to drill down" : "Outlet Detail"}
        </h2>
        <span style={{ fontSize: 10, color: t.textMuted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {departmentScope ? `Scoped to ${departmentScope}` : "Portfolio view"}
        </span>
        <button onClick={load} style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
          background: "transparent", border: `1px solid ${t.border}`,
          color: t.textSecondary, padding: "4px 10px", borderRadius: 4,
          fontSize: 11, cursor: "pointer",
        }}>
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {/* Mini-tile grid */}
      {loading && !data ? (
        <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontSize: 13 }}>
          Loading workforce metrics…
        </div>
      ) : !data || !data.tiles.length ? (
        <div style={{ padding: 40, textAlign: "center", color: t.textMuted, fontSize: 13 }}>
          No outlets assigned to this user yet.
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(${data.tiles.length === 1 ? "100%" : "320px"}, 1fr))`,
          gap: 14,
        }} data-testid="workforce-tiles-grid">
          {data.tiles.map(tile => (
            <OutletTile
              key={tile.outlet_id}
              tile={tile}
              t={t}
              selected={selectedTile === tile.outlet_id}
              onClick={() => {
                setSelectedTile(tile.outlet_id);
                // Soft morph: brief highlight, then open scheduler
                setTimeout(onOpenScheduler, 250);
              }}
            />
          ))}
        </div>
      )}

      {data && (
        <div style={{ marginTop: 18, fontSize: 10, color: t.textMuted, textAlign: "right" }}>
          Generated {new Date(data.generated_at).toLocaleTimeString()} · auto-refresh 60s
        </div>
      )}
      </div>

      {/* iter266.11 · Labor Brain Advisory Rail — right side */}
      <LaborBrainRail
        userOutletsCsv={userOutlets.join(",")}
        departmentScope={departmentScope}
        t={t}
      />
    </div>
  );
}

function PortfolioMetric({ icon, label, value, sublabel, tone, t }: {
  icon: React.ReactNode; label: string; value: string; sublabel?: string;
  tone?: "ok" | "warn" | "down";
  t: ReturnType<typeof useThemeTokens>;
}) {
  const toneColor = tone === "down" ? "#ef4444" : tone === "warn" ? "#f59e0b" : tone === "ok" ? "#22c55e" : t.accent;
  return (
    <div style={{
      background: t.surface, border: `1px solid ${t.border}`,
      borderTop: `2px solid ${toneColor}`, borderRadius: 4,
      padding: "10px 12px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10,
        color: t.textMuted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        <span style={{ color: toneColor }}>{icon}</span>{label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: toneColor, lineHeight: 1.1, fontFamily: "monospace" }}>
        {value}
      </div>
      {sublabel && <div style={{ fontSize: 10, color: t.textMuted }}>{sublabel}</div>}
    </div>
  );
}

function OutletTile({ tile, t, selected, onClick }: {
  tile: WorkforceTile;
  t: ReturnType<typeof useThemeTokens>;
  selected: boolean;
  onClick: () => void;
}) {
  const coverageColor = tile.coverage_pct >= 95 ? "#22c55e" : tile.coverage_pct >= 85 ? "#f59e0b" : "#ef4444";
  const otColor = tile.approaching_ot === 0 ? t.textSecondary : tile.approaching_ot < 3 ? "#f59e0b" : "#ef4444";
  return (
    <button
      data-testid={`workforce-outlet-tile-${tile.outlet_id}`}
      onClick={onClick}
      style={{
        textAlign: "left", cursor: "pointer", fontFamily: "inherit",
        background: t.surface,
        border: `1px solid ${selected ? t.accent : t.border}`,
        borderRadius: 6, padding: "14px 16px",
        transition: "all 0.2s ease",
        transform: selected ? "scale(1.02)" : "scale(1)",
        boxShadow: selected ? `0 4px 20px ${t.accent}33` : "none",
        color: t.textPrimary,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = t.border; }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <Building2 size={14} style={{ color: t.accent }} />
            <span style={{ fontSize: 15, fontWeight: 700 }}>{tile.outlet_name}</span>
          </div>
          <div style={{ fontSize: 10, color: t.textMuted }}>{tile.outlet_id}</div>
        </div>
        <ArrowRight size={14} style={{ color: t.textMuted }} />
      </div>

      {/* Key metrics row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <Metric label="Sales today" value={`$${tile.sales_today.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} t={t} />
        <Metric label="Coverage" value={`${tile.coverage_pct}%`} color={coverageColor} t={t} />
        <Metric label="Labor sched" value={`$${tile.labor_scheduled.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} t={t} />
        <Metric label="Labor actual"
          value={`$${tile.labor_actual.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={tile.sales_today > 0 ? `${tile.labor_pct_of_sales}% of sales` : undefined} t={t} />
      </div>

      {/* Footer chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, fontSize: 10 }}>
        <Chip icon={<Timer size={10} />} label={`${tile.approaching_ot} approaching OT`} color={otColor} t={t} />
        <Chip icon={<Activity size={10} />} label={`${tile.on_clock_now} on clock now`} t={t} />
        {tile.next_apron_on && (
          <Chip icon={<Shirt size={10} />} label={`Apron-on ${tile.next_apron_on.time} · ${tile.next_apron_on.employee.split(" ")[0]}`} t={t} />
        )}
        {tile.compliance_flags > 0 && (
          <Chip icon={<AlertTriangle size={10} />} label={`${tile.compliance_flags} flags`} color="#f59e0b" t={t} />
        )}
      </div>
    </button>
  );
}

function Metric({ label, value, sub, color, t }: {
  label: string; value: string; sub?: string; color?: string;
  t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <div>
      <div style={{ fontSize: 9, color: t.textMuted, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || t.textPrimary, fontFamily: "monospace", lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 9, color: t.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Chip({ icon, label, color, t }: {
  icon: React.ReactNode; label: string; color?: string;
  t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 8px", borderRadius: 3,
      background: `${color || t.textMuted}15`,
      color: color || t.textSecondary,
      fontSize: 10,
    }}>{icon}{label}</span>
  );
}

// iter266.5 · Chronos-themed loading screen — matches the rest of the
// software (dark/light follows global theme; grid backdrop + spinner +
// breadcrumb message) instead of the generic React fallback.
function ScheduleChronosLoader({ t }: { t: ReturnType<typeof useThemeTokens> }) {
  return (
    <div
      data-testid="schedule-chronos-loader"
      className="grid-backdrop"
      style={{
        width: "100%", height: "100%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 18,
        background: t.panelBg, color: t.textPrimary,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, maxWidth: 360, textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          border: `2px solid ${t.border}`,
          borderTopColor: t.accent,
          animation: "schedule-spin 0.9s linear infinite",
        }} />
        <div style={{ fontSize: 11, color: t.accent, letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
          Echo AURION · Schedule v2
        </div>
        <div style={{ fontSize: 16, color: t.textPrimary, fontWeight: 600 }}>
          Loading Workforce Command…
        </div>
        <div style={{ fontSize: 12, color: t.textMuted }}>
          Bringing your tenancy context, employee roster, and live shifts online.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: t.textMuted, fontFamily: "monospace", marginTop: 4 }}>
          <RefreshCw size={11} style={{ animation: "schedule-spin 1.2s linear infinite" }} />
          <span>Connecting to /api/echo-schedule</span>
        </div>
      </div>
      <style>{`
        @keyframes schedule-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function Stat({ icon, label, value, tone, t }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "ok" | "warn";
  t: ReturnType<typeof useThemeTokens>;
}) {
  const color = tone === "warn" ? t.watch : t.accent;
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ color: t.textMuted }}>{icon}</span>
      <span style={{ color: t.textMuted }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}


// ════════════════ Labor Brain Advisory Rail ════════════════
// iter266.11 · Echo AURION reads the KPI tiles every 60s and surfaces 3-5
// ranked recommendations. 1-tap accept fires POST /labor-brain/accept
// which writes a real PAF row in borrow_pafs (auditable, routed to HR).

type LaborBrainRec = {
  id: string;
  outlet_id: string;
  outlet_name: string;
  severity: "urgent" | "warn" | "optimize" | "info";
  title: string;
  rationale: string;
  action_type: string;
  action_label: string;
  confidence: number;
  payload: Record<string, unknown>;
};

type LaborBrainResp = {
  generated_at: string;
  recommendations: LaborBrainRec[];
  totals: { all_recs: number; urgent: number; warn: number; optimize: number };
};

function severityTone(sev: LaborBrainRec["severity"]) {
  if (sev === "urgent") return { dot: "#ef4444", bar: "#ef4444" };
  if (sev === "warn") return { dot: "#f59e0b", bar: "#f59e0b" };
  if (sev === "optimize") return { dot: "#38bdf8", bar: "#38bdf8" };
  return { dot: "#22c55e", bar: "#22c55e" };
}

function severityIcon(sev: LaborBrainRec["severity"]) {
  if (sev === "urgent") return <ShieldAlert size={12} />;
  if (sev === "warn") return <AlertTriangle size={12} />;
  if (sev === "optimize") return <Sparkles size={12} />;
  return <Brain size={12} />;
}

function LaborBrainRail({
  userOutletsCsv, departmentScope, t,
}: {
  userOutletsCsv: string;
  departmentScope: string | null;
  t: ReturnType<typeof useThemeTokens>;
}) {
  const [data, setData] = useState<LaborBrainResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [accepted, setAccepted] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (userOutletsCsv) params.set("outlets", userOutletsCsv);
      if (departmentScope) params.set("department", departmentScope);
      const r = await fetch(`/api/echo-schedule/labor-brain?${params}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j);
      setError(null);
    } catch (e) {
      setError((e as Error).message || "Echo AURION offline");
    } finally {
      setLoading(false);
    }
  }, [userOutletsCsv, departmentScope]);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  const acceptRec = useCallback(async (rec: LaborBrainRec) => {
    setAccepting(rec.id);
    try {
      const r = await fetch(`/api/echo-schedule/labor-brain/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rec_id: rec.id,
          outlet_id: rec.outlet_id,
          action_type: rec.action_type,
          rationale: rec.rationale,
          payload: rec.payload,
          accepted_by: "workforce-command-operator",
        }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setAccepted(prev => ({ ...prev, [rec.id]: j?.paf?.id || "queued" }));
    } catch (e) {
      setError(`Accept failed: ${(e as Error).message}`);
    } finally {
      setAccepting(null);
    }
  }, []);

  const recs = data?.recommendations || [];

  return (
    <aside
      data-testid="labor-brain-rail"
      style={{
        borderLeft: `1px solid ${t.border}`,
        background: "var(--aurion-surface-elevated)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        color: t.textPrimary,
      }}
    >
      <div style={{
        padding: "16px 18px 12px", borderBottom: `1px solid ${t.border}`,
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase",
          color: t.accent, fontWeight: 700,
        }}>
          <Brain size={13} /> Labor Brain · Echo AURION
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, marginTop: 4 }}>
          Ranked recommendations
        </div>
        <div style={{ fontSize: 10, color: t.textMuted, marginTop: 2 }}>
          Reads KPI tiles every 60s. 1-tap accept files an audited PAF.
        </div>
        {data && (
          <div style={{ display: "flex", gap: 8, marginTop: 8, fontSize: 10 }}>
            <Pill count={data.totals.urgent} color="#ef4444" label="urgent" t={t} />
            <Pill count={data.totals.warn} color="#f59e0b" label="warn" t={t} />
            <Pill count={data.totals.optimize} color="#38bdf8" label="opt" t={t} />
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: "10px 14px 16px" }}>
        {loading && !data ? (
          <div style={{ padding: 24, textAlign: "center", color: t.textMuted, fontSize: 11 }}>
            <Loader2 size={14} className="animate-spin" style={{ marginRight: 6, display: "inline" }} />
            Echo AURION scanning…
          </div>
        ) : error ? (
          <div data-testid="labor-brain-error" style={{
            padding: 12, color: "#ef4444",
            border: `1px solid #ef444433`, borderRadius: 4,
            fontSize: 11, background: "#ef444411",
          }}>
            {error}
          </div>
        ) : recs.length === 0 ? (
          <div data-testid="labor-brain-empty" style={{
            padding: 18, textAlign: "center", color: t.textMuted, fontSize: 11,
            border: `1px dashed ${t.border}`, borderRadius: 4,
          }}>
            <Check size={16} style={{ color: "#22c55e", margin: "0 auto 6px", display: "block" }} />
            All clear. No action items detected this cycle.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recs.map(rec => {
              const tone = severityTone(rec.severity);
              const isAccepted = !!accepted[rec.id];
              const isBusy = accepting === rec.id;
              return (
                <div
                  key={rec.id}
                  data-testid={`labor-brain-rec-${rec.id}`}
                  style={{
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderLeft: `3px solid ${tone.bar}`,
                    borderRadius: 4,
                    padding: "10px 12px",
                    opacity: isAccepted ? 0.7 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ color: tone.dot }}>{severityIcon(rec.severity)}</span>
                    <span style={{
                      fontSize: 9, color: tone.dot, fontWeight: 700,
                      letterSpacing: "0.12em", textTransform: "uppercase",
                    }}>
                      {rec.severity}
                    </span>
                    <span style={{
                      marginLeft: "auto", fontSize: 9, color: t.textMuted,
                      fontFamily: "monospace",
                    }}>
                      {(rec.confidence * 100).toFixed(0)}% conf
                    </span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: t.textPrimary, marginBottom: 4 }}>
                    {rec.title}
                  </div>
                  <div style={{
                    fontSize: 11, color: t.textSecondary, marginBottom: 8,
                    lineHeight: 1.45,
                  }}>
                    {rec.rationale}
                  </div>
                  {isAccepted ? (
                    <div
                      data-testid={`labor-brain-accepted-${rec.id}`}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 10px",
                        background: "#22c55e15",
                        color: "#22c55e",
                        borderRadius: 3, fontSize: 10, fontWeight: 600,
                      }}
                    >
                      <Check size={12} /> PAF filed · {accepted[rec.id]}
                    </div>
                  ) : (
                    <button
                      data-testid={`labor-brain-accept-${rec.id}`}
                      onClick={() => acceptRec(rec)}
                      disabled={isBusy}
                      style={{
                        width: "100%",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "6px 10px",
                        background: tone.bar,
                        color: "#fff",
                        border: "none", borderRadius: 3,
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                        textTransform: "uppercase", cursor: isBusy ? "wait" : "pointer",
                        opacity: isBusy ? 0.6 : 1,
                        fontFamily: "inherit",
                      }}
                    >
                      {isBusy ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                      {isBusy ? "Filing PAF…" : rec.action_label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{
        padding: "8px 14px", borderTop: `1px solid ${t.border}`,
        display: "flex", alignItems: "center", gap: 8,
        fontSize: 10, color: t.textMuted,
      }}>
        <RefreshCw size={10} />
        <span>{data ? `Updated ${new Date(data.generated_at).toLocaleTimeString()}` : "—"}</span>
        <button
          data-testid="labor-brain-refresh"
          onClick={load}
          style={{
            marginLeft: "auto", background: "transparent",
            border: `1px solid ${t.border}`, color: t.textSecondary,
            padding: "3px 8px", borderRadius: 3, fontSize: 10,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          Re-scan
        </button>
      </div>
    </aside>
  );
}

function Pill({ count, color, label, t }: {
  count: number; color: string; label: string;
  t: ReturnType<typeof useThemeTokens>;
}) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 7px", borderRadius: 3,
      background: count > 0 ? `${color}22` : `${t.textMuted}15`,
      color: count > 0 ? color : t.textMuted,
      fontWeight: 700, fontFamily: "monospace",
      fontSize: 10, letterSpacing: "0.06em",
    }}>
      {count}<span style={{ fontWeight: 500, opacity: 0.8, marginLeft: 2 }}>{label}</span>
    </span>
  );
}
