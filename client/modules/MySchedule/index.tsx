/**
 * iter175 · My Schedule App (Employee-facing)
 *
 * Mobile-first view for individual employees showing:
 *   - Recognition banner when it's their birthday / anniversary / promotion day
 *   - This week's shifts from leadership_coverage
 *   - Team celebrations (other people in their department with milestones this week)
 *
 * Answers William's question: "would the unlock go to the users app to show
 * the recognition on the schedule app?" → YES. Full-screen banner on their
 * day + shift-card badges for the week.
 */
import React, { useEffect, useState } from "react";
import { usePanelState } from "../../lib/usePanelState";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};
const PANEL_ID = "my-schedule";

export default function MySchedule() {
  const [empId, setEmpId] = usePanelState<string>(PANEL_ID, "emp-id", "");
  const [empList, setEmpList] = useState<any[]>([]);
  const [data, setData] = useState<any | null>(null);
  const [start, setStart] = usePanelState<string>(PANEL_ID, "start", new Date().toISOString().slice(0, 10));
  const [authMe, setAuthMe] = useState<any | null>(null);

  // iter177 · Try to auto-resolve the logged-in user from /api/auth/me
  useEffect(() => {
    const tok = (() => { try { return localStorage.getItem("echoai3_session_token"); } catch { return null; } })();
    fetch(`${API()}/api/auth/me`, {
      credentials: "include",
      headers: tok ? { Authorization: `Bearer ${tok}` } : {},
    }).then(r => r.ok ? r.json() : null).then((j) => {
      if (j && j.employee_match?.id) {
        setAuthMe(j);
        setEmpId(j.employee_match.id);
      }
    }).catch(() => {});
    // Also listen for sign-in/out events while the panel is open
    const onSignedIn = (ev: any) => {
      const m = ev?.detail?.employee_match;
      if (m?.id) { setAuthMe(ev.detail); setEmpId(m.id); }
    };
    const onSignedOut = () => { setAuthMe(null); };
    window.addEventListener("echo:auth:signed-in", onSignedIn as any);
    window.addEventListener("echo:auth:signed-out", onSignedOut);
    return () => {
      window.removeEventListener("echo:auth:signed-in", onSignedIn as any);
      window.removeEventListener("echo:auth:signed-out", onSignedOut);
    };
  }, []);

  // Bootstrap: give the user a list to pick themselves (until real SSO login lands)
  useEffect(() => {
    fetch(`${API()}/api/people/list`).then(r => r.json()).then(j => {
      setEmpList(j.employees || []);
      if (!empId && j.employees?.[0]) setEmpId(j.employees[0].id);
    });
  }, []);

  async function load() {
    if (!empId) return;
    const r = await fetch(`${API()}/api/my-schedule/employee/${empId}?start=${start}&days=7`);
    setData(await r.json());
  }
  useEffect(() => { load(); }, [empId, start]);

  if (!data) return <div style={S.center}>Loading your schedule…</div>;

  const me = data.employee || {};
  const byDate: Record<string, any[]> = {};
  (data.shifts || []).forEach((s: any) => { (byDate[s.date] = byDate[s.date] || []).push(s); });
  const milestoneByDate: Record<string, any> = {};
  (data.milestones || []).forEach((m: any) => { milestoneByDate[m.date] = m; });

  return (
    <div data-testid="my-schedule-panel" style={S.root}>
      <header style={S.header}>
        <div>
          <div style={S.eyebrow}>My Schedule</div>
          <h1 style={S.title}>{me.display_name || "—"}</h1>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>{me.title || me.role} · {me.department}</div>
          {authMe?.employee_match && (
            <div data-testid="my-schedule-auth-banner" style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, padding: "3px 10px", borderRadius: 999, background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.35)", fontSize: 10, color: "#86efac", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
              ✓ Auto-resolved from Google sign-in
            </div>
          )}
        </div>
        {!authMe?.employee_match && (
          <select data-testid="my-schedule-emp-select" value={empId} onChange={e => setEmpId(e.target.value)} style={S.empSelect}>
            {empList.map(e => <option key={e.id} value={e.id}>{e.display_name}</option>)}
          </select>
        )}
      </header>

      {data.banner && (
        <div data-testid="my-schedule-banner" style={S.banner}>
          <div style={{ fontSize: 44 }}>{data.banner.split(" ")[0]}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginTop: 6 }}>{data.banner.split(" ").slice(1).join(" ")}</div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase", marginTop: 4 }}>From the entire team</div>
        </div>
      )}

      <div style={S.body}>
        <div style={{ ...S.eyebrow, marginBottom: 8 }}>This week</div>
        <div style={S.week}>
          {(data.dates || []).map((d: string) => {
            const dt = new Date(d + "T12:00:00Z");
            const ms = milestoneByDate[d];
            const shifts = byDate[d] || [];
            const isToday = d === new Date().toISOString().slice(0, 10);
            return (
              <div key={d} data-testid={`my-schedule-day-${d}`} style={{ ...S.day, ...(isToday ? { border: "1px solid #c8a97e" } : {}) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 2, color: isToday ? "#c8a97e" : "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
                      {dt.toLocaleDateString(undefined, { weekday: "long" })}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#f8fafc" }}>
                      {dt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                  {ms && <span style={S.dayBadge} title={ms.detail}>
                    {ms.kind === "birthday" ? "🎂" : ms.kind === "anniversary" ? "🏅" : "⭐"}
                  </span>}
                </div>
                {shifts.length ? (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                    {shifts.map((s: any) => (
                      <div key={s.id} style={{ ...S.shift, borderLeft: `3px solid ${shiftColor(s.shift)}` }}>
                        <div style={{ fontSize: 11, color: shiftColor(s.shift), fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{s.shift}</div>
                        <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 2 }}>{s.notes || ""}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 11, color: "#475569", fontStyle: "italic" }}>Off</div>
                )}
              </div>
            );
          })}
        </div>

        {(data.team_celebrations || []).length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={S.eyebrow}>{me.department} · team celebrations this week</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {data.team_celebrations.map((t: any, i: number) => (
                <div key={i} data-testid={`team-celeb-${i}`} style={S.teamChip}>
                  <span style={{ marginRight: 6 }}>{t.kind === "birthday" ? "🎂" : t.kind === "anniversary" ? "🏅" : "⭐"}</span>
                  <span style={{ fontSize: 12, color: "#f8fafc" }}>{t.name}</span>
                  <span style={{ fontSize: 10, color: "#94a3b8", marginLeft: 6 }}>
                    {new Date(t.date + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    {t.years ? ` · ${t.years}yr` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(data.company_feed || []).length > 0 && (
          <div data-testid="my-schedule-social-feed" style={{ marginTop: 26 }}>
            <div style={S.eyebrow}>🎉 Social feed · company celebrations this week</div>
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflow: "auto", paddingRight: 8 }}>
              {data.company_feed.map((t: any, i: number) => {
                const date = new Date(t.date + "T12:00:00Z");
                const icon = t.kind === "birthday" ? "🎂" : t.kind === "anniversary" ? "🏅" : "⭐";
                const headline = t.kind === "birthday"
                  ? `${t.name}'s birthday`
                  : t.kind === "anniversary"
                    ? `${t.name} · ${t.years}yr work anniversary`
                    : `${t.name} · ${t.years}yr promotion anniversary`;
                return (
                  <div key={i} data-testid={`social-feed-${i}`} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", background: "rgba(200,169,126,0.04)",
                    borderLeft: "2px solid rgba(200,169,126,0.3)", borderRadius: 4,
                  }}>
                    <span style={{ fontSize: 22 }}>{icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "#f8fafc", fontWeight: 600 }}>{headline}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                        {t.department} · {date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function shiftColor(shift: string): string {
  return { am: "#22c55e", pm: "#38bdf8", overnight: "#a78bfa", mod: "#c8a97e", "on-call": "#fbbf24", off: "#64748b" }[shift] || "#94a3b8";
}

const S: Record<string, React.CSSProperties> = {
  root: { height: "100%", display: "flex", flexDirection: "column", background: "#04060d", color: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" },
  header: { padding: "14px 20px", borderBottom: "1px solid rgba(200,169,126,0.15)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  eyebrow: { fontSize: 9, letterSpacing: 3, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" },
  title: { fontSize: 22, fontWeight: 700, color: "#f8fafc", marginTop: 4 },
  empSelect: { padding: "6px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#f8fafc", fontSize: 12 },
  banner: { margin: "14px 20px 0", padding: "26px 28px", background: "linear-gradient(135deg, #fef6e4 0%, #fff 100%)", borderTop: "3px solid #c8a97e", borderBottom: "3px solid #c8a97e", borderRadius: 4, textAlign: "center", color: "#0f172a" },
  body: { flex: 1, overflow: "auto", padding: 20 },
  week: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 },
  day: { padding: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, minHeight: 140 },
  dayBadge: { fontSize: 22 },
  shift: { padding: "6px 8px", background: "rgba(0,0,0,0.25)", borderRadius: 4 },
  teamChip: { padding: "6px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 999, display: "flex", alignItems: "center" },
  center: { height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8" },
};
