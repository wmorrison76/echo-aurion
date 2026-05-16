import React, { useState, useEffect } from "react";
import { RotateCw, RotateCcw } from "lucide-react";

interface CakeRotationControlProps {
  rotationAngle: number;
  onRotationChange: (angle: number) => void;
  isSlicing?: boolean;
  onSliceToggle?: () => void;
}

export default function CakeRotationControl({
  rotationAngle,
  onRotationChange,
  isSlicing = false,
  onSliceToggle,
}: CakeRotationControlProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleRotationChange = (newAngle: number) => {
    const normalizedAngle = ((newAngle % 360) + 360) % 360;
    onRotationChange(normalizedAngle);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowLeft") {
      handleRotationChange(rotationAngle - 5);
    } else if (e.key === "ArrowRight") {
      handleRotationChange(rotationAngle + 5);
    }
  };

  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "#1a1a1a",
        border: "1px solid #444",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <RotateCw size={16} style={{ color: "#00f0ff" }} />
        <span style={{ color: "#00f0ff", fontSize: "13px", fontWeight: "600" }}>
          Rotate Cake
        </span>
      </div>

      {/* Rotation Display */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <span style={{ color: "#666", fontSize: "12px" }}>Angle</span>
        <span style={{ color: "#00f0ff", fontSize: "14px", fontWeight: "600" }}>
          {rotationAngle}°
        </span>
      </div>

      {/* Rotation Slider */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <button
          onClick={() => handleRotationChange(rotationAngle - 15)}
          title="Rotate left"
          style={{
            padding: "6px 10px",
            backgroundColor: "rgba(0, 240, 255, 0.1)",
            border: "1px solid #444",
            color: "#00f0ff",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <RotateCcw size={14} />
        </button>

        <input
          type="range"
          min="0"
          max="359"
          value={rotationAngle}
          onChange={(e) => handleRotationChange(Number(e.target.value))}
          onKeyDown={handleKeyDown}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          title="Drag to rotate cake (arrow keys: ← →)"
          style={{
            flex: 1,
            cursor: "pointer",
            height: "6px",
            accentColor: "#00f0ff",
          }}
        />

        <button
          onClick={() => handleRotationChange(rotationAngle + 15)}
          title="Rotate right"
          style={{
            padding: "6px 10px",
            backgroundColor: "rgba(0, 240, 255, 0.1)",
            border: "1px solid #444",
            color: "#00f0ff",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
        >
          <RotateCw size={14} />
        </button>
      </div>

      {/* Quick rotation buttons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "6px",
        }}
      >
        {[0, 90, 180, 270].map((angle) => (
          <button
            key={angle}
            onClick={() => handleRotationChange(angle)}
            style={{
              padding: "6px",
              backgroundColor:
                rotationAngle === angle
                  ? "rgba(0, 240, 255, 0.2)"
                  : "rgba(0, 240, 255, 0.1)",
              border: `1px solid ${
                rotationAngle === angle ? "#00f0ff" : "#444"
              }`,
              color: rotationAngle === angle ? "#00f0ff" : "#666",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
          >
            {angle}°
          </button>
        ))}
      </div>

      {/* Reset button */}
      <button
        onClick={() => handleRotationChange(0)}
        style={{
          padding: "8px",
          backgroundColor: "transparent",
          border: "1px solid #444",
          color: "#666",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "11px",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#00f0ff";
          (e.currentTarget as HTMLButtonElement).style.color = "#00f0ff";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "#444";
          (e.currentTarget as HTMLButtonElement).style.color = "#666";
        }}
      >
        Reset to Default (0°)
      </button>

      {/* Slice toggle */}
      {onSliceToggle && (
        <>
          <div style={{ height: "1px", backgroundColor: "#333" }} />
          <button
            onClick={onSliceToggle}
            style={{
              padding: "8px",
              backgroundColor: isSlicing
                ? "rgba(0, 240, 255, 0.2)"
                : "rgba(0, 240, 255, 0.1)",
              border: `1px solid ${isSlicing ? "#00f0ff" : "#444"}`,
              color: isSlicing ? "#00f0ff" : "#666",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
          >
            {isSlicing ? "✓ Slice Mode Active" : "Cut a Slice"}
          </button>
          <div
            style={{
              color: "#666",
              fontSize: "10px",
              textAlign: "center",
            }}
          >
            Rotate to align slice line
          </div>
        </>
      )}
    </div>
  );
}
