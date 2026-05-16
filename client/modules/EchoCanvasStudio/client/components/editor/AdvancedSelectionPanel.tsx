/**
 * Advanced Selection Panel
 * Provides UI for Select Subject, Refine Edge, and selection modification tools
 */

import React, { useState } from "react";
import { Wand2, Brush, RotateCcw } from "lucide-react";
import { SelectionMask, RefineEdgeParams } from "../../lib/advanced-selection";

interface AdvancedSelectionPanelProps {
  hasSelection: boolean;
  onSelectSubject: () => Promise<void>;
  onRefineEdges: (params: RefineEdgeParams) => Promise<void>;
  onModifySelection: (
    operation: "expand" | "contract" | "feather" | "smooth",
    amount: number,
  ) => void;
  onInvertSelection: () => void;
  loading?: boolean;
}

export default function AdvancedSelectionPanel({
  hasSelection,
  onSelectSubject,
  onRefineEdges,
  onModifySelection,
  onInvertSelection,
  loading = false,
}: AdvancedSelectionPanelProps) {
  const [refineEdgeOpen, setRefineEdgeOpen] = useState(false);
  const [refineParams, setRefineParams] = useState<RefineEdgeParams>({
    radius: 5,
    contrast: 0,
    smooth: 0,
    feather: 0,
    shift: 0,
    mode: "smooth",
  });

  const [expandAmount, setExpandAmount] = useState(10);
  const [contractAmount, setContractAmount] = useState(10);
  const [featherAmount, setFeatherAmount] = useState(5);
  const [smoothAmount, setSmoothAmount] = useState(3);

  const handleRefineEdges = async () => {
    try {
      await onRefineEdges(refineParams);
      setRefineEdgeOpen(false);
    } catch (error) {
      console.error("Refine edges failed:", error);
    }
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
      }}
    >
      <h3 style={{ margin: 0, color: "#c8a97e", fontSize: "12px" }}>
        ADVANCED SELECTION
      </h3>

      <button
        onClick={onSelectSubject}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          padding: "10px",
          backgroundColor: "rgba(200, 169, 126, 0.15)",
          border: "1px solid #c8a97e",
          borderRadius: "3px",
          color: "#c8a97e",
          fontSize: "11px",
          fontWeight: "600",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(200, 169, 126, 0.25)";
          }
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "rgba(200, 169, 126, 0.15)";
        }}
        title="AI-powered subject detection using machine learning"
      >
        <Wand2 size={14} />
        {loading ? "Detecting..." : "Select Subject"}
      </button>

      {hasSelection && (
        <>
          <div style={{ borderTop: "1px solid #333", paddingTop: "8px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <label
                style={{
                  color: "#888",
                  fontSize: "10px",
                  fontWeight: "600",
                }}
              >
                MODIFY SELECTION
              </label>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <SelectionModifier
                label="Expand"
                amount={expandAmount}
                onChange={setExpandAmount}
                onApply={() => onModifySelection("expand", expandAmount)}
              />
              <SelectionModifier
                label="Contract"
                amount={contractAmount}
                onChange={setContractAmount}
                onApply={() => onModifySelection("contract", contractAmount)}
              />
              <SelectionModifier
                label="Feather"
                amount={featherAmount}
                onChange={setFeatherAmount}
                onApply={() => onModifySelection("feather", featherAmount)}
              />
              <SelectionModifier
                label="Smooth"
                amount={smoothAmount}
                onChange={setSmoothAmount}
                onApply={() => onModifySelection("smooth", smoothAmount)}
              />
            </div>
          </div>

          <div style={{ borderTop: "1px solid #333", paddingTop: "8px" }}>
            <button
              onClick={onInvertSelection}
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: "rgba(100, 200, 255, 0.1)",
                border: "1px solid #64c8ff",
                borderRadius: "3px",
                color: "#64c8ff",
                fontSize: "10px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "rgba(100, 200, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "rgba(100, 200, 255, 0.1)";
              }}
              title="Invert the current selection"
            >
              Invert Selection
            </button>
          </div>

          <div style={{ borderTop: "1px solid #333", paddingTop: "8px" }}>
            <button
              onClick={() => setRefineEdgeOpen(!refineEdgeOpen)}
              style={{
                width: "100%",
                padding: "8px",
                backgroundColor: refineEdgeOpen
                  ? "rgba(150, 200, 255, 0.2)"
                  : "rgba(150, 200, 255, 0.1)",
                border: "1px solid #96c8ff",
                borderRadius: "3px",
                color: "#96c8ff",
                fontSize: "10px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "rgba(150, 200, 255, 0.2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  refineEdgeOpen
                    ? "rgba(150, 200, 255, 0.2)"
                    : "rgba(150, 200, 255, 0.1)";
              }}
              title="Use ML to intelligently refine edge quality"
            >
              <Brush size={12} />
              {refineEdgeOpen ? "Hide" : "Refine Edges"}
            </button>

            {refineEdgeOpen && (
              <div
                style={{
                  marginTop: "8px",
                  padding: "8px",
                  backgroundColor: "#0f0f0f",
                  borderRadius: "2px",
                  border: "1px solid #2a2a2a",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <label style={{ color: "#888", fontSize: "9px" }}>
                    Mode:
                    <select
                      value={refineParams.mode}
                      onChange={(e) =>
                        setRefineParams({
                          ...refineParams,
                          mode: e.target.value as RefineEdgeParams["mode"],
                        })
                      }
                      style={{
                        width: "100%",
                        marginTop: "2px",
                        padding: "4px",
                        backgroundColor: "#0b0f1a",
                        border: "1px solid #333",
                        borderRadius: "2px",
                        color: "#ccc",
                        fontSize: "9px",
                      }}
                    >
                      <option value="smooth">Smooth</option>
                      <option value="feather">Feather</option>
                      <option value="expand">Expand</option>
                      <option value="contract">Contract</option>
                    </select>
                  </label>

                  <label style={{ color: "#888", fontSize: "9px" }}>
                    Radius: {refineParams.radius}px
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={refineParams.radius}
                      onChange={(e) =>
                        setRefineParams({
                          ...refineParams,
                          radius: parseInt(e.target.value),
                        })
                      }
                      style={{ width: "100%", marginTop: "2px" }}
                    />
                  </label>

                  <label style={{ color: "#888", fontSize: "9px" }}>
                    Contrast: {refineParams.contrast}
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={refineParams.contrast}
                      onChange={(e) =>
                        setRefineParams({
                          ...refineParams,
                          contrast: parseInt(e.target.value),
                        })
                      }
                      style={{ width: "100%", marginTop: "2px" }}
                    />
                  </label>

                  <label style={{ color: "#888", fontSize: "9px" }}>
                    Smooth: {refineParams.smooth}
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={refineParams.smooth}
                      onChange={(e) =>
                        setRefineParams({
                          ...refineParams,
                          smooth: parseInt(e.target.value),
                        })
                      }
                      style={{ width: "100%", marginTop: "2px" }}
                    />
                  </label>

                  <button
                    onClick={handleRefineEdges}
                    disabled={loading}
                    style={{
                      marginTop: "6px",
                      padding: "6px",
                      backgroundColor: "rgba(0, 245, 150, 0.2)",
                      border: "1px solid #00f596",
                      borderRadius: "2px",
                      color: "#00f596",
                      fontSize: "9px",
                      fontWeight: "600",
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.6 : 1,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.backgroundColor = "rgba(0, 245, 150, 0.3)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      (
                        e.currentTarget as HTMLButtonElement
                      ).style.backgroundColor = "rgba(0, 245, 150, 0.2)";
                    }}
                  >
                    {loading ? "Refining..." : "Apply Refinement"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!hasSelection && (
        <div
          style={{
            padding: "8px",
            backgroundColor: "rgba(100, 100, 100, 0.1)",
            borderRadius: "2px",
            color: "#888",
            fontSize: "9px",
            textAlign: "center",
          }}
        >
          Make a selection to use refinement tools
        </div>
      )}
    </div>
  );
}

interface SelectionModifierProps {
  label: string;
  amount: number;
  onChange: (amount: number) => void;
  onApply: () => void;
}

function SelectionModifier({
  label,
  amount,
  onChange,
  onApply,
}: SelectionModifierProps) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <label style={{ color: "#888", fontSize: "9px", minWidth: "60px" }}>
        {label}: {amount}px
      </label>
      <input
        type="range"
        min="1"
        max="100"
        value={amount}
        onChange={(e) => onChange(parseInt(e.target.value))}
        style={{ flex: 1 }}
      />
      <button
        onClick={onApply}
        style={{
          padding: "4px 8px",
          backgroundColor: "rgba(0, 200, 200, 0.1)",
          border: "1px solid #00c8c8",
          borderRadius: "2px",
          color: "#00c8c8",
          fontSize: "8px",
          cursor: "pointer",
          transition: "all 0.2s",
          minWidth: "40px",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "rgba(0, 200, 200, 0.2)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "rgba(0, 200, 200, 0.1)";
        }}
      >
        Apply
      </button>
    </div>
  );
}
