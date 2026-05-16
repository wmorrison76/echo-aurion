import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
interface BrightnessContrastDialogProps {
  canvas: HTMLCanvasElement | null;
  onApply: (brightness: number, contrast: number) => void;
  onCancel: () => void;
}
export default function BrightnessContrastDialog({
  canvas,
  onApply,
  onCancel,
}: BrightnessContrastDialogProps) {
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
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
    const brightnessAmount = brightness / 100;
    const contrastAmount = (contrast + 100) / 100;
    for (let i = 0; i < data.length; i += 4) {
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;
      r = (r - 0.5) * contrastAmount + 0.5 + brightnessAmount;
      g = (g - 0.5) * contrastAmount + 0.5 + brightnessAmount;
      b = (b - 0.5) * contrastAmount + 0.5 + brightnessAmount;
      data[i] = Math.max(0, Math.min(255, r * 255));
      data[i + 1] = Math.max(0, Math.min(255, g * 255));
      data[i + 2] = Math.max(0, Math.min(255, b * 255));
    }
    const previewImageData = new ImageData(data, canvas.width, canvas.height);
    ctx.putImageData(previewImageData, 0, 0);
  }, [canvas, brightness, contrast]);
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
          maxWidth: "500px",
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
            Brightness/Contrast
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
        <div style={{ marginBottom: "24px" }}>
          {" "}
          <div style={{ marginBottom: "16px" }}>
            {" "}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              {" "}
              <label style={{ color: "#aaa", fontSize: "11px" }}>
                Brightness
              </label>{" "}
              <span
                style={{
                  color: "#c8a97e",
                  fontSize: "11px",
                  fontWeight: "600",
                }}
              >
                {brightness}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="-100"
              max="100"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              style={{ width: "100%" }}
            />{" "}
          </div>{" "}
          <div style={{ marginBottom: "16px" }}>
            {" "}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "6px",
              }}
            >
              {" "}
              <label style={{ color: "#aaa", fontSize: "11px" }}>
                Contrast
              </label>{" "}
              <span
                style={{
                  color: "#c8a97e",
                  fontSize: "11px",
                  fontWeight: "600",
                }}
              >
                {contrast}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="-100"
              max="100"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              style={{ width: "100%" }}
            />{" "}
          </div>{" "}
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
            onClick={() => onApply(brightness, contrast)}
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
