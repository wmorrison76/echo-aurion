import React, { useState, useEffect, useRef } from "react";
import { X, Minus, Maximize2, Pin, PinOff } from "lucide-react";
import { cn } from "@/lib/glass";

export interface PanelState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isMinimized: boolean;
  isPinned: boolean;
  zIndex: number;
}

interface FloatingPanelProps {
  id: string;
  title: string;
  children: React.ReactNode;
  initialState?: Partial<PanelState>;
  onClose?: (id: string) => void;
  onStateChange?: (state: PanelState) => void;
  className?: string;
  minWidth?: number;
  minHeight?: number;
}

const PANEL_STORAGE_KEY = "panels:positions";
const MIN_WIDTH = 300;
const MIN_HEIGHT = 200;
const GRID_SIZE = 20;

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Snap value to nearest grid
 */
function snapToGrid(value: number, gridSize: number = GRID_SIZE) {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Load panel positions from localStorage
 */
function loadPanelPositions(): Record<string, PanelState> {
  const stored = localStorage.getItem(PANEL_STORAGE_KEY);
  return stored ? JSON.parse(stored) : {};
}

/**
 * Save panel positions to localStorage
 */
function savePanelPositions(positions: Record<string, PanelState>) {
  localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(positions));
}

export const FloatingPanel = React.forwardRef<HTMLDivElement, FloatingPanelProps>(
  (
    {
      id,
      title,
      children,
      initialState,
      onClose,
      onStateChange,
      className,
      minWidth = MIN_WIDTH,
      minHeight = MIN_HEIGHT,
    },
    ref
  ) => {
    const panelRef = useRef<HTMLDivElement>(null);
    const dragRef = useRef<HTMLDivElement>(null);
    const resizeRef = useRef<HTMLDivElement>(null);

    // Initialize panel state from localStorage or defaults
    const [state, setState] = useState<PanelState>(() => {
      const stored = loadPanelPositions()[id];
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      return {
        id,
        x: stored?.x ?? snapToGrid(Math.random() * (windowWidth - 400)),
        y: stored?.y ?? snapToGrid(Math.random() * (windowHeight - 300) + 80),
        width: stored?.width ?? 400,
        height: stored?.height ?? 300,
        isMinimized: stored?.isMinimized ?? false,
        isPinned: stored?.isPinned ?? false,
        zIndex: stored?.zIndex ?? 100,
        ...initialState,
      };
    });

    // Track dragging and resizing
    const dragState = useRef<{
      isDragging: boolean;
      isResizing: boolean;
      startX: number;
      startY: number;
      startWidth: number;
      startHeight: number;
    }>({
      isDragging: false,
      isResizing: false,
      startX: 0,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
    });

    // Get all z-indexes to determine next one
    const getMaxZIndex = () => {
      const positions = loadPanelPositions();
      return Math.max(...Object.values(positions).map((p) => p.zIndex), 0) + 1;
    };

    // Handle mouse down on header (dragging)
    const handleDragStart = (e: React.MouseEvent) => {
      if (state.isPinned || (e.target as HTMLElement).closest("button")) return;

      dragState.current = {
        isDragging: true,
        isResizing: false,
        startX: e.clientX - state.x,
        startY: e.clientY - state.y,
        startWidth: state.width,
        startHeight: state.height,
      };

      // Bring to front
      if (state.zIndex !== getMaxZIndex()) {
        const newZIndex = getMaxZIndex();
        const newState = { ...state, zIndex: newZIndex };
        setState(newState);
        onStateChange?.(newState);
      }
    };

    // Handle mouse down on resize handle
    const handleResizeStart = (e: React.MouseEvent) => {
      e.preventDefault();
      dragState.current = {
        isDragging: false,
        isResizing: true,
        startX: e.clientX,
        startY: e.clientY,
        startWidth: state.width,
        startHeight: state.height,
      };
    };

    // Handle mouse move (dragging + resizing)
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!dragState.current.isDragging && !dragState.current.isResizing) return;

        if (dragState.current.isDragging) {
          // Calculate new position
          let newX = e.clientX - dragState.current.startX;
          let newY = e.clientY - dragState.current.startY;

          // Constrain to viewport (with some margin)
          const margin = 20;
          newX = clamp(newX, -state.width + margin, window.innerWidth - margin);
          newY = clamp(newY, 0, window.innerHeight - 30);

          // Snap to grid
          newX = snapToGrid(newX);
          newY = snapToGrid(newY);

          const newState = { ...state, x: newX, y: newY };
          setState(newState);
          onStateChange?.(newState);
        } else if (dragState.current.isResizing) {
          // Calculate new size
          const deltaX = e.clientX - dragState.current.startX;
          const deltaY = e.clientY - dragState.current.startY;

          let newWidth = dragState.current.startWidth + deltaX;
          let newHeight = dragState.current.startHeight + deltaY;

          // Constrain to minimums and maximums
          newWidth = clamp(newWidth, minWidth, window.innerWidth - state.x - 20);
          newHeight = clamp(newHeight, minHeight, window.innerHeight - state.y - 20);

          // Snap to grid
          newWidth = snapToGrid(newWidth);
          newHeight = snapToGrid(newHeight);

          const newState = { ...state, width: newWidth, height: newHeight };
          setState(newState);
          onStateChange?.(newState);
        }
      };

      const handleMouseUp = () => {
        if (dragState.current.isDragging || dragState.current.isResizing) {
          dragState.current.isDragging = false;
          dragState.current.isResizing = false;

          // Save to localStorage
          const positions = loadPanelPositions();
          positions[id] = state;
          savePanelPositions(positions);
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }, [state, id, minWidth, minHeight, onStateChange]);

    // Toggle minimize
    const toggleMinimize = () => {
      const newState = { ...state, isMinimized: !state.isMinimized };
      setState(newState);
      onStateChange?.(newState);

      const positions = loadPanelPositions();
      positions[id] = newState;
      savePanelPositions(positions);
    };

    // Toggle pin
    const togglePin = () => {
      const newState = { ...state, isPinned: !state.isPinned };
      setState(newState);
      onStateChange?.(newState);

      const positions = loadPanelPositions();
      positions[id] = newState;
      savePanelPositions(positions);
    };

    // Close panel
    const handleClose = () => {
      const positions = loadPanelPositions();
      delete positions[id];
      savePanelPositions(positions);
      onClose?.(id);
    };

    // D14 · Pop out the panel into its own window. In Electron this
    // goes through the IPC bridge (preload.js → main.js) and creates
    // a real native OS window that can be dragged to a second monitor.
    // In a browser/PWA we fall back to window.open which gives a
    // separate browser window that the user can move freely.
    const handlePopOut = () => {
      const native = (window as any).__LUCCCA_NATIVE__;
      if (native?.detachPanel) {
        native.detachPanel(id, {
          width: Math.round(state.width * 1.4),
          height: Math.round(state.height * 1.4),
          title: title,
        }).catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.warn("[FloatingPanel] native detach failed:", err);
        });
        return;
      }
      // PWA fallback. The popped-out window loads the same app with
      // ?detach=<id>; the React entry point can read that param and
      // render single-panel mode if it knows about this panel id.
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("detach", id);
        const w = Math.round(state.width * 1.4);
        const h = Math.round(state.height * 1.4);
        window.open(url.toString(), `lucca-panel-${id}`,
          `width=${w},height=${h},menubar=no,toolbar=no,location=no`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[FloatingPanel] window.open detach failed:", err);
      }
    };

    return (
      <div
        ref={ref ?? panelRef}
        className={cn(
          "floating-panel panel-enter",
          "fixed rounded-lg bg-card/80 border border-border/50",
          "flex flex-col shadow-lg",
          className
        )}
        style={{
          left: `${state.x}px`,
          top: `${state.y}px`,
          width: `${state.width}px`,
          height: state.isMinimized ? "auto" : `${state.height}px`,
          zIndex: state.zIndex,
        }}
      >
        {/* Header / Drag Handle */}
        <div
          ref={dragRef}
          onMouseDown={handleDragStart}
          className={cn(
            "floating-panel-header",
            "px-3 py-2 border-b border-border/30",
            "flex items-center justify-between",
            "select-none cursor-grab active:cursor-grabbing",
            state.isPinned && "cursor-default"
          )}
        >
          {/* Title */}
          <h3 className="text-sm font-semibold text-foreground truncate flex-1">
            {title}
          </h3>

          {/* Controls */}
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {/* Minimize button */}
            <button
              onClick={toggleMinimize}
              className={cn(
                "p-1 rounded transition-colors duration-200",
                "text-foreground/60 hover:text-foreground hover:bg-primary/20"
              )}
              aria-label="Minimize"
              title="Minimize"
            >
              <Minus size={14} />
            </button>

            {/* Pop out button */}
            <button
              onClick={handlePopOut}
              className={cn(
                "p-1 rounded transition-colors duration-200",
                "text-foreground/60 hover:text-foreground hover:bg-primary/20"
              )}
              aria-label="Pop out"
              title="Pop out"
            >
              <Maximize2 size={14} />
            </button>

            {/* Pin button */}
            <button
              onClick={togglePin}
              className={cn(
                "p-1 rounded transition-colors duration-200",
                state.isPinned
                  ? "text-primary bg-primary/20"
                  : "text-foreground/60 hover:text-foreground hover:bg-primary/20"
              )}
              aria-label="Pin"
              title={state.isPinned ? "Unpin" : "Pin"}
            >
              {state.isPinned ? <Pin size={14} /> : <PinOff size={14} />}
            </button>

            {/* Close button */}
            <button
              onClick={handleClose}
              className={cn(
                "p-1 rounded transition-colors duration-200",
                "text-foreground/60 hover:text-destructive hover:bg-destructive/20"
              )}
              aria-label="Close"
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        {!state.isMinimized && (
          <div
            className={cn(
              "flex-1 overflow-auto p-4",
              "bg-card/40 backdrop-blur-sm"
            )}
          >
            {children}
          </div>
        )}

        {/* Resize Handle */}
        {!state.isPinned && (
          <div
            ref={resizeRef}
            onMouseDown={handleResizeStart}
            className={cn(
              "resize-handle",
              "absolute bottom-0 right-0 w-4 h-4",
              "cursor-se-resize",
              "bg-gradient-to-tl from-primary/40 to-transparent",
              "opacity-40 hover:opacity-80 transition-opacity"
            )}
            title="Resize"
          />
        )}
      </div>
    );
  }
);

FloatingPanel.displayName = "FloatingPanel";
