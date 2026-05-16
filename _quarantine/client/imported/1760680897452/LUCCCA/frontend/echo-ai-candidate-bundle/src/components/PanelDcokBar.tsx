import React from "react";
import { usePanelStore } from "@/stores/PanelStore";

const PANEL_META: Record<string, { label: string; emoji?: string }> = {
  "sticky-note": { label: "Sticky", emoji: "📝" },
  cost: { label: "Cost", emoji: "📊" },
  labor: { label: "Labor", emoji: "👥" },
  guest: { label: "Guests", emoji: "🧑‍🤝‍🧑" },
};

const PanelDockBar: React.FC = () => {
  const minimizedPanels = usePanelStore((s) => s.minimizedPanels);
  const restorePanel = usePanelStore((s) => s.restorePanel);
  const restoreAll = usePanelStore((s) => s.restoreAllMinimized);
  const closePanel = usePanelStore((s) => s.closePanel);

  if (!minimizedPanels.length) return null;

  return (
    <div className="panel-dock" role="toolbar" aria-label="Minimized panels dock">
      <button className="panel-dock__item" onClick={restoreAll} title="Restore all panels (Cmd/Ctrl + Shift + H)" aria-label="Restore all panels">
        <span style={{ fontSize: 18 }}>🗂️</span>
      </button>
      {minimizedPanels.map((id) => {
        const meta = PANEL_META[id] || { label: id, emoji: "🧩" };
        return (
          <button
            key={id}
            className="panel-dock__item"
            onClick={() => restorePanel(id)}
            onContextMenu={(e) => {
              e.preventDefault();
              closePanel(id);
            }}
            title={`${meta.label} — click to restore · right-click to close`}
            aria-label={`Restore ${meta.label} panel`}
          >
            <span style={{ fontSize: 18 }}>{meta.emoji}</span>
          </button>
        );
      })}
    </div>
  );
};
export default PanelDockBar;
