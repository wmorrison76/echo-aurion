/**
 * Cross-Property Benchmark — D64 (replaces ComingSoon stub)
 *
 * Fetches GET /api/cross-property/benchmark?metric=eligible_capture&lookback_days=30
 * Renders overall median + per-property summary + outliers list.
 *
 * §1.1 — When the system has only one property, the "peers" panel shows
 * the missing-data state rather than fake comparison points. As soon as
 * a second property is onboarded, the benchmark populates with real cohort data.
 */
import { useCallback, useEffect, useState } from "react";
import "./PaceMtd.css";
import "./CrossPropertyBenchmark.css";

const METRIC_CHOICES: Array<{ value: string; label: string }> = [
  { value: "eligible_capture", label: "Eligible Capture" },
  { value: "available_capture", label: "Available Capture" },
  { value: "total_capture", label: "Total Capture" },
  { value: "revenue_cents", label: "Revenue / day" },
  { value: "covers", label: "Covers / day" },
];

const OUTLET_TYPE_CHOICES = [
  { value: "", label: "All outlet types" },
  { value: "restaurant", label: "Restaurant" },
  { value: "ird", label: "In-Room Dining" },
  { value: "banquet", label: "Banquet" },
  { value: "bar", label: "Bar" },
  { value: "spa", label: "Spa" },
  { value: "retail", label: "Retail" },
];

const LOOKBACK_CHOICES = [7, 14, 30, 60, 90];

interface PropertySummary {
  property_id: string;
  outlet_count: number;
  avg: number;
  median: number;
  p25: number;
  p75: number;
}

interface Outlier {
  property_id: string;
  outlet_id: string;
  outlet_name: string;
  outlet_type: string;
  avg_value: number;
  samples: number;
  z_score: number;
  direction: "above" | "below";
}

interface BenchmarkPayload {
  metric: string;
  outlet_type_filter: string | null;
  lookback_days: number;
  available: boolean;
  overall?: { median: number; stdev: number; outlets: number; properties: number };
  by_property?: PropertySummary[];
  outliers?: Outlier[];
  narrative?: string;
  generated_at: string;
}

function fmtMetric(value: number | null | undefined, metric: string): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (metric === "revenue_cents") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value / 100);
  }
  if (metric === "covers") {
    return value.toFixed(1);
  }
  return `${(value * 100).toFixed(1)}%`;
}

export default function CrossPropertyBenchmark() {
  const [metric, setMetric] = useState<string>("eligible_capture");
  const [outletType, setOutletType] = useState<string>("");
  const [lookback, setLookback] = useState<number>(30);
  const [data, setData] = useState<BenchmarkPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        metric,
        lookback_days: String(lookback),
      });
      if (outletType) qs.set("outlet_type", outletType);
      const r = await fetch(`/api/cross-property/benchmark?${qs.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e: any) {
      setError(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [metric, outletType, lookback]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="pace-root xprop-root" data-testid="cross-property-root">
      <header className="pace-header">
        <div className="pace-header-left">
          <div className="pace-eyebrow">Intelligence & Forecasting · §2.5 Cohort Comparison</div>
          <h1 className="pace-title">Cross-Property Benchmark</h1>
          <div className="pace-property">
            metric · <code>{metric}</code>
            {outletType && (<>{" · "}cohort · <code>{outletType}</code></>)}
            {data && (<>{" · "}lookback · <code>{data.lookback_days} days</code></>)}
          </div>
        </div>
        <div className="pace-header-right">
          <label className="pace-input-label">metric</label>
          <select
            data-testid="cross-property-metric"
            className="pace-select"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            {METRIC_CHOICES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <label className="pace-input-label">cohort</label>
          <select
            data-testid="cross-property-outlet-type"
            className="pace-select"
            value={outletType}
            onChange={(e) => setOutletType(e.target.value)}
          >
            {OUTLET_TYPE_CHOICES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <label className="pace-input-label">window</label>
          <select
            data-testid="cross-property-lookback"
            className="pace-select"
            value={lookback}
            onChange={(e) => setLookback(Number(e.target.value))}
          >
            {LOOKBACK_CHOICES.map((d) => <option key={d} value={d}>{d}d</option>)}
          </select>
          <button
            type="button"
            className="pace-refire"
            data-testid="cross-property-refresh"
            onClick={() => void load()}
          >
            ↻ refresh
          </button>
        </div>
      </header>

      {loading && <div className="pace-loading">querying cross-property benchmark…</div>}
      {error && (
        <div className="pace-error" data-testid="cross-property-error">
          request failed · <code>{error}</code>
        </div>
      )}

      {!loading && !error && data && data.available === false && (
        <div className="pace-empty" data-testid="cross-property-empty">
          <div className="pace-empty-title">Insufficient data for the {metric} cohort.</div>
          <div className="pace-empty-body">
            §1.1 — cohort benchmarks need at least 2 properties (or 3+ outlets of the
            selected type) to compute. As soon as additional properties are onboarded,
            this view auto-populates with real comparison data.
          </div>
        </div>
      )}

      {!loading && !error && data && data.available !== false && data.overall && (
        <>
          {data.narrative && (
            <div className="pace-narrative" data-testid="cross-property-narrative">
              <span className="pace-quote-mark">"</span>
              {data.narrative}
            </div>
          )}

          {data.overall.properties === 1 && (
            <div className="xprop-single-callout" data-testid="cross-property-single-callout">
              <strong>Single-property cohort.</strong> Comparison stats below reflect only
              <code> {data.by_property?.[0]?.property_id ?? "this property"}</code>. Onboard
              additional properties to unlock true peer benchmarking — §1.1 surfaces this
              constraint as a first-class fact rather than fabricating a peer set.
            </div>
          )}

          <div className="pace-kpis">
            <div className="pace-kpi" data-testid="cross-property-properties">
              <div className="pace-kpi-label">Properties</div>
              <div className="pace-kpi-value">{data.overall.properties}</div>
              <div className="pace-kpi-meta">in the cohort</div>
            </div>

            <div className="pace-kpi" data-testid="cross-property-outlets">
              <div className="pace-kpi-label">Outlets</div>
              <div className="pace-kpi-value">{data.overall.outlets}</div>
              <div className="pace-kpi-meta">
                {outletType ? `type · ${outletType}` : "all types"}
              </div>
            </div>

            <div className="pace-kpi" data-testid="cross-property-median">
              <div className="pace-kpi-label">Overall Median</div>
              <div className="pace-kpi-value">{fmtMetric(data.overall.median, metric)}</div>
              <div className="pace-kpi-meta">stdev {fmtMetric(data.overall.stdev, metric)}</div>
            </div>

            <div className={`pace-kpi tone-${(data.outliers?.length ?? 0) > 0 ? "amber" : "up"}`} data-testid="cross-property-outliers-kpi">
              <div className="pace-kpi-label">Outliers</div>
              <div className="pace-kpi-value">{data.outliers?.length ?? 0}</div>
              <div className="pace-kpi-meta">|z-score| &gt; 1.5</div>
            </div>
          </div>

          {data.by_property && data.by_property.length > 0 && (
            <section className="vendor-card">
              <header className="vendor-card-head">
                <div>
                  <div className="vendor-card-title">Per-property summary</div>
                  <div className="vendor-card-sub">
                    Quartile spread (P25 / median / P75) per property for the selected metric.
                  </div>
                </div>
              </header>
              <ul className="xprop-property-list">
                {data.by_property.map((p) => (
                  <li
                    key={p.property_id}
                    className="xprop-property-row"
                    data-testid={`cross-property-prop-${p.property_id}`}
                  >
                    <div className="xprop-name">
                      <span className="vendor-primary">{p.property_id}</span>
                      <span className="vendor-secondary">{p.outlet_count} outlets</span>
                    </div>
                    <div className="xprop-stats">
                      <div className="xprop-stat">
                        <span className="xprop-stat-label">P25</span>
                        <span className="xprop-stat-value">{fmtMetric(p.p25, metric)}</span>
                      </div>
                      <div className="xprop-stat highlight">
                        <span className="xprop-stat-label">Median</span>
                        <span className="xprop-stat-value">{fmtMetric(p.median, metric)}</span>
                      </div>
                      <div className="xprop-stat">
                        <span className="xprop-stat-label">P75</span>
                        <span className="xprop-stat-value">{fmtMetric(p.p75, metric)}</span>
                      </div>
                      <div className="xprop-stat">
                        <span className="xprop-stat-label">Avg</span>
                        <span className="xprop-stat-value">{fmtMetric(p.avg, metric)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.outliers && data.outliers.length > 0 && (
            <section className="vendor-card">
              <header className="vendor-card-head">
                <div>
                  <div className="vendor-card-title">Outlier outlets · |z| &gt; 1.5σ</div>
                  <div className="vendor-card-sub">
                    Outlets sitting more than 1.5 standard deviations from the cohort median.
                    Above-median outliers reveal best practice; below-median outliers point to remediation work.
                  </div>
                </div>
              </header>
              <ul className="xprop-outlier-list">
                {data.outliers.map((o) => (
                  <li
                    key={`${o.property_id}-${o.outlet_id}`}
                    className={`xprop-outlier-row dir-${o.direction}`}
                    data-testid={`cross-property-outlier-${o.outlet_id}`}
                  >
                    <div className="xprop-outlier-dir">
                      {o.direction === "above" ? "▲" : "▼"}
                    </div>
                    <div className="xprop-outlier-name">
                      <span className="vendor-primary">{o.outlet_name}</span>
                      <span className="vendor-secondary">{o.outlet_type} · {o.property_id}</span>
                    </div>
                    <div className="xprop-outlier-value">{fmtMetric(o.avg_value, metric)}</div>
                    <div className="xprop-outlier-z">
                      z · {o.z_score.toFixed(2)}σ
                    </div>
                    <div className="xprop-outlier-samples">{o.samples} samples</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <footer className="pace-foot">
            generated · <code>{data.generated_at}</code>
          </footer>
        </>
      )}
    </div>
  );
}
