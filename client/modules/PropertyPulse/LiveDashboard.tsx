import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import {
  Gauge,
  Coins,
  AlertTriangle,
  TrendingUp,
  ListChecks,
  LayoutGrid,
} from "lucide-react";
import { get, fmtUsd, fmtPct, sourceTag, type PulseView } from "./api";
import GuidedTour from "./GuidedTour";

type AnyObj = Record<string, any>;

interface DashboardState {
  pace: AnyObj | null;
  cash: AnyObj | null;
  forecast21: AnyObj | null;
  lifecycle: AnyObj | null;
  ratios: AnyObj | null;
  exceptions: AnyObj | null;
  version: AnyObj | null;
  galleyDash: AnyObj | null;
  errors: Record<string, string>;
  loading: boolean;
}

export interface LiveDashboardProps {
  propertyId: string;
  onNavigate: (view: PulseView) => void;
}

export default function LiveDashboard({ propertyId, onNavigate }: LiveDashboardProps) {
  const [state, setState] = useState<DashboardState>({
    pace: null,
    cash: null,
    forecast21: null,
    lifecycle: null,
    ratios: null,
    exceptions: null,
    version: null,
    galleyDash: null,
    errors: {},
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    const safe = (key: string, p: Promise<any>) =>
      p.catch((e) => ({ __err: String(e?.message || e), __key: key }));

    Promise.all([
      safe("pace", get(`/api/pace/property/${propertyId}`)),
      safe("cash", get(`/api/cash-runway/${propertyId}`)),
      safe("forecast21", get(`/api/forecast-21/forecast?property_id=${propertyId}`)),
      safe("lifecycle", get(`/api/lifecycles/digest/${propertyId}`)),
      safe("ratios", get(`/api/outlet-capture/ratios/property/${propertyId}`)),
      safe("exceptions", get(`/api/exception-review/${propertyId}`)),
      safe("version", get(`/api/upgrade/version`)),
      safe("galleyDash", get(`/api/outlet-capture/dashboard/p66demo-galley`)),
    ]).then((vals) => {
      if (cancelled) return;
      const errs: Record<string, string> = {};
      const out: any = {};
      const keys = ["pace", "cash", "forecast21", "lifecycle", "ratios", "exceptions", "version", "galleyDash"];
      vals.forEach((v: any, i: number) => {
        if (v && v.__err) errs[keys[i]] = v.__err;
        else out[keys[i]] = v;
      });
      setState((s) => ({ ...s, ...out, errors: errs, loading: false }));
    });

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  const { pace, cash, forecast21, lifecycle, ratios, exceptions, version, galleyDash } = state;

  const sparkData = useMemo(() => {
    const fc = forecast21?.forecast || [];
    return fc.map((d: any) => ({
      date: d.date,
      label: d.day_of_week?.slice(0, 3),
      rev: (d.revenue?.total || 0) / 1000,
    }));
  }, [forecast21]);

  const outlets = ratios?.outlets || [];
  const propertyEligible = useMemo(() => {
    if (!outlets.length) return null;
    const sum = outlets.reduce((a: number, o: any) => a + (o.eligible_capture || 0), 0);
    return sum / outlets.length;
  }, [outlets]);
  const totalHeadroomCents = useMemo(
    () => outlets.reduce((a: number, o: any) => a + (o.headroom_cents || 0), 0),
    [outlets]
  );

  if (state.loading) {
    return (
      <div className="boot">
        <div className="boot-mark">LUCCCA</div>
      </div>
    );
  }

  const doctrinePosture =
    galleyDash?.doctrine_posture ||
    "Even on a hit, the walkback continues — which trial was tightest, and what did it know?";
  const versionStr = version?.version ? `v${version.version}` : "v—";
  const dataSourceLabel = forecast21?.data_source || "outlet_capture_v1";
  const tag = sourceTag(dataSourceLabel);

  const lcSummary = lifecycle?.summary || {};
  const lcUpcoming = lifecycle?.upcoming_3_days || [];
  const lcOverdue = lifecycle?.overdue || [];
  const lcDueToday = lifecycle?.due_today || [];

  const paceMtd = (pace?.mtd?.revenue_cents || 0) / 100;
  const paceP50 = (pace?.projection?.p50_finish_cents || 0) / 100;
  const paceVsBudget = pace?.budget?.actual_vs_pace_pct ?? null;
  const paceAhead = pace?.budget?.ahead_or_behind_cents ?? 0;

  const cashOk = cash?.available;
  const runwayMonths = cash?.runway_months?.worst_quartile_burn ?? cash?.runway_months?.median_burn ?? null;
  const availableCash = cash?.current_cash?.available_cents ?? 0;
  const burn7d = cash?.daily_burn_cents?.trailing_7d_avg ?? 0;
  const burn30d = cash?.daily_burn_cents?.trailing_30d_avg ?? 0;
  const burnAccel = cash?.daily_burn_cents?.acceleration_pct ?? 0;

  const excSummary = exceptions?.summary || { red: 0, amber: 0, total: 0 };
  const excList = exceptions?.exceptions || [];

  return (
    <div className="app-shell">
      {/* In-panel sub-header (LUCCCA shell already provides global chrome) */}
      <div className="sub-header">
        <div className="brand">
          <span className="brand-mark">Property Pulse</span>
          <span className="brand-sub">Pier Sixty-Six · Live Dashboard</span>
        </div>
        <div className="banner-meta">
          <span>
            <span className="status-dot ok" /> live
          </span>
          <span>
            schema · <strong>{version?.required_schema_version || "—"}</strong>
          </span>
          <span>
            release · <strong>{versionStr}</strong>
          </span>
        </div>
      </div>

      <div className="hero">
        <div className="rise">
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            §2.4 · The Doctrine of the Walkback
          </div>
          <div className="hero-title">
            Even on a hit, the <em>walkback continues</em> — which trial was tightest, and what did it know?
          </div>
          <div className="hero-sub">
            The model is not permitted to be occasionally correct. Eight outlets, 540 capture events, two in-flight
            lifecycle runs — surfaced live, with data-source labels on every panel. The pursuit is the discipline.
          </div>
        </div>
        <div className="gauge-wrap rise rise-2">
          <div className="gauge">
            <div>
              <div className="gauge-label">Property capture</div>
              <div className="gauge-value">
                {propertyEligible != null ? fmtPct(propertyEligible) : "—"}
              </div>
            </div>
            <div style={{ borderLeft: "1px solid var(--line)", paddingLeft: 16 }}>
              <div className="gauge-label">Headroom</div>
              <div className="gauge-value">{fmtUsd(totalHeadroomCents, { compact: true })}</div>
            </div>
          </div>
          <div className="disclosure">
            <span className="src-tag">
              <span className={`dot ${tag.cls}`} /> source · {tag.label}
            </span>
            <span className="src-tag">
              <span className="dot live" /> {outlets.length} outlets · live
            </span>
          </div>
        </div>
      </div>

      <div className="grid">
        <button
          type="button"
          onClick={() => onNavigate({ kind: "coming-soon", module: "pace" })}
          className="tile tile-span-4 rise rise-1"
          data-testid="tile-pace"
        >
          <div className="tile-head">
            <div className="tile-eyebrow">Pace · Month-to-Date</div>
            <div className="tile-icon">
              <Gauge size={16} />
            </div>
          </div>
          {pace ? (
            <>
              <div className="tile-headline">{fmtUsd(paceMtd * 100, { compact: true })}</div>
              <div className="tile-subline">
                {pace?.mtd?.days_with_data || 0} of {pace?.total_days || 0} days · projection P50{" "}
                {fmtUsd(paceP50 * 100, { compact: true })}
              </div>
              <div className="tile-spacer" />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <span className={`delta ${paceVsBudget && paceVsBudget > 1 ? "pos" : "neg"}`}>
                  {paceVsBudget != null ? `${(paceVsBudget * 100).toFixed(1)}% of budget` : "—"}
                </span>
                <span className={`delta ${paceAhead > 0 ? "pos" : "neg"}`}>
                  {paceAhead > 0 ? "↑" : "↓"} {fmtUsd(Math.abs(paceAhead), { compact: true })}
                </span>
              </div>
            </>
          ) : (
            <div className="err-card">{state.errors.pace || "no data"}</div>
          )}
          <div className="tile-foot">
            <span>{pace?.month_start} → {pace?.month_end}</span>
            <span className="arrow">→</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate({ kind: "coming-soon", module: "cash-runway" })}
          className="tile tile-span-4 rise rise-2"
          data-testid="tile-cash-runway"
        >
          <div className="tile-head">
            <div className="tile-eyebrow">Cash Runway</div>
            <div className="tile-icon">
              <Coins size={16} />
            </div>
          </div>
          {cashOk ? (
            <>
              <div className="tile-headline">
                {runwayMonths != null ? `${runwayMonths.toFixed(2)} mo` : "—"}
              </div>
              <div className="tile-subline">
                {fmtUsd(availableCash, { compact: true })} unrestricted · P75 worst-quartile burn
              </div>
              <div className="tile-spacer" />
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <span className="delta neu">7d {fmtUsd(burn7d, { compact: true })}/d</span>
                <span className="delta neu">30d {fmtUsd(burn30d, { compact: true })}/d</span>
                <span className={`delta ${burnAccel > 0 ? "neg" : "pos"}`}>
                  accel {(burnAccel * 100).toFixed(2)}%
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="tile-headline" style={{ color: "var(--amber)" }}>
                no data
              </div>
              <div className="tile-subline" style={{ marginTop: 8 }}>
                {cash?.reason?.replace(/_/g, " ") || state.errors.cash || "awaiting cash close"}
              </div>
              <div className="tile-spacer" />
              <div className="src-tag" style={{ marginTop: 8 }}>
                <span className="dot fallback" /> §1.1 — missing-data state surfaced first-class
              </div>
            </>
          )}
          <div className="tile-foot">
            <span>property · {propertyId}</span>
            <span className="arrow">→</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate({ kind: "coming-soon", module: "exceptions" })}
          className="tile tile-span-4 rise rise-3"
          data-testid="tile-exceptions"
        >
          <div className="tile-head">
            <div className="tile-eyebrow">Exception Review</div>
            <div className="tile-icon">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="tile-headline">
            {excSummary.total === 0 ? (
              <span style={{ color: "var(--green)" }}>clear</span>
            ) : (
              excSummary.total
            )}
          </div>
          <div className="tile-subline">
            {excSummary.red} red · {excSummary.amber} amber · day {exceptions?.date || "—"}
          </div>
          <div className="tile-spacer" />
          <div style={{ marginTop: 12 }}>
            {excList.slice(0, 2).map((e: any, i: number) => (
              <div key={i} className="lc-row">
                <span className={`lc-dot ${e.severity === "red" ? "overdue" : "due"}`} />
                <span className="lc-title">{e.title || e.summary || "exception"}</span>
              </div>
            ))}
            {excList.length === 0 && (
              <div style={{ fontSize: 12, color: "var(--dim)", fontStyle: "italic" }}>
                {exceptions?.narrative || "no anomalies flagged today"}
              </div>
            )}
          </div>
          <div className="tile-foot">
            <span>auto-cleared at {exceptions?.generated_at?.slice(11, 16) || "—"}</span>
            <span className="arrow">→</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate({ kind: "coming-soon", module: "forecast-21" })}
          className="tile tile-span-8 rise rise-4"
          data-testid="tile-forecast-21"
        >
          <div className="tile-head">
            <div className="tile-eyebrow">21-Day Living Forecast · Total Revenue</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="src-tag">
                <span className={`dot ${tag.cls}`} /> {tag.label}
              </span>
              <div className="tile-icon">
                <TrendingUp size={16} />
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap" }}>
            <div className="tile-headline">
              {fmtUsd((forecast21?.summary?.total_revenue || 0) * 100, { compact: true })}
            </div>
            <div className="tile-subline">
              over {forecast21?.period?.days || 21} days ·{" "}
              {(forecast21?.summary?.avg_occupancy ?? 0).toFixed(1)}% avg occ
            </div>
          </div>
          <div className="spark" style={{ height: 110 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkData} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pp-goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#c8a97e" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#c8a97e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#8a8478", fontSize: 10 }}
                  axisLine={{ stroke: "rgba(200,169,126,0.18)" }}
                  tickLine={false}
                  interval={2}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "#161513",
                    border: "1px solid rgba(200,169,126,0.3)",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "#c8a97e" }}
                  itemStyle={{ color: "#f3ebd9" }}
                  formatter={(v: any) => [`$${(v as number).toFixed(0)}k`, "revenue"]}
                />
                <Area
                  type="monotone"
                  dataKey="rev"
                  stroke="#c8a97e"
                  strokeWidth={1.6}
                  fill="url(#pp-goldGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="tile-foot">
            <span>
              {forecast21?.period?.start} → {forecast21?.period?.end} ·{" "}
              {forecast21?.summary?.peak_days?.length || 0} peak / {forecast21?.summary?.low_days?.length || 0} low days
            </span>
            <span className="arrow">→</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate({ kind: "period-close" })}
          className="tile tile-span-4 rise rise-5"
          data-testid="tile-lifecycle"
        >
          <div className="tile-head">
            <div className="tile-eyebrow">Lifecycle · Today's Standup</div>
            <div className="tile-icon">
              <ListChecks size={16} />
            </div>
          </div>
          <div className="tile-headline">
            {lcSummary.active_runs || 0}
            <span style={{ fontSize: 14, color: "var(--dim)", marginLeft: 8, fontFamily: "Inter" }}>
              active runs
            </span>
          </div>
          <div className="tile-subline">
            {lcOverdue.length} overdue · {lcDueToday.length} due today · {lcUpcoming.length} upcoming
          </div>
          <div className="tile-spacer" />
          <div className="lc-list">
            {[...lcOverdue.slice(0, 1), ...lcDueToday.slice(0, 1), ...lcUpcoming.slice(0, 3)]
              .slice(0, 4)
              .map((s: any, i: number) => (
                <div key={i} className="lc-row">
                  <span
                    className={`lc-dot ${
                      lcOverdue.includes(s)
                        ? "overdue"
                        : lcDueToday.includes(s)
                        ? "due"
                        : "upcoming"
                    }`}
                  />
                  <span className="lc-title">{s.title || s.run_title}</span>
                  <span className="lc-meta">
                    {s.days_until_due != null ? `${s.days_until_due}d` : ""}
                  </span>
                </div>
              ))}
            {!lcOverdue.length && !lcDueToday.length && !lcUpcoming.length && (
              <div style={{ fontSize: 12, color: "var(--dim)", fontStyle: "italic" }}>
                no scheduled steps in the next 3 days
              </div>
            )}
          </div>
          <div className="tile-foot">
            <span>just-completed · {lcSummary.just_completed_count || 0}</span>
            <span className="arrow">→</span>
          </div>
        </button>

        <div className="tile tile-span-12 rise rise-6" style={{ cursor: "default" }} data-testid="tile-outlet-capture">
          <div className="tile-head">
            <div>
              <div className="tile-eyebrow">Outlet Capture · Eligible Ratio</div>
              <div style={{ fontSize: 12, color: "var(--dim)", marginTop: 4 }}>
                {ratios?.date} · click any outlet for the trial-level walkback
              </div>
            </div>
            <div className="tile-icon">
              <LayoutGrid size={16} />
            </div>
          </div>
          <div className="outlet-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {outlets.map((o: any) => {
              const ratio = o.eligible_capture || 0;
              const headroom = o.headroom_cents || 0;
              const rawName = o.outlet_id?.replace("p66demo-", "").replace(/-/g, " ");
              const name =
                rawName && rawName.length <= 3
                  ? rawName.toUpperCase()
                  : rawName
                      ?.split(" ")
                      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ");
              return (
                <button
                  key={o.outlet_id}
                  type="button"
                  onClick={() => onNavigate({ kind: "outlet", outletId: o.outlet_id })}
                  className="outlet-pill"
                  data-testid={`outlet-${o.outlet_id}`}
                >
                  <div className="name">{name || o.outlet_id}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, justifyContent: "space-between" }}>
                    <span className="ratio">{fmtPct(ratio)}</span>
                    <span style={{ fontSize: 10, color: "var(--dim)", fontFamily: "JetBrains Mono, monospace" }}>
                      +{fmtUsd(headroom, { compact: true })}
                    </span>
                  </div>
                  <div className="bar">
                    <span style={{ width: `${Math.min(100, ratio * 100)}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="tile-foot">
            <span>
              property avg · {propertyEligible != null ? fmtPct(propertyEligible) : "—"} · headroom{" "}
              {fmtUsd(totalHeadroomCents, { compact: true })}
            </span>
            <span style={{ fontSize: 11, color: "var(--gold)" }}>tap an outlet ↗</span>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "16px 28px 24px",
          borderTop: "1px solid var(--line-soft)",
          fontSize: 11,
          color: "var(--dim2)",
          fontFamily: "JetBrains Mono, monospace",
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        <span>doctrine · {doctrinePosture.slice(0, 80)}…</span>
        <span style={{ marginLeft: "auto" }}>property · {propertyId}</span>
      </div>

      <GuidedTour />
    </div>
  );
}
