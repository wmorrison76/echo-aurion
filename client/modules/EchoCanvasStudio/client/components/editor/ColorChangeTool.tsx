import React, { useState, useRef, useEffect } from "react";
import { X, Pipette } from "lucide-react";

interface ColorChangeToolProps {
  canvas: HTMLCanvasElement | null;
  onApply: (canvas: HTMLCanvasElement) => void;
  onCancel: () => void;
}

export default function ColorChangeTool({
  canvas,
  onApply,
  onCancel,
}: ColorChangeToolProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [sourceColor, setSourceColor] = useState("#FF0000");
  const [targetColor, setTargetColor] = useState("#00FF00");
  const [tolerance, setTolerance] = useState(30);
  const [isPickingColor, setIsPickingColor] = useState(false);

  useEffect(() => {
    if (!canvas || !previewCanvasRef.current) return;

    const previewCanvas = previewCanvasRef.current;
    const ctx = previewCanvas.getContext("2d");
    if (!ctx) return;

    previewCanvas.width = canvas.width;
    previewCanvas.height = canvas.height;

    const imageData = canvas
      .getContext("2d")
      ?.getImageData(0, 0, canvas.width, canvas.height);
    if (!imageData) return;

    const data = imageData.data;

    const sourceRGB = hexToRGB(sourceColor);
    const targetRGB = hexToRGB(targetColor);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distance = Math.sqrt(
        Math.pow(r - sourceRGB.r, 2) +
          Math.pow(g - sourceRGB.g, 2) +
          Math.pow(b - sourceRGB.b, 2),
      );

      if (distance < tolerance) {
        const ratio = 1 - distance / tolerance;
        data[i] = Math.round(r + (targetRGB.r - r) * ratio);
        data[i + 1] = Math.round(g + (targetRGB.g - g) * ratio);
        data[i + 2] = Math.round(b + (targetRGB.b - b) * ratio);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [canvas, sourceColor, targetColor, tolerance]);

  const hexToRGB = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  };

  const handleApply = () => {
    if (previewCanvasRef.current) {
      onApply(previewCanvasRef.current);
    }
  };

  const handlePickColor = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPickingColor || !previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(x, y, 1, 1);
    const [r, g, b] = Array.from(imageData.data.slice(0, 3));

    const hex =
      "#" +
      [r, g, b]
        .map((x) => x.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
    setSourceColor(hex);
    setIsPickingColor(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        backgroundColor: "#0b0f1a",
        border: "1px solid #333",
        borderRadius: "8px",
        padding: "20px",
        zIndex: 1000,
        minWidth: "600px",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.8)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3
          style={{
            color: "#c8a97e",
            margin: 0,
            fontSize: "16px",
            fontWeight: "600",
          }}
        >
          🎨 Color Change Tool
        </h3>
        <button
          onClick={onCancel}
          style={{
            background: "none",
            border: "none",
            color: "#666",
            cursor: "pointer",
            padding: "4px",
          }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ display: "flex", gap: "20px", marginBottom: "16px" }}>
        <div style={{ flex: 1 }}>
          <canvas
            ref={previewCanvasRef}
            onClick={handlePickColor}
            style={{
              maxWidth: "100%",
              maxHeight: "400px",
              border: "1px solid #333",
              borderRadius: "4px",
              cursor: isPickingColor ? "crosshair" : "default",
              display: "block",
              backgroundColor: "#0a0a0a",
            }}
          />
        </div>

        <div
          style={{
            width: "200px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                color: "#666",
                fontSize: "12px",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              Source Color
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="color"
                value={sourceColor}
                onChange={(e) => setSourceColor(e.target.value)}
                style={{
                  width: "50px",
                  height: "40px",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              />
              <button
                onClick={() => setIsPickingColor(!isPickingColor)}
                style={{
                  flex: 1,
                  backgroundColor: isPickingColor
                    ? "rgba(0, 240, 255, 0.2)"
                    : "#333",
                  border: `1px solid ${isPickingColor ? "#c8a97e" : "#444"}`,
                  color: isPickingColor ? "#c8a97e" : "#aaa",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  fontSize: "12px",
                }}
              >
                <Pipette size={14} />
                {isPickingColor ? "Pick" : "Pick Color"}
              </button>
            </div>
            <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
              {sourceColor}
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                color: "#666",
                fontSize: "12px",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              Target Color
            </label>
            <input
              type="color"
              value={targetColor}
              onChange={(e) => setTargetColor(e.target.value)}
              style={{
                width: "100%",
                height: "40px",
                border: "1px solid #333",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            />
            <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
              {targetColor}
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                color: "#666",
                fontSize: "12px",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              Tolerance ({tolerance})
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={tolerance}
              onChange={(e) => setTolerance(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>
              Lower = exact color match, Higher = similar colors
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleApply}
              style={{
                flex: 1,
                padding: "8px",
                backgroundColor: "rgba(0, 240, 255, 0.2)",
                border: "1px solid #c8a97e",
                color: "#c8a97e",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "12px",
              }}
            >
              Apply
            </button>
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: "8px",
                backgroundColor: "#333",
                border: "1px solid #444",
                color: "#aaa",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "12px",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
