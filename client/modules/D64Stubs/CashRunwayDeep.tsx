/**
 * Cash Runway Deep-Dive — D64 (replaces the ComingSoon stub)
 *
 * Fetches GET /api/cash-runway/{property_id}?lookback_days=N
 * and renders the property-level cash burn + months-of-runway dashboard.
 *
 * Per doctrine §1.1 + §2.5:
 *   · Three runway estimates (median / mean / P75-worst-quartile) are shown
 *     side-by-side rather than collapsed to a single number — uncertainty
 *     bands published, not a false-confidence point estimate.
 *   · Burn acceleration (7d vs 30d) gets its own callout. The "hard
 *     conversation" amber/red thresholds come straight from the backend's
 *     `warning_level` field.
 *   · When no cash_balances rows exist, the empty-state explains the
 *     remediation rather than guessing a runway.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import "./PaceMtd.css";
import "./CashRunwayDeep.css";

const DEMO_PROPERTY = "pier-sixty-six-demo";
const LOOKBACK_CHOICES = [7, 14, 30, 60, 90];

interface BurnCents {
  median: number;
  mean: number;
  p75_worst_quartile: number;
  trailing_7d_avg: number;
  trailing_30d_avg: number;
  acceleration_pct: number;
}

interface RunwayMonths {
  median_burn: number | null;
  mean_burn: number | null;
  worst_quartile_burn: number | null;
  trailing_7d_burn: number | null;
}

interface Outflow {
  date: string;
  delta_cents: number;
  ending_balance_cents: number;
}

interface CashRunwayPayload {
  property_id: string;
  available: true;
  lookback_days: number;
  current_cash: {
    total_cents: number;
    restricted_cents: number;
    available_cents: number;
    as_of_date: string;
  };
  daily_burn_cents: BurnCents;
  runway_months: RunwayMonths;
  largest_outflows: Outflow[];
  warning_level:
    | "green"
    | "green_or_growing"
    | "amber_burn_accelerating"
    | "amber_runway_under_12_months"
    | "red_runway_under_6_months";
  narrative: string;
  generated_at: string;
}

interface CashRunwayUnavailable {
  property_id: string;
  available: false;
  reason: string;
  snapshots_found?: number;
  lookback_days: number;
  remediation?: string;
  generated_at: string;
}

type Payload = CashRunwayPayload | CashRunwayUnavailable;

function fmtUsdFull(cents: number | null | undefined): string {
  if (cents == null || Number.isNaN(cents)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function fmtMonths(m: number | null | undefined): string {
  if (m == null) return "∞";
  return `${m.toFixed(1)} mo`;
}

function fmtPct(frac: number, digits = 1): string {
  if (frac == null || Number.isNaN(frac)) return "—";
  const sign = frac > 0 ? "+" : "";
  return `${sign}${(frac * 100).toFixed(digits)}%`;
}

function fmtDate(iso: string): string {
  // Stay locale-stable: YYYY-MM-DD → "May 09"
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "2-digit", timeZone: "UTC" });
}

const WARNING_COPY: Record<CashRunwayPayload["warning_level"], { label: string; tone: "up" | "amber" | "down" }> = {
  green: { label: "Green · stable", tone: "up" },
  green_or_growing: { label: "Cash-positive", tone: "up" },
  amber_burn_accelerating: { label: "Amber · burn accelerating", tone: "amber" },
  amber_runway_under_12_months: { label: "Amber · runway < 12mo", tone: "amber" },
  red_runway_under_6_months: { label: "Red · runway < 6mo", tone: "down" },
};

export default function CashRunwayDeep() {
  const [lookback, setLookback] = useState<number>(30);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/cash-runway/${DEMO_PROPERTY}?lookback_days=${days}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const payload = (await r.json()) as Payload;
      setData(payload);
    } catch (e: any) {
      setError(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(lookback); }, [lookback, load]);

  // Compute the outflow bar widths (largest_outflows are negative deltas,
  // so flip the sign and scale to the largest absolute value).
  const outflowWidths = useMemo(() => {
    if (!data || data.available === false) return [];
    const abs = data.largest_outflows.map((o) => Math.abs(o.delta_cents));
    const max = abs.length ? Math.max(...abs) : 1;
    return abs.map((a) => (max > 0 ? (a / max) * 100 : 0));
  }, [data]);

  return (
    <div className="pace-root cash-root" data-testid="cash-runway-root">
      <header className="pace-header">
        <div className="pace-header-left">
          <div className="pace-eyebrow">Office of the CFO · §1.1 Cash Transparency</div>
          <h1 className="pace-title">Cash Runway · Deep-Dive</h1>
          <div className="pace-property">
            property · <code>{DEMO_PROPERTY}</code>
            {data && (
              <>
                {" · "}lookback · <code>{data.lookback_days} days</code>
              </>
            )}
          </div>
        </div>
        <div className="pace-header-right">
          <label className="pace-input-label" htmlFor="cash-lookback">lookback</label>
          <select
            id="cash-lookback"
            data-testid="cash-runway-lookback"
            className="pace-select"
            value={lookback}
            onChange={(e) => setLookback(Number(e.target.value))}
          >
            {LOOKBACK_CHOICES.map((d) => (
              <option key={d} value={d}>{d} days</option>
            ))}
          </select>
          <button
            type="button"
            className="pace-refire"
            data-testid="cash-runway-refresh"
            onClick={() => void load(lookback)}
          >
            ↻ refresh
          </button>
        </div>
      </header>

      {loading && <div className="pace-loading">querying cash runway…</div>}
      {error && (
        <div className="pace-error" data-testid="cash-runway-error">
          request failed · <code>{error}</code>
        </div>
      )}

      {!loading && !error && data && data.available === false && (
        <div className="pace-empty" data-testid="cash-runway-empty">
          <div className="pace-empty-title">
            No cash-balance history for the selected window.
          </div>
          <div className="pace-empty-body">
            §1.1 — {data.snapshots_found ?? 0} snapshots found in the last {data.lookback_days} days.
            {data.remediation && (
              <>
                <br /><br />
                <strong>Remediation:</strong> {data.remediation}
              </>
            )}
          </div>
        </div>
      )}

      {!loading && !error && data && data.available === true && (
        <>
          <div className="pace-narrative" data-testid="cash-runway-narrative">
            <span className="pace-quote-mark">"</span>
            {data.narrative}
          </div>

          <div className={`cash-warning cash-warning-${WARNING_COPY[data.warning_level].tone}`} data-testid="cash-runway-warning">
            <div className="cash-warning-dot" />
            <div className="cash-warning-label">{WARNING_COPY[data.warning_level].label}</div>
            <div className="cash-warning-meta">
              acceleration · {fmtPct(data.daily_burn_cents.acceleration_pct)} (7d vs 30d)
            </div>
          </div>

          <div className="pace-kpis">
            <div className="pace-kpi" data-testid="cash-runway-available">
              <div className="pace-kpi-label">Available Cash</div>
              <div className="pace-kpi-value">{fmtUsdFull(data.current_cash.available_cents)}</div>
              <div className="pace-kpi-meta">
                total {fmtUsdFull(data.current_cash.total_cents)} · restricted {fmtUsdFull(data.current_cash.restricted_cents)}
              </div>
            </div>

            <div className="pace-kpi" data-testid="cash-runway-median-burn">
              <div className="pace-kpi-label">Median Daily Burn</div>
              <div className="pace-kpi-value">{fmtUsdFull(data.daily_burn_cents.median)}</div>
              <div className="pace-kpi-meta">
                mean {fmtUsdFull(data.daily_burn_cents.mean)} · P75 {fmtUsdFull(data.daily_burn_cents.p75_worst_quartile)}
              </div>
            </div>

            <div className={`pace-kpi tone-${data.daily_burn_cents.acceleration_pct > 0.20 ? "down" : data.daily_burn_cents.acceleration_pct < -0.20 ? "up" : ""}`} data-testid="cash-runway-trend">
              <div className="pace-kpi-label">7d vs 30d Burn</div>
              <div className="pace-kpi-value">{fmtUsdFull(data.daily_burn_cents.trailing_7d_avg)}</div>
              <div className="pace-kpi-meta">
                30d {fmtUsdFull(data.daily_burn_cents.trailing_30d_avg)} · {fmtPct(data.daily_burn_cents.acceleration_pct)}
              </div>
            </div>

            <div className={`pace-kpi tone-${data.warning_level.startsWith("red") ? "down" : data.warning_level.startsWith("amber") ? "amber" : "up"}`} data-testid="cash-runway-runway-worst">
              <div className="pace-kpi-label">Worst-Case Runway</div>
              <div className="pace-kpi-value">{fmtMonths(data.runway_months.worst_quartile_burn)}</div>
              <div className="pace-kpi-meta">at the P75 daily burn rate</div>
            </div>
          </div>

          <section className="cash-runway-card">
            <header className="cash-card-head">
              <div>
                <div className="cash-card-title">Runway estimates · three scenarios</div>
                <div className="cash-card-sub">
                  Same cash balance, three different burn assumptions — the spread is the uncertainty band.
                </div>
              </div>
            </header>
            <div className="cash-runway-grid">
              <RunwayCell
                testid="cash-runway-cell-median"
                label="Median burn"
                hint="50% of days burn ≤ this"
                months={data.runway_months.median_burn}
                burn={data.daily_burn_cents.median}
              />
              <RunwayCell
                testid="cash-runway-cell-mean"
                label="Mean burn"
                hint="arithmetic average over lookback"
                months={data.runway_months.mean_burn}
                burn={data.daily_burn_cents.mean}
              />
              <RunwayCell
                testid="cash-runway-cell-worst"
                label="P75 worst-quartile burn"
                hint="25% of days burn this much or more"
                months={data.runway_months.worst_quartile_burn}
                burn={data.daily_burn_cents.p75_worst_quartile}
                emphasized
              />
              <RunwayCell
                testid="cash-runway-cell-7d"
                label="Trailing 7-day burn"
                hint="latest week — early-warning signal"
                months={data.runway_months.trailing_7d_burn}
                burn={data.daily_burn_cents.trailing_7d_avg}
              />
            </div>
          </section>

          <section className="cash-runway-card">
            <header className="cash-card-head">
              <div>
                <div className="cash-card-title">Largest cash outflows · lookback window</div>
                <div className="cash-card-sub">
                  Top 5 single-day net cash decreases. Use these to start the "what hit the bank today?" conversation.
                </div>
              </div>
            </header>
            {data.largest_outflows.length === 0 ? (
              <div className="pace-empty-body">No outflow days in the window.</div>
            ) : (
              <ul className="cash-outflows-list">
                {data.largest_outflows.map((o, i) => (
                  <li key={`${o.date}-${i}`} className="cash-outflow-row" data-testid={`cash-runway-outflow-${i}`}>
                    <div className="cash-outflow-date">{fmtDate(o.date)}</div>
                    <div className="cash-outflow-bar-track">
                      <div
                        className="cash-outflow-bar-fill"
                        style={{ width: `${outflowWidths[i] ?? 0}%` }}
                      />
                    </div>
                    <div className="cash-outflow-delta">{fmtUsdFull(o.delta_cents)}</div>
                    <div className="cash-outflow-bal">
                      ending · {fmtUsdFull(o.ending_balance_cents)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <footer className="pace-foot">
            generated · <code>{data.generated_at}</code> · as-of cash · <code>{data.current_cash.as_of_date}</code>
          </footer>
        </>
      )}
    </div>
  );
}

interface RunwayCellProps {
  testid: string;
  label: string;
  hint: string;
  months: number | null;
  burn: number;
  emphasized?: boolean;
}

function RunwayCell({ testid, label, hint, months, burn, emphasized }: RunwayCellProps) {
  return (
    <div className={`cash-runway-cell${emphasized ? " emphasized" : ""}`} data-testid={testid}>
      <div className="cash-cell-label">{label}</div>
      <div className="cash-cell-value">{fmtMonths(months)}</div>
      <div className="cash-cell-meta">
        @ {fmtUsdFull(burn)}/day · {hint}
      </div>
    </div>
  );
}
