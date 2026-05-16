import React, { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  CanvasState,
  DrawingStroke,
  DrawingTool,
  CanvasSelectable,
  ShapeElement,
  StickyNote,
  TextElement,
} from "./types";
import { v4 as uuidv4 } from "uuid";

type StateChangeOptions = {
  pushUndo?: boolean;
  undoBase?: CanvasState;
  broadcast?: Array<{ type: "shape" | "text" | "sticky"; data: any }> | null;
};

interface DrawingCanvasProps {
  sessionId: string;
  userId: string;
  canvasState: CanvasState;
  selectedTool: DrawingTool;
  selectedColor: string;
  selectedFillColor?: string;
  lineWidth: number;
  opacity: number;
  selectedTargets?: CanvasSelectable[];
  onSelectionChange?: (targets: CanvasSelectable[]) => void;
  onStateChange: (state: CanvasState, options?: StateChangeOptions) => void;
  onStrokeComplete?: (stroke: DrawingStroke) => void;
  onShapeComplete?: (shape: ShapeElement) => void;
  onTextComplete?: (text: TextElement) => void;
  onStickyComplete?: (note: StickyNote) => void;
  readOnly?: boolean;
  showGrid?: boolean;
  showRulers?: boolean;
  snappingEnabled?: boolean;
}

type Point = { x: number; y: number };
type CanvasSize = { cssWidth: number; cssHeight: number; dpr: number };

function canvasToWorld(pt: Point, state: CanvasState): Point {
  const zoom = state.zoomLevel || 1;
  const offsetX = state.viewportX || 0;
  const offsetY = state.viewportY || 0;
  return {
    x: (pt.x - offsetX) / zoom,
    y: (pt.y - offsetY) / zoom,
  };
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  sessionId,
  userId,
  canvasState,
  selectedTool,
  selectedColor,
  selectedFillColor,
  lineWidth,
  opacity,
  selectedTargets,
  onSelectionChange,
  onStateChange,
  onStrokeComplete,
  onShapeComplete,
  onTextComplete,
  onStickyComplete,
  readOnly = false,
  showGrid = false,
  showRulers = false,
  snappingEnabled = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const contentCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize and handle resize
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      [bgCanvasRef, contentCanvasRef, overlayCanvasRef].forEach((ref) => {
        if (ref.current) {
          ref.current.width = width * dpr;
          ref.current.height = height * dpr;
          ref.current.style.width = `${width}px`;
          ref.current.style.height = `${height}px`;
          const ctx = ref.current.getContext("2d");
          if (ctx) ctx.scale(dpr, dpr);
        }
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Simple rendering loop
  useEffect(() => {
    const draw = () => {
      if (!contentCanvasRef.current) return;
      const ctx = contentCanvasRef.current.getContext("2d");
      if (!ctx) return;

      const { width, height } = contentCanvasRef.current.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(canvasState.viewportX, canvasState.viewportY);
      ctx.scale(canvasState.zoomLevel, canvasState.zoomLevel);

      // Draw strokes
      canvasState.strokes.forEach((stroke) => {
        if (!stroke.points.length) return;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.lineWidth;
        ctx.globalAlpha = stroke.opacity;
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        ctx.stroke();
      });

      // Draw shapes
      canvasState.shapes.forEach((shape) => {
        ctx.beginPath();
        ctx.strokeStyle = shape.color;
        ctx.lineWidth = shape.lineWidth;
        ctx.globalAlpha = shape.opacity;
        if (shape.fillColor && shape.fillColor !== "transparent") {
          ctx.fillStyle = shape.fillColor;
        }

        if (shape.type === "rectangle") {
          ctx.rect(shape.x, shape.y, shape.width, shape.height);
        } else if (shape.type === "circle") {
          ctx.arc(
            shape.x + shape.width / 2,
            shape.y + shape.height / 2,
            Math.min(shape.width, shape.height) / 2,
            0,
            Math.PI * 2,
          );
        }

        if (shape.fillColor && shape.fillColor !== "transparent") {
          ctx.fill();
        }
        ctx.stroke();
      });

      // Draw texts
      canvasState.texts.forEach((text) => {
        ctx.fillStyle = text.color;
        ctx.font = `${text.fontSize}px ${text.fontFamily || "Arial"}`;
        ctx.fillText(text.text, text.x, text.y + text.fontSize);
      });

      ctx.restore();
    };

    draw();
  }, [canvasState]);

  // Pointer events for drawing
  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<DrawingStroke | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    if (selectedTool !== "pen") return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const pt = canvasToWorld(
      { x: e.clientX - rect.left, y: e.clientY - rect.top },
      canvasState,
    );

    isDrawingRef.current = true;
    currentStrokeRef.current = {
      id: uuidv4(),
      toolType: "pen",
      color: selectedColor,
      lineWidth,
      opacity,
      points: [pt],
      timestamp: Date.now(),
      userId,
      sessionId,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const pt = canvasToWorld(
      { x: e.clientX - rect.left, y: e.clientY - rect.top },
      canvasState,
    );

    currentStrokeRef.current.points.push(pt);

    // Force redraw for current stroke (simplified)
    const ctx = overlayCanvasRef.current?.getContext("2d");
    if (ctx) {
      const { width, height } =
        overlayCanvasRef.current!.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(canvasState.viewportX, canvasState.viewportY);
      ctx.scale(canvasState.zoomLevel, canvasState.zoomLevel);
      ctx.beginPath();
      ctx.strokeStyle = currentStrokeRef.current.color;
      ctx.lineWidth = currentStrokeRef.current.lineWidth;
      ctx.globalAlpha = currentStrokeRef.current.opacity;
      const pts = currentStrokeRef.current.points;
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current || !currentStrokeRef.current) return;
    isDrawingRef.current = false;

    const stroke = currentStrokeRef.current;
    currentStrokeRef.current = null;

    // Clear overlay
    const ctx = overlayCanvasRef.current?.getContext("2d");
    if (ctx) {
      const { width, height } =
        overlayCanvasRef.current!.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);
    }

    // Add stroke to state
    onStateChange({
      ...canvasState,
      strokes: [...canvasState.strokes, stroke],
    });
    onStrokeComplete?.(stroke);
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <canvas ref={bgCanvasRef} className="absolute inset-0" />
      <canvas ref={contentCanvasRef} className="absolute inset-0" />
      <canvas ref={overlayCanvasRef} className="absolute inset-0" />
    </div>
  );
};

export default DrawingCanvas;
