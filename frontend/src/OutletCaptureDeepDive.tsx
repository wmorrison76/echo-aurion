import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { get, fmtUsd, fmtPct, fmtNum, sourceTag } from "./api";

type AnyObj = Record<string, any>;

export default function OutletCaptureDeepDive() {
  const { propertyId = "pier-sixty-six-demo", outletId = "p66demo-galley" } = useParams();
  const [dash, setDash] = useState<AnyObj | null>(null);
  const [retro, setRetro] = useState<AnyObj | null>(null);
  const [accuracy, setAccuracy] = useState<AnyObj | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    Promise.all([
      get(`/api/outlet-capture/dashboard/${outletId}`).catch((e) => ({ __err: e })),
      get(`/api/outlet-capture/retrospective/${outletId}`).catch((e) => ({ __err: e })),
      get(`/api/outlet-capture/accuracy/${outletId}`).catch((e) => ({ __err: e })),
    ]).then(([d, r, a]: any[]) => {
      if (cancelled) return;
      if (d?.__err) setErr(String(d.__err.message || d.__err));
      else setDash(d);
      if (!r?.__err) setRetro(r);
      if (!a?.__err) setAccuracy(a);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [outletId]);

  if (loading) {
    return (
      <div className="boot">
        <div className="boot-mark">·</div>
      </div>
    );
  }
  if (err || !dash) {
    return (
      <div className="app-shell">
        <div className="drilldown">
          <Link to={`/dashboard/live/${propertyId}`} className="crumb">
            <i className="fa-solid fa-arrow-left" /> back to live
          </Link>
          <div className="err-card">{err || "outlet not found"}</div>
        </div>
      </div>
    );
  }

  const outlet = dash.outlet || {};
  const today = dash.today || {};
  const forecasts: AnyObj[] = dash.forecast || [];
  const recentHistory: AnyObj[] = dash.recent_history || [];
  const accByH = dash.accuracy || {};
  const isCold = !!dash.is_cold_start;

  // History sparkline data (most recent 14 days, sorted ascending)
  const histChart = [...recentHistory]
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .slice(-14)
    .map((h) => ({
      date: h.date,
      label: (h.date || "").slice(5),
      eligible: Math.round((h.eligible_capture || 0) * 1000) / 10,
      available: Math.round((h.available_capture || 0) * 1000) / 10,
      covers: h.covers || 0,
    }));

  // Forecast horizon chart (covers p10/p50/p90)
  const fcChart = forecasts.map((f) => ({
    label: `+${f.horizon_days}d`,
    date: f.for_date,
    p10: f.p10,
    p50: f.p50,
    p90: f.p90,
    rec: f.production_recommendation,
  }));

  const dataSrc = forecasts[0]?.model || "monte_carlo_v1";
  const tag = sourceTag(dataSrc);
  const horizonsKnown = Object.keys(accByH).filter((k) => accByH[k] != null);

  return (
    <div className="app-shell">
      <div className="app-banner">
        <div className="brand">
          <Link to={`/dashboard/live/${propertyId}`} className="crumb" style={{ marginBottom: 0 }}>
            <i className="fa-solid fa-arrow-left" />
          </Link>
          <span className="brand-mark">{outlet.name || outletId}</span>
          <span className="brand-sub">
            {outlet.outlet_type} · {outlet.capacity?.seats || "—"} seats ·{" "}
            {outlet.capacity?.max_daily_covers || "—"} max covers/day
          </span>
        </div>
        <div className="banner-meta">
          <span>
            <span className={`status-dot ${isCold ? "warn" : "ok"}`} />
            {isCold ? "cold start" : "warm"}
          </span>
          <span>
            weights · <strong>v{dash.weights_version || 1}</strong>
          </span>
          <span>model · <strong>{dataSrc}</strong></span>
        </div>
      </div>

      <div className="drilldown">
        {/* KPIs */}
        <div className="section-title">Today · {today.date}</div>
        <div className="section-sub">
          {today.covers || 0} covers ·{" "}
          {fmtUsd(today.revenue_cents || 0, { compact: true })} revenue ·{" "}
          {today.unique_guests || 0} unique guests
        </div>
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="kpi-label">Total Capture</div>
            <div className="kpi-value">{fmtPct(today.total_capture || 0)}</div>
            <div className="kpi-meta">covers ÷ property guests</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Eligible Capture</div>
            <div className="kpi-value">{fmtPct(today.eligible_capture || 0)}</div>
            <div className="kpi-meta">{today.eligible_guests || 0} eligible guests</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Available Capture</div>
            <div className="kpi-value">{fmtPct(today.available_capture || 0)}</div>
            <div className="kpi-meta">covers ÷ max capacity ({today.max_capacity || 0})</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Revenue</div>
            <div className="kpi-value">{fmtUsd(today.revenue_cents || 0, { compact: true })}</div>
            <div className="kpi-meta">{today.events || 0} events today</div>
          </div>
        </div>

        {/* Doctrine callout */}
        {dash.doctrine_posture && (
          <div className="callout">
            {dash.doctrine_posture}
          </div>
        )}

        {/* Two-column section: forecast + retro/accuracy */}
        <div className="split">
          {/* Forecast */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Multi-Horizon Forecast</div>
              <span className="src-tag">
                <span className={`dot ${tag.cls}`} /> {tag.label}
              </span>
            </div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fcChart} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(200,169,126,0.08)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#8a8478", fontSize: 11 }}
                    axisLine={{ stroke: "rgba(200,169,126,0.18)" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#8a8478", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#161513",
                      border: "1px solid rgba(200,169,126,0.3)",
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 11,
                    }}
                    labelStyle={{ color: "#c8a97e" }}
                    itemStyle={{ color: "#f3ebd9" }}
                  />
                  <Legend
                    iconType="line"
                    wrapperStyle={{ fontSize: 11, color: "#8a8478", paddingTop: 6 }}
                  />
                  <Line type="monotone" dataKey="p90" stroke="#7fb084" strokeWidth={1.4} dot={false} name="P90" />
                  <Line type="monotone" dataKey="p50" stroke="#c8a97e" strokeWidth={2} dot={{ r: 3, fill: "#c8a97e" }} name="P50 (median)" />
                  <Line type="monotone" dataKey="p10" stroke="#c87065" strokeWidth={1.4} dot={false} name="P10" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <table className="table" style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Horizon</th>
                  <th>For Date</th>
                  <th>P10</th>
                  <th>P50</th>
                  <th>P90</th>
                  <th>Production Plan</th>
                </tr>
              </thead>
              <tbody>
                {forecasts.map((f) => (
                  <tr key={f.forecast_id}>
                    <td>+{f.horizon_days}d</td>
                    <td>{f.for_date}</td>
                    <td>{f.p10}</td>
                    <td style={{ color: "var(--gold)", fontWeight: 600 }}>{f.p50}</td>
                    <td>{f.p90}</td>
                    <td>{f.production_recommendation || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right column: signals + retro + accuracy */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Drivers from the next forecast */}
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Active Signals · +1d</div>
                <span className="eyebrow">drivers · weights</span>
              </div>
              {(forecasts[0]?.drivers || []).length === 0 && (
                <div style={{ fontSize: 12, color: "var(--dim)", fontStyle: "italic" }}>
                  no signal weights surfaced for this horizon
                </div>
              )}
              <div>
                {(forecasts[0]?.drivers || []).map((d: any, i: number) => (
                  <span key={i} className="signal-pill">
                    {d.signal} · <span className="w">{(d.weight * 100).toFixed(0)}%</span>{" "}
                    <span style={{ color: "var(--dim)" }}>({String(d.value)})</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Retrospective walkback (§2.4) */}
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Trial-Level Retrospective · §2.4</div>
                <span className="eyebrow">{retro?.count || 0} walkbacks · {retro?.window_days || 7}d</span>
              </div>
              {retro?.count > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Forecast</th>
                      <th>Actual</th>
                      <th>Tightest Trial</th>
                      <th>Adjustment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(retro.rows || []).slice(0, 8).map((r: any, i: number) => (
                      <tr key={i}>
                        <td>{r.date}</td>
                        <td>{r.forecast_p50}</td>
                        <td>{r.actual}</td>
                        <td style={{ color: "var(--gold)" }}>trial #{r.tightest_trial_index ?? "—"}</td>
                        <td style={{ color: "var(--dim)" }}>{r.weight_delta_summary || "logged"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="callout" style={{ fontSize: 14 }}>
                  No walkbacks yet — runs after the first actual close lands. The framework is patient. Each closed
                  service triggers the search for the trial whose factor mix knew the answer, and the per-signal
                  weights nudge by 5%.
                </div>
              )}
            </div>

            {/* Accuracy by horizon */}
            <div className="panel">
              <div className="panel-head">
                <div className="panel-title">Accuracy by Horizon</div>
                <span className="eyebrow">SMAPE bands</span>
              </div>
              {horizonsKnown.length === 0 ? (
                <div className="src-tag" style={{ marginTop: 6 }}>
                  <span className="dot fallback" /> §1.1 — accuracy bands publish after first cycle of actuals
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Horizon</th>
                      <th>Accuracy</th>
                      <th>Band</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(accByH).map(([h, v]: [string, any]) => (
                      <tr key={h}>
                        <td>{h.replace("horizon_", "+").replace("d", "d")}</td>
                        <td>
                          {v?.smape != null ? `${(v.smape * 100).toFixed(1)}%` : "—"}
                        </td>
                        <td style={{ color: "var(--dim)" }}>
                          {v?.band || "n/a"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Recent history (full width below) */}
        <div className="panel" style={{ marginTop: 24 }}>
          <div className="panel-head">
            <div className="panel-title">Recent Capture · 14 Days</div>
            <span className="eyebrow">eligible · available</span>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histChart} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="rgba(200,169,126,0.08)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#8a8478", fontSize: 10 }}
                  axisLine={{ stroke: "rgba(200,169,126,0.18)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#8a8478", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                  width={36}
                />
                <Tooltip
                  contentStyle={{
                    background: "#161513",
                    border: "1px solid rgba(200,169,126,0.3)",
                    fontFamily: "JetBrains Mono, monospace",
                    fontSize: 11,
                  }}
                  labelStyle={{ color: "#c8a97e" }}
                  itemStyle={{ color: "#f3ebd9" }}
                  formatter={(v: any) => [`${v}%`, ""]}
                />
                <Legend
                  iconType="square"
                  wrapperStyle={{ fontSize: 11, color: "#8a8478", paddingTop: 4 }}
                />
                <Bar dataKey="eligible" fill="#c8a97e" name="Eligible %" />
                <Bar dataKey="available" fill="#8a7350" name="Available %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="src-tag" style={{ marginTop: 12 }}>
            <span className="dot live" /> source · outlet_capture_v1 · {recentHistory.length} days in window
          </div>
        </div>

        {/* Doctrine footer */}
        <div
          style={{
            marginTop: 32,
            padding: "20px 0",
            borderTop: "1px solid var(--line-soft)",
            fontSize: 11,
            color: "var(--dim2)",
            fontFamily: "JetBrains Mono, monospace",
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <span>§3.1 · every weight change persists immutably to {fmtNum(forecasts.length)} forecast records</span>
          <span>generated · {dash.generated_at}</span>
        </div>
      </div>
    </div>
  );
}
