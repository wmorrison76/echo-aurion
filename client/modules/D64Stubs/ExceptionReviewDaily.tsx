/**
 * Exception Review · Daily — D64 deep-dive (PR #71 step B)
 *
 * Replaces the ComingSoon stub. Renders the daily red/amber/green exception
 * screen with a date picker, narrative line, KPI tiles, and an ordered list
 * of exceptions where each row can be expanded to inspect the raw payload.
 *
 * Backend: GET /api/exception-review/{property_id}?day=YYYY-MM-DD
 * Schema: see /app/backend/routes/exception_review.py
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import "./ExceptionReviewDaily.css";

const DEMO_PROPERTY = "pier-sixty-six-demo";

interface ExceptionRow {
  category: string;
  severity: "red" | "amber" | string;
  outlet_id?: string;
  outlet_name?: string;
  summary: string;
  data?: Record<string, unknown>;
}

interface ExceptionPayload {
  property_id: string;
  date: string;
  summary: { red: number; amber: number; total: number };
  exceptions: ExceptionRow[];
  narrative: string;
  generated_at: string;
}

function yesterdayIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function prettyCategory(c: string): string {
  // forecast_miss → Forecast Miss
  return c
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function ExceptionRowItem({ row, idx }: { row: ExceptionRow; idx: number }) {
  const [open, setOpen] = useState(false);
  const sev = row.severity === "red" ? "red" : row.severity === "amber" ? "amber" : "neutral";
  const rawJson = useMemo(() => {
    try { return JSON.stringify(row.data || {}, null, 2); } catch { return String(row.data); }
  }, [row.data]);
  const testid = `exception-row-${idx}`;
  return (
    <li className={`exrev-row sev-${sev} ${open ? "open" : ""}`} data-testid={testid}>
      <button
        type="button"
        className="exrev-row-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className={`exrev-chip sev-${sev}`}>{sev}</span>
        <span className="exrev-category">{prettyCategory(row.category)}</span>
        {row.outlet_name && (
          <span className="exrev-outlet-pill" title={row.outlet_id}>
            {row.outlet_name}
          </span>
        )}
        <span className="exrev-summary">{row.summary}</span>
        <span className="exrev-chevron">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="exrev-drawer">
          <div className="exrev-drawer-meta">
            <span className="exrev-meta-label">category</span>
            <code>{row.category}</code>
            {row.outlet_id && (
              <>
                <span className="exrev-meta-label">outlet</span>
                <code>{row.outlet_id}</code>
              </>
            )}
            <span className="exrev-meta-label">severity</span>
            <code className={`sev-${sev}`}>{sev}</code>
          </div>
          <pre className="exrev-raw">{rawJson}</pre>
        </div>
      )}
    </li>
  );
}

export default function ExceptionReviewDaily() {
  const [day, setDay] = useState<string>(() => yesterdayIso());
  const [data, setData] = useState<ExceptionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (target: string) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/exception-review/${DEMO_PROPERTY}?day=${target}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const payload = (await r.json()) as ExceptionPayload;
      setData(payload);
    } catch (e: any) {
      setError(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(day); }, [day, load]);

  const ordered = useMemo(() => {
    if (!data?.exceptions) return [];
    return [...data.exceptions].sort((a, b) => {
      const rank = (s: string) => (s === "red" ? 0 : s === "amber" ? 1 : 2);
      return rank(a.severity) - rank(b.severity);
    });
  }, [data]);

  const totalZero = data?.summary.total === 0;

  return (
    <div className="exrev-root" data-testid="exception-review-daily-root">
      <header className="exrev-header">
        <div className="exrev-header-left">
          <div className="exrev-eyebrow">Quick Daily · §1.1 Anomaly Screen</div>
          <h1 className="exrev-title">Exception Review · Daily</h1>
          <div className="exrev-property">
            property · <code>{DEMO_PROPERTY}</code>
          </div>
        </div>
        <div className="exrev-header-right">
          <label className="exrev-date-label" htmlFor="exrev-date">
            for date
          </label>
          <input
            id="exrev-date"
            data-testid="exception-review-date-picker"
            type="date"
            value={day}
            max={yesterdayIso()}
            onChange={(e) => setDay(e.target.value)}
            className="exrev-date-input"
          />
          <button
            type="button"
            className="exrev-refire"
            onClick={() => void load(day)}
            data-testid="exception-review-refire"
            title="re-fire the request"
          >
            ↻ refresh
          </button>
        </div>
      </header>

      {loading && <div className="exrev-loading">querying anomaly screen…</div>}

      {error && (
        <div className="exrev-error">
          request failed · <code>{error}</code>
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="exrev-narrative" data-testid="exception-review-narrative">
            <span className="exrev-quote-mark">"</span>
            {data.narrative}
          </div>

          <div className="exrev-kpis">
            <div className="exrev-kpi sev-red" data-testid="exception-review-kpi-red">
              <div className="exrev-kpi-label">Red · high priority</div>
              <div className="exrev-kpi-value">{data.summary.red}</div>
            </div>
            <div className="exrev-kpi sev-amber" data-testid="exception-review-kpi-amber">
              <div className="exrev-kpi-label">Amber · watchlist</div>
              <div className="exrev-kpi-value">{data.summary.amber}</div>
            </div>
            <div
              className={`exrev-kpi ${totalZero ? "sev-green" : "sev-neutral"}`}
              data-testid="exception-review-kpi-total"
            >
              <div className="exrev-kpi-label">{totalZero ? "Day cleared" : "Total flagged"}</div>
              <div className="exrev-kpi-value">{data.summary.total}</div>
            </div>
          </div>

          {totalZero ? (
            <div className="exrev-empty" data-testid="exception-review-empty">
              <div className="exrev-empty-title">No exceptions flagged for {data.date}.</div>
              <div className="exrev-empty-body">
                The day cleared without anomalies. §1.1 — this clean state is reported as a
                first-class fact, not the absence of a render.
              </div>
            </div>
          ) : (
            <ol className="exrev-list" data-testid="exception-review-list">
              {ordered.map((row, i) => (
                <ExceptionRowItem key={i} row={row} idx={i} />
              ))}
            </ol>
          )}

          <footer className="exrev-foot">
            generated · <code>{data.generated_at}</code> · day · <code>{data.date}</code>
          </footer>
        </>
      )}
    </div>
  );
}
