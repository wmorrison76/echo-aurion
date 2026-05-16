import React, { useState } from "react";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
export interface AdjustmentLayer {
  id: string;
  name: string;
  type:
    | "levels"
    | "curves"
    | "hue-saturation"
    | "brightness-contrast"
    | "color-balance";
  visible: boolean;
  opacity: number;
  params: Record<string, any>;
}
interface AdjustmentLayerPanelProps {
  adjustmentLayers: AdjustmentLayer[];
  onAddLayer: (type: string) => void;
  onDeleteLayer: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onUpdateParams: (id: string, params: Record<string, any>) => void;
}
export default function AdjustmentLayerPanel({
  adjustmentLayers,
  onAddLayer,
  onDeleteLayer,
  onToggleVisibility,
  onUpdateParams,
}: AdjustmentLayerPanelProps) {
  const [selectedAdjustment, setSelectedAdjustment] = useState<string | null>(
    null,
  );
  const adjustmentTypes = [
    { id: "levels", label: "Levels", icon: "📊" },
    { id: "curves", label: "Curves", icon: "📈" },
    { id: "hue-saturation", label: "Hue-Saturation", icon: "🎨" },
    { id: "brightness-contrast", label: "Brightness-Contrast", icon: "☀️" },
    { id: "color-balance", label: "Color Balance", icon: "⚖️" },
  ];
  const getSelectedAdjustment = () => {
    return adjustmentLayers.find((a) => a.id === selectedAdjustment);
  };
  const renderControls = (adjustment: AdjustmentLayer) => {
    const type = adjustment.type;
    switch (type) {
      case "levels":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Black Point: {adjustment.params.blackPoint || 0}{" "}
              </label>{" "}
              <input
                type="range"
                min="0"
                max="255"
                value={adjustment.params.blackPoint || 0}
                onChange={(e) =>
                  onUpdateParams(adjustment.id, {
                    ...adjustment.params,
                    blackPoint: Number(e.target.value),
                  })
                }
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                White Point: {adjustment.params.whitePoint || 255}{" "}
              </label>{" "}
              <input
                type="range"
                min="0"
                max="255"
                value={adjustment.params.whitePoint || 255}
                onChange={(e) =>
                  onUpdateParams(adjustment.id, {
                    ...adjustment.params,
                    whitePoint: Number(e.target.value),
                  })
                }
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Gamma: {(adjustment.params.gamma || 1).toFixed(2)}{" "}
              </label>{" "}
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={adjustment.params.gamma || 1}
                onChange={(e) =>
                  onUpdateParams(adjustment.id, {
                    ...adjustment.params,
                    gamma: Number(e.target.value),
                  })
                }
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
          </div>
        );
      case "brightness-contrast":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Brightness: {adjustment.params.brightness || 0}{" "}
              </label>{" "}
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustment.params.brightness || 0}
                onChange={(e) =>
                  onUpdateParams(adjustment.id, {
                    ...adjustment.params,
                    brightness: Number(e.target.value),
                  })
                }
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Contrast: {adjustment.params.contrast || 0}{" "}
              </label>{" "}
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustment.params.contrast || 0}
                onChange={(e) =>
                  onUpdateParams(adjustment.id, {
                    ...adjustment.params,
                    contrast: Number(e.target.value),
                  })
                }
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
          </div>
        );
      case "hue-saturation":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Hue: {adjustment.params.hue || 0}{" "}
              </label>{" "}
              <input
                type="range"
                min="-180"
                max="180"
                value={adjustment.params.hue || 0}
                onChange={(e) =>
                  onUpdateParams(adjustment.id, {
                    ...adjustment.params,
                    hue: Number(e.target.value),
                  })
                }
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Saturation: {adjustment.params.saturation || 0}{" "}
              </label>{" "}
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustment.params.saturation || 0}
                onChange={(e) =>
                  onUpdateParams(adjustment.id, {
                    ...adjustment.params,
                    saturation: Number(e.target.value),
                  })
                }
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Lightness: {adjustment.params.lightness || 0}{" "}
              </label>{" "}
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustment.params.lightness || 0}
                onChange={(e) =>
                  onUpdateParams(adjustment.id, {
                    ...adjustment.params,
                    lightness: Number(e.target.value),
                  })
                }
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
          </div>
        );
      case "color-balance":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Cyan ← → Red: {adjustment.params.cyanRed || 0}{" "}
              </label>{" "}
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustment.params.cyanRed || 0}
                onChange={(e) =>
                  onUpdateParams(adjustment.id, {
                    ...adjustment.params,
                    cyanRed: Number(e.target.value),
                  })
                }
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Magenta ← → Green: {adjustment.params.magentaGreen || 0}{" "}
              </label>{" "}
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustment.params.magentaGreen || 0}
                onChange={(e) =>
                  onUpdateParams(adjustment.id, {
                    ...adjustment.params,
                    magentaGreen: Number(e.target.value),
                  })
                }
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  display: "block",
                  color: "#c8a97e",
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                }}
              >
                {" "}
                Yellow ← → Blue: {adjustment.params.yellowBlue || 0}{" "}
              </label>{" "}
              <input
                type="range"
                min="-100"
                max="100"
                value={adjustment.params.yellowBlue || 0}
                onChange={(e) =>
                  onUpdateParams(adjustment.id, {
                    ...adjustment.params,
                    yellowBlue: Number(e.target.value),
                  })
                }
                style={{ width: "100%", accentColor: "#c8a97e" }}
              />{" "}
            </div>{" "}
          </div>
        );
      default:
        return (
          <div style={{ color: "#666", fontSize: "10px" }}>
            {" "}
            No controls for this adjustment type{" "}
          </div>
        );
    }
  };
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "#0a0a0a",
        borderRadius: "8px",
        border: "1px solid #333",
        overflow: "hidden",
      }}
    >
      {" "}
      {/* Header */}{" "}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #333",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {" "}
        <h3
          style={{
            color: "#c8a97e",
            fontSize: "12px",
            fontWeight: "bold",
            margin: 0,
          }}
        >
          {" "}
          Adjustment Layers{" "}
        </h3>{" "}
        <div style={{ fontSize: "9px", color: "#666" }}>
          {" "}
          {adjustmentLayers.length}{" "}
        </div>{" "}
      </div>{" "}
      {/* Add Button */}{" "}
      <div
        style={{
          padding: "12px",
          borderBottom: "1px solid #333",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4px",
        }}
      >
        {" "}
        {adjustmentTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onAddLayer(type.id)}
            title={type.label}
            style={{
              padding: "6px 4px",
              backgroundColor: "#0b0f1a",
              border: "1px solid #333",
              color: "#c8a97e",
              borderRadius: "3px",
              cursor: "pointer",
              fontSize: "9px",
              fontWeight: "bold",
              transition: "all 0.2s",
            }}
          >
            {" "}
            {type.icon}{" "}
          </button>
        ))}{" "}
      </div>{" "}
      {/* Adjustment List */}{" "}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {" "}
        {adjustmentLayers.length === 0 ? (
          <div
            style={{
              padding: "24px 12px",
              color: "#666",
              fontSize: "11px",
              textAlign: "center",
            }}
          >
            {" "}
            Click an icon above to add an adjustment layer{" "}
          </div>
        ) : (
          <div>
            {" "}
            {adjustmentLayers.map((layer) => (
              <div
                key={layer.id}
                style={{
                  padding: "12px",
                  borderBottom: "1px solid #222",
                  cursor: "pointer",
                  backgroundColor:
                    selectedAdjustment === layer.id
                      ? "rgba(0, 240, 255, 0.1)"
                      : "transparent",
                  transition: "all 0.2s",
                }}
                onClick={() => setSelectedAdjustment(layer.id)}
              >
                {" "}
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  {" "}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(layer.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "0",
                      color: layer.visible ? "#c8a97e" : "#555",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    {" "}
                    {layer.visible ? (
                      <Eye size={12} />
                    ) : (
                      <EyeOff size={12} />
                    )}{" "}
                  </button>{" "}
                  <div style={{ flex: 1 }}>
                    {" "}
                    <div
                      style={{
                        color: "#c8a97e",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    >
                      {" "}
                      {layer.type}{" "}
                    </div>{" "}
                    <div style={{ color: "#666", fontSize: "9px" }}>
                      {" "}
                      Opacity: {layer.opacity}%{" "}
                    </div>{" "}
                  </div>{" "}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteLayer(layer.id);
                      setSelectedAdjustment(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "0",
                      color: "#ff6666",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    {" "}
                    <Trash2 size={12} />{" "}
                  </button>{" "}
                </div>{" "}
                {/* Controls */}{" "}
                {selectedAdjustment === layer.id && (
                  <div
                    style={{
                      paddingTop: "8px",
                      borderTop: "1px solid #333",
                      fontSize: "10px",
                    }}
                  >
                    {" "}
                    {renderControls(layer)}{" "}
                  </div>
                )}{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
}
