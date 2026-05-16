import React, { useState, useRef, ReactNode } from "react";
import { X, Minimize2, Maximize2 } from "lucide-react";
interface PanelPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}
interface ResizableDraggablePanelProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  onMinimize?: () => void;
  defaultPosition?: PanelPosition;
  minWidth?: number;
  minHeight?: number;
}
export default function ResizableDraggablePanel({
  title,
  children,
  onClose,
  onMinimize,
  defaultPosition = { x: 100, y: 100, width: 600, height: 700 },
  minWidth = 400,
  minHeight = 300,
}: ResizableDraggablePanelProps) {
  const [position, setPosition] = useState<PanelPosition>(defaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState<string | false>(false);
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        ...position,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      let newPos = { ...position };
      switch (isResizing) {
        case "nw":
          newPos.x += deltaX;
          newPos.y += deltaY;
          newPos.width = Math.max(minWidth, resizeStart.width - deltaX);
          newPos.height = Math.max(minHeight, resizeStart.height - deltaY);
          break;
        case "n":
          newPos.y += deltaY;
          newPos.height = Math.max(minHeight, resizeStart.height - deltaY);
          break;
        case "ne":
          newPos.y += deltaY;
          newPos.width = Math.max(minWidth, resizeStart.width + deltaX);
          newPos.height = Math.max(minHeight, resizeStart.height - deltaY);
          break;
        case "w":
          newPos.x += deltaX;
          newPos.width = Math.max(minWidth, resizeStart.width - deltaX);
          break;
        case "e":
          newPos.width = Math.max(minWidth, resizeStart.width + deltaX);
          break;
        case "sw":
          newPos.x += deltaX;
          newPos.width = Math.max(minWidth, resizeStart.width - deltaX);
          newPos.height = Math.max(minHeight, resizeStart.height + deltaY);
          break;
        case "s":
          newPos.height = Math.max(minHeight, resizeStart.height + deltaY);
          break;
        case "se":
          newPos.width = Math.max(minWidth, resizeStart.width + deltaX);
          newPos.height = Math.max(minHeight, resizeStart.height + deltaY);
          break;
      }
      setPosition(newPos);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: newPos.width,
        height: newPos.height,
      });
    }
  };
  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };
  const startResize = (e: React.MouseEvent, edge: string) => {
    e.preventDefault();
    setIsResizing(edge);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: position.width,
      height: position.height,
    });
  };
  React.useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, position, dragStart, resizeStart]);
  const resizeHandle = (position: string) => (
    <div
      onMouseDown={(e) => startResize(e, position)}
      style={{
        position: "absolute" as const,
        cursor:
          {
            nw: "nwse-resize",
            n: "ns-resize",
            ne: "nesw-resize",
            w: "ew-resize",
            e: "ew-resize",
            sw: "nesw-resize",
            s: "ns-resize",
            se: "nwse-resize",
          }[position] || "default",
        ...(position === "n" && { top: 0, left: 0, right: 0, height: "4px" }),
        ...(position === "s" && {
          bottom: 0,
          left: 0,
          right: 0,
          height: "4px",
        }),
        ...(position === "w" && { left: 0, top: 0, bottom: 0, width: "4px" }),
        ...(position === "e" && { right: 0, top: 0, bottom: 0, width: "4px" }),
        ...(position === "nw" && {
          top: 0,
          left: 0,
          width: "8px",
          height: "8px",
        }),
        ...(position === "ne" && {
          top: 0,
          right: 0,
          width: "8px",
          height: "8px",
        }),
        ...(position === "sw" && {
          bottom: 0,
          left: 0,
          width: "8px",
          height: "8px",
        }),
        ...(position === "se" && {
          bottom: 0,
          right: 0,
          width: "8px",
          height: "8px",
        }),
      }}
    />
  );
  return (
    <>
      {" "}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 999,
        }}
        onClick={onClose}
      />{" "}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${position.width}px`,
          height: `${position.height}px`,
          backgroundColor: "#0b0f1a",
          border: "1px solid #333",
          borderRadius: "8px",
          display: "flex",
          flexDirection: "column",
          zIndex: 1000,
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.8)",
        }}
      >
        {" "}
        {/* Header */}{" "}
        <div
          onMouseDown={handleMouseDown}
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #333",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#0a0a0a",
            cursor: "grab",
            userSelect: "none",
            borderRadius: "8px 8px 0 0",
          }}
        >
          {" "}
          <h2
            style={{
              margin: 0,
              color: "#c8a97e",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            {" "}
            {title}{" "}
          </h2>{" "}
          <div style={{ display: "flex", gap: "8px" }}>
            {" "}
            <button
              onClick={onMinimize}
              style={{
                background: "none",
                border: "none",
                color: "#666",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Minimize"
            >
              {" "}
              <Minimize2 size={16} />{" "}
            </button>{" "}
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#666",
                cursor: "pointer",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Close"
            >
              {" "}
              <X size={16} />{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
        {/* Content */}{" "}
        <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
          {" "}
          {children}{" "}
        </div>{" "}
        {/* Resize Handles */} {resizeHandle("n")} {resizeHandle("s")}{" "}
        {resizeHandle("w")} {resizeHandle("e")} {resizeHandle("nw")}{" "}
        {resizeHandle("ne")} {resizeHandle("sw")} {resizeHandle("se")}{" "}
      </div>{" "}
    </>
  );
}
