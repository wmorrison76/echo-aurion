import React, { useState } from "react";
import { Package, Edit2, Zap } from "lucide-react";

export interface SmartObject {
  id: string;
  name: string;
  type: "image" | "shape" | "text" | "group";
  sourceUrl: string;
  editableProperties: string[];
  lastEdited: Date;
  version: number;
  locked: boolean;
}

interface SmartObjectEnhancedProps {
  smartObjects: SmartObject[];
  onSmartObjectUpdate: (id: string, changes: Partial<SmartObject>) => void;
  onSmartObjectDuplicate: (id: string) => void;
  onSmartObjectDelete: (id: string) => void;
  onSmartObjectEdit: (id: string) => void;
}

export default function SmartObjectEnhanced({
  smartObjects,
  onSmartObjectUpdate,
  onSmartObjectDuplicate,
  onSmartObjectDelete,
  onSmartObjectEdit,
}: SmartObjectEnhancedProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "image":
        return "🖼️";
      case "shape":
        return "⬜";
      case "text":
        return "📝";
      case "group":
        return "📦";
      default:
        return "📋";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        backgroundColor: "#0a0a0a",
        borderRadius: "8px",
        border: "1px solid #333",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <Package size={16} color="#c8a97e" />
        <h4 style={{ color: "#c8a97e", fontSize: "12px", fontWeight: "bold", margin: 0 }}>
          Smart Objects ({smartObjects.length})
        </h4>
      </div>

      {smartObjects.length === 0 ? (
        <div
          style={{
            padding: "16px",
            textAlign: "center",
            color: "#666",
            fontSize: "12px",
            backgroundColor: "#0b0f1a",
            borderRadius: "4px",
          }}
        >
          No smart objects yet. Convert layers to smart objects to enable non-destructive editing.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "400px", overflowY: "auto" }}>
          {smartObjects.map((obj) => (
            <div
              key={obj.id}
              style={{
                backgroundColor: "#0b0f1a",
                border: "1px solid #333",
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px",
                  cursor: "pointer",
                  backgroundColor: expandedId === obj.id ? "#2a2a2a" : "transparent",
                  transition: "background-color 0.2s",
                }}
                onClick={() => setExpandedId(expandedId === obj.id ? null : obj.id)}
              >
                <div style={{ fontSize: "16px" }}>{getTypeIcon(obj.type)}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#c8a97e", fontSize: "11px", fontWeight: "600" }}>
                    {obj.name}
                  </div>
                  <div style={{ color: "#666", fontSize: "9px" }}>
                    v{obj.version} • {obj.type} • {obj.editableProperties.length} properties
                  </div>
                </div>

                <div style={{ display: "flex", gap: "4px" }}>
                  {obj.locked && (
                    <div style={{ color: "#ff6b6b", fontSize: "10px", padding: "2px 4px" }}>
                      🔒
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {expandedId === obj.id && (
                <div style={{ padding: "8px", borderTop: "1px solid #333", backgroundColor: "#0a0a0a" }}>
                  {/* Editable Properties */}
                  <div style={{ marginBottom: "8px" }}>
                    <div style={{ color: "#666", fontSize: "10px", marginBottom: "4px" }}>
                      Editable Properties:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {obj.editableProperties.map((prop) => (
                        <span
                          key={prop}
                          style={{
                            padding: "3px 8px",
                            backgroundColor: "#0b0f1a",
                            border: "1px solid #333",
                            borderRadius: "2px",
                            fontSize: "9px",
                            color: "#aaa",
                          }}
                        >
                          {prop}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => onSmartObjectEdit(obj.id)}
                      style={{
                        flex: 1,
                        minWidth: "60px",
                        padding: "6px",
                        backgroundColor: "rgba(0, 240, 255, 0.1)",
                        border: "1px solid #c8a97e",
                        color: "#c8a97e",
                        borderRadius: "2px",
                        cursor: "pointer",
                        fontSize: "10px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                    >
                      <Edit2 size={12} />
                      Edit
                    </button>
                    <button
                      onClick={() => onSmartObjectDuplicate(obj.id)}
                      style={{
                        padding: "6px 8px",
                        backgroundColor: "#0b0f1a",
                        border: "1px solid #444",
                        color: "#aaa",
                        borderRadius: "2px",
                        cursor: "pointer",
                        fontSize: "10px",
                        fontWeight: "600",
                      }}
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => {
                        onSmartObjectUpdate(obj.id, { locked: !obj.locked });
                      }}
                      style={{
                        padding: "6px 8px",
                        backgroundColor: obj.locked ? "rgba(255, 107, 107, 0.1)" : "#0b0f1a",
                        border: obj.locked ? "1px solid #ff6b6b" : "1px solid #444",
                        color: obj.locked ? "#ff6b6b" : "#aaa",
                        borderRadius: "2px",
                        cursor: "pointer",
                        fontSize: "10px",
                        fontWeight: "600",
                      }}
                    >
                      {obj.locked ? "🔒 Locked" : "🔓 Lock"}
                    </button>
                    <button
                      onClick={() => onSmartObjectDelete(obj.id)}
                      style={{
                        padding: "6px 8px",
                        backgroundColor: "#0b0f1a",
                        border: "1px solid #444",
                        color: "#ff6b6b",
                        borderRadius: "2px",
                        cursor: "pointer",
                        fontSize: "10px",
                        fontWeight: "600",
                      }}
                    >
                      Delete
                    </button>
                  </div>

                  {/* Last Edited */}
                  <div style={{ marginTop: "8px", fontSize: "9px", color: "#666", borderTop: "1px solid #333", paddingTop: "8px" }}>
                    Last edited: {new Date(obj.lastEdited).toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: "10px", color: "#666", padding: "8px", borderTop: "1px solid #333" }}>
        💡 Smart objects enable non-destructive editing and reusable components
      </div>
    </div>
  );
}
