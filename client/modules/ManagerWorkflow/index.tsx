/** iter249 · Manager Workflow desktop panel.
 *
 * Single panel for the manager-on-duty / GM with 4 tabs:
 *   PTO Approvals · Shift-Swap Approvals · Call-Out Queue · Manager-on-Duty Chat
 *
 * Decisions push back to the requester's MyEcho via /api/manager-workflow.
 */
import React from "react";

const API = (window as any).location.origin;
const C = {
  bg: "#04060d", surface: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)",
  accent: "#d4af37", text: "#f5efe4", dim: "#94a3b8", muted: "#5a554d",
  ok: "#10b981", warn: "#f59e0b", err: "#ef4444",
};
const FONT: React.CSSProperties = { fontFamily: "'Inter', system-ui, sans-serif" };
const HDR = { "X-User-Id": "manager-on-duty" };

type Tab = "pto" | "swap" | "callout" | "chat" | "config";

export default function ManagerWorkflowPanel() {
  const [tab, setTab] = React.useState<Tab>("pto");
  const [counts, setCounts] = React.useState({ pto: 0, swap: 0, callout: 0 });

  const refreshCounts = React.useCallback(() => {
    Promise.all([
      fetch(`${API}/api/manager-workflow/pto/pending`).then(r => r.json()),
      fetch(`${API}/api/manager-workflow/swap/pending`).then(r => r.json()),
      fetch(`${API}/api/manager-workflow/callouts/pending`).then(r => r.json()),
    ]).then(([p, s, c]) => setCounts({
      pto: (p?.rows || []).length,
      swap: (s?.rows || []).length,
      callout: (c?.rows || []).length,
    })).catch(() => undefined);
  }, []);
  React.useEffect(() => {
    refreshCounts();
    const int = setInterval(refreshCounts, 25_000);
    return () => clearInterval(int);
  }, [refreshCounts]);

  const TABS: [Tab, string, string, number][] = [
    ["pto", "🏖", "PTO Approvals", counts.pto],
    ["swap", "🔄", "Shift Swaps", counts.swap],
    ["callout", "🤒", "Call-Outs", counts.callout],
    ["chat", "💬", "MoD Chat", 0],
    ["config", "⚙", "HR Config", 0],
  ];

  return (
    <div data-testid="mgr-workflow-root" style={{
      ...FONT, display: "flex", height: "100%", background: C.bg, color: C.text,
    }}>
      <aside style={{
        width: 240, padding: "24px 14px", borderRight: `1px solid ${C.border}`,
        background: "linear-gradient(180deg, #0c1018 0%, #04060d 100%)",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 9, letterSpacing: 4, color: C.accent, fontWeight: 700 }}>
          MANAGER ON DUTY
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                       fontSize: 24, fontWeight: 200, margin: "8px 0 22px",
                       letterSpacing: -0.5 }}>
          Workflow
        </h1>
        {TABS.map(([k, icon, label, count]) => (
          <button key={k} data-testid={`mgr-tab-${k}`} onClick={() => { setTab(k); refreshCounts(); }}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "10px 12px", marginBottom: 4, borderRadius: 6,
              fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              background: tab === k ? "rgba(212,175,55,0.14)" : "transparent",
              border: `1px solid ${tab === k ? `${C.accent}66` : "transparent"}`,
              color: tab === k ? C.accent : C.dim, cursor: "pointer", textAlign: "left",
            }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            <span style={{ flex: 1 }}>{label}</span>
            {count > 0 && <span style={{
              padding: "2px 8px", borderRadius: 999, fontSize: 10,
              background: C.err, color: "#fff", fontWeight: 700,
            }}>{count}</span>}
          </button>
        ))}
      </aside>
      <main style={{ flex: 1, overflowY: "auto", padding: 28 }}>
        {tab === "pto" && <PtoView reload={refreshCounts} />}
        {tab === "swap" && <SwapView reload={refreshCounts} />}
        {tab === "callout" && <CalloutView reload={refreshCounts} />}
        {tab === "chat" && <ModChatView />}
        {tab === "config" && <HrConfigView />}
      </main>
    </div>
  );
}

/* ─── PTO ─────────────────────────────────────────────────────────────── */
function PtoView({ reload }: { reload: () => void }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [decided, setDecided] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    fetch(`${API}/api/manager-workflow/pto/pending`).then(r => r.json()).then(d => setRows(d.rows || []));
    fetch(`${API}/api/manager-workflow/pto/decided`).then(r => r.json()).then(d => setDecided(d.rows || []));
  }, []);
  React.useEffect(load, [load]);

  async function decide(id: string, approve: boolean) {
    setBusy(id);
    const note = approve ? prompt("Optional note to staff:") : prompt("Reason for denial (sent to staff):");
    if (!approve && note === null) { setBusy(null); return; }
    await fetch(`${API}/api/manager-workflow/pto/${id}/${approve ? "approve" : "deny"}`, {
      method: "POST", headers: { ...HDR, "Content-Type": "application/json" },
      body: JSON.stringify(approve ? { note } : { reason: note }),
    });
    setBusy(null); load(); reload();
  }

  return (
    <div data-testid="mgr-pto-view">
      <H1>PTO Approvals</H1>
      <Eyebrow>{rows.length} PENDING</Eyebrow>
      {rows.length === 0 && <Empty>All caught up — no requests pending.</Empty>}
      {rows.map((r) => (
        <Card key={r.id} testid={`pto-row-${r.id}`}>
          <Row><strong style={{ color: C.text, fontSize: 15 }}>{r.employee_name}</strong>
            <Sub>submitted {fmt(r.submitted_at)}</Sub></Row>
          <Row><strong style={{ color: C.accent }}>{fmt(r.start_date)} → {fmt(r.end_date)}</strong>
            <Sub>· {r.type}</Sub></Row>
          {r.note && <div style={{ fontStyle: "italic", color: C.dim, fontSize: 12,
                                          padding: "8px 12px", borderLeft: `2px solid ${C.accent}`,
                                          marginTop: 6 }}>"{r.note}"</div>}
          <ButtonRow>
            <Btn testid={`pto-approve-${r.id}`} kind="ok" disabled={busy === r.id}
              onClick={() => decide(r.id, true)}>{busy === r.id ? "…" : "✓ APPROVE"}</Btn>
            <Btn testid={`pto-deny-${r.id}`} kind="err" disabled={busy === r.id}
              onClick={() => decide(r.id, false)}>{busy === r.id ? "…" : "✕ DENY"}</Btn>
          </ButtonRow>
        </Card>
      ))}
      {decided.length > 0 && (
        <>
          <Eyebrow style={{ marginTop: 28 }}>RECENT DECISIONS</Eyebrow>
          {decided.slice(0, 8).map((r) => (
            <div key={r.id} style={{
              padding: "10px 14px", borderRadius: 6, marginBottom: 4,
              background: C.surface, border: `1px solid ${C.border}`,
              fontSize: 12, display: "flex", justifyContent: "space-between",
            }}>
              <span>{r.employee_name} · {fmt(r.start_date)} → {fmt(r.end_date)}</span>
              <span style={{ color: r.status === "approved" ? C.ok : C.err, fontWeight: 700 }}>
                {r.status.toUpperCase()}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ─── Shift Swap ─────────────────────────────────────────────────────── */
function SwapView({ reload }: { reload: () => void }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    fetch(`${API}/api/manager-workflow/swap/pending`).then(r => r.json()).then(d => setRows(d.rows || []));
  }, []);
  React.useEffect(load, [load]);

  async function decide(id: string, approve: boolean) {
    setBusy(id);
    const note = approve ? prompt("Optional note:") : prompt("Reason for denial:");
    if (!approve && note === null) { setBusy(null); return; }
    await fetch(`${API}/api/manager-workflow/swap/${id}/${approve ? "approve" : "deny"}`, {
      method: "POST", headers: { ...HDR, "Content-Type": "application/json" },
      body: JSON.stringify(approve ? { note } : { reason: note }),
    });
    setBusy(null); load(); reload();
  }

  return (
    <div data-testid="mgr-swap-view">
      <H1>Shift Swaps · Manager Sign-Off</H1>
      <div style={{ marginBottom: 14, padding: 10, fontSize: 11, color: C.warn,
                      background: "rgba(245,158,11,0.06)", border: `1px solid ${C.warn}55`,
                      borderRadius: 6 }}>
        ⚠ Swaps are NOT confirmed until you approve. Both staff get a push notification when you decide.
      </div>
      <Eyebrow>{rows.length} PENDING</Eyebrow>
      {rows.length === 0 && <Empty>No pending swaps.</Empty>}
      {rows.map((r) => (
        <Card key={r.id} testid={`swap-row-${r.id}`}>
          <Row>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{r.requester_name}</span>
            <span style={{ fontSize: 18, color: C.accent, margin: "0 8px" }}>→</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{r.cover_name || r.cover_id}</span>
          </Row>
          <Row><Sub>shift: {fmt(r.shift_date)}{r.shift_label ? ` · ${r.shift_label}` : ""}</Sub></Row>
          {r.note && <div style={{ fontStyle: "italic", color: C.dim, fontSize: 12,
                                          padding: "8px 12px", borderLeft: `2px solid ${C.accent}`,
                                          marginTop: 6 }}>"{r.note}"</div>}
          <ButtonRow>
            <Btn testid={`swap-approve-${r.id}`} kind="ok" disabled={busy === r.id}
              onClick={() => decide(r.id, true)}>{busy === r.id ? "…" : "✓ APPROVE SWAP"}</Btn>
            <Btn testid={`swap-deny-${r.id}`} kind="err" disabled={busy === r.id}
              onClick={() => decide(r.id, false)}>{busy === r.id ? "…" : "✕ DENY"}</Btn>
          </ButtonRow>
        </Card>
      ))}
    </div>
  );
}

/* ─── Call-Outs ───────────────────────────────────────────────────────── */
function CalloutView({ reload }: { reload: () => void }) {
  const [rows, setRows] = React.useState<any[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    fetch(`${API}/api/manager-workflow/callouts/pending`).then(r => r.json()).then(d => setRows(d.rows || []));
  }, []);
  React.useEffect(load, [load]);

  async function ack(id: string) {
    setBusy(id);
    const note = prompt("Note back to staff (optional):");
    await fetch(`${API}/api/manager-workflow/callouts/${id}/acknowledge`, {
      method: "POST", headers: { ...HDR, "Content-Type": "application/json" },
      body: JSON.stringify({ note }),
    });
    setBusy(null); load(); reload();
  }

  return (
    <div data-testid="mgr-callout-view">
      <H1>Call-Out Queue</H1>
      <Eyebrow>{rows.length} PENDING ACKNOWLEDGMENT</Eyebrow>
      {rows.length === 0 && <Empty>No pending call-outs.</Empty>}
      {rows.map((r) => (
        <Card key={r.id} testid={`callout-row-${r.id}`}>
          <Row><strong>{r.employee_name}</strong>
            <span style={{ marginLeft: 8, fontSize: 11, color: C.dim }}>
              shift {fmt(r.shift_date)}{r.shift_start ? ` @ ${r.shift_start}` : ""}</span>
          </Row>
          <Row><span style={{ fontSize: 12, color: C.warn,
                                    padding: "3px 8px", borderRadius: 999,
                                    background: "rgba(245,158,11,0.1)", border: `1px solid ${C.warn}55` }}>
            {r.reason}</span></Row>
          {r.note && <div style={{ fontStyle: "italic", color: C.dim, fontSize: 12,
                                          padding: "8px 12px", borderLeft: `2px solid ${C.warn}`,
                                          marginTop: 6 }}>"{r.note}"</div>}
          <ButtonRow>
            <Btn testid={`callout-ack-${r.id}`} kind="ok" disabled={busy === r.id}
              onClick={() => ack(r.id)}>{busy === r.id ? "…" : "✓ ACKNOWLEDGE"}</Btn>
          </ButtonRow>
        </Card>
      ))}
    </div>
  );
}

/* ─── MoD Chat (WhatsApp-style) ───────────────────────────────────────── */
function ModChatView() {
  const [outlet, setOutlet] = React.useState("out-coastal-kitchen");
  const [msgs, setMsgs] = React.useState<any[]>([]);
  const [text, setText] = React.useState("");
  const [outlets, setOutlets] = React.useState<any[]>([]);

  React.useEffect(() => {
    fetch(`${API}/api/ecw-ops/outlets`).then(r => r.json())
      .then(d => setOutlets(d.outlets || d.rows || []))
      .catch(() => setOutlets([{ outlet_id: "out-coastal-kitchen", name: "Coastal Kitchen" }]));
  }, []);

  const load = React.useCallback(() => {
    fetch(`${API}/api/manager-workflow/mod/active-room/messages?outlet_id=${outlet}`)
      .then(r => r.json()).then(d => setMsgs(d.rows || []));
  }, [outlet]);
  React.useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  async function send() {
    if (!text.trim()) return;
    await fetch(`${API}/api/manager-workflow/mod/active-room/post`, {
      method: "POST", headers: { ...HDR, "Content-Type": "application/json" },
      body: JSON.stringify({ text, outlet_id: outlet }),
    });
    setText(""); load();
  }

  return (
    <div data-testid="mgr-modchat-view" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 80px)" }}>
      <H1>Manager-on-Duty Chat</H1>
      <select data-testid="modchat-outlet" value={outlet} onChange={e => setOutlet(e.target.value)} style={{
        padding: "8px 12px", marginBottom: 14, borderRadius: 6,
        background: "rgba(0,0,0,0.4)", border: `1px solid ${C.border}`,
        color: C.text, fontFamily: "inherit", fontSize: 12, width: 280,
      }}>
        {outlets.map((o: any) => (
          <option key={o.outlet_id || o.id} value={o.outlet_id || o.id}>
            {o.name || o.outlet_id}
          </option>
        ))}
      </select>
      <div data-testid="modchat-feed" style={{
        flex: 1, overflowY: "auto", padding: 14,
        background: "rgba(0,0,0,0.3)", borderRadius: 8,
        border: `1px solid ${C.border}`, marginBottom: 12,
      }}>
        {msgs.length === 0 && <Empty>No messages yet — start the conversation.</Empty>}
        {msgs.map(m => {
          const me = m.author_id === "manager-on-duty";
          return (
            <div key={m.id} style={{
              display: "flex", justifyContent: me ? "flex-end" : "flex-start", marginBottom: 8,
            }}>
              <div style={{
                maxWidth: "70%", padding: "8px 12px", borderRadius: 14,
                background: me ? `${C.accent}1a` : "rgba(255,255,255,0.06)",
                border: `1px solid ${me ? `${C.accent}55` : C.border}`,
                color: C.text,
              }}>
                {!me && <div style={{ fontSize: 9, color: C.accent, fontWeight: 700, marginBottom: 2 }}>{m.author_name}</div>}
                <div style={{ fontSize: 13 }}>{m.text}</div>
                <div style={{ fontSize: 9, color: C.muted, marginTop: 4, textAlign: "right" }}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input data-testid="modchat-input" value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") send(); }}
          placeholder="Message your staff…" style={{
            flex: 1, padding: "10px 14px", borderRadius: 8,
            background: "rgba(0,0,0,0.4)", border: `1px solid ${C.border}`,
            color: C.text, fontFamily: "inherit", fontSize: 13,
          }} />
        <button data-testid="modchat-send" onClick={send} style={{
          padding: "10px 18px", borderRadius: 8, fontSize: 11, fontWeight: 700,
          background: `${C.accent}1a`, color: C.accent,
          border: `1px solid ${C.accent}66`, cursor: "pointer", letterSpacing: 1,
        }}>SEND</button>
      </div>
    </div>
  );
}

/* ─── HR Config (callout policy) ──────────────────────────────────────── */
function HrConfigView() {
  const [cfg, setCfg] = React.useState<any>(null);
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  React.useEffect(() => {
    fetch(`${API}/api/manager-workflow/hr-config`).then(r => r.json()).then(d => setCfg(d.config));
  }, []);

  async function save() {
    setBusy(true); setMsg("");
    const r = await fetch(`${API}/api/manager-workflow/hr-config`, {
      method: "POST", headers: { ...HDR, "Content-Type": "application/json" },
      body: JSON.stringify(cfg),
    });
    setBusy(false);
    setMsg(r.ok ? "Saved ✓" : "Error saving");
  }

  if (!cfg) return <Empty>Loading…</Empty>;
  return (
    <div data-testid="mgr-config-view">
      <H1>HR Config · Call-Out Policy</H1>
      <div style={{ marginBottom: 18, padding: 12, fontSize: 11, color: C.dim,
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${C.border}`, borderRadius: 6 }}>
        These settings control whether hourly staff can call out via the MyEcho app, or must
        call their manager by phone. Defaults: phone-only, 2-hour minimum lead time.
      </div>
      <ConfigRow label="Allow mobile call-outs"
        sub="Staff can submit call-outs via MyEcho instead of phoning the manager">
        <Toggle testid="cfg-allow-mobile-callout" checked={cfg.allow_mobile_callout}
          onChange={v => setCfg({ ...cfg, allow_mobile_callout: v })} />
      </ConfigRow>
      <ConfigRow label="Minimum hours before shift"
        sub="Mobile call-outs within this window are rejected — staff must phone the manager">
        <input data-testid="cfg-min-hours" type="number" min={0} max={24}
          value={cfg.callout_min_hours_before_shift}
          onChange={e => setCfg({ ...cfg, callout_min_hours_before_shift: Number(e.target.value) })}
          style={{ ...inputStyle, width: 80 }} />
      </ConfigRow>
      <ConfigRow label="Manager-on-Duty chat enabled"
        sub="Staff can message the on-duty manager in real-time via MyEcho">
        <Toggle testid="cfg-mod-chat" checked={cfg.manager_on_duty_chat_enabled}
          onChange={v => setCfg({ ...cfg, manager_on_duty_chat_enabled: v })} />
      </ConfigRow>
      <ConfigRow label="Require phone call after mobile call-out"
        sub="Staff must STILL phone the manager even after submitting via app">
        <Toggle testid="cfg-require-phone" checked={cfg.require_phone_call_after_callout}
          onChange={v => setCfg({ ...cfg, require_phone_call_after_callout: v })} />
      </ConfigRow>
      <button data-testid="cfg-save" onClick={save} disabled={busy} style={{
        marginTop: 18, padding: "10px 22px", borderRadius: 8, fontSize: 11, fontWeight: 700,
        background: `${C.accent}1a`, color: C.accent,
        border: `1px solid ${C.accent}66`, cursor: "pointer", letterSpacing: 1,
      }}>{busy ? "SAVING…" : "SAVE POLICY"}</button>
      {msg && <span style={{ marginLeft: 12, fontSize: 11, color: C.accent }}>{msg}</span>}
    </div>
  );
}

/* ─── primitives ──────────────────────────────────────────────────────── */
const H1 = ({ children }: any) => (
  <h2 style={{ fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 28, fontWeight: 300, margin: "0 0 18px",
                  letterSpacing: -0.5 }}>{children}</h2>
);
const Eyebrow = ({ children, style }: any) => (
  <div style={{ fontSize: 9, letterSpacing: 3, color: C.accent, fontWeight: 700,
                   marginBottom: 10, ...(style || {}) }}>{children}</div>
);
const Card = ({ children, testid }: any) => (
  <div data-testid={testid} style={{
    padding: 16, borderRadius: 10, marginBottom: 10,
    background: C.surface, border: `1px solid ${C.border}`,
  }}>{children}</div>
);
const Row = ({ children }: any) => (
  <div style={{ display: "flex", alignItems: "center", marginBottom: 4, fontSize: 13 }}>{children}</div>
);
const ButtonRow = ({ children }: any) => (
  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>{children}</div>
);
const Sub = ({ children }: any) => (
  <span style={{ fontSize: 11, color: C.dim, marginLeft: 8 }}>{children}</span>
);
const Empty = ({ children }: any) => (
  <div style={{ padding: 30, textAlign: "center", color: C.muted, fontStyle: "italic" }}>{children}</div>
);
function Btn({ children, onClick, kind, testid, disabled }: any) {
  const palette = kind === "ok" ? { c: C.ok, bg: "rgba(16,185,129,0.1)" }
                                  : kind === "err" ? { c: C.err, bg: "rgba(239,68,68,0.1)" }
                                  : { c: C.accent, bg: `${C.accent}1a` };
  return (
    <button data-testid={testid} onClick={onClick} disabled={disabled} style={{
      padding: "8px 16px", borderRadius: 6, fontSize: 11, fontWeight: 700,
      background: palette.bg, color: palette.c,
      border: `1px solid ${palette.c}66`, cursor: disabled ? "wait" : "pointer",
      letterSpacing: 1, fontFamily: "inherit",
    }}>{children}</button>
  );
}
function ConfigRow({ label, sub, children }: any) {
  return (
    <div style={{
      display: "flex", alignItems: "center", padding: "14px 0",
      borderBottom: `1px solid ${C.border}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>{sub}</div>
      </div>
      {children}
    </div>
  );
}
function Toggle({ checked, onChange, testid }: any) {
  return (
    <button data-testid={testid} onClick={() => onChange(!checked)} style={{
      width: 50, height: 28, borderRadius: 999, padding: 2,
      background: checked ? C.accent : "rgba(255,255,255,0.1)",
      border: `1px solid ${checked ? C.accent : C.border}`,
      cursor: "pointer", display: "flex",
      justifyContent: checked ? "flex-end" : "flex-start",
      transition: "all 200ms",
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%",
        background: checked ? "#04060d" : "#94a3b8",
        transition: "all 200ms",
      }} />
    </button>
  );
}
const inputStyle: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 6,
  background: "rgba(0,0,0,0.4)", border: `1px solid ${C.border}`,
  color: C.text, fontFamily: "inherit", fontSize: 13,
};
function fmt(s?: string) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch { return s; }
}
