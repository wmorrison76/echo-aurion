import React, { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { MiniPanel } from "./MiniPanel";
import { MiniPanelManager, MiniPanelConfig } from "@/lib/mini-panel-storage";
import { cn } from "@/lib/glass";

interface MiniPanelContainerEnhancedProps {
  contentRenderer?: (panelId: string, config: MiniPanelConfig) => React.ReactNode;
  onPanelCreated?: (panel: MiniPanelConfig) => void;
}

export function MiniPanelContainerEnhanced({
  contentRenderer,
  onPanelCreated,
}: MiniPanelContainerEnhancedProps) {
  const [panels, setPanels] = useState<MiniPanelConfig[]>([]);
  const [zIndexMap, setZIndexMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadPanels = () => {
      const savedPanels = MiniPanelManager.getAllMiniPanels();
      setPanels(savedPanels);

      // Initialize z-index map (prefer persisted zIndex when present)
      const newZIndexMap: Record<string, number> = {};
      savedPanels.forEach((panel, index) => {
        newZIndexMap[panel.id] =
          panel.zIndex ?? (panel.isPinned ? 40000 + index : 30000 + index);
      });
      setZIndexMap(newZIndexMap);
    };

    loadPanels();

    const handlePanelsUpdated = () => {
      loadPanels();
    };

    window.addEventListener("mini-panels-updated", handlePanelsUpdated);
    return () =>
      window.removeEventListener("mini-panels-updated", handlePanelsUpdated);
  }, []);

  const handleBringToFront = (panelId: string) => {
    const nextZ = MiniPanelManager.bringToFront(panelId);

    if (nextZ == null) return;

    // Immediate local update for responsiveness
    setZIndexMap((prev) => ({
      ...prev,
      [panelId]: Math.max(prev[panelId] || 0, nextZ),
    }));
  };

  const handleClosePanel = (panelId: string) => {
    MiniPanelManager.removeMiniPanel(panelId);
    setPanels(MiniPanelManager.getAllMiniPanels());
  };

  const handleCreatePanel = () => {
    const newPanel = MiniPanelManager.createMiniPanel(
      `panel-${Date.now()}`,
      `Widget ${panels.length + 1}`,
      400,
      300,
    );
    setPanels([...panels, newPanel]);
    onPanelCreated?.(newPanel);
  };

  // Group panels by pinned status
  const pinnedPanels = panels.filter((p) => p.isPinned);
  const unpinnedPanels = panels.filter((p) => !p.isPinned);

  return (
    <>
      {/* Render all panels */}
      {panels.map((panel) => (
        <div
          key={panel.id}
          onMouseDown={() => handleBringToFront(panel.id)}
          style={{ zIndex: zIndexMap[panel.id] || 30000 }}
        >
          <MiniPanel
            config={panel}
            onClose={handleClosePanel}
          >
            {contentRenderer ? (
              contentRenderer(panel.panelId, panel)
            ) : (
              <div className="p-4 text-foreground/60 text-sm">
                <p className="font-semibold">{panel.title}</p>
                <p className="text-xs mt-2">Custom panel: {panel.panelId}</p>
              </div>
            )}
          </MiniPanel>
        </div>
      ))}

      {/* Statistics */}
      {panels.length > 0 && (
        <div className="fixed bottom-6 right-6 text-xs text-foreground/60 pointer-events-none">
          <div className="bg-background/80 backdrop-blur border border-border/30 rounded-lg px-3 py-2">
            <div>{panels.length} panels</div>
            <div>{pinnedPanels.length} pinned</div>
          </div>
        </div>
      )}

      {/* Create Panel Button */}
      <div className="fixed bottom-6 left-6 flex gap-2 z-20">
        <button
          onClick={handleCreatePanel}
          className="inline-flex items-center justify-center w-10 h-10 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg transition-all hover:scale-110 pointer-events-auto"
          title={`Create mini panel (${panels.length} existing)`}
        >
          <Plus size={20} />
        </button>
        {panels.length > 0 && (
          <div className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold pointer-events-none">
            {panels.length}
          </div>
        )}
      </div>
    </>
  );
}
