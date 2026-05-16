/**
 * Vendor Pareto · 80/20 Spend Concentration — D64 (replaces ComingSoon stub)
 *
 * Fetches GET /api/vendor-pareto/spend/{property_id}?lookback_days=N
 * Renders the Pareto chart (cumulative-share curve), the top-N "vital few"
 * vendors that drive 80% of spend, plus the long-tail rest.
 *
 * Doctrine alignment:
 *   · §1.1 — when no invoices land in the lookback window we show the
 *     remediation note rather than fake spend numbers.
 *   · §2.5 — the headline metric is concentration risk (top-N share),
 *     not a raw spend number. Concentration is what gets you to the
 *     diversification conversation.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import "./PaceMtd.css";
import "./VendorPareto.css";

const DEMO_PROPERTY = "pier-sixty-six-demo";
const LOOKBACK_CHOICES = [30, 60, 90, 180, 365];

interface VendorRow {
  vendor_id: string;
  vendor_name: string;
  total_spend_cents: number;
  invoice_count: number;
  cumulative_spend_cents: number;
  pct_of_total: number;
  cumulative_pct: number;
}

interface ParetoPayload {
  property_id: string;
  lookback_days: number;
  available: true;
  grand_total_spend_cents: number;
  vendor_count: number;
  pareto_top_vendors: VendorRow[];
  pareto_count: number;
  pareto_share_of_total_pct: number;
  all_vendors: VendorRow[];
  narrative: string;
  generated_at: string;
}

interface ParetoUnavailable {
  property_id: string;
  available: false;
  reason: string;
  lookback_days: number;
  generated_at: string;
}

type Payload = ParetoPayload | ParetoUnavailable;

function fmtUsd(cents: number): string {
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

export default function VendorPareto() {
  const [lookback, setLookback] = useState<number>(90);
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/vendor-pareto/spend/${DEMO_PROPERTY}?lookback_days=${days}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e: any) {
      setError(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(lookback); }, [lookback, load]);

  // Build the bar+curve viz data
  const viz = useMemo(() => {
    if (!data || data.available === false) return null;
    const rows = data.all_vendors;
    const maxSpend = rows[0]?.total_spend_cents ?? 1;
    return rows.map((v, i) => ({
      ...v,
      barWidthPct: (v.total_spend_cents / maxSpend) * 100,
      isPareto: i < data.pareto_count,
    }));
  }, [data]);

  return (
    <div className="pace-root vendor-root" data-testid="vendor-pareto-root">
      <header className="pace-header">
        <div className="pace-header-left">
          <div className="pace-eyebrow">Office of the CFO · §2.5 Concentration Risk</div>
          <h1 className="pace-title">Vendor Pareto · 80/20 Spend</h1>
          <div className="pace-property">
            property · <code>{DEMO_PROPERTY}</code>
            {data && (<>{" · "}lookback · <code>{data.lookback_days} days</code></>)}
          </div>
        </div>
        <div className="pace-header-right">
          <label className="pace-input-label" htmlFor="vp-lookback">lookback</label>
          <select
            id="vp-lookback"
            data-testid="vendor-pareto-lookback"
            className="pace-select"
            value={lookback}
            onChange={(e) => setLookback(Number(e.target.value))}
          >
            {LOOKBACK_CHOICES.map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
          <button
            type="button"
            className="pace-refire"
            data-testid="vendor-pareto-refresh"
            onClick={() => void load(lookback)}
          >
            ↻ refresh
          </button>
        </div>
      </header>

      {loading && <div className="pace-loading">querying vendor spend…</div>}
      {error && (
        <div className="pace-error" data-testid="vendor-pareto-error">
          request failed · <code>{error}</code>
        </div>
      )}

      {!loading && !error && data && data.available === false && (
        <div className="pace-empty" data-testid="vendor-pareto-empty">
          <div className="pace-empty-title">No invoices received in the last {data.lookback_days} days.</div>
          <div className="pace-empty-body">
            §1.1 — the Pareto can't be computed without an `invoices` collection rooted to this property.
            Wire AP ingestion (Stampli / Bill / manual upload) to populate the `invoices` collection with
            `{`{property_id, vendor_id, vendor_name, received_date, total_cents}`}`.
          </div>
        </div>
      )}

      {!loading && !error && data && data.available === true && viz && (
        <>
          <div className="pace-narrative" data-testid="vendor-pareto-narrative">
            <span className="pace-quote-mark">"</span>
            {data.narrative}
          </div>

          <div className="pace-kpis">
            <div className="pace-kpi" data-testid="vendor-pareto-total">
              <div className="pace-kpi-label">Total Spend</div>
              <div className="pace-kpi-value">{fmtUsd(data.grand_total_spend_cents)}</div>
              <div className="pace-kpi-meta">{data.vendor_count} vendors · {data.lookback_days}d window</div>
            </div>

            <div className="pace-kpi tone-amber" data-testid="vendor-pareto-pareto-count">
              <div className="pace-kpi-label">Vital Few · 80% of spend</div>
              <div className="pace-kpi-value">{data.pareto_count}</div>
              <div className="pace-kpi-meta">
                {fmtPct(data.pareto_share_of_total_pct)} of vendors carry 80% of cost
              </div>
            </div>

            <div className="pace-kpi" data-testid="vendor-pareto-top-spend">
              <div className="pace-kpi-label">Largest Vendor</div>
              <div className="pace-kpi-value">{fmtUsd(viz[0]?.total_spend_cents ?? 0)}</div>
              <div className="pace-kpi-meta">
                {viz[0]?.vendor_name} · {fmtPct(viz[0]?.pct_of_total ?? 0)} of total
              </div>
            </div>

            <div className="pace-kpi" data-testid="vendor-pareto-tail">
              <div className="pace-kpi-label">Long Tail</div>
              <div className="pace-kpi-value">{data.vendor_count - data.pareto_count}</div>
              <div className="pace-kpi-meta">
                vendors carrying ≤ 20% of spend
              </div>
            </div>
          </div>

          <section className="vendor-card">
            <header className="vendor-card-head">
              <div>
                <div className="vendor-card-title">Spend ranking · all vendors</div>
                <div className="vendor-card-sub">
                  Rows above the gold cutline are the "vital few" carrying 80% of spend.
                  Bars scale to the largest vendor; cumulative line shows the Pareto curve.
                </div>
              </div>
            </header>
            <ul className="vendor-list">
              {viz.map((v, i) => (
                <li
                  key={v.vendor_id}
                  className={`vendor-row${v.isPareto ? " pareto" : " tail"}${i + 1 === data.pareto_count ? " cutline" : ""}`}
                  data-testid={`vendor-pareto-row-${i}`}
                >
                  <div className="vendor-rank">#{i + 1}</div>
                  <div className="vendor-name">
                    <span className="vendor-primary">{v.vendor_name}</span>
                    <span className="vendor-secondary">{v.invoice_count} invoices</span>
                  </div>
                  <div className="vendor-bar-track">
                    <div className="vendor-bar-fill" style={{ width: `${v.barWidthPct}%` }} />
                    <div className="vendor-cum-line" style={{ left: `${v.cumulative_pct * 100}%` }} />
                  </div>
                  <div className="vendor-spend">{fmtUsd(v.total_spend_cents)}</div>
                  <div className="vendor-pct">
                    {fmtPct(v.pct_of_total)}
                    <span className="vendor-cum">cum {fmtPct(v.cumulative_pct)}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <footer className="pace-foot">
            generated · <code>{data.generated_at}</code>
          </footer>
        </>
      )}
    </div>
  );
}
