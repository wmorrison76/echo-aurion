/**
 * iter173 · Phase 2 — Lifestyle Command Dashboard
 *
 * Director of Lifestyle's "experience operating layer". Five tabs:
 *   1. Calendar · Master Activation Calendar (14-day strip)
 *   2. Revenue · Revenue vs Engagement panel
 *   3. Forecast · Attendance Forecast + Weather alerts
 *   4. Cross-Dept · Activation → department task breakdown
 *   5. Create · Activation Builder form
 */
import React, { useEffect, useMemo, useState } from "react";
import { adminFetch, getAdminToken, ensureAdminToken } from "../../lib/admin-auth";
import { usePanelState } from "../../lib/usePanelState";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};
const PANEL_ID = "lifestyle-dashboard";

const CATEGORIES = ["wellness", "culinary", "mixology", "family", "member-exclusive", "holiday", "pool", "marina", "spa-crossover", "sunset-ritual", "fitness", "brand-partnership", "employee-culture", "seasonal", "cultural", "sommelier", "kids", "teen", "couples", "other"];
const REVENUE_MODELS = ["paid", "complimentary", "member-included", "upsell-driven", "sponsored"];
const AUDIENCES = ["all-guests", "vip", "members", "residents", "transient", "families", "couples", "kids", "teens", "adults-only", "wellness-seekers", "foodies", "employees", "brand-partners"];
const DEPARTMENTS = ["engineering", "housekeeping", "fb", "culinary", "spa", "activities", "people-services", "sales", "security"];

const CAT_COLORS: Record<string, string> = {
  wellness: "#22c55e", culinary: "#f59e0b", mixology: "#ec4899", family: "#06b6d4",
  "member-exclusive": "#c8a97e", holiday: "#ef4444", pool: "#38bdf8",
  "sunset-ritual": "#f97316", "spa-crossover": "#a78bfa", sommelier: "#b45309",
  kids: "#84cc16", fitness: "#10b981", "employee-culture": "#ec4899",
  other: "#64748b",
};

export default function LifestyleDashboard() {
  const [tab, setTab] = usePanelState<string>(PANEL_ID, "tab", "calendar");
  const [start, setStart] = usePanelState<string>(PANEL_ID, "cal-start", new Date().toISOString().slice(0, 10));

  return (
    <div data-testid="lifestyle-dashboard" style={S.root}>
      <header style={S.header}>
        <div>
          <div style={S.eyebrow}>Director of Lifestyle · Command Center</div>
          <h1 style={S.title}>Experience Operating Layer</h1>
          <p style={S.sub}>Activations · Revenue · Engagement · Cross-Dept Coordination · drives the resort's identity.</p>
        </div>
      </header>

      <nav style={S.tabs}>
        {[
          { id: "calendar", label: "Calendar" },
          { id: "revenue", label: "Revenue × Engagement" },
          { id: "forecast", label: "Forecast · Weather" },
          { id: "cross-dept", label: "Cross-Dept" },
          { id: "prep-cascade", label: "Prep Cascade" },
          { id: "create", label: "Create Activation" },
        ].map((t) => (
          <button key={t.id} data-testid={`lifestyle-tab-${t.id}`} onClick={() => setTab(t.id)}
            style={{ ...S.tab, ...(tab === t.id ? S.tabOn : {}) }}>{t.label}</button>
        ))}
      </nav>

      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        {tab === "calendar" && <CalendarTab start={start} setStart={setStart} />}
        {tab === "revenue" && <RevenueTab />}
        {tab === "forecast" && <ForecastTab />}
        {tab === "cross-dept" && <CrossDeptTab />}
        {tab === "prep-cascade" && <PrepCascadeTab />}
        {tab === "create" && <CreateTab />}
      </div>
    </div>
  );
}

// ─── CALENDAR TAB ───────────────────────────────────────────────────────────
function CalendarTab({ start, setStart }: { start: string; setStart: (s: string) => void }) {
  const [data, setData] = useState<any>({ by_date: {}, activations: [] });
  const [cat, setCat] = usePanelState<string>(PANEL_ID, "cal-cat", "");

  async function load() {
    const q = new URLSearchParams({ start, days: "14" });
    if (cat) q.set("category", cat);
    const r = await fetch(`${API()}/api/lifestyle/calendar?${q.toString()}`);
    setData(await r.json());
  }
  useEffect(() => { load(); }, [start, cat]);

  const dates = useMemo(() => {
    const out: string[] = [];
    const d = new Date(start + "T12:00:00Z");
    for (let i = 0; i < 14; i++) {
      const cur = new Date(d); cur.setUTCDate(d.getUTCDate() + i);
      out.push(cur.toISOString().slice(0, 10));
    }
    return out;
  }, [start]);

  return (
    <div>
      <div style={S.toolbar}>
        <input data-testid="lifestyle-cal-start" type="date" value={start} onChange={e => setStart(e.target.value)} style={S.input} />
        <select data-testid="lifestyle-cal-cat" value={cat} onChange={e => setCat(e.target.value)} style={S.input}>
          <option value="">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{data.total || 0} activations in 14-day window</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {dates.map((d) => {
          const dayActs = (data.by_date || {})[d] || [];
          const dt = new Date(d + "T12:00:00Z");
          const isToday = d === new Date().toISOString().slice(0, 10);
          return (
            <div key={d} data-testid={`lifestyle-day-${d}`} style={{ ...S.dayCell, ...(isToday ? { border: "1px solid #c8a97e", background: "rgba(200,169,126,0.05)" } : {}) }}>
              <div style={{ fontSize: 10, color: isToday ? "#c8a97e" : "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                {dt.toLocaleDateString(undefined, { weekday: "short" })} · {dt.getDate()}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                {dayActs.map((a: any) => (
                  <div key={a.id} data-testid={`lifestyle-act-${a.id}`} style={{ ...S.actChip, borderLeftColor: CAT_COLORS[a.category] || "#64748b" }}
                    title={`${a.title} · ${a.location} · cap ${a.capacity}`}>
                    <div style={{ fontSize: 10, color: "#c8a97e", fontFamily: "monospace" }}>{a.start_time}</div>
                    <div style={{ fontSize: 11, color: "#f8fafc", fontWeight: 600, marginTop: 2 }}>{a.title}</div>
                    <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>{a.location} · cap {a.capacity}</div>
                    <div style={{ fontSize: 9, color: CAT_COLORS[a.category] || "#64748b", marginTop: 3, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{a.category} · {a.revenue_model}</div>
                  </div>
                ))}
                {!dayActs.length && <div style={{ fontSize: 10, color: "#475569", fontStyle: "italic", padding: 4 }}>—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── REVENUE TAB ────────────────────────────────────────────────────────────
function RevenueTab() {
  const [data, setData] = useState<any>(null);
  const [days, setDays] = usePanelState<number>(PANEL_ID, "rev-days", 30);
  useEffect(() => {
    fetch(`${API()}/api/lifestyle/revenue-engagement?days=${days}`).then(r => r.json()).then(setData);
  }, [days]);
  if (!data) return <div style={S.empty}>Loading…</div>;

  return (
    <div>
      <div style={S.toolbar}>
        <label style={{ fontSize: 12, color: "#94a3b8" }}>Window</label>
        <select value={days} onChange={e => setDays(Number(e.target.value))} style={S.input}>
          <option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option>
        </select>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{data.total_activations} activations</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 20 }}>
        <Kpi label="Total Revenue" value={`$${(data.total_revenue || 0).toLocaleString()}`} tone="gold" />
        <Kpi label="Total Attendance" value={(data.total_attendance || 0).toLocaleString()} />
        <Kpi label="Non-paid Engagement Ratio" value={`${Math.round((data.engagement_ratio_nonpaid || 0) * 100)}%`} tone="green" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14 }}>
        <div style={S.card}>
          <div style={S.eyebrow}>By Revenue Model</div>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10, fontSize: 12 }}>
            <thead><tr><th style={S.th}>Model</th><th style={S.th}>Count</th><th style={S.th}>Attendance</th><th style={S.th}>Revenue</th></tr></thead>
            <tbody>
              {Object.entries(data.by_revenue_model || {}).map(([k, v]: any) => (
                <tr key={k} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <td style={S.td}><span style={{ ...S.pill, background: "rgba(200,169,126,0.12)", color: "#c8a97e" }}>{k}</span></td>
                  <td style={S.td}>{v.count}</td><td style={S.td}>{v.attendance}</td>
                  <td style={{ ...S.td, color: "#c8a97e", fontWeight: 600 }}>${v.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={S.card}>
          <div style={S.eyebrow}>By Category</div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
            {Object.entries(data.by_category || {}).sort((a: any, b: any) => b[1].revenue - a[1].revenue).map(([k, v]: any) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: CAT_COLORS[k] || "#64748b" }} />
                <span style={{ flex: 1, color: "#f8fafc" }}>{k}</span>
                <span style={{ color: "#94a3b8", fontSize: 11 }}>{v.count} · {v.attendance} att</span>
                <span style={{ color: "#c8a97e", fontWeight: 600, minWidth: 80, textAlign: "right" }}>${v.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FORECAST TAB ───────────────────────────────────────────────────────────
function ForecastTab() {
  const [dateIso, setDateIso] = usePanelState<string>(PANEL_ID, "fc-date", new Date().toISOString().slice(0, 10));
  const [fc, setFc] = useState<any>(null);
  const [alerts, setAlerts] = useState<any>(null);

  useEffect(() => {
    fetch(`${API()}/api/lifestyle/attendance-forecast?date_iso=${dateIso}`).then(r => r.json()).then(setFc);
    fetch(`${API()}/api/lifestyle/weather-alerts?date_iso=${dateIso}`).then(r => r.json()).then(setAlerts);
  }, [dateIso]);

  return (
    <div>
      <div style={S.toolbar}>
        <input type="date" value={dateIso} onChange={e => setDateIso(e.target.value)} style={S.input} data-testid="lifestyle-fc-date" />
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          {fc && `Occupancy assumed ${fc.occ_pct_used}% · weekend bump ×${fc.weekend_bump}`}
        </div>
      </div>

      {alerts && alerts.weather_sensitive_count > 0 && (
        <div style={{ padding: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 8, marginBottom: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#fbbf24", fontWeight: 700, textTransform: "uppercase" }}>⚠ {alerts.weather_sensitive_count} weather-sensitive activation(s)</div>
          <ul style={{ listStyle: "none", padding: 0, margin: "8px 0 0" }}>
            {(alerts.alerts || []).map((a: any) => (
              <li key={a.activation_id} data-testid={`lifestyle-alert-${a.activation_id}`} style={{ fontSize: 12, color: "#f8fafc", padding: "3px 0" }}>
                · <strong>{a.title}</strong> at {a.location} → backup: {a.rain_backup_location || "⚠ NO BACKUP SET"} · {a.suggested_action}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 10 }}>
        {(fc?.forecasts || []).map((f: any) => (
          <div key={f.activation_id} data-testid={`lifestyle-fc-${f.activation_id}`} style={{ ...S.card, borderLeft: `3px solid ${CAT_COLORS[f.category] || "#64748b"}` }}>
            <div style={{ fontSize: 13, color: "#f8fafc", fontWeight: 700 }}>{f.title}</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{f.start_time} · {f.location}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
              <div style={{ fontSize: 26, color: "#c8a97e", fontWeight: 800 }}>{f.forecast_attendance}</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>/ {f.capacity} cap ({f.fill_rate_pct}%)</div>
            </div>
            <div style={{ marginTop: 8, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, f.fill_rate_pct)}%`, height: "100%", background: CAT_COLORS[f.category] || "#64748b" }} />
            </div>
            {f.weather_sensitive && <div style={{ fontSize: 10, color: "#fbbf24", marginTop: 6 }}>⚠ weather-sensitive</div>}
          </div>
        ))}
        {!(fc?.forecasts || []).length && <div style={S.empty}>No activations forecasted for {dateIso}.</div>}
      </div>
    </div>
  );
}

// ─── CROSS-DEPT TAB ─────────────────────────────────────────────────────────
function CrossDeptTab() {
  const [acts, setActs] = useState<any[]>([]);
  const [chosen, setChosen] = useState<string>("");
  const [plan, setPlan] = useState<any | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    fetch(`${API()}/api/lifestyle/calendar?start=${today}&days=14`).then(r => r.json()).then(j => {
      setActs(j.activations || []);
      if ((j.activations || []).length && !chosen) setChosen(j.activations[0].id);
    });
  }, []);
  useEffect(() => {
    if (!chosen) return;
    fetch(`${API()}/api/lifestyle/cross-dept-plan/${chosen}`).then(r => r.json()).then(setPlan);
  }, [chosen]);

  return (
    <div>
      <div style={S.toolbar}>
        <select data-testid="lifestyle-xdept-select" value={chosen} onChange={e => setChosen(e.target.value)} style={{ ...S.input, minWidth: 380 }}>
          {acts.map(a => <option key={a.id} value={a.id}>{a.date} · {a.title}</option>)}
        </select>
      </div>

      {plan && (
        <div>
          <div style={S.card}>
            <div style={S.eyebrow}>Activation</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f8fafc", marginTop: 4 }}>{plan.activation.title}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{plan.activation.date} · {plan.activation.start_time}-{plan.activation.end_time} · {plan.activation.location}</div>
            <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {plan.activation.audience?.map((a: string) => <span key={a} style={{ ...S.pill, background: "rgba(56,189,248,0.12)", color: "#7dd3fc" }}>{a}</span>)}
            </div>
          </div>

          <div style={{ ...S.eyebrow, marginTop: 18 }}>{plan.total_tasks} department task{plan.total_tasks === 1 ? "" : "s"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10, marginTop: 8 }}>
            {(plan.tasks || []).map((t: any, i: number) => (
              <div key={i} data-testid={`lifestyle-task-${t.department}`} style={S.card}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" }}>{t.department}</div>
                <div style={{ fontSize: 13, color: "#f8fafc", marginTop: 4 }}>{t.task}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>Lead time: {t.setup_lead_minutes}min</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PREP-CASCADE TAB ───────────────────────────────────────────────────────
function PrepCascadeTab() {
  const [date, setDate] = usePanelState<string>(PANEL_ID, "cascade-date", new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any | null>(null);
  useEffect(() => {
    fetch(`${API()}/api/lifestyle/prep-cascade/${date}`).then(r => r.json()).then(setData);
  }, [date]);
  const deptColor: Record<string, string> = {
    engineering: "#0ea5e9", housekeeping: "#a78bfa", fb: "#ec4899", culinary: "#f59e0b",
    spa: "#22c55e", activities: "#84cc16", "people-services": "#c8a97e", sales: "#38bdf8", security: "#ef4444",
  };
  return (
    <div>
      <div style={S.toolbar}>
        <input data-testid="lifestyle-cascade-date" type="date" value={date} onChange={e => setDate(e.target.value)} style={S.input} />
        <div style={{ fontSize: 12, color: "#94a3b8" }}>
          {data && `${data.total_activations} activations · ${data.total_tasks} total dept task${data.total_tasks === 1 ? "" : "s"}`}
        </div>
      </div>
      {data && (
        <div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
            {(data.activations || []).map((a: any) => (
              <span key={a.id} style={{ ...S.pill, background: `${CAT_COLORS[a.category] || "#64748b"}22`, color: CAT_COLORS[a.category] || "#cbd5e1" }}>
                {a.start_time} · {a.title}
              </span>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            {Object.entries(data.by_department || {}).map(([dept, tasks]: any) => (
              <div key={dept} data-testid={`cascade-dept-${dept}`} style={{ ...S.card, borderLeft: `3px solid ${deptColor[dept] || "#64748b"}` }}>
                <div style={{ ...S.eyebrow, color: deptColor[dept] || "#c8a97e" }}>{dept}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{tasks.length} task{tasks.length === 1 ? "" : "s"}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                  {tasks.map((t: any, i: number) => (
                    <li key={i} style={{ padding: "8px 10px", background: "rgba(0,0,0,0.25)", borderRadius: 4 }}>
                      <div style={{ fontSize: 11, color: "#cbd5e1", fontWeight: 600 }}>{t.activation_title}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{t.start_time} · {t.location}</div>
                      <div style={{ fontSize: 11, color: "#f8fafc", marginTop: 4 }}>{t.task}</div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {Object.keys(data.by_department || {}).length === 0 && <div style={S.empty}>No activations scheduled for {date}.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CREATE TAB ─────────────────────────────────────────────────────────────
function CreateTab() {
  const [a, setA] = useState<any>({
    title: "", category: "wellness", description: "", date: new Date().toISOString().slice(0, 10),
    start_time: "18:00", end_time: "19:00", location: "Main pool deck",
    weather_sensitive: false, rain_backup_location: "",
    audience: ["all-guests"], capacity: 50, expected_attendance: 0,
    revenue_model: "complimentary", ticket_price: 0, revenue_target: 0,
    requires_departments: [], setup_minutes: 30, equipment_needs: [], vendor_needs: [],
    engagement_target: "",
  });
  const [msg, setMsg] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggesting, setSuggesting] = useState(false);

  async function askClaude() {
    setSuggesting(true);
    try {
      const r = await fetch(`${API()}/api/lifestyle/suggest`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: a.date, occupancy_pct: 75, weather: "clear", audience_focus: "all-guests" }),
      });
      const j = await r.json();
      setSuggestions(j.suggestions || []);
      if (!j.ok) setMsg(`Suggest failed: ${j.error || "unknown"}`);
    } finally { setSuggesting(false); }
  }
  function applySuggestion(s: any) {
    setA({ ...a, title: s.title, category: s.category, start_time: s.start_time, end_time: s.end_time,
           location: s.location, capacity: s.capacity || 50, revenue_model: s.revenue_model || "complimentary",
           weather_sensitive: !!s.weather_sensitive, rain_backup_location: s.rain_backup_location || "",
           engagement_target: s.rationale || "" });
    setSuggestions([]);
  }

  async function save() {
    if (!a.title) { alert("Title required"); return; }
    if (!ensureAdminToken()) return;
    const r = await adminFetch(`${API()}/api/lifestyle/activations/upsert`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(a),
    });
    if (r.ok) {
      const j = await r.json();
      setMsg(`✓ Created ${j.activation.title} on ${j.activation.date}`);
      setA({ ...a, title: "" });
    } else {
      setMsg(`Error: ${await r.text()}`);
    }
  }

  function toggleArr(key: string, val: string) {
    const arr = new Set(a[key] || []);
    if (arr.has(val)) arr.delete(val); else arr.add(val);
    setA({ ...a, [key]: Array.from(arr) });
  }

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, justifyContent: "flex-end" }}>
        <button data-testid="lifestyle-ask-claude" onClick={askClaude} disabled={suggesting} style={S.primaryBtn}>
          {suggesting ? "Claude thinking…" : "✨ Ask Claude for 3 suggestions"}
        </button>
      </div>
      {suggestions.length > 0 && (
        <div data-testid="lifestyle-suggestions" style={{ ...S.card, background: "rgba(200,169,126,0.05)", borderColor: "rgba(200,169,126,0.3)" }}>
          <div style={S.eyebrow}>Echo suggestions · tap to apply</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {suggestions.map((s: any, i: number) => (
              <button key={i} data-testid={`lifestyle-suggestion-${i}`} onClick={() => applySuggestion(s)} style={{ textAlign: "left", padding: "10px 12px", background: "rgba(0,0,0,0.25)", border: "1px solid rgba(200,169,126,0.25)", borderRadius: 6, cursor: "pointer", color: "#f8fafc" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700 }}>{s.title}</span>
                  <span style={{ fontSize: 10, color: CAT_COLORS[s.category] || "#94a3b8", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>{s.category}</span>
                  <span style={{ fontSize: 11, color: "#c8a97e", fontFamily: "monospace" }}>{s.start_time}-{s.end_time}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>cap {s.capacity} · {s.location}</span>
                </div>
                <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 4, fontStyle: "italic" }}>{s.rationale}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={S.formGrid}>
          <Field label="Title"><input data-testid="lifestyle-new-title" value={a.title} onChange={e => setA({ ...a, title: e.target.value })} style={S.input} /></Field>
          <Field label="Category"><select value={a.category} onChange={e => setA({ ...a, category: e.target.value })} style={S.input}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Date"><input type="date" data-testid="lifestyle-new-date" value={a.date} onChange={e => setA({ ...a, date: e.target.value })} style={S.input} /></Field>
          <Field label="Start"><input type="time" value={a.start_time} onChange={e => setA({ ...a, start_time: e.target.value })} style={S.input} /></Field>
          <Field label="End"><input type="time" value={a.end_time} onChange={e => setA({ ...a, end_time: e.target.value })} style={S.input} /></Field>
          <Field label="Location"><input value={a.location} onChange={e => setA({ ...a, location: e.target.value })} style={S.input} /></Field>
          <Field label="Capacity"><input type="number" value={a.capacity} onChange={e => setA({ ...a, capacity: Number(e.target.value) })} style={S.input} /></Field>
          <Field label="Revenue model"><select value={a.revenue_model} onChange={e => setA({ ...a, revenue_model: e.target.value })} style={S.input}>{REVENUE_MODELS.map(r => <option key={r}>{r}</option>)}</select></Field>
          <Field label="Ticket price ($)"><input type="number" value={a.ticket_price} onChange={e => setA({ ...a, ticket_price: Number(e.target.value) })} style={S.input} /></Field>
          <Field label="Revenue target ($)"><input type="number" value={a.revenue_target} onChange={e => setA({ ...a, revenue_target: Number(e.target.value) })} style={S.input} /></Field>
          <Field label="Setup lead (min)"><input type="number" value={a.setup_minutes} onChange={e => setA({ ...a, setup_minutes: Number(e.target.value) })} style={S.input} /></Field>
          <Field label="Weather sensitive">
            <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#cbd5e1", fontSize: 12 }}>
              <input type="checkbox" checked={a.weather_sensitive} onChange={e => setA({ ...a, weather_sensitive: e.target.checked })} /> yes
            </label>
          </Field>
          {a.weather_sensitive && (
            <Field label="Rain backup location"><input value={a.rain_backup_location} onChange={e => setA({ ...a, rain_backup_location: e.target.value })} style={S.input} /></Field>
          )}
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ ...S.eyebrow, marginBottom: 6 }}>Audience</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {AUDIENCES.map(x => (
              <button key={x} onClick={() => toggleArr("audience", x)} style={{ ...S.chip, ...(a.audience.includes(x) ? S.chipOn : {}) }}>{x}</button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ ...S.eyebrow, marginBottom: 6 }}>Requires departments</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {DEPARTMENTS.map(x => (
              <button key={x} onClick={() => toggleArr("requires_departments", x)} style={{ ...S.chip, ...(a.requires_departments.includes(x) ? S.chipOn : {}) }}>{x}</button>
            ))}
          </div>
        </div>

        <Field label="Engagement target (KPI)">
          <input value={a.engagement_target} onChange={e => setA({ ...a, engagement_target: e.target.value })} style={S.input} placeholder="e.g. spa booking conversion, bar revisit 48h" />
        </Field>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16, gap: 8 }}>
          <button data-testid="lifestyle-save-activation" onClick={save} style={S.primaryBtn}>+ Create activation</button>
        </div>

        {msg && <div style={{ marginTop: 10, padding: 10, background: "rgba(200,169,126,0.06)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: 6, color: "#f8fafc", fontSize: 12 }}>{msg}</div>}
      </div>
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function Kpi({ label, value, tone = "default" }: { label: string; value: any; tone?: "gold" | "green" | "default" }) {
  const tones: any = { gold: "#c8a97e", green: "#22c55e", default: "#f8fafc" };
  return (
    <div style={S.kpi}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 26, color: tones[tone], fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>{label}</span>
      {children}
    </label>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { height: "100%", display: "flex", flexDirection: "column", background: "#04060d", color: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" },
  header: { padding: "14px 20px", borderBottom: "1px solid rgba(200,169,126,0.15)" },
  eyebrow: { fontSize: 9, letterSpacing: 3, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" },
  title: { fontSize: 22, fontWeight: 700, color: "#f8fafc", marginTop: 4 },
  sub: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  tabs: { display: "flex", gap: 2, padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" },
  tab: { padding: "12px 16px", background: "transparent", border: 0, color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer", borderBottom: "2px solid transparent", textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" },
  tabOn: { color: "#c8a97e", borderBottomColor: "#c8a97e" },
  toolbar: { display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" },
  input: { padding: "8px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#f8fafc", fontSize: 13, outline: "none" },
  primaryBtn: { padding: "10px 16px", borderRadius: 8, background: "rgba(200,169,126,0.15)", border: "1px solid rgba(200,169,126,0.5)", color: "#c8a97e", fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 },
  card: { padding: 14, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, marginBottom: 12 },
  empty: { color: "#64748b", fontSize: 12, fontStyle: "italic", textAlign: "center", padding: 30 },
  dayCell: { padding: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 6, minHeight: 120 },
  actChip: { padding: 6, background: "rgba(0,0,0,0.25)", borderLeft: "3px solid #64748b", borderRadius: 3 },
  kpi: { padding: 14, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 },
  pill: { fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" as const },
  th: { textAlign: "left", fontSize: 10, letterSpacing: 1, color: "#64748b", fontWeight: 700, textTransform: "uppercase", padding: "6px 4px", borderBottom: "1px solid rgba(255,255,255,0.05)" },
  td: { padding: "6px 4px", fontSize: 12, color: "#cbd5e1" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 },
  chip: { padding: "4px 10px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8", fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 },
  chipOn: { background: "rgba(200,169,126,0.15)", border: "1px solid rgba(200,169,126,0.5)", color: "#c8a97e" },
};
