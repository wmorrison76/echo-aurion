import React, { useState, useRef, useEffect } from "react";
import { GripVertical, X, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/glass";
import { MiniPanelManager, MiniPanelConfig } from "@/lib/mini-panel-storage";

interface MiniPanelProps {
  config: MiniPanelConfig;
  children: React.ReactNode;
  onClose: (id: string) => void;
}

export function MiniPanel({ config, children, onClose }: MiniPanelProps) {
  const [position, setPosition] = useState(config.position);
  const [size, setSize] = useState(config.size);
  const [isMinimized, setIsMinimized] = useState(config.isMinimized);
  const [isPinned, setIsPinned] = useState(config.isPinned);
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggedOutside, setIsDraggedOutside] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [isResizing, setIsResizing] = useState(false);
  const [localZIndex, setLocalZIndex] = useState(config.zIndex ?? 30000);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<boolean>(false);

  // Persist only after interaction ends (reduces storage churn during drag/resize)
  useEffect(() => {
    if (isDragging || isResizing) return;
    MiniPanelManager.updatePosition(config.id, position);
  }, [config.id, isDragging, isResizing, position]);

  useEffect(() => {
    if (isDragging || isResizing) return;
    MiniPanelManager.updateSize(config.id, size);
  }, [config.id, isDragging, isResizing, size]);

  // Update localStorage when pin state changes
  useEffect(() => {
    MiniPanelManager.setPinned(config.id, isPinned);
  }, [isPinned, config.id]);

  // Update localStorage when minimized state changes
  useEffect(() => {
    MiniPanelManager.setMinimized(config.id, isMinimized);
  }, [isMinimized, config.id]);

  // Sync z-index from config when it changes (from storage updates)
  useEffect(() => {
    setLocalZIndex(config.zIndex ?? 30000);
  }, [config.zIndex]);

  const handleDragStart = (e: React.DragEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) {
      e.preventDefault();
      return;
    }
    // Set drag data for whiteboard/chat drop
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        id: config.id,
        title: config.title,
        panelId: config.panelId,
        type: "mini-panel",
        config: config,
        size: config.size,
      }),
    );

    // Add drag image with better visual feedback
    const img = new Image();
    img.src =
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%230ea5e9' rx='6' opacity='0.9'/%3E%3Ctext x='60' y='40' text-anchor='middle' dy='.3em' fill='white' font-size='14' font-family='Arial' font-weight='bold'%3E" +
      encodeURIComponent(config.title || "Panel") +
      "%3C/text%3E%3Ctext x='60' y='55' text-anchor='middle' dy='.3em' fill='white' font-size='10' font-family='Arial'%3EDrop on Whiteboard or Chat%3C/text%3E%3C/svg%3E";
    e.dataTransfer.setDragImage(img, 60, 40);
    
    // Add visual feedback during drag
    if (panelRef.current) {
      panelRef.current.style.opacity = "0.7";
      panelRef.current.style.transform = "scale(0.95)";
    }
  };

  const handleDragEnd = () => {
    // Restore visual state after drag
    if (panelRef.current) {
      panelRef.current.style.opacity = "";
      panelRef.current.style.transform = "";
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if ((e.target as HTMLElement).closest("[data-no-drag]")) {
      return;
    }

    dragRef.current = true;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });

    // Bring to top immediately on interaction
    const nextZ = MiniPanelManager.bringToFront(config.id);
    if (nextZ != null) {
      setLocalZIndex(nextZ);
      // Force immediate style update for visual responsiveness
      if (panelRef.current) {
        panelRef.current.style.zIndex = String(nextZ);
      }
    }
  };

  useEffect(() => {
    if (!dragRef.current || !dragStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current || !dragStart) return;

      // iter265 · Allow panels to drag past viewport edge per operator request.
      // Keep a small portion (60px) always visible so the panel can never be
      // fully lost off-screen. Floor at -size+60 (panel mostly off the left),
      // ceil at innerWidth-60 (handle still visible on the right).
      const minVisible = 60;
      const newX = Math.max(
        -(size.width - minVisible),
        Math.min(e.clientX - dragStart.x, window.innerWidth - minVisible),
      );
      const newY = Math.max(
        0, // never above 0 — top is reserved for toolbar
        Math.min(e.clientY - dragStart.y, window.innerHeight - minVisible),
      );

      setPosition({
        x: newX,
        y: newY,
      });

      // Check if dragging outside dashboard area
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const dashboardAreas = document.querySelectorAll(
          "[data-dashboard-area], .dashboard-widget-container, [role='main']",
        );
        let isInsideDashboard = false;

        for (const area of dashboardAreas) {
          const areaRect = (area as HTMLElement).getBoundingClientRect();
          if (
            rect.right > areaRect.left &&
            rect.left < areaRect.right &&
            rect.bottom > areaRect.top &&
            rect.top < areaRect.bottom
          ) {
            isInsideDashboard = true;
            break;
          }
        }

        setIsDraggedOutside(!isInsideDashboard);
      }
    };

    const handleMouseUp = () => {
      if (!dragRef.current) return;

      dragRef.current = false;
      setIsDragging(false);
      setDragStart(null);
      setIsDraggedOutside(false);

      // Save position on drag end
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const currentPosition = {
          x: Math.round(rect.left),
          y: Math.round(rect.top),
        };
        MiniPanelManager.updatePosition(config.id, currentPosition);

        // Check if panel was dragged outside dashboard area and auto-pin it
        const dashboardAreas = document.querySelectorAll(
          "[data-dashboard-area], .dashboard-widget-container, [role='main']",
        );
        let isInsideDashboard = false;

        for (const area of dashboardAreas) {
          const areaRect = (area as HTMLElement).getBoundingClientRect();
          if (
            rect.right > areaRect.left &&
            rect.left < areaRect.right &&
            rect.bottom > areaRect.top &&
            rect.top < areaRect.bottom
          ) {
            isInsideDashboard = true;
            break;
          }
        }

        // Auto-pin if dragged outside dashboard
        if (!isInsideDashboard && !isPinned) {
          setIsPinned(true);
          MiniPanelManager.setPinned(config.id, true);
        }
      }

      document.removeEventListener("mousemove", handleMouseMoveThrottled);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMoveThrottled = (e: MouseEvent) => {
      requestAnimationFrame(() => handleMouseMove(e));
    };

    document.addEventListener("mousemove", handleMouseMoveThrottled, {
      passive: true,
    });
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      dragRef.current = false;
      document.removeEventListener("mousemove", handleMouseMoveThrottled);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragStart, size, isPinned]);

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

    const nextZ = MiniPanelManager.bringToFront(config.id);
    if (nextZ != null) {
      setLocalZIndex(nextZ);
      // Force immediate style update during resize
      if (panelRef.current) {
        panelRef.current.style.zIndex = String(nextZ);
      }
    }

    setIsResizing(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;
    const startPosX = position.x;
    const startPosY = position.y;
    const minWidth = 320;
    const minHeight = 240;

    // Prevent cursor flickering during resize
    document.body.style.userSelect = "none";
    document.body.style.cursor = getCursorStyle(direction);

    let frame: number | null = null;
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newPosX = startPosX;
      let newPosY = startPosY;

      if (direction.includes("e")) {
        newWidth = Math.max(minWidth, startWidth + deltaX);
      } else if (direction.includes("w")) {
        newWidth = Math.max(minWidth, startWidth - deltaX);
        if (newWidth > minWidth) {
          newPosX = startPosX + deltaX;
        }
      }

      if (direction.includes("s")) {
        newHeight = Math.max(minHeight, startHeight + deltaY);
      } else if (direction.includes("n")) {
        newHeight = Math.max(minHeight, startHeight - deltaY);
        if (newHeight > minHeight) {
          newPosY = startPosY + deltaY;
        }
      }

      if (frame) {
        cancelAnimationFrame(frame);
      }

      frame = requestAnimationFrame(() => {
        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: newPosX, y: newPosY });
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      // Restore normal cursor and selection
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // Ensure z-index is persisted after resize
      const nextZ = MiniPanelManager.bringToFront(config.id);
      if (nextZ != null && panelRef.current) {
        panelRef.current.style.zIndex = String(nextZ);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
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

  const handleHeaderDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMinimized(!isMinimized);
  };

  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only bring to front if not currently at the top
    if (panelRef.current) {
      const nextZ = MiniPanelManager.bringToFront(config.id);
      if (nextZ != null) {
        setLocalZIndex(nextZ);
        // Ensure panel is visually on top by forcing style update
        panelRef.current.style.zIndex = String(nextZ);
      }
    }
  };

  // Calculate if panel should show icon-only (very small size)
  const isIconOnly = size.width < 80 || size.height < 60;
  const displayWidth = isIconOnly ? 60 : size.width;
  const displayHeight = isIconOnly ? 60 : size.height;

  return (
    <div
      ref={panelRef}
      className={cn(
        "group fixed bg-background/80 backdrop-blur-xl border flex flex-col transition-all",
        isPinned || isDraggedOutside
          ? "ring-2 ring-primary/50 border-primary/30 shadow-2xl"
          : "border-border/50 shadow-lg hover:shadow-2xl",
        isDragging && "shadow-2xl ring-2 ring-primary/70 scale-105 z-[50000]",
        isDraggedOutside && "ring-2 ring-primary/70",
        isResizing && "cursor-se-resize",
        isIconOnly && "rounded-full",
        !isIconOnly && "rounded-lg",
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? "auto" : `${displayWidth}px`,
        height: isMinimized ? "auto" : `${displayHeight}px`,
        zIndex: localZIndex,
      }}
      onClick={handlePanelClick}
      onPointerDown={(e) => {
        // Don't process pointer down on interactive elements
        if ((e.target as HTMLElement).closest("[data-no-drag]")) {
          e.stopPropagation();
          return;
        }
        // Bring to front on any pointer interaction
        const nextZ = MiniPanelManager.bringToFront(config.id);
        if (nextZ != null) {
          setLocalZIndex(nextZ);
          if (panelRef.current) {
            panelRef.current.style.zIndex = String(nextZ);
          }
        }
      }}
    >
      {/* Title Bar */}
      {!isIconOnly ? (
        <div
          draggable={true}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onMouseDown={handleMouseDown}
          onDoubleClick={handleHeaderDoubleClick}
          className={cn(
            "flex items-center justify-between gap-2 px-2 py-1 bg-gradient-to-r from-primary/10 to-transparent border-b border-border/30 rounded-t-lg select-none",
            "hover:bg-primary/15 transition-colors",
            isDragging ? "cursor-grabbing bg-primary/20" : "cursor-grab",
          )}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <GripVertical
              size={12}
              className="text-primary/70 flex-shrink-0 cursor-grab active:cursor-grabbing"
              title="Drag to move or drop on Whiteboard/Chat"
            />
            <h3 className="text-xs font-semibold truncate text-foreground">
              {config.title}
            </h3>
            {isDraggedOutside && (
              <Pin
                size={10}
                className="text-primary flex-shrink-0"
                title="Will be pinned"
              />
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-0.5" data-no-drag>
            {!isPinned && (
              <button
                onClick={(e) => togglePin(e)}
                className="p-1 hover:bg-primary/20 rounded transition-colors"
                title="Pin panel"
                type="button"
              >
                <PinOff size={12} className="text-foreground/50" />
              </button>
            )}

            {isPinned && (
              <button
                onClick={(e) => togglePin(e)}
                className="p-1 hover:bg-primary/20 rounded transition-colors"
                title="Unpin panel"
                type="button"
              >
                <Pin size={12} className="text-primary" />
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
      ) : (
        <div
          draggable={true}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 cursor-grab active:cursor-grabbing rounded-full group relative hover:from-primary/30 hover:to-primary/20 transition-all"
          title={`${config.title} (drag to move or drop on Whiteboard/Chat)`}
        >
          <div className="text-xl opacity-80 group-hover:opacity-100 transition-opacity">
            📌
          </div>

          {/* Icon mode controls - hover */}
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
            data-no-drag
          >
            <div className="flex gap-0.5">
              <button
                onClick={(e) => togglePin(e)}
                className="p-1 bg-primary/30 hover:bg-primary/50 rounded-full transition-colors"
                title={isPinned ? "Unpin" : "Pin"}
                type="button"
              >
                {isPinned ? (
                  <Pin size={10} className="text-primary" />
                ) : (
                  <PinOff size={10} className="text-foreground/50" />
                )}
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose(config.id);
                }}
                className="p-1 bg-red-500/30 hover:bg-red-500/50 rounded-full transition-colors"
                title="Close"
                type="button"
              >
                <X size={10} className="text-red-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {!isMinimized && !isIconOnly && (
        <div className="flex-1 overflow-auto p-0 min-h-0">{children}</div>
      )}

      {!isMinimized && !isIconOnly && (
        <div
          data-no-drag
          onMouseDown={(e) => handleResizeStart(e, "se")}
          className={cn(
            "absolute bottom-1 right-1 flex h-5 w-5 items-center justify-center rounded-md",
            "border border-border/40 bg-background/60 text-foreground/60",
            "cursor-se-resize opacity-0 transition-opacity group-hover:opacity-100",
            "hover:bg-background/80",
          )}
          title="Resize"
        >
          <GripVertical className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}
