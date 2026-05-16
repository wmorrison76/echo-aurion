import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
export interface HotboxAction {
  key: string;
  label: string;
}
export interface HotboxProps {
  onAction?: (key: string) => void;
}
const DEFAULT_ACTIONS: HotboxAction[] = [
  { key: "place:table", label: "Place Table" },
  { key: "place:chafer", label: "Place Chafer" },
  { key: "align:wall", label: "Align Wall" },
  { key: "isolate", label: "Isolate" },
  { key: "duplicate", label: "Duplicate" },
  { key: "delete", label: "Delete" },
  { key: "snapshot", label: "Snapshot" },
  { key: "record", label: "Record" },
];
export function Hotbox({ onAction }: HotboxProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        setOpen(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
  if (!open) return null;
  const actions = DEFAULT_ACTIONS;
  const radius = 90;
  const centerX = pos.x;
  const centerY = pos.y;
  const handleAction = (key: string) => {
    onAction?.(key);
    setOpen(false);
  };
  return createPortal(
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {" "}
      <div
        className="absolute pointer-events-auto"
        style={{ left: centerX - 120, top: centerY - 120 }}
      >
        {" "}
        {/* Radial menu circle */}{" "}
        <div className="relative w-[240px] h-[240px] rounded-full border-2 border-border bg-background/80 backdrop-blur">
          {" "}
          {/* Center dot */}{" "}
          <div className="absolute left-1/2 top-1/2 w-2 h-2 bg-foreground rounded-full -translate-x-1/2 -translate-y-1/2" />{" "}
          {/* Action buttons */}{" "}
          {actions.map((action, i) => {
            const angle = (i / actions.length) * Math.PI * 2;
            const x = 120 + Math.cos(angle) * radius - 40;
            const y = 120 + Math.sin(angle) * radius - 16;
            return (
              <button
                key={action.key}
                onMouseDown={() => handleAction(action.key)}
                className="absolute text-xs px-2 py-1 rounded bg-card border border-border hover:bg-accent hover:border-accent-foreground transition-colors whitespace-nowrap"
                style={{ left: `${x}px`, top: `${y}px` }}
                title={action.key}
              >
                {" "}
                {action.label}{" "}
              </button>
            );
          })}{" "}
        </div>{" "}
      </div>{" "}
    </div>,
    document.body,
  );
}
