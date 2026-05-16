// src/board/CommandBar.jsx
import React from "react";
import {
  StickyNote,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sun,
  Moon,
  Settings,
  HelpCircle,
  MoreHorizontal,
} from "lucide-react";

function Btn({ title, onClick, children, disabled }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="etb-btn disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

export default function CommandBar({
  theme = "light",
  onToggleTheme,
  onNewSticky,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  zoom = 1,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onOpenSettings,
  onOpenHelp,
  onOpenMore,
  online = true,
}) {
  const zoomPct = Math.round((zoom ?? 1) * 100);

  return (
    <div className="board-toolbar fixed top-3 left-1/2 -translate-x-1/2 z-[1200] pointer-events-none">
      <div className="echo-toolbar flex items-center gap-2 pointer-events-auto">
        {/* create */}
        <Btn title="New Sticky" onClick={onNewSticky}>
          <StickyNote className="w-4 h-4" />
        </Btn>

        <div className="w-px h-6 opacity-20 bg-current" />

        {/* history */}
        <Btn title="Undo" onClick={onUndo} disabled={!canUndo}>
          <Undo2 className="w-4 h-4" />
        </Btn>
        <Btn title="Redo" onClick={onRedo} disabled={!canRedo}>
          <Redo2 className="w-4 h-4" />
        </Btn>

        <div className="w-px h-6 opacity-20 bg-current" />

        {/* theme */}
        <Btn
          title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Btn>

        <div className="w-px h-6 opacity-20 bg-current" />

        {/* zoom */}
        <Btn title="Zoom Out" onClick={onZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Btn>
        <span className="min-w-[36px] text-center text-xs opacity-70">
          {zoomPct}%
        </span>
        <Btn title="Zoom In" onClick={onZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Btn>
        <Btn title="Reset Zoom" onClick={onZoomReset}>
          <RotateCcw className="w-4 h-4" />
        </Btn>

        <div className="w-px h-6 opacity-20 bg-current" />

        {/* system */}
        <Btn title="Settings" onClick={onOpenSettings}>
          <Settings className="w-4 h-4" />
        </Btn>
        <Btn title="Help" onClick={onOpenHelp}>
          <HelpCircle className="w-4 h-4" />
        </Btn>
        <Btn title="More" onClick={onOpenMore}>
          <MoreHorizontal className="w-4 h-4" />
        </Btn>

        {/* status dot */}
        <div
          className={`etb-status ml-1 ${
            online ? "text-green-500" : "text-red-500"
          }`}
          aria-label={online ? "Online" : "Offline"}
        />
      </div>
    </div>
  );
}
