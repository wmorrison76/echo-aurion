/** iter235 · Dashboard tab — outlet picker + live KPIs at a glance.
 *
 * Replaces the quick-launch Dashboard tile. Loads based on user profile
 * (chef-william → culinary default outlet). Outlet selector at top so the
 * chef can switch restaurants without leaving the Dashboard view.
 */
import React from "react";
import { API } from "@/lib/api-url";

export function DashboardTab({ outletId, onSwitchOutlet }: {
  outletId: string;
  onSwitchOutlet: (id: string) => void;
}) {
  const [outlets, setOutlets] = React.useState<any[]>([]);
  const [kpis, setKpis] = React.useState<any>(null);
  const [occ, setOcc] = React.useState<any>(null);
  const [activity, setActivity] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [lastRefreshAt, setLastRefreshAt] = React.useState<Date | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [outletsR, pnlR, occR, actR] = await Promise.all([
        fetch(`${API()}/api/echoaurium/outlets`, { headers: { "X-User-Id": "chef-william" } }).then((r) => r.json()),
        fetch(`${API()}/api/echoaurium/pnl/full?outlet_id=${outletId}&period=2026-03`).then((r) => r.json()),
        fetch(`${API()}/api/echoaurium/pnl/occupancy?period=2026-03`).then((r) => r.json()),
        fetch(`${API()}/api/ecw-ops/activity?outlet_id=${outletId}&limit=6`).then((r) => r.json()),
      ]);
      setOutlets(outletsR?.rows || []);
      setKpis(pnlR?.kpis || null);
      setOcc(occR?.occupancy || null);
      setActivity(actR?.rows || []);
      setLastRefreshAt(new Date());
    } finally { setLoading(false); }
  }, [outletId]);

  React.useEffect(() => { void load(); }, [load]);

  return (
    <div data-testid="dashboard-tab-root" style={{ padding: 16 }}>
      {/* Outlet picker */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>
          Current outlet
        </div>
        <div data-testid="dashboard-outlet-scroller" style={{
          display: "flex", gap: 6, overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none" as any, msOverflowStyle: "none" as any,
          paddingBottom: 2,
        }}>
          <style>{`[data-testid='dashboard-outlet-scroller']::-webkit-scrollbar{display:none;height:0;}`}</style>
          {outlets.map((o) => (
            <button key={o.id} data-testid={`dashboard-outlet-${o.id}`}
              onClick={() => onSwitchOutlet(o.id)}
              style={{
                flex: "0 0 auto", padding: "7px 14px", borderRadius: 999,
                background: o.id === outletId ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.02)",
                border: `1px solid ${o.id === outletId ? "rgba(212,175,55,0.55)" : "rgba(148,163,184,0.15)"}`,
                color: o.id === outletId ? "#d4af37" : "#cbd5e1",
                fontSize: 11, fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap",
              }}>
              {o.name}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ padding: 24, textAlign: "center", color: "#64748b", fontSize: 12 }}>Loading…</div>}

      {/* KPI tiles */}
      {kpis && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
          <KpiCard label="Revenue" value={`$${(kpis.total_revenue || 0).toLocaleString()}`} color="#d4af37" />
          <KpiCard label="Food %" value={`${kpis.food_cost_pct ?? "—"}%`}
            color={kpis.food_cost_pct > 28 ? "#f43f5e" : "#10b981"} />
          <KpiCard label="Labor %" value={`${kpis.labor_cost_pct ?? "—"}%`}
            color={kpis.labor_cost_pct > 32 ? "#f43f5e" : "#10b981"} />
          <KpiCard label="Prime %" value={`${kpis.prime_cost_pct ?? "—"}%`}
            color={kpis.prime_cost_pct > 55 ? "#f43f5e" : kpis.prime_cost_pct > 50 ? "#fbbf24" : "#10b981"} />
        </div>
      )}

      {/* Occupancy strip */}
      {occ && (
        <div data-testid="dashboard-occupancy" style={{
          padding: "10px 12px", marginBottom: 14, borderRadius: 8,
          background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)",
        }}>
          <div style={{ fontSize: 9, letterSpacing: 2, color: "#93c5fd", marginBottom: 6 }}>Resort · Occupancy</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
            <MiniStat label="Occ" value={`${occ.occupancy_pct}%`} />
            <MiniStat label="Rooms" value={occ.occupied_rooms?.toLocaleString()} />
            <MiniStat label="ADR" value={`$${Math.round(occ.adr || 0)}`} />
            <MiniStat label="RevPAR" value={`$${Math.round(occ.revpar || 0)}`} />
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div data-testid="dashboard-activity">
        <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", marginBottom: 6, textTransform: "uppercase" }}>
          Recent activity
        </div>
        {activity.length === 0 ? (
          <div style={{ padding: 14, color: "#64748b", fontSize: 12, textAlign: "center" }}>No recent events.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {activity.map((e) => (
              <div key={e.id} style={{
                padding: "8px 10px", borderRadius: 6,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(148,163,184,0.1)",
                fontSize: 11, color: "#cbd5e1",
              }}>
                <div style={{ color: "#f5efe4", fontWeight: 500 }}>{e.title}</div>
                {e.detail && <div style={{ color: "#94a3b8", marginTop: 2 }}>{e.detail}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {lastRefreshAt && (
        <div style={{ fontSize: 9, color: "#64748b", marginTop: 14, textAlign: "center", letterSpacing: 1 }}>
          Updated {lastRefreshAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div data-testid={`dash-kpi-${label.toLowerCase().replace(/\s|%/g, "-")}`}
      style={{
        padding: "12px 14px", borderRadius: 8,
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(148,163,184,0.15)",
      }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color, marginTop: 4, fontFamily: "monospace" }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 12, color: "#f5efe4", fontFamily: "monospace", marginTop: 2, fontWeight: 500 }}>{value}</div>
    </div>
  );
}
