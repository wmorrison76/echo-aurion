/**
 * Decoration Generation Orchestrator
 * Master component for managing decoration generation workflow
 */

import React, { useState, useEffect, useCallback } from "react";
import { AlertCircle, Loader } from "lucide-react";
import TextPipingGenerator from "./TextPipingGenerator";
import DecorationManagerPanel from "./DecorationManagerPanel";
import { useCakeDecorations } from "@/hooks/use-cake-decorations";
import { generateDecorationImageWithCache } from "@/lib/decoration-generation-service";
import type { Decoration, TextPipingDecoration } from "@/lib/decoration-types";

interface DecorationGenerationOrchestratorProps {
  onDecorationsUpdate?: (decorations: Decoration[]) => void;
  isVisible?: boolean;
  onClose?: () => void;
}

type OrchestratorPhase = "generator" | "approval" | "management";

export default function DecorationGenerationOrchestrator({
  onDecorationsUpdate,
  isVisible = true,
  onClose,
}: DecorationGenerationOrchestratorProps) {
  const [phase, setPhase] = useState<OrchestratorPhase>("generator");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<string>("");
  const [error, setError] = useState<string>("");

  const decorations = useCakeDecorations({
    maxDecorations: 20,
    autoSave: true,
    persistToLocalStorage: true,
  });

  // Update parent on decoration changes
  useEffect(() => {
    onDecorationsUpdate?.(decorations.decorations);
  }, [decorations.decorations, onDecorationsUpdate]);

  const handleTextPipingCreate = useCallback(
    async (decoration: TextPipingDecoration) => {
      try {
        setError("");
        setPhase("approval");
        decorations.addDecoration(decoration);
        decorations.setActiveDecoration(decoration.id);

        // Start generation
        setGeneratingId(decoration.id);
        setGenerationProgress("Queuing decoration for generation...");

        decorations.queueDecorationGeneration(decoration, decoration.prompt);

        // Generate image
        setGenerationProgress("Generating decoration image...");

        const result = await generateDecorationImageWithCache(
          decoration,
          decoration.prompt,
          {
            onProgress: (message) => {
              setGenerationProgress(message);
            },
            onError: (err) => {
              setError(err.message);
              setGenerationProgress("");
            },
          },
        );

        if (result.success && result.imageUrl) {
          decorations.updateDecoration(decoration.id, {
            imageUrl: result.imageUrl,
            generationStatus: "completed",
            generatedAt: result.generatedAt,
          });
          decorations.updateQueueItemStatus(
            decoration.id,
            "completed",
            result.imageUrl,
          );
          setGenerationProgress("");
        } else {
          throw new Error(result.error || "Generation failed");
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setError(errorMsg);
        setGenerationProgress("");
        decorations.updateDecoration(decoration.id, {
          generationStatus: "failed",
        });
        decorations.updateQueueItemStatus(decoration.id, "failed");
      } finally {
        setGeneratingId(null);
      }
    },
    [decorations],
  );

  const handlePromptPreview = useCallback((prompt: string) => {
    setGenerationProgress(`Prompt preview: ${prompt.substring(0, 100)}...`);
  }, []);

  const handleSelectDecoration = useCallback(
    (id: string) => {
      decorations.setActiveDecoration(id);
    },
    [decorations],
  );

  const handleRemoveDecoration = useCallback(
    (id: string) => {
      decorations.removeDecoration(id);
    },
    [decorations],
  );

  const handleUpdatePosition = useCallback(
    (id: string, x: number, y: number) => {
      decorations.updateDecorationPosition(id, { x, y });
    },
    [decorations],
  );

  const handleUpdateScale = useCallback(
    (id: string, scale: number) => {
      decorations.updateDecorationScale(id, scale);
    },
    [decorations],
  );

  const handleUpdateRotation = useCallback(
    (id: string, rotationDegrees: number) => {
      const radiansZ = (rotationDegrees * Math.PI) / 180;
      const decoration = decorations.decorations.find((d) => d.id === id);
      if (decoration) {
        decorations.updateDecorationRotation(id, {
          x: decoration.rotation.x,
          y: decoration.rotation.y,
          z: radiansZ,
        });
      }
    },
    [decorations],
  );

  const handleUpdateOpacity = useCallback(
    (id: string, opacity: number) => {
      decorations.updateDecorationOpacity(id, opacity);
    },
    [decorations],
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      decorations.duplicateDecoration(id);
    },
    [decorations],
  );

  if (!isVisible) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "16px",
        backgroundColor: "#0f0f0f",
        borderRadius: "12px",
        border: "2px solid #333",
        maxHeight: "900px",
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: "12px",
          borderBottom: "1px solid #333",
        }}
      >
        <h2
          style={{
            color: "#00f0ff",
            fontSize: "16px",
            fontWeight: "bold",
            margin: 0,
          }}
        >
          🎨 Decoration Studio
        </h2>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
              fontSize: "20px",
              padding: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Phase Indicator */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          justifyContent: "center",
          padding: "8px",
          backgroundColor: "#1a1a1a",
          borderRadius: "4px",
          fontSize: "12px",
          color: "#aaa",
        }}
      >
        <button
          onClick={() => setPhase("generator")}
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor: phase === "generator" ? "#00f0ff" : "#333",
            color: phase === "generator" ? "#000" : "#aaa",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: phase === "generator" ? "bold" : "normal",
          }}
        >
          Generate
        </button>
        <button
          onClick={() => setPhase("approval")}
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor: phase === "approval" ? "#00f0ff" : "#333",
            color: phase === "approval" ? "#000" : "#aaa",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: phase === "approval" ? "bold" : "normal",
            position: "relative",
          }}
        >
          Approval
          {decorations.generationQueue.length > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-8px",
                right: "-8px",
                backgroundColor: "#f00",
                color: "#fff",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
              }}
            >
              {decorations.generationQueue.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setPhase("management")}
          style={{
            flex: 1,
            padding: "8px",
            backgroundColor: phase === "management" ? "#00f0ff" : "#333",
            color: phase === "management" ? "#000" : "#aaa",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: phase === "management" ? "bold" : "normal",
          }}
        >
          Manage ({decorations.decorations.length})
        </button>
      </div>

      {/* Generator Phase */}
      {phase === "generator" && (
        <TextPipingGenerator
          onDecorationCreate={handleTextPipingCreate}
          onPromptGenerate={handlePromptPreview}
          isGenerating={generatingId !== null}
        />
      )}

      {/* Approval Phase */}
      {phase === "approval" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          {/* Generation Progress */}
          {generatingId && (
            <div
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <Loader
                  size={16}
                  style={{
                    animation: "spin 1s linear infinite",
                  }}
                  color="#00f0ff"
                />
                <span style={{ color: "#aaa", fontSize: "14px" }}>
                  {generationProgress || "Generating..."}
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              style={{
                backgroundColor: "#300",
                border: "1px solid #900",
                borderRadius: "8px",
                padding: "12px",
                display: "flex",
                gap: "8px",
                alignItems: "flex-start",
              }}
            >
              <AlertCircle size={16} color="#f99" style={{ flexShrink: 0 }} />
              <div>
                <div
                  style={{
                    color: "#f99",
                    fontWeight: "bold",
                    fontSize: "12px",
                  }}
                >
                  Generation Error
                </div>
                <div
                  style={{ color: "#f99", fontSize: "11px", marginTop: "4px" }}
                >
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* Queue Items */}
          {decorations.generationQueue.length > 0 && (
            <div
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <h4
                style={{
                  color: "#00f0ff",
                  fontSize: "12px",
                  fontWeight: "bold",
                  margin: "0 0 8px 0",
                  textTransform: "uppercase",
                }}
              >
                Generation Queue ({decorations.generationQueue.length})
              </h4>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                {decorations.generationQueue.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px",
                      backgroundColor: "#111",
                      borderRadius: "4px",
                      fontSize: "11px",
                      color: "#aaa",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor:
                          item.status === "completed"
                            ? "#0f0"
                            : item.status === "failed"
                              ? "#f00"
                              : "#ff0",
                      }}
                    />
                    <span style={{ flex: 1 }}>{item.type}</span>
                    <span style={{ color: "#666" }}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No pending message */}
          {decorations.generationQueue.length === 0 && !generatingId && (
            <div
              style={{
                textAlign: "center",
                padding: "20px",
                color: "#666",
                fontSize: "12px",
              }}
            >
              No decorations in queue. Generate some in the Generator tab!
            </div>
          )}
        </div>
      )}

      {/* Management Phase */}
      {phase === "management" && (
        <DecorationManagerPanel
          decorations={decorations.decorations}
          activeId={decorations.activeDecoration}
          onSelectDecoration={handleSelectDecoration}
          onRemoveDecoration={handleRemoveDecoration}
          onUpdatePosition={handleUpdatePosition}
          onUpdateScale={handleUpdateScale}
          onUpdateRotation={handleUpdateRotation}
          onUpdateOpacity={handleUpdateOpacity}
          onDuplicate={handleDuplicate}
        />
      )}

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
