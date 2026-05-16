/**
 * Echo Command Bar — sentient-style invocation UI (iter164).
 *
 * Three layers:
 *  1. AmbientHalo — thin 1-2px glowing border around viewport, color-coded by Echo state
 *  2. CommandPalette — Cmd+K / ⌘; opens center-screen command input with verb-first suggestions
 *  3. EventTape — side drawer showing what Echo is doing (not chat bubbles)
 *
 * Opt-in: render <EchoCommandBar /> anywhere in the app.
 */
import React, { useEffect, useMemo, useState, useRef } from "react";
import { echoBus } from "../../lib/echo-bus";

type EchoState = "idle" | "thinking" | "acting" | "attention" | "success";

interface Suggestion {
  id: string;
  label: string;
  hint?: string;
  run: () => void | Promise<void>;
}

// ─── Suggestion registry (extensible) ───
// iter266.9 · Massively expanded so the palette actually answers common
// "where do I find X" admin/operator queries instead of saying "no matches".
// Anything not matched here falls through to a live `Ask Echo AURION` LLM
// call against /api/help-agent/ask so the box is never a dead-end.
const BASE_SUGGESTIONS: Suggestion[] = [
  // ── Schedule / workforce ──
  { id: "open-schedule", label: "Open Schedule · Workforce Command", hint: "labor analytics + multi-outlet tiles", run: () => echoBus.openPanel("schedule") },
  { id: "open-my-schedule", label: "Open My Schedule", hint: "your shifts + recognition", run: () => echoBus.openPanel("my-schedule") },
  { id: "open-people-admin", label: "Open People & Operations", hint: "employees · hours · coverage", run: () => echoBus.openPanel("people-admin") },
  { id: "open-borrow", label: "Open Cross-Department Borrow", hint: "PAF flow for staff borrow", run: () => echoBus.openPanel("cross-dept-borrow") },
  { id: "open-tip-audit", label: "Open Tip Audit", hint: "FOH tip pool reconciliation", run: () => echoBus.openPanel("tip-audit") },
  // ── Culinary ──
  { id: "open-culinary", label: "Open Culinary Suite", hint: "recipes · plate costing · stations", run: () => echoBus.openPanel("culinary") },
  { id: "open-recipes", label: "Open Recipe Library", hint: "search · cost · ingredients", run: () => echoBus.openPanel("culinary") },
  { id: "open-plate-costing", label: "Open Plate Costing", hint: "menu engineering · margin", run: () => echoBus.openPanel("plate-costing") },
  { id: "open-kitchen", label: "Open Kitchen War Room", hint: "live ops", run: () => echoBus.openPanel("kitchen-war-room") },
  { id: "open-menu-design", label: "Open Menu Design Studio", hint: "", run: () => echoBus.openPanel("menu-design-studio") },
  { id: "open-cake", label: "Open Cake Viewer", hint: "3D cake designer", run: () => echoBus.openPanel("cake-viewer") },
  { id: "open-pastry", label: "Open Pastry Operations", hint: "production · standalone bakery", run: () => echoBus.openPanel("pastry") },
  // ── Inventory · Purchasing · Supplier ──
  { id: "open-inventory", label: "Open Ordering & Inventory", hint: "PAR · counts · transfers", run: () => echoBus.openPanel("inventory") },
  { id: "open-receiving", label: "Open Receiving · Mobile", hint: "scanner · invoice OCR", run: () => echoBus.openPanel("receiving") },
  { id: "open-purchasing", label: "Open Purchasing", hint: "POs · approvals · vendors", run: () => echoBus.openPanel("purchasing") },
  { id: "open-supplier-catalog", label: "Open Supplier Catalog", hint: "vendor SKUs · price lookup", run: () => echoBus.openPanel("supplier-catalog") },
  { id: "ingredient-cost", label: "Find Ingredient Cost", hint: "vendor SKU lookup → recipe cost", run: () => echoBus.openPanel("supplier-catalog") },
  { id: "open-invoice-scanner", label: "Open Invoice Scanner", hint: "OCR + line-item routing", run: () => echoBus.openPanel("invoice-ingest") },
  { id: "open-invoices", label: "Open Invoices List", hint: "65 invoices · 14 vendors", run: () => echoBus.openPanel("invoices") },
  // ── Beverage ──
  { id: "open-mixology", label: "Open Mixology & Sommelier", hint: "cocktails · wine · pairing", run: () => echoBus.openPanel("mixology-sommelier") },
  { id: "open-mixology-rd", label: "Open Mixology R&D Lab", hint: "drink development", run: () => echoBus.openPanel("mixology-rd-lab") },
  { id: "open-beverage-ops", label: "Open Beverage Operations", hint: "bar inventory · pour cost", run: () => echoBus.openPanel("beverage-operations") },
  // ── Finance · Accounting · BI ──
  { id: "open-aurum", label: "Open Echo Aurum · Finance", hint: "GL · P&L · budgets", run: () => echoBus.openPanel("echo-aurum") },
  { id: "open-bi", label: "Open Enterprise BI Suite", hint: "cross-property analytics", run: () => echoBus.openPanel("enterprise-bi-suite") },
  { id: "open-forecast", label: "Open 21-Day Forecast", hint: "revenue · occupancy · covers", run: () => echoBus.openPanel("stratus-forecast") },
  { id: "open-forecast-hub", label: "Open Forecast Hub", hint: "AI-driven multi-horizon", run: () => echoBus.openPanel("forecast-hub") },
  // ── Hotel · Guest · Concierge ──
  { id: "open-pms", label: "Open PMS · Front Desk", hint: "reservations · check-in", run: () => echoBus.openPanel("pms") },
  { id: "open-concierge-hub", label: "Open Local Guide", hint: "local + area + in-house", run: () => echoBus.openPanel("foh-concierge-hub") },
  { id: "open-echo-concierge", label: "Open Concierge Desk", hint: "guest experience AI", run: () => echoBus.openPanel("echo-concierge") },
  { id: "open-guest360", label: "Open Guest 360 Hub", hint: "stay history · preferences", run: () => echoBus.openPanel("guest360-hub") },
  { id: "open-vip-atlas", label: "Open VIP Atlas", hint: "VIP back office", run: () => echoBus.openPanel("vip-admin-desktop") },
  { id: "open-spa", label: "Open Spa Operations", hint: "treatments · therapists · revenue", run: () => echoBus.openPanel("spa") },
  // ── Events ──
  { id: "open-beo", label: "Open BEO Builder", hint: "banquet event orders", run: () => echoBus.openPanel("beo-builder") },
  { id: "open-events", label: "Open Echo Events", hint: "catering · banquet revenue", run: () => echoBus.openPanel("echo-events") },
  { id: "open-conv", label: "Open Convention Management", hint: "group blocks · room setup", run: () => echoBus.openPanel("convention-management") },
  { id: "open-dashboard", label: "Open LUCCCA Manager Dashboard", hint: "outlet-scoped manager view", run: () => echoBus.openPanel("luccca-jarvis-dashboard") },
  // ── Admin / IT ──
  { id: "open-admin", label: "Open Admin Console", hint: "IT · platform ops · users", run: () => echoBus.openPanel("admin-console") },
  { id: "open-audit", label: "Open Audit & Security", hint: "event log · compliance", run: () => echoBus.openPanel("audit-security") },
  { id: "open-flags", label: "Open Feature Flags", hint: "toggles · rollouts", run: () => echoBus.openPanel("feature-flags") },
  { id: "open-integrations", label: "Open IT & Integrations", hint: "POS · PMS · sync status", run: () => echoBus.openPanel("it-operations") },
  { id: "open-installers", label: "Open Desktop Installers", hint: "Mac / Win / Linux", run: () => echoBus.openPanel("desktop-installers") },
  { id: "open-tech-support", label: "Open Echo AURION · Tech Support", hint: "knowledge base · tickets", run: () => echoBus.openPanel("tech-support") },
  // ── Activity / Tickets / Briefs ──
  { id: "open-relay", label: "Open Relay · Tickets", hint: "intake for every dept", run: () => echoBus.openPanel("relay") },
  { id: "open-notifications", label: "Show Notifications", hint: "", run: () => echoBus.openPanel("notification-center") },
  { id: "open-daily-standup", label: "Open Daily Standup", hint: "morning briefing", run: () => echoBus.openPanel("daily-standup") },
  { id: "open-lifestyle", label: "Open Lifestyle Command", hint: "activations · forecasts", run: () => echoBus.openPanel("lifestyle-dashboard") },
  // ── Pastry & decor ──
  { id: "open-pastry-admin", label: "Open Pastry Admin", hint: "standalone bakery revenue", run: () => { window.location.href = "/pastry/admin"; } },
  { id: "open-gallery", label: "Open Pastry Gallery", hint: "saved cake renders", run: () => { window.location.href = "/pastry/gallery"; } },
  // ── Settings / personal ──
  { id: "open-appearance", label: "Open Appearance & Settings", hint: "theme · typography", run: () => echoBus.openPanel("appearance-settings") },
];

// iter266.9 · Keyword aliases — common natural-language phrases the user
// might type get routed to the right panel even when the label doesn't
// literally contain the word.
const KEYWORD_ALIASES: Record<string, string[]> = {
  "open-supplier-catalog": ["ingredient cost", "ingredient price", "where do i find ingredient", "vendor price", "sku lookup", "lookup ingredient"],
  "open-inventory":        ["inventory", "stock", "par level", "count sheet", "where is inventory"],
  "open-invoices":         ["invoice list", "see invoices", "where are my invoices"],
  "open-invoice-scanner":  ["scan invoice", "ocr invoice", "upload invoice"],
  "open-plate-costing":    ["plate cost", "menu cost", "recipe cost", "food cost"],
  "open-recipes":          ["recipe", "find a recipe", "where is recipe"],
  "open-schedule":         ["staff schedule", "shifts", "labor", "where do i schedule", "schedule employee"],
  "open-tip-audit":        ["tips", "tip pool", "tip out", "gratuity"],
  "open-aurum":            ["pnl", "p&l", "budget", "general ledger", "gl", "accounting"],
  "open-pms":              ["check in", "check-in", "reservation", "front desk", "room"],
  "ingredient-cost":       ["ingredient", "cost per pound", "cost per oz"],
  "open-mixology":         ["cocktail", "wine list", "drink"],
  "open-beverage-ops":     ["pour cost", "bar inventory", "liquor cost"],
};

export default function EchoCommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [echoState, setEchoState] = useState<EchoState>("idle");
  const [tape, setTape] = useState(echoBus.getTape());
  const [tapeOpen, setTapeOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // iter233 · Hide entirely on dedicated mobile shells that have their own
  // Echo affordance (EchoMiniButton). Prevents the "two buttons at the
  // bottom" William reported.
  const [hiddenForMobile] = useState(() => {
    try {
      const p = window.location.pathname || "";
      return p.startsWith("/m/ecw") || p.startsWith("/m/waste")
          || p.startsWith("/m/concierge") || p.startsWith("/m/briefing")
          || p.startsWith("/m/staff");
    } catch { return false; }
  });
  if (hiddenForMobile) return null;

  // Keyboard: Cmd/Ctrl + K opens, Esc closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K" || e.key === ";")) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Subscribe to bus — derive echoState from recent activity
  useEffect(() => {
    let lastAct = 0;
    const offTape = echoBus.subscribeTape((t) => {
      setTape(t);
      const latest = t[0];
      if (!latest) { setEchoState("idle"); return; }
      if (latest.outcome === "pending") setEchoState("acting");
      else if (latest.outcome === "success") { setEchoState("success"); lastAct = Date.now(); }
      else if (latest.outcome === "error") setEchoState("attention");
      else if (latest.outcome === "awaiting-review") setEchoState("attention");
    });
    const tick = setInterval(() => {
      if (Date.now() - lastAct > 3000 && echoState === "success") setEchoState("idle");
    }, 1000);
    return () => { offTape(); clearInterval(tick); };
  }, [echoState]);

  // Auto-focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  const [llmAnswer, setLlmAnswer] = useState<string | null>(null);
  const [llmLoading, setLlmLoading] = useState(false);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return BASE_SUGGESTIONS.slice(0, 8);
    // 1) Label/id match
    const direct = BASE_SUGGESTIONS.filter((s) =>
      s.label.toLowerCase().includes(q) ||
      s.id.includes(q) ||
      (s.hint || "").toLowerCase().includes(q)
    );
    // 2) Keyword alias match (e.g. "ingredient cost" → open-supplier-catalog)
    const aliasIds = new Set<string>();
    for (const [id, words] of Object.entries(KEYWORD_ALIASES)) {
      if (words.some(w => q.includes(w) || w.includes(q))) aliasIds.add(id);
    }
    const aliasMatches = BASE_SUGGESTIONS.filter(s => aliasIds.has(s.id) && !direct.includes(s));
    return [...direct, ...aliasMatches].slice(0, 8);
  }, [query]);

  // iter266.9 · LLM fallback for natural-language queries. If no panel matches,
  // hit /api/help-agent/ask for a real answer instead of "no matches".
  const askEchoAurion = async () => {
    if (!query.trim()) return;
    setLlmLoading(true);
    setLlmAnswer(null);
    try {
      const r = await fetch(`${window.location.origin}/api/help-agent/ask`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query }),
      });
      const j = await r.json();
      setLlmAnswer(j.reply || j.answer || "Echo AURION couldn't find an answer.");
    } catch (e) {
      setLlmAnswer("Knowledge base unavailable. Try a panel name like 'inventory', 'schedule', or 'culinary'.");
    } finally {
      setLlmLoading(false);
    }
  };

  const run = (s: Suggestion) => {
    setOpen(false);
    Promise.resolve(s.run()).catch(() => {});
  };

  return (
    <>
      <AmbientHalo state={echoState} />

      {/* Launcher pill — bottom-right, minimal, keyboard-first */}
      <button
        onClick={() => setOpen(true)}
        style={launcherStyle}
        data-testid="echo-cmd-launcher"
        title="Echo · ⌘K"
      >
        <span style={{ fontSize: 10, letterSpacing: 1, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" }}>Echo</span>
        <span style={{ color: "#64748b", fontSize: 11, fontFamily: "monospace" }}>⌘K</span>
      </button>

      {/* Tape toggle — right-edge tab (iter6 · raised z-index + 6px inset from edge so it never gets clipped under panel chrome) */}
      <button
        onClick={() => setTapeOpen((v) => !v)}
        style={{ ...tapeToggleStyle, right: tapeOpen ? 346 : 6 }}
        data-testid="echo-tape-toggle"
        title="Toggle Echo activity tape"
      >
        <span style={{ writingMode: "vertical-rl", fontSize: 10, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" }}>
          {tapeOpen ? "Hide Activity" : "Echo Activity"}
        </span>
      </button>

      {tapeOpen && <EventTape tape={tape} onClose={() => setTapeOpen(false)} onClear={() => echoBus.clearTape()} />}

      {open && (
        <div style={paletteBg} onClick={() => setOpen(false)} data-testid="echo-cmd-palette">
          <div style={paletteCard} onClick={(e) => e.stopPropagation()}>
            <div style={paletteHeader}>
              <span style={{ color: "#c8a97e", fontSize: 11, letterSpacing: 2, fontWeight: 700, textTransform: "uppercase" }}>Echo</span>
              <span style={{ color: "#64748b", fontSize: 11 }}>·  command palette</span>
              <span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: 11 }}>state: {echoState}</span>
            </div>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type what you want Echo to do…"
              style={paletteInput}
              data-testid="echo-cmd-input"
              onKeyDown={(e) => {
                if (e.key === "Enter" && suggestions[0]) { e.preventDefault(); run(suggestions[0]); }
              }}
            />
            <div style={suggestionList}>
              {suggestions.length === 0 && (
                <div style={{ padding: 14, fontSize: 13 }}>
                  {!llmAnswer && !llmLoading && (
                    <>
                      <div style={{ color: "#cbd5e1", marginBottom: 8 }}>
                        No panel matches “{query}”. Ask Echo AURION instead:
                      </div>
                      <button
                        onClick={askEchoAurion}
                        data-testid="echo-cmd-ask-aurion"
                        style={{
                          padding: "8px 14px", background: "rgba(168,85,247,0.18)",
                          border: "1px solid rgba(168,85,247,0.4)", color: "#e9d5ff",
                          borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        Ask Echo AURION · “{query}”
                      </button>
                    </>
                  )}
                  {llmLoading && <div style={{ color: "#94a3b8" }}>Echo AURION is thinking…</div>}
                  {llmAnswer && (
                    <div data-testid="echo-cmd-llm-answer" style={{
                      color: "#e2e8f0", whiteSpace: "pre-wrap", lineHeight: 1.55,
                      borderLeft: "2px solid rgba(168,85,247,0.5)", paddingLeft: 12,
                    }}>{llmAnswer}</div>
                  )}
                </div>
              )}
              {suggestions.map((s, i) => (
                <button key={s.id} onClick={() => run(s)} style={{ ...suggestionRow, ...(i === 0 ? activeSuggestion : {}) }} data-testid={`echo-cmd-suggestion-${s.id}`}>
                  <span style={{ fontSize: 14, color: "#f8fafc", fontWeight: 600 }}>{s.label}</span>
                  {s.hint && <span style={{ fontSize: 12, color: "#64748b", marginLeft: 8 }}>{s.hint}</span>}
                  {i === 0 && <span style={{ marginLeft: "auto", color: "#c8a97e", fontSize: 10, fontFamily: "monospace", padding: "2px 6px", border: "1px solid rgba(200,169,126,0.3)", borderRadius: 4 }}>↵</span>}
                </button>
              ))}
            </div>
            <div style={{ padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: 11, color: "#64748b", display: "flex", gap: 14 }}>
              <span>↑↓ navigate</span>
              <span>↵ run</span>
              <span>esc close</span>
              <span style={{ marginLeft: "auto", color: "#c8a97e" }}>{tape.length} events on tape</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AmbientHalo({ state }: { state: EchoState }) {
  const color =
    state === "thinking" ? "rgba(200,169,126,0.35)" :
    state === "acting"   ? "rgba(56,189,248,0.45)" :
    state === "success"  ? "rgba(34,197,94,0.45)" :
    state === "attention"? "rgba(239,68,68,0.55)" :
    "transparent";
  const active = state !== "idle";
  return (
    <div style={{
      position: "fixed", inset: 0, pointerEvents: "none",
      boxShadow: active ? `inset 0 0 0 2px ${color}, inset 0 0 80px ${color}` : "none",
      transition: "box-shadow 500ms ease-out",
      zIndex: 2147482700,
    }} data-testid="echo-ambient-halo" data-state={state} />
  );
}

function EventTape({ tape, onClose, onClear }: { tape: any[]; onClose: () => void; onClear: () => void }) {
  // iter266.18 · pull live Echo AI³ backend activity so the tape isn't empty
  const [backendActivity, setBackendActivity] = React.useState<any[]>([]);
  React.useEffect(() => {
    const load = () => {
      fetch("/api/echo-events-studio/activity-feed?limit=40")
        .then((r) => r.json())
        .then((d) => setBackendActivity(d?.activities || []))
        .catch(() => undefined);
    };
    load();
    const id = setInterval(load, 8_000);
    return () => clearInterval(id);
  }, []);

  // iter267 · Talk-to-Echo Q&A panel — calculus to P&L tutor, mic + TTS
  const [qaOpen, setQaOpen] = React.useState(true);
  const [qaInput, setQaInput] = React.useState("");
  const [qaBusy, setQaBusy] = React.useState(false);
  const [qaError, setQaError] = React.useState<string | null>(null);
  const [qaTurns, setQaTurns] = React.useState<{ id: string; role: "user" | "echo"; text: string; at: number }[]>(() => {
    try {
      const raw = sessionStorage.getItem("echo-qa-turns");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  React.useEffect(() => {
    try { sessionStorage.setItem("echo-qa-turns", JSON.stringify(qaTurns.slice(-30))); } catch {}
  }, [qaTurns]);

  // Voice (Talk-to-Talk) — MediaRecorder → /api/ai3-nlp/transcribe → ask
  const [recording, setRecording] = React.useState(false);
  const [ttsOn, setTtsOn] = React.useState<boolean>(() => {
    try { return sessionStorage.getItem("echo-tts-on") !== "0"; } catch { return true; }
  });
  React.useEffect(() => { try { sessionStorage.setItem("echo-tts-on", ttsOn ? "1" : "0"); } catch {} }, [ttsOn]);
  const recRef = React.useRef<MediaRecorder | null>(null);
  const recChunks = React.useRef<Blob[]>([]);

  const speak = React.useCallback((text: string) => {
    if (!ttsOn) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.04;
      u.pitch = 1.0;
      u.lang = "en-US";
      synth.speak(u);
    } catch {}
  }, [ttsOn]);

  const askEcho = React.useCallback(async (q: string) => {
    const text = (q || "").trim();
    if (!text || qaBusy) return;
    setQaError(null);
    setQaBusy(true);
    const userTurn = { id: `u-${Date.now()}`, role: "user" as const, text, at: Date.now() };
    setQaTurns((prev) => [...prev, userTurn]);
    setQaInput("");
    try {
      const r = await fetch("/api/help-agent/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text }),
      });
      const j = await r.json();
      const reply: string = j?.reply || "Echo AURION couldn't find an answer.";
      setQaTurns((prev) => [...prev, { id: `e-${Date.now()}`, role: "echo", text: reply, at: Date.now() }]);
      speak(reply.replace(/[#*_`>\-]+/g, " "));
    } catch (e: any) {
      setQaError("Knowledge base unavailable — check backend connection.");
    } finally {
      setQaBusy(false);
    }
  }, [qaBusy, speak]);

  const startRec = React.useCallback(async () => {
    setQaError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recChunks.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) recChunks.current.push(e.data); };
      mr.onstop = async () => {
        try {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(recChunks.current, { type: mime || "audio/webm" });
          if (blob.size < 800) { setRecording(false); return; }
          setQaBusy(true);
          const fd = new FormData();
          fd.append("file", blob, "voice.webm");
          const r = await fetch("/api/ai3-nlp/transcribe", { method: "POST", body: fd });
          const j = await r.json();
          const tx: string = (j?.text || "").trim();
          setRecording(false);
          if (tx) await askEcho(tx);
          else { setQaError("Couldn't hear you — try again."); setQaBusy(false); }
        } catch (e: any) {
          setRecording(false);
          setQaError("Transcription failed.");
          setQaBusy(false);
        }
      };
      recRef.current = mr;
      mr.start();
      setRecording(true);
    } catch (e: any) {
      setQaError("Microphone blocked — allow permission and retry.");
    }
  }, [askEcho]);

  const stopRec = React.useCallback(() => {
    try { recRef.current?.stop(); } catch {}
  }, []);

  // Merge: frontend tape (UI actions) + backend Echo AI³ activity, newest first
  const merged = [
    ...tape.map((e: any) => ({
      ...e, source: "frontend",
      at_ms: typeof e.at === "string" ? Date.parse(e.at) : (e.at || 0),
    })),
    ...backendActivity.map((a: any) => ({
      id: a.id, label: a.summary,
      detail: `${a.actor} · ${a.kind}${a.target_id ? ` · ${a.target_id}` : ""}`,
      outcome: a.status === "ok" ? "success" : a.status === "error" ? "error" : a.status === "warn" ? "awaiting-review" : "pending",
      at: a.created_at, source: "echo-ai-3",
      at_ms: Date.parse(a.created_at || "1970-01-01"),
    })),
  ].sort((a, b) => b.at_ms - a.at_ms);

  return (
    <div style={tapeDrawer} data-testid="echo-event-tape">
      <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" }}>Echo · activity</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{merged.length} events · ask Echo anything below</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button onClick={onClear} style={mini} data-testid="echo-tape-clear">Clear</button>
          <button onClick={onClose} style={mini}>Close</button>
        </div>
      </div>

      {/* iter267 · Talk to Echo — collapsible Q&A composer at top of drawer */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(200,169,126,0.04)" }} data-testid="echo-qa-panel">
        <button
          onClick={() => setQaOpen((v) => !v)}
          style={{ width: "100%", padding: "10px 16px", background: "transparent", border: 0, color: "#c8a97e", fontSize: 11, letterSpacing: 1.5, fontWeight: 700, textTransform: "uppercase", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
          data-testid="echo-qa-toggle"
        >
          <span>{qaOpen ? "▾" : "▸"}</span>
          <span>Ask Echo AURION · Calculus → P&L → How-to</span>
          <span style={{ marginLeft: "auto", color: "#64748b", fontSize: 10 }}>{qaTurns.length} turns</span>
        </button>
        {qaOpen && (
          <div style={{ padding: "0 12px 12px" }}>
            <div style={{ maxHeight: 220, overflowY: "auto", marginBottom: 8, paddingRight: 4 }} data-testid="echo-qa-transcript">
              {qaTurns.length === 0 && (
                <div style={{ padding: "10px 4px", color: "#64748b", fontSize: 11, lineHeight: 1.55 }}>
                  Try: <em>“teach me how to read a P&amp;L”</em>, <em>“what's a 409A”</em>, <em>“derivative of x² · sin(x)”</em>, <em>“where do I find ingredient cost”</em>.
                </div>
              )}
              {qaTurns.map((t) => (
                <div key={t.id} data-testid={`echo-qa-turn-${t.role}`} style={{
                  margin: "6px 0",
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: t.role === "user" ? "rgba(56,189,248,0.08)" : "rgba(200,169,126,0.06)",
                  borderLeft: `2px solid ${t.role === "user" ? "#38bdf8" : "#c8a97e"}`,
                  fontSize: 12, color: "#e2e8f0", lineHeight: 1.55, whiteSpace: "pre-wrap",
                }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2, color: t.role === "user" ? "#7dd3fc" : "#c8a97e" }}>
                    {t.role === "user" ? "You" : "Echo AURION"}
                  </div>
                  {t.text}
                </div>
              ))}
              {qaBusy && <div style={{ padding: 6, color: "#94a3b8", fontSize: 11 }}>Echo AURION is thinking…</div>}
              {qaError && <div style={{ padding: 6, color: "#fca5a5", fontSize: 11 }} data-testid="echo-qa-error">{qaError}</div>}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                onClick={recording ? stopRec : startRec}
                disabled={qaBusy && !recording}
                title={recording ? "Stop & transcribe" : "Hold to talk (talk-to-talk)"}
                data-testid="echo-qa-mic"
                style={{
                  padding: "8px 10px", borderRadius: 8,
                  border: `1px solid ${recording ? "#ef4444" : "rgba(200,169,126,0.4)"}`,
                  background: recording ? "rgba(239,68,68,0.18)" : "rgba(200,169,126,0.08)",
                  color: recording ? "#fecaca" : "#c8a97e",
                  cursor: "pointer", fontSize: 14, lineHeight: 1,
                }}
              >
                {recording ? "■" : "🎙"}
              </button>
              <input
                value={qaInput}
                onChange={(e) => setQaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && qaInput.trim()) askEcho(qaInput); }}
                placeholder={recording ? "Listening…" : "Ask Echo anything…"}
                data-testid="echo-qa-input"
                style={{
                  flex: 1, padding: "8px 10px", borderRadius: 8,
                  background: "rgba(255,255,255,0.04)", color: "#f8fafc",
                  border: "1px solid rgba(255,255,255,0.08)", outline: "none",
                  fontFamily: "inherit", fontSize: 12,
                }}
              />
              <button
                onClick={() => askEcho(qaInput)}
                disabled={!qaInput.trim() || qaBusy}
                data-testid="echo-qa-send"
                style={{
                  padding: "8px 12px", borderRadius: 8,
                  border: "1px solid rgba(168,85,247,0.4)",
                  background: "rgba(168,85,247,0.18)", color: "#e9d5ff",
                  cursor: "pointer", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase",
                  opacity: (!qaInput.trim() || qaBusy) ? 0.5 : 1,
                }}
              >Ask</button>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 10, color: "#64748b" }}>
              <label style={{ display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }} data-testid="echo-qa-tts-toggle">
                <input type="checkbox" checked={ttsOn} onChange={(e) => setTtsOn(e.target.checked)} />
                <span>Read replies aloud</span>
              </label>
              {qaTurns.length > 0 && (
                <button onClick={() => setQaTurns([])} style={{ background: "transparent", border: 0, color: "#64748b", cursor: "pointer", fontSize: 10 }} data-testid="echo-qa-clear">
                  Clear conversation
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {merged.length === 0 && <div style={{ padding: 20, color: "#64748b", fontSize: 13, textAlign: "center" }}>Echo is idle. Try ⌘K.</div>}
        {merged.map((e) => (
          <div key={`${e.source}-${e.id}`} data-testid={`echo-activity-${e.source}-${e.id}`} style={{
            padding: 10, marginBottom: 6, borderRadius: 8,
            background: "rgba(255,255,255,0.03)",
            borderLeft: `3px solid ${
              e.outcome === "success" ? "#22c55e" :
              e.outcome === "error" ? "#ef4444" :
              e.outcome === "pending" ? "#c8a97e" :
              e.outcome === "awaiting-review" ? "#f59e0b" :
              "#64748b"
            }`,
          }}>
            <div style={{ fontSize: 13, color: "#f8fafc" }}>{e.label}</div>
            {e.detail && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontFamily: "monospace" }}>{e.detail}</div>}
            <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, display: "flex", gap: 6 }}>
              <span>{new Date(e.at).toLocaleTimeString()}</span>
              <span style={{ color: e.source === "echo-ai-3" ? "#c8a97e" : "#64748b", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{e.source}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── styles ───
const launcherStyle: React.CSSProperties = {
  position: "fixed", bottom: 16, right: 16, zIndex: 2147482800,
  padding: "10px 16px", borderRadius: 999,
  background: "rgba(11,16,32,0.92)", border: "1px solid rgba(200,169,126,0.35)",
  color: "#f8fafc", cursor: "pointer",
  display: "flex", gap: 10, alignItems: "center",
  backdropFilter: "blur(12px)", boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
};
const tapeToggleStyle: React.CSSProperties = {
  position: "fixed", top: "50%", transform: "translateY(-50%)", zIndex: 2147483600,
  padding: "22px 4px", background: "rgba(11,16,32,0.9)",
  border: "1px solid rgba(200,169,126,0.25)", borderRight: 0,
  borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
  cursor: "pointer", transition: "right 200ms",
};
const paletteBg: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 2147483100,
  background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
  display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh",
};
const paletteCard: React.CSSProperties = {
  width: "min(640px, 92vw)", background: "#0b1020",
  border: "1px solid rgba(200,169,126,0.35)", borderRadius: 16,
  boxShadow: "0 40px 100px rgba(0,0,0,0.6)", overflow: "hidden",
  fontFamily: "system-ui, sans-serif", color: "#f8fafc",
};
const paletteHeader: React.CSSProperties = {
  padding: "10px 16px", display: "flex", alignItems: "center", gap: 6,
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};
const paletteInput: React.CSSProperties = {
  width: "100%", padding: "16px 18px", fontSize: 18,
  background: "transparent", color: "#f8fafc", border: 0, outline: "none",
  fontFamily: "system-ui",
};
const suggestionList: React.CSSProperties = {
  maxHeight: 360, overflowY: "auto", padding: 4,
};
const suggestionRow: React.CSSProperties = {
  width: "100%", textAlign: "left", padding: "10px 14px",
  background: "transparent", border: 0, cursor: "pointer",
  display: "flex", alignItems: "center", borderRadius: 8,
  color: "#f8fafc", fontFamily: "system-ui",
};
const activeSuggestion: React.CSSProperties = { background: "rgba(200,169,126,0.12)" };
const tapeDrawer: React.CSSProperties = {
  position: "fixed", top: 0, right: 0, bottom: 0, width: 340, zIndex: 2147482900,
  background: "rgba(11,16,32,0.96)", borderLeft: "1px solid rgba(200,169,126,0.25)",
  display: "flex", flexDirection: "column", color: "#f8fafc",
  fontFamily: "system-ui, sans-serif", boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
  backdropFilter: "blur(14px)",
};
const mini: React.CSSProperties = {
  padding: "5px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
  background: "transparent", color: "#cbd5e1", cursor: "pointer", fontSize: 11, fontWeight: 600,
};
