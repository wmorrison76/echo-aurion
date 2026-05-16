import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ChefHat, Send, MessageSquare, Upload, Search, BookOpen, Brain,
  RefreshCw, ChevronRight, Clock, Users, AlertTriangle, Flame,
  Plus, History, Zap, Mic, MicOff, Loader2,
} from "lucide-react";

import BEOReviewPanel from "./BEOReviewPanel";

const API = window.location.origin;
const POST = (path: string, body: any = {}) =>
  fetch(`${API}/api/chef-gio${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json());
const GET = (path: string) => fetch(`${API}/api/chef-gio${path}`).then(r => r.json());

const FONT = { fontFamily: "'IBM Plex Sans', system-ui, sans-serif" };
const MONO = { fontFamily: "'IBM Plex Mono', monospace" };
const BG = "#04060d";
const SURFACE = "rgba(255,255,255,0.025)";
const BORDER = "rgba(255,255,255,0.06)";
const ACCENT = "#c8a97e";
const ACCENT_DIM = "rgba(200,169,126,0.12)";
const GIO_COLOR = "#22c55e";

export default function ChefGioTrainingPanel() {
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [beoSearch, setBeoSearch] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [modes, setModes] = useState<any[]>([]);
  const [selectedMode, setSelectedMode] = useState("full_walkthrough");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    GET("/sessions").then(d => setSessions(d.sessions || []));
    GET("/training-modes").then(d => setModes(d.modes || []));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const startSession = useCallback(async (beoNum?: number) => {
    setSending(true);
    const data = await POST("/sessions/create", {
      beo_number: beoNum || undefined,
      chef_name: "Sous Chef",
      mode: selectedMode,
    });
    setSession(data);
    setMessages([{ role: "assistant", content: data.opening_message }]);
    setSending(false);
    setSessions(prev => [{ session_id: data.session_id, beo_number: beoNum, mode: selectedMode, message_count: 1, status: "active", created_at: new Date().toISOString() }, ...prev]);
  }, [selectedMode]);

  const loadSession = useCallback(async (sid: string) => {
    const data = await GET(`/sessions/${sid}/history`);
    setSession(data.session);
    setMessages(data.messages || []);
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !session?.session_id || sending) return;
    const msg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    setSending(true);
    try {
      const data = await POST(`/sessions/${session.session_id}/message`, { message: msg });
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error — please try again." }]);
    }
    setSending(false);
  }, [input, session, sending]);

  // ── Voice Recording (Whisper STT) ──
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [activeView, setActiveView] = useState<"chat" | "review">("chat");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 100) return;

        setTranscribing(true);
        try {
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");
          const res = await fetch(`${API}/api/chef-gio/transcribe`, { method: "POST", body: formData });
          const data = await res.json();
          if (data.text && data.text.trim()) {
            setInput(prev => prev ? `${prev} ${data.text.trim()}` : data.text.trim());
          }
        } catch (e) {
          console.error("Transcription failed:", e);
        }
        setTranscribing(false);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      console.error("Microphone access denied");
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, [recording]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ ...FONT, background: BG, color: "#e2e8f0" }}
      data-testid="chef-gio-panel">
      {/* View Toggle Header */}
      <div className="flex items-center gap-1 px-4 py-1.5 shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="w-6 h-6 rounded-full flex items-center justify-center mr-1" style={{ background: "rgba(34,197,94,0.15)" }}>
          <ChefHat className="w-3 h-3" style={{ color: GIO_COLOR }} />
        </div>
        <span className="text-[11px] font-semibold text-white mr-3">Chef Gio</span>
        {(["chat", "review"] as const).map(v => (
          <button key={v} onClick={() => setActiveView(v)}
            className="px-2.5 py-1 rounded-md text-[10px] font-medium transition-all"
            style={{
              background: activeView === v ? `${ACCENT}10` : "transparent",
              color: activeView === v ? ACCENT : "rgba(148,163,184,0.5)",
              border: activeView === v ? `1px solid ${ACCENT}25` : "1px solid transparent",
            }}
            data-testid={`gio-view-${v}`}>
            {v === "chat" ? "Training Chat" : "BEO Review"}
          </button>
        ))}
      </div>

      {activeView === "review" ? (
        <BEOReviewPanel />
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          {showSidebar && (
        <div className="w-64 shrink-0 flex flex-col" style={{ borderRight: `1px solid ${BORDER}`, background: "rgba(0,0,0,0.2)" }}>
          <div className="p-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)", border: `1px solid rgba(34,197,94,0.3)` }}>
                <ChefHat className="w-4 h-4" style={{ color: GIO_COLOR }} />
              </div>
              <div>
                <div className="text-[12px] font-bold text-white">Chef Gio</div>
                <div className="text-[9px]" style={{ ...MONO, color: GIO_COLOR }}>TRAINING MODULE</div>
              </div>
            </div>

            {/* New Session */}
            <div className="space-y-2">
              <div className="flex gap-1.5">
                <input type="text" value={beoSearch} onChange={e => setBeoSearch(e.target.value)}
                  placeholder="BEO # (optional)"
                  className="flex-1 px-2 py-1.5 rounded text-[11px] outline-none"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
                  data-testid="beo-search-input" />
              </div>
              <select value={selectedMode} onChange={e => setSelectedMode(e.target.value)}
                className="w-full px-2 py-1.5 rounded text-[10px] outline-none"
                style={{ ...MONO, background: SURFACE, border: `1px solid ${BORDER}`, color: "#e2e8f0" }}
                data-testid="mode-select">
                {modes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button onClick={() => startSession(beoSearch ? parseInt(beoSearch) : undefined)}
                disabled={sending}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded text-[11px] font-medium transition-all"
                style={{ background: "rgba(34,197,94,0.12)", color: GIO_COLOR, border: `1px solid rgba(34,197,94,0.2)` }}
                data-testid="new-session-btn">
                <Plus className="w-3 h-3" /> New Training Session
              </button>
            </div>
          </div>

          {/* Session History */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1" style={{ scrollbarWidth: "thin" }}>
            <div className="text-[9px] uppercase tracking-widest px-2 py-1" style={{ color: "rgba(148,163,184,0.3)" }}>History</div>
            {sessions.map(s => (
              <button key={s.session_id} onClick={() => loadSession(s.session_id)}
                className="w-full text-left px-2.5 py-2 rounded text-[10px] transition-all hover:scale-[1.01]"
                style={{
                  background: session?.session_id === s.session_id ? ACCENT_DIM : "transparent",
                  border: `1px solid ${session?.session_id === s.session_id ? "rgba(200,169,126,0.15)" : "transparent"}`,
                  color: session?.session_id === s.session_id ? ACCENT : "rgba(148,163,184,0.5)",
                }}>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {s.beo_number ? `BEO #${s.beo_number}` : "Open Session"} · {s.mode?.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="text-[8px] mt-0.5" style={{ color: "rgba(148,163,184,0.3)" }}>
                  {s.message_count || 0} messages
                </div>
              </button>
            ))}
            </div>
          </div>
          )}

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <button onClick={() => setShowSidebar(!showSidebar)} className="p-1 rounded hover:scale-105 transition-all"
            style={{ color: "rgba(148,163,184,0.4)" }}>
            <ChevronRight className={`w-4 h-4 transition-transform ${showSidebar ? "rotate-180" : ""}`} />
          </button>
          <ChefHat className="w-5 h-5" style={{ color: GIO_COLOR }} />
          <div>
            <div className="text-[13px] font-semibold text-white">Chef GioGenoa Training</div>
            <div className="text-[9px]" style={{ ...MONO, color: "rgba(148,163,184,0.4)" }}>
              {session ? `Session: ${session.session_id || session.session?.session_id} · ${session.mode || session.session?.mode || ""}` : "Start a session to begin training"}
            </div>
          </div>
          <div className="flex-1" />
          {session?.beo_data && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md" style={{ background: ACCENT_DIM, border: `1px solid rgba(200,169,126,0.15)` }}>
              <BookOpen className="w-3 h-3" style={{ color: ACCENT }} />
              <span className="text-[10px]" style={{ ...MONO, color: ACCENT }}>
                BEO #{session.beo_data.beo_number} · {session.beo_data.event_name} · {session.beo_data.covers}cv
              </span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          style={{ scrollbarWidth: "thin", scrollbarColor: `${BORDER} transparent` }}
          data-testid="chat-messages">
          {messages.length === 0 && !session && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.08)", border: `1px solid rgba(34,197,94,0.15)` }}>
                <ChefHat className="w-8 h-8" style={{ color: GIO_COLOR }} />
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-white mb-1">Chef GioGenoa Training Module</div>
                <div className="text-[12px] max-w-md mx-auto" style={{ color: "rgba(148,163,184,0.5)" }}>
                  Upload a BEO and Chef Gio will walk you through every detail — recipes, ordering, production timelines, firing sequences, equipment management. Like having a seasoned Executive Chef training you one-on-one.
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { icon: Flame, label: "Full BEO Walkthrough", desc: "Line-by-line analysis", mode: "full_walkthrough" },
                  { icon: Brain, label: "Kitchen Quiz", desc: "Test your knowledge", mode: "quiz" },
                  { icon: AlertTriangle, label: "Crisis Scenario", desc: "Handle the impossible", mode: "scenario" },
                  { icon: MessageSquare, label: "Open Kitchen Talk", desc: "Ask anything", mode: "freeform" },
                ].map(m => (
                  <button key={m.mode} onClick={() => { setSelectedMode(m.mode); startSession(); }}
                    className="flex items-start gap-3 p-4 rounded-lg text-left transition-all hover:scale-[1.02]"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
                    data-testid={`quick-${m.mode}`}>
                    <m.icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: GIO_COLOR }} />
                    <div>
                      <div className="text-[11px] font-semibold text-white">{m.label}</div>
                      <div className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>{m.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`msg-${i}`}>
              <div className="max-w-[75%]">
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <ChefHat className="w-3 h-3" style={{ color: GIO_COLOR }} />
                    <span className="text-[9px] font-medium" style={{ color: GIO_COLOR }}>Chef Gio</span>
                  </div>
                )}
                <div className="rounded-lg px-4 py-3 text-[12px] leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: msg.role === "user" ? "rgba(200,169,126,0.08)" : "rgba(34,197,94,0.04)",
                    border: `1px solid ${msg.role === "user" ? "rgba(200,169,126,0.12)" : "rgba(34,197,94,0.08)"}`,
                    color: msg.role === "user" ? "#e2e8f0" : "rgba(226,232,240,0.85)",
                  }}>
                  {formatGioMessage(msg.content)}
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex items-center gap-2">
              <ChefHat className="w-3 h-3" style={{ color: GIO_COLOR }} />
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: GIO_COLOR, animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: GIO_COLOR, animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: GIO_COLOR, animationDelay: "300ms" }} />
              </div>
              <span className="text-[10px]" style={{ color: "rgba(34,197,94,0.5)" }}>Chef Gio is thinking...</span>
            </div>
          )}
        </div>

        {/* Input */}
        {session && (
          <div className="px-5 pb-4 pt-2" style={{ borderTop: `1px solid ${BORDER}` }}>
            <div className="flex gap-2">
              <button
                onClick={recording ? stopRecording : startRecording}
                disabled={sending || transcribing}
                className="px-3 py-3 rounded-lg transition-all hover:scale-[1.02]"
                style={{
                  background: recording ? "rgba(239,68,68,0.15)" : transcribing ? "rgba(200,169,126,0.1)" : "rgba(168,85,247,0.1)",
                  color: recording ? "#ef4444" : transcribing ? ACCENT : "#a855f7",
                  border: `1px solid ${recording ? "rgba(239,68,68,0.3)" : transcribing ? "rgba(200,169,126,0.2)" : "rgba(168,85,247,0.2)"}`,
                  animation: recording ? "pulse 1.5s infinite" : "none",
                }}
                data-testid="mic-btn"
                title={recording ? "Stop recording" : transcribing ? "Transcribing..." : "Record voice message"}>
                {transcribing ? <Loader2 className="w-4 h-4 animate-spin" /> : recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <input type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder={recording ? "Listening..." : transcribing ? "Transcribing audio..." : "Type or speak your response to Chef Gio..."}
                className="flex-1 px-4 py-3 rounded-lg text-[12px] outline-none"
                style={{ background: SURFACE, border: `1px solid ${recording ? "rgba(239,68,68,0.2)" : BORDER}`, color: "#e2e8f0" }}
                disabled={sending || recording}
                data-testid="chat-input" />
              <button onClick={sendMessage} disabled={sending || !input.trim() || recording}
                className="px-4 py-3 rounded-lg transition-all hover:scale-[1.02]"
                style={{ background: "rgba(34,197,94,0.12)", color: GIO_COLOR, border: `1px solid rgba(34,197,94,0.2)` }}
                data-testid="send-btn">
                <Send className="w-4 h-4" />
              </button>
            </div>
            {(recording || transcribing) && (
              <div className="flex items-center gap-2 mt-1.5 px-1">
                {recording && (
                  <>
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
                    <span className="text-[9px]" style={{ color: "rgba(239,68,68,0.7)" }}>Recording... Click mic to stop</span>
                  </>
                )}
                {transcribing && (
                  <span className="text-[9px]" style={{ color: "rgba(200,169,126,0.6)" }}>Converting speech to text...</span>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
      )}
    </div>
  );
}

function formatGioMessage(text: string): React.ReactNode {
  if (!text) return null;
  // Bold markdown (**text**)
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
