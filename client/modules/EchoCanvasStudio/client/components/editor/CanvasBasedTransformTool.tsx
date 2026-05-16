import React, { useEffect, useRef, useState } from "react";
import { RotateCw, Copy, Trash2, Check, X } from "lucide-react";
import { TransformEngine, TransformHandle, TransformState } from "./TransformEngine";

interface CanvasBasedTransformToolProps {
  canvas: HTMLCanvasElement | null;
  onApply: (transformedImageData: ImageData) => void;
  onCancel: () => void;
  initialImageData?: ImageData;
  layerWidth?: number;
  layerHeight?: number;
}

export default function CanvasBasedTransformTool({
  canvas,
  onApply,
  onCancel,
  initialImageData,
  layerWidth = 300,
  layerHeight = 300,
}: CanvasBasedTransformToolProps) {
  const [engine, setEngine] = useState<TransformEngine | null>(null);
  const [handles, setHandles] = useState<TransformHandle[]>([]);
  const [activeHandle, setActiveHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [transformState, setTransformState] = useState<TransformState>({
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    skewX: 0,
    skewY: 0,
    translateX: 0,
    translateY: 0,
    perspectiveX: 0,
    perspectiveY: 0,
  });
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newEngine = new TransformEngine(canvas, ctx);
    newEngine.setBoundingBox(50, 50, layerWidth, layerHeight);
    setEngine(newEngine);
    setHandles(newEngine.getHandles());

    renderTransformUI();
  }, [canvas, layerWidth, layerHeight]);

  const renderTransformUI = () => {
    if (!overlayCanvasRef.current || !engine) return;

    const overlayCtx = overlayCanvasRef.current.getContext("2d");
    if (!overlayCtx) return;

    overlayCtx.clearRect(
      0,
      0,
      overlayCanvasRef.current.width,
      overlayCanvasRef.current.height,
    );
    engine.drawTransformOutline("#c8a97e", "#c8a97e");
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!engine || !overlayCanvasRef.current) return;

    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const currentHandles = engine.getHandles();
    for (const handle of currentHandles) {
      const distance = Math.sqrt((x - handle.x) ** 2 + (y - handle.y) ** 2);
      if (distance < 10) {
        setActiveHandle(handle.id);
        setDragStart({ x, y });
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeHandle || !dragStart || !engine || !overlayCanvasRef.current)
      return;

    const rect = overlayCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    engine.updateTransform(
      activeHandle,
      dragStart,
      { x, y },
      e.shiftKey,
    );

    setHandles(engine.getHandles());
    setTransformState(engine.getState());
    renderTransformUI();
  };

  const handleMouseUp = () => {
    setActiveHandle(null);
    setDragStart(null);
  };

  const applyTransform = () => {
    if (!canvas || !engine) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bbox = engine.getBoundingBox();
    const imageData = ctx.getImageData(
      bbox.minX,
      bbox.minY,
      bbox.width,
      bbox.height,
    );

    const transformedImageData = engine.applyTransform(imageData);
    onApply(transformedImageData);
  };

  const resetTransform = () => {
    if (!engine) return;
    engine.reset();
    setHandles(engine.getHandles());
    setTransformState(engine.getState());
    renderTransformUI();
  };

  const updateRotation = (value: number) => {
    if (!engine) return;
    engine.setRotation(value);
    setHandles(engine.getHandles());
    setTransformState(engine.getState());
    renderTransformUI();
  };

  const updateSkew = (direction: "x" | "y", value: number) => {
    if (!engine) return;
    const current = engine.getState();
    if (direction === "x") {
      engine.applySkew(value, current.skewY);
    } else {
      engine.applySkew(current.skewX, value);
    }
    setTransformState(engine.getState());
    renderTransformUI();
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "rgba(0, 0, 0, 0.3)",
        zIndex: 1000,
      }}
    >
      {/* Transform Overlay Canvas */}
      <canvas
        ref={overlayCanvasRef}
        width={canvas?.width || 800}
        height={canvas?.height || 600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          cursor: activeHandle
            ? "grabbing"
            : "crosshair",
          flex: 1,
        }}
      />

      {/* Transform Controls Panel */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 50,
          backgroundColor: "#0b0f1a",
          border: "1px solid #c8a97e",
          borderRadius: "8px",
          padding: "16px",
          display: "flex",
          gap: "12px",
          alignItems: "center",
          zIndex: 1001,
        }}
      >
        {/* Rotation */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <RotateCw size={16} color="#c8a97e" />
          <label
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            Rotate:
          </label>
          <input
            type="range"
            min="-360"
            max="360"
            value={Math.round(transformState.rotation)}
            onChange={(e) => updateRotation(Number(e.target.value))}
            style={{
              width: "120px",
              cursor: "pointer",
              accentColor: "#c8a97e",
            }}
          />
          <span
            style={{
              color: "#c8a97e",
              fontSize: "11px",
              minWidth: "40px",
            }}
          >
            {Math.round(transformState.rotation)}°
          </span>
        </div>

        {/* Skew X */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            borderLeft: "1px solid #333",
            paddingLeft: "12px",
          }}
        >
          <label
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            Skew X:
          </label>
          <input
            type="range"
            min="-45"
            max="45"
            value={Math.round(transformState.skewX)}
            onChange={(e) => updateSkew("x", Number(e.target.value))}
            style={{
              width: "100px",
              cursor: "pointer",
              accentColor: "#c8a97e",
            }}
          />
          <span
            style={{
              color: "#c8a97e",
              fontSize: "11px",
              minWidth: "35px",
            }}
          >
            {Math.round(transformState.skewX)}°
          </span>
        </div>

        {/* Skew Y */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          <label
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            Skew Y:
          </label>
          <input
            type="range"
            min="-45"
            max="45"
            value={Math.round(transformState.skewY)}
            onChange={(e) => updateSkew("y", Number(e.target.value))}
            style={{
              width: "100px",
              cursor: "pointer",
              accentColor: "#c8a97e",
            }}
          />
          <span
            style={{
              color: "#c8a97e",
              fontSize: "11px",
              minWidth: "35px",
            }}
          >
            {Math.round(transformState.skewY)}°
          </span>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetTransform}
          title="Reset to original"
          style={{
            backgroundColor: "#333",
            border: "1px solid #c8a97e",
            color: "#c8a97e",
            padding: "6px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            marginLeft: "12px",
          }}
        >
          <Copy size={14} />
          Reset
        </button>

        {/* Apply Button */}
        <button
          onClick={applyTransform}
          style={{
            backgroundColor: "#c8a97e",
            border: "1px solid #c8a97e",
            color: "#000",
            padding: "6px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Check size={14} />
          Apply
        </button>

        {/* Cancel Button */}
        <button
          onClick={onCancel}
          style={{
            backgroundColor: "#4a0000",
            border: "1px solid #ff4444",
            color: "#ff4444",
            padding: "6px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <X size={14} />
          Cancel
        </button>
      </div>

      {/* Info Panel */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          backgroundColor: "#0b0f1a",
          border: "1px solid #c8a97e",
          borderRadius: "8px",
          padding: "12px",
          color: "#c8a97e",
          fontSize: "12px",
          maxWidth: "200px",
          zIndex: 1001,
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
          Transform Info
        </div>
        <div>Scale X: {transformState.scaleX.toFixed(2)}</div>
        <div>Scale Y: {transformState.scaleY.toFixed(2)}</div>
        <div>Rotation: {transformState.rotation.toFixed(1)}°</div>
        <div style={{ marginTop: "8px", fontSize: "11px", color: "#666" }}>
          Drag handles to transform
        </div>
        <div style={{ fontSize: "11px", color: "#666" }}>
          Shift+drag to maintain aspect ratio
        </div>
      </div>
    </div>
  );
}
