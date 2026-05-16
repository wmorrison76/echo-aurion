import React, { useState } from "react";
import { X, ChevronDown } from "lucide-react";
interface FilterDefinition {
  name: string;
  label: string;
  params?: Record<
    string,
    { min: number; max: number; default: number; step?: number }
  >;
}
interface UnifiedFilterDialogProps {
  canvas: HTMLCanvasElement | null;
  onApply: (filterName: string, params: Record<string, number>) => void;
  onCancel: () => void;
}
const FILTER_CATEGORIES: Record<string, FilterDefinition[]> = {
  Blur: [
    {
      name: "gaussianBlur",
      label: "Gaussian Blur",
      params: { radius: { min: 1, max: 20, default: 5 } },
    },
    {
      name: "motionBlur",
      label: "Motion Blur",
      params: {
        distance: { min: 1, max: 50, default: 10 },
        angle: { min: 0, max: 360, default: 0 },
      },
    },
    {
      name: "radialBlur",
      label: "Radial Blur",
      params: { strength: { min: 1, max: 20, default: 5 } },
    },
    {
      name: "zoomBlur",
      label: "Zoom Blur",
      params: { strength: { min: 1, max: 20, default: 5 } },
    },
    {
      name: "bilateralFilter",
      label: "Bilateral Filter",
      params: {
        spatialRadius: { min: 1, max: 10, default: 5 },
        colorRadius: { min: 10, max: 255, default: 50 },
      },
    },
  ],
  Sharpen: [
    {
      name: "sharpen",
      label: "Sharpen",
      params: { strength: { min: 0.1, max: 5, default: 1, step: 0.1 } },
    },
    {
      name: "unsharpMask",
      label: "Unsharp Mask",
      params: {
        radius: { min: 1, max: 10, default: 5 },
        strength: { min: 0.1, max: 3, default: 1.5, step: 0.1 },
      },
    },
    {
      name: "smartSharpen",
      label: "Smart Sharpen",
      params: {
        amount: { min: 0.1, max: 3, default: 1, step: 0.1 },
        radius: { min: 1, max: 10, default: 1 },
      },
    },
    {
      name: "highPass",
      label: "High Pass",
      params: { radius: { min: 1, max: 10, default: 5 } },
    },
  ],
  Distortion: [
    {
      name: "twirl",
      label: "Twirl",
      params: {
        angle: { min: -180, max: 180, default: 45 },
        centerX: { min: 0, max: 1, default: 0.5, step: 0.1 },
        centerY: { min: 0, max: 1, default: 0.5, step: 0.1 },
      },
    },
    {
      name: "ripple",
      label: "Ripple",
      params: {
        amplitude: { min: 1, max: 50, default: 10 },
        frequency: { min: 1, max: 20, default: 5 },
      },
    },
    {
      name: "wave",
      label: "Wave",
      params: {
        amplitude: { min: 1, max: 50, default: 10 },
        frequency: { min: 1, max: 20, default: 5 },
      },
    },
    {
      name: "barrelDistortion",
      label: "Barrel Distortion",
      params: { strength: { min: 0.1, max: 2, default: 0.5, step: 0.1 } },
    },
    {
      name: "pinch",
      label: "Pinch",
      params: {
        strength: { min: 0.1, max: 1, default: 0.5, step: 0.1 },
        centerX: { min: 0, max: 1, default: 0.5, step: 0.1 },
        centerY: { min: 0, max: 1, default: 0.5, step: 0.1 },
      },
    },
  ],
  Artistic: [
    {
      name: "oilPaint",
      label: "Oil Paint",
      params: { brushSize: { min: 1, max: 10, default: 4 } },
    },
    {
      name: "watercolor",
      label: "Watercolor",
      params: { intensity: { min: 0.1, max: 1, default: 0.5, step: 0.1 } },
    },
    { name: "pencilSketch", label: "Pencil Sketch" },
    { name: "comicEffect", label: "Comic Effect" },
    {
      name: "posterize",
      label: "Posterize",
      params: { levels: { min: 2, max: 8, default: 4 } },
    },
    {
      name: "pixelate",
      label: "Pixelate",
      params: { pixelSize: { min: 2, max: 20, default: 8 } },
    },
    {
      name: "mosaic",
      label: "Mosaic",
      params: { tileSize: { min: 2, max: 20, default: 8 } },
    },
    { name: "solarize", label: "Solarize" },
  ],
  Color: [
    { name: "grayscale", label: "Grayscale" },
    { name: "sepia", label: "Sepia" },
    { name: "cyanRedShift", label: "Cyan Red Shift" },
    {
      name: "vibrance",
      label: "Vibrance",
      params: { amount: { min: 0, max: 100, default: 30 } },
    },
  ],
  "Edge Detection": [
    { name: "sobelEdgeDetection", label: "Sobel Edge Detection" },
    { name: "cannyEdgeDetection", label: "Canny Edge Detection" },
    { name: "laplacianEdgeDetection", label: "Laplacian Edge Detection" },
    { name: "prewittEdgeDetection", label: "Prewitt Edge Detection" },
    { name: "robertsEdgeDetection", label: "Roberts Edge Detection" },
  ],
  Lighting: [
    {
      name: "dodgeAndBurn",
      label: "Dodge and Burn",
      params: {
        dodge: { min: 0, max: 50, default: 0 },
        burn: { min: 0, max: 50, default: 0 },
      },
    },
    {
      name: "shadowsHighlights",
      label: "Shadows Highlights",
      params: {
        shadows: { min: -50, max: 50, default: 0 },
        highlights: { min: -50, max: 50, default: 0 },
      },
    },
    {
      name: "exposure",
      label: "Exposure",
      params: { exposure: { min: -100, max: 100, default: 0 } },
    },
  ],
  "Additional 25+": [
    { name: "crosshatch", label: "Crosshatch" },
    { name: "chalk", label: "Chalk" },
    { name: "charcoal", label: "Charcoal" },
    { name: "crayon", label: "Crayon" },
    {
      name: "vignette",
      label: "Vignette",
      params: { intensity: { min: 0.1, max: 1, default: 0.5, step: 0.1 } },
    },
    {
      name: "lensFlare",
      label: "Lens Flare",
      params: {
        centerX: { min: 0, max: 1, default: 0.5, step: 0.1 },
        centerY: { min: 0, max: 1, default: 0.5, step: 0.1 },
        intensity: { min: 0.1, max: 1, default: 0.8, step: 0.1 },
      },
    },
    {
      name: "neon",
      label: "Neon",
      params: { threshold: { min: 50, max: 200, default: 128 } },
    },
    { name: "thermal", label: "Thermal" },
    { name: "nightVision", label: "Night Vision" },
    { name: "infrared", label: "Infrared" },
    { name: "retro", label: "Retro" },
    {
      name: "hollow",
      label: "Hollow",
      params: { threshold: { min: 50, max: 200, default: 128 } },
    },
    { name: "sketch", label: "Sketch" },
    {
      name: "cartoon",
      label: "Cartoon",
      params: { intensity: { min: 1, max: 10, default: 4 } },
    },
    { name: "paint", label: "Paint" },
    { name: "inkify", label: "Inkify" },
    { name: "dither", label: "Dither" },
    {
      name: "hsvNoise",
      label: "HSV Noise",
      params: { amount: { min: 5, max: 100, default: 20 } },
    },
    { name: "reflection", label: "Reflection" },
    {
      name: "chromaKey",
      label: "Chroma Key",
      params: {
        targetR: { min: 0, max: 255, default: 0 },
        targetG: { min: 0, max: 255, default: 255 },
        targetB: { min: 0, max: 255, default: 0 },
        tolerance: { min: 5, max: 100, default: 30 },
      },
    },
    { name: "screenDoor", label: "Screen Door" },
    {
      name: "fog",
      label: "Fog",
      params: { intensity: { min: 0.1, max: 1, default: 0.3, step: 0.1 } },
    },
    {
      name: "glow",
      label: "Glow",
      params: { intensity: { min: 0.1, max: 1, default: 0.5, step: 0.1 } },
    },
    {
      name: "halftone",
      label: "Halftone",
      params: { dotSize: { min: 2, max: 10, default: 4 } },
    },
    { name: "crt", label: "CRT" },
  ],
};
export default function UnifiedFilterDialog({
  canvas,
  onApply,
  onCancel,
}: UnifiedFilterDialogProps) {
  const [activeCategory, setActiveCategory] = useState<string>(
    Object.keys(FILTER_CATEGORIES)[0],
  );
  const [selectedFilter, setSelectedFilter] = useState<FilterDefinition | null>(
    null,
  );
  const [filterParams, setFilterParams] = useState<Record<string, number>>({});
  const handleFilterSelect = (filter: FilterDefinition) => {
    setSelectedFilter(filter);
    const params: Record<string, number> = {};
    if (filter.params) {
      Object.entries(filter.params).forEach(([key, config]) => {
        params[key] = config.default;
      });
    }
    setFilterParams(params);
  };
  const handleApply = () => {
    if (selectedFilter) {
      onApply(selectedFilter.name, filterParams);
    }
  };
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
          maxWidth: "800px",
          maxHeight: "90vh",
          overflow: "auto",
          display: "grid",
          gridTemplateColumns: "250px 1fr",
          gap: "20px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {" "}
        {/* Left Side - Categories & Filters */}{" "}
        <div>
          {" "}
          <h3
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "600",
              marginBottom: "12px",
              textTransform: "uppercase",
            }}
          >
            {" "}
            Filters{" "}
          </h3>{" "}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {" "}
            {Object.keys(FILTER_CATEGORIES).map((category) => (
              <button
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setSelectedFilter(null);
                }}
                style={{
                  padding: "8px 12px",
                  backgroundColor:
                    activeCategory === category
                      ? "rgba(200, 169, 126, 0.2)"
                      : "transparent",
                  border: `1px solid ${activeCategory === category ? "#c8a97e" : "#444"}`,
                  color: activeCategory === category ? "#c8a97e" : "#aaa",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: activeCategory === category ? "600" : "400",
                  textAlign: "left",
                  transition: "all 0.2s",
                }}
              >
                {" "}
                {category}{" "}
              </button>
            ))}{" "}
          </div>{" "}
          {/* Filter List */}{" "}
          <div
            style={{ marginTop: "16px", maxHeight: "400px", overflowY: "auto" }}
          >
            {" "}
            <h4
              style={{
                color: "#666",
                fontSize: "10px",
                marginBottom: "8px",
                textTransform: "uppercase",
              }}
            >
              {" "}
              {activeCategory}{" "}
            </h4>{" "}
            {FILTER_CATEGORIES[activeCategory].map((filter) => (
              <button
                key={filter.name}
                onClick={() => handleFilterSelect(filter)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  backgroundColor:
                    selectedFilter?.name === filter.name
                      ? "rgba(200, 169, 126, 0.15)"
                      : "transparent",
                  border: `1px solid ${selectedFilter?.name === filter.name ? "#c8a97e" : "#333"}`,
                  color:
                    selectedFilter?.name === filter.name ? "#c8a97e" : "#aaa",
                  borderRadius: "3px",
                  cursor: "pointer",
                  fontSize: "10px",
                  textAlign: "left",
                  marginBottom: "4px",
                  transition: "all 0.2s",
                }}
              >
                {" "}
                {filter.label}{" "}
              </button>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        {/* Right Side - Preview & Controls */}{" "}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {" "}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            {" "}
            <h2
              style={{
                margin: 0,
                color: "#c8a97e",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              {" "}
              {selectedFilter?.label || "Select a Filter"}{" "}
            </h2>{" "}
            <button
              onClick={onCancel}
              style={{
                background: "none",
                border: "none",
                color: "#ccc",
                cursor: "pointer",
                display: "flex",
              }}
            >
              {" "}
              <X size={20} />{" "}
            </button>{" "}
          </div>{" "}
          {/* Parameters */}{" "}
          {selectedFilter?.params && (
            <div
              style={{
                marginBottom: "16px",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              {" "}
              {Object.entries(selectedFilter.params).map(([key, config]) => (
                <div key={key} style={{ marginBottom: "12px" }}>
                  {" "}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    {" "}
                    <label
                      style={{
                        color: "#aaa",
                        fontSize: "11px",
                        textTransform: "capitalize",
                      }}
                    >
                      {" "}
                      {key}{" "}
                    </label>{" "}
                    <span
                      style={{
                        color: "#c8a97e",
                        fontSize: "11px",
                        fontWeight: "600",
                      }}
                    >
                      {" "}
                      {filterParams[key]?.toFixed(config.step ? 1 : 0) ||
                        config.default}{" "}
                    </span>{" "}
                  </div>{" "}
                  <input
                    type="range"
                    min={config.min}
                    max={config.max}
                    step={config.step || 1}
                    value={filterParams[key] || config.default}
                    onChange={(e) =>
                      setFilterParams({
                        ...filterParams,
                        [key]: parseFloat(e.target.value),
                      })
                    }
                    style={{ width: "100%" }}
                  />{" "}
                </div>
              ))}{" "}
            </div>
          )}{" "}
          {/* Buttons */}{" "}
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "flex-end",
              marginTop: "auto",
            }}
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
              }}
            >
              {" "}
              Cancel{" "}
            </button>{" "}
            <button
              onClick={handleApply}
              disabled={!selectedFilter}
              style={{
                padding: "8px 16px",
                backgroundColor: selectedFilter
                  ? "rgba(200, 169, 126, 0.2)"
                  : "rgba(100, 100, 100, 0.2)",
                border: `1px solid ${selectedFilter ? "#c8a97e" : "#666"}`,
                color: selectedFilter ? "#c8a97e" : "#666",
                borderRadius: "4px",
                cursor: selectedFilter ? "pointer" : "not-allowed",
                fontSize: "12px",
                fontWeight: "500",
              }}
            >
              {" "}
              Apply Filter{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
