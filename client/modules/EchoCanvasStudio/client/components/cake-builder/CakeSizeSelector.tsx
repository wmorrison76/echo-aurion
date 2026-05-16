import React, { useMemo } from "react";

interface SizeOption {
  size: string;
  diameter: number;
  servings: number;
}

interface CakeSizeSelectorProps {
  selectedSize?: string;
  selectedShape?: "round" | "square" | "sheet";
  onSizeChange: (size: string, shape: "round" | "square" | "sheet") => void;
  availableSizes?: string[];
  showPortions?: boolean;
}

export default function CakeSizeSelector({
  selectedSize = '8"',
  selectedShape = "round",
  onSizeChange,
  availableSizes = ['6"', '8"', '10"', '12"', '14"', '16"', '18"', '20"'],
  showPortions = true,
}: CakeSizeSelectorProps) {
  // Calculate portions based on cake size formula: 2 sq inches per serving
  // Round: π × r² ÷ 2
  // Square: 1.25x multiplier on round
  // Sheet: preset sizes

  const calculateServings = (
    diameter: number,
    shape: "round" | "square" | "sheet",
  ): number => {
    if (shape === "round") {
      const r = diameter / 2;
      return Math.max(1, Math.round((Math.PI * r * r) / 2));
    }

    if (shape === "square") {
      // Square cakes yield ~25% more servings than round of same diameter
      const r = diameter / 2;
      return Math.max(1, Math.round(((Math.PI * r * r) / 2) * 1.25));
    }

    // Sheet cakes - preset sizes
    const sheetSizes: { [key: string]: number } = {
      "1/4": 12,
      "1/2": 24,
      full: 48,
    };
    return sheetSizes[diameter.toString()] || 24;
  };

  const sizeOptions: SizeOption[] = useMemo(() => {
    if (selectedShape === "sheet") {
      return [
        { size: "1/4 Sheet", diameter: 1, servings: 12 },
        { size: "1/2 Sheet", diameter: 2, servings: 24 },
        { size: "Full Sheet", diameter: 3, servings: 48 },
      ];
    }

    return availableSizes.map((size) => {
      const diameter = parseInt(size);
      const servings = calculateServings(diameter, selectedShape);
      return { size, diameter, servings };
    });
  }, [selectedShape, availableSizes]);

  const currentSize = sizeOptions.find((s) => s.size === selectedSize);

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
      {/* Shape Selector */}
      <div>
        <label
          style={{
            color: "#666",
            fontSize: "12px",
            display: "block",
            marginBottom: "6px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Shape
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "6px",
          }}
        >
          {["round", "square", "sheet"].map((shape) => (
            <button
              key={shape}
              onClick={() => {
                const defaultSize =
                  shape === "sheet"
                    ? "1/4 Sheet"
                    : shape === "square"
                      ? '10"'
                      : '8"';
                onSizeChange(
                  defaultSize,
                  shape as "round" | "square" | "sheet",
                );
              }}
              style={{
                padding: "8px",
                backgroundColor:
                  selectedShape === shape
                    ? "rgba(0, 240, 255, 0.2)"
                    : "rgba(0, 240, 255, 0.1)",
                border: `1px solid ${selectedShape === shape ? "#00f0ff" : "#444"}`,
                color: selectedShape === shape ? "#00f0ff" : "#666",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "600",
                textTransform: "capitalize",
                transition: "all 0.2s",
              }}
            >
              {shape}
            </button>
          ))}
        </div>
      </div>

      {/* Size Selector */}
      <div>
        <label
          style={{
            color: "#666",
            fontSize: "12px",
            display: "block",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Size{" "}
          {showPortions && currentSize && `(${currentSize.servings} servings)`}
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "6px",
          }}
        >
          {sizeOptions.map((option) => (
            <button
              key={option.size}
              onClick={() => onSizeChange(option.size, selectedShape)}
              title={
                showPortions
                  ? `${option.size} - Serves ${option.servings} people`
                  : option.size
              }
              style={{
                padding: "10px",
                backgroundColor:
                  selectedSize === option.size
                    ? "rgba(0, 240, 255, 0.2)"
                    : "rgba(0, 240, 255, 0.1)",
                border: `1px solid ${selectedSize === option.size ? "#00f0ff" : "#444"}`,
                color: selectedSize === option.size ? "#00f0ff" : "#666",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: selectedSize === option.size ? "600" : "400",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
                minHeight: "36px",
              }}
            >
              <div>{option.size}</div>
              {showPortions && (
                <div
                  style={{
                    fontSize: "9px",
                    color: "#666",
                    marginTop: "2px",
                  }}
                >
                  {option.servings}⚑
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Current Selection Info */}
      {currentSize && (
        <div
          style={{
            padding: "8px 12px",
            backgroundColor: "rgba(0, 240, 255, 0.05)",
            border: "1px solid #333",
            borderRadius: "4px",
            color: "#aaa",
            fontSize: "11px",
          }}
        >
          <div style={{ marginBottom: "4px" }}>
            <strong style={{ color: "#00f0ff" }}>Current Selection:</strong>{" "}
            {selectedShape} {currentSize.size}
          </div>
          <div>
            <strong style={{ color: "#00f0ff" }}>Servings:</strong>{" "}
            {currentSize.servings} people
          </div>
        </div>
      )}

      {/* Info */}
      <div
        style={{
          fontSize: "10px",
          color: "#666",
          lineHeight: "1.4",
        }}
      >
        <div>
          ℹ️ <strong>Round:</strong> π × r² ÷ 2
        </div>
        <div>
          <strong>Square:</strong> 25% more than round of same size
        </div>
        <div>
          <strong>Sheet:</strong> 12, 24, or 48 servings
        </div>
      </div>
    </div>
  );
}
