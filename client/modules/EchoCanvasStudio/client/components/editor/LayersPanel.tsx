import React, { useState } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { LayerMask } from "./LayerMaskDialog";

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  transparent?: boolean;
  imageUrl?: string;
  mask?: LayerMask;
  maskVisible?: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  blendMode?: string;
}

interface LayersPanelProps {
  layers: Layer[];
  selectedLayer: string;
  onLayerSelect: (layerId: string) => void;
  onLayerAdd: () => void;
  onLayerDelete: (layerId: string) => void;
  onLayerToggleVisibility: (layerId: string) => void;
  onLayerToggleLock: (layerId: string) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onLayerAddMask?: (layerId: string) => void;
  onLayerRemoveMask?: (layerId: string) => void;
  onLayerToggleMaskVisibility?: (layerId: string) => void;
  onLayerMove?: (fromIndex: number, toIndex: number) => void;
}

export default function LayersPanel({
  layers,
  selectedLayer,
  onLayerSelect,
  onLayerAdd,
  onLayerDelete,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerOpacityChange,
  onLayerAddMask,
  onLayerRemoveMask,
  onLayerToggleMaskVisibility,
  onLayerMove,
}: LayersPanelProps) {
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnter = (layerId: string) => {
    setDragOverLayerId(layerId);
  };

  const handleDragLeave = () => {
    setDragOverLayerId(null);
  };

  const handleDrop = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedLayerId || draggedLayerId === targetLayerId || !onLayerMove) {
      setDraggedLayerId(null);
      setDragOverLayerId(null);
      return;
    }

    const fromIndex = layers.findIndex((l) => l.id === draggedLayerId);
    const toIndex = layers.findIndex((l) => l.id === targetLayerId);

    if (fromIndex !== -1 && toIndex !== -1) {
      onLayerMove(fromIndex, toIndex);
    }

    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const handleMoveLayer = (layerId: string, direction: "up" | "down") => {
    if (!onLayerMove) return;

    const currentIndex = layers.findIndex((l) => l.id === layerId);
    if (currentIndex === -1) return;

    let newIndex = currentIndex;
    if (direction === "up" && currentIndex < layers.length - 1) {
      newIndex = currentIndex + 1;
    } else if (direction === "down" && currentIndex > 0) {
      newIndex = currentIndex - 1;
    }

    if (newIndex !== currentIndex) {
      onLayerMove(currentIndex, newIndex);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        backgroundColor: "#0a0a0a",
        borderRight: "none",
      }}
    >
      {/* Panel Header */}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #333",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h3
          style={{
            margin: 0,
            color: "#c8a97e",
            fontSize: "12px",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Layers
        </h3>
        <button
          onClick={onLayerAdd}
          style={{
            background: "none",
            border: "none",
            color: "#c8a97e",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.7";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
          title="Add new layer"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Layers List */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px",
          display: "flex",
          flexDirection: "column-reverse", // Stack layers from bottom (oldest) to top (newest)
          gap: "4px",
        }}
      >
        {layers.length === 0 ? (
          <div
            style={{
              color: "#666",
              fontSize: "11px",
              padding: "12px",
              textAlign: "center",
            }}
          >
            No layers yet
          </div>
        ) : (
          layers.map((layer) => (
            <div
              key={layer.id}
              draggable
              onDragStart={(e) => handleDragStart(e, layer.id)}
              onDragOver={handleDragOver}
              onDragEnter={() => handleDragEnter(layer.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, layer.id)}
              onClick={() => onLayerSelect(layer.id)}
              style={{
                padding: "6px",
                backgroundColor:
                  draggedLayerId === layer.id
                    ? "rgba(200, 169, 126, 0.3)"
                    : dragOverLayerId === layer.id
                      ? "rgba(200, 169, 126, 0.15)"
                      : selectedLayer === layer.id
                        ? "rgba(200, 169, 126, 0.2)"
                        : "transparent",
                border:
                  dragOverLayerId === layer.id
                    ? "2px dashed #c8a97e"
                    : selectedLayer === layer.id
                      ? "1px solid #c8a97e"
                      : "1px solid #333",
                borderRadius: "4px",
                cursor: draggedLayerId ? "grabbing" : "pointer",
                transition: "all 0.2s",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                opacity: draggedLayerId === layer.id ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                if (selectedLayer !== layer.id && draggedLayerId !== layer.id) {
                  el.style.backgroundColor = "rgba(200, 169, 126, 0.1)";
                  el.style.borderColor = "#c8a97e";
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLDivElement;
                if (selectedLayer !== layer.id && draggedLayerId !== layer.id) {
                  el.style.backgroundColor = "transparent";
                  el.style.borderColor = "#333";
                }
              }}
            >
              {/* Layer Name & Controls - All on one line */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "2px",
                  flexWrap: "nowrap",
                  minHeight: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    minWidth: 0,
                  }}
                >
                  {/* Thumbnail */}
                  {layer.imageUrl ? (
                    <img
                      src={layer.imageUrl}
                      alt={layer.name}
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "2px",
                        border: "1px solid #444",
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "2px",
                        border: "1px solid #444",
                        backgroundColor: "#0b0f1a",
                        flexShrink: 0,
                      }}
                    />
                  )}
                  {/* Layer Name */}
                  <span
                    style={{
                      color: selectedLayer === layer.id ? "#c8a97e" : "#ccc",
                      fontSize: "10px",
                      fontWeight: selectedLayer === layer.id ? "600" : "400",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      minWidth: 0,
                    }}
                  >
                    {layer.name}
                  </span>
                </div>

                {/* Opacity Display */}
                <span
                  style={{
                    color: "#666",
                    fontSize: "8px",
                    minWidth: "25px",
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {layer.opacity}%
                </span>

                {/* Visibility Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerToggleVisibility(layer.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: layer.visible ? "#c8a97e" : "#666",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2px",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#c8a97e";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      layer.visible ? "#c8a97e" : "#666";
                  }}
                  title={layer.visible ? "Hide layer" : "Show layer"}
                >
                  {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>

                {/* Lock Toggle */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerToggleLock(layer.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: layer.locked ? "#ff6666" : "#666",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2px",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#ff6666";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      layer.locked ? "#ff6666" : "#666";
                  }}
                  title={layer.locked ? "Unlock layer" : "Lock layer"}
                >
                  {layer.locked ? <Lock size={12} /> : <LockOpen size={12} />}
                </button>

                {/* Add Mask Button */}
                {!layer.mask && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerAddMask?.(layer.id);
                    }}
                    style={{
                      background: "none",
                      border: "1px solid #444",
                      color: "#666",
                      cursor: "pointer",
                      padding: "1px 4px",
                      fontSize: "8px",
                      borderRadius: "2px",
                      transition: "all 0.2s",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#c8a97e";
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "#c8a97e";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#666";
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        "#444";
                    }}
                    title="Add layer mask"
                  >
                    M
                  </button>
                )}

                {/* Move Up Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveLayer(layer.id, "up");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor:
                      layers.findIndex((l) => l.id === layer.id) <
                      layers.length - 1
                        ? "pointer"
                        : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2px",
                    transition: "all 0.2s",
                    opacity:
                      layers.findIndex((l) => l.id === layer.id) <
                      layers.length - 1
                        ? 1
                        : 0.5,
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (
                      layers.findIndex((l) => l.id === layer.id) <
                      layers.length - 1
                    ) {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#c8a97e";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#666";
                  }}
                  title="Move layer up"
                  disabled={
                    layers.findIndex((l) => l.id === layer.id) >=
                    layers.length - 1
                  }
                >
                  <ChevronUp size={12} />
                </button>

                {/* Move Down Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveLayer(layer.id, "down");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor:
                      layers.findIndex((l) => l.id === layer.id) > 0
                        ? "pointer"
                        : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2px",
                    transition: "all 0.2s",
                    opacity:
                      layers.findIndex((l) => l.id === layer.id) > 0 ? 1 : 0.5,
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (layers.findIndex((l) => l.id === layer.id) > 0) {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#c8a97e";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#666";
                  }}
                  title="Move layer down"
                  disabled={layers.findIndex((l) => l.id === layer.id) <= 0}
                >
                  <ChevronDown size={12} />
                </button>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerDelete(layer.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "2px",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#ff6666";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#666";
                  }}
                  title="Delete layer"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Mask Controls */}
              {layer.mask && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    padding: "2px 0",
                    borderTop: "1px solid #333",
                    marginTop: "2px",
                    paddingTop: "2px",
                  }}
                >
                  <span
                    style={{
                      color: "#666",
                      fontSize: "8px",
                      minWidth: "35px",
                      flexShrink: 0,
                    }}
                  >
                    Mask:
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerToggleMaskVisibility?.(layer.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: layer.maskVisible !== false ? "#c8a97e" : "#666",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "1px",
                      transition: "all 0.2s",
                      fontSize: "10px",
                      flexShrink: 0,
                    }}
                    title={
                      layer.maskVisible !== false ? "Hide mask" : "Show mask"
                    }
                  >
                    {layer.maskVisible !== false ? "👁" : "👁‍🗨"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onLayerRemoveMask?.(layer.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#666",
                      cursor: "pointer",
                      padding: "1px 3px",
                      fontSize: "9px",
                      transition: "all 0.2s",
                      flexShrink: 0,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#ff6666";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#666";
                    }}
                    title="Remove mask"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Opacity Slider */}
              <input
                type="range"
                min="0"
                max="100"
                value={layer.opacity}
                onChange={(e) =>
                  onLayerOpacityChange(layer.id, Number(e.target.value))
                }
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: "100%",
                  height: "2px",
                  cursor: "pointer",
                }}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
