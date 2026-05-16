import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface CanvasSizeDialogProps {
  currentWidth: number;
  currentHeight: number;
  onApply: (
    width: number,
    height: number,
    offsetX: number,
    offsetY: number,
  ) => void;
  onCancel: () => void;
}

export default function CanvasSizeDialog({
  currentWidth,
  currentHeight,
  onApply,
  onCancel,
}: CanvasSizeDialogProps) {
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [anchor, setAnchor] = useState("center");

  const anchors = [
    { id: "top-left", label: "↖", x: 0, y: 0 },
    { id: "top-center", label: "↑", x: 0.5, y: 0 },
    { id: "top-right", label: "↗", x: 1, y: 0 },
    { id: "center-left", label: "←", x: 0, y: 0.5 },
    { id: "center", label: "◉", x: 0.5, y: 0.5 },
    { id: "center-right", label: "→", x: 1, y: 0.5 },
    { id: "bottom-left", label: "↙", x: 0, y: 1 },
    { id: "bottom-center", label: "↓", x: 0.5, y: 1 },
    { id: "bottom-right", label: "↘", x: 1, y: 1 },
  ];

  const handleAnchorSelect = (anchorId: string) => {
    setAnchor(anchorId);
    const anchorData = anchors.find((a) => a.id === anchorId);
    if (anchorData) {
      const newOffsetX = (width - currentWidth) * anchorData.x;
      const newOffsetY = (height - currentHeight) * anchorData.y;
      setOffsetX(Math.round(newOffsetX));
      setOffsetY(Math.round(newOffsetY));
    }
  };

  const handleApply = () => {
    if (width > 0 && height > 0) {
      onApply(width, height, offsetX, offsetY);
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
        minWidth: "380px",
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
        Canvas Size
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
      <div style={{ display: "flex", gap: "8px" }}>
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
            onChange={(e) => setWidth(Math.max(1, Number(e.target.value)))}
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
            onChange={(e) => setHeight(Math.max(1, Number(e.target.value)))}
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
      </div>

      {/* Anchor Selection */}
      <div>
        <label
          style={{
            display: "block",
            color: "#c8a97e",
            fontSize: "10px",
            fontWeight: "bold",
            marginBottom: "8px",
          }}
        >
          Layer Position
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "4px",
          }}
        >
          {anchors.map((a) => (
            <button
              key={a.id}
              onClick={() => handleAnchorSelect(a.id)}
              style={{
                padding: "8px",
                backgroundColor:
                  anchor === a.id ? "rgba(0, 240, 255, 0.2)" : "#0b0f1a",
                border: `1px solid ${anchor === a.id ? "#c8a97e" : "#333"}`,
                borderRadius: "4px",
                color: anchor === a.id ? "#c8a97e" : "#666",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Offset */}
      <div style={{ display: "flex", gap: "8px" }}>
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
            Offset X
          </label>
          <input
            type="number"
            value={offsetX}
            onChange={(e) => setOffsetX(Number(e.target.value))}
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
            Offset Y
          </label>
          <input
            type="number"
            value={offsetY}
            onChange={(e) => setOffsetY(Number(e.target.value))}
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
