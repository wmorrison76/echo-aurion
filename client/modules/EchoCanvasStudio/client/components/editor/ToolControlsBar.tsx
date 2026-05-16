import React from "react";

interface ToolControlsBarProps {
  selectedTool: string;
  brushSize: number;
  brushOpacity: number;
  vectorStrokeWidth?: number;
  onBrushSizeChange: (size: number) => void;
  onBrushOpacityChange: (opacity: number) => void;
  onVectorStrokeWidthChange?: (width: number) => void;
}

export default function ToolControlsBar({
  selectedTool,
  brushSize,
  brushOpacity,
  vectorStrokeWidth = 2,
  onBrushSizeChange,
  onBrushOpacityChange,
  onVectorStrokeWidthChange,
}: ToolControlsBarProps) {
  const isDrawingTool =
    selectedTool === "brush" ||
    selectedTool === "pencil" ||
    selectedTool === "eraser" ||
    selectedTool === "pen";
  const isVectorTool =
    selectedTool === "pen" ||
    selectedTool === "rectangle" ||
    selectedTool === "circle" ||
    selectedTool === "polygon";

  if (!isDrawingTool && !isVectorTool) return null;

  const getToolLabel = () => {
    switch (selectedTool) {
      case "brush":
        return "Brush";
      case "pencil":
        return "Pencil";
      case "eraser":
        return "Eraser";
      case "pen":
        return "Pen";
      case "rectangle":
        return "Rectangle";
      case "circle":
        return "Circle";
      case "polygon":
        return "Polygon";
      default:
        return "Tool";
    }
  };

  const sizeValue = isVectorTool ? vectorStrokeWidth : brushSize;
  const sizeMax = isVectorTool ? 50 : 100;
  const onSizeChange = isVectorTool
    ? onVectorStrokeWidthChange || (() => {})
    : onBrushSizeChange;

  return (
    <div
      style={{
        padding: "10px 12px",
        backgroundColor: "rgba(200, 169, 126, 0.05)",
        borderBottom: "1px solid #333",
        borderTop: "1px solid #333",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexWrap: "nowrap",
      }}
    >
      <span
        style={{
          color: "#c8a97e",
          fontSize: "10px",
          fontWeight: "600",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          flex: "0 0 auto",
        }}
      >
        {getToolLabel()}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
        <label
          style={{
            color: "#888",
            fontSize: "9px",
            whiteSpace: "nowrap",
            flex: "0 0 auto",
          }}
        >
          Size:
        </label>
        <input
          type="range"
          min="1"
          max={sizeMax}
          step={isVectorTool ? 0.5 : 1}
          value={sizeValue}
          onChange={(e) => onSizeChange(parseFloat(e.target.value))}
          style={{
            flex: 1,
            height: "4px",
            cursor: "pointer",
          }}
        />
        <span
          style={{
            color: "#c8a97e",
            fontSize: "9px",
            fontWeight: "500",
            flex: "0 0 auto",
            minWidth: "28px",
            textAlign: "right",
          }}
        >
          {isVectorTool
            ? sizeValue.toFixed(1)
            : Math.round(sizeValue)}
          {isVectorTool ? "px" : ""}
        </span>
      </div>

      {isDrawingTool && !isVectorTool && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <label
            style={{
              color: "#888",
              fontSize: "9px",
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            Opacity:
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={brushOpacity}
            onChange={(e) => onBrushOpacityChange(Number(e.target.value))}
            style={{
              width: "60px",
              height: "4px",
              cursor: "pointer",
            }}
          />
          <span
            style={{
              color: "#c8a97e",
              fontSize: "9px",
              fontWeight: "500",
              flex: "0 0 auto",
              minWidth: "24px",
              textAlign: "right",
            }}
          >
            {Math.round(brushOpacity)}%
          </span>
        </div>
      )}
    </div>
  );
}
