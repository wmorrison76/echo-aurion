import React, { useState } from "react";
import { Copy, RotateCcw, Zap, Layers } from "lucide-react";

interface BatchOperation {
  type: "duplicate" | "rotate" | "scale" | "opacity" | "blend";
  count?: number;
  angle?: number;
  scale?: number;
  opacity?: number;
  blendMode?: string;
}

interface BatchOperationsPanelProps {
  onApplyOperation: (operation: BatchOperation) => void;
}

export default function BatchOperationsPanel({
  onApplyOperation,
}: BatchOperationsPanelProps) {
  const [selectedOperation, setSelectedOperation] = useState<BatchOperation["type"]>("duplicate");
  const [duplicateCount, setDuplicateCount] = useState(3);
  const [rotateAngle, setRotateAngle] = useState(45);
  const [scalePercent, setScalePercent] = useState(80);
  const [opacityValue, setOpacityValue] = useState(75);
  const [blendMode, setBlendMode] = useState("multiply");

  const handleApplyOperation = () => {
    let operation: BatchOperation;

    switch (selectedOperation) {
      case "duplicate":
        operation = { type: "duplicate", count: duplicateCount };
        break;
      case "rotate":
        operation = { type: "rotate", angle: rotateAngle };
        break;
      case "scale":
        operation = { type: "scale", scale: scalePercent / 100 };
        break;
      case "opacity":
        operation = { type: "opacity", opacity: opacityValue / 100 };
        break;
      case "blend":
        operation = { type: "blend", blendMode };
        break;
      default:
        return;
    }

    onApplyOperation(operation);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        backgroundColor: "#0a0a0a",
        borderRadius: "8px",
        border: "1px solid #333",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <Layers size={16} color="#c8a97e" />
        <h4 style={{ color: "#c8a97e", fontSize: "12px", fontWeight: "bold", margin: 0 }}>
          Batch Operations
        </h4>
      </div>

      {/* Operation Type Selection */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px" }}>
        {[
          { id: "duplicate", label: "Duplicate", icon: "📋" },
          { id: "rotate", label: "Rotate", icon: "🔄" },
          { id: "scale", label: "Scale", icon: "📏" },
          { id: "opacity", label: "Opacity", icon: "👁️" },
          { id: "blend", label: "Blend", icon: "🎨" },
        ].map((op) => (
          <button
            key={op.id}
            onClick={() => setSelectedOperation(op.id as BatchOperation["type"])}
            style={{
              padding: "8px",
              backgroundColor:
                selectedOperation === op.id ? "rgba(0, 240, 255, 0.2)" : "#0b0f1a",
              border: `1px solid ${selectedOperation === op.id ? "#c8a97e" : "#444"}`,
              color: selectedOperation === op.id ? "#c8a97e" : "#aaa",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
            }}
          >
            {op.icon} {op.label}
          </button>
        ))}
      </div>

      {/* Operation Parameters */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px", backgroundColor: "#0b0f1a", borderRadius: "4px" }}>
        {selectedOperation === "duplicate" && (
          <>
            <label style={{ color: "#666", fontSize: "11px" }}>
              Duplicate Count: {duplicateCount}
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={duplicateCount}
              onChange={(e) => setDuplicateCount(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: "10px", color: "#666" }}>
              Create {duplicateCount} copies of selected layer(s)
            </div>
          </>
        )}

        {selectedOperation === "rotate" && (
          <>
            <label style={{ color: "#666", fontSize: "11px" }}>
              Rotation: {rotateAngle}°
            </label>
            <input
              type="range"
              min="0"
              max="360"
              value={rotateAngle}
              onChange={(e) => setRotateAngle(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: "10px", color: "#666" }}>
              Rotate all layers by {rotateAngle} degrees
            </div>
          </>
        )}

        {selectedOperation === "scale" && (
          <>
            <label style={{ color: "#666", fontSize: "11px" }}>
              Scale: {scalePercent}%
            </label>
            <input
              type="range"
              min="10"
              max="200"
              value={scalePercent}
              onChange={(e) => setScalePercent(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: "10px", color: "#666" }}>
              Resize all layers to {scalePercent}% of original size
            </div>
          </>
        )}

        {selectedOperation === "opacity" && (
          <>
            <label style={{ color: "#666", fontSize: "11px" }}>
              Opacity: {opacityValue}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={opacityValue}
              onChange={(e) => setOpacityValue(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: "10px", color: "#666" }}>
              Set opacity of all layers to {opacityValue}%
            </div>
          </>
        )}

        {selectedOperation === "blend" && (
          <>
            <label style={{ color: "#666", fontSize: "11px" }}>Blend Mode</label>
            <select
              value={blendMode}
              onChange={(e) => setBlendMode(e.target.value)}
              style={{
                width: "100%",
                padding: "6px",
                backgroundColor: "#0a0a0a",
                border: "1px solid #444",
                borderRadius: "4px",
                color: "#aaa",
                fontSize: "11px",
              }}
            >
              <option value="multiply">Multiply</option>
              <option value="screen">Screen</option>
              <option value="overlay">Overlay</option>
              <option value="soft-light">Soft Light</option>
              <option value="hard-light">Hard Light</option>
              <option value="color-dodge">Color Dodge</option>
              <option value="color-burn">Color Burn</option>
            </select>
            <div style={{ fontSize: "10px", color: "#666" }}>
              Apply {blendMode} blend mode to all layers
            </div>
          </>
        )}
      </div>

      {/* Apply Button */}
      <button
        onClick={handleApplyOperation}
        style={{
          padding: "10px",
          backgroundColor: "rgba(0, 240, 255, 0.2)",
          border: "1px solid #c8a97e",
          color: "#c8a97e",
          borderRadius: "4px",
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
        }}
      >
        <Zap size={14} />
        Apply Operation
      </button>

      {/* Info */}
      <div style={{ fontSize: "10px", color: "#666", padding: "8px", borderTop: "1px solid #333" }}>
        💡 Batch operations apply to all visible layers
      </div>
    </div>
  );
}
