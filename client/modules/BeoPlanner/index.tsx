/**
 * BEO Auto-Planner — AI scheduler for banquet events (iter263)
 *
 * Calendar of upcoming BEO days (count per date) → click a date → AI plans
 * every BEO that day, runs cross-event audit, surfaces collisions, orders,
 * and a 24-hour-prep work-back schedule. Times itself.
 *
 * Endpoints: /api/beo-planner/*
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  Calendar, Sparkles, Users, Clock, AlertTriangle, ChefHat, Truck, RefreshCw,
} from "lucide-react";

const API = window.location.origin;

type CalendarResp = {
  days: { date: string; beo_count: number; events: any[]; planned: boolean }[];
};

type DayPlan = {
  date: string;
  beo_count: number;
  per_event_plans: any[];
  cross_event_audit: any;
  audit_model: string;
  audit_elapsed_ms: number;
  total_elapsed_ms: number;
};

export default function BeoPlanner() {
  const [cal, setCal] = useState<CalendarResp | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  const loadCal = useCallback(async () => {
    setCal(await (await fetch(`${API}/api/beo-planner/calendar`)).json());
  }, []);
  useEffect(() => { loadCal(); }, [loadCal]);

  // Live elapsed counter while busy
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setTick(t => t + 1), 250);
    return () => clearInterval(id);
  }, [busy]);

  const planDay = async (date: string, refresh = false) => {
    setActive(date);
    setBusy(true);
    setTick(0);
    const t0 = performance.now();
    try {
      const r = await fetch(`${API}/api/beo-planner/plan-day/${date}?refresh=${refresh}`, { method: "POST" });
      const j = await r.json();
      j.client_elapsed_ms = Math.round(performance.now() - t0);
      setPlan(j);
      await loadCal();
    } catch (e: any) {
      setPlan({ date, beo_count: 0, per_event_plans: [], cross_event_audit: { summary: "Failed: " + e.message }, audit_model: "n/a", audit_elapsed_ms: 0, total_elapsed_ms: 0 });
    } finally { setBusy(false); }
  };

  return (
    <div
      data-testid="beo-planner"
      style={{
        minHeight: "100%",
        background: "var(--aurion-panel-bg, #0a0e17)",
        color: "var(--aurion-text-primary, #e2e8f0)",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <Header />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18, padding: 18, alignItems: "start" }}>
        <CalendarSidebar cal={cal} active={active} busy={busy} onPlan={planDay} />
        <PlanView plan={plan} busy={busy} elapsedTick={tick} />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{ padding: "20px 28px 12px", borderBottom: "1px solid var(--aurion-border)" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          BEO Auto-Planner
        </h1>
        <span style={{ fontSize: 11, color: "var(--aurion-text-muted)", letterSpacing: 1.4, textTransform: "uppercase" }}>
          AI · Prep / Setup / Service / Breakdown · 24-hour prep window
        </span>
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: "var(--aurion-text-secondary)" }}>
        Pick a day. The AI plans every BEO on that date end-to-end, runs a cross-event audit
        (staff/kitchen collisions), and consolidates orders. Time-boxed: each plan runs in seconds.
      </div>
    </div>
  );
}

function CalendarSidebar({ cal, active, busy, onPlan }: {
  cal: CalendarResp | null; active: string | null; busy: boolean;
  onPlan: (date: string, refresh?: boolean) => void;
}) {
  if (!cal) return <div style={{ color: "var(--aurion-text-muted)" }}>Loading calendar…</div>;

  return (
    <aside style={{
      padding: 12, borderRadius: 10,
      background: "var(--aurion-surface-elevated)",
      border: "1px solid var(--aurion-border)",
      maxHeight: "calc(100vh - 160px)", overflow: "auto",
    }}>
      <h3 style={{
        margin: "0 0 10px", fontSize: 11, fontWeight: 700,
        letterSpacing: 1.6, textTransform: "uppercase",
        color: "var(--aurion-text-muted)",
      }}>BEO calendar · {cal.days.length} days</h3>
      <div style={{ display: "grid", gap: 4 }}>
        {cal.days.map(d => {
          const isActive = d.date === active;
          return (
            <button
              key={d.date}
              data-testid={`beo-day-${d.date}`}
              onClick={() => onPlan(d.date)}
              disabled={busy}
              style={{
                textAlign: "left", padding: "8px 10px", borderRadius: 6,
                background: isActive ? "var(--aurion-accent-soft)" : "var(--aurion-surface)",
                border: `1px solid ${isActive ? "var(--aurion-accent)" : "var(--aurion-border)"}`,
                color: "inherit", cursor: busy ? "wait" : "pointer", fontSize: 12,
                display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center",
              }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={12} style={{ color: "var(--aurion-accent)" }} />
                {d.date}
              </span>
              <span style={{ fontWeight: 700, color: "var(--aurion-accent)" }}>
                {d.beo_count}
              </span>
              {d.planned && (
                <span style={{ fontSize: 9, color: "var(--aurion-healthy)",
                              fontWeight: 700, letterSpacing: 1 }}>✓</span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function PlanView({ plan, busy, elapsedTick }: { plan: DayPlan | null; busy: boolean; elapsedTick: number }) {
  if (busy && !plan) {
    return (
      <Card>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Sparkles size={18} style={{ color: "var(--aurion-accent)", animation: "pulse 1.4s infinite" }} />
          <div>
            <strong>AI is planning…</strong>
            <div style={{ fontSize: 12, color: "var(--aurion-text-secondary)" }}>
              Generating prep schedule, staff plan, orders for every BEO + cross-event audit.
              Elapsed: {(elapsedTick * 0.25).toFixed(1)}s
            </div>
          </div>
        </div>
      </Card>
    );
  }
  if (!plan) {
    return (
      <Card>
        <div style={{ color: "var(--aurion-text-muted)", fontSize: 13 }}>
          Select a date on the left to plan all BEOs that day.
        </div>
      </Card>
    );
  }

  const audit = plan.cross_event_audit || {};
  const collisions = audit.collisions || [];
  const consolidated = audit.consolidated_orders || [];
  const recs = audit.recommendations || [];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Timing strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
        <Stat label="Date" value={plan.date} icon={<Calendar size={14} />} />
        <Stat label="BEOs planned" value={plan.beo_count} icon={<ChefHat size={14} />} />
        <Stat label="AI elapsed (total)" value={`${(plan.total_elapsed_ms / 1000).toFixed(1)}s`} icon={<Clock size={14} />} tone="ok" />
        <Stat label="Audit model" value={plan.audit_model || "—"} icon={<Sparkles size={14} />} />
      </div>

      {/* Cross-event audit */}
      <Card title="Cross-event audit">
        {audit.summary && <div style={{ fontSize: 14, marginBottom: 10 }}>{audit.summary}</div>}
        {audit.load_score !== undefined && (
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 11, color: "var(--aurion-text-muted)" }}>Load score </span>
            <strong style={{
              color: audit.load_score >= 0.75 ? "var(--aurion-critical)"
                  : audit.load_score >= 0.5 ? "var(--aurion-watch)" : "var(--aurion-healthy)"
            }}>{(audit.load_score * 100).toFixed(0)}%</strong>
          </div>
        )}

        {collisions.length > 0 ? (
          <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
            {collisions.map((c: any, i: number) => (
              <div key={i} style={{
                padding: "6px 10px", borderRadius: 6, fontSize: 12,
                background: c.severity === "critical" ? "rgba(239,68,68,0.10)" : "rgba(245,158,11,0.10)",
                color: c.severity === "critical" ? "var(--aurion-critical)" : "var(--aurion-watch)",
                border: "1px solid var(--aurion-border)",
              }}>
                <AlertTriangle size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                <strong>{c.window || ""}</strong> · {c.type} · {c.detail}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: "var(--aurion-healthy)", marginBottom: 12 }}>
            ✓ No resource collisions detected.
          </div>
        )}

        {recs.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: "var(--aurion-text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1.4 }}>
              Recommendations
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
              {recs.map((r: string, i: number) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
      </Card>

      {/* Consolidated orders */}
      {consolidated.length > 0 && (
        <Card title={`Consolidated orders · ${consolidated.length}`}>
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead style={{ color: "var(--aurion-text-muted)", textAlign: "left" }}>
              <tr>
                <th style={th}>Vendor</th>
                <th style={th}>Item</th>
                <th style={thNum}>Qty</th>
                <th style={th}>Unit</th>
                <th style={th}>Place by</th>
                <th style={th}>For events</th>
              </tr>
            </thead>
            <tbody>
              {consolidated.map((o: any, i: number) => (
                <tr key={i} style={{ borderTop: "1px solid var(--aurion-border)" }}>
                  <td style={td}>{o.vendor}</td>
                  <td style={td}>{o.sku_or_item}</td>
                  <td style={tdNum}>{o.qty}</td>
                  <td style={td}>{o.unit}</td>
                  <td style={td}>{(o.place_by || "").replace("T", " ")}</td>
                  <td style={td}>{(o.events || []).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Per-event plans */}
      <Card title={`Per-event plans · ${plan.per_event_plans.length}`}>
        <div style={{ display: "grid", gap: 12 }}>
          {plan.per_event_plans.map((p: any) => (
            <PerEventCard key={p.beo_id} entry={p} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function PerEventCard({ entry }: { entry: any }) {
  const p = entry.plan || {};
  const timing = p.timing || {};
  const staffing = p.staffing || [];
  const menu = p.menu_prep || [];
  const orders = p.orders || [];
  const risks = p.risks || [];

  return (
    <div style={{
      padding: 14, borderRadius: 10,
      background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
    }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <strong style={{ color: "var(--aurion-accent)" }}>{entry.beo_id}</strong>
        <span style={{ fontSize: 11, color: "var(--aurion-text-muted)" }}>
          model: {entry.model_used || "—"} · elapsed: {(entry.elapsed_ms / 1000).toFixed(1)}s
        </span>
        {entry.cached && <span style={{ fontSize: 10, color: "var(--aurion-healthy)", letterSpacing: 1 }}>CACHED</span>}
        {entry.degraded && <span style={{ fontSize: 10, color: "var(--aurion-watch)", letterSpacing: 1 }}>DEGRADED</span>}
      </div>
      {p.executive_summary && (
        <div style={{ fontSize: 13, marginBottom: 10 }}>{p.executive_summary}</div>
      )}
      {timing && Object.keys(timing).length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 6, fontSize: 11, marginBottom: 10 }}>
          <KV k="Service" v={`${timing.service_start || ""} → ${timing.service_end || ""}`} />
          <KV k="Prep complete by" v={timing.prep_complete_by} />
          <KV k="Order deadline" v={timing.order_deadline} />
          <KV k="Total minutes" v={timing.total_minutes_to_execute} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <SubList icon={<Users size={12} />} title={`Staffing (${staffing.length})`}
          rows={staffing.map((s: any) => `${s.position} ×${s.count} · ${s.in_time}–${s.out_time}`)} />
        <SubList icon={<ChefHat size={12} />} title={`Menu prep (${menu.length})`}
          rows={menu.map((m: any) => `${m.dish} · ${m.station} · ${m.total_prep_minutes ?? m.prep_minutes_per_100_guests}m`)} />
      </div>
      <div style={{ marginTop: 10 }}>
        <SubList icon={<Truck size={12} />} title={`Orders (${orders.length})`}
          rows={orders.map((o: any) => `${o.vendor} · ${o.sku_or_item} · ${o.qty} ${o.unit || ""} by ${(o.place_by || "").replace("T"," ")}`)} />
      </div>
      {risks.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {risks.map((r: string, i: number) => (
            <div key={i} style={{ fontSize: 11, color: "var(--aurion-watch)" }}>⚠ {r}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function SubList({ icon, title, rows }: { icon: React.ReactNode; title: string; rows: string[] }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--aurion-text-muted)", textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
        {icon} {title}
      </div>
      <ul style={{ margin: 0, padding: "0 0 0 14px", fontSize: 12, lineHeight: 1.6 }}>
        {rows.slice(0, 8).map((r, i) => <li key={i}>{r}</li>)}
        {rows.length > 8 && <li style={{ color: "var(--aurion-text-muted)" }}>+{rows.length - 8} more…</li>}
      </ul>
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section style={{
      padding: 16, borderRadius: 10,
      background: "var(--aurion-surface-elevated)",
      border: "1px solid var(--aurion-border)",
    }}>
      {title && (
        <h3 style={{
          margin: "0 0 12px", fontSize: 11, fontWeight: 700,
          letterSpacing: 1.6, textTransform: "uppercase",
          color: "var(--aurion-text-muted)",
        }}>{title}</h3>
      )}
      {children}
    </section>
  );
}

function Stat({ label, value, icon, tone }: {
  label: string; value: any; icon?: React.ReactNode; tone?: "ok" | "warn";
}) {
  const color = tone === "warn" ? "var(--aurion-watch)" : tone === "ok" ? "var(--aurion-healthy)" : "var(--aurion-accent)";
  return (
    <div style={{
      padding: 12, borderRadius: 10,
      background: "var(--aurion-surface)",
      border: "1px solid var(--aurion-border)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6,
                    fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4,
                    color: "var(--aurion-text-muted)", marginBottom: 4 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>{value ?? "—"}</div>
    </div>
  );
}
function KV({ k, v }: { k: string; v: any }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0",
                  borderBottom: "1px dashed var(--aurion-border)", fontSize: 11 }}>
      <span style={{ color: "var(--aurion-text-muted)" }}>{k}</span>
      <span style={{ fontWeight: 600 }}>{v ?? "—"}</span>
    </div>
  );
}
const th: React.CSSProperties = { padding: "6px 8px", fontWeight: 500, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 };
const thNum: React.CSSProperties = { ...th, textAlign: "right" };
const td: React.CSSProperties = { padding: "8px" };
const tdNum: React.CSSProperties = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };
