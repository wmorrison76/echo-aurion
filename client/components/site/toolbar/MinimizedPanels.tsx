import React from "react";
import { cn } from "@/lib/glass";

interface MinimizedPanel {
  id: string;
  title: string;
  icon: string;
  isImageIcon?: boolean;
}

interface MinimizedPanelsProps {
  minimizedPanels: MinimizedPanel[];
  isVertical: boolean;
  onRestore: (id: string) => void;
}

export function MinimizedPanels({ minimizedPanels, isVertical, onRestore }: MinimizedPanelsProps) {
  if (minimizedPanels.length === 0) return null;

  return (
    <>
      <div className={isVertical ? "w-4 h-px bg-border/40 my-0.5" : "w-px h-4 bg-border/40 mx-0.5"} />
      <div
        className={cn(
          "flex gap-0 flex-shrink-0",
          isVertical ? "flex-col items-center overflow-y-auto" : "items-center overflow-x-auto",
        )}
        key="minimized-panels"
      >
        {minimizedPanels.map((panel) => (
          <button
            key={panel.id}
            onClick={() => onRestore(panel.id)}
            className="inline-flex items-center justify-center w-7 h-7 text-foreground/60 hover:text-foreground hover:bg-primary/15 rounded transition-colors flex-shrink-0"
            title={`Restore ${panel.title}`}
            type="button"
          >
            {panel.isImageIcon && panel.icon?.startsWith("http") ? (
              <img
                src={panel.icon}
                alt={panel.title}
                className="object-contain w-3.5 h-3.5"
                style={{ boxShadow: "1px 1px 2px rgba(109, 70, 204, 0.6)" }}
              />
            ) : (
              <span className="text-[10px]">{panel.icon || "📦"}</span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}
