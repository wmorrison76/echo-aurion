import React, { useState, useEffect } from "react";
import { RightClickMenu } from "@/lib/context-menu";
const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#10b981", accentDim: "rgba(16,185,129,0.12)", green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", purple: "#8b5cf6", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };
const fmt = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
function Badge({ text, color }: { text: string; color: string }) { return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>; }
type Tab = "dashboard" | "tip-pool" | "feedback";

function DashboardTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/foh/dashboard`).then(r => r.json()).then(setData); }, []);
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading...</div>;
  const k = data.kpis;
  const sectionColors: Record<string, string> = { A: C.accent, B: C.blue, C: C.purple, Bar: C.amber, Host: C.dim };
  return (
    <div data-testid="foh-dashboard">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {[{ l: "Tables", v: `${k.available}/${k.total_tables}` }, { l: "Servers On", v: k.total_servers }, { l: "Total Staff", v: k.total_staff }, { l: "Covers Today", v: k.total_covers }, { l: "Avg Rating", v: `${k.avg_rating}/5` }, { l: "Feedback", v: k.feedback_count }].map(kpi => (
          <div key={kpi.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", flex: "1 1 130px", minWidth: 120 }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{kpi.l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Floor Map — Sections</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
            {(data.tables || []).map((t: any) => {
              const servers = data.servers || [];
              const tableCtx = [
                ...(t.status === "available" ? [{ label: "Seat Table", icon: "🪑", action: () => { fetch(`${API}/api/foh/tables/${t.id}/status?status=occupied`, { method: "PUT" }).then(() => window.location.reload()); }, color: C.accent }] : []),
                ...(t.status === "occupied" ? [{ label: "Clear Table", icon: "✓", action: () => { fetch(`${API}/api/foh/tables/${t.id}/status?status=available`, { method: "PUT" }).then(() => window.location.reload()); }, color: C.green }] : []),
                { label: "divider", divider: true, action: () => {} },
                ...servers.map((s: any) => ({ label: `Assign → ${s.name}`, icon: "👤", action: () => { fetch(`${API}/api/foh/tables/${t.id}/assign?server_id=${s.id}`, { method: "PUT" }).then(() => window.location.reload()); } })),
              ];
              return (
              <RightClickMenu key={t.id} items={tableCtx}>
              <div title={`Table ${t.number} — Section ${t.section} (${t.capacity} seats)`} style={{ padding: "8px 4px", borderRadius: 6, background: t.status === "occupied" ? `${sectionColors[t.section] || C.dim}30` : "rgba(255,255,255,0.03)", border: `1px solid ${t.status === "occupied" ? sectionColors[t.section] || C.dim : C.border}40`, textAlign: "center", cursor: "context-menu" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t.number}</div>
                <div style={{ fontSize: 8, color: sectionColors[t.section] || C.dim }}>{t.section}</div>
              </div>
              </RightClickMenu>
              );
            })}
          </div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Staff on Floor</div>
          {(data.servers || []).map((s: any) => (
            <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
              <div><span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{s.name}</span> <Badge text={s.role} color={C.accent} /></div>
              <span style={{ fontSize: 10, color: C.dim }}>Section {s.section} | {s.hours_today}h</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TipPoolTab() {
  const [data, setData] = useState<any>(null);
  const [whatIf, setWhatIf] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/foh/tip-pool`).then(r => r.json()).then(setData); }, []);
  const runWhatIf = (changes: any[], totalTips: number) => {
    fetch(`${API}/api/foh/tip-pool/what-if`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ changes, total_tips: totalTips }) })
      .then(r => r.json()).then(setWhatIf);
  };
  if (!data) return null;
  const active = whatIf || data;
  return (
    <div data-testid="foh-tip-pool">
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", flex: 1 }}>
          <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 6 }}>Total Tips</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(active.total_tips)}</div>
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", flex: 1 }}>
          <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", marginBottom: 6 }}>Per Point Value</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(active.per_point)}</div>
        </div>
        {whatIf && <button onClick={() => setWhatIf(null)} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 11, cursor: "pointer", alignSelf: "center" }}>Reset</button>}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => runWhatIf([{ role: "server", new_points_or_pct: 8 }, { role: "busser", new_points_or_pct: 5 }], active.total_tips)} data-testid="what-if-scenario-1" style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.amber}`, background: whatIf ? C.accentDim : "transparent", color: C.amber, fontSize: 10, cursor: "pointer" }}>What-If: Increase Busser Share</button>
        <button onClick={() => runWhatIf([], 3000)} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.blue}`, background: "transparent", color: C.blue, fontSize: 10, cursor: "pointer" }}>What-If: $3,000 Night</button>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: "rgba(16,185,129,0.06)" }}>{["Role", "Points", "Share", "Staff", "Per Person", "Hours", "Per Hour"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.accent, fontWeight: 600, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {(active.distribution || []).map((d: any) => (
              <tr key={d.role} style={{ borderBottom: `1px solid ${C.border}40` }}>
                <td style={{ padding: "8px 12px", color: C.text, fontWeight: 600, textTransform: "capitalize" }}>{d.role.replace("_", " ")}</td>
                <td style={{ padding: "8px 12px", color: C.text }}>{d.points}</td>
                <td style={{ padding: "8px 12px", color: C.accent, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(d.total_share)}</td>
                <td style={{ padding: "8px 12px", color: C.text }}>{d.staff_count}</td>
                <td style={{ padding: "8px 12px", color: C.green, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(d.per_person)}</td>
                <td style={{ padding: "8px 12px", color: C.dim }}>{d.total_hours}h</td>
                <td style={{ padding: "8px 12px", color: C.amber, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(d.per_hour)}/hr</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FeedbackTab() {
  const [feedback, setFeedback] = useState<any[]>([]);
  useEffect(() => { fetch(`${API}/api/foh/feedback`).then(r => r.json()).then(d => setFeedback(d.feedback || [])); }, []);
  return (
    <div data-testid="foh-feedback">
      {feedback.map(f => (
        <div key={f.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{f.guest_name || "Guest"} {f.room_number && `(Rm ${f.room_number})`}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: f.overall_rating >= 4 ? C.green : f.overall_rating >= 3 ? C.amber : C.red }}>{f.overall_rating}/5</span>
          </div>
          <div style={{ display: "flex", gap: 12, marginBottom: 6, fontSize: 10, color: C.dim }}>
            <span>Food: {f.food_rating}/5</span><span>Service: {f.service_rating}/5</span><span>Ambiance: {f.ambiance_rating}/5</span>
            {f.server_name && <span>Server: {f.server_name}</span>}
          </div>
          {f.comment && <div style={{ fontSize: 11, color: C.text, fontStyle: "italic" }}>"{f.comment}"</div>}
        </div>
      ))}
    </div>
  );
}

export default function FOHOperations() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const tabs: { id: Tab; label: string }[] = [{ id: "dashboard", label: "Floor & Staff" }, { id: "tip-pool", label: "Tip Pool" }, { id: "feedback", label: "Guest Feedback" }];
  return (
    <div data-testid="foh-operations-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(16,185,129,0.04)" }}>
        {tabs.map(t => (<button key={t.id} onClick={() => setTab(t.id)} data-testid={`foh-tab-${t.id}`} style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${tab === t.id ? C.accent : "transparent"}`, background: tab === t.id ? C.accentDim : "transparent", color: tab === t.id ? C.accent : C.dim, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t.label}</button>))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {tab === "dashboard" && <DashboardTab />}
        {tab === "tip-pool" && <TipPoolTab />}
        {tab === "feedback" && <FeedbackTab />}
      </div>
    </div>
  );
}
