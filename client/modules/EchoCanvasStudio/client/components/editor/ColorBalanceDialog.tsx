import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
interface ColorBalanceDialogProps {
  canvas: HTMLCanvasElement | null;
  onApply: (
    cyan_red: number,
    magenta_green: number,
    yellow_blue: number,
    tonalRange: string,
  ) => void;
  onCancel: () => void;
}
export default function ColorBalanceDialog({
  canvas,
  onApply,
  onCancel,
}: ColorBalanceDialogProps) {
  const [cyan_red, setCyan_Red] = useState(0);
  const [magenta_green, setMagenta_Green] = useState(0);
  const [yellow_blue, setYellow_Blue] = useState(0);
  const [tonalRange, setTonalRange] = useState("midtones");
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const getToneFactor = (luminance: number): number => {
    switch (tonalRange) {
      case "shadows":
        return Math.max(0, 1 - luminance * 2);
      case "highlights":
        return Math.max(0, (luminance - 0.5) * 2);
      case "midtones":
      default:
        return 1 - Math.abs(luminance - 0.5) * 2;
    }
  };
  const getIntensityFactor = (): number => {
    switch (tonalRange) {
      case "shadows":
        return 1.5;
      case "highlights":
        return 1.5;
      case "midtones":
      default:
        return 1.0;
    }
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
    const intensityFactor = getIntensityFactor();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      const toneFactor = getToneFactor(luminance);
      const factor = intensityFactor * toneFactor;
      let newR = r + (cyan_red / 100) * factor;
      let newG = g + (magenta_green / 100) * factor;
      let newB = b + (yellow_blue / 100) * factor;
      data[i] = Math.max(0, Math.min(255, newR * 255));
      data[i + 1] = Math.max(0, Math.min(255, newG * 255));
      data[i + 2] = Math.max(0, Math.min(255, newB * 255));
    }
    const previewImageData = new ImageData(data, canvas.width, canvas.height);
    ctx.putImageData(previewImageData, 0, 0);
  }, [canvas, cyan_red, magenta_green, yellow_blue, tonalRange]);
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
            Color Balance
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
            <label
              style={{
                color: "#c8a97e",
                fontSize: "12px",
                fontWeight: "600",
                marginBottom: "8px",
                display: "block",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {" "}
              Tonal Range{" "}
            </label>{" "}
            <div style={{ display: "flex", gap: "8px" }}>
              {" "}
              {["shadows", "midtones", "highlights"].map((range) => (
                <button
                  key={range}
                  onClick={() => setTonalRange(range)}
                  style={{
                    padding: "6px 12px",
                    backgroundColor:
                      tonalRange === range
                        ? "rgba(200, 169, 126, 0.2)"
                        : "transparent",
                    border: `1px solid ${tonalRange === range ? "#c8a97e" : "#444"}`,
                    color: tonalRange === range ? "#c8a97e" : "#aaa",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "500",
                    textTransform: "capitalize",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (tonalRange !== range) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "#c8a97e";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#c8a97e";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (tonalRange !== range) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "#444";
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#aaa";
                    }
                  }}
                >
                  {" "}
                  {range.charAt(0).toUpperCase() + range.slice(1)}{" "}
                </button>
              ))}{" "}
            </div>{" "}
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
                Cyan ← → Red
              </label>{" "}
              <span
                style={{
                  color: "#c8a97e",
                  fontSize: "11px",
                  fontWeight: "600",
                }}
              >
                {cyan_red}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="-100"
              max="100"
              value={cyan_red}
              onChange={(e) => setCyan_Red(Number(e.target.value))}
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
                Magenta ← → Green
              </label>{" "}
              <span
                style={{
                  color: "#c8a97e",
                  fontSize: "11px",
                  fontWeight: "600",
                }}
              >
                {magenta_green}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="-100"
              max="100"
              value={magenta_green}
              onChange={(e) => setMagenta_Green(Number(e.target.value))}
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
                Yellow ← → Blue
              </label>{" "}
              <span
                style={{
                  color: "#c8a97e",
                  fontSize: "11px",
                  fontWeight: "600",
                }}
              >
                {yellow_blue}
              </span>{" "}
            </div>{" "}
            <input
              type="range"
              min="-100"
              max="100"
              value={yellow_blue}
              onChange={(e) => setYellow_Blue(Number(e.target.value))}
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
            onClick={() =>
              onApply(cyan_red, magenta_green, yellow_blue, tonalRange)
            }
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
