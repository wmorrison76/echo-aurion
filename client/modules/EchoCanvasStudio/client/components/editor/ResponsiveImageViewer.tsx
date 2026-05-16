import React, { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface ResponsiveImageViewerProps {
  src: string;
  alt?: string;
  maxWidth?: number;
  maxHeight?: number;
  onImageLoaded?: () => void;
}

export default function ResponsiveImageViewer({
  src,
  alt = "Image",
  maxWidth = 400,
  maxHeight = 500,
  onImageLoaded,
}: ResponsiveImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Smooth zoom with constraints
  const handleZoom = (direction: "in" | "out") => {
    setZoom((prev) => {
      const newZoom = direction === "in" ? prev * 1.15 : prev / 1.15;
      // Constrain zoom between 0.5x and 3x
      return Math.max(0.5, Math.min(3, newZoom));
    });
  };

  // Reset zoom and position
  const handleReset = () => {
    setZoom(1);
    setDragOffset({ x: 0, y: 0 });
  };

  // Pinch zoom for trackpad/touch
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Check if it's a pinch gesture (trackpad) or scroll
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return; // Skip vertical scroll

      e.preventDefault();

      // Smooth zoom increment for trackpad pinch
      const zoomDelta = e.deltaY > 0 ? 0.95 : 1.05;
      setZoom((prev) => {
        const newZoom = prev * zoomDelta;
        return Math.max(0.5, Math.min(3, newZoom));
      });
    };

    container.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return; // No dragging when fully zoomed out
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;

    setDragOffset((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Constrain drag offset
  const constrainedOffset = {
    x: Math.max(-maxWidth * (zoom - 1) / 2, Math.min(dragOffset.x, maxWidth * (zoom - 1) / 2)),
    y: Math.max(-maxHeight * (zoom - 1) / 2, Math.min(dragOffset.y, maxHeight * (zoom - 1) / 2)),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          alignItems: "center",
          padding: "8px 12px",
          backgroundColor: "rgba(200, 169, 126, 0.05)",
          borderRadius: "4px",
          border: "1px solid #333",
        }}
      >
        <button
          onClick={() => handleZoom("out")}
          disabled={zoom <= 0.5}
          style={{
            padding: "6px 10px",
            backgroundColor: zoom <= 0.5 ? "rgba(100, 100, 100, 0.2)" : "rgba(200, 169, 126, 0.1)",
            border: zoom <= 0.5 ? "1px solid #444" : "1px solid #c8a97e",
            borderRadius: "3px",
            color: zoom <= 0.5 ? "#666" : "#c8a97e",
            fontSize: "12px",
            fontWeight: "600",
            cursor: zoom <= 0.5 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.2s",
          }}
        >
          <ZoomOut size={14} />
        </button>

        <div
          style={{
            fontSize: "12px",
            color: "#aaa",
            minWidth: "45px",
            textAlign: "center",
            fontWeight: "600",
          }}
        >
          {Math.round(zoom * 100)}%
        </div>

        <button
          onClick={() => handleZoom("in")}
          disabled={zoom >= 3}
          style={{
            padding: "6px 10px",
            backgroundColor: zoom >= 3 ? "rgba(100, 100, 100, 0.2)" : "rgba(200, 169, 126, 0.1)",
            border: zoom >= 3 ? "1px solid #444" : "1px solid #c8a97e",
            borderRadius: "3px",
            color: zoom >= 3 ? "#666" : "#c8a97e",
            fontSize: "12px",
            fontWeight: "600",
            cursor: zoom >= 3 ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.2s",
          }}
        >
          <ZoomIn size={14} />
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleReset}
          disabled={zoom === 1 && dragOffset.x === 0 && dragOffset.y === 0}
          style={{
            padding: "6px 10px",
            backgroundColor:
              zoom === 1 && dragOffset.x === 0 && dragOffset.y === 0
                ? "rgba(100, 100, 100, 0.2)"
                : "rgba(200, 169, 126, 0.1)",
            border:
              zoom === 1 && dragOffset.x === 0 && dragOffset.y === 0
                ? "1px solid #444"
                : "1px solid #c8a97e",
            borderRadius: "3px",
            color:
              zoom === 1 && dragOffset.x === 0 && dragOffset.y === 0
                ? "#666"
                : "#c8a97e",
            fontSize: "12px",
            fontWeight: "600",
            cursor:
              zoom === 1 && dragOffset.x === 0 && dragOffset.y === 0
                ? "not-allowed"
                : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            transition: "all 0.2s",
          }}
        >
          <Maximize2 size={14} /> Reset
        </button>
      </div>

      {/* Image Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          width: "100%",
          maxWidth: `${maxWidth}px`,
          maxHeight: `${maxHeight}px`,
          overflow: "hidden",
          backgroundColor: "#0a0a0a",
          borderRadius: "6px",
          border: "1px solid #333",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          userSelect: "none",
        }}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          onLoad={onImageLoaded}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            transform: `scale(${zoom}) translate(${constrainedOffset.x}px, ${constrainedOffset.y}px)`,
            transition: isDragging ? "none" : "transform 0.15s ease-out",
            transformOrigin: "center",
          }}
          draggable={false}
        />
      </div>

      {/* Helper text */}
      <div
        style={{
          fontSize: "11px",
          color: "#666",
          textAlign: "center",
          marginTop: "-6px",
        }}
      >
        {zoom > 1 ? "Drag to pan • " : ""}
        Use scroll wheel to zoom or click buttons above
      </div>
    </div>
  );
}
