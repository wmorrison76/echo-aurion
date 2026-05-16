/**
 * iter191 · Role Assigner admin panel
 *
 * Promote/demote any employee between general · salary · manager · owner.
 * Drives what the /m/staff/:token mobile shell renders per user.
 */
import React, { useEffect, useMemo, useState } from "react";
import { adminFetch, ensureAdminToken } from "@/lib/admin-auth";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

type Employee = { id?: string | null; name?: string; email?: string; role: "general"|"salary"|"manager"|"owner"; title?: string; source?: string };
const ROLES: Employee["role"][] = ["general", "salary", "manager", "owner"];

export default function RoleAssigner() {
  const [hasToken, setHasToken] = useState(false);
  const [list, setList] = useState<Employee[]>([]);
  const [q, setQ] = useState("");
  const [flash, setFlash] = useState<{ type: "ok"|"err"; msg: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setHasToken(ensureAdminToken()); }, []);
  useEffect(() => { if (hasToken) load(); }, [hasToken]);

  async function load() {
    setLoading(true);
    try {
      const r = await adminFetch(`${API()}/api/staff-mobile/employees`);
      if (r.ok) { const j = await r.json(); setList(j.employees || []); }
    } finally { setLoading(false); }
  }

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return list;
    return list.filter(e => ((e.name || "") + " " + (e.email || "") + " " + (e.title || "")).toLowerCase().includes(n));
  }, [list, q]);

  async function change(e: Employee, role: Employee["role"]) {
    if (e.role === role) return;
    const key = e.id || e.email || e.name || "";
    setBusy(key);
    try {
      const body: any = { role };
      if (e.id) body.employee_id = e.id; else if (e.email) body.employee_email = e.email;
      const r = await adminFetch(`${API()}/api/staff-mobile/employees/role`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) { setFlash({ type: "err", msg: `Failed: ${await r.text()}` }); return; }
      const j = await r.json();
      setFlash({ type: "ok", msg: `${e.name || e.email} is now ${j.role.toUpperCase()}${j.created ? " (new record)" : ""}.` });
      await load();
      setTimeout(() => setFlash(null), 3000);
    } finally { setBusy(null); }
  }

  if (!hasToken) return <div style={{ padding: 24, color: "#64748b" }}>Admin token required.</div>;

  const counts = ROLES.reduce((m, r) => ({ ...m, [r]: list.filter(e => e.role === r).length }), {} as Record<string, number>);

  return (
    <div data-testid="role-assigner-root" style={s.root}>
      <div style={s.eyebrow}>Access · role assignment</div>
      <h2 style={s.title}>Who sees what on mobile</h2>
      <p style={s.sub}>Promote staff so their `/m/staff/:token` app renders admin tools. General staff get schedule + PTO + benefits + concierge. Salary & above get dashboard, standup editor, hiring, mint tokens, approvals.</p>

      <div style={s.countsRow}>
        {ROLES.map(r => (
          <div key={r} data-testid={`role-count-${r}`} style={{ ...s.countCard, borderColor: colorFor(r) }}>
            <div style={{ ...s.eyebrow, color: colorFor(r) }}>{r}</div>
            <div style={{ fontSize: 22, fontWeight: 300 }}>{counts[r] || 0}</div>
          </div>
        ))}
      </div>

      <input
        data-testid="role-search"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search by name, email, title…"
        style={s.search}
      />

      {flash && <div data-testid={`role-flash-${flash.type}`} style={{ ...s.flash, background: flash.type === "ok" ? "#dcfce7" : "#fee2e2", color: flash.type === "ok" ? "#166534" : "#991b1b" }}>{flash.msg}</div>}

      {loading && <div style={{ color: "#64748b", fontSize: 12, textAlign: "center", padding: 20 }}>Loading…</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
        {filtered.map((e, i) => {
          const key = e.id || e.email || e.name || `row-${i}`;
          return (
            <div key={key} data-testid={`role-row-${e.email || e.name || i}`} style={s.row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{e.name || <i style={{ color: "#94a3b8" }}>(no name)</i>}</div>
                <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{e.email || "no email"} {e.title && `· ${e.title}`} {e.source === "briefing_token" && <span style={s.stubPill}>token only</span>}</div>
              </div>
              <div style={s.rolePicker}>
                {ROLES.map(r => (
                  <button
                    key={r}
                    data-testid={`role-set-${e.email || e.name || i}-${r}`}
                    onClick={() => change(e, r)}
                    disabled={busy === (e.id || e.email || e.name)}
                    style={{
                      ...s.roleBtn,
                      background: e.role === r ? colorBg(r) : "transparent",
                      color: e.role === r ? colorFor(r) : "#6b7280",
                      borderColor: e.role === r ? colorFor(r) : "#d1d5db",
                      fontWeight: e.role === r ? 700 : 400,
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && !loading && (
          <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, padding: 40 }}>No matches.</div>
        )}
      </div>
    </div>
  );
}

function colorFor(r: string) { return r === "owner" ? "#db2777" : r === "manager" ? "#7e22ce" : r === "salary" ? "#1d4ed8" : "#475569"; }
function colorBg(r: string)  { return r === "owner" ? "#fce7f3" : r === "manager" ? "#f3e8ff" : r === "salary" ? "#dbeafe" : "#f1f5f9"; }

const s: Record<string, React.CSSProperties> = {
  root: { padding: 24, maxWidth: 900, margin: "0 auto", fontFamily: "-apple-system, system-ui, sans-serif", color: "#111827" },
  eyebrow: { fontSize: 10, letterSpacing: 3, textTransform: "uppercase", color: "#6b7280", fontWeight: 700 },
  title: { fontSize: 22, margin: "8px 0 6px", fontWeight: 300, letterSpacing: -0.3 },
  sub: { fontSize: 13, color: "#6b7280", marginBottom: 18, lineHeight: 1.5 },
  countsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 },
  countCard: { padding: 12, borderRadius: 10, background: "#fff", border: "1px solid #e5e7eb" },
  search: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #d1d5db", fontSize: 14, boxSizing: "border-box" as any, outline: "none" },
  row: { display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff" },
  rolePicker: { display: "flex", gap: 4 },
  roleBtn: { padding: "5px 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "transparent", fontSize: 11, cursor: "pointer", textTransform: "uppercase" as const, letterSpacing: 0.5, fontFamily: "inherit" },
  flash: { padding: "10px 12px", borderRadius: 8, marginTop: 10, fontSize: 13 },
  stubPill: { marginLeft: 6, fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "#fef3c7", color: "#92400e", letterSpacing: 0.5, fontWeight: 700 },
};
