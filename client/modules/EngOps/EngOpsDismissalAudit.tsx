/**
 * EngOpsDismissalAudit — audit log UI for dismissed notifications.
 * Shows who dismissed what, when, reason, and priority breakdown.
 */
import React, { useEffect, useState } from "react";
import { adminFetch, ensureAdminToken } from "../../lib/admin-auth";

const API = "";

interface Row {
  id: string;
  notif_id: string;
  title: string;
  assignee?: string;
  priority: string;
  dismissed_by?: string;
  reason?: string;
  dismissed_at: string;
  source?: string;
}

interface Summary {
  items: Row[];
  total: number;
  by_priority: Record<string, number>;
  high_recent_7d: number;
}

export function EngOpsDismissalAudit() {
  const [data, setData] = useState<Summary | null>(null);
  const [priority, setPriority] = useState<string>("");
  const [actor, setActor] = useState<string>("");

  useEffect(() => {
    if (!ensureAdminToken()) return;
    const qs = new URLSearchParams();
    if (priority) qs.set("priority", priority);
    if (actor) qs.set("actor", actor);
    qs.set("limit", "200");
    adminFetch(`${API}/api/eng-ops/dismissal-audit?${qs}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [priority, actor]);

  return (
    <div style={wrap} data-testid="eng-ops-dismissal-audit-page">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={eyebrow}>Eng Ops · Dismissal Audit</div>
            <h1 style={h1}>Who dismissed what</h1>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href="/eng-ops/notifications" style={pill}>← Notifications</a>
            <a href="/eng-ops/stratus" style={pill}>Stratus plans →</a>
          </div>
        </div>

        {data && (
          <>
            <div style={kpiGrid}>
              <Kpi label="Total dismissals" value={data.total} />
              <Kpi label="Critical+High dismissals (7d)" value={data.high_recent_7d} accent />
              <Kpi label="Critical" value={data.by_priority?.critical || 0} />
              <Kpi label="High" value={data.by_priority?.high || 0} />
            </div>

            <div style={filterRow}>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} style={selectStyle} data-testid="dismissal-audit-priority-filter">
                <option value="">All priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <input value={actor} onChange={(e) => setActor(e.target.value)} placeholder="Filter by actor" style={inputStyle} data-testid="dismissal-audit-actor-filter" />
            </div>

            <div style={tableWrap}>
              <table style={tableStyle} data-testid="dismissal-audit-table">
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                    <th style={thStyle}>When</th>
                    <th style={thStyle}>Title</th>
                    <th style={thStyle}>Priority</th>
                    <th style={thStyle}>Dismissed by</th>
                    <th style={thStyle}>Reason</th>
                    <th style={thStyle}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748b" }}>No dismissals yet.</td></tr>
                  )}
                  {data.items.map((r) => (
                    <tr key={r.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} data-testid={`dismissal-audit-row-${r.id}`}>
                      <td style={{ ...tdStyle, color: "#94a3b8" }}>{fmtDate(r.dismissed_at)}</td>
                      <td style={tdStyle}>{r.title}</td>
                      <td style={tdStyle}>
                        <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 700,
                          background: priorityBg(r.priority), color: priorityColor(r.priority) }}>
                          {r.priority?.toUpperCase()}
                        </span>
                      </td>
                      <td style={tdStyle}>{r.dismissed_by || "—"}</td>
                      <td style={{ ...tdStyle, color: "#cbd5e1" }}>{r.reason || "—"}</td>
                      <td style={{ ...tdStyle, color: "#94a3b8", fontSize: 12 }}>{r.source || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <div style={{ padding: 22, borderRadius: 14, background: "rgba(255,255,255,0.03)", border: `1px solid ${accent ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.06)"}` }}>
      <div style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>{label}</div>
      <div style={{ color: accent ? "#fca5a5" : "#f8fafc", fontSize: 36, fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, marginTop: 6, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function priorityColor(p: string) {
  return p === "critical" ? "#fca5a5" : p === "high" ? "#fbbf24" : p === "medium" ? "#c8a97e" : "#94a3b8";
}
function priorityBg(p: string) {
  return p === "critical" ? "rgba(239,68,68,0.18)" : p === "high" ? "rgba(245,158,11,0.18)" : p === "medium" ? "rgba(200,169,126,0.18)" : "rgba(148,163,184,0.15)";
}
function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

const wrap: React.CSSProperties = {
  minHeight: "100vh", padding: "40px 24px 60px",
  background: "radial-gradient(900px 400px at 20% -10%, rgba(239,68,68,0.08), transparent), #0b1020",
  color: "#f8fafc", fontFamily: "system-ui, sans-serif",
};
const eyebrow: React.CSSProperties = { fontSize: 12, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" };
const h1: React.CSSProperties = { fontSize: 48, margin: "10px 0 0", fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, lineHeight: 1 };
const pill: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 99, background: "rgba(255,255,255,0.06)",
  color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none", fontWeight: 600, fontSize: 13,
};
const kpiGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 18 };
const filterRow: React.CSSProperties = { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" };
const inputStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 10, background: "rgba(0,0,0,0.3)",
  color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)", fontSize: 14, minWidth: 200,
};
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };
const tableWrap: React.CSSProperties = {
  padding: 4, borderRadius: 14, background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)", overflow: "hidden",
};
const tableStyle: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 14 };
const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "12px 14px", color: "#94a3b8",
  fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 1,
};
const tdStyle: React.CSSProperties = { padding: "14px 14px", color: "#f8fafc" };
