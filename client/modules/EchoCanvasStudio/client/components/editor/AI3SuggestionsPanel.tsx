import React, { useEffect, useState } from "react";
import { Lightbulb, ChevronDown } from "lucide-react";
import ai3Service, { type ImageAnalysis } from "../../lib/ai3-services";

interface AI3SuggestionsPanelProps {
  canvas: HTMLCanvasElement | null;
  currentTool: string;
  recentTools?: string[];
  isOpen?: boolean;
}

interface Position {
  x: number;
  y: number;
}

export default function AI3SuggestionsPanel({
  canvas,
  currentTool,
  recentTools = [],
  isOpen = true,
}: AI3SuggestionsPanelProps) {
  const STORAGE_KEY = "ai3SuggestionsPanelPosition";
  const DEFAULT_POSITION = { x: 20, y: 80 };

  const loadPosition = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_POSITION;
    } catch {
      return DEFAULT_POSITION;
    }
  };

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [nextAction, setNextAction] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [position, setPosition] = useState<Position>(loadPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;

    // Only allow dragging from the header
    if (!target.closest("[data-drag-handle]")) {
      return;
    }

    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, position, dragStart]);

  useEffect(() => {
    if (!canvas || !isOpen) return;

    const analyzeTool = async () => {
      setIsLoading(true);
      try {
        const result = await ai3Service.analyze(currentTool, canvas);
        setAnalysis(result.analysis);
        setNextAction(result.nextAction);

        // Get general recommendations
        const recs = await ai3Service.getRecommendations(canvas, recentTools);
        setSuggestions(recs);
      } catch (error) {
        console.warn("AI analysis error:", error);
        setAnalysis(null);
        setNextAction(null);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      analyzeTool();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [canvas, currentTool, recentTools, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: `${position.y}px`,
        left: `${position.x}px`,
        backgroundColor: "rgba(0, 0, 0, 0.95)",
        border: "1px solid #c8a97e",
        borderRadius: "8px",
        maxWidth: "320px",
        zIndex: 1000,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0, 240, 255, 0.1)",
      }}
    >
      {/* Header */}
      <div
        data-drag-handle
        onMouseDown={handleMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #333",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Lightbulb size={16} style={{ color: "#c8a97e" }} />
          <span
            style={{
              color: "#c8a97e",
              fontSize: "12px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            AI Suggestions
          </span>
        </div>
        <ChevronDown
          size={16}
          style={{
            color: "#666",
            transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
            transition: "transform 0.2s",
          }}
        />
      </div>

      {/* Content */}
      {expanded && (
        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
          {isLoading && (
            <div
              style={{ color: "#666", fontSize: "12px", textAlign: "center" }}
            >
              Analyzing image...
            </div>
          )}

          {!isLoading && nextAction && (
            <div style={{ marginBottom: "16px" }}>
              <div
                style={{
                  color: "#c8a97e",
                  fontSize: "11px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "6px",
                }}
              >
                Current Tool Tip
              </div>
              <div
                style={{
                  color: "#ccc",
                  fontSize: "12px",
                  padding: "8px",
                  backgroundColor: "rgba(0, 240, 255, 0.05)",
                  borderLeft: "2px solid #c8a97e",
                  borderRadius: "2px",
                }}
              >
                {nextAction}
              </div>
            </div>
          )}

          {!isLoading && suggestions.length > 0 && (
            <div>
              <div
                style={{
                  color: "#c8a97e",
                  fontSize: "11px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "8px",
                }}
              >
                Recommended Next Steps
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    style={{
                      color: "#aaa",
                      fontSize: "11px",
                      padding: "6px 8px",
                      backgroundColor: "rgba(0, 240, 255, 0.05)",
                      borderRadius: "4px",
                      borderLeft: "2px solid #c8a97e",
                    }}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoading && !nextAction && suggestions.length === 0 && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <div
                style={{
                  color: "#666",
                  fontSize: "11px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "4px",
                }}
              >
                Quick Tips
              </div>
              <div style={{ color: "#aaa", fontSize: "11px" }}>
                {currentTool === "brush" && (
                  <div style={{ marginBottom: "6px" }}>
                    💡 Adjust brush size and opacity with the toolbar controls
                  </div>
                )}
                {currentTool === "text" && (
                  <div style={{ marginBottom: "6px" }}>
                    💡 Choose font, size, and color from the text tool panel
                  </div>
                )}
                {currentTool === "crop" && (
                  <div style={{ marginBottom: "6px" }}>
                    💡 Follow the rule of thirds for better composition
                  </div>
                )}
                {currentTool === "magic-wand" && (
                  <div style={{ marginBottom: "6px" }}>
                    💡 Click on a color to select similar pixels
                  </div>
                )}
                {!["brush", "text", "crop", "magic-wand"].includes(
                  currentTool,
                ) && (
                  <div style={{ marginBottom: "6px" }}>
                    💡 Check the Filter, Adjust, or Tools menus for more options
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Image Analysis Info */}
          {!isLoading && analysis && (
            <div
              style={{
                marginTop: "12px",
                paddingTop: "12px",
                borderTop: "1px solid #333",
              }}
            >
              <div
                style={{
                  color: "#666",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "6px",
                }}
              >
                Image Analysis
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                {analysis.hasFaces && (
                  <div style={{ color: "#aaa", fontSize: "10px" }}>
                    • {analysis.faceRegions?.length || 0} faces detected
                  </div>
                )}
                <div style={{ color: "#aaa", fontSize: "10px" }}>
                  • Lighting:{" "}
                  <span style={{ color: "#c8a97e" }}>{analysis.lighting}</span>
                </div>
                <div style={{ color: "#aaa", fontSize: "10px" }}>
                  • Contrast:{" "}
                  <span style={{ color: "#c8a97e" }}>{analysis.contrast}</span>
                </div>
                <div style={{ color: "#aaa", fontSize: "10px" }}>
                  • Sharpness:{" "}
                  <span style={{ color: "#c8a97e" }}>{analysis.blur}</span>
                </div>
                {analysis.dominantColors.length > 0 && (
                  <div style={{ color: "#aaa", fontSize: "10px" }}>
                    • Colors:{" "}
                    {analysis.dominantColors.slice(0, 2).map((c) => (
                      <span
                        key={c}
                        style={{
                          display: "inline-block",
                          width: "10px",
                          height: "10px",
                          backgroundColor: c,
                          borderRadius: "2px",
                          marginLeft: "4px",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
