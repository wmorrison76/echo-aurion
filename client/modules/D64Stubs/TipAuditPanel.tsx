/**
 * Tip Audit · Reconciliation & Compliance — D64 (replaces ComingSoon stub)
 *
 * Fetches GET /api/tip-audit/{property_id}?days_back=N
 * Renders the per-shift tip allocation ledger with integrity-pass flags
 * and a per-employee aggregate.
 *
 * Doctrine §2.5 — observation not accusation. Integrity failures are
 * surfaced with a "needs investigation" tone, never a "fraud" tone.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import "./PaceMtd.css";
import "./TipAuditPanel.css";

const DEMO_PROPERTY = "pier-sixty-six-demo";
const RANGE_CHOICES = [7, 14, 30, 60, 90];

interface Allocation {
  employee_id: string;
  employee_name?: string;
  role: string;
  hours_worked: number;
  hours_share_of_role: number;
  allocated_cents: number;
}

interface AuditRun {
  shift_id: string;
  shift_date: string;
  property_id?: string;
  outlet_id?: string;
  pool_total_cents?: number;
  allocated_total_cents?: number;
  allocations: Allocation[];
  integrity_pass: boolean;
  integrity_notes?: string;
}

interface AuditPayload {
  property_id: string;
  days_back: number;
  count: number;
  audits: AuditRun[];
  integrity_failures: AuditRun[];
}

function fmtUsd(cents: number): string {
  if (cents == null || Number.isNaN(cents)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "2-digit", timeZone: "UTC" });
}

export default function TipAuditPanel() {
  const [daysBack, setDaysBack] = useState<number>(14);
  const [data, setData] = useState<AuditPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openShift, setOpenShift] = useState<string | null>(null);

  const load = useCallback(async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/tip-audit/${DEMO_PROPERTY}?days_back=${days}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
    } catch (e: any) {
      setError(String(e?.message || e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(daysBack); }, [daysBack, load]);

  const totals = useMemo(() => {
    if (!data || data.count === 0) return null;
    const totalPool = data.audits.reduce((s, a) => s + (a.pool_total_cents ?? 0), 0);
    const totalAllocated = data.audits.reduce((s, a) => s + (a.allocated_total_cents ?? 0), 0);
    const shifts = data.audits.length;
    const passes = data.audits.filter((a) => a.integrity_pass).length;
    const passRate = shifts > 0 ? passes / shifts : 0;

    // Per-employee aggregate
    const byEmp = new Map<string, { name: string; role: string; cents: number; hours: number; shifts: number }>();
    for (const a of data.audits) {
      for (const alloc of a.allocations) {
        const e = byEmp.get(alloc.employee_id) ?? { name: alloc.employee_name || alloc.employee_id, role: alloc.role, cents: 0, hours: 0, shifts: 0 };
        e.cents += alloc.allocated_cents;
        e.hours += alloc.hours_worked;
        e.shifts += 1;
        byEmp.set(alloc.employee_id, e);
      }
    }
    const employees = Array.from(byEmp.entries()).map(([id, e]) => ({
      employee_id: id,
      employee_name: e.name,
      role: e.role,
      total_cents: e.cents,
      hours: e.hours,
      avg_per_hour_cents: e.hours > 0 ? e.cents / e.hours : 0,
      shifts: e.shifts,
    })).sort((a, b) => b.total_cents - a.total_cents);

    return { totalPool, totalAllocated, shifts, passes, passRate, employees };
  }, [data]);

  return (
    <div className="pace-root tip-root" data-testid="tip-audit-root">
      <header className="pace-header">
        <div className="pace-header-left">
          <div className="pace-eyebrow">Office of the CFO · §2.5 Tip Pool Transparency</div>
          <h1 className="pace-title">Tip Audit · Reconciliation</h1>
          <div className="pace-property">
            property · <code>{DEMO_PROPERTY}</code>
            {data && (<>{" · "}window · <code>{data.days_back} days</code></>)}
          </div>
        </div>
        <div className="pace-header-right">
          <label className="pace-input-label" htmlFor="tip-days">window</label>
          <select
            id="tip-days"
            data-testid="tip-audit-window"
            className="pace-select"
            value={daysBack}
            onChange={(e) => setDaysBack(Number(e.target.value))}
          >
            {RANGE_CHOICES.map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
          <button
            type="button"
            className="pace-refire"
            data-testid="tip-audit-refresh"
            onClick={() => void load(daysBack)}
          >
            ↻ refresh
          </button>
        </div>
      </header>

      {loading && <div className="pace-loading">querying tip audit…</div>}
      {error && (
        <div className="pace-error" data-testid="tip-audit-error">
          request failed · <code>{error}</code>
        </div>
      )}

      {!loading && !error && data && data.count === 0 && (
        <div className="pace-empty" data-testid="tip-audit-empty">
          <div className="pace-empty-title">No tip audit runs in the last {data.days_back} days.</div>
          <div className="pace-empty-body">
            §1.1 — the audit ledger needs `tip_audit_runs` rows. Compute one per shift via{" "}
            <code>POST /api/tip-audit/compute/&#123;shift_id&#125;</code> after the shift closes.
            Once one run exists, this panel renders the integrity ledger + per-employee aggregate.
          </div>
        </div>
      )}

      {!loading && !error && data && data.count > 0 && totals && (
        <>
          <div className="pace-kpis">
            <div className="pace-kpi" data-testid="tip-audit-shifts">
              <div className="pace-kpi-label">Shifts Audited</div>
              <div className="pace-kpi-value">{totals.shifts}</div>
              <div className="pace-kpi-meta">last {data.days_back} days</div>
            </div>

            <div className={`pace-kpi tone-${totals.passRate >= 0.95 ? "up" : totals.passRate >= 0.8 ? "amber" : "down"}`} data-testid="tip-audit-pass-rate">
              <div className="pace-kpi-label">Integrity Pass Rate</div>
              <div className="pace-kpi-value">{Math.round(totals.passRate * 100)}%</div>
              <div className="pace-kpi-meta">
                {totals.passes} passed · {totals.shifts - totals.passes} flagged
              </div>
            </div>

            <div className="pace-kpi" data-testid="tip-audit-pool">
              <div className="pace-kpi-label">Total Pool</div>
              <div className="pace-kpi-value">{fmtUsd(totals.totalPool)}</div>
              <div className="pace-kpi-meta">allocated {fmtUsd(totals.totalAllocated)}</div>
            </div>

            <div className="pace-kpi" data-testid="tip-audit-employees">
              <div className="pace-kpi-label">Employees Paid</div>
              <div className="pace-kpi-value">{totals.employees.length}</div>
              <div className="pace-kpi-meta">distinct allocations</div>
            </div>
          </div>

          {data.integrity_failures.length > 0 && (
            <section className="tip-failures-card" data-testid="tip-audit-failures">
              <header className="vendor-card-head">
                <div>
                  <div className="vendor-card-title">⚠ Integrity Failures · {data.integrity_failures.length}</div>
                  <div className="vendor-card-sub">
                    §2.5 — these shifts need a manager review, not a verdict. The math didn't balance; investigate first.
                  </div>
                </div>
              </header>
              <ul className="tip-failure-list">
                {data.integrity_failures.map((f) => (
                  <li key={f.shift_id} className="tip-failure-row" data-testid={`tip-failure-${f.shift_id}`}>
                    <div className="tip-failure-date">{fmtDate(f.shift_date)}</div>
                    <div className="tip-failure-shift">
                      <code>{f.shift_id}</code>
                    </div>
                    <div className="tip-failure-notes">{f.integrity_notes ?? "integrity check failed"}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="vendor-card">
            <header className="vendor-card-head">
              <div>
                <div className="vendor-card-title">Per-employee tip aggregate</div>
                <div className="vendor-card-sub">
                  Transparency runs both ways — each employee should see this same view of their own earnings (Tenet 6).
                </div>
              </div>
            </header>
            <ul className="tip-emp-list">
              {totals.employees.map((e) => (
                <li key={e.employee_id} className="tip-emp-row" data-testid={`tip-emp-${e.employee_id}`}>
                  <div className="tip-emp-name">
                    <span className="vendor-primary">{e.employee_name}</span>
                    <span className="vendor-secondary">{e.role} · {e.shifts} shifts</span>
                  </div>
                  <div className="tip-emp-hours">{e.hours.toFixed(1)}h</div>
                  <div className="tip-emp-total">{fmtUsd(e.total_cents)}</div>
                  <div className="tip-emp-avg">{fmtUsd(e.avg_per_hour_cents)}/hr</div>
                </li>
              ))}
            </ul>
          </section>

          <section className="vendor-card">
            <header className="vendor-card-head">
              <div>
                <div className="vendor-card-title">Shift-by-shift audit ledger</div>
                <div className="vendor-card-sub">
                  Click a shift to expand the allocation breakdown.
                </div>
              </div>
            </header>
            <ul className="tip-shift-list">
              {data.audits.map((a) => (
                <li
                  key={a.shift_id}
                  className={`tip-shift-row${a.integrity_pass ? "" : " failed"}${openShift === a.shift_id ? " open" : ""}`}
                  data-testid={`tip-shift-${a.shift_id}`}
                >
                  <button
                    className="tip-shift-trigger"
                    onClick={() => setOpenShift((cur) => cur === a.shift_id ? null : a.shift_id)}
                    aria-expanded={openShift === a.shift_id}
                  >
                    <span className="tip-shift-date">{fmtDate(a.shift_date)}</span>
                    <span className="tip-shift-pool">pool · {fmtUsd(a.pool_total_cents ?? 0)}</span>
                    <span className="tip-shift-allocated">allocated · {fmtUsd(a.allocated_total_cents ?? 0)}</span>
                    <span className={`tip-shift-status ${a.integrity_pass ? "ok" : "err"}`}>
                      {a.integrity_pass ? "✓ balanced" : "✗ flagged"}
                    </span>
                    <span className="tip-shift-chevron">{openShift === a.shift_id ? "▾" : "▸"}</span>
                  </button>
                  {openShift === a.shift_id && (
                    <div className="tip-shift-drawer">
                      {!a.integrity_pass && a.integrity_notes && (
                        <div className="tip-shift-note">⚠ {a.integrity_notes}</div>
                      )}
                      <table className="tip-alloc-table">
                        <thead>
                          <tr>
                            <th>Employee</th>
                            <th>Role</th>
                            <th style={{ textAlign: "right" }}>Hours</th>
                            <th style={{ textAlign: "right" }}>Share</th>
                            <th style={{ textAlign: "right" }}>Allocated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {a.allocations.map((alloc) => (
                            <tr key={alloc.employee_id}>
                              <td>{alloc.employee_name || alloc.employee_id}</td>
                              <td>{alloc.role}</td>
                              <td style={{ textAlign: "right" }}>{alloc.hours_worked.toFixed(1)}</td>
                              <td style={{ textAlign: "right" }}>{(alloc.hours_share_of_role * 100).toFixed(1)}%</td>
                              <td style={{ textAlign: "right" }}>{fmtUsd(alloc.allocated_cents)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
