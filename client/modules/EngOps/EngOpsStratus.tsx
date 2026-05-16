/**
 * EngOpsStratus — Stratus SLA plans list + create + escalation run.
 */
import React, { useEffect, useState } from "react";
import { adminFetch, ensureAdminToken } from "../../lib/admin-auth";

const API = "";

interface Plan {
  id: string;
  title: string;
  detail?: string;
  priority: string;
  category?: string;
  assignee?: string;
  assignee_role?: string;
  sla_hours: number;
  status: string;
  escalation_level: number;
  created_at: string;
  due_at: string;
  events?: Array<{ at: string; kind: string; note?: string; from_role?: string; to_role?: string }>;
}

export function EngOpsStratus() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [priority, setPriority] = useState<string>("");
  const [status, setStatus] = useState<string>("open");
  const [refresh, setRefresh] = useState(0);
  const [creating, setCreating] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [escResult, setEscResult] = useState<any>(null);

  useEffect(() => {
    const qs = new URLSearchParams();
    if (priority) qs.set("priority", priority);
    if (status) qs.set("status", status);
    qs.set("limit", "100");
    fetch(`${API}/api/eng-ops/stratus/plans?${qs}`)
      .then((r) => r.json())
      .then((d) => setPlans(d.plans || []))
      .catch(() => setPlans([]));
  }, [priority, status, refresh]);

  const runEscalation = async () => {
    setEscalating(true);
    try {
      if (!ensureAdminToken()) return;
      const r = await adminFetch(`${API}/api/eng-ops/stratus/plans/run-escalation`, { method: "POST" });
      setEscResult(await r.json());
      setRefresh((x) => x + 1);
    } finally {
      setEscalating(false);
    }
  };

  const resolve = async (plan_id: string) => {
    const reason = prompt("Resolution note?");
    if (reason == null) return;
    await fetch(`${API}/api/eng-ops/stratus/plans/${plan_id}/resolve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, actor: "admin" }),
    });
    setRefresh((x) => x + 1);
  };

  return (
    <div style={wrap} data-testid="eng-ops-stratus-page">
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={eyebrow}>Eng Ops · Stratus Plans</div>
            <h1 style={h1}>SLA escalation chain</h1>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>owner → duty_manager → GM · auto-escalated every 15 min</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href="/eng-ops/notifications" style={pill}>← Inbox</a>
            <a href="/eng-ops/dismissal-audit" style={pill}>Dismissal audit</a>
            <button onClick={() => setCreating(true)} style={pillAccent} data-testid="stratus-create-btn">+ New plan</button>
            <button onClick={runEscalation} disabled={escalating} style={pill} data-testid="stratus-run-escalation">
              {escalating ? "Escalating…" : "Run escalation now"}
            </button>
          </div>
        </div>

        {escResult && (
          <div style={{ padding: 14, marginBottom: 14, borderRadius: 10,
            background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)" }}
            data-testid="stratus-escalation-result">
            <b style={{ color: "#86efac" }}>Escalation run:</b> scanned {escResult.scanned} · escalated {escResult.escalated?.length || 0}
          </div>
        )}

        <div style={filterRow}>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={selectStyle}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={selectStyle}>
            <option value="">All priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {plans.length === 0 && <div style={emptyStyle}>No plans.</div>}
        <div style={{ display: "grid", gap: 10 }}>
          {plans.map((p) => (
            <div key={p.id} style={{
              ...cardStyle, borderLeft: `3px solid ${priorityColor(p.priority)}`,
              opacity: p.status === "resolved" ? 0.6 : 1,
            }} data-testid={`stratus-plan-${p.id}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ ...pillTiny, background: priorityBg(p.priority), color: priorityColor(p.priority) }}>{p.priority?.toUpperCase()}</span>
                  <span style={{ ...pillTiny, background: "rgba(255,255,255,0.06)", color: "#cbd5e1" }}>level {p.escalation_level} · {p.assignee_role}</span>
                  <span style={{ color: "#94a3b8", fontSize: 12 }}>{p.category || "general"}</span>
                  <span style={{ color: "#64748b", fontSize: 11, marginLeft: "auto" }}>due {fmtDate(p.due_at)}</span>
                </div>
                <div style={{ fontSize: 15, color: "#f8fafc", fontWeight: 600 }}>{p.title}</div>
                {p.detail && <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{p.detail}</div>}
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
                  SLA {p.sla_hours}h · {p.events?.length || 0} events
                </div>
              </div>
              {p.status === "open" && (
                <button onClick={() => resolve(p.id)} style={mini} data-testid={`stratus-resolve-${p.id}`}>Resolve</button>
              )}
              {p.status === "resolved" && (
                <span style={{ ...pillTiny, background: "rgba(34,197,94,0.18)", color: "#86efac", padding: "6px 12px" }}>Resolved</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {creating && <CreatePlanModal onClose={() => { setCreating(false); setRefresh((x) => x + 1); }} />}
    </div>
  );
}

function CreatePlanModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [priority, setPriority] = useState("high");
  const [category, setCategory] = useState("");
  const [assignee, setAssignee] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/api/eng-ops/stratus/plans`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), detail, priority, category, assignee }),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={modalBg} onClick={onClose} data-testid="stratus-create-modal">
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0, color: "#f8fafc", fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, fontSize: 28 }}>New Stratus plan</h2>
        <label style={label}>Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={input} data-testid="stratus-new-title" placeholder="Short description of the plan" />
        </label>
        <label style={label}>Detail (optional)
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} style={{ ...input, minHeight: 80, resize: "vertical" }} data-testid="stratus-new-detail" />
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={label}>Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)} style={input} data-testid="stratus-new-priority">
              <option value="critical">Critical (2h SLA)</option>
              <option value="high">High (8h SLA)</option>
              <option value="medium">Medium (48h SLA)</option>
              <option value="low">Low (168h SLA)</option>
            </select>
          </label>
          <label style={label}>Category
            <input value={category} onChange={(e) => setCategory(e.target.value)} style={input} placeholder="e.g. facilities, IT" />
          </label>
        </div>
        <label style={label}>Assignee (role or email)
          <input value={assignee} onChange={(e) => setAssignee(e.target.value)} style={input} placeholder="e.g. owner" />
        </label>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={submit} disabled={submitting} style={saveBtn} data-testid="stratus-new-submit">
            {submitting ? "Creating…" : "Create plan"}
          </button>
          <button onClick={onClose} style={cancelBtn}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function priorityColor(p: string) {
  return p === "critical" ? "#ef4444" : p === "high" ? "#f59e0b" : p === "medium" ? "#c8a97e" : "#94a3b8";
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
  background: "radial-gradient(900px 400px at 20% -10%, rgba(245,158,11,0.08), transparent), #0b1020",
  color: "#f8fafc", fontFamily: "system-ui, sans-serif",
};
const eyebrow: React.CSSProperties = { fontSize: 12, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" };
const h1: React.CSSProperties = { fontSize: 48, margin: "10px 0 0", fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 400, lineHeight: 1 };
const pill: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 99, background: "rgba(255,255,255,0.06)",
  color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none",
  fontWeight: 600, fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center",
};
const pillAccent: React.CSSProperties = { ...pill, background: "#c8a97e", color: "#0b1020", border: 0 };
const filterRow: React.CSSProperties = { display: "flex", gap: 10, marginBottom: 16 };
const selectStyle: React.CSSProperties = {
  padding: "10px 14px", borderRadius: 10, background: "rgba(0,0,0,0.3)",
  color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)", fontSize: 14, cursor: "pointer",
};
const cardStyle: React.CSSProperties = {
  padding: 16, borderRadius: 12, background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "flex-start", gap: 12,
};
const emptyStyle: React.CSSProperties = { padding: 40, textAlign: "center", color: "#64748b" };
const pillTiny: React.CSSProperties = {
  padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
};
const mini: React.CSSProperties = {
  padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)", color: "#cbd5e1", cursor: "pointer", fontSize: 12, fontWeight: 600,
};
const modalBg: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
  display: "flex", alignItems: "center", justifyContent: "center",
  zIndex: 1000, padding: 24, backdropFilter: "blur(4px)",
};
const modalCard: React.CSSProperties = {
  width: "min(540px, 100%)", padding: 24, borderRadius: 16,
  background: "#0b1020", border: "1px solid rgba(200,169,126,0.25)",
};
const label: React.CSSProperties = {
  fontSize: 12, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1,
  display: "flex", flexDirection: "column", gap: 6, marginBottom: 10,
};
const input: React.CSSProperties = {
  padding: "10px 12px", borderRadius: 8, background: "rgba(0,0,0,0.4)",
  color: "#f8fafc", border: "1px solid rgba(255,255,255,0.1)", fontSize: 14, fontFamily: "system-ui",
};
const saveBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 10, border: 0,
  background: "#c8a97e", color: "#0b1020", fontWeight: 700, cursor: "pointer",
};
const cancelBtn: React.CSSProperties = {
  padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
  background: "transparent", color: "#cbd5e1", cursor: "pointer", fontWeight: 600,
};
