import { useEffect } from "react";
import { usePanelStore } from "@/stores/PanelStore";

export default function Hotkeys() {
  const openPanel   = usePanelStore((s) => s.openPanel);
  const dockAll     = usePanelStore((s) => s.minimizeAllPanels);
  const restoreAll  = usePanelStore((s) => s.restoreAllMinimized);

  useEffect(() => {
    function onKey(e) {
      const key = String(e.key || "").toLowerCase();
      const metaOrCtrl = e.metaKey || e.ctrlKey;

      // Sticky Note: Cmd/Ctrl + Shift + N
      if (metaOrCtrl && e.shiftKey && key === "n") {
        e.preventDefault();
        openPanel("sticky-note");
        return;
      }

      // Dock/Restore: Cmd/Ctrl + Shift + H
      if (metaOrCtrl && e.shiftKey && key === "h") {
        e.preventDefault();
        const hasOpen = usePanelStore.getState().openPanels.length > 0;
        hasOpen ? dockAll() : restoreAll();
      }
    }

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [openPanel, dockAll, restoreAll]);

  return null;
}
