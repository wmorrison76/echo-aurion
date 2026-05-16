/**
 * iter173 · Phase 3 — Relay Ticket System
 *
 * Lean ticket intake for department leads. Separated from Concierge
 * (which remains the full guest orchestration surface) so anyone on the
 * property can raise a ticket without being trained on the whole Concierge OS.
 *
 * Tickets marked "needs concierge" auto-appear in Concierge Mission Control.
 */
import React, { useEffect, useState } from "react";
import { usePanelState } from "../../lib/usePanelState";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};
const PANEL_ID = "relay";

const KINDS = ["guest-request", "maintenance", "housekeeping", "food-beverage", "transport", "amenity", "complaint", "lost-found", "concierge-handoff", "medical", "security", "other"];
const STATUSES = ["open", "in_progress", "waiting-guest", "resolved", "cancelled"];
const PRIORITIES = ["low", "normal", "high", "urgent"];
const DEPARTMENTS = ["front-office", "guest-services", "housekeeping", "engineering", "fb", "culinary", "pastry", "sales", "marketing", "people-services", "finance", "spa", "lifestyle", "security", "activities", "ird", "concierge"];

const STATUS_COLORS: Record<string, string> = {
  open: "#38bdf8", in_progress: "#fbbf24", "waiting-guest": "#a78bfa",
  resolved: "#22c55e", cancelled: "#94a3b8",
};
const PRIO_COLORS: Record<string, string> = {
  low: "#64748b", normal: "#cbd5e1", high: "#fbbf24", urgent: "#ef4444",
};

export default function Relay() {
  const [tab, setTab] = usePanelState<string>(PANEL_ID, "tab", "queue");
  const [kpi, setKpi] = useState<any>(null);

  async function loadKpi() {
    const r = await fetch(`${API()}/api/relay/dashboard`);
    setKpi(await r.json());
  }
  useEffect(() => { loadKpi(); }, []);

  return (
    <div data-testid="relay-panel" style={S.root}>
      <header style={S.header}>
        <div>
          <div style={S.eyebrow}>Relay · Ticket Intake</div>
          <h1 style={S.title}>Lean Tickets for Every Department</h1>
          <p style={S.sub}>Raise a ticket without logging into Concierge. Mark "needs concierge" and Mission Control picks it up.</p>
        </div>
        {kpi && (
          <div style={S.kpiRow}>
            <Kpi label="Open" value={kpi.open} tone="sky" />
            <Kpi label="In Progress" value={kpi.in_progress} tone="amber" />
            <Kpi label="Urgent" value={kpi.urgent_open} tone="red" />
            <Kpi label="Resolved 24h" value={kpi.resolved_24h} tone="green" />
          </div>
        )}
      </header>

      <nav style={S.tabs}>
        {[
          { id: "queue", label: "Queue" },
          { id: "new", label: "+ New Ticket" },
        ].map((t) => (
          <button key={t.id} data-testid={`relay-tab-${t.id}`} onClick={() => setTab(t.id)}
            style={{ ...S.tab, ...(tab === t.id ? S.tabOn : {}) }}>{t.label}</button>
        ))}
      </nav>

      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        {tab === "queue" && <QueueTab onChanged={loadKpi} />}
        {tab === "new" && <NewTicketTab onCreated={() => { loadKpi(); setTab("queue"); }} />}
      </div>
    </div>
  );
}

function QueueTab({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = usePanelState<string>(PANEL_ID, "q-status", "");
  const [dept, setDept] = usePanelState<string>(PANEL_ID, "q-dept", "");

  async function load() {
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (dept) q.set("assigned_to_department", dept);
    const r = await fetch(`${API()}/api/relay/tickets?${q.toString()}`);
    const j = await r.json();
    setItems(j.tickets || []);
  }
  useEffect(() => { load(); }, [status, dept]);

  async function updateStatus(id: string, newStatus: string) {
    await fetch(`${API()}/api/relay/ticket/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, actor: "dashboard-user" }),
    });
    await load(); onChanged();
  }

  return (
    <div>
      <div style={S.toolbar}>
        <select data-testid="relay-filter-status" value={status} onChange={e => setStatus(e.target.value)} style={S.input}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select data-testid="relay-filter-dept" value={dept} onChange={e => setDept(e.target.value)} style={S.input}>
          <option value="">All departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{items.length} tickets</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(t => (
          <div key={t.id} data-testid={`relay-ticket-${t.id}`} style={{ ...S.ticketCard, borderLeft: `3px solid ${PRIO_COLORS[t.priority]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: "#c8a97e", fontFamily: "monospace", fontWeight: 700 }}>{t.ticket_no}</span>
                  <span style={{ ...S.pill, background: `${STATUS_COLORS[t.status]}22`, color: STATUS_COLORS[t.status] }}>{t.status}</span>
                  <span style={{ ...S.pill, background: `${PRIO_COLORS[t.priority]}22`, color: PRIO_COLORS[t.priority] }}>{t.priority}</span>
                  <span style={{ ...S.pill, background: "rgba(255,255,255,0.06)", color: "#cbd5e1" }}>{t.kind}</span>
                  {t.needs_concierge && <span style={{ ...S.pill, background: "rgba(200,169,126,0.15)", color: "#c8a97e" }}>→ concierge</span>}
                </div>
                <div style={{ fontSize: 14, color: "#f8fafc", fontWeight: 600, marginTop: 6 }}>{t.summary}</div>
                {t.details && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{t.details}</div>}
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>
                  raised by {t.raised_by_name} ({t.raised_by_department}) · {t.guest_name ? `guest: ${t.guest_name} rm${t.room || "—"}` : "BOH"}
                  {t.assigned_to_department && <> · → {t.assigned_to_department}{t.assigned_to_name ? ` (${t.assigned_to_name})` : ""}</>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {t.status === "open" && <button data-testid={`relay-start-${t.id}`} onClick={() => updateStatus(t.id, "in_progress")} style={S.tinyBtn}>Start</button>}
                {t.status === "in_progress" && <button data-testid={`relay-resolve-${t.id}`} onClick={() => updateStatus(t.id, "resolved")} style={{ ...S.tinyBtn, color: "#22c55e" }}>Resolve ✓</button>}
                {t.status !== "cancelled" && t.status !== "resolved" && <button onClick={() => updateStatus(t.id, "cancelled")} style={{ ...S.tinyBtn, color: "#fca5a5" }}>Cancel</button>}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div style={S.empty}>No tickets match. Use "+ New Ticket" to create one.</div>}
      </div>
    </div>
  );
}

function NewTicketTab({ onCreated }: { onCreated: () => void }) {
  const [t, setT] = useState<any>({
    raised_by_name: "", raised_by_department: "front-office", raised_by_role: "",
    guest_name: "", room: "", kind: "guest-request", summary: "", details: "",
    priority: "normal", assigned_to_department: "", needs_concierge: false, tags: [],
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function create() {
    if (!t.summary || !t.raised_by_name) { alert("Summary and your name are required."); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`${API()}/api/relay/ticket/create`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(t),
      });
      const j = await r.json();
      if (r.ok) {
        setMsg(`✓ Created ${j.ticket.ticket_no}`);
        setT({ ...t, summary: "", details: "", guest_name: "", room: "" });
        setTimeout(onCreated, 600);
      } else setMsg(`Error: ${JSON.stringify(j).slice(0, 200)}`);
    } finally { setBusy(false); }
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={S.card}>
        <div style={S.eyebrow}>Raise a ticket</div>
        <div style={S.formGrid}>
          <Field label="Your name"><input data-testid="relay-new-raised-by" value={t.raised_by_name} onChange={e => setT({ ...t, raised_by_name: e.target.value })} style={S.input} /></Field>
          <Field label="Your department"><select value={t.raised_by_department} onChange={e => setT({ ...t, raised_by_department: e.target.value })} style={S.input}>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Kind"><select data-testid="relay-new-kind" value={t.kind} onChange={e => setT({ ...t, kind: e.target.value })} style={S.input}>{KINDS.map(k => <option key={k}>{k}</option>)}</select></Field>
          <Field label="Priority"><select value={t.priority} onChange={e => setT({ ...t, priority: e.target.value })} style={S.input}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Guest name (optional)"><input value={t.guest_name} onChange={e => setT({ ...t, guest_name: e.target.value })} style={S.input} /></Field>
          <Field label="Room (optional)"><input value={t.room} onChange={e => setT({ ...t, room: e.target.value })} style={S.input} /></Field>
          <Field label="Route to department"><select value={t.assigned_to_department} onChange={e => setT({ ...t, assigned_to_department: e.target.value })} style={S.input}><option value="">—</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Needs concierge"><label style={{ display: "flex", alignItems: "center", gap: 8, color: "#cbd5e1", fontSize: 12 }}><input type="checkbox" checked={t.needs_concierge} onChange={e => setT({ ...t, needs_concierge: e.target.checked })} data-testid="relay-new-concierge" /> mirror to Concierge Mission Control</label></Field>
        </div>
        <div style={{ marginTop: 10 }}>
          <Field label="Summary (one line)"><input data-testid="relay-new-summary" value={t.summary} onChange={e => setT({ ...t, summary: e.target.value })} style={S.input} /></Field>
        </div>
        <div style={{ marginTop: 10 }}>
          <Field label="Details"><textarea value={t.details} onChange={e => setT({ ...t, details: e.target.value })} style={{ ...S.input, minHeight: 80 }} /></Field>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
          <button data-testid="relay-create" disabled={busy} onClick={create} style={S.primaryBtn}>{busy ? "Creating…" : "+ Create ticket"}</button>
        </div>
        {msg && <div style={{ marginTop: 10, padding: 10, background: "rgba(200,169,126,0.08)", borderRadius: 6, color: "#f8fafc", fontSize: 12 }}>{msg}</div>}
      </div>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: any; tone: "sky" | "amber" | "red" | "green" }) {
  const colors = { sky: "#38bdf8", amber: "#fbbf24", red: "#ef4444", green: "#22c55e" };
  return (
    <div style={{ padding: "8px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 22, color: colors[tone], fontWeight: 800, marginTop: 2 }}>{value}</div>
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
  header: { padding: "14px 20px", borderBottom: "1px solid rgba(200,169,126,0.15)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  eyebrow: { fontSize: 9, letterSpacing: 3, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" },
  title: { fontSize: 22, fontWeight: 700, color: "#f8fafc", marginTop: 4 },
  sub: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  kpiRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  tabs: { display: "flex", gap: 2, padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  tab: { padding: "12px 16px", background: "transparent", border: 0, color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer", borderBottom: "2px solid transparent", textTransform: "uppercase", letterSpacing: 1 },
  tabOn: { color: "#c8a97e", borderBottomColor: "#c8a97e" },
  toolbar: { display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" },
  input: { padding: "8px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#f8fafc", fontSize: 13, outline: "none" },
  primaryBtn: { padding: "10px 16px", borderRadius: 8, background: "rgba(200,169,126,0.15)", border: "1px solid rgba(200,169,126,0.5)", color: "#c8a97e", fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 },
  tinyBtn: { padding: "4px 10px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", fontSize: 10, cursor: "pointer", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },
  card: { padding: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 },
  ticketCard: { padding: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8 },
  pill: { fontSize: 9, padding: "2px 8px", borderRadius: 999, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" as const },
  empty: { color: "#64748b", fontSize: 12, fontStyle: "italic", textAlign: "center", padding: 30 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 10 },
};
