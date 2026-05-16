import React, { useRef, useCallback, useState } from "react";

export interface GradientStop {
  position: number;
  color: string;
}

export interface Gradient {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stops: GradientStop[];
  type: "linear" | "radial";
}

interface CanvasBasedGradientToolProps {
  canvas: HTMLCanvasElement | null;
  isActive: boolean;
  onGradientCreate: (gradient: Gradient) => void;
  onCancel: () => void;
}

export default function CanvasBasedGradientTool({
  canvas,
  isActive,
  onGradientCreate,
  onCancel,
}: CanvasBasedGradientToolProps) {
  const [gradientType, setGradientType] = useState<"linear" | "radial">(
    "linear",
  );
  const [startColor, setStartColor] = useState("#FF0000");
  const [endColor, setEndColor] = useState("#0000FF");
  const [isDrawing, setIsDrawing] = useState(false);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);
  const endPointRef = useRef<{ x: number; y: number } | null>(null);
  const canvasStateRef = useRef<ImageData | null>(null);

  if (!isActive || !canvas) return null;

  const canvasWidth = canvas.width || 1200;
  const canvasHeight = canvas.height || 800;

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      startPointRef.current = { x, y };
      endPointRef.current = null;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvasStateRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }

      setIsDrawing(true);
    },
    [canvas]
  );

  const drawGradientPreview = useCallback(
    (ctx: CanvasRenderingContext2D, startPt: { x: number; y: number }, endPt: { x: number; y: number }) => {
      if (gradientType === "linear") {
        ctx.strokeStyle = "#c8a97e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(startPt.x, startPt.y);
        ctx.lineTo(endPt.x, endPt.y);
        ctx.stroke();

        ctx.fillStyle = startColor;
        ctx.beginPath();
        ctx.arc(startPt.x, startPt.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = endColor;
        ctx.beginPath();
        ctx.arc(endPt.x, endPt.y, 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const distance = Math.sqrt(
          (endPt.x - startPt.x) ** 2 + (endPt.y - startPt.y) ** 2,
        );

        ctx.strokeStyle = "#c8a97e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(startPt.x, startPt.y, distance, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = startColor;
        ctx.beginPath();
        ctx.arc(startPt.x, startPt.y, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = endColor;
        ctx.beginPath();
        ctx.arc(endPt.x, endPt.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [gradientType, startColor, endColor]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !startPointRef.current || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      endPointRef.current = { x, y };

      const ctx = canvas.getContext("2d");
      if (!ctx || !canvasStateRef.current) return;

      ctx.putImageData(canvasStateRef.current, 0, 0);
      drawGradientPreview(ctx, startPointRef.current, { x, y });
    },
    [isDrawing, canvas, drawGradientPreview]
  );

  const handleCanvasMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !startPointRef.current || !endPointRef.current) {
        setIsDrawing(false);
        return;
      }

      const gradientStops: GradientStop[] = [
        { position: 0, color: startColor },
        { position: 100, color: endColor },
      ];

      const gradient: Gradient = {
        id: `gradient-${Date.now()}`,
        x1: startPointRef.current.x,
        y1: startPointRef.current.y,
        x2: endPointRef.current.x,
        y2: endPointRef.current.y,
        stops: gradientStops,
        type: gradientType,
      };

      onGradientCreate(gradient);
      setIsDrawing(false);
      startPointRef.current = null;
      endPointRef.current = null;
      canvasStateRef.current = null;
    },
    [isDrawing, startColor, endColor, gradientType, onGradientCreate]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    },
    [onCancel]
  );

  React.useEffect(() => {
    if (!isActive) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, handleKeyDown]);

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        backgroundColor: "rgba(0, 0, 0, 0.9)",
        border: "1px solid #c8a97e",
        borderRadius: "8px",
        padding: "16px",
        zIndex: 1001,
        maxWidth: "280px",
        color: "#ccc",
      }}
    >
      <h3
        style={{
          margin: "0 0 12px 0",
          color: "#c8a97e",
          fontSize: "14px",
          fontWeight: "600",
        }}
      >
        Gradient Tool
      </h3>

      {/* Gradient Type */}
      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            color: "#666",
            fontSize: "10px",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Type
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px",
          }}
        >
          {["linear", "radial"].map((type) => (
            <button
              key={type}
              onClick={() => setGradientType(type as "linear" | "radial")}
              style={{
                padding: "6px",
                backgroundColor:
                  gradientType === type
                    ? "rgba(0, 240, 255, 0.2)"
                    : "transparent",
                border: `1px solid ${gradientType === type ? "#c8a97e" : "#444"}`,
                color: gradientType === type ? "#c8a97e" : "#aaa",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "10px",
                textTransform: "capitalize",
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Start Color */}
      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            color: "#666",
            fontSize: "10px",
            display: "block",
            marginBottom: "4px",
          }}
        >
          Start Color
        </label>
        <input
          type="color"
          value={startColor}
          onChange={(e) => setStartColor(e.target.value)}
          style={{
            width: "100%",
            height: "40px",
            border: "1px solid #444",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        />
      </div>

      {/* End Color */}
      <div style={{ marginBottom: "12px" }}>
        <label
          style={{
            color: "#666",
            fontSize: "10px",
            display: "block",
            marginBottom: "4px",
          }}
        >
          End Color
        </label>
        <input
          type="color"
          value={endColor}
          onChange={(e) => setEndColor(e.target.value)}
          style={{
            width: "100%",
            height: "40px",
            border: "1px solid #444",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        />
      </div>

      {/* Instructions */}
      <div style={{ fontSize: "10px", color: "#666", marginTop: "12px" }}>
        <div>
          {gradientType === "linear"
            ? "• Drag from start to end point"
            : "• Drag to set radius"}
        </div>
        <div>• Press ESC to cancel</div>
      </div>
    </div>
  );
}
