/**
 * EchoCommand SolveBar — global hotkey-driven resolution engine (iter169)
 *
 * Press ⌘J / Ctrl+J from anywhere to open. Type (without looking down):
 *   "room 1201 wants an upgrade"
 *   "mansfield - dinner at sotogrande 8pm window table, it's their anniversary"
 *
 * Echo returns a decisive resolution card with a primary 1-click action,
 * alternatives, and a polished line the concierge can say to the guest.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";

const API = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
};

interface Resolution {
  headline: string;
  root_cause: string;
  recommended_action: { title: string; api_hint: string; prefill?: Record<string, any> };
  alternatives?: { title: string; why?: string }[];
  guest_line?: string;
  confidence?: number;
}

export default function SolveBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [guestHint, setGuestHint] = useState<string | null>(null);
  const [guestMatches, setGuestMatches] = useState<{ id: string; name: string; room: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [guestCache, setGuestCache] = useState<{ id: string; name: string; room: string }[]>([]);

  // Global hotkey
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Cmd/Ctrl + J opens; Esc closes
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) {
      // Pre-warm guest list for fuzzy autocomplete
      fetch(`${API()}/api/guest/profile`).then((r) => r.json()).then((j) => {
        setGuestCache((j.guests || []).map((g: any) => ({ id: g.id, name: g.name, room: g.room })));
      }).catch(() => {});
      setTimeout(() => inputRef.current?.focus(), 50);
      setResolution(null);
      setErr(null);
    }
  }, [open]);

  // Fuzzy match guest inside query as concierge types
  useEffect(() => {
    if (!query || !guestCache.length) { setGuestMatches([]); return; }
    const q = query.toLowerCase();
    const hits = guestCache.filter((g) => q.includes(g.name.split(" ")[0].toLowerCase()) ||
                                          q.includes(g.name.toLowerCase()) ||
                                          q.includes(g.room));
    setGuestMatches(hits.slice(0, 5));
    if (hits.length && !guestHint) setGuestHint(hits[0].id);
  }, [query, guestCache]);

  async function solve() {
    if (!query.trim()) return;
    setLoading(true); setErr(null); setResolution(null);
    try {
      const r = await fetch(`${API()}/api/concierge-v2/solve`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), guest_hint: guestHint || null }),
      });
      if (!r.ok) throw new Error((await r.text()).slice(0, 240));
      const j = await r.json();
      setResolution(j.resolution);
    } catch (e: any) { setErr(e?.message || "Solve failed"); }
    finally { setLoading(false); }
  }

  async function executePrimary() {
    if (!resolution || !guestHint) return;
    const hint = resolution.recommended_action.api_hint;
    const prefill = resolution.recommended_action.prefill || {};
    try {
      let url = "", body: any = { guest_id: guestHint, ...prefill };
      switch (hint) {
        case "dining/reserve":    url = "/api/concierge-v2/dining/reserve"; break;
        case "transport/request": url = "/api/concierge-v2/transport/request"; break;
        case "celebration/compose": url = "/api/concierge-v2/celebration/compose"; break;
        case "recovery/open":     url = "/api/concierge-v2/recovery/open"; break;
        case "ird-amenity":
          url = "/api/concierge-v2/request/create";
          body = { guest_id: guestHint, kind: "other", summary: resolution.recommended_action.title, priority: "normal", notes: JSON.stringify(prefill) };
          break;
        case "room-upgrade":
          url = "/api/concierge-v2/request/create";
          body = { guest_id: guestHint, kind: "other", summary: `Room upgrade: ${resolution.recommended_action.title}`, priority: "high", notes: JSON.stringify(prefill) };
          break;
        default:
          url = "/api/concierge-v2/request/create";
          body = { guest_id: guestHint, kind: "other", summary: resolution.recommended_action.title, priority: "normal", notes: resolution.guest_line || "" };
      }
      const r = await fetch(`${API()}${url}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error(await r.text());
      // Show a success toast-ish state then close
      setErr(null);
      setResolution({ ...resolution, headline: "✓ Executed — " + resolution.headline });
      setTimeout(() => setOpen(false), 1200);
    } catch (e: any) { setErr("Execute failed: " + (e?.message || "").slice(0, 200)); }
  }

  if (!open) {
    return (
      <button
        data-testid="solve-bar-launcher"
        onClick={() => setOpen(true)}
        style={launcherBtn}
        title="EchoCommand SolveBar (⌘J)"
      >
        ⌘J · Solve
      </button>
    );
  }

  return (
    <div data-testid="solve-bar" style={backdrop} onClick={() => setOpen(false)}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <header style={panelHeader}>
          <div>
            <div style={eyebrow}>EchoCommand · SolveBar</div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>Type without looking down. Guest name/room + the problem.</div>
          </div>
          <span style={{ fontSize: 10, color: "#64748b" }}>⌘J · Esc to close</span>
        </header>
        <div style={{ padding: "12px 18px" }}>
          <input
            ref={inputRef}
            data-testid="solve-bar-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !loading) solve(); }}
            placeholder="e.g. &quot;mansfield wants an upgrade&quot; · &quot;room 0808 dinner at sotogrande 8pm window&quot;"
            style={solveInput}
            autoFocus
          />
          {guestMatches.length > 0 && (
            <div data-testid="solve-guest-hits" style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {guestMatches.map((g) => (
                <button key={g.id} data-testid={`solve-guest-${g.id}`} onClick={() => setGuestHint(g.id)} style={{ ...chip, ...(guestHint === g.id ? chipActive : {}) }}>
                  {g.name} · room {g.room}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button data-testid="solve-bar-go" onClick={solve} disabled={loading || !query.trim()} style={primaryBtn}>
              {loading ? "Echo is thinking…" : "✨ Solve"}
            </button>
            <span style={{ fontSize: 11, color: "#64748b", alignSelf: "center" }}>Enter · Echo returns a 1-click resolution</span>
          </div>
          {err && <div data-testid="solve-err" style={errBox}>{err}</div>}

          {resolution && (
            <article data-testid="solve-result" style={resultCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "#c8a97e", fontWeight: 700 }}>
                    {resolution.root_cause} {resolution.confidence ? `· ${Math.round((resolution.confidence || 0) * 100)}% sure` : ""}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#f8fafc", marginTop: 4 }}>{resolution.headline}</div>
                </div>
              </div>
              <div style={primaryActionCard}>
                <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>Recommended · 1 click</div>
                <div style={{ fontSize: 14, color: "#f8fafc", fontWeight: 700, marginTop: 4 }}>{resolution.recommended_action.title}</div>
                <div style={{ fontSize: 10, color: "#64748b", marginTop: 4, fontFamily: "monospace" }}>api: {resolution.recommended_action.api_hint}</div>
                <button data-testid="solve-execute" onClick={executePrimary} disabled={!guestHint} style={{ ...primaryBtn, marginTop: 10 }}>
                  {guestHint ? "▶ Execute now" : "Pick a guest above to execute"}
                </button>
              </div>
              {resolution.guest_line && (
                <div data-testid="solve-guest-line" style={guestLineBox}>
                  <div style={{ fontSize: 9, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>Say to guest</div>
                  <div style={{ fontSize: 13, color: "#f8fafc", fontStyle: "italic", lineHeight: 1.5 }}>"{resolution.guest_line}"</div>
                </div>
              )}
              {resolution.alternatives && resolution.alternatives.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600, marginBottom: 6 }}>If you prefer</div>
                  {resolution.alternatives.map((alt, i) => (
                    <div key={i} style={altRow}>
                      <div style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 600 }}>{alt.title}</div>
                      {alt.why && <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{alt.why}</div>}
                    </div>
                  ))}
                </div>
              )}
            </article>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── styles (CSS-in-JS, high z-index so it sits above everything) ────
const launcherBtn: React.CSSProperties = {
  position: "fixed", bottom: 16, left: 16, zIndex: 2147482850,
  padding: "8px 14px", borderRadius: 999,
  background: "rgba(11,16,32,0.92)", border: "1px solid rgba(200,169,126,0.4)",
  color: "#c8a97e", fontFamily: "monospace", fontSize: 12, fontWeight: 700,
  cursor: "pointer", backdropFilter: "blur(12px)",
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
};
const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 2147483200,
  background: "rgba(0,0,0,0.6)", backdropFilter: "blur(10px)",
  display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh",
};
const panel: React.CSSProperties = {
  width: "min(720px, 95vw)", maxHeight: "80vh", overflow: "auto",
  background: "#0b0f1a", border: "1px solid rgba(200,169,126,0.35)", borderRadius: 14,
  boxShadow: "0 30px 80px rgba(0,0,0,0.6)", color: "#f8fafc",
  fontFamily: "'Inter', system-ui, sans-serif",
};
const panelHeader: React.CSSProperties = { padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "flex-start" };
const eyebrow: React.CSSProperties = { fontSize: 10, letterSpacing: 3, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" };
const solveInput: React.CSSProperties = { width: "100%", padding: "12px 14px", background: "rgba(0,0,0,0.4)", border: "1px solid rgba(200,169,126,0.3)", borderRadius: 10, color: "#f8fafc", fontSize: 15, outline: "none", boxSizing: "border-box" };
const chip: React.CSSProperties = { padding: "5px 12px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#94a3b8", fontSize: 11, cursor: "pointer" };
const chipActive: React.CSSProperties = { background: "rgba(200,169,126,0.15)", border: "1px solid rgba(200,169,126,0.5)", color: "#c8a97e", fontWeight: 700 };
const primaryBtn: React.CSSProperties = { padding: "10px 18px", borderRadius: 8, background: "rgba(200,169,126,0.15)", border: "1px solid rgba(200,169,126,0.5)", color: "#c8a97e", fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1 };
const errBox: React.CSSProperties = { marginTop: 10, padding: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#fca5a5", fontSize: 12 };
const resultCard: React.CSSProperties = { marginTop: 14, padding: 14, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10 };
const primaryActionCard: React.CSSProperties = { marginTop: 12, padding: 12, background: "rgba(200,169,126,0.06)", border: "1px solid rgba(200,169,126,0.25)", borderRadius: 8 };
const guestLineBox: React.CSSProperties = { marginTop: 10, padding: 12, background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.22)", borderRadius: 8 };
const altRow: React.CSSProperties = { padding: "8px 10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 6, marginTop: 4 };
