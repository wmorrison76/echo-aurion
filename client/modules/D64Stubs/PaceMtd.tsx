/**
 * Pace · MTD — D64 deep-dive (PR #71 step C)
 *
 * Replaces the ComingSoon stub. Fetches GET /api/pace/property/{property_id}
 * and renders the property-level MTD pacing dashboard.
 *
 * Per-outlet breakdown intentionally deferred to v2 — would require an
 * outlet-list fetch + N parallel /api/pace/outlet/{id} calls and the panel
 * already covers the property-level signal which is the highest-frequency
 * morning-standup read.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import "./PaceMtd.css";

const DEMO_PROPERTY = "pier-sixty-six-demo";

interface PacePayload {
  property_id: string;
  year: number;
  month: number;
  month_start: string;
  month_end: string;
  total_days: number;
  elapsed_days: number;
  remaining_days: number;
  expected_pace_pct: number;
  mtd: { revenue_cents: number; covers: number; days_with_data: number };
  budget: {
    monthly_cents: number;
    configured: boolean;
    actual_vs_pace_pct: number;
    ahead_or_behind_cents: number;
  };
  projection: {
    p10_finish_cents: number;
    p50_finish_cents: number;
    p90_finish_cents: number;
    vs_budget_p50_cents: number;
    forecast_data_available: boolean;
  };
  narrative: string;
  generated_at: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmtUsd(cents: number): string {
  if (cents == null || Number.isNaN(cents)) return "—";
  const dollars = cents / 100;
  if (Math.abs(dollars) >= 1_000_000) return `$${(dollars / 1_000_000).toFixed(2)}M`;
  if (Math.abs(dollars) >= 1000) return `$${(dollars / 1000).toFixed(1)}k`;
  return `$${dollars.toFixed(0)}`;
}

function fmtUsdFull(cents: number): string {
  if (cents == null || Number.isNaN(cents)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function fmtPct(frac: number, digits = 1): string {
  if (frac == null || Number.isNaN(frac)) return "—";
  return `${(frac * 100).toFixed(digits)}%`;
}

function fmtSigned(cents: number): string {
  if (cents == null || Number.isNaN(cents)) return "—";
  const sign = cents > 0 ? "+" : cents < 0 ? "−" : "";
  return `${sign}${fmtUsd(Math.abs(cents))}`;
}

export default function PaceMtd() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getUTCFullYear());
  const [month, setMonth] = useState<number>(now.getUTCMonth() + 1);
  const [data, setData] = useState<PacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/pace/property/${DEMO_PROPERTY}?year=${y}&month=${m}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const payload = (await r.json()) as PacePayload;
      setData(payload);
    } catch (e: any) {
      setError(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(year, month); }, [year, month, load]);

  const aheadOrBehind = data?.budget.ahead_or_behind_cents ?? 0;
  const vsPace = data?.budget.actual_vs_pace_pct ?? 0;
  const isAhead = aheadOrBehind > 0;
  const projAvailable = data?.projection.forecast_data_available ?? false;
  const allZero = useMemo(() => {
    if (!data) return false;
    return (
      data.projection.p10_finish_cents === 0 &&
      data.projection.p50_finish_cents === 0 &&
      data.projection.p90_finish_cents === 0 &&
      data.mtd.revenue_cents === 0
    );
  }, [data]);

  // Compute the finish-band visualization geometry. P10..P90 spans the bar,
  // with MTD and budget rendered as overlay ticks scaled into the same range.
  const band = useMemo(() => {
    if (!data || !projAvailable) return null;
    const p10 = data.projection.p10_finish_cents;
    const p50 = data.projection.p50_finish_cents;
    const p90 = data.projection.p90_finish_cents;
    const mtd = data.mtd.revenue_cents;
    const budget = data.budget.monthly_cents;
    // Use a domain wide enough to contain all markers with a little margin.
    const candidates = [p10, p50, p90, mtd, budget].filter((v) => Number.isFinite(v) && v > 0);
    if (candidates.length === 0) return null;
    const min = Math.min(...candidates) * 0.92;
    const max = Math.max(...candidates) * 1.05;
    const span = Math.max(1, max - min);
    const pct = (v: number) => Math.max(0, Math.min(100, ((v - min) / span) * 100));
    return {
      p10, p50, p90, mtd, budget,
      p10Pct: pct(p10),
      p50Pct: pct(p50),
      p90Pct: pct(p90),
      mtdPct: pct(mtd),
      budgetPct: pct(budget),
      bandLeft: pct(p10),
      bandWidth: pct(p90) - pct(p10),
    };
  }, [data, projAvailable]);

  return (
    <div className="pace-root" data-testid="pace-mtd-root">
      <header className="pace-header">
        <div className="pace-header-left">
          <div className="pace-eyebrow">Office of the CFO · §2.5 Daily Pacing</div>
          <h1 className="pace-title">Pace · Month-to-Date</h1>
          <div className="pace-property">
            property · <code>{DEMO_PROPERTY}</code>
            {data && (
              <>
                {" · "}
                window · <code>{data.month_start} → {data.month_end}</code>
              </>
            )}
          </div>
        </div>
        <div className="pace-header-right">
          <label className="pace-input-label" htmlFor="pace-mtd-month">month</label>
          <select
            id="pace-mtd-month"
            data-testid="pace-mtd-month"
            className="pace-select"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <label className="pace-input-label" htmlFor="pace-mtd-year">year</label>
          <select
            id="pace-mtd-year"
            data-testid="pace-mtd-year"
            className="pace-select"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {[year - 2, year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            type="button"
            className="pace-refire"
            data-testid="pace-mtd-refresh"
            onClick={() => void load(year, month)}
          >
            ↻ refresh
          </button>
        </div>
      </header>

      {loading && <div className="pace-loading">querying pace report…</div>}
      {error && (
        <div className="pace-error" data-testid="pace-mtd-error">
          request failed · <code>{error}</code>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="pace-narrative" data-testid="pace-mtd-narrative">
            <span className="pace-quote-mark">"</span>
            {data.narrative}
          </div>

          {allZero ? (
            <div className="pace-empty" data-testid="pace-mtd-empty">
              <div className="pace-empty-title">No data for {MONTHS[month - 1]} {year}.</div>
              <div className="pace-empty-body">
                §1.1 — no covers logged and no forecast available for this window. The empty state
                surfaces as a first-class fact rather than a synthetic zero-baseline projection.
              </div>
            </div>
          ) : (
            <>
              <div className="pace-kpis">
                <div className="pace-kpi" data-testid="pace-mtd-revenue">
                  <div className="pace-kpi-label">MTD Revenue</div>
                  <div className="pace-kpi-value">{fmtUsdFull(data.mtd.revenue_cents)}</div>
                  <div className="pace-kpi-meta">
                    {data.mtd.covers.toLocaleString()} covers · {data.mtd.days_with_data} days logged
                  </div>
                </div>

                <div className="pace-kpi" data-testid="pace-mtd-elapsed">
                  <div className="pace-kpi-label">Days Elapsed</div>
                  <div className="pace-kpi-value">
                    {data.elapsed_days}
                    <span className="pace-kpi-of">/ {data.total_days}</span>
                  </div>
                  <div className="pace-kpi-meta">
                    {data.remaining_days} remaining · expected pace {fmtPct(data.expected_pace_pct)}
                  </div>
                </div>

                <div
                  className={`pace-kpi tone-${isAhead ? "up" : "down"}`}
                  data-testid="pace-mtd-vs-pace"
                >
                  <div className="pace-kpi-label">vs Pace</div>
                  <div className="pace-kpi-value">{fmtPct(vsPace)}</div>
                  <div className="pace-kpi-meta">
                    {isAhead ? "ahead" : "behind"} · {fmtSigned(aheadOrBehind)}
                  </div>
                </div>

                <div
                  className={`pace-kpi tone-${data.projection.vs_budget_p50_cents >= 0 ? "up" : "down"}`}
                  data-testid="pace-mtd-p50"
                >
                  <div className="pace-kpi-label">Projected P50 Finish</div>
                  <div className="pace-kpi-value">{fmtUsdFull(data.projection.p50_finish_cents)}</div>
                  <div className="pace-kpi-meta">
                    vs budget · {fmtSigned(data.projection.vs_budget_p50_cents)}
                  </div>
                </div>
              </div>

              {projAvailable && band ? (
                <section className="pace-band-card">
                  <header className="pace-band-head">
                    <div>
                      <div className="pace-band-title">Finish-line band · 80% projection range</div>
                      <div className="pace-band-sub">
                        P10 / P50 / P90 Monte Carlo finish · MTD and budget overlaid
                      </div>
                    </div>
                    <div className="pace-band-legend">
                      <span className="legend-dot legend-band" /> P10–P90
                      <span className="legend-dot legend-p50" /> P50
                      <span className="legend-dot legend-mtd" /> MTD
                      {data.budget.configured && (
                        <>
                          <span className="legend-dot legend-budget" /> budget
                        </>
                      )}
                    </div>
                  </header>

                  <div className="pace-band-track">
                    <div
                      className="pace-band-fill"
                      style={{ left: `${band.bandLeft}%`, width: `${band.bandWidth}%` }}
                    />
                    <div className="pace-band-marker p50" style={{ left: `${band.p50Pct}%` }}>
                      <span className="marker-label">P50</span>
                    </div>
                    <div className="pace-band-marker mtd" style={{ left: `${band.mtdPct}%` }}>
                      <span className="marker-label">MTD</span>
                    </div>
                    {data.budget.configured && (
                      <div className="pace-band-marker budget" style={{ left: `${band.budgetPct}%` }}>
                        <span className="marker-label">budget</span>
                      </div>
                    )}
                  </div>

                  <div className="pace-band-grid">
                    <div className="pace-cell" data-testid="pace-mtd-p10">
                      <div className="pace-cell-label">P10 · pessimistic</div>
                      <div className="pace-cell-value">{fmtUsdFull(data.projection.p10_finish_cents)}</div>
                    </div>
                    <div className="pace-cell highlight" data-testid="pace-mtd-p50-cell">
                      <div className="pace-cell-label">P50 · median</div>
                      <div className="pace-cell-value">{fmtUsdFull(data.projection.p50_finish_cents)}</div>
                    </div>
                    <div className="pace-cell" data-testid="pace-mtd-p90">
                      <div className="pace-cell-label">P90 · optimistic</div>
                      <div className="pace-cell-value">{fmtUsdFull(data.projection.p90_finish_cents)}</div>
                    </div>
                  </div>

                  {data.budget.configured && (
                    <div className="pace-band-budget-note">
                      monthly budget · <code>{fmtUsdFull(data.budget.monthly_cents)}</code>
                      {" · "}P50 vs budget ·{" "}
                      <code className={data.projection.vs_budget_p50_cents >= 0 ? "tone-up" : "tone-down"}>
                        {fmtSigned(data.projection.vs_budget_p50_cents)}
                      </code>
                    </div>
                  )}
                </section>
              ) : (
                <div className="pace-empty">
                  <div className="pace-empty-title">No projection available yet.</div>
                  <div className="pace-empty-body">
                    §1.1 — Monte Carlo finish projection requires forecast coverage that hasn't
                    landed for this window. The MTD KPIs above remain accurate; the P10/P50/P90
                    band will populate once the forecast layer catches up.
                  </div>
                </div>
              )}
            </>
          )}

          <footer className="pace-foot">
            generated · <code>{data.generated_at}</code>
          </footer>
        </>
      )}
    </div>
  );
}
