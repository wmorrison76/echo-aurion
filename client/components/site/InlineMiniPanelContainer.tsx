import React, { useState, useEffect, useRef } from "react";
import { MiniPanelManager, MiniPanelConfig } from "@/lib/mini-panel-storage";
import { InlineMiniPanel } from "./InlineMiniPanel";
import { cn } from "@/lib/glass";
import {
  calculateCascadeLayout,
  calculateGridLayout,
} from "@/lib/panel-controller";

interface InlineMiniPanelContainerProps {
  layoutMode?: "cascade" | "grid";
  contentRenderer?: (
    panelId: string,
    config: MiniPanelConfig,
  ) => React.ReactNode;
}

export function InlineMiniPanelContainer({
  layoutMode = "cascade",
  contentRenderer,
}: InlineMiniPanelContainerProps) {
  const [miniPanels, setMiniPanels] = useState<MiniPanelConfig[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 400 });
  const [containerTop, setContainerTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load stored mini panels
    const panels = MiniPanelManager.getAllMiniPanels();
    setMiniPanels(panels);

    // Listen for mini panel updates
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const updatedPanels = customEvent.detail.panels;
      setMiniPanels(updatedPanels);
    };

    window.addEventListener("mini-panels-updated", handleUpdate);
    return () =>
      window.removeEventListener("mini-panels-updated", handleUpdate);
  }, []);

  useEffect(() => {
    // Track container size using ResizeObserver
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = Math.max(100, Math.floor(rect.width));
        setContainerSize((prev) => {
          if (Math.abs(newWidth - prev.width) > 1) {
            return {
              width: newWidth,
              height: 400,
            };
          }
          return prev;
        });
        // Track the container's top position for bounds checking
        setContainerTop(Math.floor(rect.top));
      }
    };

    // Initial size - use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(updateSize);

    // Use ResizeObserver for better size tracking
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    // Fallback to window resize
    window.addEventListener("resize", updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  const handleClose = (panelId: string) => {
    MiniPanelManager.removeMiniPanel(panelId);
  };

  const handleBringToFront = (panelId: string) => {
    return MiniPanelManager.bringToFront(panelId);
  };

  useEffect(() => {
    const handleDockAction = (e: Event) => {
      const detail = (e as CustomEvent)?.detail as
        | { action?: string; payload?: Record<string, any> }
        | undefined;
      const action = detail?.action;
      if (!action) return;

      const allPanels = MiniPanelManager.getAllMiniPanels();
      if (allPanels.length === 0) return;

      if (action === "close-all") {
        MiniPanelManager.clearAllMiniPanels();
        return;
      }

      if (action === "minimize-all") {
        allPanels.forEach((p) => MiniPanelManager.setMinimized(p.id, true));
        return;
      }

      if (action !== "stack-grid" && action !== "stack-cascade") {
        return;
      }

      // Un-minimize before applying a layout so panels are visible.
      allPanels.forEach((p) => MiniPanelManager.setMinimized(p.id, false));

      const floating = allPanels.filter((p) => p.isFloating);
      const docked = allPanels.filter((p) => !p.isFloating);

      if (floating.length > 0) {
        const ids = floating.map((p) => p.id);

        if (action === "stack-grid") {
          const widths = Object.fromEntries(
            floating.map((p) => [p.id, p.size.width]),
          );
          const heights = Object.fromEntries(
            floating.map((p) => [p.id, p.size.height]),
          );

          const layout = calculateGridLayout(
            ids,
            window.innerWidth,
            window.innerHeight,
            widths,
            heights,
          );

          Object.entries(layout.positions).forEach(([id, pos]) => {
            MiniPanelManager.updatePosition(id, {
              x: Math.round(pos.x),
              y: Math.round(pos.y),
            });
          });

          if (layout.sizes) {
            Object.entries(layout.sizes).forEach(([id, size]) => {
              MiniPanelManager.updateSize(id, {
                width: Math.round(size.width),
                height: Math.round(size.height),
              });
            });
          }
        } else {
          const layout = calculateCascadeLayout(
            ids,
            window.innerWidth,
            window.innerHeight,
          );

          Object.entries(layout.positions).forEach(([id, pos]) => {
            MiniPanelManager.updatePosition(id, {
              x: Math.round(pos.x),
              y: Math.round(pos.y),
            });
          });
        }

        return;
      }

      // Docked-only: layout within the inline container.
      if (!containerRef.current || docked.length === 0) return;

      const rect = containerRef.current.getBoundingClientRect();
      const padding = 12;
      const gap = 16;
      const startX = padding;
      const startY = padding;
      const containerWidth = Math.max(320, Math.floor(rect.width));
      const containerHeight = Math.max(320, Math.floor(rect.height));

      if (action === "stack-cascade") {
        const offset = 28;
        docked.forEach((p, index) => {
          const maxX = Math.max(
            startX,
            containerWidth - p.size.width - padding,
          );
          const maxY = Math.max(
            startY,
            containerHeight - p.size.height - padding,
          );

          MiniPanelManager.updatePosition(p.id, {
            x: Math.min(startX + index * offset, maxX),
            y: Math.min(startY + index * offset, maxY),
          });
        });

        return;
      }

      // stack-grid
      const avgWidth = Math.max(
        200,
        Math.round(
          docked.reduce((sum, p) => sum + (p.size.width || 320), 0) /
            docked.length,
        ),
      );
      const cellWidth = avgWidth + gap;
      const availableWidth = containerWidth - padding * 2;
      const cols = Math.max(1, Math.floor(availableWidth / cellWidth));

      docked.forEach((p, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);

        const x = padding + col * cellWidth;
        const y = padding + row * (p.size.height + gap);

        MiniPanelManager.updatePosition(p.id, { x, y });
      });
    };

    window.addEventListener("dock-action", handleDockAction);
    return () => window.removeEventListener("dock-action", handleDockAction);
  }, []);

  if (miniPanels.length === 0) {
    return null;
  }

  // Separate floating and non-floating panels
  const floatingPanels = miniPanels.filter((p) => p.isFloating);
  const dockPanels = miniPanels.filter((p) => !p.isFloating);

  // Sort panels by z-index for proper rendering order (highest z-index renders last = appears on top)
  const sortedFloatingPanels = [...floatingPanels].sort(
    (a, b) => (a.zIndex || 0) - (b.zIndex || 0),
  );

  // Sort docked panels by z-index so highest z-index renders last and appears on top
  const sortedDockPanels = [...dockPanels].sort(
    (a, b) => (a.zIndex || 0) - (b.zIndex || 0),
  );

  return (
    <>
      {/* Docked panels container */}
      {dockPanels.length > 0 && (
        <div
          ref={containerRef}
          className={cn(
            "w-full relative bg-gradient-to-br from-background/40 to-background/20 border-b border-border/20 transition-all duration-300 hover:from-background/50 hover:to-background/30",
            layoutMode === "cascade" ? "min-h-96" : "min-h-auto",
          )}
          style={{
            height:
              layoutMode === "cascade"
                ? `${Math.max(400, containerSize.height)}px`
                : "auto",
            overflow: layoutMode === "cascade" ? "hidden" : "auto",
            maxHeight: layoutMode === "cascade" ? "none" : "300px",
            padding: layoutMode === "cascade" ? "12px" : "12px",
          }}
          onMouseEnter={() => {
            // Ensure container size is up-to-date on interaction
            if (containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              if (Math.abs(rect.width - containerSize.width) > 5) {
                setContainerSize({
                  width: Math.max(100, rect.width),
                  height: containerSize.height,
                });
              }
            }
          }}
        >
          {layoutMode === "cascade" ? (
            // Cascade layout: absolute positioning with cascade arrangement
            <div
              className="relative w-full h-full"
              style={{ pointerEvents: "auto" }}
            >
              {sortedDockPanels.map((panel, index) => {
                const offset = 30; // Pixel offset between cascaded items
                const startX = 16;
                const startY = 16;

                // Use stored position if available, otherwise use cascade arrangement
                const cascadePosition =
                  panel.position?.x !== undefined &&
                  panel.position?.y !== undefined
                    ? panel.position
                    : {
                        x: startX + index * offset,
                        y: startY + index * offset,
                      };

                const cascadeConfig = {
                  ...panel,
                  position: cascadePosition,
                };

                return (
                  <InlineMiniPanel
                    key={panel.id}
                    config={cascadeConfig}
                    onClose={handleClose}
                    onBringToFront={handleBringToFront}
                    layoutMode={layoutMode}
                    containerHeight={containerSize.height}
                    containerWidth={containerSize.width}
                    containerTop={containerTop}
                  >
                    {contentRenderer?.(panel.panelId, panel)}
                  </InlineMiniPanel>
                );
              })}
            </div>
          ) : (
            // Grid layout: flex wrap arrangement
            <div className="flex flex-wrap gap-3">
              {sortedDockPanels.map((panel, index) => {
                let displayConfig = panel;

                if (containerSize.width > 100) {
                  // Grid layout: arrange in a grid with consistent spacing
                  const panelWidth = panel.size.width || 320;
                  const panelHeight = panel.size.height || 200;
                  const gap = 16;
                  const padding = 8;

                  // Calculate how many columns can fit in the available width
                  const availableWidth = containerSize.width - padding * 2;
                  const cellWidth = panelWidth + gap;
                  const colCount = Math.max(
                    1,
                    Math.floor(availableWidth / cellWidth),
                  );

                  // Calculate position
                  const row = Math.floor(index / colCount);
                  const col = index % colCount;

                  const gridX = padding + col * cellWidth;
                  const gridY = padding + row * (panelHeight + gap);

                  // Create a config with grid position
                  displayConfig = {
                    ...panel,
                    position: { x: Math.floor(gridX), y: Math.floor(gridY) },
                  };
                }

                return (
                  <div
                    key={panel.id}
                    className="flex-shrink-0"
                    style={{
                      zIndex: panel.zIndex ?? 0,
                      position: "relative",
                      // Ensure grid panels are above the container but below floating panels
                      // Grid panels stay in relative positioning for layout purposes
                    }}
                  >
                    <InlineMiniPanel
                      config={displayConfig}
                      onClose={handleClose}
                      onBringToFront={handleBringToFront}
                      layoutMode={layoutMode}
                      containerHeight={containerSize.height}
                      containerWidth={containerSize.width}
                      containerTop={containerTop}
                    >
                      {contentRenderer?.(panel.panelId, panel)}
                    </InlineMiniPanel>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating panels - rendered absolutely */}
      {sortedFloatingPanels.map((panel) => (
        <InlineMiniPanel
          key={`floating-${panel.id}`}
          config={panel}
          onClose={handleClose}
          onBringToFront={handleBringToFront}
          layoutMode={layoutMode}
          containerHeight={containerSize.height}
          containerWidth={containerSize.width}
          containerTop={containerTop}
        >
          {contentRenderer?.(panel.panelId, panel)}
        </InlineMiniPanel>
      ))}
    </>
  );
}
