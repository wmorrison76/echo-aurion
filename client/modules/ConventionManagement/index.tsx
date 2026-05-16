// iter201 · Convention Management — now CRUD-enabled, with import from Echo Events.
// Lives as a tab inside EchoEvents (the single Events hub). No longer a standalone
// sidebar entry. Talks to /api/conventions/* backend.
import React, { useState, useEffect, useCallback } from "react";
import { CenterDialog } from "@/lib/side-panel";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || window.location.origin;
};

function adminHeaders(): Record<string, string> {
  const tok = typeof window !== "undefined" ? localStorage.getItem("admin_api_token") || "" : "";
  return tok ? { "X-Admin-Token": tok, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

type Convention = {
  id: string;
  name: string;
  client?: string;
  start_date: string;
  end_date: string;
  expected_attendance: number;
  rooms_needed: Array<{ room_id: string; setup_style: string; capacity: number }>;
  breakout_sessions: Array<any>;
  catering_requirements: Array<any>;
  av_requirements: Array<any>;
  notes?: string;
  status: string;
  imported_from_event_id?: string;
};

type ImportableEvent = {
  id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  event_date?: string;
  guest_count?: number;
  guaranteed_count?: number;
  client_name?: string;
  venue?: string;
  stage?: string;
};

const EMPTY: Convention = {
  id: "",
  name: "",
  client: "",
  start_date: "",
  end_date: "",
  expected_attendance: 0,
  rooms_needed: [],
  breakout_sessions: [],
  catering_requirements: [],
  av_requirements: [],
  notes: "",
  status: "planning",
};

export default function ConventionManagementPanel() {
  const [conventions, setConventions] = useState<Convention[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<{ mode: "new" | "edit" | null; draft: Convention }>({ mode: null, draft: EMPTY });
  const [importOpen, setImportOpen] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API()}/api/conventions?limit=100`);
      const j = await r.json();
      setConventions(j.conventions || []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function remove(id: string, name: string) {
    if (!confirm(`Delete convention "${name}"? This also removes its calendar entries.`)) return;
    const r = await fetch(`${API()}/api/conventions/${id}`, { method: "DELETE", headers: adminHeaders() });
    if (r.ok) { setFlash(`Deleted "${name}"`); await load(); setTimeout(() => setFlash(null), 3000); }
    else setFlash(`Delete failed: ${await r.text()}`);
  }

  async function save() {
    const d = editor.draft;
    if (!d.name || !d.start_date || !d.end_date) { setFlash("Name + start + end required"); return; }
    const body = {
      name: d.name, client: d.client || "", start_date: d.start_date, end_date: d.end_date,
      expected_attendance: Number(d.expected_attendance) || 0,
      rooms_needed: d.rooms_needed || [], breakout_sessions: d.breakout_sessions || [],
      catering_requirements: d.catering_requirements || [], av_requirements: d.av_requirements || [],
      notes: d.notes || "",
      ...(editor.mode === "edit" ? { status: d.status } : {}),
    };
    const url = editor.mode === "new" ? `${API()}/api/conventions` : `${API()}/api/conventions/${d.id}`;
    const method = editor.mode === "new" ? "POST" : "PATCH";
    const r = await fetch(url, { method, headers: adminHeaders(), body: JSON.stringify(body) });
    if (r.ok) { setFlash(`Saved`); setEditor({ mode: null, draft: EMPTY }); await load(); setTimeout(() => setFlash(null), 2500); }
    else setFlash(`Save failed: ${await r.text()}`);
  }

  async function cleanupTestData() {
    if (!confirm("Remove duplicate TEST_* conventions? Keeps 1 for regression.")) return;
    const r = await fetch(`${API()}/api/conventions/cleanup-test-data`, { method: "POST", headers: adminHeaders() });
    const j = await r.json();
    if (r.ok) { setFlash(`Cleaned ${j.removed} duplicates`); await load(); setTimeout(() => setFlash(null), 3000); }
    else setFlash(`Cleanup failed: ${j.detail || "unknown"}`);
  }

  const openNew = () => setEditor({ mode: "new", draft: { ...EMPTY } });
  const openEdit = (c: Convention) => setEditor({ mode: "edit", draft: { ...c } });

  return (
    <div data-testid="convention-panel" className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }}>
      <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(59,130,246,0.15))", border: "1px solid rgba(168,85,247,0.25)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div>
            <div className="text-sm font-semibold text-white tracking-wide">Convention & Trade Show Management</div>
            <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Breakout Rooms · F&B · CRUD · Import from Events</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button data-testid="conv-new" onClick={openNew}
            className="px-3 py-1.5 rounded text-[11px] font-mono text-white"
            style={{ background: "linear-gradient(135deg,#a855f7,#3b82f6)" }}>+ New convention</button>
          <button data-testid="conv-import" onClick={() => setImportOpen(true)}
            className="px-3 py-1.5 rounded text-[11px] font-mono text-white border"
            style={{ background: "transparent", borderColor: "rgba(168,85,247,0.35)", color: "#c8a4ff" }}>↓ Import from Echo Events</button>
          <button data-testid="conv-cleanup" onClick={cleanupTestData}
            className="px-3 py-1.5 rounded text-[11px] font-mono text-slate-400 border"
            style={{ background: "transparent", borderColor: "rgba(255,255,255,0.08)" }}>Clean test data</button>
        </div>
      </div>

      {flash && <div data-testid="conv-flash" className="px-5 py-2 text-[11px] text-emerald-300 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(16,185,129,0.08)" }}>{flash}</div>}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {[
          { label: "Total Events", value: conventions.length, color: "#a855f7" },
          { label: "Total Attendance", value: conventions.reduce((s, c) => s + (c.expected_attendance || 0), 0), color: "#3b82f6" },
          { label: "Rooms Needed", value: conventions.reduce((s, c) => s + (c.rooms_needed?.length || 0), 0), color: "#10b981" },
          { label: "Imported from Events", value: conventions.filter(c => c.imported_from_event_id).length, color: "#f59e0b" },
        ].map((s, i) => (
          <div key={i} className="p-3 rounded-lg border" style={{ background: "#1a1f2e", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-xl font-mono font-bold" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
        {loading && <div className="text-center text-sm text-slate-600 py-12">Loading conventions…</div>}
        {!loading && conventions.length === 0 && <div className="text-center text-sm text-slate-600 py-12">No conventions yet. Click <strong>+ New</strong> or <strong>Import from Echo Events</strong>.</div>}
        {conventions.map((ev, i) => (
          <div key={ev.id} data-testid={`convention-${i}`} className="rounded-lg border p-4" style={{ background: "#1a1f2e", borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">{ev.name}</div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                  {ev.start_date} → {ev.end_date} · {ev.expected_attendance} attendees
                  {ev.client ? ` · ${ev.client}` : ""}
                  {ev.imported_from_event_id ? ` · imported from ${ev.imported_from_event_id.slice(0, 10)}…` : ""}
                </div>
                {ev.notes && <div className="text-[11px] text-slate-400 mt-2">{ev.notes}</div>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold tracking-wider" style={{ background: ev.status === "confirmed" ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)", color: ev.status === "confirmed" ? "#10b981" : "#3b82f6" }}>
                  {ev.status?.toUpperCase()}
                </span>
                <button data-testid={`conv-edit-${i}`} onClick={() => openEdit(ev)} className="px-2 py-1 text-[10px] rounded border text-slate-300" style={{ borderColor: "rgba(255,255,255,0.12)" }}>Edit</button>
                <button data-testid={`conv-delete-${i}`} onClick={() => remove(ev.id, ev.name)} className="px-2 py-1 text-[10px] rounded border text-red-300" style={{ borderColor: "rgba(239,68,68,0.3)" }}>Delete</button>
              </div>
            </div>

            {ev.rooms_needed && ev.rooms_needed.length > 0 && (
              <div className="mb-2">
                <div className="text-[9px] font-mono text-purple-400 tracking-wider mb-1.5">ROOMS NEEDED</div>
                <div className="grid grid-cols-3 gap-2">
                  {ev.rooms_needed.map((room, ri: number) => (
                    <div key={ri} className="p-2 rounded border" style={{ background: "rgba(255,255,255,0.02)", borderColor: "rgba(255,255,255,0.04)" }}>
                      <div className="text-[11px] text-white">{room.room_id}</div>
                      <div className="text-[9px] font-mono text-slate-500">{room.capacity} cap · {room.setup_style}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {editor.mode && <EditorDrawer mode={editor.mode} draft={editor.draft}
        onChange={(next) => setEditor({ ...editor, draft: next })}
        onSave={save} onClose={() => setEditor({ mode: null, draft: EMPTY })} />}

      {importOpen && <ImportDrawer onClose={() => setImportOpen(false)} onImported={async (n) => {
        setFlash(`Imported ${n} event(s) as conventions`);
        await load();
        setImportOpen(false);
        setTimeout(() => setFlash(null), 3000);
      }} />}
    </div>
  );
}

function EditorDrawer({ mode, draft, onChange, onSave, onClose }: {
  mode: "new" | "edit"; draft: Convention;
  onChange: (d: Convention) => void; onSave: () => void; onClose: () => void;
}) {
  const set = (k: keyof Convention, v: any) => onChange({ ...draft, [k]: v });
  return (
    <CenterDialog
      open
      onClose={onClose}
      testId="conv-editor"
      maxWidth="40rem"
      title={mode === "new" ? "New convention" : "Edit convention"}
    >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" value={draft.name} onChange={(v) => set("name", v)} testid="conv-field-name" span />
          <Field label="Client" value={draft.client || ""} onChange={(v) => set("client", v)} testid="conv-field-client" span />
          <Field label="Start date" type="date" value={(draft.start_date || "").slice(0, 10)} onChange={(v) => set("start_date", v)} testid="conv-field-start" />
          <Field label="End date" type="date" value={(draft.end_date || "").slice(0, 10)} onChange={(v) => set("end_date", v)} testid="conv-field-end" />
          <Field label="Expected attendance" type="number" value={String(draft.expected_attendance || 0)} onChange={(v) => set("expected_attendance", Number(v))} testid="conv-field-attendance" />
          {mode === "edit" && (
            <div className="col-span-1">
              <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">Status</div>
              <select data-testid="conv-field-status" value={draft.status} onChange={(e) => set("status", e.target.value)} className="w-full px-2 py-1.5 rounded bg-slate-900 text-white text-sm border" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <option value="planning">planning</option>
                <option value="tentative">tentative</option>
                <option value="confirmed">confirmed</option>
                <option value="closed">closed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
          )}
          <div className="col-span-2">
            <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">Notes</div>
            <textarea data-testid="conv-field-notes" rows={3} value={draft.notes || ""} onChange={(e) => set("notes", e.target.value)}
              className="w-full px-2 py-1.5 rounded bg-slate-900 text-white text-sm border" style={{ borderColor: "rgba(255,255,255,0.1)" }} />
          </div>
        </div>
        <div className="text-[10px] text-slate-500 mt-3">Room bookings, breakouts, catering + AV can be refined in the Events tab or edited here via the BEO generator once linked.</div>
        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-[11px] font-mono text-slate-400 border" style={{ borderColor: "rgba(255,255,255,0.12)" }}>Cancel</button>
          <button data-testid="conv-save" onClick={onSave} className="px-3 py-1.5 rounded text-[11px] font-mono text-white" style={{ background: "linear-gradient(135deg,#a855f7,#3b82f6)" }}>Save</button>
        </div>
    </CenterDialog>
  );
}

function Field({ label, value, onChange, type = "text", testid, span }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; testid?: string; span?: boolean;
}) {
  return (
    <div className={span ? "col-span-2" : "col-span-1"}>
      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <input data-testid={testid} type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded bg-slate-900 text-white text-sm border"
        style={{ borderColor: "rgba(255,255,255,0.1)" }} />
    </div>
  );
}

function ImportDrawer({ onClose, onImported }: { onClose: () => void; onImported: (n: number) => Promise<void> }) {
  const [events, setEvents] = useState<ImportableEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [source, setSource] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API()}/api/conventions/importable-events`);
        if (!r.ok) return;
        const j = await r.json();
        setEvents(j.events || []);
        setSource(j.source_collection);
      } finally { setLoading(false); }
    })();
  }, []);

  const toggle = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelected(s);
  };

  async function doImport() {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const r = await fetch(`${API()}/api/conventions/import-from-events`, {
        method: "POST", headers: adminHeaders(),
        body: JSON.stringify({ event_ids: Array.from(selected) }),
      });
      if (r.ok) { const j = await r.json(); await onImported(j.created_count ?? 0); }
    } finally { setBusy(false); }
  }

  return (
    <CenterDialog
      open
      onClose={onClose}
      testId="conv-import-drawer"
      maxWidth="46rem"
      title="Import from Echo Events"
      subtitle={<>Source: {source || "—"} · only confirmed-ish stages (contract_signed / deposit_received / menu_selected / beo_issued)</>}
    >
        <div className="flex-1 overflow-y-auto space-y-2 max-h-[60vh]">
          {loading && <div className="text-center text-sm text-slate-600 py-12">Scanning events…</div>}
          {!loading && events.length === 0 && <div className="text-center text-sm text-slate-600 py-12">No importable events right now. Come back after you've signed a contract or issued a BEO in Echo Events.</div>}
          {events.map((e, i) => (
            <label key={e.id} data-testid={`conv-import-row-${i}`} className="flex items-start gap-3 p-3 rounded border cursor-pointer hover:bg-white/5"
              style={{ background: selected.has(e.id) ? "rgba(168,85,247,0.08)" : "transparent", borderColor: selected.has(e.id) ? "rgba(168,85,247,0.35)" : "rgba(255,255,255,0.06)" }}>
              <input type="checkbox" checked={selected.has(e.id)} onChange={() => toggle(e.id)} className="mt-1" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white">{e.name}</div>
                <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                  {(e.start_date || e.event_date || "?")} → {(e.end_date || e.event_date || "?")} · {(e.guaranteed_count || e.guest_count || 0)} guests
                  {e.client_name ? ` · ${e.client_name}` : ""}
                  {e.stage ? ` · ${e.stage}` : ""}
                </div>
              </div>
            </label>
          ))}
        </div>
        <div className="pt-3 mt-3 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="text-[10px] font-mono text-slate-500">{selected.size} selected</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded text-[11px] font-mono text-slate-400 border" style={{ borderColor: "rgba(255,255,255,0.12)" }}>Cancel</button>
            <button data-testid="conv-import-confirm" onClick={doImport} disabled={busy || selected.size === 0}
              className="px-3 py-1.5 rounded text-[11px] font-mono text-white disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#a855f7,#3b82f6)" }}>
              {busy ? "Importing…" : `Import ${selected.size}`}
            </button>
          </div>
        </div>
    </CenterDialog>
  );
}
