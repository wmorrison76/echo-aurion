import React from "react";
import { Paintbrush } from "lucide-react";

interface BrushSizeControlProps {
  brushSize: number;
  brushOpacity: number;
  onBrushSizeChange: (size: number) => void;
  onBrushOpacityChange: (opacity: number) => void;
  selectedTool: string;
  eraserSoftness?: number;
  useRoundEraser?: boolean;
  onEraserSoftnessChange?: (softness: number) => void;
  onUseRoundEraserChange?: (useRound: boolean) => void;
}

export default function BrushSizeControl({
  brushSize,
  brushOpacity,
  onBrushSizeChange,
  onBrushOpacityChange,
  selectedTool,
  eraserSoftness = 3,
  useRoundEraser = true,
  onEraserSoftnessChange,
  onUseRoundEraserChange,
}: BrushSizeControlProps) {
  const brushLikeTool = [
    "brush",
    "pencil",
    "eraser",
    "healing-brush",
    "clone-stamp",
    "blur-sharpen",
    "smudge",
  ].includes(selectedTool);

  if (!brushLikeTool) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "0 12px",
      }}
    >
      <Paintbrush size={14} style={{ color: "#c8a97e" }} />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          minWidth: "120px",
        }}
      >
        <label
          style={{
            color: "#666",
            fontSize: "11px",
            whiteSpace: "nowrap",
            minWidth: "40px",
          }}
        >
          Size:
        </label>
        <input
          type="range"
          min="1"
          max="100"
          value={brushSize}
          onChange={(e) => onBrushSizeChange(Number(e.target.value))}
          title={`Brush Size: ${brushSize}px`}
          style={{
            flex: 1,
            cursor: "pointer",
            height: "4px",
          }}
        />
        <span
          style={{
            color: "#c8a97e",
            fontSize: "11px",
            fontWeight: "600",
            minWidth: "25px",
            textAlign: "right",
          }}
        >
          {brushSize}
        </span>
      </div>

      <div style={{ width: "1px", height: "20px", backgroundColor: "#444" }} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          minWidth: "100px",
        }}
      >
        <label
          style={{
            color: "#666",
            fontSize: "11px",
            whiteSpace: "nowrap",
          }}
        >
          Op:
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={brushOpacity}
          onChange={(e) => onBrushOpacityChange(Number(e.target.value))}
          title={`Opacity: ${brushOpacity}%`}
          style={{
            flex: 1,
            cursor: "pointer",
            height: "4px",
          }}
        />
        <span
          style={{
            color: "#c8a97e",
            fontSize: "11px",
            fontWeight: "600",
            minWidth: "25px",
            textAlign: "right",
          }}
        >
          {brushOpacity}%
        </span>
      </div>

      {selectedTool === "eraser" && (
        <>
          <div style={{ width: "1px", height: "20px", backgroundColor: "#444" }} />

          <button
            onClick={() => onUseRoundEraserChange?.(!useRoundEraser)}
            title={useRoundEraser ? "Click for square eraser" : "Click for round eraser"}
            style={{
              backgroundColor: useRoundEraser ? "#c8a97e" : "#333",
              border: "1px solid #c8a97e",
              color: useRoundEraser ? "#000" : "#c8a97e",
              padding: "4px 8px",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "bold",
              minWidth: "40px",
            }}
          >
            {useRoundEraser ? "●" : "■"}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              minWidth: "120px",
            }}
          >
            <label
              style={{
                color: "#666",
                fontSize: "11px",
                whiteSpace: "nowrap",
                minWidth: "50px",
              }}
            >
              Softness:
            </label>
            <input
              type="range"
              min="0"
              max="5"
              value={eraserSoftness}
              onChange={(e) => onEraserSoftnessChange?.(Number(e.target.value))}
              title={`Eraser Softness: ${eraserSoftness}`}
              style={{
                flex: 1,
                cursor: "pointer",
                height: "4px",
              }}
            />
            <span
              style={{
                color: "#c8a97e",
                fontSize: "11px",
                fontWeight: "600",
                minWidth: "20px",
                textAlign: "right",
              }}
            >
              {eraserSoftness}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
