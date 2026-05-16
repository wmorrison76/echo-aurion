/**
 * iter213 · EchoWaste Mobile — v1.2 Phase 1 full capture surface
 *
 * Implements:
 *   F1 · Buffet pre-cost estimation (post-Set card + overcover nudge)
 *   F2 · Cost-per-cover calculation (Close flow + guest-count modal)
 *   F3 · Plus-sign multi-zone scanning
 *   Needs-Review surfacing (operator-test Week 2)
 *   EchoAi³ suggested-recipe approval banner
 *   Ground-truth labelled ingest
 *
 * Backend contract: /api/waste/{capture,buffet,entries,recipes,review,training}/*
 */
import React from "react";

type Mode = "video" | "still" | "buffet_set" | "buffet_close" | "buffet_refill" | "ground_truth" | "draft_recipe" | "live_camera";
type ZoneDraft = { key: string; zone_name: string; base64: string; label?: string };

const API_ROOT = (): string => {
  const env = (import.meta as any).env || {};
  return env.VITE_REACT_APP_BACKEND_URL || env.REACT_APP_BACKEND_URL || "";
};

const CATEGORIES = ["protein", "pastry", "produce", "beverages", "dairy", "sundries"] as const;
const CAT_EMOJI: Record<string, string> = {
  protein: "🥩", pastry: "🥐", produce: "🥬",
  beverages: "☕", dairy: "🥛", sundries: "📦",
};

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > 4_000_000) { reject(new Error("Image too large (>4MB)")); return; }
    const r = new FileReader();
    r.onerror = () => reject(r.error);
    r.onload = () => resolve(String(r.result || ""));
    r.readAsDataURL(file);
  });
}

export function WasteTab({ token }: { token: string }) {
  const [mode, setMode] = React.useState<Mode>("video");
  const [busy, setBusy] = React.useState(false);
  const [flash, setFlash] = React.useState<string | null>(null);
  const [entry, setEntry] = React.useState<any>(null);
  const [items, setItems] = React.useState<any[]>([]);
  const [zones, setZones] = React.useState<any[]>([]);
  const [zoneDrafts, setZoneDrafts] = React.useState<ZoneDraft[]>([]);
  const [session, setSession] = React.useState<any>(null);           // active buffet session
  const [guestModal, setGuestModal] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<any[]>([]);   // pending chef approval
  const [pendingReview, setPendingReview] = React.useState<number>(0);
  const [online, setOnline] = React.useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queued, setQueued] = React.useState<number>(0);
  const fileInput = React.useRef<HTMLInputElement | null>(null);
  const zoneInput = React.useRef<HTMLInputElement | null>(null);
  const [zoneNameDraft, setZoneNameDraft] = React.useState("");
  const [videoProgress, setVideoProgress] = React.useState<{ pct: number; msg: string } | null>(null);
  const videoInput = React.useRef<HTMLInputElement | null>(null);
  // iter216 · Progressive analysis Stage-1 (fingerprint) preliminary result
  const [preliminary, setPreliminary] = React.useState<any>(null);

  const showFlash = (m: string) => { setFlash(m); setTimeout(() => setFlash(null), 3000); };

  // ── Offline queue pill & sync ──
  async function refreshQueue() {
    try {
      const m = await import("@/lib/waste-offline");
      setQueued(await m.queueCount());
    } catch { setQueued(0); }
  }
  async function syncNow() {
    try {
      const m = await import("@/lib/waste-offline");
      const r = await m.flushWasteQueue(API_ROOT());
      if (r.flushed > 0) showFlash(`Synced ${r.flushed} capture${r.flushed === 1 ? "" : "s"}`);
      await refreshQueue();
    } catch (e: any) { showFlash(`Sync error · ${e?.message || e}`); }
  }

  // ── Review queue + suggestions bootstrap ──
  async function refreshSuggestions() {
    try {
      const r = await fetch(`${API_ROOT()}/api/waste/recipes/suggested`).then(r => r.json());
      setSuggestions(r?.suggestions || []);
    } catch { /* silent */ }
  }
  async function refreshReviewQueue() {
    try {
      const r = await fetch(`${API_ROOT()}/api/waste/review/pending`).then(r => r.json());
      setPendingReview(r?.count || 0);
    } catch { /* silent */ }
  }

  React.useEffect(() => {
    void refreshQueue();
    void refreshSuggestions();
    void refreshReviewQueue();
    const onOnline = () => { setOnline(true); void syncNow(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Core capture → sends base64, optionally with zones, and threads the session ──
  async function runCapture(base64: string) {
    setBusy(true);
    setPreliminary(null);
    try {
      const clientId = `mob-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const traceId = `tr-${Math.random().toString(36).slice(2, 10)}`;

      // iter216+221 · Progressive Stage-1 · kick off fingerprint preliminary
      // in parallel (non-blocking). Fire for every capture mode EXCEPT the
      // text-only draft path and ground_truth (which has a known label).
      if (navigator.onLine && mode !== "ground_truth" && mode !== "draft_recipe") {
        const prelimCapId = `prelim-${clientId}`;
        fetch(`${API_ROOT()}/api/waste/capture/preliminary-from-image`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ capture_id: prelimCapId, media_base64: base64,
                                  property_id: "outlet-main" }),
        }).then(r => r.json()).then(p => {
          // Only show if final result hasn't yet landed (entry still null)
          if (p?.preliminary) setPreliminary(p.preliminary);
        }).catch(() => { /* silent — preliminary is best-effort */ });
      }

      // Offline · queue directly
      if (!navigator.onLine) {
        const m = await import("@/lib/waste-offline");
        await m.enqueueWasteCapture({
          id: clientId,
          endpoint: "/api/waste/capture/still",
          body: { capture_id: `cap-offline-${clientId}`, media_base64: base64,
                  client_id: clientId, trace_id: traceId },
          headers: { "Idempotency-Key": clientId },
        });
        await refreshQueue();
        showFlash("Offline · queued locally");
        return;
      }

      // Init + upload
      const init = await fetch(`${API_ROOT()}/api/waste/capture/init`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "still", user_id: `mobile-${token.slice(0, 6)}` }),
      }).then(r => r.json());
      const cap = init.capture_id;

      const payload: any = {
        capture_id: cap, media_base64: base64,
        client_id: clientId, trace_id: traceId,
        user_id: `mobile-${token.slice(0, 6)}`,
      };
      if (zoneDrafts.length > 0) {
        payload.zones = zoneDrafts.map((z, i) => ({
          zone_name: z.zone_name || (i === 0 ? "Main" : ""),
          media_base64: z.base64,
        }));
        // The primary image counts as zone #1 when zones are present
        payload.zones.unshift({ zone_name: "Main", media_base64: base64 });
        delete payload.media_base64; // zones take precedence
      }
      if (session?.session_id && mode === "buffet_close") {
        payload.buffet_session_id = session.session_id;
      }

      const resp = await fetch(`${API_ROOT()}/api/waste/capture/still`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": clientId },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try { const j = await resp.json(); detail = j?.detail || detail; } catch { /* noop */ }
        showFlash(`✕ ${detail.slice(0, 140)}`);
        return;
      }
      const respJson = await resp.json();
      if (!respJson?.ok) { showFlash("Capture failed — no items detected"); return; }

      setEntry({
        entry_id: respJson.entry_id, total_cost: respJson.total_cost, vision_mode: respJson.vision_mode,
        cost_breakdown: respJson.cost_breakdown, zone_count: respJson.zone_count,
        needs_review: respJson.needs_review, capture_id: cap,
      });
      setItems(respJson.items || []);
      setZones(respJson.zones || []);
      setZoneDrafts([]);
      setPreliminary(null); // final arrived — clear prelim
      void refreshSuggestions(); void refreshReviewQueue();

      // Buffet flow orchestration
      if (mode === "buffet_set") {
        const s = await fetch(`${API_ROOT()}/api/waste/buffet/set`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            outlet_id: "outlet-main", service_name: "breakfast",
            capture_id: cap, entry_id: respJson.entry_id,
          }),
        }).then(r => r.json());
        if (s?.ok) {
          setSession(s.session);
          showFlash(`Set · $${s.session.set_cost_usd?.toFixed(2) || "0.00"} · covers ~${s.session.estimated_covers_at_setup ?? 0}`);
        }
      } else if (mode === "buffet_refill" && session?.session_id) {
        const r = await fetch(`${API_ROOT()}/api/waste/buffet/${session.session_id}/refill`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: session.session_id, capture_id: cap, entry_id: respJson.entry_id,
            notes: "mobile refill",
          }),
        }).then(r => r.json());
        if (r?.ok) {
          setSession(r.session);
          showFlash(`Refill #${r.session.refill_count} · +$${Number(r.session.refill_cost_usd || 0).toFixed(2)}`);
        }
      } else if (mode === "buffet_close" && session?.session_id) {
        const c = await fetch(`${API_ROOT()}/api/waste/buffet/close`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: session.session_id, close_capture_id: cap, close_entry_id: respJson.entry_id,
          }),
        }).then(r => r.json());
        if (c?.ok) {
          setSession(c.session);
          setGuestModal(true);        // Feature 2 · require guest count before we surface cost-per-cover
        }
      } else {
        showFlash(`Logged · ${(respJson.items || []).length} items · $${respJson.total_cost}`);
      }
    } catch (e: any) {
      showFlash(`Error · ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  async function onMainFile(f: File) {
    try {
      if (mode === "video") {
        await runVideoCapture(f);
        return;
      }
      const b64 = await fileToBase64(f);
      if (mode === "ground_truth") {
        // Ground-truth ingest: stores labelled sample for offline tuning
        const r = await fetch(`${API_ROOT()}/api/waste/training/labelled`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            capture_id: `gt-${Date.now()}`, media_base64: b64,
            outlet_id: "outlet-main", user_id: `mobile-${token.slice(0, 6)}`,
            labels: [], notes: "operator-test week 2 · ground truth",
          }),
        }).then(r => r.json());
        if (r?.ok) showFlash(`Ground-truth saved · ${r.ground_truth_id}`);
        else showFlash("Ground-truth save failed");
        return;
      }
      await runCapture(b64);
    } catch (e: any) { showFlash(`Error · ${e?.message || e}`); }
  }

  // iter215 · Video → frames → MOT pipeline (no mocks)
  async function runVideoCapture(file: File) {
    setBusy(true);
    setPreliminary(null);
    setVideoProgress({ pct: 0, msg: "Preparing…" });
    try {
      const { extractFrames } = await import("@/lib/waste-video");
      const { frames, duration_ms } = await extractFrames(file, {
        targetFrames: 6, maxWidth: 1280, jpegQuality: 0.82,
        onProgress: (pct, msg) => setVideoProgress({ pct, msg }),
      });
      if (frames.length === 0) throw new Error("no frames extracted");

      // iter216 · Progressive Stage-1 · fire fingerprint query on middle frame
      if (navigator.onLine && frames.length >= 1) {
        const mid = frames[Math.floor(frames.length / 2)];
        fetch(`${API_ROOT()}/api/waste/capture/preliminary-from-image`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ capture_id: `prelim-vid-${Date.now()}`,
                                  media_base64: mid.image_base64,
                                  property_id: "outlet-main" }),
        }).then(r => r.json()).then(p => {
          if (p?.preliminary) setPreliminary(p.preliminary);
        }).catch(() => { /* silent */ });
      }

      setVideoProgress({ pct: 96, msg: `Sending ${frames.length} frames to Echo Vision…` });
      const clientId = `mob-vid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const traceId = `tr-${Math.random().toString(36).slice(2, 10)}`;
      const init = await fetch(`${API_ROOT()}/api/waste/capture/init`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "video", user_id: `mobile-${token.slice(0, 6)}` }),
      }).then(r => r.json());

      const resp = await fetch(`${API_ROOT()}/api/waste/capture/video-mot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": clientId },
        body: JSON.stringify({
          capture_id: init.capture_id,
          frames: frames.map(fr => ({
            frame_index: fr.frame_index,
            timestamp_ms: fr.timestamp_ms,
            image_base64: fr.image_base64,
          })),
          duration_ms,
          client_id: clientId, trace_id: traceId,
          telemetry: { device: navigator.userAgent.slice(0, 80) },
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText.slice(0, 160) || `HTTP ${resp.status}`);
      }
      const j = await resp.json();
      setEntry({
        entry_id: j.entry_id, total_cost: j.total_cost, vision_mode: j.vision_mode,
        cost_breakdown: j.cost_breakdown, zone_count: j.zone_count,
        needs_review: j.needs_review, capture_id: init.capture_id,
        frames_analysed: j.frames_analysed,
      });
      setItems(j.items || []);
      setZones([]);
      setPreliminary(null);
      void refreshSuggestions(); void refreshReviewQueue();
      showFlash(`Video · ${j.frames_analysed} frames · ${(j.items || []).length} items · $${j.total_cost}`);
    } catch (e: any) {
      showFlash(`Video error · ${e?.message || e}`);
    } finally {
      setVideoProgress(null);
      setBusy(false);
    }
  }

  const [draftModal, setDraftModal] = React.useState(false);
  const [liveCameraOpen, setLiveCameraOpen] = React.useState(false);

  async function onZoneFile(f: File) {
    try {
      const b64 = await fileToBase64(f);
      const key = `z-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setZoneDrafts(prev => [...prev, {
        key, base64: b64, zone_name: zoneNameDraft.trim(),
        label: zoneNameDraft.trim() || `Auto zone #${prev.length + 2}`,
      }]);
      setZoneNameDraft("");
    } catch (e: any) { showFlash(`Error · ${e?.message || e}`); }
  }

  // ── Recipe suggestion approval ──
  async function approveSuggestion(s: any) {
    const r = await fetch(`${API_ROOT()}/api/waste/recipes/suggested/${encodeURIComponent(s.recipe_id)}/approve`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipe_id: s.recipe_id }),
    }).then(r => r.json()).catch(() => null);
    if (r?.ok) { showFlash(`Approved · ${s.name}`); await refreshSuggestions(); }
    else showFlash("Approve failed");
  }
  async function rejectSuggestion(s: any) {
    const r = await fetch(`${API_ROOT()}/api/waste/recipes/suggested/${encodeURIComponent(s.recipe_id)}/reject?reason=not_a_recipe`,
      { method: "POST" }).then(r => r.json()).catch(() => null);
    if (r?.ok) { showFlash(`Rejected · ${s.name}`); await refreshSuggestions(); }
    else showFlash("Reject failed");
  }

  // ── Guest count submit (Feature 2) ──
  async function submitGuestCount(count: number, source: "manual" | "group_block_plus_manual") {
    if (!session?.session_id) return;
    const r = await fetch(`${API_ROOT()}/api/waste/buffet/${session.session_id}/guest-count`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_count: count, source }),
    }).then(r => r.json()).catch(() => null);
    if (r?.ok) {
      setSession(r.session);
      setGuestModal(false);
      showFlash(`Cost/cover · $${r.session.cost_per_cover_total_usd?.toFixed(2) || "0.00"}`);
    } else {
      showFlash("Guest count save failed");
    }
  }

  const catBadge = (cat: string, value: number, total: number) => {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    const emoji = CAT_EMOJI[cat] || "•";
    return (
      <div key={cat} data-testid={`waste-cat-${cat}`} style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 10px", borderRadius: 8,
        background: value > 0 ? "rgba(200,169,126,0.10)" : "rgba(30,41,59,0.4)",
        border: `1px solid ${value > 0 ? "rgba(200,169,126,0.3)" : "rgba(148,163,184,0.15)"}`,
        fontSize: 11, color: value > 0 ? "#f5efe4" : "#64748b",
      }}>
        <span>{emoji}</span>
        <span style={{ textTransform: "capitalize" }}>{cat}</span>
        <span style={{ fontFamily: "monospace", fontWeight: 700 }}>${value.toFixed(2)}</span>
        <span style={{ color: "#94a3b8" }}>{pct}%</span>
      </div>
    );
  };

  return (
    <div data-testid="waste-tab-root" style={{ padding: "16px 16px 100px" }}>
      {/* iter222 · Single-source branding — outer shell owns the ECW label.
         Inline row keeps only the online pill + page h2 for context. */}
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
        <div data-testid="waste-online-pill" style={{
          fontSize: 10, fontFamily: "monospace", padding: "3px 8px", borderRadius: 6,
          background: online ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.14)",
          color: online ? "#6ee7b7" : "#fcd34d",
          border: `1px solid ${online ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.35)"}`,
        }}>
          {online ? "● ONLINE" : "○ OFFLINE"}{queued > 0 ? <span data-testid="waste-queue-count"> · {queued} queued</span> : null}
        </div>
      </div>
      <h2 style={{ fontSize: 24, fontWeight: 200, marginTop: 4, color: "#f5efe4" }}>Capture waste</h2>
      <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
        Live Claude vision · multi-zone · buffet pre-cost &amp; cost-per-cover.
      </p>

      {/* iter213 · Recipe-suggestion approval banner (top priority surface) */}
      {suggestions.length > 0 && (
        <div data-testid="waste-suggestions-banner" style={{
          marginTop: 14, padding: 12, borderRadius: 12,
          background: "linear-gradient(135deg, rgba(168,85,247,0.18), rgba(200,169,126,0.10))",
          border: "1px solid rgba(168,85,247,0.35)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#d8b4fe", fontWeight: 700 }}>ECHO AI³ · RECIPE SUGGESTIONS</div>
              <div style={{ fontSize: 13, color: "#f5efe4", marginTop: 2 }}>
                {suggestions.length} new recipe{suggestions.length > 1 ? "s" : ""} need chef approval
              </div>
            </div>
          </div>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {suggestions.slice(0, 3).map(s => (
              <div key={s.recipe_id} data-testid={`waste-suggestion-${s.recipe_id}`} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
                padding: "6px 10px", borderRadius: 8, background: "rgba(10,14,26,0.5)",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#f5efe4", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name} · <span style={{ color: "#c8a97e" }}>{s.category}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.portion_g}g · ${s.cost?.toFixed?.(2) ?? s.cost} · seen {s.occurrence_count}× · {s.rationale?.slice(0, 40)}
                  </div>
                </div>
                <button data-testid={`waste-suggestion-approve-${s.recipe_id}`} onClick={() => approveSuggestion(s)} style={{
                  padding: "4px 10px", borderRadius: 6, border: 0,
                  background: "rgba(16,185,129,0.25)", color: "#6ee7b7", fontSize: 10, fontWeight: 700,
                }}>✓ Approve</button>
                <button data-testid={`waste-suggestion-reject-${s.recipe_id}`} onClick={() => rejectSuggestion(s)} style={{
                  padding: "4px 10px", borderRadius: 6, border: 0,
                  background: "rgba(239,68,68,0.18)", color: "#fca5a5", fontSize: 10, fontWeight: 700,
                }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Needs-Review indicator (Operator-Test Week 2) */}
      {pendingReview > 0 && (
        <div data-testid="waste-review-pill" style={{
          marginTop: 10, padding: "8px 12px", borderRadius: 10,
          background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.35)",
          color: "#fcd34d", fontSize: 11, display: "flex", alignItems: "center", gap: 8,
        }}>
          <span>⚠</span>
          <span style={{ flex: 1 }}>{pendingReview} capture{pendingReview > 1 ? "s" : ""} flagged for review</span>
          <span style={{ fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: "#94a3b8" }}>OP-TEST</span>
        </div>
      )}

      {/* Mode selector (iter215 · 7 modes · video default) */}
      <div data-testid="waste-mode-selector" style={{
        marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
      }}>
        <ModeTile testid="mode-video" active={mode === "video"} onClick={() => setMode("video")}
          emoji="🎥" label="Video (MOT)" sub="6-frame scan" />
        <ModeTile testid="mode-still" active={mode === "still"} onClick={() => setMode("still")}
          emoji="📸" label="Still" sub="Single shot" />
        <ModeTile testid="mode-buffet-set" active={mode === "buffet_set"} onClick={() => setMode("buffet_set")}
          emoji="🏺" label="Buffet set" sub="Start service" />
        <ModeTile testid="mode-buffet-refill" active={mode === "buffet_refill"}
          onClick={() => { if (session?.session_id) setMode("buffet_refill"); else showFlash("Start a buffet set first"); }}
          emoji="➕" label="Refill" sub={session?.session_id ? "log pan added" : "needs session"}
          dim={!session?.session_id} />
        <ModeTile testid="mode-buffet-close" active={mode === "buffet_close"}
          onClick={() => { if (session?.session_id) setMode("buffet_close"); else showFlash("Start a buffet set first"); }}
          emoji="🍽️" label="Buffet close" sub={session?.session_id ? `${session.service_name || "open"}` : "needs session"}
          dim={!session?.session_id} />
        <ModeTile testid="mode-ground-truth" active={mode === "ground_truth"} onClick={() => setMode("ground_truth")}
          emoji="🏷️" label="Ground truth" sub="Label a sample" />
        <ModeTile testid="mode-draft-recipe" active={mode === "draft_recipe"} onClick={() => setMode("draft_recipe")}
          emoji="🧑‍🍳" label="New dish" sub="Draft recipe" />
        <ModeTile testid="mode-live-camera" active={mode === "live_camera"} onClick={() => setMode("live_camera")}
          emoji="🎬" label="Live guided" sub="IMU + MediaPipe" />
      </div>

      {/* Primary CTA */}
      <button
        data-testid="waste-capture-primary"
        onClick={() => {
          if (mode === "draft_recipe") setDraftModal(true);
          else if (mode === "live_camera") setLiveCameraOpen(true);
          // iter221 · William: "buffet scan should be video intake" — route
          // buffet_set / buffet_refill / buffet_close + video mode all to the
          // video file picker so we get multi-frame MOT + instant Stage-1 feedback.
          else if (mode === "video" || mode === "buffet_set" ||
                   mode === "buffet_refill" || mode === "buffet_close") {
            videoInput.current?.click();
          }
          else fileInput.current?.click();
        }}
        disabled={busy}
        style={{
          marginTop: 18, width: "100%", padding: "20px", borderRadius: 14, border: 0,
          background: busy ? "#334155" : "linear-gradient(135deg, #c8a97e, #a855f7)",
          color: "#0a0e1a", fontSize: 16, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}
      >
        {busy ? "Analysing with Echo…"
              : mode === "video" ? "🎥  Record a video scan"
              : mode === "buffet_set" ? "🎥  Video-scan the set buffet"
              : mode === "buffet_refill" ? "🎥  Video-scan the refill pan"
              : mode === "buffet_close" ? "🎥  Video-scan what's left"
              : mode === "ground_truth" ? "🏷️  Upload labelled sample"
              : mode === "draft_recipe" ? "🧑‍🍳  Draft new dish (text)"
              : mode === "live_camera" ? "🎬  Open live camera"
              : "📸  Capture still"}
      </button>
      <input ref={fileInput} type="file" accept="image/*" capture="environment"
        data-testid="waste-file-input" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onMainFile(f); e.currentTarget.value = ""; }} />
      <input ref={videoInput} type="file" accept="video/*" capture="environment"
        data-testid="waste-video-input" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onMainFile(f); e.currentTarget.value = ""; }} />

      {videoProgress && (
        <div data-testid="video-progress" style={{
          marginTop: 12, padding: 10, borderRadius: 10,
          background: "rgba(168,85,247,0.10)", border: "1px solid rgba(168,85,247,0.30)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#d8b4fe", letterSpacing: 1 }}>
            <span>{videoProgress.msg}</span>
            <span>{Math.round(videoProgress.pct)}%</span>
          </div>
          <div style={{ marginTop: 6, height: 6, borderRadius: 3, background: "rgba(10,14,26,0.4)", overflow: "hidden" }}>
            <div style={{
              width: `${videoProgress.pct}%`, height: "100%",
              background: "linear-gradient(90deg, #a855f7, #c8a97e)",
              transition: "width 250ms ease",
            }} />
          </div>
        </div>
      )}

      {/* Feature 3 · Multi-zone "+ Add area" */}
      {mode !== "ground_truth" && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              data-testid="waste-zone-name-input"
              value={zoneNameDraft}
              onChange={e => setZoneNameDraft(e.target.value.slice(0, 40))}
              placeholder="zone name (optional, e.g. Top shelf)"
              style={{
                flex: 1, padding: "8px 10px", borderRadius: 8,
                background: "rgba(15,20,32,0.6)", color: "#f5efe4",
                border: "1px solid rgba(200,169,126,0.2)", fontSize: 12,
              }}
            />
            <button
              data-testid="waste-add-zone-btn"
              onClick={() => zoneInput.current?.click()}
              style={{
                padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(200,169,126,0.4)",
                background: "transparent", color: "#c8a97e", fontSize: 12, fontWeight: 700,
              }}
            >＋ Add area</button>
          </div>
          <input ref={zoneInput} type="file" accept="image/*" capture="environment"
            data-testid="waste-zone-file-input" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onZoneFile(f); e.currentTarget.value = ""; }} />
          {zoneDrafts.length > 0 && (
            <div data-testid="waste-zone-drafts" style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
              {zoneDrafts.map((z, i) => (
                <div key={z.key} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "6px 10px", borderRadius: 6, background: "rgba(200,169,126,0.06)",
                  border: "1px dashed rgba(200,169,126,0.35)", fontSize: 11,
                }}>
                  <span style={{ color: "#c8a97e" }}>Zone {i + 2}</span>
                  <span style={{ color: "#f5efe4", flex: 1, margin: "0 8px" }}>{z.label}</span>
                  <button data-testid={`waste-zone-draft-remove-${i}`}
                    onClick={() => setZoneDrafts(zoneDrafts.filter((_, j) => j !== i))}
                    style={{ background: "transparent", border: 0, color: "#fca5a5", fontSize: 12 }}>✕</button>
                </div>
              ))}
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
                Tap the primary capture to submit all {zoneDrafts.length + 1} zone{zoneDrafts.length ? "s" : ""} at once.
              </div>
            </div>
          )}
        </div>
      )}

      {queued > 0 && online && (
        <button data-testid="waste-sync-now" onClick={() => void syncNow()} style={{
          marginTop: 10, width: "100%", padding: "10px", borderRadius: 10,
          border: "1px solid rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.08)",
          color: "#fcd34d", fontSize: 12, fontWeight: 600,
        }}>↻  Sync {queued} queued capture{queued === 1 ? "" : "s"}</button>
      )}
      {flash && (
        <div data-testid="waste-flash" style={{
          marginTop: 10, padding: 12, borderRadius: 10,
          background: "rgba(16,185,129,0.15)", color: "#6ee7b7",
          border: "1px solid rgba(16,185,129,0.3)", fontSize: 13,
        }}>{flash}</div>
      )}

      {/* iter216 · Progressive Stage-1 preliminary banner (fingerprint match) */}
      {preliminary && !entry && (
        <div data-testid="waste-preliminary" style={{
          marginTop: 16, padding: 12, borderRadius: 12,
          background: "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(99,102,241,0.12))",
          border: "1px solid rgba(6,182,212,0.35)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 10, color: "#06b6d4", textTransform: "uppercase", letterSpacing: 2 }}>
              ⚡ Preliminary · {preliminary.vision_mode?.replace("fingerprint_", "FP ").toUpperCase()}
            </div>
            <div style={{ fontSize: 10, color: "#94a3b8" }}>final coming…</div>
          </div>
          <div data-testid="waste-preliminary-cost" style={{ fontSize: 22, color: "#f5efe4", marginTop: 4, fontWeight: 300 }}>
            ≈ ${Number(preliminary.total_cost || 0).toFixed(2)}
          </div>
          {(preliminary.items || []).slice(0, 3).map((it: any) => (
            <div key={it.item_id} data-testid={`prelim-item-${it.item_id}`} style={{
              fontSize: 12, color: "#cbd5e1", marginTop: 4,
            }}>
              {it.name} · {Math.round((it.confidence || 0) * 100)}% match
            </div>
          ))}
        </div>
      )}

      {/* Result card · Features 1+2+3 surfaces */}
      {entry && (
        <div data-testid="waste-result" style={{
          marginTop: 16, padding: 16, borderRadius: 12,
          background: "rgba(30,41,59,0.6)", border: "1px solid rgba(200,169,126,0.25)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{entry.entry_id}</div>
            <div data-testid="waste-vision-mode" style={{
              fontSize: 10, color: entry.vision_mode?.includes("llm") ? "#6ee7b7" : "#fbbf24",
              textTransform: "uppercase", letterSpacing: 2,
            }}>
              {entry.vision_mode?.includes("llm") ? "● LIVE VISION" : "○ STUB"}
            </div>
          </div>
          <div style={{ fontSize: 28, color: "#f5efe4", marginTop: 6, fontWeight: 300 }}>
            ${Number(entry.total_cost || 0).toFixed(2)}
          </div>
          {entry.frames_analysed && (
            <div data-testid="waste-frames-analysed" style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
              🎥 {entry.frames_analysed} frames analysed · multi-angle aggregate
            </div>
          )}

          {/* Feature 1 · Category breakdown chips */}
          {entry.cost_breakdown && (
            <div data-testid="waste-cost-breakdown" style={{
              marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6,
            }}>
              {CATEGORIES.map(c => catBadge(c, Number(entry.cost_breakdown[c] || 0), Number(entry.total_cost || 0)))}
            </div>
          )}

          {/* Zones listing (Feature 3) */}
          {zones.length > 0 && (
            <div data-testid="waste-zones" style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {zones.map((z: any) => (
                <div key={z.zone_id} data-testid={`waste-zone-${z.zone_id}`} style={{
                  padding: "8px 10px", borderRadius: 8, background: "rgba(15,20,32,0.6)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  fontSize: 11,
                }}>
                  <span style={{ color: "#c8a97e", fontWeight: 700 }}>Zone {z.zone_order}</span>
                  <span style={{ color: "#f5efe4", flex: 1, margin: "0 8px",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{z.zone_name}</span>
                  <span style={{ fontFamily: "monospace", color: "#94a3b8" }}>{z.item_count} items · ${z.total_value_usd?.toFixed?.(2)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Items list with needs-review badges */}
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {items.map((it: any) => (
              <div key={it.item_id} data-testid={`waste-item-${it.item_id}`} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "8px 10px", borderRadius: 8,
                background: it.needs_review ? "rgba(251,191,36,0.10)" : "rgba(15,20,32,0.6)",
                border: it.needs_review ? "1px solid rgba(251,191,36,0.4)" : "1px solid transparent",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#f5efe4", fontWeight: 600, display: "flex", gap: 6, alignItems: "center" }}>
                    <span>{it.name}</span>
                    {it.needs_review && <span data-testid={`waste-item-review-${it.item_id}`} style={{
                      fontSize: 9, padding: "1px 6px", borderRadius: 4,
                      background: "rgba(251,191,36,0.25)", color: "#fcd34d", fontWeight: 700, letterSpacing: 1,
                    }}>REVIEW</span>}
                    {it.is_unknown && <span style={{
                      fontSize: 9, padding: "1px 6px", borderRadius: 4,
                      background: "rgba(168,85,247,0.25)", color: "#d8b4fe", fontWeight: 700, letterSpacing: 1,
                    }}>NEW</span>}
                  </div>
                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                    conf {Math.round((it.confidence || 0) * 100)}% · {it.portion_g}g · {it.category || "?"}
                  </div>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 12, color: "#c8a97e" }}>×{it.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature 1 · Buffet Set cost waterfall */}
      {session && mode !== "still" && (
        <div data-testid="waste-buffet-card" style={{
          marginTop: 16, padding: 16, borderRadius: 12,
          background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.28)",
        }}>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#d8b4fe", fontWeight: 700 }}>BUFFET SESSION</div>
          <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "monospace", marginTop: 2 }}>{session.session_id}</div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <KpiPill testid="buffet-set-cost" label="Set cost" value={`$${Number(session.set_cost_usd || 0).toFixed(2)}`} />
            <KpiPill testid="buffet-est-covers" label="Covers (est)" value={String(session.estimated_covers_at_setup ?? 0)}
              sub={`forecast ${session.forecast_covers ?? 0}`} />
            <KpiPill testid="buffet-refill-cost" label="Refills" value={`$${Number(session.refill_cost_usd || 0).toFixed(2)}`}
              sub={`×${session.refill_count || 0}`} />
            <KpiPill testid="buffet-close-cost" label="Close leftover" value={`$${Number(session.close_cost_usd || 0).toFixed(2)}`} />
          </div>

          {/* Overcover nudge (Feature 1) */}
          {session.setup_overcover_ratio != null && session.setup_overcover_ratio > 0.2 && (
            <div data-testid="buffet-overcover-nudge" style={{
              marginTop: 12, padding: 10, borderRadius: 8,
              background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)",
              color: "#fcd34d", fontSize: 12,
            }}>
              ⚠ Setup is {Math.round(session.setup_overcover_ratio * 100)}% over forecast.
              Consider scaling back 1 pan of the largest category.
            </div>
          )}

          {/* Feature 2 · Cost-per-cover receipt (only when guest_count set) */}
          {session.guest_count > 0 && (
            <div data-testid="buffet-cpc-receipt" style={{
              marginTop: 12, padding: 12, borderRadius: 10,
              background: "rgba(10,14,26,0.55)", fontFamily: "monospace", fontSize: 12, color: "#f5efe4",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{session.service_name || "Service"} · {session.guest_count} covers</span>
                <span style={{ color: "#94a3b8" }}>{session.guest_count_source}</span>
              </div>
              <div style={{ height: 1, background: "rgba(200,169,126,0.25)", margin: "8px 0" }} />
              <ReceiptRow label="Set" value={session.set_cost_usd} />
              <ReceiptRow label="Refills" value={session.refill_cost_usd} />
              <ReceiptRow label="Close left" value={session.close_cost_usd} negative />
              <div style={{ height: 1, background: "rgba(200,169,126,0.25)", margin: "4px 0" }} />
              <ReceiptRow label="Consumed" value={session.consumed_cost_usd} highlight />
              <ReceiptRow label="Wasted" value={session.close_cost_usd}
                pct={session.waste_pct != null ? `${session.waste_pct.toFixed(1)}%` : undefined} />
              <div style={{ height: 1, background: "rgba(200,169,126,0.25)", margin: "8px 0" }} />
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#c8a97e" }}>PER COVER</div>
              <ReceiptRow label="Consumed" value={session.cost_per_cover_consumed_usd} precision={2} />
              <ReceiptRow label="Wasted" value={session.cost_per_cover_wasted_usd} precision={2} />
              <ReceiptRow label="Total" value={session.cost_per_cover_total_usd} precision={2} highlight />
            </div>
          )}

          {session.historical_comparison?.sample_size > 0 && (
            <div style={{ marginTop: 10, fontSize: 11, color: "#94a3b8" }}>
              vs. last {session.historical_comparison.sample_size} similar services: avg set ${session.historical_comparison.avg_set_cost_usd?.toFixed(2) || "—"}
              {session.historical_comparison.avg_cost_per_cover_usd && (
                <> · ${session.historical_comparison.avg_cost_per_cover_usd.toFixed(2)}/cover</>
              )}
            </div>
          )}
        </div>
      )}

      {/* Guest count modal (Feature 2) */}
      {guestModal && session && (
        <GuestCountModal session={session} onSubmit={submitGuestCount} onClose={() => setGuestModal(false)} />
      )}

      {/* iter214 · F6 · Draft Recipe modal */}
      {draftModal && (
        <DraftRecipeModal token={token} onClose={() => setDraftModal(false)}
          onSaved={(d) => { setDraftModal(false); showFlash(`✓ Draft saved · ${d.name}`); }} />
      )}

      <div style={{ marginTop: 22, padding: 12, borderRadius: 10, background: "rgba(251,191,36,0.06)", border: "1px dashed rgba(251,191,36,0.25)" }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#fbbf24", fontWeight: 700 }}>Built by ECW</div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
          Fingerprint-first recognition · live camera guidance · progressive analysis · self-teaching library.
        </div>
      </div>

      {liveCameraOpen && (
        <LiveCameraOverlay
          onClose={() => setLiveCameraOpen(false)}
          onCapture={async (base64) => {
            setLiveCameraOpen(false);
            await runCapture(base64);
          }}
        />
      )}
    </div>
  );
}

function ModeTile({ testid, active, onClick, emoji, label, sub, dim }: {
  testid: string; active: boolean; onClick: () => void;
  emoji: string; label: string; sub: string; dim?: boolean;
}) {
  return (
    <button data-testid={testid} onClick={onClick} style={{
      padding: "14px 12px", borderRadius: 12,
      background: active ? "linear-gradient(135deg, rgba(200,169,126,0.20), rgba(168,85,247,0.15))"
                         : "rgba(30,41,59,0.5)",
      border: active ? "1px solid rgba(200,169,126,0.5)" : "1px solid rgba(148,163,184,0.15)",
      color: dim ? "#94a3b8" : "#f5efe4",
      fontSize: 13, fontWeight: 700,
      textAlign: "left", cursor: "pointer",
      opacity: dim ? 0.65 : 1,
    }}>
      <div style={{ fontSize: 22 }}>{emoji}</div>
      <div style={{ marginTop: 4 }}>{label}</div>
      <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500, marginTop: 2 }}>{sub}</div>
    </button>
  );
}

function KpiPill({ testid, label, value, sub }: { testid: string; label: string; value: string; sub?: string }) {
  return (
    <div data-testid={testid} style={{
      padding: "10px 12px", borderRadius: 10,
      background: "rgba(15,20,32,0.6)", border: "1px solid rgba(200,169,126,0.15)",
    }}>
      <div style={{ fontSize: 9, letterSpacing: 2, color: "#c8a97e", textTransform: "uppercase", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 18, color: "#f5efe4", marginTop: 2, fontWeight: 300 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function ReceiptRow({ label, value, negative, highlight, pct, precision = 2 }: {
  label: string; value: number | null | undefined;
  negative?: boolean; highlight?: boolean; pct?: string; precision?: number;
}) {
  const num = Number(value || 0);
  return (
    <div style={{
      display: "flex", justifyContent: "space-between",
      color: highlight ? "#f5efe4" : "#cbd5e1",
      fontWeight: highlight ? 700 : 400, margin: "2px 0",
    }}>
      <span>{label}</span>
      <span>
        {pct && <span style={{ color: "#94a3b8", marginRight: 6 }}>({pct})</span>}
        {negative ? "−" : ""}${num.toFixed(precision)}
      </span>
    </div>
  );
}

function GuestCountModal({ session, onSubmit, onClose }: {
  session: any; onSubmit: (count: number, source: "manual" | "group_block_plus_manual") => void; onClose: () => void;
}) {
  const groupBlock = session.group_block_covers || 0;
  const forecast = session.forecast_covers || 0;
  const [count, setCount] = React.useState<number>(forecast || groupBlock || 0);
  const defaultSource: "manual" | "group_block_plus_manual" = groupBlock > 0 ? "group_block_plus_manual" : "manual";
  const [source, setSource] = React.useState<"manual" | "group_block_plus_manual">(defaultSource);

  return (
    <div data-testid="guest-count-modal" style={{
      position: "fixed", inset: 0, zIndex: 99990,
      background: "rgba(10,14,26,0.82)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 440,
        background: "rgba(15,20,32,0.98)", borderTopLeftRadius: 20, borderTopRightRadius: 20,
        border: "1px solid rgba(200,169,126,0.3)", padding: 22,
      }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#c8a97e", fontWeight: 700 }}>GUEST COUNT</div>
        <h3 style={{ fontSize: 20, color: "#f5efe4", fontWeight: 300, marginTop: 4 }}>
          How many covers today?
        </h3>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
          Required to compute cost-per-cover.
          {groupBlock > 0 && <> · Group blocks: {groupBlock}</>}
          {forecast > 0 && <> · Forecast: {forecast}</>}
        </div>

        <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
          <button data-testid="guest-count-dec" onClick={() => setCount(Math.max(0, count - 1))} style={{
            width: 46, height: 46, borderRadius: 12, border: "1px solid rgba(200,169,126,0.3)",
            background: "transparent", color: "#c8a97e", fontSize: 20,
          }}>−</button>
          <input data-testid="guest-count-input" type="number" value={count}
            onChange={e => setCount(Math.max(0, parseInt(e.target.value) || 0))}
            style={{
              width: 140, fontSize: 32, textAlign: "center", fontWeight: 300,
              padding: "10px 8px", borderRadius: 12, color: "#f5efe4",
              background: "rgba(10,14,26,0.6)", border: "1px solid rgba(200,169,126,0.3)",
            }} />
          <button data-testid="guest-count-inc" onClick={() => setCount(count + 1)} style={{
            width: 46, height: 46, borderRadius: 12, border: "1px solid rgba(200,169,126,0.3)",
            background: "transparent", color: "#c8a97e", fontSize: 20,
          }}>+</button>
        </div>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          <SourceRow testid="guest-source-block" active={source === "group_block_plus_manual"} disabled={groupBlock === 0}
            onClick={() => groupBlock > 0 && setSource("group_block_plus_manual")}
            label="Group block + estimate" sub={groupBlock > 0 ? `${groupBlock} blocked + walk-in` : "no group blocks today"} />
          <SourceRow testid="guest-source-manual" active={source === "manual"} onClick={() => setSource("manual")}
            label="Manual" sub="Chef's count" />
        </div>

        <div style={{ marginTop: 22, display: "flex", gap: 10 }}>
          <button data-testid="guest-count-cancel" onClick={onClose} style={{
            flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(148,163,184,0.3)",
            background: "transparent", color: "#94a3b8", fontSize: 14,
          }}>Cancel</button>
          <button data-testid="guest-count-submit" onClick={() => onSubmit(count, source)} disabled={count === 0} style={{
            flex: 2, padding: "12px", borderRadius: 12, border: 0,
            background: count > 0 ? "linear-gradient(135deg, #c8a97e, #a855f7)" : "#334155",
            color: "#0a0e1a", fontSize: 14, fontWeight: 700,
          }}>Save cost-per-cover</button>
        </div>
      </div>
    </div>
  );
}

function SourceRow({ testid, active, disabled, onClick, label, sub }: {
  testid: string; active: boolean; disabled?: boolean; onClick: () => void; label: string; sub: string;
}) {
  return (
    <button data-testid={testid} onClick={onClick} disabled={disabled} style={{
      padding: "10px 12px", borderRadius: 10,
      background: active ? "rgba(200,169,126,0.12)" : "rgba(30,41,59,0.5)",
      border: active ? "1px solid rgba(200,169,126,0.5)" : "1px solid rgba(148,163,184,0.15)",
      color: disabled ? "#475569" : "#f5efe4", textAlign: "left",
      fontSize: 12, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 14, height: 14, borderRadius: 7, flexShrink: 0,
          background: active ? "#c8a97e" : "transparent", border: "1px solid rgba(200,169,126,0.4)",
        }} />
        <span style={{ fontWeight: 700 }}>{label}</span>
      </div>
      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, marginLeft: 22 }}>{sub}</div>
    </button>
  );
}

export default WasteTab;

function DraftRecipeModal({ token, onClose, onSaved }: {
  token: string; onClose: () => void; onSaved: (draft: any) => void;
}) {
  const [text, setText] = React.useState("");
  const [hint, setHint] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function save() {
    setBusy(true); setErr(null);
    try {
      const r = await fetch(`${API_ROOT()}/api/waste/draft-recipes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          raw_text: text.trim(),
          dish_hint: hint.trim() || undefined,
          user_id: `mobile-${token.slice(0, 6)}`,
          outlet_id: "outlet-main",
        }),
      }).then(r => r.json());
      if (r?.ok) onSaved(r.draft);
      else setErr("Save failed");
    } catch (e: any) { setErr(e?.message || String(e)); }
    finally { setBusy(false); }
  }

  return (
    <div data-testid="draft-recipe-modal" style={{
      position: "fixed", inset: 0, zIndex: 99990,
      background: "rgba(10,14,26,0.82)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 460,
        background: "rgba(15,20,32,0.98)", borderTopLeftRadius: 20, borderTopRightRadius: 20,
        border: "1px solid rgba(200,169,126,0.3)", padding: 22, maxHeight: "86vh", overflowY: "auto",
      }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: "#c8a97e", fontWeight: 700 }}>NEW DISH</div>
        <h3 style={{ fontSize: 20, color: "#f5efe4", fontWeight: 300, marginTop: 4 }}>
          🧑‍🍳 Draft a new recipe
        </h3>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
          Dictate or type. EchoAi³ extracts ingredients + steps and flags for chef approval.
        </div>

        <label style={{ fontSize: 10, color: "#cbd5e1", letterSpacing: 1, textTransform: "uppercase", marginTop: 16, display: "block" }}>
          Dish name (optional hint)
        </label>
        <input data-testid="draft-recipe-hint" value={hint} onChange={e => setHint(e.target.value)}
          placeholder="e.g. Avocado toast" style={{
            width: "100%", padding: "8px 10px", borderRadius: 8, fontSize: 13, color: "#f5efe4",
            background: "rgba(10,14,26,0.6)", border: "1px solid rgba(200,169,126,0.3)", marginTop: 4,
          }} />

        <label style={{ fontSize: 10, color: "#cbd5e1", letterSpacing: 1, textTransform: "uppercase", marginTop: 12, display: "block" }}>
          Describe the dish
        </label>
        <textarea data-testid="draft-recipe-text" value={text} onChange={e => setText(e.target.value)}
          rows={6}
          placeholder="What's in it, how much, and how do you make it? Mention portion size + rough cost if you know them."
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13, color: "#f5efe4",
            background: "rgba(10,14,26,0.6)", border: "1px solid rgba(200,169,126,0.3)", marginTop: 4,
            fontFamily: "inherit", resize: "vertical",
          }} />

        {err && <div style={{ marginTop: 8, color: "#fca5a5", fontSize: 11 }}>{err}</div>}

        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button data-testid="draft-recipe-cancel" onClick={onClose} style={{
            flex: 1, padding: "12px", borderRadius: 10, border: "1px solid rgba(148,163,184,0.3)",
            background: "transparent", color: "#94a3b8", fontSize: 13,
          }}>Cancel</button>
          <button data-testid="draft-recipe-save" onClick={save} disabled={busy || text.trim().length < 20}
            style={{
              flex: 2, padding: "12px", borderRadius: 10, border: 0,
              background: (busy || text.trim().length < 20)
                ? "#334155" : "linear-gradient(135deg, #c8a97e, #a855f7)",
              color: "#0a0e1a", fontSize: 13, fontWeight: 700,
            }}>
            {busy ? "Drafting…" : "Save draft"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════ iter217 · LIVE CAMERA OVERLAY ═══════════════════
type LiveCameraOverlayProps = { onClose: () => void; onCapture: (b64: string) => void };

function LiveCameraOverlay({ onClose, onCapture }: LiveCameraOverlayProps) {
  const videoWrapRef = React.useRef<HTMLDivElement | null>(null);
  const [handle, setHandle] = React.useState<any>(null);
  const [quality, setQuality] = React.useState<any>({ in_frame: true, pan_speed: "good", pan_speed_dps: 0, too_dark: false });
  const [framing, setFraming] = React.useState<any>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [mpLoaded, setMpLoaded] = React.useState<"pending" | "ready" | "unavailable">("pending");
  const detectorRef = React.useRef<any>(null);
  const framingTimerRef = React.useRef<any>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const m = await import("@/lib/waste-video");
        const h = await m.openLiveCamera({ facingMode: "environment", maxWidth: 1280 });
        if (cancelled) { h.stop(); return; }
        videoWrapRef.current?.appendChild(h.video);
        (h.video.style as any).width = "100%";
        (h.video.style as any).height = "100%";
        (h.video.style as any).objectFit = "cover";
        setHandle(h);
        const detach = h.attachPanGuidance((q: any) => setQuality(q));
        (h as any).__detachPan = detach;

        m.loadObjectDetector().then((det: any) => {
          if (cancelled) return;
          if (!det) { setMpLoaded("unavailable"); return; }
          detectorRef.current = det;
          setMpLoaded("ready");
          framingTimerRef.current = setInterval(async () => {
            try {
              const canvas = document.createElement("canvas");
              const w = h.video.videoWidth || 640;
              const hh = h.video.videoHeight || 480;
              const scale = w > 320 ? 320 / w : 1;
              canvas.width = Math.round(w * scale); canvas.height = Math.round(hh * scale);
              const ctx = canvas.getContext("2d"); if (!ctx) return;
              ctx.drawImage(h.video, 0, 0, canvas.width, canvas.height);
              const bitmap = await createImageBitmap(canvas);
              const result = det.detect(bitmap);
              const f = m.classifyFraming(result, canvas.width, canvas.height);
              setFraming(f);
            } catch { /* non-fatal */ }
          }, 500);
        }).catch(() => setMpLoaded("unavailable"));
      } catch (e: any) {
        setErr(String(e?.message || e));
      }
    })();
    return () => {
      cancelled = true;
      if (framingTimerRef.current) clearInterval(framingTimerRef.current);
      if (handle) {
        try { (handle as any).__detachPan?.(); } catch { /* noop */ }
        try { handle.stop(); } catch { /* noop */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function doCapture() {
    if (!handle) return;
    const dataUrl = handle.captureFrame({ maxWidth: 1280, jpegQuality: 0.85 });
    onCapture(dataUrl);
  }

  const panColor = quality.pan_speed === "too_fast" ? "#f43f5e"
                  : quality.pan_speed === "still" ? "#fbbf24" : "#10b981";
  const frameColor = framing?.level === "too_close" || framing?.level === "too_far" ? "#fbbf24"
                    : framing?.level === "nothing" ? "#f43f5e" : "#10b981";
  const sourceLabel = quality.source === "imu" ? "IMU"
                     : quality.source === "optical_flow" ? "FLOW"
                     : "—";

  return (
    <div data-testid="live-camera-overlay" style={{
      position: "fixed", inset: 0, background: "#000", zIndex: 99999, display: "flex",
      flexDirection: "column",
    }}>
      <div ref={videoWrapRef} style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {err && (
          <div data-testid="live-camera-error" style={{
            padding: 24, color: "#f5efe4", fontSize: 14, textAlign: "center", marginTop: "30%",
          }}>
            ⚠ Camera unavailable<br />
            <span style={{ opacity: 0.6, fontSize: 12 }}>{err}</span><br /><br />
            <span style={{ opacity: 0.6, fontSize: 12 }}>
              Try again over HTTPS in Safari/Chrome, or use the file-picker modes.
            </span>
          </div>
        )}
        <div style={{
          position: "absolute", top: 12, left: 12, right: 12,
          display: "flex", justifyContent: "space-between", gap: 6,
        }}>
          <div data-testid="live-pan-badge" style={{
            padding: "6px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
            background: "rgba(0,0,0,0.6)", color: panColor, border: `1px solid ${panColor}`,
            letterSpacing: 1, textTransform: "uppercase",
          }}>
            {quality.pan_speed === "too_fast" ? "⚠ Slow down" :
             quality.pan_speed === "still" ? "• Hold steady" : "✓ Good pace"}
            <span data-testid="live-motion-source" style={{ opacity: 0.55, marginLeft: 4, fontWeight: 500 }}>· {sourceLabel}</span>
            {quality.pan_speed_dps > 0 && <span style={{ opacity: 0.5 }}> · {quality.pan_speed_dps}</span>}
          </div>
          <div data-testid="live-framing-badge" style={{
            padding: "6px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
            background: "rgba(0,0,0,0.6)",
            color: mpLoaded === "ready" ? frameColor : "#94a3b8",
            border: `1px solid ${mpLoaded === "ready" ? frameColor : "#475569"}`,
            letterSpacing: 1, textTransform: "uppercase",
          }}>
            {mpLoaded === "pending" ? "Loading MP…" :
             mpLoaded === "unavailable" ? "MP offline" :
             framing?.level === "nothing" ? "⚠ Out of frame" :
             framing?.level === "too_close" ? "⚠ Too close" :
             framing?.level === "too_far" ? "⚠ Too far" :
             `✓ ${framing?.top_object || "framed"}`}
          </div>
        </div>
        {(quality.too_dark || !quality.in_frame) && (
          <div data-testid="live-quality-warning" style={{
            position: "absolute", top: 60, left: 12, right: 12,
            padding: "6px 10px", borderRadius: 6, fontSize: 11,
            background: "rgba(244,63,94,0.15)", color: "#fda4af",
            border: "1px solid rgba(244,63,94,0.4)", textAlign: "center",
          }}>
            {quality.too_dark ? "⚠ Too dark — more light" : "⚠ Camera blocked / uniform frame"}
          </div>
        )}
      </div>
      <div style={{
        padding: 16, display: "flex", gap: 10, justifyContent: "space-between",
        alignItems: "center", background: "#000",
      }}>
        <button data-testid="live-camera-close" onClick={onClose} style={{
          padding: "10px 16px", borderRadius: 10, border: "1px solid #334155",
          background: "transparent", color: "#94a3b8", fontSize: 13,
        }}>Cancel</button>
        <button data-testid="live-camera-capture" onClick={doCapture}
          disabled={!handle || err !== null}
          style={{
            padding: "12px 20px", borderRadius: 999, border: "3px solid #f5efe4",
            background: "#c8a97e", color: "#0a0e1a", fontSize: 14, fontWeight: 800,
            width: 90, height: 90, display: "flex", alignItems: "center", justifyContent: "center",
            opacity: !handle || err !== null ? 0.4 : 1,
          }}>⬤</button>
        <div style={{ width: 80 }} />
      </div>
    </div>
  );
}

