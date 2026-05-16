import React from "react";
import { Minus, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface PanelWindowProps {
  id: string;
  title: string;
  initial: { x: number; y: number; w?: number; h?: number };
  onClose: (id: string) => void;
  children: React.ReactNode;
}

export default function PanelWindow({
  id,
  title,
  initial,
  onClose,
  children,
}: PanelWindowProps) {
  const [pos, setPos] = React.useState({ x: initial.x, y: initial.y });
  const [collapsed, setCollapsed] = React.useState(false);

  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const dragging = React.useRef(false);
  const offset = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: e.clientX - offset.current.x,
        y: e.clientY - offset.current.y,
      });
    };
    const onUp = () => {
      dragging.current = false;
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <div
      ref={panelRef}
      style={{
        left: pos.x,
        top: pos.y,
        width: initial.w ?? 320,
        height: initial.h,
      }}
      className={cn(
        "absolute z-50 select-none rounded-xl border bg-card/95 backdrop-blur-xl shadow-apple dark:shadow-[0_0_20px_rgba(56,189,248,0.35)]",
        "border-border/70 dark:border-cyan-400/30",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between px-3 h-9 cursor-move rounded-t-xl",
          "bg-gradient-to-r from-background to-muted/40 dark:from-black/40 dark:to-black/10",
          "border-b border-border/70 dark:border-cyan-400/30",
        )}
        onMouseDown={(e) => {
          if (e.button !== 0) return;
          const target = e.target as HTMLElement | null;
          if (target && target.closest("button")) return;

          dragging.current = true;
          const rect = panelRef.current?.getBoundingClientRect();
          if (!rect) return;
          offset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          };
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setCollapsed((c) => !c);
        }}
      >
        <div className="text-xs font-semibold tracking-wide">{title}</div>
        <div className="flex items-center gap-1">
          <button
            aria-label="Collapse"
            className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-accent/60 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((c) => !c);
            }}
          >
            <Minus className="h-3 w-3" />
          </button>
          <button
            aria-label="Close"
            className="h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-accent/60 cursor-default"
            onClick={(e) => {
              e.stopPropagation();
              onClose(id);
            }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>

      {!collapsed ? (
        <div className="max-h-[60vh] overflow-auto p-3">{children}</div>
      ) : null}
    </div>
  );
}
