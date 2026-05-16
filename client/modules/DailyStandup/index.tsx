/**
 * Daily Standup Board — internal name "The Sailing Yacht" (editable, iter170)
 *
 * Morning briefing hub. Each department contributes; Front Office confirms;
 * the board is emailed out to every department head.
 *
 * 14 canonical sections: Ops Numbers, VIP Arrivals, VIPs In-House, GSS Goals,
 * Top Areas, Glitch Guests, Showrooms, F&B Covers, Leadership on Duty, People
 * Services, Hours of Operation, Groups In-House, Site Visits, Resort Activities.
 */
import React, { useEffect, useRef, useState } from "react";
import { usePanelState } from "../../lib/usePanelState";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};
const PANEL_ID = "daily-standup";

interface SectionDef { id: string; label: string; dept: string; default_layout: string; }
interface SectionState { content: any; autofilled: boolean; edited_by: string | null; updated_at: string | null; approved: boolean; approved_by?: string; }
interface Board { id: string; date: string; internal_name: string; status: "draft" | "confirmed" | "sent"; confirmed_by: string | null; confirmed_at: string | null; sent_at: string | null; sections: Record<string, SectionState>; }

interface ProposedSection { section_id: string; content: any; confidence: number; rationale: string; }
interface IngestProposal { ingest_id: string; filename: string; proposed_sections: ProposedSection[]; unmapped_notes?: string; }

export default function DailyStandup() {
  const [date, setDate] = usePanelState<string>(PANEL_ID, "active-date", new Date().toISOString().slice(0, 10));
  const [board, setBoard] = useState<Board | null>(null);
  const [sectionDefs, setSectionDefs] = useState<SectionDef[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [proposals, setProposals] = useState<IngestProposal[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setMsg(null);
    const r = await fetch(`${API()}/api/standup/date/${date}`);
    const j = await r.json();
    setBoard(j.board); setSectionDefs(j.sections_def || []);
  }
  useEffect(() => { load(); }, [date]);

  async function autofill() {
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData(); fd.append("date", date);
      const r = await fetch(`${API()}/api/standup/autofill`, { method: "POST", body: fd });
      const j = await r.json();
      setBoard(j.board);
      setMsg(`Auto-filled ${(j.autofilled_sections || []).length} section(s) from live OS data.`);
    } finally { setBusy(false); }
  }

  async function saveSection(section_id: string, content: any) {
    await fetch(`${API()}/api/standup/section`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, section_id, content }),
    });
    await load();
  }
  async function approveSection(section_id: string) {
    await fetch(`${API()}/api/standup/section/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, section_id }),
    });
    await load();
  }
  async function publish() {
    setBusy(true);
    try {
      await fetch(`${API()}/api/standup/publish`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      setMsg("Board confirmed. Click ‘Send briefing’ to email."); await load();
    } finally { setBusy(false); }
  }
  async function sendBriefing() {
    setBusy(true);
    try {
      const r = await fetch(`${API()}/api/standup/send`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, to: [] }),
      });
      const j = await r.json();
      setMsg(`${j.dry_run ? "Dry-run (no Resend key or recipients):" : "Dispatched:"} ${j.status} · ${(j.recipients || []).length} recipient(s) · ${j.html_preview_bytes} bytes`);
      await load();
    } finally { setBusy(false); }
  }
  async function ingest(file: File, section_hint = "auto") {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("date", date); fd.append("section_hint", section_hint); fd.append("file", file);
      const r = await fetch(`${API()}/api/standup/ingest`, { method: "POST", body: fd });
      const j = await r.json();
      if (!j.ok) { setMsg(`Ingest failed: ${JSON.stringify(j).slice(0,200)}`); return; }
      setMsg(`📄 Ingested ${j.filename} · ${j.text_chars} chars · asking Claude to propose merges…`);
      // Auto-trigger LLM proposal
      const pr = await fetch(`${API()}/api/standup/ingest/${j.ingest_id}/propose`, { method: "POST" });
      if (!pr.ok) { setMsg(`Propose failed: ${(await pr.text()).slice(0,200)}`); return; }
      const pj = await pr.json();
      const proposed = (pj.proposal?.proposed_sections || []) as ProposedSection[];
      setProposals((prev) => [...prev, { ingest_id: j.ingest_id, filename: j.filename, proposed_sections: proposed, unmapped_notes: pj.proposal?.unmapped_notes }]);
      setMsg(`✨ Echo proposed ${proposed.length} section merge${proposed.length === 1 ? "" : "s"} from ${j.filename}. Review below.`);
    } catch (e: any) {
      setMsg(`Error: ${e?.message || String(e)}`);
    } finally { setBusy(false); }
  }

  async function acceptProposal(p: IngestProposal, section_ids: string[]) {
    setAccepting(p.ingest_id);
    try {
      const r = await fetch(`${API()}/api/standup/ingest/accept`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, ingest_id: p.ingest_id, section_ids }),
      });
      const j = await r.json();
      if (j.ok) {
        setBoard(j.board);
        setProposals((prev) => prev.filter((x) => x.ingest_id !== p.ingest_id));
        setMsg(`✓ Merged ${(j.merged_sections || []).length} section(s) from ${p.filename}`);
      } else {
        setMsg(`Merge failed: ${JSON.stringify(j).slice(0,200)}`);
      }
    } finally { setAccepting(null); }
  }

  function dismissProposal(ingest_id: string) {
    setProposals((prev) => prev.filter((x) => x.ingest_id !== ingest_id));
  }

  const approvedCount = board ? Object.values(board.sections).filter(s => s.approved).length : 0;
  const totalSections = sectionDefs.length;

  return (
    <div data-testid="daily-standup-panel" style={S.root}>
      <header style={S.header}>
        <div>
          <div style={S.eyebrow}>Morning briefing · Front Office</div>
          <h1 style={S.title}>{board?.internal_name || "Daily Standup"} · <span style={{ color: "#c8a97e" }}>{date}</span></h1>
          <p style={S.sub}>Each department contributes → Front Office confirms → we email it out.</p>
        </div>
        <div style={S.headerCtrls}>
          <input data-testid="standup-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.dateInput} />
          <button data-testid="standup-autofill" onClick={autofill} disabled={busy} style={S.ghostBtn}>⚡ Auto-fill</button>
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) ingest(f); e.target.value = ""; }} />
          <button data-testid="standup-ingest" onClick={() => fileRef.current?.click()} disabled={busy} style={S.ghostBtn}>📄 Ingest PDF</button>
          {board?.status === "draft" && (
            <button data-testid="standup-publish" onClick={publish} disabled={busy} style={S.primaryBtn}>✓ Confirm</button>
          )}
          {(board?.status === "confirmed" || board?.status === "sent") && (
            <button data-testid="standup-send" onClick={sendBriefing} disabled={busy} style={S.primaryBtn}>📨 Send briefing</button>
          )}
          <div style={S.statusPill} data-testid="standup-status">
            <span style={{ fontSize: 10, fontWeight: 700 }}>{board?.status?.toUpperCase() || "—"}</span>
            <span style={{ marginLeft: 6, fontSize: 10, color: "#94a3b8" }}>· {approvedCount}/{totalSections} approved</span>
          </div>
        </div>
      </header>

      {msg && <div data-testid="standup-msg" style={S.msgBar}>{msg}</div>}

      {proposals.length > 0 && (
        <div data-testid="standup-proposals" style={S.proposalTray}>
          {proposals.map((p) => (
            <ProposalReviewCard
              key={p.ingest_id}
              proposal={p}
              sectionDefs={sectionDefs}
              busy={accepting === p.ingest_id}
              onAccept={(ids) => acceptProposal(p, ids)}
              onDismiss={() => dismissProposal(p.ingest_id)}
            />
          ))}
        </div>
      )}

      <div style={S.grid}>
        {sectionDefs.map((sdef) => {
          const sec = board?.sections?.[sdef.id];
          return (
            <SectionCard
              key={sdef.id}
              sdef={sdef}
              section={sec}
              disabled={board?.status === "sent"}
              onSave={(content) => saveSection(sdef.id, content)}
              onApprove={() => approveSection(sdef.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── SectionCard with inline editable JSON content ──────────────────────────
function SectionCard({ sdef, section, disabled, onSave, onApprove }: {
  sdef: SectionDef; section?: SectionState; disabled: boolean;
  onSave: (c: any) => void; onApprove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => JSON.stringify(section?.content || null, null, 2));

  useEffect(() => { setDraft(JSON.stringify(section?.content || null, null, 2)); }, [section?.updated_at]);

  function save() {
    try {
      const parsed = JSON.parse(draft);
      onSave(parsed);
      setEditing(false);
    } catch (e: any) { alert("Invalid JSON: " + e?.message); }
  }

  const deptColor = deptColors[sdef.dept] || "#94a3b8";
  const hasContent = section?.content != null && (Array.isArray(section.content) ? section.content.length > 0 : true);

  return (
    <article data-testid={`standup-section-${sdef.id}`} style={{ ...S.card, borderTop: `3px solid ${deptColor}` }}>
      <header style={S.cardHead}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 2, color: deptColor, fontWeight: 700, textTransform: "uppercase" }}>{sdef.dept}</div>
          <h3 style={S.cardTitle}>{sdef.label}</h3>
        </div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {section?.autofilled && <span style={S.autopill}>AUTO</span>}
          {section?.approved && <span style={S.approvedPill}>✓ APPROVED</span>}
        </div>
      </header>

      <div style={S.cardBody}>
        {editing ? (
          <textarea data-testid={`standup-edit-${sdef.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} style={S.ta} rows={8} />
        ) : hasContent ? (
          <SectionContentRenderer layout={sdef.default_layout} content={section!.content} />
        ) : (
          <div style={S.empty}>No content yet · click Edit to add manually or ⚡ Auto-fill.</div>
        )}
      </div>

      <footer style={S.cardFoot}>
        <span style={{ fontSize: 10, color: "#64748b" }}>
          {section?.updated_at ? `Updated ${new Date(section.updated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${section.edited_by || "—"}` : "Not yet edited"}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {editing ? (
            <>
              <button data-testid={`standup-cancel-${sdef.id}`} onClick={() => setEditing(false)} style={S.tinyBtn}>Cancel</button>
              <button data-testid={`standup-save-${sdef.id}`} onClick={save} style={{ ...S.tinyBtn, color: "#22c55e" }}>Save</button>
            </>
          ) : (
            <>
              {!disabled && <button data-testid={`standup-editbtn-${sdef.id}`} onClick={() => setEditing(true)} style={S.tinyBtn}>Edit</button>}
              {!disabled && hasContent && !section?.approved && (
                <button data-testid={`standup-approve-${sdef.id}`} onClick={onApprove} style={{ ...S.tinyBtn, color: "#c8a97e" }}>Approve ✓</button>
              )}
            </>
          )}
        </div>
      </footer>
    </article>
  );
}

function ProposalReviewCard({ proposal, sectionDefs, busy, onAccept, onDismiss }: {
  proposal: IngestProposal; sectionDefs: SectionDef[]; busy: boolean;
  onAccept: (ids: string[]) => void; onDismiss: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(proposal.proposed_sections.map(p => p.section_id)));
  const labelById = Object.fromEntries(sectionDefs.map(s => [s.id, s.label]));
  const deptById = Object.fromEntries(sectionDefs.map(s => [s.id, s.dept]));

  function toggle(id: string) {
    setSelected((prev) => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });
  }

  return (
    <div data-testid={`standup-proposal-${proposal.ingest_id}`} style={S.proposalCard}>
      <header style={S.proposalHead}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: 3, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" }}>Echo proposes merges</div>
          <div style={{ fontSize: 14, color: "#f8fafc", fontWeight: 700, marginTop: 3 }}>from <span style={{ color: "#c8a97e" }}>{proposal.filename}</span></div>
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
            {proposal.proposed_sections.length} section{proposal.proposed_sections.length === 1 ? "" : "s"} · click to accept the ones that look right
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button data-testid={`standup-proposal-dismiss-${proposal.ingest_id}`} onClick={onDismiss} disabled={busy} style={S.tinyBtn}>Dismiss</button>
          <button data-testid={`standup-proposal-accept-${proposal.ingest_id}`} onClick={() => onAccept(Array.from(selected))} disabled={busy || selected.size === 0}
            style={{ ...S.primaryBtn, padding: "6px 12px", fontSize: 11 }}>
            {busy ? "Merging…" : `✓ Merge ${selected.size} selected`}
          </button>
        </div>
      </header>

      {proposal.proposed_sections.length === 0 && (
        <div style={{ padding: 14, color: "#94a3b8", fontSize: 12, fontStyle: "italic" }}>
          Echo couldn't confidently map any section from this PDF. {proposal.unmapped_notes ? `Notes: ${proposal.unmapped_notes}` : ""}
        </div>
      )}

      <div style={S.proposalGrid}>
        {proposal.proposed_sections.map((p, i) => {
          const label = labelById[p.section_id] || p.section_id;
          const dept = deptById[p.section_id] || "";
          const deptColor = deptColors[dept] || "#94a3b8";
          const isOn = selected.has(p.section_id);
          return (
            <div key={`${p.section_id}-${i}`} data-testid={`standup-proposal-section-${p.section_id}`}
              style={{ ...S.proposalItem, borderLeft: `3px solid ${isOn ? deptColor : "rgba(255,255,255,0.1)"}`, opacity: isOn ? 1 : 0.55 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, color: deptColor, fontWeight: 700, textTransform: "uppercase" }}>{dept}</div>
                  <div style={{ fontSize: 13, color: "#f8fafc", fontWeight: 700, marginTop: 2 }}>{label}</div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, fontStyle: "italic" }}>{p.rationale}</div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 10, color: "#cbd5e1", fontWeight: 600 }}>
                  <input type="checkbox" checked={isOn} onChange={() => toggle(p.section_id)}
                    data-testid={`standup-proposal-check-${p.section_id}`} style={{ accentColor: "#c8a97e", cursor: "pointer" }} />
                  <span style={{ color: "#c8a97e" }}>{Math.round((p.confidence || 0) * 100)}%</span>
                </label>
              </div>
              <pre style={{ ...S.pre, maxHeight: 120, marginTop: 8 }}>{JSON.stringify(p.content, null, 2).slice(0, 600)}</pre>
            </div>
          );
        })}
      </div>

      {proposal.unmapped_notes && proposal.proposed_sections.length > 0 && (
        <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>
          ⓘ Unmapped: {proposal.unmapped_notes}
        </div>
      )}
    </div>
  );
}

function SectionContentRenderer({ layout, content }: { layout: string; content: any }) {
  if (layout === "guest_list" && content?.guests) {
    return (
      <ul style={S.list}>
        {content.guests.slice(0, 20).map((g: any, i: number) => (
          <li key={i} style={S.listItem}>
            <span style={{ fontWeight: 700, color: "#f8fafc" }}>{g.name}</span>
            <span style={{ color: "#94a3b8", fontSize: 11 }}>room {g.room}{g.tier ? ` · ${g.tier}` : ""}{g.issue ? ` · ${g.issue}` : ""}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (layout === "hours_grid" && content?.outlets) {
    return (
      <ul style={S.list}>
        {content.outlets.map((o: any, i: number) => (
          <li key={i} style={S.listItem}>
            <span style={{ fontWeight: 700, color: "#f8fafc" }}>{o.outlet}</span>
            <span style={{ color: "#c8a97e", fontSize: 11, fontFamily: "monospace" }}>{o.today_hours}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (layout === "schedule_list" && content?.activities) {
    return (
      <ul style={S.list}>
        {content.activities.map((a: any, i: number) => (
          <li key={i} style={S.listItem}>
            <span style={{ color: "#c8a97e", fontSize: 11, fontFamily: "monospace", minWidth: 64 }}>{a.time || "—"}</span>
            <span style={{ flex: 1, color: "#f8fafc" }}>{a.name}</span>
            <span style={{ color: "#94a3b8", fontSize: 10 }}>{a.outlet || ""}</span>
          </li>
        ))}
      </ul>
    );
  }
  // Leadership by department (iter173)
  if (content?.by_department && typeof content.by_department === "object") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {Object.entries(content.by_department).map(([dept, people]: any) => (
          <div key={dept} style={{ padding: "4px 0" }}>
            <div style={{ fontSize: 9, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" }}>{dept}</div>
            <div style={{ fontSize: 12, color: "#f8fafc", marginTop: 2 }}>{(people as string[]).join(" · ")}</div>
          </div>
        ))}
      </div>
    );
  }
  // Showrooms (iter173)
  if (content?.rooms && Array.isArray(content.rooms)) {
    return (
      <ul style={S.list}>
        {content.rooms.map((r: any, i: number) => {
          const statusColor: Record<string, string> = { approved: "#22c55e", "pending-approval": "#fbbf24", designated: "#94a3b8", "in-prep": "#fbbf24" };
          return (
            <li key={i} style={{ ...S.listItem, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, color: "#f8fafc" }}>Rm {r.room}</span>
              <span style={{ color: "#94a3b8", fontSize: 11 }}>{r.room_type || ""}</span>
              <span style={{ color: "#cbd5e1", fontSize: 11, flex: 1 }}>{r.purpose} · {r.window}</span>
              <span style={{ color: statusColor[r.status] || "#94a3b8", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{r.status}</span>
            </li>
          );
        })}
      </ul>
    );
  }
  // Fallback
  return <pre style={S.pre}>{JSON.stringify(content, null, 2).slice(0, 1200)}</pre>;
}

const deptColors: Record<string, string> = {
  "front-office": "#c8a97e", "guest-services": "#38bdf8", "quality": "#a78bfa",
  "housekeeping": "#22c55e", "fb": "#fbbf24", "people-services": "#ec4899",
  "sales": "#f97316", "activities": "#06b6d4",
};

const S: Record<string, React.CSSProperties> = {
  root: { height: "100%", display: "flex", flexDirection: "column", background: "#04060d", color: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif", overflow: "hidden" },
  header: { padding: "14px 20px", borderBottom: "1px solid rgba(200,169,126,0.15)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  eyebrow: { fontSize: 9, letterSpacing: 3, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" },
  title: { fontSize: 20, fontWeight: 700, color: "#f8fafc", marginTop: 4 },
  sub: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  headerCtrls: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
  dateInput: { padding: "8px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "#f8fafc", fontSize: 12 },
  ghostBtn: { padding: "8px 12px", borderRadius: 6, background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", fontSize: 11, cursor: "pointer", fontWeight: 600 },
  primaryBtn: { padding: "8px 14px", borderRadius: 6, background: "rgba(200,169,126,0.15)", border: "1px solid rgba(200,169,126,0.5)", color: "#c8a97e", fontWeight: 700, fontSize: 11, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 },
  statusPill: { padding: "6px 10px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "#cbd5e1" },
  msgBar: { padding: "10px 20px", background: "rgba(56,189,248,0.08)", borderBottom: "1px solid rgba(56,189,248,0.2)", color: "#bae6fd", fontSize: 12 },
  grid: { flex: 1, overflow: "auto", padding: "18px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 },
  card: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, display: "flex", flexDirection: "column", minHeight: 180, overflow: "hidden" },
  cardHead: { padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 },
  cardTitle: { fontSize: 14, color: "#f8fafc", fontWeight: 700, margin: 0, marginTop: 2 },
  autopill: { fontSize: 8, padding: "2px 7px", background: "rgba(34,197,94,0.15)", color: "#22c55e", borderRadius: 999, fontWeight: 700, letterSpacing: 1 },
  approvedPill: { fontSize: 8, padding: "2px 7px", background: "rgba(200,169,126,0.15)", color: "#c8a97e", borderRadius: 999, fontWeight: 700, letterSpacing: 1 },
  cardBody: { flex: 1, padding: "10px 14px", overflow: "auto" },
  empty: { color: "#64748b", fontSize: 11, fontStyle: "italic", padding: 8, textAlign: "center" },
  ta: { width: "100%", padding: 8, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, color: "#f8fafc", fontSize: 11, fontFamily: "ui-monospace,monospace", boxSizing: "border-box", resize: "vertical" },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 3 },
  listItem: { display: "flex", gap: 10, padding: "4px 6px", alignItems: "center", fontSize: 12 },
  pre: { fontSize: 11, fontFamily: "ui-monospace, monospace", color: "#cbd5e1", background: "rgba(0,0,0,0.3)", padding: 8, borderRadius: 6, margin: 0, overflow: "auto" },
  cardFoot: { padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", alignItems: "center" },
  tinyBtn: { padding: "4px 10px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#cbd5e1", fontSize: 10, cursor: "pointer", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 },
  proposalTray: { padding: "12px 20px 0", display: "flex", flexDirection: "column", gap: 10 },
  proposalCard: { background: "linear-gradient(180deg, rgba(200,169,126,0.06), rgba(200,169,126,0.02))", border: "1px solid rgba(200,169,126,0.3)", borderRadius: 10, overflow: "hidden" },
  proposalHead: { padding: "12px 14px", borderBottom: "1px solid rgba(200,169,126,0.15)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" },
  proposalGrid: { padding: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 },
  proposalItem: { padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" },
};
