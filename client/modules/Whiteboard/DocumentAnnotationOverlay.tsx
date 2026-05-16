import React, { useEffect, useRef, useState } from "react";
import { DocumentElement } from "./types";
import { Highlighter, MessageCircle, Trash2 } from "lucide-react";

interface Annotation {
  id: string;
  type: "highlight" | "note" | "arrow" | "underline";
  content: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
}

interface DocumentAnnotationOverlayProps {
  documentId: string;
  isActive: boolean;
  annotations: Annotation[];
  onAddAnnotation: (annotation: Annotation) => void;
  onRemoveAnnotation: (annotationId: string) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export const DocumentAnnotationOverlay: React.FC<DocumentAnnotationOverlayProps> = ({
  documentId,
  isActive,
  annotations,
  onAddAnnotation,
  onRemoveAnnotation,
  containerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawMode, setDrawMode] = useState<"highlight" | "note" | "none">("none");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [selectedColor] = useState("#FFFF00");

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
  ) => {
    const headlen = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.strokeStyle = "#EF4444";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.fillStyle = "#EF4444";
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headlen * Math.cos(angle - Math.PI / 6),
      toY - headlen * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      toX - headlen * Math.cos(angle + Math.PI / 6),
      toY - headlen * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();
  };

  useEffect(() => {
    if (!isActive || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    annotations.forEach((ann) => {
      if (ann.type === "highlight" && ann.width && ann.height) {
        ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
        ctx.strokeStyle = "rgba(255, 255, 0, 0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(ann.x, ann.y, ann.width, ann.height);
      } else if (ann.type === "underline" && ann.width && ann.height) {
        ctx.strokeStyle = ann.color || "#FF0000";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ann.x, ann.y + ann.height);
        ctx.lineTo(ann.x + ann.width, ann.y + ann.height);
        ctx.stroke();
      } else if (ann.type === "arrow" && ann.width && ann.height) {
        drawArrow(ctx, ann.x, ann.y, ann.x + ann.width, ann.y + ann.height);
      }
    });
  }, [isActive, annotations, containerRef]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isActive || drawMode === "none") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setStartX(e.clientX - rect.left);
    setStartY(e.clientY - rect.top);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isActive || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    annotations.forEach((ann) => {
      if (ann.type === "highlight" && ann.width && ann.height) {
        ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
        ctx.fillRect(ann.x, ann.y, ann.width, ann.height);
      }
    });

    if (drawMode === "highlight") {
      const width = currentX - startX;
      const height = currentY - startY;
      ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
      ctx.fillRect(startX, startY, width, height);
      ctx.strokeStyle = "rgba(255, 255, 0, 0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, startY, width, height);
    } else if (drawMode === "note") {
      ctx.strokeStyle = "#3B82F6";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
      ctx.setLineDash([]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    if (width > 5 && height > 5) {
      const newAnnotation: Annotation = {
        id: `ann-${Date.now()}`,
        type: drawMode === "none" ? "highlight" : drawMode,
        content: "",
        x: Math.min(startX, endX),
        y: Math.min(startY, endY),
        width,
        height,
        color: selectedColor,
      };
      onAddAnnotation(newAnnotation);
    }

    setIsDrawing(false);
  };

  if (!isActive) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          display: "flex",
          gap: "8px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          padding: "8px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          zIndex: 60,
        }}
      >
        <button
          onClick={() => setDrawMode(drawMode === "highlight" ? "none" : "highlight")}
          style={{
            padding: "6px 10px",
            backgroundColor: drawMode === "highlight" ? "#FFFF00" : "#f3f4f6",
            border: drawMode === "highlight" ? "2px solid #000" : "1px solid #d1d5db",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
            fontWeight: "500",
          }}
        >
          <Highlighter size={14} /> Highlight
        </button>
        <button
          onClick={() => setDrawMode(drawMode === "note" ? "none" : "note")}
          style={{
            padding: "6px 10px",
            backgroundColor: drawMode === "note" ? "#E0F2FE" : "#f3f4f6",
            border: drawMode === "note" ? "2px solid #0284C7" : "1px solid #d1d5db",
            borderRadius: "4px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
            fontWeight: "500",
          }}
        >
          <MessageCircle size={14} /> Note
        </button>
        {annotations.length > 0 && (
          <button
            onClick={() => {
              if (annotations.length > 0) {
                onRemoveAnnotation(annotations[annotations.length - 1].id);
              }
            }}
            style={{
              padding: "6px 10px",
              backgroundColor: "#FEE2E2",
              border: "1px solid #FECACA",
              borderRadius: "4px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: "500",
              color: "#DC2626",
            }}
          >
            <Trash2 size={14} /> Clear
          </button>
        )}
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDrawing(false)}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          cursor: drawMode !== "none" ? "crosshair" : "default",
        }}
      />
    </div>
  );
};

export default DocumentAnnotationOverlay;
