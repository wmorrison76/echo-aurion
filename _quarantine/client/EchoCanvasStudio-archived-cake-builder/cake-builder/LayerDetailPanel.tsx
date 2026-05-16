/**
 * Layer Detail Panel
 * UI for customizing individual cake layers
 * Allows regeneration, replacement, and property adjustment
 */

import React, { useState } from "react";
import {
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { CakeLayer } from "@/shared/types";

interface LayerDetailPanelProps {
  approvedLayers: CakeLayer[];
  tierCount: number;
  onLayerRegenerateRequest?: (tierIndex: number, layerType: string) => void;
  onLayerRemove?: (layerId: string) => void;
  onLayerPropertyChange?: (
    layerId: string,
    property: string,
    value: any,
  ) => void;
}

interface LayerPropertyState {
  [layerId: string]: {
    temperature?: number; // 0-100 (how warm/cool)
    saturation?: number; // 0-100 (color intensity)
    contrast?: number; // 0-100 (contrast adjustment)
    customPrompt?: string; // for next regeneration
  };
}

export default function LayerDetailPanel({
  approvedLayers,
  tierCount,
  onLayerRegenerateRequest,
  onLayerRemove,
  onLayerPropertyChange,
}: LayerDetailPanelProps) {
  const [expandedTier, setExpandedTier] = useState<number>(0);
  const [layerProperties, setLayerProperties] = useState<LayerPropertyState>(
    {},
  );

  const getTierLayers = (tierIndex: number): CakeLayer[] => {
    return approvedLayers.filter(
      (layer) => layer.metadata?.tierIndex === tierIndex,
    );
  };

  const handlePropertyChange = (
    layerId: string,
    property: string,
    value: any,
  ) => {
    setLayerProperties((prev) => ({
      ...prev,
      [layerId]: {
        ...prev[layerId],
        [property]: value,
      },
    }));
    onLayerPropertyChange?.(layerId, property, value);
  };

  const getLayerTypeLabel = (type: string): { label: string; icon: string } => {
    switch (type) {
      case "tier":
        return { label: "Cake Tier", icon: "🎂" };
      case "frosting":
        return { label: "Frosting", icon: "🧁" };
      case "filling":
        return { label: "Filling", icon: "🍴" };
      default:
        return { label: type, icon: "📦" };
    }
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
        maxHeight: "700px",
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
        📋 Layer Details
      </h3>

      {approvedLayers.length === 0 ? (
        <div
          style={{
            padding: "12px",
            backgroundColor: "rgba(100, 100, 100, 0.1)",
            borderRadius: "6px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              color: "#666",
              fontSize: "11px",
              margin: 0,
            }}
          >
            No approved layers yet. Generate images to see them here.
          </p>
        </div>
      ) : (
        <>
          {/* Tier sections */}
          {Array.from({ length: tierCount }).map((_, tierIndex) => {
            const tierLayers = getTierLayers(tierIndex);
            const isExpanded = expandedTier === tierIndex;

            return (
              <div
                key={tierIndex}
                style={{
                  border: "1px solid #333",
                  borderRadius: "6px",
                  overflow: "hidden",
                  backgroundColor: "#0a0a0a",
                }}
              >
                {/* Tier header */}
                <button
                  onClick={() => setExpandedTier(isExpanded ? -1 : tierIndex)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    backgroundColor: "#0a0a0a",
                    border: "none",
                    borderBottom: isExpanded ? "1px solid #333" : "none",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "background-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#1a1a1a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#0a0a0a";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        color: "#00f0ff",
                        fontWeight: "bold",
                        fontSize: "12px",
                      }}
                    >
                      Tier {tierIndex + 1}
                    </span>
                    <span style={{ color: "#666", fontSize: "11px" }}>
                      ({tierLayers.length} layers)
                    </span>
                  </div>
                  <span
                    style={{
                      color: "#888",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  >
                    {isExpanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </span>
                </button>

                {/* Tier layers */}
                {isExpanded && tierLayers.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      padding: "12px",
                    }}
                  >
                    {tierLayers.map((layer) => {
                      const typeInfo = getLayerTypeLabel(layer.type);
                      const props = layerProperties[layer.id] || {};

                      return (
                        <div
                          key={layer.id}
                          style={{
                            padding: "12px",
                            backgroundColor: "#1a1a1a",
                            borderRadius: "4px",
                            border: "1px solid #333",
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          {/* Layer header */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <span style={{ fontSize: "16px" }}>
                                {typeInfo.icon}
                              </span>
                              <span
                                style={{
                                  color: "#00f0ff",
                                  fontWeight: "bold",
                                  fontSize: "11px",
                                }}
                              >
                                {typeInfo.label}
                              </span>
                            </div>
                            <span
                              style={{
                                color: "#666",
                                fontSize: "9px",
                                backgroundColor: "#0a0a0a",
                                padding: "2px 6px",
                                borderRadius: "2px",
                              }}
                            >
                              Generated
                            </span>
                          </div>

                          {/* Image preview */}
                          {layer.imageUrl && (
                            <div
                              style={{
                                width: "100%",
                                height: "100px",
                                borderRadius: "4px",
                                border: "1px solid #333",
                                backgroundImage: `url(${layer.imageUrl})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                                cursor: "pointer",
                              }}
                              title="Click to open in new window"
                              onClick={() =>
                                window.open(layer.imageUrl, "_blank")
                              }
                            />
                          )}

                          {/* Prompt info */}
                          <details
                            style={{
                              cursor: "pointer",
                            }}
                          >
                            <summary
                              style={{
                                color: "#666",
                                fontSize: "9px",
                                fontWeight: "bold",
                                userSelect: "none",
                              }}
                            >
                              View Prompt
                            </summary>
                            <p
                              style={{
                                color: "#888",
                                fontSize: "8px",
                                margin: "4px 0 0 0",
                                lineHeight: "1.3",
                                fontStyle: "italic",
                              }}
                            >
                              {layer.prompt}
                            </p>
                          </details>

                          {/* Properties */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                            }}
                          >
                            {/* Temperature */}
                            <div>
                              <label
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  color: "#888",
                                  fontSize: "9px",
                                  fontWeight: "bold",
                                  marginBottom: "4px",
                                }}
                              >
                                <span>Warmth</span>
                                <span>{props.temperature || 50}%</span>
                              </label>
                              <Slider
                                value={[props.temperature || 50]}
                                min={0}
                                max={100}
                                step={10}
                                onValueChange={(value) =>
                                  handlePropertyChange(
                                    layer.id,
                                    "temperature",
                                    value[0],
                                  )
                                }
                              />
                            </div>

                            {/* Saturation */}
                            <div>
                              <label
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  color: "#888",
                                  fontSize: "9px",
                                  fontWeight: "bold",
                                  marginBottom: "4px",
                                }}
                              >
                                <span>Saturation</span>
                                <span>{props.saturation || 100}%</span>
                              </label>
                              <Slider
                                value={[props.saturation || 100]}
                                min={0}
                                max={200}
                                step={10}
                                onValueChange={(value) =>
                                  handlePropertyChange(
                                    layer.id,
                                    "saturation",
                                    value[0],
                                  )
                                }
                              />
                            </div>

                            {/* Contrast */}
                            <div>
                              <label
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  color: "#888",
                                  fontSize: "9px",
                                  fontWeight: "bold",
                                  marginBottom: "4px",
                                }}
                              >
                                <span>Contrast</span>
                                <span>{props.contrast || 100}%</span>
                              </label>
                              <Slider
                                value={[props.contrast || 100]}
                                min={50}
                                max={150}
                                step={10}
                                onValueChange={(value) =>
                                  handlePropertyChange(
                                    layer.id,
                                    "contrast",
                                    value[0],
                                  )
                                }
                              />
                            </div>
                          </div>

                          {/* Custom prompt for regeneration */}
                          <textarea
                            placeholder="Custom prompt for regeneration (optional)"
                            value={props.customPrompt || ""}
                            onChange={(e) =>
                              handlePropertyChange(
                                layer.id,
                                "customPrompt",
                                e.target.value,
                              )
                            }
                            style={{
                              width: "100%",
                              minHeight: "50px",
                              padding: "6px",
                              backgroundColor: "#0a0a0a",
                              color: "#888",
                              border: "1px solid #333",
                              borderRadius: "3px",
                              fontSize: "8px",
                              fontFamily: "monospace",
                              resize: "vertical",
                            }}
                          />

                          {/* Action buttons */}
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() =>
                                onLayerRegenerateRequest?.(
                                  tierIndex,
                                  layer.type,
                                )
                              }
                              style={{
                                flex: 1,
                                padding: "6px",
                                backgroundColor: "#00f0ff",
                                color: "#000",
                                border: "none",
                                borderRadius: "3px",
                                cursor: "pointer",
                                fontSize: "10px",
                                fontWeight: "bold",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "4px",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#00d9ff";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor =
                                  "#00f0ff";
                              }}
                            >
                              <RefreshCw size={11} />
                              Regenerate
                            </button>
                            <button
                              onClick={() => onLayerRemove?.(layer.id)}
                              style={{
                                padding: "6px 10px",
                                backgroundColor: "#400",
                                color: "#f66",
                                border: "1px solid #600",
                                borderRadius: "3px",
                                cursor: "pointer",
                                fontSize: "10px",
                                fontWeight: "bold",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                transition: "all 0.2s",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#600";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "#400";
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Empty tier message */}
                {isExpanded && tierLayers.length === 0 && (
                  <div style={{ padding: "12px", textAlign: "center" }}>
                    <p
                      style={{
                        color: "#666",
                        fontSize: "10px",
                        margin: 0,
                      }}
                    >
                      No layers generated for this tier yet
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

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
          Customize each layer with warmth, saturation, and contrast
          adjustments. Use custom prompts to regenerate with different
          requirements.
        </p>
      </div>
    </div>
  );
}
