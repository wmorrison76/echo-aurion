import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  Sliders,
} from "lucide-react";
import {
  AdjustmentLayerEngine,
  AdjustmentLayer,
  AdjustmentType,
} from "./AdjustmentLayerEngine";

interface AdjustmentLayersPanelProps {
  engine: AdjustmentLayerEngine;
  onAdjustmentAdded: (adjustment: AdjustmentLayer) => void;
  onAdjustmentRemoved: (id: string) => void;
  onAdjustmentToggled: (id: string) => void;
  onAdjustmentUpdated: (id: string, updates: Partial<AdjustmentLayer>) => void;
}

export default function AdjustmentLayersPanel({
  engine,
  onAdjustmentAdded,
  onAdjustmentRemoved,
  onAdjustmentToggled,
  onAdjustmentUpdated,
}: AdjustmentLayersPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const adjustments = engine.getAllAdjustmentLayers();

  const addAdjustment = (type: AdjustmentType) => {
    const id = `adj-${Date.now()}`;
    let adjustment: AdjustmentLayer;

    switch (type) {
      case "curves":
        adjustment = {
          type: "curves",
          id,
          enabled: true,
          name: "Curves",
          redCurve: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
          greenCurve: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
          blueCurve: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
          allChannelsCurve: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ],
        };
        break;
      case "levels":
        adjustment = {
          type: "levels",
          id,
          enabled: true,
          name: "Levels",
          blackPoint: 0,
          whitePoint: 255,
          gamma: 1,
          outputBlack: 0,
          outputWhite: 255,
        };
        break;
      case "hue-saturation":
        adjustment = {
          type: "hue-saturation",
          id,
          enabled: true,
          name: "Hue/Saturation",
          hue: 0,
          saturation: 0,
          lightness: 0,
          colorRange: "master",
        };
        break;
      case "color-balance":
        adjustment = {
          type: "color-balance",
          id,
          enabled: true,
          name: "Color Balance",
          shadows: { cyan_red: 0, magenta_green: 0, yellow_blue: 0 },
          midtones: { cyan_red: 0, magenta_green: 0, yellow_blue: 0 },
          highlights: { cyan_red: 0, magenta_green: 0, yellow_blue: 0 },
          preserveLuminosity: true,
        };
        break;
      case "exposure":
        adjustment = {
          type: "exposure",
          id,
          enabled: true,
          name: "Exposure",
          exposure: 0,
          offset: 0,
          gamma: 1,
        };
        break;
      case "brightness-contrast":
        adjustment = {
          type: "brightness-contrast",
          id,
          enabled: true,
          name: "Brightness/Contrast",
          brightness: 0,
          contrast: 0,
          useLinearContrast: false,
        };
        break;
      case "vibrance":
        adjustment = {
          type: "vibrance",
          id,
          enabled: true,
          name: "Vibrance",
          vibrance: 0,
          saturation: 0,
        };
        break;
      default:
        return;
    }

    engine.addAdjustmentLayer(adjustment);
    onAdjustmentAdded(adjustment);
  };

  return (
    <div
      style={{
        backgroundColor: "#0b0f1a",
        borderRadius: "8px",
        border: "1px solid #c8a97e",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#0f0f0f",
          padding: "12px",
          borderBottom: "1px solid #333",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Sliders size={16} color="#c8a97e" />
        <span
          style={{
            color: "#c8a97e",
            fontWeight: "bold",
            fontSize: "14px",
          }}
        >
          Adjustment Layers
        </span>
        <span
          style={{
            marginLeft: "auto",
            color: "#666",
            fontSize: "12px",
          }}
        >
          {adjustments.length}
        </span>
      </div>

      {/* Adjustments List */}
      <div
        style={{
          maxHeight: "400px",
          overflowY: "auto",
          flex: 1,
        }}
      >
        {adjustments.length === 0 ? (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#666",
              fontSize: "12px",
            }}
          >
            No adjustment layers. Add one below.
          </div>
        ) : (
          adjustments.map((adjustment) => (
            <AdjustmentLayerItem
              key={adjustment.id}
              adjustment={adjustment}
              expanded={expandedId === adjustment.id}
              onToggleExpand={() =>
                setExpandedId(
                  expandedId === adjustment.id ? null : adjustment.id,
                )
              }
              onToggleVisibility={() => onAdjustmentToggled(adjustment.id)}
              onRemove={() => {
                onAdjustmentRemoved(adjustment.id);
                if (expandedId === adjustment.id) setExpandedId(null);
              }}
              onUpdate={(updates) =>
                onAdjustmentUpdated(adjustment.id, updates)
              }
            />
          ))
        )}
      </div>

      {/* Add Adjustment Button */}
      <div
        style={{
          borderTop: "1px solid #333",
          padding: "12px",
          backgroundColor: "#0f0f0f",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={() => addAdjustment("curves")}
          title="Add Curves adjustment"
          style={{
            flex: 1,
            minWidth: "100px",
            padding: "8px",
            backgroundColor: "#333",
            border: "1px solid #c8a97e",
            color: "#c8a97e",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          <Plus size={12} />
          Curves
        </button>
        <button
          onClick={() => addAdjustment("levels")}
          title="Add Levels adjustment"
          style={{
            flex: 1,
            minWidth: "100px",
            padding: "8px",
            backgroundColor: "#333",
            border: "1px solid #c8a97e",
            color: "#c8a97e",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          <Plus size={12} />
          Levels
        </button>
        <button
          onClick={() => addAdjustment("hue-saturation")}
          title="Add Hue/Saturation"
          style={{
            flex: 1,
            minWidth: "100px",
            padding: "8px",
            backgroundColor: "#333",
            border: "1px solid #c8a97e",
            color: "#c8a97e",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          <Plus size={12} />
          Hue/Sat
        </button>
        <button
          onClick={() => addAdjustment("color-balance")}
          title="Add Color Balance"
          style={{
            flex: 1,
            minWidth: "100px",
            padding: "8px",
            backgroundColor: "#333",
            border: "1px solid #c8a97e",
            color: "#c8a97e",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          <Plus size={12} />
          Color Bal
        </button>
        <button
          onClick={() => addAdjustment("exposure")}
          title="Add Exposure"
          style={{
            flex: 1,
            minWidth: "100px",
            padding: "8px",
            backgroundColor: "#333",
            border: "1px solid #c8a97e",
            color: "#c8a97e",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          <Plus size={12} />
          Exposure
        </button>
        <button
          onClick={() => addAdjustment("brightness-contrast")}
          title="Add Brightness/Contrast"
          style={{
            flex: 1,
            minWidth: "100px",
            padding: "8px",
            backgroundColor: "#333",
            border: "1px solid #c8a97e",
            color: "#c8a97e",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "11px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          <Plus size={12} />
          BR/Con
        </button>
      </div>
    </div>
  );
}

interface AdjustmentLayerItemProps {
  adjustment: AdjustmentLayer;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleVisibility: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<AdjustmentLayer>) => void;
}

function AdjustmentLayerItem({
  adjustment,
  expanded,
  onToggleExpand,
  onToggleVisibility,
  onRemove,
  onUpdate,
}: AdjustmentLayerItemProps) {
  return (
    <div
      style={{
        borderBottom: "1px solid #333",
        padding: "8px",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: expanded ? "8px" : 0,
        }}
      >
        <button
          onClick={onToggleVisibility}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: adjustment.enabled ? "#c8a97e" : "#666",
            cursor: "pointer",
            padding: "4px",
          }}
          title={adjustment.enabled ? "Hide" : "Show"}
        >
          {adjustment.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <input
            type="text"
            value={adjustment.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            style={{
              backgroundColor: "transparent",
              border: "none",
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "bold",
              padding: "0",
              cursor: "text",
              outline: "none",
            }}
          />
          <span
            style={{
              color: "#666",
              fontSize: "11px",
            }}
          >
            {adjustment.type.replace("-", " ")}
          </span>
        </div>

        <button
          onClick={onToggleExpand}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "#c8a97e",
            cursor: "pointer",
            padding: "4px",
          }}
        >
          <ChevronDown
            size={14}
            style={{
              transform: expanded ? "rotate(0)" : "rotate(-90deg)",
              transition: "transform 0.2s",
            }}
          />
        </button>

        <button
          onClick={onRemove}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "#ff4444",
            cursor: "pointer",
            padding: "4px",
          }}
          title="Remove"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Controls */}
      {expanded && (
        <div
          style={{
            marginLeft: "22px",
            paddingTop: "8px",
            borderTop: "1px solid #333",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <AdjustmentControls adjustment={adjustment} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  );
}

function AdjustmentControls({
  adjustment,
  onUpdate,
}: {
  adjustment: AdjustmentLayer;
  onUpdate: (updates: Partial<AdjustmentLayer>) => void;
}) {
  if (adjustment.type === "curves") {
    const adj = adjustment as any;
    return (
      <div
        style={{
          color: "#666",
          fontSize: "11px",
          textAlign: "center",
          padding: "8px",
        }}
      >
        Curve editor requires canvas integration
      </div>
    );
  }

  if (adjustment.type === "levels") {
    const adj = adjustment as any;
    return (
      <div>
        <SliderControl
          label="Black Point"
          min={0}
          max={255}
          value={adj.blackPoint}
          onChange={(v) => onUpdate({ blackPoint: v })}
        />
        <SliderControl
          label="White Point"
          min={0}
          max={255}
          value={adj.whitePoint}
          onChange={(v) => onUpdate({ whitePoint: v })}
        />
        <SliderControl
          label="Gamma"
          min={0.1}
          max={3}
          step={0.1}
          value={adj.gamma}
          onChange={(v) => onUpdate({ gamma: v })}
        />
      </div>
    );
  }

  if (adjustment.type === "hue-saturation") {
    const adj = adjustment as any;
    return (
      <div>
        <SliderControl
          label="Hue"
          min={-180}
          max={180}
          value={adj.hue}
          onChange={(v) => onUpdate({ hue: v })}
        />
        <SliderControl
          label="Saturation"
          min={-100}
          max={100}
          value={adj.saturation}
          onChange={(v) => onUpdate({ saturation: v })}
        />
        <SliderControl
          label="Lightness"
          min={-100}
          max={100}
          value={adj.lightness}
          onChange={(v) => onUpdate({ lightness: v })}
        />
      </div>
    );
  }

  if (adjustment.type === "exposure") {
    const adj = adjustment as any;
    return (
      <div>
        <SliderControl
          label="Exposure"
          min={-5}
          max={5}
          step={0.1}
          value={adj.exposure}
          onChange={(v) => onUpdate({ exposure: v })}
        />
        <SliderControl
          label="Offset"
          min={-1}
          max={1}
          step={0.05}
          value={adj.offset}
          onChange={(v) => onUpdate({ offset: v })}
        />
        <SliderControl
          label="Gamma"
          min={0.1}
          max={3}
          step={0.1}
          value={adj.gamma}
          onChange={(v) => onUpdate({ gamma: v })}
        />
      </div>
    );
  }

  if (adjustment.type === "brightness-contrast") {
    const adj = adjustment as any;
    return (
      <div>
        <SliderControl
          label="Brightness"
          min={-255}
          max={255}
          value={adj.brightness}
          onChange={(v) => onUpdate({ brightness: v })}
        />
        <SliderControl
          label="Contrast"
          min={-100}
          max={100}
          value={adj.contrast}
          onChange={(v) => onUpdate({ contrast: v })}
        />
      </div>
    );
  }

  if (adjustment.type === "vibrance") {
    const adj = adjustment as any;
    return (
      <div>
        <SliderControl
          label="Vibrance"
          min={-100}
          max={100}
          value={adj.vibrance}
          onChange={(v) => onUpdate({ vibrance: v })}
        />
        <SliderControl
          label="Saturation"
          min={-100}
          max={100}
          value={adj.saturation}
          onChange={(v) => onUpdate({ saturation: v })}
        />
      </div>
    );
  }

  return null;
}

function SliderControl({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        marginBottom: "6px",
      }}
    >
      <label
        style={{
          color: "#666",
          fontSize: "11px",
          minWidth: "70px",
        }}
      >
        {label}:
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          flex: 1,
          cursor: "pointer",
          accentColor: "#c8a97e",
          height: "4px",
        }}
      />
      <span
        style={{
          color: "#c8a97e",
          fontSize: "11px",
          minWidth: "35px",
          textAlign: "right",
        }}
      >
        {typeof value === "number" ? value.toFixed(1) : value}
      </span>
    </div>
  );
}
