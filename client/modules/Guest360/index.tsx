import React, { useState, useEffect } from "react";
import { RightClickMenu } from "@/lib/context-menu";
const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#c8a97e", accentDim: "rgba(200,169,126,0.12)", green: "#10b981", red: "#ef4444", amber: "#f59e0b", blue: "#3b82f6", purple: "#8b5cf6", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };
const fmt = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
function Badge({ text, color }: { text: string; color: string }) { return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>; }

export default function Guest360() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  const doSearch = (q: string) => { if (q.length >= 2) fetch(`${API}/api/guest360/search?q=${q}`).then(r => r.json()).then(d => setResults(d.results || [])); };
  const loadProfile = (id: string) => { fetch(`${API}/api/guest360/profile/${id}`).then(r => r.json()).then(setProfile); };

  return (
    <div data-testid="guest-360-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(200,169,126,0.04)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.accent, marginBottom: 8 }}>Guest 360 Profile</div>
        <input value={search} onChange={e => { setSearch(e.target.value); doSearch(e.target.value); }} placeholder="Search by name, email, or room number..." style={{ width: "100%", maxWidth: 400, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} data-testid="guest360-search" />
        {results.length > 0 && !profile && (
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {results.map(r => (
              <button key={r.id} onClick={() => { loadProfile(r.id || r.room || r.name); setResults([]); }} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 11, cursor: "pointer" }}>
                {r.name} {r.vip && <Badge text="VIP" color={C.accent} />} <span style={{ color: C.dim }}>({r.type})</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {!profile ? (
          <div style={{ textAlign: "center", color: C.dim, padding: 60 }}>Search for a guest to view their unified 360 profile</div>
        ) : (
          <div>
            {/* Header */}
            <RightClickMenu items={[
              { label: "Send Welcome Email", icon: "✉", action: () => {}, color: "#3b82f6" },
              { label: "Mark as VIP", icon: "★", action: () => {}, color: "#c8a97e" },
              { label: "Add to Loyalty Program", icon: "♦", action: () => {}, color: "#8b5cf6" },
              { label: "divider", divider: true, action: () => {} },
              { label: "View Room Folio", icon: "📋", action: () => {} },
              { label: "Order IRD for Guest", icon: "🍽", action: () => window.open("/guest-order", "_blank"), color: "#f59e0b" },
            ]}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, cursor: "context-menu" }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{profile.profile.name} {profile.profile.vip && <Badge text="VIP" color={C.accent} />}</div>
                <div style={{ fontSize: 11, color: C.dim }}>{profile.profile.email} | {profile.profile.phone} {profile.profile.room_number && `| Room ${profile.profile.room_number}`}</div>
                {profile.profile.preferences && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Preferences: {profile.profile.preferences}</div>}
                {profile.profile.allergies && profile.profile.allergies !== "None" && <div style={{ fontSize: 11, color: C.red, marginTop: 2 }}>Allergies: {profile.profile.allergies}</div>}
              </div>
              <button onClick={() => setProfile(null)} style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.dim, fontSize: 11, cursor: "pointer", height: "fit-content" }}>Close</button>
            </div>
            </RightClickMenu>
            {/* Summary KPIs */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
              {[{ l: "Total Spend", v: fmt(profile.summary.total_spend) }, { l: "Interactions", v: profile.summary.total_interactions }, { l: "Spa Visits", v: `${profile.summary.spa_visits} (${fmt(profile.summary.spa_spend)})` }, { l: "Dining Rating", v: `${profile.summary.avg_dining_rating}/5` }, { l: "Concierge", v: `${profile.summary.concierge_tickets} tickets` }, { l: "Minibar", v: fmt(profile.summary.minibar_charges) }, { l: "IRD Orders", v: `${profile.summary.ird_orders} (${fmt(profile.summary.ird_spend)})` }].map(kpi => (
                <div key={kpi.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", flex: "1 1 120px", minWidth: 110 }}>
                  <div style={{ fontSize: 9, color: C.dim, textTransform: "uppercase", marginBottom: 4 }}>{kpi.l}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.v}</div>
                </div>
              ))}
            </div>
            {/* History sections */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[{ title: "Spa History", data: profile.spa_history, render: (i: any) => `${i.date} — ${i.treatment_name} (${fmt(i.price)})` },
                { title: "Concierge Issues", data: profile.concierge_history, render: (i: any) => `${i.title} [${i.status}] ${i.recovery_cost > 0 ? `Recovery: ${fmt(i.recovery_cost)}` : ""}` },
                { title: "Dining Feedback", data: profile.dining_feedback, render: (i: any) => `Rating: ${i.overall_rating}/5 — "${i.comment}"` },
                { title: "Minibar", data: profile.minibar_history, render: (i: any) => `${i.item_name} x${i.quantity} — ${fmt(i.total)}` },
              ].map(section => (
                <div key={section.title} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.accent, marginBottom: 8, textTransform: "uppercase" }}>{section.title} ({section.data?.length || 0})</div>
                  {(section.data || []).slice(0, 5).map((item: any, i: number) => (
                    <div key={i} style={{ fontSize: 11, color: C.text, padding: "4px 0", borderBottom: `1px solid ${C.border}15` }}>{section.render(item)}</div>
                  ))}
                  {(!section.data || section.data.length === 0) && <div style={{ fontSize: 10, color: C.dim }}>No records</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
