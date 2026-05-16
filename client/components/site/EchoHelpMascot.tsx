/**
 * EchoHelpMascot
 * ============================================================================
 * Corner-parked LUCCCA mascot (cyan-glow astronaut, the MyEcho.png art) that
 * fades to 30% opacity after 60s of inactivity, wakes on click, and opens a
 * chat bubble offering guided tours + free-form Q&A.
 *
 * Backend contract: routes/help_agent.py
 *   GET    /api/help-agent/tours
 *   GET    /api/help-agent/tours/{id}
 *   POST   /api/help-agent/sessions
 *   POST   /api/help-agent/sessions/{id}/advance
 *   POST   /api/help-agent/sessions/{id}/skip
 *   POST   /api/help-agent/sessions/{id}/abandon
 *   POST   /api/help-agent/ask
 *
 * Spec: docs/UX_ICON_SYSTEM.md (D63) + docs/UX_ICON_MASTER_LIST.md (D64).
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { HELP_MASCOT_SRC } from "@/lib/brand-icon-registry";

const IDLE_FADE_MS = 60 * 1000;
const API_BASE = "/api/help-agent";

interface TourSummary {
  id: string;
  title: string;
  description: string;
  duration_seconds: number;
  step_count: number;
}

interface TourStep {
  target: string;
  title: string;
  body: string;
}

interface Session {
  session_id: string;
  tour_id: string;
  step_index: number;
  total_steps: number;
  current_step: TourStep | null;
  status: "active" | "completed" | "abandoned" | "skipped";
}

interface AskReply {
  reply: string;
  suggested_tour: string | null;
}

type View = "menu" | "tour" | "chat";

export default function EchoHelpMascot() {
  const [open, setOpen] = useState(false);
  const [idle, setIdle] = useState(false);
  const [view, setView] = useState<View>("menu");
  const [tours, setTours] = useState<TourSummary[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatLog, setChatLog] = useState<Array<{ role: "user" | "mascot"; text: string; suggested?: string | null }>>([]);
  const [busy, setBusy] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    setIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setIdle(true), IDLE_FADE_MS);
  }, []);

  // Initialize idle timer + listen for any user input to wake the mascot
  useEffect(() => {
    resetIdleTimer();
    const onActivity = () => resetIdleTimer();
    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Lazy-fetch tours when the panel opens for the first time
  useEffect(() => {
    if (!open || tours.length > 0) return;
    fetch(`${API_BASE}/tours`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: TourSummary[]) => setTours(Array.isArray(data) ? data : []))
      .catch(() => setTours([]));
  }, [open, tours.length]);

  const toggle = useCallback(() => {
    setOpen((o) => !o);
    resetIdleTimer();
  }, [resetIdleTimer]);

  const startTour = useCallback(
    async (tourId: string) => {
      setBusy(true);
      try {
        const r = await fetch(`${API_BASE}/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tour_id: tourId }),
        });
        if (!r.ok) throw new Error(`status ${r.status}`);
        const s: Session = await r.json();
        setSession(s);
        setView("tour");
      } catch (e) {
        // Surface fallback message; mascot stays open
        setChatLog((log) => [
          ...log,
          { role: "mascot", text: "Couldn't start that tour right now — try again in a moment." },
        ]);
        setView("chat");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const advance = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/sessions/${session.session_id}/advance`, { method: "POST" });
      const s: Session = await r.json();
      setSession(s);
    } finally {
      setBusy(false);
    }
  }, [session]);

  const skipStep = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE}/sessions/${session.session_id}/skip`, { method: "POST" });
      setSession(null);
      setView("menu");
    } finally {
      setBusy(false);
    }
  }, [session]);

  const abandon = useCallback(async () => {
    if (!session) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE}/sessions/${session.session_id}/abandon`, { method: "POST" });
    } finally {
      setSession(null);
      setView("menu");
      setBusy(false);
    }
  }, [session]);

  const sendAsk = useCallback(async () => {
    const q = chatInput.trim();
    if (!q) return;
    setChatLog((log) => [...log, { role: "user", text: q }]);
    setChatInput("");
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data: AskReply = await r.json();
      setChatLog((log) => [
        ...log,
        { role: "mascot", text: data.reply, suggested: data.suggested_tour },
      ]);
    } catch {
      setChatLog((log) => [
        ...log,
        { role: "mascot", text: "I lost the connection to the help service — try again shortly." },
      ]);
    } finally {
      setBusy(false);
    }
  }, [chatInput]);

  const mascotSize = open ? 64 : 36;

  return (
    <div
      data-testid="echo-help-mascot-root"
      style={{
        position: "fixed",
        // iter266 · Relocated into the slot the HelpDesk lightbulb used to
        // occupy (top:24, right:270) per William. The mascot now carries
        // the help/tours/Ask-Echo functions.
        top: 14,
        right: 270,
        zIndex: 2147483647,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {open && (
        <div
          data-testid="echo-help-mascot-panel"
          style={{
            pointerEvents: "auto",
            width: 340,
            maxHeight: 460,
            background: "radial-gradient(circle at top right, rgba(20,30,55,0.97), rgba(8,10,18,0.97))",
            color: "#F4E9C9",
            border: "1px solid rgba(201, 162, 78, 0.55)",
            borderRadius: 16,
            boxShadow: "0 18px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(229, 194, 110, 0.15)",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            fontSize: 13,
            lineHeight: 1.45,
            backdropFilter: "blur(8px)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ color: "#E5C26E", letterSpacing: 0.6, fontSize: 13 }}>Echo Help</strong>
            <div style={{ display: "flex", gap: 6 }}>
              {view !== "menu" && (
                <button
                  data-testid="mascot-back-btn"
                  onClick={() => {
                    if (session) void abandon();
                    setView("menu");
                  }}
                  style={miniBtn}
                >
                  ← Menu
                </button>
              )}
              <button
                data-testid="mascot-close-btn"
                onClick={() => setOpen(false)}
                style={miniBtn}
                aria-label="Close help"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ overflowY: "auto", maxHeight: 360, paddingRight: 4 }}>
            {view === "menu" && (
              <div data-testid="mascot-menu">
                <p style={{ margin: "0 0 10px 0", opacity: 0.85 }}>
                  Pick a guided tour, or ask me anything about LUCCCA.
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {tours.length === 0 && (
                    <li style={{ opacity: 0.6, fontStyle: "italic" }}>Loading tours…</li>
                  )}
                  {tours.map((t) => (
                    <li key={t.id}>
                      <button
                        data-testid={`mascot-tour-${t.id}`}
                        onClick={() => startTour(t.id)}
                        disabled={busy}
                        style={tourBtn}
                      >
                        <span style={{ color: "#E5C26E", fontWeight: 600 }}>{t.title}</span>
                        <span style={{ display: "block", opacity: 0.7, fontSize: 11, marginTop: 2 }}>
                          {t.step_count} steps · {t.duration_seconds}s
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  data-testid="mascot-open-chat"
                  onClick={() => setView("chat")}
                  style={{ ...tourBtn, marginTop: 8, textAlign: "center" }}
                >
                  💬 Ask Echo a question
                </button>
              </div>
            )}

            {view === "tour" && session && (
              <div data-testid="mascot-tour-view">
                <div style={{ opacity: 0.75, fontSize: 11, marginBottom: 6 }}>
                  Step {Math.min(session.step_index + 1, session.total_steps)} / {session.total_steps}
                  {session.status !== "active" && (
                    <span style={{ marginLeft: 8, color: "#9bd07f" }}>· {session.status}</span>
                  )}
                </div>
                {session.current_step ? (
                  <>
                    <div style={{ color: "#E5C26E", fontWeight: 600, marginBottom: 4 }}>
                      {session.current_step.title}
                    </div>
                    <div style={{ opacity: 0.92 }}>{session.current_step.body}</div>
                    <div style={{ opacity: 0.55, fontSize: 11, marginTop: 6 }}>
                      Look for: <code style={{ color: "#E5C26E" }}>{session.current_step.target}</code>
                    </div>
                  </>
                ) : (
                  <div style={{ opacity: 0.9 }}>
                    Tour complete. Try another from the menu.
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {session.status === "active" && session.current_step && (
                    <button data-testid="mascot-tour-advance" onClick={advance} disabled={busy} style={primaryBtn}>
                      Next →
                    </button>
                  )}
                  <button data-testid="mascot-tour-skip" onClick={skipStep} disabled={busy} style={miniBtn}>
                    Skip tour
                  </button>
                </div>
              </div>
            )}

            {view === "chat" && (
              <div data-testid="mascot-chat-view">
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {chatLog.length === 0 && (
                    <p style={{ opacity: 0.7, fontStyle: "italic" }}>
                      Try: "How do I post a recipe?" or "Where's my paystub?"
                    </p>
                  )}
                  {chatLog.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                        background: m.role === "user" ? "rgba(229, 194, 110, 0.18)" : "rgba(255,255,255,0.04)",
                        border: m.role === "user" ? "1px solid rgba(229,194,110,0.35)" : "1px solid rgba(255,255,255,0.08)",
                        padding: "6px 9px",
                        borderRadius: 10,
                        maxWidth: "85%",
                      }}
                    >
                      {m.text}
                      {m.suggested && (
                        <button
                          data-testid={`mascot-chat-suggested-${m.suggested}`}
                          onClick={() => startTour(m.suggested!)}
                          style={{ ...miniBtn, marginTop: 6 }}
                        >
                          Start that tour →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat input — only when in chat view */}
          {view === "chat" && (
            <div style={{ display: "flex", gap: 6 }}>
              <input
                data-testid="mascot-chat-input"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendAsk()}
                placeholder="Ask Echo…"
                style={{
                  flex: 1,
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(229,194,110,0.35)",
                  color: "#F4E9C9",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 12,
                  outline: "none",
                }}
              />
              <button data-testid="mascot-chat-send" onClick={sendAsk} disabled={busy || !chatInput.trim()} style={primaryBtn}>
                Send
              </button>
            </div>
          )}
        </div>
      )}

      <button
        data-testid="echo-help-mascot-button"
        onClick={toggle}
        title="Echo Help"
        aria-label="Open Echo Help"
        style={{
          pointerEvents: "auto",
          width: mascotSize,
          height: mascotSize,
          padding: 0,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          opacity: idle && !open ? 0.3 : 1,
          transition: "opacity 0.6s ease, transform 0.25s ease, width 0.25s ease, height 0.25s ease",
          filter: "drop-shadow(0 0 14px rgba(120, 220, 255, 0.45))",
        }}
      >
        <img
          src={HELP_MASCOT_SRC}
          alt="Echo Help mascot"
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      </button>
    </div>
  );
}

// ----- Inline styles (kept colocated to avoid a CSS round-trip) -----
const miniBtn: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(229,194,110,0.35)",
  color: "#E5C26E",
  borderRadius: 8,
  padding: "4px 8px",
  fontSize: 11,
  cursor: "pointer",
};

const primaryBtn: React.CSSProperties = {
  background: "linear-gradient(180deg, #E5C26E 0%, #C9A24E 100%)",
  border: "1px solid #C9A24E",
  color: "#0A0A0C",
  fontWeight: 600,
  borderRadius: 8,
  padding: "6px 12px",
  fontSize: 12,
  cursor: "pointer",
};

const tourBtn: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(229,194,110,0.25)",
  color: "#F4E9C9",
  borderRadius: 10,
  padding: "8px 10px",
  fontSize: 12,
  cursor: "pointer",
};
