/**
 * iter177 · Panel Layout Toolbar
 * Small floating toolbar near the top-right that lets users auto-arrange open
 * panels: Tile (split-fill the work area evenly) or Cascade (stagger them).
 * Dispatches window events that PanelHost listens for.
 */
import React from "react";
import { LayoutGrid, Layers } from "lucide-react";

export function PanelLayoutToolbar() {
  return (
    <div
      data-testid="panel-layout-toolbar"
      className="hidden lg:flex fixed items-center gap-1.5 z-[2147482000] rounded-lg px-1.5 py-1"
      style={{
        top: 12,
        right: 180,
        background: "linear-gradient(180deg, rgba(200,169,126,0.14), rgba(200,169,126,0.06))",
        border: "1px solid rgba(200,169,126,0.45)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
      }}
    >
      <button
        data-testid="panels-tile-all"
        onClick={() => window.dispatchEvent(new CustomEvent("echo:panels:tileAll"))}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-[rgba(200,169,126,0.18)]"
        title="Tile all open panels side-by-side"
        style={{ color: "#c8a97e" }}
      >
        <LayoutGrid size={13} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Tile</span>
      </button>
      <div style={{ width: 1, height: 16, background: "rgba(200,169,126,0.35)" }} />
      <button
        data-testid="panels-cascade-all"
        onClick={() => window.dispatchEvent(new CustomEvent("echo:panels:cascadeAll"))}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors hover:bg-[rgba(200,169,126,0.18)]"
        title="Cascade open panels (staggered)"
        style={{ color: "#c8a97e" }}
      >
        <Layers size={13} />
        <span className="text-[10px] font-bold uppercase tracking-wider">Cascade</span>
      </button>
    </div>
  );
}
