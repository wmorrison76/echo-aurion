import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Mic, Send, ChevronRight, Database, Shield, AlertTriangle,
  TrendingUp, Layers, Activity, FileText, BarChart3, Users, Package,
  UtensilsCrossed, Wine, Briefcase, Settings, Zap, Target,
  Plus, Trash2, Copy, Check, ChevronDown, Radio, Cpu, CircuitBoard,
  Fingerprint, Eye, Network, Terminal, Command, Search, PenLine,
  Globe, Lock, Box, Gauge, LayoutGrid, ChevronLeft
} from "lucide-react";
import ReactMarkdown from "react-markdown";

const API = window.location.origin;

/* ─── Design Tokens ─── */
const BG = "#04060d";
const SURFACE = "#0a0d17";
const SURFACE_EL = "#121624";
const GOLD = "#c8a97e";
const GOLD_M = "rgba(200,169,126,0.2)";
const GOLD_G = "rgba(200,169,126,0.4)";
const GREEN = "#34d399";
const RED = "#ef4444";
const AMBER = "#fbbf24";
const BORDER = "rgba(200,169,126,0.15)";
const BORDER_F = "rgba(200,169,126,0.5)";
const TXT = "#ffffff";
const TXT2 = "#a1a1aa";
const TXT3 = "#71717a";
const MONO: React.CSSProperties = { fontFamily: "'IBM Plex Mono', 'JetBrains Mono', monospace" };

/* ─── Types ─── */
interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: string;
  intent?: any;
  confidence?: number;
  completeness?: number;
  sources?: string[];
  rules?: any[];
  trace_id?: string;
}

interface Session {
  session_id: string;
  created_at: string;
  updated_at: string;
  turn_count: number;
  domains_discussed: string[];
  preview: string;
  message_count?: number;
}

/* ─── Constants ─── */
const DOMAIN_ICON: Record<string, any> = {
  finance: BarChart3, events: Users, inventory: Package, labor: Briefcase,
  culinary: UtensilsCrossed, vendor: FileText, guest: Users, beverage: Wine,
  operations: Settings,
};
const DOMAIN_COLOR: Record<string, string> = {
  finance: "#34d399", events: "#a78bfa", inventory: "#fbbf24", labor: "#60a5fa",
  culinary: "#f87171", vendor: "#22d3ee", guest: "#f472b6", beverage: "#c084fc",
  operations: "#94a3b8",
};
const INTENTS = [
  { icon: BarChart3, q: "What is our current EBITDA margin and food cost breakdown?", domain: "finance" },
  { icon: Users, q: "Show me upcoming events and their operational impact", domain: "events" },
  { icon: Package, q: "Which inventory items are below par level right now?", domain: "inventory" },
  { icon: Zap, q: "What if we add 200 covers to Saturday's banquet?", domain: "culinary" },
  { icon: TrendingUp, q: "Top 3 revenue opportunities this month", domain: "finance" },
  { icon: AlertTriangle, q: "Surface any operational risks I should address today", domain: "operations" },
];

/* ─── Helpers ─── */
function groupSessionsByDate(sessions: Session[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const week = new Date(today); week.setDate(today.getDate() - 7);
  const month = new Date(today); month.setDate(today.getDate() - 30);

  const groups: { label: string; sessions: Session[] }[] = [
    { label: "Today", sessions: [] },
    { label: "Yesterday", sessions: [] },
    { label: "Previous 7 Days", sessions: [] },
    { label: "Previous 30 Days", sessions: [] },
    { label: "Older", sessions: [] },
  ];

  for (const s of sessions) {
    const d = new Date(s.updated_at || s.created_at);
    if (d >= today) groups[0].sessions.push(s);
    else if (d >= yesterday) groups[1].sessions.push(s);
    else if (d >= week) groups[2].sessions.push(s);
    else if (d >= month) groups[3].sessions.push(s);
    else groups[4].sessions.push(s);
  }
  return groups.filter(g => g.sessions.length > 0);
}

/* ─── VoiceOrb Component ─── */
function VoiceOrb({ listening, amplitude }: { listening: boolean; amplitude: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 36, height: 36 }}>
      {listening && (
        <>
          <motion.div className="absolute inset-0 rounded-full"
            style={{ border: `1px solid ${GOLD}`, opacity: 0.15 }}
            animate={{ scale: [1, 1.6 + amplitude * 0.4], opacity: [0.15, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }} />
          <motion.div className="absolute inset-0 rounded-full"
            style={{ border: `1px solid ${GOLD}`, opacity: 0.1 }}
            animate={{ scale: [1, 1.3 + amplitude * 0.3], opacity: [0.1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }} />
        </>
      )}
      <motion.div className="relative rounded-full flex items-center justify-center cursor-pointer"
        style={{
          width: 30, height: 30,
          background: listening ? `radial-gradient(circle, ${GOLD_G}, ${GOLD_M})` : `radial-gradient(circle, rgba(200,169,126,0.08), rgba(200,169,126,0.02))`,
          border: `1px solid ${listening ? GOLD : BORDER}`,
          boxShadow: listening ? `0 0 20px ${GOLD_M}, 0 0 40px rgba(200,169,126,0.1)` : "none",
        }}
        animate={listening ? { scale: [1, 1.05 + amplitude * 0.05, 1] } : {}}
        transition={{ duration: 0.3 }}>
        {listening ? <Radio className="w-3.5 h-3.5" style={{ color: GOLD }} /> : <Mic className="w-3 h-3" style={{ color: TXT3 }} />}
      </motion.div>
    </div>
  );
}

/* ─── Intelligence Briefing Card ─── */
function BriefingCard({ msg, onCalibrate }: { msg: Msg; onCalibrate: (id: string, v: number) => void }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleCopy = () => { navigator.clipboard.writeText(msg.content); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const DI = DOMAIN_ICON[msg.intent?.primary_domain] || Layers;
  const dc = DOMAIN_COLOR[msg.intent?.primary_domain] || "#94a3b8";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="rounded-sm overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
      data-testid={`briefing-${msg.id}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="w-6 h-6 rounded-sm flex items-center justify-center" style={{ background: `${dc}15`, border: `1px solid ${dc}30` }}>
          <DI className="w-3 h-3" style={{ color: dc }} />
        </div>
        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ ...MONO, color: dc }}>
          {msg.intent?.primary_domain || "intelligence"}
        </span>
        {msg.intent?.intent_type && (
          <span className="text-[9px] uppercase tracking-[0.15em] px-2 py-0.5" style={{ ...MONO, color: TXT3, background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.04)` }}>
            {msg.intent.intent_type}
          </span>
        )}
        <div className="flex-1" />
        {msg.confidence != null && (
          <div className="flex items-center gap-1.5 px-2 py-0.5" style={{ background: `${msg.confidence >= 80 ? GREEN : msg.confidence >= 60 ? AMBER : RED}08`, border: `1px solid ${msg.confidence >= 80 ? GREEN : msg.confidence >= 60 ? AMBER : RED}20` }}>
            <Target className="w-2.5 h-2.5" style={{ color: msg.confidence >= 80 ? GREEN : msg.confidence >= 60 ? AMBER : RED }} />
            <span className="text-[9px] font-semibold" style={{ ...MONO, color: msg.confidence >= 80 ? GREEN : msg.confidence >= 60 ? AMBER : RED }}>{msg.confidence}%</span>
          </div>
        )}
        {msg.completeness != null && (
          <div className="flex items-center gap-1.5 px-2 py-0.5" style={{ background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.12)" }}>
            <Database className="w-2.5 h-2.5" style={{ color: "#60a5fa" }} />
            <span className="text-[9px]" style={{ ...MONO, color: "#60a5fa" }}>{msg.completeness}%</span>
          </div>
        )}
        <button onClick={() => setExpanded(!expanded)} className="p-0.5" data-testid="toggle-briefing">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? "" : "-rotate-90"}`} style={{ color: TXT3 }} />
        </button>
      </div>
      {/* Body */}
      {expanded && (
        <div className="px-5 py-4">
          <div className="prose prose-invert prose-sm max-w-none text-[12.5px] leading-[1.75]" style={{ color: "rgba(255,255,255,0.88)" }}>
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
          {/* Domain Rule Alerts */}
          {msg.rules && msg.rules.length > 0 && (
            <div className="mt-3 space-y-1">
              {msg.rules.map((r: any, i: number) => (
                <div key={i} className="flex items-start gap-2 px-3 py-2" style={{
                  background: r.severity === "high" ? "rgba(239,68,68,0.04)" : "rgba(251,191,36,0.04)",
                  border: `1px solid ${r.severity === "high" ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.12)"}`,
                }}>
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" style={{ color: r.severity === "high" ? RED : AMBER }} />
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ ...MONO, color: r.severity === "high" ? RED : AMBER }}>{r.rule}</span>
                    <p className="text-[10px] mt-0.5" style={{ color: TXT2 }}>{r.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Source + Actions */}
          <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: `1px solid rgba(255,255,255,0.03)` }}>
            {msg.sources && msg.sources.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap flex-1">
                <Database className="w-2.5 h-2.5 shrink-0" style={{ color: TXT3 }} />
                {msg.sources.map((s) => (
                  <span key={s} className="text-[8px] px-1.5 py-0.5" style={{ ...MONO, color: TXT3, background: "rgba(255,255,255,0.02)", border: `1px solid rgba(255,255,255,0.04)` }}>
                    {s.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <button onClick={handleCopy} className="p-1 hover:bg-white/5 transition-colors" title="Copy" data-testid="copy-btn">
                {copied ? <Check className="w-3 h-3" style={{ color: GREEN }} /> : <Copy className="w-3 h-3" style={{ color: TXT3 }} />}
              </button>
              <button onClick={() => onCalibrate(msg.id, 5)} className="text-[8px] px-2 py-0.5 uppercase tracking-wider hover:bg-white/5 transition-colors"
                style={{ ...MONO, color: TXT3, border: `1px solid rgba(255,255,255,0.04)` }} data-testid="acknowledge-btn">Acknowledge</button>
              <button onClick={() => onCalibrate(msg.id, 1)} className="text-[8px] px-2 py-0.5 uppercase tracking-wider hover:bg-white/5 transition-colors"
                style={{ ...MONO, color: TXT3, border: `1px solid rgba(255,255,255,0.04)` }} data-testid="flag-btn">Flag</button>
            </div>
            {msg.trace_id && (
              <div className="flex items-center gap-1" data-testid="trace-badge">
                <Fingerprint className="w-2.5 h-2.5" style={{ color: TXT3 }} />
                <span className="text-[7px]" style={{ ...MONO, color: TXT3 }}>{msg.trace_id.slice(0, 10)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Processing Indicator ─── */
function ProcessingState() {
  const steps = ["CLASSIFYING INTENT", "RETRIEVING DATA", "DOMAIN REASONING", "SYNTHESIZING"];
  const [step, setStep] = useState(0);
  useEffect(() => { const t = setInterval(() => setStep(s => (s + 1) % steps.length), 800); return () => clearInterval(t); }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 px-4 py-3"
      style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="processing-state">
      <motion.div className="w-2 h-2 rounded-full" style={{ background: GOLD }}
        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }} transition={{ duration: 0.8, repeat: Infinity }} />
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <span key={i} className="text-[8px] uppercase tracking-[0.2em] px-2 py-0.5 transition-all" style={{
            ...MONO,
            color: i === step ? GOLD : i < step ? GREEN : TXT3,
            background: i === step ? GOLD_M : "transparent",
            border: i === step ? `1px solid ${BORDER_F}` : `1px solid transparent`,
          }}>{i < step ? "\u2713" : ""} {s}</span>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Session Item in Sidebar ─── */
function SessionItem({ session, isActive, onSelect, onDelete }: {
  session: Session; isActive: boolean; onSelect: () => void; onDelete: () => void;
}) {
  const domainColors = (session.domains_discussed || []).map(d => DOMAIN_COLOR[d] || "#64748b");

  return (
    <div className={`group flex items-start gap-2 px-3 py-2 cursor-pointer transition-all rounded-sm mx-1`}
      style={{
        background: isActive ? GOLD_M : "transparent",
        borderLeft: isActive ? `2px solid ${GOLD}` : "2px solid transparent",
      }}
      onClick={onSelect}
      data-testid={`session-${session.session_id}`}>
      <Terminal className="w-3 h-3 mt-1 shrink-0" style={{ color: isActive ? GOLD : TXT3 }} />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] truncate leading-snug" style={{ color: isActive ? TXT : TXT2 }}>{session.preview}</div>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-[8px]" style={{ ...MONO, color: TXT3 }}>{session.turn_count || 0}T</span>
          {domainColors.slice(0, 4).map((c, i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
          ))}
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/5 transition-all mt-0.5"
        data-testid={`delete-session-${session.session_id}`}>
        <Trash2 className="w-3 h-3" style={{ color: TXT3 }} />
      </button>
    </div>
  );
}

/* ─── ChatGPT-Style Sidebar ─── */
function CanvasSidebar({ sessions, activeSessionId, onNewSession, onSelectSession, onDeleteSession, health, collapsed, onToggle }: {
  sessions: Session[]; activeSessionId: string | null; onNewSession: () => void;
  onSelectSession: (sid: string) => void; onDeleteSession: (sid: string) => void;
  health: any; collapsed: boolean; onToggle: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = searchQuery
    ? sessions.filter(s => s.preview?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.domains_discussed?.some(d => d.includes(searchQuery.toLowerCase())))
    : sessions;

  const groups = groupSessionsByDate(filtered);

  if (collapsed) {
    return (
      <div className="w-12 flex flex-col items-center py-3 shrink-0" style={{ borderRight: `1px solid ${BORDER}`, background: "rgba(0,0,0,0.4)" }}
        data-testid="sidebar-collapsed">
        <button onClick={onToggle} className="p-1.5 hover:bg-white/5 rounded-sm transition-colors mb-3" data-testid="expand-sidebar">
          <ChevronRight className="w-4 h-4" style={{ color: TXT3 }} />
        </button>
        <button onClick={onNewSession} className="p-1.5 hover:bg-white/5 rounded-sm transition-colors mb-2" data-testid="new-session-mini">
          <Plus className="w-4 h-4" style={{ color: GOLD }} />
        </button>
        {/* Vertical domain indicators */}
        <div className="flex flex-col items-center gap-1 mt-2">
          {sessions.slice(0, 8).map((s, i) => {
            const topDomain = s.domains_discussed?.[0];
            return (
              <div key={i} className="w-2 h-2 rounded-full cursor-pointer transition-all hover:scale-150"
                style={{ background: topDomain ? (DOMAIN_COLOR[topDomain] || "#64748b") + "80" : "rgba(255,255,255,0.1)" }}
                onClick={() => onSelectSession(s.session_id)}
                title={s.preview?.slice(0, 40)} />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 flex flex-col shrink-0" style={{ borderRight: `1px solid ${BORDER}`, background: "rgba(0,0,0,0.3)" }}
      data-testid="session-sidebar">

      {/* Sidebar Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <button onClick={onToggle} className="p-1 hover:bg-white/5 rounded-sm transition-colors" data-testid="collapse-sidebar">
          <ChevronLeft className="w-3.5 h-3.5" style={{ color: TXT3 }} />
        </button>
        <span className="text-[10px] uppercase tracking-[0.2em] flex-1" style={{ ...MONO, color: TXT3 }}>Intelligence Log</span>
      </div>

      {/* New Session Button */}
      <button onClick={onNewSession}
        className="flex items-center gap-2 mx-2 mb-2 px-3 py-2 transition-all hover:brightness-125 rounded-sm"
        style={{ background: GOLD_M, color: GOLD, border: `1px solid ${BORDER}` }}
        data-testid="new-session-btn">
        <Plus className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-[0.15em]" style={MONO}>New Session</span>
      </button>

      {/* Search */}
      <div className="mx-2 mb-2 relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: TXT3 }} />
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search sessions..."
          className="w-full bg-transparent pl-7 pr-2 py-1.5 text-[10px] outline-none rounded-sm"
          style={{ color: TXT2, border: `1px solid ${BORDER}`, ...MONO }}
          data-testid="session-search" />
      </div>

      {/* System Status */}
      {health && (
        <div className="mx-2 mb-2 px-3 py-2 rounded-sm" style={{ background: "rgba(52,211,153,0.03)", border: `1px solid rgba(52,211,153,0.1)` }}>
          <div className="flex items-center gap-1.5 mb-1">
            <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: GREEN }}
              animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
            <span className="text-[9px] uppercase tracking-[0.2em]" style={{ ...MONO, color: GREEN }}>Operational</span>
          </div>
          <div className="text-[8px] space-y-0.5" style={{ ...MONO, color: TXT3 }}>
            <div>{health.domains?.length || 0} domains active</div>
            <div>TraceLedger: hash-chained</div>
            <div>Layers 1-5: nominal</div>
          </div>
        </div>
      )}

      {/* Session Groups (ChatGPT-style) */}
      <div className="flex-1 overflow-y-auto space-y-1 pb-2" style={{ scrollbarWidth: "thin", scrollbarColor: `${BORDER} transparent` }}
        data-testid="session-list">
        {groups.length === 0 && !searchQuery && (
          <div className="px-3 py-4 text-center">
            <Terminal className="w-6 h-6 mx-auto mb-2" style={{ color: TXT3, opacity: 0.3 }} />
            <p className="text-[10px]" style={{ ...MONO, color: TXT3 }}>No sessions yet</p>
            <p className="text-[8px] mt-0.5" style={{ color: TXT3 }}>Start a new intelligence query</p>
          </div>
        )}
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-3 pt-2 pb-1">
              <span className="text-[8px] uppercase tracking-[0.25em] font-semibold" style={{ ...MONO, color: TXT3 }}>{group.label}</span>
            </div>
            {group.sessions.map(s => (
              <SessionItem key={s.session_id} session={s} isActive={activeSessionId === s.session_id}
                onSelect={() => onSelectSession(s.session_id)} onDelete={() => onDeleteSession(s.session_id)} />
            ))}
          </div>
        ))}
        {searchQuery && groups.length === 0 && (
          <div className="px-3 py-4 text-center">
            <p className="text-[10px]" style={{ ...MONO, color: TXT3 }}>No matching sessions</p>
          </div>
        )}
      </div>

      {/* Subsystem Status Footer */}
      <div className="px-2 py-2 space-y-1" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="text-[7px] uppercase tracking-[0.25em] px-1 mb-1" style={{ ...MONO, color: TXT3 }}>Subsystems</div>
        <div className="grid grid-cols-3 gap-1">
          {[
            { icon: Globe, label: "Collective", color: "#22d3ee" },
            { icon: Gauge, label: "Simulation", color: "#a78bfa" },
            { icon: Box, label: "Twin", color: "#fbbf24" },
            { icon: Lock, label: "Governance", color: "#f87171" },
            { icon: Activity, label: "Adaptive", color: "#34d399" },
            { icon: LayoutGrid, label: "Ripple", color: "#f472b6" },
          ].map((sub) => (
            <div key={sub.label} className="flex items-center gap-1 px-1.5 py-1 rounded-sm" style={{ background: `${sub.color}08`, border: `1px solid ${sub.color}15` }}>
              <sub.icon className="w-2.5 h-2.5" style={{ color: sub.color, opacity: 0.7 }} />
              <span className="text-[7px] truncate" style={{ ...MONO, color: sub.color, opacity: 0.8 }}>{sub.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State (Sentient Core) ─── */
function EmptyState({ heartbeat, onSend }: { heartbeat: any; onSend: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-3xl mx-auto px-4">
      {/* Sentient Core */}
      <div className="relative mb-5">
        <motion.div className="w-20 h-20 rounded-sm flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${SURFACE}, ${SURFACE_EL})`, border: `1px solid ${BORDER}` }}
          animate={{ boxShadow: [`0 0 0px ${GOLD_M}`, `0 0 30px ${GOLD_M}`, `0 0 0px ${GOLD_M}`] }}
          transition={{ duration: 4, repeat: Infinity }}>
          <CircuitBoard className="w-9 h-9" style={{ color: GOLD, opacity: 0.7 }} />
        </motion.div>
        <motion.div className="absolute -inset-3 rounded-sm"
          style={{ border: `1px solid ${GOLD}`, opacity: 0.08 }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.08, 0.02, 0.08] }}
          transition={{ duration: 4, repeat: Infinity }} />
      </div>

      <h2 className="text-xl font-light tracking-tight mb-0.5" style={{ color: TXT }}>
        EchoAi<sup className="text-[10px]" style={{ color: GOLD }}>3</sup>
      </h2>
      <p className="text-[9px] uppercase tracking-[0.3em] mb-4" style={{ ...MONO, color: GOLD }}>
        Synthetic Operational Intelligence
      </p>

      {/* Operational Heartbeat */}
      {heartbeat && (
        <div className="w-full max-w-2xl mb-5" data-testid="heartbeat-panel">
          <div className="flex items-center gap-2 mb-2">
            <motion.div className="w-2 h-2 rounded-full"
              style={{ background: heartbeat.pulse === "nominal" ? GREEN : heartbeat.pulse === "attention" ? AMBER : RED }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }} />
            <span className="text-[8px] uppercase tracking-[0.25em]" style={{
              ...MONO,
              color: heartbeat.pulse === "nominal" ? GREEN : heartbeat.pulse === "attention" ? AMBER : RED,
            }}>
              Operational Pulse: {heartbeat.pulse}
            </span>
            <span className="text-[7px] ml-auto" style={{ ...MONO, color: TXT3 }}>
              {heartbeat.outlet_count} outlets | {heartbeat.active_events} active events
            </span>
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {[
              { label: "EBITDA", value: `${heartbeat.vitals.ebitda_margin_pct}%`, color: heartbeat.vitals.ebitda_margin_pct > 15 ? GREEN : RED, sub: `$${(heartbeat.vitals.ebitda/1000).toFixed(0)}K` },
              { label: "Food Cost", value: `${heartbeat.vitals.food_cost_pct}%`, color: heartbeat.vitals.food_cost_pct < 22 ? GREEN : RED, sub: "of revenue" },
              { label: "Labor", value: `${heartbeat.vitals.labor_pct}%`, color: heartbeat.vitals.labor_pct < 32 ? GREEN : AMBER, sub: "of revenue" },
              { label: "Covers", value: heartbeat.vitals.total_covers.toLocaleString(), color: "#60a5fa", sub: `${heartbeat.vitals.event_pipeline} pipeline` },
              { label: "Inv Health", value: `${heartbeat.vitals.inventory_health}%`, color: heartbeat.vitals.inventory_health > 50 ? GREEN : RED, sub: `${heartbeat.vitals.items_below_par} below par` },
              { label: "Revenue", value: `$${(heartbeat.vitals.revenue/1000).toFixed(0)}K`, color: GOLD, sub: "total" },
            ].map((v, i) => (
              <div key={i} className="px-2.5 py-2 text-center" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                <div className="text-[7px] uppercase tracking-[0.2em] mb-1" style={{ ...MONO, color: TXT3 }}>{v.label}</div>
                <motion.div className="text-[15px] font-semibold" style={{ ...MONO, color: v.color }}
                  animate={{ opacity: [0.85, 1, 0.85] }}
                  transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}>
                  {v.value}
                </motion.div>
                <div className="text-[7px] mt-0.5" style={{ ...MONO, color: TXT3 }}>{v.sub}</div>
              </div>
            ))}
          </div>

          {heartbeat.signals?.length > 0 && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {heartbeat.signals.map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-1 px-2 py-0.5" style={{
                  background: s.severity === "high" ? "rgba(239,68,68,0.05)" : "rgba(251,191,36,0.05)",
                  border: `1px solid ${s.severity === "high" ? "rgba(239,68,68,0.12)" : "rgba(251,191,36,0.12)"}`,
                }}>
                  <AlertTriangle className="w-2.5 h-2.5" style={{ color: s.severity === "high" ? RED : AMBER }} />
                  <span className="text-[7px] uppercase tracking-wider" style={{ ...MONO, color: s.severity === "high" ? RED : AMBER }}>
                    {s.signal.replace(/_/g, " ")}{s.count != null && `: ${s.count}`}{s.value != null && `: ${s.value}%`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Predictive Intents Grid */}
      <div className="grid grid-cols-3 gap-1.5 w-full max-w-2xl" data-testid="starter-prompts">
        {INTENTS.map((p, i) => {
          const Icon = p.icon;
          const c = DOMAIN_COLOR[p.domain] || "#94a3b8";
          return (
            <motion.button key={i} onClick={() => onSend(p.q)}
              className="flex items-start gap-2.5 px-3 py-2.5 text-left transition-all group"
              style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
              whileHover={{ borderColor: GOLD }}
              data-testid={`starter-${i}`}>
              <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 transition-colors" style={{ color: c }} />
              <span className="text-[10px] leading-relaxed" style={{ color: TXT2 }}>{p.q}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Layer Status */}
      <div className="flex items-center gap-4 mt-5 flex-wrap justify-center">
        {[
          { icon: Cpu, label: "Model Intelligence" },
          { icon: Network, label: "Domain Reasoning" },
          { icon: CircuitBoard, label: "Decision Orchestrator" },
          { icon: Eye, label: "Simulation Engine" },
          { icon: Activity, label: "Adaptive Learning" },
        ].map((l, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <l.icon className="w-3 h-3" style={{ color: GOLD, opacity: 0.3 }} />
            <span className="text-[7px] uppercase tracking-[0.2em]" style={{ ...MONO, color: TXT3 }}>L{i + 1} {l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Canvas ─── */
export default function EchoAi3Canvas() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const [listening, setListening] = useState(false);
  const [amplitude, setAmplitude] = useState(0);
  const [heartbeat, setHeartbeat] = useState<any>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const scroll = useCallback(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), []);
  useEffect(() => { scroll(); }, [msgs, scroll]);

  const refreshSessions = useCallback(() => {
    fetch(`${API}/api/echoai3/sessions?user_id=owner-001`).then(r => r.json()).then(d => setSessions(d.sessions || [])).catch(() => {});
  }, []);

  useEffect(() => {
    refreshSessions();
    fetch(`${API}/api/echoai3/health`).then(r => r.json()).then(setHealth).catch(() => {});
    fetch(`${API}/api/echoai3/heartbeat`).then(r => r.json()).then(setHeartbeat).catch(() => {});
    const hbInterval = setInterval(() => {
      fetch(`${API}/api/echoai3/heartbeat`).then(r => r.json()).then(setHeartbeat).catch(() => {});
    }, 30000);
    return () => clearInterval(hbInterval);
  }, [refreshSessions]);

  const loadSession = async (sid: string) => {
    try {
      const r = await fetch(`${API}/api/echoai3/session/${sid}`).then(r => r.json());
      if (r.messages) {
        setSessionId(sid);
        setMsgs(r.messages.map((m: any, i: number) => ({
          id: m.id || `h-${i}`, role: m.role === "user" ? "user" : "assistant",
          content: m.content, ts: m.timestamp || new Date().toISOString(),
          intent: m.intent, confidence: m.confidence, completeness: m.data_completeness,
          sources: m.data_sources, rules: m.rules_triggered, trace_id: m.trace_id,
        })));
      }
    } catch { /* noop */ }
  };

  const startNew = () => { setSessionId(null); setMsgs([]); inputRef.current?.focus(); };

  const deleteSession = async (sid: string) => {
    await fetch(`${API}/api/echoai3/session/${sid}`, { method: "DELETE" }).catch(() => {});
    setSessions(p => p.filter(s => s.session_id !== sid));
    if (sessionId === sid) startNew();
  };

  const send = async (text?: string) => {
    const q = text || input.trim();
    if (!q || loading) return;

    const uMsg: Msg = { id: `u-${Date.now()}`, role: "user", content: q, ts: new Date().toISOString() };
    setMsgs(p => [...p, uMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/echoai3/think`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, session_id: sessionId, user_id: "owner-001" }),
      }).then(r => r.json());

      if (!sessionId && res.session_id) setSessionId(res.session_id);

      const aMsg: Msg = {
        id: res.message_id || `a-${Date.now()}`, role: "assistant",
        content: res.response, ts: res.timestamp,
        intent: res.intent, confidence: res.confidence,
        completeness: res.data_completeness, sources: res.data_sources,
        rules: res.rules_triggered, trace_id: res.trace_id,
      };
      setMsgs(p => [...p, aMsg]);
      refreshSessions();
    } catch {
      setMsgs(p => [...p, { id: `e-${Date.now()}`, role: "assistant", content: "Signal lost. Reconnecting to operational data streams.", ts: new Date().toISOString() }]);
    }
    setLoading(false);
  };

  const calibrate = async (mid: string, rating: number) => {
    if (!sessionId) return;
    await fetch(`${API}/api/echoai3/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message_id: mid, session_id: sessionId, rating }),
    }).catch(() => {});
  };

  /* Voice */
  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const monitor = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
        setAmplitude(avg);
        animFrameRef.current = requestAnimationFrame(monitor);
      };
      monitor();

      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        cancelAnimationFrame(animFrameRef.current);
        analyserRef.current = null;
        setAmplitude(0);
        stream.getTracks().forEach(t => t.stop());
        audioCtx.close();

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const form = new FormData();
        form.append("file", blob, "voice.webm");

        try {
          const res = await fetch(`${API}/api/echoai3/voice/transcribe`, { method: "POST", body: form }).then(r => r.json());
          if (res.success && res.text) {
            setInput(res.text);
            setTimeout(() => send(res.text), 100);
          }
        } catch { /* silent */ }
      };
      recorder.start();
      mediaRef.current = recorder;
      setListening(true);
    } catch { /* mic permission denied */ }
  };

  const stopListening = () => {
    if (mediaRef.current && mediaRef.current.state === "recording") mediaRef.current.stop();
    setListening(false);
  };

  const toggleVoice = () => { if (listening) stopListening(); else startListening(); };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div className="flex h-full overflow-hidden" style={{ background: BG, color: TXT }} data-testid="echoai3-canvas">
      {/* ChatGPT-Style Sidebar */}
      <CanvasSidebar
        sessions={sessions}
        activeSessionId={sessionId}
        onNewSession={startNew}
        onSelectSession={loadSession}
        onDeleteSession={deleteSession}
        health={health}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-4 py-2 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-2">
            <motion.div className="w-7 h-7 rounded-sm flex items-center justify-center"
              style={{ background: GOLD_M, border: `1px solid ${BORDER}` }}
              animate={{ boxShadow: [`0 0 0px ${GOLD_M}`, `0 0 12px ${GOLD_M}`, `0 0 0px ${GOLD_M}`] }}
              transition={{ duration: 3, repeat: Infinity }}>
              <Brain className="w-4 h-4" style={{ color: GOLD }} />
            </motion.div>
            <div>
              <div className="text-[12px] font-semibold tracking-tight" style={{ color: TXT }}>
                EchoAi<sup className="text-[7px]" style={{ color: GOLD }}>3</sup>
              </div>
              <div className="text-[8px] uppercase tracking-[0.2em]" style={{ ...MONO, color: TXT3 }}>
                Synthetic Intelligence Layer
              </div>
            </div>
          </div>

          <div className="flex-1" />

          {/* Domain Indicators */}
          <div className="flex items-center gap-1 mr-2">
            {Object.entries(DOMAIN_COLOR).map(([d, c]) => (
              <div key={d} className="w-4 h-1 rounded-full" style={{ background: `${c}40` }}
                title={d.charAt(0).toUpperCase() + d.slice(1)} />
            ))}
          </div>

          <div className="flex items-center gap-1.5 px-2 py-1" style={{ background: "rgba(52,211,153,0.04)", border: `1px solid rgba(52,211,153,0.1)` }}>
            <Shield className="w-3 h-3" style={{ color: GREEN }} />
            <span className="text-[8px] uppercase tracking-[0.15em]" style={{ ...MONO, color: GREEN }}>TraceLedger</span>
          </div>
        </div>

        {/* Intelligence Feed */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3" style={{ scrollbarWidth: "thin", scrollbarColor: `${BORDER} transparent` }}
          data-testid="intelligence-feed">
          {msgs.length === 0 ? (
            <EmptyState heartbeat={heartbeat} onSend={send} />
          ) : (
            <>
              {msgs.map((m) => (
                m.role === "user" ? (
                  <motion.div key={m.id} className="flex items-center gap-3 px-4 py-2.5"
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                    style={{ background: GOLD_M, borderLeft: `2px solid ${GOLD}` }}
                    data-testid={`query-${m.id}`}>
                    <Command className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD }} />
                    <span className="text-[12px]" style={{ color: TXT }}>{m.content}</span>
                    <span className="text-[8px] ml-auto shrink-0" style={{ ...MONO, color: TXT3 }}>
                      {new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </motion.div>
                ) : (
                  <BriefingCard key={m.id} msg={m} onCalibrate={calibrate} />
                )
              ))}
              {loading && <ProcessingState />}
              <div ref={endRef} />
            </>
          )}
        </div>

        {/* Input Matrix */}
        <div className="px-4 pb-3 pt-2 shrink-0" data-testid="input-area">
          <div className="relative flex items-center gap-2 max-w-3xl mx-auto px-3"
            style={{
              background: listening ? "rgba(200,169,126,0.04)" : SURFACE,
              border: `1px solid ${listening ? BORDER_F : input ? BORDER_F : BORDER}`,
              transition: "all 0.3s ease",
              boxShadow: listening ? `0 0 20px ${GOLD_M}` : "none",
            }}>
            <motion.div className="w-2 h-2 rounded-full shrink-0"
              style={{ background: listening ? GOLD : GREEN }}
              animate={listening ? { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] } : {}}
              transition={{ duration: 0.6, repeat: Infinity }} />

            <span className="text-[10px] shrink-0" style={{ ...MONO, color: TXT3 }}>EchoAi\u00B3 &gt;</span>

            <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey}
              placeholder={listening ? "Listening..." : "Query operational intelligence..."}
              className="flex-1 bg-transparent py-2.5 text-[12px] outline-none"
              style={{ color: TXT }}
              data-testid="command-input" />

            <button onClick={toggleVoice} data-testid="voice-btn">
              <VoiceOrb listening={listening} amplitude={amplitude} />
            </button>

            <button onClick={() => send()} disabled={!input.trim() || loading}
              className="p-1.5 transition-all"
              style={{ color: input.trim() ? GOLD : TXT3, opacity: input.trim() ? 1 : 0.3 }}
              data-testid="send-btn">
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center mt-1">
            <span className="text-[7px] uppercase tracking-[0.3em]" style={{ ...MONO, color: TXT3 }}>
              Governed Intelligence — Every decision traced via TraceLedger
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
