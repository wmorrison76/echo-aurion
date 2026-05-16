import React, { useState, useRef, useEffect } from "react";
import { X, Pin, PinOff, GripHorizontal, Lock, LockOpen } from "lucide-react";
import { cn } from "@/lib/glass";
import { MiniPanelManager, MiniPanelConfig } from "@/lib/mini-panel-storage";

interface InlineMiniPanelProps {
  config: MiniPanelConfig;
  children: React.ReactNode;
  onClose: (id: string) => void;
  onBringToFront: (id: string) => number | null;
  layoutMode?: "cascade" | "grid";
  containerHeight: number;
  containerWidth: number;
  containerTop?: number; // Top position of the container for bounds checking
}

export function InlineMiniPanel({
  config,
  children,
  onClose,
  onBringToFront,
  layoutMode = "cascade",
  containerHeight,
  containerWidth,
  containerTop = 0,
}: InlineMiniPanelProps) {
  const [isMinimized, setIsMinimized] = useState(config.isMinimized);
  const [isPinned, setIsPinned] = useState(config.isPinned);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState(config.position);
  const [size, setSize] = useState(config.size);
  const [isLocked, setIsLocked] = useState(false);
  const [localZIndex, setLocalZIndex] = useState(config.zIndex ?? 30000); // Manual lock independent of layout mode
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    MiniPanelManager.setMinimized(config.id, isMinimized);
  }, [isMinimized, config.id]);

  useEffect(() => {
    MiniPanelManager.setPinned(config.id, isPinned);
  }, [isPinned, config.id]);

  // Sync position from config when it changes (e.g., layout mode switch)
  useEffect(() => {
    setPosition(config.position);
  }, [config.position, layoutMode]);

  // Sync size from config when it changes
  useEffect(() => {
    setSize(config.size);
  }, [config.size]);

  // Sync z-index from config when it changes (from storage updates)
  useEffect(() => {
    setLocalZIndex(config.zIndex ?? 30000);
  }, [config.zIndex]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) {
      return;
    }

    const nextZ = onBringToFront(config.id);
    if (nextZ != null) {
      setLocalZIndex(nextZ);
      // Force immediate style update for visual responsiveness
      if (panelRef.current) {
        panelRef.current.style.zIndex = String(nextZ);
      }
    }

    // Disable dragging in cascade mode (grid mode has dragging disabled at container level)
    if (layoutMode === "cascade" || isLocked) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startPos = position;
    let currentPos = startPos;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      // Allow free movement - no boundary constraints
      // Panels can be dragged anywhere on the page
      const newX = startPos.x + deltaX;
      const newY = startPos.y + deltaY;

      currentPos = { x: newX, y: newY };
      setPosition(currentPos);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Check if panel has been dragged outside the container bounds
      const panelBottom = currentPos.y + config.size.height;
      const containerBottom = containerTop + containerHeight;
      const isDraggedOutside =
        currentPos.y < containerTop || panelBottom > containerBottom;

      if (isDraggedOutside && !config.isFloating) {
        // Panel has been dragged outside - mark it as floating
        MiniPanelManager.setFloating(config.id, true);
      } else if (!isDraggedOutside && config.isFloating) {
        // Panel has been dragged back inside - unmark it as floating
        MiniPanelManager.setFloating(config.id, false);
      }

      // Save position to storage
      MiniPanelManager.updatePosition(config.id, currentPos);

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleHeaderClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextZ = onBringToFront(config.id);
    if (nextZ != null) {
      setLocalZIndex(nextZ);
      // Force immediate style update for visual responsiveness
      if (panelRef.current) {
        panelRef.current.style.zIndex = String(nextZ);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        id: config.id,
        panelId: config.panelId,
        title: config.title,
        type: "mini-panel",
        size: config.size,
      }),
    );
  };

  const toggleMinimize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  const togglePin = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPinned(!isPinned);
  };

  const getCursorStyle = (direction: string): string => {
    if (direction.includes("nw")) return "nw-resize";
    if (direction.includes("ne")) return "ne-resize";
    if (direction.includes("sw")) return "sw-resize";
    if (direction.includes("se")) return "se-resize";
    if (direction.includes("n") || direction.includes("s")) return "ns-resize";
    if (direction.includes("e") || direction.includes("w")) return "ew-resize";
    return "default";
  };

  const handleResizeStart = (
    e: React.MouseEvent,
    direction: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw",
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const nextZ = onBringToFront(config.id);
    if (nextZ != null) {
      setLocalZIndex(nextZ);
    }

    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;
    const startPosX = position.x;
    const startPosY = position.y;
    const minWidth = 200;
    const minHeight = 150;

    // Prevent cursor flickering during resize
    document.body.style.userSelect = "none";
    document.body.style.cursor = getCursorStyle(direction);

    let nextSize = { width: startWidth, height: startHeight };
    let nextPos = { x: startPosX, y: startPosY };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newPosX = startPosX;
      let newPosY = startPosY;

      // Horizontal resize
      if (direction.includes("e")) {
        newWidth = Math.max(minWidth, startWidth + deltaX);
      } else if (direction.includes("w")) {
        newWidth = Math.max(minWidth, startWidth - deltaX);
        if (newWidth > minWidth) {
          newPosX = startPosX + deltaX;
        }
      }

      // Vertical resize
      if (direction.includes("s")) {
        newHeight = Math.max(minHeight, startHeight + deltaY);
      } else if (direction.includes("n")) {
        newHeight = Math.max(minHeight, startHeight - deltaY);
        if (newHeight > minHeight) {
          newPosY = startPosY + deltaY;
        }
      }

      nextSize = { width: newWidth, height: newHeight };
      nextPos = { x: newPosX, y: newPosY };
      setSize(nextSize);
      setPosition(nextPos);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Restore normal cursor and selection
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // Save size and position to storage
      MiniPanelManager.updateSize(config.id, nextSize);
      MiniPanelManager.updatePosition(config.id, nextPos);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  // Use absolute positioning for floating or cascade mode, relative for grid docked
  const positionClass =
    config.isFloating || layoutMode === "cascade" ? "absolute" : "relative";

  return (
    <div
      ref={panelRef}
      className={cn(
        positionClass,
        "bg-background/75 backdrop-blur-xl border border-border/40 rounded-xl overflow-hidden flex flex-col",
        isDragging
          ? "shadow-2xl opacity-95 transition-none"
          : "hover:shadow-lg transition-all duration-200",
        isPinned && "ring-1 ring-primary/50 border-primary/30",
      )}
      style={{
        left:
          config.isFloating || layoutMode === "cascade"
            ? `${position.x}px`
            : "auto",
        top:
          config.isFloating || layoutMode === "cascade"
            ? `${position.y}px`
            : "auto",
        width: `${size.width}px`,
        height: isMinimized ? "auto" : `${size.height}px`,
        zIndex: localZIndex,
        transition:
          isDragging || isResizing
            ? "none"
            : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        willChange:
          isDragging || isResizing
            ? "transform, left, top, width, height"
            : "auto",
        backfaceVisibility: "hidden",
        WebkitFontSmoothing: "antialiased",
      }}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-drag]")) {
          e.stopPropagation();
          return;
        }
        const nextZ = onBringToFront(config.id);
        if (nextZ != null) {
          setLocalZIndex(nextZ);
          // Force immediate style update for visual responsiveness
          if (panelRef.current) {
            panelRef.current.style.zIndex = String(nextZ);
          }
        }
      }}
    >
      {/* Title Bar */}
      <div
        onMouseDown={handleMouseDown}
        onDragStart={handleDragStart}
        draggable={true}
        className={cn(
          "flex items-center justify-between gap-2 px-2 py-1.5 bg-gradient-to-r from-primary/10 to-transparent border-b border-border/30 select-none flex-shrink-0",
          layoutMode === "grid"
            ? "cursor-default"
            : isDragging
              ? "cursor-grabbing"
              : "cursor-grab",
          "touch-none", // Prevent touch drag interference
        )}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <GripHorizontal
            size={14}
            className="text-foreground/40 flex-shrink-0"
          />
          <h3 className="text-xs font-semibold truncate text-foreground">
            {config.title}
          </h3>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5 flex-shrink-0" data-no-drag>
          <button
            onClick={toggleMinimize}
            className="p-1 hover:bg-primary/20 rounded transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
            type="button"
          >
            <span className="text-xs font-bold">{isMinimized ? "+" : "−"}</span>
          </button>

          {!isPinned && (
            <button
              onClick={togglePin}
              className="p-1 hover:bg-primary/20 rounded transition-colors"
              title="Pin panel"
              type="button"
            >
              <PinOff size={12} className="text-foreground/50" />
            </button>
          )}

          {isPinned && (
            <button
              onClick={togglePin}
              className="p-1 hover:bg-primary/20 rounded transition-colors"
              title="Unpin panel"
              type="button"
            >
              <Pin size={12} className="text-primary" />
            </button>
          )}

          {isLocked ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsLocked(false);
              }}
              className="p-1 hover:bg-amber-500/20 rounded transition-colors"
              title="Unlock panel"
              type="button"
            >
              <Lock size={12} className="text-amber-500" />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsLocked(true);
              }}
              className="p-1 hover:bg-amber-500/20 rounded transition-colors"
              title="Lock panel"
              type="button"
            >
              <LockOpen size={12} className="text-foreground/40" />
            </button>
          )}

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose(config.id);
            }}
            className="p-1 hover:bg-red-500/20 rounded transition-colors"
            title="Close panel"
            type="button"
          >
            <X size={12} className="text-red-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="flex-1 overflow-auto p-2 min-h-0">{children}</div>
      )}

      {/* Resize Handles - 8 points (4 corners + 4 edges) */}
      {!isMinimized && (layoutMode === "cascade" || config.isFloating) && (
        <>
          {/* Corner Handles */}
          {/* Top-Left */}
          <div
            onMouseDown={(e) => handleResizeStart(e, "nw")}
            className="absolute top-0 left-0 w-3 h-3 bg-primary/20 hover:bg-primary/50 cursor-nw-resize"
            title="Resize (top-left)"
            style={{ borderRadius: "2px 0 6px 0" }}
          />
          {/* Top-Right */}
          <div
            onMouseDown={(e) => handleResizeStart(e, "ne")}
            className="absolute top-0 right-0 w-3 h-3 bg-primary/20 hover:bg-primary/50 cursor-ne-resize"
            title="Resize (top-right)"
            style={{ borderRadius: "0 2px 0 6px" }}
          />
          {/* Bottom-Left */}
          <div
            onMouseDown={(e) => handleResizeStart(e, "sw")}
            className="absolute bottom-0 left-0 w-3 h-3 bg-primary/20 hover:bg-primary/50 cursor-sw-resize"
            title="Resize (bottom-left)"
            style={{ borderRadius: "6px 0 0 2px" }}
          />
          {/* Bottom-Right */}
          <div
            onMouseDown={(e) => handleResizeStart(e, "se")}
            className="absolute bottom-0 right-0 w-3 h-3 bg-primary/20 hover:bg-primary/50 cursor-se-resize"
            title="Resize (bottom-right)"
            style={{ borderRadius: "0 6px 2px 0" }}
          />

          {/* Edge Handles */}
          {/* Top */}
          <div
            onMouseDown={(e) => handleResizeStart(e, "n")}
            className="absolute top-0 left-1/4 right-1/4 h-2 bg-primary/10 hover:bg-primary/30 cursor-ns-resize"
            title="Resize (top)"
          />
          {/* Bottom */}
          <div
            onMouseDown={(e) => handleResizeStart(e, "s")}
            className="absolute bottom-0 left-1/4 right-1/4 h-2 bg-primary/10 hover:bg-primary/30 cursor-ns-resize"
            title="Resize (bottom)"
          />
          {/* Left */}
          <div
            onMouseDown={(e) => handleResizeStart(e, "w")}
            className="absolute top-0 bottom-0 left-0 w-3 bg-primary/10 hover:bg-primary/30 cursor-ew-resize"
            title="Resize (left)"
          />
          {/* Right */}
          <div
            onMouseDown={(e) => handleResizeStart(e, "e")}
            className="absolute top-0 bottom-0 right-0 w-3 bg-primary/10 hover:bg-primary/30 cursor-ew-resize"
            title="Resize (right)"
          />
        </>
      )}
    </div>
  );
}
