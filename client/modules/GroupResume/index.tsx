import React, { useState, useEffect, useCallback } from "react";
import { CenterDialog } from "@/lib/side-panel";
import {
  FileText, Users, Building, DollarSign, Calendar, MapPin, Phone,
  Mail, Star, ChevronDown, ChevronRight, Plus, Save, Wand2, Check,
  Clock, Shield, Truck, Utensils, Music, Bed, Edit3, RefreshCw,
} from "lucide-react";

const API = window.location.origin;
const GET = (p: string) => fetch(`${API}/api/group-resume${p}`).then(r => r.json());
const POST = (p: string, b: any = {}) =>
  fetch(`${API}/api/group-resume${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) }).then(r => r.json());

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";
const RESUME_COLOR = "#ec4899";

type Tab = "list" | "view" | "edit";
const SECTION_ICONS: Record<string, any> = {
  group_info: Building, meeting_details: Calendar, contact_info: Phone,
  group_profile: Users, pre_conference: Clock, vip_info: Star,
  room_blocks: Bed, food_beverage: Utensils, av_requirements: Music,
  transportation: Truck, billing: DollarSign, schedule_of_events: Calendar,
  security: Shield, housekeeping: Bed, special_instructions: FileText,
};

export default function GroupResumeBuilder() {
  const [tab, setTab] = useState<Tab>("list");
  const [resumes, setResumes] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["group_info", "meeting_details", "vip_info", "room_blocks", "schedule_of_events"]));
  const [aiLoading, setAiLoading] = useState("");
  const [aiResult, setAiResult] = useState<any>(null);
  const [editSection, setEditSection] = useState<string | null>(null);
  const [editJson, setEditJson] = useState<string>("");
  const [importOpen, setImportOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const loadResumes = useCallback(async () => {
    const d = await GET("");
    setResumes(d.resumes || []);
    if (d.resumes?.length === 0) {
      await POST("/seed-sample");
      const retry = await GET("");
      setResumes(retry.resumes || []);
    }
  }, []);

  useEffect(() => { loadResumes(); }, []);

  const selectResume = useCallback(async (id: string) => {
    const r = await GET(`/${id}`);
    setSelected(r);
    setTab("view");
  }, []);

  const toggleSection = (s: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const aiAssist = useCallback(async (section: string, action: string) => {
    if (!selected) return;
    setAiLoading(section);
    const res = await POST(`/${selected.resume_id}/ai-assist`, { action, section, notes: "" });
    setAiResult({ section, ...res });
    setAiLoading("");
  }, [selected]);

  // iter202c · Builder actions
  const createBlank = useCallback(async () => {
    const name = prompt("Group name for new resume?") || "New Group";
    const r = await POST("", {
      group_info: {
        group_name: name, company: "", arrival_date: "", departure_date: "",
        estimated_attendance: 0, master_account: "",
      },
    });
    setFlash("New resume created");
    await loadResumes();
    if (r?.resume_id) { await selectResume(r.resume_id); setTab("edit"); }
    setTimeout(() => setFlash(null), 2500);
  }, [loadResumes, selectResume]);

  const openSectionEditor = useCallback((key: string) => {
    if (!selected) return;
    setEditSection(key);
    setEditJson(JSON.stringify(selected[key] ?? {}, null, 2));
  }, [selected]);

  const saveSectionEdit = useCallback(async () => {
    if (!selected || !editSection) return;
    let parsed: any;
    try { parsed = JSON.parse(editJson); }
    catch { setFlash("Invalid JSON — please fix and retry"); return; }
    const res = await fetch(`${API}/api/group-resume/${selected.resume_id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [editSection]: parsed }),
    });
    if (res.ok) {
      setFlash(`Saved ${editSection}`);
      const fresh = await GET(`/${selected.resume_id}`);
      setSelected(fresh);
      setEditSection(null);
      setTimeout(() => setFlash(null), 2500);
    } else setFlash("Save failed");
  }, [selected, editSection, editJson]);

  const applyAiSuggestion = useCallback(async () => {
    if (!selected || !aiResult) return;
    // Try parse suggestion — if AI returned JSON, apply to section; otherwise ask user
    let payload: any;
    try {
      const s = String(aiResult.suggestion || "").trim();
      // strip possible ```json fences
      const cleaned = s.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
      payload = JSON.parse(cleaned);
    } catch {
      setFlash("AI returned free-form text — cannot auto-apply. Edit section manually.");
      setTimeout(() => setFlash(null), 3500);
      return;
    }
    const r = await fetch(`${API}/api/group-resume/${selected.resume_id}/apply-ai-suggestion`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: aiResult.section, payload }),
    });
    if (r.ok) {
      setFlash(`Applied AI suggestion to ${aiResult.section}`);
      const fresh = await GET(`/${selected.resume_id}`);
      setSelected(fresh);
      setAiResult(null);
      setTimeout(() => setFlash(null), 2500);
    } else setFlash("Apply failed");
  }, [selected, aiResult]);

  const TABS: { id: Tab; label: string }[] = [
    { id: "list", label: "All Resumes" },
    { id: "view", label: "View Resume" },
    { id: "edit", label: "Edit Resume" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }} data-testid="group-resume-panel">
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-4 px-5 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: "rgba(236,72,153,0.1)", border: "1px solid rgba(236,72,153,0.25)" }}>
              <FileText className="w-4 h-4" style={{ color: RESUME_COLOR }} />
            </div>
            <div>
              <div className="text-[13px] font-semibold text-white">GROUP RESUME BUILDER</div>
              <div className="text-[9px] tracking-[0.15em] uppercase" style={{ ...MONO, color: "rgba(236,72,153,0.5)" }}>
                AI-Powered Event Document Generation
              </div>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex gap-1">
            <button onClick={createBlank} data-testid="resume-new"
              className="px-3 py-1.5 rounded-md text-[10px] font-medium transition-all text-white"
              style={{ background: "linear-gradient(135deg,#ec4899,#a855f7)" }}>
              + New
            </button>
            <button onClick={() => setImportOpen(true)} data-testid="resume-import"
              className="px-3 py-1.5 rounded-md text-[10px] font-medium transition-all"
              style={{ background: "transparent", color: "#ec4899", border: "1px solid rgba(236,72,153,0.35)" }}>
              ↓ Import from Events
            </button>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} data-testid={`resume-tab-${t.id}`}
                className="px-3 py-1.5 rounded-md text-[10px] font-medium transition-all"
                style={{
                  background: tab === t.id ? "rgba(236,72,153,0.08)" : SURFACE,
                  color: tab === t.id ? RESUME_COLOR : "rgba(148,163,184,0.5)",
                  border: `1px solid ${tab === t.id ? "rgba(236,72,153,0.15)" : BORDER}`,
                }}>
                {t.label}
              </button>
            ))}
            {selected && (
              <button onClick={() => window.open(`${API}/api/group-resume/${selected.resume_id}/pdf`, '_blank')}
                className="px-3 py-1.5 rounded-md text-[10px] font-medium transition-all"
                style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.15)" }}
                data-testid="export-pdf-btn">
                Export PDF
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* LIST */}
        {tab === "list" && (
          <div className="p-4" data-testid="resume-list">
            <div className="space-y-2">
              {resumes.map(r => (
                <div key={r.resume_id} onClick={() => selectResume(r.resume_id)}
                  className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-white/[0.02] transition"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                  data-testid={`resume-card-${r.resume_id}`}>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(236,72,153,0.08)" }}>
                    <Building className="w-5 h-5" style={{ color: RESUME_COLOR }} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[12px] font-semibold text-white">{r.group_info?.group_name || r.group_info?.company || "Untitled"}</div>
                    <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.5)" }}>
                      {r.group_info?.arrival_date} to {r.group_info?.departure_date} | {r.group_info?.estimated_attendance || "?"} attendees
                    </div>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full uppercase font-medium"
                    style={{ background: r.status === "confirmed" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: r.status === "confirmed" ? "#22c55e" : "#f59e0b" }}>
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW RESUME */}
        {tab === "view" && selected && (
          <div className="max-w-4xl mx-auto p-4" data-testid="resume-detail">
            {/* Title block */}
            <div className="text-center mb-6 pb-4" style={{ borderBottom: `2px solid ${BORDER}` }}>
              <div className="text-[9px] uppercase tracking-[0.3em] mb-1" style={{ color: RESUME_COLOR }}>GROUP RESUME</div>
              <div className="text-xl font-bold text-white">{selected.group_info?.group_name}</div>
              <div className="text-[11px] mt-1" style={{ color: "rgba(148,163,184,0.6)" }}>
                {selected.group_info?.company} | {selected.group_info?.arrival_date} to {selected.group_info?.departure_date}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: ACCENT }}>
                Est. Attendance: {selected.group_info?.estimated_attendance} | Master Account: #{selected.group_info?.master_account}
              </div>
            </div>

            {/* Sections */}
            {[
              { key: "meeting_details", label: "Meeting Details" },
              { key: "contact_info", label: "Contact Information" },
              { key: "group_profile", label: "Group Profile" },
              { key: "vip_info", label: "VIP Information" },
              { key: "room_blocks", label: "Room Blocks" },
              { key: "food_beverage", label: "Food & Beverage" },
              { key: "schedule_of_events", label: "Schedule of Events" },
              { key: "av_requirements", label: "AV Requirements" },
              { key: "transportation", label: "Transportation" },
              { key: "billing", label: "Billing & Finance" },
              { key: "security", label: "Security" },
              { key: "housekeeping", label: "Housekeeping" },
              { key: "special_instructions", label: "Special Instructions" },
            ].map(sec => {
              const Icon = SECTION_ICONS[sec.key] || FileText;
              const isExpanded = expanded.has(sec.key);
              const data = selected[sec.key];
              if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === "object" && !Array.isArray(data) && Object.keys(data).length === 0)) return null;

              return (
                <div key={sec.key} className="mb-2">
                  <button onClick={() => toggleSection(sec.key)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition hover:bg-white/[0.02]"
                    style={{ background: isExpanded ? "rgba(236,72,153,0.03)" : "transparent", border: `1px solid ${isExpanded ? "rgba(236,72,153,0.08)" : BORDER}` }}>
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <Icon className="w-3.5 h-3.5" style={{ color: RESUME_COLOR }} />
                    <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: isExpanded ? RESUME_COLOR : "rgba(148,163,184,0.6)" }}>{sec.label}</span>
                    <div className="flex-1" />
                    <button onClick={(e) => { e.stopPropagation(); aiAssist(sec.key, "improve"); }}
                      className="px-1.5 py-0.5 rounded text-[8px] transition hover:bg-white/5"
                      style={{ color: "rgba(168,85,247,0.5)", border: "1px solid rgba(168,85,247,0.1)" }}
                      data-testid={`ai-assist-${sec.key}`}>
                      {aiLoading === sec.key ? "..." : <><Wand2 className="w-2.5 h-2.5 inline" /> AI</>}
                    </button>
                  </button>
                  {isExpanded && (
                    <div className="ml-8 mt-1 mb-2">
                      <ResumeSection sectionKey={sec.key} data={data} />
                      {aiResult?.section === sec.key && (
                        <div className="mt-2 p-2 rounded text-[9px]" style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.1)" }} data-testid={`ai-suggestion-${sec.key}`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-semibold" style={{ color: "#a855f7" }}>AI Suggestion — review before apply:</div>
                            <div className="flex gap-1">
                              <button data-testid={`ai-apply-${sec.key}`} onClick={applyAiSuggestion}
                                className="px-2 py-0.5 rounded text-[9px] font-mono text-white"
                                style={{ background: "#10b981" }}>Apply</button>
                              <button data-testid={`ai-discard-${sec.key}`} onClick={() => setAiResult(null)}
                                className="px-2 py-0.5 rounded text-[9px] text-slate-400 border"
                                style={{ borderColor: "rgba(255,255,255,0.15)" }}>Discard</button>
                            </div>
                          </div>
                          <div style={{ color: "rgba(255,255,255,0.6)", maxHeight: 180, overflow: "auto", whiteSpace: "pre-wrap" }}>{aiResult.suggestion || aiResult.error || "No suggestion available"}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* EDIT RESUME (iter202c) */}
        {tab === "edit" && selected && (
          <div className="max-w-4xl mx-auto p-4 space-y-3" data-testid="resume-edit">
            <div className="rounded-lg p-3 text-[11px] text-white" style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)" }}>
              Editing <strong>{selected.group_info?.group_name || "Untitled"}</strong>. Click any section below to edit its JSON, or use <strong>AI</strong> in the View tab, then <strong>Apply</strong> to commit.
            </div>
            {RESUME_TEMPLATE_SECTIONS.map((key) => (
              <button key={key} onClick={() => openSectionEditor(key)} data-testid={`edit-section-${key}`}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition hover:bg-white/[0.02]"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <Edit3 className="w-3 h-3" style={{ color: "#ec4899" }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-white">{key.replace(/_/g, " ")}</span>
                <div className="flex-1" />
                <span className="text-[9px] font-mono text-slate-500">
                  {Array.isArray(selected[key])
                    ? `${selected[key].length} items`
                    : (selected[key] && Object.keys(selected[key]).length) ? `${Object.keys(selected[key]).length} fields` : "empty"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Section JSON editor modal */}
      {editSection && selected && (
        <CenterDialog
          open
          onClose={() => setEditSection(null)}
          testId="section-editor"
          maxWidth="40rem"
          title={`Edit ${editSection.replace(/_/g, " ")}`}
          subtitle="Direct JSON editor — Save applies immediately"
        >
            <textarea data-testid="section-json" value={editJson} onChange={(e) => setEditJson(e.target.value)}
              className="w-full p-3 font-mono text-[11px] bg-black text-emerald-200 outline-none resize-none rounded border border-slate-800"
              style={{ minHeight: 360 }} spellCheck={false} />
            <div className="pt-3 mt-3 border-t flex justify-end gap-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <button onClick={() => setEditSection(null)} className="px-3 py-1.5 rounded text-[11px] text-slate-400 border" style={{ borderColor: "rgba(255,255,255,0.12)" }}>Cancel</button>
              <button data-testid="section-save" onClick={saveSectionEdit} className="px-3 py-1.5 rounded text-[11px] text-white" style={{ background: "linear-gradient(135deg,#ec4899,#a855f7)" }}>Save</button>
            </div>
        </CenterDialog>
      )}

      {/* Import from Events drawer */}
      {importOpen && <ResumeImportDrawer onClose={() => setImportOpen(false)} onImported={async (id) => {
        setFlash("Imported"); setImportOpen(false); await loadResumes();
        if (id) await selectResume(id); setTab("view");
        setTimeout(() => setFlash(null), 2500);
      }} />}

      {flash && <div data-testid="resume-flash" className="fixed bottom-5 right-5 z-[99955] px-3 py-2 rounded text-[11px] text-white" style={{ background: "rgba(16,185,129,0.85)" }}>{flash}</div>}
    </div>
  );
}

const RESUME_TEMPLATE_SECTIONS = [
  "group_info", "meeting_details", "contact_info", "group_profile",
  "pre_conference", "vip_info", "room_blocks", "meeting_rooms",
  "food_beverage", "av_requirements", "transportation", "billing",
  "schedule_of_events", "housekeeping", "security", "special_instructions",
];

function ResumeImportDrawer({ onClose, onImported }: { onClose: () => void; onImported: (id: string | null) => Promise<void> }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/api/group-resume/importable-events`);
        if (r.ok) { const j = await r.json(); setEvents(j.events || []); }
      } finally { setLoading(false); }
    })();
  }, []);

  async function doImport(eid: string) {
    setBusyId(eid);
    try {
      const r = await fetch(`${API}/api/group-resume/import-from-event/${eid}`, { method: "POST" });
      if (r.ok) { const j = await r.json(); await onImported(j.resume_id || null); }
    } finally { setBusyId(null); }
  }

  return (
    <CenterDialog
      open
      onClose={onClose}
      testId="resume-import-drawer"
      maxWidth="40rem"
      title="Import from Echo Events"
      subtitle="Promotes scheduled events → pre-filled group resume"
    >
        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {loading && <div className="text-center text-xs text-slate-600 py-8">Scanning events…</div>}
          {!loading && events.length === 0 && <div className="text-center text-xs text-slate-600 py-8">No importable events right now.</div>}
          {events.map((e, i) => (
            <div key={e.id} data-testid={`resume-import-row-${i}`}
              className="flex items-center gap-3 p-3 rounded border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white">{e.name || e.title}</div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                  {e.source_collection} · {(e.start_date || e.event_date || "?").slice(0, 10)} · {e.attendance} attendees
                  {e.stage ? ` · ${e.stage}` : ""}
                </div>
              </div>
              <button onClick={() => doImport(e.id)} disabled={busyId === e.id}
                data-testid={`resume-import-btn-${i}`}
                className="px-3 py-1 rounded text-[10px] text-white"
                style={{ background: "linear-gradient(135deg,#ec4899,#a855f7)" }}>
                {busyId === e.id ? "…" : "Import"}
              </button>
            </div>
          ))}
        </div>
        <div className="pt-3 mt-3 border-t flex justify-end" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <button onClick={onClose} className="px-3 py-1.5 rounded text-[11px] text-slate-400 border" style={{ borderColor: "rgba(255,255,255,0.12)" }}>Close</button>
        </div>
    </CenterDialog>
  );
}

function ResumeSection({ sectionKey, data }: { sectionKey: string; data: any }) {
  if (!data) return null;

  // VIP list
  if (sectionKey === "vip_info" && Array.isArray(data)) {
    return (
      <div className="space-y-2">
        {data.map((vip: any, i: number) => (
          <div key={i} className="p-2.5 rounded-lg" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2">
              <Star className="w-3 h-3" style={{ color: "#f59e0b" }} />
              <span className="text-[11px] font-semibold text-white">{vip.name}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "rgba(236,72,153,0.08)", color: "#ec4899" }}>{vip.title}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-1.5 text-[9px]">
              <div><span style={{ color: "rgba(148,163,184,0.4)" }}>Room:</span> <span className="text-white">{vip.room_type}</span></div>
              <div><span style={{ color: "rgba(148,163,184,0.4)" }}>Rate:</span> <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: ACCENT }}>${vip.rate?.toLocaleString()}</span></div>
              <div><span style={{ color: "rgba(148,163,184,0.4)" }}>Arrival:</span> <span className="text-white">{vip.arrival}</span></div>
            </div>
            {vip.amenity && <div className="text-[8px] mt-1" style={{ color: "rgba(148,163,184,0.4)" }}>Amenity: {vip.amenity}</div>}
          </div>
        ))}
      </div>
    );
  }

  // Schedule of events
  if (sectionKey === "schedule_of_events" && Array.isArray(data)) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-[9px]">
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
              {["Date", "Time", "Event", "Location", "Setup", "Count"].map(h => (
                <th key={h} className="px-2 py-1 text-left font-semibold" style={{ color: "rgba(148,163,184,0.4)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((evt: any, i: number) => (
              <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.02)` }}>
                <td className="px-2 py-1 text-white font-medium">{evt.date}</td>
                <td className="px-2 py-1" style={{ color: "rgba(148,163,184,0.6)" }}>{evt.time}</td>
                <td className="px-2 py-1 text-white">{evt.event}</td>
                <td className="px-2 py-1" style={{ color: ACCENT }}>{evt.location}</td>
                <td className="px-2 py-1" style={{ color: "rgba(148,163,184,0.5)" }}>{evt.setup}</td>
                <td className="px-2 py-1 font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace", color: "rgba(255,255,255,0.7)" }}>{evt.count || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Room blocks
  if (sectionKey === "room_blocks") {
    const contracted = data.contracted;
    return (
      <div>
        {contracted && (
          <div className="mb-3">
            <div className="text-[10px] font-semibold mb-1 text-white">Contracted Block — {contracted.total_nights} nights | ${contracted.total_revenue?.toLocaleString()}</div>
            <div className="space-y-1">
              {contracted.blocks?.map((b: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-2 py-1 rounded text-[9px]" style={{ background: SURFACE }}>
                  <span className="text-white flex-1">{b.type}</span>
                  <span style={{ color: "rgba(148,163,184,0.5)" }}>Sun:{b.sun} Mon:{b.mon} Tue:{b.tue}</span>
                  <span className="font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace", color: ACCENT }}>Total: {b.total} @ ${b.rate}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {data.picked_up && <div className="text-[10px]" style={{ color: "#22c55e" }}>Picked Up: {data.picked_up.total} (as of {data.picked_up.as_of})</div>}
      </div>
    );
  }

  // Generic object renderer
  if (typeof data === "object" && !Array.isArray(data)) {
    return (
      <div className="space-y-1">
        {Object.entries(data).map(([k, v]) => {
          if (typeof v === "object" && v !== null) {
            if (Array.isArray(v)) {
              return (
                <div key={k}>
                  <div className="text-[9px] font-semibold capitalize mb-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>{k.replace(/_/g, " ")}</div>
                  <ul className="list-disc list-inside">
                    {(v as any[]).map((item, i) => (
                      <li key={i} className="text-[9px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {typeof item === "string" ? item : JSON.stringify(item)}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            }
            return (
              <div key={k}>
                <div className="text-[9px] font-semibold capitalize mb-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>{k.replace(/_/g, " ")}</div>
                {Object.entries(v as object).map(([sk, sv]) => (
                  <div key={sk} className="flex items-center gap-1 text-[9px] ml-2">
                    <span style={{ color: "rgba(148,163,184,0.4)" }}>{sk.replace(/_/g, " ")}:</span>
                    <span className="text-white">{String(sv)}</span>
                  </div>
                ))}
              </div>
            );
          }
          return (
            <div key={k} className="flex items-start gap-1 text-[9px]">
              <span className="capitalize" style={{ color: "rgba(148,163,184,0.4)", minWidth: 80 }}>{k.replace(/_/g, " ")}:</span>
              <span className="text-white">{String(v)}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.5)" }}>{JSON.stringify(data)}</div>;
}
