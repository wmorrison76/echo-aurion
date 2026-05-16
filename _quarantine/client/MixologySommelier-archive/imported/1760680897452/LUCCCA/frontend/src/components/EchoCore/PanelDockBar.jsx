import React from "react";
import { usePanelStore } from "@/stores/PanelStore";
import { shallow } from "zustand/shallow";

export default function PanelDockBar() {
  const { minimizedPanels, restorePanel } = usePanelStore(
    (s) => ({ minimizedPanels: s.minimizedPanels, restorePanel: s.restorePanel }),
    shallow
  );

  if (!minimizedPanels?.length) return null;

  return (
    <div className="panel-dock">
      {minimizedPanels.map((id) => (
        <button
          key={id}
          className="panel-dock__item"
          title={`Restore ${id}`}
          onClick={() => restorePanel(id)}
        >
          <img src="/favicon.ico" alt={id} />
        </button>
      ))}
    </div>
  );
}
