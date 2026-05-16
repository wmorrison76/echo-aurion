import { useState } from "react";
import { Lock } from "lucide-react";

interface ImageSizeDialogProps {
  currentWidth: number;
  currentHeight: number;
  onApply: (width: number, height: number) => void;
  onCancel: () => void;
}

export default function ImageSizeDialog({
  currentWidth,
  currentHeight,
  onApply,
  onCancel,
}: ImageSizeDialogProps) {
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);
  const [lockAspectRatio, setLockAspectRatio] = useState(true);
  const [unit, setUnit] = useState<"px" | "%">("px");
  const [interpolation, setInterpolation] = useState<
    "nearest" | "linear" | "cubic"
  >("linear");

  const aspectRatio = currentWidth / currentHeight;

  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);
    if (lockAspectRatio) {
      setHeight(Math.round(newWidth / aspectRatio));
    }
  };

  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight);
    if (lockAspectRatio) {
      setWidth(Math.round(newHeight * aspectRatio));
    }
  };

  const handleApply = () => {
    if (width > 0 && height > 0) {
      onApply(width, height);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "20px",
        backgroundColor: "#0a0a0a",
        borderRadius: "8px",
        border: "1px solid #333",
        minWidth: "320px",
      }}
    >
      <h3
        style={{
          color: "#c8a97e",
          fontSize: "14px",
          fontWeight: "bold",
          margin: 0,
        }}
      >
        Image Size
      </h3>

      {/* Current Size Info */}
      <div
        style={{
          padding: "8px",
          backgroundColor: "#0b0f1a",
          borderRadius: "4px",
          fontSize: "11px",
          color: "#666",
        }}
      >
        Current: {currentWidth}x{currentHeight}px
      </div>

      {/* Width & Height */}
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              color: "#c8a97e",
              fontSize: "10px",
              fontWeight: "bold",
              marginBottom: "4px",
            }}
          >
            Width
          </label>
          <input
            type="number"
            value={width}
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "6px",
              backgroundColor: "#0b0f1a",
              border: "1px solid #333",
              borderRadius: "4px",
              color: "#c8a97e",
              fontSize: "12px",
            }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              color: "#c8a97e",
              fontSize: "10px",
              fontWeight: "bold",
              marginBottom: "4px",
            }}
          >
            Height
          </label>
          <input
            type="number"
            value={height}
            onChange={(e) => handleHeightChange(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "6px",
              backgroundColor: "#0b0f1a",
              border: "1px solid #333",
              borderRadius: "4px",
              color: "#c8a97e",
              fontSize: "12px",
            }}
          />
        </div>

        <button
          onClick={() => setLockAspectRatio(!lockAspectRatio)}
          style={{
            padding: "6px 8px",
            backgroundColor: lockAspectRatio
              ? "rgba(0, 240, 255, 0.2)"
              : "#0b0f1a",
            border: `1px solid ${lockAspectRatio ? "#c8a97e" : "#333"}`,
            borderRadius: "4px",
            cursor: "pointer",
            color: lockAspectRatio ? "#c8a97e" : "#666",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: "32px",
            minHeight: "32px",
            title: "Lock aspect ratio",
          }}
        >
          <Lock size={14} />
        </button>
      </div>

      {/* Unit Selection */}
      <div>
        <label
          style={{
            display: "block",
            color: "#c8a97e",
            fontSize: "10px",
            fontWeight: "bold",
            marginBottom: "4px",
          }}
        >
          Unit
        </label>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as "px" | "%")}
          style={{
            width: "100%",
            padding: "6px",
            backgroundColor: "#0b0f1a",
            border: "1px solid #333",
            borderRadius: "4px",
            color: "#c8a97e",
            fontSize: "12px",
          }}
        >
          <option value="px">Pixels (px)</option>
          <option value="%">Percent (%)</option>
        </select>
      </div>

      {/* Interpolation Method */}
      <div>
        <label
          style={{
            display: "block",
            color: "#c8a97e",
            fontSize: "10px",
            fontWeight: "bold",
            marginBottom: "4px",
          }}
        >
          Interpolation
        </label>
        <select
          value={interpolation}
          onChange={(e) =>
            setInterpolation(e.target.value as "nearest" | "linear" | "cubic")
          }
          style={{
            width: "100%",
            padding: "6px",
            backgroundColor: "#0b0f1a",
            border: "1px solid #333",
            borderRadius: "4px",
            color: "#c8a97e",
            fontSize: "12px",
          }}
        >
          <option value="nearest">Nearest Neighbor</option>
          <option value="linear">Linear</option>
          <option value="cubic">Cubic</option>
        </select>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={handleApply}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: "#c8a97e",
            color: "#000",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
          }}
        >
          Apply
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: "10px",
            backgroundColor: "#0b0f1a",
            color: "#666",
            border: "1px solid #333",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
