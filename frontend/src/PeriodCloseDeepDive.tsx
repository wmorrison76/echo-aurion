import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { get, fmtNum } from "./api";

type AnyObj = Record<string, any>;

interface DrillEntity {
  id: string;
  type: string;
  label: string;
}

const DRILL_OPTIONS: DrillEntity[] = [
  { id: "budget-may", type: "budget", label: "May Budget" },
  { id: "p66demo-galley", type: "outlet", label: "Galley · Outlet" },
  { id: "p66demo-pier-club", type: "outlet", label: "Pier Club · Outlet" },
  { id: "p66demo-banquet", type: "outlet", label: "Banquet · Outlet" },
];

/**
 * Map an audit event back to its source-entity deep-dive.
 * Per doctrine §1.1 — every number → its event → its origin entity → its owner.
 * Returns { href, label } — href is null when no route exists yet.
 */
function eventLink(
  event: AnyObj,
  propertyId: string
): { href: string | null; label: string } {
  const payload = event.payload || {};
  const etype = (payload.entity_type || event.entity_type || "").toLowerCase();
  const eid = payload.entity_id || event.entity_id;
  const outletId = payload.outlet_id;
  const propId = payload.property_id || propertyId;

  // Known mappings
  if (etype === "outlet" || (event.source === "outlet_capture_events" && outletId)) {
    return {
      href: `/dashboard/outlet/${propId}/${outletId || eid}`,
      label: "view outlet capture →",
    };
  }
  if (etype === "budget") {
    return {
      href: `/dashboard/period-close/${propId}`,
      label: "view period close →",
    };
  }
  if (etype === "forecast" || event.source === "outlet_capture_forecasts") {
    return {
      href: `/dashboard/forecast-21/${propId}`,
      label: "view 21-day forecast →",
    };
  }
  if (etype === "menu_item" || etype === "menu_engineering") {
    return {
      href: `/dashboard/menu-engineering/${propId}`,
      label: "view menu engineering →",
    };
  }
  if (etype === "tip_share_config" || etype === "tip_audit") {
    return {
      href: `/dashboard/tip-audit/${propId}`,
      label: "view tip audit →",
    };
  }
  if (etype === "lifecycle_run" && eid) {
    return {
      href: `/dashboard/period-close/${propId}`,
      label: "view lifecycle run →",
    };
  }
  // Unknown type — no link, but surface the entity coordinates so the user
  // sees the §1.1 fact that the event has provenance even without a UI yet.
  return { href: null, label: etype ? `${etype}/${eid || "—"}` : "no entity coordinates" };
}

export default function PeriodCloseDeepDive() {
  const { propertyId = "pier-sixty-six-demo" } = useParams();
  const [run, setRun] = useState<AnyObj | null>(null);
  const [drillEntity, setDrillEntity] = useState<DrillEntity>(DRILL_OPTIONS[0]);
  const [drill, setDrill] = useState<AnyObj | null>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Load the Monthly P&L Close run
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    get(`/api/lifecycles/runs/property/${propertyId}`)
      .then((data: AnyObj) => {
        if (cancelled) return;
        const closeRun = (data?.runs || []).find(
          (r: AnyObj) => r.project_type === "monthly_pnl_close"
        );
        if (!closeRun) {
          setErr("No P&L Close run for this property");
        } else {
          setRun(closeRun);
        }
      })
      .catch((e) => {
        if (!cancelled) setErr(String(e?.message || e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  // Load the why-changed drill whenever the entity changes
  useEffect(() => {
    let cancelled = false;
    setDrillLoading(true);
    get(
      `/api/why-changed/drill?entity_type=${drillEntity.type}&entity_id=${drillEntity.id}`
    )
      .then((d) => {
        if (!cancelled) setDrill(d);
      })
      .catch(() => {
        if (!cancelled) setDrill(null);
      })
      .finally(() => {
        if (!cancelled) setDrillLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [drillEntity]);

  if (loading) {
    return (
      <div className="boot">
        <div className="boot-mark">·</div>
      </div>
    );
  }
  if (err || !run) {
    return (
      <div className="app-shell">
        <div className="drilldown">
          <Link to={`/dashboard/live/${propertyId}`} className="crumb">
            <i className="fa-solid fa-arrow-left" /> back to live
          </Link>
          <div className="err-card">{err || "no close run found"}</div>
        </div>
      </div>
    );
  }

  const steps: AnyObj[] = run.steps || [];
  const stepsTotal = steps.length;
  const stepsComplete = steps.filter((s) => s.status === "complete").length;
  const stepsDue = steps.filter(
    (s) => s.status !== "complete" && s.due_date
  );
  const progressPct = stepsTotal ? stepsComplete / stepsTotal : 0;
  const mandatoryCount = steps.filter((s) => s.type === "Mandatory").length;
  const ownerCount = steps.filter((s) => s.type === "Owner").length;
  const today = new Date().toISOString().slice(0, 10);

  // Step badges
  const statusClass = (status: string, due: string) => {
    if (status === "complete") return "done";
    if (status === "in_progress") return "due";
    if (due && due < today) return "overdue";
    if (due === today) return "due";
    return "upcoming";
  };
  const statusLabel = (status: string, due: string) => {
    if (status === "complete") return "complete";
    if (status === "in_progress") return "in progress";
    if (due && due < today) return "overdue";
    if (due === today) return "due today";
    return "upcoming";
  };

  return (
    <div className="app-shell">
      <div className="app-banner">
        <div className="brand">
          <Link
            to={`/dashboard/live/${propertyId}`}
            className="crumb"
            style={{ marginBottom: 0 }}
            data-testid="back-to-live"
          >
            <i className="fa-solid fa-arrow-left" />
          </Link>
          <span className="brand-mark">{run.title}</span>
          <span className="brand-sub">
            {run.project_type_label} · template {run.template_id} v
            {run.template_version}
          </span>
        </div>
        <div className="banner-meta">
          <span>
            <span
              className={`status-dot ${
                run.status === "in_flight" ? "warn" : "ok"
              }`}
            />
            {run.status?.replace(/_/g, " ") || "—"}
          </span>
          <span>
            anchor · <strong>{run.anchor_date}</strong>
          </span>
          <span>
            lead · <strong>{run.project_lead}</strong>
          </span>
        </div>
      </div>

      <div className="drilldown">
        <div className="section-title">May 2026 P&amp;L Close</div>
        <div className="section-sub">
          {stepsComplete} of {stepsTotal} steps complete · {ownerCount} owner steps,{" "}
          {mandatoryCount} mandatory meeting{mandatoryCount === 1 ? "" : "s"} ·{" "}
          {fmtNum(stepsDue.length)} step{stepsDue.length === 1 ? "" : "s"} pending
        </div>

        {/* KPI row */}
        <div className="kpi-row">
          <div className="kpi-card">
            <div className="kpi-label">Close Progress</div>
            <div className="kpi-value">
              {(progressPct * 100).toFixed(0)}%
            </div>
            <div className="kpi-meta">
              {stepsComplete}/{stepsTotal} steps
            </div>
            <div className="bar" style={{ marginTop: 10 }}>
              <span style={{ width: `${progressPct * 100}%` }} />
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Owner-Driven</div>
            <div className="kpi-value">{ownerCount}</div>
            <div className="kpi-meta">owner steps · §2.5 framing</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Mandatory Meetings</div>
            <div className="kpi-value">{mandatoryCount}</div>
            <div className="kpi-meta">internal P&amp;L · owner's deck</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Anchor</div>
            <div className="kpi-value" style={{ fontSize: 18 }}>
              {run.anchor_date}
            </div>
            <div className="kpi-meta">{run.anchor_label?.replace(/_/g, " ")}</div>
          </div>
        </div>

        <div className="callout">
          The May close is the customer's actual close, encoded as the editable
          default template. Each owner role, each due date, each mandatory meeting —
          appended immutably. Move a date and the chain of events that built it
          surfaces in the Why-Changed drill.
        </div>

        <div className="split">
          {/* Step ladder */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Step Ladder</div>
              <span className="eyebrow">type · owner · due</span>
            </div>
            <div className="lc-list" style={{ gap: 10 }}>
              {steps.map((s) => (
                <div
                  key={s.step_id}
                  className="lc-row"
                  style={{ paddingTop: 10, paddingBottom: 10 }}
                  data-testid={`pnl-step-${s.step_id}`}
                >
                  <span
                    className={`lc-dot ${statusClass(s.status, s.due_date)}`}
                    style={{ width: 8, height: 8 }}
                  />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span className="lc-title" style={{ fontWeight: 500 }}>
                      {s.title}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--dim)", fontFamily: "JetBrains Mono, monospace" }}>
                      {s.type} · {s.owner_role} · due {s.due_date}
                    </span>
                  </div>
                  <span
                    className="lc-meta"
                    style={{
                      color:
                        s.status === "complete"
                          ? "var(--green)"
                          : statusClass(s.status, s.due_date) === "overdue"
                          ? "var(--red)"
                          : "var(--amber)",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    {statusLabel(s.status, s.due_date)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Why-Changed drill */}
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title">Why Changed · §1.1 Drill</div>
              <span className="eyebrow">cross-collection events</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
              {DRILL_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setDrillEntity(opt)}
                  data-testid={`drill-pick-${opt.id}`}
                  className="btn"
                  style={{
                    fontSize: 10,
                    padding: "6px 12px",
                    background: drillEntity.id === opt.id ? "var(--gold)" : "transparent",
                    color: drillEntity.id === opt.id ? "var(--bg-deep)" : "var(--gold)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {drillLoading && (
              <div style={{ fontSize: 12, color: "var(--dim)" }}>loading drill…</div>
            )}

            {!drillLoading && drill && (
              <>
                <div style={{ fontSize: 11, color: "var(--dim)", marginBottom: 10, fontFamily: "JetBrains Mono, monospace" }}>
                  {drill.count} event{drill.count === 1 ? "" : "s"} since{" "}
                  {drill.since?.slice(0, 10)} · {drillEntity.type}/{drillEntity.id}
                </div>
                {drill.count === 0 ? (
                  <div className="src-tag">
                    <span className="dot fallback" /> no events recorded for this entity in window — clean lineage
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {(drill.events || []).slice(0, 6).map((e: AnyObj, i: number) => {
                      const link = eventLink(e, propertyId);
                      const inner = (
                        <div
                          style={{
                            borderLeft: "2px solid var(--gold)",
                            paddingLeft: 12,
                            paddingTop: 6,
                            paddingBottom: 6,
                            paddingRight: 8,
                            transition: "background 0.3s var(--bezier)",
                            borderRadius: "0 2px 2px 0",
                          }}
                          className={link.href ? "drill-event-link" : ""}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span className="signal-pill" style={{ margin: 0 }}>
                              {e.source}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--dim)", fontFamily: "JetBrains Mono, monospace" }}>
                              {e.ts?.slice(0, 16).replace("T", " ")}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: "var(--cream)", lineHeight: 1.5 }}>
                            {e.summary || e.event_type}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6, gap: 12 }}>
                            <span style={{ fontSize: 10, color: "var(--dim)", fontFamily: "JetBrains Mono, monospace" }}>
                              {(e.payload?.actor || e.actor) ? `by ${e.payload?.actor || e.actor}` : ""}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                fontFamily: "JetBrains Mono, monospace",
                                color: link.href ? "var(--gold)" : "var(--dim2)",
                                fontWeight: 600,
                                letterSpacing: "0.04em",
                              }}
                            >
                              {link.label}
                            </span>
                          </div>
                        </div>
                      );
                      return link.href ? (
                        <Link
                          key={i}
                          to={link.href}
                          style={{ textDecoration: "none", color: "inherit" }}
                          data-testid={`event-link-${i}`}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div key={i} data-testid={`event-static-${i}`}>{inner}</div>
                      );
                    })}
                    {drill.events?.length > 6 && (
                      <div style={{ fontSize: 11, color: "var(--dim)", fontStyle: "italic" }}>
                        and {drill.events.length - 6} more events…
                      </div>
                    )}
                  </div>
                )}
                {drill.narrative && (
                  <div className="src-tag" style={{ marginTop: 14 }}>
                    <span className="dot live" /> {drill.narrative.slice(0, 110)}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer doctrine */}
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
          <span>§3.1 · append-only · every step transition + entity edit persists immutably</span>
          <span>run · {run.run_id} · updated {run.updated_at?.slice(0, 16).replace("T", " ")}</span>
        </div>
      </div>
    </div>
  );
}
