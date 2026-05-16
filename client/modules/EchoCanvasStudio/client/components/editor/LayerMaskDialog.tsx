import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export interface LayerMask {
  id: string;
  name: string;
  enabled: boolean;
  canvas: HTMLCanvasElement;
  opacity: number;
  inverted: boolean;
}

interface LayerMaskDialogProps {
  layerId: string;
  layerName: string;
  currentMask?: LayerMask;
  onApplyMask: (mask: LayerMask) => void;
  onCancel: () => void;
}

export default function LayerMaskDialog({
  layerId: _layerId,
  layerName,
  currentMask,
  onApplyMask,
  onCancel,
}: LayerMaskDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [maskOpacity, setMaskOpacity] = useState(currentMask?.opacity || 100);
  const [maskInverted, setMaskInverted] = useState(currentMask?.inverted || false);
  const [drawColor, setDrawColor] = useState("white");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 300;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (currentMask) {
      try {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        img.onerror = () => setError("Failed to load existing mask");
        img.src = currentMask.canvas.toDataURL();
      } catch {
        setError("Could not load existing mask");
      }
    }
  }, [currentMask]);

  const paintAt = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.globalAlpha = brushOpacity / 100;
    ctx.fillStyle = drawColor;
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  const handleMouseDown = () => setIsDrawing(true);
  const handleMouseUp = () => setIsDrawing(false);
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    paintAt(e.clientX - rect.left, e.clientY - rect.top);
  };

  // Touch support for mobile
  const handleTouchStart = () => setIsDrawing(true);
  const handleTouchEnd = () => setIsDrawing(false);
  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      paintAt(touch.clientX - rect.left, touch.clientY - rect.top);
    }
  };

  const handleClearMask = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  const handleApply = () => {
    if (!canvasRef.current) return;
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvasRef.current.width;
    maskCanvas.height = canvasRef.current.height;
    const ctx = maskCanvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(canvasRef.current, 0, 0);
    const mask: LayerMask = {
      id: currentMask?.id || `mask-${Date.now()}`,
      name: currentMask?.name || "Layer Mask",
      enabled: true,
      canvas: maskCanvas,
      opacity: maskOpacity,
      inverted: maskInverted,
    };
    onApplyMask(mask);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        ref={containerRef}
        style={{
          backgroundColor: "#2a2a2a",
          borderRadius: "8px",
          padding: "20px",
          maxWidth: "600px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
          border: "1px solid #c8a97e",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {error && (
          <div
            style={{
              padding: "8px 12px",
              backgroundColor: "rgba(255, 0, 0, 0.1)",
              borderLeft: "3px solid #ff4444",
              color: "#ff4444",
              fontSize: "11px",
              borderRadius: "4px",
              marginBottom: "12px",
            }}
          >
            {error}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ color: "#c8a97e", margin: 0, fontSize: "18px" }}>
            Edit Mask: {layerName}
          </h2>
          <button
            onClick={onCancel}
            style={{ background: "none", border: "none", color: "#c8a97e", cursor: "pointer", padding: "4px" }}
          >
            <X size={20} />
          </button>
        </div>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={handleTouchMove}
          onMouseLeave={handleMouseUp}
          style={{
            border: "2px solid #c8a97e",
            borderRadius: "4px",
            display: "block",
            marginBottom: "20px",
            cursor: "crosshair",
            backgroundColor: "#0b0f1a",
            maxWidth: "100%",
          }}
        />
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", color: "#c8a97e", fontSize: "12px", marginBottom: "6px" }}>
            Brush Color
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            {["white", "black", "gray"].map((color) => (
              <button
                key={color}
                onClick={() => setDrawColor(color)}
                style={{
                  width: "32px",
                  height: "32px",
                  backgroundColor: color === "white" ? "#fff" : color === "black" ? "#000" : "#888",
                  border: drawColor === color ? "2px solid #c8a97e" : "1px solid #444",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", color: "#c8a97e", fontSize: "12px", marginBottom: "6px" }}>
            Brush Size: {brushSize}px
          </label>
          <input
            type="range"
            min="1"
            max="100"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c8a97e" }}
          />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", color: "#c8a97e", fontSize: "12px", marginBottom: "6px" }}>
            Brush Opacity: {brushOpacity}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={brushOpacity}
            onChange={(e) => setBrushOpacity(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c8a97e" }}
          />
        </div>
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", color: "#c8a97e", fontSize: "12px", marginBottom: "6px" }}>
            Mask Opacity: {maskOpacity}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={maskOpacity}
            onChange={(e) => setMaskOpacity(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#c8a97e" }}
          />
        </div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
          <input
            type="checkbox"
            checked={maskInverted}
            onChange={(e) => setMaskInverted(e.target.checked)}
            id="invert-mask"
            style={{ accentColor: "#c8a97e" }}
          />
          <label
            htmlFor="invert-mask"
            style={{ color: "#c8a97e", fontSize: "12px", margin: 0, cursor: "pointer" }}
          >
            Invert Mask
          </label>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleClearMask}
            style={{
              flex: 1,
              padding: "8px",
              backgroundColor: "#444",
              color: "#c8a97e",
              border: "1px solid #c8a97e",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Clear Mask
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "8px",
              backgroundColor: "transparent",
              color: "#c8a97e",
              border: "1px solid #c8a97e",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            style={{
              flex: 1,
              padding: "8px",
              backgroundColor: "#c8a97e",
              color: "#000",
              border: "1px solid #c8a97e",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            Apply Mask
          </button>
        </div>
      </div>
    </div>
  );
}
