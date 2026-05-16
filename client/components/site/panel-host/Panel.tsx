/**
 * iter188 · Extracted from PanelHost.tsx
 *
 * The memoized `Panel` component renders a single draggable/resizable/minimizable
 * floating panel. Pulled out of PanelHost to keep the orchestrator under control
 * and give Panel its own testable surface.
 *
 * No behaviour change — verbatim extraction.
 */
import React, {
  useState,
  useEffect,
  useRef,
  Suspense,
  memo,
  useCallback,
} from "react";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { PanelId, PanelState } from "../panels/types";
import {
  PANEL_METADATA,
  PanelKey,
} from "@/lib/panel-registry";
import { GripVertical, X, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/glass";
import PanelErrorBoundary from "@/components/ui/PanelErrorBoundary";
import PanelRenderDiagnostic from "@/dev/PanelRenderDiagnostic";

// Memoize Panel component to prevent re-renders when parent updates
// Only re-render when panelState, isFocused, or callbacks change
export const Panel = memo(function PanelComponent(props: {
  panelState: PanelState;
  isFocused?: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  onResize: (size: { width: number; height: number }) => void;
  onPositionChange?: (position: { x: number; y: number }) => void;
  onToggleExpand: () => void;
}) {
  const {
    panelState,
    isFocused,
    onClose,
    onMinimize,
    onFocus,
    onResize,
    onPositionChange,
    onToggleExpand,
  } = props;

  // Safety check: ensure panelState and entry are defined; entry must have element or Component
  if (!panelState || !panelState.entry) {
    if (panelState) {
      console.debug("[Panel] Panel state incomplete, likely being deleted:", {
        hasState: !!panelState,
        hasEntry: !!panelState?.entry,
      });
    }
    return null;
  }
  const hasContent = panelState.entry.element != null || panelState.entry.Component != null;
  if (!hasContent) {
    console.debug("[Panel] Entry has no element or Component");
    return null;
  }

  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeEdge, setResizeEdge] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    panelX: 0,
    panelY: 0,
  });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState(panelState.position);
  const [size, setSize] = useState(panelState.size);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);

  const EDGE_THRESHOLD = 16; // pixels from edge to trigger resize

  // Helper: Detect which edge the mouse is near
  const getEdgeAtPoint = (
    e: React.MouseEvent<HTMLDivElement> | MouseEvent,
  ): string | null => {
    if (!panelRef.current) return null;
    const rect = panelRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const top = y < EDGE_THRESHOLD;
    const bottom = y > rect.height - EDGE_THRESHOLD;
    const left = x < EDGE_THRESHOLD;
    const right = x > rect.width - EDGE_THRESHOLD;

    if (top && left) return "nw";
    if (top && right) return "ne";
    if (bottom && left) return "sw";
    if (bottom && right) return "se";
    if (top) return "n";
    if (bottom) return "s";
    if (left) return "w";
    if (right) return "e";
    return null;
  };

  // Helper: Get cursor style based on edge
  const getCursorClass = (edge: string | null): string => {
    const cursorMap: Record<string, string> = {
      n: "cursor-n-resize",
      s: "cursor-s-resize",
      e: "cursor-e-resize",
      w: "cursor-w-resize",
      ne: "cursor-ne-resize",
      nw: "cursor-nw-resize",
      se: "cursor-se-resize",
      sw: "cursor-sw-resize",
    };
    return cursorMap[edge || ""] || "cursor-default";
  };

  // Sync position when panelState changes (e.g., from grid/cascade layout)
  useEffect(() => {
    setPosition(panelState.position);
  }, [panelState.position]);

  // Sync size when panelState changes
  useEffect(() => {
    setSize(panelState.size);
  }, [panelState.size]);

  // Keyboard shortcut for expansion: Alt+E
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFocused) return;
      if ((e.altKey || e.metaKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        onToggleExpand();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocused, onToggleExpand]);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (!panelRef.current || !panelState.entry) return;

    const isStickyNote = (panelState.entry.id as string).startsWith(
      "sticky-note-",
    );
    const isTitleBar = (e.target as HTMLElement).closest(".panel-title-bar");

    // For sticky notes, allow drag from anywhere. For other panels, only from title bar
    if (!isStickyNote && !isTitleBar) {
      e.preventDefault();
      return;
    }

    // Set drag data for whiteboard drop
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        id: panelState.entry.id,
        title: panelState.entry.title,
        type: "panel",
        panelId: panelState.entry.id,
      }),
    );

    // Use transparent drag image for minimal visual feedback (browser default is the element itself)
    // This removes the "Panel" square and creates a cleaner drag experience
    const transparentImg = new Image();
    transparentImg.src =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    e.dataTransfer.setDragImage(transparentImg, 0, 0);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!panelRef.current) return;
    onFocus();
    setIsDragging(true);
    const rect = panelRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const getCursorStyle = (edge: string | null): string => {
    if (!edge) return "default";
    if (edge.includes("nw")) return "nw-resize";
    if (edge.includes("ne")) return "ne-resize";
    if (edge.includes("sw")) return "sw-resize";
    if (edge.includes("se")) return "se-resize";
    if (edge.includes("n") || edge.includes("s")) return "ns-resize";
    if (edge.includes("e") || edge.includes("w")) return "ew-resize";
    return "default";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Always update hover edge detection for visual feedback
    const edge = getEdgeAtPoint(e);
    setHoverEdge(edge);
  };

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const edge = getEdgeAtPoint(e);
    if (edge) {
      setResizeEdge(edge);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
        panelX: position.x,
        panelY: position.y,
      });
      setIsResizing(true);
      onFocus();

      // Prevent cursor flickering during resize
      document.body.style.userSelect = "none";
      document.body.style.cursor = getCursorStyle(edge);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    let animationFrameId: number | null = null;
    let lastMouseEvent: MouseEvent | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      lastMouseEvent = e;

      // Schedule animation frame update if not already scheduled
      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(() => {
          if (!lastMouseEvent) return;

          let newX = lastMouseEvent.clientX - dragOffset.x;
          let newY = lastMouseEvent.clientY - dragOffset.y;

          // Use panelRef to get current dimensions for clamping
          if (panelRef.current) {
            const panelWidth = panelRef.current.offsetWidth;
            const panelHeight = panelRef.current.offsetHeight;

            // Soft clamp: allow some off-screen but keep panel mostly visible
            const minX = -panelWidth + 80; // Keep at least 80px visible on left
            const maxX = window.innerWidth - 80; // Keep at least 80px visible on right
            const minY = 0; // Keep title bar visible
            const maxY = window.innerHeight - 30; // Keep at least 30px visible at bottom

            newX = Math.max(minX, Math.min(newX, maxX));
            newY = Math.max(minY, Math.min(newY, maxY));
          }

          setPosition({ x: newX, y: newY });
          onPositionChange?.({ x: newX, y: newY });
          animationFrameId = null;
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      document.body.style.cursor = "";
    };

    // Use regular (non-passive) listeners for mouse moves to allow preventDefault if needed
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isDragging, dragOffset]);

  useEffect(() => {
    if (!isResizing || !resizeEdge) return;

    let lastUpdate = 0;
    const throttleMs = 16; // ~60fps throttling

    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      // Throttle updates to prevent excessive re-renders and maintain smooth resize
      if (now - lastUpdate < throttleMs) {
        return;
      }
      lastUpdate = now;

      if (!panelRef.current) return;

      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.panelX;
      let newY = resizeStart.panelY;

      // Handle width changes (minimum 350px for usability)
      if (resizeEdge.includes("e")) {
        newWidth = Math.max(350, resizeStart.width + deltaX);
      } else if (resizeEdge.includes("w")) {
        newWidth = Math.max(350, resizeStart.width - deltaX);
        newX = resizeStart.panelX + deltaX;
      }

      // Handle height changes (minimum 250px for usability)
      if (resizeEdge.includes("s")) {
        newHeight = Math.max(250, resizeStart.height + deltaY);
      } else if (resizeEdge.includes("n")) {
        newHeight = Math.max(250, resizeStart.height - deltaY);
        newY = resizeStart.panelY + deltaY;
      }

      const clampedSize = {
        width: newWidth,
        height: newHeight,
      };

      setSize(clampedSize);
      setPosition({ x: newX, y: newY });
      onResize(clampedSize);
      onPositionChange?.({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeEdge(null);
      // Restore normal cursor and selection
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    // Use passive listener for better scroll performance
    document.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      // Ensure cleanup if component unmounts during resize
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [isResizing, resizeEdge, resizeStart, onResize, onPositionChange]);

  const isDashboard = panelState.entry.id === "dashboard";
  const [isHovering, setIsHovering] = useState(false);

  const isStickyNote = (panelState.entry.id as string).startsWith(
    "sticky-note-",
  );
  const panelKey = (panelState.entry.panelKey ||
    panelState.entry.id) as PanelKey;
  const metadataIcon = PANEL_METADATA[panelKey]?.icon;
  const preferredMetadataIcon =
    metadataIcon && metadataIcon.startsWith("http") ? metadataIcon : undefined;
  const icon =
    preferredMetadataIcon ||
    panelState.entry.icon ||
    (metadataIcon && metadataIcon.length > 0 ? metadataIcon : undefined);
  const isImageIcon =
    panelState.entry.isImageIcon ?? (!!icon && icon.startsWith("http"));

  // Memoize event handlers to prevent function recreation
  const memoizedOnFocus = useCallback(onFocus, [onFocus]);
  const memoizedOnMinimize = useCallback(onMinimize, [onMinimize]);
  const memoizedOnClose = useCallback(onClose, [onClose]);
  const memoizedOnResize = useCallback(onResize, [onResize]);
  const memoizedOnPositionChange = useCallback(
    (pos: { x: number; y: number }) => onPositionChange?.(pos),
    [onPositionChange],
  );

  return (
    <div
      ref={panelRef}
      data-panel-id={panelState.entry.id}
      draggable={!isStickyNote}
      onDragStart={!isStickyNote ? handleDragStart : undefined}
      onMouseMove={isDragging ? undefined : handleMouseMove}
      onMouseEnter={() => !isDragging && setIsHovering(true)}
      onMouseLeave={() => !isDragging && setIsHovering(false)}
      onClick={() => {
        // Bring panel to focus when clicked anywhere (except buttons)
        onFocus();
      }}
      onMouseDown={(e) => {
        // For sticky notes, start drag from anywhere except buttons
        if (isStickyNote) {
          const target = e.target as HTMLElement;
          // Don't start drag if clicking on button or text input, but allow textarea
          if (
            !target.closest("button") &&
            !target.closest("input[type='text']") &&
            !target.closest("input[type='number']")
          ) {
            handleMouseDown(e);
          }
          onFocus();
        } else {
          // For other panels, only focus
          onFocus();
        }
      }}
      className={cn(
        "fixed rounded-lg flex flex-col bg-background pointer-events-auto",
        !isDragging &&
          !isResizing &&
          "transition-[border,box-shadow,transform,width,height] duration-300 ease-out",
        isDashboard && "glass-panel",
        isStickyNote && "cursor-move",
      )}
      style={{
        left: "0",
        top: "0",
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        width: panelState.isMinimized ? `${size.width}px` : `${size.width}px`,
        height: panelState.isMinimized ? "auto" : `${size.height}px`,
        zIndex: panelState.isExpanded ? 20100 : panelState.zIndex,
        border:
          isFocused && !isDragging
            ? "2px solid rgba(59, 130, 246, 0.8)"
            : isHovering && !isDragging
              ? "1.5px solid rgba(59, 130, 246, 0.5)"
              : "1px solid rgba(148, 163, 184, 0.2)",
        boxShadow:
          isFocused && !isDragging
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 50px rgba(59, 130, 246, 0.4), 0 0 80px rgba(59, 130, 246, 0.15)"
            : isHovering && !isDragging
              ? window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "0 15px 35px -5px rgba(0, 0, 0, 0.3), 0 0 25px rgba(59, 130, 246, 0.15)"
                : "0 15px 35px -5px rgba(0, 0, 0, 0.15), 0 0 20px rgba(0, 0, 0, 0.1)"
              : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        overflow: panelState.isMinimized || isStickyNote ? "visible" : "hidden",
        // For sticky notes, extend the padding to create a 6px grab area
        ...(isStickyNote && { margin: "-6px" }),
        // Optimize rendering - GPU accelerated transforms don't cause reflow
        willChange:
          isDragging || isResizing ? "transform, width, height" : "auto",
      }}
    >
      {/* Title bar - draggable (hidden for sticky notes) */}
      {!(panelState.entry.id as string).startsWith("sticky-note-") && (
        <div
          draggable={false}
          onMouseDown={(e) => {
            // Always focus on any title bar interaction
            if (!isFocused) onFocus();
            handleMouseDown(e);
          }}
          className={cn(
            "panel-title-bar flex items-center justify-between gap-2 cursor-move select-none flex-shrink-0",
            isDashboard ? "" : "hover:bg-primary/15",
          )}
          style={{
            padding: "3px 16px 0",
            backgroundColor: "rgba(93, 72, 153, 1)",
            border: "1px solid rgba(28, 28, 202, 1)",
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center w-7 h-7 rounded-md cursor-grab active:cursor-grabbing transition-all hover:scale-110"
              style={{
                background: "linear-gradient(180deg, rgba(200,169,126,0.22), rgba(200,169,126,0.08))",
                border: "1px solid rgba(200,169,126,0.55)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
              }}
              title="Drag to move · double-click to tile with other open panels"
              aria-label="Panel drag handle"
              data-testid={`panel-drag-handle-${panelState.entry.id}`}
              onDoubleClick={(e) => {
                e.stopPropagation();
                try { window.dispatchEvent(new CustomEvent("echo:panels:tileAll")); } catch {}
              }}
            >
              <GripVertical size={14} style={{ color: "#c8a97e" }} />
            </div>
            <div className="flex items-center justify-center flex-shrink-0 w-5 h-5">
              {isImageIcon && icon ? (
                <img
                  src={icon}
                  alt={panelState.entry.title}
                  className="w-full h-full object-contain"
                />
              ) : icon ? (
                <span className="text-base">{icon}</span>
              ) : null}
            </div>
            <h3 className="font-semibold text-foreground">
              {panelState.entry.title}
            </h3>
          </div>

          {/* Spacer to push content to the right */}
          <div className="flex-1" />

          <div className="flex items-center gap-0.5 ml-auto">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              aria-label={
                panelState.isExpanded
                  ? "Restore to normal size"
                  : "Expand to full screen"
              }
              className="inline-flex items-center justify-center w-9 h-9 text-foreground hover:text-primary hover:bg-primary/20 rounded-md transition-all duration-200 hover:scale-110"
              title={
                panelState.isExpanded ? "Restore (Alt+E)" : "Expand (Alt+E)"
              }
            >
              {panelState.isExpanded ? (
                <Minimize2 size={16} />
              ) : (
                <Maximize2 size={16} />
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                memoizedOnMinimize();
              }}
              aria-label={
                panelState.isMinimized ? "Expand panel" : "Minimize to dock"
              }
              className="inline-flex items-center justify-center w-9 h-9 text-lg font-bold text-foreground hover:text-primary hover:bg-primary/20 rounded-md transition-all duration-200 hover:scale-110"
              title={
                panelState.isMinimized ? "Expand panel" : "Minimize to dock"
              }
            >
              {panelState.isMinimized ? "+" : "−"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                memoizedOnClose();
              }}
              aria-label="Close panel"
              className="inline-flex items-center justify-center w-9 h-9 text-lg font-bold text-foreground hover:text-destructive hover:bg-destructive/20 rounded-md transition-all duration-200 hover:scale-110"
              title="Close panel"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Content - flex column so module root can fill and render correctly */}
      {!panelState.isMinimized && (
        <div
          className="flex-1 min-h-0 min-h-[280px] flex flex-col overflow-hidden rounded-b-lg"
          onMouseDown={() => {
            memoizedOnFocus();
          }}
        >
          <div
            className="flex-1 min-h-0 min-h-[260px] overflow-auto flex flex-col"
            style={{
              minHeight: Math.max(260, (panelState.size?.height ?? 450) - 52),
            }}
          >
            <Suspense
              fallback={
                <div className="flex flex-col items-center justify-center flex-1 min-h-0 p-6">
                  <div className="mb-4">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                  <p className="text-sm text-foreground/60">
                    Loading {panelState.entry.title}…
                  </p>
                </div>
              }
            >
              <div
                className="flex flex-col flex-1 min-h-0 min-h-[180px] w-full"
                style={{
                  minHeight: Math.max(180, (panelState.size?.height ?? 450) - 52),
                  height: Math.max(180, (panelState.size?.height ?? 450) - 52),
                  backgroundColor: "var(--background, #0f172a)",
                }}
              >
                <PanelErrorBoundary panelKey={panelKey} panelTitle={panelState.entry.title}>
                  <PanelRenderDiagnostic
                    panelKey={panelKey}
                    panelTitle={panelState.entry.title}
                    enabled={typeof window !== "undefined" && ((import.meta as any).env?.DEV || new URLSearchParams(window.location.search).get("panelDebug") === "1")}
                  >
                    {panelState.entry.Component ? (
                      <panelState.entry.Component
                        {...(panelState.entry.panelProps || {})}
                        onClose={onClose}
                        panelId={panelKey}
                        isEmbedded={true}
                      />
                    ) : (
                      panelState.entry.element
                    )}
                  </PanelRenderDiagnostic>
                </PanelErrorBoundary>
              </div>
            </Suspense>
          </div>
        </div>
      )}

      {/* Resize Handles - 8 points (4 corners + 4 edges) - disabled for sticky notes */}
      {!panelState.isMinimized && !isStickyNote && (
        <>
          {/* Corner Handles */}
          {/* Top-Left */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute top-0 left-0 w-4 h-4 bg-primary/40 hover:bg-primary/80 cursor-nw-resize transition-colors"
            title="Resize (top-left)"
            style={{ borderRadius: "2px 0 8px 0" }}
          />
          {/* Top-Right */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute top-0 right-0 w-4 h-4 bg-primary/40 hover:bg-primary/80 cursor-ne-resize transition-colors"
            title="Resize (top-right)"
            style={{ borderRadius: "0 2px 0 8px" }}
          />
          {/* Bottom-Left */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute bottom-0 left-0 w-4 h-4 bg-primary/40 hover:bg-primary/80 cursor-sw-resize transition-colors"
            title="Resize (bottom-left)"
            style={{ borderRadius: "8px 0 0 2px" }}
          />
          {/* Bottom-Right */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute bottom-0 right-0 w-4 h-4 bg-primary/40 hover:bg-primary/80 cursor-se-resize transition-colors"
            title="Resize (bottom-right)"
            style={{ borderRadius: "0 8px 2px 0" }}
          />

          {/* Edge Handles */}
          {/* Top */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute top-0 left-0 right-0 h-3 hover:bg-primary/60 cursor-ns-resize transition-colors"
            title="Resize (top)"
            style={{
              background:
                hoverEdge === "n" ? "rgba(59, 130, 246, 0.6)" : "transparent",
            }}
          />
          {/* Bottom */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute bottom-0 left-0 right-0 h-3 hover:bg-primary/60 cursor-ns-resize transition-colors"
            title="Resize (bottom)"
            style={{
              background:
                hoverEdge === "s" ? "rgba(59, 130, 246, 0.6)" : "transparent",
            }}
          />
          {/* Left */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute top-0 bottom-0 left-0 w-3 hover:bg-primary/50 cursor-ew-resize transition-colors"
            title="Resize (left)"
            style={{
              background:
                hoverEdge === "w" ? "rgba(59, 130, 246, 0.5)" : "transparent",
            }}
          />
          {/* Right */}
          <div
            onMouseDown={handleResizeMouseDown}
            className="absolute top-0 bottom-0 right-0 w-3 hover:bg-primary/50 cursor-ew-resize transition-colors"
            title="Resize (right)"
            style={{
              background:
                hoverEdge === "e" ? "rgba(59, 130, 246, 0.5)" : "transparent",
            }}
          />
        </>
      )}
    </div>
  );
});

export default Panel;
