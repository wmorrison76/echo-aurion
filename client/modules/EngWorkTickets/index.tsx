import React, { useState, useEffect, useCallback } from "react";
import { RightClickMenu } from "@/lib/context-menu";

const API = window.location.origin;
const C = { bg: "#0b0f1a", card: "#111827", border: "#1e293b", accent: "#f59e0b", accentDim: "rgba(245,158,11,0.12)", green: "#10b981", red: "#ef4444", blue: "#3b82f6", purple: "#8b5cf6", cyan: "#06b6d4", text: "#e2e8f0", dim: "#64748b", muted: "#475569" };

type Tab = "dashboard" | "tickets" | "staff" | "guest-requests" | "analytics" | "integrations";

function Badge({ text, color }: { text: string; color: string }) {
  return <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${color}15`, color, textTransform: "uppercase" }}>{text}</span>;
}

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = { critical: C.red, high: "#f97316", medium: C.accent, low: C.dim };
  return <Badge text={priority} color={colors[priority] || C.dim} />;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { open: C.accent, in_progress: C.blue, completed: C.green, scheduled: C.purple, closed: C.dim, dispatched: C.cyan, resolved: C.green };
  return <Badge text={status.replace("_", " ")} color={colors[status] || C.dim} />;
}

/* ── Dashboard ── */
function DashboardTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/engineering-ops/dashboard`).then(r => r.json()).then(setData); }, []);
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading...</div>;
  const k = data.kpis;
  return (
    <div data-testid="eng-dashboard-tab">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {[{ l: "Total Tickets", v: k.total_tickets, c: C.text }, { l: "Open", v: k.open, c: C.accent }, { l: "In Progress", v: k.in_progress, c: C.blue }, { l: "Critical", v: k.critical, c: C.red }, { l: "Scheduled", v: k.scheduled, c: C.purple }, { l: "Active Staff", v: `${k.active_staff}/${k.total_staff}`, c: C.green }].map(kpi => (
          <div key={kpi.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", flex: "1 1 130px", minWidth: 120 }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{kpi.l}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: kpi.c, fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>By Trade</div>
          {Object.entries(data.by_trade || {}).map(([trade, count]) => {
            const tc = (data.trade_classifications || []).find((t: any) => t.id === trade);
            return (
              <div key={trade} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}30` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: tc?.color || C.dim }} />
                  <span style={{ fontSize: 12, color: C.text }}>{tc?.label || trade}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{count as number}</span>
              </div>
            );
          })}
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Recent Tickets</div>
          {(data.recent_tickets || []).slice(0, 6).map((t: any) => (
            <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}30` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</div>
                <div style={{ fontSize: 9, color: C.dim }}>{t.location} {t.room_number && `• Rm ${t.room_number}`}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}><PriorityBadge priority={t.priority} /><StatusBadge status={t.status} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Tickets Tab ── */
function TicketsTab() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filter, setFilter] = useState("");
  const load = useCallback(() => { const q = filter ? `?status=${filter}` : ""; fetch(`${API}/api/engineering-ops/tickets${q}`).then(r => r.json()).then(d => setTickets(d.tickets || [])); }, [filter]);
  useEffect(() => { load(); }, [load]);
  const updateStatus = (id: string, status: string) => { fetch(`${API}/api/engineering-ops/tickets/${id}/status?status=${status}`, { method: "PUT" }).then(() => load()); };
  return (
    <div data-testid="eng-tickets-tab">
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {["", "open", "in_progress", "scheduled", "completed"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${filter === f ? C.accent : C.border}`, background: filter === f ? C.accentDim : "transparent", color: filter === f ? C.accent : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{f || "All"}</button>
        ))}
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: "rgba(245,158,11,0.06)" }}>{["Title", "Trade", "Location", "Priority", "Assigned", "Status", "Actions"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.accent, fontWeight: 600, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {tickets.map(t => {
              const ctxItems = [
                ...(t.status !== "in_progress" ? [{ label: "Start Work", icon: "▶", action: () => updateStatus(t.id, "in_progress"), color: C.blue }] : []),
                ...(t.status !== "scheduled" ? [{ label: "Schedule", icon: "📅", action: () => updateStatus(t.id, "scheduled"), color: C.purple }] : []),
                ...(t.status !== "completed" ? [{ label: "Mark Complete", icon: "✓", action: () => updateStatus(t.id, "completed"), color: C.green }] : []),
                ...(t.status !== "closed" ? [{ label: "Close Ticket", icon: "✕", action: () => updateStatus(t.id, "closed") }] : []),
                { label: "divider", divider: true, action: () => {} },
                { label: "Set Critical", icon: "🔴", action: () => updateStatus(t.id, t.status), color: C.red },
              ];
              return (
              <RightClickMenu key={t.id} items={ctxItems}>
              <tr style={{ borderBottom: `1px solid ${C.border}40`, cursor: "context-menu" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(245,158,11,0.04)")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "8px 12px", color: C.text }}>{t.title}</td>
                <td style={{ padding: "8px 12px" }}><Badge text={t.trade} color={C.blue} /></td>
                <td style={{ padding: "8px 12px", color: C.dim }}>{t.location} {t.room_number && `Rm ${t.room_number}`}</td>
                <td style={{ padding: "8px 12px" }}><PriorityBadge priority={t.priority} /></td>
                <td style={{ padding: "8px 12px", color: C.text }}>{t.assigned_name}</td>
                <td style={{ padding: "8px 12px" }}><StatusBadge status={t.status} /></td>
                <td style={{ padding: "8px 12px" }}>
                  {t.status === "open" && <button onClick={() => updateStatus(t.id, "in_progress")} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.blue}30`, background: "transparent", color: C.blue, fontSize: 10, cursor: "pointer", marginRight: 4 }}>Start</button>}
                  {t.status === "in_progress" && <button onClick={() => updateStatus(t.id, "completed")} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.green}30`, background: "transparent", color: C.green, fontSize: 10, cursor: "pointer" }}>Complete</button>}
                </td>
              </tr>
              </RightClickMenu>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Staff Tab ── */
function StaffTab() {
  const [data, setData] = useState<any>(null);
  const [tradeFilter, setTradeFilter] = useState("");
  useEffect(() => { const q = tradeFilter ? `?trade=${tradeFilter}` : ""; fetch(`${API}/api/engineering-ops/staff${q}`).then(r => r.json()).then(setData); }, [tradeFilter]);
  if (!data) return null;
  return (
    <div data-testid="eng-staff-tab">
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        <button onClick={() => setTradeFilter("")} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${!tradeFilter ? C.accent : C.border}`, background: !tradeFilter ? C.accentDim : "transparent", color: !tradeFilter ? C.accent : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>All</button>
        {(data.trades || []).map((t: any) => (
          <button key={t.id} onClick={() => setTradeFilter(t.id)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${tradeFilter === t.id ? t.color : C.border}`, background: tradeFilter === t.id ? `${t.color}15` : "transparent", color: tradeFilter === t.id ? t.color : C.dim, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{t.label}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {(data.staff || []).map((s: any) => {
          const tc = (data.trades || []).find((t: any) => t.id === s.trade);
          return (
            <div key={s.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, borderLeft: `3px solid ${tc?.color || C.dim}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.name}</div>
                <Badge text={s.status} color={s.status === "active" ? C.green : C.red} />
              </div>
              <div style={{ fontSize: 11, color: tc?.color || C.dim, fontWeight: 600, marginBottom: 6 }}>{tc?.label || s.trade}</div>
              <div style={{ fontSize: 10, color: C.dim }}>Shift: {s.shift} | {s.email}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Guest Requests (Operations Hub) ── */
function GuestRequestsTab() {
  const [requests, setRequests] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ guest_name: "", room_number: "", request_type: "maintenance", description: "", priority: "normal", department: "engineering" });
  const load = () => { fetch(`${API}/api/engineering-ops/guest-requests`).then(r => r.json()).then(d => setRequests(d.requests || [])); };
  useEffect(() => { load(); }, []);
  const submit = () => {
    fetch(`${API}/api/engineering-ops/guest-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      .then(() => { setFormOpen(false); setForm({ guest_name: "", room_number: "", request_type: "maintenance", description: "", priority: "normal", department: "engineering" }); load(); });
  };
  const resolve = (id: string) => { fetch(`${API}/api/engineering-ops/guest-requests/${id}/resolve`, { method: "PUT" }).then(() => load()); };
  return (
    <div data-testid="eng-guest-requests-tab">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Guest Request Tracker</div>
        <button onClick={() => setFormOpen(!formOpen)} data-testid="new-guest-request-btn" style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: C.accent, color: "#000", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ New Request</button>
      </div>
      {formOpen && (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <input value={form.guest_name} onChange={e => setForm({ ...form, guest_name: e.target.value })} placeholder="Guest name" style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} />
          <input value={form.room_number} onChange={e => setForm({ ...form, room_number: e.target.value })} placeholder="Room #" style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }} />
          <select value={form.request_type} onChange={e => setForm({ ...form, request_type: e.target.value })} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }}>
            {["maintenance", "housekeeping", "amenity", "concierge"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12 }}>
            {["urgent", "normal", "low"].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description..." style={{ gridColumn: "1 / -1", padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 12, resize: "vertical" }} rows={2} />
          <button onClick={submit} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: C.green, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Submit</button>
        </div>
      )}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead><tr style={{ background: "rgba(245,158,11,0.06)" }}>{["Guest", "Room", "Type", "Description", "Priority", "Status", "Actions"].map(h => <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: C.accent, fontWeight: 600, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.border}` }}>{h}</th>)}</tr></thead>
          <tbody>
            {requests.map(r => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${C.border}40` }}>
                <td style={{ padding: "8px 12px", color: C.text }}>{r.guest_name}</td>
                <td style={{ padding: "8px 12px", color: C.text, fontWeight: 600 }}>{r.room_number}</td>
                <td style={{ padding: "8px 12px" }}><Badge text={r.request_type} color={C.blue} /></td>
                <td style={{ padding: "8px 12px", color: C.dim, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.description}</td>
                <td style={{ padding: "8px 12px" }}><PriorityBadge priority={r.priority} /></td>
                <td style={{ padding: "8px 12px" }}><StatusBadge status={r.status} /></td>
                <td style={{ padding: "8px 12px" }}>{r.status !== "resolved" && <button onClick={() => resolve(r.id)} style={{ padding: "3px 8px", borderRadius: 4, border: `1px solid ${C.green}30`, background: "transparent", color: C.green, fontSize: 10, cursor: "pointer" }}>Resolve</button>}</td>
              </tr>
            ))}
            {requests.length === 0 && <tr><td colSpan={7} style={{ padding: 20, textAlign: "center", color: C.dim }}>No guest requests</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Integrations Tab ── */
function IntegrationsTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/engineering-ops/integrations`).then(r => r.json()).then(setData); }, []);
  if (!data) return null;
  return (
    <div data-testid="eng-integrations-tab">
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>3rd Party Integration Connectors</div>
      <div style={{ fontSize: 11, color: C.dim, marginBottom: 16 }}>Configure API keys to connect with external operations platforms. All support webhook-based two-way sync.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {(data.integrations || []).map((int: any) => (
          <div key={int.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{int.name}</div>
              <Badge text={int.connected ? "Connected" : "Available"} color={int.connected ? C.green : C.accent} />
            </div>
            <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, marginBottom: 12 }}>{int.description}</div>
            <button style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${C.accent}`, background: "transparent", color: C.accent, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{int.connected ? "Settings" : "Configure API Key"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Engineering Analytics Tab ── */
function EngAnalyticsTab() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch(`${API}/api/dept-analytics/engineering`).then(r => r.json()).then(setData); }, []);
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: C.dim }}>Loading analytics...</div>;
  const k = data.kpis;
  return (
    <div data-testid="eng-analytics-tab">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {[{ l: "Total Tickets", v: k.total_tickets }, { l: "Open", v: k.open_tickets, c: C.amber }, { l: "Completed", v: k.completed, c: C.green }, { l: "Resolution Rate", v: `${k.resolution_rate}%` }, { l: "Critical Open", v: k.critical_open, c: C.red }, { l: "Guest Requests", v: k.guest_requests }, { l: "Resolved Requests", v: k.resolved_requests }, { l: "Avg Resolution", v: k.avg_resolution_mins > 0 ? `${k.avg_resolution_mins}m` : "—" }].map(kpi => (
          <div key={kpi.l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", flex: "1 1 130px", minWidth: 120 }}>
            <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, marginBottom: 6 }}>{kpi.l}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: (kpi as any).c || C.text, fontFamily: "'IBM Plex Mono', monospace" }}>{kpi.v}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>By Trade Classification</div>
          {(data.trade_breakdown || []).map((t: any) => (
            <div key={t.trade} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: C.text, textTransform: "capitalize" }}>{t.trade}</span>
                <span style={{ fontSize: 10, color: C.dim }}>{t.completed}/{t.total} ({t.completion_rate}%)</span>
              </div>
              <div style={{ height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${t.completion_rate}%`, background: t.completion_rate >= 80 ? C.green : t.completion_rate >= 50 ? C.amber : C.red, borderRadius: 2, transition: "width 0.6s" }} />
              </div>
              <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{t.total_hours}h estimated</div>
            </div>
          ))}
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>Staff Workload</div>
          {(data.staff_workload || []).map((s: any) => (
            <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
              <div>
                <span style={{ fontSize: 11, color: C.text }}>{s.name}</span>
                <span style={{ fontSize: 9, color: C.dim, marginLeft: 6 }}>({s.trade} / {s.shift})</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: 10, color: C.amber }}>{s.assigned} assigned</span>
                <span style={{ fontSize: 10, color: C.green }}>{s.completed} done</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>By Priority</div>
          {(data.priority_breakdown || []).map((p: any) => {
            const pColors: Record<string, string> = { critical: C.red, high: "#f97316", medium: C.amber, low: C.dim };
            return (
              <div key={p.priority} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
                <Badge text={p.priority} color={pColors[p.priority] || C.dim} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.count}</span>
              </div>
            );
          })}
        </div>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.accent, marginBottom: 12, textTransform: "uppercase" }}>By Category</div>
          {(data.category_breakdown || []).map((c: any) => (
            <div key={c.category} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}20` }}>
              <span style={{ fontSize: 11, color: C.text, textTransform: "capitalize" }}>{c.category}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function EngWorkTickets() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const tabs: { id: Tab; label: string }[] = [{ id: "dashboard", label: "Dashboard" }, { id: "tickets", label: "Work Tickets" }, { id: "staff", label: "Staff Schedule" }, { id: "guest-requests", label: "Guest Requests" }, { id: "analytics", label: "Analytics" }, { id: "integrations", label: "Integrations" }];
  return (
    <div data-testid="eng-work-tickets-panel" style={{ height: "100%", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: "rgba(245,158,11,0.04)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} data-testid={`eng-tab-${t.id}`} style={{ padding: "6px 16px", borderRadius: 6, border: `1px solid ${tab === t.id ? C.accent : "transparent"}`, background: tab === t.id ? C.accentDim : "transparent", color: tab === t.id ? C.accent : C.dim, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.15s" }}>{t.label}</button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
        {tab === "dashboard" && <DashboardTab />}
        {tab === "tickets" && <TicketsTab />}
        {tab === "staff" && <StaffTab />}
        {tab === "guest-requests" && <GuestRequestsTab />}
        {tab === "analytics" && <EngAnalyticsTab />}
        {tab === "integrations" && <IntegrationsTab />}
      </div>
    </div>
  );
}
