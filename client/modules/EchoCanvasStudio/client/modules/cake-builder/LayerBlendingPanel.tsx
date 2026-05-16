/**
 * Layer Blending Panel
 * UI for controlling layer blend modes and opacity
 */

import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { BlendMode, LayerBlendingConfig } from "@/lib/layer-blending";
import { getBlendModes, getRecommendedBlendMode } from "@/lib/layer-blending";

interface LayerBlendingPanelProps {
  tierCount: number;
  onBlendingConfigChange?: (config: LayerBlendingConfig) => void;
}

export default function LayerBlendingPanel({
  tierCount,
  onBlendingConfigChange,
}: LayerBlendingPanelProps) {
  const [configs, setConfigs] = useState<LayerBlendingConfig[]>(
    Array.from({ length: tierCount }, (_, i) => ({
      tierIndex: i,
      blendMode: "normal" as BlendMode,
      opacity: 1,
      visible: true,
    })),
  );

  const blendModes = getBlendModes();

  const handleBlendModeChange = (tierIndex: number, blendMode: BlendMode) => {
    const newConfigs = [...configs];
    newConfigs[tierIndex] = { ...newConfigs[tierIndex], blendMode };
    setConfigs(newConfigs);
    onBlendingConfigChange?.(newConfigs[tierIndex]);
  };

  const handleOpacityChange = (tierIndex: number, opacity: number) => {
    const newConfigs = [...configs];
    newConfigs[tierIndex] = { ...newConfigs[tierIndex], opacity };
    setConfigs(newConfigs);
    onBlendingConfigChange?.(newConfigs[tierIndex]);
  };

  const handleVisibilityChange = (tierIndex: number, visible: boolean) => {
    const newConfigs = [...configs];
    newConfigs[tierIndex] = { ...newConfigs[tierIndex], visible };
    setConfigs(newConfigs);
    onBlendingConfigChange?.(newConfigs[tierIndex]);
  };

  const handleUseRecommended = (
    tierIndex: number,
    layerType: "tier" | "frosting" | "filling",
  ) => {
    const recommended = getRecommendedBlendMode(layerType);
    handleBlendModeChange(tierIndex, recommended);
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
        maxHeight: "600px",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <h3
        style={{
          color: "#00f0ff",
          fontSize: "14px",
          fontWeight: "bold",
          margin: "0 0 8px 0",
        }}
      >
        🎨 Layer Blending
      </h3>

      {/* Tier controls */}
      {configs.map((config, tierIndex) => (
        <div
          key={tierIndex}
          style={{
            padding: "12px",
            backgroundColor: config.visible
              ? "#0a0a0a"
              : "rgba(100, 100, 100, 0.1)",
            borderRadius: "6px",
            border: "1px solid #333",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {/* Tier header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                color: "#00f0ff",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              Tier {tierIndex + 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVisibilityChange(tierIndex, !config.visible)}
              title={config.visible ? "Hide" : "Show"}
              style={{ padding: "4px 8px" }}
            >
              {config.visible ? <Eye size={12} /> : <EyeOff size={12} />}
            </Button>
          </div>

          {config.visible && (
            <>
              {/* Blend mode selector */}
              <div>
                <label
                  style={{
                    color: "#888",
                    fontSize: "10px",
                    fontWeight: "bold",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Blend Mode
                </label>
                <select
                  value={config.blendMode}
                  onChange={(e) =>
                    handleBlendModeChange(
                      tierIndex,
                      e.target.value as BlendMode,
                    )
                  }
                  style={{
                    width: "100%",
                    padding: "6px",
                    backgroundColor: "#0a0a0a",
                    color: "#00f0ff",
                    border: "1px solid #333",
                    borderRadius: "4px",
                    fontSize: "10px",
                    cursor: "pointer",
                  }}
                >
                  {blendModes.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label} - {mode.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opacity slider */}
              <div>
                <label
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: "#888",
                    fontSize: "10px",
                    fontWeight: "bold",
                    marginBottom: "6px",
                  }}
                >
                  <span>Opacity</span>
                  <span>{Math.round(config.opacity * 100)}%</span>
                </label>
                <Slider
                  value={[config.opacity]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={(value) =>
                    handleOpacityChange(tierIndex, value[0])
                  }
                  style={{ cursor: "pointer" }}
                />
              </div>

              {/* Quick presets */}
              <div>
                <label
                  style={{
                    color: "#888",
                    fontSize: "10px",
                    fontWeight: "bold",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Recommended:
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "4px",
                  }}
                >
                  <button
                    onClick={() => handleUseRecommended(tierIndex, "tier")}
                    style={{
                      padding: "4px",
                      backgroundColor:
                        config.blendMode === "normal" ? "#00f0ff" : "#0a0a0a",
                      color: config.blendMode === "normal" ? "#000" : "#888",
                      border: "1px solid #333",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "bold",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (config.blendMode !== "normal") {
                        e.currentTarget.style.borderColor = "#00f0ff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#333";
                    }}
                    title="Tier - Normal blend"
                  >
                    Tier
                  </button>
                  <button
                    onClick={() => handleUseRecommended(tierIndex, "frosting")}
                    style={{
                      padding: "4px",
                      backgroundColor:
                        config.blendMode === "overlay" ? "#00f0ff" : "#0a0a0a",
                      color: config.blendMode === "overlay" ? "#000" : "#888",
                      border: "1px solid #333",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "bold",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (config.blendMode !== "overlay") {
                        e.currentTarget.style.borderColor = "#00f0ff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#333";
                    }}
                    title="Frosting - Overlay blend"
                  >
                    Frosting
                  </button>
                  <button
                    onClick={() => handleUseRecommended(tierIndex, "filling")}
                    style={{
                      padding: "4px",
                      backgroundColor:
                        config.blendMode === "multiply" ? "#00f0ff" : "#0a0a0a",
                      color: config.blendMode === "multiply" ? "#000" : "#888",
                      border: "1px solid #333",
                      borderRadius: "3px",
                      cursor: "pointer",
                      fontSize: "9px",
                      fontWeight: "bold",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (config.blendMode !== "multiply") {
                        e.currentTarget.style.borderColor = "#00f0ff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#333";
                    }}
                    title="Filling - Multiply blend"
                  >
                    Filling
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      ))}

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
          Blend modes control how layers interact. Overlay works well for
          frosting, multiply for fillings.
        </p>
      </div>
    </div>
  );
}
