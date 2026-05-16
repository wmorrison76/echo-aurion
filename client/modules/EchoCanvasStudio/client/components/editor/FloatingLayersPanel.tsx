import React, { useState, useRef, useEffect } from "react";
import { GripHorizontal } from "lucide-react";
import VirtualizedLayersPanel, { type Layer } from "./VirtualizedLayersPanel";

interface FloatingLayersPanelProps {
  layers: Layer[];
  selectedLayer: string;
  onLayerSelect: (layerId: string) => void;
  onLayerAdd: () => void;
  onLayerDelete: (layerId: string) => void;
  onLayerToggleVisibility: (layerId: string) => void;
  onLayerToggleLock: (layerId: string) => void;
  onLayerOpacityChange: (layerId: string, opacity: number) => void;
  onLayerAddMask?: (layerId: string) => void;
  onLayerRemoveMask?: (layerId: string) => void;
  onLayerToggleMaskVisibility?: (layerId: string) => void;
  onLayerMove?: (fromIndex: number, toIndex: number) => void;
}

export default function FloatingLayersPanel({
  layers,
  selectedLayer,
  onLayerSelect,
  onLayerAdd,
  onLayerDelete,
  onLayerToggleVisibility,
  onLayerToggleLock,
  onLayerOpacityChange,
  onLayerAddMask,
  onLayerRemoveMask,
  onLayerToggleMaskVisibility,
  onLayerMove,
}: FloatingLayersPanelProps) {
  const STORAGE_KEY = "floatingLayersPanelPosition";
  const DEFAULT_POSITION = { x: 16, y: 120 };

  const loadPosition = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_POSITION;
    } catch {
      return DEFAULT_POSITION;
    }
  };

  const [position, setPosition] = useState(loadPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [zIndex, setZIndex] = useState(500);
  const containerRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(loadPosition());
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;

    setZIndex(9999);
    setIsDragging(true);

    dragOffsetRef.current = {
      x: e.clientX - positionRef.current.x,
      y: e.clientY - positionRef.current.y,
    };
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const newPosition = {
          x: e.clientX - dragOffsetRef.current.x,
          y: e.clientY - dragOffsetRef.current.y,
        };

        positionRef.current = newPosition;
        setPosition(newPosition);
        rafRef.current = null;
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: "140px",
        height: "400px",
        backgroundColor: "#0a0a0a",
        border: "1px solid #333",
        borderRadius: "8px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        zIndex: zIndex,
        userSelect: isDragging ? "none" : "auto",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        willChange: isDragging ? "transform" : "auto",
      }}
    >
      {/* Drag Handle */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px",
          borderBottom: "1px solid #444",
          cursor: isDragging ? "grabbing" : "grab",
          backgroundColor: "rgba(200, 169, 126, 0.05)",
          borderTopLeftRadius: "8px",
          borderTopRightRadius: "8px",
          userSelect: "none",
        }}
      >
        <GripHorizontal size={12} style={{ color: "#c8a97e" }} />
        <span style={{ color: "#c8a97e", fontSize: "10px", fontWeight: "600" }}>
          LAYERS
        </span>
      </div>

      {/* Layers Panel Content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <VirtualizedLayersPanel
          layers={layers}
          selectedLayer={selectedLayer}
          onLayerSelect={onLayerSelect}
          onLayerAdd={onLayerAdd}
          onLayerDelete={onLayerDelete}
          onLayerToggleVisibility={onLayerToggleVisibility}
          onLayerToggleLock={onLayerToggleLock}
          onLayerOpacityChange={onLayerOpacityChange}
          onLayerAddMask={onLayerAddMask}
          onLayerRemoveMask={onLayerRemoveMask}
          onLayerToggleMaskVisibility={onLayerToggleMaskVisibility}
          onLayerMove={onLayerMove}
          enableVirtualization={true}
        />
      </div>
    </div>
  );
}
