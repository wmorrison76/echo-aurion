/**
 * PamphletDesigner
 * ----------------
 * In-app canvas-based pamphlet/brochure designer.
 *  - Drag elements onto canvas (text, service cards, shapes)
 *  - Import PDF / SVG / JPG / PNG / PSD / AI(-as-PDF) as images/backgrounds
 *  - Save / auto-save to backend
 *  - Export print-ready PDF with bleed + crop marks
 *  - Auto-generate a complete pamphlet from active spa services
 */
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Type, Square, Image as ImageIcon, Upload, Plus, Save, Download,
  Sparkles, Trash2, FileText, Loader2, X, Layers as LayersIcon, ZoomIn, ZoomOut,
} from "lucide-react";

const ACCENT = "#c8a97e";
const BORDER = "rgba(255,255,255,0.08)";
const SURFACE = "rgba(255,255,255,0.025)";
const API = typeof window !== "undefined" ? window.location.origin : "";

// mm → px at 3.78 px/mm (~96dpi)
const MM_TO_PX = 3.78;
const PAGE_SIZES: Record<string, { w: number; h: number }> = {
  LETTER: { w: 215.9, h: 279.4 },
  A4:     { w: 210,   h: 297 },
  A5:     { w: 148,   h: 210 },
};

interface Element {
  id: string; type: string;
  x: number; y: number; w: number; h: number;
  rotation?: number;
  asset_id?: string; asset_preview?: string;
  text?: string; font_size?: number; color?: string; font_weight?: string; align?: string;
  service_id?: string; service_name?: string; service_price?: number;
  shape?: string; fill?: string; stroke?: string;
}

interface Pamphlet {
  id?: string;
  name: string;
  page_size: string; orientation: string; bleed_mm: number;
  pages: Element[][];
  theme?: string;
  spa_services_included?: string[];
}

const emptyDoc = (): Pamphlet => ({
  name: "Untitled Pamphlet",
  page_size: "LETTER",
  orientation: "portrait",
  bleed_mm: 3,
  pages: [[]],
  theme: "enterprise",
});

export default function PamphletDesigner() {
  const [doc, setDoc] = useState<Pamphlet>(emptyDoc);
  const [pageIdx, setPageIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [assets, setAssets] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [pamphlets, setPamphlets] = useState<any[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const size = PAGE_SIZES[doc.page_size] || PAGE_SIZES.LETTER;
  const pageW = (doc.orientation === "landscape" ? size.h : size.w) + doc.bleed_mm * 2;
  const pageH = (doc.orientation === "landscape" ? size.w : size.h) + doc.bleed_mm * 2;
  const page = doc.pages[pageIdx] || [];

  useEffect(() => {
    (async () => {
      const [a, s, p] = await Promise.all([
        fetch(`${API}/api/pamphlet/assets`).then(r => r.ok ? r.json() : { assets: [] }),
        fetch(`${API}/api/spa-services/?active_only=true`).then(r => r.ok ? r.json() : { services: [] }),
        fetch(`${API}/api/pamphlet/`).then(r => r.ok ? r.json() : { pamphlets: [] }),
      ]);
      setAssets(a.assets || []);
      setServices(s.services || []);
      setPamphlets(p.pamphlets || []);
    })();
  }, []);

  const selected = useMemo(() => page.find(e => e.id === selectedId) || null, [page, selectedId]);

  /* ── Element helpers ── */
  const updatePage = (els: Element[]) => {
    const next = [...doc.pages]; next[pageIdx] = els;
    setDoc({ ...doc, pages: next });
  };
  const addElement = (el: Omit<Element, "id">) => {
    const e: Element = { ...el, id: `el-${Math.random().toString(36).slice(2, 9)}` };
    updatePage([...page, e]); setSelectedId(e.id);
  };
  const updateElement = (id: string, patch: Partial<Element>) => {
    updatePage(page.map(e => (e.id === id ? { ...e, ...patch } : e)));
  };
  const deleteElement = (id: string) => {
    updatePage(page.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  /* ── Drag ── */
  const [drag, setDrag] = useState<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent, el: Element) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setSelectedId(el.id);
    setDrag({ id: el.id, startX: e.clientX, startY: e.clientY, origX: el.x, origY: el.y });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / MM_TO_PX / zoom;
    const dy = (e.clientY - drag.startY) / MM_TO_PX / zoom;
    updateElement(drag.id, { x: Math.max(0, drag.origX + dx), y: Math.max(0, drag.origY + dy) });
  };
  const onPointerUp = () => setDrag(null);

  /* ── Save / load / export ── */
  const save = async () => {
    setSaving(true);
    try {
      if (doc.id) {
        const r = await fetch(`${API}/api/pamphlet/${doc.id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc }),
        });
        if (r.ok) setDoc(await r.json());
      } else {
        const r = await fetch(`${API}/api/pamphlet/`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ doc }),
        });
        if (r.ok) setDoc(await r.json());
      }
      setSavedAt(new Date().toLocaleTimeString());
    } catch { /* */ }
    setSaving(false);
  };
  const exportPdf = () => {
    if (!doc.id) { alert("Save the pamphlet first."); return; }
    window.open(`${API}/api/pamphlet/${doc.id}/export-pdf`, "_blank");
  };
  const autoGenerate = async () => {
    setSaving(true);
    const activeIds = services.filter(s => s.include_in_pamphlet !== false).map(s => s.id);
    const r = await fetch(`${API}/api/pamphlet/auto-generate`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Spa Menu · Auto", service_ids: activeIds }),
    });
    if (r.ok) {
      const d = await r.json();
      setDoc(d); setPageIdx(0); setSelectedId(null);
    }
    setSaving(false);
  };
  const uploadAsset = async (file: File) => {
    const fd = new FormData(); fd.append("file", file); fd.append("tag", "design");
    const r = await fetch(`${API}/api/pamphlet/assets/upload`, { method: "POST", body: fd });
    if (r.ok) {
      const d = await r.json();
      setAssets(prev => [d, ...prev]);
      // Place as image background on current page
      addElement({ type: "image", asset_id: d.id, asset_preview: `${API}/api/pamphlet/assets/${d.id}/raw`,
        x: 15, y: 15, w: 80, h: 60 });
    }
  };

  return (
    <div className="h-full flex flex-col" style={{ background: "#04060d", color: "#e2e8f0" }} data-testid="pamphlet-designer">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b gap-3" style={{ borderColor: BORDER, background: "#0b1020" }}>
        <div className="flex items-center gap-3">
          <div className="text-[9px] font-mono uppercase tracking-[0.2em]" style={{ color: `${ACCENT}99` }}>Pamphlet Designer</div>
          <input value={doc.name} onChange={e => setDoc({ ...doc, name: e.target.value })}
            className="px-2 py-1 rounded text-[12px] text-white bg-transparent outline-none w-64"
            style={{ border: `1px solid ${BORDER}` }} data-testid="pamphlet-name" />
        </div>
        <div className="flex items-center gap-2">
          <select value={doc.page_size} onChange={e => setDoc({ ...doc, page_size: e.target.value })}
            className="px-2 py-1 rounded text-[11px] text-white outline-none"
            style={{ background: "#0b1020", border: `1px solid ${BORDER}` }}>
            <option value="LETTER">Letter</option><option value="A4">A4</option><option value="A5">A5</option>
          </select>
          <select value={doc.orientation} onChange={e => setDoc({ ...doc, orientation: e.target.value })}
            className="px-2 py-1 rounded text-[11px] text-white outline-none"
            style={{ background: "#0b1020", border: `1px solid ${BORDER}` }}>
            <option value="portrait">Portrait</option><option value="landscape">Landscape</option>
          </select>
          <div className="flex items-center gap-1 px-2 py-1 rounded" style={{ border: `1px solid ${BORDER}` }}>
            <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))}><ZoomOut className="w-3 h-3 text-white/50" /></button>
            <div className="text-[10px] font-mono text-white/60 w-10 text-center">{Math.round(zoom * 100)}%</div>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))}><ZoomIn className="w-3 h-3 text-white/50" /></button>
          </div>
          <button onClick={() => setShowLibrary(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-medium"
            style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
            data-testid="pamphlet-library-btn">
            <LayersIcon className="w-3 h-3" /> Library ({pamphlets.length})
          </button>
          <button onClick={autoGenerate}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-medium"
            style={{ background: `${ACCENT}12`, color: ACCENT, border: `1px solid ${ACCENT}30` }}
            data-testid="pamphlet-auto-gen">
            <Sparkles className="w-3 h-3" /> Auto-Generate
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-semibold disabled:opacity-40"
            style={{ background: ACCENT, color: "#0b1020" }}
            data-testid="pamphlet-save-btn">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
          </button>
          <button onClick={exportPdf} disabled={!doc.id}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-[10px] font-semibold disabled:opacity-40"
            style={{ background: "#22c55e", color: "#0b1020" }}
            data-testid="pamphlet-export-btn">
            <Download className="w-3 h-3" /> Export PDF
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-[200px_1fr_260px] overflow-hidden">
        {/* Left: Insert panel */}
        <div className="border-r overflow-auto p-3 space-y-3" style={{ borderColor: BORDER, background: "#07090f" }}>
          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40 mb-2">Insert</div>
            <div className="grid grid-cols-2 gap-1.5">
              <IconTile label="Text" icon={<Type className="w-3.5 h-3.5" />}
                onClick={() => addElement({ type: "text", x: 20, y: 20, w: 80, h: 20, text: "Your text here", font_size: 14, color: "#0b1020" })}
                testid="insert-text" />
              <IconTile label="Rect" icon={<Square className="w-3.5 h-3.5" />}
                onClick={() => addElement({ type: "shape", shape: "rect", x: 20, y: 40, w: 50, h: 30, fill: ACCENT })}
                testid="insert-rect" />
            </div>
          </div>

          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40 mb-2">Services</div>
            <div className="space-y-1 max-h-56 overflow-auto">
              {services.map(s => (
                <button key={s.id}
                  onClick={() => addElement({
                    type: "spa_service_card", service_id: s.id, service_name: s.name, service_price: s.price,
                    x: 15, y: 60, w: 60, h: 44,
                  })}
                  className="w-full text-left px-2 py-1.5 rounded text-[10px] transition-all hover:bg-white/[0.04]"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(226,232,240,0.8)" }}
                  data-testid={`insert-service-${s.id}`}>
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-[8px] text-white/40">{s.duration_min}min · ${s.price}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40 mb-2 flex items-center justify-between">
              <span>Design Assets</span>
              <button onClick={() => fileInputRef.current?.click()} className="text-[9px]" style={{ color: ACCENT }}>
                + Upload
              </button>
            </div>
            <input ref={fileInputRef} type="file" className="hidden"
              accept=".pdf,.svg,.png,.jpg,.jpeg,.webp,.psd,.ai"
              onChange={e => e.target.files?.[0] && uploadAsset(e.target.files[0])} data-testid="pamphlet-asset-upload" />
            <div className="text-[8px] text-white/40 mb-2">Accepts PDF, SVG, PNG, JPG, PSD, AI (PDF-compatible).</div>
            <div className="space-y-1">
              {assets.slice(0, 15).map(a => (
                <button key={a.id}
                  onClick={() => addElement({ type: "image", asset_id: a.id, asset_preview: `${API}/api/pamphlet/assets/${a.id}/raw`, x: 15, y: 100, w: 70, h: 50 })}
                  className="w-full text-left px-2 py-1 rounded text-[9px] hover:bg-white/[0.04] flex items-center gap-1.5"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(226,232,240,0.7)" }}>
                  <FileText className="w-3 h-3 text-white/40" />
                  <span className="truncate">{a.filename}</span>
                  <span className="ml-auto text-[8px] text-white/30 font-mono uppercase">{a.original_ext.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="overflow-auto p-8 flex items-start justify-center" style={{ background: "#0a0d16" }}>
          <div
            ref={canvasRef}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onClick={() => setSelectedId(null)}
            className="relative shadow-2xl"
            style={{
              width: pageW * MM_TO_PX * zoom,
              height: pageH * MM_TO_PX * zoom,
              background: "#ffffff",
              color: "#111111",
              overflow: "hidden",
              cursor: drag ? "grabbing" : "default",
            }}
            data-testid="pamphlet-canvas"
          >
            {/* bleed line */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: doc.bleed_mm * MM_TO_PX * zoom,
                top: doc.bleed_mm * MM_TO_PX * zoom,
                right: doc.bleed_mm * MM_TO_PX * zoom,
                bottom: doc.bleed_mm * MM_TO_PX * zoom,
                border: "1px dashed rgba(200,169,126,0.4)",
              }}
            />
            {page.map(el => (
              <ElementView
                key={el.id}
                el={el}
                zoom={zoom}
                selected={selectedId === el.id}
                onPointerDown={(e) => onPointerDown(e, el)}
              />
            ))}
          </div>
        </div>

        {/* Right: Properties */}
        <div className="border-l overflow-auto p-3" style={{ borderColor: BORDER, background: "#07090f" }}>
          <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40 mb-2">Properties</div>
          {!selected ? (
            <div className="text-[10px] text-white/30">Select an element to edit.</div>
          ) : (
            <div className="space-y-2">
              <Prop label="Type"><span className="text-white/70 text-[11px] capitalize">{selected.type.replace("_", " ")}</span></Prop>
              <div className="grid grid-cols-2 gap-2">
                <NumberProp label="X" value={selected.x} onChange={v => updateElement(selected.id, { x: v })} />
                <NumberProp label="Y" value={selected.y} onChange={v => updateElement(selected.id, { y: v })} />
                <NumberProp label="W" value={selected.w} onChange={v => updateElement(selected.id, { w: v })} />
                <NumberProp label="H" value={selected.h} onChange={v => updateElement(selected.id, { h: v })} />
              </div>
              {selected.type === "text" && (
                <>
                  <Prop label="Text">
                    <textarea value={selected.text || ""} onChange={e => updateElement(selected.id, { text: e.target.value })}
                      className="w-full px-2 py-1 rounded text-[11px] text-white bg-transparent outline-none resize-none"
                      rows={3} style={{ border: `1px solid ${BORDER}` }} />
                  </Prop>
                  <NumberProp label="Font size" value={selected.font_size || 14} onChange={v => updateElement(selected.id, { font_size: v })} />
                  <Prop label="Color">
                    <input type="color" value={selected.color || "#0b1020"}
                      onChange={e => updateElement(selected.id, { color: e.target.value })}
                      className="w-full h-7 rounded cursor-pointer bg-transparent" />
                  </Prop>
                  <Prop label="Weight">
                    <select value={selected.font_weight || "normal"} onChange={e => updateElement(selected.id, { font_weight: e.target.value })}
                      className="w-full px-2 py-1 rounded text-[11px] text-white outline-none" style={{ border: `1px solid ${BORDER}`, background: "#0b1020" }}>
                      <option value="normal">Normal</option><option value="bold">Bold</option>
                    </select>
                  </Prop>
                  <Prop label="Align">
                    <select value={selected.align || "left"} onChange={e => updateElement(selected.id, { align: e.target.value })}
                      className="w-full px-2 py-1 rounded text-[11px] text-white outline-none" style={{ border: `1px solid ${BORDER}`, background: "#0b1020" }}>
                      <option value="left">Left</option><option value="center">Center</option><option value="right">Right</option>
                    </select>
                  </Prop>
                </>
              )}
              {selected.type === "shape" && (
                <Prop label="Fill">
                  <input type="color" value={selected.fill || ACCENT}
                    onChange={e => updateElement(selected.id, { fill: e.target.value })}
                    className="w-full h-7 rounded cursor-pointer bg-transparent" />
                </Prop>
              )}
              <button onClick={() => deleteElement(selected.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded text-[10px] font-medium mt-3"
                style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.35)" }}>
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}

          <div className="h-px my-4" style={{ background: BORDER }} />
          <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40 mb-2">Pages</div>
          <div className="space-y-1">
            {doc.pages.map((_, i) => (
              <button key={i} onClick={() => setPageIdx(i)}
                className="w-full px-2 py-1.5 rounded text-[10px] text-left transition-all"
                style={{
                  background: i === pageIdx ? `${ACCENT}15` : SURFACE,
                  color: i === pageIdx ? ACCENT : "rgba(226,232,240,0.7)",
                  border: `1px solid ${i === pageIdx ? `${ACCENT}40` : BORDER}`,
                }}>
                Page {i + 1}
              </button>
            ))}
            <button onClick={() => { setDoc({ ...doc, pages: [...doc.pages, []] }); setPageIdx(doc.pages.length); }}
              className="w-full flex items-center justify-center gap-1 py-1.5 rounded text-[10px] text-white/50 hover:text-white/80"
              style={{ background: SURFACE, border: `1px dashed ${BORDER}` }}>
              <Plus className="w-3 h-3" /> Add page
            </button>
          </div>
          {savedAt && <div className="text-[8px] text-white/30 mt-3 text-center">Saved at {savedAt}</div>}
        </div>
      </div>

      {/* Library modal */}
      {showLibrary && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-end" style={{ background: "rgba(4,6,13,0.7)", backdropFilter: "blur(6px)" }} onClick={() => setShowLibrary(false)}>
          <div className="h-full w-[420px]" style={{ background: "#0b1020", borderLeft: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: BORDER }}>
              <div className="text-[13px] font-semibold text-white">Pamphlet Library</div>
              <button onClick={() => setShowLibrary(false)}><X className="w-4 h-4 text-white/50" /></button>
            </div>
            <div className="p-3 space-y-2">
              {pamphlets.map(p => (
                <button key={p.id} onClick={() => { setDoc(p); setPageIdx(0); setSelectedId(null); setShowLibrary(false); }}
                  className="w-full text-left px-3 py-2 rounded text-[11px]"
                  style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
                  <div className="text-white font-medium">{p.name}</div>
                  <div className="text-[9px] text-white/40 font-mono">{p.id} · {p.page_size} · {(p.pages || []).length} page{p.pages?.length === 1 ? "" : "s"}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ElementView({ el, zoom, selected, onPointerDown }: { el: Element; zoom: number; selected: boolean; onPointerDown: (e: React.PointerEvent) => void }) {
  const style: React.CSSProperties = {
    position: "absolute",
    left: el.x * MM_TO_PX * zoom, top: el.y * MM_TO_PX * zoom,
    width: el.w * MM_TO_PX * zoom, height: el.h * MM_TO_PX * zoom,
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    cursor: "move",
    boxShadow: selected ? `0 0 0 2px ${ACCENT}` : undefined,
    boxSizing: "border-box",
  };
  if (el.type === "text") {
    return (
      <div onPointerDown={onPointerDown} style={{
        ...style, color: el.color || "#0b1020", fontSize: (el.font_size || 14) * zoom,
        fontWeight: el.font_weight as any, textAlign: el.align as any, padding: 4, lineHeight: 1.25,
      }}>
        {el.text || ""}
      </div>
    );
  }
  if (el.type === "shape") {
    return (
      <div onPointerDown={onPointerDown} style={{
        ...style, background: el.fill || "transparent",
        border: el.stroke ? `1px solid ${el.stroke}` : undefined,
      }} />
    );
  }
  if (el.type === "image" && el.asset_preview) {
    const ext = (el.asset_preview.match(/\.[a-z]+$/) || [""])[0];
    // PDFs and SVGs render via <object>/<img>
    if (ext === ".pdf" || el.asset_preview.includes(".pdf")) {
      return (
        <object onPointerDown={onPointerDown} data={el.asset_preview} type="application/pdf" style={style}>
          <div style={{ ...style, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280", fontSize: 11 }}>PDF preview</div>
        </object>
      );
    }
    return <img onPointerDown={onPointerDown} src={el.asset_preview} alt="" style={{ ...style, objectFit: "contain" }} draggable={false} />;
  }
  if (el.type === "spa_service_card") {
    return (
      <div onPointerDown={onPointerDown} style={{ ...style, border: `1px solid ${ACCENT}`, padding: 8, background: "#fff" }}>
        <div style={{ fontSize: 11 * zoom, fontWeight: 700, color: "#0b1020" }}>{el.service_name}</div>
        <div style={{ fontSize: 13 * zoom, fontWeight: 800, color: ACCENT, marginTop: 4 }}>${el.service_price}</div>
      </div>
    );
  }
  return <div onPointerDown={onPointerDown} style={style} />;
}

function IconTile({ label, icon, onClick, testid }: { label: string; icon: React.ReactNode; onClick: () => void; testid?: string }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 py-2 rounded text-[10px] transition-all hover:brightness-110"
      style={{ background: SURFACE, border: `1px solid ${BORDER}`, color: "rgba(226,232,240,0.75)" }} data-testid={testid}>
      <span style={{ color: ACCENT }}>{icon}</span>
      {label}
    </button>
  );
}

function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[8px] font-mono uppercase tracking-wider text-white/30 mb-1">{label}</div>
      {children}
    </div>
  );
}

function NumberProp({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="text-[8px] font-mono uppercase tracking-wider text-white/30 mb-1">{label}</div>
      <input type="number" step="0.5" value={value.toFixed(1)} onChange={e => onChange(+e.target.value)}
        className="w-full px-2 py-1 rounded text-[11px] text-white bg-transparent outline-none font-mono"
        style={{ border: `1px solid ${BORDER}` }} />
    </div>
  );
}
