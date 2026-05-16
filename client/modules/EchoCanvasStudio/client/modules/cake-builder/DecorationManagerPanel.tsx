/**
 * Decoration Manager Panel
 * UI for managing, positioning, and customizing decorations
 */

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type {
  Decoration,
  UseCakeDecorationsReturn,
} from "@/lib/decoration-types";

interface DecorationManagerPanelProps {
  decorations: Decoration[];
  activeId?: string;
  onSelectDecoration?: (id: string) => void;
  onRemoveDecoration?: (id: string) => void;
  onUpdatePosition?: (id: string, x: number, y: number) => void;
  onUpdateScale?: (id: string, scale: number) => void;
  onUpdateRotation?: (id: string, rotation: number) => void;
  onUpdateOpacity?: (id: string, opacity: number) => void;
  onDuplicate?: (id: string) => void;
}

export default function DecorationManagerPanel({
  decorations,
  activeId,
  onSelectDecoration,
  onRemoveDecoration,
  onUpdatePosition,
  onUpdateScale,
  onUpdateRotation,
  onUpdateOpacity,
  onDuplicate,
}: DecorationManagerPanelProps) {
  const [expandedId, setExpandedId] = useState<string | undefined>(activeId);
  const [visibility, setVisibility] = useState<Record<string, boolean>>(
    Object.fromEntries(decorations.map((d) => [d.id, true])),
  );

  const activeDecoration = decorations.find((d) => d.id === activeId);

  const getDecorationLabel = (decoration: Decoration): string => {
    switch (decoration.type) {
      case "text-piping":
        return `✍️ "${decoration.text}"`;
      case "sprinkles":
        return `✨ ${decoration.sprinkleType}`;
      case "fondant-flower":
        return `🌸 ${decoration.flowerType}`;
      case "chocolate-shards":
        return `🍫 ${decoration.style}`;
      case "custom":
        return `📦 ${decoration.customType}`;
      default:
        return "🎨 Decoration";
    }
  };

  const toggleVisibility = (id: string) => {
    setVisibility((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <h3
          style={{
            color: "#00f0ff",
            fontSize: "14px",
            fontWeight: "bold",
            margin: 0,
            flex: 1,
          }}
        >
          🎨 Decorations ({decorations.length})
        </h3>
      </div>

      {/* Decorations List */}
      {decorations.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "#666",
            padding: "20px",
            fontSize: "12px",
          }}
        >
          No decorations yet. Add text, sprinkles, or flowers!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {decorations.map((decoration) => (
            <div
              key={decoration.id}
              style={{
                backgroundColor: activeId === decoration.id ? "#222" : "#111",
                border:
                  activeId === decoration.id
                    ? "1px solid #00f0ff"
                    : "1px solid #333",
                borderRadius: "4px",
                overflow: "hidden",
                transition: "all 0.2s",
              }}
            >
              {/* Decoration Header */}
              <div
                onClick={() => {
                  onSelectDecoration?.(decoration.id);
                  setExpandedId(
                    expandedId === decoration.id ? undefined : decoration.id,
                  );
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px",
                  cursor: "pointer",
                  backgroundColor:
                    activeId === decoration.id ? "#1a1a1a" : "transparent",
                  transition: "background-color 0.2s",
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVisibility(decoration.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: visibility[decoration.id] ? "#00f0ff" : "#666",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {visibility[decoration.id] ? (
                    <Eye size={16} />
                  ) : (
                    <EyeOff size={16} />
                  )}
                </button>

                <div
                  style={{
                    flex: 1,
                    color: "#aaa",
                    fontSize: "12px",
                    fontWeight: "500",
                  }}
                >
                  {getDecorationLabel(decoration)}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate?.(decoration.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#aaa")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
                >
                  <Copy size={14} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveDecoration?.(decoration.id);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f00")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#666")}
                >
                  <Trash2 size={14} />
                </button>

                {expandedId === decoration.id ? (
                  <ChevronUp size={16} color="#666" />
                ) : (
                  <ChevronDown size={16} color="#666" />
                )}
              </div>

              {/* Expanded Details */}
              {expandedId === decoration.id && (
                <div
                  style={{
                    padding: "12px",
                    borderTop: "1px solid #333",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    backgroundColor: "#0f0f0f",
                  }}
                >
                  {/* Position */}
                  <div>
                    <label
                      style={{
                        color: "#888",
                        fontSize: "11px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      Position X: {decoration.position.x.toFixed(0)}
                    </label>
                    <Slider
                      defaultValue={[decoration.position.x]}
                      min={-500}
                      max={500}
                      step={5}
                      onValueChange={(value) => {
                        onUpdatePosition?.(
                          decoration.id,
                          value[0],
                          decoration.position.y,
                        );
                      }}
                      style={{
                        width: "100%",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{
                        color: "#888",
                        fontSize: "11px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      Position Y: {decoration.position.y.toFixed(0)}
                    </label>
                    <Slider
                      defaultValue={[decoration.position.y]}
                      min={-500}
                      max={500}
                      step={5}
                      onValueChange={(value) => {
                        onUpdatePosition?.(
                          decoration.id,
                          decoration.position.x,
                          value[0],
                        );
                      }}
                      style={{
                        width: "100%",
                      }}
                    />
                  </div>

                  {/* Scale */}
                  <div>
                    <label
                      style={{
                        color: "#888",
                        fontSize: "11px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      Scale: {decoration.scale.toFixed(2)}x
                    </label>
                    <Slider
                      defaultValue={[decoration.scale]}
                      min={0.1}
                      max={3}
                      step={0.1}
                      onValueChange={(value) => {
                        onUpdateScale?.(decoration.id, value[0]);
                      }}
                      style={{
                        width: "100%",
                      }}
                    />
                  </div>

                  {/* Rotation */}
                  <div>
                    <label
                      style={{
                        color: "#888",
                        fontSize: "11px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      Rotation: {(decoration.rotation.z * 180) / Math.PI}°
                    </label>
                    <Slider
                      defaultValue={[(decoration.rotation.z * 180) / Math.PI]}
                      min={0}
                      max={360}
                      step={5}
                      onValueChange={(value) => {
                        onUpdateRotation?.(decoration.id, value[0]);
                      }}
                      style={{
                        width: "100%",
                      }}
                    />
                  </div>

                  {/* Opacity */}
                  <div>
                    <label
                      style={{
                        color: "#888",
                        fontSize: "11px",
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      Opacity: {(decoration.opacity * 100).toFixed(0)}%
                    </label>
                    <Slider
                      defaultValue={[decoration.opacity * 100]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={(value) => {
                        onUpdateOpacity?.(decoration.id, value[0] / 100);
                      }}
                      style={{
                        width: "100%",
                      }}
                    />
                  </div>

                  {/* Generation Status */}
                  {decoration.generationStatus !== "completed" && (
                    <div
                      style={{
                        backgroundColor: "#222",
                        border: "1px solid #333",
                        borderRadius: "4px",
                        padding: "8px",
                        fontSize: "11px",
                        color: "#aaa",
                        textAlign: "center",
                      }}
                    >
                      Status: {decoration.generationStatus}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Active Decoration Info */}
      {activeDecoration && (
        <div
          style={{
            backgroundColor: "#222",
            border: "1px solid #333",
            borderRadius: "4px",
            padding: "12px",
            marginTop: "8px",
            fontSize: "11px",
            color: "#aaa",
          }}
        >
          <div
            style={{
              fontWeight: "bold",
              marginBottom: "8px",
              color: "#00f0ff",
            }}
          >
            Selected: {getDecorationLabel(activeDecoration)}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
            }}
          >
            <div>
              Position: ({activeDecoration.position.x.toFixed(0)},{" "}
              {activeDecoration.position.y.toFixed(0)})
            </div>
            <div>Scale: {activeDecoration.scale.toFixed(2)}x</div>
            <div>Opacity: {(activeDecoration.opacity * 100).toFixed(0)}%</div>
            <div>
              Rotation: {(activeDecoration.rotation.z * 180) / Math.PI}°
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
