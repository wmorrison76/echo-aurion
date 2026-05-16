// src/board/CommandDock.jsx
import React from "react";
import { RotateCcw, StickyNote, Sun, Moon, Minimize2, Maximize2 } from "lucide-react";

function Btn({ title, onClick, children }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="btn"
      style={{ borderRadius: 12, padding: "8px 10px", marginRight: 6 }}
    >
      {children}
    </button>
  );
}

export default function CommandDock({
  theme = "light",
  isOnline = true,
  onToggleTheme = () => {},
  onResetLayout = () => {},
  onDockAll = () => {},
  onRestoreDocked = () => {},
  onNewStickyNote = () => {},
  minimizedIds = [],
  titlesMap = {},
  onRestoreOne = () => {},
}) {
  const IconTheme = theme === "dark" ? Moon : Sun;

  return (
    <div
      className="echo-toolbar"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: 8,
        borderRadius: 14,
        maxWidth: "min(1100px, 96vw)",
        overflowX: "auto",
      }}
    >
      {/* left controls */}
      <Btn title="Toggle theme" onClick={onToggleTheme}><IconTheme size={16} /></Btn>
      <Btn title="New Sticky Note" onClick={onNewStickyNote}><StickyNote size={16} /></Btn>
      <Btn title="Dock all panels" onClick={onDockAll}><Minimize2 size={16} /></Btn>
      <Btn title="Restore docked panels" onClick={onRestoreDocked}><Maximize2 size={16} /></Btn>
      <Btn title="Reset Layout" onClick={onResetLayout}><RotateCcw size={16} /></Btn>

      {/* status */}
      <div
        title={`Status: ${isOnline ? "Online" : "Offline"}`}
        style={{
          width: 12, height: 12, borderRadius: 999,
          background: isOnline ? "#22c55e" : "#ef4444",
          marginLeft: 4, marginRight: 8
        }}
      />

      {/* docked panels */}
      {minimizedIds.length > 0 && (
        <div
          aria-label="Dock"
          style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 6 }}
        >
          {minimizedIds.map((id) => (
            <button
              key={id}
              title={`Restore ${titlesMap[id] || id}`}
              onClick={() => onRestoreOne(id)}
              className="panel-dock__item"
              style={{
                width: 38, height: 38, borderRadius: 10,
                display: "grid", placeItems: "center",
                border: "1px solid rgba(0,0,0,.06)",
                background: "rgba(255,255,255,.9)",
              }}
            >
              {/* simple initial as an "icon" */}
              <span style={{ fontWeight: 800, fontSize: 12 }}>
                {(titlesMap[id] || id).slice(0, 1).toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
