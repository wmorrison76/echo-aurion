import { useState, useEffect, useRef } from "react";
import {
  X,
  Settings,
  Grid3x3,
  Layers,
  Package,
  LayoutGrid,
  MessageSquare,
  Zap,
  Maximize2,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { storage } from "@/lib/storage";
import ThemeToggle from "./ThemeToggle";
import LanguageSelect from "./LanguageSelect";

type DockPosition = "top" | "bottom" | "left" | "right";

interface DockState {
  position: DockPosition;
  x: number;
  y: number;
  collapsed: boolean;
}

export default function DockBar() {
  const dockRef = useRef<HTMLDivElement>(null);
  const [dockState, setDockState] = useState<DockState>(() => {
    const saved = storage.getUserPreference<DockState>("dock-state");
    // Default: top-left corner, below any header
    const defaultX = 10;
    const defaultY = 70;
    return (
      saved || { position: "top", x: defaultX, y: defaultY, collapsed: false }
    );
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFocused, setIsFocused] = useState(false);

  const isVertical =
    dockState.position === "left" || dockState.position === "right";
  const isHorizontal = !isVertical;

  // Persist dock state
  useEffect(() => {
    storage.setUserPreference("dock-state", dockState);
  }, [dockState]);

  // Handle drag start (only on grip handle)
  const handleGripMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
    });
    e.preventDefault();
  };

  // Handle drag movement
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      setDockState((prevState) => {
        const newX = prevState.x + deltaX;
        const newY = prevState.y + deltaY;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Detect edge snap zones
        const snapZone = 100;
        let newPosition = prevState.position;

        // Snap to edges
        if (newY < snapZone) newPosition = "top";
        else if (newY > windowHeight - snapZone) newPosition = "bottom";
        else if (
          newX < snapZone &&
          newY > snapZone &&
          newY < windowHeight - snapZone
        )
          newPosition = "left";
        else if (
          newX > windowWidth - snapZone &&
          newY > snapZone &&
          newY < windowHeight - snapZone
        )
          newPosition = "right";

        return {
          ...prevState,
          position: newPosition,
          x: Math.max(10, Math.min(newX, windowWidth - 200)),
          y: Math.max(10, Math.min(newY, windowHeight - 200)),
        };
      });

      setDragStart({
        x: e.clientX,
        y: e.clientY,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragStart]);

  // Get positioning styles
  const getPositionStyles = (): React.CSSProperties => {
    return {
      position: "fixed",
      zIndex: 50000,
      left: `${dockState.x}px`,
      top: `${dockState.y}px`,
      transition: isDragging ? "none" : "all 0.2s ease-out",
      opacity: isFocused ? 1 : 0.75,
      filter: isFocused
        ? "drop-shadow(0 0 24px rgba(59, 130, 246, 0.6))"
        : "drop-shadow(0 4px 12px rgba(0, 0, 0, 0.3))",
    };
  };

  const handlePanelAction = (action: string) => {
    window.dispatchEvent(
      new CustomEvent("dock-action", { detail: { action } }),
    );
  };

  const handleOpenPanel = (panelId: string) => {
    window.dispatchEvent(
      new CustomEvent("open-panel", { detail: { id: panelId } }),
    );
  };

  // Button style
  const btnStyle =
    "h-12 w-12 rounded hover:bg-foreground/15 active:bg-foreground/25 flex items-center justify-center transition-colors text-foreground/70 hover:text-foreground cursor-pointer";

  return (
    <div
      ref={dockRef}
      style={getPositionStyles()}
      onMouseEnter={() => setIsFocused(true)}
      onMouseLeave={() => setIsFocused(false)}
      className={cn(
        "bg-gradient-to-br from-background/98 to-background/92 backdrop-blur-lg border border-primary/30",
        "rounded-xl shadow-2xl overflow-visible",
        isVertical && "flex flex-col min-w-[60px]",
        isHorizontal && "flex flex-row min-h-[60px] w-auto",
      )}
    >
      {/* Drag Handle - Only this responds to mouse down for dragging */}
      <div
        onMouseDown={handleGripMouseDown}
        className={cn(
          "flex items-center justify-center flex-shrink-0",
          "bg-gradient-to-r from-primary/30 to-primary/20 hover:from-primary/40 hover:to-primary/30",
          "cursor-grab active:cursor-grabbing select-none",
          "border-b border-primary/20 transition-all",
          isVertical && "w-full h-5 rounded-t-lg",
          isHorizontal && "h-full w-5 rounded-l-lg",
        )}
        title="Drag to move dock"
      >
        <GripVertical size={24} className="text-primary/80" />
      </div>

      {/* Buttons Container */}
      <div
        className={cn(
          "flex gap-1 p-2",
          isVertical && "flex-col",
          isHorizontal && "flex-row",
        )}
      >
        {!dockState.collapsed ? (
          <>
            {/* Close All Panels */}
            <button
              onClick={() => handlePanelAction("close-all")}
              className={btnStyle}
              title="Close All Panels"
            >
              <X size={24} />
            </button>

            {/* Grid Layout */}
            <button
              onClick={() => handlePanelAction("stack-grid")}
              className={btnStyle}
              title="Stack Panels (Grid)"
            >
              <Grid3x3 size={24} />
            </button>

            {/* Cascade Layout */}
            <button
              onClick={() => handlePanelAction("stack-cascade")}
              className={btnStyle}
              title="Cascade Panels"
            >
              <Layers size={24} />
            </button>

            {/* Minimize All */}
            <button
              onClick={() => handlePanelAction("minimize-all")}
              className={btnStyle}
              title="Minimize All Panels"
            >
              <Package size={24} />
            </button>

            {/* Divider */}
            <div
              className={cn(
                "bg-border/40",
                isVertical ? "h-0.5 w-6 mx-auto" : "w-0.5 h-6 mx-auto",
              )}
            />

            {/* Whiteboard */}
            <button
              onClick={() => handleOpenPanel("whiteboard")}
              className={btnStyle}
              title="Whiteboard"
            >
              <LayoutGrid size={24} />
            </button>

            {/* Global Calendar */}
            <button
              onClick={() => handleOpenPanel("global-calendar")}
              className={btnStyle}
              title="Global Calendar"
            >
              📅
            </button>

            {/* Change Feed */}
            <button
              onClick={() => handleOpenPanel("change-feed")}
              className={btnStyle}
              title="Change Feed"
            >
              ⚡
            </button>

            {/* Sticky Notes */}
            <button
              onClick={() => handleOpenPanel("notes")}
              className={btnStyle}
              title="Sticky Notes"
            >
              <MessageSquare size={24} />
            </button>

            {/* Network Chat */}
            <button
              onClick={() => handleOpenPanel("network-chat")}
              className={btnStyle}
              title="Network Chat"
            >
              <Zap size={24} />
            </button>

            {/* Divider */}
            <div
              className={cn(
                "bg-border/40",
                isVertical ? "h-0.5 w-6 mx-auto" : "w-0.5 h-6 mx-auto",
              )}
            />

            {/* Language Select */}
            <div className="flex items-center justify-center w-12 h-12">
              <LanguageSelect compact />
            </div>

            {/* Settings */}
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("open-settings", {
                    detail: { tab: "avatar" },
                  }),
                )
              }
              className={btnStyle}
              title="Settings"
            >
              <Settings size={24} />
            </button>

            {/* Collapse */}
            <button
              onClick={() =>
                setDockState((prev) => ({ ...prev, collapsed: true }))
              }
              className={btnStyle}
              title="Collapse Dock"
            >
              <Maximize2 size={24} className="rotate-180" />
            </button>
          </>
        ) : (
          <button
            onClick={() =>
              setDockState((prev) => ({ ...prev, collapsed: false }))
            }
            className={btnStyle}
            title="Expand Dock"
          >
            <Maximize2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
