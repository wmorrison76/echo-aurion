/**
 * Admin Daily Ops Dashboard (iter263.5)
 *
 * What an admin / IT / GM actually needs at 7am every day, on one screen.
 * Consumes /api/ops-daily/snapshot and routes one-click to the right panel.
 */
import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle, ChefHat, Truck, Users, Activity, ArrowRight, RefreshCw,
  Clock, ShoppingCart, LifeBuoy, Server, ScanLine, Award,
} from "lucide-react";

const API = window.location.origin;

type Highlight = { severity: "high" | "warn" | "info"; label: string; panel: string };

type Snapshot = {
  date: string;
  generated_at: string;
  highlights: Highlight[];
  today: { beos: any[]; beo_plan: any; prep_due_today: any[]; order_due_today: any[] };
  last_24h: { ird_orders: number; ird_orders_test: number; spa_bookings: number; audit_events: number };
  active_users_60m: number;
  support: { open_tickets: number };
  rollout: any;
  integrations: { items: any[]; healthy: number; total: number };
  purchrec: { match_exceptions: number; value_at_risk_usd: number; contract_violations: number; contract_overcharge_usd: number };
};

export default function AdminDailyDashboard() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [busy, setBusy] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/ops-daily/snapshot`);
      setData(await r.json());
    } finally { setBusy(false); }
  }, []);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  if (busy && !data) return <Loading />;
  if (!data) return <Empty msg="Snapshot unavailable" />;

  return (
    <div data-testid="admin-daily-dashboard" style={shell}>
      <Header date={data.date} generated={data.generated_at} onRefresh={load} />
      <div style={{ padding: "18px 28px 48px" }}>
        <Highlights items={data.highlights} />
        <SnapshotGrid data={data} />
        <BeoToday data={data} />
        <Integrations data={data} />
      </div>
    </div>
  );
}

function Header({ date, generated, onRefresh }: { date: string; generated: string; onRefresh: () => void }) {
  return (
    <div style={headStyle}>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          Admin · Daily Operations
        </h1>
        <span style={{ fontSize: 11, color: "var(--aurion-text-muted)", letterSpacing: 1.4, textTransform: "uppercase" }}>
          {date} · {new Date(generated).toLocaleTimeString()}
        </span>
        <button data-testid="ops-refresh" onClick={onRefresh} style={iconBtn}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: "var(--aurion-text-secondary)" }}>
        Everything you need to run the platform today — collisions, deadlines firing today, integrations health, exposure.
      </div>
    </div>
  );
}

function Highlights({ items }: { items: Highlight[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <div style={{ color: "var(--aurion-healthy)", fontWeight: 700, fontSize: 14 }}>
          ✓ No urgent attention items. Platform is calm.
        </div>
      </Card>
    );
  }
  return (
    <Card title={`Action items · ${items.length}`}>
      <div style={{ display: "grid", gap: 8 }}>
        {items.map((h, i) => (
          <a key={i} href={`/panel/${h.panel}`}
             data-testid={`hl-${h.panel}-${i}`}
             style={{
               display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center",
               padding: "10px 14px", borderRadius: 10, textDecoration: "none",
               background:
                 h.severity === "high" ? "rgba(239,68,68,0.12)" :
                 h.severity === "warn" ? "rgba(245,158,11,0.12)" : "rgba(96,165,250,0.10)",
               border: "1px solid var(--aurion-border)",
               color: "inherit",
             }}>
            <AlertTriangle size={16} color={
              h.severity === "high" ? "var(--aurion-critical)" :
              h.severity === "warn" ? "var(--aurion-watch)" : "var(--aurion-accent)"
            } />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{h.label}</span>
            <ArrowRight size={14} style={{ color: "var(--aurion-text-muted)" }} />
          </a>
        ))}
      </div>
    </Card>
  );
}

function SnapshotGrid({ data }: { data: Snapshot }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 14 }}>
      <Stat label="BEOs today" value={data.today.beos.length} icon={<ChefHat size={14} />} link="/panel/beo-planner" />
      <Stat label="Prep deadlines today" value={data.today.prep_due_today.length} icon={<Clock size={14} />} tone={data.today.prep_due_today.length > 0 ? "warn" : "ok"} link="/panel/beo-planner" />
      <Stat label="Order deadlines today" value={data.today.order_due_today.length} icon={<Truck size={14} />} tone={data.today.order_due_today.length > 0 ? "warn" : "ok"} link="/panel/purchrec-sprint1" />
      <Stat label="IRD orders · 24h" value={data.last_24h.ird_orders} icon={<ShoppingCart size={14} />} link="/panel/ird-builder" />
      <Stat label="Spa bookings · 24h" value={data.last_24h.spa_bookings} icon={<Activity size={14} />} link="/panel/spa-builder" />
      <Stat label="Active users · 60m" value={data.active_users_60m} icon={<Users size={14} />} link="/panel/admin-console" />
      <Stat label="Support tickets open" value={data.support.open_tickets} icon={<LifeBuoy size={14} />} tone={data.support.open_tickets > 0 ? "warn" : "ok"} link="/panel/admin-console" />
      <Stat label="Match exceptions" value={data.purchrec.match_exceptions} icon={<ScanLine size={14} />} tone={data.purchrec.match_exceptions > 0 ? "warn" : "ok"} link="/panel/purchrec-sprint1" />
      <Stat label="Value at risk" value={`$${(data.purchrec.value_at_risk_usd || 0).toLocaleString()}`} icon={<AlertTriangle size={14} />} tone={data.purchrec.value_at_risk_usd > 0 ? "warn" : "ok"} link="/panel/purchrec-sprint1" />
      <Stat label="Contract violations" value={data.purchrec.contract_violations} icon={<Award size={14} />} tone={data.purchrec.contract_violations > 0 ? "warn" : "ok"} link="/panel/vendor-scorecard" />
    </div>
  );
}

function BeoToday({ data }: { data: Snapshot }) {
  const beos = data.today.beos;
  if (beos.length === 0) {
    return (
      <Card title="Today's BEOs">
        <div style={{ color: "var(--aurion-text-muted)", fontSize: 13 }}>No BEOs scheduled for today.</div>
      </Card>
    );
  }
  return (
    <Card title={`Today's BEOs · ${beos.length}`}>
      <div style={{ display: "grid", gap: 6 }}>
        {beos.map((b: any) => (
          <div key={b.id} style={{
            display: "grid", gridTemplateColumns: "1fr 100px 80px auto", gap: 10, alignItems: "center",
            padding: "8px 12px", borderRadius: 8,
            background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
            fontSize: 13,
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>{b.event_name}</div>
              {b.client_name && <div style={{ fontSize: 11, color: "var(--aurion-text-muted)" }}>{b.client_name}</div>}
            </div>
            <span style={{ fontSize: 11, color: "var(--aurion-text-muted)" }}>{b.start_time || "—"}</span>
            <span style={{ fontWeight: 700, color: "var(--aurion-accent)" }}>{b.guest_count || "?"}g</span>
            <a href="/panel/beo-planner" style={linkBtn}>Plan <ArrowRight size={12} /></a>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Integrations({ data }: { data: Snapshot }) {
  const items = data.integrations.items || [];
  return (
    <Card title={`Integrations · ${data.integrations.healthy}/${data.integrations.total} healthy`}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
        {items.map((it: any) => (
          <div key={it.id} style={{
            padding: 10, borderRadius: 8,
            background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
            fontSize: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{
                width: 8, height: 8, borderRadius: 4,
                background: it.status === "ok" ? "var(--aurion-healthy)"
                          : it.status === "partial" ? "var(--aurion-watch)" : "var(--aurion-critical)",
              }} />
              <strong>{it.name}</strong>
              <span style={{ marginLeft: "auto", fontSize: 9, letterSpacing: 1, textTransform: "uppercase",
                              color: "var(--aurion-text-muted)" }}>{it.status}</span>
            </div>
            <div style={{ marginTop: 4, color: "var(--aurion-text-secondary)" }}>{it.note}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ════════ primitives ════════
function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section style={{
      padding: 16, borderRadius: 10, marginBottom: 14,
      background: "var(--aurion-surface-elevated)", border: "1px solid var(--aurion-border)",
    }}>
      {title && (
        <h3 style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700,
                      letterSpacing: 1.6, textTransform: "uppercase",
                      color: "var(--aurion-text-muted)" }}>{title}</h3>
      )}
      {children}
    </section>
  );
}
function Stat({ label, value, icon, tone, link }: {
  label: string; value: any; icon?: React.ReactNode; tone?: "ok" | "warn"; link?: string;
}) {
  const color = tone === "warn" ? "var(--aurion-watch)" : tone === "ok" ? "var(--aurion-healthy)" : "var(--aurion-accent)";
  const Wrap: any = link ? "a" : "div";
  return (
    <Wrap href={link} style={{
      padding: 14, borderRadius: 10, textDecoration: "none", color: "inherit",
      background: "var(--aurion-surface)", border: "1px solid var(--aurion-border)",
      display: "block",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6,
                    fontSize: 10, textTransform: "uppercase", letterSpacing: 1.4,
                    color: "var(--aurion-text-muted)", marginBottom: 6 }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value ?? "—"}</div>
    </Wrap>
  );
}
function Loading() { return <div style={{ padding: 40, textAlign: "center", color: "var(--aurion-text-muted)" }}>Loading…</div>; }
function Empty({ msg }: { msg: string }) { return <div style={{ padding: 40, textAlign: "center", color: "var(--aurion-text-muted)" }}>{msg}</div>; }

const shell: React.CSSProperties = { minHeight: "100%", background: "var(--aurion-panel-bg, #0a0e17)", color: "var(--aurion-text-primary, #e2e8f0)", fontFamily: "system-ui, sans-serif" };
const headStyle: React.CSSProperties = { padding: "20px 28px 12px", borderBottom: "1px solid var(--aurion-border)" };
const iconBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, background: "transparent", border: "1px solid var(--aurion-border)", color: "var(--aurion-text-secondary)", cursor: "pointer", fontSize: 11 };
const linkBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 3, padding: "4px 10px", borderRadius: 6, background: "var(--aurion-accent-soft)", border: "1px solid var(--aurion-accent)", color: "var(--aurion-accent)", textDecoration: "none", fontSize: 11, fontWeight: 600 };
