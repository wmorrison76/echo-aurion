import React, { useState, useEffect, useCallback } from "react";
import { Users, Plus, MousePointer2, Edit3, Clock, Eye, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const BACKEND = window.location.origin;
async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`${BACKEND}/api/collaboration${path}`, {
    headers: { "Content-Type": "application/json" }, ...opts,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type TabId = "sessions" | "live" | "history";
const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "sessions", label: "Sessions", icon: Users },
  { id: "live", label: "Live Room", icon: Eye },
  { id: "history", label: "Edit History", icon: Clock },
];

export default function LiveLayoutPanel() {
  const [tab, setTab] = useState<TabId>("sessions");
  const [activeSession, setActiveSession] = useState<string | null>(null);
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "#0a0e17" }} data-testid="live-layout-panel">
      <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="w-9 h-9 flex items-center justify-center rounded-lg" style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.15), rgba(59,130,246,0.15))", border: "1px solid rgba(168,85,247,0.25)" }}>
          <Users className="w-[18px] h-[18px] text-violet-400" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white tracking-wide">Live Layout Collaboration</div>
          <div className="text-[10px] font-mono text-slate-500 tracking-widest uppercase">Real-Time Editing & Cursor Sharing</div>
        </div>
      </div>
      <div className="flex border-b px-3 overflow-x-auto" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {TABS.map(t => (
          <button key={t.id} data-testid={`live-tab-${t.id}`} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-mono uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors"
            style={{ borderColor: tab === t.id ? "#a855f7" : "transparent", color: tab === t.id ? "#c4b5fd" : "#64748b" }}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        {tab === "sessions" && <SessionsTab onSelect={(id: string) => { setActiveSession(id); setTab("live"); }} />}
        {tab === "live" && <LiveTab sessionId={activeSession} />}
        {tab === "history" && <HistoryTab sessionId={activeSession} />}
      </div>
    </div>
  );
}

function SessionsTab({ onSelect }: { onSelect: (id: string) => void }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const load = useCallback(() => { api("/sessions").then(d => setSessions(d.sessions)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const createSession = async () => {
    setCreating(true);
    try {
      const result = await api("/sessions", { method: "POST", body: JSON.stringify({ name: `Layout Session ${sessions.length + 1}`, user_name: "Admin", room_name: "Grand Ballroom" }) });
      load();
      onSelect(result.session_id);
    } finally { setCreating(false); }
  };

  return (
    <div className="space-y-3" data-testid="live-sessions-tab">
      <button data-testid="create-session-btn" onClick={createSession} disabled={creating}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/20 text-violet-300 text-xs font-mono uppercase tracking-wider disabled:opacity-50">
        <Plus className="w-3.5 h-3.5" /> {creating ? "Creating..." : "New Layout Session"}
      </button>
      {sessions.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No active sessions. Create one to start collaborating.</div>}
      {sessions.map(s => (
        <div key={s.session_id} data-testid={`session-card-${s.session_id}`}
          className={cn("rounded-lg border p-3 cursor-pointer hover:border-violet-500/30 transition-colors",
            s.status === "active" ? "border-violet-500/20 bg-violet-500/5" : "border-slate-700/30 bg-slate-800/40 opacity-60"
          )} onClick={() => onSelect(s.session_id)}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white">{s.name}</span>
            <span className={cn("text-[9px] px-1.5 py-0.5 rounded font-mono", s.status === "active" ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-700/40 text-slate-500")}>{s.status}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {s.participants?.length || 0}</span>
            <span className="flex items-center gap-1"><Edit3 className="w-3 h-3" /> {s.edit_count || 0} edits</span>
          </div>
          {s.participants && (
            <div className="flex -space-x-1.5 mt-2">
              {s.participants.map((p: any) => (
                <div key={p.user_id} className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-[#0a0e17]" style={{ background: p.color }} title={p.name}>
                  {p.name?.[0]?.toUpperCase() || "?"}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LiveTab({ sessionId }: { sessionId: string | null }) {
  const [session, setSession] = useState<any>(null);
  useEffect(() => {
    if (!sessionId) return;
    const load = () => api(`/sessions/${sessionId}`).then(setSession).catch(() => {});
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [sessionId]);

  const sendEdit = async (action: string, elementType: string) => {
    if (!sessionId || !session) return;
    const participant = session.participants?.[0];
    await api(`/sessions/${sessionId}/edit`, {
      method: "POST",
      body: JSON.stringify({ user_id: participant?.user_id, user_name: participant?.name || "Admin", action, element_type: elementType, element_id: `el-${Date.now()}`, changes: { action } }),
    });
  };

  if (!sessionId) return <div className="text-xs text-slate-500 text-center py-8">Select or create a session first.</div>;
  if (!session) return <Loading />;

  return (
    <div className="space-y-4" data-testid="live-live-tab">
      <div className="bg-slate-800/30 rounded-lg border border-violet-500/15 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-white">{session.name}</span>
          <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-mono animate-pulse">LIVE</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          {session.participants?.map((p: any) => (
            <div key={p.user_id} className="flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ background: `${p.color}15`, border: `1px solid ${p.color}30` }}>
              <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              <span className="text-[10px] font-mono" style={{ color: p.color }}>{p.name}</span>
            </div>
          ))}
        </div>
        <div className="relative bg-slate-900/60 rounded-lg border border-slate-700/30 h-56 overflow-hidden">
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-6 gap-px opacity-10">
            {Array.from({ length: 48 }).map((_, i) => <div key={i} className="bg-slate-500" />)}
          </div>
          {session.participants?.map((p: any, i: number) => (
            <div key={p.user_id} className="absolute flex items-start gap-1 transition-all duration-300" style={{ left: `${15 + i * 25}%`, top: `${20 + i * 15}%` }}>
              <MousePointer2 className="w-4 h-4" style={{ color: p.color }} />
              <span className="text-[8px] px-1 py-0.5 rounded" style={{ background: p.color, color: "white" }}>{p.name}</span>
            </div>
          ))}
          <div className="absolute bottom-2 left-2 text-[9px] text-slate-500 font-mono">{session.edit_count || 0} edits</div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[{ action: "add", type: "table", label: "Add Table" }, { action: "move", type: "chair", label: "Move Chair" }, { action: "resize", type: "stage", label: "Resize Stage" }, { action: "add", type: "bar", label: "Add Bar" }].map(a => (
          <button key={a.label} onClick={() => sendEdit(a.action, a.type)}
            className="text-[10px] px-3 py-2 rounded-lg bg-slate-800/40 hover:bg-violet-500/10 border border-slate-700/30 hover:border-violet-500/20 text-slate-300 font-mono transition-colors">
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function HistoryTab({ sessionId }: { sessionId: string | null }) {
  const [edits, setEdits] = useState<any[]>([]);
  useEffect(() => {
    if (!sessionId) return;
    api(`/sessions/${sessionId}/edits`).then(d => setEdits(d.edits)).catch(() => {});
  }, [sessionId]);
  if (!sessionId) return <div className="text-xs text-slate-500 text-center py-8">Select a session to view edit history.</div>;
  return (
    <div className="space-y-2" data-testid="live-history-tab">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{edits.length} Edits</span>
      {edits.length === 0 && <div className="text-xs text-slate-500 text-center py-8">No edits yet.</div>}
      {edits.map(e => (
        <div key={e.edit_id} className="flex items-center gap-3 bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/20">
          <Edit3 className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-xs text-white">{e.user_name}</span>
            <span className="text-[10px] text-slate-400 ml-2">{e.action} {e.element_type}</span>
          </div>
          <span className="text-[9px] text-slate-500 font-mono">{new Date(e.created_at).toLocaleTimeString()}</span>
        </div>
      ))}
    </div>
  );
}

function Loading() { return <div className="flex justify-center py-12"><RefreshCw className="w-5 h-5 text-slate-500 animate-spin" /></div>; }
