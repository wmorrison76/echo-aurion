import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MiniPanel } from "./MiniPanel";
import { MiniPanelManager, MiniPanelConfig } from "@/lib/mini-panel-storage";

interface MiniPanelContentProps {
  panelId: string;
  config: MiniPanelConfig;
}

export interface MiniPanelContainerProps {
  contentRenderer?: (props: MiniPanelContentProps) => React.ReactNode;
}

export function MiniPanelContainer({
  contentRenderer,
}: MiniPanelContainerProps) {
  const [miniPanels, setMiniPanels] = useState<MiniPanelConfig[]>([]);

  useEffect(() => {
    // Load stored mini panels
    const panels = MiniPanelManager.getAllMiniPanels();
    setMiniPanels(panels);

    // Listen for mini panel updates
    const handleUpdate = (e: Event) => {
      const event = e as CustomEvent;
      setMiniPanels(event.detail.panels);
    };

    window.addEventListener("mini-panels-updated", handleUpdate);

    return () => {
      window.removeEventListener("mini-panels-updated", handleUpdate);
    };
  }, []);

  const handleClose = (panelId: string) => {
    MiniPanelManager.removeMiniPanel(panelId);
  };

  // DEPRECATED: Use InlineMiniPanelContainer instead
  // Floating mini panels are no longer used; all mini panels are rendered inline below the Dashboard Widget Bar
  return null;
}

// Hook to create a mini panel from anywhere
export function useMiniPanel() {
  return {
    create: (
      panelId: string,
      title: string,
      width?: number,
      height?: number,
    ) => {
      return MiniPanelManager.createMiniPanel(panelId, title, width, height);
    },
    remove: (panelId: string) => {
      MiniPanelManager.removeMiniPanel(panelId);
    },
    getAll: () => {
      return MiniPanelManager.getAllMiniPanels();
    },
    pin: (panelId: string) => {
      MiniPanelManager.togglePin(panelId);
    },
    clearAll: () => {
      MiniPanelManager.clearAllMiniPanels();
    },
  };
}
