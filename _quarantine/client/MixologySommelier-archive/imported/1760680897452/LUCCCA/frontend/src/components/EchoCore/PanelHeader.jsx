// src/components/EchoCore/PanelHeader.jsx
import React from "react";
import { X, Minus, Maximize2 } from "lucide-react";
import { ExternalLink, Home, Settings as Cog } from "lucide-react";

/**
 * Generic window header.
 * When panelKey === "pastry" we show the three tiny action icons on the right.
 */
export default function PanelHeader({
  title,
  panelId,
  panelKey,            // <-- pass "pastry" for the Pastry window
  minimized = false,
  maximized = false,
  className = "",
  onClose,
  onMinimize,
  onMaximize,
}) {
  return (
    <div
      className={`panel-header panel-header__drag ${className}`}
      style={{ cursor: "move", userSelect: "none" }}
    >
      {/* left controls */}
      <div className="flex items-center gap-2">
        <button
          className="dot dot-close"
          title="Close"
          aria-label="Close panel"
          onClick={(e) => { e.stopPropagation(); onClose?.(panelId); }}
        >
          <X size={10} />
        </button>

        <button
          className="dot dot-min"
          title={minimized ? "Restore" : "Minimize to dock"}
          aria-label="Minimize panel"
          onClick={(e) => { e.stopPropagation(); onMinimize?.(panelId); }}
        >
          <Minus size={10} />
        </button>

        <button
          className="dot dot-restore"
          title={maximized ? "Restore size" : "Maximize"}
          aria-label="Maximize panel"
          onClick={(e) => { e.stopPropagation(); onMaximize?.(panelId); }}
        >
          <Maximize2 size={10} />
        </button>

        <div className="panel-title font-semibold text-[15px] tracking-wide ml-2">
          {title}
        </div>
      </div>

      <div className="grow" />

      {/* tiny right-corner actions (Pastry only) */}
      {panelKey === "pastry" && (
        <div className="flex items-center gap-1 pr-1">
          <button
            className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-md border border-white/15 dark:border-cyan-300/30 text-white/80 hover:text-white hover:bg-white/5"
            title="Tear out current tab"
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent("pastry-tear-out"));
            }}
          >
            <ExternalLink size={14} />
          </button>

          <button
            className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-md border border-white/15 dark:border-cyan-300/30 text-white/80 hover:text-white hover:bg-white/5"
            title="Pastry Home"
            onClick={(e) => {
              e.stopPropagation();
              window.dispatchEvent(new CustomEvent("pastry-home"));
            }}
          >
            <Home size={14} />
          </button>

          <button
            className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-md border border-white/15 dark:border-cyan-300/30 text-white/80 hover:text-white hover:bg-white/5"
            title="Settings (⇧ toggles colors)"
            onClick={(e) => {
              e.stopPropagation();
              const detail = { toggleColors: e.shiftKey === true };
              window.dispatchEvent(new CustomEvent("pastry-open-settings", { detail }));
            }}
          >
            <Cog size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
