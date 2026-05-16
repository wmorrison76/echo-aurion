import React, { useState, useEffect } from "react";
const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#f59e0b", green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", purple: "#8b5cf6", cyan: "#06b6d4", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };
const pct = (n: number) => `${(n || 0).toFixed(1)}%`;
function Badge({ text, color }: { text: string; color: string }) { return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>; }

export default function ChefDailyReport() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/daily-reports/chef-daily`).then(r => r.json()).then(setData); }, []);
  if (!data) return <div data-testid="chef-daily-panel" style={{ height: "100%", background: C.bg, padding: 40, textAlign: "center", color: C.dim, borderRadius: 10 }}>Loading Chef Report...</div>;

  const cov = data.covers;
  const costs = data.costs;
  const prep = data.prep;
  const staff = data.staffing;

  return (
    <div data-testid="chef-daily-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(245,158,11,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>Chef Daily Report</div>
          <div style={{ fontSize: 10, color: C.dim }}>{data.report_date} | Generated: {data.report_time} UTC</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {data.eighty_sixed.length > 0 && <Badge text={`${data.eighty_sixed.length} 86'd`} color={C.red} />}
          {prep.behind_items.length > 0 && <Badge text={`${prep.behind_items.length} behind`} color={C.amber} />}
          {staff.callouts > 0 && <Badge text={`${staff.callouts} callouts`} color={C.red} />}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {/* ── Cost KPIs ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 16 }}>
          {[
            { l: "Food Cost", v: pct(costs.food_cost_pct), t: pct(costs.food_cost_target), ok: costs.food_cost_pct <= costs.food_cost_target },
            { l: "Labor Cost", v: pct(costs.labor_cost_pct), t: pct(costs.labor_cost_target), ok: costs.labor_cost_pct <= costs.labor_cost_target },
            { l: "Prime Cost", v: pct(costs.prime_cost_pct), t: pct(costs.prime_cost_target), ok: costs.prime_cost_pct <= costs.prime_cost_target },
            { l: "Cost/Cover", v: `$${costs.cost_per_cover}`, t: "", ok: true },
            { l: "Rev/Cover", v: `$${costs.revenue_per_cover}`, t: "", ok: true },
            { l: "Waste Today", v: `${costs.waste_today_lbs} lbs`, t: `${costs.waste_target_lbs} lbs`, ok: costs.waste_today_lbs <= costs.waste_target_lbs },
          ].map(kpi => (
            <div key={kpi.l} style={{ background: C.card, border: `1px solid ${kpi.ok ? C.border : C.red}40`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", marginBottom: 4, letterSpacing: "0.06em" }}>{kpi.l}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: kpi.ok ? C.text : C.red, fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.v}</div>
              {kpi.t && <div style={{ fontSize: 9, color: kpi.ok ? C.green : C.red }}>Target: {kpi.t}</div>}
            </div>
          ))}
        </div>

        {/* ── Covers Forecast ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>Cover Forecast vs Actual</div>
            {["breakfast", "lunch", "dinner", "ird", "banquet"].map(meal => {
              const m = cov[meal] || {};
              const pctDone = m.forecast > 0 ? Math.round((m.actual / m.forecast) * 100) : 0;
              return (
                <div key={meal} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.border}20` }}>
                  <span style={{ fontSize: 11, color: C.text, fontWeight: 600, width: 70, textTransform: "capitalize" }}>{meal}</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 4, background: `${C.border}60`, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(100, pctDone)}%`, borderRadius: 4, background: pctDone >= 80 ? C.green : pctDone >= 50 ? C.amber : C.blue, transition: "width 0.3s" }} />
                  </div>
                  <span style={{ fontSize: 10, color: C.dim, width: 50, textAlign: "right" }}>{m.actual}/{m.forecast}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: pctDone >= 80 ? C.green : C.amber, width: 35, fontFamily: "'IBM Plex Mono', monospace" }}>{pctDone}%</span>
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "4px 0", borderTop: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>Total Forecast</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{cov.total_forecast} covers</span>
            </div>
          </div>

          {/* 86'd Items */}
          <div style={{ background: C.card, border: `1px solid ${data.eighty_sixed.length > 0 ? C.red : C.border}40`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: data.eighty_sixed.length > 0 ? C.red : C.accent, marginBottom: 8, textTransform: "uppercase" }}>86'd Items ({data.eighty_sixed.length})</div>
            {data.eighty_sixed.map((item: any, i: number) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}20` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.red }}>{item.item}</span>
                  <Badge text={item.outlet} color={C.blue} />
                </div>
                <div style={{ fontSize: 10, color: C.dim }}>{item.reason}</div>
                <div style={{ fontSize: 10, color: C.green, marginTop: 2 }}>Expected back: {item.expected_back}</div>
              </div>
            ))}
            {data.eighty_sixed.length === 0 && <div style={{ fontSize: 11, color: C.green, textAlign: "center", padding: 20 }}>All items available</div>}
          </div>
        </div>

        {/* ── Allergen Alerts + BEO ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
          {/* Allergen Alerts */}
          <div data-testid="chef-allergen-alerts" style={{ background: C.card, border: `1px solid ${C.red}30`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.red, marginBottom: 8, textTransform: "uppercase" }}>Allergen Alerts — In-House Guests ({data.allergen_summary.total_guests_with_allergens})</div>
            {data.allergen_summary.guests.map((g: any) => (
              <div key={g.room_number} style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{g.first_name} {g.last_name} <span style={{ color: C.dim }}>Rm {g.room_number}</span></span>
                  {g.vip && <Badge text="VIP" color={C.amber} />}
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 3 }}>
                  {(g.allergens || []).map((a: string) => <Badge key={a} text={a} color={C.red} />)}
                  {(g.dietary_restrictions || []).map((d: string) => <Badge key={d} text={d} color={C.purple} />)}
                </div>
              </div>
            ))}
          </div>

          {/* BEO Events */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>BEO — Today's Events ({data.beo_events.length})</div>
            {data.beo_events.map((e: any, i: number) => (
              <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}20` }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{e.event}</span>
                  <Badge text={e.status} color={C.green} />
                </div>
                <div style={{ fontSize: 10, color: C.dim }}>{e.time} | {e.covers} covers | {e.menu_type}</div>
                <div style={{ fontSize: 10, color: C.amber, marginTop: 2 }}>Dietary: {e.dietary_notes}</div>
                {e.chef_notes && <div style={{ fontSize: 10, color: C.cyan, marginTop: 2, fontStyle: "italic" }}>{e.chef_notes}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Prep Counts + Staffing ── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 16 }}>
          {/* Prep by Station */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase" }}>Prep Counts by Station</div>
              <div style={{ fontSize: 10 }}>
                <span style={{ color: C.green, fontWeight: 600 }}>{prep.completion_pct}%</span>
                <span style={{ color: C.dim }}> complete ({prep.total_prepped}/{prep.total_par})</span>
              </div>
            </div>
            {prep.stations.map((station: any) => (
              <div key={station.station} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.blue, textTransform: "uppercase", marginBottom: 4 }}>{station.station}</div>
                {station.items.map((item: any) => (
                  <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                    <span style={{ fontSize: 10, color: C.text, width: 140 }}>{item.name}</span>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: `${C.border}60`, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (item.prepped / item.par) * 100)}%`, borderRadius: 3, background: item.status === "ok" ? C.green : C.amber }} />
                    </div>
                    <span style={{ fontSize: 9, color: item.status === "ok" ? C.green : C.amber, width: 45, textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{item.prepped}/{item.par}</span>
                    {item.status === "behind" && <Badge text="BEHIND" color={C.amber} />}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Staffing + Special Events */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ background: C.card, border: `1px solid ${staff.callouts > 0 ? C.red : C.border}40`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>Staffing</div>
              {[{ l: "Scheduled", v: staff.scheduled, c: C.text }, { l: "Present", v: staff.present, c: C.green }, { l: "Callouts", v: staff.callouts, c: staff.callouts > 0 ? C.red : C.dim }, { l: "OT Hours", v: staff.overtime_hours, c: staff.overtime_hours > 0 ? C.amber : C.dim }, { l: "Agency Staff", v: staff.agency_staff, c: C.dim }].map(s => (
                <div key={s.l} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span style={{ fontSize: 10, color: C.dim }}>{s.l}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: s.c, fontFamily: "'IBM Plex Mono', monospace" }}>{s.v}</span>
                </div>
              ))}
              {staff.callout_names?.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 10, color: C.red }}>
                  {staff.callout_names.map((n: string) => <div key={n}>- {n}</div>)}
                </div>
              )}
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.purple, marginBottom: 8, textTransform: "uppercase" }}>Special Events</div>
              {(data.special_events || []).map((e: any, i: number) => (
                <div key={i} style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{e.event}</div>
                  <div style={{ fontSize: 10, color: C.dim }}>{e.time} | {e.covers} covers</div>
                  <div style={{ fontSize: 9, color: C.amber }}>{e.notes}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
