/**
 * PanelContainer Component
 * Portal container for rendering panels
 * Handles portal creation and panel rendering logic
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { PanelState } from "./types";
import Panel from "./Panel";

interface PanelContainerProps {
  panels: PanelState[];
  maxZIndex: number;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onFocus: (id: string) => void;
  onResize: (id: string, size: { width: number; height: number }) => void;
  onPositionChange?: (id: string, position: { x: number; y: number }) => void;
  onToggleExpand: (id: string) => void;
}

export function PanelContainer({
  panels,
  maxZIndex,
  onClose,
  onMinimize,
  onFocus,
  onResize,
  onPositionChange,
  onToggleExpand,
}: PanelContainerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hostReady, setHostReady] = useState(false);

  useEffect(() => {
    // Check if panel-host already exists (from old PanelHost)
    let container = document.getElementById("panel-host") as HTMLDivElement;
    if (!container) {
      container = document.body.appendChild(document.createElement("div"));
      container.id = "panel-host";
    }
    // Phase 2A / FIX-PANEL-HOST-ROOT-CAUSE: full-viewport overlay; panels use pointer-events:auto.
    Object.assign(container.style, {
      position: "fixed",
      inset: "0",
      width: "100vw",
      height: "100vh",
      pointerEvents: "none",
      zIndex: "10000",
    });
    hostRef.current = container;
    setHostReady(true);

    return () => {
      // Don't remove container on unmount - it might be shared
      // Only cleanup if we're the last user (could use ref counting)
    };
  }, []);

  if (!hostRef.current && !hostReady) {
    return null;
  }
  const hostEl = hostRef.current;
  if (!hostEl) {
    return null;
  }

  return createPortal(
    <div style={{ pointerEvents: "none" }}>
      {panels.map((panelState) => (
        <Panel
          key={panelState.entry.id}
          panelState={panelState}
          isFocused={panelState.zIndex === maxZIndex}
          onClose={() => onClose(panelState.entry.id as string)}
          onMinimize={() => onMinimize(panelState.entry.id as string)}
          onFocus={() => onFocus(panelState.entry.id as string)}
          onResize={(size) => onResize(panelState.entry.id as string, size)}
          onPositionChange={(position) =>
            onPositionChange?.(panelState.entry.id as string, position)
          }
          onToggleExpand={() => onToggleExpand(panelState.entry.id as string)}
        />
      ))}
    </div>,
    hostEl
  );
}
