/**
 * iter209 · EchoChatBubble
 *
 * A floating bottom-right chat widget. Mounted globally inside the EchoEvents
 * panel (per William: UI stays in EchoEvents so we don't relocate later).
 *
 * Flows:
 *   - Click bubble → panel slides open
 *   - Type a message → POST /api/echo/chat (session persisted in
 *     echo_chat_sessions, session_id held in localStorage so the transcript
 *     restores across tab refreshes)
 *   - Keyboard: Enter to send, Shift+Enter for newline
 *   - Quick-start chips: "CCP status" · "What happened with…" · "Ticket …"
 */
import React from "react";
import { MessageCircle, X, Send, Loader2, History, Sparkles } from "lucide-react";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return (
    env.VITE_REACT_APP_BACKEND_URL ||
    env.REACT_APP_BACKEND_URL ||
    env.VITE_BACKEND_URL ||
    ""
  );
};

type Turn = { role: "user" | "assistant"; content: string; ts?: string; meta?: any };
const SID_KEY = "echo_chat_session_id_v1";

export default function EchoChatBubble() {
  const [open, setOpen] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string>(() => {
    try { return localStorage.getItem(SID_KEY) || ""; } catch { return ""; }
  });
  const [messages, setMessages] = React.useState<Turn[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // Persist session id across refreshes
  React.useEffect(() => {
    if (sessionId) {
      try { localStorage.setItem(SID_KEY, sessionId); } catch {}
    }
  }, [sessionId]);

  // Auto-scroll to latest turn
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  // Restore transcript on open if we have a session id
  React.useEffect(() => {
    if (!open || !sessionId) return;
    if (messages.length > 0) return;
    (async () => {
      try {
        const r = await fetch(`${API()}/api/echo/chat/history/${sessionId}`);
        if (r.ok) {
          const j = await r.json();
          if (Array.isArray(j.messages) && j.messages.length > 0) setMessages(j.messages);
        }
      } catch { /* ignore */ }
    })();
  }, [open, sessionId, messages.length]);

  async function send(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    setSending(true);
    setMessages((m) => [...m, { role: "user", content: msg }]);
    try {
      const r = await fetch(`${API()}/api/echo/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, session_id: sessionId || undefined }),
      });
      if (r.ok) {
        const j = await r.json();
        if (j.session_id && !sessionId) setSessionId(j.session_id);
        setMessages((m) => [...m, { role: "assistant", content: j.reply || "(no reply)", meta: { intent: j.intent } }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: `(error ${r.status})`, meta: { intent: "error" } }]);
      }
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: `Connection error — ${err?.message || err}`, meta: { intent: "error" } }]);
    } finally {
      setSending(false);
    }
  }

  function newSession() {
    setSessionId("");
    setMessages([]);
    try { localStorage.removeItem(SID_KEY); } catch {}
  }

  return (
    <>
      {/* Floating button */}
      <button
        data-testid="echo-chat-bubble"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Echo chat" : "Open Echo chat"}
        className="fixed bottom-6 right-6 z-[130] h-14 w-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-105"
        style={{
          background: open
            ? "linear-gradient(135deg, #64748b, #334155)"
            : "linear-gradient(135deg, #c8a97e, #a855f7)",
          color: "#0a0e1a",
          border: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          data-testid="echo-chat-panel"
          className="fixed bottom-24 right-6 z-[129] w-[380px] max-w-[94vw] h-[540px] max-h-[80vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
          style={{
            background: "linear-gradient(180deg, #0f1420 0%, #070b12 100%)",
            border: "1px solid rgba(200,169,126,0.25)",
            fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
            color: "#f5efe4",
          }}
        >
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <div>
                <div className="text-sm font-semibold">Echo</div>
                <div className="text-[10px] tracking-widest uppercase text-slate-500 font-mono">
                  {sessionId ? sessionId.slice(0, 14) + "…" : "new session"}
                </div>
              </div>
            </div>
            <button
              data-testid="echo-chat-new"
              onClick={newSession}
              className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-slate-400 hover:text-amber-300 transition-colors"
              title="Start a new session"
            >
              <History className="h-3 w-3" /> New
            </button>
          </header>

          {/* Transcript */}
          <div
            ref={scrollRef}
            data-testid="echo-chat-transcript"
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          >
            {messages.length === 0 && (
              <div className="text-center text-slate-500 text-xs py-8 space-y-3">
                <div>Hi — I'm Echo. Ask me anything about your events, tickets, or cold chain.</div>
                <div className="flex flex-wrap gap-1.5 justify-center" data-testid="echo-chat-quickstart">
                  {[
                    "CCP status",
                    "What happened with Elroy?",
                    "Ticket status",
                  ].map((q) => (
                    <button
                      key={q}
                      data-testid={`echo-chat-quick-${q.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                      onClick={() => send(q)}
                      className="px-2.5 py-1 text-[10px] rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                data-testid={`echo-chat-turn-${i}`}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[85%] text-[12px] leading-[1.5] px-3 py-2 rounded-lg whitespace-pre-wrap"
                  style={
                    m.role === "user"
                      ? {
                          background: "linear-gradient(135deg, rgba(200,169,126,0.18), rgba(168,85,247,0.12))",
                          border: "1px solid rgba(200,169,126,0.3)",
                          color: "#f5efe4",
                        }
                      : {
                          background: "rgba(30,41,59,0.5)",
                          border: "1px solid rgba(148,163,184,0.15)",
                          color: "#e2e8f0",
                        }
                  }
                >
                  {m.content}
                  {m.role === "assistant" && m.meta?.intent && (
                    <div className="text-[9px] font-mono uppercase tracking-wider text-slate-500 mt-1">
                      intent: {m.meta.intent}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div data-testid="echo-chat-thinking" className="flex items-center gap-2 text-[11px] text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" /> Echo is thinking…
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-slate-800 p-3">
            <div className="flex items-end gap-2">
              <textarea
                data-testid="echo-chat-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                placeholder="Ask Echo…  (Enter to send · Shift+Enter newline)"
                className="flex-1 text-[12px] p-2 rounded-md bg-slate-950/60 border border-slate-700 text-slate-100 resize-none focus:outline-none focus:border-amber-500/40"
              />
              <button
                data-testid="echo-chat-send"
                onClick={() => void send()}
                disabled={!input.trim() || sending}
                className="h-9 w-9 rounded-md flex items-center justify-center shrink-0 transition-opacity disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #c8a97e, #a855f7)",
                  color: "#0a0e1a",
                }}
                title="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
