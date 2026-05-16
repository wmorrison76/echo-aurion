/**
 * iter173 · People & Operations Admin
 *
 * Three tabs in one panel:
 *   1. Employees   — directory, onboarding profile, birthdays
 *   2. Hours       — outlet hours-of-operation editor
 *   3. Coverage    — leadership coverage calendar
 *
 * All writes use the ADMIN_API_TOKEN via adminFetch.
 */
import React, { useEffect, useState } from "react";
import { adminFetch, ensureAdminToken, clearAdminToken } from "../../lib/admin-auth";
import { usePanelState } from "../../lib/usePanelState";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};
const PANEL_ID = "people-admin";

const DEPARTMENTS = ["front-office", "guest-services", "housekeeping", "engineering", "fb", "culinary", "pastry", "sales", "marketing", "people-services", "finance", "spa", "lifestyle", "security", "activities", "ird", "concierge"];
const ROLES = ["executive", "director", "manager", "assistant-manager", "supervisor", "team-lead", "team-member", "intern", "contractor"];
const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const OUTLET_TYPES = ["restaurant", "bar", "lounge", "cafe", "pool-bar", "spa", "gym", "fitness", "retail", "kids-club", "marina", "activities", "business-center", "concierge", "valet", "front-desk", "executive-lounge", "room-service", "other"];
const SHIFTS = ["am", "pm", "overnight", "mod", "on-call", "off"];

export default function PeopleAdmin() {
  const [tab, setTab] = usePanelState<"employees" | "hours" | "coverage" | "jobprofiles" | "hiring">(PANEL_ID, "tab", "employees");
  const [hasToken, setHasToken] = useState<boolean>(false);
  useEffect(() => { setHasToken(ensureAdminToken()); }, []);

  if (!hasToken) {
    return (
      <div data-testid="people-admin-locked" style={S.lockScreen}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={S.eyebrow}>People & Operations · Admin</div>
          <h2 style={{ marginTop: 12, fontSize: 22 }}>Admin token required</h2>
          <p style={{ color: "#94a3b8", marginTop: 8 }}>Set ADMIN_API_TOKEN in backend/.env, then enter it here.</p>
          <button data-testid="people-admin-auth" onClick={() => setHasToken(ensureAdminToken())} style={S.primaryBtn}>Enter token</button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="people-admin-panel" style={S.root}>
      <header style={S.header}>
        <div>
          <div style={S.eyebrow}>People & Operations · Admin</div>
          <h1 style={S.title}>Organization Setup</h1>
          <p style={S.sub}>Employees · Job Profiles · Hours · Leadership Coverage · all feed the Daily Standup + AI evaluation.</p>
        </div>
        <button onClick={() => { clearAdminToken(); setHasToken(false); }} style={S.ghostBtn}>Sign out</button>
      </header>

      <nav style={S.tabs}>
        {[
          { id: "employees", label: "Employees · Directory" },
          { id: "jobprofiles", label: "Job Profiles" },
          { id: "hiring", label: "🧠 AI Hiring" },
          { id: "hours", label: "Hours of Operation" },
          { id: "coverage", label: "Leadership Coverage" },
        ].map((t) => (
          <button key={t.id} data-testid={`people-tab-${t.id}`} onClick={() => setTab(t.id as any)}
            style={{ ...S.tab, ...(tab === t.id ? S.tabOn : {}) }}>{t.label}</button>
        ))}
      </nav>

      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        {tab === "employees" && <EmployeesTab />}
        {tab === "jobprofiles" && <JobProfilesTab />}
        {tab === "hiring" && <HiringTab />}
        {tab === "hours" && <HoursTab />}
        {tab === "coverage" && <CoverageTab />}
      </div>
    </div>
  );
}

// ─── EMPLOYEES TAB ──────────────────────────────────────────────────────────
function EmployeesTab() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = usePanelState<string>(PANEL_ID, "emp-filter", "");
  const [dept, setDept] = usePanelState<string>(PANEL_ID, "emp-dept", "");
  const [editing, setEditing] = useState<any | null>(null);
  const [hrPanel, setHrPanel] = useState<any | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);

  async function load() {
    const q = new URLSearchParams();
    if (filter) q.set("q", filter);
    if (dept) q.set("department", dept);
    const r = await fetch(`${API()}/api/people/list?${q.toString()}`);
    const j = await r.json();
    setItems(j.employees || []);
  }
  async function loadProfiles() {
    const r = await adminFetch(`${API()}/api/job-profiles/list?active_only=true`);
    if (r.ok) { const j = await r.json(); setProfiles(j.profiles || []); }
  }
  useEffect(() => { load(); }, [filter, dept]);
  useEffect(() => { loadProfiles(); }, []);

  async function save() {
    if (!editing) return;
    const r = await adminFetch(`${API()}/api/people/upsert`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (r.ok) { setEditing(null); await load(); } else alert("Save failed: " + await r.text());
  }
  async function deactivate(id: string) {
    if (!confirm("Deactivate this employee?")) return;
    const r = await adminFetch(`${API()}/api/people/${id}/deactivate`, { method: "POST" });
    if (r.ok) await load();
  }
  async function sendMilestones(dryRun = false) {
    if (!dryRun && !confirm("Send today's milestone recognition cards now?")) return;
    const today = new Date().toISOString().slice(0, 10);
    const r = await adminFetch(`${API()}/api/milestones/send-today`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, dry_run: dryRun, include_director: true }),
    });
    if (!r.ok) { alert("Send failed: " + await r.text()); return; }
    const j = await r.json();
    alert(`${j.total} milestone(s) today.\n${(j.results || []).map((x: any) => `· ${x.kind} ${x.name} — ${x.status}`).join("\n") || "(none)"}`);
  }

  return (
    <div>
      <div style={S.toolbar}>
        <input data-testid="emp-search" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search name or title…" style={S.input} />
        <select data-testid="emp-dept-filter" value={dept} onChange={e => setDept(e.target.value)} style={S.input}>
          <option value="">All departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <button data-testid="emp-new" onClick={() => setEditing({ first_name: "", last_name: "", department: DEPARTMENTS[0], role: "team-member", active: true })} style={S.primaryBtn}>+ New employee</button>
        <button data-testid="emp-milestones-dry" onClick={() => sendMilestones(true)} style={S.ghostBtn}>🎂 Preview today's milestones</button>
        <button data-testid="emp-milestones-send" onClick={() => sendMilestones(false)} style={S.primaryBtn}>🚀 Send milestone cards</button>
      </div>

      <div style={S.grid}>
        {items.map(e => (
          <div key={e.id} data-testid={`emp-row-${e.id}`} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "#f8fafc", fontWeight: 700 }}>{e.display_name || `${e.first_name} ${e.last_name}`}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{e.title || e.role} · {e.department}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {e.job_profile_code && <span data-testid={`emp-profile-${e.id}`} style={{ ...S.pill, background: "rgba(34,211,238,0.12)", color: "#67e8f9" }}>🎯 {e.job_profile_title || e.job_profile_code}</span>}
                  {e.resume_uploaded_at && <span data-testid={`emp-resume-${e.id}`} style={{ ...S.pill, background: "rgba(34,197,94,0.15)", color: "#86efac" }}>📄 Résumé</span>}
                  {e.birthday && <span style={{ ...S.pill, background: "rgba(236,72,153,0.15)", color: "#f9a8d4" }}>🎂 {e.birthday}</span>}
                  {e.hire_date && <span style={{ ...S.pill, background: "rgba(200,169,126,0.12)", color: "#c8a97e" }}>📅 hired {e.hire_date}</span>}
                  {!e.active && <span style={{ ...S.pill, background: "rgba(239,68,68,0.15)", color: "#fca5a5" }}>INACTIVE</span>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button data-testid={`emp-edit-${e.id}`} onClick={() => setEditing({ ...e })} style={S.tinyBtn}>Edit</button>
                <button data-testid={`emp-hr-${e.id}`} onClick={() => setHrPanel({ ...e })} style={{ ...S.tinyBtn, color: "#67e8f9" }}>HR · AI</button>
                <button onClick={() => deactivate(e.id)} style={{ ...S.tinyBtn, color: "#fca5a5" }}>Deactivate</button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div style={S.empty}>No employees match. Use "+ New employee" to add one.</div>}
      </div>

      {editing && (
        <div style={S.modal} data-testid="emp-modal">
          <div style={S.modalCard}>
            <h3 style={{ margin: 0, fontSize: 18 }}>{editing.id ? "Edit employee" : "New employee"}</h3>
            <div style={S.formGrid}>
              <Field label="First name"><input data-testid="emp-first-name" value={editing.first_name || ""} onChange={e => setEditing({ ...editing, first_name: e.target.value })} style={S.input} /></Field>
              <Field label="Last name"><input data-testid="emp-last-name" value={editing.last_name || ""} onChange={e => setEditing({ ...editing, last_name: e.target.value })} style={S.input} /></Field>
              <Field label="Email"><input type="email" value={editing.email || ""} onChange={e => setEditing({ ...editing, email: e.target.value })} style={S.input} /></Field>
              <Field label="Phone"><input value={editing.phone || ""} onChange={e => setEditing({ ...editing, phone: e.target.value })} style={S.input} /></Field>
              <Field label="Department"><select value={editing.department} onChange={e => setEditing({ ...editing, department: e.target.value })} style={S.input}>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Role"><select value={editing.role} onChange={e => setEditing({ ...editing, role: e.target.value })} style={S.input}>{ROLES.map(r => <option key={r}>{r}</option>)}</select></Field>
              <Field label="Title"><input value={editing.title || ""} onChange={e => setEditing({ ...editing, title: e.target.value })} style={S.input} placeholder="Director of Lifestyle…" /></Field>
              <Field label="Hire date (YYYY-MM-DD)"><input value={editing.hire_date || ""} onChange={e => setEditing({ ...editing, hire_date: e.target.value })} style={S.input} placeholder="2024-06-01" /></Field>
              <Field label="Birthday (MM-DD)"><input value={editing.birthday || ""} onChange={e => setEditing({ ...editing, birthday: e.target.value })} style={S.input} placeholder="07-22" /></Field>
              <Field label="Photo URL"><input value={editing.photo_url || ""} onChange={e => setEditing({ ...editing, photo_url: e.target.value })} style={S.input} /></Field>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setEditing(null)} style={S.ghostBtn}>Cancel</button>
              <button data-testid="emp-save" onClick={save} style={S.primaryBtn}>{editing.id ? "Save" : "Create"}</button>
            </div>
          </div>
        </div>
      )}

      {hrPanel && (
        <EmployeeHRDrawer
          employee={hrPanel}
          profiles={profiles}
          onClose={() => { setHrPanel(null); load(); }}
        />
      )}
    </div>
  );
}

// ─── Employee HR + AI Evaluation drawer ────────────────────────────────────
function EmployeeHRDrawer({ employee, profiles, onClose }: {
  employee: any; profiles: any[]; onClose: () => void;
}) {
  const [emp, setEmp] = useState<any>(employee);
  const [resumeMeta, setResumeMeta] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [evalRunning, setEvalRunning] = useState(false);
  const [evalResult, setEvalResult] = useState<any | null>(null);
  const [focus, setFocus] = useState<string>("annual evaluation");
  const [history, setHistory] = useState<any[]>([]);

  async function refreshResume() {
    const r = await adminFetch(`${API()}/api/employees/${emp.id}/resume`);
    if (r.ok) { const j = await r.json(); setResumeMeta(j.resume); }
    else setResumeMeta(null);
  }
  async function refreshEmp() {
    const r = await fetch(`${API()}/api/people/${emp.id}`);
    if (r.ok) { const j = await r.json(); setEmp(j.employee); }
  }
  async function refreshHistory() {
    const r = await adminFetch(`${API()}/api/employees/${emp.id}/evaluations?limit=5`);
    if (r.ok) { const j = await r.json(); setHistory(j.evaluations || []); }
  }
  useEffect(() => { refreshResume(); refreshHistory(); }, []);

  async function assignProfile(code: string) {
    const r = await adminFetch(`${API()}/api/employees/${emp.id}/assign-profile`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_profile_code: code || null }),
    });
    if (r.ok) { const j = await r.json(); setEmp(j.employee); }
  }

  async function uploadResume(file: File) {
    if (file.size > 5 * 1024 * 1024) { alert("File exceeds 5MB cap"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("uploaded_by", "admin");
      const r = await adminFetch(`${API()}/api/employees/${emp.id}/resume`, { method: "POST", body: fd });
      if (r.ok) { await refreshResume(); await refreshEmp(); }
      else alert("Upload failed: " + await r.text());
    } finally { setUploading(false); }
  }

  async function deleteResume() {
    if (!confirm("Remove résumé from profile?")) return;
    const r = await adminFetch(`${API()}/api/employees/${emp.id}/resume`, { method: "DELETE" });
    if (r.ok) { await refreshResume(); await refreshEmp(); }
  }

  async function runEval() {
    if (!emp.job_profile_code) { alert("Assign a job profile first."); return; }
    setEvalRunning(true); setEvalResult(null);
    try {
      const r = await adminFetch(`${API()}/api/employees/${emp.id}/evaluate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focus, include_resume: true }),
      });
      if (!r.ok) { alert("Evaluation failed: " + await r.text()); return; }
      const j = await r.json();
      setEvalResult(j.evaluation?.result);
      await refreshHistory();
    } finally { setEvalRunning(false); }
  }

  return (
    <div style={S.modal} data-testid="emp-hr-drawer">
      <div style={{ ...S.modalCard, minWidth: 720, maxWidth: 920 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={S.eyebrow}>HR · Résumé · AI Evaluation</div>
            <h3 style={{ margin: "6px 0 4px", fontSize: 20 }}>{emp.display_name || `${emp.first_name} ${emp.last_name}`}</h3>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{emp.title || emp.role} · {emp.department}</div>
          </div>
          <button onClick={onClose} style={S.ghostBtn}>Close</button>
        </div>

        <section style={S.hrSection}>
          <div style={S.hrHeader}>🎯 Job Profile</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select data-testid="emp-hr-assign-profile" value={emp.job_profile_code || ""} onChange={e => assignProfile(e.target.value)} style={{ ...S.input, minWidth: 280 }}>
              <option value="">— unassigned —</option>
              {profiles.map((p: any) => <option key={p.code} value={p.code}>{p.title} · {p.department} · {p.level}</option>)}
            </select>
            {emp.job_profile_code && <span style={{ ...S.pill, background: "rgba(34,211,238,0.15)", color: "#67e8f9" }}>{emp.job_profile_title}</span>}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>Determines the rubric used for AI evaluation + hiring/promotion fit.</div>
        </section>

        <section style={S.hrSection}>
          <div style={S.hrHeader}>📄 Résumé</div>
          {resumeMeta ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#f8fafc", fontWeight: 600 }}>{resumeMeta.filename}</span>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>{(resumeMeta.size_bytes / 1024).toFixed(1)} KB · uploaded {new Date(resumeMeta.uploaded_at).toLocaleDateString()}</span>
              <a data-testid="emp-hr-resume-download" href={`${API()}/api/employees/${emp.id}/resume/download`} target="_blank" rel="noreferrer"
                 onClick={(ev) => {
                   // Admin token must be in query? download auth falls through admin header — use fetch+blob instead.
                   ev.preventDefault();
                   adminFetch(`${API()}/api/employees/${emp.id}/resume/download`).then(async (r) => {
                     if (!r.ok) { alert("Download failed"); return; }
                     const blob = await r.blob();
                     const url = URL.createObjectURL(blob);
                     const a = document.createElement("a"); a.href = url; a.download = resumeMeta.filename; a.click();
                     URL.revokeObjectURL(url);
                   });
                 }} style={S.tinyBtn}>Download</a>
              <button data-testid="emp-hr-resume-delete" onClick={deleteResume} style={{ ...S.tinyBtn, color: "#fca5a5" }}>Remove</button>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: "#64748b" }}>No résumé on file yet.</div>
          )}
          <label style={{ display: "inline-flex", marginTop: 10, alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input data-testid="emp-hr-resume-upload" type="file" accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                   onChange={(ev) => { const f = ev.target.files?.[0]; if (f) uploadResume(f); ev.target.value = ""; }} style={{ display: "none" }} />
            <span style={S.primaryBtn}>{uploading ? "Uploading…" : (resumeMeta ? "Replace résumé" : "Upload résumé")}</span>
          </label>
          <div style={{ fontSize: 10, color: "#64748b", marginTop: 4 }}>PDF · DOCX · TXT up to 5 MB. Stored admin-gated. Text extracted for AI evaluation.</div>
        </section>

        <section style={S.hrSection}>
          <div style={S.hrHeader}>🧠 AI Evaluation (Claude Sonnet 4.5)</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select data-testid="emp-hr-focus" value={focus} onChange={e => setFocus(e.target.value)} style={{ ...S.input, minWidth: 220 }}>
              <option value="annual evaluation">Annual evaluation</option>
              <option value="hiring fit">Hiring / candidate fit</option>
              <option value="promotion readiness">Promotion readiness</option>
              <option value="interview preparation">Interview preparation</option>
              <option value="90-day review">90-day review</option>
            </select>
            <button data-testid="emp-hr-evaluate" disabled={evalRunning || !emp.job_profile_code} onClick={runEval} style={{ ...S.primaryBtn, opacity: evalRunning || !emp.job_profile_code ? 0.5 : 1 }}>
              {evalRunning ? "Evaluating…" : "Run AI evaluation"}
            </button>
            {!emp.job_profile_code && <span style={{ fontSize: 11, color: "#fca5a5" }}>Assign a job profile first.</span>}
          </div>
          {evalResult && <EvalResultCard result={evalResult} />}
          {history.length > 0 && (
            <div style={{ marginTop: 12, borderTop: "1px dashed rgba(255,255,255,0.08)", paddingTop: 10 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Evaluation history ({history.length})</div>
              {history.map((h: any) => (
                <div key={h.id} style={{ padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "#cbd5e1" }}>
                  <span>{new Date(h.created_at).toLocaleString()} · {h.focus} · <b style={{ color: "#c8a97e" }}>{h.job_profile_code}</b></span>
                  <span style={{ color: scoreColor(h.result?.fit_score) }}>Score {h.result?.fit_score ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function scoreColor(s?: number) {
  if (s == null) return "#94a3b8";
  if (s >= 80) return "#86efac";
  if (s >= 60) return "#fcd34d";
  if (s >= 40) return "#fdba74";
  return "#fca5a5";
}

function EvalResultCard({ result }: { result: any }) {
  if (!result) return null;
  const score = Number(result.fit_score || 0);
  return (
    <div data-testid="emp-hr-eval-result" style={{ marginTop: 12, padding: 14, background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.25)", borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: scoreColor(score) }}>{score}<span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 6 }}>/ 100</span></div>
        <div style={{ fontSize: 11, letterSpacing: 2, color: scoreColor(score), fontWeight: 700, textTransform: "uppercase" }}>{result.fit_label || "—"}</div>
      </div>
      {result.summary && <p style={{ fontSize: 13, color: "#e2e8f0", marginTop: 8, lineHeight: 1.5 }}>{result.summary}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
        <EvalList title="Strengths" color="#86efac" items={result.strengths} />
        <EvalList title="Gaps" color="#fca5a5" items={result.gaps} />
        {result.certifications_present?.length > 0 && <EvalList title="Certifications present" color="#67e8f9" items={result.certifications_present} />}
        {result.certifications_missing?.length > 0 && <EvalList title="Certifications missing" color="#fbbf24" items={result.certifications_missing} />}
      </div>
      {Array.isArray(result.evaluation_rubric) && result.evaluation_rubric.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Rubric</div>
          {result.evaluation_rubric.map((r: any, i: number) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 12 }}>
              <span style={{ width: 150, color: "#cbd5e1", fontWeight: 600 }}>{r.area}</span>
              <span style={{ ...S.pill, background: rubricBg(r.rating), color: "#0a0e1a", fontWeight: 700, minWidth: 90, textAlign: "center" }}>{r.rating}</span>
              <span style={{ color: "#94a3b8", flex: 1 }}>{r.evidence}</span>
            </div>
          ))}
        </div>
      )}
      {Array.isArray(result.interview_questions) && result.interview_questions.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Suggested interview / review questions</div>
          <ol style={{ margin: 0, paddingLeft: 20, color: "#e2e8f0", fontSize: 12, lineHeight: 1.6 }}>
            {result.interview_questions.map((q: string, i: number) => <li key={i}>{q}</li>)}
          </ol>
        </div>
      )}
      {Array.isArray(result.recommended_development) && result.recommended_development.length > 0 && (
        <EvalList title="Recommended development (next 90d)" color="#fbbf24" items={result.recommended_development} />
      )}
    </div>
  );
}

function rubricBg(rating?: string): string {
  const r = (rating || "").toLowerCase();
  if (r.includes("exceed")) return "#86efac";
  if (r.includes("meet")) return "#67e8f9";
  if (r.includes("develop")) return "#fbbf24";
  return "#fca5a5";
}

function EvalList({ title, items, color }: { title: string; items?: string[]; color: string }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 2, color, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>
        {items.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </div>
  );
}

// ─── JOB PROFILES TAB ───────────────────────────────────────────────────────
function JobProfilesTab() {
  const [items, setItems] = useState<any[]>([]);
  const [dept, setDept] = usePanelState<string>(PANEL_ID, "jp-dept", "");
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    const q = new URLSearchParams();
    if (dept) q.set("department", dept);
    const r = await adminFetch(`${API()}/api/job-profiles/list?${q.toString()}`);
    if (r.ok) { const j = await r.json(); setItems(j.profiles || []); }
  }
  useEffect(() => { load(); }, [dept]);

  async function save() {
    if (!editing) return;
    const r = await adminFetch(`${API()}/api/job-profiles/upsert`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (r.ok) { setEditing(null); await load(); } else alert("Save failed: " + await r.text());
  }
  async function deactivate(code: string) {
    if (!confirm(`Deactivate job profile "${code}"?`)) return;
    const r = await adminFetch(`${API()}/api/job-profiles/${code}/deactivate`, { method: "POST" });
    if (r.ok) await load();
  }

  function newProfile() {
    setEditing({
      code: "", title: "", department: DEPARTMENTS[0], level: "entry",
      summary: "", responsibilities: [], expectations: [],
      required_skills: [], preferred_skills: [], required_certifications: [],
      min_experience_years: 0, active: true,
    });
  }

  return (
    <div>
      <div style={S.toolbar}>
        <select data-testid="jp-dept-filter" value={dept} onChange={e => setDept(e.target.value)} style={S.input}>
          <option value="">All departments</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{items.length} positions · drives hiring checklist + AI evaluation rubric</div>
        <button data-testid="jp-new" onClick={newProfile} style={S.primaryBtn}>+ New job profile</button>
      </div>

      <div style={S.grid}>
        {items.map((p: any) => (
          <div key={p.code} data-testid={`jp-row-${p.code}`} style={{ ...S.card, borderLeft: `3px solid ${LEVEL_COLOR[p.level] || "#64748b"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "#f8fafc", fontWeight: 700 }}>{p.title}</div>
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, fontFamily: "monospace" }}>{p.code}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <span style={{ ...S.pill, background: "rgba(200,169,126,0.12)", color: "#c8a97e" }}>{p.department}</span>
                  <span style={{ ...S.pill, background: `${LEVEL_COLOR[p.level] || "#64748b"}22`, color: LEVEL_COLOR[p.level] || "#cbd5e1" }}>{p.level}</span>
                  {p.min_experience_years ? <span style={{ ...S.pill, background: "rgba(255,255,255,0.06)", color: "#cbd5e1" }}>≥ {p.min_experience_years}y</span> : null}
                </div>
                {p.summary && <p style={{ fontSize: 11, color: "#cbd5e1", marginTop: 8, lineHeight: 1.4 }}>{p.summary}</p>}
                <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 6 }}>
                  {(p.responsibilities || []).length} resp · {(p.expectations || []).length} exp · {(p.required_skills || []).length} req skills
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button data-testid={`jp-edit-${p.code}`} onClick={() => setEditing({ ...p })} style={S.tinyBtn}>Edit</button>
                <button onClick={() => deactivate(p.code)} style={{ ...S.tinyBtn, color: "#fca5a5" }}>Deactivate</button>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div style={S.empty}>No job profiles yet. Click "+ New job profile" to add one.</div>}
      </div>

      {editing && (
        <div style={S.modal} data-testid="jp-modal">
          <div style={{ ...S.modalCard, minWidth: 640, maxWidth: 820 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>{editing.id ? "Edit job profile" : "New job profile"}</h3>
            <div style={S.formGrid}>
              <Field label="Code (lower_snake)"><input data-testid="jp-code" value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value })} style={S.input} placeholder="cook_1" disabled={!!editing.id} /></Field>
              <Field label="Title"><input data-testid="jp-title" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} style={S.input} placeholder="Cook 1 (Lead Line)" /></Field>
              <Field label="Department"><select value={editing.department} onChange={e => setEditing({ ...editing, department: e.target.value })} style={S.input}>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Level"><select data-testid="jp-level" value={editing.level} onChange={e => setEditing({ ...editing, level: e.target.value })} style={S.input}>{LEVELS.map(l => <option key={l}>{l}</option>)}</select></Field>
              <Field label="Min experience (years)"><input type="number" min={0} step={0.5} value={editing.min_experience_years || 0} onChange={e => setEditing({ ...editing, min_experience_years: parseFloat(e.target.value || "0") })} style={S.input} /></Field>
              <Field label="Reports to (code, optional)"><input value={editing.reports_to_code || ""} onChange={e => setEditing({ ...editing, reports_to_code: e.target.value })} style={S.input} placeholder="sous_chef" /></Field>
            </div>
            <div style={{ marginTop: 10 }}>
              <Field label="Summary"><textarea value={editing.summary || ""} onChange={e => setEditing({ ...editing, summary: e.target.value })} style={{ ...S.input, minHeight: 56 }} /></Field>
            </div>
            <BulletEditor label="Responsibilities" items={editing.responsibilities || []} onChange={v => setEditing({ ...editing, responsibilities: v })} testid="jp-resp" />
            <BulletEditor label="Expectations" items={editing.expectations || []} onChange={v => setEditing({ ...editing, expectations: v })} testid="jp-exp" />
            <BulletEditor label="Required skills" items={editing.required_skills || []} onChange={v => setEditing({ ...editing, required_skills: v })} testid="jp-req-skills" />
            <BulletEditor label="Preferred skills" items={editing.preferred_skills || []} onChange={v => setEditing({ ...editing, preferred_skills: v })} testid="jp-pref-skills" />
            <BulletEditor label="Required certifications" items={editing.required_certifications || []} onChange={v => setEditing({ ...editing, required_certifications: v })} testid="jp-certs" />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setEditing(null)} style={S.ghostBtn}>Cancel</button>
              <button data-testid="jp-save" onClick={save} style={S.primaryBtn}>{editing.id ? "Save" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BulletEditor({ label, items, onChange, testid }: {
  label: string; items: string[]; onChange: (v: string[]) => void; testid?: string;
}) {
  const [draft, setDraft] = useState("");
  function add() { const t = draft.trim(); if (!t) return; onChange([...(items || []), t]); setDraft(""); }
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
        {items.map((x, i) => (
          <span key={i} style={{ fontSize: 11, background: "rgba(200,169,126,0.1)", color: "#e2e8f0", borderRadius: 4, padding: "4px 8px", display: "inline-flex", alignItems: "center", gap: 6 }}>
            {x}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ background: "none", border: 0, color: "#fca5a5", cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input data-testid={testid} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }} style={{ ...S.input, flex: 1 }} placeholder={`Add ${label.toLowerCase()}…`} />
        <button onClick={add} style={S.tinyBtn}>+ Add</button>
      </div>
    </div>
  );
}

const LEVELS = ["entry", "mid", "senior", "lead", "management", "executive"];
const LEVEL_COLOR: Record<string, string> = {
  entry: "#94a3b8", mid: "#67e8f9", senior: "#c8a97e",
  lead: "#fbbf24", management: "#a78bfa", executive: "#f472b6",
};

// ─── AI HIRING TAB ──────────────────────────────────────────────────────────
function HiringTab() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [code, setCode] = usePanelState<string>(PANEL_ID, "hire-code", "");
  const [files, setFiles] = useState<File[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [batch, setBatch] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    adminFetch(`${API()}/api/job-profiles/list?active_only=true`).then(r => r.ok ? r.json() : null).then(j => {
      if (j) { setProfiles(j.profiles || []); if (!code && j.profiles?.[0]) setCode(j.profiles[0].code); }
    });
    loadHistory();
  }, []);

  async function loadHistory() {
    const r = await adminFetch(`${API()}/api/hiring/batches?limit=10`);
    if (r.ok) { const j = await r.json(); setHistory(j.batches || []); }
  }

  function onPick(ev: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(ev.target.files || []);
    setFiles(picked);
    setNames(picked.map(f => f.name.replace(/\.[^.]+$/, "")));
  }

  function setName(i: number, v: string) {
    const next = [...names]; next[i] = v; setNames(next);
  }

  async function rank() {
    if (!code) { alert("Pick a job profile"); return; }
    if (files.length === 0) { alert("Upload at least one résumé"); return; }
    setRunning(true); setBatch(null);
    try {
      const fd = new FormData();
      fd.append("job_profile_code", code);
      fd.append("candidate_names", JSON.stringify(names));
      files.forEach(f => fd.append("files", f));
      const r = await adminFetch(`${API()}/api/hiring/rank`, { method: "POST", body: fd });
      if (!r.ok) { alert("Rank failed: " + await r.text()); return; }
      const j = await r.json();
      setBatch(j.batch);
      await loadHistory();
    } finally { setRunning(false); }
  }

  async function loadBatch(id: string) {
    const r = await adminFetch(`${API()}/api/hiring/batch/${id}`);
    if (r.ok) { const j = await r.json(); setBatch(j.batch); }
  }

  const jp = profiles.find(p => p.code === code);

  return (
    <div data-testid="hiring-tab">
      <div style={{ ...S.toolbar, marginBottom: 16 }}>
        <select data-testid="hire-profile" value={code} onChange={e => setCode(e.target.value)} style={{ ...S.input, minWidth: 320 }}>
          <option value="">— pick a job profile —</option>
          {profiles.map(p => <option key={p.code} value={p.code}>{p.title} · {p.department} · {p.level}</option>)}
        </select>
        <label style={{ display: "inline-flex" }}>
          <input data-testid="hire-file-picker" type="file" multiple accept=".pdf,.txt,.doc,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={onPick} style={{ display: "none" }} />
          <span style={S.primaryBtn}>📂 {files.length ? `${files.length} résumés chosen` : "Upload candidate résumés"}</span>
        </label>
        <button data-testid="hire-run" disabled={running || files.length === 0 || !code} onClick={rank} style={{ ...S.primaryBtn, opacity: running || files.length === 0 || !code ? 0.5 : 1 }}>
          {running ? "Scoring…" : `Rank ${files.length || ""} candidates`}
        </button>
      </div>

      {jp && (
        <div style={{ padding: 12, background: "rgba(200,169,126,0.05)", border: "1px solid rgba(200,169,126,0.2)", borderRadius: 8, marginBottom: 12, fontSize: 11, color: "#cbd5e1" }}>
          <b style={{ color: "#f8fafc" }}>{jp.title}</b> · {jp.level} · min {jp.min_experience_years || 0}y · req skills: {(jp.required_skills || []).join(", ") || "—"}
        </div>
      )}

      {files.length > 0 && !batch && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Candidates ({files.length} of max 15)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {files.map((f, i) => (
              <div key={i} style={{ padding: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6 }}>
                <div style={{ fontSize: 10, color: "#64748b" }}>{f.name} · {(f.size / 1024).toFixed(1)} KB</div>
                <input data-testid={`hire-name-${i}`} value={names[i] || ""} onChange={e => setName(i, e.target.value)} style={{ ...S.input, width: "100%", marginTop: 4 }} placeholder={`Candidate ${i + 1} name`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {batch && (
        <div data-testid="hire-results" style={{ marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Batch {batch.id} · {batch.candidate_count} candidate(s) · {batch.job_profile_title}
            </div>
            <button onClick={() => setBatch(null)} style={S.ghostBtn}>New batch</button>
          </div>
          {(batch.ranked || []).map((r: any) => (
            <div key={(r.rank || "x") + (r.candidate_name || r.filename)} data-testid={`hire-rank-${r.rank || "err"}`} style={{
              padding: 12, marginBottom: 8, borderRadius: 8,
              background: "rgba(255,255,255,0.02)",
              border: r.error ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.08)",
              borderLeft: r.error ? "3px solid #fca5a5" : `3px solid ${recColor(r.recommendation)}`,
            }}>
              {r.error ? (
                <div style={{ fontSize: 12, color: "#fca5a5" }}>⚠ {r.filename}: {r.error}</div>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
                    <div>
                      <span style={{ fontSize: 22, fontWeight: 800, color: scoreColor(r.fit_score), marginRight: 10 }}>#{r.rank} · {r.fit_score}</span>
                      <span style={{ fontSize: 14, color: "#f8fafc", fontWeight: 700 }}>{r.candidate_name}</span>
                      <span style={{ fontSize: 10, color: "#64748b", marginLeft: 8 }}>{r.filename}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span style={{ ...S.pill, color: scoreColor(r.fit_score) }}>{(r.fit_label || "").toUpperCase()}</span>
                      <span style={{ ...S.pill, color: recColor(r.recommendation), background: `${recColor(r.recommendation)}22` }}>{(r.recommendation || "").toUpperCase().replace(/-/g, " ")}</span>
                      {typeof r.years_experience_estimate === "number" && <span style={S.pill}>~{r.years_experience_estimate}y exp</span>}
                    </div>
                  </div>
                  {r.headline && <div style={{ fontSize: 12, color: "#e2e8f0", marginTop: 6, lineHeight: 1.5 }}>{r.headline}</div>}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
                    <SimpleList title="Strengths" items={r.key_strengths} color="#86efac" />
                    <SimpleList title="Gaps" items={r.key_gaps} color="#fca5a5" />
                  </div>
                  {r.red_flags?.length > 0 && (
                    <div style={{ marginTop: 8, padding: 6, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 4, fontSize: 11, color: "#fca5a5" }}>
                      ⚠ {r.red_flags.join(" · ")}
                    </div>
                  )}
                  {r.interview_questions?.length > 0 && (
                    <details style={{ marginTop: 8 }}>
                      <summary style={{ cursor: "pointer", fontSize: 10, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" }}>Suggested interview questions</summary>
                      <ol style={{ margin: "6px 0 0 18px", color: "#cbd5e1", fontSize: 12, lineHeight: 1.6 }}>
                        {r.interview_questions.map((q: string, i: number) => <li key={i}>{q}</li>)}
                      </ol>
                    </details>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!batch && history.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Recent batches</div>
          {history.map((h: any) => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", borderRadius: 6, background: "rgba(255,255,255,0.02)", marginBottom: 4, fontSize: 11, color: "#cbd5e1", cursor: "pointer" }} onClick={() => loadBatch(h.id)}>
              <span>{new Date(h.created_at).toLocaleString()} · {h.job_profile_title}</span>
              <span>{h.candidate_count} candidates</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SimpleList({ title, items, color }: { title: string; items?: string[]; color: string }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: 2, color, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 18, color: "#e2e8f0", fontSize: 11, lineHeight: 1.5 }}>
        {items.slice(0, 4).map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </div>
  );
}

function recColor(rec?: string): string {
  const k = (rec || "").toLowerCase();
  if (k.includes("advance")) return "#86efac";
  if (k.includes("phone")) return "#67e8f9";
  if (k.includes("lower")) return "#fbbf24";
  return "#fca5a5";
}

// ─── HOURS TAB ──────────────────────────────────────────────────────────────
function HoursTab() {
  const [items, setItems] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    const r = await fetch(`${API()}/api/hours/list?active_only=false`);
    const j = await r.json();
    setItems(j.outlets || []);
  }
  useEffect(() => { load(); }, []);

  async function save() {
    if (!editing) return;
    const r = await adminFetch(`${API()}/api/hours/upsert`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (r.ok) { setEditing(null); await load(); } else alert("Save failed: " + await r.text());
  }

  function blankHours() { return WEEKDAYS.reduce((a, w) => ({ ...a, [w]: "closed" }), {} as Record<string, string>); }

  return (
    <div>
      <div style={S.toolbar}>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{items.length} outlets · feeds Daily Standup "Hours of Operation" card</div>
        <button data-testid="hours-new" onClick={() => setEditing({ name: "", outlet_type: "restaurant", hours: blankHours(), active: true })} style={S.primaryBtn}>+ New outlet</button>
      </div>

      <div style={S.grid}>
        {items.map(o => (
          <div key={o.id} data-testid={`hours-row-${o.id}`} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "#f8fafc", fontWeight: 700 }}>{o.name}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{o.outlet_type}{o.location ? ` · ${o.location}` : ""}</div>
                <table style={{ marginTop: 8, width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                  <tbody>
                    {WEEKDAYS.map(w => (
                      <tr key={w}><td style={{ color: "#94a3b8", textTransform: "uppercase", paddingRight: 8, fontFamily: "monospace" }}>{w}</td>
                      <td style={{ color: "#c8a97e", fontFamily: "monospace" }}>{o.hours?.[w] || "—"}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button data-testid={`hours-edit-${o.id}`} onClick={() => setEditing({ ...o, hours: { ...blankHours(), ...o.hours } })} style={S.tinyBtn}>Edit</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div style={S.modal} data-testid="hours-modal">
          <div style={S.modalCard}>
            <h3 style={{ margin: 0, fontSize: 18 }}>{editing.id ? "Edit outlet hours" : "New outlet"}</h3>
            <div style={S.formGrid}>
              <Field label="Name"><input data-testid="hours-name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} style={S.input} /></Field>
              <Field label="Type"><select value={editing.outlet_type} onChange={e => setEditing({ ...editing, outlet_type: e.target.value })} style={S.input}>{OUTLET_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Location"><input value={editing.location || ""} onChange={e => setEditing({ ...editing, location: e.target.value })} style={S.input} /></Field>
              <Field label="Phone"><input value={editing.phone || ""} onChange={e => setEditing({ ...editing, phone: e.target.value })} style={S.input} /></Field>
            </div>
            <div style={{ marginTop: 14, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>Weekly hours (use "closed", "24h", or "HH:MM-HH:MM")</div>
              {WEEKDAYS.map(w => (
                <div key={w} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", width: 40, textTransform: "uppercase", fontFamily: "monospace" }}>{w}</span>
                  <input data-testid={`hours-wday-${w}`} value={editing.hours[w] || ""} onChange={e => setEditing({ ...editing, hours: { ...editing.hours, [w]: e.target.value } })} style={{ ...S.input, flex: 1, fontFamily: "monospace" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setEditing(null)} style={S.ghostBtn}>Cancel</button>
              <button data-testid="hours-save" onClick={save} style={S.primaryBtn}>{editing.id ? "Save" : "Create"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── COVERAGE TAB ───────────────────────────────────────────────────────────
function CoverageTab() {
  const [start, setStart] = usePanelState<string>(PANEL_ID, "cov-start", new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<any>({ dates: [], coverage: [] });
  const [emps, setEmps] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    const r = await fetch(`${API()}/api/leadership/range?start=${start}&days=7`);
    const j = await r.json();
    setData(j);
    const er = await fetch(`${API()}/api/people/list?active_only=true`);
    const ej = await er.json();
    setEmps((ej.employees || []).filter((e: any) => ["director", "executive", "manager"].includes(e.role)));
  }
  useEffect(() => { load(); }, [start]);

  async function save() {
    if (!editing) return;
    const r = await adminFetch(`${API()}/api/leadership/upsert`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing),
    });
    if (r.ok) { setEditing(null); await load(); } else alert("Save failed: " + await r.text());
  }
  async function del(id: string) {
    if (!confirm("Delete this coverage entry?")) return;
    const r = await adminFetch(`${API()}/api/leadership/${id}/delete`, { method: "POST" });
    if (r.ok) await load();
  }

  const covByDate: Record<string, any[]> = {};
  (data.coverage || []).forEach((c: any) => { (covByDate[c.date] = covByDate[c.date] || []).push(c); });

  return (
    <div>
      <div style={S.toolbar}>
        <input type="date" data-testid="cov-start" value={start} onChange={e => setStart(e.target.value)} style={S.input} />
        <div style={{ fontSize: 12, color: "#94a3b8" }}>7-day leadership coverage · feeds Daily Standup "Leadership on Duty"</div>
        <button data-testid="cov-new" onClick={() => setEditing({ employee_id: emps[0]?.id || "", department: emps[0]?.department || "front-office", date: start, shift: "am" })} style={S.primaryBtn}>+ Add coverage</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
        {(data.dates || []).map((d: string) => (
          <div key={d} data-testid={`cov-col-${d}`} style={S.dayCol}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#c8a97e", textAlign: "center", padding: "8px 0", borderBottom: "1px solid rgba(200,169,126,0.2)" }}>
              {new Date(d + "T12:00:00Z").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 4 }}>
              {(covByDate[d] || []).map((c: any) => (
                <div key={c.id} data-testid={`cov-chip-${c.id}`} style={S.covChip} title={c.notes || ""}>
                  <div style={{ fontSize: 11, color: "#f8fafc", fontWeight: 600 }}>{c.employee_name}</div>
                  <div style={{ fontSize: 9, color: "#c8a97e", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{c.shift} · {c.department}</div>
                  <button onClick={() => del(c.id)} style={{ ...S.tinyBtn, marginTop: 4, padding: "2px 6px", fontSize: 9 }}>Delete</button>
                </div>
              ))}
              {!(covByDate[d] || []).length && <div style={{ fontSize: 10, color: "#64748b", fontStyle: "italic", textAlign: "center", padding: 8 }}>No coverage</div>}
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div style={S.modal} data-testid="cov-modal">
          <div style={S.modalCard}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Add coverage</h3>
            <div style={S.formGrid}>
              <Field label="Employee"><select data-testid="cov-emp" value={editing.employee_id} onChange={e => {
                const emp = emps.find(x => x.id === e.target.value);
                setEditing({ ...editing, employee_id: e.target.value, employee_name: emp?.display_name, department: emp?.department });
              }} style={S.input}>
                {emps.map(e => <option key={e.id} value={e.id}>{e.display_name} · {e.department}</option>)}
              </select></Field>
              <Field label="Date"><input type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} style={S.input} /></Field>
              <Field label="Shift"><select data-testid="cov-shift" value={editing.shift} onChange={e => setEditing({ ...editing, shift: e.target.value })} style={S.input}>{SHIFTS.map(s => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Notes"><input value={editing.notes || ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} style={S.input} placeholder="optional" /></Field>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
              <button onClick={() => setEditing(null)} style={S.ghostBtn}>Cancel</button>
              <button data-testid="cov-save" onClick={save} style={S.primaryBtn}>Save</button>
            </div>
          </div>
        </div>
      )}
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
  lockScreen: { height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#04060d", color: "#f8fafc", padding: 40 },
  header: { padding: "14px 20px", borderBottom: "1px solid rgba(200,169,126,0.15)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  eyebrow: { fontSize: 9, letterSpacing: 3, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" },
  title: { fontSize: 22, fontWeight: 700, color: "#f8fafc", marginTop: 4 },
  sub: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  tabs: { display: "flex", gap: 2, padding: "0 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" },
  tab: { padding: "12px 16px", background: "transparent", border: 0, color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer", borderBottom: "2px solid transparent", textTransform: "uppercase", letterSpacing: 1 },
  tabOn: { color: "#c8a97e", borderBottomColor: "#c8a97e" },
  toolbar: { display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 },
  card: { padding: 14, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 },
  input: { padding: "8px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#f8fafc", fontSize: 13, outline: "none" },
  primaryBtn: { padding: "8px 14px", borderRadius: 6, background: "rgba(200,169,126,0.15)", border: "1px solid rgba(200,169,126,0.5)", color: "#c8a97e", fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 },
  ghostBtn: { padding: "8px 12px", borderRadius: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#cbd5e1", fontSize: 12, cursor: "pointer" },
  tinyBtn: { padding: "4px 10px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", fontSize: 10, cursor: "pointer", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },
  pill: { fontSize: 9, padding: "2px 7px", borderRadius: 999, fontWeight: 700, letterSpacing: 1 },
  empty: { color: "#64748b", fontSize: 12, fontStyle: "italic", textAlign: "center", padding: 30, gridColumn: "1 / -1" },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2147483000, padding: 20 },
  modalCard: { background: "#0a0e1a", border: "1px solid rgba(200,169,126,0.3)", borderRadius: 12, padding: 24, minWidth: 460, maxWidth: 760, maxHeight: "90vh", overflow: "auto" },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 },
  dayCol: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, minHeight: 240 },
  covChip: { padding: "6px 8px", background: "rgba(200,169,126,0.08)", borderLeft: "2px solid #c8a97e", borderRadius: 4 },
  hrSection: { marginTop: 16, padding: 14, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 },
  hrHeader: { fontSize: 10, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 },
};
