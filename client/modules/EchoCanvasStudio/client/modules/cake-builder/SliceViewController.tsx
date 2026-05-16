/**
 * Slice View Controller
 * UI for controlling cake slice/cut view angle and depth
 */

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { SliceConfig } from "@/lib/three-slice-view";

interface SliceViewControllerProps {
  onSliceConfigChange?: (config: SliceConfig) => void;
  onToggleSlice?: (enabled: boolean) => void;
}

export default function SliceViewController({
  onSliceConfigChange,
  onToggleSlice,
}: SliceViewControllerProps) {
  const [sliceConfig, setSliceConfig] = useState<SliceConfig>({
    enabled: false,
    angle: 45,
    depth: 0.5,
    showInterior: true,
    interiorColor: "#d4a574",
  });

  const handleToggleSlice = (enabled: boolean) => {
    const newConfig = { ...sliceConfig, enabled };
    setSliceConfig(newConfig);
    onToggleSlice?.(enabled);
    onSliceConfigChange?.(newConfig);
  };

  const handleAngleChange = (angle: number) => {
    const newConfig = { ...sliceConfig, angle };
    setSliceConfig(newConfig);
    onSliceConfigChange?.(newConfig);
  };

  const handleDepthChange = (depth: number) => {
    const newConfig = { ...sliceConfig, depth };
    setSliceConfig(newConfig);
    onSliceConfigChange?.(newConfig);
  };

  const handleToggleInterior = (show: boolean) => {
    const newConfig = { ...sliceConfig, showInterior: show };
    setSliceConfig(newConfig);
    onSliceConfigChange?.(newConfig);
  };

  const handleReset = () => {
    const newConfig: SliceConfig = {
      enabled: false,
      angle: 45,
      depth: 0.5,
      showInterior: true,
      interiorColor: "#d4a574",
    };
    setSliceConfig(newConfig);
    onToggleSlice?.(false);
    onSliceConfigChange?.(newConfig);
  };

  const handleColorChange = (color: string) => {
    const newConfig = { ...sliceConfig, interiorColor: color };
    setSliceConfig(newConfig);
    onSliceConfigChange?.(newConfig);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        backgroundColor: "#1a1a1a",
        borderRadius: "8px",
        border: "1px solid #333",
      }}
    >
      {/* Header with toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3
          style={{
            color: "#00f0ff",
            fontSize: "14px",
            fontWeight: "bold",
            margin: 0,
          }}
        >
          🍰 Slice View
        </h3>
        <Button
          variant={sliceConfig.enabled ? "default" : "outline"}
          size="sm"
          onClick={() => handleToggleSlice(!sliceConfig.enabled)}
          title={sliceConfig.enabled ? "Hide slice" : "Show slice"}
          style={{ padding: "6px 12px" }}
        >
          {sliceConfig.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
        </Button>
      </div>

      {/* Slice controls */}
      {sliceConfig.enabled && (
        <>
          {/* Angle control */}
          <div>
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#00f0ff",
                fontSize: "11px",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              <span>Cut Angle</span>
              <span style={{ color: "#888" }}>
                {Math.round(sliceConfig.angle)}°
              </span>
            </label>
            <Slider
              value={[sliceConfig.angle]}
              min={0}
              max={360}
              step={1}
              onValueChange={(value) => handleAngleChange(value[0])}
              style={{ cursor: "pointer" }}
            />
          </div>

          {/* Depth control */}
          <div>
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "#00f0ff",
                fontSize: "11px",
                fontWeight: "bold",
                marginBottom: "8px",
              }}
            >
              <span>Cut Depth</span>
              <span style={{ color: "#888" }}>
                {Math.round(sliceConfig.depth * 100)}%
              </span>
            </label>
            <Slider
              value={[sliceConfig.depth]}
              min={0.1}
              max={1}
              step={0.05}
              onValueChange={(value) => handleDepthChange(value[0])}
              style={{ cursor: "pointer" }}
            />
            <p
              style={{
                color: "#666",
                fontSize: "9px",
                marginTop: "4px",
                margin: "4px 0 0 0",
              }}
            >
              {sliceConfig.depth === 0.5 && "½ Cake"}
              {sliceConfig.depth < 0.5 && "⅓ Cake"}
              {sliceConfig.depth > 0.5 && "⅔+ Cake"}
            </p>
          </div>

          {/* Interior options */}
          <div
            style={{
              paddingTop: "12px",
              borderTop: "1px solid #333",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#00f0ff",
                fontSize: "11px",
                fontWeight: "bold",
                cursor: "pointer",
                marginBottom: "8px",
              }}
            >
              <input
                type="checkbox"
                checked={sliceConfig.showInterior}
                onChange={(e) => handleToggleInterior(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              Show Interior Detail
            </label>

            {sliceConfig.showInterior && (
              <>
                <label
                  style={{
                    display: "block",
                    color: "#888",
                    fontSize: "10px",
                    marginBottom: "6px",
                  }}
                >
                  Interior Color:
                </label>
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="color"
                    value={sliceConfig.interiorColor || "#d4a574"}
                    onChange={(e) => handleColorChange(e.target.value)}
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "1px solid #333",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <button
                      onClick={() => handleColorChange("#d4a574")}
                      style={{
                        padding: "4px 8px",
                        backgroundColor:
                          sliceConfig.interiorColor === "#d4a574"
                            ? "#d4a574"
                            : "#0a0a0a",
                        border: "1px solid #333",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontSize: "9px",
                        color: "#666",
                      }}
                      title="Vanilla crumb"
                    >
                      Vanilla
                    </button>
                    <button
                      onClick={() => handleColorChange("#6b4423")}
                      style={{
                        padding: "4px 8px",
                        backgroundColor:
                          sliceConfig.interiorColor === "#6b4423"
                            ? "#6b4423"
                            : "#0a0a0a",
                        border: "1px solid #333",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontSize: "9px",
                        color: "#666",
                      }}
                      title="Chocolate crumb"
                    >
                      Chocolate
                    </button>
                    <button
                      onClick={() => handleColorChange("#c9765a")}
                      style={{
                        padding: "4px 8px",
                        backgroundColor:
                          sliceConfig.interiorColor === "#c9765a"
                            ? "#c9765a"
                            : "#0a0a0a",
                        border: "1px solid #333",
                        borderRadius: "3px",
                        cursor: "pointer",
                        fontSize: "9px",
                        color: "#666",
                      }}
                      title="Carrot crumb"
                    >
                      Carrot
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Reset button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="w-full"
            style={{ padding: "8px", marginTop: "4px" }}
          >
            <RotateCw size={12} style={{ marginRight: "4px" }} />
            Reset
          </Button>

          {/* Info */}
          <div
            style={{
              padding: "8px",
              backgroundColor: "rgba(0, 240, 255, 0.05)",
              borderRadius: "4px",
              borderLeft: "2px solid #00f0ff",
            }}
          >
            <p
              style={{
                color: "#666",
                fontSize: "9px",
                margin: 0,
                lineHeight: "1.4",
              }}
            >
              Drag the sliders to adjust the cut angle and depth. The interior
              detail shows the cake&apos;s crumb and filling layers.
            </p>
          </div>
        </>
      )}

      {/* When disabled */}
      {!sliceConfig.enabled && (
        <div
          style={{
            padding: "8px",
            backgroundColor: "rgba(100, 100, 100, 0.1)",
            borderRadius: "4px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: "#666",
              fontSize: "10px",
              margin: 0,
            }}
          >
            Click the eye icon to enable slice view
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Preset slice angles for quick access
 */
export const SLICE_PRESETS = {
  front: { angle: 0, label: "Front Cut", depth: 0.5 },
  diagonal: { angle: 45, label: "Diagonal Cut", depth: 0.5 },
  side: { angle: 90, label: "Side Cut", depth: 0.5 },
  thickSlice: { angle: 45, label: "Thick Slice", depth: 0.7 },
  thinSlice: { angle: 45, label: "Thin Slice", depth: 0.3 },
  quarter: { angle: 0, label: "Quarter Cut", depth: 0.25 },
};
