import React from "react";
import { usePanelStore } from "@/stores/PanelStore";
import { shallow } from "zustand/shallow";

export default function PanelWindow({ id, children, onMinimize, onMaximize, onClose }) {
  const { focusedPanel, focusPanel, minimizePanel, closePanel } = usePanelStore(
    (s) => ({
      focusedPanel: s.focusedPanel,
      focusPanel: s.focusPanel,
      minimizePanel: s.minimizePanel,
      closePanel: s.closePanel,
    }),
    shallow
  );

  const isFocused = focusedPanel === id;

  return (
    <div
      className={`panel-window ${isFocused ? "is-focused" : ""}`}
      onMouseDown={() => focusPanel(id)}
    >
      {/* header with close / min / restore hooks */}
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="dot dot-close" role="button" onClick={() => (onClose ?? closePanel)(id)} />
          <span className="dot dot-min" role="button" onClick={() => (onMinimize ?? minimizePanel)(id)} />
          <span className="dot dot-restore" role="button" onClick={() => onMaximize?.(id)} />
        </div>
        <div className="panel-title">{id}</div>
      </div>

      <div className="panel-body">{children}</div>
    </div>
  );
}
