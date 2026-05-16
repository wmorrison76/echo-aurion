import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
interface HueSaturationDialogProps {
  canvas: HTMLCanvasElement | null;
  onApply: (hue: number, saturation: number, lightness: number) => void;
  onCancel: () => void;
}
export default function HueSaturationDialog({
  canvas,
  onApply,
  onCancel,
}: HueSaturationDialogProps) {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [lightness, setLightness] = useState(0);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  };
  const hslToRgb = (h: number, s: number, l: number) => {
    h = h % 360;
    s = s / 100;
    l = l / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else {
      r = c;
      g = 0;
      b = x;
    }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255),
    };
  };
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
      const hsl = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      hsl.h = (hsl.h + hue) % 360;
      hsl.s = Math.max(0, Math.min(100, hsl.s + saturation));
      hsl.l = Math.max(0, Math.min(100, hsl.l + lightness));
      const newRgb = hslToRgb(hsl.h, hsl.s, hsl.l);
      data[i] = newRgb.r;
      data[i + 1] = newRgb.g;
      data[i + 2] = newRgb.b;
    }
    const previewImageData = new ImageData(data, canvas.width, canvas.height);
    ctx.putImageData(previewImageData, 0, 0);
  }, [canvas, hue, saturation, lightness]);
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
            Hue/Saturation
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
                Hue
              </label>{" "}
              <span
                style={{
                  color: "#c8a97e",
                  fontSize: "11px",
                  fontWeight: "600",
                }}
              >
                {hue}°
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="-180"
              max="180"
              value={hue}
              onChange={(e) => setHue(Number(e.target.value))}
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
                Saturation
              </label>{" "}
              <span
                style={{
                  color: "#c8a97e",
                  fontSize: "11px",
                  fontWeight: "600",
                }}
              >
                {saturation}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="-100"
              max="100"
              value={saturation}
              onChange={(e) => setSaturation(Number(e.target.value))}
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
                Lightness
              </label>{" "}
              <span
                style={{
                  color: "#c8a97e",
                  fontSize: "11px",
                  fontWeight: "600",
                }}
              >
                {lightness}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="-100"
              max="100"
              value={lightness}
              onChange={(e) => setLightness(Number(e.target.value))}
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
            onClick={() => onApply(hue, saturation, lightness)}
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
