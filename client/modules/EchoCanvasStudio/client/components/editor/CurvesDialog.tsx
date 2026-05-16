import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
interface CurvesDialogProps {
  canvas: HTMLCanvasElement | null;
  onApply: (curve: number[]) => void;
  onCancel: () => void;
}
export default function CurvesDialog({
  canvas,
  onApply,
  onCancel,
}: CurvesDialogProps) {
  const curveCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [curve, setCurve] = useState<number[]>(
    Array.from({ length: 256 }, (_, i) => i),
  );
  const [isDragging, setIsDragging] = useState(false);
  const generateLinearCurve = () => {
    setCurve(Array.from({ length: 256 }, (_, i) => i));
  };
  const generateSCurve = () => {
    const newCurve = Array(256);
    for (let i = 0; i < 256; i++) {
      const normalized = i / 255;
      const sCurve =
        normalized < 0.5
          ? 2 * normalized * normalized
          : 1 - 2 * (1 - normalized) * (1 - normalized);
      newCurve[i] = Math.round(sCurve * 255);
    }
    setCurve(newCurve);
  };
  useEffect(() => {
    if (!curveCanvasRef.current) return;
    const ctx = curveCanvasRef.current.getContext("2d");
    if (!ctx) return;
    const width = curveCanvasRef.current.width;
    const height = curveCanvasRef.current.height;
    const padding = 20;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "#444";
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, padding);
    ctx.stroke();
    ctx.strokeStyle = "#c8a97e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 256; i++) {
      const x = padding + (i / 255) * (width - 2 * padding);
      const y = height - padding - (curve[i] / 255) * (height - 2 * padding);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.fillStyle = "#c8a97e";
    for (let i = 0; i < 256; i++) {
      const x = padding + (i / 255) * (width - 2 * padding);
      const y = height - padding - (curve[i] / 255) * (height - 2 * padding);
      ctx.fillRect(x - 2, y - 2, 4, 4);
    }
  }, [curve]);
  useEffect(() => {
    if (!canvas || !previewCanvasRef.current) return;
    const ctx = previewCanvasRef.current.getContext("2d");
    if (!ctx) return;
    previewCanvasRef.current.width = canvas.width;
    previewCanvasRef.current.height = canvas.height;
    const imageData = canvas
      .getContext("2d")
      ?.getImageData(0, 0, canvas.width, canvas.height);
    if (!imageData) return;
    const data = imageData.data.slice();
    for (let i = 0; i < data.length; i += 4) {
      data[i] = curve[data[i]];
      data[i + 1] = curve[data[i + 1]];
      data[i + 2] = curve[data[i + 2]];
    }
    const previewImageData = new ImageData(data, canvas.width, canvas.height);
    ctx.putImageData(previewImageData, 0, 0);
  }, [canvas, curve]);
  const handleCurveCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!curveCanvasRef.current) return;
    const rect = curveCanvasRef.current.getBoundingClientRect();
    const padding = 20;
    const width = curveCanvasRef.current.width;
    const height = curveCanvasRef.current.height;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const normalizedX = Math.max(
      0,
      Math.min(1, (x - padding) / (width - 2 * padding)),
    );
    const normalizedY = Math.max(
      0,
      Math.min(1, 1 - (y - padding) / (height - 2 * padding)),
    );
    const index = Math.round(normalizedX * 255);
    const newCurve = [...curve];
    newCurve[index] = Math.round(normalizedY * 255);
    setCurve(newCurve);
  };
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={onCancel}
    >
      {" "}
      <div
        style={{
          backgroundColor: "#0b0f1a",
          border: "1px solid #444",
          borderRadius: "8px",
          boxShadow: "0 12px 48px rgba(0, 0, 0, 0.8)",
          padding: "24px",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {" "}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          {" "}
          <h2
            style={{
              margin: 0,
              color: "#c8a97e",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            Curves
          </h2>{" "}
          <button
            onClick={onCancel}
            style={{
              background: "none",
              border: "none",
              color: "#ccc",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {" "}
            <X size={20} />{" "}
          </button>{" "}
        </div>{" "}
        <div style={{ marginBottom: "20px" }}>
          {" "}
          <h3
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "600",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {" "}
            Curve Editor{" "}
          </h3>{" "}
          <canvas
            ref={curveCanvasRef}
            width={300}
            height={300}
            onClick={handleCurveCanvasClick}
            style={{
              border: "1px solid #444",
              borderRadius: "4px",
              cursor: "crosshair",
              display: "block",
              marginBottom: "12px",
            }}
          />{" "}
          <div style={{ display: "flex", gap: "8px" }}>
            {" "}
            <button
              onClick={generateLinearCurve}
              style={{
                padding: "6px 12px",
                backgroundColor: "transparent",
                border: "1px solid #444",
                color: "#aaa",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "#c8a97e";
                (e.currentTarget as HTMLButtonElement).style.color = "#c8a97e";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "#444";
                (e.currentTarget as HTMLButtonElement).style.color = "#aaa";
              }}
            >
              {" "}
              Linear{" "}
            </button>{" "}
            <button
              onClick={generateSCurve}
              style={{
                padding: "6px 12px",
                backgroundColor: "transparent",
                border: "1px solid #444",
                color: "#aaa",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "#c8a97e";
                (e.currentTarget as HTMLButtonElement).style.color = "#c8a97e";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "#444";
                (e.currentTarget as HTMLButtonElement).style.color = "#aaa";
              }}
            >
              {" "}
              S-Curve{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
        <div style={{ marginBottom: "20px" }}>
          {" "}
          <h3
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "600",
              marginBottom: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {" "}
            Preview{" "}
          </h3>{" "}
          <canvas
            ref={previewCanvasRef}
            style={{
              width: "100%",
              maxHeight: "200px",
              border: "1px solid #444",
              borderRadius: "4px",
              backgroundColor: "#0a0a0a",
            }}
          />{" "}
        </div>{" "}
        <div
          style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}
        >
          {" "}
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              backgroundColor: "transparent",
              border: "1px solid #444",
              color: "#ccc",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "#c8a97e";
              (e.currentTarget as HTMLButtonElement).style.color = "#c8a97e";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#444";
              (e.currentTarget as HTMLButtonElement).style.color = "#ccc";
            }}
          >
            {" "}
            Cancel{" "}
          </button>{" "}
          <button
            onClick={() => onApply(curve)}
            style={{
              padding: "8px 16px",
              backgroundColor: "rgba(200, 169, 126, 0.1)",
              border: "1px solid #c8a97e",
              color: "#c8a97e",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(200, 169, 126, 0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "rgba(200, 169, 126, 0.1)";
            }}
          >
            {" "}
            Apply{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
