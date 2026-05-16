import React, { useEffect, useRef, useState } from "react";
import { Grid3x3, LogOut, X } from "lucide-react";
import { cn } from "@/lib/glass";
import { MiniPanelManager } from "@/lib/mini-panel-storage";
import { renderWidgetIcon } from "@/lib/widget-icons";

interface DraggableDashboardWidgetProps {
  id: string;
  title: string;
  icon?: string;
  children: React.ReactNode;
  onClose?: (id: string) => void;
  onSnapToGrid?: (id: string) => void;
  onPopOut?: (id: string) => void;
  userId: string;
  layoutMode?: "grid" | "cascade";
  cascadeIndex?: number;
}

interface WidgetPosition {
  x: number;
  y: number;
}

interface WidgetSize {
  width: number;
  height: number;
}

const DEFAULT_SIZE: WidgetSize = { width: 175, height: 175 };
const MIN_SIZE: WidgetSize = { width: 140, height: 120 };
const MAX_SIZE: WidgetSize = { width: 640, height: 640 };
const HEADER_HEIGHT = 28;
const GRID_GAP = 16;
const GRID_PADDING_X = 16;
const GRID_PADDING_Y = 16;

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const getCursorForResize = (direction: ResizeDirection) => {
  if (direction === "n" || direction === "s") return "ns-resize";
  if (direction === "e" || direction === "w") return "ew-resize";
  if (direction === "ne" || direction === "sw") return "nesw-resize";
  return "nwse-resize";
};

export function DraggableDashboardWidget({
  id,
  title,
  icon,
  children,
  onClose,
  onSnapToGrid,
  onPopOut,
  userId,
  layoutMode = "grid",
  cascadeIndex = 0,
}: DraggableDashboardWidgetProps) {
  const getCascadePosition = (index: number): WidgetPosition => {
    const offset = 30;
    const startX = 50;
    const startY = 50;
    return {
      x: startX + index * offset,
      y: startY + index * offset,
    };
  };

  const getGridPosition = (index: number): WidgetPosition => {
    const WIDGET_WIDTH = DEFAULT_SIZE.width + GRID_GAP;
    const WIDGET_HEIGHT = DEFAULT_SIZE.height + HEADER_HEIGHT + GRID_GAP;
    const availableWidth = Math.max(
      320,
      window.innerWidth - GRID_PADDING_X * 2,
    );
    const cols = Math.max(
      1,
      Math.floor((availableWidth + GRID_GAP) / WIDGET_WIDTH),
    );
    const row = Math.floor(index / cols);
    const col = index % cols;

    return {
      x: GRID_PADDING_X + col * WIDGET_WIDTH,
      y: GRID_PADDING_Y + row * WIDGET_HEIGHT,
    };
  };

  const sizeKey = `dashboard-widget-size-${userId}-${id}`;
  const posKey = `dashboard-widget-pos-${userId}-${id}`;

  const [size, setSize] = useState<WidgetSize>(() => {
    const saved = localStorage.getItem(sizeKey);
    if (!saved) return DEFAULT_SIZE;
    try {
      const parsed = JSON.parse(saved) as Partial<WidgetSize>;
      const width = Number(parsed.width);
      const height = Number(parsed.height);
      if (!Number.isFinite(width) || !Number.isFinite(height))
        return DEFAULT_SIZE;
      return {
        width: Math.max(
          MIN_SIZE.width,
          Math.min(MAX_SIZE.width, Math.round(width)),
        ),
        height: Math.max(
          MIN_SIZE.height,
          Math.min(MAX_SIZE.height, Math.round(height)),
        ),
      };
    } catch {
      return DEFAULT_SIZE;
    }
  });

  const [position, setPosition] = useState<WidgetPosition>(() => {
    if (layoutMode === "cascade") {
      return getCascadePosition(cascadeIndex);
    }

    const saved = localStorage.getItem(posKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return getGridPosition(cascadeIndex);
      }
    }

    return getGridPosition(cascadeIndex);
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [isResizing, setIsResizing] = useState(false);
  const [localZIndex, setLocalZIndex] = useState(30000);
  const rafRef = useRef<number | null>(null);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (layoutMode === "cascade") {
      setPosition(getCascadePosition(cascadeIndex));
      return;
    }

    const saved = localStorage.getItem(posKey);
    if (saved) {
      try {
        setPosition(JSON.parse(saved));
        return;
      } catch {
        setPosition(getGridPosition(cascadeIndex));
        return;
      }
    }

    setPosition(getGridPosition(cascadeIndex));
  }, [layoutMode, cascadeIndex, posKey]);

  // Listen for mini panel updates and sync z-index
  useEffect(() => {
    const handleMiniPanelsUpdated = (event: Event) => {
      const customEvent = event as CustomEvent;
      const panels = customEvent.detail.panels;
      const panelId = `dashboard-widget-${id}`;
      const panel = panels.find((p: any) => p.id === panelId);
      if (panel && panel.zIndex) {
        setLocalZIndex(panel.zIndex);
      }
    };

    window.addEventListener("mini-panels-updated", handleMiniPanelsUpdated);
    return () =>
      window.removeEventListener(
        "mini-panels-updated",
        handleMiniPanelsUpdated,
      );
  }, [id]);

  useEffect(() => {
    if (isDragging || isResizing) return;
    const timeout = window.setTimeout(() => {
      localStorage.setItem(posKey, JSON.stringify(position));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [position, isDragging, isResizing, posKey]);

  useEffect(() => {
    if (isDragging || isResizing) return;
    const timeout = window.setTimeout(() => {
      localStorage.setItem(sizeKey, JSON.stringify(size));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [size, isDragging, isResizing, sizeKey]);

  const handleSnapToGrid = () => {
    const gridPos = getGridPosition(cascadeIndex);
    setPosition(gridPos);
    localStorage.setItem(posKey, JSON.stringify(gridPos));
    onSnapToGrid?.(id);
  };

  const handlePopOut = () => {
    onPopOut?.(id);
  };

  const bringWidgetToFront = () => {
    // Create a temporary mini panel entry to track z-index
    const panelId = `dashboard-widget-${id}`;
    const allPanels = MiniPanelManager.getAllMiniPanels();
    const existingPanel = allPanels.find((p) => p.id === panelId);

    if (!existingPanel) {
      // Create a new mini panel entry for this widget
      const newPanel = MiniPanelManager.createMiniPanel(id, title);
      setLocalZIndex(newPanel.zIndex ?? 30000);
      if (widgetRef.current) {
        widgetRef.current.style.zIndex = String(newPanel.zIndex ?? 30000);
      }
    } else {
      // Bring existing panel to front
      const nextZ = MiniPanelManager.bringToFront(panelId);
      if (nextZ !== null) {
        setLocalZIndex(nextZ);
        if (widgetRef.current) {
          widgetRef.current.style.zIndex = String(nextZ);
        }
      }
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    if (layoutMode === "cascade" || isResizing) {
      return;
    }

    if ((e.target as HTMLElement).closest("[data-no-drag]")) {
      return;
    }

    bringWidgetToFront();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    if (!isDragging || !dragStart) return;

    const onMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    };

    const onUp = () => {
      setIsDragging(false);
      setDragStart(null);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);

    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, dragStart]);

  const handleResizePointerDown = (
    e: React.PointerEvent,
    direction: ResizeDirection,
  ) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    bringWidgetToFront();
    document.body.style.userSelect = "none";
    document.body.style.cursor = getCursorForResize(direction);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;
    const startLeft = position.x;
    const startTop = position.y;

    let nextSize: WidgetSize = size;
    let nextPosition: WidgetPosition = position;

    const onMove = (ev: PointerEvent) => {
      const deltaX = ev.clientX - startX;
      const deltaY = ev.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startLeft;
      let newY = startTop;

      if (direction.includes("e")) {
        newWidth = Math.max(
          MIN_SIZE.width,
          Math.min(MAX_SIZE.width, Math.round(startWidth + deltaX)),
        );
      }

      if (direction.includes("w")) {
        newWidth = Math.max(
          MIN_SIZE.width,
          Math.min(MAX_SIZE.width, Math.round(startWidth - deltaX)),
        );
        newX = startLeft + (startWidth - newWidth);
      }

      if (direction.includes("s")) {
        newHeight = Math.max(
          MIN_SIZE.height,
          Math.min(MAX_SIZE.height, Math.round(startHeight + deltaY)),
        );
      }

      if (direction.includes("n")) {
        newHeight = Math.max(
          MIN_SIZE.height,
          Math.min(MAX_SIZE.height, Math.round(startHeight - deltaY)),
        );
        newY = startTop + (startHeight - newHeight);
      }

      nextSize = { width: newWidth, height: newHeight };
      nextPosition = {
        x: Math.max(0, Math.round(newX)),
        y: Math.max(0, Math.round(newY)),
      };

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        setSize(nextSize);
        setPosition(nextPosition);
      });
    };

    const onUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={widgetRef}
      className={cn(
        "group absolute overflow-hidden rounded-xl border border-border/40 bg-background/70 backdrop-blur-xl shadow-md transition-shadow",
        "hover:shadow-xl",
        isDragging && "shadow-2xl",
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height + HEADER_HEIGHT}px`,
        zIndex: localZIndex,
      }}
      onPointerDown={(e) => {
        // Bring widget to front on any pointer interaction
        if (!(e.target as HTMLElement).closest("[data-no-drag]")) {
          bringWidgetToFront();
        }
      }}
    >
      <div
        draggable={layoutMode === "grid"}
        onMouseDown={handleDragStart}
        className={cn(
          "flex items-center justify-between gap-2 border-b border-border/30 bg-gradient-to-r from-primary/10 to-transparent px-2",
          layoutMode === "grid"
            ? isDragging
              ? "cursor-grabbing"
              : "cursor-grab active:cursor-grabbing"
            : "cursor-default opacity-80",
        )}
        style={{ height: `${HEADER_HEIGHT}px` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          {icon && (
            <div className="flex-shrink-0">
              {renderWidgetIcon(id, icon, "sm")}
            </div>
          )}
          <h4 className="min-w-0 truncate text-[11px] font-semibold text-foreground/90">
            {title}
          </h4>
        </div>

        <div className="flex items-center gap-0.5" data-no-drag>
          {layoutMode === "grid" && onSnapToGrid && (
            <button
              onClick={handleSnapToGrid}
              className="rounded-md p-1 text-blue-500/90 hover:bg-blue-500/15"
              title="Snap to grid"
              type="button"
            >
              <Grid3x3 size={12} />
            </button>
          )}
          {onPopOut && (
            <button
              onClick={handlePopOut}
              className="rounded-md p-1 text-purple-500/90 hover:bg-purple-500/15"
              title="Pop out widget"
              type="button"
            >
              <LogOut size={12} />
            </button>
          )}
          {onClose && (
            <button
              onClick={() => onClose(id)}
              className="rounded-md p-1 text-red-500/90 hover:bg-red-500/15"
              title="Close widget"
              type="button"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div
        className="min-h-0 overflow-hidden"
        style={{ height: `${size.height}px` }}
      >
        {children}
      </div>

      {/* Resize handles (4 corners + 4 edges) */}
      <div
        data-no-drag
        onPointerDown={(e) => handleResizePointerDown(e, "nw")}
        className="absolute top-0 left-0 w-3 h-3 bg-primary/40 hover:bg-primary/80 cursor-nw-resize transition-colors"
        title="Resize (top-left)"
        style={{ borderRadius: "2px 0 6px 0" }}
      />
      <div
        data-no-drag
        onPointerDown={(e) => handleResizePointerDown(e, "ne")}
        className="absolute top-0 right-0 w-3 h-3 bg-primary/40 hover:bg-primary/80 cursor-ne-resize transition-colors"
        title="Resize (top-right)"
        style={{ borderRadius: "0 2px 0 6px" }}
      />
      <div
        data-no-drag
        onPointerDown={(e) => handleResizePointerDown(e, "sw")}
        className="absolute bottom-0 left-0 w-3 h-3 bg-primary/40 hover:bg-primary/80 cursor-sw-resize transition-colors"
        title="Resize (bottom-left)"
        style={{ borderRadius: "6px 0 0 2px" }}
      />
      <div
        data-no-drag
        onPointerDown={(e) => handleResizePointerDown(e, "se")}
        className="absolute bottom-0 right-0 w-3 h-3 bg-primary/40 hover:bg-primary/80 cursor-se-resize transition-colors"
        title="Resize (bottom-right)"
        style={{ borderRadius: "0 6px 2px 0" }}
      />
      <div
        data-no-drag
        onPointerDown={(e) => handleResizePointerDown(e, "n")}
        className="absolute top-0 left-2 right-2 h-2 hover:bg-primary/60 cursor-ns-resize transition-colors"
        title="Resize (top)"
      />
      <div
        data-no-drag
        onPointerDown={(e) => handleResizePointerDown(e, "s")}
        className="absolute bottom-0 left-2 right-2 h-2 hover:bg-primary/60 cursor-ns-resize transition-colors"
        title="Resize (bottom)"
      />
      <div
        data-no-drag
        onPointerDown={(e) => handleResizePointerDown(e, "w")}
        className="absolute top-2 bottom-2 left-0 w-2 hover:bg-primary/50 cursor-ew-resize transition-colors"
        title="Resize (left)"
      />
      <div
        data-no-drag
        onPointerDown={(e) => handleResizePointerDown(e, "e")}
        className="absolute top-2 bottom-2 right-0 w-2 hover:bg-primary/50 cursor-ew-resize transition-colors"
        title="Resize (right)"
      />
    </div>
  );
}
