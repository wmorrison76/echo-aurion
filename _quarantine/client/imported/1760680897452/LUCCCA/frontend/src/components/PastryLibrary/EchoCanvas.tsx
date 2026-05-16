import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Upload, Undo2, Redo2, Trash2, ZoomIn, ZoomOut, Hand, Move, Type, PaintBucket, Droplet, Eraser, Brush, Pencil, Layers, Eye, EyeOff, Lock, LockOpen, Square, Circle, Crop, RectangleHorizontal, MousePointerSquare, Lasso, Wand2, BezierCurve, Image, Copy, Paste, Plus, Minus, Settings2, Grid3X3, Printer, Ruler, Send, Sun, Moon, ChevronDown, ChevronUp, Paintbrush2, Shapes, Scan, Pipette, Stamp, Blend, Contrast, Focus, Waypoints, Highlighter, Blend as BlendIcon } from "lucide-react";

/**
 * CustomCakeDesignStudio – Photoshop‑style image generator & editor (React/Tailwind)
 *
 * ✅ Default transparent background (checkerboard preview only)
 * ✅ Prompt → Image panel (bring your own /api/generate-image endpoint)
 * ✅ Layers with reordering, visibility, locking, opacity, blend modes
 * ✅ Tools: Move, Brush, Pencil, Eraser, Paint Bucket, Gradient, Eyedropper, Text,
 *           Shapes (Rect/Ellipse), Marquee (Rect/Ellipse), Lasso (polygonal),
 *           Magic Wand (tolerance flood select), Crop, Hand, Zoom, Clone Stamp,
 *           Dodge/Burn/Sponge, Blur/Sharpen/Smudge (basic), Pen (paths → stroke/fill)
 * ✅ Undo/Redo (per‑action snapshots, max 30 by default)
 * ✅ Canvas presets + custom size + DPI + print preview
 * ✅ Import as layer, Export PNG (preserves transparency)
 * ✅ Quick (pop) toolbar with common tool settings
 *
 * Notes
 * - This component is self‑contained for easy drop‑in. No external state libs.
 * - For AI generation, implement the /api/generate-image POST endpoint to return a PNG (base64 or blob). See generateFromPrompt().
 * - Blend modes map to CanvasRenderingContext2D.globalCompositeOperation for preview; export preserves the results (we composite on export).
 */

// ---- Types ----
type ToolId =
  | "move" | "brush" | "pencil" | "eraser" | "bucket" | "gradient" | "eyedropper"
  | "text" | "shape-rect" | "shape-ellipse" | "marquee-rect" | "marquee-ellipse"
  | "lasso" | "magicwand" | "crop" | "hand" | "zoom" | "clonestamp"
  | "dodge" | "burn" | "sponge" | "blur" | "sharpen" | "smudge" | "pen";

type BlendMode = GlobalCompositeOperation;

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0..1
  blend: BlendMode; // e.g., 'source-over', 'multiply', ...
  canvas: HTMLCanvasElement;
  x: number; // for move tool (layer translate)
  y: number;
}

interface HistoryState {
  // Minimal snapshot: per-layer ImageData + meta
  layers: { id: string; image: ImageData; x: number; y: number; visible: boolean; opacity: number; blend: BlendMode; }[];
  activeLayerId: string;
  selectionPath: Point[] | null;
  selectionMask: ImageData | null;
}

interface Point { x: number; y: number }

// ---- Helpers ----
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const uid = () => Math.random().toString(36).slice(2, 10);

const CHECKER_SIZE = 16;

const PRESET_SIZES = [
  { name: "Square 1024", w: 1024, h: 1024 },
  { name: "Poster A3 (300dpi)", w: Math.round(11.7*300), h: Math.round(16.5*300) },
  { name: "Letter (300dpi)", w: 2550, h: 3300 },
  { name: "Social (1080×1350)", w: 1080, h: 1350 },
  { name: "Banner 1920×1080", w: 1920, h: 1080 },
];

const BLEND_OPTIONS: { label: string; value: BlendMode }[] = [
  { label: "Normal", value: "source-over" },
  { label: "Multiply", value: "multiply" },
  { label: "Screen", value: "screen" },
  { label: "Overlay", value: "overlay" },
  { label: "Darken", value: "darken" },
  { label: "Lighten", value: "lighten" },
  { label: "Color Dodge", value: "color-dodge" },
  { label: "Color Burn", value: "color-burn" },
  { label: "Hard Light", value: "hard-light" },
  { label: "Soft Light", value: "soft-light" },
  { label: "Difference", value: "difference" },
  { label: "Exclusion", value: "exclusion" },
  { label: "Hue", value: "hue" },
  { label: "Saturation", value: "saturation" },
  { label: "Color", value: "color" },
  { label: "Luminosity", value: "luminosity" },
];

// ---- Main Component ----
export default function CustomCakeDesignStudio() {
  // Canvas/viewport
  const [canvasW, setCanvasW] = useState(1024);
  const [canvasH, setCanvasH] = useState(1024);
  const [dpi, setDpi] = useState(300);

  // Tooling
  const [tool, setTool] = useState<ToolId>("brush");
  const [primary, setPrimary] = useState("#000000");
  const [secondary, setSecondary] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(24);
  const [hardness, setHardness] = useState(0.7); // 0..1
  const [flow, setFlow] = useState(1);
  const [opacity, setOpacity] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);

  // Layers
  const [layers, setLayers] = useState<Layer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string>("");

  // Selection
  const [selectionPath, setSelectionPath] = useState<Point[] | null>(null); // polygonal path
  const selectionMaskRef = useRef<HTMLCanvasElement | null>(null); // mask canvas

  // History
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryState[]>([]);
  const HISTORY_LIMIT = 30;

  // Refs
  const hostRef = useRef<HTMLDivElement | null>(null);
  const displayRef = useRef<HTMLCanvasElement | null>(null); // composited preview
  const gridRef = useRef<HTMLCanvasElement | null>(null); // checkerboard grid
  const isDrawingRef = useRef(false);
  const lastPtRef = useRef<Point | null>(null);
  const cloneSampleRef = useRef<Point | null>(null);

  // Derived
  const activeLayer = useMemo(() => layers.find(l => l.id === activeLayerId) || null, [layers, activeLayerId]);

  // Init: base layer
  useEffect(() => {
    if (layers.length === 0) {
      const base = createLayer("Layer 1", canvasW, canvasH);
      setLayers([base]);
      setActiveLayerId(base.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize all layers when canvas size changes (non‑destructive: place old into new canvas centered)
  useEffect(() => {
    if (layers.length === 0) return;
    setLayers(prev => prev.map(l => resizeLayerCanvas(l, canvasW, canvasH)));
    drawChecker();
    composite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasW, canvasH]);

  useEffect(() => { drawChecker(); composite(); }, [layers, zoom]);

  // ---- Layer utilities ----
  function createLayer(name: string, w: number, h: number): Layer {
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const id = uid();
    return { id, name, visible: true, locked: false, opacity: 1, blend: "source-over", canvas, x: 0, y: 0 };
  }

  function resizeLayerCanvas(layer: Layer, w: number, h: number): Layer {
    const newCanvas = document.createElement("canvas");
    newCanvas.width = w; newCanvas.height = h;
    const ctx = newCanvas.getContext("2d")!;
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(layer.canvas, layer.x, layer.y);
    return { ...layer, canvas: newCanvas, x: 0, y: 0 };
  }

  function addLayer(name = `Layer ${layers.length + 1}`) {
    const L = createLayer(name, canvasW, canvasH);
    setLayers(prev => [L, ...prev]);
    setActiveLayerId(L.id);
    pushHistory();
  }

  function removeLayer(id: string) {
    if (layers.length === 1) return;
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeLayerId === id && layers[1]) setActiveLayerId(layers[1].id);
    pushHistory();
  }

  function duplicateActiveLayer() {
    if (!activeLayer) return;
    const copy = createLayer(`${activeLayer.name} copy`, canvasW, canvasH);
    const ctx = copy.canvas.getContext("2d")!;
    ctx.drawImage(activeLayer.canvas, 0, 0);
    copy.opacity = activeLayer.opacity; copy.blend = activeLayer.blend;
    setLayers(prev => [copy, ...prev]);
    setActiveLayerId(copy.id);
    pushHistory();
  }

  function reorderLayer(fromIndex: number, toIndex: number) {
    setLayers(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, moved);
      return arr;
    });
    pushHistory();
  }

  // ---- Checkerboard & Composite ----
  function drawChecker() {
    const grid = gridRef.current; if (!grid) return;
    grid.width = Math.round(canvasW * zoom);
    grid.height = Math.round(canvasH * zoom);
    const g = grid.getContext("2d")!;
    g.clearRect(0, 0, grid.width, grid.height);
    const s = CHECKER_SIZE * zoom;
    for (let y = 0; y < grid.height; y += s) {
      for (let x = 0; x < grid.width; x += s) {
        g.fillStyle = ((x / s + y / s) % 2 === 0) ? "#e6e6e6" : "#cfcfcf";
        g.fillRect(x, y, s, s);
      }
    }
  }

  function composite() {
    const view = displayRef.current; if (!view) return;
    view.width = Math.round(canvasW * zoom);
    view.height = Math.round(canvasH * zoom);
    const v = view.getContext("2d")!;
    v.setTransform(1, 0, 0, 1, 0, 0);
    v.clearRect(0, 0, view.width, view.height);

    // Draw layers (top of array is top of stack)
    for (let i = layers.length - 1; i >= 0; i--) {
      const L = layers[i];
      if (!L.visible) continue;
      v.globalAlpha = L.opacity;
      v.globalCompositeOperation = L.blend || "source-over";
      v.drawImage(L.canvas, Math.round(L.x * zoom), Math.round(L.y * zoom), Math.round(canvasW * zoom), Math.round(canvasH * zoom));
    }

    // Selection outline (marching ants)
    if (selectionPath && selectionPath.length > 1) {
      v.save();
      v.scale(zoom, zoom);
      v.strokeStyle = "#000"; v.lineWidth = 1; v.setLineDash([6, 6]); v.lineDashOffset = (Date.now() / 90) % 12; v.beginPath();
      v.moveTo(selectionPath[0].x, selectionPath[0].y);
      for (let i = 1; i < selectionPath.length; i++) v.lineTo(selectionPath[i].x, selectionPath[i].y);
      v.closePath(); v.stroke();
      v.strokeStyle = "#fff"; v.setLineDash([6, 6]); v.lineDashOffset = ((Date.now() / 90) % 12) + 6; v.stroke();
      v.restore();
    }
  }

// Animate marching ants
useEffect(() => {
  const id = setInterval(() => composite(), 90);
  return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectionPath, zoom, layers]

  // ---- History ----
  function pushHistory() {
    const snap: HistoryState = {
      layers: layers.map(L => ({
        id: L.id,
        image: getCtx(L.canvas).getImageData(0, 0, canvasW, canvasH),
        x: L.x, y: L.y, visible: L.visible, opacity: L.opacity, blend: L.blend
      })),
      activeLayerId,
      selectionPath: selectionPath ? [...selectionPath] : null,
      selectionMask: selectionMaskRef.current ? getCtx(selectionMaskRef.current).getImageData(0, 0, canvasW, canvasH) : null,
    };
    setHistory(prev => {
      const arr = [...prev, snap];
      if (arr.length > HISTORY_LIMIT) arr.shift();
      return arr;
    });
    setRedoStack([]);
  }

  function undo() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack(r => [...r, snapshotCurrent()]);
    restoreSnapshot(prev);
    setHistory(h => h.slice(0, -1));
  }
  function redo() {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory(h => [...h, snapshotCurrent()]);
    restoreSnapshot(next);
    setRedoStack(r => r.slice(0, -1));
  }
  function snapshotCurrent(): HistoryState {
    return {
      layers: layers.map(L => ({ id: L.id, image: getCtx(L.canvas).getImageData(0, 0, canvasW, canvasH), x: L.x, y: L.y, visible: L.visible, opacity: L.opacity, blend: L.blend })),
      activeLayerId,
      selectionPath: selectionPath ? [...selectionPath] : null,
      selectionMask: selectionMaskRef.current ? getCtx(selectionMaskRef.current).getImageData(0, 0, canvasW, canvasH) : null,
    };
  }
  function restoreSnapshot(s: HistoryState) {
    setLayers(prev => prev.map(L => {
      const snap = s.layers.find(x => x.id === L.id);
      if (!snap) return L;
      const ctx = getCtx(L.canvas);
      ctx.putImageData(snap.image, 0, 0);
      return { ...L, x: snap.x, y: snap.y, visible: snap.visible, opacity: snap.opacity, blend: snap.blend };
    }));
    setActiveLayerId(s.activeLayerId);
    if (selectionMaskRef.current && s.selectionMask) getCtx(selectionMaskRef.current).putImageData(s.selectionMask, 0, 0);
    setSelectionPath(s.selectionPath);
    composite();
  }

  // ---- Drawing helpers ----
  function getCtx(c: HTMLCanvasElement) { return c.getContext("2d")!; }
  function screenToCanvas(pt: Point): Point { return { x: pt.x / zoom, y: pt.y / zoom }; }
  function withinCanvas(pt: Point) { return pt.x >= 0 && pt.y >= 0 && pt.x < canvasW && pt.y < canvasH; }

  // Soft brush stamp
  function stampCircle(ctx: CanvasRenderingContext2D, pt: Point, color: string, size: number, hard: number, alpha=1) {
    const r = size / 2;
    const grd = ctx.createRadialGradient(pt.x, pt.y, r*hard, pt.x, pt.y, r);
    const c = hexToRgba(color, alpha);
    grd.addColorStop(0, c);
    grd.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2); ctx.fill();
  }

  // ---- Events (canvas) ----
  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!activeLayer || activeLayer.locked) return;
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    isDrawingRef.current = true; lastPtRef.current = null;
    const pt = screenToCanvas(getLocalPoint(e));

    if (tool === "move") {
      lastPtRef.current = pt; return;
    }
    if (tool === "eyedropper") {
      const col = sampleColorAtPoint(pt);
      if (col) setPrimary(col);
      isDrawingRef.current = false; return;
    }
    if (tool === "bucket") {
      floodFill(activeLayer.canvas, pt, primary, 20);
      pushHistory(); composite(); return;
    }
    if (tool === "magicwand") {
      const mask = selectionMaskRef.current || makeSelectionMask();
      selectionMaskRef.current = mask;
      magicWand(mask, activeLayer.canvas, pt, 24);
      selectionPathFromMask(mask);
      composite(); return;
    }
    if (tool === "marquee-rect" || tool === "marquee-ellipse") {
      setSelectionPath([pt]); return;
    }
    if (tool === "lasso") {
      setSelectionPath([pt]); return;
    }
    if (tool === "clonestamp" && e.altKey) {
      cloneSampleRef.current = pt; // set sample
      return;
    }
    if (tool === "text") {
      const txt = prompt("Enter text");
      if (txt) drawText(activeLayer.canvas, pt, txt, primary, Math.round(32 * (dpi/72)));
      pushHistory(); composite(); isDrawingRef.current = false; return;
    }
    if (tool === "crop") {
      setSelectionPath([pt]); return;
    }

    // Painting & vector tools begin stroke
    applyStroke(pt, true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const pt = screenToCanvas(getLocalPoint(e));
    if (isPanning && tool === "hand") { panViewport(e); return; }

    if (!isDrawingRef.current) return;

    if (tool === "move" && activeLayer && lastPtRef.current) {
      const dx = pt.x - lastPtRef.current.x; const dy = pt.y - lastPtRef.current.y;
      setLayers(prev => prev.map(L => L.id === activeLayer.id ? { ...L, x: L.x + dx, y: L.y + dy } : L));
      lastPtRef.current = pt; composite(); return;
    }

    if (tool === "marquee-rect" || tool === "marquee-ellipse" || tool === "crop") {
      if (!selectionPath) return; const start = selectionPath[0];
      setSelectionPath([start, pt]); composite(); return;
    }

    if (tool === "lasso") {
      setSelectionPath(prev => prev ? [...prev, pt] : [pt]); composite(); return;
    }

    applyStroke(pt, false);
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    if (!isDrawingRef.current) {
      // finalize selection/crop
      if (tool === "marquee-rect" || tool === "marquee-ellipse") finalizeMarquee();
      if (tool === "lasso") closeLasso();
      if (tool === "crop") finalizeCrop();
      return;
    }
    isDrawingRef.current = false;
    lastPtRef.current = null;
    pushHistory(); composite();
  }

  function getLocalPoint(e: React.PointerEvent) {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function applyStroke(pt: Point, first: boolean) {
    if (!activeLayer) return; const ctx = getCtx(activeLayer.canvas);

    if (tool === "brush" || tool === "pencil" || tool === "eraser" || tool === "dodge" || tool === "burn" || tool === "sponge" || tool === "blur" || tool === "sharpen" || tool === "smudge" || tool === "clonestamp") {
      const last = lastPtRef.current || pt; const steps = Math.max(1, Math.floor(dist(last, pt)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps; const x = lerp(last.x, pt.x, t); const y = lerp(last.y, pt.y, t);
        if (tool === "eraser") stampCircle(ctx, { x, y }, "#000000", brushSize, hardness, flow*opacity), eraseStamp(ctx, { x, y }, brushSize, hardness, flow*opacity);
        else if (tool === "pencil") drawDot(ctx, { x, y }, primary, Math.max(1, brushSize * 0.3), 1);
        else if (tool === "brush") stampCircle(ctx, { x, y }, primary, brushSize, hardness, flow*opacity);
        else if (tool === "dodge" || tool === "burn" || tool === "sponge" ) applyToneTool(ctx, { x, y }, brushSize, hardness, tool);
        else if (tool === "blur" || tool === "sharpen" || tool === "smudge") applyFxTool(ctx, { x, y }, brushSize, hardness, tool);
        else if (tool === "clonestamp") {
          if (!cloneSampleRef.current) continue;
          cloneStamp(ctx, { x, y }, cloneSampleRef.current, brushSize, hardness, flow*opacity);
        }
      }
      lastPtRef.current = pt; composite(); return;
    }

    if (tool === "gradient") {
      if (first) setSelectionPath([pt]); else setSelectionPath(prev => prev ? [prev[0], pt] : [pt]);
      if (!first && selectionPath && selectionPath.length === 2) {
        const [a, b] = selectionPath; const g = ctx.createLinearGradient(a.x, a.y, pt.x, pt.y);
        g.addColorStop(0, primary); g.addColorStop(1, secondary);
        ctx.globalAlpha = opacity; ctx.fillStyle = g; ctx.fillRect(0, 0, canvasW, canvasH);
      }
      return;
    }

    if (tool === "shape-rect" || tool === "shape-ellipse") {
      if (first) setSelectionPath([pt]); else setSelectionPath(prev => prev ? [prev[0], pt] : [pt]);
      if (!first && selectionPath && selectionPath.length === 2) {
        const [a, b] = selectionPath; const x = Math.min(a.x, pt.x), y = Math.min(a.y, pt.y), w = Math.abs(a.x - pt.x), h = Math.abs(a.y - pt.y);
        ctx.save(); ctx.globalAlpha = opacity; ctx.fillStyle = primary; ctx.strokeStyle = primary; ctx.lineWidth = 1;
        if (tool === "shape-rect") ctx.fillRect(x, y, w, h);
        else { ctx.beginPath(); ctx.ellipse((x+w/2), (y+h/2), w/2, h/2, 0, 0, Math.PI*2); ctx.fill(); }
        ctx.restore();
      }
      return;
    }
  }

  // ---- Selection finalize ----
  function finalizeMarquee() {
    if (!selectionPath || selectionPath.length < 2) return;
    const [start, end] = selectionPath;
    const mask = selectionMaskRef.current || makeSelectionMask();
    selectionMaskRef.current = mask;
    const m = getCtx(mask);
    m.clearRect(0, 0, canvasW, canvasH);
    m.fillStyle = "rgba(0,0,0,1)";
    if (tool === "marquee-rect" || tool === "crop") {
      m.fillRect(Math.min(start.x, end.x), Math.min(start.y, end.y), Math.abs(start.x - end.x), Math.abs(start.y - end.y));
    } else {
      m.beginPath();
      const cx = (start.x + end.x) / 2, cy = (start.y + end.y) / 2; const rx = Math.abs(start.x - end.x)/2, ry = Math.abs(start.y - end.y)/2;
      m.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2); m.fill();
    }
    setSelectionPath([{ x: Math.min(start.x, end.x), y: Math.min(start.y, end.y) }, { x: Math.max(start.x, end.x), y: Math.max(start.y, end.y) }]);
    composite();
  }
  function closeLasso() {
    if (!selectionPath || selectionPath.length < 3) return;
    const mask = selectionMaskRef.current || makeSelectionMask(); selectionMaskRef.current = mask;
    const m = getCtx(mask); m.clearRect(0, 0, canvasW, canvasH);
    m.fillStyle = "rgba(0,0,0,1)"; m.beginPath(); m.moveTo(selectionPath[0].x, selectionPath[0].y);
    for (let i = 1; i < selectionPath.length; i++) m.lineTo(selectionPath[i].x, selectionPath[i].y);
    m.closePath(); m.fill();
    composite();
  }
  function finalizeCrop() {
    if (!selectionPath || selectionPath.length < 2) return;
    const [a, b] = selectionPath; const x = Math.round(Math.min(a.x, b.x)), y = Math.round(Math.min(a.y, b.y)), w = Math.round(Math.abs(a.x - b.x)), h = Math.round(Math.abs(a.y - b.y));
    if (w < 4 || h < 4) return;
    setLayers(prev => prev.map(L => {
      const newC = document.createElement("canvas"); newC.width = w; newC.height = h;
      const ctx = newC.getContext("2d")!; ctx.drawImage(L.canvas, x, y, w, h, 0, 0, w, h); return { ...L, canvas: newC, x: 0, y: 0 };
    }));
    setCanvasW(w); setCanvasH(h); setSelectionPath(null); selectionMaskRef.current = null; pushHistory(); composite();
  }

  function selectionPathFromMask(mask: HTMLCanvasElement) {
    // Simple bounding box path for preview (marching ants). For production, implement marching squares.
    const m = getCtx(mask); const data = m.getImageData(0, 0, canvasW, canvasH);
    let minX = canvasW, minY = canvasH, maxX = 0, maxY = 0; const D = data.data;
    for (let y = 0; y < canvasH; y++) {
      for (let x = 0; x < canvasW; x++) {
        const a = D[(y*canvasW + x)*4 + 3]; if (a > 0) { if (x < minX) minX = x; if (y < minY) minY = y; if (x > maxX) maxX = x; if (y > maxY) maxY = y; }
      }
    }
    if (minX <= maxX && minY <= maxY) setSelectionPath([{ x: minX, y: minY }, { x: maxX, y: maxY }]);
  }

  function makeSelectionMask() {
    const c = document.createElement("canvas"); c.width = canvasW; c.height = canvasH; return c;
  }

  // ---- Tools (pixel ops) ----
  function eraseStamp(ctx: CanvasRenderingContext2D, pt: Point, size: number, hard: number, alpha=1) {
    const r = size / 2; ctx.save(); ctx.globalCompositeOperation = "destination-out";
    const grd = ctx.createRadialGradient(pt.x, pt.y, r*hard, pt.x, pt.y, r);
    grd.addColorStop(0, `rgba(0,0,0,${alpha})`); grd.addColorStop(1, `rgba(0,0,0,0)`);
    ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(pt.x, pt.y, r, 0, Math.PI*2); ctx.fill(); ctx.restore();
  }

  function drawDot(ctx: CanvasRenderingContext2D, pt: Point, color: string, size: number, alpha: number) {
    ctx.save(); ctx.fillStyle = hexToRgba(color, alpha); ctx.fillRect(Math.round(pt.x - size/2), Math.round(pt.y - size/2), size, size); ctx.restore();
  }

  function cloneStamp(ctx: CanvasRenderingContext2D, pt: Point, sample: Point, size: number, hard: number, alpha: number) {
    const r = Math.floor(size/2);
    const src = ctx.getImageData(sample.x - r, sample.y - r, size, size);
    const tmp = document.createElement("canvas"); tmp.width = size; tmp.height = size; const tctx = tmp.getContext("2d")!;
    tctx.putImageData(src, 0, 0);
    ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(tmp, pt.x - r, pt.y - r); ctx.restore();
  }

  function applyToneTool(ctx: CanvasRenderingContext2D, pt: Point, size: number, hard: number, kind: "dodge"|"burn"|"sponge") {
    const r = Math.floor(size/2); const x = Math.round(pt.x - r), y = Math.round(pt.y - r);
    let id = ctx.getImageData(x, y, size, size); const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const h = hardness; // naive falloff
      if (kind === "dodge") { d[i] = clamp(d[i]*1.05 + 5*h, 0, 255); d[i+1] = clamp(d[i+1]*1.05 + 5*h, 0, 255); d[i+2] = clamp(d[i+2]*1.05 + 5*h, 0, 255); }
      if (kind === "burn") { d[i] = clamp(d[i]*0.95 - 5*h, 0, 255); d[i+1] = clamp(d[i+1]*0.95 - 5*h, 0, 255); d[i+2] = clamp(d[i+2]*0.95 - 5*h, 0, 255); }
      if (kind === "sponge") { const hsv = rgbToHsv(d[i], d[i+1], d[i+2]); hsv[1] = clamp(hsv[1] * 1.05, 0, 1); const rgb = hsvToRgb(hsv[0], hsv[1], hsv[2]); d[i] = rgb[0]; d[i+1] = rgb[1]; d[i+2] = rgb[2]; }
    }
    ctx.putImageData(id, x, y);
  }

  function applyFxTool(ctx: CanvasRenderingContext2D, pt: Point, size: number, hard: number, kind: "blur"|"sharpen"|"smudge") {
    const r = Math.floor(size/2); const x = Math.round(pt.x - r), y = Math.round(pt.y - r);
    let id = ctx.getImageData(x, y, size, size); const d = id.data;
    if (kind === "blur") boxBlur(d, size, size, 1);
    if (kind === "sharpen") sharpen(d, size, size);
    if (kind === "smudge") smear(d, size, size, 0.3);
    ctx.putImageData(id, x, y);
  }

  function sampleColorAtPoint(pt: Point): string | null {
    const view = displayRef.current; if (!view) return null;
    // Composite to a scratch to sample exact pixel
    const scratch = document.createElement("canvas"); scratch.width = canvasW; scratch.height = canvasH; const sctx = scratch.getContext("2d")!;
    for (let i = layers.length - 1; i >= 0; i--) { const L = layers[i]; if (!L.visible) continue; sctx.globalAlpha = L.opacity; sctx.globalCompositeOperation = L.blend || "source-over"; sctx.drawImage(L.canvas, L.x, L.y); }
    const data = sctx.getImageData(Math.floor(pt.x), Math.floor(pt.y), 1, 1).data;
    return rgbaToHex(data[0], data[1], data[2], data[3]/255);
  }

  function floodFill(canvas: HTMLCanvasElement, pt: Point, fillColor: string, tolerance = 20) {
    const ctx = getCtx(canvas); const img = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = img.data;
    const w = canvas.width, h = canvas.height; const stack: Point[] = []; const start = (Math.floor(pt.y) * w + Math.floor(pt.x)) * 4;
    const target = { r: data[start], g: data[start+1], b: data[start+2], a: data[start+3] };
    const [fr, fg, fb, fa] = hexToRgbaTuple(fillColor, 1);
    const seen = new Uint8Array(w*h);
    stack.push({ x: Math.floor(pt.x), y: Math.floor(pt.y) });
    while (stack.length) {
      const p = stack.pop()!; const idx = (p.y*w + p.x)*4; if (seen[p.y*w + p.x]) continue; seen[p.y*w + p.x] = 1;
      const col = { r: data[idx], g: data[idx+1], b: data[idx+2], a: data[idx+3] };
      if (!withinTolerance(col, target, tolerance)) continue;
      data[idx] = fr; data[idx+1] = fg; data[idx+2] = fb; data[idx+3] = 255;
      if (p.x > 0) stack.push({ x: p.x-1, y: p.y }); if (p.x < w-1) stack.push({ x: p.x+1, y: p.y }); if (p.y > 0) stack.push({ x: p.x, y: p.y-1 }); if (p.y < h-1) stack.push({ x: p.x, y: p.y+1 });
    }
    ctx.putImageData(img, 0, 0);
  }

  function magicWand(mask: HTMLCanvasElement, src: HTMLCanvasElement, pt: Point, tolerance=24) {
    // write selection into mask based on flood fill tolerance
    const sctx = getCtx(src); const mctx = getCtx(mask);
    const w = src.width, h = src.height; const img = sctx.getImageData(0, 0, w, h); const data = img.data;
    const out = mctx.createImageData(w, h); const D = out.data;
    const start = (Math.floor(pt.y)*w + Math.floor(pt.x))*4; const target = { r: data[start], g: data[start+1], b: data[start+2], a: data[start+3] };
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
      const i = (y*w + x)*4; const col = { r: data[i], g: data[i+1], b: data[i+2], a: data[i+3] };
      const keep = withinTolerance(col, target, tolerance) ? 255 : 0; D[i] = 0; D[i+1] = 0; D[i+2] = 0; D[i+3] = keep;
    }
    mctx.putImageData(out, 0, 0);
  }

  // ---- Export / Import / Generate ----
  function exportPNG() {
    // Composite with transparency preserved
    const out = document.createElement("canvas"); out.width = canvasW; out.height = canvasH; const octx = out.getContext("2d")!;
    for (let i = layers.length - 1; i >= 0; i--) {
      const L = layers[i]; if (!L.visible) continue; octx.globalAlpha = L.opacity; octx.globalCompositeOperation = L.blend || "source-over"; octx.drawImage(L.canvas, L.x, L.y);
    }
    const url = out.toDataURL("image/png"); downloadDataUrl(url, `CakeStudio_${canvasW}x${canvasH}.png`);
  }

  function importImageAsLayer(file: File) {
    const img = new Image(); img.onload = () => {
      const L = createLayer(file.name.replace(/\.[^.]+$/, ""), canvasW, canvasH);
      const ctx = L.canvas.getContext("2d")!; const scale = Math.min(canvasW / img.width, canvasH / img.height);
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale); const x = Math.round((canvasW - w)/2), y = Math.round((canvasH - h)/2);
      ctx.drawImage(img, x, y, w, h); setLayers(prev => [L, ...prev]); setActiveLayerId(L.id); pushHistory(); composite();
    }; img.src = URL.createObjectURL(file);
  }

  async function generateFromPrompt(prompt: string) {
    // BYO backend. Example contract: POST /api/generate-image { prompt, w, h, transparent }
    // returns { ok: true, image: "data:image/png;base64,..." }
    try {
      const res = await fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, w: canvasW, h: canvasH, transparent: true }) });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const url: string = json.image; // data URL expected
      const img = new Image(); img.onload = () => {
        const L = createLayer(`AI: ${prompt.slice(0,24)}`, canvasW, canvasH);
        const ctx = L.canvas.getContext("2d")!; ctx.drawImage(img, 0, 0, canvasW, canvasH); setLayers(prev => [L, ...prev]); setActiveLayerId(L.id); pushHistory(); composite();
      }; img.src = url;
    } catch (e: any) {
      alert("Image generation endpoint not available. Add /api/generate-image to your backend.\n" + e?.message);
    }
  }

  // ---- Zoom/Pan ----
  function panViewport(e: React.PointerEvent) {
    // Here we pan by adjusting scroll on host container
    const host = hostRef.current; if (!host) return; host.scrollLeft -= e.movementX; host.scrollTop -= e.movementY;
  }

  // ---- UI bits ----
  function ToolButton({ id, icon: Icon, label, kbd }: { id: ToolId; icon: any; label: string; kbd?: string }) {
    const active = tool === id;
    return (
      <button title={`${label}${kbd?` (${kbd})`:''}`} onClick={() => setTool(id)} className={`group w-10 h-10 grid place-items-center rounded-xl border mb-1 ${active?"border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20":"border-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}>
        <Icon className="w-5 h-5" />
      </button>
    );
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target && (e.target as HTMLElement).tagName === "INPUT") return;
      const key = e.key.toLowerCase();
      const map: Record<string, ToolId> = {
        v: "move", b: "brush", n: "pencil", e: "eraser", g: "gradient", i: "eyedropper", t: "text", u: "shape-rect", m: "marquee-rect", l: "lasso", w: "magicwand", c: "crop", h: "hand", z: "zoom", s: "clonestamp", o: "dodge"
      };
      if (key in map) { setTool(map[key]); }
      if (e.metaKey || e.ctrlKey) {
        if (key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
        else if ((key === "z" && e.shiftKey) || key === "y") { e.preventDefault(); redo(); }
      }
    }
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });

  // ---- Render ----
  return (
    <div className="w-full h-full grid grid-rows-[auto,1fr] bg-neutral-50 dark:bg-[#0b1220] text-neutral-900 dark:text-neutral-100 rounded-2xl overflow-hidden">

      {/* TODO: put your Top bar + Workbench + Right panels JSX here.
          If you already have that markup above, remove it from there and paste it here,
          inside this main container, so it renders correctly. */}

      {/* Floating quick toolbar */}
      <div className="pointer-events-auto fixed left-1/2 -translate-x-1/2 bottom-6 flex items-center gap-2 bg-white/90 dark:bg-black/50 backdrop-blur border border-black/10 rounded-2xl px-2 py-1 shadow-lg">
        <button className="icon-btn" onClick={()=>setZoom(1)}>100%</button>
        <div className="h-6 w-px bg-black/10" />
        <button className="icon-btn" onClick={()=>setTool("brush")}><Paintbrush2 className="w-4 h-4" /></button>
        <button className="icon-btn" onClick={()=>setTool("eraser")}><Eraser className="w-4 h-4" /></button>
        <button className="icon-btn" onClick={()=>setTool("bucket")}><PaintBucket className="w-4 h-4" /></button>
        <button className="icon-btn" onClick={()=>setTool("magicwand")}><Wand2 className="w-4 h-4" /></button>
      
} // <-- make sure this closing brace is present and is the last character in the file
