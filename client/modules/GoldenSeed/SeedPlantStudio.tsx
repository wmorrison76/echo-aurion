/**
 * Plant a Seed — Emergent-style split-view Co-Build Studio (iter166)
 *
 * LEFT: conversation thread with EchoAi³ (planting → clarifying Qs → artifacts)
 * RIGHT: live file tree + code viewer + ZARO verdict banner + Download/Finalize
 *
 * Route: /seed/plant
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { adminFetch, ensureAdminToken } from "../../lib/admin-auth";
import { ScreencastRecorder, type RecorderStatus } from "../../lib/screencast";

function backendUrl(): string {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || env.VITE_BACKEND_URL || "";
}

interface Artifact { path: string; content: string; why?: string; }
interface Session {
  id: string; name: string; slug: string; seed_prompt: string;
  status: string; turn: number; finalized: boolean; spawn_id: string | null;
  messages: Array<{ role: string; kind: string; content?: string; parsed?: any; at: string }>;
  artifacts: Artifact[];
  zaro: { verdict: string; per_artifact: any[]; checked_at: string } | null;
}

export default function SeedPlantStudio() {
  const [session, setSession] = useState<Session | null>(null);
  const [seedPrompt, setSeedPrompt] = useState("");
  const [name, setName] = useState("");
  const [reply, setReplyText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedArtifact, setSelectedArtifact] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<ScreencastRecorder | null>(null);
  const [recStatus, setRecStatus] = useState<RecorderStatus>({ state: "idle" });

  useEffect(() => {
    if (!recorderRef.current) recorderRef.current = new ScreencastRecorder();
    const off = recorderRef.current.onStatus(setRecStatus);
    return () => { off && off(); };
  }, []);

  async function startRec() {
    try { await recorderRef.current?.start(session?.slug || "cobuild"); }
    catch (e: any) { setErr(e?.message || "Recorder failed"); }
  }
  async function stopRec() {
    const name = session ? `${session.slug}-build.webm` : "echo-cobuild.webm";
    await recorderRef.current?.stopAndDownload(name);
  }

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [session?.messages?.length]);

  async function plantSeed() {
    if (!seedPrompt.trim() || !name.trim()) { setErr("Name and seed prompt required"); return; }
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`${backendUrl()}/api/seed/plant`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), seed_prompt: seedPrompt.trim() }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setSession(j.session);
    } catch (e: any) { setErr(e?.message?.slice(0, 300) || "Failed to plant seed"); }
    finally { setBusy(false); }
  }

  async function sendReply() {
    if (!session || !reply.trim()) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`${backendUrl()}/api/seed/plant/${session.id}/reply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setSession(j.session);
      setReplyText("");
    } catch (e: any) { setErr(e?.message?.slice(0, 300) || "Failed to send reply"); }
    finally { setBusy(false); }
  }

  async function finalize() {
    if (!session) return;
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`${backendUrl()}/api/seed/plant/${session.id}/finalize`, { method: "POST" });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      setSession(j.session);
      // Download the tarball
      if (j.spawn_id) {
        if (!ensureAdminToken()) { setErr("Admin token required to download"); return; }
        const dl = await adminFetch(`${backendUrl()}/api/seed/download/${j.spawn_id}`);
        if (!dl.ok) throw new Error("Download failed: " + dl.status);
        const blob = await dl.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${session.slug}-bloomed.tar.gz`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      }
    } catch (e: any) { setErr(e?.message?.slice(0, 300) || "Finalize failed"); }
    finally { setBusy(false); }
  }

  const activeArtifact = useMemo(() => {
    if (!session || !selectedArtifact) return null;
    return session.artifacts.find(a => a.path === selectedArtifact) || null;
  }, [session, selectedArtifact]);

  useEffect(() => {
    if (session?.artifacts?.length && !selectedArtifact) setSelectedArtifact(session.artifacts[0].path);
  }, [session?.artifacts?.length]);

  return (
    <div data-testid="seed-plant-studio" style={S.root}>
      {/* Header */}
      <header style={S.header}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 3, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" }}>EchoAi³ · EchoCoder · Co-Build Studio</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f8fafc", marginTop: 2 }}>Plant a seed — watch Echo grow the OS</h1>
        </div>
        <a href="/seed/admin" style={S.ghostLink}>Classic spawn →</a>
        {recStatus.state === "recording" ? (
          <button data-testid="seed-rec-stop" onClick={stopRec} style={{ ...S.primaryBtn, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.5)", color: "#fca5a5" }}>
            ⏹ Stop & download reel
          </button>
        ) : (
          <button data-testid="seed-rec-start" onClick={startRec} style={S.ghostLink}>
            ⏺ Record build reel
          </button>
        )}
      </header>

      {err && <div data-testid="seed-plant-err" style={S.err}>{err}</div>}

      <div style={S.split}>
        {/* LEFT — Conversation */}
        <section style={S.leftPane} data-testid="seed-plant-thread">
          {!session ? (
            <SeedStarter name={name} setName={setName} prompt={seedPrompt} setPrompt={setSeedPrompt} onPlant={plantSeed} busy={busy} />
          ) : (
            <>
              <SeedBadge session={session} />
              <div ref={threadRef} style={S.thread}>
                <ThreadTurn role="builder" kind="seed" text={`Seed: ${session.seed_prompt}`} />
                {session.messages.map((m, i) => (
                  <ThreadTurn
                    key={i}
                    role={m.role === "user" ? "builder" : "echo"}
                    kind={m.kind}
                    text={m.content || m.parsed?.question || m.parsed?.summary || ""}
                    parsed={m.parsed}
                  />
                ))}
              </div>
              {!session.finalized && session.status !== "zaro-blocked" && (
                <div style={S.replyRow}>
                  <input
                    data-testid="seed-plant-reply"
                    value={reply}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !busy) sendReply(); }}
                    placeholder="Answer Echo's question…"
                    style={S.input}
                    disabled={busy}
                  />
                  <button data-testid="seed-plant-send" onClick={sendReply} disabled={busy || !reply.trim()} style={S.primaryBtn}>
                    {busy ? "…" : "Send ↵"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* RIGHT — Live preview */}
        <section style={S.rightPane} data-testid="seed-plant-preview">
          <div style={S.paneHeader}>
            <span style={{ fontSize: 11, letterSpacing: 2, color: "#c8a97e", fontWeight: 700, textTransform: "uppercase" }}>Live scaffold</span>
            {session?.zaro && <ZaroPill verdict={session.zaro.verdict} />}
          </div>
          {!session?.artifacts?.length ? (
            <div style={S.empty}>
              <div style={{ fontSize: 40, opacity: 0.3 }}>🌱</div>
              <div style={{ marginTop: 12, fontSize: 13, color: "#94a3b8" }}>Artifacts will appear here once Echo has enough context.</div>
              <div style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>Usually after 1–2 clarifying questions.</div>
            </div>
          ) : (
            <div style={S.previewBody}>
              <aside style={S.fileTree}>
                {session.artifacts.map((a) => (
                  <button
                    key={a.path}
                    data-testid={`seed-file-${a.path.replace(/[^a-zA-Z0-9]/g, "-")}`}
                    onClick={() => setSelectedArtifact(a.path)}
                    style={{ ...S.fileRow, ...(selectedArtifact === a.path ? S.fileRowActive : {}) }}
                    title={a.why}
                  >
                    <span style={{ fontSize: 12, fontFamily: "monospace" }}>{a.path}</span>
                  </button>
                ))}
              </aside>
              <div style={S.codeViewer}>
                {activeArtifact ? (
                  <>
                    <div style={S.codeHeader}>
                      <span style={{ fontFamily: "monospace", fontSize: 13, color: "#c8a97e" }}>{activeArtifact.path}</span>
                      {activeArtifact.why && <span style={{ marginLeft: 14, fontSize: 11, color: "#94a3b8" }}>{activeArtifact.why}</span>}
                    </div>
                    <pre style={S.code} data-testid="seed-artifact-content">
                      {activeArtifact.content}
                    </pre>
                  </>
                ) : <div style={S.empty}>Select a file</div>}
              </div>
            </div>
          )}

          {session?.artifacts?.length && !session.finalized && session.zaro?.verdict !== "block" && (
            <div style={S.footer}>
              <button data-testid="seed-plant-finalize" onClick={finalize} disabled={busy} style={{ ...S.primaryBtn, fontSize: 13 }}>
                {busy ? "Finalizing…" : "✨ Finalize & download OS"}
              </button>
            </div>
          )}
          {session?.finalized && session.spawn_id && (
            <div style={S.footer}>
              <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 600 }}>✓ Bloomed · spawn {session.spawn_id}</span>
              <a href="/seed/admin" style={{ marginLeft: 12, fontSize: 12, color: "#c8a97e" }}>View all spawns →</a>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────
function SeedStarter({ name, setName, prompt, setPrompt, onPlant, busy }: any) {
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>Give your platform a name</div>
        <input
          data-testid="seed-plant-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. WineryOS, HotelFlow, ChefConcierge"
          style={S.input}
        />
      </div>
      <div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 6 }}>What do you want to build? (the seed)</div>
        <textarea
          data-testid="seed-plant-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="I want to build a SaaS for [who] to [do what]. The special sauce is [your unique angle]."
          style={{ ...S.input, minHeight: 140, fontFamily: "inherit", resize: "vertical" }}
        />
      </div>
      <button data-testid="seed-plant-start" onClick={onPlant} disabled={busy || !name || !prompt} style={{ ...S.primaryBtn, alignSelf: "flex-start" }}>
        {busy ? "Planting…" : "🌱 Plant seed"}
      </button>
      <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
        Echo will ask 1–2 sharp clarifying questions, then grow a scaffold you can download.
        Every artifact is gated by <strong style={{ color: "#c8a97e" }}>ZARO Guardian</strong>.
      </div>
    </div>
  );
}

function SeedBadge({ session }: { session: Session }) {
  const statusColor = session.status === "bloomed" ? "#22c55e" : session.status === "zaro-blocked" ? "#ef4444" : "#c8a97e";
  return (
    <div style={S.badgeRow}>
      <span style={{ fontSize: 10, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>Seed · {session.name}</span>
      <span style={{ fontSize: 10, color: statusColor, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>· {session.status} · turn {session.turn}</span>
    </div>
  );
}

function ThreadTurn({ role, kind, text, parsed }: { role: "builder" | "echo"; kind: string; text: string; parsed?: any }) {
  const isEcho = role === "echo";
  return (
    <div style={{ padding: "10px 14px", borderLeft: `3px solid ${isEcho ? "#c8a97e" : "#38bdf8"}`, background: isEcho ? "rgba(200,169,126,0.04)" : "rgba(56,189,248,0.04)", marginBottom: 8, borderRadius: 6 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: isEcho ? "#c8a97e" : "#38bdf8", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
        {isEcho ? "Echo" : "Builder"} · {kind}
      </div>
      <div style={{ fontSize: 13, color: "#f8fafc", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{text}</div>
      {parsed?.hint && <div style={{ marginTop: 6, fontSize: 11, color: "#94a3b8", fontStyle: "italic" }}>Why: {parsed.hint}</div>}
      {parsed?.options && parsed.options.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {parsed.options.map((o: string, i: number) => (
            <span key={i} style={{ fontSize: 11, padding: "2px 8px", background: "rgba(200,169,126,0.1)", border: "1px solid rgba(200,169,126,0.25)", borderRadius: 12, color: "#c8a97e" }}>{o}</span>
          ))}
        </div>
      )}
      {kind === "artifacts" && parsed?.next_step && (
        <div style={{ marginTop: 8, padding: 8, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 6, fontSize: 11, color: "#86efac" }}>
          Next: {parsed.next_step}
        </div>
      )}
    </div>
  );
}

function ZaroPill({ verdict }: { verdict: string }) {
  const v = verdict as "pass" | "warn" | "block";
  const palette = { pass: { bg: "rgba(34,197,94,0.12)", fg: "#22c55e", label: "ZARO ✓ pass" }, warn: { bg: "rgba(245,158,11,0.12)", fg: "#f59e0b", label: "ZARO ⚠ warn" }, block: { bg: "rgba(239,68,68,0.12)", fg: "#ef4444", label: "ZARO ✕ blocked" } };
  const p = palette[v] || palette.pass;
  return (
    <span data-testid={`zaro-pill-${v}`} style={{ fontSize: 10, padding: "3px 10px", background: p.bg, color: p.fg, borderRadius: 999, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
      {p.label}
    </span>
  );
}

// ─── styles ───
const S: Record<string, React.CSSProperties> = {
  root: { height: "100vh", display: "flex", flexDirection: "column", background: "#04060d", color: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif" },
  header: { padding: "14px 22px", borderBottom: "1px solid rgba(200,169,126,0.15)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  err: { padding: "10px 18px", background: "rgba(239,68,68,0.08)", borderBottom: "1px solid rgba(239,68,68,0.3)", color: "#fecaca", fontSize: 12 },
  split: { flex: 1, display: "grid", gridTemplateColumns: "minmax(360px, 1fr) minmax(0, 1.6fr)", minHeight: 0, overflow: "hidden" },
  leftPane: { borderRight: "1px solid rgba(200,169,126,0.15)", display: "flex", flexDirection: "column", minHeight: 0, background: "rgba(255,255,255,0.02)" },
  rightPane: { display: "flex", flexDirection: "column", minHeight: 0, background: "#040711" },
  paneHeader: { padding: "10px 16px", borderBottom: "1px solid rgba(200,169,126,0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" },
  badgeRow: { padding: "8px 16px", borderBottom: "1px solid rgba(200,169,126,0.08)", display: "flex", gap: 8 },
  thread: { flex: 1, overflowY: "auto", padding: "12px 16px", minHeight: 0 },
  replyRow: { padding: 12, borderTop: "1px solid rgba(200,169,126,0.12)", display: "flex", gap: 8 },
  previewBody: { flex: 1, display: "grid", gridTemplateColumns: "220px 1fr", minHeight: 0, overflow: "hidden" },
  fileTree: { borderRight: "1px solid rgba(255,255,255,0.05)", padding: 8, overflowY: "auto", background: "rgba(0,0,0,0.2)" },
  fileRow: { display: "block", width: "100%", padding: "8px 10px", background: "transparent", border: 0, color: "#cbd5e1", textAlign: "left", cursor: "pointer", borderRadius: 6, marginBottom: 3 },
  fileRowActive: { background: "rgba(200,169,126,0.1)", color: "#c8a97e" },
  codeViewer: { display: "flex", flexDirection: "column", minHeight: 0 },
  codeHeader: { padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" },
  code: { flex: 1, overflow: "auto", padding: 16, margin: 0, background: "#01030a", color: "#e2e8f0", fontSize: 12, fontFamily: "'Fira Code', monospace", lineHeight: 1.6, whiteSpace: "pre-wrap" },
  empty: { padding: 40, textAlign: "center", color: "#64748b" },
  footer: { padding: "10px 16px", borderTop: "1px solid rgba(200,169,126,0.12)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 },
  input: { width: "100%", padding: "10px 14px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#f8fafc", fontSize: 14, outline: "none", boxSizing: "border-box" },
  primaryBtn: { padding: "10px 18px", borderRadius: 8, background: "rgba(200,169,126,0.15)", border: "1px solid rgba(200,169,126,0.45)", color: "#c8a97e", fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" },
  ghostLink: { fontSize: 12, color: "#94a3b8", textDecoration: "none", padding: "6px 12px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6 },
};
