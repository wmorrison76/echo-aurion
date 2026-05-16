import React, { useRef, useEffect, useState } from "react";

export interface FilterAdjustment {
  type: "brightness" | "contrast" | "saturation" | "hue" | "blur" | "sharpen";
  value: number;
}

interface CanvasBasedFilterPreviewProps {
  canvas: HTMLCanvasElement | null;
  isActive: boolean;
  layers?: any[];
  filterType:
    | "brightness"
    | "contrast"
    | "saturation"
    | "hue"
    | "blur"
    | "sharpen";
  onFilterApply: (adjustment: FilterAdjustment) => void;
  onCancel: () => void;
}

export default function CanvasBasedFilterPreview({
  canvas,
  isActive,
  layers = [],
  filterType,
  onFilterApply,
  onCancel,
}: CanvasBasedFilterPreviewProps) {
  const [value, setValue] = useState(100);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<ImageData | null>(null);

  if (!isActive || !canvas) return null;

  const getFilterLabel = () => {
    const labels: Record<string, string> = {
      brightness: "Brightness",
      contrast: "Contrast",
      saturation: "Saturation",
      hue: "Hue",
      blur: "Blur",
      sharpen: "Sharpen",
    };
    return labels[filterType] || "Filter";
  };

  const getValueRange = () => {
    if (filterType === "blur" || filterType === "sharpen") {
      return { min: 0, max: 100 };
    }
    if (filterType === "hue") {
      return { min: -180, max: 180 };
    }
    return { min: 0, max: 200 };
  };

  const getDefaultValue = () => {
    if (filterType === "blur" || filterType === "sharpen") {
      return 0;
    }
    return 100;
  };

  const applyFilterToCanvas = (adjustedValue: number) => {
    if (!canvas || !previewCanvasRef.current) return;

    const ctx = canvas.getContext("2d");
    const previewCtx = previewCanvasRef.current.getContext("2d");

    if (!ctx || !previewCtx) return;

    // Store original image if not already stored
    if (!originalImageRef.current) {
      originalImageRef.current = ctx.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }

    // Copy original image
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Apply filter
    switch (filterType) {
      case "brightness": {
        const factor = (adjustedValue - 100) / 100;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * (1 + factor));
          data[i + 1] = Math.min(255, data[i + 1] * (1 + factor));
          data[i + 2] = Math.min(255, data[i + 2] * (1 + factor));
        }
        break;
      }

      case "contrast": {
        const factor = adjustedValue / 100;
        const intercept = 128 * (1 - factor);
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * factor + intercept);
          data[i + 1] = Math.min(255, data[i + 1] * factor + intercept);
          data[i + 2] = Math.min(255, data[i + 2] * factor + intercept);
        }
        break;
      }

      case "saturation": {
        const factor = adjustedValue / 100;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const gray = r * 0.299 + g * 0.587 + b * 0.114;

          data[i] = Math.round(gray + (r - gray) * factor);
          data[i + 1] = Math.round(gray + (g - gray) * factor);
          data[i + 2] = Math.round(gray + (b - gray) * factor);
        }
        break;
      }

      case "hue": {
        const shift = (adjustedValue / 360) * 360;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const l = (max + min) / 2;

          let h = 0;
          if (max !== min) {
            const d = max - min;
            const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
              case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
              case g:
                h = (b - r) / d + 2;
                break;
              case b:
                h = (r - g) / d + 4;
                break;
            }
            h /= 6;
          }

          h = (h + shift / 360) % 1;
          if (h < 0) h += 1;

          const c =
            (1 - Math.abs(2 * l - 1)) * ((adjustedValue - 100) / 100 + 1);
          const x = c * (1 - Math.abs(((h * 6) % 2) - 1));

          let r2 = 0,
            g2 = 0,
            b2 = 0;

          if (h < 1 / 6) {
            r2 = c;
            g2 = x;
          } else if (h < 2 / 6) {
            r2 = x;
            g2 = c;
          } else if (h < 3 / 6) {
            g2 = c;
            b2 = x;
          } else if (h < 4 / 6) {
            g2 = x;
            b2 = c;
          } else if (h < 5 / 6) {
            r2 = x;
            b2 = c;
          } else {
            r2 = c;
            b2 = x;
          }

          const m = l - c / 2;

          data[i] = Math.round((r2 + m) * 255);
          data[i + 1] = Math.round((g2 + m) * 255);
          data[i + 2] = Math.round((b2 + m) * 255);
        }
        break;
      }

      default:
        break;
    }

    // Put modified image back
    ctx.putImageData(imageData, 0, 0);
    previewCtx.putImageData(imageData, 0, 0);
  };

  const handleValueChange = (newValue: number) => {
    setValue(newValue);
    applyFilterToCanvas(newValue);
  };

  const handleApply = () => {
    onFilterApply({
      type: filterType,
      value,
    });
  };

  const handleCancel = () => {
    if (originalImageRef.current && canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.putImageData(originalImageRef.current, 0, 0);
      }
    }
    onCancel();
  };

  const range = getValueRange();
  const defaultVal = getDefaultValue();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        backgroundColor: "rgba(0, 0, 0, 0.95)",
        border: "1px solid #c8a97e",
        borderRadius: "8px",
        padding: "16px",
        zIndex: 1001,
        minWidth: "300px",
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
        {getFilterLabel()}
      </h3>

      <div style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "8px",
            fontSize: "12px",
          }}
        >
          <span style={{ color: "#666" }}>Value</span>
          <span
            style={{
              color: "#c8a97e",
              fontWeight: "600",
            }}
          >
            {value}
          </span>
        </div>
        <input
          type="range"
          min={range.min}
          max={range.max}
          value={value}
          onChange={(e) => handleValueChange(Number(e.target.value))}
          style={{ width: "100%", cursor: "pointer" }}
        />
      </div>

      {/* Preview Canvas */}
      <div
        style={{
          marginBottom: "16px",
          border: "1px solid #444",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <canvas
          ref={previewCanvasRef}
          width={280}
          height={200}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
          }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={handleCancel}
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor: "transparent",
            border: "1px solid #444",
            color: "#ccc",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
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
          Cancel
        </button>
        <button
          onClick={handleApply}
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor: "rgba(0, 240, 255, 0.1)",
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
              "rgba(0, 240, 255, 0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(0, 240, 255, 0.1)";
          }}
        >
          Apply
        </button>
      </div>

      <div style={{ fontSize: "10px", color: "#666", marginTop: "12px" }}>
        <div>Live preview - adjust and apply</div>
      </div>
    </div>
  );
}
