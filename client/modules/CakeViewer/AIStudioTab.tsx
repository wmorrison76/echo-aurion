/**
 * AIStudioTab (iter155 · Phase B)
 * -------------------------------
 * Unified tab wrapping all AI-powered cake services:
 *  - Palette Extractor (B1)
 *  - AI Descriptions (B2)
 *  - Photoreal Render + Bring-to-Life (B3, gated behind FAL_KEY)
 *  - Structural Feasibility (B4)
 *  - BEO PDF download (B5)
 *  - Timeline Planner (B6)
 *  - Allergen Check (B7)
 *  - Design Library (B9)
 *  - Pricing Suggest (B10)
 */
import React, { useState, useEffect } from "react";
import {
  Palette, Wand2, Image as ImageIcon, Film, ShieldCheck, FileDown,
  Clock, AlertTriangle, BookmarkPlus, TrendingUp, Sparkles, Lock,
} from "lucide-react";
import type { Tier, Topper, FlowerDeco, Intake } from "./types";
import { ACCENT, BORDER, SURFACE, GREEN, RED, AMBER } from "./types";

const API = typeof window !== "undefined" ? window.location.origin : "";

interface Props {
  sessionId: string | null;
  tiers: Tier[];
  toppers: Topper[];
  flowers: FlowerDeco[];
  intake: Intake;
  standKind: string;
  background: string;
  applyPalette?: (hexes: string[]) => void;
  applyDescription?: (text: string) => void;
  saveFirst: () => Promise<string | null>;
}

export default function AIStudioTab(props: Props) {
  const { sessionId, tiers, intake, applyPalette, applyDescription, saveFirst } = props;
  const [features, setFeatures] = useState<any>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<Record<string, any>>({});
  const [err, setErr] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`${API}/api/cake-ai/features`).then(r => r.json()).then(setFeatures).catch(() => {});
  }, []);

  const run = async (key: string, fn: () => Promise<any>) => {
    setLoading(p => ({ ...p, [key]: true }));
    setErr(p => ({ ...p, [key]: "" }));
    try {
      const r = await fn();
      setResult(p => ({ ...p, [key]: r }));
    } catch (e: any) {
      setErr(p => ({ ...p, [key]: e?.message || "failed" }));
    }
    setLoading(p => ({ ...p, [key]: false }));
  };

  const ensureSid = async () => sessionId || (await saveFirst());

  // ─── B1 · Palette Extractor ───
  const onPaletteUpload = async (file: File) => {
    const b64 = await new Promise<string>((res) => {
      const rd = new FileReader();
      rd.onload = () => res(String(rd.result || ""));
      rd.readAsDataURL(file);
    });
    await run("palette", async () => {
      const r = await fetch(`${API}/api/cake-ai/palette/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: b64, mime_type: file.type || "image/jpeg" }),
      });
      if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
      return r.json();
    });
  };

  // ─── B2 · AI Description ───
  const runDescription = async (tone: string) => {
    const sid = await ensureSid(); if (!sid) return;
    await run("descriptions", async () => {
      const r = await fetch(`${API}/api/cake-ai/descriptions/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, tone, target: "beo" }),
      });
      if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
      return r.json();
    });
  };

  // ─── B3 · Photoreal Render / Bring to Life ───
  const runPhotoreal = async (style: string) => {
    const sid = await ensureSid(); if (!sid) return;
    await run("photoreal", async () => {
      const r = await fetch(`${API}/api/cake-ai/photoreal/render`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, style }),
      });
      if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
      return r.json();
    });
  };
  const runBringToLife = async (motion: string) => {
    const img = result.photoreal?.image_url;
    if (!img) return setErr(p => ({ ...p, photoreal: "Generate a photoreal still first" }));
    const sid = await ensureSid();
    await run("video", async () => {
      const r = await fetch(`${API}/api/cake-ai/photoreal/bring-to-life`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, image_url: img, motion }),
      });
      if (!r.ok) throw new Error(`${r.status}: ${await r.text()}`);
      return r.json();
    });
  };

  // ─── B4 · Feasibility ───
  const runFeasibility = () => run("feasibility", async () => {
    const r = await fetch(`${API}/api/cake-ai/feasibility/check`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_payload: { tiers, intake } }),
    });
    return r.json();
  });

  // ─── B5 · BEO PDF ───
  const downloadBEO = async () => {
    const sid = await ensureSid(); if (!sid) return;
    window.open(`${API}/api/cake-ai/beo/pdf/${sid}`, "_blank");
  };

  // ─── B6 · Timeline ───
  const runTimeline = () => run("timeline", async () => {
    const ed = intake.event_date || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    const hasSF = (props.flowers || []).some(f => f.arrangement_id.includes("roses") || f.arrangement_id.includes("peonies"));
    const hasMG = tiers.some(t => t.finish === "mirror");
    const r = await fetch(`${API}/api/cake-ai/timeline/plan?event_date=${encodeURIComponent(ed + "T14:00:00Z")}&tier_count=${tiers.length}&has_sugar_flowers=${hasSF}&has_mirror_glaze=${hasMG}&delivery_required=${!!intake.delivery_required}`);
    return r.json();
  });

  // ─── B7 · Allergen ───
  const runAllergen = () => run("allergens", async () => {
    const r = await fetch(`${API}/api/cake-ai/allergens/propagate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_payload: { tiers, intake } }),
    });
    return r.json();
  });

  // ─── B9 · Save to Library ───
  const [lookName, setLookName] = useState("");
  const saveToLibrary = async () => {
    const sid = await ensureSid(); if (!sid) return;
    await run("library", async () => {
      const r = await fetch(`${API}/api/cake-ai/library/save-look`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sid, look_name: lookName || intake.client_name + " Look" || "Saved Look", tags: [], theme: intake.theme }),
      });
      return r.json();
    });
  };

  // ─── B10 · Pricing ───
  const runPricing = () => run("pricing", async () => {
    const r = await fetch(`${API}/api/cake-ai/pricing/suggest`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_payload: { tiers, intake, flowers: props.flowers, toppers: props.toppers }, delivery_radius_miles: 10 }),
    });
    return r.json();
  });

  const section = (title: string, icon: React.ReactNode, children: React.ReactNode, testid: string) => (
    <div className="rounded p-3 space-y-2" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid={testid}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: ACCENT }}>
        {icon} {title}
      </div>
      {children}
    </div>
  );

  const btn = (label: string, onClick: () => void, busy?: boolean, testid?: string, icon?: React.ReactNode) => (
    <button onClick={onClick} disabled={busy} className="px-2 py-1 rounded text-[10px] flex items-center gap-1" style={{ background: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}40`, opacity: busy ? 0.6 : 1 }} data-testid={testid}>
      {icon} {busy ? "…" : label}
    </button>
  );

  return (
    <div className="p-3 sm:p-4 space-y-3" data-testid="ai-studio-tab">
      {/* B1 · Palette */}
      {section("Palette Extractor", <Palette size={11} />, (
        <>
          <label className="block px-2 py-2 rounded cursor-pointer text-[10px] text-center" style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px dashed ${ACCENT}60` }} data-testid="palette-upload">
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && onPaletteUpload(e.target.files[0])} />
            Drop inspiration image to extract 5-color palette
          </label>
          {loading.palette && <div className="text-[10px]" style={{ color: "#94a3b8" }}>Extracting colors…</div>}
          {result.palette && (
            <div className="space-y-1" data-testid="palette-result">
              <div className="flex gap-1">
                {result.palette.palette.map((c: any, i: number) => (
                  <div key={i} className="flex-1 h-10 rounded flex items-end justify-center pb-1 text-[8px] font-bold" style={{ background: c.hex, color: "#0008" }} title={c.label}>{c.hex}</div>
                ))}
              </div>
              <div className="text-[10px]" style={{ color: "#94a3b8" }}>{result.palette.theme_description}</div>
              <div className="text-[9px]" style={{ color: ACCENT }}>Suggested finish: {result.palette.suggested_finish}</div>
              {applyPalette && <button onClick={() => applyPalette(result.palette.palette.map((c: any) => c.hex))} className="w-full px-2 py-1 rounded text-[10px]" style={{ background: `${ACCENT}32`, color: ACCENT, border: `1px solid ${ACCENT}` }} data-testid="palette-apply">Apply to tiers →</button>}
            </div>
          )}
        </>
      ), "ai-palette-section")}

      {/* B2 · Descriptions */}
      {section("AI Copy (Claude Sonnet)", <Wand2 size={11} />, (
        <>
          <div className="flex gap-1 flex-wrap">
            {["elegant", "playful", "rustic", "modern", "whimsical"].map(t => (
              <button key={t} onClick={() => runDescription(t)} disabled={loading.descriptions} className="px-2 py-1 rounded text-[9px] capitalize" style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}40` }} data-testid={`desc-${t}`}>{t}</button>
            ))}
          </div>
          {loading.descriptions && <div className="text-[10px]" style={{ color: "#94a3b8" }}>Writing…</div>}
          {result.descriptions && (
            <div className="space-y-1 text-[10px]" data-testid="desc-result">
              <div className="font-semibold" style={{ color: ACCENT }}>{result.descriptions.headline}</div>
              <div style={{ color: "#cbd5e1" }}>{result.descriptions.long_description}</div>
              <div className="flex flex-wrap gap-1 text-[8px]">
                {(result.descriptions.hashtags || []).map((h: string) => <span key={h} className="px-1 py-0.5 rounded" style={{ background: `${ACCENT}18`, color: ACCENT }}>#{h}</span>)}
              </div>
              {applyDescription && <button onClick={() => applyDescription(result.descriptions.long_description)} className="w-full px-2 py-1 rounded text-[10px]" style={{ background: `${ACCENT}32`, color: ACCENT, border: `1px solid ${ACCENT}` }} data-testid="desc-apply">Attach to session</button>}
            </div>
          )}
        </>
      ), "ai-descriptions-section")}

      {/* B3 · Photoreal Studio (gated) */}
      {section(`Photoreal Studio ${features.photoreal_render ? "" : "— Add-on"}`, features.photoreal_render ? <ImageIcon size={11} /> : <Lock size={11} />, (
        features.photoreal_render ? (
          <>
            <div className="flex gap-1 flex-wrap">
              {["studio", "outdoor_garden", "reception_hall", "minimalist"].map(s => (
                <button key={s} onClick={() => runPhotoreal(s)} disabled={loading.photoreal} className="px-2 py-1 rounded text-[9px]" style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}40` }} data-testid={`photoreal-${s}`}>
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
            {loading.photoreal && <div className="text-[10px]" style={{ color: "#94a3b8" }}>Rendering (~15s)…</div>}
            {result.photoreal?.image_url && (
              <>
                <img src={result.photoreal.image_url} alt="photoreal render" className="w-full rounded" data-testid="photoreal-image" />
                <div className="flex gap-1 flex-wrap pt-1">
                  <span className="text-[10px]" style={{ color: ACCENT }}>Bring to Life:</span>
                  {["rotate_360", "cutaway_reveal", "glaze_pour", "zoom_in"].map(m => (
                    <button key={m} onClick={() => runBringToLife(m)} disabled={loading.video} className="px-2 py-1 rounded text-[9px] flex items-center gap-1" style={{ background: `${ACCENT}22`, color: ACCENT, border: `1px solid ${ACCENT}60` }} data-testid={`video-${m}`}>
                      <Film size={8} /> {m.replace("_", " ")}
                    </button>
                  ))}
                </div>
                {loading.video && <div className="text-[10px]" style={{ color: "#94a3b8" }}>Generating video (~60s)…</div>}
                {result.video?.video_url && (
                  <video src={result.video.video_url} controls className="w-full rounded" data-testid="photoreal-video" />
                )}
              </>
            )}
          </>
        ) : (
          <div className="text-[10px] space-y-1" style={{ color: "#94a3b8" }}>
            <div>Photoreal Studio produces magazine-quality renders and cinematic videos.</div>
            <div style={{ color: AMBER }}>Configure FAL_KEY in backend/.env to unlock.</div>
            <div>Get a key at <a href="https://fal.ai/dashboard/keys" target="_blank" rel="noreferrer" style={{ color: ACCENT, textDecoration: "underline" }}>fal.ai/dashboard/keys</a></div>
          </div>
        )
      ), "ai-photoreal-section")}

      {/* B4 · Feasibility */}
      {section("Structural Feasibility", <ShieldCheck size={11} />, (
        <>
          {btn("Run check", runFeasibility, loading.feasibility, "feasibility-run")}
          {result.feasibility && (
            <div className="space-y-1" data-testid="feasibility-result">
              <div className="text-[11px] font-bold" style={{ color: result.feasibility.overall === "HIGH" ? RED : result.feasibility.overall === "WARN" ? AMBER : GREEN }}>
                {result.feasibility.overall} · {result.feasibility.summary.high} high · {result.feasibility.summary.warn} warn · {result.feasibility.summary.ok} ok
              </div>
              {result.feasibility.issues.slice(0, 6).map((iss: any, i: number) => (
                <div key={i} className="text-[9px] px-2 py-1 rounded" style={{ background: iss.severity === "HIGH" ? `${RED}20` : iss.severity === "WARN" ? `${AMBER}20` : `${GREEN}15`, color: "#cbd5e1" }}>
                  <div style={{ color: iss.severity === "HIGH" ? RED : iss.severity === "WARN" ? AMBER : GREEN }}>{iss.severity}{iss.tier_index !== null && iss.tier_index !== undefined ? ` · T${iss.tier_index + 1}` : ""}</div>
                  <div>{iss.issue}</div>
                  <div style={{ color: "#94a3b8" }}>{iss.recommendation}</div>
                </div>
              ))}
            </div>
          )}
        </>
      ), "ai-feasibility-section")}

      {/* B5 · BEO PDF */}
      {section("BEO PDF Pack", <FileDown size={11} />, (
        <>
          {btn("Download BEO PDF", downloadBEO, false, "beo-download")}
          <div className="text-[9px]" style={{ color: "#94a3b8" }}>Client ready: intake + tier construction + delivery + pricing + description.</div>
        </>
      ), "ai-beo-section")}

      {/* B6 · Timeline */}
      {section("Critical-Path Timeline", <Clock size={11} />, (
        <>
          {btn("Generate timeline", runTimeline, loading.timeline, "timeline-run")}
          {result.timeline && (
            <div className="space-y-0.5 text-[9px]" data-testid="timeline-result">
              <div style={{ color: ACCENT }}>Total: {result.timeline.total_hours}h backward from event</div>
              {result.timeline.windows.slice(0, 8).map((w: any, i: number) => (
                <div key={i} style={{ color: "#cbd5e1" }}>• <b>{w.task}</b> — {w.start.slice(0, 16).replace("T", " ")} · {w.duration_hours}h</div>
              ))}
            </div>
          )}
        </>
      ), "ai-timeline-section")}

      {/* B7 · Allergens */}
      {section("Allergen Check", <AlertTriangle size={11} />, (
        <>
          {btn("Scan allergens", runAllergen, loading.allergens, "allergens-run")}
          {result.allergens && (
            <div className="space-y-1 text-[9px]" data-testid="allergens-result">
              <div style={{ color: result.allergens.safe_to_serve ? GREEN : RED }}>
                {result.allergens.safe_to_serve ? "✓ Safe to serve for listed restrictions" : `⚠ ${result.allergens.violations.length} allergen violation(s)`}
              </div>
              <div style={{ color: "#94a3b8" }}>Contains: {result.allergens.all_allergens.join(", ") || "none"}</div>
              {result.allergens.violations.slice(0, 3).map((v: any, i: number) => (
                <div key={i} className="px-2 py-1 rounded" style={{ background: `${RED}20`, color: RED }}>{v.name} → {v.allergen} : {v.recommendation}</div>
              ))}
            </div>
          )}
        </>
      ), "ai-allergens-section")}

      {/* B9 · Design Library */}
      {section("Save to Design Library", <BookmarkPlus size={11} />, (
        <>
          <input placeholder="Look name" value={lookName} onChange={e => setLookName(e.target.value)} className="w-full px-2 py-1 rounded text-[10px] bg-transparent outline-none" style={{ color: "var(--foreground, #fff)", border: `1px solid ${BORDER}` }} data-testid="library-look-name" />
          {btn("Save as reusable look", saveToLibrary, loading.library, "library-save")}
          {result.library && (
            <div className="text-[9px]" style={{ color: GREEN }} data-testid="library-saved">✓ Saved · {result.library.look_id}</div>
          )}
        </>
      ), "ai-library-section")}

      {/* B10 · Pricing */}
      {section("Revenue Autopilot", <TrendingUp size={11} />, (
        <>
          {btn("Suggest price", runPricing, loading.pricing, "pricing-run")}
          {result.pricing && (
            <div className="space-y-1 text-[9px]" data-testid="pricing-result">
              <div className="text-[16px] font-bold" style={{ color: ACCENT }}>${result.pricing.suggested_price_per_serving_usd}/serving</div>
              <div style={{ color: "#94a3b8" }}>
                Base ${result.pricing.base_price_per_serving_usd} × {result.pricing.multiplier} ({result.pricing.dominant_finish})
                {result.pricing.rush_premium > 1 && ` · rush +${(result.pricing.rush_premium - 1) * 100}%`}
              </div>
              <div style={{ color: "#cbd5e1" }}>
                {result.pricing.servings_estimate} servings + ${result.pricing.delivery_fee_usd} delivery
              </div>
              <div className="text-[14px] font-bold" style={{ color: GREEN }}>
                Total revenue: ${result.pricing.total_revenue_usd.toLocaleString()}
              </div>
            </div>
          )}
        </>
      ), "ai-pricing-section")}

      {/* Errors */}
      {Object.entries(err).map(([k, v]) => v ? (
        <div key={k} className="text-[9px] px-2 py-1 rounded" style={{ background: `${RED}20`, color: RED }}>{k}: {v.slice(0, 200)}</div>
      ) : null)}

      <div className="text-[9px] pt-2 text-center" style={{ color: "#64748b" }}>
        <Sparkles size={9} className="inline mr-1" />
        Powered by Emergent Universal Key · {features.photoreal_render ? "Photoreal Studio ON" : "Photoreal Studio — add-on"}
      </div>
    </div>
  );
}
