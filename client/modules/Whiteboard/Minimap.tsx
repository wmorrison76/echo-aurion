import React, { useCallback, useMemo, useRef, useState } from "react";
import type {
  CanvasState,
  CanvasSelectable,
  DrawingStroke,
  TextElement,
} from "./types";
type Bounds = { x: number; y: number; width: number; height: number };
function unionBounds(a: Bounds | null, b: Bounds | null): Bounds | null {
  if (!a) return b;
  if (!b) return a;
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width, b.x + b.width);
  const maxY = Math.max(a.y + a.height, b.y + b.height);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
function padBounds(b: Bounds, pad: number): Bounds {
  return {
    x: b.x - pad,
    y: b.y - pad,
    width: b.width + pad * 2,
    height: b.height + pad * 2,
  };
}
function getTextBoundsApprox(t: TextElement): Bounds {
  const width = Math.max(12, (t.text?.length ?? 0) * (t.fontSize * 0.6));
  return { x: t.x, y: t.y, width, height: t.fontSize * 1.2 };
}
function getStrokeBounds(s: DrawingStroke): Bounds | null {
  if (!Array.isArray(s.points) || s.points.length === 0) return null;
  let minX = s.points[0]!.x;
  let maxX = s.points[0]!.x;
  let minY = s.points[0]!.y;
  let maxY = s.points[0]!.y;
  for (const p of s.points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const pad = Math.max(1, (s.lineWidth ?? 2) / 2);
  return {
    x: minX - pad,
    y: minY - pad,
    width: maxX - minX + pad * 2,
    height: maxY - minY + pad * 2,
  };
}
function getViewportWorldRect(
  state: CanvasState,
  viewportSize: { width: number; height: number },
): Bounds {
  const zoom = state.zoomLevel || 1;
  const left = -(state.viewportX || 0) / zoom;
  const top = -(state.viewportY || 0) / zoom;
  const right = (viewportSize.width - (state.viewportX || 0)) / zoom;
  const bottom = (viewportSize.height - (state.viewportY || 0)) / zoom;
  return { x: left, y: top, width: right - left, height: bottom - top };
}
function computeContentBounds(state: CanvasState): Bounds | null {
  let b: Bounds | null = null;
  for (const s of state.shapes) {
    b = unionBounds(b, { x: s.x, y: s.y, width: s.width, height: s.height });
  }
  for (const n of state.stickyNotes) {
    b = unionBounds(b, { x: n.x, y: n.y, width: n.width, height: n.height });
  }
  for (const t of state.texts) {
    b = unionBounds(b, getTextBoundsApprox(t));
  }
  for (const e of state.panelEmbeds) {
    b = unionBounds(b, { x: e.x, y: e.y, width: e.width, height: e.height });
  }
  for (const s of state.strokes) {
    b = unionBounds(b, getStrokeBounds(s));
  }
  return b;
}
function boundsForSelectable(
  target: CanvasSelectable,
  state: CanvasState,
): Bounds | null {
  if (target.kind === "shape") {
    const s = state.shapes.find((x) => x.id === target.id);
    return s ? { x: s.x, y: s.y, width: s.width, height: s.height } : null;
  }
  if (target.kind === "sticky") {
    const n = state.stickyNotes.find((x) => x.id === target.id);
    return n ? { x: n.x, y: n.y, width: n.width, height: n.height } : null;
  }
  if (target.kind === "embed") {
    const e = state.panelEmbeds.find((x) => x.id === target.id);
    return e ? { x: e.x, y: e.y, width: e.width, height: e.height } : null;
  }
  const t = state.texts.find((x) => x.id === target.id);
  return t ? getTextBoundsApprox(t) : null;
}
export type WhiteboardMinimapProps = {
  canvasState: CanvasState;
  viewportSize: { width: number; height: number };
  selectedTargets: CanvasSelectable[];
  onNavigate: (nextViewport: { viewportX: number; viewportY: number }) => void;
};
export function WhiteboardMinimap({
  canvasState,
  viewportSize,
  selectedTargets,
  onNavigate,
}: WhiteboardMinimapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const viewportWorld = useMemo(
    () => getViewportWorldRect(canvasState, viewportSize),
    [canvasState, viewportSize],
  );
  const viewBounds = useMemo(() => {
    const content = computeContentBounds(canvasState);
    const combined = unionBounds(content, viewportWorld);
    if (!combined)
      return { x: viewportWorld.x, y: viewportWorld.y, width: 1, height: 1 };
    const pad = Math.max(80, Math.max(combined.width, combined.height) * 0.05);
    const padded = padBounds(combined, pad);
    return {
      x: padded.x,
      y: padded.y,
      width: Math.max(1, padded.width),
      height: Math.max(1, padded.height),
    };
  }, [canvasState, viewportWorld]);
  const selectionBounds = useMemo(() => {
    let b: Bounds | null = null;
    for (const t of selectedTargets) {
      b = unionBounds(b, boundsForSelectable(t, canvasState));
    }
    return b;
  }, [canvasState, selectedTargets]);
  const navigateToClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      if (viewportSize.width <= 0 || viewportSize.height <= 0) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nx = (clientX - rect.left) / rect.width;
      const ny = (clientY - rect.top) / rect.height;
      const worldX = viewBounds.x + nx * viewBounds.width;
      const worldY = viewBounds.y + ny * viewBounds.height;
      const zoom = canvasState.zoomLevel || 1;
      const viewportX = viewportSize.width / 2 - worldX * zoom;
      const viewportY = viewportSize.height / 2 - worldY * zoom;
      onNavigate({ viewportX, viewportY });
    },
    [
      canvasState.zoomLevel,
      onNavigate,
      viewportSize.height,
      viewportSize.width,
      viewBounds,
    ],
  );
  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      setDragging(true);
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
      navigateToClientPoint(e.clientX, e.clientY);
    },
    [navigateToClientPoint],
  );
  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging) return;
      navigateToClientPoint(e.clientX, e.clientY);
    },
    [dragging, navigateToClientPoint],
  );
  const onPointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    setDragging(false);
    (e.currentTarget as any).releasePointerCapture?.(e.pointerId);
  }, []);
  const strokeBounds = useMemo(() => {
    const rects: Bounds[] = [];
    for (const s of canvasState.strokes) {
      const b = getStrokeBounds(s);
      if (b) rects.push(b);
    }
    return rects;
  }, [canvasState.strokes]);
  return (
    <div
      className="absolute bottom-3 right-3 md:bottom-4 md:right-4 z-40 pointer-events-auto"
      style={{ width: 180, height: 140 }}
    >
      {" "}
      <div className="w-full h-full rounded-lg border border-border/40 bg-background/80 backdrop-blur-sm shadow-lg overflow-hidden">
        {" "}
        <div className="flex items-center justify-between px-2 py-1 border-b border-border/30">
          {" "}
          <span className="text-[10px] font-semibold text-foreground/70">
            {" "}
            Minimap{" "}
          </span>{" "}
          <span className="text-[10px] text-foreground/50">
            {" "}
            {Math.round((canvasState.zoomLevel || 1) * 100)}%{" "}
          </span>{" "}
        </div>{" "}
        <svg
          ref={svgRef}
          className="w-full h-[calc(100%-24px)] touch-none"
          viewBox={`${viewBounds.x} ${viewBounds.y} ${viewBounds.width} ${viewBounds.height}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {" "}
          <rect
            x={viewBounds.x}
            y={viewBounds.y}
            width={viewBounds.width}
            height={viewBounds.height}
            fill="rgba(255,255,255,0.02)"
          />{" "}
          {strokeBounds.map((b, idx) => (
            <rect
              key={`stroke-${idx}`}
              x={b.x}
              y={b.y}
              width={b.width}
              height={b.height}
              fill="rgba(99,102,241,0.05)"
              stroke="rgba(99,102,241,0.12)"
              strokeWidth={Math.max(1, viewBounds.width / 800)}
            />
          ))}{" "}
          {canvasState.shapes.map((s) => (
            <rect
              key={`shape-${s.id}`}
              x={s.x}
              y={s.y}
              width={Math.max(1, s.width)}
              height={Math.max(1, s.height)}
              fill="rgba(16,185,129,0.08)"
              stroke="rgba(16,185,129,0.2)"
              strokeWidth={Math.max(1, viewBounds.width / 900)}
            />
          ))}{" "}
          {canvasState.stickyNotes.map((n) => (
            <rect
              key={`sticky-${n.id}`}
              x={n.x}
              y={n.y}
              width={Math.max(1, n.width)}
              height={Math.max(1, n.height)}
              fill="rgba(245,158,11,0.10)"
              stroke="rgba(245,158,11,0.22)"
              strokeWidth={Math.max(1, viewBounds.width / 900)}
            />
          ))}{" "}
          {canvasState.texts.map((t) => {
            const b = getTextBoundsApprox(t);
            return (
              <rect
                key={`text-${t.id}`}
                x={b.x}
                y={b.y}
                width={Math.max(1, b.width)}
                height={Math.max(1, b.height)}
                fill="rgba(236,72,153,0.08)"
                stroke="rgba(236,72,153,0.18)"
                strokeWidth={Math.max(1, viewBounds.width / 1000)}
              />
            );
          })}{" "}
          {canvasState.panelEmbeds.map((e) => (
            <rect
              key={`embed-${e.id}`}
              x={e.x}
              y={e.y}
              width={Math.max(1, e.width)}
              height={Math.max(1, e.height)}
              fill="rgba(59,130,246,0.06)"
              stroke="rgba(59,130,246,0.18)"
              strokeWidth={Math.max(1, viewBounds.width / 900)}
            />
          ))}{" "}
          {selectionBounds && (
            <rect
              x={selectionBounds.x}
              y={selectionBounds.y}
              width={selectionBounds.width}
              height={selectionBounds.height}
              fill="rgba(16,185,129,0.06)"
              stroke="rgba(16,185,129,0.45)"
              strokeWidth={Math.max(1, viewBounds.width / 600)}
              strokeDasharray={`${Math.max(2, viewBounds.width / 120)} ${Math.max(2, viewBounds.width / 120)}`}
            />
          )}{" "}
          <rect
            x={viewportWorld.x}
            y={viewportWorld.y}
            width={viewportWorld.width}
            height={viewportWorld.height}
            fill="rgba(255,255,255,0.02)"
            stroke="rgba(59,130,246,0.9)"
            strokeWidth={Math.max(1, viewBounds.width / 500)}
          />{" "}
        </svg>{" "}
      </div>{" "}
    </div>
  );
}
