/**
 * PanelHost with Virtual Scrolling
 * Phase 1: Critical Performance
 * 
 * NOTE: Requires @tanstack/react-virtual to be installed
 * Run: npm install @tanstack/react-virtual
 */

import { useRef } from "react";
import type { PanelState } from "./types";

// Conditional import - will work once package is installed
let useVirtualizer: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const virtualModule = require("@tanstack/react-virtual");
  useVirtualizer = virtualModule.useVirtualizer;
} catch {
  // Package not installed yet - will use fallback
  console.warn(
    "[PanelHostVirtual] @tanstack/react-virtual not installed. Using fallback rendering."
  );
}

interface PanelHostVirtualProps {
  panels: PanelState[];
  renderPanel: (panel: PanelState, index: number) => React.ReactNode;
  containerHeight: number;
  itemHeight?: number;
}

/**
 * Virtual scrolling container for panels
 * Only renders visible panels + overscan for smooth scrolling
 */
export function PanelHostVirtual({
  panels,
  renderPanel,
  containerHeight,
  itemHeight = 400, // Average panel height
}: PanelHostVirtualProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // If virtual scrolling is not available, render all panels
  if (!useVirtualizer) {
    return (
      <div ref={parentRef} style={{ height: containerHeight, overflow: "auto" }}>
        {panels.map((panel, index) => (
          <div key={panel.entry.id}>{renderPanel(panel, index)}</div>
        ))}
      </div>
    );
  }

  const virtualizer = useVirtualizer({
    count: panels.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan: 5, // Render 5 extra items above/below viewport
  });

  return (
    <div
      ref={parentRef}
      style={{ height: containerHeight, overflow: "auto" }}
      className="panel-host-virtual-container"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const panel = panels[virtualItem.index];
          if (!panel) return null;

          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderPanel(panel, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
