/**
 * Modern PanelHost Implementation
 * Uses new modular architecture with React 18 concurrent features
 * Phase 3: Advanced Features
 * 
 * This is the new PanelHost that uses all the modernized components
 */

import { useTransition, useDeferredValue, useMemo, Suspense } from "react";
import { usePanelState } from "./hooks/usePanelState";
import { PanelContainer } from "./PanelContainer";
import { PanelHostVirtual } from "./PanelHostVirtual";
import { usePanelLayout } from "./hooks/usePanelLayout";
import type { PanelId } from "./types";

interface PanelHostModernProps {
  enableVirtualScrolling?: boolean;
  virtualScrollingThreshold?: number; // Number of panels before enabling virtual scrolling
}

/**
 * Modern PanelHost with React 18 concurrent features
 */
export function PanelHostModern({
  enableVirtualScrolling = true,
  virtualScrollingThreshold = 10,
}: PanelHostModernProps = {}) {
  const [isPending, startTransition] = useTransition();
  const {
    openPanels,
    getMaxZIndex,
    removePanel,
    minimizePanel,
    focusPanel,
    setPanelSize,
    setPanelPosition,
    toggleExpand,
    isInitialized,
  } = usePanelState();

  // Defer expensive calculations
  const deferredPanels = useDeferredValue(openPanels);

  // Use virtual scrolling if many panels
  const useVirtual = enableVirtualScrolling && openPanels.length >= virtualScrollingThreshold;

  // Calculate max z-index
  const maxZIndex = useMemo(() => getMaxZIndex(), [openPanels, getMaxZIndex]);

  // Handlers with useTransition for non-urgent updates
  const handleClose = (id: PanelId) => {
    startTransition(() => {
      removePanel(id);
    });
  };

  const handleMinimize = (id: PanelId) => {
    startTransition(() => {
      minimizePanel(id);
    });
  };

  const handleFocus = (id: PanelId) => {
    // Focus is urgent - don't defer
    focusPanel(id);
  };

  const handleResize = (id: PanelId, size: { width: number; height: number }) => {
    // Resize is urgent for visual feedback
    setPanelSize(id, size);
  };

  const handlePositionChange = (id: PanelId, position: { x: number; y: number }) => {
    // Position changes are urgent for drag feedback
    setPanelPosition(id, position);
  };

  const handleToggleExpand = (id: PanelId) => {
    startTransition(() => {
      toggleExpand(id);
    });
  };

  if (!isInitialized) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Initializing panels...</div>
      </div>
    );
  }

  // Render panels
  if (useVirtual && deferredPanels.length > 0) {
    return (
      <Suspense fallback={<div>Loading panels...</div>}>
        <PanelHostVirtual
          panels={deferredPanels}
          containerHeight={window.innerHeight}
          renderPanel={(panel, index) => (
            <PanelContainer
              key={panel.entry.id}
              panels={[panel]}
              maxZIndex={maxZIndex}
              onClose={() => handleClose(panel.entry.id)}
              onMinimize={() => handleMinimize(panel.entry.id)}
              onFocus={() => handleFocus(panel.entry.id)}
              onResize={(id, size) => handleResize(id, size)}
              onPositionChange={(id, pos) => handlePositionChange(id, pos)}
              onToggleExpand={(id) => handleToggleExpand(id)}
            />
          )}
        />
        {isPending && (
          <div className="fixed top-4 right-4 text-xs text-muted-foreground">
            Updating...
          </div>
        )}
      </Suspense>
    );
  }

  // Standard rendering for fewer panels
  return (
    <Suspense fallback={<div>Loading panels...</div>}>
      <PanelContainer
        panels={openPanels}
        maxZIndex={maxZIndex}
        onClose={handleClose}
        onMinimize={handleMinimize}
        onFocus={handleFocus}
        onResize={handleResize}
        onPositionChange={handlePositionChange}
        onToggleExpand={handleToggleExpand}
      />
      {isPending && (
        <div className="fixed top-4 right-4 text-xs text-muted-foreground">
          Updating...
        </div>
      )}
    </Suspense>
  );
}
