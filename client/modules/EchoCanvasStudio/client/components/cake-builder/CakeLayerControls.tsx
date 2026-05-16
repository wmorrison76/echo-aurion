import React from "react";
import { RotateCcw, RefreshCw, Trash2, Copy } from "lucide-react";

interface Layer {
  id: string;
  name: string;
  type: "flavor" | "filling" | "frosting" | "topping";
  visible: boolean;
  opacity: number;
  isGenerating?: boolean;
}

interface CakeLayerControlsProps {
  layers: Layer[];
  onRegenerateLayer: (layerId: string) => void;
  onResetDesign: () => void;
  onDeleteLayer: (layerId: string) => void;
  onDuplicateLayer: (layerId: string) => void;
  onLayerVisibilityToggle: (layerId: string) => void;
  isRegenerating?: boolean;
}

export default function CakeLayerControls({
  layers,
  onRegenerateLayer,
  onResetDesign,
  onDeleteLayer,
  onDuplicateLayer,
  onLayerVisibilityToggle,
  isRegenerating = false,
}: CakeLayerControlsProps) {
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
        maxHeight: "400px",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "8px" }}>
        <h3
          style={{
            color: "#00f0ff",
            fontSize: "13px",
            fontWeight: "600",
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Layer Controls
        </h3>
      </div>

      {/* Layers List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {layers.length === 0 ? (
          <div
            style={{
              color: "#666",
              fontSize: "12px",
              textAlign: "center",
              padding: "12px",
            }}
          >
            No layers yet
          </div>
        ) : (
          layers.map((layer) => (
            <div
              key={layer.id}
              style={{
                padding: "8px",
                backgroundColor: "rgba(0, 240, 255, 0.05)",
                border: "1px solid #333",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {/* Visibility Toggle */}
              <button
                onClick={() => onLayerVisibilityToggle(layer.id)}
                title={layer.visible ? "Hide layer" : "Show layer"}
                style={{
                  background: "none",
                  border: "none",
                  color: layer.visible ? "#00f0ff" : "#333",
                  cursor: "pointer",
                  padding: "2px",
                  display: "flex",
                  alignItems: "center",
                  fontSize: "14px",
                }}
              >
                {layer.visible ? "👁️" : "🚫"}
              </button>

              {/* Layer Name */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#ccc",
                    fontSize: "11px",
                    fontWeight: "600",
                  }}
                >
                  {layer.name}
                </div>
                <div
                  style={{
                    color: "#666",
                    fontSize: "10px",
                  }}
                >
                  {layer.type}
                </div>
              </div>

              {/* Loading indicator */}
              {layer.isGenerating && (
                <div
                  style={{
                    fontSize: "12px",
                    animation: "spin 1s linear infinite",
                  }}
                >
                  ⚙️
                </div>
              )}

              {/* Layer Actions */}
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  onClick={() => onRegenerateLayer(layer.id)}
                  disabled={isRegenerating}
                  title="Regenerate layer"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor: isRegenerating ? "not-allowed" : "pointer",
                    padding: "2px 4px",
                    display: "flex",
                    alignItems: "center",
                    opacity: isRegenerating ? 0.5 : 1,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isRegenerating) {
                      (e.currentTarget as HTMLButtonElement).style.color =
                        "#00f0ff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#666";
                  }}
                >
                  <RefreshCw size={12} />
                </button>

                <button
                  onClick={() => onDuplicateLayer(layer.id)}
                  title="Duplicate layer"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor: "pointer",
                    padding: "2px 4px",
                    display: "flex",
                    alignItems: "center",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#00f0ff";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#666";
                  }}
                >
                  <Copy size={12} />
                </button>

                <button
                  onClick={() => onDeleteLayer(layer.id)}
                  title="Delete layer"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor: "pointer",
                    padding: "2px 4px",
                    display: "flex",
                    alignItems: "center",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#ff4444";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color = "#666";
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Global Actions */}
      <div style={{ borderTop: "1px solid #333", paddingTop: "12px" }}>
        <button
          onClick={onResetDesign}
          disabled={isRegenerating}
          style={{
            width: "100%",
            padding: "8px",
            backgroundColor: "transparent",
            border: "1px solid #444",
            color: "#666",
            borderRadius: "4px",
            cursor: isRegenerating ? "not-allowed" : "pointer",
            fontSize: "11px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            opacity: isRegenerating ? 0.5 : 1,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            if (!isRegenerating) {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                "#ff6b6b";
              (e.currentTarget as HTMLButtonElement).style.color = "#ff6b6b";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#444";
            (e.currentTarget as HTMLButtonElement).style.color = "#666";
          }}
        >
          <RotateCcw size={12} />
          Reset All Layers
        </button>
      </div>

      {/* Info */}
      <div
        style={{
          fontSize: "10px",
          color: "#666",
          textAlign: "center",
          paddingTop: "8px",
          borderTop: "1px solid #333",
        }}
      >
        {layers.length} layers • Regenerate to update
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
