import React, { useState, useEffect, useCallback } from "react";
const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#c8a97e", green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", purple: "#8b5cf6", cyan: "#06b6d4", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };
const fmt = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const pct = (n: number) => `${(n || 0).toFixed(1)}%`;
function Badge({ text, color }: { text: string; color: string }) { return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>; }
type Tab = "calendar" | "coverage" | "notes" | "insights";

/* ═══════ MINI COVERAGE GRAPH (per day in calendar) ═══════ */
function MiniCoverageGraph({ outlets, onClick }: { outlets: Record<string, any>; onClick: () => void }) {
  const allHours: Record<number, { needed: number; scheduled: number }> = {};
  Object.values(outlets).forEach((o: any) => {
    Object.entries(o.hourly_flow || {}).forEach(([h, data]: [string, any]) => {
      const hr = parseInt(h);
      if (!allHours[hr]) allHours[hr] = { needed: 0, scheduled: 0 };
      allHours[hr].needed += data.staff_needed;
      allHours[hr].scheduled += data.staff_scheduled;
    });
  });
  const hours = Object.keys(allHours).sort((a, b) => Number(a) - Number(b));
  const maxVal = Math.max(...Object.values(allHours).map(h => Math.max(h.needed, h.scheduled)), 1);

  return (
    <div onClick={onClick} style={{ cursor: "pointer", height: 36, display: "flex", alignItems: "flex-end", gap: 1, padding: "2px 0" }} title="Click to expand coverage view">
      {hours.map(h => {
        const hr = allHours[parseInt(h)];
        const neededH = (hr.needed / maxVal) * 30;
        const schedH = (hr.scheduled / maxVal) * 30;
        const gap = hr.scheduled - hr.needed;
        return (
          <div key={h} style={{ position: "relative", width: 3, height: 30 }}>
            <div style={{ position: "absolute", bottom: 0, width: "100%", height: neededH, background: gap >= -0.3 ? `${C.green}60` : `${C.red}60`, borderRadius: 1 }} />
            <div style={{ position: "absolute", bottom: 0, width: "100%", height: schedH, background: gap >= -0.3 ? C.green : C.red, borderRadius: 1, opacity: 0.4 }} />
          </div>
        );
      })}
    </div>
  );
}

/* ═══════ EXPANDED COVERAGE VIEW ═══════ */
function CoverageDetail({ date, dayLabel, outlets, onClose }: { date: string; dayLabel: string; outlets: Record<string, any>; onClose: () => void }) {
  const outletNames: Record<string, string> = { restaurant: "Restaurant", ird: "IRD", banquet: "Banquet", bar: "Bar", spa: "Spa", housekeeping: "Housekeeping" };
  const outletColors: Record<string, string> = { restaurant: C.accent, ird: C.amber, banquet: C.purple, bar: C.blue, spa: "#d946ef", housekeeping: C.cyan };

  return (
    <div data-testid="coverage-detail" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.accent }}>{dayLabel} — {date}</span>
          <span style={{ fontSize: 10, color: C.dim, marginLeft: 8 }}>Hourly Staffing Coverage</span>
        </div>
        <button onClick={onClose} style={{ padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 10, cursor: "pointer" }}>Close</button>
      </div>

      {Object.entries(outlets).map(([outletId, oData]: [string, any]) => {
        const hourly = oData.hourly_flow || {};
        const hours = Object.keys(hourly).sort((a, b) => Number(a) - Number(b));
        const maxStaff = Math.max(...Object.values(hourly).map((h: any) => Math.max(h.staff_needed, h.staff_scheduled)), 1);

        return (
          <div key={outletId} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: outletColors[outletId] || C.text }}>{outletNames[outletId] || outletId}</span>
              <div style={{ display: "flex", gap: 10, fontSize: 10 }}>
                <span style={{ color: C.dim }}>{oData.covers} covers</span>
                <span style={{ color: C.accent }}>{oData.total_staff_hours}h</span>
                <span style={{ color: C.green }}>{fmt(oData.labor_cost_forecast)}</span>
                <span style={{ color: oData.labor_variance >= 0 ? C.green : C.red }}>{oData.labor_variance >= 0 ? "+" : ""}{fmt(oData.labor_variance)} vs budget</span>
              </div>
            </div>
            {/* Bar chart */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 50, background: `${C.bg}80`, borderRadius: 6, padding: "4px 4px 0" }}>
              {hours.map(h => {
                const hd = hourly[parseInt(h)];
                const neededH = (hd.staff_needed / maxStaff) * 40;
                const schedH = (hd.staff_scheduled / maxStaff) * 40;
                const gap = hd.staff_scheduled - hd.staff_needed;
                const color = gap >= -0.3 ? C.green : C.red;
                return (
                  <div key={h} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }} title={`${h}:00 — Need: ${hd.staff_needed} | Sched: ${hd.staff_scheduled}`}>
                    <div style={{ width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", height: 40 }}>
                      <div style={{ width: "40%", height: Math.max(2, neededH), background: `${color}40`, borderRadius: "2px 0 0 0" }} />
                      <div style={{ width: "40%", height: Math.max(2, schedH), background: color, borderRadius: "0 2px 0 0", opacity: 0.7 }} />
                    </div>
                    <span style={{ fontSize: 7, color: C.muted }}>{h}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, background: `${C.green}40`, borderRadius: 2 }} /><span style={{ fontSize: 9, color: C.dim }}>Needed</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, background: C.green, borderRadius: 2, opacity: 0.7 }} /><span style={{ fontSize: 9, color: C.dim }}>Scheduled</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 10, height: 10, background: C.red, borderRadius: 2 }} /><span style={{ fontSize: 9, color: C.dim }}>Gap (understaffed)</span></div>
      </div>
    </div>
  );
}

/* ═══════ MAIN COMPONENT ═══════ */
export default function Forecast21Day() {
  const [data, setData] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<any>(null);
  const [tab, setTab] = useState<Tab>("calendar");
  const [noteForm, setNoteForm] = useState({ date: "", outlet: "all", note: "", author: "Manager" });
  const [notes, setNotes] = useState<any[]>([]);

  const load = useCallback(() => {
    fetch(`${API}/api/forecast-21/forecast`).then(r => r.json()).then(setData);
    fetch(`${API}/api/forecast-21/notes`).then(r => r.json()).then(d => setNotes(d.notes || []));
  }, []);
  useEffect(() => { load(); }, [load]);

  const addNote = () => {
    if (!noteForm.date || !noteForm.note) return;
    fetch(`${API}/api/forecast-21/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...noteForm, ai_directive: true }) })
      .then(() => { setNoteForm({ date: "", outlet: "all", note: "", author: "Manager" }); load(); });
  };

  if (!data) return <div data-testid="forecast-21-panel" style={{ height: "100%", background: C.bg, padding: 40, textAlign: "center", color: C.dim, borderRadius: 10 }}>Loading 21-Day Forecast...</div>;

  const tabs: { id: Tab; label: string }[] = [
    { id: "calendar", label: "21-Day Calendar" },
    { id: "coverage", label: "Coverage View" },
    { id: "notes", label: "AI Notes" },
    { id: "insights", label: "AI Insights" },
  ];

  const s = data.summary;

  return (
    <div data-testid="forecast-21-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(200,169,126,0.04)", flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.accent }}>21-Day Living Forecast</div>
            <div style={{ fontSize: 10, color: C.dim }}>Auto-updates with new data | {data.period.start} → {data.period.end}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} data-testid={`f21-tab-${t.id}`} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${tab === t.id ? C.accent : "transparent"}`, background: tab === t.id ? `${C.accent}15` : "transparent", color: tab === t.id ? C.accent : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{t.label}</button>)}
          </div>
        </div>
        {/* Summary KPIs */}
        <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
          {[{ l: "21-Day Revenue", v: fmt(s.total_revenue), c: C.accent }, { l: "Avg Occupancy", v: pct(s.avg_occupancy), c: C.blue }, { l: "Labor Cost", v: fmt(s.total_labor_cost), c: C.amber }, { l: "Labor Budget", v: fmt(s.total_labor_budget), c: C.green }, { l: "Rooms Sold", v: s.total_rooms_sold, c: C.text }].map(kpi => (
            <div key={kpi.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", flex: "1 1 130px" }}>
              <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", marginBottom: 2 }}>{kpi.l}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: kpi.c, fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {/* ═══ Calendar Tab ═══ */}
        {tab === "calendar" && (
          <div>
            {selectedDay && <CoverageDetail date={selectedDay.date} dayLabel={selectedDay.day_of_week} outlets={selectedDay.outlets} onClose={() => setSelectedDay(null)} />}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: selectedDay ? 14 : 0 }}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: C.dim, padding: "4px 0" }}>{d}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
              {/* Offset for first day alignment */}
              {data.forecast[0] && Array(data.forecast[0].dow_index).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
              {(data.forecast || []).map((day: any) => {
                const isSelected = selectedDay?.date === day.date;
                const hasNote = notes.some(n => n.date === day.date);
                const isWeekend = day.dow_index >= 4;
                const occColor = day.occupancy.forecast_pct >= 85 ? C.green : day.occupancy.forecast_pct >= 70 ? C.amber : C.red;
                return (
                  <div key={day.date} data-testid={`day-${day.date}`} onClick={() => setSelectedDay(isSelected ? null : day)}
                    style={{ background: isSelected ? `${C.accent}15` : C.card, border: `1px solid ${isSelected ? C.accent : isWeekend ? `${C.accent}30` : C.border}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer", minHeight: 90, transition: "all 0.15s" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{new Date(day.date + "T12:00:00Z").getDate()}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, color: occColor }}>{pct(day.occupancy.forecast_pct)}</span>
                    </div>
                    <div style={{ fontSize: 9, color: C.accent, fontFamily: "'IBM Plex Mono', monospace", marginBottom: 2 }}>{fmt(day.revenue.total)}</div>
                    <div style={{ fontSize: 8, color: C.dim }}>L: {fmt(day.labor.total_cost)}</div>
                    {hasNote && <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.amber, marginTop: 2 }} />}
                    <MiniCoverageGraph outlets={day.outlets} onClick={() => setSelectedDay(day)} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ Coverage Tab ═══ */}
        {tab === "coverage" && (
          <div>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 12 }}>Select a day to see hourly coverage breakdown with staffing gaps</div>
            {data.forecast.slice(0, 7).map((day: any) => (
              <CoverageDetail key={day.date} date={day.date} dayLabel={day.day_of_week} outlets={day.outlets} onClose={() => {}} />
            ))}
          </div>
        )}

        {/* ═══ Notes Tab ═══ */}
        {tab === "notes" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>Add AI Note</div>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 10 }}>Notes are read by AI to adjust the forecast. Examples: "Prep day — closed yesterday", "VIP group arriving", "Conference 200 pax"</div>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="date" value={noteForm.date} onChange={e => setNoteForm({ ...noteForm, date: e.target.value })} style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} />
                  <select value={noteForm.outlet} onChange={e => setNoteForm({ ...noteForm, outlet: e.target.value })} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }}>
                    {["all", "restaurant", "ird", "banquet", "bar", "spa", "housekeeping"].map(o => <option key={o} value={o}>{o === "all" ? "All Outlets" : o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                  </select>
                </div>
                <textarea data-testid="forecast-note-input" value={noteForm.note} onChange={e => setNoteForm({ ...noteForm, note: e.target.value })} placeholder="Note for AI (e.g., 'Need 1 extra prep day — closed yesterday')" rows={2} style={{ padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, resize: "vertical" }} />
                <button data-testid="add-note-btn" onClick={addNote} disabled={!noteForm.date || !noteForm.note} style={{ padding: "8px", borderRadius: 6, border: "none", background: noteForm.date && noteForm.note ? C.accent : C.muted, color: "#000", fontSize: 12, fontWeight: 600, cursor: noteForm.date && noteForm.note ? "pointer" : "default" }}>Add Note (AI will adjust forecast)</button>
              </div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>Active Notes ({notes.length})</div>
              {notes.map(n => (
                <div key={n.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}20` }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{n.date}</span>
                    <Badge text={n.outlet} color={C.blue} />
                  </div>
                  <div style={{ fontSize: 11, color: C.text, marginTop: 2 }}>{n.note}</div>
                  <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>By {n.author} | AI reads: {n.ai_directive ? "Yes" : "No"}</div>
                </div>
              ))}
              {notes.length === 0 && <div style={{ fontSize: 11, color: C.dim, textAlign: "center", padding: 20 }}>No notes yet. Add notes for AI to adjust forecast.</div>}
            </div>
          </div>
        )}

        {/* ═══ Insights Tab ═══ */}
        {tab === "insights" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.green, marginBottom: 8, textTransform: "uppercase" }}>Peak Revenue Days</div>
                {(s.peak_days || []).map((d: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}20` }}>
                    <span style={{ fontSize: 11, color: C.text }}>{d.day} {d.date}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(d.revenue)}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.amber, marginBottom: 8, textTransform: "uppercase" }}>Low Volume Days (Optimize Staffing)</div>
                {(s.low_days || []).map((d: any, i: number) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${C.border}20` }}>
                    <span style={{ fontSize: 11, color: C.text }}>{d.day} {d.date}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: C.amber, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(d.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, marginBottom: 10, textTransform: "uppercase" }}>AI Pattern Analysis</div>
              {Object.entries(data.ai_insights || {}).map(([key, value]: [string, any]) => (
                <div key={key} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}20` }}>
                  <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 2 }}>{key.replace(/_/g, " ")}</div>
                  <div style={{ fontSize: 12, color: C.text }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
