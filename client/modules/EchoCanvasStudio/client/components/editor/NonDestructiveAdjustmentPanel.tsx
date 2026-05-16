/**
 * Non-Destructive Adjustment Layers Panel
 * Allows users to create, edit, and manage adjustment layers
 */

import React, { useState } from "react";
import {
  AdjustmentLayer,
  AdjustmentOperation,
  AdjustmentType,
  addOperationToLayer,
  createAdjustmentLayer,
  createAdjustmentOperation,
  removeOperationFromLayer,
  updateOperationInLayer,
  toggleOperationInLayer,
  reorderOperations,
  getDefaultParams,
} from "../../lib/adjustment-operations";
import { ChevronDown, Plus, Trash2, Eye, EyeOff } from "lucide-react";

interface NonDestructiveAdjustmentPanelProps {
  layers: AdjustmentLayer[];
  onLayersChange: (layers: AdjustmentLayer[]) => void;
  onPreview?: (canvas: HTMLCanvasElement) => void;
}

export default function NonDestructiveAdjustmentPanel({
  layers,
  onLayersChange,
  onPreview,
}: NonDestructiveAdjustmentPanelProps) {
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [expandedOps, setExpandedOps] = useState<Set<string>>(new Set());

  const adjustmentTypes: AdjustmentType[] = [
    "brightness",
    "contrast",
    "levels",
    "curves",
    "hue-saturation",
    "color-balance",
    "desaturate",
    "invert",
    "posterize",
    "exposure",
    "vibrance",
    "temperature",
  ];

  const addAdjustmentLayer = () => {
    const newLayer = createAdjustmentLayer(
      `Adjustment Layer ${layers.length + 1}`,
    );
    const updatedLayers = [...layers, newLayer];
    onLayersChange(updatedLayers);
  };

  const removeLayer = (layerId: string) => {
    const updatedLayers = layers.filter((l) => l.id !== layerId);
    onLayersChange(updatedLayers);
  };

  const toggleLayerVisibility = (layerId: string) => {
    const updatedLayers = layers.map((l) =>
      l.id === layerId ? { ...l, visible: !l.visible } : l,
    );
    onLayersChange(updatedLayers);
  };

  const addOperationToAdjustmentLayer = (
    layerId: string,
    type: AdjustmentType,
  ) => {
    const params = getDefaultParams(type);
    const operation = createAdjustmentOperation(type, params);
    const updatedLayers = layers.map((l) =>
      l.id === layerId ? addOperationToLayer(l, operation) : l,
    );
    onLayersChange(updatedLayers);
  };

  const removeOperation = (layerId: string, operationId: string) => {
    const updatedLayers = layers.map((l) =>
      l.id === layerId ? removeOperationFromLayer(l, operationId) : l,
    );
    onLayersChange(updatedLayers);
  };

  const updateOperation = (
    layerId: string,
    operationId: string,
    updates: Partial<AdjustmentOperation>,
  ) => {
    const updatedLayers = layers.map((l) =>
      l.id === layerId ? updateOperationInLayer(l, operationId, updates) : l,
    );
    onLayersChange(updatedLayers);
  };

  const toggleOperation = (layerId: string, operationId: string) => {
    const updatedLayers = layers.map((l) =>
      l.id === layerId ? toggleOperationInLayer(l, operationId) : l,
    );
    onLayersChange(updatedLayers);
  };

  const toggleLayerExpanded = (layerId: string) => {
    const newExpanded = new Set(expandedLayers);
    if (newExpanded.has(layerId)) {
      newExpanded.delete(layerId);
    } else {
      newExpanded.add(layerId);
    }
    setExpandedLayers(newExpanded);
  };

  const toggleOpExpanded = (opId: string) => {
    const newExpanded = new Set(expandedOps);
    if (newExpanded.has(opId)) {
      newExpanded.delete(opId);
    } else {
      newExpanded.add(opId);
    }
    setExpandedOps(newExpanded);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "12px",
        backgroundColor: "#0b0f1a",
        borderRadius: "4px",
        maxHeight: "400px",
        overflowY: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <h3 style={{ margin: 0, color: "#c8a97e", fontSize: "12px" }}>
          ADJUSTMENT LAYERS
        </h3>
        <button
          onClick={addAdjustmentLayer}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            backgroundColor: "rgba(200, 169, 126, 0.1)",
            border: "1px solid #c8a97e",
            borderRadius: "3px",
            color: "#c8a97e",
            fontSize: "11px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(200, 169, 126, 0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(200, 169, 126, 0.1)";
          }}
          title="Add new adjustment layer"
        >
          <Plus size={14} />
          Add Layer
        </button>
      </div>

      {layers.length === 0 ? (
        <div style={{ color: "#666", fontSize: "11px", textAlign: "center" }}>
          No adjustment layers. Click "Add Layer" to start.
        </div>
      ) : (
        layers.map((layer) => (
          <div
            key={layer.id}
            style={{
              border: "1px solid #333",
              borderRadius: "3px",
              backgroundColor: "#0f0f0f",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px",
                cursor: "pointer",
                backgroundColor: "#0b0f1a",
              }}
              onClick={() => toggleLayerExpanded(layer.id)}
            >
              <ChevronDown
                size={14}
                style={{
                  transform: expandedLayers.has(layer.id)
                    ? "rotate(0deg)"
                    : "rotate(-90deg)",
                  transition: "transform 0.2s",
                }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLayerVisibility(layer.id);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: layer.visible ? "#c8a97e" : "#666",
                  display: "flex",
                  alignItems: "center",
                  padding: "0",
                }}
                title={layer.visible ? "Hide layer" : "Show layer"}
              >
                {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <span style={{ flex: 1, color: "#ccc", fontSize: "11px" }}>
                {layer.name}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeLayer(layer.id);
                }}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#666",
                  display: "flex",
                  alignItems: "center",
                  padding: "0",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "#ff4444";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = "#666";
                }}
                title="Delete layer"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {expandedLayers.has(layer.id) && (
              <div
                style={{
                  padding: "0 8px 8px 8px",
                  borderTop: "1px solid #333",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    marginBottom: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {adjustmentTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() =>
                        addOperationToAdjustmentLayer(layer.id, type)
                      }
                      style={{
                        padding: "4px 6px",
                        backgroundColor: "rgba(0, 200, 200, 0.1)",
                        border: "1px solid #00c8c8",
                        borderRadius: "2px",
                        color: "#00c8c8",
                        fontSize: "10px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.backgroundColor = "rgba(0, 200, 200, 0.2)";
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.backgroundColor = "rgba(0, 200, 200, 0.1)";
                      }}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                {layer.operations.map((op) => (
                  <OperationControl
                    key={op.id}
                    operation={op}
                    onUpdate={(updates) =>
                      updateOperation(layer.id, op.id, updates)
                    }
                    onToggle={() => toggleOperation(layer.id, op.id)}
                    onRemove={() => removeOperation(layer.id, op.id)}
                    expanded={expandedOps.has(op.id)}
                    onToggleExpanded={() => toggleOpExpanded(op.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

interface OperationControlProps {
  operation: AdjustmentOperation;
  onUpdate: (updates: Partial<AdjustmentOperation>) => void;
  onToggle: () => void;
  onRemove: () => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}

function OperationControl({
  operation,
  onUpdate,
  onToggle,
  onRemove,
  expanded,
  onToggleExpanded,
}: OperationControlProps) {
  return (
    <div
      style={{
        border: "1px solid #2a2a2a",
        borderRadius: "2px",
        marginBottom: "6px",
        backgroundColor: "#0f0f0f",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px",
          cursor: "pointer",
          backgroundColor: operation.enabled ? "#0b0f1a" : "#151515",
        }}
        onClick={onToggleExpanded}
      >
        <ChevronDown
          size={12}
          style={{
            transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.2s",
          }}
        />
        <input
          type="checkbox"
          checked={operation.enabled}
          onChange={onToggle}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: "pointer" }}
          title={operation.enabled ? "Disable" : "Enable"}
        />
        <span
          style={{
            flex: 1,
            color: operation.enabled ? "#ccc" : "#666",
            fontSize: "10px",
            textDecoration: operation.enabled ? "none" : "line-through",
          }}
        >
          {operation.type}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#666",
            display: "flex",
            alignItems: "center",
            padding: "0",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#ff4444";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "#666";
          }}
          title="Delete operation"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {expanded && (
        <div style={{ padding: "6px", borderTop: "1px solid #2a2a2a" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px",
              fontSize: "9px",
            }}
          >
            <label style={{ color: "#888" }}>
              Opacity:
              <input
                type="range"
                min="0"
                max="100"
                value={operation.opacity}
                onChange={(e) =>
                  onUpdate({ opacity: parseInt(e.target.value) })
                }
                style={{ width: "100%", marginTop: "2px" }}
              />
              <span style={{ color: "#c8a97e" }}>{operation.opacity}%</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
