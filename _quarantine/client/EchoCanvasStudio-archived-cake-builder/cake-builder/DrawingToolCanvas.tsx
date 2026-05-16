/**
 * Drawing Tool Canvas
 * Foundation for user drawing directly on the cake
 * Supports brush, eraser, color picking, and real-time texture generation
 */

import React, { useState, useRef, useEffect } from "react";
import { Undo2, Trash2, Save, Download, Pipette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface DrawingToolCanvasProps {
  width?: number;
  height?: number;
  onDrawingComplete?: (imageUrl: string, prompt: string) => void;
  onCancel?: () => void;
}

interface DrawingState {
  isDrawing: boolean;
  tool: "brush" | "eraser" | "colorpicker";
  color: string;
  brushSize: number;
  history: ImageData[];
  historyStep: number;
}

export default function DrawingToolCanvas({
  width = 512,
  height = 512,
  onDrawingComplete,
  onCancel,
}: DrawingToolCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const [state, setState] = useState<DrawingState>({
    isDrawing: false,
    tool: "brush",
    color: "#ffffff",
    brushSize: 10,
    history: [],
    historyStep: 0,
  });

  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "transparent";
    ctx.fillRect(0, 0, width, height);

    contextRef.current = ctx;
  }, [width, height]);

  // Save history
  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    const imageData = contextRef.current.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    );
    setState((prev) => ({
      ...prev,
      history: [...prev.history.slice(0, prev.historyStep + 1), imageData],
      historyStep: prev.historyStep + 1,
    }));
  };

  // Undo
  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current || state.historyStep === 0) return;

    const newStep = state.historyStep - 1;
    contextRef.current.putImageData(state.history[newStep], 0, 0);
    setState((prev) => ({
      ...prev,
      historyStep: newStep,
    }));
  };

  // Redo
  const handleRedo = () => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      !contextRef.current ||
      state.historyStep >= state.history.length - 1
    )
      return;

    const newStep = state.historyStep + 1;
    contextRef.current.putImageData(state.history[newStep], 0, 0);
    setState((prev) => ({
      ...prev,
      historyStep: newStep,
    }));
  };

  // Clear canvas
  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
    saveHistory();
  };

  // Start drawing
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (state.tool === "colorpicker") {
      // Get pixel color at cursor
      const ctx = contextRef.current;
      if (ctx) {
        const imageData = ctx.getImageData(x, y, 1, 1);
        const [r, g, b] = imageData.data;
        const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
        setState((prev) => ({
          ...prev,
          color: hex.toUpperCase(),
        }));
      }
    } else {
      setState((prev) => ({
        ...prev,
        isDrawing: true,
      }));

      if (contextRef.current) {
        contextRef.current.beginPath();
        contextRef.current.moveTo(x, y);
      }
    }
  };

  // Continue drawing
  const continueDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!state.isDrawing || !contextRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (state.tool === "brush") {
      contextRef.current.strokeStyle = state.color;
      contextRef.current.lineWidth = state.brushSize;
      contextRef.current.lineCap = "round";
      contextRef.current.lineJoin = "round";
      contextRef.current.lineTo(x, y);
      contextRef.current.stroke();
    } else if (state.tool === "eraser") {
      contextRef.current.clearRect(
        x - state.brushSize / 2,
        y - state.brushSize / 2,
        state.brushSize,
        state.brushSize,
      );
    }
  };

  // Stop drawing
  const stopDrawing = () => {
    if (!state.isDrawing) return;

    if (contextRef.current) {
      contextRef.current.closePath();
    }

    setState((prev) => ({
      ...prev,
      isDrawing: false,
    }));

    saveHistory();
  };

  // Save drawing
  const handleSaveDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsGenerating(true);

    try {
      // Convert canvas to data URL
      const imageUrl = canvas.toDataURL("image/png");

      // Generate prompt for the drawing
      const prompt = `User-drawn cake decoration with custom design, artistic cake topping design, hand-drawn style elements, ready for cake application, transparent background, high resolution, professional baker quality`;

      onDrawingComplete?.(imageUrl, prompt);
    } catch (error) {
      console.error("Error saving drawing:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download drawing
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `cake-drawing-${Date.now()}.png`;
    link.click();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "16px",
        backgroundColor: "#1a1a1a",
        borderRadius: "8px",
        border: "1px solid #333",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <h3
          style={{
            color: "#00f0ff",
            fontSize: "14px",
            fontWeight: "bold",
            margin: 0,
          }}
        >
          🎨 Drawing Tool
        </h3>
      </div>

      {/* Tool Selector */}
      <div style={{ display: "flex", gap: "8px" }}>
        {(["brush", "eraser", "colorpicker"] as const).map((tool) => (
          <button
            key={tool}
            onClick={() => {
              setState((prev) => ({
                ...prev,
                tool,
              }));
              setShowColorPicker(false);
            }}
            style={{
              flex: 1,
              padding: "8px",
              backgroundColor: state.tool === tool ? "#00f0ff" : "#222",
              color: state.tool === tool ? "#000" : "#aaa",
              border: "1px solid #333",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: state.tool === tool ? "bold" : "normal",
            }}
          >
            {tool === "brush" && "🖌️ Brush"}
            {tool === "eraser" && "🗑️ Eraser"}
            {tool === "colorpicker" && <Pipette size={14} />}
          </button>
        ))}
      </div>

      {/* Brush Size */}
      {state.tool === "brush" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              color: "#aaa",
              fontSize: "12px",
              fontWeight: "500",
              textTransform: "uppercase",
            }}
          >
            Brush Size: {state.brushSize}px
          </label>
          <Slider
            defaultValue={[state.brushSize]}
            min={1}
            max={50}
            step={1}
            onValueChange={(value) => {
              setState((prev) => ({
                ...prev,
                brushSize: value[0],
              }));
            }}
            style={{
              width: "100%",
            }}
          />
        </div>
      )}

      {/* Eraser Size */}
      {state.tool === "eraser" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              color: "#aaa",
              fontSize: "12px",
              fontWeight: "500",
              textTransform: "uppercase",
            }}
          >
            Eraser Size: {state.brushSize}px
          </label>
          <Slider
            defaultValue={[state.brushSize]}
            min={5}
            max={100}
            step={5}
            onValueChange={(value) => {
              setState((prev) => ({
                ...prev,
                brushSize: value[0],
              }));
            }}
            style={{
              width: "100%",
            }}
          />
        </div>
      )}

      {/* Color Picker */}
      {state.tool === "brush" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              color: "#aaa",
              fontSize: "12px",
              fontWeight: "500",
              textTransform: "uppercase",
            }}
          >
            Color
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="color"
              value={state.color}
              onChange={(e) => {
                setState((prev) => ({
                  ...prev,
                  color: e.target.value,
                }));
              }}
              style={{
                width: "60px",
                height: "40px",
                cursor: "pointer",
                border: "1px solid #333",
                borderRadius: "4px",
              }}
            />
            <input
              value={state.color}
              onChange={(e) => {
                setState((prev) => ({
                  ...prev,
                  color: e.target.value,
                }));
              }}
              style={{
                flex: 1,
                backgroundColor: "#222",
                border: "1px solid #333",
                color: "#fff",
                padding: "8px 12px",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            />
          </div>
        </div>
      )}

      {/* Canvas */}
      <div
        style={{
          position: "relative",
          borderRadius: "8px",
          overflow: "hidden",
          backgroundColor: "#000",
          border: "2px solid #333",
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={continueDrawing}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          style={{
            display: "block",
            width: "100%",
            cursor:
              state.tool === "colorpicker"
                ? "crosshair"
                : state.tool === "eraser"
                  ? "cell"
                  : "crosshair",
            backgroundColor: "#000",
          }}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "8px",
        }}
      >
        <Button
          onClick={handleUndo}
          disabled={state.historyStep === 0}
          style={{
            backgroundColor: state.historyStep === 0 ? "#333" : "#222",
            color: state.historyStep === 0 ? "#666" : "#aaa",
            border: "1px solid #333",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: state.historyStep === 0 ? "not-allowed" : "pointer",
            fontSize: "12px",
          }}
        >
          <Undo2 size={14} />
          Undo
        </Button>

        <Button
          onClick={handleClear}
          style={{
            backgroundColor: "#222",
            color: "#aaa",
            border: "1px solid #333",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          <Trash2 size={14} />
          Clear
        </Button>

        <Button
          onClick={handleDownload}
          style={{
            backgroundColor: "#222",
            color: "#aaa",
            border: "1px solid #333",
            padding: "8px 12px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          <Download size={14} />
          Download
        </Button>
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        <Button
          onClick={onCancel}
          style={{
            backgroundColor: "transparent",
            color: "#888",
            border: "1px solid #333",
            padding: "10px 16px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "500",
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSaveDrawing}
          disabled={isGenerating}
          style={{
            backgroundColor: "#00f0ff",
            color: "#000",
            border: "1px solid #00f0ff",
            padding: "10px 16px",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
            opacity: isGenerating ? 0.6 : 1,
          }}
        >
          <Save size={14} />
          {isGenerating ? "Processing..." : "Save Drawing"}
        </Button>
      </div>

      {/* Tips */}
      <div
        style={{
          backgroundColor: "#222",
          border: "1px solid #333",
          borderRadius: "4px",
          padding: "12px",
          fontSize: "11px",
          color: "#888",
        }}
      >
        <strong>Tips:</strong> Use the brush tool to draw directly on your cake
        design. Click the color picker to sample colors. Your drawing will be
        converted to a texture and placed on the cake surface.
      </div>
    </div>
  );
}
