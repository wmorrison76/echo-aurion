/**
 * EngOpsNotifications — Assigned-to-you notification tracker for engineering managers.
 * Renders as a standalone dashboard at /eng-ops/notifications.
 */
import React, { useEffect, useState } from "react";

const API = "";

interface Notif {
  id: string;
  assignee?: string;
  title: string;
  detail?: string;
  priority: "low" | "medium" | "high" | "critical";
  source?: string;
  deep_link?: string;
  read?: boolean;
  dismissed?: boolean;
  created_at?: string;
}

export function EngOpsNotifications() {
  const [items, setItems] = useState<Notif[]>([]);
  const [assignee, setAssignee] = useState<string>("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (assignee) qs.set("assignee", assignee);
    if (unreadOnly) qs.set("unread_only", "true");
    qs.set("limit", "100");
    fetch(`${API}/api/eng-ops/notifications/assigned?${qs}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]));
  }, [assignee, unreadOnly, refresh]);

  const markRead = async (id: string) => {
    await fetch(`${API}/api/eng-ops/notifications/${id}/read`, { method: "POST" });
    setRefresh((x) => x + 1);
  };
  const dismiss = async (id: string) => {
    const reason = prompt("Reason for dismissing? (audit log)");
    if (reason == null) return;
    await fetch(`${API}/api/eng-ops/notifications/${id}/dismiss`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, actor: assignee || "admin" }),
    });
    setRefresh((x) => x + 1);
  };

  return (
    <div style={wrap} data-testid="eng-ops-notifications-page">
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={eyebrow}>Eng Ops · Assigned Notifications</div>
        <h1 style={h1}>Your inbox</h1>

        <div style={filterRow}>
          <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Filter by assignee (role or email)" style={inputStyle} data-testid="eng-ops-assignee-filter" />
          <button onClick={() => setUnreadOnly((v) => !v)} style={{ ...pillBtn, ...(unreadOnly ? pillActive : {}) }} data-testid="eng-ops-unread-toggle">
            {unreadOnly ? "Unread only ✓" : "Show all"}
          </button>
          <a href="/eng-ops/dismissal-audit" style={pillBtn}>Dismissal audit →</a>
          <a href="/eng-ops/stratus" style={pillBtn}>Stratus plans →</a>
        </div>

        {items.length === 0 && <div style={emptyStyle}>No notifications.</div>}
        {items.map((n) => (
          <div key={n.id} style={{
            ...cardStyle,
            opacity: n.read ? 0.65 : 1,
            borderLeft: `3px solid ${priorityColor(n.priority)}`,
          }} data-testid={`eng-ops-notif-${n.id}`}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span style={{ ...pillTiny, background: `${priorityColor(n.priority)}22`, color: priorityColor(n.priority) }}>
                  {n.priority.toUpperCase()}
                </span>
                <span style={{ color: "#94a3b8", fontSize: 12 }}>{n.source || "system"}</span>
                <span style={{ color: "#64748b", fontSize: 11, marginLeft: "auto" }}>{fmtDate(n.created_at)}</span>
              </div>
              <div style={{ fontSize: 15, color: "#f8fafc", fontWeight: 600 }}>{n.title}</div>
              {n.detail && <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{n.detail}</div>}
              {n.assignee && <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>→ <b>{n.assignee}</b></div>}
            </div>
            <div style={{ display: "flex", gap: 6, marginLeft: 12 }}>
              {!n.read && <button onClick={() => markRead(n.id)} style={mini} data-testid={`eng-ops-read-${n.id}`}>Mark read</button>}
              {!n.dismissed && <button onClick={() => dismiss(n.id)} style={{ ...mini, color: "#fca5a5" }} data-testid={`eng-ops-dismiss-${n.id}`}>Dismiss</button>}
              {n.deep_link && <a href={n.deep_link} style={{ ...mini, color: "#c8a97e", textDecoration: "none" }}>Open →</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function priorityColor(p: string) {
  return p === "critical" ? "#ef4444" : p === "high" ? "#f59e0b" : p === "medium" ? "#c8a97e" : "#94a3b8";
}
function fmtDate(iso?: string) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); }
  catch { return iso; }
}

const wrap: React.CSSProperties = {
  minHeight: "100vh", padding: "40px 24px 60px",
  background: "radial-gradient(900px 400px at 20% -10%, rgba(200,169,126,0.1), transparent), #0b1020",
  color: "#f8fafc", fontFamily: "system-ui, sans-serif",
};
const eyebrow: React.CSSProperties = {
  fontSize: 12, letterSpacing: 2, color: "#c8a97e",
  fontWeight: 700, textTransform: "uppercase",
};
const h1: React.CSSProperties = { fontSize: 48, margin: "10px 0 20px", fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, lineHeight: 1 };
const filterRow: React.CSSProperties = { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" };
const inputStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 10, background: "rgba(0,0,0,0.3)",
  color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)", fontSize: 14, minWidth: 240,
};
const pillBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 99, background: "rgba(255,255,255,0.06)",
  color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)",
  cursor: "pointer", fontWeight: 600, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center",
};
const pillActive: React.CSSProperties = { background: "rgba(200,169,126,0.18)", borderColor: "rgba(200,169,126,0.5)", color: "#c8a97e" };
const cardStyle: React.CSSProperties = {
  padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)", marginBottom: 10,
  display: "flex", alignItems: "flex-start",
};
const emptyStyle: React.CSSProperties = { padding: 40, textAlign: "center", color: "#64748b" };
const pillTiny: React.CSSProperties = {
  padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
};
const mini: React.CSSProperties = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
  background: "transparent", color: "#cbd5e1", cursor: "pointer", fontSize: 12, fontWeight: 600,
};
