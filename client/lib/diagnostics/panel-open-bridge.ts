import { useEffect, useCallback } from "react";

export function useDiagPanelBridge(
  openPanel: (panelId: string) => void,
  closeAllPanels: () => void
): void {
  const stableOpen = useCallback(openPanel, [openPanel]);
  const stableClose = useCallback(closeAllPanels, [closeAllPanels]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("diag")) return;

    (window as any).__DIAG_OPEN_PANEL__ = (panelId: string) => {
      stableClose();
      setTimeout(() => stableOpen(panelId), 100);
    };
    (window as any).__DIAG_CLOSE_ALL__ = stableClose;

    return () => {
      delete (window as any).__DIAG_OPEN_PANEL__;
      delete (window as any).__DIAG_CLOSE_ALL__;
    };
  }, [stableOpen, stableClose]);
}
