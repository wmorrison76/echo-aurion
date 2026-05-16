/**
 * DesignTab — tier designer, Mad Hatter, fillings editor, toppers, scene colors.
 */
import React from "react";
import { Sparkles, Layers, Plus, X, Palette, Upload, Star, Brush, Flower2 } from "lucide-react";
import type { Tier, Topper, Filling, FlowerDeco } from "./types";
import { ACCENT, BORDER, SURFACE, RED, blankTier } from "./types";
import { PIPING_CATALOG } from "./CakePiping";
import { FLOWER_ARRANGEMENTS } from "./CakeFlowers";
import { STAND_CATALOG } from "./CakeStands";

interface Props {
  tiers: Tier[];
  setTiers: React.Dispatch<React.SetStateAction<Tier[]>>;
  toppers: Topper[];
  setToppers: React.Dispatch<React.SetStateAction<Topper[]>>;
  flowers: FlowerDeco[];
  setFlowers: React.Dispatch<React.SetStateAction<FlowerDeco[]>>;
  addTier: () => void;
  removeTier: (i: number) => void;
  addTopper: (k: Topper["kind"]) => void;
  editingFillingsFor: number | null;
  setEditingFillingsFor: (n: number | null) => void;
  editingMadHatterFor: number | null;
  setEditingMadHatterFor: (n: number | null) => void;
  bg: string;
  setBg: (c: string) => void;
  standColor: string;
  setStandColor: (c: string) => void;
  standKind: string;
  setStandKind: (k: string) => void;
}

export default function DesignTab(props: Props) {
  const {
    tiers, setTiers, toppers, setToppers, flowers, setFlowers,
    addTier, removeTier, addTopper,
    editingFillingsFor, setEditingFillingsFor, editingMadHatterFor, setEditingMadHatterFor,
    bg, setBg, standColor, setStandColor, standKind, setStandKind,
  } = props;

  return (
    <div className="p-3 sm:p-4 space-y-3" data-testid="cake-controls">
      <div className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: ACCENT }}>
        <Sparkles size={10} className="inline mr-1" /> Tier Designer
      </div>
      {tiers.map((t, i) => (
        <div key={i} className="rounded p-3 space-y-2" style={{ background: SURFACE, border: `1px solid ${BORDER}` }} data-testid={`tier-${i}`}>
          <div className="flex items-center justify-between text-[10px]">
            <span className="uppercase" style={{ color: "#94a3b8" }}>Tier {i + 1}</span>
            <div className="flex items-center gap-1">
              <span className="font-mono" style={{ color: ACCENT }}>r{t.radius.toFixed(1)} · h{t.height.toFixed(1)}</span>
              {tiers.length > 1 && <button onClick={() => removeTier(i)} className="p-0.5" style={{ color: RED }}><X size={10} /></button>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="color" value={t.color} onChange={e => setTiers(p => p.map((x, ix) => ix === i ? { ...x, color: e.target.value } : x))} style={{ width: 30, height: 24, border: "none", cursor: "pointer", background: "transparent" }} data-testid={`tier-${i}-color`} />
            <input type="range" min="0.3" max="1.6" step="0.05" value={t.radius} onChange={e => setTiers(p => p.map((x, ix) => ix === i ? { ...x, radius: Number(e.target.value) } : x))} style={{ flex: 1, accentColor: ACCENT }} />
            <input type="range" min="0.25" max="0.85" step="0.05" value={t.height} onChange={e => setTiers(p => p.map((x, ix) => ix === i ? { ...x, height: Number(e.target.value) } : x))} style={{ flex: 1, accentColor: ACCENT }} />
          </div>
          <div className="flex items-center gap-1 text-[9px]">
            <Palette size={10} style={{ color: ACCENT }} />
            <select value={t.shape || "round"} onChange={e => {
              const sh = e.target.value as Tier["shape"];
              setTiers(p => p.map((x, ix) => {
                if (ix !== i) return x;
                // Apply sensible defaults when switching shape
                const next: Tier = { ...x, shape: sh };
                if (sh === "mad_hatter" && (!x.taper || x.taper === 0)) next.taper = 0.25;
                if (sh === "topsy_turvy" && (!x.wave || x.wave === 0)) next.wave = 0.12;
                return next;
              }));
            }} className="flex-1 bg-transparent px-1 py-0.5 rounded outline-none" style={{ color: "var(--foreground, #fff)", border: `1px solid ${BORDER}` }} data-testid={`tier-${i}-shape`}>
              <option value="round">Round</option>
              <option value="square">Square</option>
              <option value="heart">Heart</option>
              <option value="hex">Hexagon</option>
              <option value="sheet">Sheet (rectangular)</option>
              <option value="mad_hatter">Mad Hatter (tapered)</option>
              <option value="topsy_turvy">Topsy-Turvy (wavy)</option>
            </select>
            <select value={t.finish} onChange={e => setTiers(p => p.map((x, ix) => ix === i ? { ...x, finish: e.target.value as Tier["finish"] } : x))} className="flex-1 bg-transparent px-1 py-0.5 rounded outline-none" style={{ color: "var(--foreground, #fff)", border: `1px solid ${BORDER}` }} data-testid={`tier-${i}-finish`}>
              <option value="buttercream">Buttercream</option>
              <option value="fondant">Fondant</option>
              <option value="drip">Drip / ganache</option>
              <option value="mirror">Mirror glaze</option>
              <option value="naked">Naked</option>
              <option value="semi-naked">Semi-naked</option>
            </select>
          </div>
          {t.shape === "mad_hatter" && (
            <div className="flex items-center gap-2 text-[9px]" style={{ color: "#94a3b8" }}>
              <span className="w-14">Taper</span>
              <input type="range" min="0" max="0.6" step="0.02" value={t.taper ?? 0.25} onChange={e => setTiers(p => p.map((x, ix) => ix === i ? { ...x, taper: Number(e.target.value) } : x))} style={{ flex: 1, accentColor: ACCENT }} data-testid={`tier-${i}-taper`} />
              <span className="w-10 font-mono" style={{ color: ACCENT }}>{(t.taper ?? 0.25).toFixed(2)}</span>
            </div>
          )}
          {t.shape === "topsy_turvy" && (
            <div className="flex items-center gap-2 text-[9px]" style={{ color: "#94a3b8" }}>
              <span className="w-14">Wave</span>
              <input type="range" min="0.02" max="0.25" step="0.01" value={t.wave && t.wave > 0 ? t.wave : 0.12} onChange={e => setTiers(p => p.map((x, ix) => ix === i ? { ...x, wave: Number(e.target.value) } : x))} style={{ flex: 1, accentColor: ACCENT }} data-testid={`tier-${i}-wave`} />
              <span className="w-10 font-mono" style={{ color: ACCENT }}>{(t.wave && t.wave > 0 ? t.wave : 0.12).toFixed(2)}</span>
            </div>
          )}
          <label className="flex items-center gap-1 px-2 py-1 rounded cursor-pointer text-[10px]" style={{ background: `${ACCENT}14`, color: ACCENT, border: `1px dashed ${ACCENT}40` }}>
            <Upload size={10} /> {t.texture_url ? "Replace texture" : "Wrap texture"}
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (!f) return;
              const rd = new FileReader();
              rd.onload = () => setTiers(p => p.map((x, ix) => ix === i ? { ...x, texture_url: rd.result as string } : x));
              rd.readAsDataURL(f);
            }} data-testid={`tier-${i}-upload`} />
          </label>

          <button onClick={() => setEditingMadHatterFor(editingMadHatterFor === i ? null : i)} className="flex items-center justify-between w-full px-2 py-1 rounded text-[10px]" style={{ background: `${ACCENT}14`, color: ACCENT, border: `1px solid ${ACCENT}30` }} data-testid={`tier-${i}-madhatter-btn`}>
            <span className="flex items-center gap-1">Mad Hatter · tilt/offset</span>
            <span>{editingMadHatterFor === i ? "▾" : "▸"}</span>
          </button>
          {editingMadHatterFor === i && (
            <div className="space-y-1 pl-2 border-l-2 text-[9px]" style={{ borderColor: `${ACCENT}30`, color: "#94a3b8" }} data-testid={`tier-${i}-madhatter`}>
              {[
                { key: "tilt_x", label: "Tilt X", min: -0.35, max: 0.35, step: 0.02 },
                { key: "tilt_z", label: "Tilt Z", min: -0.35, max: 0.35, step: 0.02 },
                { key: "offset_x", label: "Offset X", min: -0.5, max: 0.5, step: 0.02 },
                { key: "offset_z", label: "Offset Z", min: -0.5, max: 0.5, step: 0.02 },
              ].map(row => (
                <div key={row.key} className="flex items-center gap-2">
                  <span className="w-14">{row.label}</span>
                  <input type="range" min={row.min} max={row.max} step={row.step} value={(t as any)[row.key]} onChange={e => setTiers(p => p.map((x, ix) => ix === i ? { ...x, [row.key]: Number(e.target.value) } : x))} style={{ flex: 1, accentColor: ACCENT }} />
                  <span className="w-10 font-mono" style={{ color: ACCENT }}>{(t as any)[row.key].toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => setEditingFillingsFor(editingFillingsFor === i ? null : i)} className="flex items-center justify-between w-full px-2 py-1 rounded text-[10px]" style={{ background: `${ACCENT}14`, color: ACCENT, border: `1px solid ${ACCENT}30` }} data-testid={`tier-${i}-fillings-btn`}>
            <span className="flex items-center gap-1"><Layers size={10} /> Fillings · {(t.fillings || []).length} layers</span>
            <span>{editingFillingsFor === i ? "▾" : "▸"}</span>
          </button>
          {editingFillingsFor === i && (
            <div className="space-y-1 pl-2 border-l-2" style={{ borderColor: `${ACCENT}30` }} data-testid={`tier-${i}-fillings-editor`}>
              <div className="text-[9px]" style={{ color: "#94a3b8" }}>Stack internal elements from base ↑ to top.</div>
              {(t.fillings || []).map((f: Filling, fi: number) => (
                <div key={fi} className="space-y-0.5 border-b pb-1 mb-1" style={{ borderColor: BORDER }}>
                  <div className="flex items-center gap-1">
                    <input type="color" value={f.color} onChange={e => setTiers(p => p.map((x, ix) => ix === i ? { ...x, fillings: (x.fillings || []).map((ff, ffi) => ffi === fi ? { ...ff, color: e.target.value } : ff) } : x))} style={{ width: 22, height: 20, border: "none", cursor: "pointer", background: "transparent" }} />
                    <input type="text" value={f.name} onChange={e => setTiers(p => p.map((x, ix) => ix === i ? { ...x, fillings: (x.fillings || []).map((ff, ffi) => ffi === fi ? { ...ff, name: e.target.value } : ff) } : x))} className="flex-1 px-1 py-0.5 rounded text-[9px] bg-transparent outline-none" style={{ color: "var(--foreground, #fff)", border: `1px solid ${BORDER}` }} data-testid={`tier-${i}-fill-${fi}-name`} />
                    <button onClick={() => setTiers(p => p.map((x, ix) => ix === i ? { ...x, fillings: (x.fillings || []).filter((_, ffi) => ffi !== fi) } : x))} className="p-0.5" style={{ color: RED }}><X size={10} /></button>
                  </div>
                  <div className="flex items-center gap-1">
                    <select value={(f as any).kind || "sponge"} onChange={e => setTiers(p => p.map((x, ix) => ix === i ? { ...x, fillings: (x.fillings || []).map((ff, ffi) => ffi === fi ? { ...ff, kind: e.target.value as any } : ff) } : x))} className="flex-1 bg-transparent px-1 py-0.5 rounded text-[9px] outline-none" style={{ color: ACCENT, border: `1px solid ${BORDER}` }} data-testid={`tier-${i}-fill-${fi}-kind`}>
                      <optgroup label="Biscuits / Sponges">
                        <option value="sponge">Sponge</option>
                        <option value="genoise">Génoise</option>
                        <option value="joconde">Biscuit Joconde</option>
                        <option value="dacquoise">Dacquoise</option>
                      </optgroup>
                      <optgroup label="Crunch">
                        <option value="streusel">Streusel</option>
                        <option value="feuilletine">Feuilletine (praliné)</option>
                        <option value="praline">Praliné</option>
                        <option value="financier">Financier</option>
                      </optgroup>
                      <optgroup label="Cream / Custards">
                        <option value="cremeux">Crémeux</option>
                        <option value="curd">Fruit curd</option>
                        <option value="ganache">Ganache</option>
                      </optgroup>
                      <optgroup label="Mousse / Gels / Glaze">
                        <option value="mousse">Mousse</option>
                        <option value="gelee">Gelée insert</option>
                        <option value="compote">Compote</option>
                        <option value="glaze">Mirror glaze</option>
                      </optgroup>
                    </select>
                    <input type="range" min="0.02" max="0.3" step="0.01" value={f.height} onChange={e => setTiers(p => p.map((x, ix) => ix === i ? { ...x, fillings: (x.fillings || []).map((ff, ffi) => ffi === fi ? { ...ff, height: Number(e.target.value) } : ff) } : x))} style={{ width: 40, accentColor: ACCENT }} title="Thickness" />
                    <input type="number" step="0.05" value={f.cost_per_serving_usd || 0} onChange={e => setTiers(p => p.map((x, ix) => ix === i ? { ...x, fillings: (x.fillings || []).map((ff, ffi) => ffi === fi ? { ...ff, cost_per_serving_usd: Number(e.target.value) } : ff) } : x))} title="Cost per serving ($)" className="w-12 px-1 py-0.5 rounded text-[9px] bg-transparent outline-none" style={{ color: ACCENT, border: `1px solid ${BORDER}` }} />
                  </div>
                  {((f as any).kind === "mousse" || (f as any).kind === "ganache") && (
                    <div className="flex items-center gap-1 text-[9px]" style={{ color: "#94a3b8" }}>
                      <span className="w-14">Aeration</span>
                      <input type="range" min="0" max="1" step="0.05" value={(f as any).aeration ?? 0.5} onChange={e => setTiers(p => p.map((x, ix) => ix === i ? { ...x, fillings: (x.fillings || []).map((ff, ffi) => ffi === fi ? { ...ff, aeration: Number(e.target.value) } : ff) } : x))} style={{ flex: 1, accentColor: ACCENT }} />
                    </div>
                  )}
                  <input type="text" placeholder="Flavor notes (e.g. Madagascar vanilla)" value={(f as any).flavor || ""} onChange={e => setTiers(p => p.map((x, ix) => ix === i ? { ...x, fillings: (x.fillings || []).map((ff, ffi) => ffi === fi ? { ...ff, flavor: e.target.value } : ff) } : x))} className="w-full px-1 py-0.5 rounded text-[9px] bg-transparent outline-none" style={{ color: "#cbd5e1", border: `1px dashed ${BORDER}` }} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-1 pt-1">
                {[
                  { k: "sponge",     l: "+ Sponge",     c: "#f5d9a7", h: 0.14 },
                  { k: "dacquoise",  l: "+ Dacquoise",  c: "#f0d4a0", h: 0.12 },
                  { k: "feuilletine",l: "+ Feuilletine",c: "#a0622a", h: 0.04 },
                  { k: "cremeux",    l: "+ Crémeux",    c: "#fff2d8", h: 0.08 },
                  { k: "gelee",      l: "+ Gelée",      c: "#e74c3c", h: 0.06 },
                  { k: "mousse",     l: "+ Mousse",     c: "#fce9f5", h: 0.16 },
                  { k: "ganache",    l: "+ Ganache",    c: "#3a1f12", h: 0.06 },
                  { k: "glaze",      l: "+ Mirror Glaze", c: "#8b2f4b", h: 0.025 },
                ].map(opt => (
                  <button key={opt.k} onClick={() => setTiers(p => p.map((x, ix) => ix === i ? { ...x, fillings: [...(x.fillings || []), { name: opt.l.replace("+ ", ""), color: opt.c, height: opt.h, cost_per_serving_usd: 0.5, kind: opt.k as any }] } : x))} className="px-1.5 py-1 rounded text-[9px] text-left" style={{ background: `${opt.c}22`, color: ACCENT, border: `1px dashed ${opt.c}60` }} data-testid={`tier-${i}-quick-add-${opt.k}`}>
                    <span style={{ display: "inline-block", width: 8, height: 8, background: opt.c, borderRadius: 2, marginRight: 5, verticalAlign: "middle" }} />
                    {opt.l}
                  </button>
                ))}
              </div>
              <button onClick={() => setTiers(p => p.map((x, ix) => ix === i ? { ...x, fillings: [...(x.fillings || []), { name: "Custom Element", color: "#f5d9a7", height: 0.08, cost_per_serving_usd: 0.5, kind: "sponge" }] } : x))} className="w-full flex items-center justify-center gap-1 py-1 rounded text-[9px]" style={{ background: `${ACCENT}10`, color: ACCENT, border: `1px dashed ${ACCENT}40` }} data-testid={`tier-${i}-add-filling`}><Plus size={10} /> Custom element</button>
            </div>
          )}

          {/* Piping editor (iter153 A2) */}
          <div data-testid={`tier-${i}-piping-section`} className="space-y-1">
            <div className="flex items-center gap-1 text-[9px] uppercase" style={{ color: ACCENT }}>
              <Brush size={10} /> Piping · {(t.piping || []).length}
            </div>
            {(t.piping || []).map((p, pi) => (
              <div key={pi} className="flex items-center gap-1 text-[9px]" data-testid={`tier-${i}-pip-${pi}`}>
                <select value={p.kind} onChange={e => setTiers(prev => prev.map((x, ix) => ix === i ? { ...x, piping: (x.piping || []).map((pp, ppi) => ppi === pi ? { ...pp, kind: e.target.value as any } : pp) } : x))} className="flex-1 bg-transparent px-1 py-0.5 rounded text-[9px] outline-none" style={{ color: "var(--foreground, #fff)", border: `1px solid ${BORDER}` }}>
                  {PIPING_CATALOG.map(pc => <option key={pc.kind} value={pc.kind}>{pc.label}</option>)}
                </select>
                <select value={p.band} onChange={e => setTiers(prev => prev.map((x, ix) => ix === i ? { ...x, piping: (x.piping || []).map((pp, ppi) => ppi === pi ? { ...pp, band: e.target.value as any } : pp) } : x))} className="bg-transparent px-1 py-0.5 rounded text-[9px] outline-none" style={{ color: "var(--foreground, #fff)", border: `1px solid ${BORDER}` }}>
                  <option value="bottom">Base</option>
                  <option value="top">Top</option>
                  <option value="middle">Mid</option>
                </select>
                <input type="color" value={p.color} onChange={e => setTiers(prev => prev.map((x, ix) => ix === i ? { ...x, piping: (x.piping || []).map((pp, ppi) => ppi === pi ? { ...pp, color: e.target.value } : pp) } : x))} style={{ width: 22, height: 20, border: "none", cursor: "pointer", background: "transparent" }} />
                <input type="range" min="0.5" max="2" step="0.1" value={p.scale ?? 1} onChange={e => setTiers(prev => prev.map((x, ix) => ix === i ? { ...x, piping: (x.piping || []).map((pp, ppi) => ppi === pi ? { ...pp, scale: Number(e.target.value) } : pp) } : x))} style={{ width: 40, accentColor: ACCENT }} />
                <button onClick={() => setTiers(prev => prev.map((x, ix) => ix === i ? { ...x, piping: (x.piping || []).filter((_, ppi) => ppi !== pi) } : x))} style={{ color: RED }}><X size={10} /></button>
              </div>
            ))}
            <button onClick={() => setTiers(prev => prev.map((x, ix) => ix === i ? { ...x, piping: [...(x.piping || []), { kind: "bead", band: "bottom", color: ACCENT, scale: 1 }] } : x))} className="w-full flex items-center justify-center gap-1 py-1 rounded text-[9px]" style={{ background: `${ACCENT}10`, color: ACCENT, border: `1px dashed ${ACCENT}40` }} data-testid={`tier-${i}-add-piping`}><Plus size={10} /> Add Piping</button>
          </div>
        </div>
      ))}
      <button onClick={addTier} disabled={tiers.length >= 6} className="w-full py-1.5 rounded text-[10px]" style={{ background: `${ACCENT}18`, color: ACCENT, border: `1px dashed ${ACCENT}50`, opacity: tiers.length >= 6 ? 0.4 : 1 }} data-testid="add-tier">+ Add Tier {tiers.length >= 6 ? "(max 6)" : ""}</button>

      <div className="pt-3 space-y-2">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold flex items-center gap-1" style={{ color: ACCENT }}>
          <Star size={10} /> Cake Toppers
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[
            { k: "bride", label: "Bride" },
            { k: "groom", label: "Groom" },
            { k: "monogram", label: "Monogram" },
            { k: "number", label: "Number" },
            { k: "candle", label: "Candle" },
            { k: "flower", label: "Flower" },
          ].map(opt => (
            <button key={opt.k} onClick={() => addTopper(opt.k as any)} className="px-1 py-1 rounded text-[9px]" style={{ background: `${ACCENT}14`, color: ACCENT, border: `1px solid ${BORDER}` }} data-testid={`topper-${opt.k}`}>
              {opt.label}
            </button>
          ))}
        </div>
        {toppers.length > 0 && (
          <div className="space-y-1" data-testid="topper-list">
            {toppers.map((tp, i) => (
              <div key={i} className="flex items-center gap-1 text-[9px]">
                <input type="color" value={tp.color} onChange={e => setToppers(p => p.map((x, ix) => ix === i ? { ...x, color: e.target.value } : x))} style={{ width: 18, height: 16, border: "none", cursor: "pointer", background: "transparent" }} />
                <span className="flex-1">{tp.kind} {tp.label ? `· ${tp.label}` : ""}</span>
                {(tp.kind === "number" || tp.kind === "monogram") && (
                  <input type="text" value={tp.label || ""} onChange={e => setToppers(p => p.map((x, ix) => ix === i ? { ...x, label: e.target.value } : x))} className="w-12 px-1 py-0.5 rounded bg-transparent outline-none" style={{ color: ACCENT, border: `1px solid ${BORDER}` }} />
                )}
                <input type="range" min="0.5" max="2" step="0.1" value={tp.scale} onChange={e => setToppers(p => p.map((x, ix) => ix === i ? { ...x, scale: Number(e.target.value) } : x))} style={{ width: 40, accentColor: ACCENT }} />
                <button onClick={() => setToppers(p => p.filter((_, ix) => ix !== i))} style={{ color: RED }}><X size={10} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* iter153 A3 · Flower Arrangements */}
      <div className="pt-3 space-y-2" data-testid="flower-arrangements-section">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold flex items-center gap-1" style={{ color: ACCENT }}>
          <Flower2 size={10} /> Flower Arrangements
        </div>
        <div className="grid grid-cols-2 gap-1">
          {FLOWER_ARRANGEMENTS.map(arr => (
            <button
              key={arr.id}
              onClick={() => setFlowers(p => [...p, { arrangement_id: arr.id, placement: "top", scale: 1 }])}
              className="px-1.5 py-1 rounded text-[9px] text-left"
              style={{ background: `${ACCENT}10`, color: ACCENT, border: `1px solid ${BORDER}` }}
              data-testid={`flower-arr-${arr.id}`}
              title={arr.species.join(", ")}
            >
              {arr.title}
            </button>
          ))}
        </div>
        {flowers.length > 0 && (
          <div className="space-y-1" data-testid="flower-list">
            {flowers.map((fd, i) => {
              const arr = FLOWER_ARRANGEMENTS.find(a => a.id === fd.arrangement_id);
              return (
                <div key={i} className="flex items-center gap-1 text-[9px]">
                  <span className="flex-1">{arr?.title || fd.arrangement_id}</span>
                  <select value={fd.placement} onChange={e => setFlowers(p => p.map((x, ix) => ix === i ? { ...x, placement: e.target.value as any } : x))} className="bg-transparent px-1 py-0.5 rounded text-[9px] outline-none" style={{ color: "var(--foreground, #fff)", border: `1px solid ${BORDER}` }}>
                    <option value="top">Top</option>
                    <option value="cascade">Cascade</option>
                    <option value="base">Base</option>
                    <option value="tier">Per tier</option>
                  </select>
                  {fd.placement === "tier" && (
                    <select value={fd.tier_index ?? 0} onChange={e => setFlowers(p => p.map((x, ix) => ix === i ? { ...x, tier_index: Number(e.target.value) } : x))} className="bg-transparent px-1 py-0.5 rounded text-[9px] outline-none" style={{ color: "var(--foreground, #fff)", border: `1px solid ${BORDER}` }}>
                      {tiers.map((_, ti) => <option key={ti} value={ti}>T{ti + 1}</option>)}
                    </select>
                  )}
                  <button onClick={() => setFlowers(p => p.filter((_, ix) => ix !== i))} style={{ color: RED }}><X size={10} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-3 space-y-2">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: ACCENT }}>Scene</div>
        <label className="flex items-center gap-2 text-[10px]" style={{ color: "#94a3b8" }}>
          <span className="w-20">Stand style</span>
          <select value={standKind} onChange={e => setStandKind(e.target.value)} className="flex-1 bg-transparent px-1 py-0.5 rounded text-[10px] outline-none" style={{ color: "var(--foreground, #fff)", border: `1px solid ${BORDER}` }} data-testid="stand-kind">
            {STAND_CATALOG.map(s => <option key={s.kind} value={s.kind}>{s.title}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[10px]" style={{ color: "#94a3b8" }}>
          <span>Background</span>
          <input type="color" value={bg} onChange={e => setBg(e.target.value)} style={{ width: 30, height: 24, border: "none", cursor: "pointer", background: "transparent" }} data-testid="bg-color" />
        </label>
        <label className="flex items-center gap-2 text-[10px]" style={{ color: "#94a3b8" }}>
          <span>Stand tint</span>
          <input type="color" value={standColor} onChange={e => setStandColor(e.target.value)} style={{ width: 30, height: 24, border: "none", cursor: "pointer", background: "transparent" }} data-testid="stand-color" />
        </label>
      </div>
    </div>
  );
}
// Suppress unused helper warning
void blankTier;
