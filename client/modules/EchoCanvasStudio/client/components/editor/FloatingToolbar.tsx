import React, { useState, useRef } from "react";
import { X, GripHorizontal } from "lucide-react";
interface FloatingToolbarProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  defaultPosition?: { x: number; y: number };
}
export default function FloatingToolbar({
  title,
  children,
  onClose,
  defaultPosition = { x: 100, y: 300 },
}: FloatingToolbarProps) {
  const [position, setPosition] = useState(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
  };
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        backgroundColor: "#0b0f1a",
        border: "1px solid #444",
        borderRadius: "8px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        zIndex: 1000,
        minWidth: "200px",
        userSelect: isDragging ? "none" : "auto",
      }}
    >
      {" "}
      {/* Title Bar */}{" "}
      <div
        onMouseDown={handleMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 12px",
          borderBottom: "1px solid #444",
          cursor: isDragging ? "grabbing" : "grab",
          backgroundColor: "rgba(200, 169, 126, 0.05)",
        }}
      >
        {" "}
        <GripHorizontal
          size={14}
          style={{ color: "#c8a97e", opacity: 0.5 }}
        />{" "}
        <span
          style={{
            flex: 1,
            fontSize: "11px",
            fontWeight: "600",
            color: "#c8a97e",
          }}
        >
          {" "}
          {title}{" "}
        </span>{" "}
        <button
          onClick={onClose}
          data-no-drag
          style={{
            background: "none",
            border: "none",
            color: "#c8a97e",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
          }}
        >
          {" "}
          <X size={14} />{" "}
        </button>{" "}
      </div>{" "}
      {/* Content */} <div style={{ padding: "12px" }}>{children}</div>{" "}
    </div>
  );
}
