/**
 * IntakeTab · CutGuideTab · PortionsTab · TemplatesTab
 * Grouped into one file since each is small and shares ACCENT/BORDER tokens.
 */
import React from "react";
import { FileText, Truck, Cake, Scissors, DollarSign, AlertCircle, Wand2, Heart } from "lucide-react";
import type { Intake, Tier } from "./types";
import { ACCENT, BORDER, SURFACE, AMBER, GREEN, fmt } from "./types";

// ────────────────────────── Intake ──────────────────────────
export function IntakeTab({ intake, setIntake, sizing, applySizing }: {
  intake: Intake; setIntake: (i: Intake) => void; sizing: any; applySizing: () => void;
}) {
  const fg = "var(--foreground, #fff)";
  const field = (label: string, key: keyof Intake, type = "text", placeholder = "") => (
    <label className="block space-y-1">
      <span className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>{label}</span>
      <input
        type={type}
        value={(intake as any)[key] || ""}
        placeholder={placeholder}
        onChange={e => setIntake({ ...intake, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
        className="w-full px-2 py-1.5 rounded text-[11px] bg-transparent outline-none"
        style={{ color: fg, border: `1px solid ${BORDER}` }}
        data-testid={`intake-${String(key)}`}
      />
    </label>
  );
  return (
    <div className="p-3 sm:p-4 space-y-3" data-testid="intake-tab">
      <div className="text-[11px] uppercase tracking-[0.2em] font-semibold flex items-center gap-1" style={{ color: ACCENT }}>
        <FileText size={11} /> Client Intake
      </div>

      <div className="grid grid-cols-2 gap-2">
        {field("Client Name", "client_name")}
        {field("BEO Number", "beo_number")}
        {field("Email", "client_email", "email")}
        {field("Phone", "client_phone", "tel")}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {field("Event Date", "event_date", "date")}
        <label className="block space-y-1">
          <span className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Event Type</span>
          <select value={intake.event_type || ""} onChange={e => setIntake({ ...intake, event_type: e.target.value })} className="w-full px-2 py-1.5 rounded text-[11px] bg-transparent outline-none" style={{ color: fg, border: `1px solid ${BORDER}` }} data-testid="intake-event_type">
            <option value="">—</option>
            <option value="wedding">Wedding</option>
            <option value="birthday">Birthday</option>
            <option value="anniversary">Anniversary</option>
            <option value="corporate">Corporate</option>
            <option value="baby_shower">Baby Shower</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {field("Guest Count", "guest_count", "number", "150")}
        <label className="block space-y-1">
          <span className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Slice Size</span>
          <select value={intake.slice_size || "wedding"} onChange={e => setIntake({ ...intake, slice_size: e.target.value as any })} className="w-full px-2 py-1.5 rounded text-[11px] bg-transparent outline-none" style={{ color: fg, border: `1px solid ${BORDER}` }} data-testid="intake-slice_size">
            <option value="wedding">Wedding (1"×2", 2 sq in)</option>
            <option value="standard">Standard (1.5"×2", 3 sq in)</option>
            <option value="party">Party (2"×2", 4 sq in)</option>
          </select>
        </label>
      </div>

      {field("Theme / Color Palette", "theme", "text", "e.g. blush + champagne gold")}

      {intake.guest_count && sizing?.recommended && (
        <div className="rounded p-3 space-y-1" style={{ background: `${ACCENT}14`, border: `1px solid ${ACCENT}40` }} data-testid="sizing-recommendation">
          <div className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: ACCENT }}><Cake size={11} /> Recommended Cake</div>
          <div className="text-[14px] font-bold" style={{ color: fg }}>
            {sizing.recommended.tiers_in.join('" + ')}" = <span style={{ color: ACCENT }}>{sizing.recommended.servings} servings</span>
          </div>
          <div className="text-[9px]" style={{ color: "#94a3b8" }}>
            For {sizing.guests} guests · {sizing.recommended.tier_count} tier{sizing.recommended.tier_count > 1 ? "s" : ""} · +{sizing.recommended.excess} extra slices
          </div>
          <button onClick={applySizing} className="mt-1 px-2 py-1 rounded text-[10px]" style={{ background: `${ACCENT}30`, color: ACCENT, border: `1px solid ${ACCENT}` }} data-testid="apply-sizing">Apply to 3D model →</button>
          {sizing.alternatives?.length > 0 && (
            <div className="pt-2 mt-1 border-t text-[9px]" style={{ color: "#94a3b8", borderColor: `${ACCENT}20` }}>
              Alternatives: {sizing.alternatives.slice(0, 3).map((a: any) => `${a.tiers_in.join('/')}" (${a.servings})`).join(" · ")}
            </div>
          )}
        </div>
      )}

      <div className="pt-2 space-y-2">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold flex items-center gap-1" style={{ color: ACCENT }}>
          <Truck size={10} /> Delivery
        </div>
        <label className="flex items-center gap-2 text-[11px]" style={{ color: fg }}>
          <input type="checkbox" checked={!!intake.delivery_required} onChange={e => setIntake({ ...intake, delivery_required: e.target.checked })} data-testid="intake-delivery_required" />
          <span>Delivery required</span>
        </label>
        {intake.delivery_required && (
          <>
            {field("Delivery Address", "delivery_address")}
            {field("Delivery Time", "delivery_time", "datetime-local")}
            {field("Notes (stairs, AC, fragile)", "delivery_notes")}
          </>
        )}
      </div>

      <div className="pt-2">
        {field("Price Quote (USD, total)", "price_quote_usd", "number", "1200")}
      </div>
    </div>
  );
}

// ────────────────────────── Cut Guide ──────────────────────────
export function CutGuideTab({ cutGuide, tiers }: { cutGuide: any; tiers: Tier[] }) {
  if (!cutGuide) return <div className="p-4 text-[11px]" style={{ color: "#94a3b8" }} data-testid="cut-guide-tab">Calculating cut pattern…</div>;
  const maxR = Math.max(...cutGuide.rings.map((r: any) => r.outer_r));
  const size = 280;
  const scale = (size / 2 - 8) / maxR;
  return (
    <div className="p-3 sm:p-4 space-y-3" data-testid="cut-guide-tab">
      <div className="text-[11px] uppercase tracking-[0.2em] font-semibold flex items-center gap-1" style={{ color: ACCENT }}>
        <Scissors size={11} /> Cut Guide · Tier {cutGuide.diameter_in}"
      </div>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block", margin: "0 auto" }}>
        <circle cx={size / 2} cy={size / 2} r={maxR * scale} fill="rgba(200,169,126,0.08)" stroke={ACCENT} strokeWidth="1" />
        {cutGuide.rings.map((r: any, i: number) => (
          <g key={i}>
            <circle cx={size / 2} cy={size / 2} r={r.outer_r * scale} fill="none" stroke={ACCENT} strokeWidth="0.5" strokeDasharray="2,2" />
            {Array.from({ length: r.slices }).map((_, si) => {
              const a = (si / r.slices) * Math.PI * 2;
              const x1 = size / 2 + Math.cos(a) * r.inner_r * scale;
              const y1 = size / 2 + Math.sin(a) * r.inner_r * scale;
              const x2 = size / 2 + Math.cos(a) * r.outer_r * scale;
              const y2 = size / 2 + Math.sin(a) * r.outer_r * scale;
              return <line key={si} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ACCENT} strokeWidth="0.6" opacity="0.7" />;
            })}
          </g>
        ))}
      </svg>
      <div className="rounded p-2 text-[11px]" style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "var(--foreground, #fff)" }}>
        <div className="flex items-center justify-between"><span>Total slices</span><span className="font-bold" style={{ color: ACCENT }}>{cutGuide.total_slices}</span></div>
        <div className="flex items-center justify-between text-[10px]" style={{ color: "#94a3b8" }}><span>Slice size</span><span>{cutGuide.slice_size}</span></div>
      </div>
      <ol className="text-[10px] space-y-1 list-decimal pl-5" style={{ color: "#94a3b8" }}>
        {cutGuide.instructions.map((step: string, i: number) => <li key={i}>{step}</li>)}
      </ol>
      <div className="text-[9px] pt-2" style={{ color: "#64748b" }}>
        Tip: this pattern applies to the base tier ({tiers[0]?.radius * 2 * 5}″ dia). Smaller tiers follow the same method at reduced scale.
      </div>
    </div>
  );
}

// ────────────────────────── Portions & Cost ──────────────────────────
export function PortionsTab({ portions, sessionId, refresh }: { portions: any; sessionId: string | null; refresh: () => void }) {
  if (!sessionId) return (
    <div className="p-4 text-[11px] flex flex-col items-start gap-2" data-testid="portions-tab">
      <div style={{ color: AMBER }} className="flex items-center gap-1"><AlertCircle size={11} /> Save the cake first</div>
      <div style={{ color: "#94a3b8" }} className="text-[10px]">Portion + cost estimator runs against the persisted session.</div>
    </div>
  );
  if (!portions) return <div className="p-4 text-[11px]" style={{ color: "#94a3b8" }} data-testid="portions-tab">Loading…</div>;
  return (
    <div className="p-3 sm:p-4 space-y-3" data-testid="portions-tab">
      <div className="text-[11px] uppercase tracking-[0.2em] font-semibold flex items-center gap-1" style={{ color: ACCENT }}>
        <DollarSign size={11} /> Portions & Cost
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded p-2" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="portions-total-servings">
          <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Total Servings</div>
          <div className="text-[22px] font-bold" style={{ color: ACCENT }}>{portions.total_servings}</div>
        </div>
        <div className="rounded p-2" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid="portions-total-cost">
          <div className="text-[9px] uppercase" style={{ color: "#94a3b8" }}>Total Cost</div>
          <div className="text-[22px] font-bold" style={{ color: "var(--foreground, #fff)" }}>${fmt(portions.total_cost_usd, 2)}</div>
          <div className="text-[9px]" style={{ color: "#94a3b8" }}>${fmt(portions.cost_per_serving_usd, 2)} / serving</div>
        </div>
      </div>
      {portions.revenue_usd && (
        <div className="rounded p-2" style={{ background: (portions.margin_pct ?? 0) > 50 ? `${GREEN}18` : `${AMBER}18`, border: `1px solid ${(portions.margin_pct ?? 0) > 50 ? GREEN : AMBER}40` }} data-testid="portions-margin">
          <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: "var(--foreground, #fff)" }}>Revenue ${fmt(portions.revenue_usd, 2)} · Margin</span>
            <span className="font-bold" style={{ color: (portions.margin_pct ?? 0) > 50 ? GREEN : AMBER }}>
              ${fmt(portions.margin_usd, 2)} ({portions.margin_pct}%)
            </span>
          </div>
        </div>
      )}
      <div className="rounded overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div className="px-2 py-1 text-[9px] uppercase" style={{ background: `${ACCENT}10`, color: ACCENT }}>Per-tier breakdown</div>
        {portions.tiers.map((t: any) => (
          <div key={t.tier} className="flex items-center justify-between px-2 py-1 text-[10px] border-t" style={{ borderColor: BORDER, color: "var(--foreground, #fff)" }}>
            <span>Tier {t.tier} · {t.diameter_in}″ · {t.finish}</span>
            <span><span style={{ color: ACCENT }}>{t.servings}</span> svg · ${fmt(t.tier_cost_usd, 2)}</span>
          </div>
        ))}
      </div>
      <button onClick={refresh} className="px-2 py-1 rounded text-[10px]" style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px solid ${ACCENT}40` }}>↻ Recompute</button>
    </div>
  );
}

// ────────────────────────── Templates ──────────────────────────
export function TemplatesTab({ templates, apply }: { templates: any[]; apply: (id: string) => void }) {
  return (
    <div className="p-3 sm:p-4 space-y-2" data-testid="templates-tab">
      <div className="text-[11px] uppercase tracking-[0.2em] font-semibold flex items-center gap-1" style={{ color: ACCENT }}>
        <Wand2 size={11} /> Starter Templates
      </div>
      <div className="text-[10px]" style={{ color: "#94a3b8" }}>One-click starting points. Override freely after loading.</div>
      {templates.map(t => (
        <button key={t.id} onClick={() => apply(t.id)} className="w-full text-left rounded p-3 hover:opacity-90 transition" style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "var(--foreground, #fff)" }} data-testid={`template-${t.id}`}>
          <div className="flex items-center gap-2">
            {t.id === "classic_wedding" ? <Heart size={14} style={{ color: ACCENT }} /> : <Cake size={14} style={{ color: ACCENT }} />}
            <span className="text-[12px] font-semibold" style={{ color: ACCENT }}>{t.title}</span>
          </div>
          <div className="text-[9px] mt-1" style={{ color: "#94a3b8" }}>{t.id.replace("_", " ")}</div>
        </button>
      ))}
    </div>
  );
}
